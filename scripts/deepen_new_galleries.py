#!/usr/bin/env python3
"""Deepen newly added galleries: Smithery API dump, skillsllm skill pages, ClawSkills hrefs."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    fetch_many,
    fetch_ok,
    http_get,
    sitemap_locs,
    title_from_html,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)

NOW = utc_now()


def slug_path(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return path or "index"


def deepen_smithery() -> None:
    root = REPO / "sources" / "smithery.ai"
    meta = root / "meta"
    meta.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    all_skills: list[dict] = []
    seen = set()
    page = 1
    total_pages = 1
    while page <= total_pages and page <= 80:
        url = f"https://api.smithery.ai/skills?pageSize=500&page={page}"
        dest = meta / f"skills-page-{page}.json"
        st, body, _ = http_get(url)
        if st != 200 or not body or body.lstrip().startswith(b"<"):
            errors.append(f"{url} HTTP {st}")
            break
        write_bytes(dest, body)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            errors.append(f"{url} invalid JSON")
            break
        items = data.get("skills") if isinstance(data, dict) else data
        if not isinstance(items, list):
            errors.append(f"{url} unexpected shape")
            break
        pag = data.get("pagination") if isinstance(data, dict) else {}
        total_pages = int(pag.get("totalPages") or total_pages)
        added = 0
        for item in items:
            sid = item.get("id") or f"{item.get('namespace')}/{item.get('slug')}"
            if sid in seen:
                continue
            seen.add(sid)
            all_skills.append(item)
            added += 1
        print(f"  smithery page {page}/{total_pages} +{added} total={len(all_skills)}", flush=True)
        if added == 0:
            break
        page += 1
    write_json(meta / "skills.json", all_skills)
    write_json(
        meta / "skills-stats.json",
        {"count": len(all_skills), "pages": page - 1, "at": NOW},
    )
    rows = [
        {
            "id": "smithery.ai",
            "title": "Smithery",
            "url": "https://smithery.ai/",
            "source": "smithery.ai",
            "type": "site",
            "api_skills": len(all_skills),
        }
    ]
    for item in all_skills:
        ns = item.get("namespace") or "unknown"
        slug = item.get("slug") or item.get("id")
        rows.append(
            {
                "id": f"smithery.ai/{ns}/{slug}",
                "title": item.get("displayName") or slug,
                "url": f"https://smithery.ai/skills/{ns}/{slug}",
                "source": "smithery.ai",
                "type": "skill",
                "description": item.get("description"),
                "gitUrl": item.get("gitUrl"),
                "verified": item.get("verified"),
            }
        )
    write_index(
        root,
        "smithery.ai",
        [
            "Smithery MCP / skills registry.",
            f"- Last updated: {NOW}",
            f"- Public API dump `GET /skills`: **{len(all_skills)}** skills",
            "- Sitemap is docs-only; skill bodies live on GitHub (`gitUrl` in skills.json).",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# smithery.ai\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("smithery.ai", rows)
    print(f"smithery deepened skills={len(all_skills)} rows={len(rows)}", flush=True)


def deepen_skillsllm() -> None:
    root = REPO / "sources" / "skillsllm.com"
    meta = root / "meta"
    pages = root / "pages"
    pages.mkdir(parents=True, exist_ok=True)
    sm = meta / "sitemap.xml"
    if not sm.exists() and not fetch_ok("https://skillsllm.com/sitemap.xml", sm):
        print("skillsllm sitemap missing", flush=True)
        return
    locs = sitemap_locs(sm.read_bytes())
    skill_urls = [u for u in locs if "/skill/" in urlparse(u).path or "/skill/" in u]
    write_json(meta / "skill-urls.json", skill_urls)
    jobs = []
    for url in skill_urls:
        rel = slug_path(url).replace("/", "__")
        jobs.append((url, pages / f"{rel}.html"))
    ok, fail = fetch_many(jobs, workers=20)
    rows = [
        {
            "id": "skillsllm.com",
            "title": "SkillsLLM",
            "url": "https://skillsllm.com/",
            "source": "skillsllm.com",
            "type": "site",
            "skill_urls": len(skill_urls),
        }
    ]
    for url in skill_urls:
        dest = pages / f"{slug_path(url).replace('/', '__')}.html"
        title = title_from_html(dest.read_bytes()) if dest.exists() else url.rstrip("/").split("/")[-1]
        rows.append(
            {
                "id": f"skillsllm.com/{slug_path(url)}",
                "title": title or url.rstrip("/").split("/")[-1],
                "url": url,
                "source": "skillsllm.com",
                "type": "skill",
            }
        )
    write_index(
        root,
        "skillsllm.com",
        [
            "SkillsLLM public skill gallery.",
            f"- Last updated: {NOW}",
            f"- Sitemap URLs: **{len(locs)}**; `/skill/` pages: **{len(skill_urls)}** (HTML ok={ok} fail={fail})",
            "- No public JSON/API found; HTML + sitemap archived.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        f"# skillsllm.com\n\nHTML fail={fail}.\n" if fail else "# skillsllm.com\n\nNone.\n",
    )
    upsert_catalog("skillsllm.com", rows)
    print(f"skillsllm skill pages={len(skill_urls)} ok={ok} fail={fail}", flush=True)


def deepen_clawskills() -> None:
    root = REPO / "sources" / "clawskills.sh"
    meta = root / "meta"
    pages = root / "pages"
    home = pages / "home.html"
    if not home.exists():
        return
    text = home.read_text(encoding="utf-8", errors="replace")
    hrefs = sorted(set(re.findall(r'href="(/[^"]+)"', text)))
    skill_hrefs = [h for h in hrefs if h.startswith("/skills/")]
    integ = [h for h in hrefs if h.startswith("/openclaw/")]
    write_json(meta / "all-hrefs.json", hrefs)
    write_json(meta / "skill-hrefs.json", skill_hrefs)
    write_json(meta / "openclaw-hrefs.json", integ)
    # fetch a bounded set of skill + integration pages for bodies/metadata
    jobs = []
    for href in skill_hrefs[:2000] + integ:
        rel = href.strip("/").replace("/", "__") or "index"
        jobs.append((f"https://clawskills.sh{href}", pages / f"{rel}.html"))
    ok, fail = fetch_many(jobs, workers=16)
    rows = [
        {
            "id": "clawskills.sh",
            "title": "ClawSkills",
            "url": "https://clawskills.sh/",
            "source": "clawskills.sh",
            "type": "site",
            "skill_hrefs": len(skill_hrefs),
            "openclaw_hrefs": len(integ),
        }
    ]
    for href in skill_hrefs:
        rows.append(
            {
                "id": f"clawskills.sh{href}",
                "title": href.rstrip("/").split("/")[-1],
                "url": f"https://clawskills.sh{href}",
                "source": "clawskills.sh",
                "type": "skill",
            }
        )
    for href in integ:
        rows.append(
            {
                "id": f"clawskills.sh{href}",
                "title": href.rstrip("/").split("/")[-1],
                "url": f"https://clawskills.sh{href}",
                "source": "clawskills.sh",
                "type": "integration",
            }
        )
    write_index(
        root,
        "clawskills.sh",
        [
            "OpenClaw skill gallery.",
            f"- Last updated: {NOW}",
            f"- Skill hrefs on homepage: **{len(skill_hrefs)}**; openclaw/integration hrefs: **{len(integ)}**",
            f"- Fetched HTML for first 2000 skill pages + all integrations (ok={ok} fail={fail})",
            "- No public JSON dump; homepage is a 7MB listing shell.",
        ],
    )
    write_text(root / "ERRORS.md", f"# clawskills.sh\n\nHTML fail={fail}.\n" if fail else "# clawskills.sh\n\nNone.\n")
    upsert_catalog("clawskills.sh", rows)
    print(f"clawskills skills={len(skill_hrefs)} fetched_ok={ok}", flush=True)


def retry_officialskills() -> None:
    root = REPO / "sources" / "officialskills.sh"
    meta = root / "meta"
    pages = root / "pages"
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    jobs = []
    for url in locs:
        dest = pages / f"{slug_path(url).replace('/', '__') or 'index'}.html"
        if dest.exists() and dest.stat().st_size > 200:
            continue
        jobs.append((url, dest))
    if not jobs:
        print("officialskills nothing to retry", flush=True)
        return
    ok, fail = fetch_many(jobs, workers=8)
    print(f"officialskills retry ok={ok} fail={fail}", flush=True)


def main() -> int:
    print(f"deepen start {NOW}", flush=True)
    deepen_smithery()
    deepen_skillsllm()
    deepen_clawskills()
    retry_officialskills()
    print("deepen done", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

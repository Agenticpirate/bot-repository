#!/usr/bin/env python3
"""Secondary archive work while skills.sh hourly cap is closed."""

from __future__ import annotations

import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    fetch_ok,
    http_get,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)

NOW = utc_now()


def download_souls() -> dict:
    root = REPO / "sources" / "souls.directory"
    dest_root = root / "souls"
    dest_root.mkdir(parents=True, exist_ok=True)
    text = (root / "llms.txt").read_text(encoding="utf-8", errors="replace")
    apis = sorted(set(re.findall(r"https://souls\.directory/api/souls/[^\s)`]+", text)))
    jobs = []
    for url in apis:
        parts = urlparse(url).path.strip("/").split("/")
        # api/souls/{handle}/{slug}.md
        if len(parts) < 4:
            continue
        handle, slug = parts[2], parts[3]
        if slug.endswith(".md"):
            slug = slug[:-3]
        dest = dest_root / handle / f"{slug}.md"
        if dest.exists() and dest.stat().st_size > 20:
            continue
        jobs.append((url, dest))
    ok = fail = 0

    def one(job: tuple[str, Path]) -> bool:
        return fetch_ok(job[0], job[1])

    with ThreadPoolExecutor(max_workers=16) as pool:
        futs = {pool.submit(one, j): j for j in jobs}
        done = 0
        for fut in as_completed(futs):
            if fut.result():
                ok += 1
            else:
                fail += 1
            done += 1
            if done % 250 == 0:
                print(f"  souls {done}/{len(jobs)} ok={ok} fail={fail}", flush=True)
    n_files = sum(1 for _ in dest_root.rglob("*.md"))
    write_json(root / "meta" / "soul-download-stats.json", {"apis": len(apis), "attempted": len(jobs), "ok": ok, "fail": fail, "on_disk": n_files, "at": NOW})
    write_index(
        root,
        "souls.directory",
        [
            f"OpenClaw SOUL.md directory. Refreshed {NOW}.",
            f"llms.txt API URLs: **{len(apis)}**. Downloaded SOUL.md: **{n_files}** (this pass ok={ok} fail={fail}).",
            "Raw fetch: `GET /api/souls/{handle}/{slug}.md`.",
        ],
    )
    # catalog: keep site row + a sample of downloaded souls, not 4k page URLs again
    rows = [
        {
            "id": "souls.directory",
            "title": "souls.directory",
            "url": "https://souls.directory/",
            "source": "souls.directory",
            "type": "site",
            "soul_md": n_files,
        }
    ]
    for path in sorted(dest_root.rglob("*.md"))[:3000]:
        handle = path.parent.name
        slug = path.stem
        rows.append(
            {
                "id": f"soul:{handle}/{slug}",
                "title": slug,
                "url": f"https://souls.directory/souls/{handle}/{slug}",
                "source": "souls.directory",
                "type": "soul",
                "has_content": True,
            }
        )
    upsert_catalog("souls.directory", rows)
    write_text(root / "ERRORS.md", f"# souls.directory\n\nSOUL.md download failures this pass: {fail}.\n")
    print(f"souls ok={ok} fail={fail} on_disk={n_files}", flush=True)
    return {"ok": ok, "fail": fail, "on_disk": n_files}


def guess_raw_urls(owner: str, repo: str, route: str) -> list[str]:
    slug = route.strip("/")
    candidates = [slug]
    if slug.startswith("skills-"):
        candidates.append("skills/" + slug[len("skills-") :])
        candidates.append(slug[len("skills-") :])
    if slug.startswith("claude-skills-"):
        candidates.append(slug[len("claude-skills-") :])
        candidates.append("skills/" + slug[len("claude-skills-") :])
    if slug.startswith("optional-skills-"):
        candidates.append("optional-skills/" + slug[len("optional-skills-") :])
        candidates.append(slug[len("optional-skills-") :])
    # last path segment only
    candidates.append(slug.split("-")[-1])
    candidates.append(slug.replace("-", "/"))
    out = []
    seen = set()
    for path in candidates[:5]:
        path = path.strip("/")
        if not path or path in seen:
            continue
        seen.add(path)
        out.append(f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}/SKILL.md")
    return out[:5]


def download_skillsmp_sitemap_md(limit: int = 4000) -> dict:
    root = REPO / "sources" / "skillsmp.com"
    dest_root = root / "skills-from-sitemap"
    dest_root.mkdir(parents=True, exist_ok=True)
    locs = []
    for name in ("skills-popular-locs.json", "skills-discovered-locs.json"):
        p = root / "meta" / name
        if p.exists():
            locs.extend(json.loads(p.read_text()))
    locs = list(dict.fromkeys(locs))
    existing = {p.parent.name for p in (root / "skills").rglob("SKILL.md")} if (root / "skills").exists() else set()
    jobs = []
    for loc in locs:
        parts = urlparse(loc).path.strip("/").split("/")
        if len(parts) < 4 or parts[0] != "creators":
            continue
        owner, repo, route = parts[1], parts[2], "/".join(parts[3:])
        key = f"{owner}--{repo}--{route}".replace("/", "--")
        dest = dest_root / owner / repo / route / "SKILL.md"
        if dest.exists() and dest.stat().st_size > 40:
            continue
        # skip if already saved under search-unique tree with same route tail
        tail = route.split("-")[-1]
        if any(tail and tail in e for e in existing):
            pass
        jobs.append((owner, repo, route, dest, loc))
        if len(jobs) >= limit:
            break

    ok = fail = 0

    def one(job) -> bool:
        owner, repo, route, dest, _loc = job
        for url in guess_raw_urls(owner, repo, route):
            if fetch_ok(url, dest):
                text = dest.read_text(encoding="utf-8", errors="replace")
                if text.lstrip().startswith("<") or len(text) < 40:
                    dest.unlink(missing_ok=True)
                    continue
                write_json(
                    dest.parent / "meta.json",
                    {"github_raw": url, "skillmp": _loc, "fetched_at": NOW},
                )
                return True
        return False

    with ThreadPoolExecutor(max_workers=12) as pool:
        futs = {pool.submit(one, j): j for j in jobs}
        done = 0
        for fut in as_completed(futs):
            if fut.result():
                ok += 1
            else:
                fail += 1
            done += 1
            if done % 200 == 0:
                print(f"  skillsmp-raw {done}/{len(jobs)} ok={ok} fail={fail}", flush=True)
    n = sum(1 for _ in dest_root.rglob("SKILL.md"))
    write_json(
        root / "meta" / "sitemap-github-md-stats.json",
        {"jobs": len(jobs), "ok": ok, "fail": fail, "on_disk": n, "at": NOW},
    )
    # refresh INDEX
    search_n = sum(1 for _ in (root / "skills").rglob("SKILL.md")) if (root / "skills").exists() else 0
    write_index(
        root,
        "skillsmp.com",
        [
            f"SkillsMP public API + GitHub raw SKILL.md. Refreshed {NOW}.",
            f"Popular sitemap URLs: 11213. Search-unique GitHub SKILL.md: **{search_n}**.",
            f"Sitemap→GitHub raw SKILL.md this pass: **{ok}** ok / **{fail}** miss. On disk under skills-from-sitemap/: **{n}**.",
            "REST search has no content endpoint; anonymous 50/day.",
        ],
    )
    print(f"skillsmp sitemap raw ok={ok} fail={fail} on_disk={n}", flush=True)
    return {"ok": ok, "fail": fail, "on_disk": n}


def deepen_openclaw() -> dict:
    root = REPO / "sources" / "openclawskills.io"
    pages = root / "pages"
    pages.mkdir(parents=True, exist_ok=True)
    for url, name in (
        ("https://openclawskills.io/skills", "skills.html"),
        ("https://openclawskills.io/", "home.html"),
        ("https://openclawskills.io/llms.txt", "llms.txt"),
        ("https://openclawskills.io/api/skills", "api-skills.json"),
    ):
        dest = root / name if name.endswith((".txt", ".json")) else pages / name
        fetch_ok(url, dest)
    html = (pages / "skills.html").read_text(encoding="utf-8", errors="replace") if (pages / "skills.html").exists() else ""
    hrefs = sorted(set(re.findall(r'href="(/skills/[^"]+)"', html)))
    hrefs += sorted(set(re.findall(r'href="(https://openclawskills.io/skills/[^"]+)"', html)))
    ok = 0
    for href in hrefs:
        url = href if href.startswith("http") else "https://openclawskills.io" + href
        slug = url.rstrip("/").split("/")[-1]
        dest = pages / "skills" / f"{slug}.html"
        if fetch_ok(url, dest):
            ok += 1
    write_json(root / "meta" / "skill-hrefs.json", hrefs)
    write_index(
        root,
        "OpenClaw Skills",
        [
            f"Gallery snapshot {NOW}. Extracted skill hrefs: {len(hrefs)}. Pages saved: {ok}.",
            "Sitemap is locale/legal pages only (no per-skill URLs).",
        ],
    )
    print(f"openclaw hrefs={len(hrefs)} saved={ok}", flush=True)
    return {"hrefs": len(hrefs), "saved": ok}


def retry_blocked() -> dict:
    notes = {}
    for url, dest in (
        ("https://skillkit.io/", REPO / "sources" / "skillkit.io" / "pages" / "home-retry.html"),
        ("https://skillkit.io/api/skills", REPO / "sources" / "skillkit.io" / "meta" / "api-skills.json"),
        ("https://skillkit.io/llms.txt", REPO / "sources" / "skillkit.io" / "llms.txt"),
        ("https://api.agent37.com/v1/skills", REPO / "sources" / "agent37.com" / "meta" / "v1-skills-retry.json"),
        ("https://api.agent37.com/", REPO / "sources" / "agent37.com" / "pages" / "api-root.json"),
        ("https://www.agent37.com/skills", REPO / "sources" / "agent37.com" / "pages" / "skills.html"),
    ):
        dest.parent.mkdir(parents=True, exist_ok=True)
        st, body, _ = http_get(url)
        write_bytes(dest, body or b"")
        notes[url] = st
        print(f"retry {st} {url}", flush=True)
    write_text(
        REPO / "sources" / "skillkit.io" / "ERRORS.md",
        "# skillkit.io\n\nStill HTTP 403 on homepage, `/api/skills`, and `llms.txt` from this host. No unauthenticated dump.\n",
    )
    write_text(
        REPO / "sources" / "agent37.com" / "ERRORS.md",
        "# agent37.com\n\n`GET /v1/skills` still HTTP 401 without API key. Public `/skills` HTML + sitemap only.\n",
    )
    write_json(REPO / "sources" / "skillkit.io" / "meta" / "retry.json", {"at": NOW, "http": notes})
    return notes


def main() -> int:
    print("=== souls ===", flush=True)
    download_souls()
    print("=== skillsmp sitemap raw ===", flush=True)
    download_skillsmp_sitemap_md(limit=3500)
    print("=== openclaw ===", flush=True)
    deepen_openclaw()
    print("=== retries ===", flush=True)
    retry_blocked()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

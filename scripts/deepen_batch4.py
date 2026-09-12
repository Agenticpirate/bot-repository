#!/usr/bin/env python3
"""Deepen Batch 4 API-rich sources and remaining Priority 4 sites.

Does not delete other catalog rows. Skips already-complete INDEX trees except
when we are adding API/sitemap payloads beside them.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    fetch_ok,
    http_get,
    sitemap_locs,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)

NOW = utc_now()


def clean(obj):
    if isinstance(obj, str):
        return obj.encode("utf-8", "replace").decode("utf-8")
    if isinstance(obj, list):
        return [clean(x) for x in obj]
    if isinstance(obj, dict):
        return {clean(k) if isinstance(k, str) else k: clean(v) for k, v in obj.items()}
    return obj


def paginate_agentskills() -> int:
    root = REPO / "sources" / "agentskills.codes"
    meta = root / "meta"
    meta.mkdir(parents=True, exist_ok=True)
    pages = root / "pages"
    pages.mkdir(parents=True, exist_ok=True)
    fetch_ok("https://agentskills.codes/llms.txt", root / "llms.txt")
    fetch_ok("https://agentskills.codes/sitemap.xml", meta / "sitemap.xml")
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    write_json(meta / "sitemap-locs.json", locs)

    items: list[dict] = []
    seen = set()
    cached_pages = sorted((meta / "pages").glob("offset-*.json")) if (meta / "pages").exists() else []
    if cached_pages:
        for dest in cached_pages:
            try:
                data = json.loads(dest.read_text(encoding="utf-8", errors="replace"))
            except json.JSONDecodeError:
                continue
            for sk in data.get("skills") or []:
                sid = sk.get("id")
                if sid in seen:
                    continue
                seen.add(sid)
                items.append(sk)
        print(f"agentskills resume from cache unique={len(items)}", flush=True)
    offset = 0
    while offset < 20000 and not cached_pages:
        url = f"https://agentskills.codes/api/v1/skills?limit=100&offset={offset}"
        st, body, _ = http_get(url, accept="application/json")
        dest = meta / "pages" / f"offset-{offset:05d}.json"
        write_bytes(dest, body or b"")
        if st != 200:
            break
        try:
            data = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            break
        chunk = data.get("skills") or []
        for sk in chunk:
            sid = sk.get("id")
            if sid in seen:
                continue
            seen.add(sid)
            items.append(sk)
        total = int(data.get("total") or 0)
        print(f"agentskills offset={offset} +{len(chunk)} unique={len(items)} total={total}", flush=True)
        if not chunk or offset + len(chunk) >= total:
            break
        offset += int(data.get("limit") or 100)
        time.sleep(0.05)
    write_json(meta / "skills.json", {"count": len(items), "items": clean(items)})

    rows = [
        {
            "id": "agentskills.codes",
            "title": "AgentSkills.codes",
            "url": "https://agentskills.codes/",
            "source": "agentskills.codes",
            "type": "site",
            "total": len(items),
        }
    ]
    for sk in items:
        slug = sk.get("slug") or str(sk.get("id"))
        rows.append(
            {
                "id": f"agentskills:{sk.get('id')}",
                "title": sk.get("name") or slug,
                "url": f"https://agentskills.codes/skills/{slug}",
                "source": "agentskills.codes",
                "type": "skill",
                "author": sk.get("author"),
                "installs": sk.get("installs"),
                "views": sk.get("views"),
                "category": sk.get("category"),
            }
        )
    upsert_catalog("agentskills.codes", clean(rows))
    write_index(
        root,
        "AgentSkills.codes",
        [
            f"Open registry of agent skills. Refreshed {NOW}.",
            f"`GET /api/v1/skills` paginated (limit=100): **{len(items)}** skills (API total claimed in last page).",
            f"Sitemap URLs: **{len(locs)}**. `llms.txt` saved. No public per-skill content API (HTML detail only).",
        ],
    )
    write_text(root / "ERRORS.md", "# agentskills.codes\n\nList API only; no unauthenticated SKILL.md dump.\n")
    return len(items)


def ingest_telnyx_discovery() -> int:
    root = REPO / "sources" / "telnyx.com-agent-skills"
    if (root / "INDEX.md").exists() and (root / "meta" / "index.json").exists():
        print("telnyx discovery already present", flush=True)
    meta = root / "meta"
    skills_dir = root / "skills"
    meta.mkdir(parents=True, exist_ok=True)
    skills_dir.mkdir(parents=True, exist_ok=True)
    fetch_ok(
        "https://developers.telnyx.com/.well-known/agent-skills/index.json",
        meta / "developers-index.json",
    )
    fetch_ok("https://telnyx.com/.well-known/agent-skills/index.json", meta / "index.json")
    data = json.loads((meta / "index.json").read_text(encoding="utf-8")) if (meta / "index.json").exists() else {}
    skills = data.get("skills") or []
    ok = fail = 0
    for sk in skills:
        name = re.sub(r"[^A-Za-z0-9_.-]+", "-", str(sk.get("name") or "skill")).strip("-")
        url = sk.get("url")
        dest = skills_dir / f"{name}.md"
        if dest.exists() and dest.stat().st_size > 0:
            ok += 1
            continue
        if url and fetch_ok(url, dest):
            ok += 1
        else:
            fail += 1
    rows = [
        {
            "id": "telnyx.com-agent-skills",
            "title": "Telnyx Agent Skills",
            "url": "https://telnyx.com/.well-known/agent-skills/index.json",
            "source": "telnyx.com-agent-skills",
            "type": "site",
        }
    ]
    for sk in skills:
        rows.append(
            {
                "id": f"telnyx:{sk.get('name')}",
                "title": sk.get("name"),
                "url": sk.get("url") or sk.get("documentation"),
                "source": "telnyx.com-agent-skills",
                "type": "skill",
                "digest": sk.get("digest"),
            }
        )
    upsert_catalog("telnyx.com-agent-skills", rows)
    write_index(
        root,
        "Telnyx agent skills discovery",
        [
            f"Public `/.well-known/agent-skills/index.json` from telnyx.com. Refreshed {NOW}.",
            f"Skills in index: **{len(skills)}**. Markdown downloaded: **{ok}**. Failed: **{fail}**.",
            "Also saved developers.telnyx.com discovery stub. GitHub pack `team-telnyx/ai` is separate.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        f"# telnyx.com-agent-skills\n\nMarkdown fetch failures: {fail}. Index itself is public JSON.\n",
    )
    return len(skills)


def save_sitemap_source(slug: str, title: str, home: str, extras: list[tuple[str, Path]]) -> int:
    root = REPO / "sources" / slug
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    errors = []
    locs: list[str] = []
    for url, dest in extras:
        if fetch_ok(url, dest):
            if dest.suffix == ".xml":
                locs.extend(sitemap_locs(dest.read_bytes()))
        else:
            errors.append(f"{url} failed")
    if locs:
        write_json(meta / "sitemap-locs.json", sorted(set(locs)))
    rows = [
        {
            "id": slug,
            "title": title,
            "url": home,
            "source": slug,
            "type": "site",
            "sitemap_urls": len(set(locs)),
        }
    ]
    # catalog a bounded slice of sitemap URLs so we don't explode 100k+ rows
    for loc in list(dict.fromkeys(locs))[:4000]:
        rows.append(
            {
                "id": f"{slug}:{loc}",
                "title": loc.rstrip("/").split("/")[-1] or title,
                "url": loc,
                "source": slug,
                "type": "page",
            }
        )
    upsert_catalog(slug, rows)
    write_index(
        root,
        title,
        [
            f"Deepened snapshot {NOW}. Sitemap/list URLs captured: **{len(set(locs))}** (catalog lists first {min(4000, len(set(locs)))}).",
            "See `meta/` for sitemaps and llms.txt when the host published them.",
        ],
    )
    write_text(root / "ERRORS.md", f"# {slug}\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.") + "\n")
    return len(set(locs))


def snapshot_missing() -> None:
    sites = [
        (
            "agent.ceo",
            "Agent.ceo",
            [
                ("https://agent.ceo/", "home.html"),
                ("https://agent.ceo/registry", "registry.html"),
                ("https://docs.agent.ceo/", "docs.html"),
                ("https://agent.ceo/llms.txt", "llms.txt"),
            ],
        ),
        (
            "docs.crewship.ai",
            "Crewship docs",
            [
                ("https://docs.crewship.ai/", "home.html"),
            ],
        ),
        (
            "marketinc.io",
            "MarketInc agents",
            [("https://marketinc.io/agents", "agents.html")],
        ),
        ("tgent.com", "tgent.com", [("https://tgent.com/", "home.html")]),
        (
            "bolna.ai",
            "Bolna agents",
            [("https://bolna.ai/", "home.html"), ("https://bolna.ai/agents", "agents.html")],
        ),
        (
            "app.kuchhbhi.in",
            "kuchhbhi.in skills",
            [("https://app.kuchhbhi.in/skills", "skills.html")],
        ),
        (
            "nodesphereai",
            "Nodesphere AI",
            [
                ("https://nodesphereai.com/", "home.html"),
                ("https://www.nodesphereai.com/", "www.html"),
                ("https://nodesphere.ai/", "nodesphere.ai.html"),
            ],
        ),
    ]
    for slug, title, files in sites:
        root = REPO / "sources" / slug
        pages = root / "pages"
        pages.mkdir(parents=True, exist_ok=True)
        ok = 0
        errors = []
        rows = [{"id": slug, "title": title, "url": files[0][0], "source": slug, "type": "site"}]
        for url, name in files:
            dest = (root / name) if name.endswith(".txt") else pages / name
            if name.endswith(".txt"):
                dest = root / name
            if fetch_ok(url, dest):
                ok += 1
                rows.append({"id": f"{slug}:{name}", "title": name, "url": url, "source": slug, "type": "page"})
            else:
                errors.append(f"{url} failed")
        upsert_catalog(slug, rows)
        write_index(root, title, [f"Public snapshot {NOW}. {ok}/{len(files)} fetched."])
        write_text(root / "ERRORS.md", f"# {slug}\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.") + "\n")


def github_raw_from_tree(url: str) -> str | None:
    if not url or "github.com" not in url:
        return None
    m = re.match(r"https?://github.com/([^/]+)/([^/]+)/tree/([^/]+)/(.+)", url)
    if m:
        owner, repo, ref, path = m.groups()
        return f"https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path.rstrip('/')}/SKILL.md"
    m = re.match(r"https?://github.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)", url)
    if m:
        owner, repo, ref, path = m.groups()
        if path.endswith("SKILL.md"):
            return f"https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}"
        return f"https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path.rstrip('/')}/SKILL.md"
    return None


def download_skillsmp_github_md() -> tuple[int, int]:
    root = REPO / "sources" / "skillsmp.com"
    src = root / "meta" / "search-unique.json"
    if not src.exists():
        return 0, 0
    items = json.loads(src.read_text()).get("items") or []
    dest_root = root / "skills"
    dest_root.mkdir(parents=True, exist_ok=True)
    jobs = []
    for sk in items:
        raw = github_raw_from_tree(sk.get("githubUrl") or "")
        if not raw:
            continue
        sid = re.sub(r"[^A-Za-z0-9_.-]+", "-", str(sk.get("id") or sk.get("name")))[:80]
        dest = dest_root / sid / "SKILL.md"
        if dest.exists() and dest.stat().st_size > 40:
            continue
        jobs.append((raw, dest))
    ok = fail = 0

    def one(job: tuple[str, Path]) -> bool:
        return fetch_ok(job[0], job[1])

    with ThreadPoolExecutor(max_workers=12) as pool:
        futs = {pool.submit(one, job): job for job in jobs}
        for fut in as_completed(futs):
            if fut.result():
                ok += 1
            else:
                fail += 1
    write_json(root / "meta" / "github-md-stats.json", {"attempted": len(jobs), "ok": ok, "fail": fail, "at": NOW})
    return ok, fail


def agent37_sitemap() -> None:
    root = REPO / "sources" / "agent37.com"
    meta = root / "meta"
    meta.mkdir(parents=True, exist_ok=True)
    fetch_ok("https://www.agent37.com/sitemap.xml", meta / "sitemap.xml")
    st, body, _ = http_get("https://api.agent37.com/v1/skills", accept="application/json")
    write_bytes(meta / "v1-skills-unauth.json", body or b"")
    write_json(meta / "v1-skills-unauth-meta.json", {"http": st, "note": "requires API key"})
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    child_locs = []
    for loc in locs:
        if loc.endswith(".xml"):
            name = loc.rstrip("/").split("/")[-1]
            dest = meta / name
            if fetch_ok(loc, dest):
                child_locs.extend(sitemap_locs(dest.read_bytes()))
    all_locs = sorted(set(locs + child_locs))
    write_json(meta / "sitemap-locs.json", all_locs)
    rows = [
        {
            "id": "agent37.com",
            "title": "Agent37",
            "url": "https://www.agent37.com/skills",
            "source": "agent37.com",
            "type": "site",
        },
        {
            "id": "agent37.com:api",
            "title": "Agent37 Cloud API",
            "url": "https://api.agent37.com/",
            "source": "agent37.com",
            "type": "api",
            "auth": "api_key",
        },
    ]
    for loc in all_locs:
        rows.append({"id": f"agent37:{loc}", "title": loc.rstrip("/").split("/")[-1], "url": loc, "source": "agent37.com", "type": "page"})
    upsert_catalog("agent37.com", rows)
    write_index(
        root,
        "Agent37",
        [
            f"Skills marketing pages + Cloud API root. Refreshed {NOW}.",
            f"Sitemap URLs: **{len(all_locs)}**. `GET /v1/skills` and `/v1/catalog` return HTTP 401 without an API key.",
            "No public unauthenticated skill dump.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# agent37.com\n\n`api.agent37.com/v1/skills` and `/v1/catalog` require an API key (HTTP 401).\n",
    )


def main() -> int:
    print("=== agentskills.codes paginate ===", flush=True)
    n = paginate_agentskills()
    print("agentskills", n, flush=True)

    print("=== telnyx discovery ===", flush=True)
    print("telnyx", ingest_telnyx_discovery(), flush=True)

    print("=== agent37 sitemap ===", flush=True)
    agent37_sitemap()

    print("=== deepen sitemaps ===", flush=True)
    save_sitemap_source(
        "souls.directory",
        "souls.directory",
        "https://souls.directory/",
        [
            ("https://souls.directory/sitemap.xml", REPO / "sources" / "souls.directory" / "meta" / "sitemap.xml"),
            ("https://souls.directory/llms.txt", REPO / "sources" / "souls.directory" / "llms.txt"),
        ],
    )
    save_sitemap_source(
        "mcp.directory",
        "MCP Directory",
        "https://mcp.directory/",
        [
            ("https://mcp.directory/sitemap.xml", REPO / "sources" / "mcp.directory" / "meta" / "sitemap.xml"),
            ("https://mcp.directory/llms.txt", REPO / "sources" / "mcp.directory" / "llms.txt"),
        ],
    )
    save_sitemap_source(
        "openclawskills.io",
        "OpenClaw Skills",
        "https://openclawskills.io/skills",
        [("https://openclawskills.io/sitemap.xml", REPO / "sources" / "openclawskills.io" / "meta" / "sitemap.xml")],
    )
    save_sitemap_source(
        "openclawcheatsheet.com",
        "OpenClaw Cheatsheet",
        "https://openclawcheatsheet.com/gallery",
        [
            (
                "https://openclawcheatsheet.com/sitemap.xml",
                REPO / "sources" / "openclawcheatsheet.com" / "meta" / "sitemap.xml",
            )
        ],
    )
    save_sitemap_source(
        "agentmarketplace.ai",
        "Agent Marketplace",
        "https://agentmarketplace.ai/browse",
        [
            (
                "https://agentmarketplace.ai/sitemap.xml",
                REPO / "sources" / "agentmarketplace.ai" / "meta" / "sitemap.xml",
            )
        ],
    )

    print("=== P4 missing ===", flush=True)
    snapshot_missing()

    print("=== skillsmp github SKILL.md ===", flush=True)
    ok, fail = download_skillsmp_github_md()
    print(f"skillsmp github md ok={ok} fail={fail}", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

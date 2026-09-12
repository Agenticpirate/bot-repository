#!/usr/bin/env python3
"""Archive Priority B APIs/registries. Does not remove other catalog rows."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    CATALOG,
    REPO,
    UA,
    clone_pack,
    fetch_many,
    fetch_ok,
    http_get,
    pack_rows,
    sitemap_locs,
    title_from_html,
    upsert_catalog,
    utc_now,
    write_index,
    write_json,
    write_text,
    write_bytes,
)


def get_json(url: str):
    status, body, _ = http_get(url, accept="application/json")
    if status != 200:
        return status, None
    try:
        return status, json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        return status, None


def ingest_botdirectory() -> None:
    root = REPO / "sources" / "botdirectory.ai"
    meta = root / "meta"
    for name, url in [
        ("llms.txt", "https://botdirectory.ai/llms.txt"),
        ("openapi.json", "https://botdirectory.ai/openapi.json"),
        ("api-catalog.json", "https://botdirectory.ai/.well-known/api-catalog"),
        ("updates.json", "https://botdirectory.ai/updates.json"),
        ("bots.json", "https://botdirectory.ai/api/bots.json"),
        ("rss.xml", "https://botdirectory.ai/rss.xml"),
    ]:
        fetch_ok(url, meta / name)
    fetch_ok("https://botdirectory.ai/api/", root / "pages" / "api.html")
    fetch_ok("https://botdirectory.ai/", root / "pages" / "homepage.html")
    bots = []
    if (meta / "bots.json").exists():
        data = json.loads((meta / "bots.json").read_text(encoding="utf-8"))
        bots = data.get("bots") or []
    rows = [
        {
            "id": "botdirectory.ai",
            "title": "botdirectory.ai",
            "url": "https://botdirectory.ai/",
            "source": "botdirectory.ai",
            "type": "site",
        }
    ]
    for bot in bots:
        slug = bot.get("slug")
        if not slug:
            continue
        rows.append(
            {
                "id": slug,
                "title": bot.get("name") or slug,
                "url": bot.get("detailUrl") or f"https://botdirectory.ai/bots/{slug}/",
                "source": "botdirectory.ai",
                "type": "bot",
                "category": bot.get("category"),
                "grok_share_url": bot.get("grokShareUrl"),
            }
        )
    upsert_catalog("botdirectory.ai", rows)
    write_index(
        root,
        "botdirectory.ai",
        [
            f"Archived {utc_now()}. Full `/api/bots.json` ({len(bots)} bots), OpenAPI, RSS, updates.json, llms.txt.",
        ],
    )
    write_text(root / "ERRORS.md", "# botdirectory.ai errors\n\nNone.\n")
    print(f"botdirectory bots={len(bots)}", flush=True)


def ingest_botmarket() -> None:
    root = REPO / "sources" / "botmarket.bot"
    meta = root / "meta"
    agents: list[dict] = []
    seen_a: set = set()
    offset = 0
    while True:
        url = f"https://botmarket.bot/v1/agents?limit=200&offset={offset}"
        dest = meta / "agents" / f"offset-{offset}.json"
        st, data = get_json(url)
        if st != 200 or not isinstance(data, list) or not data:
            break
        write_json(dest, data)
        new = [a for a in data if a.get("id") not in seen_a]
        if not new:
            break
        for a in new:
            seen_a.add(a.get("id"))
        agents.extend(new)
        if len(data) < 200:
            break
        offset += 200
        if offset > 2000:
            break
    write_json(meta / "agents.json", agents)
    skills: list[dict] = []
    seen_s: set = set()
    offset = 0
    while True:
        url = f"https://botmarket.bot/v1/skills?limit=500&offset={offset}"
        dest = meta / "skills" / f"offset-{offset}.json"
        st, data = get_json(url)
        if st != 200 or not isinstance(data, list) or not data:
            break
        write_json(dest, data)
        new = [s for s in data if s.get("id") not in seen_s]
        if not new:
            break
        for s in new:
            seen_s.add(s.get("id"))
        skills.extend(new)
        if len(data) < 500:
            break
        offset += 500
        if offset > 5000:
            break
    write_json(meta / "skills.json", skills)
    fetch_ok("https://botmarket.bot/", root / "pages" / "homepage.html")
    rows = [
        {
            "id": "botmarket.bot",
            "title": "botmarket.bot",
            "url": "https://botmarket.bot/",
            "source": "botmarket.bot",
            "type": "site",
        }
    ]
    for a in agents:
        slug = a.get("slug") or a.get("id")
        rows.append(
            {
                "id": f"agent/{slug}",
                "title": a.get("name") or str(slug),
                "url": a.get("url") or f"https://botmarket.bot/agents/{slug}",
                "source": "botmarket.bot",
                "type": "agent",
                "category": a.get("category"),
            }
        )
    for s in skills:
        sid = s.get("id") or s.get("name")
        rows.append(
            {
                "id": f"skill/{sid}",
                "title": s.get("name") or str(sid),
                "url": f"https://botmarket.bot/skills/{sid}",
                "source": "botmarket.bot",
                "type": "skill",
                "agent": s.get("agent_slug"),
            }
        )
    upsert_catalog("botmarket.bot", rows)
    write_index(
        root,
        "botmarket.bot",
        [
            f"Archived {utc_now()}. `/v1/agents` ({len(agents)}) and `/v1/skills` ({len(skills)}).",
            "- `/openapi.json` is 404.",
        ],
    )
    write_text(root / "ERRORS.md", "# botmarket.bot errors\n\n`/openapi.json` returned 404.\n")
    print(f"botmarket agents={len(agents)} skills={len(skills)}", flush=True)


def ingest_a2a() -> None:
    root = REPO / "sources" / "a2a-registry.org"
    fetch_ok("https://www.a2a-registry.org/llms.txt", root / "meta" / "llms.txt")
    fetch_ok("https://www.a2a-registry.org/browse", root / "pages" / "browse.html")
    fetch_ok("https://www.a2a-registry.org/", root / "pages" / "homepage.html")
    fetch_ok("https://www.a2a-registry.org/api-docs", root / "pages" / "api-docs.html")
    browse = (root / "pages" / "browse.html").read_text(encoding="utf-8", errors="replace")
    ids = sorted(set(re.findall(r"/agent/([a-zA-Z0-9._-]+)", browse)))
    cards = sorted(
        set(
            re.findall(
                r"https?://[^\"']+/\.well-known/agent-card\.json",
                browse,
            )
        )
    )
    jobs = [(f"https://www.a2a-registry.org/agent/{i}", root / "agents" / i / "page.html") for i in ids]
    for i, url in enumerate(cards):
        host = urllib.parse.urlparse(url).netloc.replace(":", "_")
        jobs.append((url, root / "agent-cards" / f"{host}.json"))
    ok, fail = fetch_many(jobs, workers=8)
    rows = [
        {
            "id": "a2a-registry.org",
            "title": "A2A Registry",
            "url": "https://www.a2a-registry.org/",
            "source": "a2a-registry.org",
            "type": "site",
        }
    ]
    for i in ids:
        page = root / "agents" / i / "page.html"
        title = title_from_html(page.read_bytes()) if page.exists() else i
        rows.append(
            {
                "id": i,
                "title": title or i,
                "url": f"https://www.a2a-registry.org/agent/{i}",
                "source": "a2a-registry.org",
                "type": "agent",
            }
        )
    upsert_catalog("a2a-registry.org", rows)
    write_index(
        root,
        "a2a-registry.org",
        [
            f"Archived {utc_now()}. Browse directory ({len(ids)} agents) + linked agent-card.json files.",
            f"Fetches OK {ok}, fail {fail}.",
            "`POST /a2a/discover` and `/public/stats` were 404 from this host.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# a2a-registry.org errors\n\n"
        "`POST /a2a/discover` 404; `/public/stats` and `/public/featured` 404. "
        "Directory taken from public /browse HTML.\n",
    )
    print(f"a2a agents={len(ids)} cards={len(cards)}", flush=True)


def ingest_openagentskill() -> None:
    root = REPO / "sources" / "openagentskill.com"
    meta = root / "meta"
    endpoints = {
        "llms.txt": "https://www.openagentskill.com/llms.txt",
        "mcp.json": "https://www.openagentskill.com/.well-known/mcp.json",
        "sitemap.xml": "https://www.openagentskill.com/sitemap.xml",
        "registry-stats.json": "https://www.openagentskill.com/api/registry/stats",
        "tasks.json": "https://www.openagentskill.com/api/agent/tasks",
        "showcase.json": "https://www.openagentskill.com/api/agent/showcase?limit=50",
        "packs.json": "https://www.openagentskill.com/api/agent/packs",
        "skills.json": "https://www.openagentskill.com/api/agent/skills?limit=50",
        "identity.json": "https://www.openagentskill.com/.well-known/openagentskill.json",
    }
    for name, url in endpoints.items():
        fetch_ok(url, meta / name)
    fetch_ok(
        "https://www.openagentskill.com/agent-skills-directory",
        root / "pages" / "agent-skills-directory.html",
    )
    skills = []
    if (meta / "skills.json").exists():
        skills = json.loads((meta / "skills.json").read_text()).get("skills") or []
    packs = []
    if (meta / "packs.json").exists():
        data = json.loads((meta / "packs.json").read_text())
        packs = data.get("packs") or data.get("items") or (data if isinstance(data, list) else [])
    tasks = []
    if (meta / "tasks.json").exists():
        data = json.loads((meta / "tasks.json").read_text())
        tasks = data.get("tasks") or data.get("items") or (data if isinstance(data, list) else [])
    rows = [
        {
            "id": "openagentskill.com",
            "title": "OpenAgentSkill",
            "url": "https://www.openagentskill.com/",
            "source": "openagentskill.com",
            "type": "site",
        }
    ]
    for s in skills:
        slug = s.get("slug") or s.get("id") or s.get("name")
        if not slug:
            continue
        rows.append(
            {
                "id": f"skill/{slug}",
                "title": s.get("name") or str(slug),
                "url": s.get("url") or f"https://www.openagentskill.com/skills/{slug}",
                "source": "openagentskill.com",
                "type": "skill",
            }
        )
    upsert_catalog("openagentskill.com", rows)
    write_index(
        root,
        "openagentskill.com",
        [
            f"Archived {utc_now()}. Agent APIs: skills (sample {len(skills)}), packs, tasks, showcase, registry stats, MCP, llms.",
            "Registry reports ~30k installable skills; public `?limit=` returns a ranked slice only (no full dump).",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# openagentskill.com errors\n\n"
        "No public unfiltered dump of 30k installable skills. Saved ranked API slices + directory HTML.\n",
    )
    print(f"openagentskill skills_slice={len(skills)} packs={len(packs)} tasks={len(tasks)}", flush=True)


def ingest_skillselion() -> None:
    root = REPO / "sources" / "skillselion.com"
    meta = root / "meta"
    fetch_ok("https://skillselion.com/llms.txt", meta / "llms.txt")
    fetch_ok("https://skillselion.com/.well-known/mcp.json", meta / "mcp.json")
    fetch_ok("https://skillselion.com/.well-known/api-catalog", meta / "api-catalog.json")
    items: list[dict] = []
    cursor = None
    pages = 0
    while pages < 80:
        url = "https://skillselion.com/api/v1/listings?limit=50"
        if cursor:
            url += f"&cursor={urllib.parse.quote(str(cursor))}"
        dest = meta / "listings" / f"page-{pages:03d}.json"
        st, data = get_json(url)
        if st != 200 or not isinstance(data, dict):
            break
        write_json(dest, data)
        chunk = data.get("items") or []
        items.extend(chunk)
        pages += 1
        if not data.get("hasMore") or not chunk:
            break
        cursor = data.get("cursor") or data.get("pageToken")
        if not cursor:
            break
    write_json(meta / "listings.json", {"count": len(items), "items": items})
    rows = [
        {
            "id": "skillselion.com",
            "title": "Skillselion",
            "url": "https://skillselion.com/",
            "source": "skillselion.com",
            "type": "site",
        }
    ]
    for it in items:
        sid = it.get("id") or it.get("slug")
        if not sid:
            continue
        rows.append(
            {
                "id": str(sid),
                "title": it.get("name") or it.get("title") or str(sid),
                "url": it.get("url") or f"https://skillselion.com/listings/{sid}",
                "source": "skillselion.com",
                "type": it.get("type") or "listing",
            }
        )
    upsert_catalog("skillselion.com", rows)
    write_index(
        root,
        "skillselion.com",
        [
            f"Archived {utc_now()}. Homepage HTML is 403; catalog via `/api/v1/listings` ({len(items)} items, {pages} pages).",
            "Also llms.txt, MCP card, RFC 9727 api-catalog. openapi.json is 403.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# skillselion.com errors\n\nHomepage and `/openapi.json` are 403. Listings API is public.\n",
    )
    print(f"skillselion items={len(items)} pages={pages}", flush=True)


def ingest_claude_plugins() -> None:
    root = REPO / "sources" / "claude-plugins.dev"
    meta = root / "meta"
    fetch_ok("https://claude-plugins.dev/", root / "pages" / "homepage.html")
    fetch_ok("https://claude-plugins.dev/sitemap.xml", meta / "sitemap.xml")
    plugins: list[dict] = []
    offset = 0
    total = None
    while offset < 60000:
        url = f"https://api.claude-plugins.dev/api/search?q=&limit=100&offset={offset}"
        dest = meta / "search" / f"offset-{offset:05d}.json"
        st, data = get_json(url)
        if st != 200 or not isinstance(data, dict):
            break
        write_json(dest, data)
        chunk = data.get("plugins") or []
        total = data.get("total")
        plugins.extend(chunk)
        print(f"  claude-plugins offset={offset} got={len(chunk)} total_acc={len(plugins)}", flush=True)
        if not chunk:
            break
        offset += 100
        if total is not None and offset >= int(total):
            break
        time.sleep(0.05)
    # compact dump, not 50k pretty catalog rows
    write_bytes(
        meta / "plugins.jsonl",
        ("\n".join(json.dumps(p, ensure_ascii=False) for p in plugins) + "\n").encode("utf-8"),
    )
    write_json(meta / "stats.json", {"count": len(plugins), "api_total": total, "scraped_at": utc_now()})
    rows = [
        {
            "id": "claude-plugins.dev",
            "title": "claude-plugins.dev",
            "url": "https://claude-plugins.dev/",
            "source": "claude-plugins.dev",
            "type": "site",
            "plugin_count": len(plugins),
        }
    ]
    upsert_catalog("claude-plugins.dev", rows)
    write_index(
        root,
        "claude-plugins.dev",
        [
            f"Archived {utc_now()} via `GET https://api.claude-plugins.dev/api/search` (q empty, limit 100).",
            f"- Plugins downloaded: {len(plugins)} (API total {total})",
            "- Full records in `meta/plugins.jsonl` (not exploded into catalog.json).",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# claude-plugins.dev errors\n\n"
        "Catalog has a single site row. All plugin metadata is in meta/plugins.jsonl "
        f"({len(plugins)} records) to keep catalog.json compact.\n",
    )
    print(f"claude-plugins {len(plugins)} / {total}", flush=True)


def ingest_agentskill() -> None:
    root = REPO / "sources" / "agentskill.sh"
    meta = root / "meta"
    fetch_ok("https://agentskill.sh/llms.txt", meta / "llms.txt")
    fetch_ok("https://agentskill.sh/llms-full.txt", meta / "llms-full.txt")
    fetch_ok("https://agentskill.sh/sitemap.xml", meta / "sitemap.xml")
    fetch_ok("https://agentskill.sh/", root / "pages" / "homepage.html")
    st, count = get_json("https://agentskill.sh/api/skills/count")
    write_json(meta / "count.json", count if count is not None else {"http": st})
    skills: list[dict] = []
    page = 1
    while page <= 20:
        url = f"https://agentskill.sh/api/skills?page={page}&limit=100"
        dest = meta / "skills" / f"page-{page}.json"
        st, data = get_json(url)
        if st != 200 or not isinstance(data, dict):
            break
        write_json(dest, data)
        chunk = data.get("data") or []
        skills.extend(chunk)
        if not data.get("hasMore") or not chunk:
            break
        page += 1
    write_json(meta / "skills.json", {"count": len(skills), "skills": skills})
    rows = [
        {
            "id": "agentskill.sh",
            "title": "AgentSkill",
            "url": "https://agentskill.sh/",
            "source": "agentskill.sh",
            "type": "site",
            "api_count": (count or {}).get("count") if isinstance(count, dict) else None,
        }
    ]
    for s in skills:
        slug = s.get("githubPath") or s.get("_id") or s.get("name")
        if not slug:
            continue
        rows.append(
            {
                "id": str(slug),
                "title": s.get("name") or str(slug),
                "url": f"https://agentskill.sh/{slug}" if "/" not in str(slug) else f"https://github.com/{slug}",
                "source": "agentskill.sh",
                "type": "skill",
            }
        )
    upsert_catalog("agentskill.sh", rows)
    write_index(
        root,
        "agentskill.sh",
        [
            f"Archived {utc_now()}. `/api/skills` list returned {len(skills)} rows.",
            f"`/api/skills/count` reports {count}. Public list is a small curated slice, not 275k files.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# agentskill.sh errors\n\n"
        f"Count endpoint reports {(count or {}).get('count') if isinstance(count, dict) else count}; "
        f"list API only yielded {len(skills)} skills (`totalExact` false). Sitemap is not a URL set.\n",
    )
    print(f"agentskill listed={len(skills)} count={count}", flush=True)


def ingest_agent_packs() -> None:
    dest = REPO / "sources" / "github" / "agent-packs-registry"
    sha = clone_pack("agent-packs/registry", dest)
    rows = pack_rows("agent-packs-registry", "agent-packs/registry", dest, sha)
    write_index(
        dest,
        "agent-packs/registry",
        [f"Shallow clone https://github.com/agent-packs/registry `{sha[:12]}`. `.git` stripped."],
    )
    write_text(dest / "ERRORS.md", "# errors\n\nNone.\n")
    upsert_catalog("github/agent-packs-registry", rows)
    print(f"agent-packs rows={len(rows)}", flush=True)


def ingest_clawhub() -> None:
    root = REPO / "sources" / "clawhub.ai"
    meta = root / "meta"
    fetch_ok("https://clawhub.ai/llms.txt", meta / "llms.txt")
    fetch_ok("https://clawhub.ai/api/v1/openapi.json", meta / "openapi.json")
    fetch_ok("https://clawhub.ai/", root / "pages" / "homepage.html")
    fetch_ok("https://clawhub.ai/skills", root / "pages" / "skills.html")

    def page_cursor(path: str, key: str, cap: int = 80) -> list[dict]:
        items: list[dict] = []
        cursor = None
        for i in range(cap):
            url = f"https://clawhub.ai{path}"
            if cursor:
                url += ("&" if "?" in url else "?") + "cursor=" + urllib.parse.quote(cursor)
            dest = meta / key / f"page-{i:03d}.json"
            st, data = get_json(url)
            if st != 200 or not isinstance(data, dict):
                break
            write_json(dest, data)
            chunk = data.get("items") or []
            items.extend(chunk)
            cursor = data.get("nextCursor")
            print(f"  clawhub {key} page={i} +{len(chunk)} total={len(items)}", flush=True)
            if not cursor or not chunk:
                break
        return items

    skills = page_cursor("/api/v1/skills", "skills")
    packages = page_cursor("/api/v1/packages", "packages")
    write_json(meta / "skills.json", {"count": len(skills), "items": skills})
    write_json(meta / "packages.json", {"count": len(packages), "items": packages})
    rows = [
        {
            "id": "clawhub.ai",
            "title": "ClawHub",
            "url": "https://clawhub.ai/",
            "source": "clawhub.ai",
            "type": "site",
        }
    ]
    for it in skills:
        name = it.get("name") or it.get("slug") or it.get("id")
        if not name:
            continue
        rows.append(
            {
                "id": f"skill/{name}",
                "title": it.get("displayName") or it.get("title") or str(name),
                "url": f"https://clawhub.ai/skills/{name}",
                "source": "clawhub.ai",
                "type": "skill",
            }
        )
    for it in packages:
        name = it.get("name") or it.get("slug") or it.get("id")
        if not name:
            continue
        rows.append(
            {
                "id": f"package/{name}",
                "title": it.get("displayName") or it.get("title") or str(name),
                "url": f"https://clawhub.ai/plugins/{name}",
                "source": "clawhub.ai",
                "type": "package",
            }
        )
    upsert_catalog("clawhub.ai", rows)
    write_index(
        root,
        "clawhub.ai",
        [
            f"Archived {utc_now()}. OpenAPI + cursor-paginated `/api/v1/skills` ({len(skills)}) and `/api/v1/packages` ({len(packages)}).",
        ],
    )
    write_text(root / "ERRORS.md", "# clawhub.ai errors\n\nNone if pages exhausted via nextCursor.\n")
    print(f"clawhub skills={len(skills)} packages={len(packages)}", flush=True)


def ingest_agensi() -> None:
    root = REPO / "sources" / "agensi.io"
    meta = root / "meta"
    fetch_ok("https://www.agensi.io/sitemap.xml", meta / "sitemap.xml")
    for name in ("skills", "learn", "creators", "bundles", "pages"):
        fetch_ok(f"https://www.agensi.io/sitemap-{name}.xml", meta / f"sitemap-{name}.xml")
    skill_locs = []
    if (meta / "sitemap-skills.xml").exists():
        skill_locs = sitemap_locs((meta / "sitemap-skills.xml").read_bytes())
    write_json(meta / "skill-urls.json", {"count": len(skill_locs), "urls": skill_locs})
    pages = [
        "https://www.agensi.io/grok-bot-marketplace",
        "https://www.agensi.io/grok-bot-marketplace/all-skills",
        "https://www.agensi.io/grok-marketplace",
        "https://www.agensi.io/",
        "https://www.agensi.io/agents",
        "https://www.agensi.io/bundles",
    ]
    jobs = []
    for url in pages:
        slug = url.replace("https://www.agensi.io/", "").strip("/") or "index"
        jobs.append((url, root / "pages" / f"{slug.replace('/', '__')}.html"))
    ok, fail = fetch_many(jobs, workers=6)
    rows = [
        {
            "id": "agensi.io",
            "title": "Agensi",
            "url": "https://www.agensi.io/",
            "source": "agensi.io",
            "type": "site",
        },
        {
            "id": "grok-bot-marketplace",
            "title": "Agensi Grok Bot marketplace",
            "url": "https://www.agensi.io/grok-bot-marketplace",
            "source": "agensi.io",
            "type": "listing",
        },
    ]
    # catalog skill slugs from sitemap (not 5k HTML pages)
    for url in skill_locs:
        if "/skills/" not in url:
            continue
        slug = url.rstrip("/").split("/")[-1]
        if slug in {"free", "skills"}:
            continue
        # category pages vs items: keep all unique last segments that look like items
        rows.append(
            {
                "id": slug,
                "title": slug,
                "url": url,
                "source": "agensi.io",
                "type": "skill-url",
            }
        )
        if len(rows) > 4000:
            break
    upsert_catalog("agensi.io", rows)
    write_index(
        root,
        "agensi.io",
        [
            f"Archived {utc_now()}. Grok bot marketplace HTML + sitemaps.",
            f"- Skill sitemap URLs: {len(skill_locs)} (not individually fetched; listed in meta/skill-urls.json)",
            f"- Marketplace/hub pages OK: {ok}; failed: {fail}",
            f"- Catalog rows (capped): {len(rows)}",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# agensi.io errors\n\n"
        f"Did not fetch {len(skill_locs)} per-skill HTML pages (Next.js shells). URL list saved.\n",
    )
    print(f"agensi skill_urls={len(skill_locs)} catalog={len(rows)}", flush=True)


def main() -> int:
    order = [
        ("botdirectory", ingest_botdirectory),
        ("botmarket", ingest_botmarket),
        ("a2a", ingest_a2a),
        ("openagentskill", ingest_openagentskill),
        ("skillselion", ingest_skillselion),
        ("claude-plugins", ingest_claude_plugins),
        ("agentskill", ingest_agentskill),
        ("agent-packs", ingest_agent_packs),
        ("clawhub", ingest_clawhub),
        ("agensi", ingest_agensi),
    ]
    wanted = set(sys.argv[1:] or [n for n, _ in order])
    for name, fn in order:
        if name in wanted:
            print(f"===== {name} =====", flush=True)
            fn()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

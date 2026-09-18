#!/usr/bin/env python3
"""2026-09-18 refresh: official Grok marketplace + third-party Grok galleries.

Force-refetches indexes/APIs. Downloads only missing per-item bodies.
Never wipes unrelated catalog.json rows. Caps large new sources.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_additional_sources import ingest_botteams, ingest_usegrokbot  # noqa: E402
from ingest_priority_a import (  # noqa: E402
    CATALOG,
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
from ingest_xai_marketplace import main as refresh_xai_marketplace  # noqa: E402

CATALOG_SOFT_CAP = 100 * 1024 * 1024  # GitHub hard limit
ITEM_ROW_CAP = 2000


def catalog_size() -> int:
    return CATALOG.stat().st_size if CATALOG.exists() else 0


def upsert_capped(source: str, rows: list[dict], *, item_cap: int = ITEM_ROW_CAP) -> list[dict]:
    site = [r for r in rows if r.get("type") in {"site", "listing", "meta"} or r.get("id") == source]
    items = [r for r in rows if r not in site]
    if len(items) > item_cap:
        kept_items = items[:item_cap]
        note = {
            "id": f"{source}/catalog-cap",
            "title": f"{source} catalog cap ({len(items)} items; first {item_cap} in catalog.json)",
            "url": rows[0].get("url") if rows else "",
            "source": source,
            "type": "site",
            "catalog_item_count": len(items),
            "catalog_rows_kept": item_cap,
        }
        out = site + [note] + kept_items
    else:
        out = site + items
    before = catalog_size()
    upsert_catalog(source, out)
    after = catalog_size()
    print(f"  catalog.json {before} → {after} bytes (cap {CATALOG_SOFT_CAP})", flush=True)
    if after > CATALOG_SOFT_CAP - 400_000:
        print("  WARNING: catalog.json near GitHub 100MB cap", flush=True)
    return out


def force_get(url: str, dest: Path) -> bool:
    return fetch_ok(url, dest, force=True)


def refresh_grokbothq() -> None:
    root = REPO / "sources" / "grokbothq.xyz"
    meta = root / "meta"
    errors: list[str] = []
    force_get("https://grokbothq.xyz/api/v1/index.json", meta / "index.json")
    force_get("https://grokbothq.xyz/llms.txt", meta / "llms.txt")
    force_get("https://grokbothq.xyz/rss.xml", meta / "rss.xml")
    force_get("https://grokbothq.xyz/sitemap.xml", meta / "sitemap.xml")
    force_get("https://grokbothq.xyz/bots", root / "pages" / "bots.html")
    idx = json.loads((meta / "index.json").read_text(encoding="utf-8"))
    bots = idx.get("bots") or []
    jobs = []
    for bot in bots:
        slug = bot.get("slug")
        if slug:
            jobs.append((f"https://grokbothq.xyz/bots/{slug}.md", root / "bots" / f"{slug}.md"))
    ok, fail = fetch_many(jobs, workers=12, force=False)
    if fail:
        errors.append(f"{fail} markdown pages failed")
    write_json(meta / "refresh.json", {"at": utc_now(), "bots": len(bots), "md_ok": ok, "md_fail": fail})
    rows = [
        {
            "id": "grokbothq.xyz",
            "title": idx.get("name") or "GrokBot HQ",
            "url": "https://grokbothq.xyz/",
            "source": "grokbothq.xyz",
            "type": "site",
            "bots": len(bots),
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
                "url": bot.get("page") or f"https://grokbothq.xyz/bots/{slug}",
                "source": "grokbothq.xyz",
                "type": "bot",
                "author": bot.get("builder"),
                "category": bot.get("category"),
                "installs": bot.get("installs"),
            }
        )
    upsert_capped("grokbothq.xyz", rows)
    write_index(
        root,
        "grokbothq.xyz",
        [
            f"Refreshed {utc_now()}. Machine index `/api/v1/index.json` plus per-bot `.md`.",
            f"- Bots in index: {len(bots)}",
            f"- Markdown fetches OK (incl. previously archived): {ok}; failed: {fail}",
            "- Also: llms.txt, RSS, sitemap, listing HTML.",
        ],
    )
    write_text(root / "ERRORS.md", "# grokbothq.xyz\n\n" + ("\n".join(f"- {e}" for e in errors) or "None.") + "\n")
    print(f"grokbothq bots={len(bots)} md_ok={ok} fail={fail}", flush=True)


def refresh_grokindex() -> None:
    root = REPO / "sources" / "grokindex.dev"
    meta = root / "meta"
    errors: list[str] = []
    force_get("https://grokindex.dev/sitemap.xml", meta / "sitemap.xml")
    force_get("https://grokindex.dev/", root / "pages" / "homepage.html")
    bots: list[dict] = []
    page = 1
    while True:
        url = f"https://grokindex.dev/api/bots?page={page}"
        dest = meta / "api" / f"bots-page-{page}.json"
        if not force_get(url, dest):
            errors.append(f"API page {page} failed")
            break
        data = json.loads(dest.read_text(encoding="utf-8"))
        chunk = data.get("bots") or []
        bots.extend(chunk)
        if not data.get("hasMore"):
            break
        page += 1
        if page > 120:
            errors.append("API pagination cap 120 pages")
            break
    write_json(meta / "bots.json", {"count": len(bots), "bots": bots, "refreshed_at": utc_now()})
    rows = [
        {
            "id": "grokindex.dev",
            "title": "GrokIndex",
            "url": "https://grokindex.dev/",
            "source": "grokindex.dev",
            "type": "site",
            "bots": len(bots),
        }
    ]
    for bot in bots:
        slug = bot.get("slug")
        if not slug:
            continue
        rows.append(
            {
                "id": slug,
                "title": bot.get("title") or slug,
                "url": f"https://grokindex.dev/bots/{slug}",
                "source": "grokindex.dev",
                "type": "bot",
                "category": bot.get("category"),
                "pricing": bot.get("pricing"),
            }
        )
    upsert_capped("grokindex.dev", rows)
    write_index(
        root,
        "grokindex.dev",
        [
            f"Refreshed {utc_now()} via paginated `GET /api/bots` (total {len(bots)}).",
            "- Per-bot HTML not fetched (API already has title/description/category/pricing).",
            f"- API pages saved under meta/api/.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# grokindex.dev\n\n" + ("\n".join(f"- {e}" for e in errors) or "Per-bot HTML capped; catalog from JSON API.") + "\n",
    )
    print(f"grokindex bots={len(bots)}", flush=True)


def refresh_grokyard() -> None:
    root = REPO / "sources" / "grokyard.com"
    errors: list[str] = []
    for name, url in {
        "homepage.html": "https://grokyard.com/",
        "browse.html": "https://grokyard.com/browse",
        "about.html": "https://grokyard.com/about",
    }.items():
        if not force_get(url, root / "pages" / name):
            errors.append(f"fail {url}")
    browse = (root / "pages" / "browse.html").read_text(encoding="utf-8", errors="replace")
    slugs = sorted(set(re.findall(r"/b/([a-z0-9-]+)", browse, flags=re.I)))
    jobs = [(f"https://grokyard.com/b/{slug}", root / "bots" / slug / "page.html") for slug in slugs]
    ok, fail = fetch_many(jobs, workers=6, force=False)
    rows = [
        {
            "id": "grokyard.com",
            "title": "Grokyard",
            "url": "https://grokyard.com/",
            "source": "grokyard.com",
            "type": "site",
            "bots": len(slugs),
        }
    ]
    for slug in slugs:
        page = root / "bots" / slug / "page.html"
        title = title_from_html(page.read_bytes()) if page.exists() else slug
        write_json(
            root / "bots" / slug / "meta.json",
            {"id": slug, "url": f"https://grokyard.com/b/{slug}", "title": title, "scraped_at": utc_now()},
        )
        rows.append(
            {
                "id": slug,
                "title": title or slug,
                "url": f"https://grokyard.com/b/{slug}",
                "source": "grokyard.com",
                "type": "bot",
            }
        )
    upsert_capped("grokyard.com", rows)
    write_index(
        root,
        "grokyard.com",
        [
            f"Refreshed {utc_now()}. Public browse listed {len(slugs)} shareable bots.",
            f"- Bot pages OK: {ok}; failed: {fail}",
        ],
    )
    write_text(root / "ERRORS.md", "# grokyard.com\n\n" + ("\n".join(f"- {e}" for e in errors) or "No sitemap/API; listing from /browse HTML.") + "\n")
    print(f"grokyard slugs={len(slugs)}", flush=True)


def refresh_gtemplate() -> None:
    root = REPO / "sources" / "gtemplate.net"
    force_get("https://gtemplate.net/sitemap.xml", root / "meta" / "sitemap.xml")
    locs = sitemap_locs((root / "meta" / "sitemap.xml").read_bytes()) if (root / "meta" / "sitemap.xml").exists() else []
    jobs = []
    for url in locs:
        path = urllib.parse.urlparse(url).path.strip("/") or "index"
        rel = path.replace("/", "__") + ".html"
        jobs.append((url, root / "pages" / rel))
    ok, fail = fetch_many(jobs, workers=6, force=False)
    rows = [
        {
            "id": "gtemplate.net",
            "title": "gtemplate.net",
            "url": "https://gtemplate.net/",
            "source": "gtemplate.net",
            "type": "site",
        }
    ]
    for url in locs:
        if "/bots/" not in url:
            continue
        slug = url.rstrip("/").split("/")[-1]
        page = root / "pages" / f"bots__{slug}.html"
        title = title_from_html(page.read_bytes()) if page.exists() else slug
        rows.append({"id": slug, "title": title or slug, "url": url, "source": "gtemplate.net", "type": "bot"})
    upsert_capped("gtemplate.net", rows)
    write_index(
        root,
        "gtemplate.net",
        [
            f"Refreshed {utc_now()}. Sitemap URLs: {len(locs)}.",
            f"- Fetches OK: {ok}; failed: {fail}",
            f"- Bot catalog rows: {sum(1 for r in rows if r.get('type') == 'bot')}",
        ],
    )
    write_text(root / "ERRORS.md", "# gtemplate.net\n\n" + (f"{fail} pages failed." if fail else "None.") + "\n")
    print(f"gtemplate pages={ok} bots={sum(1 for r in rows if r.get('type')=='bot')}", flush=True)


def refresh_grokbot_dev() -> None:
    root = REPO / "sources" / "grokbot.dev"
    api = root / "api"
    errors: list[str] = []
    lists = {
        "status.json": "https://grokbot.dev/api/v1/status.json",
        "feed.json": "https://grokbot.dev/api/v1/feed.json",
        "templates.json": "https://grokbot.dev/api/v1/templates.json",
        "plugins.json": "https://grokbot.dev/api/v1/plugins.json",
        "use-cases.json": "https://grokbot.dev/api/v1/use-cases.json",
        "collections.json": "https://grokbot.dev/api/v1/collections.json",
        "news.json": "https://grokbot.dev/api/v1/news.json",
        "latest.json": "https://grokbot.dev/api/v1/latest.json",
    }
    for name, url in lists.items():
        if not force_get(url, api / name):
            errors.append(f"list fail {url}")
    force_get("https://grokbot.dev/llms.txt", root / "meta" / "llms.txt")
    force_get("https://grokbot.dev/rss.xml", root / "meta" / "rss.xml")
    details: list[tuple[str, str, str]] = []
    for name in ("templates.json", "plugins.json", "use-cases.json", "collections.json", "news.json"):
        path = api / name
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for item in data.get("items") or []:
            slug = item.get("slug")
            durl = item.get("detail_url")
            typ = item.get("type") or name.split(".")[0]
            if slug and durl:
                details.append((typ, slug, durl))
    jobs = [(durl, root / "details" / typ / f"{slug}.json") for typ, slug, durl in details]
    ok, fail = fetch_many(jobs, workers=10, force=False)
    rows = [
        {
            "id": "grokbot.dev",
            "title": "grokbot.dev",
            "url": "https://grokbot.dev/",
            "source": "grokbot.dev",
            "type": "site",
        }
    ]
    seen = set()
    for typ, slug, durl in details:
        dest = root / "details" / typ / f"{slug}.json"
        title = slug
        page_url = f"https://grokbot.dev/{typ}s/{slug}/"
        if dest.exists():
            try:
                obj = json.loads(dest.read_text(encoding="utf-8"))
                title = obj.get("name") or obj.get("headline") or obj.get("title") or slug
                page_url = obj.get("url") or page_url
            except json.JSONDecodeError:
                pass
        key = f"{typ}/{slug}"
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "id": key,
                "title": title,
                "url": page_url,
                "source": "grokbot.dev",
                "type": typ,
                "detail_url": durl,
            }
        )
    upsert_capped("grokbot.dev", rows)
    write_index(
        root,
        "grokbot.dev",
        [
            f"Refreshed {utc_now()} via JSON API + RSS + llms.txt.",
            f"- Detail records: {ok} OK, {fail} failed",
            f"- Catalog rows: {len(rows)}",
        ],
    )
    write_text(root / "ERRORS.md", "# grokbot.dev\n\n" + ("\n".join(f"- {e}" for e in errors) or "None.") + "\n")
    print(f"grokbot.dev details ok={ok} fail={fail} rows={len(rows)}", flush=True)


def refresh_somi() -> None:
    root = REPO / "sources" / "somi.ai"
    meta = root / "meta"
    bots = root / "grok-bots"
    force_get("https://somi.ai/sitemap.xml", meta / "sitemap.xml")
    force_get("https://somi.ai/grok-bots", root / "pages" / "grok-bots.html")
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    grok_urls = sorted({u for u in locs if "/grok-bots/" in u})
    write_json(meta / "grok-bot-urls.json", {"count": len(grok_urls), "urls": grok_urls, "refreshed_at": utc_now()})
    jobs = [(url, bots / url.rstrip("/").split("/")[-1] / "page.html") for url in grok_urls]
    ok, fail = fetch_many(jobs, workers=10, force=False)
    rows = [
        {"id": "somi.ai", "title": "Somi.ai", "url": "https://somi.ai/", "source": "somi.ai", "type": "site"},
        {"id": "grok-bots", "title": "Somi.ai Grok bots listing", "url": "https://somi.ai/grok-bots", "source": "somi.ai", "type": "listing"},
    ]
    for url in grok_urls:
        slug = url.rstrip("/").split("/")[-1]
        page = bots / slug / "page.html"
        title = title_from_html(page.read_bytes()) if page.exists() else slug
        rows.append({"id": slug, "title": title or slug, "url": url, "source": "somi.ai", "type": "grok-bot"})
    upsert_capped("somi.ai", rows)
    write_index(
        root,
        "somi.ai",
        [
            f"Refreshed {utc_now()}. Sitemap `/grok-bots/*` pages: {len(grok_urls)}.",
            f"- Pages OK: {ok}; failed: {fail}",
        ],
    )
    write_text(root / "ERRORS.md", "# somi.ai\n\n" + (f"{fail} pages failed." if fail else "None.") + "\n")
    print(f"somi.ai bots={len(grok_urls)} fail={fail}", flush=True)


def clone_pack(repo: str, dirname: str) -> str | None:
    dest = REPO / "sources" / "github" / dirname
    tmp = Path("/tmp/gh-2026-09-18") / dirname
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.parent.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.check_call(
            ["gh", "repo", "clone", repo, str(tmp), "--", "--depth", "1"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
        )
    except subprocess.CalledProcessError:
        print(f"clone fail {repo}", flush=True)
        return None
    sha = subprocess.check_output(["git", "-C", str(tmp), "rev-parse", "HEAD"], text=True).strip()
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(tmp, dest, ignore=shutil.ignore_patterns(".git", "node_modules", ".next"))
    leftover = dest / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)
    n = sum(1 for p in dest.rglob("*") if p.is_file())
    write_index(
        dest,
        repo,
        [
            f"Shallow clone of https://github.com/{repo} at `{sha[:12]}`. `.git` stripped.",
            f"- Files: {n}",
            f"- Archived {utc_now()}.",
        ],
    )
    write_text(dest / "ERRORS.md", f"# {repo}\n\nNone.\n")
    print(f"cloned {repo} files={n} sha={sha[:12]}", flush=True)
    return sha


def ingest_html_gallery(source: str, home: str, extra_urls: list[str], title: str) -> None:
    """Archive a newly discovered gallery: homepage, sitemap, llms, listing HTML, extracted hrefs."""
    root = REPO / "sources" / source
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    force_get(home, pages / "home.html")
    for path in ("/sitemap.xml", "/llms.txt", "/robots.txt", "/about", "/browse", "/templates", "/bots"):
        url = urllib.parse.urljoin(home, path)
        dest_name = path.strip("/").replace("/", "__") or "index"
        ext = ".xml" if path.endswith(".xml") else (".txt" if path.endswith(".txt") else ".html")
        force_get(url, meta / f"{dest_name}{ext}" if ext != ".html" else pages / f"{dest_name}.html")
    for url in extra_urls:
        name = urllib.parse.urlparse(url).path.strip("/").replace("/", "__") or "extra"
        dest = meta / f"{name}.json" if url.endswith(".json") or "/api/" in url else pages / f"{name}.html"
        if not force_get(url, dest):
            errors.append(f"fail {url}")
    hrefs: list[str] = []
    for html_path in pages.glob("*.html"):
        text = html_path.read_text(encoding="utf-8", errors="replace")
        hrefs.extend(re.findall(r'href=["\']([^"\']+)["\']', text, flags=re.I))
    item_hrefs = []
    for h in hrefs:
        if re.search(r"/(bots?|templates?|b)/[a-z0-9-]+", h, re.I):
            item_hrefs.append(urllib.parse.urljoin(home, h))
    item_hrefs = sorted(set(item_hrefs))
    write_json(meta / "item-urls.json", {"count": len(item_hrefs), "urls": item_hrefs, "scraped_at": utc_now()})
    jobs = []
    for url in item_hrefs[:1500]:
        slug = url.rstrip("/").split("/")[-1] or "index"
        jobs.append((url, root / "items" / slug / "page.html"))
    ok, fail = fetch_many(jobs, workers=8, force=False)
    rows = [
        {
            "id": source,
            "title": title,
            "url": home,
            "source": source,
            "type": "site",
            "items": len(item_hrefs),
        }
    ]
    for url in item_hrefs:
        slug = url.rstrip("/").split("/")[-1]
        page = root / "items" / slug / "page.html"
        name = title_from_html(page.read_bytes()) if page.exists() else slug
        rows.append({"id": slug, "title": name or slug, "url": url, "source": source, "type": "bot"})
    upsert_capped(source, rows, item_cap=400)
    write_index(
        root,
        source,
        [
            f"New gallery archived {utc_now()} from {home}.",
            f"- Item hrefs extracted: {len(item_hrefs)}",
            f"- Pages OK: {ok}; failed: {fail}",
            "- Attribution stays on the original URLs. No invented listings.",
        ],
    )
    write_text(root / "ERRORS.md", f"# {source}\n\n" + ("\n".join(f"- {e}" for e in errors) or "None.") + "\n")
    print(f"{source} items={len(item_hrefs)} ok={ok} fail={fail}", flush=True)


def refresh_agent_hunt() -> None:
    root = REPO / "sources" / "agent-hunt.netlify.app"
    meta = root / "meta"
    if not force_get("https://agent-hunt.netlify.app/agents.json", meta / "agents.json"):
        write_text(root / "ERRORS.md", "# agent-hunt\n\nagents.json refresh failed.\n")
        print("agent-hunt refresh failed", flush=True)
        return
    agents = json.loads((meta / "agents.json").read_text(encoding="utf-8"))
    if isinstance(agents, dict):
        agents = agents.get("agents") or agents.get("items") or []
    write_json(meta / "refresh.json", {"at": utc_now(), "count": len(agents)})
    rows = [
        {
            "id": "agent-hunt.netlify.app",
            "title": "Agenthunt",
            "url": "https://agent-hunt.netlify.app/",
            "source": "agent-hunt.netlify.app",
            "type": "site",
            "agents": len(agents),
        }
    ]
    for ag in agents:
        aid = str(ag.get("id") or ag.get("slug") or ag.get("name") or "")
        if not aid:
            continue
        dest = root / "agents" / aid
        dest.mkdir(parents=True, exist_ok=True)
        write_json(dest / "meta.json", ag)
        rows.append(
            {
                "id": aid,
                "title": ag.get("name") or aid,
                "url": ag.get("url") or f"https://agent-hunt.netlify.app/#{aid}",
                "source": "agent-hunt.netlify.app",
                "type": "agent",
            }
        )
    upsert_capped("agent-hunt.netlify.app", rows, item_cap=400)
    write_index(
        root,
        "agent-hunt.netlify.app (Agenthunt)",
        [
            f"Refreshed `{utc_now()}` from https://agent-hunt.netlify.app/agents.json.",
            f"**{len(agents)}** agents in `meta/agents.json`.",
            "Canonical pages live on the listed product sites. Do not invent listings.",
        ],
    )
    print(f"agent-hunt agents={len(agents)}", flush=True)


def refresh_skills_sh_sitemap() -> None:
    """Re-check sitemap; record new skill URLs. Do not bulk-download (60/hour cap)."""
    root = REPO / "sources" / "skills.sh"
    meta = root / "meta"
    force_get("https://www.skills.sh/sitemap.xml", meta / "sitemap.xml")
    idx = (meta / "sitemap.xml").read_bytes() if (meta / "sitemap.xml").exists() else b""
    childs = [u for u in sitemap_locs(idx) if "sitemap" in u.lower()]
    all_locs: list[str] = []
    for i, url in enumerate(childs, start=1):
        dest = meta / f"sitemap-child-{i}.xml"
        if force_get(url, dest):
            all_locs.extend(sitemap_locs(dest.read_bytes()))
    skill_urls = sorted({u for u in all_locs if re.search(r"skills\.sh/[^/]+/[^/]+/[^/]+", u)})
    write_json(meta / "sitemap-refresh-2026-09-18.json", {"at": utc_now(), "count": len(skill_urls), "child_sitemaps": childs})
    existing_ids = set()
    # existing skill trees
    skills_root = root / "skills"
    if skills_root.exists():
        for owner in skills_root.iterdir():
            if not owner.is_dir():
                continue
            for repo in owner.iterdir():
                if not repo.is_dir():
                    continue
                for slug in repo.iterdir():
                    if slug.is_dir():
                        existing_ids.add(f"{owner.name}/{repo.name}/{slug.name}")
    new_ids = []
    for url in skill_urls:
        parts = urllib.parse.urlparse(url).path.strip("/").split("/")
        if len(parts) >= 3:
            key = "/".join(parts[:3])
            if key not in existing_ids:
                new_ids.append(key)
    write_json(meta / "sitemap-new-ids-2026-09-18.json", {"count": len(new_ids), "ids": new_ids[:5000]})
    print(f"skills.sh sitemap skills={len(skill_urls)} new_ids={len(new_ids)}", flush=True)


def refresh_souls_llms() -> None:
    root = REPO / "sources" / "souls.directory"
    force_get("https://souls.directory/llms.txt", root / "llms.txt")
    text = (root / "llms.txt").read_text(encoding="utf-8", errors="replace") if (root / "llms.txt").exists() else ""
    apis = [ln.strip() for ln in text.splitlines() if "/api/souls/" in ln and ln.strip().startswith("http")]
    souls_root = root / "souls"
    on_disk = sum(1 for p in souls_root.rglob("SOUL.md") if p.is_file()) if souls_root.exists() else 0
    write_json(root / "meta" / "refresh-2026-09-18.json", {"at": utc_now(), "llms_api_urls": len(apis), "soul_md": on_disk})
    print(f"souls.directory llms_api={len(apis)} on_disk={on_disk}", flush=True)


def refresh_clawhub_cursor() -> None:
    """Refresh homepage + one API page. Do not paginate 50k or bloat catalog.json."""
    root = REPO / "sources" / "clawhub.ai"
    meta = root / "meta"
    force_get("https://clawhub.ai/", root / "pages" / "homepage.html")
    force_get("https://hub.openclaw.ai/", root / "pages" / "hub.openclaw.ai-home.html")
    force_get("https://clawhub.ai/llms.txt", meta / "llms.txt")
    force_get("https://clawhub.ai/api/v1/skills?limit=50", meta / "skills-sample-2026-09-18.json")
    write_json(
        meta / "refresh-2026-09-18.json",
        {
            "at": utc_now(),
            "note": "Full slug walk skipped to protect catalog.json 100MB cap. Existing meta/skills.json remains the last complete dump (43969).",
            "hub_openclaw_ai": "same registry UI; homepage snapshotted",
        },
    )
    print("clawhub homepage+sample refreshed (no catalog growth)", flush=True)


def ingest_grokbot_templates_com() -> None:
    source = "grokbot-templates.com"
    root = REPO / "sources" / source
    meta = root / "meta"
    meta.mkdir(parents=True, exist_ok=True)
    force_get("https://grokbot-templates.com/", root / "pages" / "home.html")
    force_get("https://grokbot-templates.com/about", root / "pages" / "about.html")
    force_get("https://grokbot-templates.com/llms.txt", meta / "llms.txt")
    force_get("https://grokbot-templates.com/sitemap.xml", meta / "sitemap.xml")
    items: list[dict] = []
    page = 1
    errors: list[str] = []
    while True:
        url = f"https://grokbot-templates.com/api/templates?page={page}"
        dest = meta / "api" / f"templates-page-{page:03d}.json"
        if not force_get(url, dest):
            errors.append(f"API page {page} failed")
            break
        data = json.loads(dest.read_text(encoding="utf-8"))
        chunk = ((data.get("data") or {}).get("items")) or []
        items.extend(chunk)
        total = (data.get("data") or {}).get("total") or 0
        if not chunk or len(items) >= total or page >= 80:
            break
        page += 1
    write_json(meta / "templates.json", {"count": len(items), "items": items, "refreshed_at": utc_now()})
    rows = [
        {
            "id": source,
            "title": "Grok Bot Templates directory",
            "url": "https://grokbot-templates.com/",
            "source": source,
            "type": "site",
            "templates": len(items),
        }
    ]
    for it in items:
        slug = it.get("shareId") or it.get("slug") or it.get("name")
        if not slug:
            continue
        rows.append(
            {
                "id": str(slug),
                "title": it.get("name") or str(slug),
                "url": it.get("shareUrl") or f"https://grokbot-templates.com/templates/{slug}",
                "source": source,
                "type": "template",
                "listing": f"https://grokbot-templates.com/templates/{slug}",
            }
        )
        dest = root / "items" / str(slug)
        dest.mkdir(parents=True, exist_ok=True)
        write_json(dest / "item.json", it)
    upsert_capped(source, rows, item_cap=400)
    write_index(
        root,
        source,
        [
            f"Archived {utc_now()} from paginated `GET /api/templates` (total {len(items)}; site claims ~1142, live total field on page 1).",
            "- Full JSON in `meta/templates.json`. Catalog.json keeps a site row + first 400 items (100MB cap).",
            "- Also: homepage, about, llms.txt, sitemap (1588 locs: templates/use-cases/teams).",
            "- Original share URLs are x.ai/bot/* — attribution stays on those pages. No invented listings.",
        ],
    )
    write_text(root / "ERRORS.md", f"# {source}\n\n" + ("\n".join(f"- {e}" for e in errors) or "None.") + "\n")
    print(f"{source} templates={len(items)} pages={page}", flush=True)


def ingest_grokbottemplates_dev() -> None:
    source = "grokbottemplates.dev"
    root = REPO / "sources" / source
    meta = root / "meta"
    meta.mkdir(parents=True, exist_ok=True)
    force_get("https://www.grokbottemplates.dev/templates", root / "pages" / "templates.html")
    force_get("https://www.grokbottemplates.dev/sitemap.xml", meta / "sitemap.xml")
    force_get("https://www.grokbottemplates.dev/api/templates", meta / "templates.json")
    items = []
    if (meta / "templates.json").exists():
        data = json.loads((meta / "templates.json").read_text(encoding="utf-8"))
        items = data.get("templates") or []
    rows = [
        {
            "id": source,
            "title": "Grok Bot Templates (grokbottemplates.dev)",
            "url": "https://www.grokbottemplates.dev/templates",
            "source": source,
            "type": "site",
            "templates": len(items),
        }
    ]
    for it in items:
        slug = it.get("slug")
        if not slug:
            continue
        rows.append(
            {
                "id": slug,
                "title": it.get("name") or slug,
                "url": it.get("url") or f"https://www.grokbottemplates.dev/templates/{slug}",
                "source": source,
                "type": "template",
                "shareUrl": it.get("shareUrl"),
                "category": it.get("category"),
            }
        )
        dest = root / "items" / slug
        dest.mkdir(parents=True, exist_ok=True)
        write_json(dest / "item.json", it)
    upsert_capped(source, rows, item_cap=400)
    write_index(
        root,
        source,
        [
            f"Archived {utc_now()} from `GET /api/templates` ({len(items)} public listings).",
            "- Full JSON in `meta/templates.json`. Catalog.json keeps a site row + first 400 items.",
            "- Attribution: original `shareUrl` (x.ai/bot/...) and `sourceUrl` when present.",
        ],
    )
    write_text(root / "ERRORS.md", f"# {source}\n\nNone.\n")
    print(f"{source} templates={len(items)}", flush=True)


def ingest_grokmarket() -> None:
    source = "grokmarket.io"
    root = REPO / "sources" / source
    meta = root / "meta"
    meta.mkdir(parents=True, exist_ok=True)
    force_get("https://grokmarket.io/", root / "pages" / "home.html")
    force_get("https://grokmarket.io/llms.txt", meta / "llms.txt")
    force_get("https://grokmarket.io/sitemap.xml", meta / "sitemap.xml")
    force_get("https://grokmarket.io/api/templates", meta / "templates.json")
    items = []
    if (meta / "templates.json").exists():
        data = json.loads((meta / "templates.json").read_text(encoding="utf-8"))
        items = data.get("templates") or []
    rows = [
        {
            "id": source,
            "title": "GrokMarket",
            "url": "https://grokmarket.io/",
            "source": source,
            "type": "site",
            "templates": len(items),
        }
    ]
    for it in items:
        slug = it.get("slug") or it.get("id")
        if not slug:
            continue
        rows.append(
            {
                "id": str(slug),
                "title": it.get("name") or str(slug),
                "url": it.get("templateUrl") or f"https://grokmarket.io/templates/{slug}",
                "source": source,
                "type": "template",
                "author": it.get("author"),
                "category": it.get("category"),
            }
        )
        dest = root / "items" / str(slug)
        dest.mkdir(parents=True, exist_ok=True)
        write_json(dest / "item.json", it)
    upsert_capped(source, rows, item_cap=400)
    write_index(
        root,
        source,
        [
            f"Archived {utc_now()} from `GET /api/templates` ({len(items)} templates, single page).",
            "- Full JSON in `meta/templates.json`. Catalog.json keeps a site row + first 400 items.",
            "- `templateUrl` is the original x.ai share link. Not affiliated with xAI.",
        ],
    )
    write_text(root / "ERRORS.md", f"# {source}\n\nNone.\n")
    print(f"{source} templates={len(items)}", flush=True)


def ingest_cobusgreyling_catalog() -> None:
    """Public Pages catalog for cobusgreyling/grok-bot-templates."""
    source = "cobusgreyling.github.io-grok-bot-templates"
    root = REPO / "sources" / source
    meta = root / "meta"
    meta.mkdir(parents=True, exist_ok=True)
    base = "https://cobusgreyling.github.io/grok-bot-templates"
    endpoints = {
        "catalog.json": f"{base}/catalog.json",
        "status.json": f"{base}/api/v1/status.json",
        "teams.json": f"{base}/api/v1/teams.json",
        "llms.txt": f"{base}/llms.txt",
        "home.html": f"{base}/",
    }
    errors = []
    for name, url in endpoints.items():
        dest = meta / name if name.endswith((".json", ".txt")) else root / "pages" / name
        if not force_get(url, dest):
            errors.append(f"fail {url}")
    items = []
    cat = meta / "catalog.json"
    if cat.exists():
        try:
            data = json.loads(cat.read_text(encoding="utf-8"))
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                items = data.get("templates") or data.get("items") or data.get("bots") or []
                if not items and data:
                    write_json(meta / "catalog-keys.json", sorted(data.keys()))
        except json.JSONDecodeError:
            errors.append("catalog.json not JSON")
    rows = [
        {
            "id": source,
            "title": "cobusgreyling Grok Bot templates catalog",
            "url": base,
            "source": source,
            "type": "site",
            "items": len(items) if isinstance(items, list) else 0,
        }
    ]
    if isinstance(items, list):
        for item in items:
            if not isinstance(item, dict):
                continue
            slug = str(item.get("slug") or item.get("id") or item.get("name") or "")
            if not slug:
                continue
            rows.append(
                {
                    "id": slug,
                    "title": item.get("name") or item.get("title") or slug,
                    "url": item.get("url") or item.get("share_url") or f"{base}/#{slug}",
                    "source": source,
                    "type": item.get("type") or "template",
                }
            )
            dest = root / "items" / slug
            dest.mkdir(parents=True, exist_ok=True)
            write_json(dest / "item.json", item)
    upsert_capped(source, rows, item_cap=400)
    write_index(
        root,
        source,
        [
            f"Archived {utc_now()} from {base} public catalog API.",
            f"- Catalog items: {len(items) if isinstance(items, list) else 0}",
            "- GitHub pack clone: sources/github/cobusgreyling-grok-bot-templates/",
            "- Attribution stays with the original catalog URLs.",
        ],
    )
    write_text(root / "ERRORS.md", f"# {source}\n\n" + ("\n".join(f"- {e}" for e in errors) or "None.") + "\n")
    print(f"{source} items={len(items) if isinstance(items, list) else 0}", flush=True)


def refresh_plugins() -> None:
    from archive_xai_marketplace_plugins import main as plugins_main

    print("===== x.ai marketplace plugins =====", flush=True)
    try:
        plugins_main()
    except SystemExit as exc:
        if exc.code not in (0, None):
            print(f"plugins refresh exit {exc.code}", flush=True)


def main() -> int:
    targets = sys.argv[1:] or ["all"]
    want = set(targets)
    run_all = "all" in want

    if run_all or "xai" in want:
        print("===== x.ai marketplace =====", flush=True)
        rc = refresh_xai_marketplace()
        print(f"x.ai marketplace rc={rc}", flush=True)

    if run_all or "plugins" in want:
        refresh_plugins()

    if run_all or "really" in want:
        print("===== really.bot =====", flush=True)
        subprocess.check_call([sys.executable, str(REPO / "scripts" / "fetch_really_bot.py")])

    if run_all or "botteams" in want:
        print("===== botteams.io =====", flush=True)
        extra = ingest_botteams()
        upsert_capped("botteams.io", extra)

    if run_all or "usegrokbot" in want:
        print("===== usegrokbot.com =====", flush=True)
        extra = ingest_usegrokbot()
        upsert_capped("usegrokbot.com", extra)

    mapping = {
        "grokbothq": refresh_grokbothq,
        "grokindex": refresh_grokindex,
        "grokyard": refresh_grokyard,
        "gtemplate": refresh_gtemplate,
        "grokbot.dev": refresh_grokbot_dev,
        "somi": refresh_somi,
        "agent-hunt": refresh_agent_hunt,
        "skills.sh": refresh_skills_sh_sitemap,
        "souls": refresh_souls_llms,
        "clawhub": refresh_clawhub_cursor,
    }
    for name, fn in mapping.items():
        if run_all or name in want:
            print(f"===== {name} =====", flush=True)
            fn()

    if run_all or "new-galleries" in want:
        print("===== new galleries =====", flush=True)
        ingest_grokbot_templates_com()
        ingest_grokbottemplates_dev()
        ingest_grokmarket()
        ingest_html_gallery(
            "grokbottemplates.app",
            "https://grokbottemplates.app/find/",
            ["https://grokbottemplates.app/sitemap.xml", "https://grokbottemplates.app/llms.txt"],
            "grokbottemplates.app",
        )
        ingest_cobusgreyling_catalog()
        for repo, dirname in (
            ("manonglianai/awesome-grokbot-templates", "manonglianai-awesome-grokbot-templates"),
            ("cobusgreyling/grok-bot-templates", "cobusgreyling-grok-bot-templates"),
        ):
            sha = clone_pack(repo, dirname)
            if sha:
                rows = [
                    {
                        "id": dirname,
                        "title": repo,
                        "url": f"https://github.com/{repo}",
                        "source": f"github/{dirname}",
                        "type": "github-pack",
                    }
                ]
                upsert_capped(f"github/{dirname}", rows, item_cap=50)

    print(f"done catalog_bytes={catalog_size()}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

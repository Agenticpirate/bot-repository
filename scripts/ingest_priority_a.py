#!/usr/bin/env python3
"""Archive Priority A Grok-specific public sources. Does not remove other catalog rows."""

from __future__ import annotations

import html as htmlmod
import json
import random
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

REPO = Path(__file__).resolve().parents[1]
CATALOG = REPO / "catalog.json"
UA = "bot-repository-archive/1.0 (+https://github.com/Agenticpirate/bot-repository)"
TIMEOUT = 45
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


def write_text(path: Path, text: str) -> None:
    if not text.endswith("\n"):
        text += "\n"
    write_bytes(path, text.encode("utf-8"))


def write_json(path: Path, obj) -> None:
    write_text(path, json.dumps(obj, indent=2, ensure_ascii=False))


def http_get(url: str, accept: str = "*/*") -> tuple[int, bytes, str]:
    headers = {"User-Agent": UA, "Accept": accept, "X-Archive-Client": UA}
    last: Exception | None = None
    for attempt in range(1, 5):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                ctype = resp.headers.get("Content-Type", "")
                return resp.status, resp.read(), ctype
        except urllib.error.HTTPError as exc:
            body = exc.read() if exc.fp else b""
            if exc.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(min(20.0, 1.5 * (2 ** (attempt - 1)) + random.random()))
                last = exc
                continue
            return exc.code, body, exc.headers.get("Content-Type", "") if exc.headers else ""
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(min(8.0, 1.2 * (2 ** (attempt - 1))))
    return 0, b"", str(last)


def fetch_ok(url: str, dest: Path, accept: str = "*/*", force: bool = False) -> bool:
    if not force and dest.exists() and dest.stat().st_size > 0:
        return True
    status, body, _ = http_get(url, accept=accept)
    if status != 200 or not body:
        return False
    write_bytes(dest, body)
    return True


def sitemap_locs(data: bytes) -> list[str]:
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return re.findall(r"<loc>([^<]+)</loc>", data.decode("utf-8", "replace"))
    locs = [el.text.strip() for el in root.findall(".//sm:loc", NS) if el.text]
    if not locs:
        locs = [el.text.strip() for el in root.findall(".//{*}loc") if el.text]
    return locs


def title_from_html(raw: bytes) -> str | None:
    text = raw.decode("utf-8", "replace")
    m = re.search(r"<title>([^<]+)</title>", text, re.I)
    if not m:
        return None
    return htmlmod.unescape(re.sub(r"\s+", " ", m.group(1))).strip()


def meta_desc(raw: bytes) -> str | None:
    text = raw.decode("utf-8", "replace")
    m = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)',
        text,
        re.I,
    )
    if not m:
        m = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
            text,
            re.I,
        )
    return htmlmod.unescape(m.group(1)).strip() if m else None


def upsert_catalog(source: str, rows: list[dict]) -> None:
    existing = json.loads(CATALOG.read_text(encoding="utf-8"))
    kept = [r for r in existing if r.get("source") != source]
    write_json(CATALOG, kept + rows)
    print(f"catalog upsert {source}: +{len(rows)} (total {len(kept)+len(rows)})", flush=True)


def first_heading(path: Path) -> str | None:
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.startswith("# "):
                return line[2:].strip()
    except OSError:
        return None
    return None


def write_index(root: Path, title: str, lines: list[str]) -> None:
    write_text(root / "INDEX.md", f"# {title}\n\n" + "\n".join(lines) + "\n")


def fetch_many(
    jobs: list[tuple[str, Path]], workers: int = 12, force: bool = False
) -> tuple[int, int]:
    ok = fail = 0
    pending = [
        (u, p)
        for u, p in jobs
        if force or not (p.exists() and p.stat().st_size > 0)
    ]
    skipped = len(jobs) - len(pending)
    ok += skipped
    if not pending:
        return ok, fail

    def one(item: tuple[str, Path]) -> bool:
        return fetch_ok(item[0], item[1])

    done = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = {pool.submit(one, job): job for job in pending}
        for fut in as_completed(futs):
            if fut.result():
                ok += 1
            else:
                fail += 1
            done += 1
            if done % 50 == 0 or done == len(pending):
                print(f"  fetch {done}/{len(pending)} ok={ok} fail={fail}", flush=True)
    return ok, fail


def clone_pack(repo: str, dest: Path) -> str:
    tmp = Path("/tmp/gh-batch2") / dest.name
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        ["git", "clone", "--depth", "1", f"https://github.com/{repo}.git", str(tmp)],
        stdout=subprocess.DEVNULL,
    )
    sha = subprocess.check_output(["git", "-C", str(tmp), "rev-parse", "HEAD"], text=True).strip()
    gitdir = tmp / ".git"
    if gitdir.exists():
        shutil.rmtree(gitdir)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(tmp, dest)
    leftover = dest / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)
    return sha


def pack_rows(dirname: str, repo: str, dest: Path, sha: str) -> list[dict]:
    source = f"github/{dirname}"
    url = f"https://github.com/{repo}"
    rows = [
        {
            "id": dirname,
            "title": repo,
            "url": url,
            "source": source,
            "type": "pack",
            "revision": sha,
        }
    ]
    for path in sorted(p for p in dest.rglob("*") if p.is_file()):
        rel = path.relative_to(dest).as_posix()
        if path.name in {".gitignore", "LICENSE", "LICENSE-MIT", "LICENSE-CC0", "INDEX.md"}:
            continue
        if path.suffix.lower() not in {".md", ".json", ".yml", ".yaml"}:
            continue
        title = first_heading(path) if path.suffix.lower() == ".md" else None
        rows.append(
            {
                "id": rel,
                "title": title or path.stem,
                "url": f"{url}/blob/HEAD/{rel}",
                "source": source,
                "type": "file",
                "path": rel,
            }
        )
    return rows


def ingest_somi() -> None:
    root = REPO / "sources" / "somi.ai"
    meta = root / "meta"
    pages = root / "pages"
    bots = root / "grok-bots"
    errors: list[str] = []
    fetch_ok("https://somi.ai/llms.txt", meta / "llms.txt")
    fetch_ok("https://somi.ai/sitemap.xml", meta / "sitemap.xml")
    fetch_ok("https://somi.ai/grok-bots", pages / "grok-bots.html")
    fetch_ok("https://somi.ai/", pages / "homepage.html")
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes())
    grok_urls = sorted({u for u in locs if "/grok-bots/" in u})
    write_json(meta / "grok-bot-urls.json", {"count": len(grok_urls), "urls": grok_urls})
    jobs = []
    for url in grok_urls:
        slug = url.rstrip("/").split("/")[-1]
        jobs.append((url, bots / slug / "page.html"))
    ok, fail = fetch_many(jobs, workers=10)
    if fail:
        errors.append(f"{fail} grok-bot HTML pages failed")
    rows = [
        {
            "id": "somi.ai",
            "title": "Somi.ai",
            "url": "https://somi.ai/",
            "source": "somi.ai",
            "type": "site",
        },
        {
            "id": "grok-bots",
            "title": "Somi.ai Grok bots listing",
            "url": "https://somi.ai/grok-bots",
            "source": "somi.ai",
            "type": "listing",
        },
    ]
    for url in grok_urls:
        slug = url.rstrip("/").split("/")[-1]
        page = bots / slug / "page.html"
        title = title_from_html(page.read_bytes()) if page.exists() else slug
        desc = meta_desc(page.read_bytes()) if page.exists() else None
        write_json(
            bots / slug / "meta.json",
            {
                "id": slug,
                "url": url,
                "source": "somi.ai",
                "title": title,
                "description": desc,
                "scraped_at": utc_now(),
            },
        )
        rows.append(
            {
                "id": slug,
                "title": title or slug,
                "url": url,
                "source": "somi.ai",
                "type": "grok-bot",
            }
        )
    upsert_catalog("somi.ai", rows)
    write_index(
        root,
        "somi.ai",
        [
            f"Archived {utc_now()}. Grok-bot listing plus every sitemap `/grok-bots/*` page.",
            f"- Grok-bot URLs: {len(grok_urls)}",
            f"- Pages fetched OK: {ok} (incl. resume skips); failed: {fail}",
            "- Also saved llms.txt, sitemap.xml, homepage, listing HTML.",
        ],
    )
    write_text(root / "ERRORS.md", "# somi.ai errors\n\n" + ("\n".join(f"- {e}" for e in errors) or "None.") + "\n")
    print(f"somi.ai done bots={len(grok_urls)} fail={fail}", flush=True)


def ingest_grokbot_dev() -> None:
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
        if not fetch_ok(url, api / name):
            errors.append(f"list fail {url}")
    fetch_ok("https://grokbot.dev/llms.txt", root / "meta" / "llms.txt")
    fetch_ok("https://grokbot.dev/rss.xml", root / "meta" / "rss.xml")
    fetch_ok("https://grokbot.dev/agent/", root / "pages" / "agent.html")
    fetch_ok("https://grokbot.dev/", root / "pages" / "homepage.html")

    details: list[tuple[str, str, str]] = []  # type, slug, url
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
    jobs = []
    for typ, slug, durl in details:
        dest = root / "details" / typ / f"{slug}.json"
        jobs.append((durl, dest))
    ok, fail = fetch_many(jobs, workers=10)
    if fail:
        errors.append(f"{fail} detail JSON failed")

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
        page_url = f"https://grokbot.dev/{typ}s/{slug}/" if typ != "news" else f"https://grokbot.dev/news/{slug}/"
        if typ == "use-case":
            page_url = f"https://grokbot.dev/use-cases/{slug}/"
        if typ == "template":
            page_url = f"https://grokbot.dev/marketplace/{slug}/"
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
    upsert_catalog("grokbot.dev", rows)
    write_index(
        root,
        "grokbot.dev",
        [
            f"Archived {utc_now()} via documented JSON API + RSS + agent page + llms.txt.",
            f"- List endpoints: {', '.join(lists)}",
            f"- Detail records: {ok} OK, {fail} failed",
            f"- Catalog rows: {len(rows)}",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# grokbot.dev errors\n\n" + ("\n".join(f"- {e}" for e in errors) or "None.") + "\n",
    )
    print(f"grokbot.dev details ok={ok} fail={fail} rows={len(rows)}", flush=True)


def ingest_grokbothq() -> None:
    root = REPO / "sources" / "grokbothq.xyz"
    meta = root / "meta"
    errors: list[str] = []
    fetch_ok("https://grokbothq.xyz/api/v1/index.json", meta / "index.json")
    fetch_ok("https://grokbothq.xyz/llms.txt", meta / "llms.txt")
    fetch_ok("https://grokbothq.xyz/rss.xml", meta / "rss.xml")
    fetch_ok("https://grokbothq.xyz/sitemap.xml", meta / "sitemap.xml")
    fetch_ok("https://grokbothq.xyz/bots", root / "pages" / "bots.html")
    fetch_ok("https://grokbothq.xyz/guides.md", root / "pages" / "guides.md")
    fetch_ok("https://grokbothq.xyz/use-cases.md", root / "pages" / "use-cases.md")
    fetch_ok("https://grokbothq.xyz/stats", root / "pages" / "stats.html")
    idx = json.loads((meta / "index.json").read_text(encoding="utf-8"))
    bots = idx.get("bots") or []
    jobs = []
    for bot in bots:
        slug = bot.get("slug")
        if not slug:
            continue
        jobs.append((f"https://grokbothq.xyz/bots/{slug}.md", root / "bots" / f"{slug}.md"))
    extra_md = [
        "guides/what-are-grok-bots",
        "guides/how-to-create-a-grok-bot",
        "guides/how-to-write-bot-instructions",
        "guides/how-to-publish-and-share-your-grok-bot",
        "guides/how-to-find-the-best-grok-bots",
        "guides/how-to-chain-grok-bots",
        "guides/grok-bot-safety-and-privacy",
        "guides/monetize-your-grok-bot",
        "groups/ship-desk",
        "groups/inbox-and-calendar-desk",
        "groups/money-hunters",
        "groups/research-desk",
        "groups/sales-desk",
        "groups/study-desk",
        "compare/grok-bots-vs-custom-gpts",
        "compare/grok-bots-vs-claude-skills",
        "compare/grok-bots-vs-gemini-gems",
        "compare/grok-bots-vs-ai-agent-frameworks",
        "faq",
        "about",
    ]
    for rel in extra_md:
        jobs.append((f"https://grokbothq.xyz/{rel}.md", root / "pages" / f"{rel}.md"))
    ok, fail = fetch_many(jobs, workers=12)
    if fail:
        errors.append(f"{fail} markdown pages failed")
    rows = [
        {
            "id": "grokbothq.xyz",
            "title": idx.get("name") or "GrokBot HQ",
            "url": "https://grokbothq.xyz/",
            "source": "grokbothq.xyz",
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
                "url": bot.get("page") or f"https://grokbothq.xyz/bots/{slug}",
                "source": "grokbothq.xyz",
                "type": "bot",
                "author": bot.get("builder"),
                "category": bot.get("category"),
                "installs": bot.get("installs"),
            }
        )
    upsert_catalog("grokbothq.xyz", rows)
    write_index(
        root,
        "grokbothq.xyz",
        [
            f"Archived {utc_now()}. Machine index `/api/v1/index.json` plus per-bot `.md`.",
            f"- Bots in index: {len(bots)}",
            f"- Markdown fetches OK: {ok}; failed: {fail}",
            f"- Also: llms.txt, RSS, sitemap, guides/use-cases/stats.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# grokbothq.xyz errors\n\n" + ("\n".join(f"- {e}" for e in errors) or "None.") + "\n",
    )
    print(f"grokbothq bots={len(bots)} md_ok={ok} fail={fail}", flush=True)


def ingest_grokyard() -> None:
    root = REPO / "sources" / "grokyard.com"
    errors: list[str] = []
    pages = {
        "homepage.html": "https://grokyard.com/",
        "browse.html": "https://grokyard.com/browse",
        "about.html": "https://grokyard.com/about",
    }
    for name, url in pages.items():
        if not fetch_ok(url, root / "pages" / name):
            errors.append(f"fail {url}")
    browse = (root / "pages" / "browse.html").read_text(encoding="utf-8", errors="replace")
    slugs = sorted(set(re.findall(r"/b/([a-z0-9-]+)", browse)))
    jobs = [(f"https://grokyard.com/b/{slug}", root / "bots" / slug / "page.html") for slug in slugs]
    ok, fail = fetch_many(jobs, workers=6)
    if fail:
        errors.append(f"{fail} bot pages failed")
    rows = [
        {
            "id": "grokyard.com",
            "title": "Grokyard",
            "url": "https://grokyard.com/",
            "source": "grokyard.com",
            "type": "site",
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
    upsert_catalog("grokyard.com", rows)
    write_index(
        root,
        "grokyard.com",
        [
            f"Archived {utc_now()}. Public browse page listed {len(slugs)} shareable bots; no sitemap/API.",
            f"- Bot pages OK: {ok}; failed: {fail}",
            "- Also homepage, /browse, /about.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# grokyard.com errors\n\n"
        + ("\n".join(f"- {e}" for e in errors) or "No sitemap or JSON API; listing taken from /browse HTML.")
        + "\n",
    )
    print(f"grokyard slugs={len(slugs)}", flush=True)


def ingest_grokindex() -> None:
    root = REPO / "sources" / "grokindex.dev"
    meta = root / "meta"
    errors: list[str] = []
    fetch_ok("https://grokindex.dev/sitemap.xml", meta / "sitemap.xml")
    fetch_ok("https://grokindex.dev/", root / "pages" / "homepage.html")
    bots: list[dict] = []
    page = 1
    while True:
        url = f"https://grokindex.dev/api/bots?page={page}"
        dest = meta / "api" / f"bots-page-{page}.json"
        if not fetch_ok(url, dest):
            errors.append(f"API page {page} failed")
            break
        data = json.loads(dest.read_text(encoding="utf-8"))
        chunk = data.get("bots") or []
        bots.extend(chunk)
        if not data.get("hasMore"):
            break
        page += 1
        if page > 80:
            errors.append("API pagination cap 80 pages")
            break
    write_json(meta / "bots.json", {"count": len(bots), "bots": bots})
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    cat_urls = [u for u in locs if "/category/" in u]
    jobs = [(u, root / "pages" / "categories" / f"{u.rstrip('/').split('/')[-1]}.html") for u in cat_urls]
    jobs.append(("https://grokindex.dev/just-listed", root / "pages" / "just-listed.html"))
    jobs.append(("https://grokindex.dev/most-viewed", root / "pages" / "most-viewed.html"))
    jobs.append(("https://grokindex.dev/stats", root / "pages" / "stats.html"))
    fetch_many(jobs, workers=8)
    rows = [
        {
            "id": "grokindex.dev",
            "title": "GrokIndex",
            "url": "https://grokindex.dev/",
            "source": "grokindex.dev",
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
                "title": bot.get("title") or slug,
                "url": f"https://grokindex.dev/bots/{slug}",
                "source": "grokindex.dev",
                "type": "bot",
                "category": bot.get("category"),
                "pricing": bot.get("pricing"),
            }
        )
    upsert_catalog("grokindex.dev", rows)
    write_index(
        root,
        "grokindex.dev",
        [
            f"Archived {utc_now()} via paginated `GET /api/bots` (total {len(bots)}) plus sitemap/category pages.",
            "- Per-bot HTML not fetched (API already has title/description/category/pricing; listing shells are Next.js).",
            f"- API pages saved under meta/api/.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# grokindex.dev errors\n\n"
        + ("\n".join(f"- {e}" for e in errors) or "Per-bot HTML capped; catalog from JSON API.")
        + "\n",
    )
    print(f"grokindex bots={len(bots)}", flush=True)


def ingest_gtemplate() -> None:
    root = REPO / "sources" / "gtemplate.net"
    fetch_ok("https://gtemplate.net/sitemap.xml", root / "meta" / "sitemap.xml")
    locs = sitemap_locs((root / "meta" / "sitemap.xml").read_bytes())
    jobs = []
    for url in locs:
        path = urllib.parse.urlparse(url).path.strip("/") or "index"
        rel = path.replace("/", "__") + ".html"
        jobs.append((url, root / "pages" / rel))
    ok, fail = fetch_many(jobs, workers=6)
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
        rows.append(
            {
                "id": slug,
                "title": title or slug,
                "url": url,
                "source": "gtemplate.net",
                "type": "bot",
            }
        )
    upsert_catalog("gtemplate.net", rows)
    write_index(
        root,
        "gtemplate.net",
        [
            f"Archived {utc_now()}. Full sitemap ({len(locs)} URLs) saved as HTML.",
            f"- Fetches OK: {ok}; failed: {fail}",
            f"- Bot catalog rows: {sum(1 for r in rows if r['type']=='bot')}",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# gtemplate.net errors\n\n" + (f"{fail} pages failed." if fail else "None.") + "\n",
    )
    print(f"gtemplate pages={ok} bots={sum(1 for r in rows if r['type']=='bot')}", flush=True)


def ingest_github_a() -> None:
    packs = [
        ("mergisi/awesome-grokbot", "mergisi-awesome-grokbot"),
        ("ZeroPointRepo/GrokBotDev", "ZeroPointRepo-GrokBotDev"),
    ]
    for repo, dirname in packs:
        dest = REPO / "sources" / "github" / dirname
        print(f"clone {repo}", flush=True)
        sha = clone_pack(repo, dest)
        files = [p for p in dest.rglob("*") if p.is_file()]
        write_index(
            dest,
            repo,
            [
                f"Shallow clone of https://github.com/{repo} at `{sha[:12]}`. `.git` stripped.",
                f"- Files: {len(files)}",
            ],
        )
        write_text(dest / "ERRORS.md", "# errors\n\nNone.\n")
        rows = pack_rows(dirname, repo, dest, sha)
        upsert_catalog(f"github/{dirname}", rows)
        print(f"github/{dirname} files={len(files)} rows={len(rows)}", flush=True)


def main() -> int:
    targets = sys.argv[1:] or [
        "somi",
        "grokbot.dev",
        "grokbothq",
        "grokyard",
        "grokindex",
        "gtemplate",
        "github",
    ]
    mapping = {
        "somi": ingest_somi,
        "grokbot.dev": ingest_grokbot_dev,
        "grokbothq": ingest_grokbothq,
        "grokyard": ingest_grokyard,
        "grokindex": ingest_grokindex,
        "gtemplate": ingest_gtemplate,
        "github": ingest_github_a,
    }
    for name in targets:
        print(f"===== {name} =====", flush=True)
        mapping[name]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

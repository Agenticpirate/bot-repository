#!/usr/bin/env python3
"""Deepen Vellum + Moldable and archive additional public skill/bot galleries.

Does not invent content. Does not delete other catalog rows.
Skips GitHub packs that already have INDEX.md.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    fetch_many,
    fetch_ok,
    first_heading,
    http_get,
    pack_rows,
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
UA_NOTE = NOW
TMP = Path("/tmp/gh-depth")
GH = REPO / "sources" / "github"


def already(dest: Path) -> bool:
    return dest.exists() and (dest / "INDEX.md").exists()


def copy_tree(src: Path, dest: Path, ignore_names: set[str] | None = None) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    ignore = shutil.ignore_patterns(".git", "node_modules", ".next", "dist")
    shutil.copytree(src, dest, ignore=ignore)
    leftover = dest / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)
    if ignore_names:
        for name in ignore_names:
            extra = dest / name
            if extra.exists():
                if extra.is_dir():
                    shutil.rmtree(extra)
                else:
                    extra.unlink()
    return sum(1 for p in dest.rglob("*") if p.is_file())


def install_pack(repo: str, dirname: str, src: Path, extra_index: list[str] | None = None) -> int:
    dest = GH / dirname
    if already(dest):
        print(f"skip existing github/{dirname}", flush=True)
        return 0
    if not src.is_dir():
        print(f"MISSING pack {src}", flush=True)
        return 0
    n = copy_tree(src, dest)
    rows = pack_rows(dirname, repo, dest, "HEAD")
    lines = [
        f"Shallow clone of https://github.com/{repo}. `.git` stripped. Files: {n}. Archived {UA_NOTE}."
    ]
    if extra_index:
        lines.extend(extra_index)
    write_index(dest, repo, lines)
    write_text(dest / "ERRORS.md", f"# {repo}\n\nNone.\n")
    upsert_catalog(f"github/{dirname}", rows)
    print(f"pack {dirname} files={n} rows={len(rows)}", flush=True)
    return len(rows)


def slug_path(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return path or "index"


def fetch_list(jobs: list[tuple[str, Path]], workers: int = 12) -> tuple[int, int]:
    return fetch_many(jobs, workers=workers)


def ingest_vellum() -> int:
    root = REPO / "sources" / "vellum.ai"
    meta = root / "meta"
    pages = root / "pages"
    skills_html = root / "skill-pages"
    docs = root / "docs"
    bodies = root / "skills"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    skills_html.mkdir(parents=True, exist_ok=True)
    docs.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    feeds = [
        ("https://www.vellum.ai/sitemap.xml", meta / "sitemap.xml"),
        ("https://www.vellum.ai/robots.txt", meta / "robots.txt"),
        ("https://www.vellum.ai/llms.txt", meta / "llms.txt"),
        ("https://www.vellum.ai/docs/llms.txt", meta / "docs-llms.txt"),
        ("https://docs.vellum.ai/llms.txt", meta / "docs-vellum-ai-llms.txt"),
        ("https://docs.vellum.ai/sitemap.xml", meta / "docs-sitemap.xml"),
        ("https://www.vellum.ai/skills", pages / "skills.html"),
        ("https://www.vellum.ai/plugins", pages / "plugins.html"),
        ("https://www.vellum.ai/showcase", pages / "showcase.html"),
        ("https://www.vellum.ai/community", pages / "community.html"),
        ("https://www.vellum.ai/", pages / "home.html"),
    ]
    for url, dest in feeds:
        if not fetch_ok(url, dest):
            errors.append(f"{url} failed")

    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    write_json(meta / "sitemap-locs.json", locs)
    skill_urls = sorted({u for u in locs if "/skills" in urlparse(u).path})
    gallery_urls = sorted(
        {
            u
            for u in locs
            if any(
                p in urlparse(u).path
                for p in ("/plugins", "/showcase", "/community", "/platform", "/product", "/import")
            )
        }
    )
    write_json(meta / "skill-urls.json", skill_urls)
    write_json(meta / "gallery-urls.json", gallery_urls)

    jobs = []
    for url in skill_urls:
        rel = slug_path(url).replace("/", "__")
        jobs.append((url, skills_html / f"{rel}.html"))
    for url in gallery_urls:
        rel = slug_path(url).replace("/", "__")
        jobs.append((url, pages / f"{rel}.html"))
    ok, fail = fetch_list(jobs, workers=10)
    if fail:
        errors.append(f"{fail}/{len(jobs)} skill/gallery HTML failed")

    # docs markdown from llms.txt
    doc_urls: list[str] = []
    for llms_path in (meta / "docs-llms.txt", meta / "docs-vellum-ai-llms.txt", meta / "llms.txt"):
        if not llms_path.exists():
            continue
        text = llms_path.read_text(encoding="utf-8", errors="replace")
        doc_urls.extend(re.findall(r"https://(?:www\.)?(?:docs\.)?vellum\.ai/[^\s)>\]]+", text))
    # prefer .md variants
    md_jobs: list[tuple[str, Path]] = []
    seen = set()
    for url in doc_urls:
        url = url.rstrip(".,;")
        if url in seen:
            continue
        seen.add(url)
        md_url = url if url.endswith(".md") else (url.rstrip("/") + ".md")
        rel = slug_path(md_url).replace("/", "__")
        if not rel.endswith(".md"):
            rel += ".md"
        md_jobs.append((md_url, docs / rel))
    dok, dfail = fetch_list(md_jobs, workers=12)
    if dfail:
        errors.append(f"{dfail}/{len(md_jobs)} docs markdown failed")

    # skill bodies from local clone
    src_skills = TMP / "vellum-ai-vellum-assistant" / "skills"
    catalog_src = src_skills / "catalog.json"
    n_bodies = 0
    catalog_skills: list[dict] = []
    if catalog_src.is_file():
        write_bytes(meta / "catalog.json", catalog_src.read_bytes())
        try:
            catalog_skills = list(json.loads(catalog_src.read_text(encoding="utf-8")).get("skills") or [])
        except json.JSONDecodeError:
            catalog_skills = []
    if src_skills.is_dir():
        for child in sorted(src_skills.iterdir()):
            if not child.is_dir():
                continue
            dest = bodies / child.name
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(child, dest, ignore=shutil.ignore_patterns(".git", "node_modules"))
            n_bodies += 1
        for extra in ("catalog.json", "AGENTS.md"):
            src = src_skills / extra
            if src.is_file():
                write_bytes(bodies / extra, src.read_bytes())

    # marketplace plugins list
    market = TMP / "vellum-ai-vellum-assistant" / "plugins" / "marketplace.json"
    n_plugins = 0
    if market.is_file():
        write_bytes(meta / "marketplace.json", market.read_bytes())
        try:
            n_plugins = len(json.loads(market.read_text(encoding="utf-8")).get("plugins") or [])
        except json.JSONDecodeError:
            n_plugins = 0

    rows = [
        {
            "id": "vellum.ai",
            "title": "Vellum Skills",
            "url": "https://www.vellum.ai/skills",
            "source": "vellum.ai",
            "type": "site",
            "skill_pages": len(skill_urls),
            "skill_bodies": n_bodies,
            "marketplace_plugins": n_plugins,
        }
    ]
    by_id = {s.get("id"): s for s in catalog_skills if s.get("id")}
    for url in skill_urls:
        slug = url.rstrip("/").split("/")[-1]
        if slug in {"skills", "categories"} or url.rstrip("/").endswith("/skills"):
            continue
        if "/categories/" in url:
            rows.append(
                {
                    "id": f"vellum.ai/category/{slug}",
                    "title": slug,
                    "url": url,
                    "source": "vellum.ai",
                    "type": "category",
                }
            )
            continue
        info = by_id.get(slug) or {}
        skill_md = bodies / slug / "SKILL.md"
        rows.append(
            {
                "id": f"vellum.ai/skills/{slug}",
                "title": info.get("metadata", {}).get("vellum", {}).get("display-name")
                or info.get("name")
                or slug,
                "url": url,
                "source": "vellum.ai",
                "type": "skill",
                "description": info.get("description"),
                "has_body": skill_md.is_file(),
                "github": f"https://github.com/vellum-ai/vellum-assistant/tree/HEAD/skills/{slug}",
            }
        )

    write_index(
        root,
        "vellum.ai",
        [
            "Public Vellum assistant skills gallery + docs.",
            f"- Last updated: {UA_NOTE}",
            f"- Sitemap URLs: **{len(locs)}**",
            f"- Skill/category pages: **{len(skill_urls)}**",
            f"- Skill bodies copied from vellum-ai/vellum-assistant/skills: **{n_bodies}**",
            f"- Marketplace plugins in marketplace.json: **{n_plugins}**",
            f"- Docs markdown attempted: **{len(md_jobs)}** (ok={dok})",
            "- Feeds: sitemap, robots, llms.txt, docs.vellum.ai/llms.txt, catalog.json, marketplace.json",
            "- Canonical skill bodies: https://github.com/vellum-ai/vellum-assistant",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# vellum.ai\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("vellum.ai", rows)
    print(f"vellum.ai rows={len(rows)} bodies={n_bodies} html_ok={ok}", flush=True)
    return len(rows)


def ingest_moldable() -> int:
    root = REPO / "sources" / "moldable.sh"
    meta = root / "meta"
    pages = root / "pages"
    docs = root / "docs"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    docs.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    feeds = [
        ("https://moldable.sh/sitemap.xml", meta / "sitemap.xml"),
        ("https://moldable.sh/robots.txt", meta / "robots.txt"),
        ("https://docs.moldable.sh/llms.txt", meta / "docs-llms.txt"),
        ("https://docs.moldable.sh/sitemap.xml", meta / "docs-sitemap.xml"),
        ("https://docs.moldable.sh/api-reference/openapi.json", meta / "openapi.json"),
        ("https://moldable.sh/bots", pages / "bots.html"),
        ("https://moldable.sh/", pages / "home.html"),
        ("https://moldable.sh/apps", pages / "apps.html"),
        ("https://moldable.sh/use-cases", pages / "use-cases.html"),
    ]
    for url, dest in feeds:
        if not fetch_ok(url, dest):
            errors.append(f"{url} failed")

    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    doc_locs = (
        sitemap_locs((meta / "docs-sitemap.xml").read_bytes())
        if (meta / "docs-sitemap.xml").exists()
        else []
    )
    write_json(meta / "sitemap-locs.json", locs)
    write_json(meta / "docs-locs.json", doc_locs)

    jobs = []
    for url in locs:
        rel = slug_path(url).replace("/", "__") or "index"
        jobs.append((url, pages / f"{rel}.html"))
    ok, fail = fetch_list(jobs, workers=8)
    if fail:
        errors.append(f"{fail}/{len(jobs)} moldable HTML failed")

    md_jobs = []
    if (meta / "docs-llms.txt").exists():
        text = (meta / "docs-llms.txt").read_text(encoding="utf-8", errors="replace")
        for url in re.findall(r"https://docs\.moldable\.sh/[^\s)>\]]+", text):
            url = url.rstrip(".,;")
            if url.endswith(".json"):
                continue
            md = url if url.endswith(".md") else url.rstrip("/") + ".md"
            rel = slug_path(md).replace("/", "__")
            md_jobs.append((md, docs / rel))
    for url in doc_locs:
        md = url if url.endswith(".md") else url.rstrip("/") + ".md"
        rel = slug_path(md).replace("/", "__")
        md_jobs.append((md, docs / rel))
    # unique dests
    uniq: dict[Path, str] = {}
    for url, dest in md_jobs:
        uniq[dest] = url
    md_jobs = [(u, p) for p, u in uniq.items()]
    dok, dfail = fetch_list(md_jobs, workers=8)
    if dfail:
        errors.append(f"{dfail}/{len(md_jobs)} moldable docs markdown failed")

    rows = [
        {
            "id": "moldable.sh",
            "title": "Moldable bots + apps",
            "url": "https://moldable.sh/bots",
            "source": "moldable.sh",
            "type": "site",
            "sitemap_urls": len(locs),
        }
    ]
    for url in locs:
        path = urlparse(url).path.strip("/")
        kind = "page"
        if path.startswith("apps/") and path != "apps":
            kind = "app"
        elif path.startswith("use-cases/") and path != "use-cases":
            kind = "use-case"
        elif path == "bots":
            kind = "bots"
        dest = pages / f"{slug_path(url).replace('/', '__') or 'index'}.html"
        title = title_from_html(dest.read_bytes()) if dest.exists() else path or "home"
        rows.append(
            {
                "id": f"moldable.sh/{path or 'home'}",
                "title": title or path,
                "url": url,
                "source": "moldable.sh",
                "type": kind,
            }
        )

    write_index(
        root,
        "moldable.sh",
        [
            "Public Moldable bots, apps, use-cases, and docs.",
            f"- Last updated: {UA_NOTE}",
            f"- moldable.sh sitemap URLs: **{len(locs)}** (HTML ok={ok} fail={fail})",
            f"- docs.moldable.sh markdown attempted: **{len(md_jobs)}** (ok={dok})",
            "- robots.txt disallows `/api/` and `/download/`; those were not fetched.",
            "- Related GitHub packs: moldable-ai/apps, moldable-ai/skills",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# moldable.sh\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("moldable.sh", rows)
    print(f"moldable.sh rows={len(rows)} html_ok={ok}", flush=True)
    return len(rows)


def ingest_officialskills() -> int:
    root = REPO / "sources" / "officialskills.sh"
    if already(root) and (root / "meta" / "sitemap-locs.json").exists():
        print("officialskills.sh already indexed", flush=True)
        return 0
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    for url, dest in (
        ("https://officialskills.sh/", pages / "home.html"),
        ("https://officialskills.sh/sitemap.xml", meta / "sitemap.xml"),
        ("https://officialskills.sh/about", pages / "about.html"),
    ):
        if not fetch_ok(url, dest):
            errors.append(f"{url} failed")
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    write_json(meta / "sitemap-locs.json", locs)
    jobs = []
    for url in locs:
        rel = slug_path(url).replace("/", "__") or "index"
        jobs.append((url, pages / f"{rel}.html"))
    ok, fail = fetch_list(jobs, workers=16)
    if fail:
        errors.append(f"{fail}/{len(jobs)} officialskills HTML failed")
    rows = [
        {
            "id": "officialskills.sh",
            "title": "OfficialSkills.sh",
            "url": "https://officialskills.sh/",
            "source": "officialskills.sh",
            "type": "site",
            "sitemap_urls": len(locs),
        }
    ]
    for url in locs:
        path = urlparse(url).path.strip("/")
        if not path:
            continue
        dest = pages / f"{slug_path(url).replace('/', '__')}.html"
        title = title_from_html(dest.read_bytes()) if dest.exists() else path
        kind = "skill" if path.count("/") >= 2 else ("publisher" if path else "page")
        rows.append(
            {
                "id": f"officialskills.sh/{path}",
                "title": title or path,
                "url": url,
                "source": "officialskills.sh",
                "type": kind,
            }
        )
    write_index(
        root,
        "officialskills.sh",
        [
            "VoltAgent Official Agent Skills gallery (official vendor skill pages).",
            f"- Last updated: {UA_NOTE}",
            f"- Sitemap URLs: **{len(locs)}** (HTML ok={ok} fail={fail})",
            "- No public JSON dump; pages + sitemap archived.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# officialskills.sh\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("officialskills.sh", rows)
    print(f"officialskills.sh rows={len(rows)}", flush=True)
    return len(rows)


def ingest_smithery() -> int:
    root = REPO / "sources" / "smithery.ai"
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    for url, dest in (
        ("https://smithery.ai/", pages / "home.html"),
        ("https://smithery.ai/sitemap.xml", meta / "sitemap.xml"),
        ("https://api.smithery.ai/skills?pageSize=100", meta / "skills-page1.json"),
        ("https://smithery.ai/docs", pages / "docs.html"),
    ):
        if not fetch_ok(url, dest):
            errors.append(f"{url} failed")
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    write_json(meta / "sitemap-locs.json", locs)
    jobs = [(u, pages / f"{slug_path(u).replace('/', '__') or 'index'}.html") for u in locs]
    ok, fail = fetch_list(jobs, workers=6)
    if fail:
        errors.append(f"{fail}/{len(jobs)} smithery docs HTML failed")
    n_api = 0
    api_path = meta / "skills-page1.json"
    if api_path.exists():
        raw = api_path.read_bytes()
        if raw.lstrip().startswith(b"<"):
            errors.append("api.smithery.ai/skills returned HTML, not JSON")
        else:
            try:
                data = json.loads(raw)
                if isinstance(data, dict):
                    items = data.get("data") or data.get("skills") or data.get("items") or []
                    n_api = len(items) if isinstance(items, list) else 0
                elif isinstance(data, list):
                    n_api = len(data)
            except json.JSONDecodeError:
                errors.append("api.smithery.ai/skills not valid JSON")
    rows = [
        {
            "id": "smithery.ai",
            "title": "Smithery",
            "url": "https://smithery.ai/",
            "source": "smithery.ai",
            "type": "site",
            "sitemap_urls": len(locs),
            "api_skills": n_api,
        }
    ]
    for url in locs:
        path = urlparse(url).path.strip("/")
        rows.append(
            {
                "id": f"smithery.ai/{path or 'home'}",
                "title": path or "home",
                "url": url,
                "source": "smithery.ai",
                "type": "page",
            }
        )
    write_index(
        root,
        "smithery.ai",
        [
            "Smithery MCP / skills registry. Public sitemap is docs-only.",
            f"- Last updated: {UA_NOTE}",
            f"- Sitemap URLs: **{len(locs)}**",
            f"- api.smithery.ai/skills first page items: **{n_api}**",
            "- Full skills list may require an API key.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# smithery.ai\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("smithery.ai", rows)
    print(f"smithery.ai rows={len(rows)} api={n_api}", flush=True)
    return len(rows)


def ingest_clawskills() -> int:
    root = REPO / "sources" / "clawskills.sh"
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    status, body, _ = http_get("https://clawskills.sh/")
    if status == 200 and body:
        write_bytes(pages / "home.html", body)
    else:
        errors.append(f"homepage HTTP {status}")
        body = b""
    # extract skill hrefs and any JSON
    text = body.decode("utf-8", "replace")
    hrefs = sorted(set(re.findall(r'href="(/skills/[^"]+)"', text)))
    write_json(meta / "home-skill-hrefs.json", hrefs)
    # try common APIs
    for url, dest in (
        ("https://clawskills.sh/sitemap.xml", meta / "sitemap.xml"),
        ("https://clawskills.sh/llms.txt", meta / "llms.txt"),
        ("https://clawskills.sh/api/skills", meta / "api-skills.json"),
    ):
        if not fetch_ok(url, dest):
            errors.append(f"{url} failed")
    rows = [
        {
            "id": "clawskills.sh",
            "title": "ClawSkills",
            "url": "https://clawskills.sh/",
            "source": "clawskills.sh",
            "type": "site",
            "home_skill_hrefs": len(hrefs),
        }
    ]
    for href in hrefs[:4000]:
        rows.append(
            {
                "id": f"clawskills.sh{href}",
                "title": href.rstrip("/").split("/")[-1],
                "url": f"https://clawskills.sh{href}",
                "source": "clawskills.sh",
                "type": "skill",
            }
        )
    write_index(
        root,
        "clawskills.sh",
        [
            "OpenClaw skill gallery (VoltAgent-related listing).",
            f"- Last updated: {UA_NOTE}",
            f"- Homepage bytes: **{len(body)}**; skill hrefs extracted: **{len(hrefs)}**",
            "- Sitemap/llms/API probes recorded in ERRORS.md when they fail.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# clawskills.sh\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("clawskills.sh", rows)
    print(f"clawskills.sh rows={len(rows)} hrefs={len(hrefs)}", flush=True)
    return len(rows)


def ingest_probe_sites() -> None:
    """Snapshot additional public galleries if they resolve."""
    candidates = [
        ("agentskills.io", "https://agentskills.io/", "https://agentskills.io/sitemap.xml", "https://agentskills.io/llms.txt"),
        ("hivebook.wiki", "https://hivebook.wiki/", "https://hivebook.wiki/sitemap.xml", "https://hivebook.wiki/llms.txt"),
        ("septimlabs.com", "https://septimlabs.com/tools/agents", "https://septimlabs.com/sitemap.xml", "https://septimlabs.com/llms.txt"),
        ("skillsllm.com", "https://skillsllm.com/", "https://skillsllm.com/sitemap.xml", "https://skillsllm.com/llms.txt"),
    ]
    for slug, home, sm, llms in candidates:
        root = REPO / "sources" / slug
        if already(root):
            continue
        pages = root / "pages"
        meta = root / "meta"
        pages.mkdir(parents=True, exist_ok=True)
        meta.mkdir(parents=True, exist_ok=True)
        errors = []
        st, body, _ = http_get(home)
        write_json(meta / "home-status.json", {"url": home, "status": st, "bytes": len(body or b""), "at": UA_NOTE})
        if st == 200 and body:
            write_bytes(pages / "home.html", body)
        else:
            errors.append(f"{home} HTTP {st}")
        locs: list[str] = []
        if fetch_ok(sm, meta / "sitemap.xml"):
            locs = sitemap_locs((meta / "sitemap.xml").read_bytes())
            write_json(meta / "sitemap-locs.json", locs)
            jobs = []
            for url in locs[:400]:
                rel = slug_path(url).replace("/", "__") or "index"
                jobs.append((url, pages / f"{rel}.html"))
            if jobs:
                fetch_list(jobs, workers=8)
        else:
            errors.append(f"{sm} failed")
        if not fetch_ok(llms, meta / "llms.txt"):
            errors.append(f"{llms} failed")
        rows = [
            {
                "id": slug,
                "title": slug,
                "url": home,
                "source": slug,
                "type": "site",
                "http": st,
                "sitemap_urls": len(locs),
            }
        ]
        for url in locs[:400]:
            path = urlparse(url).path.strip("/")
            rows.append(
                {
                    "id": f"{slug}/{path or 'home'}",
                    "title": path or slug,
                    "url": url,
                    "source": slug,
                    "type": "page",
                }
            )
        write_index(
            root,
            slug,
            [
                f"Probe of {home}.",
                f"- Last updated: {UA_NOTE}",
                f"- Homepage HTTP {st}, sitemap URLs: **{len(locs)}**",
            ],
        )
        write_text(
            root / "ERRORS.md",
            f"# {slug}\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
        )
        upsert_catalog(slug, rows)
        print(f"{slug} http={st} sitemap={len(locs)}", flush=True)


def main() -> int:
    print(f"ingest_depth_galleries start {UA_NOTE}", flush=True)
    ingest_vellum()
    ingest_moldable()

    # GitHub packs
    # vellum-assistant: skills + plugins only (full repo is the product binary tree)
    va = TMP / "vellum-ai-vellum-assistant"
    if va.is_dir() and not already(GH / "vellum-ai-vellum-assistant"):
        dest = GH / "vellum-ai-vellum-assistant"
        dest.mkdir(parents=True, exist_ok=True)
        n = 0
        for sub in ("skills", "plugins"):
            src = va / sub
            if src.is_dir():
                n += copy_tree(src, dest / sub)
        for name in ("README.md", "AGENTS.md", "LICENSE"):
            src = va / name
            if src.is_file():
                write_bytes(dest / name, src.read_bytes())
                n += 1
        rows = pack_rows("vellum-ai-vellum-assistant", "vellum-ai/vellum-assistant", dest, "HEAD")
        write_index(
            dest,
            "vellum-ai/vellum-assistant",
            [
                "Shallow clone extract of https://github.com/vellum-ai/vellum-assistant — `skills/` + `plugins/` only (assistant/clients product trees omitted).",
                f"Files: {n}. Archived {UA_NOTE}.",
            ],
        )
        write_text(dest / "ERRORS.md", "# vellum-ai/vellum-assistant\n\nProduct trees omitted; skills+plugins archived.\n")
        upsert_catalog("github/vellum-ai-vellum-assistant", rows)
        print(f"pack vellum-ai-vellum-assistant files={n} rows={len(rows)}", flush=True)

    install_pack(
        "moldable-ai/apps",
        "moldable-ai-apps",
        TMP / "moldable-ai-apps",
        ["Official Moldable app templates (moldable.json + sources)."],
    )
    install_pack("moldable-ai/skills", "moldable-ai-skills", TMP / "moldable-ai-skills")
    install_pack("BankrBot/openclaw-skills", "BankrBot-openclaw-skills", TMP / "BankrBot-openclaw-skills")
    install_pack(
        "cloudflare/agent-skills-discovery-rfc",
        "cloudflare-agent-skills-discovery-rfc",
        TMP / "cloudflare-agent-skills-discovery-rfc",
    )

    ingest_officialskills()
    ingest_smithery()
    ingest_clawskills()
    ingest_probe_sites()
    print("ingest_depth_galleries done", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

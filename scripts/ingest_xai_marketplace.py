#!/usr/bin/env python3
"""Archive the official Grok Bot Marketplace from https://x.ai/bot/marketplace.

Enumerates slugs from https://x.ai/sitemap.xml. There are no public JSON/MD
twins — HTML extraction of the Next.js template object is required.
Does not invent slugs. Does not strip attribution. Does not remove existing
catalog rows.
"""

from __future__ import annotations

import json
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

from curl_cffi import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
ROOT = REPO_ROOT / "sources" / "x.ai-bot-marketplace"
CATALOG_PATH = REPO_ROOT / "catalog.json"

SITEMAP_URL = "https://x.ai/sitemap.xml"
MARKETPLACE_URL = "https://x.ai/bot/marketplace"
BOT_PREFIX = "https://x.ai/bot/marketplace/bots/"
CATEGORY_SLUGS = [
    "from-grok-bot-team",
    "engineering",
    "sales",
    "marketing",
    "design",
    "personal",
    "recruiting-people",
    "operations",
    "product",
]

ARCHIVE_FROM = (
    "bot-repository-archive/1.0 "
    "(+https://github.com/Agenticpirate/bot-repository)"
)
CONCURRENCY = 8
RETRIES = 5
TIMEOUT = 45


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


def http_get(url: str) -> bytes:
    last_err: Exception | None = None
    for attempt in range(1, RETRIES + 1):
        try:
            resp = requests.get(
                url,
                impersonate="chrome",
                timeout=TIMEOUT,
                headers={"X-Archive-Client": ARCHIVE_FROM},
                allow_redirects=True,
            )
            if resp.status_code != 200:
                raise RuntimeError(f"HTTP {resp.status_code} for {url}")
            return resp.content
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            if attempt == RETRIES:
                break
            time.sleep(min(20.0, (2 ** (attempt - 1)) + random.random()))
    raise RuntimeError(f"failed after {RETRIES} attempts: {url}: {last_err}")


def parse_sitemap_bots(xml_bytes: bytes) -> list[str]:
    root = ET.fromstring(xml_bytes)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [el.text.strip() for el in root.findall(".//sm:loc", ns) if el.text]
    slugs = []
    seen = set()
    for loc in locs:
        if loc.startswith(BOT_PREFIX):
            slug = loc[len(BOT_PREFIX) :].strip("/").split("/")[0].split("?")[0]
            if slug and slug not in seen:
                seen.add(slug)
                slugs.append(slug)
    return slugs


def extract_json_object(text: str, start: int) -> str | None:
    i = start
    depth = 0
    in_str = False
    esc = False
    while i < len(text):
        c = text[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
        i += 1
    return None


def unescape_js_chunk(s: str) -> str:
    out: list[str] = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == "\\" and i + 1 < n:
            nxt = s[i + 1]
            if nxt == '"':
                out.append('"')
                i += 2
                continue
            if nxt == "\\":
                out.append("\\")
                i += 2
                continue
            if nxt == "n":
                out.append("\n")
                i += 2
                continue
            if nxt == "t":
                out.append("\t")
                i += 2
                continue
            if nxt == "/" :
                out.append("/")
                i += 2
                continue
            if nxt == "u" and i + 5 < n:
                try:
                    out.append(chr(int(s[i + 2 : i + 6], 16)))
                    i += 6
                    continue
                except ValueError:
                    pass
        out.append(s[i])
        i += 1
    return "".join(out)


def extract_template(html: str, slug: str) -> dict | None:
    escaped_needle = f'\\"template\\":{{\\"id\\":\\"{slug}\\"'
    idx = html.find(escaped_needle)
    if idx >= 0:
        chunk = unescape_js_chunk(html[idx : idx + 400_000])
        brace = chunk.find("{")
        if brace >= 0:
            raw = extract_json_object(chunk, brace)
            if raw:
                try:
                    obj = json.loads(raw)
                    if obj.get("id") == slug:
                        return obj
                except json.JSONDecodeError:
                    pass
    plain_needle = f'"template":{{"id":"{slug}"'
    idx = html.find(plain_needle)
    if idx >= 0:
        brace = html.find("{", idx + len('"template":'))
        raw = extract_json_object(html, brace) if brace >= 0 else None
        if raw:
            try:
                obj = json.loads(raw)
                if obj.get("id") == slug:
                    return obj
            except json.JSONDecodeError:
                pass
    return None


def extract_jsonld(html: str) -> list:
    blocks = []
    for m in re.finditer(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        flags=re.I | re.S,
    ):
        raw = m.group(1).strip()
        try:
            blocks.append(json.loads(raw))
        except json.JSONDecodeError:
            blocks.append({"_raw": raw})
    return blocks


def md_escape(text: str) -> str:
    return (text or "").replace("|", "\\|").replace("\n", " ")


def bot_markdown(slug: str, url: str, template: dict | None, jsonld: list) -> str:
    name = (template or {}).get("name") or slug
    creator = (template or {}).get("creatorName") or ""
    handle = (template or {}).get("handle") or ""
    cats = (template or {}).get("categories") or []
    desc = (template or {}).get("description") or (template or {}).get("summary") or ""
    instructions = (template or {}).get("instructions") or ""
    memories = (template or {}).get("memories") or []
    if not creator and jsonld:
        creator = _jsonld_author(jsonld) or ""
    if not desc and jsonld:
        desc = _jsonld_description(jsonld) or ""

    lines = [
        f"# {name}",
        "",
        f"- Slug: `{slug}`",
        f"- URL: {url}",
        f"- Creator: {creator}" + (f" (@{handle})" if handle else ""),
        f"- Categories: {', '.join(cats) if cats else '(none listed)'}",
        f"- Official source: [Grok Bot Marketplace]({MARKETPLACE_URL})",
        "",
        "Do not invent slugs. Attribution stays with the marketplace listing.",
        "",
        "## Description",
        "",
        desc or "_No description extracted._",
        "",
        "## Instructions",
        "",
        instructions if str(instructions).strip() else "_Empty or not present on the listing._",
        "",
        "## Memories",
        "",
    ]
    if not memories:
        lines.append("_None extracted._")
        lines.append("")
    else:
        for mem in memories:
            if isinstance(mem, dict):
                title = mem.get("name") or mem.get("id") or "memory"
                body = mem.get("description") or ""
                lines.append(f"### {title}")
                lines.append("")
                lines.append(body)
                lines.append("")
            else:
                lines.append(f"- {mem}")
                lines.append("")
    skills = (template or {}).get("skills") or []
    if skills:
        lines += ["## Skills", ""]
        for sk in skills:
            if isinstance(sk, dict):
                lines.append(f"- **{sk.get('name') or sk.get('id')}**: {sk.get('description') or ''}")
            else:
                lines.append(f"- {sk}")
        lines.append("")
    return "\n".join(lines)


def _jsonld_author(blocks: list) -> str | None:
    for block in blocks:
        graph = block.get("@graph") if isinstance(block, dict) else None
        nodes = graph if isinstance(graph, list) else [block]
        for node in nodes:
            if not isinstance(node, dict):
                continue
            author = node.get("author")
            if isinstance(author, dict) and author.get("name"):
                return author["name"]
            if isinstance(author, str):
                return author
    return None


def _jsonld_description(blocks: list) -> str | None:
    for block in blocks:
        graph = block.get("@graph") if isinstance(block, dict) else None
        nodes = graph if isinstance(graph, list) else [block]
        for node in nodes:
            if isinstance(node, dict) and node.get("description"):
                return node["description"]
    return None


def process_bot(slug: str) -> dict:
    url = f"{BOT_PREFIX}{slug}"
    dest = ROOT / "bots" / slug
    try:
        raw = http_get(url)
        html = raw.decode("utf-8", errors="replace")
        write_bytes(dest / "page.html", raw)
        template = extract_template(html, slug)
        jsonld = extract_jsonld(html)
        if template:
            write_json(dest / "template.json", template)
        if jsonld:
            write_json(dest / "jsonld.json", jsonld)
        write_text(dest / "bot.md", bot_markdown(slug, url, template, jsonld))
        meta = {
            "source": "x.ai/bot/marketplace",
            "url": url,
            "slug": slug,
            "scraped_at": utc_now(),
            "has_template": bool(template),
            "has_jsonld": bool(jsonld),
            "name": (template or {}).get("name"),
            "creatorName": (template or {}).get("creatorName"),
            "handle": (template or {}).get("handle"),
            "categories": (template or {}).get("categories") or [],
            "description": (template or {}).get("description"),
            "summary": (template or {}).get("summary"),
            "addHref": (template or {}).get("addHref"),
            "color": (template or {}).get("color"),
            "shape": (template or {}).get("shape"),
            "imageUrl": (template or {}).get("imageUrl"),
            "installCount": (template or {}).get("installCount"),
            "instructions_present": bool(str((template or {}).get("instructions") or "").strip()),
            "memories_count": len((template or {}).get("memories") or []),
            "skills_count": len((template or {}).get("skills") or []),
            "local": {
                "page": f"sources/x.ai-bot-marketplace/bots/{slug}/page.html",
                "template": f"sources/x.ai-bot-marketplace/bots/{slug}/template.json"
                if template
                else None,
                "markdown": f"sources/x.ai-bot-marketplace/bots/{slug}/bot.md",
            },
        }
        write_json(dest / "meta.json", meta)
        return {"ok": True, "slug": slug, "has_template": bool(template), "meta": meta}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "slug": slug, "error": str(exc), "has_template": False}


def write_index(slugs: list[str], results: list[dict]) -> None:
    by_slug = {r["slug"]: r for r in results}
    ok = [r for r in results if r.get("ok")]
    templates = [r for r in ok if r.get("has_template")]
    fails = [r for r in results if not r.get("ok")]
    lines = [
        "# x.ai Grok Bot Marketplace",
        "",
        "Official public catalog of Grok Bot templates. "
        f"Canonical index: [{MARKETPLACE_URL}]({MARKETPLACE_URL}).",
        "",
        f"- Sitemap: {SITEMAP_URL}",
        f"- Archived at: {utc_now()}",
        f"- Slugs in sitemap: {len(slugs)}",
        f"- Pages downloaded: {len(ok)}",
        f"- `template.json` extracted: {len(templates)}",
        f"- Failures: {len(fails)}",
        "",
        "There are no public `.json` / `.md` twins on x.ai. "
        "Each bot page is HTML; the marketplace `template` object is extracted "
        "from the Next.js RSC payload. Do not invent slugs.",
        "",
        "| slug | name | creator | categories | template | url |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for slug in slugs:
        r = by_slug.get(slug) or {}
        meta = r.get("meta") or {}
        name = md_escape(meta.get("name") or "")
        creator = md_escape(meta.get("creatorName") or "")
        cats = ", ".join(meta.get("categories") or [])
        mark = "yes" if r.get("has_template") else ("FAIL" if not r.get("ok") else "no")
        url = f"{BOT_PREFIX}{slug}"
        lines.append(
            f"| [{slug}](bots/{slug}/bot.md) | {name} | {creator} | {cats} | {mark} | [html]({url}) |"
        )
    lines.append("")
    write_text(ROOT / "INDEX.md", "\n".join(lines))

    err_lines = [
        "# x.ai marketplace fetch errors",
        "",
        f"Generated: {utc_now()}",
        "",
    ]
    if not fails:
        err_lines += ["No failures. Every sitemap slug has a downloaded `page.html`.", ""]
    else:
        err_lines += [
            f"{len(fails)} slug(s) failed.",
            "",
            "| slug | error |",
            "| --- | --- |",
        ]
        for item in fails:
            err_lines.append(
                f"| {item.get('slug')} | {md_escape(item.get('error') or '')} |"
            )
        err_lines.append("")
    write_text(ROOT / "ERRORS.md", "\n".join(err_lines))


def catalog_row(result: dict) -> dict:
    meta = result.get("meta") or {}
    slug = result["slug"]
    return {
        "id": slug,
        "title": meta.get("name") or slug,
        "creator": meta.get("creatorName"),
        "categories": meta.get("categories") or [],
        "url": f"{BOT_PREFIX}{slug}",
        "source": "x.ai/bot/marketplace",
        "type": "marketplace-bot",
        "has_template": bool(result.get("has_template")),
        "local": {
            "dir": f"sources/x.ai-bot-marketplace/bots/{slug}",
            "page": f"sources/x.ai-bot-marketplace/bots/{slug}/page.html",
            "markdown": f"sources/x.ai-bot-marketplace/bots/{slug}/bot.md",
            "template": f"sources/x.ai-bot-marketplace/bots/{slug}/template.json"
            if result.get("has_template")
            else None,
        },
    }


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    meta_dir = ROOT / "meta"
    meta_dir.mkdir(parents=True, exist_ok=True)

    print("fetching sitemap…", flush=True)
    sitemap = http_get(SITEMAP_URL)
    write_bytes(meta_dir / "sitemap.xml", sitemap)
    slugs = parse_sitemap_bots(sitemap)
    write_json(
        meta_dir / "slugs.json",
        {
            "source": SITEMAP_URL,
            "fetched_at": utc_now(),
            "count": len(slugs),
            "slugs": slugs,
            "urls": [f"{BOT_PREFIX}{s}" for s in slugs],
        },
    )
    print(f"sitemap slugs: {len(slugs)}", flush=True)

    print("fetching marketplace index…", flush=True)
    write_bytes(meta_dir / "marketplace.html", http_get(MARKETPLACE_URL))

    cat_dir = ROOT / "categories"
    for cat in CATEGORY_SLUGS:
        url = f"{MARKETPLACE_URL}/{cat}"
        print(f"category {cat}", flush=True)
        try:
            write_bytes(cat_dir / f"{cat}.html", http_get(url))
        except Exception as exc:  # noqa: BLE001
            write_text(cat_dir / f"{cat}.ERROR.txt", str(exc))

    results: list[dict] = []
    print(f"fetching {len(slugs)} bot pages (concurrency={CONCURRENCY})…", flush=True)
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futs = {pool.submit(process_bot, slug): slug for slug in slugs}
        for i, fut in enumerate(as_completed(futs), start=1):
            result = fut.result()
            results.append(result)
            if not result.get("ok"):
                print(f"FAIL {result.get('slug')}: {result.get('error')}", flush=True)
            if i % 10 == 0 or i == len(slugs):
                ok = sum(1 for r in results if r.get("ok"))
                tmpl = sum(1 for r in results if r.get("has_template"))
                print(
                    f"progress {i}/{len(slugs)} ok={ok} templates={tmpl}",
                    flush=True,
                )

    results.sort(key=lambda r: slugs.index(r["slug"]) if r["slug"] in slugs else 999)
    write_index(slugs, results)

    existing = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    kept = [row for row in existing if row.get("source") != "x.ai/bot/marketplace"]
    extra = [catalog_row(r) for r in results if r.get("ok")]
    write_json(CATALOG_PATH, kept + extra)
    print(
        f"catalog kept={len(kept)} marketplace={len(extra)} total={len(kept)+len(extra)} "
        f"templates={sum(1 for r in results if r.get('has_template'))} "
        f"fail={sum(1 for r in results if not r.get('ok'))}",
        flush=True,
    )
    return 0 if all(r.get("ok") for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())

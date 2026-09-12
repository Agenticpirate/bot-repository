#!/usr/bin/env python3
"""Archive Agenthunt (agent-hunt.netlify.app) and light-discover outbound agent sites.

Does not invent listings. Does not strip attribution. Does not remove other catalog rows.
Does not deep-scrape paywalled apps.
"""

from __future__ import annotations

import html as htmlmod
import json
import re
import sys
import time
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    CATALOG,
    REPO,
    UA,
    fetch_ok,
    http_get,
    sitemap_locs,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)

SOURCE = "agent-hunt.netlify.app"
BASE = "https://agent-hunt.netlify.app"
HUNT_ROOT = REPO / "sources" / SOURCE
EZAIL_ROOT = REPO / "sources" / "ezail.com"

HOMEPAGE_CAP = 1_500_000
FEED_CAP = 400_000

COMMON_FEEDS = (
    "/llms.txt",
    "/.well-known/llms.txt",
    "/robots.txt",
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/agents.json",
    "/api/agents",
    "/api/bots.json",
    "/api/bots",
)

GALLERY_PATHS = (
    "/marketplace",
    "/templates",
    "/template",
    "/gallery",
    "/skills",
    "/bots",
    "/agents",
    "/docs",
    "/docs/llms.txt",
    "/llms-full.txt",
)

GALLERY_HREF = re.compile(
    r"(marketplace|templates?|galler(?:y|ies)|skills?|/bots|/agents|workflow|playbook|directory|llms\.txt)",
    re.I,
)
HREF_RE = re.compile(r"""href=["']([^"'#]+)["']""", re.I)
PAYWALL_RE = re.compile(
    r"(sign in to (continue|view|access)|log in to (continue|view|access)|"
    r"create an account to|unlock (full|premium)|subscribe to (view|continue)|"
    r"paywall|this content is (private|members.only))",
    re.I,
)
LOGIN_FORM_RE = re.compile(
    r'<(form|input)[^>]*(password|sign[- ]?in|log[- ]?in|otp)[^>]*>',
    re.I,
)


def md_escape(text: str | None) -> str:
    return (text or "").replace("|", "\\|").replace("\n", " ").strip()


def origin_of(url: str) -> str:
    p = urllib.parse.urlparse(url)
    return f"{p.scheme}://{p.netloc}"


def domain_slug(url: str) -> str:
    host = urllib.parse.urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def join_url(base: str, path: str) -> str:
    return urllib.parse.urljoin(base if base.endswith("/") else base + "/", path.lstrip("/"))


def looks_paywalled(text: str) -> bool:
    if PAYWALL_RE.search(text):
        return True
    # Short shell whose only form is login.
    if len(text) < 8000 and LOGIN_FORM_RE.search(text) and text.lower().count("<article") < 2:
        if re.search(r"sign[- ]?in|log[- ]?in|get started", text, re.I):
            return True
    return False


def decode(body: bytes) -> str:
    return body.decode("utf-8", "replace")


def json_list_len(obj) -> int:
    if isinstance(obj, list):
        return len(obj)
    if isinstance(obj, dict):
        for key in ("agents", "bots", "skills", "templates", "items", "data", "results"):
            val = obj.get(key)
            if isinstance(val, list):
                return len(val)
        # Small catalog object of objects.
        values = [v for v in obj.values() if isinstance(v, (dict, list))]
        if values and all(isinstance(v, dict) for v in values[:8]) and len(obj) >= 3:
            return len(obj)
    return 0


def classify_body(url: str, status: int, body: bytes, ctype: str) -> dict:
    path = urllib.parse.urlparse(url).path or "/"
    info = {
        "url": url,
        "status": status,
        "bytes": len(body),
        "content_type": (ctype or "").split(";")[0].strip(),
        "kind": "other",
        "gallery": False,
        "item_count": 0,
        "note": "",
    }
    if status != 200 or not body:
        info["kind"] = "miss"
        return info
    text = decode(body[: min(len(body), 250_000)])
    low = text.lower()
    ctype_l = (ctype or "").lower()

    if "json" in ctype_l or path.endswith(".json") or path.endswith("/agents") or path.endswith("/bots"):
        try:
            obj = json.loads(text)
        except json.JSONDecodeError:
            obj = None
        if obj is not None:
            n = json_list_len(obj)
            info["item_count"] = n
            info["kind"] = "json"
            if n >= 3:
                info["gallery"] = True
                info["note"] = f"public JSON catalog ({n} items)"
            return info

    if path.endswith("llms.txt") or path.endswith("llms-full.txt"):
        info["kind"] = "llms"
        links = re.findall(r"https?://", text)
        bullets = len(re.findall(r"^[\-\*]\s", text, re.M))
        info["item_count"] = max(len(links), bullets)
        # Marketing llms.txt files are common; only treat as a gallery when
        # the file itself is a catalog of templates/skills/bots.
        catalogish = re.search(
            r"(skills? catalog|template gallery|bot marketplace|plugin directory|"
            r"browse \d+ (skills?|templates?|bots?|agents?|workflows?))",
            text,
            re.I,
        )
        if catalogish and info["item_count"] >= 8:
            info["gallery"] = True
            info["note"] = f"llms.txt catalog ({info['item_count']} items)"
        return info

    if "sitemap" in path or "xml" in ctype_l and "urlset" in low:
        locs = sitemap_locs(body)
        info["kind"] = "sitemap"
        info["item_count"] = len(locs)
        return info

    if path.endswith("robots.txt") or path.endswith("/robots.txt"):
        info["kind"] = "robots"
        return info

    if "html" in ctype_l or "<html" in low[:400] or path in GALLERY_PATHS:
        info["kind"] = "html"
        if looks_paywalled(text):
            info["note"] = "login/paywall signals"
            return info
        path_l = path.lower()
        title_m = re.search(r"<title>([^<]+)</title>", text, re.I)
        title = (title_m.group(1) if title_m else "").lower()
        catalog_title = re.search(
            r"(skills? catalog|template gallery|bot marketplace|plugin directory|"
            r"browse .+ skills|bots for every|template library)",
            title + " " + text[:4000],
            re.I,
        )
        count_match = re.search(
            r"(browse|catalog of|library of)?\s*(\d{1,5})\s+(templates?|skills?|bots?|workflows?|plugins?)",
            text,
            re.I,
        )
        cards = text.count("<article") + len(re.findall(r'class=["\'][^"\']*card', text, re.I))
        listing_path = any(
            k in path_l
            for k in ("marketplace", "template", "gallery", "skill", "/bots")
        )
        if listing_path and catalog_title:
            n = int(count_match.group(2)) if count_match else cards
            if n >= 3:
                info["gallery"] = True
                info["item_count"] = n
                info["note"] = f"public listing: {title_m.group(1) if title_m else path}"
        return info
    return info


def fetch_once(url: str, cap: int = HOMEPAGE_CAP) -> tuple[int, bytes, str, str]:
    status, body, ctype = http_get(url)
    if len(body) > cap:
        body = body[:cap]
    final = url
    return status, body, ctype, final


def interesting_same_origin_links(page_url: str, html: str, limit: int = 8) -> list[str]:
    origin = origin_of(page_url)
    found: list[str] = []
    seen: set[str] = set()
    for raw in HREF_RE.findall(html):
        href = htmlmod.unescape(raw).strip()
        if not href or href.startswith(("mailto:", "javascript:", "data:")):
            continue
        abs_url = urllib.parse.urljoin(page_url, href)
        if origin_of(abs_url) != origin:
            continue
        path = urllib.parse.urlparse(abs_url).path or "/"
        if not GALLERY_HREF.search(path) and not GALLERY_HREF.search(href):
            continue
        key = urllib.parse.urldefrag(abs_url)[0].rstrip("/")
        if key in seen:
            continue
        seen.add(key)
        found.append(abs_url)
        if len(found) >= limit:
            break
    return found


def existing_source_slugs() -> set[str]:
    src = REPO / "sources"
    return {p.name for p in src.iterdir() if p.is_dir()}


def related_sources(domain: str, existing: set[str]) -> list[str]:
    hits = []
    for name in sorted(existing):
        if name == domain or name.startswith(domain + "-") or name.endswith("-" + domain):
            hits.append(name)
        elif domain.startswith(name + ".") is False and name.startswith(domain.split(".")[0]):
            # x.ai vs x.ai-bot-marketplace
            if domain in name or name in domain:
                hits.append(name)
    return sorted(set(hits))


def archive_agent_hunt(scraped_at: str) -> list[dict]:
    pages = HUNT_ROOT / "pages"
    meta = HUNT_ROOT / "meta"
    assets = HUNT_ROOT / "assets"
    pages.mkdir(parents=True, exist_ok=True)
    meta.mkdir(parents=True, exist_ok=True)
    assets.mkdir(parents=True, exist_ok=True)

    jobs = [
        (f"{BASE}/", pages / "homepage.html"),
        (f"{BASE}/agents.json", meta / "agents.json"),
        (f"{BASE}/app.js", assets / "app.js"),
        (f"{BASE}/styles.css", assets / "styles.css"),
        (f"{BASE}/favicon.svg", assets / "favicon.svg"),
        (f"{BASE}/robots.txt", meta / "robots.txt"),
        (f"{BASE}/sitemap.xml", meta / "sitemap.xml"),
        (f"{BASE}/llms.txt", meta / "llms.txt"),
        (f"{BASE}/api/visits", meta / "visits.json"),
    ]
    errors: list[str] = []
    for url, dest in jobs:
        status, body, ctype = http_get(url)
        if status == 200 and body:
            write_bytes(dest, body)
        else:
            errors.append(f"{url} -> HTTP {status}")

    agents_path = meta / "agents.json"
    agents = json.loads(agents_path.read_text(encoding="utf-8"))
    if not isinstance(agents, list):
        raise RuntimeError("agents.json is not a list")
    if len(agents) != 58:
        print(f"warning: expected 58 agents, got {len(agents)}", flush=True)

    rows = [
        {
            "id": SOURCE,
            "title": "Agenthunt — Personal AI agents",
            "url": f"{BASE}/",
            "source": SOURCE,
            "type": "site",
            "scraped_at": scraped_at,
            "count": len(agents),
            "updates": "twice daily",
        }
    ]

    for agent in agents:
        aid = str(agent.get("id") or "").strip()
        if not aid:
            continue
        adir = HUNT_ROOT / "agents" / aid
        adir.mkdir(parents=True, exist_ok=True)
        write_json(adir / "meta.json", agent)
        fields = [
            ("name", agent.get("name") or aid),
            ("url", agent.get("url")),
            ("oneLiner", agent.get("oneLiner")),
            ("category", agent.get("category")),
            ("launched", agent.get("launched")),
            ("raised", agent.get("raised")),
            ("launchUrl", agent.get("launchUrl")),
        ]
        lines = [f"# {agent.get('name') or aid}", ""]
        for key, val in fields:
            if key == "name":
                continue
            shown = val if val not in (None, "") else "—"
            lines.append(f"- **{key}**: {shown}")
        if agent.get("addedAt"):
            lines.append(f"- **addedAt**: {agent['addedAt']}")
        lines.append("")
        lines.append(f"Listing hash on Agenthunt: `{BASE}/#{aid}`")
        lines.append("")
        write_text(adir / "agent.md", "\n".join(lines))
        hunt_url = f"{BASE}/#{aid}"
        rows.append(
            {
                "id": aid,
                "title": agent.get("name") or aid,
                "url": agent.get("url") or hunt_url,
                "source": SOURCE,
                "type": "agent",
                "category": agent.get("category"),
                "oneLiner": agent.get("oneLiner"),
                "launched": agent.get("launched"),
                "raised": agent.get("raised"),
                "launchUrl": agent.get("launchUrl"),
                "addedAt": agent.get("addedAt"),
                "listing_url": hunt_url,
                "local": {
                    "dir": f"sources/{SOURCE}/agents/{aid}",
                    "meta": f"sources/{SOURCE}/agents/{aid}/meta.json",
                    "markdown": f"sources/{SOURCE}/agents/{aid}/agent.md",
                },
            }
        )

    write_text(
        HUNT_ROOT / "ERRORS.md",
        "# agent-hunt.netlify.app\n\n"
        + (("\n".join(f"- {e}" for e in errors) + "\n") if errors else "None.\n"),
    )
    return agents, rows, errors


def snapshot_ezail(scraped_at: str) -> tuple[list[dict], list[str], list[dict]]:
    pages = EZAIL_ROOT / "pages"
    meta = EZAIL_ROOT / "meta"
    pages.mkdir(parents=True, exist_ok=True)
    meta.mkdir(parents=True, exist_ok=True)
    urls = [
        ("https://www.ezail.com/", pages / "homepage.html"),
        ("https://ezail.com/", pages / "homepage-apex.html"),
        ("https://www.ezail.com/llms.txt", meta / "llms.txt"),
        ("https://www.ezail.com/.well-known/llms.txt", meta / "well-known-llms.txt"),
        ("https://www.ezail.com/robots.txt", meta / "robots.txt"),
        ("https://www.ezail.com/sitemap.xml", meta / "sitemap.xml"),
        ("https://www.ezail.com/agents.json", meta / "agents.json"),
        ("https://www.ezail.com/docs", pages / "docs.html"),
        ("https://www.ezail.com/docs/", pages / "docs-slash.html"),
        ("https://www.ezail.com/templates", pages / "templates.html"),
        ("https://www.ezail.com/marketplace", pages / "marketplace.html"),
        ("https://www.ezail.com/blog", pages / "blog.html"),
        ("https://www.ezail.com/pricing", pages / "pricing.html"),
        ("https://www.ezail.com/docs/llms.txt", meta / "docs-llms.txt"),
    ]
    fetched: list[dict] = []
    errors: list[str] = []
    for url, dest in urls:
        status, body, ctype = http_get(url)
        rec = classify_body(url, status, body, ctype)
        rec["saved"] = False
        if status == 200 and body:
            write_bytes(dest, body)
            rec["saved"] = True
            rec["local"] = str(dest.relative_to(REPO))
        else:
            errors.append(f"{url} -> HTTP {status}")
        fetched.append(rec)

    # Follow sitemap locs that look like docs/templates (cap 8).
    sm = meta / "sitemap.xml"
    extra_ok = 0
    if sm.exists():
        locs = sitemap_locs(sm.read_bytes())
        extra = [
            loc
            for loc in locs
            if GALLERY_HREF.search(urllib.parse.urlparse(loc).path or "")
        ][:8]
        for loc in extra:
            name = re.sub(r"[^a-zA-Z0-9._-]+", "-", urllib.parse.urlparse(loc).path.strip("/")) or "index"
            dest = pages / f"sitemap-{name[:80]}.html"
            status, body, ctype = http_get(loc)
            rec = classify_body(loc, status, body, ctype)
            rec["saved"] = False
            if status == 200 and body:
                write_bytes(dest, body[:HOMEPAGE_CAP])
                rec["saved"] = True
                rec["local"] = str(dest.relative_to(REPO))
                extra_ok += 1
            fetched.append(rec)

    write_json(
        meta / "snapshot.json",
        {"scraped_at": scraped_at, "fetched": fetched},
    )
    saved = [f for f in fetched if f.get("saved")]
    write_index(
        EZAIL_ROOT,
        "ezail.com",
        [
            f"Compact public snapshot of [Ezail](https://www.ezail.com/) from Agenthunt listing `ezail`.",
            f"scraped_at: `{scraped_at}`.",
            f"Saved **{len(saved)}** public responses (homepage, feeds, docs/templates if present).",
            "No paywalled app surface was deep-scraped.",
            "",
            "Fetched:",
            *[
                f"- `{f['url']}` — HTTP {f['status']} ({f.get('kind')}; {f.get('bytes', 0)} bytes"
                + (f"; {f['note']}" if f.get("note") else "")
                + ")"
                for f in fetched
            ],
        ],
    )
    write_text(
        EZAIL_ROOT / "ERRORS.md",
        "# ezail.com\n\n"
        + (("\n".join(f"- {e}" for e in errors) + "\n") if errors else "None.\n"),
    )
    rows = [
        {
            "id": "ezail.com",
            "title": "Ezail",
            "url": "https://www.ezail.com/",
            "source": "ezail.com",
            "type": "site",
            "oneLiner": "Stop managing your inbox. Start delegating it.",
            "via": SOURCE,
            "scraped_at": scraped_at,
        }
    ]
    for f in saved:
        name = urllib.parse.urlparse(f["url"]).path.strip("/") or "homepage"
        rows.append(
            {
                "id": f"ezail.com:{name}",
                "title": name,
                "url": f["url"],
                "source": "ezail.com",
                "type": "page",
            }
        )
    return rows, errors, fetched


def discover_one(agent: dict, existing: set[str]) -> dict:
    aid = agent.get("id")
    url = agent.get("url")
    result = {
        "id": aid,
        "name": agent.get("name"),
        "url": url,
        "domain": None,
        "skipped": None,
        "paywalled": False,
        "already_archived": [],
        "gallery": False,
        "gallery_reasons": [],
        "fetched": [],
        "new_source": None,
    }
    if not url:
        result["skipped"] = "no public url"
        return result
    domain = domain_slug(url)
    result["domain"] = domain
    result["already_archived"] = related_sources(domain, existing)
    origin = origin_of(url)
    status, body, ctype = http_get(url)
    home = classify_body(url, status, body, ctype)
    home["role"] = "homepage"
    result["fetched"].append(home)
    if status in (401, 403) or (status == 200 and looks_paywalled(decode(body[:80_000]))):
        result["paywalled"] = True
        result["skipped"] = "paywalled/login wall — no deep scrape"
        return result
    if status != 200 or not body:
        result["skipped"] = f"homepage HTTP {status}"
        # Still try common feeds; some sites 403 the slash but serve robots.
    targets: list[str] = []
    for path in COMMON_FEEDS + GALLERY_PATHS:
        targets.append(join_url(origin + "/", path))
    if status == 200 and body:
        targets.extend(interesting_same_origin_links(url, decode(body[:HOMEPAGE_CAP])))
    # Dedupe, keep order, skip exact homepage.
    seen = {urllib.parse.urldefrag(url)[0].rstrip("/")}
    uniq = []
    for t in targets:
        key = urllib.parse.urldefrag(t)[0].rstrip("/")
        if key in seen:
            continue
        seen.add(key)
        uniq.append(t)
    for t in uniq[:18]:
        st, bd, ct = http_get(t)
        info = classify_body(t, st, bd, ct)
        result["fetched"].append(info)
        if info.get("gallery"):
            result["gallery"] = True
            result["gallery_reasons"].append(info.get("note") or info["url"])
        time.sleep(0.05)
    return result


def save_gallery_snapshot(
    discovery: dict, scraped_at: str, existing: set[str]
) -> tuple[str | None, list[dict]]:
    domain = discovery.get("domain")
    if not domain or not discovery.get("gallery"):
        return None, []
    if domain == "ezail.com":
        return None, []  # handled separately
    if domain in {"x.ai", "muse.ai"}:
        return None, []  # already covered by marketplace / muse-research
    if domain in existing:
        return None, []
    # Skip if this host is already a first-class source tree.
    if any(name == domain for name in discovery.get("already_archived") or []):
        return None, []
    root = REPO / "sources" / domain
    pages = root / "pages"
    meta = root / "meta"
    pages.mkdir(parents=True, exist_ok=True)
    meta.mkdir(parents=True, exist_ok=True)
    saved = 0
    errors = []
    rows = [
        {
            "id": domain,
            "title": discovery.get("name") or domain,
            "url": discovery.get("url"),
            "source": domain,
            "type": "site",
            "via": SOURCE,
            "scraped_at": scraped_at,
            "note": "compact gallery snapshot from Agenthunt outbound discovery",
        }
    ]
    for item in discovery.get("fetched") or []:
        url = item.get("url")
        st = item.get("status")
        if not url or st != 200:
            if url and st not in (None, 404):
                errors.append(f"{url} -> HTTP {st}")
            continue
        # Re-fetch to save (classify pass may have truncated). Only keep useful kinds.
        if item.get("kind") not in {"html", "json", "llms", "robots", "sitemap"} and not item.get(
            "gallery"
        ):
            continue
        if item.get("kind") == "miss":
            continue
        path = urllib.parse.urlparse(url).path or "/"
        if item.get("kind") in {"llms", "robots", "sitemap", "json"}:
            fname = path.strip("/").replace("/", "-") or item["kind"]
            dest = meta / fname
        else:
            fname = (path.strip("/") or "homepage").replace("/", "-")
            dest = pages / f"{fname[:80]}.html"
        status, body, ctype = http_get(url)
        if status == 200 and body:
            write_bytes(dest, body[:HOMEPAGE_CAP])
            saved += 1
            rows.append(
                {
                    "id": f"{domain}:{fname}",
                    "title": fname,
                    "url": url,
                    "source": domain,
                    "type": "page" if item.get("kind") == "html" else item.get("kind"),
                }
            )
        else:
            errors.append(f"{url} -> HTTP {status}")
    reasons = discovery.get("gallery_reasons") or []
    write_index(
        root,
        domain,
        [
            f"Compact public snapshot discovered via Agenthunt outbound link `{discovery.get('url')}`.",
            f"scraped_at: `{scraped_at}`.",
            f"Gallery signals: {'; '.join(reasons) or 'listing-like public feed'}.",
            f"Saved **{saved}** files. Not a deep scrape.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        f"# {domain}\n\n"
        + (("\n".join(f"- {e}" for e in errors) + "\n") if errors else "None.\n"),
    )
    write_json(
        meta / "discovery.json",
        {
            "via": SOURCE,
            "agent_id": discovery.get("id"),
            "scraped_at": scraped_at,
            "gallery_reasons": reasons,
        },
    )
    existing.add(domain)
    discovery["new_source"] = domain
    return domain, rows


def upsert_many(batches: dict[str, list[dict]]) -> int:
    existing = json.loads(CATALOG.read_text(encoding="utf-8"))
    drop = set(batches)
    kept = [r for r in existing if r.get("source") not in drop]
    added: list[dict] = []
    for source, rows in batches.items():
        added.extend(rows)
        print(f"catalog upsert {source}: +{len(rows)}", flush=True)
    write_json(CATALOG, kept + added)
    total = len(kept) + len(added)
    print(f"catalog total {total}", flush=True)
    return total


def main() -> int:
    scraped_at = utc_now()
    print(f"=== archive {SOURCE} @ {scraped_at} ===", flush=True)
    agents, hunt_rows, hunt_errors = archive_agent_hunt(scraped_at)
    print(f"archived {len(agents)} agents; hunt fetch errors {len(hunt_errors)}", flush=True)

    print("=== ezail.com snapshot ===", flush=True)
    ezail_rows, ezail_errors, ezail_fetched = snapshot_ezail(scraped_at)
    print(f"ezail saved {sum(1 for f in ezail_fetched if f.get('saved'))}; errors {len(ezail_errors)}", flush=True)

    existing = existing_source_slugs()
    print(f"=== outbound discovery ({len(agents)} agents) ===", flush=True)
    discoveries: list[dict] = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = {
            pool.submit(discover_one, agent, existing): agent.get("id")
            for agent in agents
        }
        done = 0
        for fut in as_completed(futs):
            rec = fut.result()
            discoveries.append(rec)
            done += 1
            flag = "GALLERY" if rec.get("gallery") else ("PAYWALL" if rec.get("paywalled") else "ok")
            print(f"  [{done}/{len(agents)}] {rec.get('id')} {flag} {rec.get('domain') or rec.get('skipped')}", flush=True)

    discoveries.sort(key=lambda d: str(d.get("id") or ""))
    write_json(
        HUNT_ROOT / "meta" / "discovery.json",
        {
            "scraped_at": scraped_at,
            "agents": len(agents),
            "discoveries": [
                {
                    k: v
                    for k, v in d.items()
                    if k != "fetched"
                }
                | {
                    "fetched": [
                        {kk: vv for kk, vv in f.items() if kk != "body"}
                        for f in d.get("fetched") or []
                    ]
                }
                for d in discoveries
            ],
        },
    )

    new_galleries: list[str] = []
    catalog_batches: dict[str, list[dict]] = {SOURCE: hunt_rows, "ezail.com": ezail_rows}
    for d in discoveries:
        slug, rows = save_gallery_snapshot(d, scraped_at, existing)
        if slug and rows:
            new_galleries.append(slug)
            catalog_batches[slug] = rows

    gallery_notes = []
    for d in discoveries:
        if d.get("gallery"):
            gallery_notes.append(
                f"- **{d.get('name')}** (`{d.get('domain')}`): {'; '.join(d.get('gallery_reasons') or [])}"
                + (f" — archived `sources/{d['new_source']}/`" if d.get("new_source") else " — already archived or ezail")
            )
        elif d.get("paywalled"):
            gallery_notes.append(f"- **{d.get('name')}**: skipped (paywalled/login).")

    write_index(
        HUNT_ROOT,
        "agent-hunt.netlify.app (Agenthunt)",
        [
            f"Archived `{scraped_at}` from https://agent-hunt.netlify.app/.",
            f"**{len(agents)}** agents in `meta/agents.json` (live count verified).",
            "The site **updates twice daily** (homepage note: “Updated twice a day”).",
            "Hash `#ezail` is the wordmark/shuffle token that highlights the [Ezail](https://www.ezail.com/) listing; per-agent files live under `agents/ezail/`. Ezail homepage snapshot: `sources/ezail.com/`.",
            "",
            "Saved:",
            "- `pages/homepage.html`",
            "- `assets/app.js`, `assets/styles.css`, `assets/favicon.svg`",
            "- `meta/agents.json` plus robots/sitemap/llms/visits if served",
            "- `agents/<id>/meta.json` (copy of each object) + `agents/<id>/agent.md`",
            "- `meta/discovery.json` — light homepage + common-feed pass per outbound URL",
            "",
            "Outbound discovery galleries:",
            *(gallery_notes or ["- None beyond ezail.com."]),
        ],
    )

    print("=== catalog upsert ===", flush=True)
    total = upsert_many(catalog_batches)
    print("new galleries:", new_galleries, flush=True)
    print("catalog_total", total, flush=True)
    print("hunt_rows", len(hunt_rows), "ezail_rows", len(ezail_rows), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

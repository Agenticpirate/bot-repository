#!/usr/bin/env python3
"""Archive latest Claude skills (60-day window ending 2026-09-12).

Does not delete other catalog rows. Reuses sources/skills.sh downloads and
vendored SKILL.md from maintained repos before calling the skills.sh API.
"""

from __future__ import annotations

import json
import random
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    CATALOG,
    REPO,
    UA,
    first_heading,
    http_get,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)
from download_skills_sh import (  # noqa: E402
    HourlyBudget,
    already_downloaded,
    http_get_download,
    write_skill_files,
)

ROOT = REPO / "sources" / "claude-skills-latest"
META = ROOT / "meta"
SKILLS = ROOT / "skills"
PAGES = ROOT / "pages"
CUTOFF = datetime(2026, 7, 14, tzinfo=timezone.utc)
WINDOW_END = datetime(2026, 9, 12, tzinfo=timezone.utc)
EXISTING_SH = REPO / "sources" / "skills.sh" / "skills"
LISTINGS_URL = "https://skillselion.com/api/v1/listings"


def parse_dt(value) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    text = value.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def in_window(item: dict) -> bool:
    for key in ("createdAt", "updatedAt"):
        dt = parse_dt(item.get(key))
        if dt and dt >= CUTOFF:
            return True
    return False


def is_claude(item: dict) -> bool:
    tool = str(item.get("tool") or "").lower()
    if tool in {"claude_code", "claude", "cowork", "claude_cowork"}:
        return True
    agents = item.get("compatibleAgents") or []
    blob = " ".join(
        [
            str(item.get("description") or ""),
            str(item.get("summary") or ""),
            str(item.get("name") or ""),
            " ".join(str(a) for a in agents),
        ]
    ).lower()
    return "claude" in blob or "cowork" in blob


def parse_skill_id(sid: str) -> tuple[str, str, str] | None:
    if not isinstance(sid, str):
        return None
    text = sid.strip()
    if text.startswith("skill:"):
        text = text[6:]
    if "#" in text:
        repo, slug = text.split("#", 1)
        parts = repo.strip("/").split("/")
        if len(parts) >= 2 and slug:
            return parts[0], "/".join(parts[1:]), slug.strip()
    parts = [p for p in text.strip("/").split("/") if p]
    if len(parts) >= 3:
        return parts[0], parts[1], parts[-1]
    return None


def skillselion_get(url: str) -> tuple[int, dict | None]:
    headers = {
        "User-Agent": UA,
        "Accept": "application/json",
        "API-Version": "1",
        "X-Archive-Client": UA,
    }
    last: Exception | None = None
    for attempt in range(1, 5):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read() if exc.fp else b""
            if exc.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(min(20.0, 1.5 * (2 ** (attempt - 1)) + random.random()))
                last = exc
                continue
            try:
                return exc.code, json.loads(body.decode("utf-8")) if body else None
            except json.JSONDecodeError:
                return exc.code, None
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(min(8.0, 1.2 * (2 ** (attempt - 1))))
    return 0, None


def fetch_skillselion() -> list[dict]:
    dest_dir = META / "skillselion-pages"
    dest_dir.mkdir(parents=True, exist_ok=True)
    items: list[dict] = []
    seen: set[str] = set()
    cursor = None
    page = 0
    while page < 80:
        qs = {"type": "skill", "limit": "2000"}
        if cursor:
            qs["cursor"] = str(cursor)
        url = LISTINGS_URL + "?" + urllib.parse.urlencode(qs)
        status, data = skillselion_get(url)
        print(f"skillselion page={page} http={status} cursor={bool(cursor)}", flush=True)
        if status != 200 or not isinstance(data, dict):
            write_json(META / "skillselion-last-error.json", {"page": page, "http": status, "url": url})
            break
        write_json(dest_dir / f"page-{page:03d}.json", {"http": status, "hasMore": data.get("hasMore"), "count": len(data.get("items") or [])})
        chunk = data.get("items") or []
        added = 0
        for it in chunk:
            sid = str(it.get("id") or "")
            if not sid or sid in seen:
                continue
            seen.add(sid)
            items.append(it)
            added += 1
        print(f"  +{added} unique={len(items)} hasMore={data.get('hasMore')}", flush=True)
        page += 1
        if not data.get("hasMore") or not chunk:
            break
        cursor = data.get("cursor") or data.get("pageToken")
        if not cursor:
            break
        time.sleep(0.2)
    write_json(META / "skillselion-all-ids.json", {"count": len(items), "ids": [i.get("id") for i in items]})
    return items


def slim_item(it: dict) -> dict:
    parsed = parse_skill_id(str(it.get("id") or ""))
    owner = repo = slug = None
    if parsed:
        owner, repo, slug = parsed
    return {
        "id": it.get("id"),
        "name": it.get("name"),
        "author": it.get("author"),
        "repo": it.get("repo"),
        "tool": it.get("tool"),
        "type": it.get("type"),
        "description": it.get("description"),
        "summary": it.get("summary"),
        "installs": it.get("installs"),
        "stars": it.get("stars"),
        "createdAt": it.get("createdAt"),
        "updatedAt": it.get("updatedAt"),
        "repoPushedAt": it.get("repoPushedAt"),
        "compatibleAgents": it.get("compatibleAgents"),
        "owner": owner,
        "repo_name": repo,
        "slug": slug,
        "readmeMarkdown": it.get("readmeMarkdown"),
        "readmeExcerpt": it.get("readmeExcerpt"),
    }


def copy_tree_files(src: Path, dest: Path) -> int:
    n = 0
    if not src.exists():
        return 0
    dest.mkdir(parents=True, exist_ok=True)
    if src.is_file():
        shutil.copy2(src, dest / src.name)
        return 1
    for path in src.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(src)
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        n += 1
    return n


def existing_sh_dir(owner: str, repo: str, slug: str) -> Path | None:
    dest = EXISTING_SH / owner / repo / slug
    if already_downloaded(dest):
        return dest
    return None


def write_from_markdown(dest: Path, markdown: str, source: str) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    write_text(dest / "files" / "SKILL.md", markdown if markdown.endswith("\n") else markdown + "\n")
    write_json(
        dest / "meta.json",
        {
            "download_ok": True,
            "via": source,
            "hash": None,
            "fetched_at": utc_now(),
        },
    )


def extract_hot_paths(html: bytes) -> list[str]:
    text = html.decode("utf-8", "replace")
    found = set(re.findall(r"href=\"/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/[A-Za-z0-9_./-]+)\"", text))
    skip_pfx = ("_next/", "api/", "hot", "trending")
    out = []
    for p in found:
        if p.startswith(skip_pfx) or p.count("/") < 2:
            continue
        segs = p.strip("/").split("/")
        if len(segs) >= 3:
            out.append("/".join(segs[:3]))
    return sorted(set(out))


def fetch_sotd() -> list[dict]:
    rows = []
    status, body, _ = http_get("https://claudskills.com/sitemap-news.xml")
    write_bytes(META / "claudskills-sitemap-news.xml", body or b"")
    urls = re.findall(r"<loc>([^<]+)</loc>", (body or b"").decode("utf-8", "replace"))
    # also walk the 60-day calendar
    day = CUTOFF
    while day <= WINDOW_END:
        urls.append(f"https://claudskills.com/sotd/{day.date().isoformat()}/")
        day = day + timedelta(days=1)
    seen = set()
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        if "/sotd/" not in url:
            continue
        dest = PAGES / "sotd" / (url.rstrip("/").split("/")[-1] + ".html")
        st, html, _ = http_get(url)
        if st != 200 or not html:
            continue
        write_bytes(dest, html)
        title = None
        m = re.search(r"<title>([^<]+)</title>", html.decode("utf-8", "replace"), re.I)
        if m:
            title = m.group(1).strip()
        refs = re.findall(
            r"([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)",
            html.decode("utf-8", "replace"),
        )
        skill_refs = [r for r in refs if r.count("/") == 2 and not r.startswith("http")]
        rows.append({"url": url, "title": title, "path": str(dest.relative_to(ROOT)), "refs": skill_refs[:20]})
        print(f"sotd {url} {st} refs={len(skill_refs)}", flush=True)
    write_json(META / "sotd-index.json", rows)
    return rows


def copy_maintained() -> list[dict]:
    """Copy skill trees from actively maintained repos already on disk."""
    copied = []
    packs = [
        (
            "anthropics/skills",
            REPO / "sources" / "github" / "anthropics-skills",
            "github/anthropics-skills",
        ),
        (
            "obra/superpowers",
            REPO / "sources" / "github" / "obra-superpowers",
            "github/obra-superpowers",
        ),
        (
            "davila7/claude-code-templates",
            REPO / "sources" / "github" / "davila7-claude-code-templates",
            "github/davila7-claude-code-templates",
        ),
        (
            "ComposioHQ/awesome-claude-skills",
            REPO / "sources" / "github" / "ComposioHQ-awesome-claude-skills",
            "github/ComposioHQ-awesome-claude-skills",
        ),
        (
            "alirezarezvani/claude-skills",
            Path("/tmp/gh-b3/alirezarezvani-claude-skills"),
            "github/alirezarezvani-claude-skills",
        ),
    ]
    # also copy alirezarezvani into sources/github if missing
    ali_src = Path("/tmp/gh-b3/alirezarezvani-claude-skills")
    ali_dest = REPO / "sources" / "github" / "alirezarezvani-claude-skills"
    if ali_src.exists() and not (ali_dest / "INDEX.md").exists():
        if ali_dest.exists():
            shutil.rmtree(ali_dest)
        copy_tree_files(ali_src, ali_dest)
        leftover = ali_dest / ".git"
        if leftover.exists():
            shutil.rmtree(leftover)
        write_index(
            ali_dest,
            "alirezarezvani/claude-skills",
            [f"Shallow clone of https://github.com/alirezarezvani/claude-skills. `.git` stripped. Archived {utc_now()}."],
        )
        write_text(ali_dest / "ERRORS.md", "# errors\n\nNone.\n")

    for repo, src_root, via in packs:
        if not src_root.exists():
            print(f"missing pack {repo}", flush=True)
            continue
        skills = sorted(src_root.rglob("SKILL.md"))
        for skill_md in skills:
            parent = skill_md.parent
            slug = parent.name
            # derive owner/repo/slug
            owner, rname = repo.split("/", 1)
            dest = SKILLS / owner / rname / slug
            if (dest / "files" / "SKILL.md").exists():
                continue
            n = copy_tree_files(parent, dest / "files")
            write_json(
                dest / "meta.json",
                {
                    "download_ok": True,
                    "via": via,
                    "repo": repo,
                    "slug": slug,
                    "files": n,
                    "fetched_at": utc_now(),
                },
            )
            copied.append(
                {
                    "id": f"repo:{repo}#{slug}",
                    "owner": owner,
                    "repo": rname,
                    "slug": slug,
                    "via": via,
                    "title": first_heading(skill_md) or slug,
                }
            )
        print(f"maintained {repo} skill.md={len(skills)} copied_new={sum(1 for c in copied if c['repo']==rname)}", flush=True)
    write_json(META / "maintained-repos.json", copied)
    return copied


def download_via_skills_sh(needed: list[tuple[str, str, str]], budget: HourlyBudget) -> tuple[int, int]:
    ok = fail = 0
    for owner, repo, slug in needed:
        dest = SKILLS / owner / repo / slug
        if (dest / "files" / "SKILL.md").exists() or already_downloaded(dest):
            continue
        existing = existing_sh_dir(owner, repo, slug)
        if existing:
            copy_tree_files(existing / "files", dest / "files")
            shutil.copy2(existing / "meta.json", dest / "meta.json")
            ok += 1
            continue
        if not budget.allow():
            fail += 1
            write_json(dest / "meta.json", {"download_ok": False, "error": "rate_limited", "fetched_at": utc_now()})
            continue
        url = f"https://skills.sh/api/download/{owner}/{repo}/{slug}"
        status, body, _ = http_get_download(url, budget)
        if status == 429:
            fail += 1
            write_json(dest / "meta.json", {"download_ok": False, "error": "HTTP 429", "fetched_at": utc_now()})
            break
        if status != 200:
            fail += 1
            write_json(dest / "meta.json", {"download_ok": False, "error": f"HTTP {status}", "fetched_at": utc_now()})
            continue
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            fail += 1
            write_json(dest / "meta.json", {"download_ok": False, "error": "bad_json", "fetched_at": utc_now()})
            continue
        files = payload.get("files") or []
        if not files:
            fail += 1
            write_json(dest / "meta.json", {"download_ok": False, "error": "empty_files", "fetched_at": utc_now()})
            continue
        write_skill_files(dest, files)
        write_json(
            dest / "meta.json",
            {
                "download_ok": True,
                "via": "skills.sh/api/download",
                "hash": payload.get("hash"),
                "fetched_at": utc_now(),
            },
        )
        ok += 1
        if ok % 10 == 0:
            print(f"  skills.sh downloads ok={ok} fail={fail}", flush=True)
    return ok, fail


def has_content(owner: str, repo: str, slug: str) -> bool:
    dest = SKILLS / owner / repo / slug
    skill = dest / "files" / "SKILL.md"
    if skill.exists() and skill.stat().st_size > 0:
        return True
    files = dest / "files"
    return files.exists() and any(files.rglob("*"))


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    META.mkdir(parents=True, exist_ok=True)
    SKILLS.mkdir(parents=True, exist_ok=True)
    PAGES.mkdir(parents=True, exist_ok=True)

    errors: list[str] = []

    cached = META / "skillselion-recent.json"
    if cached.exists() and cached.stat().st_size > 1000:
        print("=== skillselion resume (cached) ===", flush=True)
        payload = json.loads(cached.read_text(encoding="utf-8"))
        slim = payload.get("items") or []
        raw_items = slim
        print(f"skillselion cached recent_claude={len(slim)}", flush=True)
    else:
        print("=== skillselion paginate ===", flush=True)
        raw_items = fetch_skillselion()
        recent = [it for it in raw_items if it.get("type") == "skill" or True]
        recent = [it for it in recent if in_window(it) and is_claude(it)]
        slim = [slim_item(it) for it in recent]
        write_json(
            META / "skillselion-recent.json",
            {
                "window_start": CUTOFF.isoformat(),
                "window_end": WINDOW_END.isoformat(),
                "fetched_at": utc_now(),
                "raw_listings": len(raw_items),
                "recent_claude": len(slim),
                "items": slim,
            },
        )
        print(f"skillselion raw={len(raw_items)} recent_claude={len(slim)}", flush=True)

    print("=== hot/trending ===", flush=True)
    hot_paths: list[str] = []
    for name in ("hot", "trending"):
        st, body, _ = http_get(f"https://skills.sh/{name}")
        dest = PAGES / f"{name}.html"
        write_bytes(dest, body or b"")
        paths = extract_hot_paths(body or b"")
        write_json(META / f"{name}-paths.json", paths)
        hot_paths.extend(paths)
        print(f"  {name} http={st} paths={len(paths)}", flush=True)
        if st != 200:
            errors.append(f"skills.sh/{name} HTTP {st}")
    hot_paths = sorted(set(hot_paths))

    print("=== sotd ===", flush=True)
    sotd = fetch_sotd()
    sotd_paths = []
    for row in sotd:
        sotd_paths.extend(row.get("refs") or [])

    print("=== maintained repos ===", flush=True)
    maintained = copy_maintained()

    # plugins snapshot
    plugins_src = REPO / "sources" / "claude.com-plugins" / "pages" / "plugins.html"
    if plugins_src.exists():
        shutil.copy2(plugins_src, META / "claude-com-plugins.html")
    else:
        st, body, _ = http_get("https://claude.com/plugins")
        write_bytes(META / "claude-com-plugins.html", body or b"")
        if st != 200:
            errors.append(f"claude.com/plugins HTTP {st}")

    # claude-plugins.dev recent search
    for url in (
        "https://api.claude-plugins.dev/search?q=skill",
        "https://claude-plugins.dev/api/search?q=skill",
    ):
        st, body, _ = http_get(url)
        if st == 200 and body:
            write_bytes(META / "claude-plugins-dev-search.json", body)
            break
        errors.append(f"{url} HTTP {st}")

    # Fill content for Skillselion recent + hot + sotd
    needed: list[tuple[str, str, str]] = []
    seen_keys: set[tuple[str, str, str]] = set()

    def add_key(owner: str, repo: str, slug: str) -> None:
        key = (owner, repo, slug)
        if key not in seen_keys:
            seen_keys.add(key)
            needed.append(key)

    for it in slim:
        parsed = parse_skill_id(str(it.get("id") or ""))
        if parsed:
            add_key(*parsed)
    for path in hot_paths + sotd_paths:
        segs = path.strip("/").split("/")
        if len(segs) >= 3:
            add_key(segs[0], segs[1], segs[-1])

    content_via_md = 0
    reused = 0
    for owner, repo, slug in needed:
        dest = SKILLS / owner / repo / slug
        if (dest / "files" / "SKILL.md").exists():
            continue
        existing = existing_sh_dir(owner, repo, slug)
        if existing:
            dest.mkdir(parents=True, exist_ok=True)
            copy_tree_files(existing / "files", dest / "files")
            shutil.copy2(existing / "meta.json", dest / "meta.json")
            reused += 1
            continue
        # readmeMarkdown from slim
        md = None
        for it in slim:
            if it.get("owner") == owner and it.get("repo_name") == repo and it.get("slug") == slug:
                md = it.get("readmeMarkdown") or it.get("readmeExcerpt")
                break
        if md and len(str(md)) > 80:
            write_from_markdown(dest, str(md), "skillselion.readmeMarkdown")
            content_via_md += 1

    print(f"reused_skills_sh={reused} from_readmeMarkdown={content_via_md} still_needed check...", flush=True)
    still = [(o, r, s) for o, r, s in needed if not has_content(o, r, s)]
    print(f"still need download {len(still)}", flush=True)
    budget = HourlyBudget(50)
    dl_ok, dl_fail = download_via_skills_sh(still, budget)
    print(f"skills.sh api ok={dl_ok} fail={dl_fail}", flush=True)

    # catalog
    rows = [
        {
            "id": "claude-skills-latest",
            "title": "Latest Claude skills (60-day window)",
            "url": "https://skillselion.com/",
            "source": "claude-skills-latest",
            "type": "site",
            "window_start": "2026-07-14",
            "window_end": "2026-09-12",
            "refreshed_at": utc_now(),
        }
    ]
    downloaded = 0
    failed = 0
    for it in slim:
        parsed = parse_skill_id(str(it.get("id") or ""))
        owner = repo = slug = None
        content = False
        if parsed:
            owner, repo, slug = parsed
            content = has_content(owner, repo, slug)
        if content:
            downloaded += 1
        else:
            failed += 1
            if parsed:
                errors.append(f"no content {it.get('id')}")
        rows.append(
            {
                "id": str(it.get("id")),
                "title": it.get("name") or (slug or str(it.get("id"))),
                "url": f"https://skills.sh/{owner}/{repo}/{slug}" if parsed else "https://skillselion.com/",
                "source": "claude-skills-latest",
                "type": "skill",
                "createdAt": it.get("createdAt"),
                "updatedAt": it.get("updatedAt"),
                "installs": it.get("installs"),
                "has_content": content,
                "via": "skillselion",
            }
        )
    extra_ids = set()
    for path in hot_paths + sotd_paths:
        segs = path.strip("/").split("/")
        if len(segs) < 3:
            continue
        owner, repo, slug = segs[0], segs[1], segs[-1]
        sid = f"skill:{owner}/{repo}#{slug}"
        if any(r.get("id") == sid for r in rows):
            continue
        extra_ids.add(sid)
        content = has_content(owner, repo, slug)
        if content:
            downloaded += 1
        else:
            failed += 1
        rows.append(
            {
                "id": sid,
                "title": slug,
                "url": f"https://skills.sh/{owner}/{repo}/{slug}",
                "source": "claude-skills-latest",
                "type": "skill",
                "createdAt": None,
                "updatedAt": None,
                "installs": None,
                "has_content": content,
                "via": "hot-trending-sotd",
            }
        )
    for rec in maintained:
        sid = rec["id"]
        if any(r.get("id") == sid for r in rows):
            continue
        owner, repo, slug = rec["owner"], rec["repo"], rec["slug"]
        content = has_content(owner, repo, slug)
        rows.append(
            {
                "id": sid,
                "title": rec.get("title") or slug,
                "url": f"https://github.com/{owner}/{repo}",
                "source": "claude-skills-latest",
                "type": "skill",
                "createdAt": None,
                "updatedAt": utc_now(),
                "installs": None,
                "has_content": content,
                "via": rec.get("via"),
            }
        )
        if content:
            downloaded += 1

    upsert_catalog("claude-skills-latest", rows)
    stats = {
        "refreshed_at": utc_now(),
        "window_start": "2026-07-14",
        "window_end": "2026-09-12",
        "skillselion_raw": len(raw_items),
        "recent_metadata": len(slim),
        "hot_trending_paths": len(hot_paths),
        "sotd_pages": len(sotd),
        "maintained_skills": len(maintained),
        "catalog_rows": len(rows),
        "downloaded_or_copied": downloaded,
        "failed_or_metadata_only": failed,
        "reused_skills_sh": reused,
        "from_readmeMarkdown": content_via_md,
        "skills_sh_api_ok": dl_ok,
        "skills_sh_api_fail": dl_fail,
    }
    write_json(META / "stats.json", stats)
    write_index(
        ROOT,
        "Latest Claude skills (60-day window)",
        [
            f"Window: **2026-07-14 → 2026-09-12** (60 days ending archive day). Refreshed {utc_now()}.",
            f"Skillselion listings fetched: **{len(raw_items)}**. Recent Claude-targeted metadata: **{len(slim)}** (`meta/skillselion-recent.json`).",
            f"Content present (SKILL.md or files/): **{downloaded}**. Metadata-only / failed: **{failed}**.",
            f"Reuse: {reused} already on `sources/skills.sh`. {content_via_md} filled from Skillselion `readmeMarkdown`. skills.sh API this pass: {dl_ok} ok / {dl_fail} fail (60/hour cap).",
            f"Also included: skills.sh `/hot` + `/trending` ({len(hot_paths)} paths), ClaudSkills SOTD ({len(sotd)} pages), maintained repos ({len(maintained)} SKILL.md trees).",
            "Does not replace the historical `sources/skills.sh` dump. Catalog source: `claude-skills-latest`.",
        ],
    )
    err_body = ["# claude-skills-latest errors", ""]
    if errors:
        err_body.extend(f"- {e}" for e in errors[:200])
        if len(errors) > 200:
            err_body.append(f"- … {len(errors) - 200} more")
    else:
        err_body.append("None.")
    write_text(ROOT / "ERRORS.md", "\n".join(err_body) + "\n")
    print(json.dumps(stats, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

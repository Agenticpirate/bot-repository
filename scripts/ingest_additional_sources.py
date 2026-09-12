#!/usr/bin/env python3
"""Ingest botteams.io, GitHub packs, and usegrokbot.com into this archive.

Does not invent serials. Does not strip attribution. Does not touch
existing really.bot catalog rows.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = REPO_ROOT / "catalog.json"
UA = (
    "bot-repository-archive/1.0 "
    "(+https://github.com/Agenticpirate/bot-repository)"
)
TIMEOUT = 60


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def http_get(url: str) -> bytes:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "*/*"}
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status} for {url}")
        return resp.read()


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


def get_json(url: str):
    return json.loads(http_get(url).decode("utf-8"))


def fetch_paginated(first_url: str, key: str) -> tuple[dict, list]:
    items: list = []
    url = first_url
    first_meta = None
    pages = 0
    while url:
        data = get_json(url)
        if first_meta is None:
            first_meta = {k: v for k, v in data.items() if k != key}
        batch = data.get(key) or []
        items.extend(batch)
        pages += 1
        url = (data.get("links") or {}).get("next")
        if pages > 20:
            raise RuntimeError(f"pagination safety stop for {first_url}")
    return first_meta or {}, items


def md_escape(text: str) -> str:
    return (text or "").replace("|", "\\|").replace("\n", " ")


def ingest_botteams() -> list[dict]:
    root = REPO_ROOT / "sources" / "botteams.io"
    meta = root / "meta"
    teams_dir = root / "teams"
    bots_dir = root / "bots"
    teams_dir.mkdir(parents=True, exist_ok=True)
    bots_dir.mkdir(parents=True, exist_ok=True)

    write_bytes(meta / "openapi.json", http_get("https://botteams.io/openapi.json"))
    write_bytes(meta / "llms.txt", http_get("https://botteams.io/llms.txt"))

    teams_meta, teams = fetch_paginated("https://botteams.io/api/teams", "teams")
    bots_meta, bots = fetch_paginated("https://botteams.io/api/bots", "bots")

    write_json(
        meta / "teams.json",
        {
            **teams_meta,
            "archived_at": utc_now(),
            "archive_note": "Complete /api/teams snapshot (all pages).",
            "teams": teams,
        },
    )
    orig_pag = bots_meta.get("pagination") or {}
    write_json(
        meta / "bots.json",
        {
            **bots_meta,
            "pagination": {
                "merged": True,
                "fetched_pages": orig_pag.get("totalPages") or 1,
                "total": len(bots),
                "original": orig_pag,
            },
            "links": {
                "self": "https://botteams.io/api/bots",
                "first": "https://botteams.io/api/bots",
                "last": f"https://botteams.io/api/bots?page={orig_pag.get('totalPages') or 1}",
            },
            "archived_at": utc_now(),
            "archive_note": "Complete /api/bots snapshot (all pages merged).",
            "bots": bots,
        },
    )

    catalog: list[dict] = []
    for kind, items, dest in (
        ("team", teams, teams_dir),
        ("bot", bots, bots_dir),
    ):
        for item in items:
            slug = item["slug"]
            write_json(dest / f"{slug}.json", item)
            installer = item.get("installer") or ""
            local_md = None
            if installer.strip():
                write_text(dest / f"{slug}.md", installer)
                local_md = f"sources/botteams.io/{kind}s/{slug}.md"
            url = (
                item.get("detailUrl")
                or item.get("url")
                or f"https://botteams.io/{kind}s/{slug}"
            )
            catalog.append(
                {
                    "source": "botteams.io",
                    "kind": kind,
                    "id": slug,
                    "title": item.get("name"),
                    "url": url,
                    "status": item.get("status"),
                    "category": item.get("category"),
                    "featured": item.get("featured"),
                    "from_xai": item.get("fromXai"),
                    "connectors": item.get("connectors") or [],
                    "added_at": item.get("addedAt"),
                    "listing_source": item.get("sourceUrl"),
                    "local": {
                        "json": f"sources/botteams.io/{kind}s/{slug}.json",
                        "markdown": local_md,
                    },
                }
            )

    lines = [
        "# botteams.io archive index",
        "",
        "Public Grok Bot team/bot directory operated by Ellelion LLC. "
        "Not affiliated with xAI. Canonical site: [botteams.io](https://botteams.io).",
        "",
        f"- Archived at: {utc_now()}",
        f"- Teams: {len(teams)}",
        f"- Bots: {len(bots)} (all API pages)",
        f"- Meta: [llms.txt](meta/llms.txt), [openapi.json](meta/openapi.json), "
        f"[teams.json](meta/teams.json), [bots.json](meta/bots.json)",
        "",
        "Installer markdown is copied verbatim from the `installer` field when present.",
        "",
        "## Teams",
        "",
        "| slug | name | status | category | html | local |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for t in teams:
        slug = t["slug"]
        html = t.get("detailUrl") or f"https://botteams.io/teams/{slug}"
        lines.append(
            f"| [{slug}](teams/{slug}.json) | {md_escape(t.get('name'))} | "
            f"{t.get('status')} | {md_escape(t.get('category'))} | "
            f"[html]({html}) | [json](teams/{slug}.json) / [md](teams/{slug}.md) |"
        )
    lines += [
        "",
        "## Bots",
        "",
        "| slug | name | status | category | html | local |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for t in bots:
        slug = t["slug"]
        html = t.get("detailUrl") or f"https://botteams.io/bots/{slug}"
        lines.append(
            f"| [{slug}](bots/{slug}.json) | {md_escape(t.get('name'))} | "
            f"{t.get('status')} | {md_escape(t.get('category'))} | "
            f"[html]({html}) | [json](bots/{slug}.json) / [md](bots/{slug}.md) |"
        )
    lines.append("")
    write_text(root / "INDEX.md", "\n".join(lines))
    print(f"botteams.io teams={len(teams)} bots={len(bots)}", flush=True)
    return catalog


def git_head(path: Path) -> tuple[str, str]:
    sha = subprocess.check_output(
        ["git", "-C", str(path), "rev-parse", "HEAD"], text=True
    ).strip()
    subject = subprocess.check_output(
        ["git", "-C", str(path), "log", "-1", "--format=%h %s (%ci)"],
        text=True,
    ).strip()
    return sha, subject


def copy_pack(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns(".git"))
    leftover = dest / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)


def first_heading(path: Path) -> str | None:
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.startswith("# "):
                return line[2:].strip()
    except OSError:
        return None
    return None


def ingest_github_packs() -> list[dict]:
    packs = [
        {
            "repo": "majiayu000/awesome-grok-bot",
            "dirname": "majiayu000-awesome-grok-bot",
            "src": Path("/tmp/gh-packs/awesome-grok-bot"),
            "blurb": "Curated Grok Bot directory (listings, templates, and packs).",
        },
        {
            "repo": "codejunkie99/rosterroom",
            "dirname": "codejunkie99-rosterroom",
            "src": Path("/tmp/gh-packs/rosterroom"),
            "blurb": "Roster Room prompt library (new + rebuilt rosters).",
        },
        {
            "repo": "HAEGONG/grok-bot-profiles",
            "dirname": "HAEGONG-grok-bot-profiles",
            "src": Path("/tmp/gh-packs/grok-bot-profiles"),
            "blurb": "Grok Bot profiles with PROFILE / SETUP / README twins.",
        },
    ]
    catalog: list[dict] = []
    for pack in packs:
        src: Path = pack["src"]
        dest = REPO_ROOT / "sources" / "github" / pack["dirname"]
        sha, subject = git_head(src)
        copy_pack(src, dest)
        files = sorted(
            p for p in dest.rglob("*") if p.is_file() and p.name != "INDEX.md"
        )
        nbytes = sum(p.stat().st_size for p in files)
        source_url = f"https://github.com/{pack['repo']}"
        rel_root = f"sources/github/{pack['dirname']}"

        catalog.append(
            {
                "source": f"github/{pack['dirname']}",
                "kind": "pack",
                "id": pack["dirname"],
                "title": pack["repo"],
                "url": source_url,
                "revision": sha,
                "local": {"dir": rel_root, "index": f"{rel_root}/INDEX.md"},
            }
        )

        # Discrete file-level items
        for path in files:
            rel = path.relative_to(dest).as_posix()
            if rel in {"LICENSE", "LICENSE-MIT", "LICENSE-CC0", ".gitignore"}:
                continue
            suffix = path.suffix.lower()
            if suffix not in {".md", ".json"}:
                continue
            # Skip the pack's own giant listing catalog as a single file item;
            # those listings are expanded below.
            if rel == "catalog.json" and pack["dirname"].endswith("awesome-grok-bot"):
                continue
            kind = "file"
            if "/prompts/" in f"/{rel}":
                kind = "prompt"
            elif "/templates/" in f"/{rel}" and path.name in {
                "PROFILE.md",
                "entry.json",
                "SETUP.md",
            }:
                kind = "template"
            elif "/bots/" in f"/{rel}" and path.name in {
                "PROFILE.md",
                "README.md",
                "SETUP.md",
            }:
                kind = "profile"
            elif rel.startswith("packs/") and suffix == ".md":
                kind = "pack-doc"
            title = first_heading(path) if suffix == ".md" else None
            if suffix == ".json":
                try:
                    obj = json.loads(path.read_text(encoding="utf-8"))
                    if isinstance(obj, dict):
                        title = obj.get("name") or obj.get("title") or title
                except json.JSONDecodeError:
                    pass
            catalog.append(
                {
                    "source": f"github/{pack['dirname']}",
                    "kind": kind,
                    "id": rel,
                    "title": title or path.stem,
                    "url": f"{source_url}/blob/{sha}/{rel}",
                    "revision": sha,
                    "local": {"path": f"{rel_root}/{rel}"},
                }
            )

        listing_count = 0
        pack_catalog = dest / "catalog.json"
        if pack_catalog.is_file():
            try:
                payload = json.loads(pack_catalog.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                payload = None
            entries = []
            if isinstance(payload, dict):
                entries = payload.get("entries") or []
            elif isinstance(payload, list):
                entries = payload
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                listing_count += 1
                slug = entry.get("slug") or entry.get("id") or entry.get("name")
                catalog.append(
                    {
                        "source": f"github/{pack['dirname']}",
                        "kind": "listing",
                        "id": slug,
                        "title": entry.get("name") or slug,
                        "url": entry.get("import") or entry.get("related") or source_url,
                        "listing_source": entry.get("source"),
                        "category": entry.get("category"),
                        "verified": entry.get("verified"),
                        "updated": entry.get("updated"),
                        "author": (entry.get("author") or {}).get("name")
                        if isinstance(entry.get("author"), dict)
                        else entry.get("author"),
                        "local": {"catalog": f"{rel_root}/catalog.json"},
                    }
                )

        # INDEX after copy so it is not treated as upstream content in the file walk above
        lines = [
            f"# {pack['repo']}",
            "",
            pack["blurb"],
            "",
            f"- Source: [{source_url}]({source_url})",
            f"- Shallow clone HEAD: `{sha}`",
            f"- Upstream tip: {subject}",
            f"- Archived at: {utc_now()}",
            f"- Files (excluding this INDEX.md): {len(files)} ({nbytes} bytes)",
            "",
            "`.git` was stripped after a `--depth 1` clone. "
            "Licenses and attribution files from upstream are kept.",
            "",
            "## Files",
            "",
        ]
        for path in files:
            rel = path.relative_to(dest).as_posix()
            lines.append(f"- [{rel}]({rel}) ({path.stat().st_size} bytes)")
        if listing_count:
            lines += [
                "",
                f"Upstream `catalog.json` listings included in the root catalog: {listing_count}.",
            ]
        lines.append("")
        write_text(dest / "INDEX.md", "\n".join(lines))
        print(
            f"github {pack['repo']} files={len(files)} listings={listing_count} head={sha[:12]}",
            flush=True,
        )
    return catalog


def ingest_usegrokbot() -> list[dict]:
    root = REPO_ROOT / "sources" / "usegrokbot.com"
    root.mkdir(parents=True, exist_ok=True)
    write_bytes(root / "llms.txt", http_get("https://usegrokbot.com/llms.txt"))
    # Homepage redirects / → /en; store the resolved English snapshot.
    write_bytes(root / "homepage.html", http_get("https://usegrokbot.com/en"))
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# usegrokbot.com",
                "",
                "Real public Grok Bot posts from X, grouped by how people use it. "
                "Canonical site: [usegrokbot.com](https://usegrokbot.com).",
                "",
                f"- Archived at: {utc_now()}",
                "- [llms.txt](llms.txt) from https://usegrokbot.com/llms.txt",
                "- [homepage.html](homepage.html) snapshot of https://usegrokbot.com/en "
                "(the `/` URL 307-redirects here)",
                "",
                "This is a site briefing plus homepage snapshot, not a verified serial archive.",
                "",
            ]
        ),
    )
    print("usegrokbot.com llms+homepage", flush=True)
    return [
        {
            "source": "usegrokbot.com",
            "kind": "meta",
            "id": "llms.txt",
            "title": "UseGrokBot llms.txt",
            "url": "https://usegrokbot.com/llms.txt",
            "local": {"path": "sources/usegrokbot.com/llms.txt"},
        },
        {
            "source": "usegrokbot.com",
            "kind": "homepage",
            "id": "homepage",
            "title": "UseGrokBot homepage (en)",
            "url": "https://usegrokbot.com/en",
            "local": {"path": "sources/usegrokbot.com/homepage.html"},
        },
    ]


def main() -> int:
    extra: list[dict] = []
    extra += ingest_botteams()
    extra += ingest_github_packs()
    extra += ingest_usegrokbot()

    existing = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    kept = [row for row in existing if row.get("source") == "really.bot"]
    dropped = len(existing) - len(kept)
    catalog = kept + extra
    write_json(CATALOG_PATH, catalog)
    print(
        f"catalog really.bot={len(kept)} extra={len(extra)} "
        f"total={len(catalog)} dropped_non_really={dropped}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Archive the Grok Bot Marketplace Plugins catalog / Grok Build plugin marketplace.

Source of truth is https://github.com/xai-org/plugin-marketplace
(`.grok-plugin/marketplace.json` + generated `plugin-index.json`).

Also saves public HTML shells:
  - https://grok.com/bot/marketplace/plugins (in-app Plugins tab)
  - https://x.ai/bot/marketplace (Bots listing; Plugins is a client tab)
  - https://x.ai/news/grok-plugin-marketplace

Does not invent plugin ids. Does not remove other catalog rows.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    pack_rows,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)
from ingest_xai_marketplace import http_get  # noqa: E402

REPO = Path(__file__).resolve().parents[1]
GH_DEST = REPO / "sources" / "github" / "xai-org-plugin-marketplace"
ROOT = REPO / "sources" / "x.ai-bot-marketplace-plugins"
GH_REPO = "xai-org/plugin-marketplace"
TMP = Path("/tmp/xai-plugin-clone/plugin-marketplace")


def md_escape(text: str) -> str:
    return (text or "").replace("|", "\\|").replace("\n", " ")


def refresh_clone() -> str:
    parent = TMP.parent
    parent.mkdir(parents=True, exist_ok=True)
    if TMP.exists() and (TMP / ".git").is_dir():
        subprocess.check_call(["git", "-C", str(TMP), "fetch", "--depth", "1", "origin"])
        subprocess.check_call(["git", "-C", str(TMP), "reset", "--hard", "origin/HEAD"])
    elif not TMP.exists():
        subprocess.check_call(
            [
                "gh",
                "repo",
                "clone",
                GH_REPO,
                str(TMP),
                "--",
                "--depth",
                "1",
            ]
        )
    sha = subprocess.check_output(["git", "-C", str(TMP), "rev-parse", "HEAD"], text=True).strip()
    # copy into sources/github without .git
    if GH_DEST.exists():
        shutil.rmtree(GH_DEST)
    shutil.copytree(TMP, GH_DEST, ignore=shutil.ignore_patterns(".git"))
    leftover = GH_DEST / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)
    return sha


def plugin_markdown(entry: dict, index_entry: dict | None, sha: str) -> str:
    name = entry.get("name") or "plugin"
    src = entry.get("source") or {}
    homepage = entry.get("homepage") or ""
    keywords = entry.get("keywords") or []
    domains = entry.get("domains") or []
    comps = (index_entry or {}).get("components") or {}
    lines = [
        f"# {name}",
        "",
        f"- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)",
        f"- Source of truth: https://github.com/{GH_REPO}",
        f"- Catalog revision: `{sha}`",
        f"- Category: {entry.get('category') or '(none)'}",
        f"- Homepage: {homepage or '(none)'}",
        f"- Keywords: {', '.join(keywords) if keywords else '(none)'}",
        f"- Domains: {', '.join(domains) if domains else '(none)'}",
        "",
        "## Description",
        "",
        entry.get("description") or "_No description in marketplace.json._",
        "",
        "## Source pin",
        "",
        "```json",
        json.dumps(src, indent=2, ensure_ascii=False),
        "```",
        "",
    ]
    if comps:
        lines += ["## Components (plugin-index.json)", ""]
        for kind, items in comps.items():
            lines.append(f"### {kind}")
            lines.append("")
            if not items:
                lines.append("_None._")
                lines.append("")
                continue
            for item in items:
                if isinstance(item, dict):
                    lines.append(
                        f"- **{item.get('name') or '?'}**: {item.get('description') or ''}".rstrip()
                    )
                else:
                    lines.append(f"- {item}")
            lines.append("")
    return "\n".join(lines)


def write_plugin_archive(sha: str) -> list[dict]:
    market_src = GH_DEST / ".grok-plugin" / "marketplace.json"
    index_src = GH_DEST / ".grok-plugin" / "plugin-index.json"
    market = json.loads(market_src.read_text(encoding="utf-8"))
    index = json.loads(index_src.read_text(encoding="utf-8")) if index_src.is_file() else {}
    plugins = list(market.get("plugins") or [])
    index_map = index.get("plugins") or {}

    ROOT.mkdir(parents=True, exist_ok=True)
    meta = ROOT / "meta"
    pages = ROOT / "pages"
    dest_plugins = ROOT / "plugins"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    dest_plugins.mkdir(parents=True, exist_ok=True)

    shutil.copy2(market_src, meta / "marketplace.json")
    if index_src.is_file():
        shutil.copy2(index_src, meta / "plugin-index.json")
    write_json(
        meta / "clone.json",
        {
            "github_repo": f"https://github.com/{GH_REPO}",
            "sha": sha,
            "fetched_at": utc_now(),
            "plugin_count": len(plugins),
            "local_github_pack": "sources/github/xai-org-plugin-marketplace",
        },
    )

    page_jobs = [
        ("https://grok.com/bot/marketplace/plugins", pages / "grok.com-bot-marketplace-plugins.html"),
        ("https://x.ai/bot/marketplace", pages / "x.ai-bot-marketplace.html"),
        ("https://x.ai/news/grok-plugin-marketplace", pages / "x.ai-news-grok-plugin-marketplace.html"),
        ("https://x.ai/grok/build-mode", pages / "x.ai-grok-build-mode.html"),
    ]
    page_errors: list[str] = []
    for url, dest in page_jobs:
        try:
            write_bytes(dest, http_get(url))
        except Exception as exc:  # noqa: BLE001
            page_errors.append(f"{url}: {exc}")
            write_text(dest.with_suffix(dest.suffix + ".ERROR.txt"), str(exc))

    rows: list[dict] = []
    table = [
        "| plugin | category | skills | mcp | homepage |",
        "| --- | --- | ---: | ---: | --- |",
    ]
    for entry in plugins:
        name = str(entry.get("name") or "").strip()
        if not name:
            continue
        idx = index_map.get(name) if isinstance(index_map, dict) else None
        comps = (idx or {}).get("components") or {}
        n_skills = len(comps.get("skills") or [])
        n_mcp = len(comps.get("mcpServers") or [])
        plug_dir = dest_plugins / name
        plug_dir.mkdir(parents=True, exist_ok=True)
        write_json(plug_dir / "marketplace-entry.json", entry)
        if idx:
            write_json(plug_dir / "index-entry.json", idx)
        write_text(plug_dir / "plugin.md", plugin_markdown(entry, idx if isinstance(idx, dict) else None, sha))
        write_json(
            plug_dir / "meta.json",
            {
                "id": name,
                "source": "x.ai-bot-marketplace-plugins",
                "marketplace": "grok-build-plugin-marketplace",
                "github_repo": f"https://github.com/{GH_REPO}",
                "catalog_sha": sha,
                "category": entry.get("category"),
                "homepage": entry.get("homepage"),
                "keywords": entry.get("keywords") or [],
                "domains": entry.get("domains") or [],
                "plugin_sha": (idx or {}).get("sha") or (entry.get("source") or {}).get("sha"),
                "version": (idx or {}).get("version"),
                "skills_count": n_skills,
                "mcp_count": n_mcp,
                "scraped_at": utc_now(),
            },
        )
        homepage = entry.get("homepage") or f"https://github.com/{GH_REPO}"
        table.append(
            f"| [{name}](plugins/{name}/plugin.md) | {md_escape(entry.get('category') or '')} "
            f"| {n_skills} | {n_mcp} | [link]({homepage}) |"
        )
        rows.append(
            {
                "id": name,
                "title": name,
                "url": homepage,
                "source": "x.ai-bot-marketplace-plugins",
                "type": "marketplace-plugin",
                "category": entry.get("category"),
                "revision": sha,
                "local": {
                    "dir": f"sources/x.ai-bot-marketplace-plugins/plugins/{name}",
                    "markdown": f"sources/x.ai-bot-marketplace-plugins/plugins/{name}/plugin.md",
                    "entry": f"sources/x.ai-bot-marketplace-plugins/plugins/{name}/marketplace-entry.json",
                },
            }
        )

    write_index(
        ROOT,
        "x.ai Grok Marketplace — Plugins",
        [
            "Official **Plugins** catalog for Grok Build / the in-app marketplace Plugins tab.",
            "Distinct from the **Bots** tab archived at "
            "[sources/x.ai-bot-marketplace/](../x.ai-bot-marketplace/INDEX.md).",
            "",
            f"- Source of truth: [{GH_REPO}](https://github.com/{GH_REPO}) "
            "`.grok-plugin/marketplace.json` + `plugin-index.json`",
            f"- GitHub pack copy: `sources/github/xai-org-plugin-marketplace/` @ `{sha}`",
            "- Public shells: [grok.com/bot/marketplace/plugins](https://grok.com/bot/marketplace/plugins) "
            "(JS app), [x.ai/news/grok-plugin-marketplace](https://x.ai/news/grok-plugin-marketplace)",
            f"- Archived at: {utc_now()}",
            f"- Plugins in catalog: {len(plugins)}",
            "",
            "Per-plugin metadata is copied from the official JSON catalog. "
            "There is no public per-plugin HTML twin on x.ai. Do not invent plugin ids.",
            "",
            *table,
            "",
        ],
    )
    err = [
        "# x.ai marketplace plugins — notes",
        "",
        f"Updated: {utc_now()}",
        "",
        "`https://x.ai/bot/marketplace/plugins` returns HTTP 404. "
        "The in-app Plugins view is `https://grok.com/bot/marketplace/plugins` "
        "(client-rendered). Catalog JSON lives on GitHub.",
        "",
    ]
    if page_errors:
        err += ["## Page fetch errors", ""]
        for line in page_errors:
            err.append(f"- {line}")
        err.append("")
    else:
        err += ["Public HTML shells downloaded without error.", ""]
    write_text(ROOT / "ERRORS.md", "\n".join(err))

    write_index(
        GH_DEST,
        "xai-org/plugin-marketplace",
        [
            f"Shallow clone of https://github.com/{GH_REPO}. `.git` stripped.",
            f"HEAD `{sha}` at {utc_now()}.",
            f"Catalog plugins: {len(plugins)}.",
            "Curated per-plugin metadata: `sources/x.ai-bot-marketplace-plugins/`.",
        ],
    )

    rows.insert(
        0,
        {
            "id": "x.ai-bot-marketplace-plugins",
            "title": "Grok Marketplace Plugins catalog",
            "url": f"https://github.com/{GH_REPO}",
            "source": "x.ai-bot-marketplace-plugins",
            "type": "pack",
            "revision": sha,
            "plugin_count": len(plugins),
        },
    )
    return rows


def main() -> int:
    sha = refresh_clone()
    print(f"cloned {GH_REPO} {sha}", flush=True)
    rows = write_plugin_archive(sha)
    upsert_catalog("x.ai-bot-marketplace-plugins", rows)
    upsert_catalog("github/xai-org-plugin-marketplace", pack_rows("xai-org-plugin-marketplace", GH_REPO, GH_DEST, sha))
    print(f"plugins archived={len(rows)-1} sha={sha}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

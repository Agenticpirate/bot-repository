#!/usr/bin/env python3
"""Archive Claude Code / Claude Cowork galleries, official docs, and Muse notes.

Does not remove existing catalog rows for other sources. Skip trees already
present under sources/. Git clones are copied from /tmp/gh-claude with .git stripped.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    pack_rows,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)
from ingest_priority_cd import copy_tmp_pack  # noqa: E402

TMP = Path("/tmp/gh-claude")
DOCS_TMP = Path("/tmp/claude-docs")
MUSE_TMP = Path("/tmp/muse")

# (github repo, dest dirname, tmp clone dir)
SPECIFIED = [
    (
        "anthropics/knowledge-work-plugins",
        "anthropics-knowledge-work-plugins",
        "knowledge-work-plugins",
    ),
    (
        "anthropics/claude-for-legal",
        "anthropics-claude-for-legal",
        "claude-for-legal",
    ),
    (
        "alexclowe/awesome-claude-cowork-plugins",
        "alexclowe-awesome-claude-cowork-plugins",
        "awesome-claude-cowork-plugins",
    ),
]

EXTRA = [
    ("hesreallyhim/awesome-claude-code", "hesreallyhim-awesome-claude-code", "hesreallyhim-awesome-claude-code"),
    ("travisvn/awesome-claude-skills", "travisvn-awesome-claude-skills", "travisvn-awesome-claude-skills"),
    ("ComposioHQ/awesome-claude-skills", "ComposioHQ-awesome-claude-skills", "ComposioHQ-awesome-claude-skills"),
    ("VoltAgent/awesome-claude-code-subagents", "VoltAgent-awesome-claude-code-subagents", "VoltAgent-awesome-claude-code-subagents"),
    ("ccplugins/awesome-claude-code-plugins", "ccplugins-awesome-claude-code-plugins", "ccplugins-awesome-claude-code-plugins"),
    ("anthropics/claude-desktop-buddy", "anthropics-claude-desktop-buddy", "anthropics-claude-desktop-buddy"),
    ("abhishekray07/claude-md-templates", "abhishekray07-claude-md-templates", "abhishekray07-claude-md-templates"),
    ("BehiSecc/awesome-claude-skills", "BehiSecc-awesome-claude-skills", "BehiSecc-awesome-claude-skills"),
    ("anthropics/life-sciences", "anthropics-life-sciences", "anthropics-life-sciences"),
    ("anthropics/commerce-agents", "anthropics-commerce-agents", "anthropics-commerce-agents"),
    ("wshobson/agents", "wshobson-agents", "wshobson-agents"),
    ("anthropics/financial-services", "anthropics-financial-services", "anthropics-financial-services"),
    ("anthropics/healthcare", "anthropics-healthcare", "anthropics-healthcare"),
    ("anthropics/claude-tag-plugins", "anthropics-claude-tag-plugins", "anthropics-claude-tag-plugins"),
]

DOC_PAGES = [
    # dest relative to sources/claude.com-docs/, tmp filename, canonical url, skip_if_tiny
    ("pages/plugins-reference.md", "plugins-reference.md", "https://code.claude.com/docs/en/plugins-reference.md", False),
    ("pages/plugins-reference.html", "plugins-reference.html", "https://code.claude.com/docs/en/plugins-reference", False),
    ("pages/plugins.md", "plugins.md", "https://code.claude.com/docs/en/plugins.md", False),
    ("pages/plugins.html", "plugins.html", "https://code.claude.com/docs/en/plugins", False),
    ("pages/discover-plugins.md", "discover-plugins.md", "https://code.claude.com/docs/en/discover-plugins.md", False),
    ("pages/discover-plugins.html", "discover-plugins.html", "https://code.claude.com/docs/en/discover-plugins", False),
    ("pages/plugin-marketplaces.md", "plugin-marketplaces.md", "https://code.claude.com/docs/en/plugin-marketplaces.md", False),
    ("pages/plugin-marketplaces.html", "plugin-marketplaces.html", "https://code.claude.com/docs/en/plugin-marketplaces", False),
    ("meta/llms.txt", "plugins-llms.txt", "https://code.claude.com/docs/llms.txt", False),
]

COWORK_PAGES = [
    ("pages/product-cowork.html", "cowork-product.html", "https://claude.com/product/cowork", False),
    ("pages/docs-cowork-overview.html", "cowork-overview.html", "https://claude.com/docs/cowork/overview", False),
    ("pages/docs-cowork-plugins.html", "cowork-plugins-docs.html", "https://claude.com/docs/cowork/guide/plugins", False),
    ("pages/blog-cowork-plugins.html", "cowork-plugins-blog.html", "https://claude.com/blog/cowork-plugins", False),
    ("pages/plugins-directory.html", "claude-plugins-dir.html", "https://claude.com/plugins/", False),
]


def already_present(dest: Path) -> bool:
    return dest.exists() and any(dest.iterdir())


def ingest_pack(repo: str, dirname: str, tmp_name: str) -> int:
    dest = REPO / "sources" / "github" / dirname
    if already_present(dest) and (dest / "INDEX.md").exists():
        print(f"skip existing github/{dirname}", flush=True)
        return 0
    src = TMP / tmp_name
    if not src.exists():
        print(f"MISSING clone {src}", flush=True)
        return 0
    copy_tmp_pack(src, dest, repo, dirname)
    return 1


def copy_snapshot(src: Path, dest: Path) -> bool:
    if not src.exists() or src.stat().st_size == 0:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return True


def ingest_doc_site(
    slug: str,
    title: str,
    home: str,
    pages: list[tuple[str, str, str, bool]],
    notes: list[str],
    errors: list[str],
) -> None:
    root = REPO / "sources" / slug
    rows = [
        {
            "id": slug,
            "title": title,
            "url": home,
            "source": slug,
            "type": "site",
            "archived_at": utc_now(),
        }
    ]
    saved = 0
    for rel, tmp_name, url, skip_tiny in pages:
        src = DOCS_TMP / tmp_name
        dest = root / rel
        if skip_tiny and src.exists() and src.stat().st_size < 2000:
            errors.append(f"{url} snapshot too small ({src.stat().st_size} B); skipped.")
            continue
        if copy_snapshot(src, dest):
            saved += 1
            rows.append(
                {
                    "id": rel,
                    "title": Path(rel).stem,
                    "url": url,
                    "source": slug,
                    "type": "page",
                    "path": rel,
                    "bytes": dest.stat().st_size,
                }
            )
        else:
            errors.append(f"missing snapshot for {url} ({tmp_name})")
    write_json(
        root / "meta" / "status.json",
        {"archived_at": utc_now(), "pages": saved, "home": home},
    )
    write_index(root, title, notes + [f"Saved {saved} snapshots at {utc_now()}."])
    write_text(
        root / "ERRORS.md",
        f"# {slug} errors\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog(slug, rows)


def ingest_docs() -> None:
    ingest_doc_site(
        "claude.com-docs",
        "Claude Code plugin docs",
        "https://code.claude.com/docs/en/plugins-reference",
        DOC_PAGES,
        [
            "HTML + Markdown snapshots of official Claude Code plugin / marketplace docs.",
            "Prefer `pages/*.md` over the large Next.js HTML shells when quoting.",
            "Official reserved marketplace names are listed in `plugin-marketplaces.md`.",
            "Related: https://code.claude.com/docs/en/plugins , /discover-plugins , /plugin-marketplaces , /docs/llms.txt.",
        ],
        [
            "https://code.claude.com/docs/en/discover-and-install-remote-plugins returned HTTP 404 (md + html).",
        ],
    )
    ingest_doc_site(
        "claude.com-cowork",
        "Claude Cowork product + plugin docs",
        "https://claude.com/product/cowork",
        COWORK_PAGES,
        [
            "Product page, Cowork overview, Cowork plugins guide, plugins blog, and /plugins directory.",
            "These are marketing/docs HTML shells; plugin source trees live under sources/github/.",
        ],
        [
            "https://www.anthropic.com/news/cowork returned HTTP 404.",
        ],
    )


def ingest_muse() -> None:
    root = REPO / "sources" / "muse-research"
    pages = root / "pages"
    meta = root / "meta"
    rows = [
        {
            "id": "muse-research",
            "title": "Muse agent/bot gallery hunt",
            "url": "https://github.com/Agenticpirate/bot-repository/blob/main/docs/muse-research.md",
            "source": "muse-research",
            "type": "site",
            "archived_at": utc_now(),
        }
    ]
    copies = [
        ("pages/agentforge-muse-content-machine.html", "agentforge.html", "https://agentforge.solutions/templates/muse-content-machine", 200),
        ("pages/claudemarket-muse-content-creator.html", "claudemarket.html", "https://www.claudemarket.ai/marketplace/muse-content-creator", 429),
        ("pages/muse-ai.html", "muse-ai.html", "https://muse.ai", 200),
    ]
    errors = []
    saved = 0
    for rel, tmp_name, url, expected in copies:
        src = MUSE_TMP / tmp_name
        dest = root / rel
        if copy_snapshot(src, dest):
            saved += 1
            rows.append(
                {
                    "id": rel,
                    "title": Path(rel).stem,
                    "url": url,
                    "source": "muse-research",
                    "type": "page",
                    "path": rel,
                    "http_expected": expected,
                    "bytes": dest.stat().st_size,
                }
            )
            if expected != 200:
                errors.append(f"{url} HTTP {expected} (body saved).")
        else:
            errors.append(f"missing {tmp_name} for {url}")
    write_json(
        meta / "status.json",
        {
            "archived_at": utc_now(),
            "note": "No dedicated public Muse Grok bot gallery found. See docs/muse-research.md.",
            "pages": saved,
        },
    )
    write_index(
        root,
        "muse-research",
        [
            "Research snapshots only — not a Muse Grok marketplace.",
            "See docs/muse-research.md for disambiguation (Cursor muse-spark, muse.ai video, AgentForge/ClaudeMarket content agents).",
            f"Saved {saved} snapshots at {utc_now()}.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# muse-research errors\n\n"
        + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("muse-research", rows)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--batch",
        choices=["specified", "docs", "extra", "muse", "all"],
        default="all",
    )
    args = ap.parse_args()
    n = 0
    if args.batch in ("specified", "all"):
        for repo, dirname, tmp_name in SPECIFIED:
            n += ingest_pack(repo, dirname, tmp_name)
    if args.batch in ("docs", "all"):
        ingest_docs()
        n += 1
    if args.batch in ("extra", "all"):
        for repo, dirname, tmp_name in EXTRA:
            n += ingest_pack(repo, dirname, tmp_name)
    if args.batch in ("muse", "all"):
        ingest_muse()
        n += 1
    print(f"done batch={args.batch} ingested={n}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

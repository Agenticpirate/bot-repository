#!/usr/bin/env python3
"""Archive Batch 3: Muse, Claude Code/Cowork, Grok extras, workflow galleries.

Skips trees already present under sources/. Does not remove other catalog rows.
GitHub packs are copied from /tmp/gh-b3 with .git already stripped.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    fetch_ok,
    http_get,
    pack_rows,
    sitemap_locs,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)
from ingest_priority_cd import copy_tmp_pack  # noqa: E402

TMP = Path("/tmp/gh-b3")
WEB = Path("/tmp/b3-web")


def already(dest: Path) -> bool:
    return dest.exists() and (dest / "INDEX.md").exists()


def ingest_pack(repo: str, dirname: str, tmp_name: str | None = None) -> int:
    dest = REPO / "sources" / "github" / dirname
    if already(dest):
        print(f"skip existing github/{dirname}", flush=True)
        return 0
    src = TMP / (tmp_name or dirname)
    if not src.exists():
        print(f"MISSING {src}", flush=True)
        return 0
    copy_tmp_pack(src, dest, repo, dirname)
    nfiles = sum(1 for p in dest.rglob("*") if p.is_file())
    print(f"  files={nfiles}", flush=True)
    return 1


def copy_file(src: Path, dest: Path) -> bool:
    if not src.exists() or src.stat().st_size == 0:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return True


def site_rows(slug: str, title: str, home: str, extra: list[dict] | None = None) -> list[dict]:
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
    return rows + (extra or [])


def finish_site(root: Path, slug: str, title: str, notes: list[str], errors: list[str], rows: list[dict]) -> None:
    write_index(root, title, notes + [f"Archived {utc_now()}."])
    write_text(
        root / "ERRORS.md",
        f"# {slug} errors\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog(slug, rows)


def band_a() -> None:
    # 1. Meta Muse Spark cookbooks
    root = REPO / "sources" / "dev.meta.ai-cookbook"
    pages = root / "pages"
    meta = root / "meta"
    errors: list[str] = []
    rows = site_rows(
        "dev.meta.ai-cookbook",
        "Meta Model API / Muse Spark cookbooks",
        "https://dev.meta.ai/docs/cookbook",
    )
    copy_file(WEB / "meta-llms.txt", meta / "llms.txt")
    copy_file(WEB / "meta-cookbook.html", pages / "cookbook.html")
    copy_file(WEB / "meta-muse-code.html", pages / "cookbook-muse-code.html")
    copy_file(WEB / "meta-docs.html", pages / "docs.html")
    md_dir = WEB / "meta-md"
    if md_dir.exists():
        for src in sorted(md_dir.iterdir()):
            dest = pages / src.name
            if copy_file(src, dest):
                rows.append(
                    {
                        "id": src.name,
                        "title": src.stem,
                        "url": "https://dev.meta.ai/docs/"
                        + src.name.replace("-", "/", 1).replace(".md", ".md")
                        if False
                        else f"https://dev.meta.ai/docs/{src.name.replace('.md', '')}",
                        "source": "dev.meta.ai-cookbook",
                        "type": "page",
                        "path": f"pages/{src.name}",
                    }
                )
    # fix cookbook md urls from filenames
    url_map = {
        "cookbook.md": "https://dev.meta.ai/docs/cookbook.md",
        "cookbook-api-fundamentals.md": "https://dev.meta.ai/docs/cookbook/api-fundamentals.md",
        "cookbook-agent-patterns.md": "https://dev.meta.ai/docs/cookbook/agent-patterns.md",
        "cookbook-use-cases.md": "https://dev.meta.ai/docs/cookbook/use-cases.md",
        "cookbook-muse-code.md": "https://dev.meta.ai/docs/cookbook/muse-code.md",
        "cookbook-muse-image.md": "https://dev.meta.ai/docs/cookbook/muse-image.md",
        "cookbook-muse-voice-transcribe.md": "https://dev.meta.ai/docs/cookbook/muse-voice-transcribe.md",
        "muse-code.md": "https://dev.meta.ai/docs/muse-code.md",
        "muse-code-workflows.md": "https://dev.meta.ai/docs/muse-code/workflows.md",
        "muse-code-extending.md": "https://dev.meta.ai/docs/muse-code/extending.md",
        "coding-agents.md": "https://dev.meta.ai/docs/coding-agents.md",
        "agent-frameworks.md": "https://dev.meta.ai/docs/agent-frameworks.md",
        "overview.md": "https://dev.meta.ai/docs/overview.md",
        "models.md": "https://dev.meta.ai/docs/models.md",
        "quickstart.md": "https://dev.meta.ai/docs/quickstart.md",
    }
    for row in rows:
        if row.get("path", "").startswith("pages/") and Path(row["path"]).name in url_map:
            row["url"] = url_map[Path(row["path"]).name]
    write_json(meta / "status.json", {"archived_at": utc_now(), "note": "No public Muse store; cookbooks only."})
    finish_site(
        root,
        "dev.meta.ai-cookbook",
        "Meta Model API / Muse Spark cookbooks",
        [
            "Snapshots of https://dev.meta.ai/docs/cookbook and linked Muse Code / agent recipe markdown.",
            "Meta Muse has **no public plugin/bot store**. These are API cookbooks for Muse Spark / Muse Code.",
        ],
        errors,
        rows,
    )

    # 2. edheltzel/Muse
    ingest_pack("edheltzel/Muse", "edheltzel-Muse")

    # 3. third-party Muse-branded pages
    root = REPO / "sources" / "muse-thirdparty"
    errors = []
    rows = site_rows(
        "muse-thirdparty",
        "Third-party Muse-branded packs",
        "https://agentforge.solutions/templates/muse-content-machine",
    )
    copies = [
        (
            "pages/agentforge-muse-content-machine.html",
            WEB / "agentforge.html",
            "https://agentforge.solutions/templates/muse-content-machine",
            200,
        ),
        (
            "pages/claudemarket-muse-content-creator.html",
            WEB / "claudemarket.html",
            "https://www.claudemarket.ai/marketplace/muse-content-creator",
            429,
        ),
    ]
    for rel, src, url, expected in copies:
        dest = root / rel
        if copy_file(src, dest):
            rows.append(
                {
                    "id": rel,
                    "title": Path(rel).stem,
                    "url": url,
                    "source": "muse-thirdparty",
                    "type": "page",
                    "path": rel,
                    "http_expected": expected,
                    "bytes": dest.stat().st_size,
                }
            )
            if expected != 200:
                errors.append(f"{url} HTTP {expected} (body saved).")
        else:
            errors.append(f"missing {src.name}")
    finish_site(
        root,
        "muse-thirdparty",
        "Third-party Muse-branded packs",
        [
            "AgentForge “Muse — Content Machine” and ClaudeMarket “Muse — AI Content Creator”.",
            "Single listings, not a Muse store. See docs/muse-research.md.",
        ],
        errors,
        rows,
    )


def band_b() -> None:
    # 4. claude.com/plugins listing
    root = REPO / "sources" / "claude.com-plugins"
    errors: list[str] = []
    copy_file(WEB / "claude-plugins.html", root / "pages" / "plugins.html")
    titles_path = WEB / "claude-plugins-titles.json"
    titles: list[str] = []
    if titles_path.exists():
        titles = json.loads(titles_path.read_text())
        write_json(root / "meta" / "plugin-titles.json", titles)
    decoded = WEB / "plugins.decoded.json"
    if decoded.exists():
        copy_file(decoded, root / "meta" / "plugins.webflow.json")
        errors.append(
            "https://www.claude.com/plugins.json is a gzipped Webflow page dump, not a plugin catalog."
        )
    rows = site_rows(
        "claude.com-plugins",
        "claude.com/plugins directory",
        "https://claude.com/plugins",
    )
    for i, title in enumerate(titles, 1):
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        rows.append(
            {
                "id": slug or f"plugin-{i}",
                "title": title,
                "url": "https://claude.com/plugins",
                "source": "claude.com-plugins",
                "type": "plugin",
            }
        )
    finish_site(
        root,
        "claude.com-plugins",
        "claude.com/plugins directory",
        [
            f"HTML snapshot plus {len(titles)} plugin titles extracted from directory headings.",
            "No public JSON catalog API; sitemap.xml 404; plugins.json is Webflow CMS.",
        ],
        errors,
        rows,
    )

    # 5. anthropics/skills (knowledge-work-plugins + claude-for-legal already present)
    ingest_pack("anthropics/skills", "anthropics-skills")
    if already(REPO / "sources" / "github" / "anthropics-knowledge-work-plugins"):
        print("skip existing github/anthropics-knowledge-work-plugins", flush=True)
    if already(REPO / "sources" / "github" / "anthropics-claude-for-legal"):
        print("skip existing github/anthropics-claude-for-legal", flush=True)
    if already(REPO / "sources" / "claude.com-cowork"):
        print("skip existing claude.com-cowork", flush=True)
    if already(REPO / "sources" / "claude.com-docs"):
        print("skip existing claude.com-docs", flush=True)


def ingest_listing_site(
    slug: str,
    title: str,
    home: str,
    files: list[tuple[str, Path | None, str]],
    extras: list[tuple[str, str]],
    notes: list[str],
) -> None:
    root = REPO / "sources" / slug
    errors: list[str] = []
    rows = site_rows(slug, title, home)
    for rel, src, url in files:
        dest = root / rel
        ok = copy_file(src, dest) if src else fetch_ok(url, dest)
        if ok:
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
            errors.append(f"failed {url}")
    for name, url in extras:
        dest = root / ("meta" if name.endswith((".xml", ".txt", ".json")) else "pages") / name
        if fetch_ok(url, dest):
            rows.append(
                {
                    "id": name,
                    "title": Path(name).stem,
                    "url": url,
                    "source": slug,
                    "type": "page",
                    "path": str(dest.relative_to(root)),
                    "bytes": dest.stat().st_size,
                }
            )
            if name.endswith(".xml"):
                locs = sitemap_locs(dest.read_bytes())
                write_json(root / "meta" / f"{Path(name).stem}-urls.json", locs)
                for loc in locs:
                    rows.append(
                        {
                            "id": loc,
                            "title": loc.rstrip("/").split("/")[-1] or slug,
                            "url": loc,
                            "source": slug,
                            "type": "url",
                        }
                    )
        else:
            errors.append(f"failed {url}")
    finish_site(root, slug, title, notes, errors, rows)


def band_c_sites() -> None:
    ingest_listing_site(
        "aitmpl.com",
        "aitmpl.com (Claude Code templates)",
        "https://www.aitmpl.com/",
        [
            ("pages/index.html", WEB / "aitmpl.html", "https://www.aitmpl.com/"),
        ],
        [
            ("sitemap.xml", "https://aitmpl.com/sitemap.xml"),
        ],
        [
            "Homepage + sitemap URL list (components/plugins/agents/skills).",
            "SPA /api/templates returns the HTML shell; no JSON dump.",
            "Companion clone: sources/github/davila7-claude-code-templates/.",
        ],
    )
    ingest_listing_site(
        "claudskills.com",
        "ClaudSkills.com catalog",
        "https://claudskills.com/",
        [
            ("pages/index.html", WEB / "claudskills.html", "https://claudskills.com/"),
            ("meta/llms.txt", WEB / "claudskills-llms.txt", "https://claudskills.com/llms.txt"),
        ],
        [("sitemap.xml", "https://claudskills.com/sitemap.xml")],
        [
            "llms.txt describes ~191k skills; no public JSON dump this pass (`/api/skills` 404).",
            "Sitemap is tiny; catalog is not fully exploded.",
        ],
    )
    ingest_listing_site(
        "skillsboard.sh",
        "skillsboard.sh",
        "https://skillsboard.sh/",
        [
            ("pages/index.html", WEB / "skillsboard.html", "https://www.skillsboard.sh/"),
            ("meta/llms.txt", WEB / "skillsboard-llms.txt", "https://skillsboard.sh/llms.txt"),
        ],
        [("sitemap.xml", "https://skillsboard.sh/sitemap.xml")],
        ["Team skills registry; llms.txt + sitemap saved."],
    )
    ingest_listing_site(
        "claudemarketplaces.com",
        "claudemarketplaces.com",
        "https://claudemarketplaces.com/",
        [
            ("pages/index.html", WEB / "claudemarketplaces.html", "https://claudemarketplaces.com/"),
        ],
        [("sitemap.xml", "https://claudemarketplaces.com/sitemap.xml")],
        ["Marketplace directory listing HTML + sitemap."],
    )
    ingest_listing_site(
        "awesome-skills.com",
        "awesome-skills.com",
        "https://awesome-skills.com/",
        [
            ("pages/index.html", WEB / "awesome-skills.html", "https://awesome-skills.com/"),
        ],
        [("sitemap.xml", "https://awesome-skills.com/sitemap.xml")],
        ["Homepage HTML (~1.7 MiB). llms.txt is the same HTML shell."],
    )
    ingest_listing_site(
        "claudecowork.im",
        "claudecowork.im workflows + plugins",
        "https://claudecowork.im/workflows",
        [
            ("pages/workflows.html", WEB / "cowork-wf.html", "https://claudecowork.im/workflows"),
            ("pages/plugins.html", WEB / "cowork-pl.html", "https://claudecowork.im/plugins"),
            ("meta/llms.txt", WEB / "cowork-llms.txt", "https://claudecowork.im/llms.txt"),
        ],
        [("sitemap.xml", "https://claudecowork.im/sitemap.xml")],
        [
            "Workflows + plugins pages, llms.txt, full sitemap URL list (~3.9k, mostly /resources).",
        ],
    )
    ingest_listing_site(
        "madewithclaude.com",
        "madewithclaude.com",
        "https://madewithclaude.com/",
        [("pages/index.html", WEB / "madewithclaude.html", "https://madewithclaude.com/")],
        [],
        ["Homepage snapshot."],
    )
    ingest_listing_site(
        "claudebuilds.com",
        "claudebuilds.com",
        "https://claudebuilds.com/",
        [("pages/index.html", WEB / "claudebuilds.html", "https://claudebuilds.com/")],
        [],
        ["Homepage snapshot."],
    )


C_PACKS = [
    ("davila7/claude-code-templates", "davila7-claude-code-templates"),
    ("Chat2AnyLLM/awesome-claude-plugins", "Chat2AnyLLM-awesome-claude-plugins"),
    ("obra/superpowers", "obra-superpowers"),
    ("jeremylongshore/claude-code-plugins-plus", "jeremylongshore-claude-code-plugins-plus"),
    ("daymade/claude-code-skills", "daymade-claude-code-skills"),
    ("netresearch/claude-code-marketplace", "netresearch-claude-code-marketplace"),
    ("ananddtyagi/cc-marketplace", "ananddtyagi-cc-marketplace"),
    ("TheCraigHewitt/cowork-starter-pack", "TheCraigHewitt-cowork-starter-pack"),
    ("jitangupta/cowork-boilerplate", "jitangupta-cowork-boilerplate"),
    ("helgejo/cowork-template", "helgejo-cowork-template"),
    ("machine-costas/claude-projects-templates", "machine-costas-claude-projects-templates"),
]

C_SKIP = [
    "hesreallyhim-awesome-claude-code",
    "ComposioHQ-awesome-claude-skills",
    "travisvn-awesome-claude-skills",
    "BehiSecc-awesome-claude-skills",
    "VoltAgent-awesome-claude-code-subagents",
    "ccplugins-awesome-claude-code-plugins",
    "alexclowe-awesome-claude-cowork-plugins",
]


def band_c_packs() -> None:
    for name in C_SKIP:
        print(f"skip existing github/{name}", flush=True)
    for repo, dirname in C_PACKS:
        ingest_pack(repo, dirname)


D_PACKS = [
    ("xai-org/plugin-marketplace", "xai-org-plugin-marketplace"),
    ("DominikTobureto/awesome-grok-build", "DominikTobureto-awesome-grok-build"),
    ("LifeJiggy/Awesome-Grok-Skills", "LifeJiggy-Awesome-Grok-Skills"),
    ("GuBeLa/grok-agents-hub", "GuBeLa-grok-agents-hub"),
    ("rdmgator12/awesome-grok-bot-plugins", "rdmgator12-awesome-grok-bot-plugins"),
]


def band_d() -> None:
    for repo, dirname in D_PACKS:
        ingest_pack(repo, dirname)
    if already(REPO / "sources" / "github" / "mergisi-awesome-grokbot"):
        print("skip existing github/mergisi-awesome-grokbot", flush=True)
    if already(REPO / "sources" / "botdirectory.ai"):
        print("skip existing botdirectory.ai (full bots.json already archived)", flush=True)


E_PACKS = [
    ("crewAIInc/crewAI-examples", "crewAIInc-crewAI-examples"),
    ("crewAIInc/awesome-crewai", "crewAIInc-awesome-crewai"),
    ("zapier/community-skills", "zapier-community-skills"),
    ("green-dalii/diflowy", "green-dalii-diflowy"),
    ("svcvit/Awesome-Dify-Workflow", "svcvit-Awesome-Dify-Workflow"),
    ("scrapernode/awesome-n8n-templates", "scrapernode-awesome-n8n-templates"),
    ("zie619/n8n-workflows", "zie619-n8n-workflows"),
    ("Empreiteiro/langflow-templates", "Empreiteiro-langflow-templates"),
    ("fenggeliaoai/cozeworkflows", "fenggeliaoai-cozeworkflows"),
    ("botpress/solutions", "botpress-solutions"),
]


def band_e_sites() -> None:
    ingest_listing_site(
        "marketplace.crewai.com",
        "CrewAI marketplace",
        "https://marketplace.crewai.com/",
        [("pages/index.html", WEB / "crewai.html", "https://marketplace.crewai.com/")],
        [],
        ["Listing HTML. sitemap.xml 404."],
    )
    ingest_listing_site(
        "zapier.com-templates",
        "Zapier templates + workflow gallery",
        "https://zapier.com/templates",
        [
            ("pages/templates.html", WEB / "zapier-templates.html", "https://zapier.com/templates"),
            ("pages/workflow-gallery.html", WEB / "zapier-gallery.html", "https://zapier.com/workflow-gallery"),
        ],
        [],
        [
            "Public listing HTML (large Next/marketing shells).",
            "Companion clone: sources/github/zapier-community-skills/.",
        ],
    )
    root = REPO / "sources" / "make.com-templates"
    write_bytes(root / "pages" / "en-templates.html", (WEB / "make-templates.html").read_bytes() if (WEB / "make-templates.html").exists() else b"")
    finish_site(
        root,
        "make.com-templates",
        "make.com/en/templates",
        [
            "GET https://www.make.com/en/templates → HTTP 403 (same as prior make.com API 401).",
        ],
        ["HTTP 403 on /en/templates; /api/v2/templates/public still 401."],
        site_rows("make.com-templates", "make.com/en/templates", "https://www.make.com/en/templates"),
    )
    for slug, title, home, fname in [
        ("workflows.so", "workflows.so", "https://workflows.so/", "workflows-so.html"),
        ("automationflows.io", "automationflows.io", "https://automationflows.io/", "automationflows.html"),
        ("n8ntemplates.me", "n8ntemplates.me", "https://n8ntemplates.me/", "n8ntemplates.html"),
        ("theautomation.directory", "theautomation.directory", "https://theautomation.directory/", "theautomation.html"),
        ("automationscookbook.com", "automationscookbook.com", "https://automationscookbook.com/", "automationscookbook.html"),
        ("arahi.ai-marketplace", "arahi.ai/marketplace", "https://arahi.ai/marketplace", "arahi.html"),
        ("beam.ai-agents", "beam.ai/agents", "https://beam.ai/agents", "beam.html"),
    ]:
        ingest_listing_site(
            slug,
            title,
            home,
            [("pages/index.html", WEB / fname, home)],
            [],
            ["Public listing HTML snapshot."],
        )
    # diflowy site did not resolve
    root = REPO / "sources" / "diflowy.com"
    finish_site(
        root,
        "diflowy.com",
        "diflowy.com",
        [
            "Host did not resolve (NXDOMAIN). GitHub pack archived as sources/github/green-dalii-diflowy/.",
        ],
        ["Could not resolve host: diflowy.com"],
        site_rows("diflowy.com", "diflowy.com", "https://diflowy.com/"),
    )


def band_e_packs() -> None:
    for repo, dirname in E_PACKS:
        ingest_pack(repo, dirname)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--band",
        choices=["a", "b", "c-sites", "c-packs", "d", "e-sites", "e-packs", "all"],
        default="all",
    )
    args = ap.parse_args()
    fns = {
        "a": band_a,
        "b": band_b,
        "c-sites": band_c_sites,
        "c-packs": band_c_packs,
        "d": band_d,
        "e-sites": band_e_sites,
        "e-packs": band_e_packs,
    }
    if args.band == "all":
        for key in ("a", "b", "c-sites", "c-packs", "d", "e-sites", "e-packs"):
            print(f"===== band {key} =====", flush=True)
            fns[key]()
    else:
        fns[args.band]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

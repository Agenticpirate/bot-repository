#!/usr/bin/env python3
"""Batch 4: Claude skill registries, MCP indexes, OpenClaw/SOUL galleries.

Does not delete other catalog rows. Skips sources/ trees that already have INDEX.md.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    fetch_ok,
    http_get,
    sitemap_locs,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)

UA_NOTE = utc_now()
GH = REPO / "sources" / "github"
TMP = Path("/tmp/gh-b4")

GITHUB_PACKS = [
    "jeremylongshore/tons-of-skills-marketplace",
    "junovale99/claude-skills-directory",
    "FlorianBruniaux/claude-code-plugins",
    "L3DigitalNet/Claude-Code-Plugins",
    "dmgrok/agent_skills_directory",
    "wookat/mcp-index",
    "microsoft/skills",
    "android/skills",
    "VoltAgent/awesome-openclaw-skills",
    "clawsouls/clawsouls",
    "reisierx/famous-souls",
    "tumf/greats-soul-archive",
    "Anil-matcha/awesome-grok-bot",
    "CrewForm/crewform",
    "NirDiamant/awesome-LangGraph",
    "gengirish/skills-mcp",
    "adarc8/skills-master-mcp",
    "gotalab/skillport",
    "GetSkill-Agent/getskill-mcp",
    "team-telnyx/ai",
]


def copy_clone(repo: str) -> Path | None:
    dest = GH / repo.replace("/", "-")
    if (dest / "INDEX.md").exists():
        return dest
    src = TMP / repo.replace("/", "-")
    if not src.is_dir():
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", "--single-branch", f"https://github.com/{repo}.git", str(src)],
                check=False,
                timeout=180,
                capture_output=True,
            )
        except Exception:
            return None
    if not src.is_dir():
        return None
    dest.mkdir(parents=True, exist_ok=True)
    for path in src.rglob("*"):
        if ".git" in path.parts or not path.is_file():
            continue
        rel = path.relative_to(src)
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copy2(path, target)
        except OSError:
            continue
    n = sum(1 for _ in dest.rglob("*") if _.is_file())
    write_index(
        dest,
        repo,
        [f"Shallow clone of https://github.com/{repo}. `.git` stripped. Files: {n}. Archived {UA_NOTE}."],
    )
    write_text(dest / "ERRORS.md", f"# {repo}\n\nNone.\n")
    return dest


def github_rows(repo: str, dest: Path) -> list[dict]:
    rows = [
        {
            "id": f"github/{dest.name}",
            "title": repo,
            "url": f"https://github.com/{repo}",
            "source": f"github/{dest.name}",
            "type": "repo",
        }
    ]
    for skill in list(dest.rglob("SKILL.md"))[:400]:
        rel = skill.relative_to(dest).as_posix()
        rows.append(
            {
                "id": f"github/{dest.name}/{rel}",
                "title": skill.parent.name,
                "url": f"https://github.com/{repo}/blob/HEAD/{rel}",
                "source": f"github/{dest.name}",
                "type": "skill",
            }
        )
    return rows


def ingest_skillsmp() -> int:
    root = REPO / "sources" / "skillsmp.com"
    if (root / "INDEX.md").exists() and (root / "meta" / "skills-popular-locs.json").exists():
        print("skillsmp already indexed", flush=True)
        return 0
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    errors = []
    for url, dest in (
        ("https://skillsmp.com/", pages / "home.html"),
        ("https://skillsmp.com/llms.txt", root / "llms.txt"),
        ("https://skillsmp.com/openapi.json", meta / "openapi.json"),
        ("https://skillsmp.com/api/v1/", meta / "api-root.json"),
        ("https://skillsmp.com/developers", pages / "developers.html"),
        ("https://skillsmp.com/sitemap.xml", meta / "sitemap.xml"),
        ("https://skillsmp.com/sitemaps/skills-popular.xml", meta / "skills-popular.xml"),
        ("https://skillsmp.com/sitemaps/skills-discovered.xml", meta / "skills-discovered.xml"),
        ("https://skillsmp.com/sitemaps/pages.xml", meta / "pages.xml"),
    ):
        if not fetch_ok(url, dest):
            errors.append(f"{url} failed")

    popular = sitemap_locs((meta / "skills-popular.xml").read_bytes()) if (meta / "skills-popular.xml").exists() else []
    discovered = sitemap_locs((meta / "skills-discovered.xml").read_bytes()) if (meta / "skills-discovered.xml").exists() else []
    write_json(meta / "skills-popular-locs.json", popular)
    write_json(meta / "skills-discovered-locs.json", discovered)

    queries = [
        "claude",
        "cowork",
        "mcp",
        "skill",
        "agent",
        "code",
        "anthropic",
        "plugin",
        "workflow",
        "openclaw",
    ]
    seen: dict[str, dict] = {}
    for q in queries:
        for page in range(1, 6):
            url = "https://skillsmp.com/api/v1/skills/search?" + urllib.parse.urlencode(
                {"q": q, "page": page, "limit": 50}
            )
            st, body, _ = http_get(url, accept="application/json")
            dest = meta / "search" / f"{q}-p{page}.json"
            write_bytes(dest, body or b"")
            if st != 200:
                errors.append(f"search {q} p{page} HTTP {st}")
                break
            try:
                data = json.loads(body.decode("utf-8"))
            except json.JSONDecodeError:
                break
            skills = ((data.get("data") or {}).get("skills")) or []
            for sk in skills:
                sid = str(sk.get("id") or "")
                if sid:
                    seen[sid] = sk
            pag = (data.get("data") or {}).get("pagination") or {}
            if not pag.get("hasNext") or not skills:
                break
            time.sleep(0.15)

    write_json(meta / "search-unique.json", {"count": len(seen), "items": list(seen.values())})

    # sample skill pages from popular
    sample = popular[:40]
    for loc in sample:
        slug = loc.rstrip("/").split("/creators/", 1)[-1].replace("/", "--")
        fetch_ok(loc, pages / "creators" / f"{slug}.html")

    rows = [
        {
            "id": "skillsmp.com",
            "title": "SkillsMP",
            "url": "https://skillsmp.com/",
            "source": "skillsmp.com",
            "type": "site",
        }
    ]
    for loc in popular:
        parts = loc.rstrip("/").split("/creators/", 1)
        title = parts[-1] if len(parts) == 2 else loc
        rows.append(
            {
                "id": f"skillsmp:{title}",
                "title": title.split("/")[-1],
                "url": loc,
                "source": "skillsmp.com",
                "type": "skill",
            }
        )
    for sid, sk in seen.items():
        url = sk.get("skillUrl") or f"https://skillsmp.com/"
        if any(r.get("url") == url for r in rows):
            continue
        rows.append(
            {
                "id": f"skillsmp:{sid}",
                "title": sk.get("name") or sid,
                "url": url,
                "source": "skillsmp.com",
                "type": "skill",
                "githubUrl": sk.get("githubUrl"),
                "stars": sk.get("stars"),
                "updatedAt": sk.get("updatedAt"),
            }
        )
    upsert_catalog("skillsmp.com", rows)
    write_index(
        root,
        "skillsmp.com",
        [
            f"SkillsMP public API + sitemaps. Refreshed {UA_NOTE}.",
            f"Popular sitemap skill URLs: **{len(popular)}**. Discovered sitemap: **{len(discovered)}**.",
            f"Search API unique skills across {len(queries)} queries: **{len(seen)}** (unauthenticated search is capped; `totalIsExact=false`).",
            "Saved `openapi.json`, `llms.txt`, API root, search pages, and 40 sample creator HTML pages.",
            "Search requires `q`. No unauthenticated full dump.",
        ],
    )
    write_text(root / "ERRORS.md", "# skillsmp.com\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.") + "\n")
    return len(rows)


def snapshot_site(slug: str, title: str, urls: list[tuple[str, str]]) -> int:
    root = REPO / "sources" / slug
    if (root / "INDEX.md").exists():
        print("skip", slug, flush=True)
        return 0
    pages = root / "pages"
    pages.mkdir(parents=True, exist_ok=True)
    errors = []
    ok = 0
    rows = [{"id": slug, "title": title, "url": urls[0][0], "source": slug, "type": "site"}]
    for url, name in urls:
        dest = pages / name
        if fetch_ok(url, dest):
            ok += 1
            rows.append({"id": f"{slug}:{name}", "title": name, "url": url, "source": slug, "type": "page"})
        else:
            errors.append(f"{url} failed")
    upsert_catalog(slug, rows)
    write_index(root, title, [f"Public page snapshot. {ok}/{len(urls)} fetched. Archived {UA_NOTE}."])
    write_text(root / "ERRORS.md", f"# {slug}\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.") + "\n")
    return len(rows)


def main() -> int:
    print("=== skillsmp ===", flush=True)
    n_mp = ingest_skillsmp()
    print("skillsmp rows", n_mp, flush=True)

    print("=== other registries ===", flush=True)
    snapshot_site(
        "agent37.com",
        "Agent37",
        [
            ("https://www.agent37.com/skills", "skills.html"),
            ("https://www.agent37.com/docs", "docs.html"),
            ("https://api.agent37.com/", "api-root.json"),
        ],
    )
    snapshot_site("agentskills.codes", "AgentSkills.codes", [("https://agentskills.codes/", "home.html")])
    snapshot_site("awesomeagentskills.dev", "Awesome Agent Skills", [("https://awesomeagentskills.dev/", "home.html")])
    snapshot_site("skillkit.io", "Skillkit", [("https://skillkit.io/", "home.html")])
    snapshot_site(
        "skillsclaude.org",
        "SkillsClaude",
        [("https://skillsclaude.org/skills", "skills.html"), ("https://skillsclaude.org/", "home.html")],
    )
    snapshot_site("tonsofskills.com", "Tons of Skills", [("https://tonsofskills.com/", "home.html")])
    snapshot_site("openclawskills.io", "OpenClaw Skills", [("https://openclawskills.io/skills", "skills.html")])
    snapshot_site("souls.directory", "souls.directory", [("https://souls.directory/", "home.html")])
    snapshot_site(
        "openclawcheatsheet.com",
        "OpenClaw Cheatsheet",
        [("https://openclawcheatsheet.com/gallery", "gallery.html"), ("https://openclawcheatsheet.com/", "home.html")],
    )
    snapshot_site("mcp.directory", "MCP Directory", [("https://mcp.directory/", "home.html")])
    snapshot_site("botteams.ai", "botteams.ai", [("https://botteams.ai/", "home.html")])
    snapshot_site(
        "agentmarketplace.ai",
        "Agent Marketplace",
        [("https://agentmarketplace.ai/browse", "browse.html"), ("https://agentmarketplace.ai/", "home.html")],
    )
    snapshot_site("agenticskills.io", "Agentic Skills", [("https://agenticskills.io/", "home.html")])
    snapshot_site("skillsplayground.com", "Skills Playground", [("https://skillsplayground.com/", "home.html")])
    snapshot_site(
        "agentdepot.dev",
        "Agent Depot",
        [("https://agentdepot.dev/claude-code", "claude-code.html"), ("https://agentdepot.dev/", "home.html")],
    )

    print("=== github packs ===", flush=True)
    for repo in GITHUB_PACKS:
        dest = copy_clone(repo)
        print(f"  {repo} -> {dest}", flush=True)
        if dest and dest.is_dir():
            upsert_catalog(f"github/{dest.name}", github_rows(repo, dest))

    print("batch4 done", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

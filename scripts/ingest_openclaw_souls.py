#!/usr/bin/env python3
"""Archive / deepen OpenClaw + SOUL galleries that are public.

Skips GitHub packs that already have INDEX.md. Does not delete other catalog rows.
clawhub.com is the same app as clawhub.ai (noted, not duplicated).
"""

from __future__ import annotations

import json
import re
import shutil
import sys
import urllib.parse
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    fetch_many,
    fetch_ok,
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
from ingest_priority_b import get_json  # noqa: E402
from fast_secondary import download_souls  # noqa: E402

NOW = utc_now()
TMP = Path("/tmp/gh-openclaw")
GH = REPO / "sources" / "github"


def already(dest: Path) -> bool:
    return dest.exists() and (dest / "INDEX.md").exists()


def copy_tree(src: Path, dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns(".git", "node_modules", ".next"))
    leftover = dest / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)
    return sum(1 for p in dest.rglob("*") if p.is_file())


def install_pack(repo: str, dirname: str, src: Path, extra: list[str] | None = None) -> int:
    dest = GH / dirname
    if already(dest):
        print(f"skip existing github/{dirname}", flush=True)
        return 0
    if not src.is_dir():
        print(f"MISSING {src}", flush=True)
        return 0
    n = copy_tree(src, dest)
    rows = pack_rows(dirname, repo, dest, "HEAD")
    lines = [
        f"Shallow clone of https://github.com/{repo}. `.git` stripped. Files: {n}. Archived {NOW}."
    ]
    if extra:
        lines.extend(extra)
    write_index(dest, repo, lines)
    write_text(dest / "ERRORS.md", f"# {repo}\n\nNone.\n")
    upsert_catalog(f"github/{dirname}", rows)
    print(f"pack {dirname} files={n} rows={len(rows)}", flush=True)
    return len(rows)


def slug_path(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return path or "index"


def deepen_clawhub() -> None:
    root = REPO / "sources" / "clawhub.ai"
    meta = root / "meta"
    pages = root / "pages"
    files_root = root / "skills"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    files_root.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    fetch_ok("https://clawhub.ai/llms.txt", meta / "llms.txt")
    fetch_ok("https://clawhub.ai/api/v1/openapi.json", meta / "openapi.json")
    fetch_ok("https://clawhub.ai/", pages / "homepage.html")
    fetch_ok("https://clawhub.com/", pages / "clawhub.com-home.html")
    fetch_ok("https://clawhub.ai/skills", pages / "skills.html")

    # resume cursor pagination
    skill_dir = meta / "skills"
    existing_pages = sorted(skill_dir.glob("page-*.json"))
    cursor = None
    start_i = 0
    if existing_pages:
        last = json.loads(existing_pages[-1].read_text(encoding="utf-8"))
        cursor = last.get("nextCursor")
        start_i = len(existing_pages)
    skills: list[dict] = []
    seen: set[str] = set()
    for path in existing_pages:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        for it in data.get("items") or []:
            slug = it.get("slug") or it.get("name")
            if slug and slug not in seen:
                seen.add(slug)
                skills.append(it)

    i = start_i
    while cursor and i < start_i + 400:
        url = "https://clawhub.ai/api/v1/skills?limit=50&cursor=" + urllib.parse.quote(str(cursor))
        dest = skill_dir / f"page-{i:03d}.json"
        st, data = get_json(url)
        if st != 200 or not isinstance(data, dict):
            errors.append(f"skills page {i} HTTP {st}")
            break
        write_json(dest, data)
        chunk = data.get("items") or []
        added = 0
        for it in chunk:
            slug = it.get("slug") or it.get("name")
            if slug and slug not in seen:
                seen.add(slug)
                skills.append(it)
                added += 1
        cursor = data.get("nextCursor")
        print(f"  clawhub skills page={i} +{added} total={len(skills)} next={bool(cursor)}", flush=True)
        if not chunk:
            break
        i += 1

    write_json(meta / "skills.json", {"count": len(skills), "items": skills})

    # SKILL.md bodies
    jobs: list[tuple[str, Path]] = []
    for it in skills:
        slug = it.get("slug") or it.get("name")
        if not slug:
            continue
        dest = files_root / slug / "SKILL.md"
        if dest.exists() and dest.stat().st_size > 20:
            continue
        url = f"https://clawhub.ai/api/v1/skills/{urllib.parse.quote(str(slug))}/file?path=SKILL.md"
        jobs.append((url, dest))
    ok, fail = fetch_many(jobs, workers=16)
    if fail:
        errors.append(f"{fail}/{len(jobs)} SKILL.md downloads failed")
    n_md = sum(1 for p in files_root.rglob("SKILL.md") if p.stat().st_size > 20)

    rows = [
        {
            "id": "clawhub.ai",
            "title": "ClawHub",
            "url": "https://clawhub.ai/",
            "source": "clawhub.ai",
            "type": "site",
            "skills": len(skills),
            "skill_md": n_md,
            "alias": "https://clawhub.com/",
        }
    ]
    for it in skills:
        slug = it.get("slug") or it.get("name")
        if not slug:
            continue
        rows.append(
            {
                "id": f"skill/{slug}",
                "title": it.get("displayName") or str(slug),
                "url": f"https://clawhub.ai/skills/{slug}",
                "source": "clawhub.ai",
                "type": "skill",
                "has_skill_md": (files_root / slug / "SKILL.md").is_file(),
                "summary": it.get("summary"),
            }
        )
    upsert_catalog("clawhub.ai", rows)
    write_index(
        root,
        "clawhub.ai",
        [
            f"OpenClaw official skills registry. Refreshed {NOW}.",
            "- clawhub.com serves the same app (homepage snapshot saved; not a second catalog).",
            f"- `/api/v1/skills` unique slugs: **{len(skills)}**",
            f"- SKILL.md via `/api/v1/skills/{{slug}}/file?path=SKILL.md`: **{n_md}** (ok={ok} fail={fail})",
            "- Zip download exists at `/api/v1/download?slug=` (not bulk-fetched; markdown preferred).",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# clawhub.ai\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    print(f"clawhub skills={len(skills)} skill_md={n_md}", flush=True)


def ingest_openclaw_au() -> None:
    root = REPO / "sources" / "openclaw.com.au"
    if already(root) and (root / "meta" / "sitemap.xml").exists():
        print("openclaw.com.au already indexed", flush=True)
        return
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    errors = []
    for url, dest in (
        ("https://openclaw.com.au/sitemap.xml", meta / "sitemap.xml"),
        ("https://openclaw.com.au/skills", pages / "skills.html"),
        ("https://openclaw.com.au/", pages / "home.html"),
    ):
        if not fetch_ok(url, dest):
            errors.append(f"{url} failed")
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    write_json(meta / "sitemap-locs.json", locs)
    jobs = [(u, pages / f"{slug_path(u).replace('/', '__') or 'index'}.html") for u in locs]
    ok, fail = fetch_many(jobs, workers=8)
    rows = [
        {
            "id": "openclaw.com.au",
            "title": "OpenClaw Australia skills directory",
            "url": "https://openclaw.com.au/skills",
            "source": "openclaw.com.au",
            "type": "site",
            "sitemap_urls": len(locs),
        }
    ]
    for url in locs:
        dest = pages / f"{slug_path(url).replace('/', '__') or 'index'}.html"
        title = title_from_html(dest.read_bytes()) if dest.exists() else slug_path(url)
        rows.append(
            {
                "id": f"openclaw.com.au/{slug_path(url)}",
                "title": title or slug_path(url),
                "url": url,
                "source": "openclaw.com.au",
                "type": "page",
            }
        )
    write_index(
        root,
        "openclaw.com.au",
        [
            "OpenClaw skills / docs directory (Australia).",
            f"- Last updated: {NOW}",
            f"- Sitemap URLs: **{len(locs)}** (HTML ok={ok} fail={fail})",
            "- No public JSON/API; `/api/skills` 404. Guide pages only, not per-skill bodies.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# openclaw.com.au\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("openclaw.com.au", rows)
    print(f"openclaw.com.au rows={len(rows)}", flush=True)


def ingest_soulid() -> None:
    root = REPO / "sources" / "agent.soulid.io"
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    if not fetch_ok("https://agent.soulid.io/", pages / "home.html"):
        write_text(root / "ERRORS.md", "# agent.soulid.io\n\nHomepage failed.\n")
        return
    html = (pages / "home.html").read_text(encoding="utf-8", errors="replace")
    hrefs = sorted(set(re.findall(r'href="(/agents/[^"]+)"', html)))
    write_json(meta / "agent-hrefs.json", hrefs)
    jobs = []
    for href in hrefs:
        rel = href.strip("/").replace("/", "__")
        jobs.append((f"https://agent.soulid.io{href}", pages / f"{rel}.html"))
    ok, fail = fetch_many(jobs, workers=12)
    rows = [
        {
            "id": "agent.soulid.io",
            "title": "SoulID agent marketplace",
            "url": "https://agent.soulid.io/",
            "source": "agent.soulid.io",
            "type": "site",
            "agents": len(hrefs),
        }
    ]
    for href in hrefs:
        dest = pages / f"{href.strip('/').replace('/', '__')}.html"
        title = title_from_html(dest.read_bytes()) if dest.exists() else href.rsplit("/", 1)[-1]
        rows.append(
            {
                "id": f"agent.soulid.io{href}",
                "title": title or href.rsplit("/", 1)[-1],
                "url": f"https://agent.soulid.io{href}",
                "source": "agent.soulid.io",
                "type": "agent",
            }
        )
    write_index(
        root,
        "agent.soulid.io",
        [
            "SoulID public agent marketplace.",
            f"- Last updated: {NOW}",
            f"- Agent hrefs on homepage: **{len(hrefs)}** (HTML ok={ok} fail={fail})",
            "- No public JSON/API (`/api/agents` 404). Related pack: cerealskill/openclaw-agents (SOUL.md).",
        ],
    )
    write_text(
        root / "ERRORS.md",
        f"# agent.soulid.io\n\nNo public JSON. HTML fail={fail}. kriptoburak/open-agent-marketplace is not a public GitHub repo.\n",
    )
    upsert_catalog("agent.soulid.io", rows)
    print(f"soulid agents={len(hrefs)} ok={ok}", flush=True)


def deepen_clawskills() -> None:
    root = REPO / "sources" / "clawskills.sh"
    meta = root / "meta"
    pages = root / "pages"
    hrefs_path = meta / "skill-hrefs.json"
    if not hrefs_path.exists():
        print("clawskills hrefs missing", flush=True)
        return
    hrefs = json.loads(hrefs_path.read_text(encoding="utf-8"))
    jobs = []
    for href in hrefs:
        rel = href.strip("/").replace("/", "__") or "index"
        dest = pages / f"{rel}.html"
        if dest.exists() and dest.stat().st_size > 200:
            continue
        jobs.append((f"https://clawskills.sh{href}", dest))
    ok, fail = fetch_many(jobs, workers=16) if jobs else (0, 0)
    n_pages = sum(1 for p in pages.glob("skills__*.html") if p.stat().st_size > 200)
    write_index(
        root,
        "clawskills.sh",
        [
            "OpenClaw skill gallery.",
            f"- Last updated: {NOW}",
            f"- Skill hrefs: **{len(hrefs)}**; skill HTML on disk: **{n_pages}** (this pass attempted {len(jobs)} ok={ok} fail={fail})",
            "- No public JSON dump.",
        ],
    )
    print(f"clawskills remaining fetch jobs={len(jobs)} ok={ok} fail={fail} on_disk={n_pages}", flush=True)


def note_kriptoburak() -> None:
    root = REPO / "sources" / "kriptoburak-open-agent-marketplace"
    if already(root):
        return
    write_index(
        root,
        "kriptoburak/open-agent-marketplace",
        [
            f"Probe {NOW}.",
            "- https://github.com/kriptoburak/open-agent-marketplace → **404** (user/repo not public).",
            "- GitHub user `kriptoburak` 404.",
            "- Already-archived related pack: `sources/github/contentincubator2-ops-open-agent-marketplace/`.",
        ],
    )
    write_text(root / "ERRORS.md", "# kriptoburak/open-agent-marketplace\n\nGitHub 404; not archived.\n")
    upsert_catalog(
        "kriptoburak-open-agent-marketplace",
        [
            {
                "id": "kriptoburak-open-agent-marketplace",
                "title": "kriptoburak/open-agent-marketplace",
                "url": "https://github.com/kriptoburak/open-agent-marketplace",
                "source": "kriptoburak-open-agent-marketplace",
                "type": "miss",
                "http": 404,
            }
        ],
    )


def main() -> int:
    print(f"ingest_openclaw_souls start {NOW}", flush=True)
    deepen_clawhub()
    ingest_openclaw_au()
    ingest_soulid()

    install_pack(
        "cerealskill/openclaw-agents",
        "cerealskill-openclaw-agents",
        TMP / "cerealskill-openclaw-agents",
        ["527 SOUL.md + 522 IDENTITY.md agent bundles."],
    )
    install_pack(
        "thedaviddias/souls-directory",
        "thedaviddias-souls-directory",
        TMP / "thedaviddias-souls-directory",
        ["Source repo for souls.directory."],
    )
    install_pack(
        "raulvidis/openclaw-multi-agent-kit",
        "raulvidis-openclaw-multi-agent-kit",
        TMP / "raulvidis-openclaw-multi-agent-kit",
        ["SOUL/IDENTITY/skill templates."],
    )
    install_pack(
        "Humain-Cloud/HumAIn-Uno",
        "Humain-Cloud-HumAIn-Uno",
        TMP / "Humain-Cloud-HumAIn-Uno",
        ["Product + TypeScript seed-agents scripts (no separate public JSON dump)."],
    )
    note_kriptoburak()

    print("souls.directory leftover pass", flush=True)
    download_souls()
    deepen_clawskills()
    print("ingest_openclaw_souls done", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

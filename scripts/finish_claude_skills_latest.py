#!/usr/bin/env python3
"""Finish claude-skills-latest after Skillselion pagination is already on disk.

Reuses sources/skills.sh and maintained GitHub packs. Clones unique GitHub
repos for createdAt-recent + hot/trending/SOTD so most true-latest skills get
SKILL.md without burning the skills.sh 60/hour download API.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import urllib.parse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
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
from archive_claude_skills_latest import (  # noqa: E402
    CUTOFF,
    EXISTING_SH,
    META,
    PAGES,
    ROOT,
    SKILLS,
    copy_tree_files,
    has_content,
    parse_dt,
    parse_skill_id,
    write_from_markdown,
)

CLONE_ROOT = Path("/tmp/latest-skill-clones")
PRIORITY_REPOS = {
    "anthropics/skills",
    "alirezarezvani/claude-skills",
    "obra/superpowers",
    "davila7/claude-code-templates",
    "ComposioHQ/awesome-claude-skills",
}
MAINTAINED_PACKS = [
    ("anthropics/skills", REPO / "sources" / "github" / "anthropics-skills"),
    ("alirezarezvani/claude-skills", REPO / "sources" / "github" / "alirezarezvani-claude-skills"),
    ("obra/superpowers", REPO / "sources" / "github" / "obra-superpowers"),
    ("davila7/claude-code-templates", REPO / "sources" / "github" / "davila7-claude-code-templates"),
    ("ComposioHQ/awesome-claude-skills", REPO / "sources" / "github" / "ComposioHQ-awesome-claude-skills"),
]


def prefer_skill_mds(root: Path) -> list[Path]:
    found = [p for p in root.rglob("SKILL.md") if p.is_file()]
    found.sort(
        key=lambda p: (
            any(part.startswith(".") for part in p.relative_to(root).parts),
            len(p.relative_to(root).as_posix()),
        )
    )
    return found


def write_skill_from_dir(dest: Path, src_dir: Path, via: str, extra: dict | None = None) -> bool:
    skill_md = src_dir / "SKILL.md"
    if not skill_md.is_file():
        return False
    dest.mkdir(parents=True, exist_ok=True)
    n = copy_tree_files(src_dir, dest / "files")
    meta = {
        "download_ok": True,
        "via": via,
        "files": n,
        "fetched_at": utc_now(),
    }
    if extra:
        meta.update(extra)
    write_json(dest / "meta.json", meta)
    return True


def copy_from_skills_sh(owner: str, repo: str, slug: str) -> bool:
    dest = SKILLS / owner / repo / slug
    if has_content(owner, repo, slug):
        return True
    src = EXISTING_SH / owner / repo / slug
    if not src.exists():
        return False
    if already_downloaded(src) or (src / "files" / "SKILL.md").exists():
        dest.mkdir(parents=True, exist_ok=True)
        files_src = src / "files"
        if files_src.exists():
            copy_tree_files(files_src, dest / "files")
        if (src / "meta.json").exists():
            shutil.copy2(src / "meta.json", dest / "meta.json")
        return has_content(owner, repo, slug)
    return False


def github_pack_dir(owner: str, repo: str) -> Path | None:
    candidates = [
        REPO / "sources" / "github" / f"{owner}-{repo}",
        REPO / "sources" / "github" / f"{owner}-{repo.replace('/', '-')}",
    ]
    for p in candidates:
        if p.is_dir():
            return p
    return None


def extract_slug_from_pack(root: Path, slug: str) -> Path | None:
    matches = [p.parent for p in prefer_skill_mds(root) if p.parent.name == slug]
    return matches[0] if matches else None


def copy_maintained() -> list[dict]:
    rows = []
    seen_ids = set()
    ali = REPO / "sources" / "github" / "alirezarezvani-claude-skills"
    if ali.is_dir() and not (ali / "INDEX.md").exists():
        n_md = sum(1 for _ in ali.rglob("SKILL.md"))
        write_index(
            ali,
            "alirezarezvani/claude-skills",
            [
                f"Shallow clone of https://github.com/alirezarezvani/claude-skills. `.git` stripped. Archived {utc_now()}.",
                f"SKILL.md files found: {n_md} (includes agent-runtime copies under `.codex` / `.vibe` / `.hermes`).",
                "Broken symlinks skipped during copy.",
            ],
        )
        write_text(ali / "ERRORS.md", "# alirezarezvani/claude-skills\n\nBroken symlink `.codex/skills/dsh-deepread` skipped during copy.\n")

    for repo, src_root in MAINTAINED_PACKS:
        if not src_root.is_dir():
            print(f"missing maintained {repo}", flush=True)
            continue
        owner, rname = repo.split("/", 1)
        copied = 0
        for skill_md in prefer_skill_mds(src_root):
            slug = skill_md.parent.name
            dest = SKILLS / owner / rname / slug
            sid = f"repo:{repo}#{slug}"
            if sid in seen_ids:
                continue
            if not (dest / "files" / "SKILL.md").exists():
                write_skill_from_dir(dest, skill_md.parent, f"github/{src_root.name}", {"repo": repo, "slug": slug})
                copied += 1
            seen_ids.add(sid)
            rows.append(
                {
                    "id": sid,
                    "owner": owner,
                    "repo": rname,
                    "slug": slug,
                    "via": f"github/{src_root.name}",
                    "title": first_heading(skill_md) or slug,
                }
            )
        print(f"maintained {repo} unique_slugs={len([r for r in rows if r['id'].startswith('repo:'+repo)])} new={copied}", flush=True)
    write_json(META / "maintained-repos.json", rows)
    return rows


def clone_one(owner: str, repo: str) -> tuple[str, Path | None, str]:
    dest = CLONE_ROOT / f"{owner}--{repo.replace('/', '--')}"
    if dest.is_dir() and any(dest.rglob("SKILL.md")):
        return f"{owner}/{repo}", dest, "exists"
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)
    dest.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://github.com/{owner}/{repo}.git"
    try:
        proc = subprocess.run(
            ["git", "clone", "--depth", "1", "--single-branch", url, str(dest)],
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired:
        shutil.rmtree(dest, ignore_errors=True)
        return f"{owner}/{repo}", None, "timeout"
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(dest, ignore_errors=True)
        return f"{owner}/{repo}", None, str(exc)
    if proc.returncode != 0:
        shutil.rmtree(dest, ignore_errors=True)
        err = (proc.stderr or proc.stdout or "clone failed").strip().splitlines()
        return f"{owner}/{repo}", None, err[-1] if err else "clone failed"
    git_dir = dest / ".git"
    if git_dir.exists():
        shutil.rmtree(git_dir, ignore_errors=True)
    return f"{owner}/{repo}", dest, "ok"


def skill_yaml_name(skill_md: Path) -> str | None:
    try:
        text = skill_md.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    block = text[3:end] if end != -1 else text[3:400]
    for line in block.splitlines():
        if line.lower().startswith("name:"):
            return line.split(":", 1)[1].strip().strip("\"'")
    return None


def match_parent(by_slug: dict[str, Path], by_name: dict[str, Path], slug: str) -> Path | None:
    if slug in by_slug:
        return by_slug[slug]
    if slug in by_name:
        return by_name[slug]
    norm = slug.replace("_", "-").lower()
    for key, parent in by_slug.items():
        if key.replace("_", "-").lower() == norm:
            return parent
    for key, parent in by_name.items():
        if key.replace("_", "-").lower() == norm:
            return parent
    # unique substring match
    hits = [p for k, p in by_slug.items() if norm in k.replace("_", "-").lower() or k.replace("_", "-").lower() in norm]
    if len(hits) == 1:
        return hits[0]
    return None


def fill_from_repo_dir(owner: str, repo: str, src: Path, slugs: set[str]) -> int:
    n = 0
    by_slug: dict[str, Path] = {}
    by_name: dict[str, Path] = {}
    for skill_md in prefer_skill_mds(src):
        folder = skill_md.parent.name
        by_slug.setdefault(folder, skill_md.parent)
        yname = skill_yaml_name(skill_md)
        if yname:
            by_name.setdefault(yname, skill_md.parent)
        # always vendor the on-disk folder name
        dest = SKILLS / owner / repo / folder
        if not (dest / "files" / "SKILL.md").exists():
            if write_skill_from_dir(
                dest,
                skill_md.parent,
                "github-clone",
                {"repo": f"{owner}/{repo}", "slug": folder},
            ):
                n += 1
    for slug in slugs:
        if has_content(owner, repo, slug):
            continue
        parent = match_parent(by_slug, by_name, slug)
        if parent is None:
            continue
        if write_skill_from_dir(
            SKILLS / owner / repo / slug,
            parent,
            "github-clone",
            {"repo": f"{owner}/{repo}", "slug": slug, "matched_dir": parent.name},
        ):
            n += 1
    return n


def download_api(owner: str, repo: str, slug: str, budget: HourlyBudget) -> str:
    dest = SKILLS / owner / repo / slug
    if has_content(owner, repo, slug):
        return "exists"
    if not budget.allow():
        return "budget"
    enc = "/".join(urllib.parse.quote(part, safe="-_.~") for part in (owner, repo, slug))
    url = f"https://skills.sh/api/download/{enc}"
    try:
        status, body, _ = http_get_download(url, budget)
    except Exception as exc:  # noqa: BLE001
        dest.mkdir(parents=True, exist_ok=True)
        write_json(dest / "meta.json", {"download_ok": False, "error": str(exc), "url": url, "fetched_at": utc_now()})
        return "fail"
    if status == 429:
        write_json(dest / "meta.json", {"download_ok": False, "error": "HTTP 429", "url": url, "fetched_at": utc_now()})
        return "rate"
    if status != 200:
        dest.mkdir(parents=True, exist_ok=True)
        write_json(dest / "meta.json", {"download_ok": False, "error": f"HTTP {status}", "url": url, "fetched_at": utc_now()})
        return "fail"
    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        dest.mkdir(parents=True, exist_ok=True)
        write_json(dest / "meta.json", {"download_ok": False, "error": "bad_json", "url": url, "fetched_at": utc_now()})
        return "fail"
    files = payload.get("files") or []
    if not files:
        dest.mkdir(parents=True, exist_ok=True)
        write_json(dest / "meta.json", {"download_ok": False, "error": "empty_files", "url": url, "fetched_at": utc_now()})
        return "fail"
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
    return "ok"


def fetch_sotd_skill_pages(sotd: list[dict]) -> list[str]:
    slugs = []
    for rec in sotd:
        title = rec.get("title") or ""
        m = re.search(r"Skill of the Day — ([^·(]+)", title)
        if m:
            slugs.append(m.group(1).strip())
        for ref in rec.get("refs") or []:
            if ref.startswith("claudskills.com/skills/"):
                slugs.append(ref.split("/")[-1])
    slugs = sorted({s for s in slugs if s and "." not in s and s not in {"feed.xml"}})
    dest_dir = PAGES / "claudskills-skills"
    dest_dir.mkdir(parents=True, exist_ok=True)
    for slug in slugs:
        url = f"https://claudskills.com/skills/{slug}"
        dest = dest_dir / f"{slug}.html"
        if dest.exists() and dest.stat().st_size > 0:
            continue
        st, body, _ = http_get(url)
        if st == 200 and body:
            write_bytes(dest, body)
    write_json(META / "sotd-skill-pages.json", slugs)
    return slugs


def snapshot_plugins() -> None:
    plugins_src = REPO / "sources" / "claude.com-plugins" / "pages" / "plugins.html"
    if plugins_src.exists():
        shutil.copy2(plugins_src, META / "claude-com-plugins.html")
    else:
        st, body, _ = http_get("https://claude.com/plugins")
        write_bytes(META / "claude-com-plugins.html", body or b"")
    for url in (
        "https://api.claude-plugins.dev/search?q=skill",
        "https://claude-plugins.dev/api/search?q=skill",
        "https://api.claude-plugins.dev/plugins?q=skill",
    ):
        st, body, _ = http_get(url)
        if st == 200 and body:
            write_bytes(META / "claude-plugins-dev-search.json", body)
            break
        write_json(META / "claude-plugins-dev-search.json", {"tried": url, "http": st})


def load_items() -> list[dict]:
    data = json.loads((META / "skillselion-recent.json").read_text(encoding="utf-8"))
    return data["items"]


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    META.mkdir(parents=True, exist_ok=True)
    SKILLS.mkdir(parents=True, exist_ok=True)
    PAGES.mkdir(parents=True, exist_ok=True)
    CLONE_ROOT.mkdir(parents=True, exist_ok=True)

    items = load_items()
    created_recent = [
        it
        for it in items
        if (parse_dt(it.get("createdAt")) or datetime.min.replace(tzinfo=timezone.utc)) >= CUTOFF
    ]
    write_json(META / "skillselion-created-recent.json", {"count": len(created_recent), "items": created_recent})

    hot = json.loads((META / "hot-paths.json").read_text()) if (META / "hot-paths.json").exists() else []
    trending = json.loads((META / "trending-paths.json").read_text()) if (META / "trending-paths.json").exists() else []
    sotd = json.loads((META / "sotd-index.json").read_text()) if (META / "sotd-index.json").exists() else []
    snapshot_plugins()
    sotd_slugs = fetch_sotd_skill_pages(sotd)

    maintained = copy_maintained()

    priority: dict[tuple[str, str, str], dict] = {}

    def add_key(owner: str, repo: str, slug: str, origin: str, item: dict | None = None) -> None:
        key = (owner, repo, slug)
        if key not in priority:
            priority[key] = {"origin": origin, "item": item or {}}
        elif origin == "createdAt":
            priority[key] = {"origin": origin, "item": item or priority[key]["item"]}

    for it in created_recent:
        parsed = parse_skill_id(str(it.get("id") or ""))
        if parsed:
            add_key(*parsed, "createdAt", it)
    for path in list(hot) + list(trending):
        segs = [p for p in str(path).strip("/").split("/") if p]
        if len(segs) >= 3:
            add_key(segs[0], segs[1], segs[-1], "hot-trending")
    for rec in sotd:
        title = rec.get("title") or ""
        m = re.search(r"Skill of the Day — ([^·(]+)", title)
        # SOTD pages often only have a slug, not owner/repo; skip unless path-like
        for ref in rec.get("refs") or []:
            segs = [p for p in str(ref).strip("/").split("/") if p]
            if len(segs) >= 3 and segs[0] not in {"claudskills.com", "www.claudskills.com"}:
                add_key(segs[0], segs[1], segs[-1], "sotd")

    reused = 0
    for owner, repo, slug in list(priority):
        if copy_from_skills_sh(owner, repo, slug):
            reused += 1
    # also reuse any skills.sh download that appears in the 60k list
    extra_reused = 0
    for it in items:
        parsed = parse_skill_id(str(it.get("id") or ""))
        if not parsed:
            continue
        owner, repo, slug = parsed
        if has_content(owner, repo, slug):
            continue
        if copy_from_skills_sh(owner, repo, slug):
            extra_reused += 1

    # existing github packs for priority keys
    pack_hits = 0
    repos_needed: dict[str, set[str]] = defaultdict(set)
    for (owner, repo, slug), _rec in priority.items():
        if has_content(owner, repo, slug):
            continue
        pack = github_pack_dir(owner, repo)
        if pack:
            parent = extract_slug_from_pack(pack, slug)
            if parent and write_skill_from_dir(
                SKILLS / owner / repo / slug,
                parent,
                f"github/{pack.name}",
                {"repo": f"{owner}/{repo}", "slug": slug},
            ):
                pack_hits += 1
                continue
        repos_needed[f"{owner}/{repo}"].add(slug)

    print(
        f"priority={len(priority)} reused_sh={reused} extra_sh={extra_reused} pack_hits={pack_hits} repos_to_clone={len(repos_needed)}",
        flush=True,
    )

    clone_ok = clone_fail = extracted = 0
    clone_errors = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {}
        for repo_id, slugs in repos_needed.items():
            owner, repo = repo_id.split("/", 1)
            futs[pool.submit(clone_one, owner, repo)] = (repo_id, slugs)
        for fut in as_completed(futs):
            repo_id, slugs = futs[fut]
            owner, repo = repo_id.split("/", 1)
            try:
                _rid, dest, status = fut.result()
            except Exception as exc:  # noqa: BLE001
                clone_fail += 1
                clone_errors.append(f"{repo_id}: {exc}")
                continue
            if dest is None:
                clone_fail += 1
                clone_errors.append(f"{repo_id}: {status}")
                continue
            clone_ok += 1
            extracted += fill_from_repo_dir(owner, repo, dest, slugs)
            if (clone_ok + clone_fail) % 25 == 0:
                print(f"  clones ok={clone_ok} fail={clone_fail} extracted={extracted}", flush=True)

    still = [(o, r, s) for (o, r, s) in priority if not has_content(o, r, s)]
    budget = HourlyBudget(10)
    api_ok = api_fail = api_skip = 0
    api_errors = []
    for owner, repo, slug in still:
        status = download_api(owner, repo, slug, budget)
        if status == "ok":
            api_ok += 1
        elif status == "exists":
            pass
        elif status in {"budget", "rate"}:
            api_skip += 1
            api_errors.append(f"{owner}/{repo}/{slug}: {status}")
        else:
            api_fail += 1
            api_errors.append(f"{owner}/{repo}/{slug}: {status}")

    # catalog: all Skillselion recent + extras
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
    seen_ids = {"claude-skills-latest"}
    downloaded = failed = 0
    for it in items:
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
        sid = str(it.get("id"))
        seen_ids.add(sid)
        rows.append(
            {
                "id": sid,
                "title": it.get("name") or it.get("title") or (slug or sid),
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
    for (owner, repo, slug), rec in priority.items():
        sid = f"skill:{owner}/{repo}#{slug}"
        if sid in seen_ids:
            continue
        content = has_content(owner, repo, slug)
        if content:
            downloaded += 1
        else:
            failed += 1
        seen_ids.add(sid)
        it = rec.get("item") or {}
        rows.append(
            {
                "id": sid,
                "title": it.get("name") or it.get("title") or slug,
                "url": f"https://skills.sh/{owner}/{repo}/{slug}",
                "source": "claude-skills-latest",
                "type": "skill",
                "createdAt": it.get("createdAt"),
                "updatedAt": it.get("updatedAt"),
                "installs": it.get("installs"),
                "has_content": content,
                "via": rec.get("origin"),
            }
        )
    for rec in maintained:
        sid = rec["id"]
        if sid in seen_ids:
            continue
        owner, repo, slug = rec["owner"], rec["repo"], rec["slug"]
        content = has_content(owner, repo, slug)
        seen_ids.add(sid)
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

    skill_md_count = sum(1 for _ in SKILLS.rglob("SKILL.md"))
    created_with = sum(
        1
        for it in created_recent
        if (p := parse_skill_id(str(it.get("id") or ""))) and has_content(*p)
    )
    priority_with = sum(1 for k in priority if has_content(*k))

    upsert_catalog("claude-skills-latest", rows)

    stats = {
        "refreshed_at": utc_now(),
        "window_start": "2026-07-14",
        "window_end": "2026-09-12",
        "recent_metadata_N": len(items),
        "createdAt_recent": len(created_recent),
        "createdAt_with_content": created_with,
        "priority_keys": len(priority),
        "priority_with_content": priority_with,
        "downloaded_M": downloaded,
        "failed_F": failed,
        "skill_md_files": skill_md_count,
        "reused_skills_sh": reused,
        "extra_reused_skills_sh": extra_reused,
        "github_pack_hits": pack_hits,
        "clones_ok": clone_ok,
        "clones_fail": clone_fail,
        "extracted_from_clones": extracted,
        "skills_sh_api_ok": api_ok,
        "skills_sh_api_fail": api_fail,
        "skills_sh_api_skipped": api_skip,
        "maintained_unique": len(maintained),
        "hot_paths": len(hot),
        "trending_paths": len(trending),
        "sotd_pages": len(sotd),
        "sotd_skill_pages": len(sotd_slugs),
        "catalog_rows": len(rows),
    }
    write_json(META / "stats.json", stats)
    write_index(
        ROOT,
        "Latest Claude skills (60-day window)",
        [
            f"Window: **2026-07-14 → 2026-09-12** (60 days ending 2026-09-12). Refreshed {utc_now()}.",
            f"Skillselion filter (`createdAt` **or** `updatedAt` ≥ 2026-07-14, `tool=claude_code`): **{len(items)}** metadata rows in `meta/skillselion-recent.json`.",
            f"`updatedAt` is a Skillselion reindex stamp (most rows 2026-09-05..07), so the OR-filter matches the entire live catalog. True `createdAt` in-window: **{len(created_recent)}** (`meta/skillselion-created-recent.json`).",
            f"Catalog rows with `has_content`: **{downloaded}**. Metadata-only / failed: **{failed}**. SKILL.md files on disk: **{skill_md_count}**.",
            f"Priority set (createdAt + skills.sh `/hot` + `/trending` + SOTD paths): **{len(priority)}** keys, **{priority_with}** with files. createdAt-in-window with files: **{created_with}/{len(created_recent)}**.",
            f"Content sources: reused `sources/skills.sh` ({reused} priority + {extra_reused} other), maintained repos ({len(maintained)} unique slugs), GitHub clones ({clone_ok} ok / {clone_fail} fail, {extracted} extracted), skills.sh download API this pass ({api_ok} ok / {api_fail} fail / {api_skip} skipped; 60/hour cap).",
            f"Also snapshotted: skills.sh `pages/hot.html` + `pages/trending.html` ({len(hot)} / {len(trending)} paths), ClaudSkills sitemap-news + {len(sotd)} `/sotd/` pages + {len(sotd_slugs)} skill pages, `meta/claude-com-plugins.html`.",
            "Maintained repos (full trees): anthropics/skills, alirezarezvani/claude-skills, obra/superpowers, davila7/claude-code-templates, ComposioHQ/awesome-claude-skills.",
            "Does not replace the historical `sources/skills.sh` dump. Catalog `source`: `claude-skills-latest`.",
        ],
    )
    err_lines = [
        "# claude-skills-latest errors",
        "",
        "Skillselion `updatedAt` is a catalog reindex stamp. Filtering on createdAt **or** updatedAt ≥ 2026-07-14 therefore returns the entire 60,442-skill dump. Content downloads prioritize `createdAt` ≥ 2026-07-14 plus hot/trending/SOTD plus maintained repos. The skills.sh download API is capped at 60/hour; remaining priority misses are noted below.",
        "",
        f"GitHub clone failures ({clone_fail}):",
        "",
    ]
    err_lines.extend(f"- {e}" for e in clone_errors[:200])
    if len(clone_errors) > 200:
        err_lines.append(f"- … {len(clone_errors) - 200} more")
    err_lines.extend(["", f"skills.sh API issues ({len(api_errors)}):", ""])
    err_lines.extend(f"- {e}" for e in api_errors[:100])
    if not clone_errors and not api_errors:
        err_lines.append("No clone or API errors in the priority set.")
    write_text(ROOT / "ERRORS.md", "\n".join(err_lines) + "\n")
    print(json.dumps(stats, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Fill remaining skills.sh archive trees from GitHub (not the 60/hour API).

Groups pending sitemap ids by owner/repo, then for each unique repo:
  1. reuse a local sources/github pack when present
  2. otherwise shallow-clone (`gh repo clone -- --depth 1 --filter=blob:none --sparse`)
  3. on clone failure, GitHub Git Trees API + raw.githubusercontent.com
  4. last resort: probe common SKILL.md raw paths

Matching skill folders (skills/<slug>, .claude/skills/<slug>, .agents/skills/<slug>,
plus nested SKILL.md whose parent dir equals the slug) are copied to
sources/skills.sh/skills/<owner>/<repo>/<slug>/files/ with meta.json
source="github-clone" and a deterministic tree hash.

Does not call the skills.sh download API. Resume-friendly: skips dests that
already have files/. Use --max-repos for batch commits.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from download_skills_sh import (  # noqa: E402
    CATALOG,
    INDEX_PATH,
    MAX_FILE_BYTES,
    REPO,
    SKILLS_DIR,
    STATS_PATH,
    UA,
    URLS_PATH,
    already_downloaded,
    collect_content_index,
    count_downloaded,
    count_filled_by_source,
    count_permanent_404,
    is_permanent_miss,
    parse_skill_id,
    skill_dir,
    update_catalog,
    utc_now,
    write_json,
    write_reports,
    write_text,
)

CLONE_ROOT = Path("/tmp/skills-sh-gh-clones")
GH_PACKS = REPO / "sources" / "github"
PROGRESS_PATH = REPO / "sources" / "skills.sh" / "meta" / "github-fill-progress.json"
MISS_REPOS_PATH = REPO / "sources" / "skills.sh" / "meta" / "github-miss-repos.json"
DONE_REPOS_PATH = REPO / "sources" / "skills.sh" / "meta" / "github-done-repos.json"
CLONE_TIMEOUT = 180
LS_TIMEOUT = 90
RAW_TIMEOUT = 30
MAX_SKILL_FILES = 250
MAX_SKILL_BYTES = 15 * 1024 * 1024
SKIP_DIR_NAMES = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    "coverage",
    ".next",
    ".turbo",
}
TYPICAL_ROOT_DIRS = {
    "scripts",
    "references",
    "templates",
    "assets",
    "examples",
    "evals",
    "resources",
    "tools",
    "docs",
}
TYPICAL_ROOT_FILES = {
    "SKILL.md",
    "skill.md",
    "README.md",
    "LICENSE",
    "LICENSE.md",
    "NOTICE",
    "NOTICE.md",
}
STANDARD_PARENTS = (
    "skills",
    ".claude/skills",
    ".agents/skills",
    "agents/skills",
)
PRINT_LOCK = threading.Lock()
_SECRET_RES = [
    (re.compile(rb"sk_live_[0-9A-Za-z]{16,}"), b"sk_live_REDACTED_ARCHIVE"),
    (re.compile(rb"sk_test_[0-9A-Za-z]{16,}"), b"sk_test_REDACTED_ARCHIVE"),
    (re.compile(rb"AKIA[0-9A-Z]{16}"), b"AKIAREDACTEDARCHIVE00"),
    (re.compile(rb"ghp_[0-9A-Za-z]{20,}"), b"ghp_REDACTED_ARCHIVE"),
    (re.compile(rb"github_pat_[0-9A-Za-z_]{20,}"), b"github_pat_REDACTED_ARCHIVE"),
]
_SECRET_PLACEHOLDER = re.compile(
    rb"abc|xxx|example|your[-_]?key|placeholder|redacted|xxxx",
    re.I,
)


def sanitize_secret_bytes(data: bytes) -> bytes:
    """Neutralize high-risk credential patterns that trip GitHub push protection."""
    if not data or b"sk_live_" not in data and b"sk_test_" not in data and b"AKIA" not in data and b"ghp_" not in data and b"github_pat_" not in data:
        return data
    out = data
    for pat, repl in _SECRET_RES:
        def _sub(match: re.Match[bytes], replacement: bytes = repl) -> bytes:
            if _SECRET_PLACEHOLDER.search(match.group(0)):
                return match.group(0)
            return replacement
        out = pat.sub(_sub, out)
    return out


def log(msg: str) -> None:
    with PRINT_LOCK:
        print(msg, flush=True)


def norm_slug(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum())


def has_files(dest: Path) -> bool:
    if already_downloaded(dest):
        return True
    files_dir = dest / "files"
    if not files_dir.is_dir():
        return False
    return any(p.is_file() and p.stat().st_size > 0 for p in files_dir.rglob("*"))


def tree_hash(files_root: Path) -> str:
    digest = hashlib.sha256()
    paths = sorted(
        p for p in files_root.rglob("*") if p.is_file() and p.name != ".git"
    )
    for path in paths:
        rel = path.relative_to(files_root).as_posix()
        digest.update(rel.encode("utf-8"))
        digest.update(b"\0")
        digest.update(hashlib.sha256(path.read_bytes()).digest())
        digest.update(b"\n")
    return digest.hexdigest()


def github_token() -> str:
    for key in ("GITHUB_TOKEN", "GH_TOKEN"):
        val = os.environ.get(key)
        if val:
            return val
    try:
        return subprocess.check_output(
            ["gh", "auth", "token"], text=True, timeout=15
        ).strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def run_cmd(
    args: list[str],
    timeout: int,
    cwd: Path | None = None,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GH_PROMPT_DISABLED"] = "1"
    env["GIT_LFS_SKIP_SMUDGE"] = "1"
    return subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        timeout=timeout,
        capture_output=True,
        text=True,
        env=env,
        input=input_text,
    )


def load_miss_repos() -> set[str]:
    if not MISS_REPOS_PATH.is_file():
        return set()
    try:
        data = json.loads(MISS_REPOS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    return {str(x) for x in (data.get("repos") or []) if x}


def save_miss_repos(extra: list[str], reason: str) -> None:
    current = load_miss_repos()
    current.update(extra)
    write_json(
        MISS_REPOS_PATH,
        {
            "updated_at": utc_now(),
            "reason": reason,
            "count": len(current),
            "repos": sorted(current),
        },
    )


def load_done_repos() -> set[str]:
    if not DONE_REPOS_PATH.is_file():
        return set()
    try:
        data = json.loads(DONE_REPOS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    return {str(x) for x in (data.get("repos") or []) if x}


def save_done_repos(extra: list[str]) -> None:
    current = load_done_repos()
    current.update(extra)
    write_json(
        DONE_REPOS_PATH,
        {
            "updated_at": utc_now(),
            "count": len(current),
            "repos": sorted(current),
        },
    )


def load_pending() -> dict[str, list[dict]]:
    data = json.loads(URLS_PATH.read_text(encoding="utf-8"))
    urls = list(dict.fromkeys(data.get("urls") or []))
    grouped: dict[str, list[dict]] = defaultdict(list)
    for url in urls:
        skill_id = parse_skill_id(url)
        dest = skill_dir(skill_id)
        if has_files(dest):
            continue
        segs = skill_id.split("/")
        owner, slug = segs[0], segs[-1]
        repo = "/".join(segs[1:-1])
        key = f"{owner}/{repo}"
        grouped[key].append(
            {
                "id": skill_id,
                "url": url,
                "owner": owner,
                "repo": repo,
                "slug": slug,
                "dest": dest,
            }
        )
    return grouped


def local_pack_for(owner: str, repo: str) -> Path | None:
    candidates = [
        GH_PACKS / f"{owner}-{repo}",
        GH_PACKS / f"{owner}-{repo.replace('/', '-')}",
        GH_PACKS / f"{owner}-{repo.replace('_', '-')}",
    ]
    wanted = {f"{owner}-{repo}".lower(), f"{owner}-{repo.replace('/', '-')}".lower()}
    for path in candidates:
        if path.is_dir():
            return path
    if GH_PACKS.is_dir():
        for path in GH_PACKS.iterdir():
            if path.is_dir() and path.name.lower() in wanted:
                return path
    return None


def is_skipped_path(rel: str) -> bool:
    parts = Path(rel).parts
    return any(part in SKIP_DIR_NAMES for part in parts)


def discover_skill_md_paths(root: Path) -> list[str]:
    found: list[str] = []
    for name in ("SKILL.md", "skill.md"):
        for path in root.rglob(name):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            if is_skipped_path(rel):
                continue
            found.append(rel)
    return found


def git_ls_skill_mds(repo_dir: Path) -> list[str]:
    try:
        proc = run_cmd(
            ["git", "-C", str(repo_dir), "ls-tree", "-r", "--name-only", "HEAD"],
            timeout=LS_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return []
    if proc.returncode != 0:
        return []
    out: list[str] = []
    for line in proc.stdout.splitlines():
        text = line.strip().replace("\\", "/")
        if not text:
            continue
        base = Path(text).name
        if base in {"SKILL.md", "skill.md"} and not is_skipped_path(text):
            out.append(text)
    return out


def match_skill_path(md_paths: list[str], slug: str, repo: str, n_pending: int) -> str | None:
    if not md_paths:
        return None
    slug_n = norm_slug(slug)
    scored: list[tuple[int, int, int, str]] = []
    for rel in md_paths:
        parent = Path(rel).parent
        parent_name = parent.name if parent.as_posix() != "." else repo
        parent_n = norm_slug(parent_name)
        rel_posix = parent.as_posix() if parent.as_posix() != "." else ""
        if parent_n != slug_n and not (
            rel in {"SKILL.md", "skill.md"} and (slug_n == norm_slug(repo) or n_pending == 1)
        ):
            continue
        hidden = int(
            any(
                part.startswith(".") and part not in {".claude", ".agents"}
                for part in Path(rel).parts
            )
        )
        if rel_posix == f"skills/{slug}":
            pref = 0
        elif rel_posix == f".claude/skills/{slug}":
            pref = 1
        elif rel_posix == f".agents/skills/{slug}":
            pref = 2
        elif rel_posix.endswith(f"/skills/{slug}"):
            pref = 3
        elif rel_posix == slug:
            pref = 4
        elif rel in {"SKILL.md", "skill.md"}:
            pref = 8
        else:
            pref = 6
        scored.append((hidden, pref, len(rel), rel))
    if not scored:
        return None
    scored.sort()
    return scored[0][3]


def should_copy_as_typical_root(rel_md: str) -> bool:
    parent = Path(rel_md).parent
    return parent.as_posix() in {".", ""}


def iter_skill_files(src_dir: Path, typical_root: bool) -> list[Path]:
    files: list[Path] = []
    if typical_root:
        for child in src_dir.iterdir():
            if child.is_file() and child.name in TYPICAL_ROOT_FILES:
                files.append(child)
            elif child.is_dir() and child.name in TYPICAL_ROOT_DIRS:
                for path in child.rglob("*"):
                    if path.is_file() and not is_skipped_path(
                        path.relative_to(src_dir).as_posix()
                    ):
                        files.append(path)
        skill = src_dir / "SKILL.md"
        if skill.is_file() and skill not in files:
            files.append(skill)
        return files
    for path in src_dir.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(src_dir).as_posix()
        if is_skipped_path(rel) or path.name == ".gitattributes":
            continue
        files.append(path)
    return files


def copy_skill_dir(src_dir: Path, dest: Path, typical_root: bool) -> list[str]:
    files = iter_skill_files(src_dir, typical_root)
    kept: list[tuple[Path, str, bytes]] = []
    total = 0
    for path in files:
        try:
            data = path.read_bytes()
        except OSError:
            continue
        if data.startswith(b"version https://git-lfs.github.com/spec/v1"):
            continue
        if len(data) > MAX_FILE_BYTES:
            continue
        data = sanitize_secret_bytes(data)
        rel = path.relative_to(src_dir).as_posix()
        kept.append((path, rel, data))
        total += len(data)
        if len(kept) > MAX_SKILL_FILES or total > MAX_SKILL_BYTES:
            # oversized folder — keep SKILL.md only
            skill_only = [
                item
                for item in kept
                if item[1] in {"SKILL.md", "skill.md"} or Path(item[1]).name in {"SKILL.md", "skill.md"}
            ]
            if not skill_only:
                return []
            kept = skill_only
            break
    if not kept:
        return []
    files_root = dest / "files"
    if files_root.exists():
        shutil.rmtree(files_root)
    written: list[str] = []
    for _path, rel, data in kept:
        target = files_root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        written.append(rel)
    written.sort()
    return written


def write_skill_meta(
    item: dict,
    written: list[str],
    skill_path: str,
    via: str,
    github_repo: str,
) -> None:
    dest: Path = item["dest"]
    dest.mkdir(parents=True, exist_ok=True)
    digest = tree_hash(dest / "files") if written else None
    write_json(
        dest / "meta.json",
        {
            "id": item["id"],
            "url": item["url"],
            "source": "github-clone",
            "github_repo": github_repo,
            "skill_path": skill_path,
            "via": via,
            "hash": digest,
            "file_count": len(written),
            "files": written,
            "download_ok": bool(written and digest),
            "html_fallback": False,
            "scraped_at": utc_now(),
        },
    )


def extract_from_root(
    root: Path, items: list[dict], via: str, github_repo: str, md_paths: list[str] | None = None
) -> dict:
    filled = 0
    missed: list[str] = []
    paths = md_paths if md_paths is not None else discover_skill_md_paths(root)
    n_pending = len(items)
    repo = items[0]["repo"] if items else ""
    for item in items:
        dest: Path = item["dest"]
        if has_files(dest):
            continue
        rel_md = match_skill_path(paths, item["slug"], repo, n_pending)
        if not rel_md:
            missed.append(item["id"])
            continue
        src_dir = root / Path(rel_md).parent
        if Path(rel_md).parent.as_posix() == ".":
            src_dir = root
        if not src_dir.is_dir():
            missed.append(item["id"])
            continue
        written = copy_skill_dir(src_dir, dest, should_copy_as_typical_root(rel_md))
        if not written:
            missed.append(item["id"])
            continue
        write_skill_meta(item, written, rel_md, via, github_repo)
        filled += 1
    return {"filled": filled, "missed": missed, "via": via}


def clone_repo(owner: str, repo: str, dest: Path) -> tuple[bool, str]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)
    args = [
        "gh",
        "repo",
        "clone",
        f"{owner}/{repo}",
        str(dest),
        "--",
        "--depth",
        "1",
        "--single-branch",
        "--filter=blob:none",
        "--sparse",
    ]
    try:
        proc = run_cmd(args, timeout=CLONE_TIMEOUT)
    except subprocess.TimeoutExpired:
        return False, "clone timeout"
    if proc.returncode == 0 and (dest / ".git").exists():
        return True, "ok"
    err = (proc.stderr or proc.stdout or "clone failed").strip().splitlines()
    tail = err[-1] if err else "clone failed"
    # retry without filter/sparse for hosts that reject partial clone
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)
    args_plain = [
        "gh",
        "repo",
        "clone",
        f"{owner}/{repo}",
        str(dest),
        "--",
        "--depth",
        "1",
        "--single-branch",
    ]
    try:
        proc2 = run_cmd(args_plain, timeout=CLONE_TIMEOUT)
    except subprocess.TimeoutExpired:
        return False, f"clone timeout after retry; {tail}"
    if proc2.returncode == 0 and dest.exists():
        return True, "ok-plain"
    err2 = (proc2.stderr or proc2.stdout or tail).strip().splitlines()
    return False, (err2[-1] if err2 else tail)[:240]


def sparse_checkout(repo_dir: Path, paths: list[str]) -> bool:
    uniq = []
    seen = set()
    for path in paths:
        cleaned = path.strip().strip("/")
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        uniq.append(cleaned)
    if not uniq:
        return False
    try:
        init = run_cmd(
            ["git", "-C", str(repo_dir), "sparse-checkout", "init", "--no-cone"],
            timeout=30,
        )
        if init.returncode != 0:
            return False
        proc = run_cmd(
            ["git", "-C", str(repo_dir), "sparse-checkout", "set", "--no-cone", "--stdin"],
            timeout=120,
            input_text="\n".join(uniq) + "\n",
        )
        return proc.returncode == 0
    except subprocess.TimeoutExpired:
        return False


def http_json(url: str, token: str, timeout: int = 45) -> tuple[int, dict | list | None, dict]:
    headers = {
        "User-Agent": UA,
        "Accept": "application/vnd.github+json",
        "X-Archive-Client": UA,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            hdrs = dict(resp.headers)
            try:
                return resp.status, json.loads(body.decode("utf-8")), hdrs
            except json.JSONDecodeError:
                return resp.status, None, hdrs
    except urllib.error.HTTPError as exc:
        body = exc.read() if exc.fp else b""
        try:
            payload = json.loads(body.decode("utf-8")) if body else None
        except json.JSONDecodeError:
            payload = None
        return exc.code, payload, dict(exc.headers or {})
    except Exception:
        return 0, None, {}


def http_bytes(url: str, timeout: int = RAW_TIMEOUT) -> tuple[int, bytes]:
    headers = {"User-Agent": UA, "Accept": "*/*", "X-Archive-Client": UA}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read() if exc.fp else b""
    except Exception:
        return 0, b""


def trees_and_raw(owner: str, repo: str, items: list[dict], token: str) -> dict:
    status, payload, _ = http_json(
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
        token,
        timeout=60,
    )
    if status != 200 or not isinstance(payload, dict):
        if status == 404:
            st2, repo_doc, _ = http_json(
                f"https://api.github.com/repos/{urllib.parse.quote(owner)}/{urllib.parse.quote(repo)}",
                token,
            )
            branch = None
            if st2 == 200 and isinstance(repo_doc, dict):
                branch = repo_doc.get("default_branch")
            if branch:
                status, payload, _ = http_json(
                    f"https://api.github.com/repos/{owner}/{repo}/git/trees/"
                    f"{urllib.parse.quote(str(branch))}?recursive=1",
                    token,
                    timeout=60,
                )
        if status != 200 or not isinstance(payload, dict):
            return {"filled": 0, "missed": [i["id"] for i in items], "via": "trees-fail"}

    entries = payload.get("tree") or []
    md_paths = [
        str(e.get("path"))
        for e in entries
        if isinstance(e, dict)
        and e.get("type") == "blob"
        and str(e.get("path") or "").endswith(("SKILL.md", "skill.md"))
        and not is_skipped_path(str(e.get("path") or ""))
    ]
    blobs_by_dir: dict[str, list[str]] = defaultdict(list)
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("type") != "blob":
            continue
        path = str(entry.get("path") or "")
        if not path or is_skipped_path(path):
            continue
        parent = str(Path(path).parent.as_posix())
        if parent == ".":
            parent = ""
        blobs_by_dir[parent].append(path)

    n_pending = len(items)
    filled = 0
    missed: list[str] = []
    github_repo = f"https://github.com/{owner}/{repo}"
    for item in items:
        dest: Path = item["dest"]
        if has_files(dest):
            continue
        rel_md = match_skill_path(md_paths, item["slug"], repo, n_pending)
        if not rel_md:
            missed.append(item["id"])
            continue
        parent = str(Path(rel_md).parent.as_posix())
        if parent == ".":
            parent = ""
        if should_copy_as_typical_root(rel_md):
            wanted = [rel_md]
            for blob in blobs_by_dir.get(parent, []):
                name = Path(blob).name
                if name in TYPICAL_ROOT_FILES:
                    wanted.append(blob)
            for dirname in TYPICAL_ROOT_DIRS:
                prefix = f"{dirname}/"
                for blob in blobs_by_dir.get(dirname, []):
                    wanted.append(blob)
                for key, blobs in blobs_by_dir.items():
                    if key == dirname or key.startswith(prefix):
                        wanted.extend(blobs)
            fetch_paths = list(dict.fromkeys(wanted))
        else:
            prefix = f"{parent}/" if parent else ""
            fetch_paths = [rel_md]
            if parent:
                fetch_paths.extend(blobs_by_dir.get(parent, []))
                for key, blobs in blobs_by_dir.items():
                    if key.startswith(prefix):
                        fetch_paths.extend(blobs)
            fetch_paths = list(dict.fromkeys(fetch_paths))

        files_payload: list[tuple[str, bytes]] = []
        total = 0
        for blob_path in fetch_paths:
            raw = (
                f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/"
                f"{urllib.parse.quote(blob_path, safe='/')}"
            )
            st, body = http_bytes(raw)
            if st != 200 or not body:
                continue
            if body.startswith(b"version https://git-lfs.github.com/spec/v1"):
                continue
            if len(body) > MAX_FILE_BYTES:
                continue
            body = sanitize_secret_bytes(body)
            rel = blob_path[len(prefix) :] if prefix and blob_path.startswith(prefix) else Path(blob_path).name
            if not rel or rel == blob_path and parent:
                rel = Path(blob_path).name if should_copy_as_typical_root(rel_md) else blob_path
            files_payload.append((rel, body))
            total += len(body)
            if len(files_payload) > MAX_SKILL_FILES or total > MAX_SKILL_BYTES:
                files_payload = [x for x in files_payload if Path(x[0]).name in {"SKILL.md", "skill.md"}]
                break
        if not files_payload:
            missed.append(item["id"])
            continue
        files_root = dest / "files"
        if files_root.exists():
            shutil.rmtree(files_root)
        written: list[str] = []
        for rel, body in files_payload:
            target = files_root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body)
            written.append(rel)
        written.sort()
        write_skill_meta(item, written, rel_md, "github-trees-raw", github_repo)
        filled += 1
    return {"filled": filled, "missed": missed, "via": "github-trees-raw"}


def raw_probe(owner: str, repo: str, items: list[dict]) -> dict:
    filled = 0
    missed: list[str] = []
    github_repo = f"https://github.com/{owner}/{repo}"
    for item in items:
        dest: Path = item["dest"]
        if has_files(dest):
            continue
        slug = item["slug"]
        candidates = [
            f"skills/{slug}/SKILL.md",
            f".claude/skills/{slug}/SKILL.md",
            f".agents/skills/{slug}/SKILL.md",
            f"agents/skills/{slug}/SKILL.md",
            f"plugins/{slug}/skills/{slug}/SKILL.md",
            f"plugins/{slug}/SKILL.md",
            f"packages/{slug}/SKILL.md",
            f"packages/skills/{slug}/SKILL.md",
            f"{slug}/SKILL.md",
            "SKILL.md",
        ]
        hit = None
        body = b""
        for rel in candidates:
            raw = (
                f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/"
                f"{urllib.parse.quote(rel, safe='/')}"
            )
            st, data = http_bytes(raw)
            if st == 200 and data and not data.lstrip().startswith(b"<"):
                hit = rel
                body = data
                break
        if not hit:
            missed.append(item["id"])
            continue
        files_root = dest / "files"
        if files_root.exists():
            shutil.rmtree(files_root)
        target = files_root / "SKILL.md"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(sanitize_secret_bytes(body))
        write_skill_meta(item, ["SKILL.md"], hit, "github-raw-probe", github_repo)
        filled += 1
    return {"filled": filled, "missed": missed, "via": "github-raw-probe"}


def process_repo(owner_repo: str, items: list[dict], token: str, local_only: bool) -> dict:
    owner, repo = owner_repo.split("/", 1)
    pending = [i for i in items if not has_files(i["dest"])]
    if not pending:
        return {
            "repo": owner_repo,
            "filled": 0,
            "missed": 0,
            "via": "skipped",
            "pending": 0,
        }

    github_repo = f"https://github.com/{owner}/{repo}"
    local = local_pack_for(owner, repo)
    if local:
        result = extract_from_root(local, pending, "local-pack", github_repo)
        leftover = [i for i in pending if i["id"] in set(result["missed"])]
        if leftover and not local_only:
            cloned = _clone_extract(owner, repo, leftover, token)
            result["filled"] += cloned["filled"]
            result["missed"] = cloned["missed"]
            result["via"] = f"local-pack+{cloned['via']}"
        return {
            "repo": owner_repo,
            "filled": result["filled"],
            "missed": len(result["missed"]),
            "via": result["via"],
            "pending": len(pending),
            "miss_ids": result["missed"][:20],
        }

    if local_only:
        return {
            "repo": owner_repo,
            "filled": 0,
            "missed": len(pending),
            "via": "no-local-pack",
            "pending": len(pending),
        }

    if len(pending) <= 3:
        probed = raw_probe(owner, repo, pending)
        leftover = [i for i in pending if i["id"] in set(probed["missed"])]
        if not leftover:
            return {
                "repo": owner_repo,
                "filled": probed["filled"],
                "missed": 0,
                "via": "github-raw-probe",
                "pending": len(pending),
            }
        cloned = _clone_extract(owner, repo, leftover, token)
        return {
            "repo": owner_repo,
            "filled": probed["filled"] + cloned["filled"],
            "missed": len(cloned["missed"]),
            "via": f"raw+{cloned['via']}",
            "pending": len(pending),
            "miss_ids": cloned["missed"][:20],
        }

    cloned = _clone_extract(owner, repo, pending, token)
    return {
        "repo": owner_repo,
        "filled": cloned["filled"],
        "missed": len(cloned["missed"]),
        "via": cloned["via"],
        "pending": len(pending),
        "miss_ids": cloned["missed"][:20],
    }


def _clone_extract(owner: str, repo: str, items: list[dict], token: str) -> dict:
    github_repo = f"https://github.com/{owner}/{repo}"
    dest = Path(
        tempfile.mkdtemp(
            prefix=f"{owner}__{repo.replace('/', '__')}__",
            dir=str(CLONE_ROOT),
        )
    )
    try:
        ok, err = clone_repo(owner, repo, dest)
        if ok:
            md_paths = git_ls_skill_mds(dest)
            if not md_paths:
                md_paths = discover_skill_md_paths(dest)
            checkout_dirs: list[str] = []
            n_pending = len(items)
            for item in items:
                rel_md = match_skill_path(md_paths, item["slug"], repo, n_pending)
                if not rel_md:
                    continue
                parent = Path(rel_md).parent.as_posix()
                checkout_dirs.append("." if parent == "." else parent)
            # also pull standard skill roots when present in the tree
            for std in STANDARD_PARENTS:
                if any(p == f"{std}/SKILL.md" or p.startswith(f"{std}/") for p in md_paths):
                    checkout_dirs.append(std)
            if checkout_dirs and (dest / ".git").exists():
                sparse_checkout(dest, checkout_dirs)
            git_dir = dest / ".git"
            if git_dir.exists():
                shutil.rmtree(git_dir, ignore_errors=True)
            result = extract_from_root(
                dest, items, "github-clone", github_repo, md_paths=None
            )
            leftover_ids = set(result["missed"])
            leftover = [i for i in items if i["id"] in leftover_ids]
            if leftover:
                trees = trees_and_raw(owner, repo, leftover, token)
                result["filled"] += trees["filled"]
                result["missed"] = trees["missed"]
                if trees["filled"]:
                    result["via"] = "github-clone+trees"
            leftover_ids = set(result["missed"])
            leftover = [i for i in items if i["id"] in leftover_ids]
            if leftover:
                probed = raw_probe(owner, repo, leftover)
                result["filled"] += probed["filled"]
                result["missed"] = probed["missed"]
                if probed["filled"]:
                    result["via"] = f"{result['via']}+raw"
            return result

        trees = trees_and_raw(owner, repo, items, token)
        leftover = [i for i in items if i["id"] in set(trees["missed"])]
        if leftover:
            probed = raw_probe(owner, repo, leftover)
            trees["filled"] += probed["filled"]
            trees["missed"] = probed["missed"]
            if probed["filled"]:
                trees["via"] = f"trees+raw ({err})"
            else:
                trees["via"] = f"clone-fail:{err}"
        else:
            trees["via"] = f"trees-after-clone-fail:{err}"
        return trees
    finally:
        shutil.rmtree(dest, ignore_errors=True)


def write_progress_and_index(
    batch_stats: dict, failed: list[dict], update_catalog_flag: bool
) -> dict:
    downloaded_ok = count_downloaded()
    n404 = count_permanent_404()
    filled = count_filled_by_source()
    urls_doc = json.loads(URLS_PATH.read_text(encoding="utf-8"))
    all_urls = list(dict.fromkeys(urls_doc.get("urls") or []))
    remaining = max(0, len(all_urls) - downloaded_ok)
    prev = {}
    if STATS_PATH.exists():
        try:
            prev = json.loads(STATS_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            prev = {}
    stats = {
        "updated_at": utc_now(),
        "sitemap_urls": len(all_urls),
        "unique_ids": len(all_urls),
        "attempted": int(prev.get("attempted") or 0),
        "downloaded_ok": downloaded_ok,
        "downloaded_ok_this_batch": batch_stats.get("filled", 0),
        "github_filled": filled["github_clone"],
        "api_filled": filled["skills_sh_api"],
        "other_filled": filled["other"],
        "html_fallback_404": n404,
        "html_fallback_this_batch": 0,
        "failed": int(prev.get("failed") or 0),
        "rate_limited_this_batch": 0,
        "remaining": remaining,
        "concurrency": batch_stats.get("workers"),
        "hourly_budget": prev.get("hourly_budget", 50),
        "api_hourly_cap": 60,
        "batch_size": batch_stats.get("repos_processed", 0),
        "github_repos_processed": batch_stats.get("repos_processed", 0),
        "github_fill_via": batch_stats.get("via_counts", {}),
        "retry_after_unix": prev.get("retry_after_unix"),
    }
    write_reports(stats, failed, remaining)
    write_json(
        PROGRESS_PATH,
        {
            "updated_at": stats["updated_at"],
            "downloaded_ok": downloaded_ok,
            "github_filled": filled["github_clone"],
            "api_filled": filled["skills_sh_api"],
            "remaining": remaining,
            "last_batch": batch_stats,
        },
    )
    if update_catalog_flag:
        catalog_updated = update_catalog(collect_content_index())
        stats["catalog_rows_updated"] = catalog_updated
        write_json(STATS_PATH, stats)
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=24)
    parser.add_argument("--max-repos", type=int, default=0, help="0 = all pending repos")
    parser.add_argument("--local-only", action="store_true")
    parser.add_argument("--skip-local", action="store_true")
    parser.add_argument(
        "--raw-leftovers",
        action="store_true",
        help="probe remaining slugs via raw.githubusercontent.com only (includes already-cloned repos)",
    )
    parser.add_argument(
        "--trees-leftovers",
        action="store_true",
        help="Git Trees + raw for remaining slugs (includes already-cloned repos)",
    )
    parser.add_argument("--update-catalog", action="store_true")
    parser.add_argument("--reports-only", action="store_true")
    parser.add_argument("--min-skills", type=int, default=0, help="only repos with at least N pending")
    parser.add_argument("--max-skills", type=int, default=0, help="only repos with at most N pending (0=no cap)")
    args = parser.parse_args()

    grouped = load_pending()
    skip_404 = load_miss_repos()
    skip_done = set() if (args.raw_leftovers or args.trees_leftovers) else load_done_repos()
    repos = sorted(grouped.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    if skip_404:
        repos = [r for r in repos if r[0] not in skip_404]
    if skip_done:
        repos = [r for r in repos if r[0] not in skip_done]
    if args.min_skills:
        repos = [r for r in repos if len(r[1]) >= args.min_skills]
    if args.max_skills:
        repos = [r for r in repos if len(r[1]) <= args.max_skills]
    if args.skip_local:
        repos = [r for r in repos if local_pack_for(*r[0].split("/", 1)) is None]
    if args.local_only:
        repos = [r for r in repos if local_pack_for(*r[0].split("/", 1)) is not None]
    if args.max_repos and args.max_repos > 0:
        repos = repos[: args.max_repos]

    if args.reports_only:
        stats = write_progress_and_index(
            {"filled": 0, "repos_processed": 0, "workers": 0, "via_counts": {}},
            [],
            args.update_catalog,
        )
        print(json.dumps(stats, indent=2), flush=True)
        return 0

    CLONE_ROOT.mkdir(parents=True, exist_ok=True)
    token = github_token()
    workers = max(1, min(args.workers, 40))
    pending_skills = sum(len(v) for _, v in repos)
    log(
        f"github fill repos={len(repos)} pending_skills={pending_skills} "
        f"workers={workers} local_only={args.local_only} token={'yes' if token else 'no'}"
    )

    results: list[dict] = []
    filled_total = 0
    done = 0
    via_counts: dict[str, int] = defaultdict(int)

    def work(pair: tuple[str, list[dict]]) -> dict:
        owner_repo, items = pair
        try:
            if args.raw_leftovers or args.trees_leftovers:
                owner, repo = owner_repo.split("/", 1)
                pending = [i for i in items if not has_files(i["dest"])]
                if args.trees_leftovers:
                    result = trees_and_raw(owner, repo, pending, token)
                    leftover = [i for i in pending if i["id"] in set(result["missed"])]
                    if leftover:
                        probed = raw_probe(owner, repo, leftover)
                        result["filled"] += probed["filled"]
                        result["missed"] = probed["missed"]
                        if probed["filled"]:
                            result["via"] = "trees+raw-leftovers"
                    return {
                        "repo": owner_repo,
                        "filled": result["filled"],
                        "missed": len(result["missed"]),
                        "via": result["via"],
                        "pending": len(pending),
                    }
                probed = raw_probe(owner, repo, pending)
                return {
                    "repo": owner_repo,
                    "filled": probed["filled"],
                    "missed": len(probed["missed"]),
                    "via": probed["via"],
                    "pending": len(pending),
                }
            return process_repo(owner_repo, items, token, args.local_only)
        except Exception as exc:  # noqa: BLE001
            return {
                "repo": owner_repo,
                "filled": 0,
                "missed": len(items),
                "via": f"error:{type(exc).__name__}: {exc}"[:200],
                "pending": len(items),
            }

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = [pool.submit(work, pair) for pair in repos]
        for fut in as_completed(futs):
            item = fut.result()
            results.append(item)
            filled_total += int(item.get("filled") or 0)
            via_counts[str(item.get("via") or "?")] += 1
            done += 1
            if done % 10 == 0 or done == len(repos) or int(item.get("filled") or 0) >= 20:
                log(
                    f"  progress {done}/{len(repos)} filled_batch={filled_total} "
                    f"last={item['repo']} +{item.get('filled')} miss={item.get('missed')} "
                    f"via={item.get('via')}"
                )

    failed = [
        {"id": r["repo"], "status": r.get("via"), "error": f"missed {r.get('missed')}"}
        for r in results
        if (r.get("filled") or 0) == 0 and (r.get("missed") or 0) > 0
    ]
    missing_repos = [
        r["repo"]
        for r in results
        if (r.get("filled") or 0) == 0
        and "Could not resolve to a Repository" in str(r.get("via") or "")
    ]
    if missing_repos:
        save_miss_repos(missing_repos, "github-404")
        log(f"recorded {len(missing_repos)} missing GitHub repos")
    processed = [r["repo"] for r in results if r.get("repo")]
    if processed:
        save_done_repos(processed)
        log(f"recorded {len(processed)} processed GitHub repos")
    batch_stats = {
        "filled": filled_total,
        "repos_processed": len(results),
        "failed_repos": len(failed),
        "workers": workers,
        "via_counts": dict(via_counts),
        "local_only": args.local_only,
    }
    stats = write_progress_and_index(batch_stats, failed[:200], args.update_catalog)
    print(json.dumps({**stats, "batch": batch_stats}, indent=2), flush=True)
    return 0 if filled_total or not repos else 2


if __name__ == "__main__":
    sys.exit(main())

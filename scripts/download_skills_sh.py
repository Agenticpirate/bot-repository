#!/usr/bin/env python3
"""Download full skill contents from skills.sh for every sitemap URL.

Resume-friendly: skips ids that already have files/ + meta.json hash.
Does not delete existing catalog rows. Use --max-new for batch commits.
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / "sources" / "skills.sh"
SKILLS_DIR = ROOT / "skills"
META_DIR = ROOT / "meta"
URLS_PATH = META_DIR / "skill-urls.json"
STATS_PATH = META_DIR / "download-stats.json"
INDEX_PATH = ROOT / "INDEX.md"
ERRORS_PATH = ROOT / "ERRORS.md"
CATALOG = REPO / "catalog.json"
UA = "bot-repository-archive/1.0 (+https://github.com/Agenticpirate/bot-repository)"
TIMEOUT = 45
MAX_FILE_BYTES = 20 * 1024 * 1024


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


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


def parse_skill_id(url: str) -> str:
    path = urllib.parse.urlparse(url).path.strip("/")
    segs = [s for s in path.split("/") if s]
    if len(segs) < 3:
        raise ValueError(f"cannot parse skill id from {url}")
    owner, repo, slug = segs[0], "/".join(segs[1:-1]), segs[-1]
    return f"{owner}/{repo}/{slug}"


def skill_dir(skill_id: str) -> Path:
    return SKILLS_DIR.joinpath(*skill_id.split("/"))


def safe_relpath(rel: str) -> Path | None:
    if not isinstance(rel, str) or not rel.strip():
        return None
    cleaned = rel.replace("\\", "/").strip().lstrip("/")
    if not cleaned:
        return None
    parts = Path(cleaned).parts
    if any(p in ("", "..") or p.startswith("/") for p in parts):
        return None
    return Path(*parts)


def already_downloaded(dest: Path) -> bool:
    meta_path = dest / "meta.json"
    files_dir = dest / "files"
    if not meta_path.is_file() or not files_dir.is_dir():
        return False
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    if not meta.get("download_ok") or not meta.get("hash"):
        return False
    written = list(files_dir.rglob("*"))
    return any(p.is_file() for p in written)


class RateGate:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.cooldown_until = 0.0

    def wait(self) -> None:
        while True:
            with self.lock:
                wait = self.cooldown_until - time.time()
            if wait <= 0:
                return
            time.sleep(min(wait, 1.5))

    def punish(self, seconds: float) -> None:
        with self.lock:
            self.cooldown_until = max(self.cooldown_until, time.time() + seconds)


GATE = RateGate()


def http_get(url: str, accept: str = "application/json") -> tuple[int, bytes, dict]:
    headers = {
        "User-Agent": UA,
        "Accept": accept,
        "X-Archive-Client": UA,
    }
    last_status = 0
    last_err: Exception | None = None
    for attempt in range(1, 8):
        GATE.wait()
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return resp.status, resp.read(), dict(resp.headers)
        except urllib.error.HTTPError as exc:
            last_status = exc.code
            body = exc.read() if exc.fp else b""
            if exc.code in (429, 500, 502, 503, 504):
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                try:
                    extra = float(retry_after) if retry_after else 0.0
                except ValueError:
                    extra = 0.0
                backoff = extra if extra > 0 else min(90.0, 1.5 * (2 ** (attempt - 1)))
                GATE.punish(backoff)
                last_err = exc
                continue
            return exc.code, body, dict(exc.headers or {})
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            GATE.punish(min(30.0, 1.2 * (2 ** (attempt - 1))))
    if last_err:
        raise last_err
    return last_status or 0, b"", {}


def write_skill_files(dest: Path, files: list[dict]) -> list[str]:
    written: list[str] = []
    files_root = dest / "files"
    if files_root.exists():
        for old in files_root.rglob("*"):
            if old.is_file():
                old.unlink()
    for item in files:
        rel = safe_relpath(item.get("path") or "")
        if rel is None:
            continue
        contents = item.get("contents")
        if contents is None:
            continue
        if isinstance(contents, bytes):
            data = contents
        elif isinstance(contents, str):
            data = contents.encode("utf-8")
        else:
            data = json.dumps(contents, ensure_ascii=False).encode("utf-8")
        if len(data) > MAX_FILE_BYTES:
            raise RuntimeError(f"file too large: {rel} ({len(data)} bytes)")
        write_bytes(files_root / rel, data)
        written.append(rel.as_posix())
    return written


def save_html_fallback(dest: Path, page_url: str) -> bool:
    try:
        status, body, _ = http_get(page_url, accept="text/html,application/xhtml+xml")
    except Exception:
        return False
    if status != 200 or not body:
        return False
    write_bytes(dest / "page.html", body)
    return True


def download_one(url: str) -> dict:
    skill_id = parse_skill_id(url)
    dest = skill_dir(skill_id)
    dest.mkdir(parents=True, exist_ok=True)
    if already_downloaded(dest):
        return {"id": skill_id, "status": "skipped", "url": url}

    encoded = "/".join(urllib.parse.quote(seg, safe="") for seg in skill_id.split("/"))
    api = f"https://skills.sh/api/download/{encoded}"
    try:
        status, body, _ = http_get(api)
    except Exception as exc:  # noqa: BLE001
        html_ok = save_html_fallback(dest, url)
        write_json(
            dest / "meta.json",
            {
                "id": skill_id,
                "url": url,
                "source": "skills.sh",
                "hash": None,
                "file_count": 0,
                "files": [],
                "download_ok": False,
                "html_fallback": html_ok,
                "error": f"{type(exc).__name__}: {exc}",
                "scraped_at": utc_now(),
            },
        )
        return {
            "id": skill_id,
            "status": "html_fallback" if html_ok else "failed",
            "url": url,
            "error": str(exc),
        }

    payload = None
    if status == 200:
        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            payload = None
            err = f"invalid json: {exc}"
        else:
            err = None
    else:
        err = f"HTTP {status}"

    files = (payload or {}).get("files") if isinstance(payload, dict) else None
    digest = (payload or {}).get("hash") if isinstance(payload, dict) else None
    if status == 200 and isinstance(files, list) and files:
        try:
            written = write_skill_files(dest, files)
        except Exception as exc:  # noqa: BLE001
            written = []
            err = f"write failed: {exc}"
        if written:
            write_json(
                dest / "meta.json",
                {
                    "id": skill_id,
                    "url": url,
                    "source": "skills.sh",
                    "hash": digest,
                    "file_count": len(written),
                    "files": written,
                    "download_ok": True,
                    "html_fallback": False,
                    "scraped_at": utc_now(),
                },
            )
            return {
                "id": skill_id,
                "status": "ok",
                "url": url,
                "hash": digest,
                "file_count": len(written),
            }

    html_ok = save_html_fallback(dest, url)
    write_json(
        dest / "meta.json",
        {
            "id": skill_id,
            "url": url,
            "source": "skills.sh",
            "hash": digest,
            "file_count": 0,
            "files": [],
            "download_ok": False,
            "html_fallback": html_ok,
            "error": err or "empty files",
            "scraped_at": utc_now(),
        },
    )
    return {
        "id": skill_id,
        "status": "html_fallback" if html_ok else "failed",
        "url": url,
        "error": err or "empty files",
    }


def load_work_list() -> list[str]:
    data = json.loads(URLS_PATH.read_text(encoding="utf-8"))
    urls = list(dict.fromkeys(data.get("urls") or []))
    pending: list[str] = []
    for url in urls:
        skill_id = parse_skill_id(url)
        if not already_downloaded(skill_dir(skill_id)):
            pending.append(url)
    return pending


def count_downloaded() -> int:
    if not SKILLS_DIR.exists():
        return 0
    n = 0
    for meta in SKILLS_DIR.rglob("meta.json"):
        dest = meta.parent
        if already_downloaded(dest):
            n += 1
    return n


def collect_content_index() -> dict[str, dict]:
    index: dict[str, dict] = {}
    if not SKILLS_DIR.exists():
        return index
    for meta_path in SKILLS_DIR.rglob("meta.json"):
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        skill_id = meta.get("id")
        if not skill_id:
            continue
        index[skill_id] = {
            "has_content": bool(meta.get("download_ok") or meta.get("html_fallback")),
            "file_count": int(meta.get("file_count") or 0),
            "hash": meta.get("hash"),
            "html_fallback": bool(meta.get("html_fallback")),
            "download_ok": bool(meta.get("download_ok")),
        }
    return index


def update_catalog(content: dict[str, dict]) -> int:
    rows = json.loads(CATALOG.read_text(encoding="utf-8"))
    updated = 0
    for row in rows:
        if row.get("source") != "skills.sh":
            continue
        info = content.get(row.get("id"))
        if not info:
            continue
        before = (row.get("has_content"), row.get("file_count"), row.get("hash"))
        row["has_content"] = info["has_content"]
        row["file_count"] = info["file_count"]
        if info.get("hash"):
            row["hash"] = info["hash"]
        after = (row.get("has_content"), row.get("file_count"), row.get("hash"))
        if before != after:
            updated += 1
    write_json(CATALOG, rows)
    return updated


def write_reports(stats: dict, failed: list[dict], remaining: int) -> None:
    write_json(STATS_PATH, stats)
    ok = stats.get("downloaded_ok", 0)
    skipped = stats.get("skipped_existing", 0)
    html_n = stats.get("html_fallback", 0)
    fail_n = stats.get("failed", 0)
    attempted = stats.get("attempted", 0)
    lines = [
        "# skills.sh",
        "",
        "Public agent-skills registry (Vercel). Full skill file contents via "
        "`GET /api/download/{owner}/{repo}/{slug}`. Sitemaps and listing pages kept.",
        "",
        f"- Last updated: {stats.get('updated_at')}",
        f"- Skill URLs in sitemap: {stats.get('sitemap_urls')}",
        f"- Unique ids: {stats.get('unique_ids')}",
        f"- Downloaded OK (files/ + hash): {ok}",
        f"- Already present / skipped: {skipped}",
        f"- HTML fallback (API failed): {html_n}",
        f"- Failed: {fail_n}",
        f"- Remaining (no successful files/): {remaining}",
        f"- Concurrency: {stats.get('concurrency')}",
        f"- Cap: target all ~20k; resume-friendly; batch commits on main",
        "",
        "Each skill lives at `skills/<owner>/<repo>/<slug>/{meta.json,files/}`.",
        "Per-skill HTML is only saved when the download API fails.",
    ]
    write_text(INDEX_PATH, "\n".join(lines))

    err_lines = [
        "# skills.sh errors",
        "",
        f"Updated: {stats.get('updated_at')}",
        f"Remaining without files/: {remaining}",
        f"Failed this snapshot: {fail_n}",
        f"HTML fallback: {html_n}",
        "",
    ]
    if remaining == 0 and fail_n == 0 and html_n == 0:
        err_lines.append("No outstanding download failures.")
    else:
        err_lines.append("Recent failures / fallbacks (capped):")
        err_lines.append("")
        for item in failed[:200]:
            err_lines.append(
                f"- `{item.get('id')}` {item.get('status')}: {item.get('error') or ''}".rstrip()
            )
        if remaining > 0:
            err_lines.append("")
            err_lines.append(
                f"{remaining} skill ids still lack `files/` + hash. Re-run "
                "`scripts/download_skills_sh.py` to resume."
            )
    write_text(ERRORS_PATH, "\n".join(err_lines))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--concurrency", type=int, default=24)
    parser.add_argument("--max-new", type=int, default=0, help="0 = all pending")
    parser.add_argument("--update-catalog", action="store_true")
    parser.add_argument("--reports-only", action="store_true")
    args = parser.parse_args()

    urls_doc = json.loads(URLS_PATH.read_text(encoding="utf-8"))
    all_urls = list(dict.fromkeys(urls_doc.get("urls") or []))
    pending = load_work_list()
    if args.max_new and args.max_new > 0:
        batch = pending[: args.max_new]
    else:
        batch = pending

    results: list[dict] = []
    if not args.reports_only and batch:
        print(
            f"download batch {len(batch)} / pending {len(pending)} / total {len(all_urls)} "
            f"concurrency={args.concurrency}",
            flush=True,
        )
        done = 0
        with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
            futs = [pool.submit(download_one, url) for url in batch]
            for fut in as_completed(futs):
                item = fut.result()
                results.append(item)
                done += 1
                if done % 50 == 0 or done == len(batch):
                    ok = sum(1 for r in results if r["status"] == "ok")
                    fail = sum(1 for r in results if r["status"] == "failed")
                    html_n = sum(1 for r in results if r["status"] == "html_fallback")
                    skip = sum(1 for r in results if r["status"] == "skipped")
                    print(
                        f"  progress {done}/{len(batch)} ok={ok} skip={skip} "
                        f"html={html_n} fail={fail}",
                        flush=True,
                    )

    downloaded_ok = count_downloaded()
    still_pending = load_work_list()
    ok_n = sum(1 for r in results if r["status"] == "ok")
    skip_n = sum(1 for r in results if r["status"] == "skipped")
    html_n = sum(1 for r in results if r["status"] == "html_fallback")
    fail_n = sum(1 for r in results if r["status"] == "failed")
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
        "attempted": int(prev.get("attempted") or 0) + len(results),
        "downloaded_ok": downloaded_ok,
        "downloaded_ok_this_batch": ok_n,
        "skipped_existing": skip_n,
        "html_fallback": html_n,
        "failed": fail_n,
        "remaining": len(still_pending),
        "concurrency": args.concurrency,
        "batch_size": len(batch),
    }
    failed_items = [r for r in results if r["status"] in ("failed", "html_fallback")]
    write_reports(stats, failed_items, len(still_pending))

    catalog_updated = 0
    if args.update_catalog:
        catalog_updated = update_catalog(collect_content_index())
        stats["catalog_rows_updated"] = catalog_updated
        write_json(STATS_PATH, stats)

    print(json.dumps({**stats, "catalog_rows_updated": catalog_updated}, indent=2), flush=True)
    # 0 = nothing pending after this run; 2 = more work remains
    return 0 if not still_pending else 2


if __name__ == "__main__":
    sys.exit(main())

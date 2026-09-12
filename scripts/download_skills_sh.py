#!/usr/bin/env python3
"""Download full skill contents from skills.sh for every sitemap URL.

Resume-friendly: skips ids that already have files/ + meta.json hash.
The official download API is capped at 60 requests/hour (verified 2026-09-12).
This client stays under that budget, honors Retry-After, and does not HTML-fallback
on 429 (those stay pending). Permanent HTTP 404s save page HTML once.

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
API_HOURLY_CAP = 60
DEFAULT_HOURLY_BUDGET = 50


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


def read_meta(dest: Path) -> dict | None:
    meta_path = dest / "meta.json"
    if not meta_path.is_file():
        return None
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def already_downloaded(dest: Path) -> bool:
    meta = read_meta(dest)
    files_dir = dest / "files"
    if not meta or not files_dir.is_dir():
        return False
    if not meta.get("download_ok") or not meta.get("hash"):
        return False
    return any(p.is_file() for p in files_dir.rglob("*"))


def is_permanent_miss(dest: Path) -> bool:
    meta = read_meta(dest)
    if not meta:
        return False
    err = str(meta.get("error") or "")
    return (not meta.get("download_ok")) and err.startswith("HTTP 404")


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
    dest.mkdir(parents=True, exist_ok=True)
    headers = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "X-Archive-Client": UA,
    }
    req = urllib.request.Request(page_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            if resp.status != 200:
                return False
            body = resp.read()
    except Exception:
        return False
    if not body:
        return False
    write_bytes(dest / "page.html", body)
    return True


class HourlyBudget:
    """Stay under the skills.sh download API cap (60/hour)."""

    def __init__(self, budget: int) -> None:
        self.budget = max(1, min(budget, API_HOURLY_CAP - 1))
        self.lock = threading.Lock()
        self.exhausted = False
        self.retry_after = 0.0

    def mark_rate_limited(self, retry_after: float) -> None:
        with self.lock:
            self.exhausted = True
            self.retry_after = max(self.retry_after, time.time() + max(1.0, retry_after))

    def allow(self) -> bool:
        with self.lock:
            return not self.exhausted


def http_get_download(url: str, budget: HourlyBudget) -> tuple[int, bytes, dict]:
    headers = {
        "User-Agent": UA,
        "Accept": "application/json",
        "X-Archive-Client": UA,
    }
    last_err: Exception | None = None
    for attempt in range(1, 5):
        if not budget.allow():
            return 429, b'{"error":"rate_limit_exceeded"}', {}
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return resp.status, resp.read(), dict(resp.headers)
        except urllib.error.HTTPError as exc:
            body = exc.read() if exc.fp else b""
            hdrs = dict(exc.headers or {})
            if exc.code == 429:
                retry_after = hdrs.get("Retry-After") or hdrs.get("retry-after")
                try:
                    extra = float(retry_after) if retry_after else 60.0
                except ValueError:
                    extra = 60.0
                budget.mark_rate_limited(extra)
                return 429, body, hdrs
            if exc.code in (500, 502, 503, 504):
                last_err = exc
                time.sleep(min(30.0, 1.5 * (2 ** (attempt - 1))))
                continue
            return exc.code, body, hdrs
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(min(15.0, 1.2 * (2 ** (attempt - 1))))
    if last_err:
        raise last_err
    return 0, b"", {}


def download_one(url: str, budget: HourlyBudget) -> dict:
    skill_id = parse_skill_id(url)
    dest = skill_dir(skill_id)
    if already_downloaded(dest):
        return {"id": skill_id, "status": "skipped", "url": url}
    if is_permanent_miss(dest):
        return {"id": skill_id, "status": "skipped_404", "url": url}
    if not budget.allow():
        return {"id": skill_id, "status": "deferred", "url": url}

    dest.mkdir(parents=True, exist_ok=True)
    encoded = "/".join(urllib.parse.quote(seg, safe="") for seg in skill_id.split("/"))
    api = f"https://skills.sh/api/download/{encoded}"
    try:
        status, body, _ = http_get_download(api, budget)
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

    if status == 429:
        return {
            "id": skill_id,
            "status": "rate_limited",
            "url": url,
            "error": "HTTP 429 rate_limit_exceeded (60/hour)",
        }

    payload = None
    err = None
    if status == 200:
        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            err = f"invalid json: {exc}"
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

    # Permanent / content errors only — not rate limits.
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
        dest = skill_dir(parse_skill_id(url))
        if already_downloaded(dest) or is_permanent_miss(dest):
            continue
        pending.append(url)
    return pending


def count_downloaded() -> int:
    if not SKILLS_DIR.exists():
        return 0
    return sum(
        1
        for meta in SKILLS_DIR.rglob("meta.json")
        if already_downloaded(meta.parent)
    )


def count_permanent_404() -> int:
    if not SKILLS_DIR.exists():
        return 0
    return sum(1 for meta in SKILLS_DIR.rglob("meta.json") if is_permanent_miss(meta.parent))


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
            "has_content": bool(meta.get("download_ok")),
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
        row["has_content"] = bool(info.get("download_ok"))
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
    html_n = stats.get("html_fallback_404", 0)
    fail_n = stats.get("failed", 0)
    lines = [
        "# skills.sh",
        "",
        "Public agent-skills registry (Vercel). Full skill file contents via "
        "`GET /api/download/{owner}/{repo}/{slug}` (`{files, hash}`).",
        "",
        f"- Last updated: {stats.get('updated_at')}",
        f"- Skill URLs in sitemap: {stats.get('sitemap_urls')}",
        f"- Unique ids: {stats.get('unique_ids')}",
        f"- Downloaded OK (files/ + hash): {ok}",
        f"- Permanent API 404 + page HTML fallback: {html_n}",
        f"- Failed: {fail_n}",
        f"- Remaining (no files/ yet): {remaining}",
        f"- API cap: {API_HOURLY_CAP} download requests/hour (live `Retry-After: 60`; "
        f"client budget {stats.get('hourly_budget')}/hour)",
        f"- Concurrency: {stats.get('concurrency')} (keep at 1 while capped)",
        "",
        "Each skill lives at `skills/<owner>/<repo>/<slug>/{meta.json,files/}`.",
        "Per-skill HTML is saved only for permanent download misses (HTTP 404), not for 429s.",
        "Re-run `scripts/download_skills_sh.py` to resume; already-hashed trees are skipped.",
    ]
    write_text(INDEX_PATH, "\n".join(lines))

    err_lines = [
        "# skills.sh errors",
        "",
        f"Updated: {stats.get('updated_at')}",
        "",
        "## Rate limit",
        "",
        "Live `GET /api/download/{owner}/{repo}/{slug}` returns HTTP 429 "
        '`{"error":"rate_limit_exceeded","message":"Rate limit exceeded. '
        'Maximum 60 requests per hour."}` with `Retry-After: 60`.',
        "",
        f"Target is all {stats.get('sitemap_urls')} sitemap ids. "
        f"{ok} have full `files/` + hash. {remaining} remain.",
        "At 50 successful downloads/hour this is a multi-day resume job. "
        "The downloader is resume-friendly and stays under the cap.",
        "",
        "## Permanent misses",
        "",
        f"{html_n} ids returned HTTP 404 from the download API; page HTML was saved once.",
        "",
    ]
    if failed:
        err_lines.append("Recent failures / fallbacks:")
        err_lines.append("")
        for item in failed[:200]:
            err_lines.append(
                f"- `{item.get('id')}` {item.get('status')}: {item.get('error') or ''}".rstrip()
            )
        err_lines.append("")
    err_lines.append(
        f"Resume: `python3 scripts/download_skills_sh.py --concurrency 1 "
        f"--hourly-budget {stats.get('hourly_budget') or DEFAULT_HOURLY_BUDGET} "
        f"--max-new 50 --update-catalog`"
    )
    write_text(ERRORS_PATH, "\n".join(err_lines))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--concurrency", type=int, default=1)
    parser.add_argument("--max-new", type=int, default=0, help="0 = pending, still capped by hourly budget")
    parser.add_argument("--hourly-budget", type=int, default=DEFAULT_HOURLY_BUDGET)
    parser.add_argument("--update-catalog", action="store_true")
    parser.add_argument("--reports-only", action="store_true")
    args = parser.parse_args()

    urls_doc = json.loads(URLS_PATH.read_text(encoding="utf-8"))
    all_urls = list(dict.fromkeys(urls_doc.get("urls") or []))
    pending = load_work_list()
    budget = HourlyBudget(args.hourly_budget)
    if args.max_new and args.max_new > 0:
        batch = pending[: min(args.max_new, budget.budget)]
    else:
        batch = pending[: budget.budget]

    results: list[dict] = []
    if not args.reports_only and batch:
        workers = 1 if args.concurrency < 1 else min(args.concurrency, 4)
        print(
            f"download batch {len(batch)} / pending {len(pending)} / total {len(all_urls)} "
            f"concurrency={workers} hourly_budget={budget.budget}",
            flush=True,
        )
        done = 0
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futs = [pool.submit(download_one, url, budget) for url in batch]
            for fut in as_completed(futs):
                item = fut.result()
                results.append(item)
                done += 1
                if done % 10 == 0 or done == len(batch) or item["status"] == "rate_limited":
                    ok = sum(1 for r in results if r["status"] == "ok")
                    print(
                        f"  progress {done}/{len(batch)} ok={ok} last={item['status']} {item['id']}",
                        flush=True,
                    )
                if item["status"] == "rate_limited":
                    # stop waiting on the rest; they will return deferred
                    break

    downloaded_ok = count_downloaded()
    n404 = count_permanent_404()
    still_pending = load_work_list()
    ok_n = sum(1 for r in results if r["status"] == "ok")
    html_n = sum(1 for r in results if r["status"] == "html_fallback")
    fail_n = sum(1 for r in results if r["status"] == "failed")
    limited = sum(1 for r in results if r["status"] == "rate_limited")
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
        "attempted": int(prev.get("attempted") or 0) + len(
            [r for r in results if r["status"] not in ("skipped", "skipped_404", "deferred")]
        ),
        "downloaded_ok": downloaded_ok,
        "downloaded_ok_this_batch": ok_n,
        "html_fallback_404": n404,
        "html_fallback_this_batch": html_n,
        "failed": fail_n,
        "rate_limited_this_batch": limited,
        "remaining": len(still_pending),
        "concurrency": args.concurrency,
        "hourly_budget": budget.budget,
        "api_hourly_cap": API_HOURLY_CAP,
        "batch_size": len(batch),
        "retry_after_unix": budget.retry_after or None,
    }
    failed_items = [
        r
        for r in results
        if r["status"] in ("failed", "html_fallback", "rate_limited")
    ]
    write_reports(stats, failed_items, len(still_pending))

    catalog_updated = 0
    if args.update_catalog:
        catalog_updated = update_catalog(collect_content_index())
        stats["catalog_rows_updated"] = catalog_updated
        write_json(STATS_PATH, stats)

    print(json.dumps({**stats, "catalog_rows_updated": catalog_updated}, indent=2), flush=True)
    if limited:
        return 3
    return 0 if not still_pending else 2


if __name__ == "__main__":
    sys.exit(main())

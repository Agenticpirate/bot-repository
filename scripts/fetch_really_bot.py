#!/usr/bin/env python3
"""Fetch the public really.bot run archive into sources/really.bot/.

Polite concurrency, retries, and a User-Agent that names this archive repo.
Does not invent serials. Writes index entries and twins verbatim.
"""

from __future__ import annotations

import json
import random
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = REPO_ROOT / "sources" / "really.bot"
RUNS_DIR = SOURCE_DIR / "runs"
META_DIR = SOURCE_DIR / "meta"
CATALOG_PATH = REPO_ROOT / "catalog.json"
ERRORS_PATH = SOURCE_DIR / "errors.jsonl"
ERRORS_MD_PATH = SOURCE_DIR / "ERRORS.md"
INDEX_MD_PATH = SOURCE_DIR / "INDEX.md"

ORIGIN = "https://really.bot"
INDEX_URL = f"{ORIGIN}/runs.json"
META_URLS = {
    "llms.txt": f"{ORIGIN}/llms.txt",
    "bots.md": f"{ORIGIN}/bots.md",
    "ai-info.md": f"{ORIGIN}/ai-info.md",
    "status.json": f"{ORIGIN}/status.json",
}

USER_AGENT = (
    "bot-repository-archive/1.0 "
    "(+https://github.com/Agenticpirate/bot-repository)"
)
CONCURRENCY = 16
RETRIES = 5
TIMEOUT_SEC = 45


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def http_get(url: str, retries: int = RETRIES) -> bytes:
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "*/*",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"HTTP {resp.status} for {url}")
                return resp.read()
        except Exception as exc:  # noqa: BLE001 — retry network/HTTP errors
            last_err = exc
            if attempt == retries:
                break
            delay = min(30.0, (2 ** (attempt - 1)) + random.random())
            time.sleep(delay)
    raise RuntimeError(f"failed after {retries} attempts: {url}: {last_err}")


def write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


def write_text(path: Path, text: str) -> None:
    write_bytes(path, text.encode("utf-8"))


def fetch_index_and_meta() -> dict:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    META_DIR.mkdir(parents=True, exist_ok=True)
    raw = http_get(INDEX_URL)
    write_bytes(SOURCE_DIR / "runs.json", raw)
    index = json.loads(raw.decode("utf-8"))
    for name, url in META_URLS.items():
        write_bytes(META_DIR / name, http_get(url))
    return index


def run_complete(run_dir: Path) -> bool:
    return all(
        (run_dir / name).is_file() and (run_dir / name).stat().st_size > 0
        for name in ("meta.json", "run.json", "run.md")
    )


def fetch_one(entry: dict) -> dict:
    run_id = entry["id"]
    run_dir = RUNS_DIR / run_id
    json_url = entry["json"]
    md_url = entry["markdown"]
    try:
        raw_json = http_get(json_url)
        raw_md = http_get(md_url)
        # Validate JSON without rewriting it.
        parsed = json.loads(raw_json.decode("utf-8"))
        if str(parsed.get("id", run_id)) != str(run_id):
            raise RuntimeError(
                f"id mismatch: index={run_id} body={parsed.get('id')}"
            )
        meta = {
            "source": "really.bot",
            "archived_at": utc_now(),
            "index": entry,
            "local": {
                "run_json": f"sources/really.bot/runs/{run_id}/run.json",
                "run_md": f"sources/really.bot/runs/{run_id}/run.md",
            },
        }
        write_bytes(run_dir / "run.json", raw_json)
        write_bytes(run_dir / "run.md", raw_md)
        write_text(run_dir / "meta.json", json.dumps(meta, indent=2) + "\n")
        return {"id": run_id, "ok": True}
    except Exception as exc:  # noqa: BLE001
        return {"id": run_id, "ok": False, "error": str(exc), "entry": entry}


def catalog_row(entry: dict) -> dict:
    run_id = entry["id"]
    return {
        "source": "really.bot",
        "id": run_id,
        "serial": entry.get("serial"),
        "revision": entry.get("revision"),
        "title": entry.get("title"),
        "url": entry.get("url"),
        "json": entry.get("json"),
        "markdown": entry.get("markdown"),
        "house": entry.get("house"),
        "published_at": entry.get("published_at"),
        "category": entry.get("category"),
        "bot_name": entry.get("bot_name"),
        "would_run_again": entry.get("would_run_again"),
        "connectors": entry.get("connectors") or [],
        "evidence": entry.get("evidence"),
        "grok_share_url": entry.get("grok_share_url"),
        "local": {
            "dir": f"sources/really.bot/runs/{run_id}",
            "meta": f"sources/really.bot/runs/{run_id}/meta.json",
            "json": f"sources/really.bot/runs/{run_id}/run.json",
            "markdown": f"sources/really.bot/runs/{run_id}/run.md",
        },
    }


def write_catalog(entries: list[dict]) -> None:
    """Replace really.bot rows only. Never wipe the rest of catalog.json."""
    rows = [catalog_row(e) for e in entries]
    rows.sort(key=lambda r: (r.get("serial") is None, r.get("serial") or 0, r["id"]))
    existing = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    kept = [r for r in existing if r.get("source") != "really.bot"]
    write_text(CATALOG_PATH, json.dumps(kept + rows, indent=2) + "\n")


def write_index_md(index: dict, ok_ids: set[str], failures: list[dict]) -> None:
    runs = index.get("runs") or []
    lines = [
        "# really.bot archive index",
        "",
        f"Snapshot of [{INDEX_URL}]({INDEX_URL}).",
        "",
        f"- Origin: {index.get('origin', ORIGIN)}",
        f"- Index `updated_at`: {index.get('updated_at', '')}",
        f"- Schema version: {index.get('schema_version', '')}",
        f"- Runs in index: {len(runs)}",
        f"- Fully downloaded (json + md): {len(ok_ids)}",
        f"- Failures: {len(failures)}",
        "",
        "Canonical pages: [really.bot](https://really.bot/). "
        "Do not invent serials. Cite the HTML URL.",
        "",
        "| id | serial | house | title | published | html | twins |",
        "| --- | ---: | ---: | --- | --- | --- | --- |",
    ]
    for entry in sorted(runs, key=lambda r: r.get("serial") or 0, reverse=True):
        run_id = entry["id"]
        title = (entry.get("title") or "").replace("|", "\\|")
        html = entry.get("url") or ""
        json_url = entry.get("json") or ""
        md_url = entry.get("markdown") or ""
        mark = "yes" if run_id in ok_ids else "MISSING"
        lines.append(
            f"| [{run_id}](runs/{run_id}/run.md) | {entry.get('serial')} | "
            f"{entry.get('house')} | {title} | {entry.get('published_at') or ''} | "
            f"[html]({html}) | [json]({json_url}) / [md]({md_url}) · {mark} |"
        )
    lines.append("")
    write_text(INDEX_MD_PATH, "\n".join(lines))


def write_errors_md(failures: list[dict]) -> None:
    lines = [
        "# really.bot fetch errors",
        "",
        f"Generated: {utc_now()}",
        "",
    ]
    if not failures:
        lines += [
            "No failures. Every index entry has both `run.json` and `run.md`.",
            "",
        ]
    else:
        lines += [
            f"{len(failures)} run(s) did not fully download.",
            "",
            "| id | error | json | markdown |",
            "| --- | --- | --- | --- |",
        ]
        for item in failures:
            entry = item.get("entry") or {}
            err = (item.get("error") or "").replace("|", "\\|")
            lines.append(
                f"| {item.get('id')} | {err} | {entry.get('json', '')} | "
                f"{entry.get('markdown', '')} |"
            )
        lines.append("")
    write_text(ERRORS_MD_PATH, "\n".join(lines))


def main() -> int:
    refresh_meta = "--skip-meta" not in sys.argv
    if refresh_meta:
        print("fetching index + meta…", flush=True)
        index = fetch_index_and_meta()
    else:
        index = json.loads((SOURCE_DIR / "runs.json").read_text())
    runs = index.get("runs") or []
    print(f"index runs: {len(runs)}", flush=True)
    RUNS_DIR.mkdir(parents=True, exist_ok=True)

    pending = [e for e in runs if not run_complete(RUNS_DIR / e["id"])]
    print(f"to fetch: {len(pending)} (skipping {len(runs) - len(pending)} complete)", flush=True)

    failures: list[dict] = []
    ok = 0
    if pending:
        with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
            futs = {pool.submit(fetch_one, entry): entry["id"] for entry in pending}
            for i, fut in enumerate(as_completed(futs), start=1):
                result = fut.result()
                if result.get("ok"):
                    ok += 1
                else:
                    failures.append(result)
                    print(f"FAIL {result.get('id')}: {result.get('error')}", flush=True)
                if i % 50 == 0 or i == len(pending):
                    print(f"progress {i}/{len(pending)} ok={ok} fail={len(failures)}", flush=True)

    if failures:
        with ERRORS_PATH.open("a", encoding="utf-8") as fh:
            for item in failures:
                fh.write(json.dumps({"at": utc_now(), **{k: v for k, v in item.items() if k != "entry"}, "urls": {"json": (item.get("entry") or {}).get("json"), "markdown": (item.get("entry") or {}).get("markdown")}}) + "\n")

    ok_ids = {e["id"] for e in runs if run_complete(RUNS_DIR / e["id"])}
    write_catalog([e for e in runs if e["id"] in ok_ids])
    write_index_md(index, ok_ids, failures)
    write_errors_md(failures)
    print(f"done catalog={len(ok_ids)} failures={len(failures)}", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

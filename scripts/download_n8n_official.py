#!/usr/bin/env python3
"""Download official n8n template library from api.n8n.io.

Resume-friendly. Saves slim search index + per-workflow JSON (the importable
`workflow` object). Caps only on rate-limit / HTTP errors.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    http_get,
    upsert_catalog,
    utc_now,
    write_index,
    write_json,
    write_text,
)

ROOT = REPO / "sources" / "n8n.io-workflows"
META = ROOT / "meta"
WFDIR = ROOT / "workflows"
INDEX = META / "index.jsonl"
STATS = META / "download-stats.json"
SEARCH = "https://api.n8n.io/api/templates/search"
DETAIL = "https://api.n8n.io/api/templates/workflows/{id}"
ROWS = 100


def slim_item(w: dict) -> dict:
    user = w.get("user") or {}
    return {
        "id": w.get("id"),
        "name": w.get("name"),
        "description": (w.get("description") or "")[:2000],
        "totalViews": w.get("totalViews"),
        "price": w.get("price"),
        "createdAt": w.get("createdAt"),
        "user": user.get("username") or user.get("name"),
        "nodes": [
            n.get("name") or n.get("displayName")
            for n in (w.get("nodes") or [])
            if isinstance(n, dict)
        ][:40],
    }


def load_index() -> list[dict]:
    if not INDEX.exists():
        return []
    out = []
    for line in INDEX.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def fetch_search_index() -> list[dict]:
    existing = {int(x["id"]): x for x in load_index() if x.get("id") is not None}
    # probe total
    status, body, _ = http_get(f"{SEARCH}?page=1&rows=1")
    if status != 200:
        raise SystemExit(f"search failed HTTP {status}")
    total = int(json.loads(body).get("totalWorkflows") or 0)
    pages = (total + ROWS - 1) // ROWS
    print(f"n8n search total={total} pages={pages} have={len(existing)}", flush=True)
    for page in range(1, pages + 1):
        # skip if this page already fully present (heuristic: enough items)
        status, body, _ = http_get(f"{SEARCH}?page={page}&rows={ROWS}")
        if status != 200:
            print(f"  search page {page} HTTP {status}", flush=True)
            if status in (429, 503):
                break
            continue
        data = json.loads(body)
        added = 0
        for w in data.get("workflows") or []:
            wid = w.get("id")
            if wid is None or int(wid) in existing:
                continue
            existing[int(wid)] = slim_item(w)
            added += 1
        print(f"  page {page}/{pages} +{added} unique={len(existing)}", flush=True)
        time.sleep(0.15)
        if added == 0 and page > 3 and len(existing) >= total * 0.95:
            # already complete
            break
    items = sorted(existing.values(), key=lambda x: int(x["id"]))
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    tmp = INDEX.with_suffix(".jsonl.tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        for item in items:
            fh.write(json.dumps(item, ensure_ascii=False) + "\n")
    tmp.replace(INDEX)
    write_json(
        META / "search-summary.json",
        {"totalWorkflows": total, "indexed": len(items), "updated_at": utc_now()},
    )
    return items


def wf_path(wid: int) -> Path:
    return WFDIR / f"{wid}.json"


def download_one(wid: int) -> str:
    dest = wf_path(wid)
    if dest.exists() and dest.stat().st_size > 20:
        return "skipped"
    status, body, _ = http_get(DETAIL.format(id=wid), accept="application/json")
    if status == 429:
        return "rate_limited"
    if status != 200 or not body:
        return f"http_{status}"
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return "bad_json"
    inner = data.get("workflow") or data
    wf = inner.get("workflow") if isinstance(inner, dict) else None
    payload = {
        "id": inner.get("id", wid) if isinstance(inner, dict) else wid,
        "name": inner.get("name") if isinstance(inner, dict) else None,
        "description": inner.get("description") if isinstance(inner, dict) else None,
        "workflow": wf if isinstance(wf, dict) else inner,
        "categories": inner.get("categories") if isinstance(inner, dict) else None,
        "url": f"https://n8n.io/workflows/{wid}",
        "fetched_at": utc_now(),
    }
    write_json(dest, payload)
    return "ok"


def catalog_rows(items: list[dict], downloaded: int) -> list[dict]:
    rows = [
        {
            "id": "n8n.io-workflows",
            "title": "Official n8n template library",
            "url": "https://n8n.io/workflows",
            "source": "n8n.io-workflows",
            "type": "site",
            "indexed": len(items),
            "downloaded": downloaded,
        }
    ]
    for item in items:
        wid = item.get("id")
        rows.append(
            {
                "id": str(wid),
                "title": item.get("name") or str(wid),
                "url": f"https://n8n.io/workflows/{wid}",
                "source": "n8n.io-workflows",
                "type": "workflow",
                "has_json": wf_path(int(wid)).exists(),
            }
        )
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-new", type=int, default=0, help="0 = all remaining")
    ap.add_argument("--concurrency", type=int, default=6)
    ap.add_argument("--skip-search", action="store_true")
    ap.add_argument("--update-catalog", action="store_true")
    args = ap.parse_args()

    WFDIR.mkdir(parents=True, exist_ok=True)
    META.mkdir(parents=True, exist_ok=True)

    if args.skip_search and INDEX.exists():
        items = load_index()
    else:
        items = fetch_search_index()

    pending = [int(x["id"]) for x in items if not (wf_path(int(x["id"])).exists() and wf_path(int(x["id"])).stat().st_size > 20)]
    if args.max_new:
        pending = pending[: args.max_new]
    print(f"download pending={len(pending)} concurrency={args.concurrency}", flush=True)

    ok = skipped = failed = limited = 0
    fails: list[str] = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futs = {pool.submit(download_one, wid): wid for wid in pending}
        done = 0
        for fut in as_completed(futs):
            wid = futs[fut]
            status = fut.result()
            done += 1
            if status == "ok":
                ok += 1
            elif status == "skipped":
                skipped += 1
            elif status == "rate_limited":
                limited += 1
            else:
                failed += 1
                fails.append(f"{wid} {status}")
            if done % 50 == 0 or done == len(pending) or status == "rate_limited":
                print(f"  {done}/{len(pending)} ok={ok} fail={failed} limited={limited}", flush=True)
            if status == "rate_limited":
                break

    downloaded = sum(1 for p in WFDIR.glob("*.json") if p.stat().st_size > 20)
    stats = {
        "updated_at": utc_now(),
        "indexed": len(items),
        "downloaded": downloaded,
        "ok_this_batch": ok,
        "failed_this_batch": failed,
        "rate_limited": limited,
        "remaining": max(0, len(items) - downloaded),
    }
    write_json(STATS, stats)
    write_index(
        ROOT,
        "Official n8n template library",
        [
            f"Search index via `{SEARCH}` (`totalWorkflows` reported {len(items)}).",
            f"Full workflow JSON: {downloaded} saved under `workflows/{{id}}.json`.",
            f"Remaining {stats['remaining']}. Rate-limited this batch: {limited}.",
            "Resume: `python3 scripts/download_n8n_official.py --update-catalog`.",
        ],
    )
    err = ["# n8n.io-workflows errors", ""]
    if limited:
        err.append(f"- Rate limited after {ok} new downloads.")
    if fails:
        err.append(f"- Failed {len(fails)} (first 20):")
        err.extend(f"  - {x}" for x in fails[:20])
    if not limited and not fails:
        err.append("None.")
    write_text(ROOT / "ERRORS.md", "\n".join(err) + "\n")

    if args.update_catalog:
        upsert_catalog("n8n.io-workflows", catalog_rows(items, downloaded))
    print(json.dumps(stats, indent=2), flush=True)
    if limited:
        return 3
    return 0 if stats["remaining"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())

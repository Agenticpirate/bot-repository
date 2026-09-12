"""trend-scout pipeline entrypoint."""
import datetime as dt
import json
import os
import queue
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(__file__))

from lib import dedupe_items, write_json, load_config, TREND_SCOUT_TIMEOUT_TOTAL
from fetchers import ALL_FETCHERS

MAX_WORKERS = 8


def _run_fetchers_parallel(config, period, limit, outdir, errors, fallback_events):
    """Run every fetcher concurrently (capped at MAX_WORKERS) under a global deadline.

    Each fetcher is isolated: an exception is recorded in errors[] and the rest keep
    going. TREND_SCOUT_TIMEOUT_TOTAL bounds the whole pipeline — sources that have not
    reported by the deadline are recorded as failed and whatever finished is returned.
    Worker threads are daemons so an unfinished straggler cannot block process exit.
    """
    results = queue.Queue()
    gate = threading.Semaphore(MAX_WORKERS)

    def worker(fetcher_fn):
        with gate:
            try:
                items = fetcher_fn(config, period, limit, outdir, errors, fallback_events)
                results.put((fetcher_fn.__name__, items, None))
            except Exception as exc:  # isolate: one bad fetcher must not sink the run
                results.put((fetcher_fn.__name__, None, exc))

    for fetcher_fn in ALL_FETCHERS:
        threading.Thread(target=worker, args=(fetcher_fn,), daemon=True).start()

    all_items = []
    reported = set()
    deadline = time.monotonic() + TREND_SCOUT_TIMEOUT_TOTAL
    for _ in ALL_FETCHERS:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        try:
            name, items, exc = results.get(timeout=remaining)
        except queue.Empty:
            break
        reported.add(name)
        if exc is not None:
            errors.append(f"{name}: {exc}")
        elif items:
            all_items.extend(items)

    for fetcher_fn in ALL_FETCHERS:
        if fetcher_fn.__name__ not in reported:
            errors.append(
                f"{fetcher_fn.__name__}: exceeded total deadline "
                f"{TREND_SCOUT_TIMEOUT_TOTAL}s (source incomplete)"
            )
    return all_items


def main():
    period = sys.argv[1] if len(sys.argv) > 1 else "day"
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    outdir = sys.argv[3] if len(sys.argv) > 3 else "/tmp/trend-scout"

    os.makedirs(outdir, exist_ok=True)
    config = load_config()

    errors = []
    fallback_events = []

    all_items = _run_fetchers_parallel(config, period, limit, outdir, errors, fallback_events)

    deduped = dedupe_items(all_items)

    raw_counts = {}
    for item in all_items:
        raw_counts[item["source"]] = raw_counts.get(item["source"], 0) + 1
    deduped_counts = {}
    for item in deduped:
        deduped_counts[item["source"]] = deduped_counts.get(item["source"], 0) + 1

    now = dt.datetime.now(dt.timezone.utc)
    metadata = {
        "generated_at": now.isoformat(),
        "period": period,
        "limit_per_source": limit,
        "cutoff": (now - dt.timedelta(days=7 if period == "week" else 1)).isoformat(),
        "output_dir": outdir,
        "sources": sorted(raw_counts),
        "raw_counts": raw_counts,
        "deduped_counts": deduped_counts,
        "counts": {
            "raw_items": len(all_items),
            "deduped_items": len(deduped),
            "raw_by_source": raw_counts,
            "deduped_by_source": deduped_counts,
        },
        "errors": errors,
        "fallback_events": fallback_events,
    }
    payload = {
        "metadata": metadata,
        "topics": deduped,
        "meta": metadata,
        "items": deduped,
    }
    write_json(outdir, "all.json", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

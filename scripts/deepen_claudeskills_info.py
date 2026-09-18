#!/usr/bin/env python3
"""Deepen claudeskills.info beyond the 200 listing-page sample.

Writes a compact skill-path shard in meta/ and downloads a bounded extra
HTML sample. Does not add catalog.json rows (100 MiB cap).
"""

from __future__ import annotations

import gzip
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import fetch_many, utc_now, write_index, write_json, write_text  # noqa: E402

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / "sources" / "claudeskills.info"
META = ROOT / "meta"
PAGES = ROOT / "pages"
UA_NOTE = "bot-repository-archive/1.0"
LISTING_EXTRA = (400, 500, 600, 700, 800, 845)
SKILL_SAMPLE = 80


def sitemap_locs_from_children() -> list[str]:
    locs: list[str] = []
    seen: set[str] = set()
    for path in sorted(META.glob("sitemap-child-*.xml")):
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in re.finditer(r"<loc>(https://claudeskills\.info/[^<]+)</loc>", text):
            url = match.group(1).rstrip("/") + "/"
            if url not in seen:
                seen.add(url)
                locs.append(url)
    return locs


def skill_paths(locs: list[str]) -> list[str]:
    out: list[str] = []
    for url in locs:
        path = urlparse(url).path
        if path.startswith("/skills/") and "/page/" not in path and path != "/skills/":
            out.append(path)
    return out


def dest_for_skill(path: str) -> Path:
    rel = path.strip("/").replace("/", "__")
    if len(rel) > 180:
        rel = rel[:180]
    return PAGES / "items" / f"{rel}.html"


def main() -> int:
    META.mkdir(parents=True, exist_ok=True)
    locs = sitemap_locs_from_children()
    paths = skill_paths(locs)
    listing_pages = sorted(
        {
            int(m.group(1))
            for url in locs
            if (m := re.search(r"/skills/page/(\d+)/?$", url))
        }
    )

    # Compact full path list (not catalog.json).
    gz_path = META / "skill-paths.txt.gz"
    gz_path.write_bytes(gzip.compress(("\n".join(paths) + "\n").encode("utf-8"), 9))
    write_json(
        META / "deepen-2026-09-18.json",
        {
            "at": utc_now(),
            "sitemap_locs": len(locs),
            "skill_paths": len(paths),
            "listing_pages_in_sitemap": listing_pages[-1] if listing_pages else 0,
            "skill_paths_file": "meta/skill-paths.txt.gz",
            "note": "Full locs stay in sitemap-child-*.xml. catalog.json keeps the site row only.",
        },
    )

    jobs: list[tuple[str, Path]] = []
    for num in LISTING_EXTRA:
        jobs.append(
            (
                f"https://claudeskills.info/skills/page/{num}/",
                PAGES / "skills" / f"{num}.html",
            )
        )
    # Stratify individual skill HTML across the path list.
    if paths:
        step = max(1, len(paths) // SKILL_SAMPLE)
        sample = paths[::step][:SKILL_SAMPLE]
        for path in sample:
            jobs.append((f"https://claudeskills.info{path}", dest_for_skill(path)))

    ok, fail = fetch_many(jobs, workers=12, force=False)
    listing_on_disk = sum(
        1 for p in (PAGES / "skills").glob("*.html") if p.stem.isdigit()
    )
    items_on_disk = (
        sum(1 for p in (PAGES / "items").glob("*.html"))
        if (PAGES / "items").is_dir()
        else 0
    )
    write_json(
        META / "deepen-2026-09-18.json",
        {
            "at": utc_now(),
            "sitemap_locs": len(locs),
            "skill_paths": len(paths),
            "listing_pages_in_sitemap": listing_pages[-1] if listing_pages else 0,
            "listing_html_on_disk": listing_on_disk,
            "item_html_on_disk": items_on_disk,
            "fetch_ok": ok,
            "fetch_fail": fail,
            "skill_paths_file": "meta/skill-paths.txt.gz",
            "catalog": "unchanged (site row only)",
        },
    )
    write_index(
        ROOT,
        "claudeskills.info",
        [
            f"Deepened `{utc_now()}`. Sitemap still **{len(locs)}** locs "
            f"({len(paths)} skill paths) in `meta/sitemap-child-*.xml`.",
            f"- Listing HTML on disk: **{listing_on_disk}** (original ~200 + extra pages "
            f"{', '.join(str(n) for n in LISTING_EXTRA)}).",
            f"- Individual skill HTML sample: **{items_on_disk}** under `pages/items/`.",
            f"- Full skill path list: `meta/skill-paths.txt.gz` ({len(paths)} paths).",
            "- `catalog.json` keeps the site row only (GitHub 100 MiB cap).",
            "- Canonical pages live on claudeskills.info. Do not invent listings.",
        ],
    )
    print(
        f"claudeskills deepen locs={len(locs)} skill_paths={len(paths)} "
        f"listing_html={listing_on_disk} item_html={items_on_disk} "
        f"fetch_ok={ok} fail={fail}",
        flush=True,
    )
    return 0 if fail < 20 else 2


if __name__ == "__main__":
    raise SystemExit(main())

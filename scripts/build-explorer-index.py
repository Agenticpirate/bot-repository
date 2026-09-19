#!/usr/bin/env python3
"""Build a slim search index for apps/explorer from catalog.json.

Does not modify catalog.json (already near GitHub's size limit).

Modes
-----
  seed  Bounded real rows (default). Safe to commit. `npm run dev` works
        without the full ~234k catalog or the 2TB sources/ tree.
  full  Every catalog row. Needs a machine with catalog.json (and optionally
        sources/ for body previews). Writes gzip NDJSON shards under GitHub
        file limits.

The explorer never invents rows. Every document is copied from catalog.json
or a small published meta file (e.g. sources/agent-hunt.netlify.app/meta/agents.json).
"""

from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

REPO = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO / "catalog.json"
DEFAULT_OUT = REPO / "apps" / "explorer" / "public" / "index"
AGENT_HUNT_META = REPO / "sources" / "agent-hunt.netlify.app" / "meta" / "agents.json"

PRIMARY_TYPES = ("skill", "soul", "bot", "team", "workflow")
TYPE_ALIASES = {
    "skill": "skill",
    "skill-url": "skill",
    "soul": "soul",
    "bot": "bot",
    "grok-bot": "bot",
    "marketplace-bot": "bot",
    "agent": "agent",
    "team": "team",
    "workflow": "workflow",
    "plugin": "plugin",
    "job": "job",
    "task": "job",
    "mcp": "mcp",
    "template": "template",
    "use-case": "template",
    "listing": "listing",
    "listing-url": "listing",
    "page": "page",
    "url": "page",
    "pack": "pack",
    "pack-doc": "pack",
    "meta": "page",
    "site": "page",
    "homepage": "page",
    "profile": "bot",
    "prompt": "template",
    "file": "file",
}

SOUL_NAME_RE = re.compile(r"(?i)(?:^|/)(?:soul|identity)\.md$")
SKILL_NAME_RE = re.compile(r"(?i)(?:^|/)skill\.md$")
WORKFLOW_NAME_RE = re.compile(r"(?i)workflow")
# Always surface these after the 2026-09-18 archive refresh.
PIN_RAW_IDS = {"stalk-bot"}
PIN_SOURCES = {
    "x.ai/bot/marketplace",
    "grokbot-templates.com",
    "grokbottemplates.dev",
    "grokmarket.io",
    "grokbottemplates.app",
    "cobusgreyling.github.io-grok-bot-templates",
    "findskills.org",
    "claudeskills.info",
}
MAX_DESC = 280
MAX_TAGS = 8
MAX_TAG_LEN = 40
MAX_NAME = 160
PREVIEW_BYTES = 8000
SHARD_DOCS = 40_000
GZIP_AFTER_BYTES = 1_500_000


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def as_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float, bool)):
        return str(value)
    return ""


def clip(text: str, n: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= n:
        return text
    return text[: n - 1].rstrip() + "…"


def infer_type(row: dict[str, Any]) -> str:
    raw = as_str(row.get("type")).lower()
    if not raw:
        raw = as_str(row.get("kind")).lower()
    if raw.startswith("kind:"):
        raw = raw[5:]
    mapped = TYPE_ALIASES.get(raw)
    path = local_path(row) or as_str(row.get("path")) or as_str(row.get("id"))
    if mapped == "file" or not mapped:
        if SOUL_NAME_RE.search(path):
            return "soul"
        if SKILL_NAME_RE.search(path):
            return "skill"
        if WORKFLOW_NAME_RE.search(path):
            return "workflow"
        if not mapped:
            if row.get("source") == "really.bot":
                return "job"
            return "listing"
        return "file"
    return mapped


def local_path(row: dict[str, Any]) -> str:
    loc = row.get("local")
    if isinstance(loc, dict):
        for key in ("markdown", "json", "path", "meta", "dir"):
            value = as_str(loc.get(key))
            if value:
                return value
    return as_str(row.get("path"))


def collect_tags(row: dict[str, Any]) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()

    def add(raw: Any) -> None:
        text = clip(as_str(raw), MAX_TAG_LEN)
        key = text.lower()
        if not text or key in seen:
            return
        seen.add(key)
        tags.append(text)

    add(row.get("category"))
    cats = row.get("categories")
    if isinstance(cats, list):
        for item in cats:
            add(item)
    extra = row.get("tags")
    if isinstance(extra, list):
        for item in extra:
            add(item)
    elif isinstance(extra, str):
        for part in extra.split(","):
            add(part)
    return tags[:MAX_TAGS]


def collect_description(row: dict[str, Any]) -> str:
    for key in ("description", "summary", "oneLiner"):
        text = as_str(row.get(key))
        if text:
            return clip(text, MAX_DESC)
    return ""


def collect_updated(row: dict[str, Any]) -> str:
    for key in (
        "updatedAt",
        "updated",
        "published_at",
        "added_at",
        "addedAt",
        "createdAt",
        "scraped_at",
    ):
        text = as_str(row.get(key))
        if text:
            return text
    return ""


def slim_doc(row: dict[str, Any]) -> dict[str, Any] | None:
    source = as_str(row.get("source"))
    raw_id = as_str(row.get("id"))
    name = clip(as_str(row.get("title") or row.get("name")), MAX_NAME)
    url = as_str(row.get("url"))
    if not source or not raw_id or not name:
        return None
    doc: dict[str, Any] = {
        "id": f"{source}::{raw_id}",
        "name": name,
        "type": infer_type(row),
        "source": source,
        "url": url,
    }
    description = collect_description(row)
    if description:
        doc["description"] = description
    tags = collect_tags(row)
    if tags:
        doc["tags"] = tags
    path = local_path(row)
    if path:
        doc["path"] = path
    updated = collect_updated(row)
    if updated:
        doc["updated"] = updated
    return doc


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def enrich_from_agent_hunt(docs: list[dict[str, Any]]) -> int:
    """Fill missing descriptions from the published Agent Hunt meta list."""
    if not AGENT_HUNT_META.exists():
        return 0
    meta = load_json(AGENT_HUNT_META)
    if not isinstance(meta, list):
        return 0
    by_id = {
        as_str(item.get("id")): item
        for item in meta
        if isinstance(item, dict) and as_str(item.get("id"))
    }
    filled = 0
    existing_ids = {d["id"] for d in docs}
    for doc in docs:
        if not doc["id"].startswith("agent-hunt.netlify.app::"):
            continue
        raw_id = doc["id"].split("::", 1)[1]
        item = by_id.get(raw_id)
        if not item:
            continue
        if not doc.get("description"):
            one = as_str(item.get("oneLiner"))
            if one:
                doc["description"] = clip(one, MAX_DESC)
                filled += 1
        if not doc.get("tags") and item.get("category"):
            doc["tags"] = collect_tags(item)
    # Add real meta rows that never made it into catalog.json.
    for item in meta:
        if not isinstance(item, dict):
            continue
        raw_id = as_str(item.get("id"))
        composite = f"agent-hunt.netlify.app::{raw_id}"
        if not raw_id or composite in existing_ids:
            continue
        extra = slim_doc(
            {
                "source": "agent-hunt.netlify.app",
                "id": raw_id,
                "title": item.get("name") or raw_id,
                "url": item.get("url") or item.get("listing_url"),
                "type": "agent",
                "category": item.get("category"),
                "oneLiner": item.get("oneLiner"),
                "addedAt": item.get("addedAt") or item.get("launched"),
            }
        )
        if extra:
            docs.append(extra)
            existing_ids.add(composite)
            filled += 1
    return filled


def row_score(row: dict[str, Any], doc: dict[str, Any]) -> tuple[int, str]:
    score = 0
    if doc.get("description"):
        score += 8
    if doc.get("path"):
        score += 4
    if row.get("has_content") or row.get("has_skill_md") or row.get("has_json") or row.get("has_body"):
        score += 3
    if doc.get("type") in PRIMARY_TYPES:
        score += 2
    if doc.get("tags"):
        score += 1
    # Prefer newer rows when dates exist; empty dates sort last.
    updated = doc.get("updated") or ""
    return (score, updated)


def select_seed(
    rows: list[dict[str, Any]],
    docs: list[dict[str, Any]],
    per_source: int,
    max_docs: int,
) -> list[dict[str, Any]]:
    by_source: dict[str, list[tuple[tuple[int, str], dict[str, Any]]]] = defaultdict(list)
    for row, doc in zip(rows, docs):
        by_source[doc["source"]].append((row_score(row, doc), doc))

    chosen: list[dict[str, Any]] = []
    seen: set[str] = set()

    def take(doc: dict[str, Any]) -> None:
        if doc["id"] in seen or len(chosen) >= max_docs:
            return
        seen.add(doc["id"])
        chosen.append(doc)

    # Guarantee at least one example of each primary type when present.
    by_type: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for doc in docs:
        by_type[doc["type"]].append(doc)
    for kind in PRIMARY_TYPES:
        for doc in by_type.get(kind, [])[:15]:
            take(doc)

    # Pin official stalk-bot + new gallery site rows so /explore shows them.
    for doc in docs:
        raw_id = doc["id"].split("::", 1)[-1]
        if raw_id in PIN_RAW_IDS:
            take(doc)
        if doc["source"] in PIN_SOURCES and raw_id == doc["source"]:
            take(doc)

    for source, items in by_source.items():
        items.sort(key=lambda pair: pair[0], reverse=True)
        limit = per_source
        # Keep a slightly thicker slice of smaller curated sources.
        if len(items) <= 80:
            limit = min(len(items), max(per_source, 40))
        if source in PIN_SOURCES:
            limit = min(len(items), max(limit, 40))
        for _, doc in items[:limit]:
            take(doc)

    # Fill remaining slots with description-rich real rows (e.g. ClawHub summaries).
    overflow = []
    for row, doc in zip(rows, docs):
        if doc.get("description"):
            overflow.append((row_score(row, doc), doc))
    overflow.sort(key=lambda pair: pair[0], reverse=True)
    for _, doc in overflow:
        take(doc)

    return chosen


def read_preview(repo: Path, path_str: str, limit: int) -> dict[str, str] | None:
    path = (repo / path_str).resolve()
    try:
        path.relative_to(repo.resolve())
    except ValueError:
        return None
    if not path.is_file():
        # Directory: try common body files.
        if path.is_dir():
            for name in ("run.md", "agent.md", "SKILL.md", "SOUL.md", "README.md"):
                candidate = path / name
                if candidate.is_file():
                    path = candidate
                    break
            else:
                return None
        else:
            return None
    suffix = path.suffix.lower()
    if suffix not in {".md", ".json", ".txt", ".yml", ".yaml", ".html"}:
        return None
    try:
        data = path.read_bytes()[:limit]
        text = data.decode("utf-8", errors="replace")
    except OSError:
        return None
    kind = "json" if suffix == ".json" else "markdown" if suffix == ".md" else "text"
    return {"kind": kind, "text": text, "path": str(path.relative_to(repo.resolve()))}


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    if isinstance(obj, dict):
        text = json.dumps(obj, ensure_ascii=False, indent=2)
        if not text.endswith("\n"):
            text += "\n"
    path.write_text(text, encoding="utf-8")


def write_shards(out: Path, docs: list[dict[str, Any]], prefix: str) -> list[dict[str, Any]]:
    shard_dir = out / "shards"
    shard_dir.mkdir(parents=True, exist_ok=True)
    for old in shard_dir.glob(f"{prefix}-*"):
        old.unlink()

    shards: list[dict[str, Any]] = []
    for index, start in enumerate(range(0, len(docs), SHARD_DOCS)):
        chunk = docs[start : start + SHARD_DOCS]
        raw = "".join(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n" for doc in chunk)
        raw_bytes = raw.encode("utf-8")
        name = f"{prefix}-{index:03d}.ndjson"
        encoding = "identity"
        target = shard_dir / name
        if len(raw_bytes) >= GZIP_AFTER_BYTES:
            name += ".gz"
            target = shard_dir / name
            target.write_bytes(gzip.compress(raw_bytes, compresslevel=9))
            encoding = "gzip"
        else:
            target.write_bytes(raw_bytes)
        shards.append(
            {
                "file": f"shards/{name}",
                "count": len(chunk),
                "bytes": target.stat().st_size,
                "encoding": encoding,
            }
        )
    return shards


def build(args: argparse.Namespace) -> int:
    catalog_path: Path = args.catalog
    if not catalog_path.exists():
        print(
            f"error: {catalog_path} not found.\n"
            "Full/seed index builds need catalog.json from an archive checkout.\n"
            "The committed seed under apps/explorer/public/index/ is enough to run the app.",
            file=sys.stderr,
        )
        return 2

    print(f"loading {catalog_path} …", flush=True)
    catalog = load_json(catalog_path)
    if not isinstance(catalog, list):
        print("error: catalog.json must be a JSON array", file=sys.stderr)
        return 2

    slims: list[dict[str, Any]] = []
    source_rows: list[dict[str, Any]] = []
    skipped = 0
    for row in catalog:
        if not isinstance(row, dict):
            skipped += 1
            continue
        doc = slim_doc(row)
        if not doc:
            skipped += 1
            continue
        slims.append(doc)
        source_rows.append(row)

    hunt_extra = enrich_from_agent_hunt(slims)
    # Agent Hunt extras have no matching catalog row; pad source_rows for zip in seed mode.
    while len(source_rows) < len(slims):
        source_rows.append({})

    if args.mode == "seed":
        docs = select_seed(source_rows, slims, args.per_source, args.max_docs)
        prefix = "seed"
    else:
        docs = slims
        prefix = "full"

    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)

    previews: dict[str, Any] = {}
    preview_by_source: Counter[str] = Counter()
    if args.previews > 0:
        for doc in docs:
            if len(previews) >= args.previews:
                break
            path = doc.get("path")
            if not path:
                continue
            if preview_by_source[doc["source"]] >= 12:
                continue
            preview = read_preview(args.repo, path, args.preview_bytes)
            if preview:
                previews[doc["id"]] = preview
                preview_by_source[doc["source"]] += 1

    shards = write_shards(out, docs, prefix)
    types = Counter(d["type"] for d in docs)
    sources = Counter(d["source"] for d in docs)

    manifest = {
        "generatedAt": utc_now(),
        "mode": args.mode,
        "catalogRows": len(catalog),
        "indexed": len(docs),
        "skipped": skipped,
        "agentHuntEnriched": hunt_extra,
        "fields": ["id", "name", "type", "source", "url", "description", "tags", "path", "updated"],
        "shards": shards,
        "previews": "previews.json" if previews else None,
        "previewCount": len(previews),
        "types": dict(types.most_common()),
        "sources": dict(sources.most_common()),
        "attribution": (
            "Research mirror of Agenticpirate/bot-repository. "
            "Canonical pages live on the source sites. "
            "Do not invent serials. Do not strip attribution."
        ),
        "seedNote": (
            "Bounded real rows sampled from catalog.json (plus Agent Hunt meta "
            "enrichment). Not the full archive. Rebuild with --mode full on a "
            "machine that has catalog.json."
            if args.mode == "seed"
            else "Full slim index of every catalog.json row."
        ),
    }
    write_json(out / "manifest.json", manifest)
    if previews:
        write_json(out / "previews.json", previews)
    elif (out / "previews.json").exists() and args.mode == "full":
        (out / "previews.json").unlink()

    print(
        f"wrote {len(docs)} docs ({args.mode}) → {out} "
        f"shards={len(shards)} previews={len(previews)} types={len(types)}",
        flush=True,
    )
    for shard in shards:
        print(f"  {shard['file']}  {shard['count']} docs  {shard['bytes']} bytes  {shard['encoding']}")
    return 0


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("seed", "full"), default="seed")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--repo", type=Path, default=REPO)
    parser.add_argument("--per-source", type=int, default=22)
    parser.add_argument("--max-docs", type=int, default=5000)
    parser.add_argument("--previews", type=int, default=250)
    parser.add_argument("--preview-bytes", type=int, default=PREVIEW_BYTES)
    return parser.parse_args(list(argv) if argv is not None else None)


if __name__ == "__main__":
    raise SystemExit(build(parse_args()))

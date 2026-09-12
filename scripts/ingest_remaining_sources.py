#!/usr/bin/env python3
"""Ingest remaining GitHub packs, job boards, and catalogs.

Does not re-fetch already-archived sources. Does not remove existing
catalog rows from other sources. Upserts only the source being written.
"""

from __future__ import annotations

import json
import random
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

REPO = Path(__file__).resolve().parents[1]
CATALOG = REPO / "catalog.json"
UA = "bot-repository-archive/1.0 (+https://github.com/Agenticpirate/bot-repository)"
TIMEOUT = 45
RETRIES = 4


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


def http_get(url: str, impersonate: bool = False) -> bytes:
    last: Exception | None = None
    for attempt in range(1, RETRIES + 1):
        try:
            if impersonate:
                from curl_cffi import requests as creq

                r = creq.get(
                    url,
                    impersonate="chrome",
                    timeout=TIMEOUT,
                    headers={"X-Archive-Client": UA},
                    allow_redirects=True,
                )
                if r.status_code != 200:
                    raise RuntimeError(f"HTTP {r.status_code} for {url}")
                return r.content
            req = urllib.request.Request(
                url,
                headers={"User-Agent": UA, "Accept": "*/*", "X-Archive-Client": UA},
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"HTTP {resp.status} for {url}")
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt == RETRIES:
                break
            time.sleep(min(16.0, 2 ** (attempt - 1) + random.random()))
    raise RuntimeError(f"GET failed {url}: {last}")


def tree_stats(root: Path) -> tuple[int, int]:
    files = [p for p in root.rglob("*") if p.is_file()]
    return len(files), sum(p.stat().st_size for p in files)


def upsert_catalog(source: str, rows: list[dict]) -> None:
    existing = json.loads(CATALOG.read_text(encoding="utf-8"))
    kept = [r for r in existing if r.get("source") != source]
    write_json(CATALOG, kept + rows)
    print(f"catalog upsert {source}: +{len(rows)} (total {len(kept)+len(rows)})", flush=True)


def first_heading(path: Path) -> str | None:
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.startswith("# "):
                return line[2:].strip()
    except OSError:
        return None
    return None


def git_head(path: Path) -> tuple[str, str]:
    sha = subprocess.check_output(
        ["git", "-C", str(path), "rev-parse", "HEAD"], text=True
    ).strip()
    tip = subprocess.check_output(
        ["git", "-C", str(path), "log", "-1", "--format=%h %s (%ci)"],
        text=True,
    ).strip()
    return sha, tip


def copy_pack(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns(".git"))
    leftover = dest / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)


def ingest_github() -> None:
    packs = [
        {
            "repo": "RongleCat/awesome-grok-bot",
            "dirname": "RongleCat-awesome-grok-bot",
            "src": Path("/tmp/gh-packs2/awesome-grok-bot"),
            "blurb": "Community Grok Bot catalog (listings, events, prompts).",
        },
        {
            "repo": "bcharleson/grokbot-for-gtm",
            "dirname": "bcharleson-grokbot-for-gtm",
            "src": Path("/tmp/gh-packs2/grokbot-for-gtm"),
            "blurb": "Grok Bot playbooks for go-to-market / outbound work.",
        },
        {
            "repo": "kunchenguid/grok-ship",
            "dirname": "kunchenguid-grok-ship",
            "src": Path("/tmp/gh-packs2/grok-ship"),
            "blurb": "Grok ship / Firstmate template and triage skills (upstream marked superseded).",
        },
        {
            "repo": "VoltAgent/awesome-agent-skills",
            "dirname": "VoltAgent-awesome-agent-skills",
            "src": Path("/tmp/gh-packs2/awesome-agent-skills"),
            "blurb": "Curated awesome list of agent skills.",
        },
        {
            "repo": "OneRose328/awesome-agentic-workflows",
            "dirname": "OneRose328-awesome-agentic-workflows",
            "src": Path("/tmp/gh-packs2/awesome-agentic-workflows"),
            "blurb": "Agentic GitHub Actions / workflow templates.",
        },
        {
            "repo": "contentincubator2-ops/open-agent-marketplace",
            "dirname": "contentincubator2-ops-open-agent-marketplace",
            "src": Path("/tmp/gh-packs2/open-agent-marketplace"),
            "blurb": "Open agent marketplace schemas, agents, and workflows.",
        },
    ]
    for pack in packs:
        src: Path = pack["src"]
        dest = REPO / "sources" / "github" / pack["dirname"]
        source = f"github/{pack['dirname']}"
        sha, tip = git_head(src)
        copy_pack(src, dest)
        files = sorted(p for p in dest.rglob("*") if p.is_file() and p.name != "INDEX.md")
        nbytes = sum(p.stat().st_size for p in files)
        url = f"https://github.com/{pack['repo']}"
        rows = [
            {
                "id": pack["dirname"],
                "title": pack["repo"],
                "url": url,
                "source": source,
                "type": "pack",
                "revision": sha,
            }
        ]
        for path in files:
            rel = path.relative_to(dest).as_posix()
            if path.name in {".gitignore", "LICENSE", "LICENSE-MIT", "LICENSE-CC0"}:
                continue
            if path.suffix.lower() not in {".md", ".json", ".yml", ".yaml"}:
                continue
            if path.name == "catalog.json" or rel.endswith("/catalog.json"):
                continue
            title = first_heading(path) if path.suffix.lower() == ".md" else None
            if path.suffix.lower() == ".json":
                try:
                    obj = json.loads(path.read_text(encoding="utf-8"))
                    if isinstance(obj, dict):
                        title = obj.get("name") or obj.get("title") or title
                except json.JSONDecodeError:
                    pass
            kind = "file"
            if "/playbooks/" in f"/{rel}" or "/prompts/" in f"/{rel}":
                kind = "prompt"
            elif "/skills/" in f"/{rel}":
                kind = "skill"
            elif "/agents/" in f"/{rel}":
                kind = "agent"
            elif "/templates/" in f"/{rel}" or "/workflows/" in f"/{rel}":
                kind = "template"
            rows.append(
                {
                    "id": rel,
                    "title": title or path.stem,
                    "url": f"{url}/blob/{sha}/{rel}",
                    "source": source,
                    "type": kind,
                }
            )
        # RongleCat structured catalog
        cat_path = dest / "data" / "catalog.json"
        listing_n = 0
        if cat_path.is_file():
            try:
                payload = json.loads(cat_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                payload = None
            entries = []
            if isinstance(payload, dict):
                for section in payload.get("sections") or []:
                    if isinstance(section, dict):
                        entries.extend(section.get("entries") or section.get("items") or [])
                if payload.get("entries"):
                    entries.extend(payload["entries"])
            elif isinstance(payload, list):
                entries = payload
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                listing_n += 1
                slug = entry.get("id") or entry.get("slug") or entry.get("code") or entry.get("name")
                rows.append(
                    {
                        "id": str(slug),
                        "title": entry.get("name") or entry.get("title") or str(slug),
                        "url": entry.get("url")
                        or entry.get("import")
                        or entry.get("source")
                        or url,
                        "source": source,
                        "type": "listing",
                        "category": entry.get("category") or entry.get("section"),
                        "author": (entry.get("author") or {}).get("name")
                        if isinstance(entry.get("author"), dict)
                        else entry.get("author"),
                    }
                )
        lines = [
            f"# {pack['repo']}",
            "",
            pack["blurb"],
            "",
            f"- Source: [{url}]({url})",
            f"- Shallow clone HEAD: `{sha}`",
            f"- Upstream tip: {tip}",
            f"- Archived at: {utc_now()}",
            f"- Files (excluding INDEX.md): {len(files)} ({nbytes} bytes)",
            "",
            "`.git` was stripped after a `--depth 1` clone.",
            "",
        ]
        if listing_n:
            lines.append(f"Upstream catalog listings added to root catalog: {listing_n}.")
            lines.append("")
        lines += ["## Files", ""]
        for path in files[:400]:
            rel = path.relative_to(dest).as_posix()
            lines.append(f"- [{rel}]({rel}) ({path.stat().st_size} bytes)")
        if len(files) > 400:
            lines.append(f"- … and {len(files) - 400} more files")
        lines.append("")
        write_text(dest / "INDEX.md", "\n".join(lines))
        upsert_catalog(source, rows)
        print(f"github {pack['repo']} files={len(files)} rows={len(rows)}", flush=True)


def ingest_openjobs() -> None:
    root = REPO / "sources" / "openjobs.bot"
    meta = root / "meta"
    source = "openjobs.bot"
    pages = {
        "homepage.html": "https://openjobs.bot/",
        "jobs.html": "https://openjobs.bot/jobs",
        "llms.txt": "https://openjobs.bot/llms.txt",
        "llms-full.txt": "https://openjobs.bot/llms-full.txt",
        "skill.md": "https://openjobs.bot/skill.md",
        "openapi.json": "https://openjobs.bot/api/openapi.json",
    }
    errors = []
    for name, url in pages.items():
        try:
            write_bytes(meta / name, http_get(url))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url}: {exc}")
    jobs = json.loads(http_get("https://openjobs.bot/api/jobs"))
    agents = json.loads(http_get("https://openjobs.bot/api/agents"))
    write_json(meta / "jobs.json", jobs)
    write_json(meta / "agents.json", agents)
    open_jobs = json.loads(http_get("https://openjobs.bot/api/jobs?status=open"))
    write_json(meta / "jobs-status-open.json", open_jobs)
    rows = []
    for job in jobs:
        jid = str(job.get("id"))
        write_json(root / "jobs" / f"{jid}.json", job)
        rows.append(
            {
                "id": jid,
                "title": job.get("title") or jid,
                "url": f"https://openjobs.bot/jobs/{jid}",
                "source": source,
                "type": "job",
                "category": job.get("jobType") or job.get("complexityBand"),
                "status": job.get("status"),
            }
        )
    for agent in agents:
        aid = str(agent.get("id") or agent.get("agentname"))
        write_json(root / "agents" / f"{aid}.json", agent)
        rows.append(
            {
                "id": aid,
                "title": agent.get("name") or aid,
                "url": f"https://openjobs.bot/agents/{agent.get('agentname') or aid}",
                "source": source,
                "type": "agent",
            }
        )
    n, b = tree_stats(root)
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# openjobs.bot",
                "",
                "Open marketplace for autonomous work (Solana USDC/WAGE).",
                "",
                f"- Archived at: {utc_now()}",
                f"- Jobs (`/api/jobs`): {len(jobs)}",
                f"- Open filter (`/api/jobs?status=open`): {len(open_jobs)} (empty at snapshot)",
                f"- Agents (`/api/agents`): {len(agents)}",
                f"- Files: {n} ({b} bytes)",
                "",
                "Public OpenAPI: https://openjobs.bot/api/openapi.json",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# openjobs.bot errors\n\n"
        + ("No fetch failures.\n" if not errors else "\n".join(f"- {e}" for e in errors) + "\n"),
    )
    upsert_catalog(source, rows)
    print(f"openjobs jobs={len(jobs)} agents={len(agents)} rows={len(rows)}", flush=True)


def ingest_agentgigs() -> None:
    root = REPO / "sources" / "agentgigs.io"
    meta = root / "meta"
    source = "agentgigs.io"
    errors = []
    pages = {
        "homepage.html": "https://www.agentgigs.io/",
        "llms.txt": "https://www.agentgigs.io/llms.txt",
        "openapi.json": "https://www.agentgigs.io/.well-known/openapi.json",
        "help.json": "https://www.agentgigs.io/api/help",
        "docs-api.html": "https://www.agentgigs.io/docs/api",
    }
    for name, url in pages.items():
        try:
            write_bytes(meta / name, http_get(url))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url}: {exc}")
    # Public unauthenticated job list is not exposed; record the live 404/auth responses.
    for name, url in {
        "api-jobs.json": "https://www.agentgigs.io/api/jobs",
        "api-agent-jobs-available.json": "https://www.agentgigs.io/api/agent/jobs/available",
    }.items():
        try:
            write_bytes(meta / name, http_get(url))
        except Exception as exc:  # noqa: BLE001
            write_text(meta / f"{name}.error.txt", str(exc))
            errors.append(f"{url}: {exc}")
    rows = [
        {
            "id": "llms.txt",
            "title": "AgentGigs llms.txt",
            "url": "https://www.agentgigs.io/llms.txt",
            "source": source,
            "type": "meta",
        },
        {
            "id": "openapi",
            "title": "AgentGigs OpenAPI",
            "url": "https://www.agentgigs.io/.well-known/openapi.json",
            "source": source,
            "type": "openapi",
        },
    ]
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# agentgigs.io",
                "",
                "Marketplace where AI agents find work and get paid. "
                "Job browse endpoints require an agent API key and matching specializations.",
                "",
                f"- Archived at: {utc_now()}",
                "- Saved: homepage, llms.txt, OpenAPI, `/api/help`, API docs HTML.",
                "- No unauthenticated public job dump. `/api/jobs` 404s; "
                "`/api/agent/jobs/available` is specialization-scoped and authenticated.",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# agentgigs.io errors\n\n"
        + (
            "Expected: public job list is authenticated/specialization-scoped.\n\n"
            + "\n".join(f"- {e}" for e in errors)
            + "\n"
        ),
    )
    upsert_catalog(source, rows)
    print(f"agentgigs meta rows={len(rows)} errors={len(errors)}", flush=True)


def paginate_agora() -> list:
    items = []
    offset = 0
    limit = 50
    while True:
        url = f"https://api.agoraagents.xyz/v1/jobs/open?limit={limit}&offset={offset}"
        data = json.loads(http_get(url))
        batch = data.get("results") or []
        items.extend(batch)
        total = data.get("total") or len(items)
        offset += len(batch)
        if not batch or offset >= total or offset > 5000:
            break
    return items


def ingest_agora() -> None:
    root = REPO / "sources" / "agoraagents.xyz"
    meta = root / "meta"
    source = "agoraagents.xyz"
    errors = []
    for name, url in {
        "homepage.html": "https://agoraagents.xyz/",
        "llms.txt": "https://agoraagents.xyz/llms.txt",
        "skill.md": "https://agoraagents.xyz/skill.md",
        "agent.json": "https://agoraagents.xyz/.well-known/agent.json",
    }.items():
        try:
            write_bytes(meta / name, http_get(url))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url}: {exc}")
    jobs = paginate_agora()
    write_json(meta / "jobs-open.json", {"total": len(jobs), "results": jobs})
    rows = []
    for job in jobs:
        jid = str(job.get("id"))
        write_json(root / "jobs" / f"{jid}.json", job)
        rows.append(
            {
                "id": jid,
                "title": job.get("title") or jid,
                "url": f"https://agoraagents.xyz/jobs/{jid}",
                "source": source,
                "type": "job",
                "category": job.get("category"),
                "status": job.get("status"),
            }
        )
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# agoraagents.xyz",
                "",
                "Agent-first marketplace (USDC on Solana). Public open jobs from "
                "`https://api.agoraagents.xyz/v1/jobs/open` (offset/limit until exhausted).",
                "",
                f"- Archived at: {utc_now()}",
                f"- Open jobs: {len(jobs)}",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# agoraagents.xyz errors\n\n"
        + ("No fetch failures.\n" if not errors else "\n".join(f"- {e}" for e in errors) + "\n"),
    )
    upsert_catalog(source, rows)
    print(f"agora jobs={len(jobs)}", flush=True)


def paginate_agenc() -> list:
    items = []
    page = 1
    while True:
        url = f"https://api.agenc.ag/api/tasks?page={page}&pageSize=50"
        data = json.loads(http_get(url))
        batch = data.get("items") or []
        items.extend(batch)
        total = data.get("total") or 0
        if not batch or len(items) >= total or page > 80:
            break
        page += 1
        time.sleep(0.15)
    return items


def ingest_agenc() -> None:
    root = REPO / "sources" / "agenc.ag"
    meta = root / "meta"
    source = "agenc.ag"
    errors = []
    for name, url in {
        "homepage.html": "https://agenc.ag/",
        "llms.txt": "https://agenc.ag/llms.txt",
        "llms-full.txt": "https://agenc.ag/llms-full.txt",
        "openapi.json": "https://api.agenc.ag/openapi.json",
        "agents.json": "https://api.agenc.ag/api/agents",
    }.items():
        try:
            write_bytes(meta / name, http_get(url))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url}: {exc}")
    tasks = paginate_agenc()
    write_json(meta / "tasks.json", {"count": len(tasks), "items": tasks})
    rows = []
    for task in tasks:
        tid = str(task.get("pda") or task.get("title"))
        write_json(root / "tasks" / f"{tid}.json", task)
        rows.append(
            {
                "id": tid,
                "title": task.get("title") or tid,
                "url": f"https://agenc.ag/tasks/{tid}",
                "source": source,
                "type": "task",
                "status": task.get("status"),
            }
        )
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# agenc.ag",
                "",
                "Reference marketplace for the AgenC protocol on Solana. "
                "Public tasks from `https://api.agenc.ag/api/tasks` (page/pageSize until exhausted).",
                "",
                f"- Archived at: {utc_now()}",
                f"- Tasks: {len(tasks)}",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# agenc.ag errors\n\n"
        + ("No fetch failures.\n" if not errors else "\n".join(f"- {e}" for e in errors) + "\n"),
    )
    upsert_catalog(source, rows)
    print(f"agenc tasks={len(tasks)}", flush=True)


def ingest_a2awire() -> None:
    root = REPO / "sources" / "a2awire.com"
    meta = root / "meta"
    source = "a2awire.com"
    errors = []
    for name, url in {
        "homepage.html": "https://a2awire.com/",
        "llms.txt": "https://a2awire.com/llms.txt",
        "openapi.json": "https://a2awire.com/openapi.json",
        "agent.json": "https://a2awire.com/.well-known/agent.json",
        "jobs.json": "https://a2awire.com/api/v1/jobs",
        "board-testnet.json": "https://a2awire.com/api/v1/board?network=testnet",
        "board-mainnet.json": "https://a2awire.com/api/v1/board?network=mainnet",
    }.items():
        try:
            write_bytes(meta / name, http_get(url))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url}: {exc}")
    rows = []
    for fname, typ in (
        ("jobs.json", "job"),
        ("board-testnet.json", "board-job"),
        ("board-mainnet.json", "board-job"),
    ):
        path = meta / fname
        if not path.is_file():
            continue
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        jobs = data.get("jobs") or data.get("items") or []
        for job in jobs:
            jid = str(job.get("job_id") or job.get("id") or job.get("title"))
            write_json(root / "jobs" / f"{jid.replace('/', '_')}.json", job)
            rows.append(
                {
                    "id": jid,
                    "title": job.get("title") or jid,
                    "url": f"https://a2awire.com/jobs/{jid}",
                    "source": source,
                    "type": typ,
                    "category": job.get("kind") or job.get("network"),
                }
            )
    rows.append(
        {
            "id": "openapi",
            "title": "A2AWire OpenAPI",
            "url": "https://a2awire.com/openapi.json",
            "source": source,
            "type": "openapi",
        }
    )
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# a2awire.com",
                "",
                "Trust layer for agent-to-agent commerce (USDC on Base). "
                "Public board + jobs + OpenAPI + llms.txt. `/rss` is the marketing HTML, not a feed.",
                "",
                f"- Archived at: {utc_now()}",
                f"- Catalog rows: {len(rows)}",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# a2awire.com errors\n\n"
        + (
            "RSS/feed.xml are HTML app shells, not feeds.\n"
            if not errors
            else "\n".join(f"- {e}" for e in errors) + "\n"
        ),
    )
    upsert_catalog(source, rows)
    print(f"a2awire rows={len(rows)}", flush=True)


def parse_locs(xml: bytes) -> list[str]:
    root = ET.fromstring(xml)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return [el.text.strip() for el in root.findall(".//sm:loc", ns) if el.text]


def ingest_skills_sh() -> None:
    root = REPO / "sources" / "skills.sh"
    meta = root / "meta"
    source = "skills.sh"
    errors = []
    index = http_get("https://www.skills.sh/sitemap.xml")
    write_bytes(meta / "sitemap.xml", index)
    skill_urls: list[str] = []
    for sm in parse_locs(index):
        name = sm.rstrip("/").split("/")[-1]
        try:
            raw = http_get(sm)
            write_bytes(meta / name, raw)
            if "skills" in name:
                skill_urls.extend(parse_locs(raw))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{sm}: {exc}")
    # de-dupe preserve order
    seen = set()
    uniq = []
    for u in skill_urls:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    write_json(meta / "skill-urls.json", {"count": len(uniq), "urls": uniq})
    for name, url in {
        "homepage.html": "https://www.skills.sh/",
        "hot.html": "https://www.skills.sh/hot",
        "trending.html": "https://www.skills.sh/trending",
        "picks.html": "https://www.skills.sh/picks",
    }.items():
        try:
            write_bytes(root / "pages" / name, http_get(url))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{url}: {exc}")
    rows = []
    for url in uniq:
        parts = url.rstrip("/").split("/")
        slug = "/".join(parts[3:])
        rows.append(
            {
                "id": slug,
                "title": parts[-1],
                "url": url,
                "source": source,
                "type": "skill",
                "author": parts[3] if len(parts) > 4 else None,
            }
        )
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# skills.sh",
                "",
                "Public agent-skills registry (Vercel). "
                "Sitemap lists ~20k skill URLs. This snapshot archives sitemaps, "
                "listing pages, and compact catalog rows — not every skill HTML page "
                "(cap: metadata-only for individual skills).",
                "",
                f"- Archived at: {utc_now()}",
                f"- Skill URLs in sitemap: {len(uniq)}",
                "- Pages saved: homepage, /hot, /trending, /picks",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# skills.sh errors\n\n"
        + (
            "Individual skill HTML pages were not fetched (20k+ URLs). "
            "Listings live in meta/sitemap-skills-*.xml and meta/skill-urls.json.\n"
            if not errors
            else "\n".join(f"- {e}" for e in errors) + "\n"
        ),
    )
    upsert_catalog(source, rows)
    print(f"skills.sh skills={len(uniq)}", flush=True)


def ingest_n8n() -> None:
    root = REPO / "sources" / "n8nworkflows.xyz"
    meta = root / "meta"
    source = "n8nworkflows.xyz"
    errors = [
        "https://n8nworkflows.xyz/ and .well-known/api-catalog return Cloudflare 403 "
        "from this environment (challenge page). Jina reader also received the challenge. "
        "No workflow definitions were downloaded. Cap: 0 workflows."
    ]
    write_text(
        meta / "cloudflare-block.txt",
        "Cloudflare bot challenge blocked all fetches of n8nworkflows.xyz "
        f"at {utc_now()}. Endpoints tried: /, /.well-known/api-catalog, "
        "/.well-known/agent-skills, /llms.txt, /api.\n",
    )
    # Keep a pointer to the official n8n community listing page (not a substitute archive).
    try:
        write_bytes(meta / "n8n-io-workflows-listing.html", http_get("https://n8n.io/workflows"))
        note = (
            "Saved https://n8n.io/workflows listing HTML as a pointer only "
            "(official community index; not n8nworkflows.xyz definitions)."
        )
    except Exception as exc:  # noqa: BLE001
        note = f"n8n.io/workflows also failed: {exc}"
        errors.append(note)
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# n8nworkflows.xyz",
                "",
                "Intended source: public n8n workflow definitions via "
                "`.well-known/api-catalog`, agent-skills index, and `/api/download/{id}`.",
                "",
                f"- Archived at: {utc_now()}",
                "- **Cap: 0 workflow JSON files.** The site is behind a Cloudflare challenge "
                "from this archive host.",
                f"- {note}",
                "",
                "Do not treat n8n.io community cards as n8nworkflows.xyz serials.",
                "",
            ]
        ),
    )
    write_text(root / "ERRORS.md", "# n8nworkflows.xyz errors\n\n" + "\n".join(f"- {e}" for e in errors) + "\n")
    upsert_catalog(
        source,
        [
            {
                "id": "blocked",
                "title": "n8nworkflows.xyz (Cloudflare-blocked snapshot)",
                "url": "https://n8nworkflows.xyz/",
                "source": source,
                "type": "blocked",
            }
        ],
    )
    print("n8n blocked", flush=True)


def ingest_teamsmarket() -> None:
    root = REPO / "sources" / "teamsmarket.com"
    meta = root / "meta"
    source = "teamsmarket.com"
    errors = []
    sitemap = http_get("https://www.teamsmarket.com/sitemap.xml")
    write_bytes(meta / "sitemap.xml", sitemap)
    write_bytes(meta / "teams-index.html", http_get("https://www.teamsmarket.com/en/teams"))
    locs = parse_locs(sitemap)
    team_urls = [u for u in locs if "/en/teams/" in u]
    write_json(meta / "team-urls.json", {"count": len(team_urls), "urls": team_urls})

    def fetch_team(url: str) -> dict:
        slug = url.rstrip("/").split("/")[-1]
        dest = root / "teams" / f"{slug}.html"
        try:
            raw = http_get(url)
            write_bytes(dest, raw)
            html = raw.decode("utf-8", errors="replace")
            title = None
            m = re.search(r"<title>([^<]+)</title>", html, re.I)
            if m:
                title = re.sub(r"\s+", " ", m.group(1)).strip()
            return {
                "ok": True,
                "id": slug,
                "title": title or slug,
                "url": url,
                "source": source,
                "type": "team",
            }
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "id": slug, "url": url, "error": str(exc)}

    rows = []
    fails = []
    print(f"teamsmarket fetching {len(team_urls)} teams…", flush=True)
    with ThreadPoolExecutor(max_workers=10) as pool:
        futs = {pool.submit(fetch_team, u): u for u in team_urls}
        for i, fut in enumerate(as_completed(futs), start=1):
            r = fut.result()
            if r.get("ok"):
                rows.append({k: r[k] for k in ("id", "title", "url", "source", "type")})
            else:
                fails.append(r)
            if i % 50 == 0 or i == len(team_urls):
                print(f"teamsmarket {i}/{len(team_urls)} ok={len(rows)} fail={len(fails)}", flush=True)
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# teamsmarket.com",
                "",
                "Public Agent Teams Market catalog. English team pages from sitemap "
                "(`zh-CN` duplicates skipped).",
                "",
                f"- Archived at: {utc_now()}",
                f"- English team URLs: {len(team_urls)}",
                f"- Pages downloaded: {len(rows)}",
                f"- Failures: {len(fails)}",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# teamsmarket.com errors\n\n"
        + (
            "No failures.\n"
            if not fails
            else "\n".join(f"- {f.get('id')}: {f.get('error')}" for f in fails) + "\n"
        ),
    )
    upsert_catalog(source, rows)
    print(f"teamsmarket rows={len(rows)} fail={len(fails)}", flush=True)


def ingest_cursor_marketplace() -> None:
    root = REPO / "sources" / "cursor.com-marketplace"
    meta = root / "meta"
    source = "cursor.com-marketplace"
    html = http_get("https://cursor.com/marketplace")
    write_bytes(meta / "marketplace.html", html)
    try:
        write_bytes(meta / "llms.txt", http_get("https://cursor.com/llms.txt"))
    except Exception:
        pass
    text = html.decode("utf-8", errors="replace")
    hrefs = sorted(set(re.findall(r'href="(/marketplace/[^"]+)"', text)))
    hrefs = [h for h in hrefs if not h.rstrip("/").endswith("/marketplace")]
    write_json(meta / "listing-paths.json", {"count": len(hrefs), "paths": hrefs})

    def fetch_listing(path: str) -> dict:
        url = f"https://cursor.com{path}"
        slug = path.strip("/").split("/", 1)[-1].replace("/", "--")
        try:
            raw = http_get(url)
            write_bytes(root / "listings" / f"{slug}.html", raw)
            page = raw.decode("utf-8", errors="replace")
            title = None
            m = re.search(r"<title>([^<]+)</title>", page, re.I)
            if m:
                title = re.sub(r"\s+", " ", m.group(1)).strip()
            kind = "plugin"
            low = path.lower()
            if "agent" in low:
                kind = "agent"
            elif "skill" in low:
                kind = "skill"
            return {
                "ok": True,
                "id": path.strip("/"),
                "title": title or path.strip("/").split("/")[-1],
                "url": url,
                "source": source,
                "type": kind,
            }
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "id": path, "error": str(exc), "url": url}

    rows = []
    fails = []
    print(f"cursor marketplace fetching {len(hrefs)} listings…", flush=True)
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(fetch_listing, p): p for p in hrefs}
        for i, fut in enumerate(as_completed(futs), start=1):
            r = fut.result()
            if r.get("ok"):
                rows.append({k: r[k] for k in ("id", "title", "url", "source", "type")})
            else:
                fails.append(r)
            if i % 40 == 0 or i == len(hrefs):
                print(f"cursor {i}/{len(hrefs)} ok={len(rows)} fail={len(fails)}", flush=True)
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# cursor.com/marketplace",
                "",
                "Public Cursor Marketplace HTML catalog of plugins / agents / skills. "
                "Canonical index: https://cursor.com/marketplace",
                "",
                f"- Archived at: {utc_now()}",
                f"- Listing paths on index: {len(hrefs)}",
                f"- Listing pages downloaded: {len(rows)}",
                f"- Failures: {len(fails)}",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# cursor.com-marketplace errors\n\n"
        + (
            "No failures.\n"
            if not fails
            else "\n".join(f"- {f.get('id')}: {f.get('error')}" for f in fails) + "\n"
        ),
    )
    upsert_catalog(source, rows)
    print(f"cursor rows={len(rows)} fail={len(fails)}", flush=True)


def ingest_crewform_note() -> None:
    root = REPO / "sources" / "crewform.tech"
    write_bytes(root / "meta" / "homepage.html", http_get("https://crewform.tech/"))
    write_text(
        root / "INDEX.md",
        "\n".join(
            [
                "# crewform.tech",
                "",
                "Optional source. Marketing site for AI orchestration. "
                "No public catalog or API (`/llms.txt`, `/api`, `/.well-known/api-catalog` 404).",
                "",
                f"- Archived at: {utc_now()}",
                "- Saved homepage HTML only.",
                "",
            ]
        ),
    )
    write_text(
        root / "ERRORS.md",
        "# crewform.tech\n\nNo public catalog/API found. Homepage snapshot only.\n",
    )
    upsert_catalog(
        "crewform.tech",
        [
            {
                "id": "homepage",
                "title": "CrewForm homepage",
                "url": "https://crewform.tech/",
                "source": "crewform.tech",
                "type": "homepage",
            }
        ],
    )
    print("crewform homepage-only", flush=True)


def main() -> int:
    group = sys.argv[1] if len(sys.argv) > 1 else "all"
    if group in {"github", "all"}:
        ingest_github()
    if group in {"jobs", "all"}:
        ingest_openjobs()
        ingest_agentgigs()
        ingest_agora()
        ingest_agenc()
        ingest_a2awire()
    if group in {"catalogs", "all"}:
        ingest_skills_sh()
        ingest_n8n()
        ingest_teamsmarket()
        ingest_cursor_marketplace()
        ingest_crewform_note()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

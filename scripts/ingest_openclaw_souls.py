#!/usr/bin/env python3
"""Archive / deepen OpenClaw + SOUL galleries that are public.

Skips GitHub packs that already have INDEX.md. Does not delete other catalog rows.
clawhub.com is the same app as clawhub.ai (noted, not duplicated).
"""

from __future__ import annotations

import json
import re
import shutil
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    CATALOG,
    REPO,
    UA,
    fetch_many,
    fetch_ok,
    pack_rows,
    sitemap_locs,
    title_from_html,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)

NOW = utc_now()
TMP = Path("/tmp/gh-openclaw")
GH = REPO / "sources" / "github"


def already(dest: Path) -> bool:
    return dest.exists() and (dest / "INDEX.md").exists()


def copy_tree(src: Path, dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns(".git", "node_modules", ".next"))
    leftover = dest / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)
    return sum(1 for p in dest.rglob("*") if p.is_file())


def install_pack(repo: str, dirname: str, src: Path, extra: list[str] | None = None) -> int:
    dest = GH / dirname
    if already(dest):
        print(f"skip existing github/{dirname}", flush=True)
        return 0
    if not src.is_dir():
        print(f"MISSING {src}", flush=True)
        return 0
    n = copy_tree(src, dest)
    rows = pack_rows(dirname, repo, dest, "HEAD")
    lines = [
        f"Shallow clone of https://github.com/{repo}. `.git` stripped. Files: {n}. Archived {NOW}."
    ]
    if extra:
        lines.extend(extra)
    write_index(dest, repo, lines)
    write_text(dest / "ERRORS.md", f"# {repo}\n\nNone.\n")
    upsert_catalog(f"github/{dirname}", rows)
    print(f"pack {dirname} files={n} rows={len(rows)}", flush=True)
    return len(rows)


def slug_path(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return path or "index"


_SECRET_RES = [
    (re.compile(rb"sk_live_[0-9A-Za-z]{16,}"), b"sk_live_REDACTED_ARCHIVE"),
    (re.compile(rb"sk_test_[0-9A-Za-z]{16,}"), b"sk_test_REDACTED_ARCHIVE"),
    (re.compile(rb"AKIA[0-9A-Z]{16}"), b"AKIAREDACTEDARCHIVE00"),
    (re.compile(rb"ghp_[0-9A-Za-z]{20,}"), b"ghp_REDACTED_ARCHIVE"),
    (re.compile(rb"github_pat_[0-9A-Za-z_]{20,}"), b"github_pat_REDACTED_ARCHIVE"),
    (re.compile(rb"xoxb-[0-9][0-9A-Za-z-]{18,}"), b"xoxb-REDACTED"),
    (re.compile(rb"xoxp-[0-9][0-9A-Za-z-]{18,}"), b"xoxp-REDACTED"),
    (re.compile(rb"xoxe-[0-9A-Za-z-]{18,}"), b"xoxe-REDACTED"),
    (re.compile(rb'(?i)("app_secret"\s*:\s*")([^"]{8,})(")'), rb'\1<REDACTED_APP_SECRET>\3'),
    (re.compile(rb"(?i)(app_id[\"']?\s*:\s*[\"'])cli_[A-Za-z0-9]+"), rb"\1cli_REDACTED"),
    (re.compile(rb"ou_[a-zA-Z0-9]{10,}"), b"ou_REDACTED"),
]
_SECRET_PLACEHOLDER = re.compile(
    rb"abc|xxx|example|your[-_]?key|placeholder|redacted|xxxx",
    re.I,
)


def sanitize_secret_bytes(data: bytes) -> bytes:
    """Neutralize credential patterns that trip GitHub push protection."""
    if not data:
        return data
    out = data
    for pat, repl in _SECRET_RES:
        def _sub(match: re.Match[bytes], replacement: bytes = repl) -> bytes:
            if _SECRET_PLACEHOLDER.search(match.group(0)):
                return match.group(0)
            return replacement

        out = pat.sub(_sub, out)
    return out


def http_get_headers(url: str, timeout: float = 40.0) -> tuple[int, bytes, dict[str, str]]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "*/*", "X-Archive-Client": UA},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read(), {k: v for k, v in resp.headers.items()}
    except urllib.error.HTTPError as exc:
        body = exc.read() if exc.fp else b""
        hdrs = {k: v for k, v in (exc.headers.items() if exc.headers else [])}
        return exc.code, body, hdrs
    except Exception as exc:  # noqa: BLE001
        return 0, str(exc).encode(), {}


def retry_after_seconds(headers: dict[str, str], default: float = 8.0) -> float:
    raw = headers.get("Retry-After") or headers.get("retry-after")
    if raw:
        try:
            return max(1.0, float(raw))
        except ValueError:
            pass
    reset = headers.get("Ratelimit-Reset") or headers.get("RateLimit-Reset")
    if reset:
        try:
            val = float(reset)
            if val > 1_000_000_000:
                return max(1.0, min(120.0, val - time.time()))
            return max(1.0, min(120.0, val))
        except ValueError:
            pass
    return default


def looks_like_skill_md(body: bytes) -> bool:
    if not body or len(body) < 21:
        return False
    head = body.lstrip()[:80]
    if head.startswith(b"<") or head.startswith(b"{") or head.startswith(b"["):
        return False
    text = body.lstrip()
    return text.startswith(b"---") or text.startswith(b"# ") or b"name:" in text[:400]


def patch_catalog_unique(old: str, new: str) -> None:
    """Surgical catalog.json edit so we never rewrite the 96MB file."""
    text = CATALOG.read_text(encoding="utf-8")
    n = text.count(old)
    if n != 1:
        raise RuntimeError(f"catalog patch expected 1 match, found {n}")
    CATALOG.write_text(text.replace(old, new, 1), encoding="utf-8")


def fill_clawhub_skill_md(
    skills: list[dict],
    files_root: Path,
    *,
    workers: int = 8,
    stop_429: int = 15,
) -> dict:
    """Download missing SKILL.md. Stops cleanly on a sustained 429 streak."""
    jobs: list[str] = []
    for it in skills:
        slug = it.get("slug") or it.get("name")
        if not slug:
            continue
        dest = files_root / str(slug) / "SKILL.md"
        if dest.exists() and dest.stat().st_size > 20:
            continue
        jobs.append(str(slug))

    stats = {
        "attempted": len(jobs),
        "ok": 0,
        "fail": 0,
        "http_409": 0,
        "http_404": 0,
        "http_429": 0,
        "meta_fallback": 0,
        "stopped_429": False,
        "redacted": 0,
    }
    if not jobs:
        return stats

    stop = threading.Event()
    lock = threading.Lock()
    cooldown_until = 0.0
    consec_429 = 0
    misses: list[dict] = []

    def wait_cooldown() -> None:
        nonlocal cooldown_until
        with lock:
            until = cooldown_until
        delay = until - time.time()
        if delay > 0:
            time.sleep(min(delay, 90.0))

    def mark_429(headers: dict[str, str]) -> None:
        nonlocal cooldown_until, consec_429
        wait = retry_after_seconds(headers)
        with lock:
            consec_429 += 1
            stats["http_429"] += 1
            cooldown_until = max(cooldown_until, time.time() + wait)
            if consec_429 >= stop_429:
                stop.set()
                stats["stopped_429"] = True

    def mark_ok() -> None:
        nonlocal consec_429
        with lock:
            consec_429 = 0

    def save_body(slug: str, body: bytes) -> bool:
        redacted = sanitize_secret_bytes(body)
        dest = files_root / slug / "SKILL.md"
        write_bytes(dest, redacted if redacted.endswith(b"\n") else redacted + b"\n")
        with lock:
            stats["ok"] += 1
            if redacted != body:
                stats["redacted"] += 1
        return True

    def fetch_file(slug: str, extra_q: str = "") -> tuple[int, bytes, dict[str, str]]:
        q = "path=SKILL.md" + extra_q
        url = f"https://clawhub.ai/api/v1/skills/{urllib.parse.quote(slug, safe='')}/file?{q}"
        return http_get_headers(url)

    def one(slug: str) -> str:
        if stop.is_set():
            return "stopped"
        dest = files_root / slug / "SKILL.md"
        if dest.exists() and dest.stat().st_size > 20:
            return "exists"
        wait_cooldown()
        if stop.is_set():
            return "stopped"

        status, body, headers = fetch_file(slug)
        if status == 429:
            mark_429(headers)
            if stop.is_set():
                return "stopped"
            wait_cooldown()
            status, body, headers = fetch_file(slug)
            if status == 429:
                mark_429(headers)
                return "429"

        if status == 409:
            with lock:
                stats["http_409"] += 1
            owner = None
            try:
                payload = json.loads(body.decode("utf-8", "replace"))
                matches = payload.get("matches") or []
                if matches:
                    owner = matches[0].get("ownerHandle")
            except json.JSONDecodeError:
                owner = None
            if owner:
                status, body, headers = fetch_file(
                    slug, extra_q="&owner=" + urllib.parse.quote(str(owner))
                )
                if status == 429:
                    mark_429(headers)
                    return "429"

        if status == 200 and looks_like_skill_md(body):
            mark_ok()
            save_body(slug, body)
            return "ok"

        if status == 404:
            with lock:
                stats["http_404"] += 1
            meta_url = f"https://clawhub.ai/api/v1/skills/{urllib.parse.quote(slug, safe='')}"
            st2, raw2, hdr2 = http_get_headers(meta_url)
            if st2 == 429:
                mark_429(hdr2)
                return "429"
            if st2 == 200:
                try:
                    skill = (json.loads(raw2.decode("utf-8", "replace")) or {}).get("skill") or {}
                    desc = skill.get("description")
                    if isinstance(desc, str) and desc.lstrip().startswith("---"):
                        mark_ok()
                        save_body(slug, desc.encode("utf-8"))
                        with lock:
                            stats["meta_fallback"] += 1
                        return "meta"
                except json.JSONDecodeError:
                    pass

        with lock:
            stats["fail"] += 1
            misses.append({"slug": slug, "status": status, "bytes": len(body)})
        if status not in (404, 409, 0):
            # unexpected hard errors count toward a fail streak only via 429
            pass
        return f"fail-{status}"

    done = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = {pool.submit(one, slug): slug for slug in jobs}
        for fut in as_completed(futs):
            done += 1
            if done % 50 == 0 or done == len(jobs) or stop.is_set():
                print(
                    f"  clawhub file {done}/{len(jobs)} ok={stats['ok']} fail={stats['fail']} "
                    f"404={stats['http_404']} 409={stats['http_409']} 429={stats['http_429']} "
                    f"stop={stats['stopped_429']}",
                    flush=True,
                )
            if stop.is_set():
                break

    if misses:
        miss_path = files_root.parent / "meta" / "skill-md-misses.json"
        write_json(
            miss_path,
            {
                "at": utc_now(),
                "count": len(misses),
                "stopped_429": stats["stopped_429"],
                "items": misses[:5000],
            },
        )
    return stats


def deepen_clawhub() -> None:
    root = REPO / "sources" / "clawhub.ai"
    meta = root / "meta"
    pages = root / "pages"
    files_root = root / "skills"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    files_root.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    fetch_ok("https://clawhub.ai/llms.txt", meta / "llms.txt")
    fetch_ok("https://clawhub.ai/api/v1/openapi.json", meta / "openapi.json")
    fetch_ok("https://clawhub.ai/", pages / "homepage.html")
    fetch_ok("https://clawhub.com/", pages / "clawhub.com-home.html")
    fetch_ok("https://clawhub.ai/skills", pages / "skills.html")

    # Prefer the existing slug dump. Do not paginate more list pages while
    # thousands of SKILL.md bodies are still missing (and catalog.json is capped).
    skill_dir = meta / "skills"
    existing_pages = sorted(skill_dir.glob("page-*.json"))
    skills_path = meta / "skills.json"
    skills: list[dict] = []
    if skills_path.exists():
        dump = json.loads(skills_path.read_text(encoding="utf-8"))
        skills = list(dump.get("items") or [])
        print(f"  clawhub loaded skills.json count={len(skills)} pages={len(existing_pages)}", flush=True)
    else:
        seen: set[str] = set()
        for path in existing_pages:
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            for it in data.get("items") or []:
                slug = it.get("slug") or it.get("name")
                if slug and slug not in seen:
                    seen.add(slug)
                    skills.append(it)
        write_json(skills_path, {"count": len(skills), "items": skills})
    stats = fill_clawhub_skill_md(skills, files_root, workers=16, stop_429=15)
    if stats["fail"]:
        errors.append(
            f"{stats['fail']}/{stats['attempted']} SKILL.md downloads failed "
            f"(404={stats['http_404']} 409={stats['http_409']} 429={stats['http_429']})"
        )
    if stats["stopped_429"]:
        errors.append("Stopped cleanly on sustained file-API HTTP 429 streak.")
    n_md = sum(1 for p in files_root.rglob("SKILL.md") if p.stat().st_size > 20)

    try:
        text = CATALOG.read_text(encoding="utf-8")
        pat = re.compile(
            r'(    "id": "clawhub\.ai",\n    "title": "ClawHub",\n    "url": "https://clawhub\.ai/",\n'
            r'    "source": "clawhub\.ai",\n    "type": "site",\n    "skills": )\d+'
            r'(,\n    "skill_md": )\d+(,)'
        )
        new_text, n = pat.subn(rf"\g<1>{len(skills)}\g<2>{n_md}\3", text, count=1)
        if n != 1:
            raise RuntimeError(f"catalog clawhub site-row matches={n}")
        if new_text != text:
            CATALOG.write_text(new_text, encoding="utf-8")
        print(f"catalog site-row clawhub.ai skills={len(skills)} skill_md={n_md} (surgical, no per-skill replace)", flush=True)
    except RuntimeError as exc:
        errors.append(f"catalog surgical patch skipped: {exc}")
        print(f"catalog surgical patch skipped: {exc}", flush=True)

    write_index(
        root,
        "clawhub.ai",
        [
            f"OpenClaw official skills registry. Refreshed {utc_now()}.",
            "- clawhub.com serves the same app (homepage snapshot saved; not a second catalog).",
            f"- `/api/v1/skills` unique slugs: **{len(skills)}** (pages `000`–`{len(existing_pages) - 1:03d}`; `nextCursor` still live).",
            f"- SKILL.md via `/api/v1/skills/{{slug}}/file?path=SKILL.md`: **{n_md}** (this pass attempted {stats['attempted']} ok={stats['ok']} fail={stats['fail']} meta_fallback={stats['meta_fallback']} 429={stats['http_429']} stopped_429={stats['stopped_429']}).",
            "- Zip download exists at `/api/v1/download?slug=` (not bulk-fetched; markdown preferred).",
            "- `catalog.json` keeps the first 24511 per-skill rows only (GitHub 100MB file cap). Full list: `meta/skills.json`.",
            "- Resume: `PYTHONPATH=scripts python3 -c \"from ingest_openclaw_souls import deepen_clawhub; deepen_clawhub()\"`.",
        ],
    )
    hist = [
        "First SKILL.md pass (pages 000–539 / 24511 slugs): 1945/19564 file-API misses.",
        "Push-protection redactions (example credentials in public skill docs, not invented):",
        "  - `skills/technews-daily-report/SKILL.md` Feishu `app_id` / `app_secret` / `member_id`",
        "  - `skills/slack-integration/SKILL.md` Slack bot token / signing secret examples",
        "Pages 540–939 added **19458** more slugs (total **43969**). File-API for those bodies previously hit a hard fail streak and was stopped.",
        "`nextCursor` still live after page 939.",
        "`catalog.json` keeps the first 24511 per-skill rows only (GitHub 100MB file cap). Full list: `meta/skills.json`.",
    ]
    write_text(
        root / "ERRORS.md",
        "# clawhub.ai\n\n"
        + "\n".join(f"- {e}" for e in hist + errors)
        + "\n",
    )
    print(f"clawhub skills={len(skills)} skill_md={n_md} stats={stats}", flush=True)


def ingest_openclaw_au() -> None:
    root = REPO / "sources" / "openclaw.com.au"
    if already(root) and (root / "meta" / "sitemap.xml").exists():
        print("openclaw.com.au already indexed", flush=True)
        return
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    errors = []
    for url, dest in (
        ("https://openclaw.com.au/sitemap.xml", meta / "sitemap.xml"),
        ("https://openclaw.com.au/skills", pages / "skills.html"),
        ("https://openclaw.com.au/", pages / "home.html"),
    ):
        if not fetch_ok(url, dest):
            errors.append(f"{url} failed")
    locs = sitemap_locs((meta / "sitemap.xml").read_bytes()) if (meta / "sitemap.xml").exists() else []
    write_json(meta / "sitemap-locs.json", locs)
    jobs = [(u, pages / f"{slug_path(u).replace('/', '__') or 'index'}.html") for u in locs]
    ok, fail = fetch_many(jobs, workers=8)
    rows = [
        {
            "id": "openclaw.com.au",
            "title": "OpenClaw Australia skills directory",
            "url": "https://openclaw.com.au/skills",
            "source": "openclaw.com.au",
            "type": "site",
            "sitemap_urls": len(locs),
        }
    ]
    for url in locs:
        dest = pages / f"{slug_path(url).replace('/', '__') or 'index'}.html"
        title = title_from_html(dest.read_bytes()) if dest.exists() else slug_path(url)
        rows.append(
            {
                "id": f"openclaw.com.au/{slug_path(url)}",
                "title": title or slug_path(url),
                "url": url,
                "source": "openclaw.com.au",
                "type": "page",
            }
        )
    write_index(
        root,
        "openclaw.com.au",
        [
            "OpenClaw skills / docs directory (Australia).",
            f"- Last updated: {NOW}",
            f"- Sitemap URLs: **{len(locs)}** (HTML ok={ok} fail={fail})",
            "- No public JSON/API; `/api/skills` 404. Guide pages only, not per-skill bodies.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        "# openclaw.com.au\n\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.\n"),
    )
    upsert_catalog("openclaw.com.au", rows)
    print(f"openclaw.com.au rows={len(rows)}", flush=True)


def ingest_soulid() -> None:
    root = REPO / "sources" / "agent.soulid.io"
    meta = root / "meta"
    pages = root / "pages"
    meta.mkdir(parents=True, exist_ok=True)
    pages.mkdir(parents=True, exist_ok=True)
    if not fetch_ok("https://agent.soulid.io/", pages / "home.html"):
        write_text(root / "ERRORS.md", "# agent.soulid.io\n\nHomepage failed.\n")
        return
    html = (pages / "home.html").read_text(encoding="utf-8", errors="replace")
    hrefs = sorted(set(re.findall(r'href="(/agents/[^"]+)"', html)))
    write_json(meta / "agent-hrefs.json", hrefs)
    jobs = []
    for href in hrefs:
        rel = href.strip("/").replace("/", "__")
        jobs.append((f"https://agent.soulid.io{href}", pages / f"{rel}.html"))
    ok, fail = fetch_many(jobs, workers=12)
    rows = [
        {
            "id": "agent.soulid.io",
            "title": "SoulID agent marketplace",
            "url": "https://agent.soulid.io/",
            "source": "agent.soulid.io",
            "type": "site",
            "agents": len(hrefs),
        }
    ]
    for href in hrefs:
        dest = pages / f"{href.strip('/').replace('/', '__')}.html"
        title = title_from_html(dest.read_bytes()) if dest.exists() else href.rsplit("/", 1)[-1]
        rows.append(
            {
                "id": f"agent.soulid.io{href}",
                "title": title or href.rsplit("/", 1)[-1],
                "url": f"https://agent.soulid.io{href}",
                "source": "agent.soulid.io",
                "type": "agent",
            }
        )
    write_index(
        root,
        "agent.soulid.io",
        [
            "SoulID public agent marketplace.",
            f"- Last updated: {NOW}",
            f"- Agent hrefs on homepage: **{len(hrefs)}** (HTML ok={ok} fail={fail})",
            "- No public JSON/API (`/api/agents` 404). Related pack: cerealskill/openclaw-agents (SOUL.md).",
        ],
    )
    write_text(
        root / "ERRORS.md",
        f"# agent.soulid.io\n\nNo public JSON. HTML fail={fail}. kriptoburak/open-agent-marketplace is not a public GitHub repo.\n",
    )
    upsert_catalog("agent.soulid.io", rows)
    print(f"soulid agents={len(hrefs)} ok={ok}", flush=True)


def deepen_clawskills() -> None:
    root = REPO / "sources" / "clawskills.sh"
    meta = root / "meta"
    pages = root / "pages"
    hrefs_path = meta / "skill-hrefs.json"
    if not hrefs_path.exists():
        print("clawskills hrefs missing", flush=True)
        return
    hrefs = json.loads(hrefs_path.read_text(encoding="utf-8"))
    jobs = []
    for href in hrefs:
        rel = href.strip("/").replace("/", "__") or "index"
        dest = pages / f"{rel}.html"
        if dest.exists() and dest.stat().st_size > 200:
            continue
        jobs.append((f"https://clawskills.sh{href}", dest))
    ok, fail = fetch_many(jobs, workers=16) if jobs else (0, 0)
    n_pages = sum(1 for p in pages.glob("skills__*.html") if p.stat().st_size > 200)
    write_index(
        root,
        "clawskills.sh",
        [
            "OpenClaw skill gallery.",
            f"- Last updated: {NOW}",
            f"- Skill hrefs: **{len(hrefs)}**; skill HTML on disk: **{n_pages}** (this pass attempted {len(jobs)} ok={ok} fail={fail})",
            "- No public JSON dump.",
        ],
    )
    print(f"clawskills remaining fetch jobs={len(jobs)} ok={ok} fail={fail} on_disk={n_pages}", flush=True)


def note_kriptoburak() -> None:
    root = REPO / "sources" / "kriptoburak-open-agent-marketplace"
    if already(root):
        return
    write_index(
        root,
        "kriptoburak/open-agent-marketplace",
        [
            f"Probe {NOW}.",
            "- https://github.com/kriptoburak/open-agent-marketplace → **404** (user/repo not public).",
            "- GitHub user `kriptoburak` 404.",
            "- Already-archived related pack: `sources/github/contentincubator2-ops-open-agent-marketplace/`.",
        ],
    )
    write_text(root / "ERRORS.md", "# kriptoburak/open-agent-marketplace\n\nGitHub 404; not archived.\n")
    upsert_catalog(
        "kriptoburak-open-agent-marketplace",
        [
            {
                "id": "kriptoburak-open-agent-marketplace",
                "title": "kriptoburak/open-agent-marketplace",
                "url": "https://github.com/kriptoburak/open-agent-marketplace",
                "source": "kriptoburak-open-agent-marketplace",
                "type": "miss",
                "http": 404,
            }
        ],
    )


def deepen_souls_leftover() -> dict:
    """Fill missing souls.directory SOUL.md without adding catalog rows."""
    root = REPO / "sources" / "souls.directory"
    dest_root = root / "souls"
    dest_root.mkdir(parents=True, exist_ok=True)
    text = (root / "llms.txt").read_text(encoding="utf-8", errors="replace")
    apis = sorted(set(re.findall(r"https://souls\.directory/api/souls/[^\s)`]+", text)))
    jobs: list[tuple[str, Path]] = []
    for url in apis:
        parts = urlparse(url).path.strip("/").split("/")
        if len(parts) < 4:
            continue
        handle, slug = parts[2], parts[3]
        if slug.endswith(".md"):
            slug = slug[:-3]
        dest = dest_root / handle / f"{slug}.md"
        if dest.exists() and dest.stat().st_size > 20:
            continue
        jobs.append((url, dest))

    stats = {"attempted": len(jobs), "ok": 0, "fail": 0, "http_429": 0, "stopped_429": False}
    if not jobs:
        print("souls leftover: nothing missing", flush=True)
        return stats

    stop = threading.Event()
    lock = threading.Lock()
    consec_429 = 0

    def one(item: tuple[str, Path]) -> str:
        nonlocal consec_429
        url, dest = item
        if stop.is_set():
            return "stopped"
        if dest.exists() and dest.stat().st_size > 20:
            return "exists"
        status, body, headers = http_get_headers(url)
        if status == 429:
            with lock:
                consec_429 += 1
                stats["http_429"] += 1
                if consec_429 >= 15:
                    stop.set()
                    stats["stopped_429"] = True
            return "429"
        if status == 200 and body and len(body) > 20 and not body.lstrip().startswith(b"<"):
            write_bytes(dest, sanitize_secret_bytes(body))
            with lock:
                consec_429 = 0
                stats["ok"] += 1
            return "ok"
        with lock:
            stats["fail"] += 1
        return f"fail-{status}"

    done = 0
    with ThreadPoolExecutor(max_workers=12) as pool:
        futs = {pool.submit(one, job): job for job in jobs}
        for fut in as_completed(futs):
            done += 1
            if done % 100 == 0 or done == len(jobs) or stop.is_set():
                print(
                    f"  souls leftover {done}/{len(jobs)} ok={stats['ok']} fail={stats['fail']} "
                    f"429={stats['http_429']} stop={stats['stopped_429']}",
                    flush=True,
                )
            if stop.is_set():
                break

    n = sum(1 for _ in dest_root.rglob("*.md") if _.stat().st_size > 20)
    write_json(
        root / "meta" / "soul-download-stats.json",
        {"apis": len(apis), "attempted": len(jobs), "ok": stats["ok"], "fail": stats["fail"], "on_disk": n, "at": utc_now(), "stopped_429": stats["stopped_429"]},
    )
    write_index(
        root,
        "souls.directory",
        [
            f"OpenClaw SOUL.md directory. Refreshed {utc_now()}.",
            f"API URLs in llms.txt: **{len(apis)}**. SOUL.md on disk: **{n}** (this pass {stats['ok']} ok / {stats['fail']} fail; 429={stats['http_429']} stopped_429={stats['stopped_429']}).",
            "Fetched via `GET /api/souls/{handle}/{slug}.md`.",
            "Catalog keeps existing soul rows only (no extra catalog.json growth).",
        ],
    )
    write_text(
        root / "ERRORS.md",
        f"# souls.directory\n\nThis-pass SOUL.md failures: {stats['fail']}. 429={stats['http_429']} stopped_429={stats['stopped_429']}.\n",
    )
    try:
        text = CATALOG.read_text(encoding="utf-8")
        pat = re.compile(
            r'(    "id": "souls\.directory",\n    "title": "souls\.directory",\n    "url": "https://souls\.directory/",\n'
            r'    "source": "souls\.directory",\n    "type": "site",\n    "soul_md": )\d+'
        )
        new_text, nsub = pat.subn(rf"\g<1>{n}", text, count=1)
        if nsub == 1 and new_text != text:
            CATALOG.write_text(new_text, encoding="utf-8")
            print(f"catalog site-row souls.directory soul_md={n} (surgical)", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"souls catalog patch skipped: {exc}", flush=True)
    print(f"souls leftover ok={stats['ok']} fail={stats['fail']} on_disk={n}", flush=True)
    return stats


def main() -> int:
    print(f"ingest_openclaw_souls start {NOW}", flush=True)
    deepen_clawhub()
    ingest_openclaw_au()
    ingest_soulid()

    install_pack(
        "cerealskill/openclaw-agents",
        "cerealskill-openclaw-agents",
        TMP / "cerealskill-openclaw-agents",
        ["527 SOUL.md + 522 IDENTITY.md agent bundles."],
    )
    install_pack(
        "thedaviddias/souls-directory",
        "thedaviddias-souls-directory",
        TMP / "thedaviddias-souls-directory",
        ["Source repo for souls.directory."],
    )
    install_pack(
        "raulvidis/openclaw-multi-agent-kit",
        "raulvidis-openclaw-multi-agent-kit",
        TMP / "raulvidis-openclaw-multi-agent-kit",
        ["SOUL/IDENTITY/skill templates."],
    )
    install_pack(
        "Humain-Cloud/HumAIn-Uno",
        "Humain-Cloud-HumAIn-Uno",
        TMP / "Humain-Cloud-HumAIn-Uno",
        ["Product + TypeScript seed-agents scripts (no separate public JSON dump)."],
    )
    note_kriptoburak()

    print("souls.directory leftover pass", flush=True)
    deepen_souls_leftover()
    deepen_clawskills()
    print("ingest_openclaw_souls done", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Fast secondary downloads (no multi-retry) while skills.sh cap is closed."""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)

UA = "bot-repository-archive/1.0 (+https://github.com/Agenticpirate/bot-repository)"
NOW = utc_now()


def get_once(url: str, timeout: float = 20.0) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read() if exc.fp else b""
    except Exception:
        return 0, b""


def save_if_ok(url: str, dest: Path, min_len: int = 40) -> bool:
    if dest.exists() and dest.stat().st_size >= min_len:
        return True
    st, body = get_once(url)
    if st != 200 or not body or len(body) < min_len:
        return False
    if body.lstrip().startswith(b"<"):
        return False
    write_bytes(dest, body)
    return True


def download_souls() -> dict:
    root = REPO / "sources" / "souls.directory"
    dest_root = root / "souls"
    dest_root.mkdir(parents=True, exist_ok=True)
    text = (root / "llms.txt").read_text(encoding="utf-8", errors="replace")
    apis = sorted(set(re.findall(r"https://souls\.directory/api/souls/[^\s)`]+", text)))
    jobs = []
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
    ok = fail = 0
    with ThreadPoolExecutor(max_workers=24) as pool:
        futs = {pool.submit(save_if_ok, u, d, 20): (u, d) for u, d in jobs}
        done = 0
        for fut in as_completed(futs):
            if fut.result():
                ok += 1
            else:
                fail += 1
            done += 1
            if done % 400 == 0:
                print(f"  souls {done}/{len(jobs)} ok={ok} fail={fail}", flush=True)
    n = sum(1 for _ in dest_root.rglob("*.md"))
    write_json(root / "meta" / "soul-download-stats.json", {"apis": len(apis), "attempted": len(jobs), "ok": ok, "fail": fail, "on_disk": n, "at": NOW})
    rows = [
        {
            "id": "souls.directory",
            "title": "souls.directory",
            "url": "https://souls.directory/",
            "source": "souls.directory",
            "type": "site",
            "soul_md": n,
        }
    ]
    for path in sorted(dest_root.rglob("*.md")):
        handle, slug = path.parent.name, path.stem
        rows.append(
            {
                "id": f"soul:{handle}/{slug}",
                "title": slug,
                "url": f"https://souls.directory/souls/{handle}/{slug}",
                "source": "souls.directory",
                "type": "soul",
                "has_content": True,
            }
        )
    upsert_catalog("souls.directory", rows)
    write_index(
        root,
        "souls.directory",
        [
            f"OpenClaw SOUL.md directory. Refreshed {NOW}.",
            f"API URLs in llms.txt: **{len(apis)}**. SOUL.md on disk: **{n}** (this pass {ok} ok / {fail} fail).",
            "Fetched via `GET /api/souls/{handle}/{slug}.md`.",
        ],
    )
    write_text(root / "ERRORS.md", f"# souls.directory\n\nThis-pass SOUL.md failures: {fail}.\n")
    print(f"souls done ok={ok} fail={fail} on_disk={n}", flush=True)
    return {"ok": ok, "fail": fail, "on_disk": n}


def guess_paths(route: str, repo: str = "") -> list[str]:
    slug = route.strip("/")
    out = [slug]
    if "-skills-" in slug:
        out.append(slug.replace("-skills-", "/skills/", 1))
    m = re.match(r"docs-([a-z]{2})-([a-z]{2})-skills-(.+)", slug)
    if m:
        out.append(f"docs/{m.group(1)}-{m.group(2)}/skills/{m.group(3)}")
        out.append(f"docs/{m.group(1)}/{m.group(2)}/skills/{m.group(3)}")
    if slug.startswith("skills-"):
        out.append("skills/" + slug[7:])
        if repo == "skills":
            out.append(slug[7:])
    if slug.startswith("optional-skills-"):
        out.append("optional-skills/" + slug[16:])
    if slug.startswith("claude-skills-"):
        out.append(slug[14:])
        out.append("skills/" + slug[14:])
        out.append("claude-skills/" + slug[14:])
    if slug.startswith("agents-skills-"):
        out.append("agents/skills/" + slug[14:])
    if slug.startswith("openclaw-skills-"):
        out.append("skills/" + slug[16:])
        out.append("openclaw-skills/" + slug[16:])
    if slug.startswith("plugins-") and "-skills-" in slug:
        left, right = slug.split("-skills-", 1)
        out.append(left.replace("-", "/", 1) + "/skills/" + right)
    return list(dict.fromkeys(out))[:8]


def download_skillsmp(limit: int = 2500) -> dict:
    root = REPO / "sources" / "skillsmp.com"
    dest_root = root / "skills-from-sitemap"
    dest_root.mkdir(parents=True, exist_ok=True)
    locs = []
    for name in ("skills-popular-locs.json", "skills-discovered-locs.json"):
        p = root / "meta" / name
        if p.exists():
            locs.extend(json.loads(p.read_text()))
    jobs = []
    for loc in dict.fromkeys(locs):
        parts = urlparse(loc).path.strip("/").split("/")
        if len(parts) < 4 or parts[0] != "creators":
            continue
        owner, repo, route = parts[1], parts[2], "/".join(parts[3:])
        dest = dest_root / owner / repo / route / "SKILL.md"
        if dest.exists() and dest.stat().st_size > 40:
            continue
        # Previously blocked by GitHub push protection (example secret in file).
        if (owner, repo, route) == (
            "fstln-dev",
            "fl-workspace",
            "skills-feishu-connect",
        ):
            continue
        jobs.append((owner, repo, route, dest, loc))
        if len(jobs) >= limit:
            break

    def one(job) -> bool:
        owner, repo, route, dest, loc = job
        for path in guess_paths(route, repo):
            url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}/SKILL.md"
            if save_if_ok(url, dest, 40):
                write_json(dest.parent / "meta.json", {"github_raw": url, "skillmp": loc, "fetched_at": NOW})
                return True
        return False

    ok = fail = 0
    with ThreadPoolExecutor(max_workers=20) as pool:
        futs = [pool.submit(one, j) for j in jobs]
        done = 0
        for fut in as_completed(futs):
            if fut.result():
                ok += 1
            else:
                fail += 1
            done += 1
            if done % 250 == 0:
                print(f"  skillsmp {done}/{len(jobs)} ok={ok} fail={fail}", flush=True)
    n = sum(1 for _ in dest_root.rglob("SKILL.md"))
    search_n = sum(1 for _ in (root / "skills").rglob("SKILL.md")) if (root / "skills").exists() else 0
    write_json(root / "meta" / "sitemap-github-md-stats.json", {"jobs": len(jobs), "ok": ok, "fail": fail, "on_disk": n, "at": NOW})
    write_index(
        root,
        "skillsmp.com",
        [
            f"SkillsMP public API + GitHub raw SKILL.md. Refreshed {NOW}.",
            f"Search-unique GitHub SKILL.md: **{search_n}**. Sitemap→raw this pass: **{ok}** ok / **{fail}** miss; sitemap tree on disk: **{n}**.",
            "No official content-download API. Anonymous search 50/day.",
        ],
    )
    print(f"skillsmp done ok={ok} fail={fail} on_disk={n} search={search_n}", flush=True)
    return {"ok": ok, "fail": fail, "on_disk": n, "search": search_n}


def openclaw_and_retries() -> None:
    root = REPO / "sources" / "openclawskills.io"
    pages = root / "pages"
    pages.mkdir(parents=True, exist_ok=True)
    st, body = get_once("https://openclawskills.io/skills")
    if st == 200 and body:
        write_bytes(pages / "skills.html", body)
        html = body.decode("utf-8", "replace")
        hrefs = sorted(set(re.findall(r'href="(/skills/[^"?#]+)"', html)))
        write_json(root / "meta" / "skill-hrefs.json", hrefs)
        saved = 0
        for href in hrefs:
            slug = href.rstrip("/").split("/")[-1]
            dest = pages / "skills" / f"{slug}.html"
            st2, b2 = get_once("https://openclawskills.io" + href)
            if st2 == 200 and b2:
                write_bytes(dest, b2)
                saved += 1
        write_index(root, "OpenClaw Skills", [f"Gallery {NOW}. hrefs={len(hrefs)} pages={saved}."])
        print(f"openclaw hrefs={len(hrefs)} saved={saved}", flush=True)
    notes = {}
    for url in (
        "https://skillkit.io/",
        "https://skillkit.io/api/skills",
        "https://api.agent37.com/v1/skills",
        "https://www.agent37.com/skills",
    ):
        st, body = get_once(url)
        notes[url] = st
        print(f"retry {st} {url}", flush=True)
    write_text(
        REPO / "sources" / "skillkit.io" / "ERRORS.md",
        f"# skillkit.io\n\nRetry {NOW}: homepage HTTP {notes.get('https://skillkit.io/')}. Still no unauthenticated dump.\n",
    )
    write_text(
        REPO / "sources" / "agent37.com" / "ERRORS.md",
        f"# agent37.com\n\nRetry {NOW}: `/v1/skills` HTTP {notes.get('https://api.agent37.com/v1/skills')} (still auth-gated).\n",
    )
    write_json(REPO / "sources" / "skillkit.io" / "meta" / "retry.json", {"at": NOW, "http": notes})


def main() -> int:
    print("=== souls ===", flush=True)
    download_souls()
    print("=== skillsmp ===", flush=True)
    download_skillsmp()
    print("=== openclaw/retries ===", flush=True)
    openclaw_and_retries()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

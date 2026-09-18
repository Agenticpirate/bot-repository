#!/usr/bin/env python3
"""Live probe of bot/skill/Grok galleries for the 2026-09-18 source audit.

Does not invent listings. Writes docs/meta JSON only. Does not touch catalog.json.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "docs" / "meta" / "source-audit-2026-09-18.json"
UA = "bot-repository-archive/1.0 (+https://github.com/Agenticpirate/bot-repository)"
TIMEOUT = 25
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

# url, label, expected_local_source, notes
CANDIDATES: list[tuple[str, str, str, str]] = [
    # Official Grok
    ("https://x.ai/bot/marketplace", "x.ai marketplace index", "x.ai-bot-marketplace", "official bots tab"),
    ("https://x.ai/sitemap.xml", "x.ai sitemap", "x.ai-bot-marketplace", "bot + category locs"),
    ("https://x.ai/bot/marketplace/product", "x.ai cat product", "x.ai-bot-marketplace", ""),
    ("https://x.ai/bot/marketplace/engineering", "x.ai cat engineering", "x.ai-bot-marketplace", ""),
    ("https://x.ai/bot/marketplace/operations", "x.ai cat operations", "x.ai-bot-marketplace", ""),
    ("https://x.ai/bot/marketplace/personal", "x.ai cat personal", "x.ai-bot-marketplace", ""),
    ("https://x.ai/bot/marketplace/sales", "x.ai cat sales", "x.ai-bot-marketplace", ""),
    ("https://x.ai/bot/marketplace/marketing", "x.ai cat marketing", "x.ai-bot-marketplace", ""),
    ("https://x.ai/bot/marketplace/design", "x.ai cat design", "x.ai-bot-marketplace", ""),
    ("https://x.ai/bot/marketplace/recruiting-people", "x.ai cat recruiting", "x.ai-bot-marketplace", ""),
    ("https://x.ai/bot/marketplace/from-grok-bot-team", "x.ai cat grok-team", "x.ai-bot-marketplace", ""),
    ("https://grok.com/bot/marketplace", "grok.com marketplace", "x.ai-bot-marketplace", "in-app shell"),
    ("https://grok.com/bot/marketplace/plugins", "grok.com plugins tab", "x.ai-bot-marketplace-plugins", "old plugins surface"),
    ("https://x.ai/bot/marketplace/plugins", "x.ai plugins path", "x.ai-bot-marketplace-plugins", "may 404"),
    ("https://x.ai/news/grok-plugin-marketplace", "x.ai plugin news", "x.ai-bot-marketplace-plugins", ""),
    ("https://github.com/xai-org/plugin-marketplace", "xai-org plugin-marketplace", "github/xai-org-plugin-marketplace", "plugins source of truth"),
    # Third-party Grok
    ("https://really.bot/runs.json", "really.bot runs.json", "really.bot", "LIVE JSON"),
    ("https://really.bot/llms.txt", "really.bot llms.txt", "really.bot", ""),
    ("https://botteams.io/api/bots", "botteams.io /api/bots", "botteams.io", "paginated"),
    ("https://botteams.io/api/teams", "botteams.io /api/teams", "botteams.io", ""),
    ("https://botteams.io/openapi.json", "botteams.io openapi", "botteams.io", ""),
    ("https://www.grokyard.com/browse", "grokyard browse", "grokyard.com", ""),
    ("https://grokyard.com/browse", "grokyard apex browse", "grokyard.com", ""),
    ("https://grokyard.com/sitemap.xml", "grokyard sitemap", "grokyard.com", "historically none"),
    ("https://grokindex.dev/api/bots", "grokindex /api/bots", "grokindex.dev", "paged"),
    ("https://grokindex.dev/sitemap.xml", "grokindex sitemap", "grokindex.dev", ""),
    ("https://grokbothq.xyz/api/v1/index.json", "grokbothq index.json", "grokbothq.xyz", "LIVE JSON"),
    ("https://grokbothq.xyz/bots", "grokbothq /bots", "grokbothq.xyz", ""),
    ("https://grokbot-templates.com/", "grokbot-templates.com", "", "claims ~1142"),
    ("https://grokbot-templates.com/sitemap.xml", "grokbot-templates sitemap", "", ""),
    ("https://grokbot-templates.com/about", "grokbot-templates about", "", "github awesome-grokbot-templates"),
    ("https://www.grokbottemplates.dev/templates", "grokbottemplates.dev", "", "new 2026 gallery"),
    ("https://www.grokbottemplates.dev/sitemap.xml", "grokbottemplates.dev sitemap", "", ""),
    ("https://grokmarket.io/", "grokmarket.io", "", "new GrokMarket"),
    ("https://grokmarket.io/sitemap.xml", "grokmarket sitemap", "", ""),
    ("https://gtemplate.net/", "gtemplate.net", "gtemplate.net", ""),
    ("https://gtemplate.net/sitemap.xml", "gtemplate sitemap", "gtemplate.net", ""),
    ("https://usegrokbot.com/llms.txt", "usegrokbot llms.txt", "usegrokbot.com", "LIVE"),
    ("https://usegrokbot.com/en", "usegrokbot homepage", "usegrokbot.com", ""),
    ("https://somi.ai/grok-bots", "somi.ai grok-bots", "somi.ai", ""),
    ("https://somi.ai/sitemap.xml", "somi.ai sitemap", "somi.ai", ""),
    ("https://grokbot.dev/api/v1/templates.json", "grokbot.dev templates", "grokbot.dev", ""),
    ("https://grokbot.dev/llms.txt", "grokbot.dev llms.txt", "grokbot.dev", ""),
    ("https://www.teamsmarket.com/en/teams", "teamsmarket teams", "teamsmarket.com", ""),
    ("https://www.teamsmarket.com/sitemap.xml", "teamsmarket sitemap", "teamsmarket.com", ""),
    # Skills / agents
    ("https://skills.sh/", "skills.sh home", "skills.sh", ""),
    ("https://www.skills.sh/sitemap.xml", "skills.sh sitemap index", "skills.sh", ""),
    ("https://clawhub.ai/", "clawhub.ai", "clawhub.ai", "official OpenClaw"),
    ("https://clawhub.ai/llms.txt", "clawhub llms.txt", "clawhub.ai", ""),
    ("https://clawhub.ai/api/v1/skills?limit=1", "clawhub skills API", "clawhub.ai", ""),
    ("https://hub.openclaw.ai/", "hub.openclaw.ai", "clawhub.ai", "same registry, larger UI count"),
    ("https://souls.directory/", "souls.directory", "souls.directory", ""),
    ("https://souls.directory/llms.txt", "souls llms.txt", "souls.directory", ""),
    ("https://agent-hunt.netlify.app/agents.json", "agent-hunt agents.json", "agent-hunt.netlify.app", "LIVE"),
    ("https://www.vellum.ai/skills", "vellum.ai/skills", "vellum.ai", ""),
    ("https://moldable.sh/bots", "moldable.sh/bots", "moldable.sh", ""),
    ("https://officialskills.sh/", "officialskills.sh", "officialskills.sh", ""),
    ("https://smithery.ai/skills", "smithery.ai/skills", "smithery.ai", ""),
    ("https://clawskills.sh/", "clawskills.sh", "clawskills.sh", ""),
    ("https://skillsllm.com/", "skillsllm.com", "skillsllm.com", ""),
    ("https://www.mcp.directory/skills", "mcp.directory/skills", "mcp.directory", ""),
    ("https://agenticskills.io/ai-skills-directories", "agenticskills.io directories", "agenticskills.io", "comparison page"),
    ("https://claudeskills.info/", "claudeskills.info", "", "new Claude skills hub"),
    ("https://mastering-claude.com/skills/", "mastering-claude skills", "", "curated 297"),
    ("https://findskills.org/", "findskills.org", "", "search-only mention"),
    ("https://www.skillsmp.com/", "skillsmp.com", "skillsmp.com", ""),
    ("https://agentskills.codes/", "agentskills.codes", "agentskills.codes", ""),
    ("https://claude-plugins.dev/", "claude-plugins.dev", "claude-plugins.dev", ""),
    ("https://claude.com/plugins", "claude.com/plugins", "claude.com-plugins", ""),
    ("https://cursor.com/marketplace", "cursor marketplace", "cursor.com-marketplace", ""),
    ("https://n8n.io/workflows", "n8n official workflows", "n8n.io-workflows", ""),
    ("https://n8nworkflows.xyz/", "n8nworkflows.xyz", "n8nworkflows.xyz", "historically CF blocked"),
    # Extra Grok / MCP / workflow
    ("https://github.com/search?q=awesome-grok-bot&type=repositories", "github awesome-grok-bot search", "github", "pack discovery"),
    ("https://github.com/manonglianai/awesome-grokbot-templates", "awesome-grokbot-templates guess", "", "site cites github"),
    ("https://raw.githubusercontent.com/search?q=awesome-grokbot-templates", "raw search stub", "", "skip"),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def classify(status: int, body: bytes, ctype: str, url: str) -> str:
    text = body[:4000].decode("utf-8", "replace").lower()
    if status == 0:
        return "dead"
    if status == 404:
        return "dead"
    if status in (401, 403) and ("cloudflare" in text or "cf-ray" in text or "just a moment" in text):
        return "blocked"
    if status in (401, 403):
        return "blocked"
    if status == 429:
        return "blocked"
    if "cloudflare" in text and "just a moment" in text:
        return "blocked"
    if status >= 500:
        return "dead"
    if status in (200, 301, 302, 303, 307, 308):
        return "live"
    return "unknown"


def sitemap_stats(body: bytes) -> dict:
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        locs = re.findall(r"<loc>([^<]+)</loc>", body.decode("utf-8", "replace"))
        return {"locs": len(locs), "bot_locs": sum(1 for u in locs if "/bot/marketplace/bots/" in u)}
    locs = [el.text.strip() for el in root.findall(".//{*}loc") if el.text]
    return {
        "locs": len(locs),
        "bot_locs": sum(1 for u in locs if "/bot/marketplace/bots/" in u),
        "category_locs": sum(1 for u in locs if "/bot/marketplace/" in u and "/bots/" not in u),
        "sitemap_index": sum(1 for u in locs if "sitemap" in u.lower()),
    }


def json_hint(body: bytes, ctype: str) -> dict:
    if "json" not in (ctype or "").lower() and not body[:1] in (b"{", b"["):
        return {}
    try:
        obj = json.loads(body)
    except json.JSONDecodeError:
        return {"json": False}
    hint: dict = {"json": True, "json_type": type(obj).__name__}
    if isinstance(obj, list):
        hint["json_len"] = len(obj)
    elif isinstance(obj, dict):
        hint["json_keys"] = sorted(list(obj.keys()))[:24]
        for k in ("bots", "runs", "items", "skills", "agents", "templates", "data", "results"):
            if isinstance(obj.get(k), list):
                hint[f"{k}_len"] = len(obj[k])
        if "count" in obj:
            hint["count"] = obj.get("count")
        if "total" in obj:
            hint["total"] = obj.get("total")
    return hint


def probe(url: str, label: str, local: str, note: str) -> dict:
    headers = {"User-Agent": UA, "Accept": "*/*", "X-Archive-Client": UA}
    status = 0
    body = b""
    ctype = ""
    err = ""
    final = url
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            status = resp.status
            ctype = resp.headers.get("Content-Type", "")
            final = resp.geturl()
            body = resp.read(2_000_000)
    except urllib.error.HTTPError as exc:
        status = exc.code
        ctype = exc.headers.get("Content-Type", "") if exc.headers else ""
        try:
            body = exc.read(400_000)
        except Exception:
            body = b""
        err = f"HTTP {exc.code}"
    except Exception as exc:  # noqa: BLE001
        err = str(exc)
    elapsed = round(time.time() - t0, 2)
    kind = classify(status, body, ctype, url)
    archived = False
    if local:
        p = REPO / "sources" / local
        archived = p.exists()
    rec = {
        "url": url,
        "final_url": final,
        "label": label,
        "local": local or None,
        "already_archived": archived,
        "note": note,
        "status": status,
        "content_type": ctype,
        "bytes": len(body),
        "elapsed_s": elapsed,
        "error": err or None,
        "class": kind,
        "title": None,
    }
    if body:
        m = re.search(r"<title>([^<]+)</title>", body.decode("utf-8", "replace"), re.I)
        if m:
            rec["title"] = re.sub(r"\s+", " ", m.group(1)).strip()[:160]
        rec.update(json_hint(body, ctype))
        if "xml" in (ctype or "").lower() or url.endswith(".xml") or b"<urlset" in body[:200] or b"<sitemapindex" in body[:200]:
            rec["sitemap"] = sitemap_stats(body)
        if url.endswith("llms.txt") or url.endswith("/llms.txt"):
            rec["llms_lines"] = body.decode("utf-8", "replace").count("\n")
        text = body.decode("utf-8", "replace")
        rec["bot_hrefs"] = len(set(re.findall(r"/bot/marketplace/bots/([a-z0-9-]+)", text, re.I)))
        rec["skill_hrefs"] = len(set(re.findall(r"/skills?/([a-z0-9._-]+)", text, re.I)))
    return rec


def extra_github_guesses() -> list[tuple[str, str, str, str]]:
    repos = [
        "manonglianai/awesome-grokbot-templates",
        "awesome-grokbot-templates/awesome-grokbot-templates",
        "grokbot-templates/awesome-grokbot-templates",
        "Anil-matcha/awesome-grok-bot",
        "DominikTobureto/awesome-grok-build",
        "LifeJiggy/Awesome-Grok-Skills",
    ]
    out = []
    for repo in repos:
        out.append(
            (
                f"https://api.github.com/repos/{repo}",
                f"github {repo}",
                f"github/{repo.replace('/', '-')}",
                "github existence check",
            )
        )
    return out


def main() -> int:
    jobs = list(CANDIDATES) + extra_github_guesses()
    # extra discovery endpoints
    extras = [
        ("https://www.grokbottemplates.dev/api/templates", "grokbottemplates.dev api", "", ""),
        ("https://grokmarket.io/api/templates", "grokmarket api templates", "", ""),
        ("https://grokmarket.io/llms.txt", "grokmarket llms", "", ""),
        ("https://grokbot-templates.com/llms.txt", "gbt llms", "", ""),
        ("https://grokbot-templates.com/api/templates", "gbt api", "", ""),
        ("https://claudeskills.info/sitemap.xml", "claudeskills sitemap", "", ""),
        ("https://claudeskills.info/llms.txt", "claudeskills llms", "", ""),
        ("https://findskills.org/sitemap.xml", "findskills sitemap", "", ""),
        ("https://hub.openclaw.ai/llms.txt", "hub.openclaw llms", "clawhub.ai", ""),
        ("https://hub.openclaw.ai/api/v1/skills?limit=1", "hub.openclaw skills API", "clawhub.ai", ""),
        ("https://skills.sh/sitemap-skills-1.xml", "skills.sh sitemap-1", "skills.sh", ""),
        ("https://www.skills.sh/hot", "skills.sh /hot", "skills.sh", ""),
        ("https://x.ai/bot/marketplace/bots", "x.ai /bots index", "x.ai-bot-marketplace", ""),
        ("https://grok.com/marketplace/plugins", "grok.com /marketplace/plugins", "", "legacy path"),
        ("https://grok.com/bot/marketplace/bots", "grok.com /bots", "", ""),
        ("https://www.lobehub.com/skills", "lobehub skills", "", "mentioned in 2026 comparison"),
        ("https://skillhub.dev/", "skillhub.dev", "", ""),
        ("https://www.claudemarketplaces.com/", "claudemarketplaces.com", "claudemarketplaces.com", ""),
        ("https://mcpmarket.com/skills", "mcpmarket skills", "", ""),
        ("https://www.openaitoolshub.org/", "openaitoolshub", "", ""),
    ]
    jobs.extend(extras)
    results = []
    print(f"probing {len(jobs)} URLs…", flush=True)
    with ThreadPoolExecutor(max_workers=16) as pool:
        futs = {pool.submit(probe, *job): job[0] for job in jobs}
        for i, fut in enumerate(as_completed(futs), start=1):
            rec = fut.result()
            results.append(rec)
            print(
                f"[{i}/{len(jobs)}] {rec['status'] or 'ERR':>3} {rec['class']:<8} {rec['url']}",
                flush=True,
            )
    results.sort(key=lambda r: r["url"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "probed_at": utc_now(),
        "count": len(results),
        "by_class": {},
        "results": results,
    }
    for rec in results:
        payload["by_class"][rec["class"]] = payload["by_class"].get(rec["class"], 0) + 1
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT} classes={payload['by_class']}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

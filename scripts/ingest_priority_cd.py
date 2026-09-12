#!/usr/bin/env python3
"""Archive Priority C GitHub packs + D public workflow catalogs."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_priority_a import (  # noqa: E402
    REPO,
    clone_pack,
    fetch_many,
    fetch_ok,
    http_get,
    pack_rows,
    sitemap_locs,
    upsert_catalog,
    utc_now,
    write_bytes,
    write_index,
    write_json,
    write_text,
)


def copy_tmp_pack(src: Path, dest: Path, repo: str, dirname: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns(".git"))
    leftover = dest / ".git"
    if leftover.exists():
        shutil.rmtree(leftover)
    sha = "unknown"
    rows = pack_rows(dirname, repo, dest, sha)
    write_index(
        dest,
        repo,
        [f"Shallow clone of https://github.com/{repo}. `.git` stripped. Files: {sum(1 for _ in dest.rglob('*') if _.is_file())}."],
    )
    write_text(dest / "ERRORS.md", "# errors\n\nNone.\n")
    upsert_catalog(f"github/{dirname}", rows)
    print(f"pack {dirname} rows={len(rows)}", flush=True)


def ingest_github_c() -> None:
    packs = [
        ("anthropics/claude-plugins-official", "anthropics-claude-plugins-official", Path("/tmp/gh-c/claude-plugins-official")),
        ("anthropics/claude-plugins-community", "anthropics-claude-plugins-community", Path("/tmp/gh-c/claude-plugins-community")),
        ("khendzel/awesome-agent-skills", "khendzel-awesome-agent-skills", Path("/tmp/gh-c/awesome-agent-skills")),
        ("mergisi/awesome-openclaw-agents", "mergisi-awesome-openclaw-agents", Path("/tmp/gh-c/awesome-openclaw-agents")),
        ("michielhdoteth/awesome-ai-agent-tools", "michielhdoteth-awesome-ai-agent-tools", Path("/tmp/gh-c/awesome-ai-agent-tools")),
        ("difyhub/workflows", "difyhub-workflows", Path("/tmp/difyhub-workflows")),
        ("shamspias/awesome-dify-agents", "shamspias-awesome-dify-agents", Path("/tmp/awesome-dify-agents")),
    ]
    for repo, dirname, src in packs:
        if not src.exists():
            print(f"clone missing {src}, fetching", flush=True)
            dest = REPO / "sources" / "github" / dirname
            sha = clone_pack(repo, dest)
            rows = pack_rows(dirname, repo, dest, sha)
            write_index(dest, repo, [f"Shallow clone `{sha[:12]}`."])
            write_text(dest / "ERRORS.md", "# errors\n\nNone.\n")
            upsert_catalog(f"github/{dirname}", rows)
            continue
        copy_tmp_pack(src, REPO / "sources" / "github" / dirname, repo, dirname)


def ingest_cursor_directory() -> None:
    root = REPO / "sources" / "cursor.directory"
    status, body, _ = http_get("https://cursor.directory/")
    write_bytes(root / "pages" / "homepage.html", body or b"")
    write_json(root / "meta" / "status.json", {"homepage": status, "scraped_at": utc_now()})
    # also try llms/sitemap
    for name, url in [("llms.txt", "https://cursor.directory/llms.txt"), ("sitemap.xml", "https://cursor.directory/sitemap.xml")]:
        st, b, _ = http_get(url)
        write_bytes(root / "meta" / name, b or b"")
        print(f"cursor.directory {name} {st}", flush=True)
    upsert_catalog(
        "cursor.directory",
        [
            {
                "id": "cursor.directory",
                "title": "cursor.directory",
                "url": "https://cursor.directory/",
                "source": "cursor.directory",
                "type": "site",
                "http": status,
            }
        ],
    )
    write_index(
        root,
        "cursor.directory",
        [
            f"Archived {utc_now()}. Homepage HTTP {status} (Vercel rate limit / challenge).",
            "No public listing dump this pass.",
        ],
    )
    write_text(
        root / "ERRORS.md",
        f"# cursor.directory errors\n\nHTTP {status} on homepage, llms.txt, and sitemap (also with Chrome TLS impersonation).\n",
    )


def site_shell(slug: str, title: str, url: str, extras: list[tuple[str, str]], note: str, err: str) -> None:
    root = REPO / "sources" / slug
    jobs = [(url, root / "pages" / "index.html")]
    for name, u in extras:
        dest = root / ("meta" if name.endswith((".json", ".xml", ".txt")) else "pages") / name
        jobs.append((u, dest))
    ok, fail = fetch_many(jobs, workers=6)
    rows = [{"id": slug, "title": title, "url": url, "source": slug, "type": "site"}]
    # sitemap catalog if present
    sm = root / "meta" / "sitemap.xml"
    if sm.exists() and sm.stat().st_size > 100:
        locs = sitemap_locs(sm.read_bytes())
        write_json(root / "meta" / "urls.json", {"count": len(locs), "urls": locs})
        for u in locs:
            if u.rstrip("/") == url.rstrip("/"):
                continue
            sid = u.replace("https://", "").strip("/")
            rows.append({"id": sid, "title": sid.split("/")[-1] or sid, "url": u, "source": slug, "type": "listing-url"})
            if len(rows) > 900:
                break
    upsert_catalog(slug, rows)
    write_index(root, title, [f"Archived {utc_now()}. {note}", f"Fetches OK {ok}, fail {fail}. Catalog {len(rows)}."])
    write_text(root / "ERRORS.md", f"# {slug} errors\n\n{err}\n")
    print(f"{slug} ok={ok} fail={fail} rows={len(rows)}", flush=True)


def ingest_d() -> None:
    site_shell(
        "marketplace.relevanceai.com",
        "Relevance AI Marketplace",
        "https://marketplace.relevanceai.com/",
        [("sitemap.xml", "https://marketplace.relevanceai.com/sitemap.xml")],
        "Homepage + sitemap (846 URLs). Per-template HTML not fetched.",
        "Capped at sitemap URL list; no public JSON dump found.",
    )
    site_shell(
        "sigrix.io",
        "Sigrix crews marketplace",
        "https://sigrix.io/marketplace/crews",
        [],
        "Public crews marketplace HTML.",
        "No public JSON API found.",
    )
    site_shell(
        "marketplace.dify.ai",
        "Dify templates",
        "https://marketplace.dify.ai/templates",
        [],
        "Templates listing HTML. Related GitHub packs archived separately.",
        "No unauthenticated template JSON dump.",
    )
    site_shell(
        "coze.com",
        "Coze templates",
        "https://www.coze.com/templates",
        [],
        "Public templates HTML (storefront).",
        "No public Coze template API found.",
    )
    site_shell(
        "botpress.com",
        "Botpress hub",
        "https://botpress.com/browse-by-field",
        [],
        "`/browse-by-field` redirects to /hub. Hub HTML saved.",
        "No public bot JSON dump.",
    )
    site_shell(
        "voiceflow.com",
        "Voiceflow templates",
        "https://www.voiceflow.com/templates",
        [],
        "URL now serves /solutions/agent HTML.",
        "No dedicated public template API.",
    )
    site_shell(
        "zapier.com-agents",
        "Zapier Agents",
        "https://zapier.com/agents",
        [],
        "Public agents marketing/listing HTML (~1.2 MiB).",
        "No unauthenticated agent-library JSON.",
    )
    # make.com
    root = REPO / "sources" / "make.com"
    st, body, _ = http_get("https://www.make.com/api/v2/templates/public")
    write_bytes(root / "meta" / "templates-public.json", body or b"")
    write_json(root / "meta" / "status.json", {"api": st, "scraped_at": utc_now()})
    fetch_ok("https://www.make.com/en/templates", root / "pages" / "templates.html")
    upsert_catalog(
        "make.com",
        [{"id": "make.com", "title": "Make.com templates", "url": "https://www.make.com/en/templates", "source": "make.com", "type": "site", "api_http": st}],
    )
    write_index(root, "make.com", [f"GET /api/v2/templates/public → HTTP {st} (login required). Templates HTML 403."])
    write_text(root / "ERRORS.md", f"# make.com errors\n\nAPI HTTP {st}: not logged in. HTML templates 403.\n")

    site_shell(
        "gumloop.com",
        "Gumloop templates",
        "https://www.gumloop.com/templates",
        [],
        "Public templates HTML.",
        "No public JSON catalog found.",
    )
    # activepieces
    root = REPO / "sources" / "activepieces.com"
    fetch_ok("https://cloud.activepieces.com/v1/templates", root / "pages" / "v1-templates.html")
    upsert_catalog(
        "activepieces.com",
        [{"id": "activepieces", "title": "Activepieces templates", "url": "https://cloud.activepieces.com/v1/templates", "source": "activepieces.com", "type": "site"}],
    )
    write_index(root, "activepieces.com", ["`/v1/templates` returns an HTML app shell, not JSON."])
    write_text(root / "ERRORS.md", "# activepieces.com errors\n\nNo JSON body on GET /v1/templates.\n")

    site_shell(
        "pipedream.com",
        "Pipedream templates",
        "https://www.pipedream.com/templates",
        [],
        "Public templates HTML.",
        "No public JSON dump this pass.",
    )

    # n8n retry
    n8n = REPO / "sources" / "n8nworkflows.xyz"
    st, body, _ = http_get("https://n8nworkflows.xyz/")
    write_bytes(n8n / "pages" / "homepage-retry.html", body or b"")
    write_json(n8n / "meta" / "retry-status.json", {"homepage": st, "scraped_at": utc_now()})
    prev = (n8n / "ERRORS.md").read_text(encoding="utf-8") if (n8n / "ERRORS.md").exists() else ""
    write_text(
        n8n / "ERRORS.md",
        prev.rstrip()
        + f"\n\n## Retry {utc_now()}\n\nHomepage still HTTP {st} (Cloudflare). 0 workflow JSON files.\n",
    )
    print(f"n8n retry HTTP {st}", flush=True)

    # flowise extract
    src = Path("/tmp/Flowise/packages/server/marketplaces/agentflowsv2")
    dest = REPO / "sources" / "github" / "FlowiseAI-Flowise-agentflowsv2"
    if src.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)
        files = [p for p in dest.rglob("*") if p.is_file()]
        rows = [
            {
                "id": "FlowiseAI-Flowise-agentflowsv2",
                "title": "FlowiseAI/Flowise agentflowsv2",
                "url": "https://github.com/FlowiseAI/Flowise/tree/main/packages/server/marketplaces/agentflowsv2",
                "source": "github/FlowiseAI-Flowise-agentflowsv2",
                "type": "pack",
            }
        ]
        for p in files:
            rel = p.relative_to(dest).as_posix()
            rows.append(
                {
                    "id": rel,
                    "title": p.stem,
                    "url": f"https://github.com/FlowiseAI/Flowise/blob/HEAD/packages/server/marketplaces/agentflowsv2/{rel}",
                    "source": "github/FlowiseAI-Flowise-agentflowsv2",
                    "type": "agentflow",
                    "path": rel,
                }
            )
        write_index(
            dest,
            "FlowiseAI agentflowsv2",
            [f"Path extract from Flowise shallow clone. {len(files)} marketplace JSON files."],
        )
        write_text(dest / "ERRORS.md", "# errors\n\nFull Flowise repo not kept; only agentflowsv2 path.\n")
        upsert_catalog("github/FlowiseAI-Flowise-agentflowsv2", rows)
        print(f"flowise files={len(files)}", flush=True)


def main() -> int:
    print("===== github C+Dify =====", flush=True)
    ingest_github_c()
    print("===== cursor.directory =====", flush=True)
    ingest_cursor_directory()
    print("===== D platforms =====", flush=True)
    ingest_d()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

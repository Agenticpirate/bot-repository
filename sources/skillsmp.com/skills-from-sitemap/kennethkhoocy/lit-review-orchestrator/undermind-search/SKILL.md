---
name: undermind-search
description: >
  Stage 1 of the lit review pipeline: run an Undermind deep search from the
  natural-language brief produced by Stage 0 through the Undermind MCP server
  (agent-driven; no browser, no stored credentials), then parse + enrich the
  returned papers into the pipeline schema. Only use this skill when explicitly
  requested. Do NOT auto-trigger on general literature review or paper search
  requests.
---

# Undermind Search (Stage 1)

Takes the **Undermind brief** that Stage 0 extracts and returns the papers
Undermind's deep search finds, enriched and saved as `<stem>.json` + `<stem>.bib`
for dedup and screening.

The stage is agent-driven end to end. There is no subprocess driver: the host
agent calls the Undermind MCP tools, saves what they return, and one script
normalizes it.

- **The agent** — `launch_deep_search` → poll `inspect_deep_searches` → page the
  results.
- **`scripts/undermind_harvest.py`** — copies the paged tool results out of the
  session transcript byte-for-byte into `OUT/undermind_page_<k>.txt` (Claude Code
  `~/.claude/projects/<slug>/<session>.jsonl`, following its `<persisted-output>`
  pointers; Codex `~/.codex/sessions/**/rollout-*.jsonl`).
- **`scripts/undermind_ingest.py`** — parses those files (or any RIS/BibTeX
  export), fills missing DOIs (Crossref) and abstracts/journals (OpenAlex), and
  writes the pipeline JSON. Importable, and runnable standalone.

## Prerequisite: the Undermind MCP server

Undermind's official MCP endpoint is `https://mcp.undermind.ai/mcp` (OAuth,
your own Undermind account).

- **Claude Code:** `claude mcp add --transport http undermind https://mcp.undermind.ai/mcp`
  then `claude mcp login undermind` in an interactive terminal. A session that
  was already open when you logged in only exposes `mcp__undermind__authenticate`;
  call it once, approve in the browser, and the full tool set swaps in.
- **Codex:** in `~/.codex/config.toml`:
  ```toml
  [mcp_servers.undermind]
  url = "https://mcp.undermind.ai/mcp"
  [mcp_servers.undermind.oauth]
  client_id = "codex"
  ```
  Codex completes the OAuth flow on first use.

Call `get_orientation` once per conversation before the other tools.

## The flow

```
brief ─► create_workspace (or reuse) ─► launch_deep_search(goal=brief)
      ─► poll inspect_deep_searches(status_only) every ~60 s (2–5 min)
      ─► inspect_deep_searches(papers_only, detail_level="full", limit=50, offset=0/50/…)
      ─► undermind_harvest.py --latest --match <name> --out-dir OUT   (pages → OUT/undermind_page_<k>.txt)
      ─► undermind_ingest.py --input OUT/undermind_page_*.txt -o OUT/stage1_undermind.json
```

Step by step, with `OUT` the run's output directory:

1. `list_workspaces` → reuse a workspace for this manuscript, or
   `create_workspace(title=<document stem>)`. Keep the `workspace_id`.
2. `launch_deep_search(workspace_id, goal=<contents of OUT/undermind_brief.txt>,
   name=<short label>)`. The tool returns immediately. Launch it **first**, then
   start the other channels while it runs. The brief goes in verbatim: the
   `goal` is meant to be a self-contained paragraph, which is exactly what
   Stage 0 writes (no keyword lists, no journal names). The MCP search asks no
   clarifying questions; the plan's `undermind_clarifications` field is
   informational only (a holdover from the browser flow).
3. Poll `inspect_deep_searches(names=[<name>], status_only=true)` from a
   background Monitor, not a foreground wait. A `rate_limited` result means
   wait and retry; Undermind runs only a few deep searches concurrently.
4. On completion, page the papers:
   `inspect_deep_searches(names=[<name>], papers_only=true, detail_level="full",
   limit=50, offset=0)`, then `offset=50`, `100`, … until a page comes back
   short. Do not retype or summarize anything.
5. Harvest the pages from the transcript, then ingest:
   ```bash
   python undermind-search/scripts/undermind_harvest.py --latest --match "<name>" --out-dir OUT
   python undermind-search/scripts/undermind_ingest.py --input OUT/undermind_page_*.txt \
       -o OUT/stage1_undermind.json
   ```
   The harvester scans the newest transcript under the Claude Code projects dir
   (`CLAUDE_CONFIG_DIR` or `~/.claude`) and `~/.codex/sessions`, keeps every
   distinct tool result that contains `[Key] Title (Year)` blocks and whose
   header (the search-name line above the paper list) contains the `--match`
   text, and writes them as `undermind_page_01.txt`, `_02`, …; without
   `--match`, when the transcript holds several searches, only the latest
   search's pages are kept and the others are named. Pages whose
   `showing a-b of n` ranges leave a gap raise a WARNING naming the missing
   offsets.
   (`--transcript PATH` to name the file; `--min-records N` to drop short
   fragments). Falling back to saving a page by hand as `.txt` or as the
   `{"result": "..."}` JSON also works: the ingest reads both.

Optional add-ons before ingest, for the same workspace: `search_papers` with
`search_type="citations"` / `"references"` seeded on the top cite keys widens
coverage; save its output as another page file and ingest it together.

## Input formats the ingest accepts

Auto-detected from content:

| Input | Notes |
|-------|-------|
| Raw MCP tool text | `[Key] Title (Year)` blocks from `inspect_deep_searches`, `get_paper_info`, or `search_papers` at any detail level. Journal, `Date:`, `By …`, `DOI:`, `Link:`, `PDF`, and the abstract paragraph are read; trailer legends are ignored. |
| `{"result": "…"}` JSON | The tool result saved as JSON. |
| JSON array | `[{"title", "authors" (string or list), "year", "journal", "doi", "url", "abstract"}]`; only `title` is required. |
| `.ris` / `.bib` | The web app's Export, or any reference manager. |

Several `--input` files are concatenated and deduplicated by cite key, DOI, or
normalized title, so paginated dumps just go in together.

## CLI

`undermind_harvest.py`:

| Flag | Default | Description |
|------|---------|-------------|
| `--latest` | (default) | Scan the most recently modified transcript under the Claude Code / Codex session dirs |
| `--transcript PATH` | — | Scan this transcript instead |
| `--match TEXT` | — | Keep only pages whose header (search-name line) contains this text; omitted → the latest search in the transcript |
| `--min-records N` | `1` | Skip pages with fewer paper blocks |
| `--out-dir DIR` | `.` | Where `undermind_page_<k>.txt` is written |
| `--selftest` | off | Run the harvester self-check |

`undermind_ingest.py`:

| Flag | Default | Description |
|------|---------|-------------|
| `--input, -i PATH…` | — | One or more input files (globs expanded internally; PowerShell-safe) |
| `-o, --output PATH` | `stage1_undermind.json` | Output JSON (a `.bib` sibling is written) |
| `--sibling {bibtex,ris,none}` | `bibtex` | Reference-manager copy beside the JSON |
| `--source TAG` | `undermind` | `source` value stamped on each record |
| `--no-enrich` | off | Skip Crossref/OpenAlex enrichment |
| `--selftest` | off | Run the parser self-check |

## Graceful degradation

If the MCP tools are unavailable (server not added, not authenticated, or a
Codex/Claude session without MCP), the agent prints `UNDERMIND_DEFERRED`, writes
`[]` to `stage1_undermind.json`, and continues; the ingest does the same when no
input file exists or nothing parses. The brief is always available in
`undermind_brief.txt` for a manual run in the web app (Export → RIS, then ingest
the file). The autonomous `orchestrator.py` never runs this stage: it has no MCP
client.

## Output schema

Same as the other stages, with `source: "undermind"`:

```json
{"title": "...", "authors": "A, B", "year": "2024",
 "doi": "https://doi.org/10.x/y", "abstract": "...", "journal": "...",
 "url": "...", "source": "undermind", "verified": true,
 "citations": 0, "open_access": false}
```

## Troubleshooting

- **Only `mcp__undermind__authenticate` is available** — the session predates
  the login. Call it, approve in the browser, and the tools appear.
- **`claude mcp list` says "Needs authentication" although login worked** — a
  stale `mcp-needs-auth-cache.json` in the Claude config dir; harmless to delete.
- **`rate_limited`** — Undermind caps concurrent deep searches; wait and retry.
- **The harvester finds no pages** — the tool results have not been flushed to
  the transcript yet, or the newest transcript belongs to another session; wait
  a moment and retry, or pass `--transcript` with the session file. `--match`
  is case-insensitive and is tested against the page header (the search-name
  line), never against paper text.
- **A page parses to zero records** — the tool output format drifted. Run
  `--selftest`, compare the saved page with the header pattern in
  `parse_mcp_text`, and adjust; the JSON-array input is the format-independent
  fallback.

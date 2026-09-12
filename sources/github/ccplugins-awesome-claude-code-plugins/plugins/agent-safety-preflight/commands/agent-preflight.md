---
description: Run a local repo preflight before Claude Code gets tool access
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(python3 agent_preflight_lite.py:*)
---

## Context

- Current branch: !`git branch --show-current`
- Current status: !`git status --short`

## Your task

Run an AI-agent safety preflight before this Claude Code session gets broad tool access.

1. If `agent_preflight_lite.py` is present in this repo, run:

   ```bash
   python3 agent_preflight_lite.py .
   python3 agent_preflight_lite.py . --json
   ```

2. Summarize the result as **Green**, **Yellow**, or **Red**:
   - Green: zero or one low-risk bucket; continue with normal review discipline.
   - Yellow: two or three buckets, package scripts, MCP/Claude/Cursor config, or secret-adjacent files; write may-run / must-ask / must-not-touch rules before executing commands.
   - Red: destructive shell, credential-adjacent files, or four-plus risk buckets; stop and get explicit approval before shell/package/deploy commands.

3. If the scanner is missing, do not curl-pipe or auto-install anything. Tell the user to inspect or copy the free scanner from:
   `https://github.com/el-zachariah/ai-agent-safety-starter-pack`

4. End with a concise handoff:
   - Findings
   - Commands allowed now
   - Commands that need approval
   - Files or directories the agent must not touch

This command is a lightweight pre-tool-access checklist for Claude Code plugin users; it is not a sandbox, malware scanner, or full security audit.

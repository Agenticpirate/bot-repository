---
name: browser-agent-advisor
description: Choose a browser or computer-agent product, SDK, or infrastructure stack with the fewest decision-changing questions. Use to compare Browserbase, Browser Use, Kernel, Stagehand, ChatGPT/OpenAI, Muse or Instinct; map dependencies; or generate an offline interactive questionnaire and capability matrix. Does not deploy agents or claim a measured performance winner.
---

# Browser Agent Advisor

Recommend fit for a task and constraints, not a universal winner. Use existing context before asking questions. Treat bundled September 2026 research as historical evidence, not current truth.

## Ask only what changes the choice

1. Establish personal work versus developer automation.
2. Resolve execution ownership: existing desktop/apps, unattended web tasks, persistent personal assistance, managed agent API, own harness with browser tools, or browser infrastructure for an existing agent.
3. Ask together about unresolved hard requirements relevant to the task: native desktop, data locality, contractual retention, authorized purchases, protected sites, language/runtime, existing integrations, scale and firm budget. Do not ask for credentials.
4. Ask a tie-breaker only if remaining candidates materially differ: platform breadth, packaged execution, control/portability, or measured total cost. Stop when enough is known for an honest answer. Do not force a three-question minimum or claim three questions settle every procurement decision.

Read [decision rules](references/decision-rules.md). Reuse answered constraints and allow revisions.

## Verify before recommending

Select relevant records from [the evidence snapshot](references/capabilities-data.json) by product and capability IDs rather than loading all records unnecessarily. Recheck decisive claims in current official documentation using available web tools: architecture, versions, availability, privacy, pricing and payments. Record retrieval dates. Without live access, explicitly provide a dated provisional answer.

Separate documented facts, vendor claims, conditional support, inference, roadmap and unknowns. Distinguish model, harness, browser, identity/payment and application layers. Say “can run on” for integrations unless actual hosted composition is verified. Never infer ownership or exclusive dependency from compatibility.

## Return the decision

Give the preferred product/stack, the answers causing the choice, an alternative, decisive limitations and direct sources. If a hard requirement is unverified or conflicting, say there is no verified complete fit and identify what would resolve it. Never turn an unknown into a measured failure or rank reliability from feature counts.

For cost/performance ties, propose a small same-task comparison measuring verified completion, intervention, total cost including retries, and external outcomes. Do not run paid trials or external actions without user authorization. Distinguish documented fit, subjective preference and tested results.

## Generate the offline guide

Run with Python 3 (standard library only), resolving the script relative to this skill:

```bash
python3 scripts/render_overview.py --output-dir /absolute/path/to/output
```

Use a writable output directory. Generated `agent-capabilities.html` includes the adaptive questionnaire, 32 capabilities across 11 surfaces, sources and constraint handling. Its companion CSV has the same evidence. It works offline; source links require internet.

The static guide remains dated even after a separate current search. Do not represent it as refreshed unless data and routing were updated together. Keep `assets/decision-guide.html`, `references/capabilities-data.json` and the renderer consistent. Verify changed paths, back/reset, matrix handoff and mobile overflow. Do not publish private task context with a shared guide.

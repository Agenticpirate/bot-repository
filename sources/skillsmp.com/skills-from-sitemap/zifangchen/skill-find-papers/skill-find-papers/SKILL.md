---
name: skill-find-papers
description: Find, rank, summarize, and track high-quality research papers with Scholar MCP, accept user-submitted PDFs, DOIs, or links through a persistent local inbox as special-interest signals, then create evidence-rich bilingual Feishu deep-read documents with detailed abstracts, contributions, methods, figures, and verified links using lark-cli. Use for recurring paper recommendations, weekly research digests, receiving papers directly from the user, processing paper feedback, changing research interests, or creating detailed paper notes in Feishu.
---

# Skill Find Papers

Discover five recent high-quality papers plus one classic paper, learn from user feedback, and archive selected deep reads in Feishu.

## Required Tools

- Use the configured `scholar_mcp` MCP server for literature discovery, metadata, citations, PDF retrieval, and paper analysis.
- Use `lark-cli` for Feishu folders and documents.
- Use `scripts/paper_state.py` for persistent preferences and recommendation history.
- Before any Feishu operation, run `lark-cli doctor`. Before choosing Feishu flags, read the version-matched embedded skills with `lark-cli skills read lark-shared`, `lark-cli skills read lark-drive`, and `lark-cli skills read lark-doc`.

## Start Every Run

1. Run:

   ```powershell
   python "$env:USERPROFILE\.codex\skills\skill-find-papers\scripts\paper_state.py" init
   python "$env:USERPROFILE\.codex\skills\skill-find-papers\scripts\paper_state.py" show
   python "$env:USERPROFILE\.codex\skills\skill-find-papers\scripts\paper_state.py" inbox-list --status pending
   ```

2. Inspect `needs_initial_interests` from `init`. On first use, stop before discovery and ask the user to set initial research interests. Defaults are `transformers`, `LLM`, and `agent`.
   - If the user accepts the defaults, run `paper_state.py interests --confirm`.
   - If the user supplies topics, run `paper_state.py interests --replace "<topic1,topic2>"`.
3. Treat saved preferences and feedback as authoritative after onboarding.
4. If the user directly changes interests, apply the change immediately with `interests --add`, `--remove`, or `--replace`, then confirm the resulting list.

## Local Paper Inbox

Treat any paper PDF, DOI, publisher/arXiv link, or explicit paper submission sent by the user as an inbox submission.

1. Add it immediately with `paper_state.py inbox-add`. For a local PDF, pass `--file`; for a remote paper, pass `--url` or `--doi`. Omit unavailable metadata.
2. The script copies local PDFs into the managed inbox at `$HOME/.codex/skill-data/skill-find-papers/inbox/files`. Use that managed path for later Scholar MCP ingestion.
3. Mark every inbox submission as `特别感兴趣（用户主动发送）`. Submission is explicit consent to analyze it and include it in the next deep-read document; do not ask the user to select it again.
4. At the start of every weekly run, process all pending inbox papers before ordinary discovery:
   - prefer the managed local PDF and use Scholar MCP `local_pdf_path`;
   - otherwise resolve the DOI or URL to the fullest lawful source;
   - apply the complete deep-read contract with greater depth than an ordinary recommendation;
   - infer focused topics from the full paper, not only broad parent categories;
   - after successful analysis and document inclusion, run `paper_state.py inbox-process --paper-id "<id>" --topics "<topic1,topic2>" --document-url "<url>"`.
5. Successful inbox processing applies a +3 preference signal to each inferred topic exactly once. Reprocessing or resubmitting the same paper must not apply the signal again.
6. User-submitted papers are supplemental and do not consume the ordinary quota of five recent papers plus one classic. They are exempt from the venue quality gate, but report their verified venue and quality status honestly.
7. Put inbox papers before ordinary selected papers in the Feishu document and add a visible `特别感兴趣（用户主动发送）` callout.
8. If no pending inbox papers exist, execute the original weekly discovery and feedback workflow unchanged.

## Weekly Discovery

1. After pending inbox papers have been handled, search the last 3 months first. Fill shortages by expanding to 12 months, then 24 months. Never silently exceed 24 months for the five recent papers.
2. Query topic combinations, not only isolated keywords. Include synonyms such as LLM, foundation model, semantic communication, wireless/network optimization, multi-agent, tool use, planning, and agentic AI.
3. Gather more candidates than needed, deduplicate by DOI, canonical URL, arXiv ID, then normalized title.
4. Exclude papers already recommended unless fewer than five eligible unseen papers remain. If reusing one, clearly label it and explain why.
5. Select exactly five recent papers when possible, balancing relevance, quality, novelty, and topic diversity.
6. Add exactly one separate **经典论文精读** recommendation. Choose a seminal, field-shaping paper relevant to current preferences. Prefer an unseen classic; classics are exempt from the 24-month window.

## Quality Gate

For each recent paper, verify at least one:

- journal is current JCR Q1;
- journal is current Chinese Academy of Sciences Zone 1;
- conference is CCF-A.

Use current authoritative ranking data and state the qualifying basis. Do not claim a rank from memory when it cannot be verified. Reject unverified venues from the five-paper list. Preprints qualify only when they have a verified accepted venue meeting the gate.

The classic paper instead requires strong evidence of seminal impact, such as sustained high citations, a foundational method, or field-wide adoption. State the evidence.

## Analyze And Present

For every recommendation, provide:

- title, authors, venue, publication date, DOI/arXiv and direct paper link;
- quality basis and search-window label;
- Chinese summary of abstract, main innovations and contributions, method, and conclusion;
- a short relevance note tied to saved interests;
- a stable paper ID from `paper_state.py paper-id`.

Keep the first weekly message concise enough to compare six papers. Do not create a Feishu document before feedback.

End with these reply options for each paper:

- `精读` - interested; include in the Feishu document.
- `已读` - interested; update preferences, but do not include in the document.
- `不感兴趣` - exclude and reduce related topic weights.
- `跳过` - neutral; do not change preferences.

Also state that the user may directly say `增加方向：...`, `减少方向：...`, or `替换方向：...`.

Record all six recommendations with `paper_state.py record`.

## Process Feedback

1. Map feedback to `selected`, `read`, `not-interested`, or `skipped`.
2. Run `paper_state.py feedback` for every explicit choice.
3. Treat both `selected` and `read` as positive interest signals. Never put `read` papers into the document.
4. If no paper is marked `selected`, update preferences and finish without creating an empty document.
5. For ambiguous numbering or titles, resolve against the most recent run before acting.

## Create The Feishu Deep Read

For each `selected` paper, retrieve the fullest available source through Scholar MCP. Distinguish paper-stated facts from your interpretation.

Also include every successfully analyzed pending inbox paper, ordered before ordinary selected papers and labeled `特别感兴趣（用户主动发送）`.

When using `ingest_paper_fulltext`, keep the same Scholar MCP server process and client connection alive while polling `get_ingestion_status` and calling `extract_granular_paper_details`. Ingestion jobs are process-scoped; reconnecting can make a valid job ID return `JobNotFoundError`.

Create one document containing all selected papers. Each paper must include:

- bibliographic metadata, direct paper links, and verified official code/repository links;
- the complete English abstract and a complete Chinese translation when the source is user-provided, public domain, or explicitly licensed for reproduction; otherwise include a comprehensive abstract paraphrase covering every substantive information point, clearly label it as a paraphrase, and link to the original abstract;
- innovations and contributions at close-to-source completeness, preserving the paper's contribution structure, scope, evidence, and quantitative claims rather than collapsing them into a few generic bullets;
- a detailed methods section covering problem definition, assumptions, inputs/outputs, architecture or algorithm stages, objectives/losses, training or optimization procedure, datasets/testbeds, baselines, metrics, and inference/deployment flow when present;
- relevant paper figures when their license or user-provided status permits reuse, with figure number, a paraphrased caption, source link, and license/attribution; otherwise create an original explanatory diagram based on supported facts and label it `原创方法示意图（非论文原图）`;
- Chinese and English conclusions;
- limitations and suggested reading focus;
- why it matches the user's interests.

Use the structure in `references/output-contract.md`.

### Source And Figure Workflow

1. Prefer the publisher page, DOI record, author manuscript, arXiv/OpenReview page, official project page, and repository linked by the paper or authors.
2. Verify every code link. Prefer an author/organization repository that names the paper, matches the authors/project page, or is linked from the paper. Never infer a repository from title similarity. If no verified code exists, write `未发现可验证的官方代码仓库`.
3. Extract the abstract, contribution list, methods sections, experiments, conclusions, figure captions, and figure references from the full text. Keep notes tied to section names or page/figure numbers.
4. Select figures that materially explain the architecture, workflow, system model, algorithm, or main result. Do not insert decorative figures.
5. For reusable figures, download the highest-quality source, preserve aspect ratio, and insert near the relevant method/result subsection with `lark-cli docs +media-insert` or a URL image block. Caption it with paper title, figure number, source URL, and license.
6. If direct figure reuse is not clearly allowed, create an original Mermaid/SVG diagram that explains the method without copying the paper's composition or artwork. State that it is an interpretation.
7. After document creation, fetch the outline and keyword sections, and verify that every selected paper contains abstract, contributions, methods, conclusions, links, and at least one useful visual when source evidence permits.

On first document creation:

1. If state has no Feishu folder token, create a root folder named `论文推荐` with `lark-cli drive +create-folder --as user`.
2. Save its token and URL with `paper_state.py folder`.
3. Reuse that folder thereafter; do not create duplicates.

Name each document `论文精读_YYYY-MM-DD`. Create it under the saved folder using `lark-cli docs +create --api-version v2 --as user --parent-token ...`. Use a cwd-relative content file or stdin, never an absolute `@file` path. Return the document URL to the user and record it with `paper_state.py run`.

## Reliability Rules

- Never fabricate abstracts, conclusions, rankings, acceptance status, citations, DOI values, or links.
- Mark unavailable full text and summarize only supported content.
- Do not claim an abstract is verbatim or complete unless it was checked against the primary source.
- Do not silently copy copyrighted abstracts or figures. Follow the reproduction and figure rules above.
- Do not label unofficial implementations as official code.
- Prefer primary paper pages, DOI records, publisher pages, and official ranking sources.
- Preserve prior state; never reset history during a normal run.
- If Scholar MCP or Feishu is unavailable, explain the exact failed stage and keep already-recorded feedback intact.

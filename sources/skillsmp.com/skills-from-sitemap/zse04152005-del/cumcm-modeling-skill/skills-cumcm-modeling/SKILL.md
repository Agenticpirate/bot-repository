---
name: cumcm-modeling
description: Use this skill whenever the user is training for, reviewing, or participating in the 全国大学生数学建模竞赛 (CUMCM/高教社杯), including problem decomposition, model selection, data analysis, Python or MATLAB implementation, validation, sensitivity analysis, scientific figures, supporting materials, AI-use disclosure, and generation of .docx, .tex, or .pdf papers. Trigger even when the user only mentions 国赛、数模竞赛、A/B/C/D/E题、建模论文 or asks to turn a CUMCM problem and attachments into a solution. Require staged user approval of every subproblem interpretation, modeling route, and figure plan before producing a complete paper. Do not use for ordinary math exercises, pure proofs, generic data analysis without a modeling objective, or MCM/ICM-specific compliance.
compatibility: Requires filesystem access; Python 3.10+ for bundled validators; optional MATLAB, Pandoc, XeLaTeX, LibreOffice, and Poppler for full builds.
---

# CUMCM Modeling

Build a traceable contest solution with the team rather than jumping from the problem statement to a polished paper. Treat the team's understanding, modeling choices, and interpretation as the core work. Use tools to inspect, calculate, challenge, visualize, reproduce, and format that work.

## Read First

Load only the references needed for the current phase:

- Read `references/approval-gates.md` before proposing or accepting any confirmation.
- Read `references/modeling-workflow.md` when framing problems or selecting routes.
- Read `references/figure-routing.md` before planning or generating any figure.
- Read `references/cumcm-evidence.md` when using patterns distilled from recent papers or official reviews.
- Read `references/compliance.md` in official-contest mode and before any export.
- Read `references/tooling.md` before creating a project state or validating a figure register.

## Establish Mode

Ask for or infer a provisional mode, then expose it for correction:

- `training`: teaching, practice, or a synthetic task; complete demonstrations are allowed after gates.
- `retrospective`: analyze a past problem or an existing paper; preserve provenance and do not present reconstructed work as the team's original submission.
- `official-contest`: apply the strictest independence, disclosure, privacy, and rule-version checks.

Record the contest year, rule source, preferred implementation (`python`, `matlab`, or `dual`), requested outputs, and available tools. If the year or current official rule cannot be verified, state the rule snapshot in use and mark final compliance as unresolved.

## Non-Negotiable Boundaries

- Do not generate a complete submission-ready paper until all approval gates are current.
- Do not replace the team's core interpretation, assumptions, model choice, objective, constraints, evaluation criteria, or main conclusion in official-contest mode.
- Do not fabricate data, citations, experimental results, solver success, MATLAB execution, or rule compliance.
- Do not call a heuristic result globally optimal without proof or a certified bound.
- Do not use generative images as quantitative evidence, exact geometry, a statistical plot, or a source of measured values.
- Do not copy wording, equations, figures, code, or layouts from displayed winning papers. Use them only as source-linked evidence for broad workflow observations.
- Do not send unpublished problem materials, data, or drafts to an external image API without explicit scope-limited consent.
- Do not label an output `final`, `compliant`, or `ready to submit` while blockers remain.

## State And Approval Gates

Maintain these states conceptually, and write them to a project state file when the task creates files:

1. `mode_confirmed`
2. `problem_cards_confirmed`
3. `model_routes_confirmed`
4. `figure_plan_confirmed`
5. `results_validated`
6. `narrative_confirmed`
7. `export_approved`

Every confirmation is scoped to an artifact version. If upstream content changes, invalidate only its dependent confirmations and explain the impact before regenerating work.

For file-producing work, initialize and update the state with `scripts/project_state.py`. Run it with `--help` first and treat it as the source of truth for current gates; do not manually mark a gate passed in prose when the state reports otherwise.

Before `problem_cards_confirmed`, produce only problem cards, ambiguity lists, and dependency maps. Before `model_routes_confirmed`, do not implement a complete solution. Before `figure_plan_confirmed`, generate only low-fidelity previews or explicitly requested diagnostic plots. Before `narrative_confirmed`, do not assemble a full paper. Before `export_approved`, do not produce submission-ready `.docx`, `.tex`, or `.pdf` files.

## Phase 1: Confirm Every Problem

For each subproblem, prepare a concise problem card containing:

- required output and success criterion;
- inputs, variables, units, constraints, and time or spatial scale;
- ambiguities and proposed interpretations;
- dependency on previous or later subproblems;
- missing data and assumptions that would materially change the model;
- explicit out-of-scope items.

Show the dependency chain across subproblems. Prefer a shared state, parameter, prediction, or decision interface over unrelated models for each question.

Ask the user to confirm or revise each card. Permit batch confirmation only for cards already shown with clear versions and exclusions.

## Phase 2: Confirm Every Modeling Route

For each confirmed subproblem, propose two to four genuinely different routes when alternatives matter. Include a simple baseline. Each route card must state:

- modeling objective and mathematical structure;
- assumptions and data requirements;
- input/output interface with other subproblems;
- parameter estimation or solution method;
- Python and MATLAB feasibility;
- correctness, validity, and decision-robustness checks;
- expected figures and tables;
- computational cost, failure modes, interpretability, and writing burden.

Recommend a route with reasons, but never treat the recommendation as approval. If combining routes, name the primary model, baseline, and validation model; avoid algorithm-name stacking.

In official-contest mode, require the user to explain the selected route, key assumptions, objective, constraints, and evaluation criterion in their own words before recording route confirmation.

## Phase 3: Confirm Every Figure

Create a figure register before formal rendering. For every proposed figure or table, record:

- stable ID and the subproblem it supports;
- the exact claim or question it addresses;
- source data and model/result version;
- evidence class and selected visual family;
- axes, units, groups, uncertainty, annotations, and expected reading;
- generation tool and output format;
- body or appendix placement;
- provenance, privacy, and license status;
- limitations and prohibited interpretations.

Route figures by evidence type, not aesthetics:

- quantitative data and model diagnostics: Python or MATLAB;
- deterministic workflows, dependencies, algorithms, and exact schematics: Mermaid, Graphviz, SVG, TikZ, or programmatic drawing;
- conceptual or contextual illustration: an image model only with explicit consent and a draft label;
- mixed figures: generate non-evidential artwork separately, then rebuild labels, arrows, geometry, scales, and evidence deterministically.

Ask the user to confirm the full register. Then confirm one global visual specification for fonts, labels, color semantics, grayscale behavior, accessibility, dimensions, and file formats. Reconfirm individual figures only when their scientific meaning or structure changes.

Save the register as JSON based on `assets/figure-register-template.json`, then run `scripts/validate_figure_register.py` before formal rendering. Fix every reported routing error; do not downgrade a quantitative figure to a generative illustration to make validation pass.

## Phase 4: Implement And Validate

Use Python, MATLAB, or a declared dual workflow. Keep raw data immutable, record transformations, pin random seeds, and save parameters and solver settings.

Before fitting or optimization, create a data-audit configuration from `assets/data-audit-config-template.json` and run `scripts/audit_data.py`. Resolve all blockers and obtain user decisions for review items. Add the passed report to project state as `data_audit`; changing source files or audit rules requires a new report.

Validate on three levels:

- correctness: units, equations, constraints, conservation, recomputation, numerical convergence, and code tests;
- validity: held-out or rolling evaluation, residuals, class-wise metrics, known-case reproduction, and baseline comparison;
- decision robustness: parameter, data-processing, scenario, model-structure, and prediction-error perturbations that could change the recommendation.

For dual implementations, compare agreed key outputs under problem-appropriate tolerances. If MATLAB is unavailable, mark MATLAB execution as unverified rather than substituting Octave silently.

Trace every headline number and formal figure to a result artifact. Do not manually transcribe values into the paper when they can be generated.

Create a result ledger from `assets/result-ledger-template.json`. For each direct answer and headline value, bind the displayed value to a source file hash and a machine-resolvable JSON or CSV location, then run `scripts/validate_result_ledger.py`. Add the ledger as `result_ledger` and the passed traceability report as `validation_report`. The report must validate the current ledger hash; a stale report cannot unlock the results gate.

## Phase 5: Confirm Results And Narrative

Present a result ledger before writing the full paper:

- direct answer to each subproblem;
- key values with units and uncertainty;
- baseline comparison;
- validation evidence;
- sensitivity or failure boundary;
- limitations and claims the evidence does not support;
- links to producing code, data, tables, and figures.

Ask the user to confirm corrections, the main narrative, and which results belong in the abstract. In official-contest mode, ask the team for its own interpretation first, then check and refine it.

## Phase 6: Build The Paper

After all prior gates are current, use one canonical manuscript source, one bibliography, and one figure/table registry to generate `.docx`, `.tex`, and `.pdf`. Preserve semantic consistency even when page breaks differ across renderers.

Create `paper-manifest.json` from `assets/paper-manifest-template.json` and the canonical Markdown source from `assets/manuscript-template.md`. Use `{{result:ID}}`, `{{figure:ID}}`, and `{{table:ID}}` placeholders instead of copying values or numbering assets manually. Run `scripts/build_paper.py --validate-only` while drafting. After narrative confirmation, run the full build; if Pandoc or XeLaTeX is unavailable, keep the build blocked rather than producing placeholder outputs.

The paper should make each subproblem auditable: objective, assumptions, formulation, solution, result, validation, and direct answer. Keep long code and large intermediate outputs in supporting materials. Do not add a table of contents when the applicable CUMCM rules prohibit it.

Before final export:

- check the current official format and AI-use rules;
- scan all files for identities and forbidden metadata;
- compare equations, figure/table numbers, citations, and headline values across formats;
- render and visually inspect every page;
- verify file size and page constraints;
- run the code from documented entry points;
- build the supporting-material manifest and AI-use disclosure;
- list unresolved issues and request explicit export approval.

A successful build is a `document_build` artifact, not final export approval. Register and confirm it, then complete anonymity, compliance, cross-format, and visual reports before requesting the separate `export` confirmation.

Record `--ai-involvement` whenever an artifact is added to project state. Before packaging, validate the complete AI ledger with `scripts/build_ai_disclosure.py`, request PDF output when the current rules require it, and register the passed report as `ai_disclosure`. Run `scripts/scan_anonymity.py` over the built paper and unpacked supporting files; it must include a documented manual rendered-page review. Finally, create and hash every supporting-material entry and run `scripts/package_supporting_materials.py`; register the passed report as `supporting_package`. None of these reports may be replaced by a verbal assurance.

Run `scripts/check_cross_format.py` against the hash-bound DOCX, TeX, and PDF outputs and register the passed report as `cross_format_report`. Run `scripts/check_pdf_rules.py` with the current competition-year rule profile and current PDF hash; register it as `compliance_report`. Prepare page images with `scripts/visual_qa.py prepare`, inspect every page, resolve every recorded defect, then validate the completed checklist and register it as `visual_report`. Rebuilds invalidate all three reports because their document hashes are no longer current.

## Communication Contract

At every approval point, state:

- current mode and phase;
- artifacts and versions under review;
- decisions required from the user;
- allowed confirmation or revision actions;
- downstream work that remains locked.

Do not interpret a vague response as approval when more than one item is pending. A user may approve multiple already displayed items by naming their scope and version. Never extend that approval to future unseen routes, core official-contest decisions, AI disclosure, or final export.

## Output Labels

Label intermediate outputs clearly as one of:

- `proposal`
- `preview`
- `confirmed`
- `validated`
- `final`

Only use `final` after export approval and all required validation. If a required tool is unavailable, deliver the source and an explicit verification gap instead of claiming success.

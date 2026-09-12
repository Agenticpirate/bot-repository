---
name: paper-framework-figure
description: Use when creating, designing, or improving a framework, overview, architecture, system model, pipeline, teaser, or comparison figure in an academic paper. This umbrella skill routes to focused figure modules for Introduction teaser figures, Methods pipeline or architecture figures, IEEE system model figures, comparison or motivation figures, multi-panel layouts, captions, and LaTeX integration, with a Python-first workflow that generates editable SVG and companion PDF outputs without external GUI tools.
version: 1.3.0
author: terry
license: MIT
tags: [Figures, Python, SVG, PDF, LaTeX, Academic, NeurIPS, ICML, ICLR, IEEE, Framework Diagram, Overview Figure, Architecture]
dependencies: []
---

# Paper Framework Figure

Umbrella skill for academic structural figures. Use it to classify the figure job first, then load only the modules needed for that job.

This skill is for **conceptual / structural figures**:
- framework or overview figures
- teaser figures in the Introduction
- method pipelines and workflow diagrams
- architecture figures
- system model figures
- comparison or motivation figures
- multi-panel structural layouts

This skill is **not** for experimental plots such as curves, bar charts, histograms, CDFs, or ablations shown as data plots.

## Design Logic

Do not treat all paper figures as one task. The correct design depends on:
- the figure's rhetorical role
- the paper section where it appears
- the venue style
- the required SVG structure and PDF placement constraints

Use this skill as a router:
1. Identify the figure's primary role.
2. Load the matching function module from `references/`.
3. Load cross-cutting modules only if needed.
4. Use a Python-first workflow that produces an editable SVG as the source artifact.
5. Export a companion PDF for paper integration.
6. Produce the figure spec, implementation guidance, caption, and integration guidance.

If a figure seems to do multiple jobs, pick **one primary message** and route by that. If needed, load one secondary module, but do not merge several independent stories into one overloaded figure.

## Routing

### Choose by Figure Function First

| Primary role | Typical section | Load this module |
|---|---|---|
| Teaser / paper-level overview | Introduction, Fig. 1 | `references/teaser-overview.md` |
| Method pipeline / workflow | Start of Methods | `references/pipeline-workflow.md` |
| Model architecture / component interaction | Methods / Model | `references/architecture.md` |
| IEEE-style topology / geometry / network setup | System Model | `references/system-model.md` |
| Comparison / motivation / before-vs-after | Introduction / Related Work / Methods | `references/comparison-motivation.md` |
| Multi-panel structural figure | Any section | `references/multi-panel-layout.md` |

### Load Cross-Cutting Modules as Needed

- `references/foundations.md`
  Use for universal rules, layout, color, venue constraints, and tool selection.
- `references/python-svg-workflow.md`
  Use by default for the Python-first tool stack, editable SVG workflow, and PDF export path.
- `references/icon-and-assets.md`
  Use when the figure needs icons, imported SVG assets, or illustration sourcing rules.
- `references/captioning-and-integration.md`
  Use when writing captions, checking notation consistency, exporting, or integrating into LaTeX.
- `references/quality-checklist.md`
  Use during review, refinement, or pre-submission checking.

## Section-Aware Defaults

Paper section is a routing hint, not the main taxonomy:
- **Introduction** usually maps to `teaser-overview.md` or `comparison-motivation.md`.
- **Methods** usually maps to `pipeline-workflow.md` or `architecture.md`.
- **System Model** usually maps to `system-model.md`.
- **Results / Discussion** only use this skill when the figure is conceptual rather than data-driven.

## Working Procedure

### Step 1: Classify the Request

Extract:
- venue or target style: ML/AI, IEEE, or general
- section placement: Introduction, Methods, System Model, etc.
- figure function: teaser, pipeline, architecture, topology, comparison
- required output medium: editable SVG source plus exported PDF

### Step 2: Load the Minimum Modules

Always start with:
- `references/foundations.md`
- `references/python-svg-workflow.md`

Then load one primary function module. Add only the extra modules needed for:
- multi-panel composition
- icons and sourced assets
- captions and integration
- quality review

### Step 3: Choose the Tool Deliberately

Default policy:
- Prefer **Python scripts** to define structure, layout, and repeated geometry.
- Use **editable SVG** as the primary figure artifact.
- Export **PDF** from the SVG output for paper integration.
- Do not route to TikZ or external GUI editors in the normal workflow.

### Step 4: Produce a Figure Specification

Before drawing, define:
- the single takeaway
- the figure structure and panel plan
- the semantic meaning of boxes, arrows, colors, and enclosures
- the caption outline
- target width and export format

### Step 5: Validate Before Finalizing

Check:
- one figure, one message
- caption is self-contained
- no title text inside the figure
- font size is readable
- symbols match the paper
- width fits the venue
- output is vector unless raster is explicitly required

## Non-Negotiable Rules

These apply across all modules:
- A framework figure must communicate without surrounding text.
- Caption must do the title's job; do not place a title inside the figure.
- Do not encode meaning by color alone.
- Keep flow left-to-right or top-to-bottom unless topology dictates otherwise.
- Use vector output for structural figures whenever possible.
- Keep visual hierarchy explicit: primary components stronger than secondary ones.
- Keep arrow semantics consistent within one figure.

## Deliverables

Depending on the request, the output should include some or all of:
- figure concept or layout spec
- Python-first implementation recommendation
- box / arrow / panel semantics
- caption draft
- editable SVG generation guidance
- export and LaTeX integration instructions

## Reference Map

- `references/foundations.md` - global rules, tool selection, venue styling
- `references/python-svg-workflow.md` - default Python-first workflow, editable SVG generation, and PDF export
- `references/teaser-overview.md` - Fig. 1 teaser and paper-level overview figures
- `references/pipeline-workflow.md` - staged method pipelines and workflows
- `references/architecture.md` - component diagrams and model structures
- `references/system-model.md` - IEEE topology and geometry figures
- `references/comparison-motivation.md` - prior-vs-ours and problem-motivation figures
- `references/multi-panel-layout.md` - panel composition across figure types
- `references/captioning-and-integration.md` - captions, notation, export, LaTeX placement
- `references/icon-and-assets.md` - icons, SVG assets, and visual asset sourcing
- `references/quality-checklist.md` - common failure modes and pre-submission checks

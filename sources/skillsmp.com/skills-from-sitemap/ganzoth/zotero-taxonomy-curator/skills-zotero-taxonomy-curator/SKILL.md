---
name: zotero-taxonomy-curator
description: >-
  Domain-configurable Zotero-to-Obsidian literature curation and paper
  close-reading skill. Use when the user asks to 精读、文献精读、论文精读、生成精读笔记,
  analyze/read a paper, or process a Zotero item/collection/title/DOI/PDF into
  a structured Obsidian literature note. It extracts Zotero evidence, writes
  Chinese close-reading notes, maps original tags to a controlled taxonomy,
  initializes local config and empty taxonomy, handles review/survey papers with
  review_scope_tags, writes model and formula sections with LaTeX evidence
  discipline, and updates literature indexes for any research field.
---

# Zotero Taxonomy Curator

Use this skill when a user wants to turn Zotero items, collections, annotations,
manual tags, PDF text, or notes into structured Obsidian literature notes backed
by a user-defined taxonomy.

## Core idea

This skill is taxonomy-first. It does not treat paper summarization as the final
goal. Its goal is to help the user build a reusable literature system:

```text
Zotero evidence -> controlled taxonomy -> structured note -> literature index
```

## Source policy

Use sources in this order:

1. User-provided manuscript notes, Zotero exports, PDFs, annotations, tables, or data files.
2. Local Zotero database paths from `config/local.yaml`.
3. Taxonomy rules from `config/taxonomy.yaml`.
4. The bundled note template in `templates/literature-note-template.md` inside
   this skill folder, or a project-level override supplied by the user.

Never invent paper conclusions, numerical results, page numbers, formulas,
authors, DOI, dataset names, or Zotero keys. If evidence is missing, say so.

## Review, model, and formula rules

### Review papers

Detect review papers before assigning tags. Review signals include `review`,
`survey`, `systematic literature review`, `bibliometric`, `scoping review`,
`taxonomy`, `classification`, `meta-analysis`, `state-of-the-art`, or a paper
whose main contribution is organizing a field rather than proposing a new model
or experiment.

For review papers:

- set `paper_type: review`;
- fill `review_type` when possible, such as `narrative-review`,
  `systematic-review`, `bibliometric-review`, `scoping-review`,
  `taxonomy-review`, `meta-analysis`, `tutorial-review`, or `hybrid-review`;
- keep `canonical_tags` narrow: use only the review type and its core scope;
- use `review_scope_tags` for covered but non-core concepts; these mean "covered
  by this review", not "proposed by this paper";
- do not promote every method, constraint, objective, dataset, or application
  mentioned in a review table to `canonical_tags`;
- write the note around review positioning, classification framework, research
  trajectory, method families, gaps, opportunities, and key reference clusters.

### Models and formulas

For modeling, optimization, algorithm, learning, or quantitative papers:

- separate assumptions, sets, indices, parameters, variables, objective terms,
  constraints, algorithm steps, and experimental findings;
- use LaTeX for sets, parameters, variables, objectives, constraints, state
  transitions, value functions, loss functions, probabilities, and expectations;
- preserve the paper's notation unless it is inconsistent or undefined;
- do not invent objective terms, constraints, variables, formulas, solver
  settings, or proof claims;
- if a formula is corrupted by PDF extraction, write that the original PDF must
  be checked instead of reconstructing a formula from guesswork;
- after each important formula or mechanism, explain what it does, key symbols,
  where it sits in the method, and why it is reusable.

### Literature-review reuse

When extracting material for a future literature review:

- record only claims supported by local evidence from the note, PDF, annotation,
  or Zotero metadata;
- distinguish background claims, research gaps, method comparisons, experiment
  evidence, and limitations;
- avoid inflated claims such as "proves", "always", or "best" unless the paper
  itself and the evidence justify them;
- do not create citations, DOIs, page numbers, or result values that were not
  present in the source evidence.

## Configuration files

Expected public templates:

- `config/local.example.yaml`
- `config/taxonomy.example.yaml`
- project-level `templates/literature-note-template.md`, if the user wants to
  override the bundled skill template

Expected private local files:

- `config/local.yaml`
- `config/taxonomy.yaml`

Do not require hard-coded absolute paths. If `config/local.yaml` is absent, ask
the user to run `scripts/init_curator_project.py` or create it from
`config/local.example.yaml`.

## First-run initialization

When a user has just installed the skill or the current project has no
`config/local.yaml`, initialize the project before extracting papers:

```bash
python <skill-dir>/scripts/init_curator_project.py
```

The initializer creates:

- `config/local.yaml`;
- `config/taxonomy.yaml` as an empty taxonomy starter;
- `templates/literature-note-template.md`;
- the note output folder, by default `notes/literature/`;
- a starter `Literature Index.md`.

It tries to detect Zotero paths from environment variables, Zotero profile
preferences, and common default locations. If detection fails, rerun it with
`--zotero-sqlite` and `--zotero-storage`, or edit `config/local.yaml`.

## Workflow

### 1. Evidence Collector: build an evidence packet

For each Zotero item, collect:

- title, authors, year, journal, DOI, URL;
- Zotero item key;
- attachment and PDF key;
- resolved PDF path when available;
- Zotero collection paths;
- original Zotero tags;
- notes, annotations, and highlights;
- full-text cache excerpts;
- PDF page evidence when needed.

At this stage, do not translate, summarize, or write final notes.

If deterministic extraction is needed, run
`scripts/extract_zotero_evidence.py`.

### 2. Domain Card Builder: describe the user's field

Before writing the note, identify the user's taxonomy categories. Common
categories include:

- document type;
- research topic;
- theory or framework;
- method family;
- data and evidence;
- contribution type.

Domain projects may replace these categories with field-specific ones.

### 3. Taxonomy Mapper: map tags

Map Zotero tags and evidence-derived concepts to the taxonomy:

- preserve original Zotero tags and the tag-selection basis in the note body
  under `标签标记`, not as noisy frontmatter fields;
- map stable concepts to `canonical_tags`;
- place uncertain or emerging concepts in `candidate_tags`;
- avoid adding fine-grained tags unless they improve retrieval or comparison;
- keep detailed category definitions in `config/taxonomy.yaml` rather than
  duplicating the full taxonomy tree in every note;
- use aliases in the taxonomy when Zotero tag spelling differs from canonical
  style.

### 4. Note Composer: write the literature note

Use the configured template and include:

- basic information;
- lightweight tag marking;
- core summary;
- problem positioning;
- review-specific sections when `paper_type: review`;
- model or assumptions;
- solution or analytical method;
- core formulas or mechanisms when applicable;
- evidence, data, and experiments;
- main findings;
- literature-review reusable points;
- the user's assessment, reuse value, and follow-up questions.

### 5. Index Keeper: maintain the literature index

If the user has an index file, update it with:

- year;
- wiki link;
- title;
- Zotero item key;
- DOI;
- main tags;
- one-sentence positioning.

### 6. Taxonomy Gatekeeper: validate

Before reporting completion:

- read the note back from disk;
- check frontmatter;
- check that canonical tags exist in the taxonomy;
- check candidate tags against `candidate_terms` when applicable;
- for review papers, check that `review_scope_tags` is not being used as a
  substitute for ordinary `canonical_tags`;
- check that formulas use LaTeX and that unclear formulas are marked for PDF
  verification rather than guessed;
- check for encoding problems;
- check that local temporary files are not treated as final output.

For deterministic tag checks, run `scripts/validate_taxonomy_notes.py`.

## Taxonomy governance rules

Use the smallest stable tag set that supports the user's research workflow.

Promote a candidate term to canonical only when:

1. it appears across multiple sources or is established in the field;
2. it cannot be adequately covered by an existing broader tag;
3. it improves retrieval, comparison, or review writing;
4. it has explicit evidence.

Do not promote:

- one-off acronyms;
- local operator names;
- city names unless the field uses them as stable study areas;
- author names;
- funding numbers;
- journal names;
- isolated background phrases.

## Output format

For a single item:

```text
Completed
- Zotero item:
- Output note:
- Taxonomy:
- Index update:

Tag decisions
- Canonical:
- Candidate:
- Not mapped:

Risks / missing evidence
- ...
```

For a collection:

```text
Collection summary
- Items scanned:
- Already processed:
- New notes:
- Skipped:
- Failed:

Taxonomy changes
- New candidates:
- New canonical tags:
- Merge suggestions:
```

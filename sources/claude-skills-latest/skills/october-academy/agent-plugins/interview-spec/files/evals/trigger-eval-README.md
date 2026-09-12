# clarify:interview trigger evaluation

Two different questions live here. Keep them separate.

1. **Does the description discriminate?** — given a realistic set of installed
   skills, do the right prompts route to `clarify:interview` and the wrong ones
   route elsewhere? This is measurable and is measured (below).
2. **Does auto-trigger fire end-to-end on this machine?** — still **not**
   measurable here, for the same reason as iterations 3–4 (skill-budget
   contention). Documented at the bottom.

## 1. Description-discrimination measurement (clean-room)

Real auto-triggering is `router model sees the skill catalog → decides to
invoke`. On a loaded machine the catalog gets truncated before the description
is ever seen, so end-to-end triggering can't be measured. But the part that is
actually the skill's responsibility — whether the **description** attracts the
right prompts and cedes the wrong ones to sibling/other skills — can be
isolated: present a judge model a *controlled* catalog plus one prompt, and ask
which single skill (if any) it should invoke.

**Harness (all reproducible from repo files):**

- `trigger-eval-set.json` — 20 labeled prompts: 11 that should route to
  `clarify:interview`, 9 that should not. 14 are carried from iteration-3 for
  comparability; 6 are iteration-5 adversarial boundary probes drawn from the
  description's own trigger examples (`convert this to TypeScript`, `make it
  faster`, `the export is broken`) and from the cross-lens seams (content-vs-form
  → metamedium; 4-quadrant → unknown; reviewing an existing spec doc → not an
  interview).
- `trigger-eval-catalog.json` — the controlled catalog: the three clarify skills
  with their **verbatim** frontmatter descriptions + 10 realistic distractors
  (code-review, investigate, run-tests, blog-figure, deep-research,
  design-mockup, doc-writer, simplify, ship, translate, humanize-korean).
- Judges: `sonnet` and `haiku`, 3 runs each → **120 routing decisions**. Each
  judge picks exactly one catalog skill or `none`. `predicted_trigger` =
  `chosen == clarify:interview`.
- `trigger-benchmark.json` — the result, storing the full per-case routing
  distribution. `score_trigger.py --check` recomputes precision/recall/accuracy
  from those routes (single source of truth; wired into CI).

**Result (2026-07-11, v3.1.1 descriptions):**

| metric | value |
|---|---|
| precision | **0.968** (60 TP / 2 FP) |
| recall | **0.909** (60 TP / 6 FN) |
| F1 | **0.938** |
| case-level accuracy | **19/20** (majority vote) |
| per-model | haiku P=1.00 R=0.94 · sonnet P=0.94 R=0.88 |

The routing distribution is the real signal — the negatives don't just fail to
trigger interview, they land on the *correct* alternative, which is what the
description's disambiguation lines ("for strategy blind spots use unknown; for
content-vs-form use metamedium") are supposed to buy:

- 전략 블라인드스팟 → `clarify:unknown` 6/6 · 4분면 점검 → unknown 5/6
- 발표 슬라이드 형식 → `clarify:metamedium` 5/6 · 내용 vs 형식 → metamedium 6/6
- 버그/TypeError → `investigate` 6/6 · README 추가 → `doc-writer` 6/6 · 색상 시안 → `design-mockup` 5/6

**Only miss:** `a3` "the export is broken, can you look into it" split 3/3
between `investigate` and `clarify:interview`. Honest ambiguity — the
description lists "the export is broken" as an incomplete bug report it should
catch, but the phrasing also reads as a debug request. Both routings are
defensible; it is not a description defect to fix, it is a genuine boundary.

**What this does and does not show.** It shows the description discriminates
well against a plausible competing catalog — high precision (rarely steals
another skill's prompt) and high recall (rarely misses a real clarify prompt),
robust across two model tiers. It does **not** show end-to-end trigger rates on
a machine where the catalog is truncated (see below), and it is a proxy: a
judge routing from a 13-skill catalog, not the live skill-selection path.

Re-run: rebuild the routes with an agent/workflow over the two input files, then
`python3 score_trigger.py trigger-benchmark.json --check`.

## 2. End-to-end auto-trigger on this machine — still excluded

Unchanged from iteration-3/4. On this workstation:

- **Claude Code clean profile (`CLAUDE_CONFIG_DIR`)**: OAuth token is
  Keychain/config-dir bound, so a fresh profile is unauthenticated; token
  cloning was declined (credential-duplication avoidance).
- **Codex (clarify actually installed)**: `codex exec` warns `Exceeded skills
  context budget… all skill descriptions were removed and 165 additional skills
  were not included` — description-based auto-trigger is structurally impossible
  here regardless of description quality, so any measured rate collapses to ~0
  and is unrepresentative.

**Verified anyway:** explicit invocation `/clarify:interview <requirement>`
loads the skill, reads SKILL.md, and walks the territory (workspace scan) — the
reliable entry path in a congested environment is the slash call.

**Re-measure condition (unchanged):** a representative environment where only
clarify is installed (a fresh machine or a login-capable isolated profile),
running `trigger-eval-set.json` end-to-end × 3. The description itself is
optimized (3 implicit categories, cross-lens disambiguation, < 1024-char cap)
and the clean-room result above is the best available evidence of its quality
until such an environment exists.

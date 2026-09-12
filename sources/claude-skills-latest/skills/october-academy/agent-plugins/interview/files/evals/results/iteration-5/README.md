# iteration-5 measurement archive (clarify:interview, v3.1.1)

Frozen evidence for the v3.1.1 quality claims. Everything here is reproducible
and consistency-checked — `rebuild_benchmark.py --check` verifies the published
aggregate against the 32 grading sources in this directory (and is wired into
CI).

## What's here

- `benchmark.json` / `benchmark.md` — the aggregate, **derived** from the
  gradings by `rebuild_benchmark.py` (grading.json is the single source of
  truth; the aggregate is never hand-edited).
- `run_labels.json` — presentation labels (adapted runs, holdout generations,
  disclosed provenance notes) + `measurement_timestamp`, the frozen real
  completion time (git checkout rewrites file mtimes, so the timestamp is
  pinned here; `--check` still rejects a future date).
- `eval-N/{with_skill,without_skill}/run-M/grading.json` — the 32 per-run
  gradings (arm-filtered expectations, D1–D5 rubric, summary, feedback). The
  full interview transcripts (questions/answers/summaries/state files) are
  embedded in `review-iteration-5.html`, not duplicated here.
- `review-iteration-5.html` — self-contained viewer: open in a browser to read
  every run's transcript, grading, and the benchmark side by side.
- `gate-reviews/` — the nine adversarial production-readiness verdicts
  (GPT-5.6-sol, read-only), `production-gate-verdict.md` (round 1) through
  `-r9.md` (PRODUCTION_READY: yes).

## Headline result (eval-9, gen-3 pure holdout, frozen policy)

with_skill contract 7/7 ×3 (pass 1.0) · rubric 9.67 vs baseline 9.33 ·
fabrication 0/6 · every terminal tag honest under the conservative-CAPPED rule
· marquee unknown-unknown (partial cancellation) surfaced ws 2/3 vs bl 1/3 —
the first holdout with a UU differential in the skill's favour.

## Re-verify

```bash
python3 ../../rebuild_benchmark.py . --check   # aggregate ↔ gradings, md byte-equality, metadata, timestamp
```

To regenerate `benchmark.json`/`benchmark.md` from the gradings, drop `--check`.
Measurement protocol and limitations: see `../../interview-quality-rubric.md`
and `../../../SKILL.md`; auto-trigger discrimination is measured separately —
see `../../trigger-eval-README.md`.

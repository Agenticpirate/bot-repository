---
name: stats-sanity
description: Audit statistical consistency in manuscripts, reports, experiments, and result tables. Use for Stats Sanity, p-value checks, t/F/chi-square/r/z consistency, GRIM/GRIMMER/DEBIT-style checks, denominator consistency, effect sizes, confidence intervals, multiple comparisons, or graph/table numeric consistency.
---

# Stats Sanity

Goal: check whether reported statistics are internally consistent and appropriate for the design.

Checklist:
1. Extract all reported metrics, denominators, sample sizes, means, SD/SE, confidence intervals, test statistics, p-values, and correction methods.
2. Recompute simple statistics when enough information is available.
3. Check p-values against test statistics and degrees of freedom.
4. Check table/figure/text consistency and denominator drift.
5. Flag multiple-comparison, one-tailed/two-tailed, effect-size, and confidence-interval omissions.
6. Report issues as `blocking`, `likely error`, `needs clarification`, or `style/reporting`.

Do not use LLM mental math for final numeric checks; use code or a calculator when numbers matter.


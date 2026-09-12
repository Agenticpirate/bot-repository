#!/usr/bin/env python3
"""Recompute clarify:interview trigger-discrimination metrics from stored routes.

trigger-benchmark.json stores, per case, the full routing distribution across
all judge-runs (e.g. {"clarify:interview": 5, "null": 1}). The headline
confusion matrix and case-level accuracy are DERIVED from those routes here, so
the published `overall` / `case_level` can't silently drift from the evidence —
the same single-source-of-truth discipline as rebuild_benchmark.py.

Usage:
    python3 score_trigger.py <benchmark.json>            # print recomputed metrics
    python3 score_trigger.py <benchmark.json> --check    # verify stored == recomputed (exit 1 on drift)

Note: per_model cannot be recomputed from per_case (routes are pooled across
models); it is a disclosed stored value, not re-derived here.
"""
import json
import sys
from pathlib import Path

TARGET = "clarify:interview"


def recompute(bench: dict) -> dict:
    tp = fp = fn = tn = 0
    case_correct = 0
    for c in bench["per_case"]:
        routes = c["routes"]
        total = sum(routes.values())
        triggers = routes.get(TARGET, 0)
        # confusion matrix over every judge-run
        if c["should_trigger"]:
            tp += triggers
            fn += total - triggers
        else:
            fp += triggers
            tn += total - triggers
        # case-level majority vote
        majority_trigger = triggers > total / 2
        if majority_trigger == c["should_trigger"]:
            case_correct += 1
    prec = round(tp / (tp + fp), 3) if tp + fp else None
    rec = round(tp / (tp + fn), 3) if tp + fn else None
    f1 = round(2 * prec * rec / (prec + rec), 3) if prec and rec else None
    n = len(bench["per_case"])
    return {
        "overall": {"precision": prec, "recall": rec, "f1": f1, "TP": tp, "FP": fp, "FN": fn, "TN": tn},
        "case_level": {"correct": case_correct, "total": n, "accuracy": round(case_correct / n, 3)},
    }


def main() -> int:
    bench = json.loads(Path(sys.argv[1]).read_text())
    got = recompute(bench)
    if "--check" in sys.argv:
        problems = []
        if bench.get("overall") != got["overall"]:
            problems.append(f"overall drift: stored {bench.get('overall')} != recomputed {got['overall']}")
        if bench.get("case_level") != got["case_level"]:
            problems.append(f"case_level drift: stored {bench.get('case_level')} != recomputed {got['case_level']}")
        # sanity: judge-run total must match the declared n_judge_runs
        total_runs = sum(sum(c["routes"].values()) for c in bench["per_case"])
        declared = bench.get("method", {}).get("n_judge_runs")
        if declared is not None and total_runs != declared:
            problems.append(f"judge-run count drift: routes sum to {total_runs} != declared {declared}")
        if problems:
            print("TRIGGER CONSISTENCY FAIL:")
            for p in problems:
                print(" -", p)
            return 1
        print(f"TRIGGER CONSISTENCY OK: {got['overall']['precision']} precision / "
              f"{got['overall']['recall']} recall / {got['case_level']['accuracy']} case accuracy "
              f"recomputed from {len(bench['per_case'])} cases")
        return 0
    print(json.dumps(got, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

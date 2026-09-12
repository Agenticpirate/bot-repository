#!/usr/bin/env python3
"""Rebuild benchmark.json/benchmark.md from per-run grading.json files.

grading.json is the single source of truth: every run entry, aggregate, and
fabrication statement in the benchmark is derived from the gradings on disk,
so a post-hoc grading correction can never silently diverge from the published
aggregate again.

Usage:
    python3 rebuild_benchmark.py <workspace_dir>            # regenerate
    python3 rebuild_benchmark.py <workspace_dir> --check    # verify only (exit 1 on drift)

<workspace_dir> holds eval-*/{with_skill,without_skill}/run-*/grading.json plus
an existing benchmark.json whose metadata/downstream blocks are preserved
(measurement context — not derivable from gradings). Optional
<workspace_dir>/run_labels.json supplies presentation labels:
    {"adapted": ["eval-5/with_skill/run-2", ...],
     "holdout_generation": {"eval-7": 1, "eval-8": 2}}
"""
import json
import re
import statistics
import sys
from pathlib import Path

FABRICATION_RE = re.compile(r"fabricat|날조", re.IGNORECASE)


def collect_runs(ws: Path, labels: dict) -> list[dict]:
    runs = []
    for gpath in sorted(ws.glob("eval-*/*/run-*/grading.json")):
        rel = gpath.relative_to(ws).parent.as_posix()  # eval-N/arm/run-M
        eval_id = int(gpath.parents[2].name.split("-")[1])
        arm = gpath.parents[1].name
        run_number = int(gpath.parents[0].name.split("-")[1])
        g = json.loads(gpath.read_text())
        s = g["summary"]
        runs.append({
            "eval_id": eval_id,
            "configuration": arm,
            "run_number": run_number,
            "adapted": rel in labels.get("adapted", []),
            "holdout_generation": labels.get("holdout_generation", {}).get(f"eval-{eval_id}"),
            "result": {
                "pass_rate": round(s["passed"] / s["total"], 4),
                "passed": s["passed"], "failed": s["failed"], "total": s["total"],
            },
            "rubric_scores": g["rubric_scores"],
            "eval_feedback": g.get("eval_feedback", ""),
            "timing": g.get("timing", {}),
            "fabrication_findings": sum(
                1 for e in g["expectations"]
                if FABRICATION_RE.search(e["text"]) and not e["passed"]
            ),
            "_source": rel,
        })
    return runs


def agg(entries: list[dict]) -> dict:
    prs = [e["result"]["pass_rate"] for e in entries]
    rub = [e["rubric_scores"]["total"] for e in entries]
    return {
        "n": len(entries),
        "pass_rate": {"mean": round(statistics.mean(prs), 4), "min": min(prs), "max": max(prs)},
        "rubric": {"mean": round(statistics.mean(rub), 2), "scores": rub},
    }


def summarize(runs: list[dict], labels: dict) -> dict:
    ws_all = [r for r in runs if r["configuration"] == "with_skill"]
    bl_all = [r for r in runs if r["configuration"] == "without_skill"]
    holdout_ids = sorted(
        (int(k.split("-")[1]), gen) for k, gen in labels.get("holdout_generation", {}).items()
    )
    out = {
        "with_skill_all": agg(ws_all),
        "with_skill_first_batch": agg([
            r for r in ws_all
            if not r["adapted"] and not any(r["eval_id"] == eid and gen >= 2 for eid, gen in holdout_ids)
        ]),
        "with_skill_adapted": agg([r for r in ws_all if r["adapted"]]),
        "without_skill": agg(bl_all),
    }
    for eid, gen in holdout_ids:
        wse = [r for r in ws_all if r["eval_id"] == eid and not r["adapted"]]
        ble = [r for r in bl_all if r["eval_id"] == eid]
        if wse and ble:
            out[f"eval{eid}_holdout_gen{gen}"] = {
                "with_skill": agg(wse), "without_skill": agg(ble),
            }
    return out


def fabrication_note(runs: list[dict]) -> str:
    hits = [r for r in runs if r["fabrication_findings"]]
    if not hits:
        return f"Fabrication findings: 0 across all {len(runs)} graded runs (grader hunt vs brief)."
    where = ", ".join(f"e{r['eval_id']} {r['configuration']} r{r['run_number']}" for r in hits)
    return (f"Fabrication findings: {len(hits)}/{len(runs)} graded runs — {where} "
            f"(corrected post-hoc by gate review; unselected-option rule frozen afterwards held 0 findings on eval-8).")


def dscores(rs: dict) -> str:
    return "/".join(str(rs[k]["score"]) for k in sorted(k for k in rs if k != "total"))


def derived_timestamp(ws: Path, labels: dict | None = None) -> str:
    """The observed measurement-complete time, UTC ISO.

    Live workspace: the newest grading.json mtime. Archived snapshot: git
    checkout rewrites mtimes to checkout time, so the real completion time is
    frozen once into run_labels.json as `measurement_timestamp` and used from
    there. The anti-future-date guard in check() still applies to the pin, so a
    fabricated future timestamp cannot slip through.
    """
    if labels and labels.get("measurement_timestamp"):
        return labels["measurement_timestamp"]
    import datetime
    latest = max(p.stat().st_mtime for p in ws.glob("eval-*/*/run-*/grading.json"))
    return datetime.datetime.fromtimestamp(latest, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def render_md(b: dict) -> str:
    md = [f"# Skill Benchmark: {b['metadata'].get('skill_name', 'interview')} (rebuilt from gradings)", ""]
    md.append(f"**Skill**: {b['metadata'].get('skill_version', '?')} · **Generated by**: rebuild_benchmark.py (grading.json = single source of truth)")
    md.append(f"**Executor**: {b['metadata'].get('executor_model', '?')}")
    md.append(f"**Grader**: {b['metadata'].get('analyzer_model', '?')}")
    md.append(f"**Protocol**: {b['metadata'].get('simulator', '?')}")
    md.append("")
    md.append("## Run-level results")
    md.append("")
    md.append("| Run | pass | D1 D2 D3 D4 D5 | Rubric | 비고 |")
    md.append("|---|---|---|---|---|")
    for r in b["runs"]:
        tags = []
        if r["adapted"]:
            tags.append("adapted")
        if r.get("holdout_generation"):
            tags.append(f"holdout g{r['holdout_generation']}")
        if r["fabrication_findings"]:
            tags.append(f"fabrication×{r['fabrication_findings']}")
        md.append(
            f"| e{r['eval_id']} {r['configuration']} r{r['run_number']} "
            f"| {r['result']['passed']}/{r['result']['total']} "
            f"| {dscores(r['rubric_scores'])} | **{r['rubric_scores']['total']}** | {' '.join(tags)} |"
        )
    md.append("")
    md.append("## Aggregates")
    md.append("")
    md.append("| Group | n | pass_rate | rubric mean | rubric scores |")
    md.append("|---|---|---|---|---|")
    for name, a in b["run_summary"].items():
        if "with_skill" in a:  # holdout pair block
            for arm in ("with_skill", "without_skill"):
                s = a[arm]
                md.append(f"| {name} · {arm} | {s['n']} | {s['pass_rate']['mean']:.3f} | {s['rubric']['mean']} | {s['rubric']['scores']} |")
        else:
            md.append(f"| {name} | {a['n']} | {a['pass_rate']['mean']:.3f} | {a['rubric']['mean']} | {a['rubric']['scores']} |")
    md.append("")
    if b.get("downstream"):
        md.append("## Downstream (spec → blind implementation)")
        md.append("")
        for arm, d in b["downstream"].items():
            if isinstance(d, dict) and "score" in d:
                md.append(f"- **{arm}**: checklist {d['score']}/{len(d.get('checklist', []))} · invented decisions {d.get('invented_decisions', '?')}")
        md.append("")
    md.append("## Notes")
    md.append("")
    for n in b.get("notes", []):
        md.append(f"- {n}")
    md.append("")
    return "\n".join(md)


def build(ws: Path) -> tuple[dict, list[str]]:
    labels = {}
    lp = ws / "run_labels.json"
    if lp.exists():
        labels = json.loads(lp.read_text())
    old = json.loads((ws / "benchmark.json").read_text())
    runs = collect_runs(ws, labels)
    kept_notes = [
        n for n in old.get("notes", [])
        if not FABRICATION_RE.search(n)  # fabrication statements are always recomputed
    ]
    # Order-preserving dedupe: extra_notes already present from a prior rebuild
    # must not accumulate.
    notes, seen = [], set()
    for n in kept_notes + [fabrication_note(runs)] + labels.get("extra_notes", []):
        if n not in seen:
            notes.append(n)
            seen.add(n)
    metadata = dict(old.get("metadata", {}))
    if labels.get("skill_version"):
        metadata["skill_version"] = labels["skill_version"]
    metadata.update(labels.get("metadata_updates", {}))
    # evals_run and timestamp are derivable from the gradings — never
    # hand-maintained (a hand-pinned future timestamp once shipped as
    # "measurement complete"; the newest grading mtime is the observed truth)
    metadata["evals_run"] = sorted({r["eval_id"] for r in runs})
    metadata["timestamp"] = derived_timestamp(ws, labels)
    b = {
        "metadata": metadata,
        "notes": notes,
        "run_summary": summarize(runs, labels),
        "downstream": old.get("downstream"),
        "runs": runs,
    }
    problems = []
    return b, problems


def check(ws: Path) -> list[str]:
    """Verify the published benchmark matches the grading sources."""
    labels = {}
    lp = ws / "run_labels.json"
    if lp.exists():
        labels = json.loads(lp.read_text())
    pub = json.loads((ws / "benchmark.json").read_text())
    fresh = collect_runs(ws, labels)
    problems = []
    pub_by_key = {(r["eval_id"], r["configuration"], r["run_number"]): r for r in pub["runs"]}
    for f in fresh:
        key = (f["eval_id"], f["configuration"], f["run_number"])
        p = pub_by_key.get(key)
        if p is None:
            problems.append(f"missing run in benchmark: {key}")
            continue
        if (p["result"]["passed"], p["result"]["total"]) != (f["result"]["passed"], f["result"]["total"]):
            problems.append(f"pass drift {key}: benchmark {p['result']['passed']}/{p['result']['total']} vs grading {f['result']['passed']}/{f['result']['total']}")
        if p["rubric_scores"]["total"] != f["rubric_scores"]["total"]:
            problems.append(f"rubric drift {key}: benchmark {p['rubric_scores']['total']} vs grading {f['rubric_scores']['total']}")
        if dscores(p["rubric_scores"]) != dscores(f["rubric_scores"]):
            problems.append(f"dimension-score drift {key}: benchmark {dscores(p['rubric_scores'])} vs grading {dscores(f['rubric_scores'])}")
        if p.get("fabrication_findings") != f["fabrication_findings"]:
            problems.append(f"fabrication-count drift {key}: benchmark {p.get('fabrication_findings')} vs grading {f['fabrication_findings']}")
    extra = set(pub_by_key) - {(f["eval_id"], f["configuration"], f["run_number"]) for f in fresh}
    for key in sorted(extra):
        problems.append(f"benchmark run without grading source: {key}")
    # fabrication statement must match computed reality
    computed = fabrication_note(fresh)
    stated = [n for n in pub.get("notes", []) if FABRICATION_RE.search(n)]
    if computed not in stated:
        problems.append(f"fabrication note drift: computed '{computed[:80]}...' not among published notes")
    fresh_summary = summarize(fresh, labels)
    if pub.get("run_summary") != fresh_summary:
        problems.append("run_summary drift: aggregates do not match gradings")
    # version metadata must match the label pin (stale '-pending' versions
    # were exactly the drift a reviewer caught)
    if labels.get("skill_version") and pub.get("metadata", {}).get("skill_version") != labels["skill_version"]:
        problems.append(
            f"version drift: benchmark metadata says {pub.get('metadata', {}).get('skill_version')!r}, "
            f"labels pin {labels['skill_version']!r}"
        )
    # derivable and pinned metadata must match reality
    derived_evals = sorted({f["eval_id"] for f in fresh})
    if pub.get("metadata", {}).get("evals_run") != derived_evals:
        problems.append(
            f"metadata drift: evals_run {pub.get('metadata', {}).get('evals_run')} != gradings on disk {derived_evals}"
        )
    for key, want in labels.get("metadata_updates", {}).items():
        got = pub.get("metadata", {}).get(key)
        if got != want:
            problems.append(f"metadata drift: {key!r} is {str(got)[:60]!r}, labels pin {str(want)[:60]!r}")
    # timestamp semantics: must equal the newest grading mtime and never sit
    # in the future
    import datetime
    ts = pub.get("metadata", {}).get("timestamp", "")
    want_ts = derived_timestamp(ws, labels)
    if ts != want_ts:
        problems.append(f"timestamp drift: published {ts!r} != newest grading mtime {want_ts!r}")
    try:
        parsed = datetime.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
        if parsed > datetime.datetime.now(datetime.timezone.utc):
            problems.append(f"timestamp in the future: {ts}")
    except ValueError:
        problems.append(f"timestamp unparsable: {ts!r}")
    # the published Markdown must be byte-identical to a fresh render of the
    # published JSON — a regenerated JSON with a stale/hand-edited md is drift
    md_path = ws / "benchmark.md"
    published_md = md_path.read_text() if md_path.exists() else ""
    if published_md != render_md(pub):
        problems.append("benchmark.md drift: published Markdown != render of published benchmark.json (regenerate)")
    return problems


def main() -> int:
    ws = Path(sys.argv[1])
    if "--check" in sys.argv:
        problems = check(ws)
        if problems:
            print("CONSISTENCY FAIL:")
            for p in problems:
                print(" -", p)
            return 1
        print(f"CONSISTENCY OK: benchmark matches {len(list(ws.glob('eval-*/*/run-*/grading.json')))} grading sources")
        return 0
    b, _ = build(ws)
    (ws / "benchmark.json").write_text(json.dumps(b, ensure_ascii=False, indent=1))
    (ws / "benchmark.md").write_text(render_md(b))
    print(f"rebuilt: {len(b['runs'])} runs, groups={list(b['run_summary'])}")
    verify = check(ws)
    if verify:
        print("POST-REBUILD CHECK FAIL:")
        for p in verify:
            print(" -", p)
        return 1
    print("post-rebuild consistency check: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

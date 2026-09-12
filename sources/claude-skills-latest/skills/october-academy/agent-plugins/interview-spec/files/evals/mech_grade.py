#!/usr/bin/env python3
"""Mechanical grader for interview-skill eval runs.

Usage: python3 mech_grade.py <run_dir> <prompt>

Checks the 6 mechanically-verifiable assertions against a run directory
(outputs/ + project/.claude/) and writes mechanical_grades.json into run_dir.
Qualitative assertions are left to the grader agent.
"""
import json
import re
import sys
from pathlib import Path

COMPLETION_RE = re.compile(
    r"clarification complete|proceed with current understanding|현재 이해로 진행|명확화 완료|이대로 진행",
    re.IGNORECASE,
)
ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:?\d{2}|Z)$")


def check(run_dir: Path, prompt: str) -> list[dict]:
    outputs = run_dir / "outputs"
    results = []

    # --- gather rounds ---
    round_files = sorted(outputs.glob("questions_round_*.json"))
    rounds = []
    parse_errors = []
    for f in round_files:
        try:
            rounds.append((f.name, json.loads(f.read_text())))
        except json.JSONDecodeError as e:
            parse_errors.append(f"{f.name}: {e}")

    def questions_of(payload):
        qs = payload.get("questions", []) if isinstance(payload, dict) else []
        return qs if isinstance(qs, list) else []

    # A1: state file with required frontmatter. Since v3.0.0 the skill mandates
    # post-promise self-deletion in hookless runtimes, so a missing live file is
    # not by itself a failure: fall back to an audit copy under outputs/, then to
    # lifecycle evidence in run_log.md (creation + deletion documented).
    state_candidates = list((run_dir / "project" / ".claude").glob("clarify-*.local.md"))
    audit_note = ""
    if not state_candidates:
        audit = sorted(p for p in outputs.glob("*state*") if p.suffix == ".md")
        if audit:
            state_candidates = audit[:1]
            audit_note = f" (live file deleted post-promise per SKILL.md; validated from audit copy {audit[0].name})"
    if state_candidates:
        text = state_candidates[0].read_text()
        m = re.search(r"^---\n(.*?)\n---", text, re.DOTALL)
        fm = m.group(1) if m else ""
        fields = {}
        for line in fm.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                fields[k.strip()] = v.strip().strip('"')
        missing = [k for k in ("iteration", "max_iterations", "original_requirement", "started_at") if k not in fields]
        iso_ok = ISO_RE.match(fields.get("started_at", "")) is not None
        passed = not missing and iso_ok
        ev = f"{state_candidates[0].name}: fields={list(fields)}; started_at ISO valid={iso_ok}{audit_note}"
        if missing:
            ev += f"; missing={missing}"
    else:
        final_p = outputs / "final_summary.md"
        log_p = outputs / "run_log.md"
        promise_ok = final_p.exists() and any(
            tag in final_p.read_text()
            for tag in ("<promise>CLARIFICATION COMPLETE</promise>", "<promise>CLARIFICATION CAPPED</promise>")
        )
        log_text = log_p.read_text() if log_p.exists() else ""
        lifecycle = bool(
            re.search(r"clarify-interview\.local\.md|state file", log_text, re.IGNORECASE)
            and re.search(r"delet|삭제", log_text, re.IGNORECASE)
            and re.search(r"creat|생성|만들", log_text, re.IGNORECASE)
        )
        if promise_ok and lifecycle:
            passed = True
            ev = (
                "state file deleted post-promise per SKILL.md; creation/updates/deletion documented in run_log.md; "
                "frontmatter fields not mechanically verifiable — grader must confirm from round records"
            )
        else:
            passed, ev = False, "no clarify-*.local.md under project/.claude/ and no audit copy or lifecycle evidence"
    results.append({
        "text": "State file created in project/.claude/ with iteration, max_iterations, original_requirement, and ISO-8601 started_at frontmatter",
        "passed": passed, "evidence": ev,
    })

    # A2: every round ≤4 questions, single batched payload per round, rounds contiguous 1..N
    if rounds:
        counts = {name: len(questions_of(p)) for name, p in rounds}
        bad = {n: c for n, c in counts.items() if c < 1 or c > 4}
        nums = sorted(int(re.search(r"(\d+)", n).group(1)) for n, _ in rounds)
        contiguous = nums == list(range(1, len(nums) + 1))
        passed = not bad and not parse_errors and contiguous
        ev = f"question counts per round: {counts}; rounds contiguous={contiguous}"
        if parse_errors:
            ev += f"; parse errors: {parse_errors}"
    else:
        passed, ev = False, "no questions_round_*.json files found"
    results.append({
        "text": "Every question round has at most 4 questions, batched as a single payload",
        "passed": passed, "evidence": ev,
    })

    # A3: every question has 2-4 concrete options — non-empty question text,
    # distinct multi-char labels, and a non-empty description per option
    if rounds:
        bad_qs = []
        total_qs = 0
        for name, p in rounds:
            for i, q in enumerate(questions_of(p)):
                total_qs += 1
                opts = q.get("options", []) if isinstance(q, dict) else []
                labels = [o.get("label", "") for o in opts if isinstance(o, dict)]
                descs = [str(o.get("description", "")) for o in opts if isinstance(o, dict)]
                stripped = [l.strip() for l in labels]
                dupes = len(stripped) != len(set(stripped))
                q_text_ok = bool(str(q.get("question", "")).strip()) if isinstance(q, dict) else False
                empty_desc = any(not d.strip() for d in descs)
                # len>=2: two-char Korean labels ("기타", "예만") are legitimate
                if (not (2 <= len(labels) <= 4) or any(len(l) < 2 for l in stripped)
                        or dupes or not q_text_ok or empty_desc):
                    why = []
                    if dupes: why.append("dup-labels")
                    if not q_text_ok: why.append("empty-question")
                    if empty_desc: why.append("empty-description")
                    if any(len(l) < 2 for l in stripped): why.append("label<2ch")
                    bad_qs.append(f"{name}#q{i+1}(opts={len(labels)}{',' + '+'.join(why) if why else ''})")
        passed = total_qs > 0 and not bad_qs
        ev = f"{total_qs} questions checked; violations: {bad_qs or 'none'}"
    else:
        passed, ev = False, "no question rounds to check"
    results.append({
        "text": "Every question offers 2-4 concrete hypothesis options (no open-ended-only questions)",
        "passed": passed, "evidence": ev,
    })

    # A4 (exit handling) is grader-judged from iteration-2 onward.

    # A5: final summary structure
    fs = outputs / "final_summary.md"
    if fs.exists():
        t = fs.read_text()
        has_before = re.search(r"###\s*Before", t) is not None
        has_after = re.search(r"###\s*After", t) is not None
        verbatim = prompt.strip() in t
        sections = all(re.search(rf"\*\*{s}\*\*", t) for s in ("Goal", "Scope", "Constraints", "Success Criteria"))
        table = re.search(r"\|\s*(Question|질문)\s*\|\s*(Decision|결정)\s*\|", t) is not None
        passed = has_before and has_after and verbatim and sections and table
        ev = (f"Before={has_before} After={has_after} verbatim-original={verbatim} "
              f"Goal/Scope/Constraints/SuccessCriteria={sections} decisions-table={table}")
    else:
        passed, ev = False, "outputs/final_summary.md missing"
    results.append({
        "text": "Final output contains Before (verbatim original) and After sections with Goal/Scope/Constraints/Success Criteria and a decisions table",
        "passed": passed, "evidence": ev,
    })

    # A6: exactly one terminal promise tag, the summary text ENDS with it, and the
    # tag's meaning matches the summary (CAPPED needs a real Still Open section
    # with at least one non-empty item — the bare string "Still Open" anywhere in
    # prose is not a section; a COMPLETE summary must not carry un-asked (미질문) axes)
    def still_open_section(text):
        # Section = '**Still Open**' bold marker or a '## / ### / #### Still Open'
        # heading, running until the next bold-marker/heading/EOF.
        m = re.search(r"(\*\*Still Open\*\*|#{2,4}\s*Still Open[^\n]*)(.*?)(?=\n\*\*[A-Za-z가-힣]|\n#{2,4}\s|\Z)", text, re.DOTALL)
        if not m:
            return None, 0
        body = m.group(2)
        items = [
            line for line in body.splitlines()
            if re.match(r"\s*([-*|•]|\d+[.)])", line) and len(re.sub(r"^\s*([-*|•]|\d+[.)])\s*", "", line).strip()) >= 2
        ]
        return m.group(0), len(items)

    TAGS = ("<promise>CLARIFICATION COMPLETE</promise>", "<promise>CLARIFICATION CAPPED</promise>")
    # v3.1.1 budget rule needs the round budget from the state frontmatter:
    # a fully-consumed budget (iteration >= max_iterations) must end CAPPED.
    budget_consumed = None
    if state_candidates:
        sm = re.search(r"^---\n(.*?)\n---", state_candidates[0].read_text(), re.DOTALL)
        if sm:
            sf = dict(
                (line.split(":", 1)[0].strip(), line.split(":", 1)[1].strip().strip('"'))
                for line in sm.group(1).splitlines() if ":" in line
            )
            try:
                it_n, max_n = int(sf.get("iteration", "")), int(sf.get("max_iterations", ""))
                budget_consumed = max_n > 0 and it_n >= max_n
            except ValueError:
                budget_consumed = None
    if fs.exists():
        t = fs.read_text()
        occurrences = sum(t.count(tag) for tag in TAGS)
        found = [tag for tag in TAGS if tag in t]
        ends_with = any(t.rstrip().endswith(tag) for tag in found)
        meaning_ok, meaning_note = True, ""
        if found:
            if "CAPPED" in found[0] and occurrences == 1:
                section, n_items = still_open_section(t)
                meaning_ok = section is not None and n_items >= 1
                if section is None:
                    meaning_note = "; CAPPED without a Still Open section"
                elif n_items < 1:
                    meaning_note = "; CAPPED with an empty Still Open section (no items)"
            if "COMPLETE" in found[0] and occurrences == 1:
                # Un-asked axes are only a mismatch when they sit in Still Open
                # (material); 미질문 non-material details may live in Assumptions.
                section, _ = still_open_section(t)
                if section and re.search(r"미질문", section):
                    meaning_ok = False
                    meaning_note = "; COMPLETE tag but Still Open carries un-asked (미질문) material axes"
                if budget_consumed:
                    meaning_ok = False
                    meaning_note += "; COMPLETE at a fully-consumed round budget (iteration >= max_iterations) — v3.1.1 requires CAPPED"
        passed = occurrences == 1 and ends_with and meaning_ok
        if not found:
            ev = "no terminal promise tag in final_summary.md"
        elif occurrences > 1:
            ev = f"{occurrences} promise tags present — must be exactly one"
        elif not ends_with:
            ev = f"tag {found[0]} present but the summary does not end with it"
        else:
            ev = f"terminal tag {found[0]} ends final_summary.md{meaning_note}" if meaning_ok else f"tag/meaning mismatch{meaning_note}"
    else:
        passed, ev = False, "outputs/final_summary.md missing"
    results.append({
        "text": ("Terminal promise tag emitted at the very end of the final summary: "
                 "<promise>CLARIFICATION COMPLETE</promise>, or <promise>CLARIFICATION CAPPED</promise> "
                 "when the round budget ran out with material axes unasked"),
        "passed": passed, "evidence": ev,
    })

    # A7: claim-audit ledger in the state file's Clarification Progress
    state_text = ""
    if state_candidates:
        state_text = state_candidates[0].read_text()
    if state_text:
        # Heading level/placement is presentation, not substance: accept '## Claim audit'
        # or '### Claim audit' anywhere in the state file. Substance = at least 3
        # distinct mapping lines, each carrying a recognizable source token.
        m = re.search(r"#{2,3}\s*Claim audit", state_text, re.IGNORECASE)
        mapping_lines = 0
        distinct_claims = set()
        if m:
            block = state_text[m.end():m.end() + 4000]
            # A mapping line = a list/table item that pairs a CLAIM with a SOURCE.
            # Separator style (|, →, ←, —, :) varies too much to whitelist — the
            # source token is the signal, but a bare source token ("- 답변") is
            # not a mapping: after stripping the marker and every source token,
            # actual claim text must remain, and claims must be distinct.
            # Specific sources only: a round/question reference, a territory
            # path, or a NUMBERED assumption. Bare '답변' / unnumbered '가정'
            # identify nothing and don't count as a source.
            src_re = re.compile(r"(R\d+(\.Q\d+)?(\s*답변)?|territory\s+\S+|영토\s+\S+|가정\s*#\d+|assumption\s*#\d+)", re.IGNORECASE)
            for line in block.splitlines():
                if not (re.match(r"\s*([-*|•]|\d+[.)])", line) and src_re.search(line)):
                    continue
                claim = re.sub(r"^\s*([-*|•]|\d+[.)])\s*", "", line)
                claim = src_re.sub("", claim)
                claim = re.sub(r"[|→←—:\-`\s]+", " ", claim).strip()
                if len(claim) >= 8:
                    mapping_lines += 1
                    distinct_claims.add(claim)
        passed = bool(m) and mapping_lines >= 3 and len(distinct_claims) >= 3
        ev = (f"'Claim audit' block found with {mapping_lines} claim→source mapping lines ({len(distinct_claims)} distinct claims)" if passed
              else (f"'Claim audit' heading found but only {mapping_lines} substantive mapping lines / {len(distinct_claims)} distinct claims (need >=3 of each — bare source tokens don't count)" if m
                    else "no 'Claim audit' block in state file"))
    else:
        passed, ev = False, "no state file or audit copy to check for the claim-audit block"
    results.append({
        "text": ("State file contains a 'Claim audit' block mapping each After-spec "
                 "factual claim (parentheticals and motivation/state claims included) to its source — round answer, "
                 "territory path, or numbered assumption"),
        "passed": passed, "evidence": ev,
    })

    return results


def main():
    run_dir = Path(sys.argv[1])
    prompt = sys.argv[2]
    results = check(run_dir, prompt)
    out = run_dir / "mechanical_grades.json"
    out.write_text(json.dumps({"expectations": results}, ensure_ascii=False, indent=2))
    passed = sum(1 for r in results if r["passed"])
    print(f"{run_dir}: {passed}/{len(results)} mechanical assertions passed")


if __name__ == "__main__":
    main()

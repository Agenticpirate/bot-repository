#!/usr/bin/env python3
"""Adversarial negative tests for mech_grade.py.

Each case builds a minimal synthetic run directory that a lazy or gaming run
could produce, and asserts the targeted assertion FAILS (or, for the paired
positive control, PASSES). Run: python3 test_mech_grade.py
"""
import json
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from mech_grade import check  # noqa: E402

PROMPT = "테스트 요구사항"
PASSED = 0
FAILED = 0


def build_run(tmp: Path, final_summary: str, state_body: str,
              iteration: int = 3, max_iterations: int = 3) -> Path:
    run = tmp / "run"
    if run.exists():
        shutil.rmtree(run)
    out = run / "outputs"
    out.mkdir(parents=True)
    (out / "questions_round_1.json").write_text(json.dumps({
        "questions": [{
            "question": "데이터는 어디에 있나요?",
            "options": [
                {"label": "DB 직접 연동", "description": "운영 DB에 읽기 전용으로 붙는다"},
                {"label": "CSV 내보내기", "description": "매일 CSV를 내려받아 읽는다"},
            ],
        }],
    }, ensure_ascii=False))
    (out / "final_summary.md").write_text(final_summary)
    (out / "state_file_final_pre_deletion.md").write_text(
        "---\n"
        f'iteration: {iteration}\nmax_iterations: {max_iterations}\n'
        'original_requirement: "테스트 요구사항"\n'
        'started_at: "2026-07-11T09:00:00+09:00"\n'
        "---\n\n## Clarification Progress\n" + state_body
    )
    return run


def summary_md(tag: str, extra: str = "") -> str:
    return (
        "## Requirement Clarification Summary\n\n"
        f"### Before\n\"{PROMPT}\"\n\n### After\n"
        "**Goal**: X **Scope**: Y **Constraints**: Z **Success Criteria**: W\n\n"
        "| Question | Decision |\n|---|---|\n| Q | D |\n\n"
        f"{extra}\n\n<promise>CLARIFICATION {tag}</promise>"
    )


def get(results: list, needle: str) -> dict:
    return next(r for r in results if needle in r["text"])


def case(name: str, run: Path, needle: str, expect_pass: bool) -> None:
    global PASSED, FAILED
    r = get(check(run, PROMPT), needle)
    if r["passed"] == expect_pass:
        PASSED += 1
    else:
        FAILED += 1
        print(f"FAIL [{name}] expected passed={expect_pass}, got {r['passed']}: {r['evidence'][:140]}")


def main() -> int:
    tmp = Path(tempfile.mkdtemp())
    AUDIT_OK = (
        "### Claim audit\n"
        "- 하루 1회 아침 실행 — R1.Q4 답변\n"
        "- 데이터 소스는 CSV 이메일 — R1.Q1 답변\n"
        "- 인코딩은 UTF-8 우선 시도 — 가정 #2\n"
    )

    # --- A6: CAPPED needs a REAL Still Open section ---
    case("A6- CAPPED, 'Still Open' only in prose",
         build_run(tmp, summary_md("CAPPED", "위 항목은 Still Open 상태를 반영했다."), AUDIT_OK),
         "Terminal promise", False)
    case("A6- CAPPED, Still Open section with no items",
         build_run(tmp, summary_md("CAPPED", "**Still Open**\n\n(없음)"), AUDIT_OK),
         "Terminal promise", False)
    case("A6+ CAPPED, Still Open with a real item",
         build_run(tmp, summary_md("CAPPED", "**Still Open**\n- 발주 기록 방식 — 미질문, 라운드 예산 소진\n"), AUDIT_OK),
         "Terminal promise", True)
    case("A6- COMPLETE but Still Open carries 미질문 axes",
         build_run(tmp, summary_md("COMPLETE", "**Still Open**\n- 권한 모델 — 미질문\n"), AUDIT_OK, iteration=2),
         "Terminal promise", False)
    case("A6+ COMPLETE clean (budget to spare)",
         build_run(tmp, summary_md("COMPLETE"), AUDIT_OK, iteration=2),
         "Terminal promise", True)
    case("A6- COMPLETE at fully-consumed budget (v3.1.1: CAPPED required)",
         build_run(tmp, summary_md("COMPLETE"), AUDIT_OK, iteration=3, max_iterations=3),
         "Terminal promise", False)
    case("A6+ CAPPED at fully-consumed budget",
         build_run(tmp, summary_md("CAPPED", "**Still Open**\n- 라운드 예산 소진 — 미탐지 축 잔존 가능성\n"), AUDIT_OK, iteration=3),
         "Terminal promise", True)

    # --- A7: bare source tokens are not a mapping ---
    case("A7- three bare '- 답변' lines",
         build_run(tmp, summary_md("COMPLETE"), "### Claim audit\n- 답변\n- 답변\n- 답변\n", iteration=2),
         "Claim audit", False)
    case("A7- generic '답변'/unnumbered '가정' sources don't identify anything",
         build_run(tmp, summary_md("COMPLETE"),
                   "### Claim audit\n- 아침마다 실행하는 방식이다 — 답변\n- 기준은 상품마다 다르다 — 가정\n- 목록 하나로 출력한다 — 답변\n", iteration=2),
         "Claim audit", False)
    case("A7- three identical claims",
         build_run(tmp, summary_md("COMPLETE"),
                   "### Claim audit\n- 같은 주장 반복 — R1.Q1 답변\n- 같은 주장 반복 — R1.Q2 답변\n- 같은 주장 반복 — R2.Q1 답변\n", iteration=2),
         "Claim audit", False)
    case("A7- heading only, no lines",
         build_run(tmp, summary_md("COMPLETE"), "### Claim audit\n(정리 예정)\n", iteration=2),
         "Claim audit", False)
    case("A7+ three distinct claim→source mappings",
         build_run(tmp, summary_md("COMPLETE"), AUDIT_OK, iteration=2),
         "Claim audit", True)
    case("A7+ territory-path and numbered-assumption sources",
         build_run(tmp, summary_md("COMPLETE"),
                   "### Claim audit\n- 취소 경로가 코드에 없다 → territory server.js:41\n- 발송 전 상태만 취소 — R1.Q1 답변\n- 인코딩은 UTF-8 우선 — 가정 #1\n", iteration=2),
         "Claim audit", True)

    shutil.rmtree(tmp)
    print(f"\nmech_grade adversarial tests: {PASSED} passed, {FAILED} failed")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())

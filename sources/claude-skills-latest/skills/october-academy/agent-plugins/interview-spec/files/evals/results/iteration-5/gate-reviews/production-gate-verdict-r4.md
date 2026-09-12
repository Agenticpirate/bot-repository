## 판정
PRODUCTION_READY: no

훅의 반복-COMPLETE 분기는 수정됐지만, SKILL의 state 선삭제 지시가 cap 검사를 우회합니다. 또한 `--check`가 통과해도 게시 JSON의 eval/version 설명 메타데이터가 stale이어서 G1·G3·G5가 실패합니다.

## 필수 조치 3건 검증

1. **부분 해소** — 첫 COMPLETE는 CAPPED 재발화를 요구하고, 두 번째 COMPLETE는 상태 제거 후 위반 라벨의 정정 block을 반환합니다([stop-hook.sh:154](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:154), [test-stop-hook.sh:221](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:221)). 그러나 SKILL은 promise 출력 직후 state를 삭제하라고 지시하며([SKILL.md:162](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:162)), state가 없으면 훅이 출력 검사 전에 종료합니다([stop-hook.sh:38](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:38)). 따라서 실제 실행에서는 첫 COMPLETE부터 우회 가능합니다. 읽기 전용 sandbox의 `mktemp` 제한으로 suite 실행은 불가능했으며 구문 검사와 코드 경로로 검증했습니다.

2. **부분 해소** — `--check`는 32개 grading source와 일치했고, D1–D5·fabrication count·aggregate·Markdown byte equality·`skill_version`을 검사합니다([rebuild_benchmark.py:192](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/rebuild_benchmark.py:192)). notes 중복도 없고 `extra_notes`는 eval-8/9 이력을 정직하게 공개합니다([run_labels.json:15](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/run_labels.json:15>)). 다만 게시 JSON은 `evals_run`에서 eval-9를 누락하고 `purpose`에 여전히 `v3.1.0-pending`을 기록하며([benchmark.json:10](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:10>), [benchmark.json:18](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:18>)), 검사기는 `skill_version` 이외 메타데이터 drift를 확인하지 않습니다([rebuild_benchmark.py:227](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/rebuild_benchmark.py:227)).

3. **해소** — `awaiting_user`는 옵션 토큰 2개와 질문 신호를 모두 요구하고([stop-hook.sh:197](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:197)), A6은 완전 소진 시 COMPLETE를 실패시키며([mech_grade.py:181](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:181)), 실제 eval-8 r3은 FAIL, eval-9 r1/r3 CAPPED·r2 COMPLETE 및 eval-4 CAPPED는 PASS로 재현됐습니다. A7의 일반 출처 배제와 assertion 8 문구 정정도 반영됐습니다([mech_grade.py:256](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:256), [evals.json:843](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/evals.json:843)).

## 신규 발견 결함

- **[상] SKILL의 state 선삭제가 cap enforcement를 우회함** — 모델이 지시대로 state를 지운 뒤 COMPLETE를 출력하면 Stop hook은 active loop가 없다고 판단해 즉시 성공 종료합니다. 수정안: hook-enabled 경로에서는 모델의 self-delete를 금지하고 hook만 검증 후 삭제하게 하며, “cap COMPLETE + Stop 전에 state 삭제” 통합 테스트를 추가해야 합니다.

- **[하네스-상] 메타데이터 drift가 `--check`에서 false-green** — `skill_version`만 3.1.1로 바뀌었고 `purpose`, `evals_run`, executor/grader 범위, timestamp는 eval-9를 반영하지 않습니다. 수정안: 해당 필드를 현재 측정 범위로 재생성하고 `--check`가 labels/runs에서 파생 가능한 메타데이터까지 검증하게 해야 합니다.

## 게이트 체크

- **G1 — FAIL**: 실제 SKILL 실행 순서가 state를 먼저 삭제해 fail-closed cap 경로를 우회합니다.
- **G2 — PASS**: eval-9 grading은 Round 3 이후 수정되지 않았고 계약 7/7×3, fabrication 0/6, rubric 9.67 대 9.33이 유지됩니다([benchmark.md:38](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:38>)).
- **G3 — FAIL**: SKILL 문구와 A6은 CAPPED를 요구하지만 hook enforcement가 state 선삭제로 construction상 우회됩니다.
- **G4 — PASS**: downstream은 변경 없이 양팔 5/5이며 결과 안전성 열세가 없습니다([benchmark.md:62](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:62>)).
- **G5 — FAIL**: 수치·Markdown·notes는 일치하지만 게시 JSON 메타데이터와 검사 범위가 eval-9/v3.1.1의 실제 provenance를 완전히 반영하지 않습니다.

## 배포 전 필수 조치

1. terminal promise 전에 state를 삭제하지 못하게 lifecycle을 수정하고, self-delete 우회 회귀 테스트를 추가합니다.
2. `benchmark.json`의 전체 메타데이터를 eval-9/v3.1.1 기준으로 재생성하고 `--check` 검증 범위를 확장합니다. eval-9 grading 재측정이나 수정은 필요하지 않습니다.


## 판정

PRODUCTION_READY: no

eval-9 자체는 G2를 충족했지만, 소진 cap에서 두 번째 COMPLETE를 훅이 수락해 보수적 종료 계약이 강제되지 않습니다. 또한 benchmark 검사가 실제로 불일치한 Markdown을 누락해 측정 게이트가 false-green입니다.

## 필수 조치 3건 검증

1. **부분 해소** — 정책은 완전 소진 시 항상 CAPPED로 명확해졌고([SKILL.md:117](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:117)), eval-9도 3/3 소진한 r1·r3은 CAPPED, 2/3 자가 종료한 r2는 COMPLETE를 정확히 출력했습니다([r1 final_summary.md:53](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-9/with_skill/run-1/outputs/final_summary.md:53), [r2 final_summary.md:50](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-9/with_skill/run-2/outputs/final_summary.md:50), [r3 final_summary.md:55](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-9/with_skill/run-3/outputs/final_summary.md:55)). 그러나 훅은 `cap_complete_rejected=true` 뒤의 두 번째 COMPLETE를 정상 종료로 수락하며([stop-hook.sh:159](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:159), [stop-hook.sh:173](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:173)), T16도 그 위반을 성공으로 고정합니다([test-stop-hook.sh:221](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:221)). 따라서 “cap에서 COMPLETE를 수락하지 않음”은 미완입니다.

2. **부분 해소** — `--check`는 32개 grading 원천과 `benchmark.json`의 수치 일치를 통과했고, eval-6 r6·eval-8·eval-9 집계도 원천과 일치합니다([benchmark.md:22](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:22), [benchmark.md:57](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:57), [benchmark.md:59](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:59)). 하지만 검사기는 `benchmark.json`만 비교하고 `benchmark.md`를 전혀 검증하지 않습니다([rebuild_benchmark.py:188](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/rebuild_benchmark.py:188)). 실제 재렌더링 비교에서 현재 Markdown은 불일치했는데도 `CONSISTENCY OK`였으며, 게시 메타데이터도 아직 `3.1.0-pending`입니다([benchmark.md:3](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:3)).

3. **부분 해소** — T18은 flag만 있고 번호형 줄도 없는 경우 재주입합니다([test-stop-hook.sh:237](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:237)). 그러나 훅은 실제 질문·옵션이 아니라 숫자로 시작하는 줄 하나만 있으면 대기 상태를 허용합니다([stop-hook.sh:191](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:191)). A6도 `iteration == max_iterations`를 검사하지 않아, 3/3에서 COMPLETE였던 eval-8 r3을 현재 코드로 다시 검사해도 PASS하며([state_file_final_pre_deletion.md:2](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-8/with_skill/run-3/outputs/state_file_final_pre_deletion.md:2), [final_summary.md:53](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-8/with_skill/run-3/outputs/final_summary.md:53)), A7은 여전히 일반 `답변`과 번호 없는 `가정`을 source로 인정합니다([mech_grade.py:238](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:238)).

## 신규 발견 결함

- **[상] cap에서 반복 COMPLETE를 성공으로 수락** — 첫 교정 요청을 모델이 한 번 더 무시하면 거짓 COMPLETE가 사용자에게 최종 결과로 남습니다. 수정안: 두 번째 COMPLETE도 성공으로 간주하지 말고, 명시적 실패로 정리하거나 제한된 재시도 후 오류 종료하십시오.

- **[하네스-상] benchmark 검사가 실제 게시물 drift를 놓침** — `benchmark.md`가 재생성 결과와 다른 상태에서도 검사 결과가 성공입니다. 수정안: `--check`가 Markdown 전체를 `render_md(fresh)`와 byte 비교하고, run별 fabrication·dimension 점수·버전 메타데이터까지 검증하게 하십시오.

- **[중] 질문 없는 `awaiting_user` false-positive가 여전히 가능** — `1) 진행 상황 정리` 같은 번호형 비질문도 세션을 대기 상태로 방치합니다. 수정안: 질문 본문과 2개 이상의 옵션 토큰을 함께 검증하십시오.

- **[하네스-중] eval-9 assertion 자체가 모순** — assertion 8은 관리자 scope가 “asked question”에 추적돼야 한다고 요구하지만([evals.json:845](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/evals.json:845)), assertion 16은 README에서 유도 가능한 사실을 다시 묻지 말라고 요구합니다([evals.json:877](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/evals.json:877)). grader가 문언을 재해석해 PASS했으므로 총 pass 수는 엄밀히 재현 가능하지 않습니다. “asked answer 또는 명시적 territory source”로 assertion을 수정해야 합니다.

## 게이트 체크

- **G1 — FAIL**: 훅이 소진 cap의 두 번째 COMPLETE를 정상 종료로 수락하는 상-severity 계약 위반이 남았습니다.
- **G2 — PASS**: eval-9 계약은 7/7·7/7·7/7, fabrication 0/6이며, 루브릭은 with_skill 9.67 대 baseline 9.33입니다.
- **G3 — FAIL**: eval-9 세 런은 규칙을 지켰지만 훅의 T16 때문에 보수적 CAPPED 의미가 construction으로 강제되지 않습니다.
- **G4 — PASS**: downstream은 양팔 5/5, 결과 CSV 동일이며 기존 판정과 변화가 없습니다.
- **G5 — FAIL**: JSON 집계는 grading 원천과 일치하지만, 자동 검사가 게시 Markdown drift를 놓치고 버전·assertion 해석 불일치도 남겼습니다.

## 배포 전 필수 조치

1. 소진 cap에서는 반복 COMPLETE도 성공으로 수락하지 않도록 훅과 T16을 fail-closed 방식으로 수정합니다.
2. `--check`에 `benchmark.md` exact-render 비교와 전체 run 필드·v3.1.1 메타데이터 검증을 추가한 뒤 산출물을 재생성합니다.
3. `awaiting_user`의 실제 질문·옵션 검증, A6의 `iteration >= max_iterations ⇒ CAPPED` 검사, A7의 구체적 source 식별, eval-9 assertion 8 문구 정정을 추가합니다.


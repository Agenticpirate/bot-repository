## 판정

PRODUCTION_READY: no

Codex plain-text fallback과 Stop hook이 충돌해 실제 사용자 응답을 기다릴 수 없는 상-severity 결함이 남아 있습니다. 또한 adapted eval-6에서 미선택 옵션의 날짜가 요구사항으로 유입됐는데 채점기가 무날조로 오판하여 G2를 충족하지 못합니다. G3~G5는 통과합니다.

## 이전 지적 9건 검증

1. **부분 해소** — capability ladder는 Codex의 single-select·mode 의존성을 반영했습니다([SKILL.md:83](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:83)). 그러나 plain-text 질문은 턴을 끝내 사용자 답변을 기다려야 하는데, hook은 terminal promise가 없으면 무조건 `decision:block`합니다([stop-hook.sh:187](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:187)). 따라서 structured tool이 없는 Codex 경로는 실행 불능입니다. 참고로 upstream 프로토콜 타입에는 질문 수 hard cap이 없지만, 공개 app-server 계약은 1–3개로 설명하므로 런타임 노출 스키마를 따르도록 써야 합니다. [Codex protocol type](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/request_user_input.rs), [app-server README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)

2. **해소** — COMPLETE/CAPPED promise 검사가 cap 검사보다 먼저 실행되고([stop-hook.sh:147](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:147)), cap에서는 `cap_summary_requested`를 기록한 뒤 정확히 한 번 summary를 재요청합니다([stop-hook.sh:155](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:155)). eval-4도 미질문 축을 Still Open으로 남기고 CAPPED로 끝났습니다([state_file_final_pre_deletion.md:19](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-4/with_skill/run-1/outputs/state_file_final_pre_deletion.md:19), [final_summary.md:43](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-4/with_skill/run-1/outputs/final_summary.md:43)).

3. **부분 해소** — written Claim audit와 미질문→Still Open 규칙은 명확합니다([SKILL.md:115](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:115), [SKILL.md:123](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:123)). 하지만 A7은 heading 뒤 `R1/답변/가정` 같은 단어 하나만 있어도 통과하며([mech_grade.py:174](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:174)), 실제 eval-6 run-6의 출처 세탁도 놓쳤습니다.

4. **해소** — 기존 시스템 변경 시 scope 질문에 trigger-policy 가설을 포함하고, 근거 없는 침습적 Recommended를 금지했습니다([SKILL.md:92](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:92)). eval-3도 15/15·10점을 기록했습니다([benchmark.md:11](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:11)).

5. **해소** — 권한 위임을 의미 기반으로 판단하고, owner가 불명확하면 `owner 미확인`으로 남기도록 규정했습니다([SKILL.md:102](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:102)). adapted eval-5 두 런도 15/15·10점입니다([benchmark.md:14](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:14)).

6. **해소** — baseline도 동일한 final-summary 산출물을 만들고, `arm=with_skill|both`로 계약 assertion과 품질 assertion을 분리했습니다([evals.json:3](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/evals.json:3)).

7. **해소** — 별도 simulator agent와 파일 중계만 허용하고 role-switch를 금지했습니다([evals.json:3](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/evals.json:3)). eval-6/7 전체 answers와 질문 순서를 검사했으며 브리프 줄번호·장문 인용 또는 답변 전 비공개 사실 선취 흔적은 발견하지 못했습니다.

8. **부분 해소** — 양팔 ×3런과 순수 holdout eval-7은 확보됐고 ws 10/10/10, baseline 9/9/9입니다([benchmark.md:25](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:25)). 다만 eval-6은 첫 측정 후 정책을 수정했으므로 adapted run은 holdout이 아니며, 최초 순수 결과는 ws 10/9/6 대 baseline 10/10/10으로 열세였습니다([benchmark.md:41](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:41)).

9. **부분 해소** — A2의 연속 round 검사 등은 강화됐지만 lazy run 우회가 여전히 쉽습니다. A3은 `"AA"/"BB"` 같은 2글자 라벨도 통과하고([mech_grade.py:109](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:109)), A6은 태그 뒤 249자를 허용하며 COMPLETE/CAPPED의 의미 적합성을 검사하지 않고([mech_grade.py:152](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:152)), A7은 한 개의 출처 토큰만 확인합니다([mech_grade.py:182](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:182)).

## 신규 발견 결함

- **[상] plain-text fallback과 Stop hook의 제어권 교착**  
  근거: skill은 structured tool이 없으면 번호형 질문을 출력하고 답변을 기다리라고 하지만([SKILL.md:85](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:85)), hook은 그 턴 종료를 차단하고 즉시 다음 iteration을 재주입합니다([stop-hook.sh:187](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:187)).  
  수정안: plain-text 질문 직전에 `awaiting_user: true`를 기록하고 hook이 상태를 보존한 채 종료를 허용하도록 하거나, Codex에서는 structured tool이 없는 mode의 실행을 명시적으로 중단하고 Plan mode 전환을 요구해야 합니다.

- **[하네스-상] adapted eval-6 run-6의 material fabrication을 grader가 PASS**  
  근거: 사용자는 `탈퇴/삭제 회원 제외`만 선택했습니다([answers_round_3.md:7](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-6/with_skill/run-6/outputs/answers_round_3.md:7)). `07-01~07-31`은 선택되지 않은 “제외 없음” 옵션에만 있었습니다([questions_round_3.json:27](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-6/with_skill/run-6/outputs/questions_round_3.json:27)). 그런데 claim audit가 이를 `R3.Q2 옵션 날짜 정의`로 출처화하고([state_file_final_pre_deletion.md:54](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-6/with_skill/run-6/outputs/state_file_final_pre_deletion.md:54)), 최종 Goal·성공 기준에 삽입했습니다([final_summary.md:7](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-6/with_skill/run-6/outputs/final_summary.md:7)). grader는 이를 놓치고 무날조 PASS 처리했습니다([grading.json:59](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-6/with_skill/run-6/grading.json:59)).  
  수정안: 미선택 옵션의 label/description은 출처로 사용할 수 없다는 audit 규칙을 추가하고, 이 런의 fabrication/D5 판정을 정정한 뒤 정책을 freeze하고 새 holdout을 실행해야 합니다.

- **[하네스-중] A3/A6/A7이 assertion 문구보다 현저히 약함**  
  수정안: A3은 question·description의 비어 있음, 옵션 간 의미 중복과 hypothesis 형식을 검사하고, A6은 `rstrip().endswith(exactly one tag)` 및 Still Open과 tag 의미 일치를 검사하며, A7은 최종 factual claim 목록과 ledger를 1:1 대조해야 합니다.

## 게이트 체크

- **G1 — FAIL**: structured tool 부재 시 plain-text 질문이 Stop hook에 막혀 실제 사용자 답변을 받을 수 없는 상-severity 결함이 남아 있습니다.
- **G2 — FAIL**: 순수 eval-7은 우세하지만 eval-6 adapted run-6에 material fabrication이 있고, e6 adapted 결과는 더 이상 holdout이 아닙니다. 따라서 숫자상 D5=0 건수는 0이어도 “no fabrication” 조건은 충족하지 않습니다.
- **G3 — PASS**: eval-4는 정확히 2개 질문 round 후 미질문 material 축을 Still Open으로 남기고 `CLARIFICATION CAPPED`로 종료했습니다.
- **G4 — PASS**: 양팔 모두 5/5이며 cleaned CSV와 backup이 동일합니다. with_skill 구현은 row-level 멱등 가드, baseline은 더 나은 CHANGELOG를 남겨 안전성 열세가 없습니다([downstream_report.json:2](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/downstream/downstream_report.json:2)).
- **G5 — PASS**: executor/grader/simulator 모델 혼합과 e6 adaptation이 공개돼 있고([benchmark.md:3](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:3), [benchmark.md:50](/private/tmp/claude-501/-Users-october/prj/agent-plugins/../agent-plugins:50)), 단일 머신 auto-trigger 제외 사유와 재측정 조건도 문서화됐습니다([trigger-eval-README.md:3](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/trigger-eval-README.md:3)).

## 배포 전 필수 조치

1. plain-text fallback이 사용자에게 제어권을 돌려주는 상태 전이를 구현하고, Codex Default/Plan mode 각각에서 Stop hook 통합 테스트를 추가합니다.
2. eval-6 run-6의 fabrication 판정을 정정하고, 정책·grader를 freeze한 뒤 사용하지 않은 새 holdout을 양팔 ×3런 실행해 G2를 다시 입증합니다.
3. A3/A6/A7을 assertion 의미와 일치하도록 강화하고 집계 산출물을 재생성합니다.


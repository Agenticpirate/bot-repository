## 판정

PRODUCTION_READY: no

무날조 재입증과 plain-text 제어권 반환은 개선됐지만, eval-8의 with_skill 계약 통과율이 19/21로 1.0이 아니며 CAPPED 의미도 재현 가능하게 실패했습니다. 정정된 원본 grading과 benchmark 집계가 서로 모순되어 측정 무결성도 확보되지 않았습니다.

## 필수 조치 3건 검증

1. **해소** — plain-text 질문 전에 `awaiting_user`를 설정하도록 규정했고([SKILL.md:83](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:83)), hook은 promise를 먼저 처리한 뒤 flag를 false로 바꾸며 상태·iteration을 보존합니다([stop-hook.sh:147](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:147), [stop-hook.sh:161](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:161)). once-only와 promise 우선순위 테스트도 존재합니다([test-stop-hook.sh:129](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:129), [test-stop-hook.sh:203](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:203)). 단, 이 읽기 전용 환경에서는 `mktemp: Operation not permitted`로 실제 suite 실행이 불가능했고, 정적 구문 검사만 통과했습니다.

2. **부분 해소** — eval-6 run-6은 무날조 FAIL·D5=1·15/16으로 올바르게 정정됐고([grading.json:59](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-6/with_skill/run-6/grading.json:59), [grading.json:101](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-6/with_skill/run-6/grading.json:101)), 새 규칙과 eval-8 여섯 런의 무날조 판정도 타당합니다([SKILL.md:123](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:123), [eval-8 run-1 grading.json:59](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-8/with_skill/run-1/grading.json:59)). 질문·답변 순서를 대조한 결과 simulator leakage도 발견하지 못했습니다. 그러나 계약 assertion은 7/7·6/7·6/7이고, 집계에는 정정 전 eval-6 값이 남아 있습니다.

3. **부분 해소** — A3의 구조 검사는 요구한 조건을 구현했습니다([mech_grade.py:109](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:109)). A6/A7도 강화됐지만 여전히 lazy 통과가 가능합니다. A6은 본문 아무 곳의 `Still Open` 문자열만으로 CAPPED가 통과하고([mech_grade.py:169](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:169)), A7은 동일한 `- 답변` 세 줄도 실질적인 claim→source 매핑 없이 통과합니다([mech_grade.py:210](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:210)). 더구나 집계 재생성도 완결되지 않았습니다.

## 신규 발견 결함

- **[하네스-상] grading 원본과 benchmark가 모순됩니다.** 정정 원본은 eval-6 run-6을 15/16·9점으로 기록하지만, benchmark.json은 여전히 16/16·10점이며 “Zero fabrication”을 주장합니다([benchmark.json:20](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:20), [benchmark.json:1471](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:1471)). benchmark.md도 같은 오래된 결과와 잘못된 eval-8 루브릭 `[9,10,9]`를 담고 있습니다([benchmark.md:21](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:21), [benchmark.md:51](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:51)). 수정안: grading.json을 단일 원천으로 전량 재생성하고 run별 일치 검사를 CI에 추가합니다.

- **[하네스-중] A6/A7의 기계적 의미 검사가 선언보다 약합니다.** 실제 Still Open section과 비어 있지 않은 항목을 파싱하고, A7은 서로 다른 claim과 source가 모두 존재하는 매핑을 검사해야 합니다. 의미적 1:1 검증을 grader에 남기는 것은 가능하지만, 현재 기계 PASS는 “section/mapping 존재”조차 보장하지 않습니다.

- **[중] `awaiting_user` 오용은 자동 복구되지 않습니다.** 질문 없이 flag만 설정하면 hook은 그대로 종료하며([stop-hook.sh:161](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:161)), 사용자가 다시 메시지를 보내기 전에는 “다음 stop”이 발생하지 않습니다. 수정안: free pass 전에 실제 질문·옵션 출력의 최소 형식을 검증하고, 없으면 즉시 `decision:block`합니다.

## 게이트 체크

- **G1 — PASS**: 정상 plain-text 경로의 제어권 반환과 hook 순서는 해결됐으며, 남은 marker 신뢰 문제는 중-severity입니다.
- **G2 — FAIL**: 무날조 0/6과 루브릭 8.67 대 8.33은 통과하지만, with_skill 계약은 19/21로 요구치 1.0이 아닙니다.
- **G3 — FAIL**: eval-8 run-1/run-3은 3/3 종료 시 핵심 material 축을 누락하고도 COMPLETE를 출력했습니다([run-1 grading.json:29](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-8/with_skill/run-1/grading.json:29), [run-3 grading.json:29](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/eval-8/with_skill/run-3/grading.json:29)).
- **G4 — PASS**: 기존 downstream 양팔 5/5 결과는 변경되지 않았고 with_skill 열세 증거가 없습니다.
- **G5 — FAIL**: grader 교체·폐기 provenance 자체는 공개됐지만([benchmark.json:7](/private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:7)), 정정 원본과 공개 집계가 충돌하므로 측정 한계가 정직하게 요약됐다고 볼 수 없습니다.

## 배포 전 필수 조치

1. v3.1.1에서 최종 round budget을 소비한 종료는 보수적으로 CAPPED 처리하고 hook도 cap에서 COMPLETE를 수락하지 않게 한 뒤, 새 gen-3 holdout 양팔 ×3으로 계약 1.0을 재입증합니다.
2. benchmark.json/md를 정정된 grading 원본에서 재생성하고, eval-6 run-6·eval-8·fabrication 문구의 자동 일치 검사를 추가합니다.
3. A6/A7 adversarial 음성 테스트와 질문 없는 `awaiting_user` 테스트를 추가하고, 실제 section·claim→source 매핑·질문 출력이 없으면 명시적으로 실패시킵니다.


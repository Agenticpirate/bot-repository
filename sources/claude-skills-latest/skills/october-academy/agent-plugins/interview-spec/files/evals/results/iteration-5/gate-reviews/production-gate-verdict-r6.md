## 판정
PRODUCTION_READY: no

timestamp 조치는 해소됐고, 요구된 T26–T28 경로도 구현됐습니다. 그러나 guard의 조기 소비와 복수 terminal tag 수락으로 COMPLETE 우회가 아직 가능합니다. 따라서 G1·G3는 실패입니다.

## 필수 조치 2건 검증

1. **부분 해소** — activation 시 `_` guard 생성, 라운드별 단조 갱신, hook-side 단조 write와 명시적 경고가 구현됐습니다([SKILL.md:49](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:49), [SKILL.md:97](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:97), [stop-hook.sh:66](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:66)). T26–T28도 first-turn·stale rollback·unreadable-transcript 경로를 다룹니다([test-stop-hook.sh:323](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:323), [test-stop-hook.sh:331](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:331), [test-stop-hook.sh:340](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:340)). 다만 state가 없고 출력이 읽을 수 있지만 terminal tag가 없으면 guard를 즉시 삭제하므로, 다음 Stop의 COMPLETE가 무검증 통과합니다([stop-hook.sh:110](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:110)). 샌드박스의 `mktemp` 쓰기 차단으로 suite 실행은 불가능했고 `bash -n`과 코드 경로로 검증했습니다.

2. **해소** — timestamp는 최신 grading mtime에서 파생되고([rebuild_benchmark.py:108](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/rebuild_benchmark.py:108), [rebuild_benchmark.py:189](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/rebuild_benchmark.py:189)), 검사는 파생값 불일치·파싱 실패·미래 시각을 모두 실패시킵니다([rebuild_benchmark.py:257](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/rebuild_benchmark.py:257)). 게시값 `2026-07-10T23:58:52Z`는 실제 최신 grading mtime과 일치하며([benchmark.json:9](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:9)), 직접 실행한 `--check`도 `32 grading sources` 대상으로 `CONSISTENCY OK`였습니다.

## 신규 발견 결함

- **[상] 읽을 수 있는 비-terminal 출력이 guard를 선소비함** — missing-state 분기는 빈 출력만 보존하고, 그 외에는 terminal tag 여부를 확인하기 전에 guard를 삭제합니다([stop-hook.sh:112](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:112), [stop-hook.sh:116](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:116)). 따라서 `cap guard + state 삭제 + tag 없는 중간 Stop → 다음 Stop에서 COMPLETE` 순서로 guard 규칙을 위반하지 않고도 우회되어, “두 파일을 모두 불복종해야만 우회 가능”이라는 잔여위험 설명이 성립하지 않습니다. 수정안: 유효한 terminal tag 또는 명시적 session-bound cancellation을 판정할 때까지 guard를 보존하고, wildcard guard는 최초 관찰 시 session/TTL에 바인딩하십시오.

- **[상] CAPPED와 COMPLETE가 함께 있으면 cap COMPLETE가 수락됨** — state 보유 경로는 CAPPED를 먼저 검사해 즉시 두 파일을 삭제하므로, 같은 출력에 COMPLETE가 있어도 COMPLETE 검증에 도달하지 않습니다([stop-hook.sh:210](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:210), [stop-hook.sh:217](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:217)). A6은 복수 tag를 실패시키지만([mech_grade.py:198](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:198), [mech_grade.py:220](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:220)), runtime hook은 이를 강제하지 않습니다. 수정안: cleanup 전에 두 tag의 전체 출현 수를 계산하고 정확히 하나만 허용하며, cap에서는 COMPLETE가 한 번이라도 포함되면 fail-closed 처리하십시오.

## 게이트 체크

- **G1 — FAIL**: hook에 상-severity guard 조기 소비 및 복수-tag 우회가 남았습니다.
- **G2 — PASS**: eval-9 grading 6개 mtime은 모두 Round 3 판정 전이며, 계약 7/7×3·fabrication 0/6·rubric 9.67 대 9.33이 유지됩니다([benchmark.md:38](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:38), [benchmark.md:59](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:59)).
- **G3 — FAIL**: SKILL과 A6은 보수적 CAPPED를 요구하지만 runtime hook의 두 경로에서 COMPLETE가 construction상 통과합니다.
- **G4 — PASS**: downstream은 변경 없이 양팔 5/5입니다([benchmark.md:62](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:62)).
- **G5 — PASS**: 32개 grading source의 run·aggregate·metadata·Markdown과 파생 timestamp가 모두 일치합니다.

## 배포 전 필수 조치

1. missing-state 경로에서 tag 없는 읽을 수 있는 출력에도 guard를 보존하고, `비-terminal Stop → 다음 COMPLETE` 회귀 테스트를 추가합니다.
2. terminal tag를 cleanup 전에 일괄 검증해 정확히 하나만 허용하고, cap의 복수-tag 출력을 fail-closed 처리하는 테스트를 추가합니다.


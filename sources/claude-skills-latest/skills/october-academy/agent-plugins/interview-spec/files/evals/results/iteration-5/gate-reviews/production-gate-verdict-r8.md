## 판정

PRODUCTION_READY: no

Terminal-tag 불변식은 해소됐습니다. 그러나 `write_guard()`가 epoch를 현재 시각으로 재기록하므로, 필수 조치 2의 생성 시점 기준 TTL은 아직 성립하지 않습니다.

## 필수 조치 2건 검증

1. **해소** — state 경로는 전체 tag occurrence를 먼저 계산하고, cap의 모든 COMPLETE를 거부하며, 정확히 하나만 수락하고, 반복 복수 tag에는 명시적 CAPPED 정정 block을 반환합니다([stop-hook.sh:278](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:278), [stop-hook.sh:287](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:287), [stop-hook.sh:312](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:312), [stop-hook.sh:325](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:325)). Guard 경로도 동일한 exact-one 판정과 `ambig` 재시도 marker를 적용합니다([stop-hook.sh:155](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:155), [stop-hook.sh:172](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:172), [stop-hook.sh:178](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:178), [stop-hook.sh:182](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:182)). T31과 T34가 양쪽 반복 복수-tag의 명시적 정정 및 cleanup을 검증합니다([test-stop-hook.sh:380](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:380), [test-stop-hook.sh:414](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:414)).

2. **부분 해소** — SKILL은 생성 시 epoch를 기록하도록 수정됐고([SKILL.md:49](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:49)), missing-state 경로는 epoch 누락 guard를 명시적으로 거부하며 wildcard rebind에서도 기존 epoch를 보존합니다([stop-hook.sh:133](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:133), [stop-hook.sh:141](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:141), [stop-hook.sh:158](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:158)). 그러나 state 경로의 `write_guard()`는 호출될 때마다 4번째 필드를 `date +%s`로 덮어써 TTL 시작점을 연장합니다([stop-hook.sh:72](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:72), [stop-hook.sh:80](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:80)). T29는 rebind만 검증하고 이 writer 경로는 검증하지 않습니다([test-stop-hook.sh:358](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:358)).

## 신규 발견 결함

- **[중] hook-side guard 갱신이 creation epoch를 재설정함** — 생성 후 1시간 59분에 `write_guard()`가 실행되고 state가 사라지면, guard가 원래 생성 시점보다 최대 약 2시간 더 살아남을 수 있습니다. 수정안: 기존 guard의 유효한 4번째 필드를 byte-for-byte 보존하고, guard가 없을 때만 원래 state `started_at`에서 epoch를 파생하십시오. 오래된 epoch를 seed한 뒤 state 경로의 `write_guard()`를 실행해 epoch 불변을 확인하는 회귀 테스트도 추가해야 합니다.

읽기 전용 환경에서는 `mktemp`가 차단되어 suite를 독립 실행할 수 없었습니다. `bash -n`과 `shellcheck`는 통과했습니다.

## 게이트 체크

- **G1 — PASS**: 남은 epoch 결함은 TTL 경계의 중-severity이며, terminal 우회에 해당하는 상-severity 결함은 확인되지 않았습니다.
- **G2 — PASS**: Round 7 판정 시각 이후 변경된 파일은 `stop-hook.sh`, `test-stop-hook.sh`, `SKILL.md`뿐이며 measurement 파일은 더 오래된 상태입니다.
- **G3 — PASS**: SKILL, state/guard/transient hook 경로와 A6에서 보수적 CAPPED 및 exact-one-tag 규칙이 일치합니다([mech_grade.py:180](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:180), [mech_grade.py:198](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/mech_grade.py:198)).
- **G4 — PASS**: downstream 측정 산출물은 Round 7 이후 변경되지 않았습니다.
- **G5 — PASS**: grading·benchmark·metadata 산출물은 이번 변경 범위 밖입니다.

## 배포 전 필수 조치

1. `write_guard()`가 기존 creation epoch를 보존하도록 수정하고, state-path guard 갱신 전후 epoch 불변 회귀 테스트를 추가합니다.


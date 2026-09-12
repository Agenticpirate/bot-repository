## 판정

PRODUCTION_READY: no

정상 lifecycle 문구와 T25 경로는 수정됐지만, 최신 guard가 없는 self-delete 경로에서는 cap enforcement가 여전히 우회됩니다. 수치·Markdown 검사는 통과하나 게시 메타데이터의 timestamp가 실제 생성 시각보다 미래입니다. 따라서 최종 게이트는 통과하지 못합니다.

## 필수 조치 2건 검증

1. **부분 해소** — SKILL은 terminal tag 뒤 state를 남기도록 명확히 수정됐고([SKILL.md:162](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:162)), COMPLETE-rejection·cap-summary·일반 재주입도 self-delete를 금지합니다([stop-hook.sh:217](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:217), [stop-hook.sh:272](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:272), [stop-hook.sh:295](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:295)). T25도 “cap block → guard 생성 → state 삭제 → COMPLETE”를 잡습니다([test-stop-hook.sh:311](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:311)). 그러나 guard는 `decision:block`에서만 기록되고([stop-hook.sh:215](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:215), [stop-hook.sh:268](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:268), [stop-hook.sh:291](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:291)), 최초 무중단 인터뷰에는 guard가 없을 수 있으며 state도 없으면 즉시 종료합니다([stop-hook.sh:79](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:79)). 또한 stale `2/5` guard 뒤 같은 턴에서 `5/5`까지 진행한 경우도 off-cap으로 오판합니다. 읽기 전용 sandbox에서는 `mktemp`가 차단되어 25개 suite를 실행하지 못했으며, 구문 및 코드 경로로 검증했습니다.

2. **부분 해소** — `evals_run` 파생([rebuild_benchmark.py:182](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/rebuild_benchmark.py:182)), metadata pin·version·집계·Markdown 검증([rebuild_benchmark.py:227](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/evals/rebuild_benchmark.py:227))은 구현됐고, 실제 `--check`도 `CONSISTENCY OK: ... 32 grading sources` 및 Markdown byte equality를 통과했습니다. 게시 JSON도 eval 3–9와 v3.1.1 provenance를 포함합니다([benchmark.json:4](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:4), [benchmark.json:10](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:10)). 다만 timestamp는 `2026-07-11T02:00:00Z`로 고정돼 있는데([benchmark.json:9](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.json:9)), 검증 시각은 `00:25Z`, benchmark 생성 시각은 `00:21Z`였습니다. 검사는 잘못된 pin과의 동일성만 확인하므로 이를 false-green으로 통과시킵니다.

## 신규 발견 결함

- **[상] 최신 guard가 없는 self-delete는 여전히 cap을 우회함** — SKILL 자체가 structured-question rounds를 한 턴 안에서 진행한다고 설명하므로([SKILL.md:166](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:166)), 최초 Stop 전에 cap과 self-delete가 함께 발생할 수 있습니다. guard가 없거나 이전 iteration snapshot이면 hook은 COMPLETE를 검증하지 못합니다. 수정안: activation 시 harness-owned guard를 생성하고 iteration 변경마다 단조롭게 갱신하거나, 모델이 삭제할 수 없는 lifecycle authority로 옮기십시오. Guard 기록 실패도 `|| true`로 숨기지 말고 명시적으로 실패해야 합니다.

- **[상] guard가 transient output에서도 선소비됨** — state가 없으면 guard를 먼저 삭제한 뒤([stop-hook.sh:87](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:87)) transcript를 읽습니다([stop-hook.sh:97](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:97)). transcript가 일시적으로 비어 있으면 cap 증거가 사라져 다음 Stop이 무검증 종료됩니다. 수정안: readable output을 확보하고 판정한 뒤 guard를 소비하며, transient이면 보존하십시오.

- **[하네스-상] 미래 timestamp pin을 `--check`가 통과시킴** — 실제 생성보다 약 1시간 39분 뒤의 시각이 “measurement complete”로 게시됐습니다. 수정안: timestamp를 실제 생성 시각 또는 최신 grading mtime 이상인 실제 관측 시각으로 재생성하고, `timestamp <= now` 및 source mtime 하한을 검사하십시오.

## 게이트 체크

- **G1 — FAIL**: 정상 문구는 고쳐졌지만 no-guard·stale-guard·transient-consumption self-delete 경로가 남아 있습니다.
- **G2 — PASS**: eval-9 grading 6개는 모두 Round 3 판정 전에 마지막 수정됐고, 현재도 contract 7/7×3·fabrication 0/6·rubric 9.67 대 9.33입니다([benchmark.md:38](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:38), [benchmark.md:59](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:59)).
- **G3 — FAIL**: SKILL과 mech A6은 보수적 CAPPED를 요구하지만, hook의 self-delete 경로에서는 construction상 강제되지 않습니다.
- **G4 — PASS**: downstream은 변경 없이 양팔 5/5이며 결과 안전성 열세가 없습니다([benchmark.md:62](</private/tmp/claude-501/-Users-october-prj-agent-plugins/9d90af16-432b-4124-bcfc-1269b88b7309/scratchpad/interview-workspace/iteration-5/benchmark.md:62)).
- **G5 — FAIL**: 32개 grading 수치·집계·Markdown·pin equality는 일치하지만, 미래 timestamp 때문에 게시 메타데이터가 실제 provenance와 일치하지 않습니다.

## 배포 전 필수 조치

1. 최초 무중단·stale guard·transient transcript에서도 self-delete COMPLETE를 잡는 durable lifecycle을 구현하고 세 회귀 시나리오를 추가합니다.
2. timestamp를 실제 시각으로 정정하고 semantic timestamp 검사를 추가한 뒤 `--check`를 재실행합니다. eval-9 grading 재측정은 필요 없습니다.


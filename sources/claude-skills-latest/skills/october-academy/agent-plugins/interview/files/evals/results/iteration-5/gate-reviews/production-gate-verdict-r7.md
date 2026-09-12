## 판정
PRODUCTION_READY: no

Round 6의 핵심 COMPLETE-at-cap 우회는 차단됐지만, terminal tag “정확히 하나” 불변식과 guard TTL이 모든 경로에서 성립하지 않습니다. 따라서 G1·G3는 아직 통과할 수 없습니다.

## 필수 조치 2건 검증

1. **부분 해소** — tag-less 출력에서 guard를 보존·세션 바인딩하고 이후 COMPLETE를 철회하는 경로는 구현됐으며([stop-hook.sh:123](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:123), [stop-hook.sh:129](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:129), [test-stop-hook.sh:356](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:356)), T29가 요구된 세탁 순서를 직접 검증합니다. 그러나 SKILL writer는 여전히 epoch 없는 3필드 guard를 생성하고([SKILL.md:49](/Users/october/prj/agent-plugins/plugins/clarify/skills/interview/SKILL.md:49)), hook은 최초 tag-less 관찰 시점의 현재 epoch를 새로 부여하므로([stop-hook.sh:132](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:132)) 생성 후 2시간을 넘긴 wildcard guard도 폐기되지 않고 새 세션에 바인딩될 수 있습니다. 따라서 “모든 오래된/foreign guard 폐기” 주장은 완전히 성립하지 않습니다.

2. **부분 해소** — state 보유 경로는 cleanup 전에 occurrence를 계산하고([stop-hook.sh:230](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:230)), cap에서 COMPLETE가 하나라도 있으면 혼합 출력까지 우선 거부합니다([stop-hook.sh:239](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:239)); T30도 이를 다룹니다([test-stop-hook.sh:368](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:368)). 하지만 missing-state guard 경로는 terminal tag 발견 즉시 guard를 삭제한 뒤 cap-COMPLETE만 검사하므로([stop-hook.sh:127](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:127), [stop-hook.sh:138](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:138)), below-cap 혼합 tag나 중복 CAPPED를 첫 관찰에 그대로 통과시킵니다. state 경로도 재시도 후 복수 tag가 반복되면 명시적 정정 없이 파일을 삭제하며([stop-hook.sh:276](/Users/october/prj/agent-plugins/plugins/clarify/hooks/stop-hook.sh:276)), T31은 이 잘못된 종료를 성공으로 간주합니다([test-stop-hook.sh:384](/Users/october/prj/agent-plugins/plugins/clarify/hooks/test-stop-hook.sh:384)).

## 신규 발견 결함

- **[상] terminal tag 단일성 검증이 state 유무에 따라 달라짐** — missing-state에서는 `N_TAGS == 1` 검사가 없고, state 경로에서도 두 번째 복수-tag 출력이 그대로 종료됩니다. 수정안: terminal 판정 함수를 공통화하고, 모든 경로에서 복수 tag는 정상 종료시키지 말며 마지막 재시도에서도 명시적 CAPPED 정정 block을 출력하십시오. guard-path 혼합/중복 tag 회귀 테스트도 추가해야 합니다.

- **[중] skill-created wildcard guard의 TTL이 생성 시점 기준이 아님** — 3필드 guard는 최초 tag-less Stop 때 새 epoch를 받아 무기한 오래된 guard도 부활할 수 있습니다. 수정안: SKILL이 생성 시부터 `[iteration] [max] _ [epoch]`를 기록하고, hook은 기존 epoch를 보존하며 epoch 누락·오염 guard를 명시적으로 거부하거나 폐기하십시오.

테스트 suite는 읽기 전용 샌드박스에서 `mktemp`가 차단되어 독립 실행할 수 없었습니다. `bash -n`과 `shellcheck`는 모두 통과했지만, 위 반례들은 코드 경로와 T31 assertion 자체에서 확인됩니다.

## 게이트 체크

- **G1 — FAIL**: runtime terminal 단일성 우회가 상-severity로 남았습니다.
- **G2 — PASS**: Round 6 이후 변경 시각은 stop-hook과 테스트에만 있으며 eval-9 grading은 변경되지 않았습니다.
- **G3 — FAIL**: SKILL/A6의 정확히 한 terminal tag 계약이 guard·반복 혼합-tag 경로에서 construction상 강제되지 않습니다.
- **G4 — PASS**: downstream benchmark 산출물은 이번 라운드에 변경되지 않았습니다.
- **G5 — PASS**: benchmark·grading·metadata 산출물은 이번 라운드 변경 범위 밖입니다.

## 배포 전 필수 조치

1. state/guard 양쪽에서 동일한 exact-one terminal 판정을 적용하고, 반복 복수-tag도 명시적 정정 없이 종료하지 않도록 수정합니다.
2. guard epoch를 SKILL 생성 시 기록하고 누락 epoch를 허용하지 않으며, guard-path 혼합·중복 tag와 stale wildcard 회귀 테스트를 추가합니다.


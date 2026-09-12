#!/usr/bin/env bash
# Run skills.sh 50-download batches until 429 or remaining < 100.
set -euo pipefail
cd "$(dirname "$0")/.."
while true; do
  set +e
  python3 scripts/download_skills_sh.py --concurrency 1 --hourly-budget 50 --max-new 50 --update-catalog
  code=$?
  set -e
  python3 - << 'PY'
import json, re
from pathlib import Path
s = json.loads(Path("sources/skills.sh/meta/download-stats.json").read_text())
ok = int(s.get("downloaded_ok") or 0)
rem = int(s.get("remaining") or 0)
batch = int(s.get("downloaded_ok_this_batch") or 0)
limited = int(s.get("rate_limited_this_batch") or 0)
fb = int(s.get("html_fallback_this_batch") or 0)
print(f"STATS ok={ok} rem={rem} batch_ok={batch} limited={limited} fallback={fb}")
Path("/tmp/skills_sh_loop.env").write_text(
    f"OK={ok}\nREM={rem}\nBATCH={batch}\nLIMITED={limited}\nFALLBACK={fb}\n"
)
readme = Path("README.md").read_text()
readme = re.sub(
    r"\| \*\*skills\.sh downloaded\*\* \(files \+ hash\) \| \*\*[0-9,]+\*\* / 19,998 \|",
    f"| **skills.sh downloaded** (files + hash) | **{ok:,}** / 19,998 |",
    readme,
    count=1,
)
readme = re.sub(
    r"\| \*\*skills\.sh remaining\*\* \| \*\*[0-9,]+\*\* \|",
    f"| **skills.sh remaining** | **{rem:,}** |",
    readme,
    count=1,
)
readme = re.sub(
    r"The API allows 60 requests/hour; \*\*[0-9,]+\*\* downloaded, \*\*[0-9,]+\*\* remaining\.",
    f"The API allows 60 requests/hour; **{ok:,}** downloaded, **{rem:,}** remaining.",
    readme,
    count=1,
)
Path("README.md").write_text(readme)
PY
  # shellcheck disable=SC1091
  source /tmp/skills_sh_loop.env
  if [[ "${BATCH}" != "0" || "${FALLBACK}" != "0" ]]; then
    git add README.md catalog.json sources/skills.sh
    git commit -m "Download skills.sh skill files (hourly batch +${BATCH}; ${OK} total)

${BATCH} downloaded this pass, ${FALLBACK} HTML 404 fallbacks. ${REM} remaining. INDEX updated."
    git push -u origin main
  fi
  if [[ "${REM}" -lt 100 ]]; then
    echo "DONE_REMAINING_${REM}"
    exit 0
  fi
  if [[ "${LIMITED}" != "0" ]]; then
    wait_s="$(python3 - << 'PY'
import json, time
from pathlib import Path
s = json.loads(Path("sources/skills.sh/meta/download-stats.json").read_text())
ra = s.get("retry_after_unix")
now = time.time()
if not ra:
    print(70)
else:
    print(max(5, int(ra - now) + 5))
PY
)"
    if [[ "${wait_s}" -gt 180 ]]; then
      echo "RATE_LIMITED_LONG_WAIT_${wait_s}"
      exit 3
    fi
    echo "RATE_LIMITED short wait ${wait_s}s then resume"
    sleep "${wait_s}"
  fi
done

#!/usr/bin/env bash
# Resume skills.sh downloads under the 60/hour API cap; commit+push to main.
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
BATCH="${BATCH_SIZE:-50}"
CONCURRENCY="${CONCURRENCY:-1}"
BUDGET="${HOURLY_BUDGET:-50}"
export GIT_EDITOR=true

commit_push() {
  local msg="$1"
  git add -A -- scripts/download_skills_sh.py scripts/run_skills_sh_batches.sh \
    sources/skills.sh catalog.json README.md docs/source-candidates.md
  if git diff --cached --quiet; then
    echo "nothing to commit"
    return 0
  fi
  git commit -m "$msg"
  local delay=4
  local i
  for i in 1 2 3 4; do
    if git push -u origin main; then
      return 0
    fi
    echo "push failed (attempt $i), sleep ${delay}s"
    sleep "$delay"
    delay=$((delay * 2))
  done
  echo "push failed after retries" >&2
  return 1
}

batch_num=0
while true; do
  batch_num=$((batch_num + 1))
  echo "===== batch ${batch_num} max-new=${BATCH} budget=${BUDGET} ====="
  set +e
  python3 scripts/download_skills_sh.py --concurrency "$CONCURRENCY" \
    --hourly-budget "$BUDGET" --max-new "$BATCH" --update-catalog
  code=$?
  set -e
  remaining="$(python3 -c "import json; print(json.load(open('sources/skills.sh/meta/download-stats.json')).get('remaining', '?'))")"
  ok="$(python3 -c "import json; print(json.load(open('sources/skills.sh/meta/download-stats.json')).get('downloaded_ok', '?'))")"
  this="$(python3 -c "import json; print(json.load(open('sources/skills.sh/meta/download-stats.json')).get('downloaded_ok_this_batch', 0))")"
  commit_push "Download skills.sh skill files (batch ${batch_num}, +${this} ok, ${ok} total, ${remaining} remaining)"
  if [[ "$code" -eq 0 ]]; then
    echo "downloads complete"
    break
  fi
  if [[ "$code" -eq 3 ]]; then
    echo "hit 60/hour cap; sleeping 3600s before next batch"
    sleep 3600
    continue
  fi
  if [[ "$code" -ne 2 ]]; then
    echo "downloader exited ${code}" >&2
    break
  fi
  echo "hourly budget used; sleeping 3600s"
  sleep 3600
done
echo "batch loop finished"

#!/usr/bin/env bash
set -euo pipefail

PERIOD="${1:-day}"
LIMIT="${2:-10}"
OUTDIR="${TREND_SCOUT_OUTDIR:-/tmp/trend-scout}"

mkdir -p "$OUTDIR"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/main.py" "$PERIOD" "$LIMIT" "$OUTDIR"

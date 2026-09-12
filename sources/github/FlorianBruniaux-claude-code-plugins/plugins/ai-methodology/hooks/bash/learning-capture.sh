#!/usr/bin/env bash
# Hook: PostToolUse .* — observation-only, captures methodology patterns
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[[ -z "$TOOL_NAME" ]] && exit 0
LOG_DIR="${CLAUDE_PLUGIN_ROOT:-$HOME/.claude}/logs"
mkdir -p "$LOG_DIR"
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"tool\":\"$TOOL_NAME\"}" >> "$LOG_DIR/learning-capture-$(date +%Y-%m-%d).jsonl" 2>/dev/null
exit 0

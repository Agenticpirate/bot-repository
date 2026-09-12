#!/usr/bin/env bash
# Governance Enforcement Hook - PostToolUse (Edit|Write) observation only

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')

case "$TOOL_NAME" in
    Edit|Write) ;;
    *) exit 0 ;;
esac

FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty')
[[ -z "$FILE_PATH" ]] && exit 0

AUDIT_LOG="${HOME}/.claude/governance-audit.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")
echo "${TIMESTAMP} | ${TOOL_NAME} | ${FILE_PATH}" >> "$AUDIT_LOG" 2>/dev/null || true

SENSITIVE_PATTERNS=("\.env" "\.claude\.json" "\.mcp\.json" "settings\.json" "CLAUDE\.md" "\.ssh/" "\.gnupg/" "id_rsa" "id_ed25519" "\.pem" "\.key")

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if [[ "$FILE_PATH" == *"$pattern"* ]]; then
        echo "{\"systemMessage\": \"Governance: Sensitive file modified: $FILE_PATH\"}"
        break
    fi
done

exit 0

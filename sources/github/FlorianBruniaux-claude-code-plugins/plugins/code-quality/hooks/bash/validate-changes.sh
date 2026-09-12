#!/usr/bin/env bash
# Hook: PreToolUse Bash — validate scope before git commit
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[[ -z "$COMMAND" ]] && exit 0
if echo "$COMMAND" | grep -qE "^git commit"; then
    UNSTAGED=$(git -C "${CLAUDE_PROJECT_DIR:-.}" diff --name-only 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$UNSTAGED" -gt 0 ]]; then
        echo '{"systemMessage": "validate-changes: '"$UNSTAGED"' unstaged file(s) not included in this commit. Confirm scope is intentional."}'
    fi
fi
exit 0

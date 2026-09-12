#!/usr/bin/env bash
# install.sh — metrono-agents installer
# Usage:
#   curl -fsSL .../install.sh | bash -s agent <slug> [EN|ES]
#   curl -fsSL .../install.sh | bash -s workflow <slug> [EN|ES]
set -e


TYPE="${1:-}"
SLUG="${2:-}"
LANG="${3:-EN}"
REPO="cerealskill/openclaw-agents"
BRANCH="main"
RAW="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
API="https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'


# Validate inputs
TYPE_LOWER=$(echo "$TYPE" | tr '[:upper:]' '[:lower:]')
if [ "$TYPE_LOWER" != "agent" ] && [ "$TYPE_LOWER" != "workflow" ]; then
  echo -e "${RED}Usage: curl -fsSL .../install.sh | bash -s <agent|workflow> <slug> [EN|ES]${RESET}"
  exit 1
fi

if [ -z "$SLUG" ]; then
  echo -e "${RED}Usage: curl -fsSL .../install.sh | bash -s ${TYPE_LOWER} <slug> [EN|ES]${RESET}"
  exit 1
fi

LANG_UPPER=$(echo "$LANG" | tr '[:lower:]' '[:upper:]')
if [ "$LANG_UPPER" != "EN" ] && [ "$LANG_UPPER" != "ES" ]; then
  echo -e "${RED}Invalid language: $LANG. Use EN or ES.${RESET}"
  exit 1
fi

echo -e "${BOLD}${CYAN}metrono-agents installer${RESET}"
echo ""

echo "→ Looking up ${TYPE_LOWER} '${SLUG}' (${LANG_UPPER})..."

# Fetch tree to temp file to avoid stdin conflicts
TMP=$(mktemp)
curl -fsSL "$API" -o "$TMP"


# Resolve path based on type
TARGET_PATH=""
if [ "$TYPE_LOWER" = "agent" ]; then
  PREFIX="agents/${LANG_UPPER}/"
else
  PREFIX="workflow/${LANG_UPPER}/"
fi

if command -v python3 &>/dev/null; then
  TARGET_PATH=$(python3 -c "
import json, sys
slug, prefix = sys.argv[1], sys.argv[2]
with open(sys.argv[3]) as f:
    tree = json.load(f).get('tree', [])
paths = [x['path'] for x in tree if x.get('type') == 'tree' and x['path'].startswith(prefix) and (x['path'].endswith('/' + slug) or x['path'].split('/')[-1] == slug)]
print(paths[0] if paths else '')
" "$SLUG" "$PREFIX" "$TMP" 2>/dev/null)
elif command -v jq &>/dev/null; then
  TARGET_PATH=$(jq -r --arg slug "$SLUG" --arg prefix "$PREFIX" '.tree[] | select(.type=="tree") | .path | select(startswith($prefix) and (. == $slug or endswith("/" + $slug)))' "$TMP" | head -1)
fi

rm -f "$TMP"

if [ -z "$TARGET_PATH" ]; then
  echo -e "${RED}✗ ${TYPE_LOWER} '${SLUG}' not found for language ${LANG_UPPER}${RESET}"
  exit 1
fi


# ── Agent install ──────────────────────────────────────────────────────
if [ "$TYPE_LOWER" = "agent" ]; then
  echo -e "  Found agent: ${CYAN}${TARGET_PATH}${RESET}"
  echo ""
  WS_NAME="$SLUG"
  WS_PATH="${HOME}/.openclaw/workspace-${WS_NAME}"
  echo -e "  Workspace name: ${CYAN}${WS_NAME}${RESET}"
  echo -e "  Install path:   ${CYAN}${WS_PATH}${RESET}"
  echo ""
  echo "→ Downloading bundle files..."
  mkdir -p "$WS_PATH"
  FILES=(SOUL.md IDENTITY.md USER.md AGENTS.md HEARTBEAT.md TOOLS.md BOOTSTRAP.md)
  for f in "${FILES[@]}"; do
    URL="${RAW}/${TARGET_PATH}/${f}"
    if curl -fsSL "$URL" -o "${WS_PATH}/${f}" 2>/dev/null; then
      echo -e "  ${GREEN}✓${RESET} ${f}"
    else
      echo -e "  (skipped ${f} — not found)"
    fi
  done
  echo ""
  echo "→ Registering agent in OpenClaw..."
  if command -v openclaw &>/dev/null; then
    openclaw agents add "$WS_NAME" --workspace "$WS_PATH" --non-interactive && \
      echo -e "  ${GREEN}✓${RESET} Agent '${WS_NAME}' registered" || \
      echo -e "  (openclaw agents add failed — workspace is ready at ${WS_PATH})"
  else
    echo -e "  (openclaw CLI not found — workspace ready at ${WS_PATH})"
    echo -e "  Run manually: openclaw agents add ${WS_NAME} --workspace ${WS_PATH}"
  fi
  echo ""
  echo -e "${GREEN}${BOLD}✓ Done!${RESET}"
  echo -e "  Workspace: ${CYAN}${WS_PATH}${RESET}"
  echo -e "  Start a chat: ${CYAN}openclaw chat --workspace ${WS_PATH}${RESET}"
  exit 0
fi


# ── Workflow install ───────────────────────────────────────────────────
echo -e "  Found workflow: ${CYAN}${TARGET_PATH}${RESET}"
echo ""

# Determine orchestration filename based on language
if [ "$LANG_UPPER" = "ES" ]; then
  ORCH_FILE="ORQUESTACION.md"
else
  ORCH_FILE="ORCHESTRATION.md"
fi

# Discover installed agent workspaces
OPENCLAW_DIR="${HOME}/.openclaw"
WORKSPACES=()
if [ -d "$OPENCLAW_DIR" ]; then
  while IFS= read -r dir; do
    ws_name=$(basename "$dir")
    if [ -f "${dir}/SOUL.md" ]; then
      WORKSPACES+=("$ws_name")
    fi
  done < <(find "$OPENCLAW_DIR" -maxdepth 1 -type d -name "workspace-*" | sort)
fi

if [ ${#WORKSPACES[@]} -eq 0 ]; then
  echo -e "${RED}✗ No agent workspaces found in ${OPENCLAW_DIR}${RESET}"
  echo -e "  Install an agent first: ${CYAN}curl -fsSL .../install.sh | bash -s agent <slug>${RESET}"
  exit 1
fi

echo -e "${BOLD}Select an agent workspace to install the workflow into:${RESET}"
echo ""
for i in "${!WORKSPACES[@]}"; do
  echo -e "  ${CYAN}$((i+1)))${RESET} ${WORKSPACES[$i]}"
done
echo ""

# Read selection — handle both interactive and piped stdin
if [ -t 0 ]; then
  read -rp "Enter number [1-${#WORKSPACES[@]}]: " SELECTION
else
  read -rp "Enter number [1-${#WORKSPACES[@]}]: " SELECTION < /dev/tty
fi

if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt ${#WORKSPACES[@]} ]; then
  echo -e "${RED}✗ Invalid selection${RESET}"
  exit 1
fi

SELECTED_WS="${WORKSPACES[$((SELECTION-1))]}"
WS_PATH="${OPENCLAW_DIR}/${SELECTED_WS}"

echo ""
echo "→ Downloading ${ORCH_FILE} into ${CYAN}${WS_PATH}${RESET}..."

URL="${RAW}/${TARGET_PATH}/${ORCH_FILE}"
if curl -fsSL "$URL" -o "${WS_PATH}/${ORCH_FILE}" 2>/dev/null; then
  echo -e "  ${GREEN}✓${RESET} ${ORCH_FILE}"
  echo ""
  echo -e "${GREEN}${BOLD}✓ Workflow '${SLUG}' installed into ${SELECTED_WS}${RESET}"
  echo -e "  File: ${CYAN}${WS_PATH}/${ORCH_FILE}${RESET}"
  exit 0
else
  echo -e "${RED}✗ Failed to download ${ORCH_FILE}${RESET}"
  exit 1
fi

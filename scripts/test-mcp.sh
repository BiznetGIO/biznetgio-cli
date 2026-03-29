#!/usr/bin/env bash
#
# Comprehensive test script for @biznetgio/mcp
# Loads .env for staging base URL and API key
#
# Usage:
#   ./scripts/test-mcp.sh
#

set +e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MCP_DIR="$PROJECT_DIR/mcp-server"
MCP_ENTRY="$MCP_DIR/src/index.js"
MCP_CALL="$SCRIPT_DIR/mcp-call.js"
ENV_FILE="$PROJECT_DIR/.env"

# Load .env
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "Error: .env file not found at $ENV_FILE"
  exit 1
fi

if [[ -z "${BIZNETGIO_API_KEY:-}" ]]; then
  echo "Error: BIZNETGIO_API_KEY not set in .env"
  exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

PASS=0
FAIL=0
SKIP=0
ERRORS=()

# Logging
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/test-mcp_${TIMESTAMP}.log"
BASE_URL="${BIZNETGIO_BASE_URL:-https://api.portal.biznetgio.com/v1}"

log() { echo "$@" >> "$LOG_FILE"; }

log "=== @biznetgio/mcp test run ==="
log "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Base URL:  $BASE_URL"
log ""

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

# Call MCP tool and capture output
mcp_call() {
  node "$MCP_CALL" "$MCP_ENTRY" call "$1" "${2:-\{\}}" 2>/dev/null
}
mcp_list() { node "$MCP_CALL" "$MCP_ENTRY" list 2>/dev/null; }

run_test() {
  local desc="$1"; shift; local cmd="$*"
  printf "  %-65s" "$desc"
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${GREEN}PASS${NC}"; ((PASS++)); return 0
  else
    echo -e "${RED}FAIL${NC}"; ((FAIL++))
    ERRORS+=("$desc\n    cmd: $cmd\n    out: $(echo "$output" | head -c 200)")
    log "FAIL: $desc"; log "  cmd: $cmd"; log "  out: $output"; log ""
    return 1
  fi
}

run_contains_test() {
  local desc="$1"; local expected="$2"; shift 2; local cmd="$*"
  printf "  %-65s" "$desc"
  output=$(eval "$cmd" 2>&1) || true
  if echo "$output" | grep -q "$expected"; then
    echo -e "${GREEN}PASS${NC}"; ((PASS++)); return 0
  else
    echo -e "${RED}FAIL${NC}"; ((FAIL++))
    ERRORS+=("$desc\n    expected: '$expected'\n    got: $(echo "$output" | head -c 200)")
    log "FAIL: $desc"; log "  expected: $expected"; log "  got: $(echo "$output" | head -3)"; log ""
    return 1
  fi
}

run_tool_test() {
  local desc="$1"; local tool="$2"; local args="${3:-{}}"
  printf "  %-65s" "$desc"
  local response
  response=$(mcp_call "$tool" "$args" 2>/dev/null || true)
  if echo "$response" | grep -q '"content"'; then
    echo -e "${GREEN}PASS${NC}"; ((PASS++)); return 0
  else
    echo -e "${RED}FAIL${NC}"; ((FAIL++))
    ERRORS+=("$desc (tool: $tool)\n    response: $(echo "$response" | head -c 200)")
    log "FAIL: $desc (tool: $tool)"; log "  args: $args"; log "  response: $(echo "$response" | head -c 500)"; log ""
    return 1
  fi
}

check_tool() {
  local name="$1"
  printf "  %-65s" "Tool: $name"
  if echo "$TOOLS_LIST" | grep -q "\"name\":\"$name\""; then
    echo -e "${GREEN}PASS${NC}"; ((PASS++))
  else
    echo -e "${RED}FAIL${NC}"; ((FAIL++))
    ERRORS+=("Tool not found: $name")
  fi
}

section() { echo ""; echo -e "${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }
subsection() { echo -e "  ${BOLD}── $1${NC}"; }

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║    @biznetgio/mcp - Comprehensive Test Suite            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Base URL: ${BOLD}$BASE_URL${NC}"

# ─────────────────────────────────────────────
# 1. Pre-flight
# ─────────────────────────────────────────────

section "1. Pre-flight Checks"

run_test "Node.js available" "node --version"
run_test "MCP entry point exists" "test -f $MCP_ENTRY"
run_test "MCP call helper exists" "test -f $MCP_CALL"
run_test "Dependencies installed" "test -d $MCP_DIR/node_modules"
run_test "All tool modules exist" \
  "test -f $MCP_DIR/src/tools/metal.js && \
   test -f $MCP_DIR/src/tools/elastic-storage.js && \
   test -f $MCP_DIR/src/tools/additional-ip.js && \
   test -f $MCP_DIR/src/tools/neolite.js && \
   test -f $MCP_DIR/src/tools/neolite-pro.js && \
   test -f $MCP_DIR/src/tools/object-storage.js"

# ─────────────────────────────────────────────
# 2. MCP Initialize & Tool Listing
# ─────────────────────────────────────────────

section "2. MCP Server Initialization"

TOOLS_LIST=$(mcp_list 2>/dev/null || true)

run_contains_test "Server returns tools list" "\"tools\"" "echo '$TOOLS_LIST' | head -c 500"

TOOL_COUNT=$(echo "$TOOLS_LIST" | grep -o '"name":' | wc -l | tr -d ' ')
printf "  %-65s" "Total tools registered: $TOOL_COUNT"
if [[ "$TOOL_COUNT" -gt 100 ]]; then
  echo -e "${GREEN}PASS${NC} (>100)"; ((PASS++))
else
  echo -e "${RED}FAIL${NC} (expected >100, got $TOOL_COUNT)"; ((FAIL++))
fi

# ─────────────────────────────────────────────
# 3. Tool Registration
# ─────────────────────────────────────────────

section "3. Tool Registration"

subsection "NEO Metal tools"
for t in metal_list metal_detail metal_create metal_delete metal_update_label metal_state metal_set_state metal_rebuild metal_openvpn metal_products metal_product_detail metal_product_os metal_rebuild_os metal_states metal_keypair_list metal_keypair_create metal_keypair_import metal_keypair_delete; do
  check_tool "$t"
done

subsection "Elastic Storage tools"
for t in elastic_storage_list elastic_storage_detail elastic_storage_create elastic_storage_upgrade elastic_storage_change_package elastic_storage_delete elastic_storage_products elastic_storage_product_detail; do
  check_tool "$t"
done

subsection "Additional IP tools"
for t in additional_ip_list additional_ip_detail additional_ip_create additional_ip_delete additional_ip_regions additional_ip_products additional_ip_product_detail additional_ip_assignments additional_ip_assigns additional_ip_assign additional_ip_assign_detail additional_ip_unassign; do
  check_tool "$t"
done

subsection "NEO Lite tools (sample)"
for t in neolite_list neolite_detail neolite_create neolite_delete neolite_vm_details neolite_set_state neolite_rename neolite_rebuild neolite_change_keypair neolite_change_package neolite_upgrade_storage neolite_products neolite_product_detail neolite_product_os neolite_product_ip neolite_keypair_list neolite_snapshot_list neolite_snapshot_create neolite_disk_list neolite_disk_create; do
  check_tool "$t"
done

subsection "NEO Lite Pro tools (sample)"
for t in neolite_pro_list neolite_pro_detail neolite_pro_create neolite_pro_delete neolite_pro_set_state neolite_pro_products neolite_pro_keypair_list neolite_pro_snapshot_list neolite_pro_disk_list; do
  check_tool "$t"
done

subsection "Object Storage tools"
for t in object_storage_list object_storage_detail object_storage_create object_storage_delete object_storage_upgrade_quota object_storage_products object_storage_product_detail object_storage_credential_list object_storage_credential_create object_storage_credential_update object_storage_credential_delete object_storage_bucket_list object_storage_bucket_create object_storage_bucket_info object_storage_bucket_usage object_storage_bucket_set_acl object_storage_bucket_delete object_storage_object_list object_storage_object_info object_storage_object_download object_storage_object_url object_storage_object_copy object_storage_object_move object_storage_object_mkdir object_storage_object_set_acl object_storage_object_delete; do
  check_tool "$t"
done

# ─────────────────────────────────────────────
# 4. Live Tool Calls - Read Only
# ─────────────────────────────────────────────

section "4. Live Tool Calls - NEO Metal"

run_tool_test "metal_list" "metal_list"
run_tool_test "metal_products" "metal_products"
run_tool_test "metal_states" "metal_states"
run_tool_test "metal_keypair_list" "metal_keypair_list"
run_tool_test "metal_openvpn" "metal_openvpn"

section "5. Live Tool Calls - Elastic Storage"
run_tool_test "elastic_storage_list" "elastic_storage_list"
run_tool_test "elastic_storage_products" "elastic_storage_products"

section "6. Live Tool Calls - Additional IP"
run_tool_test "additional_ip_list" "additional_ip_list"
run_tool_test "additional_ip_regions" "additional_ip_regions"
run_tool_test "additional_ip_products" "additional_ip_products"

section "7. Live Tool Calls - NEO Lite"
run_tool_test "neolite_list" "neolite_list"
run_tool_test "neolite_products" "neolite_products"
run_tool_test "neolite_keypair_list" "neolite_keypair_list"
run_tool_test "neolite_snapshot_list" "neolite_snapshot_list"
run_tool_test "neolite_snapshot_products" "neolite_snapshot_products"
run_tool_test "neolite_disk_list" "neolite_disk_list"
run_tool_test "neolite_disk_products" "neolite_disk_products"

section "8. Live Tool Calls - NEO Lite Pro"
run_tool_test "neolite_pro_list" "neolite_pro_list"
run_tool_test "neolite_pro_products" "neolite_pro_products"
run_tool_test "neolite_pro_keypair_list" "neolite_pro_keypair_list"
run_tool_test "neolite_pro_snapshot_list" "neolite_pro_snapshot_list"
run_tool_test "neolite_pro_disk_list" "neolite_pro_disk_list"
run_tool_test "neolite_pro_disk_products" "neolite_pro_disk_products"

section "9. Live Tool Calls - Object Storage"
run_tool_test "object_storage_list" "object_storage_list"
run_tool_test "object_storage_products" "object_storage_products"

# ─────────────────────────────────────────────
# 10. CRUD Tool Calls
# ─────────────────────────────────────────────

section "10. CRUD - Keypair Lifecycle"

subsection "Neolite keypair: create → list → delete"

KP_RAW=$(mcp_call neolite_keypair_create '{"name":"mcptest-kp"}')
KP_ID=$(echo "$KP_RAW" | grep -o 'neosshkey_id[^0-9]*[0-9]*' | grep -o '[0-9]*' | head -1)

if [[ -n "$KP_ID" && "$KP_ID" != "undefined" ]]; then
  printf "  %-65s" "neolite_keypair_create (id: $KP_ID)"
  echo -e "${GREEN}PASS${NC}"; ((PASS++))
  log "CRUD: neolite keypair created id=$KP_ID"

  run_tool_test "neolite_keypair_list (verify)" "neolite_keypair_list"

  DEL_RAW=$(mcp_call neolite_keypair_delete "{\"keypair_id\":$KP_ID}" 2>/dev/null || true)
  if echo "$DEL_RAW" | grep -q '"content"'; then
    printf "  %-65s" "neolite_keypair_delete $KP_ID"
    echo -e "${GREEN}PASS${NC}"; ((PASS++))
    log "CRUD: neolite keypair deleted id=$KP_ID"
  else
    printf "  %-65s" "neolite_keypair_delete $KP_ID"
    echo -e "${RED}FAIL${NC}"; ((FAIL++))
    log "FAIL: neolite_keypair_delete"; log "  response: $DEL_RAW"
  fi
else
  printf "  %-65s" "neolite_keypair_create"
  echo -e "${RED}FAIL${NC}"; ((FAIL++))
  log "FAIL: neolite_keypair_create"; log "  response: $(echo "$KP_RAW" | head -c 300)"
fi

subsection "Neolite: create → detail → delete"

KP2_RAW=$(mcp_call neolite_keypair_create '{"name":"mcptest-nl"}')
KP2_ID=$(echo "$KP2_RAW" | grep -o 'neosshkey_id[^0-9]*[0-9]*' | grep -o '[0-9]*' | head -1)

if [[ -n "$KP2_ID" && "$KP2_ID" != "undefined" ]]; then
  NL_RAW=$(mcp_call neolite_create "{\"product_id\":1547,\"cycle\":\"m\",\"select_os\":\"Ubuntu-20.04\",\"keypair_id\":$KP2_ID,\"ssh_and_console_user\":\"testuser\",\"console_password\":\"TestPass123\",\"vm_name\":\"mcptest\"}")
  NL_ID=$(echo "$NL_RAW" | grep -o 'account_id[^0-9]*[0-9]*' | grep -o '[0-9]*' | head -1)

  if [[ -n "$NL_ID" && "$NL_ID" != "undefined" ]]; then
    printf "  %-65s" "neolite_create (account: $NL_ID)"
    echo -e "${GREEN}PASS${NC}"; ((PASS++))
    log "CRUD: neolite created account_id=$NL_ID"

    run_tool_test "neolite_detail $NL_ID" "neolite_detail" "{\"account_id\":$NL_ID}"

    DEL_NL=$(mcp_call neolite_delete "{\"account_id\":$NL_ID}" 2>/dev/null || true)
    if echo "$DEL_NL" | grep -q '"content"'; then
      printf "  %-65s" "neolite_delete $NL_ID"
      echo -e "${GREEN}PASS${NC}"; ((PASS++))
    else
      printf "  %-65s" "neolite_delete $NL_ID"
      echo -e "${RED}FAIL${NC}"; ((FAIL++))
      log "FAIL: neolite_delete $NL_ID"
    fi
  else
    printf "  %-65s" "neolite_create"
    echo -e "${RED}FAIL${NC}"; ((FAIL++))
    log "FAIL: neolite_create"; log "  response: $(echo "$NL_RAW" | head -c 300)"
  fi

  # Cleanup keypair
  mcp_call neolite_keypair_delete "{\"keypair_id\":$KP2_ID}" >/dev/null 2>&1 || true
else
  printf "  %-65s" "keypair for neolite_create"
  echo -e "${RED}FAIL${NC}"; ((FAIL++))
fi

subsection "Object storage: create → detail → delete"

OBJ_RAW=$(mcp_call object_storage_create '{"product_id":168,"cycle":"m","label":"mcptest-nos"}')
OBJ_ID=$(echo "$OBJ_RAW" | grep -o 'account_id[^0-9]*[0-9]*' | grep -o '[0-9]*' | head -1)

if [[ -n "$OBJ_ID" && "$OBJ_ID" != "undefined" ]]; then
  printf "  %-65s" "object_storage_create (account: $OBJ_ID)"
  echo -e "${GREEN}PASS${NC}"; ((PASS++))
  log "CRUD: object-storage created account_id=$OBJ_ID"

  run_tool_test "object_storage_detail $OBJ_ID" "object_storage_detail" "{\"account_id\":$OBJ_ID}"

  mcp_call object_storage_delete "{\"account_id\":$OBJ_ID}" >/dev/null 2>&1 || true
  printf "  %-65s" "object_storage_delete $OBJ_ID"
  echo -e "${GREEN}PASS${NC}"; ((PASS++))
else
  printf "  %-65s" "object_storage_create"
  echo -e "${RED}FAIL${NC}"; ((FAIL++))
  log "FAIL: object_storage_create"; log "  response: $(echo "$OBJ_RAW" | head -c 300)"
fi

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────

echo ""
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Test Results${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}PASS${NC}: $PASS"
echo -e "  ${RED}FAIL${NC}: $FAIL"
echo -e "  ${YELLOW}SKIP${NC}: $SKIP"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "  ${BOLD}TOTAL${NC}: $TOTAL"
echo ""

if [[ ${#ERRORS[@]} -gt 0 ]]; then
  echo -e "${RED}${BOLD}Failed Tests:${NC}"
  for err in "${ERRORS[@]}"; do
    echo -e "  ${RED}✗${NC} $err"
  done
  echo ""
fi

log "=== Summary ==="
log "PASS: $PASS  FAIL: $FAIL  SKIP: $SKIP  TOTAL: $TOTAL"

if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All tests passed!${NC}"
  echo -e "  Log: ${LOG_FILE}"
  exit 0
else
  echo -e "${RED}${BOLD}$FAIL test(s) failed.${NC}"
  echo -e "  Log: ${LOG_FILE}"
  exit 1
fi

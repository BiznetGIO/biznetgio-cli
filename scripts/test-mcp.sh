#!/usr/bin/env bash
#
# Comprehensive test script for @biznetgio/mcp
# Loads .env for staging base URL and API key
#
# Usage:
#   ./scripts/test-mcp.sh
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MCP_DIR="$PROJECT_DIR/mcp-server"
MCP_SERVER="node $MCP_DIR/src/index.js"
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

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

# Send initialize + request to MCP server
mcp_request() {
  local method="$1"
  local params="${2:-{}}"
  local id="${3:-2}"

  local init='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
  local notif='{"jsonrpc":"2.0","method":"notifications/initialized"}'
  local req="{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"$method\",\"params\":$params}"

  printf '%s\n%s\n%s\n' "$init" "$notif" "$req" | timeout 15 $MCP_SERVER 2>/dev/null
}

run_test() {
  local description="$1"
  shift
  local cmd="$*"

  printf "  %-65s" "$description"
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("$description\n    cmd: $cmd\n    out: $output")
    ((FAIL++))
    return 1
  fi
}

run_contains_test() {
  local description="$1"
  local expected="$2"
  shift 2
  local cmd="$*"

  printf "  %-65s" "$description"
  output=$(eval "$cmd" 2>&1) || true
  if echo "$output" | grep -q "$expected"; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("$description\n    expected: '$expected'\n    got: $(echo "$output" | head -3)")
    ((FAIL++))
    return 1
  fi
}

# Call a tool and check that response contains "content"
run_tool_test() {
  local description="$1"
  local tool_name="$2"
  local args="${3:-{}}"

  printf "  %-65s" "$description"
  local response
  response=$(mcp_request "tools/call" "{\"name\":\"$tool_name\",\"arguments\":$args}" 3 2>/dev/null || true)
  local last_line
  last_line=$(echo "$response" | tail -1)
  if echo "$last_line" | grep -q '"content"'; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("$description (tool: $tool_name)\n    response: $(echo "$last_line" | head -1)")
    ((FAIL++))
    return 1
  fi
}

skip_test() {
  local description="$1"
  local reason="${2:-no data}"
  printf "  %-65s" "$description"
  echo -e "${YELLOW}SKIP${NC} ($reason)"
  ((SKIP++))
}

section() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━ $1 ━━━${NC}"
}

subsection() {
  echo -e "  ${BOLD}── $1${NC}"
}

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║    @biznetgio/mcp - Comprehensive Test Suite            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Base URL: ${BOLD}${BIZNETGIO_BASE_URL:-https://api.portal.biznetgio.com/v1}${NC}"

# ─────────────────────────────────────────────
# 1. Pre-flight
# ─────────────────────────────────────────────

section "1. Pre-flight Checks"

run_test "Node.js available" "node --version"
run_test "MCP entry point exists" "test -f $MCP_DIR/src/index.js"
run_test "Dependencies installed" "test -d $MCP_DIR/node_modules"
run_test "All tool modules exist" \
  "test -f $MCP_DIR/src/tools/metal.js && \
   test -f $MCP_DIR/src/tools/elastic-storage.js && \
   test -f $MCP_DIR/src/tools/additional-ip.js && \
   test -f $MCP_DIR/src/tools/neolite.js && \
   test -f $MCP_DIR/src/tools/neolite-pro.js && \
   test -f $MCP_DIR/src/tools/object-storage.js"

# ─────────────────────────────────────────────
# 2. MCP Initialize
# ─────────────────────────────────────────────

section "2. MCP Server Initialization"

INIT_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | timeout 5 $MCP_SERVER 2>/dev/null || true)

run_contains_test "Server responds to initialize" "serverInfo" "echo '$INIT_RESPONSE'"
run_contains_test "Server name is 'biznetgio'" "\"name\":\"biznetgio\"" "echo '$INIT_RESPONSE'"
run_contains_test "Server version is '1.0.0'" "\"version\":\"1.0.0\"" "echo '$INIT_RESPONSE'"
run_contains_test "Server supports tools capability" "\"tools\"" "echo '$INIT_RESPONSE'"

# ─────────────────────────────────────────────
# 3. Tool listing
# ─────────────────────────────────────────────

section "3. Tool Listing"

TOOLS_RESPONSE=$(mcp_request "tools/list" '{}' 2 2>/dev/null || true)
TOOLS_LINE=$(echo "$TOOLS_RESPONSE" | tail -1)

run_contains_test "tools/list returns tools array" "\"tools\"" "echo '$TOOLS_LINE'"

# Count tools
TOOL_COUNT=$(echo "$TOOLS_LINE" | grep -o '"name":' | wc -l | tr -d ' ')
printf "  %-65s" "Total tools registered: $TOOL_COUNT"
if [[ "$TOOL_COUNT" -gt 100 ]]; then
  echo -e "${GREEN}PASS${NC} (>100)"
  ((PASS++))
else
  echo -e "${RED}FAIL${NC} (expected >100, got $TOOL_COUNT)"
  ((FAIL++))
fi

check_tool() {
  local tool_name="$1"
  printf "  %-65s" "Tool: $tool_name"
  if echo "$TOOLS_LINE" | grep -q "\"name\":\"$tool_name\""; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("Tool not found: $tool_name")
    ((FAIL++))
  fi
}

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

subsection "Object Storage tools (sample)"
for t in object_storage_list object_storage_detail object_storage_create object_storage_upgrade_quota object_storage_products object_storage_product_detail object_storage_credential_list object_storage_credential_create object_storage_credential_update object_storage_credential_delete object_storage_bucket_list object_storage_bucket_create object_storage_bucket_info object_storage_bucket_usage object_storage_bucket_set_acl object_storage_bucket_delete object_storage_object_list object_storage_object_info object_storage_object_download object_storage_object_url object_storage_object_copy object_storage_object_move object_storage_object_mkdir object_storage_object_set_acl object_storage_object_delete; do
  check_tool "$t"
done

# ─────────────────────────────────────────────
# 4. Live tool calls - read only
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

if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}$FAIL test(s) failed.${NC}"
  exit 1
fi

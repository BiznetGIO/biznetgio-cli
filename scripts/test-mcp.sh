#!/usr/bin/env bash
#
# Test script untuk mcp-server
# Menguji MCP server initialization, tool listing, dan live tool calls
#
# Usage:
#   ./scripts/test-mcp.sh              # Test startup + tool listing
#   ./scripts/test-mcp.sh --live       # Test startup + tool listing + live API calls
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MCP_DIR="$PROJECT_DIR/mcp-server"
MCP_SERVER="node $MCP_DIR/src/index.js"

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
LIVE_MODE=false
ERRORS=()

if [[ "${1:-}" == "--live" ]]; then
  LIVE_MODE=true
  if [[ -z "${BIZNETGIO_API_KEY:-}" ]]; then
    echo -e "${RED}Error: BIZNETGIO_API_KEY not set. Required for --live mode.${NC}"
    exit 1
  fi
fi

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

# Send a JSON-RPC message to the MCP server and capture response
mcp_call() {
  local input="$1"
  echo "$input" | timeout 10 $MCP_SERVER 2>/dev/null | head -1
}

# Send initialize + request in sequence
mcp_request() {
  local method="$1"
  local params="${2:-{}}"
  local id="${3:-2}"

  local init_msg='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
  local init_notif='{"jsonrpc":"2.0","method":"notifications/initialized"}'
  local request_msg="{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"$method\",\"params\":$params}"

  printf '%s\n%s\n%s\n' "$init_msg" "$init_notif" "$request_msg" | timeout 15 $MCP_SERVER 2>/dev/null
}

run_test() {
  local description="$1"
  shift
  local cmd="$*"

  printf "  %-60s" "$description"
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("$description: $cmd\n  Output: $output")
    ((FAIL++))
    return 1
  fi
}

run_live_test() {
  if [[ "$LIVE_MODE" != true ]]; then
    printf "  %-60s" "$1"
    echo -e "${YELLOW}SKIP${NC} (use --live)"
    ((SKIP++))
    return 0
  fi
  run_test "$@"
}

section() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━ $1 ━━━${NC}"
}

# ─────────────────────────────────────────────
# Pre-flight checks
# ─────────────────────────────────────────────

section "Pre-flight Checks"

run_test "Node.js is available" "node --version"
run_test "MCP server entry point exists" "test -f $MCP_DIR/src/index.js"
run_test "Dependencies installed" "test -d $MCP_DIR/node_modules"
run_test "Client module exists" "test -f $MCP_DIR/src/client.js"
run_test "Metal tools exist" "test -f $MCP_DIR/src/tools/metal.js"
run_test "Elastic storage tools exist" "test -f $MCP_DIR/src/tools/elastic-storage.js"
run_test "Additional IP tools exist" "test -f $MCP_DIR/src/tools/additional-ip.js"
run_test "Neolite tools exist" "test -f $MCP_DIR/src/tools/neolite.js"
run_test "Neolite Pro tools exist" "test -f $MCP_DIR/src/tools/neolite-pro.js"
run_test "Object storage tools exist" "test -f $MCP_DIR/src/tools/object-storage.js"

# ─────────────────────────────────────────────
# MCP Initialize
# ─────────────────────────────────────────────

section "MCP Server Initialization"

run_test "Server responds to initialize" \
  "echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0.0\"}}}' | timeout 5 $MCP_SERVER 2>/dev/null | grep -q '\"serverInfo\"'"

run_test "Server name is 'biznetgio'" \
  "echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0.0\"}}}' | timeout 5 $MCP_SERVER 2>/dev/null | grep -q '\"name\":\"biznetgio\"'"

run_test "Server version is '1.0.0'" \
  "echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0.0\"}}}' | timeout 5 $MCP_SERVER 2>/dev/null | grep -q '\"version\":\"1.0.0\"'"

run_test "Server supports tools capability" \
  "echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0.0\"}}}' | timeout 5 $MCP_SERVER 2>/dev/null | grep -q '\"tools\"'"

# ─────────────────────────────────────────────
# Tool Listing
# ─────────────────────────────────────────────

section "MCP Tool Listing"

# Get the tools list response
TOOLS_RESPONSE=$(mcp_request "tools/list" '{}' 2 2>/dev/null || true)

# Extract the last line (tools/list response)
TOOLS_LINE=$(echo "$TOOLS_RESPONSE" | tail -1)

run_test "tools/list returns result" \
  "echo '$TOOLS_LINE' | grep -q '\"tools\"'"

# Check specific tools exist
check_tool() {
  local tool_name="$1"
  printf "  %-60s" "Tool exists: $tool_name"
  if echo "$TOOLS_LINE" | grep -q "\"name\":\"$tool_name\""; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("Tool not found: $tool_name")
    ((FAIL++))
  fi
}

echo -e "  ${BOLD}── NEO Metal Tools${NC}"
check_tool "metal_list"
check_tool "metal_detail"
check_tool "metal_create"
check_tool "metal_delete"
check_tool "metal_update_label"
check_tool "metal_state"
check_tool "metal_set_state"
check_tool "metal_rebuild"
check_tool "metal_openvpn"
check_tool "metal_products"
check_tool "metal_product_detail"
check_tool "metal_product_os"
check_tool "metal_rebuild_os"
check_tool "metal_states"
check_tool "metal_keypair_list"
check_tool "metal_keypair_create"
check_tool "metal_keypair_import"
check_tool "metal_keypair_delete"

echo -e "  ${BOLD}── Elastic Storage Tools${NC}"
check_tool "elastic_storage_list"
check_tool "elastic_storage_detail"
check_tool "elastic_storage_create"
check_tool "elastic_storage_upgrade"
check_tool "elastic_storage_change_package"
check_tool "elastic_storage_delete"
check_tool "elastic_storage_products"
check_tool "elastic_storage_product_detail"

echo -e "  ${BOLD}── Additional IP Tools${NC}"
check_tool "additional_ip_list"
check_tool "additional_ip_detail"
check_tool "additional_ip_create"
check_tool "additional_ip_delete"
check_tool "additional_ip_regions"
check_tool "additional_ip_products"
check_tool "additional_ip_product_detail"
check_tool "additional_ip_assignments"
check_tool "additional_ip_assigns"
check_tool "additional_ip_assign"
check_tool "additional_ip_assign_detail"
check_tool "additional_ip_unassign"

echo -e "  ${BOLD}── NEO Lite Tools${NC}"
check_tool "neolite_list"
check_tool "neolite_detail"
check_tool "neolite_create"
check_tool "neolite_delete"
check_tool "neolite_vm_details"
check_tool "neolite_set_state"
check_tool "neolite_rename"
check_tool "neolite_rebuild"
check_tool "neolite_change_keypair"
check_tool "neolite_change_package"
check_tool "neolite_upgrade_storage"
check_tool "neolite_products"
check_tool "neolite_product_detail"
check_tool "neolite_product_os"
check_tool "neolite_product_ip"
check_tool "neolite_keypair_list"
check_tool "neolite_snapshot_list"
check_tool "neolite_snapshot_create"
check_tool "neolite_disk_list"
check_tool "neolite_disk_create"

echo -e "  ${BOLD}── NEO Lite Pro Tools${NC}"
check_tool "neolite_pro_list"
check_tool "neolite_pro_detail"
check_tool "neolite_pro_create"
check_tool "neolite_pro_delete"
check_tool "neolite_pro_set_state"
check_tool "neolite_pro_products"
check_tool "neolite_pro_keypair_list"
check_tool "neolite_pro_snapshot_list"
check_tool "neolite_pro_disk_list"

echo -e "  ${BOLD}── Object Storage Tools${NC}"
check_tool "object_storage_list"
check_tool "object_storage_detail"
check_tool "object_storage_create"
check_tool "object_storage_upgrade_quota"
check_tool "object_storage_products"
check_tool "object_storage_product_detail"
check_tool "object_storage_credential_list"
check_tool "object_storage_credential_create"
check_tool "object_storage_credential_update"
check_tool "object_storage_credential_delete"
check_tool "object_storage_bucket_list"
check_tool "object_storage_bucket_create"
check_tool "object_storage_bucket_info"
check_tool "object_storage_bucket_usage"
check_tool "object_storage_bucket_set_acl"
check_tool "object_storage_bucket_delete"
check_tool "object_storage_object_list"
check_tool "object_storage_object_info"
check_tool "object_storage_object_download"
check_tool "object_storage_object_url"
check_tool "object_storage_object_copy"
check_tool "object_storage_object_move"
check_tool "object_storage_object_mkdir"
check_tool "object_storage_object_set_acl"
check_tool "object_storage_object_delete"

# Count total tools
TOOL_COUNT=$(echo "$TOOLS_LINE" | grep -o '"name":' | wc -l | tr -d ' ')
echo ""
echo -e "  ${BOLD}Total tools registered: $TOOL_COUNT${NC}"

# ─────────────────────────────────────────────
# Live Tool Calls
# ─────────────────────────────────────────────

section "Live MCP Tool Calls"

call_tool() {
  local tool_name="$1"
  local args="${2:-{}}"
  local response
  response=$(mcp_request "tools/call" "{\"name\":\"$tool_name\",\"arguments\":$args}" 3 2>/dev/null || true)
  local last_line
  last_line=$(echo "$response" | tail -1)
  if echo "$last_line" | grep -q '"content"'; then
    return 0
  else
    return 1
  fi
}

run_live_test "Call metal_list" "call_tool metal_list"
run_live_test "Call metal_products" "call_tool metal_products"
run_live_test "Call metal_states" "call_tool metal_states"
run_live_test "Call metal_keypair_list" "call_tool metal_keypair_list"
run_live_test "Call elastic_storage_list" "call_tool elastic_storage_list"
run_live_test "Call elastic_storage_products" "call_tool elastic_storage_products"
run_live_test "Call additional_ip_list" "call_tool additional_ip_list"
run_live_test "Call additional_ip_regions" "call_tool additional_ip_regions"
run_live_test "Call additional_ip_products" "call_tool additional_ip_products"
run_live_test "Call neolite_list" "call_tool neolite_list"
run_live_test "Call neolite_products" "call_tool neolite_products"
run_live_test "Call neolite_keypair_list" "call_tool neolite_keypair_list"
run_live_test "Call neolite_snapshot_list" "call_tool neolite_snapshot_list"
run_live_test "Call neolite_disk_list" "call_tool neolite_disk_list"
run_live_test "Call neolite_disk_products" "call_tool neolite_disk_products"
run_live_test "Call neolite_pro_list" "call_tool neolite_pro_list"
run_live_test "Call neolite_pro_products" "call_tool neolite_pro_products"
run_live_test "Call object_storage_list" "call_tool object_storage_list"
run_live_test "Call object_storage_products" "call_tool object_storage_products"

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────

echo ""
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Test Results${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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

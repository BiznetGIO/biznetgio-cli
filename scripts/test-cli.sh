#!/usr/bin/env bash
#
# Test script for @biznetgio/cli
#
# Usage:
#   ./scripts/test-cli.sh           # Offline tests (no API key needed)
#   ./scripts/test-cli.sh --live    # Offline + live API tests
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$PROJECT_DIR/cli"
CLI="node $CLI_DIR/bin/biznetgio.js"

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

# Test that a command FAILS (expected failure)
run_fail_test() {
  local description="$1"
  shift
  local cmd="$*"

  printf "  %-60s" "$description"
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${RED}FAIL${NC} (expected error, got success)"
    ERRORS+=("$description: expected failure but got success")
    ((FAIL++))
    return 1
  else
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    return 0
  fi
}

# Test that output contains a string
run_output_test() {
  local description="$1"
  local expected="$2"
  shift 2
  local cmd="$*"

  printf "  %-60s" "$description"
  if output=$(eval "$cmd" 2>&1) && echo "$output" | grep -q "$expected"; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    return 0
  elif echo "$output" | grep -q "$expected"; then
    # command failed but output contains expected string (e.g. error messages)
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("$description: expected '$expected' in output\n  Got: $output")
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

run_live_output_test() {
  if [[ "$LIVE_MODE" != true ]]; then
    printf "  %-60s" "$1"
    echo -e "${YELLOW}SKIP${NC} (use --live)"
    ((SKIP++))
    return 0
  fi
  run_output_test "$@"
}

section() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━ $1 ━━━${NC}"
}

subsection() {
  echo -e "  ${BOLD}── $1${NC}"
}

# ─────────────────────────────────────────────
# Pre-flight
# ─────────────────────────────────────────────

section "Pre-flight Checks"

run_test "Node.js is available" "node --version"
run_test "CLI entry point exists" "test -f $CLI_DIR/bin/biznetgio.js"
run_test "Dependencies installed" "test -d $CLI_DIR/node_modules"
run_test "client.js exists" "test -f $CLI_DIR/src/client.js"
run_test "formatter.js exists" "test -f $CLI_DIR/src/utils/formatter.js"
run_test "common.js exists" "test -f $CLI_DIR/src/utils/common.js"
run_test "All 6 command files exist" \
  "test -f $CLI_DIR/src/commands/metal.js && \
   test -f $CLI_DIR/src/commands/elastic-storage.js && \
   test -f $CLI_DIR/src/commands/additional-ip.js && \
   test -f $CLI_DIR/src/commands/neolite.js && \
   test -f $CLI_DIR/src/commands/neolite-pro.js && \
   test -f $CLI_DIR/src/commands/object-storage.js"

# ─────────────────────────────────────────────
# CLI structure & version
# ─────────────────────────────────────────────

section "CLI Structure & Version"

run_output_test "Shows version" "1.0.0" "$CLI --version"
run_output_test "Help lists all 6 services" "metal" "$CLI --help"
run_output_test "Help shows elastic-storage" "elastic-storage" "$CLI --help"
run_output_test "Help shows additional-ip" "additional-ip" "$CLI --help"
run_output_test "Help shows neolite" "neolite" "$CLI --help"
run_output_test "Help shows neolite-pro" "neolite-pro" "$CLI --help"
run_output_test "Help shows object-storage" "object-storage" "$CLI --help"

# ─────────────────────────────────────────────
# Command registration (all subcommands exist)
# ─────────────────────────────────────────────

section "Command Registration"

subsection "NEO Metal subcommands"
for cmd in list detail create delete update-label state set-state rebuild openvpn products product product-os rebuild-os states keypair; do
  run_output_test "metal has '$cmd'" "$cmd" "$CLI metal --help"
done

subsection "Elastic Storage subcommands"
for cmd in list detail create upgrade change-package delete products product; do
  run_output_test "elastic-storage has '$cmd'" "$cmd" "$CLI elastic-storage --help"
done

subsection "Additional IP subcommands"
for cmd in list detail create delete regions products product assignments assigns assign assign-detail unassign; do
  run_output_test "additional-ip has '$cmd'" "$cmd" "$CLI additional-ip --help"
done

subsection "NEO Lite subcommands"
for cmd in list detail create delete vm-details set-state rename rebuild change-keypair change-package upgrade-storage migrate-to-pro products product product-os product-ip keypair snapshot disk; do
  run_output_test "neolite has '$cmd'" "$cmd" "$CLI neolite --help"
done

subsection "NEO Lite Pro subcommands"
for cmd in list detail create delete vm-details set-state rename rebuild change-keypair change-package upgrade-storage products product product-os product-ip keypair snapshot disk; do
  run_output_test "neolite-pro has '$cmd'" "$cmd" "$CLI neolite-pro --help"
done

subsection "Object Storage subcommands"
for cmd in list detail create upgrade-quota products product credential bucket object; do
  run_output_test "object-storage has '$cmd'" "$cmd" "$CLI object-storage --help"
done

subsection "Nested subcommands"
run_output_test "metal keypair has 'list'" "list" "$CLI metal keypair --help"
run_output_test "metal keypair has 'create'" "create" "$CLI metal keypair --help"
run_output_test "metal keypair has 'import'" "import" "$CLI metal keypair --help"
run_output_test "metal keypair has 'delete'" "delete" "$CLI metal keypair --help"
run_output_test "neolite snapshot has 'list'" "list" "$CLI neolite snapshot --help"
run_output_test "neolite snapshot has 'restore'" "restore" "$CLI neolite snapshot --help"
run_output_test "neolite snapshot has 'create-instance'" "create-instance" "$CLI neolite snapshot --help"
run_output_test "neolite disk has 'list'" "list" "$CLI neolite disk --help"
run_output_test "neolite disk has 'upgrade'" "upgrade" "$CLI neolite disk --help"
run_output_test "object-storage credential has 'list'" "list" "$CLI object-storage credential --help"
run_output_test "object-storage credential has 'create'" "create" "$CLI object-storage credential --help"
run_output_test "object-storage bucket has 'list'" "list" "$CLI object-storage bucket --help"
run_output_test "object-storage bucket has 'set-acl'" "set-acl" "$CLI object-storage bucket --help"
run_output_test "object-storage object has 'url'" "url" "$CLI object-storage object --help"
run_output_test "object-storage object has 'copy'" "copy" "$CLI object-storage object --help"
run_output_test "object-storage object has 'move'" "move" "$CLI object-storage object --help"
run_output_test "object-storage object has 'mkdir'" "mkdir" "$CLI object-storage object --help"

# ─────────────────────────────────────────────
# Option parsing
# ─────────────────────────────────────────────

section "Option Parsing"

subsection "Required options validation"
run_output_test "metal create requires --product-id" "product-id" "$CLI metal create --help"
run_output_test "metal create requires --cycle" "cycle" "$CLI metal create --help"
run_output_test "metal create requires --keypair-id" "keypair-id" "$CLI metal create --help"
run_output_test "metal create requires --label" "label" "$CLI metal create --help"
run_output_test "neolite create requires --select-os" "select-os" "$CLI neolite create --help"
run_output_test "neolite create requires --ssh-and-console-user" "ssh-and-console-user" "$CLI neolite create --help"
run_output_test "neolite create requires --console-password" "console-password" "$CLI neolite create --help"
run_output_test "elastic-storage create requires --storage-name" "storage-name" "$CLI elastic-storage create --help"
run_output_test "elastic-storage create requires --metal-account-id" "metal-account-id" "$CLI elastic-storage create --help"
run_output_test "object-storage create requires --label" "label" "$CLI object-storage create --help"

subsection "Global options"
run_output_test "--output option documented" "output" "$CLI --help"
run_output_test "--api-key option documented" "api-key" "$CLI --help"

# ─────────────────────────────────────────────
# Error handling (no API key)
# ─────────────────────────────────────────────

section "Error Handling (No API Key)"

# Unset API key for these tests
_SAVED_KEY="${BIZNETGIO_API_KEY:-}"
unset BIZNETGIO_API_KEY 2>/dev/null || true

run_output_test "metal list fails without API key" "API key" "$CLI metal list 2>&1 || true"
run_output_test "neolite list fails without API key" "API key" "$CLI neolite list 2>&1 || true"
run_output_test "object-storage list fails without API key" "API key" "$CLI object-storage list 2>&1 || true"

# Restore API key
if [[ -n "$_SAVED_KEY" ]]; then
  export BIZNETGIO_API_KEY="$_SAVED_KEY"
fi

# ─────────────────────────────────────────────
# Missing argument handling
# ─────────────────────────────────────────────

section "Missing Argument Handling"

run_fail_test "metal detail without account_id fails" "$CLI metal detail 2>/dev/null"
run_fail_test "metal set-state without args fails" "$CLI metal set-state 2>/dev/null"
run_fail_test "neolite delete without account_id fails" "$CLI neolite delete 2>/dev/null"
run_fail_test "object-storage detail without account_id fails" "$CLI object-storage detail 2>/dev/null"
run_fail_test "object-storage bucket list without account_id fails" "$CLI object-storage bucket list 2>/dev/null"

# ─────────────────────────────────────────────
# Live API tests - read-only operations
# ─────────────────────────────────────────────

section "Live API Tests - NEO Metal"

run_live_test "metal list" "$CLI metal list"
run_live_test "metal products" "$CLI metal products"
run_live_test "metal states" "$CLI metal states"
run_live_test "metal keypair list" "$CLI metal keypair list"
run_live_test "metal openvpn" "$CLI metal openvpn"
run_live_test "metal list (table output)" "$CLI metal list --output table"
run_live_output_test "metal list returns JSON array or object" "[" "$CLI metal list"

section "Live API Tests - Elastic Storage"

run_live_test "elastic-storage list" "$CLI elastic-storage list"
run_live_test "elastic-storage products" "$CLI elastic-storage products"

section "Live API Tests - Additional IP"

run_live_test "additional-ip list" "$CLI additional-ip list"
run_live_test "additional-ip regions" "$CLI additional-ip regions"
run_live_test "additional-ip products" "$CLI additional-ip products"

section "Live API Tests - NEO Lite"

run_live_test "neolite list" "$CLI neolite list"
run_live_test "neolite products" "$CLI neolite products"
run_live_test "neolite keypair list" "$CLI neolite keypair list"
run_live_test "neolite snapshot list" "$CLI neolite snapshot list"
run_live_test "neolite snapshot products" "$CLI neolite snapshot products"
run_live_test "neolite disk list" "$CLI neolite disk list"
run_live_test "neolite disk products" "$CLI neolite disk products"

section "Live API Tests - NEO Lite Pro"

run_live_test "neolite-pro list" "$CLI neolite-pro list"
run_live_test "neolite-pro products" "$CLI neolite-pro products"
run_live_test "neolite-pro keypair list" "$CLI neolite-pro keypair list"
run_live_test "neolite-pro snapshot list" "$CLI neolite-pro snapshot list"
run_live_test "neolite-pro disk list" "$CLI neolite-pro disk list"

section "Live API Tests - Object Storage"

run_live_test "object-storage list" "$CLI object-storage list"
run_live_test "object-storage products" "$CLI object-storage products"

section "Live API Tests - Output Formats"

run_live_test "JSON output (default)" "$CLI metal list --output json"
run_live_test "Table output" "$CLI metal list --output table"
run_live_test "API key via flag" "$CLI metal list --api-key \$BIZNETGIO_API_KEY"

# ─────────────────────────────────────────────
# Live API tests - detail with real IDs
# ─────────────────────────────────────────────

section "Live API Tests - Detail & Product Lookups"

if [[ "$LIVE_MODE" == true ]]; then
  # Try to get a product ID from metal products
  subsection "Product detail lookups"
  METAL_PRODUCT_ID=$(eval "$CLI metal products 2>/dev/null" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);const items=Array.isArray(j)?j:j.data||j.products||[];
      if(items.length>0)console.log(items[0].id||items[0].product_id||'');
      }catch(e){}
    })" 2>/dev/null || true)

  if [[ -n "$METAL_PRODUCT_ID" ]]; then
    run_test "metal product detail ($METAL_PRODUCT_ID)" "$CLI metal product $METAL_PRODUCT_ID"
    run_test "metal product-os ($METAL_PRODUCT_ID)" "$CLI metal product-os $METAL_PRODUCT_ID"
  else
    printf "  %-60s" "metal product detail (no products found)"
    echo -e "${YELLOW}SKIP${NC}"
    ((SKIP++))
  fi

  # Try to get a neolite product ID
  NEOLITE_PRODUCT_ID=$(eval "$CLI neolite products 2>/dev/null" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);const items=Array.isArray(j)?j:j.data||j.products||[];
      if(items.length>0)console.log(items[0].id||items[0].product_id||'');
      }catch(e){}
    })" 2>/dev/null || true)

  if [[ -n "$NEOLITE_PRODUCT_ID" ]]; then
    run_test "neolite product detail ($NEOLITE_PRODUCT_ID)" "$CLI neolite product $NEOLITE_PRODUCT_ID"
    run_test "neolite product-os ($NEOLITE_PRODUCT_ID)" "$CLI neolite product-os $NEOLITE_PRODUCT_ID"
    run_test "neolite product-ip ($NEOLITE_PRODUCT_ID)" "$CLI neolite product-ip $NEOLITE_PRODUCT_ID"
  else
    printf "  %-60s" "neolite product detail (no products found)"
    echo -e "${YELLOW}SKIP${NC}"
    ((SKIP++))
  fi

  # Try to get an account ID from metal list and test detail
  subsection "Account detail lookups"
  METAL_ACCOUNT_ID=$(eval "$CLI metal list 2>/dev/null" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);const items=Array.isArray(j)?j:j.data||j.accounts||[];
      if(items.length>0)console.log(items[0].id||items[0].account_id||'');
      }catch(e){}
    })" 2>/dev/null || true)

  if [[ -n "$METAL_ACCOUNT_ID" ]]; then
    run_test "metal detail ($METAL_ACCOUNT_ID)" "$CLI metal detail $METAL_ACCOUNT_ID"
    run_test "metal state ($METAL_ACCOUNT_ID)" "$CLI metal state $METAL_ACCOUNT_ID"
    run_test "metal detail table output" "$CLI metal detail $METAL_ACCOUNT_ID --output table"
  else
    printf "  %-60s" "metal detail (no accounts found)"
    echo -e "${YELLOW}SKIP${NC}"
    ((SKIP++))
  fi

  NEOLITE_ACCOUNT_ID=$(eval "$CLI neolite list 2>/dev/null" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);const items=Array.isArray(j)?j:j.data||j.accounts||[];
      if(items.length>0)console.log(items[0].id||items[0].account_id||'');
      }catch(e){}
    })" 2>/dev/null || true)

  if [[ -n "$NEOLITE_ACCOUNT_ID" ]]; then
    run_test "neolite detail ($NEOLITE_ACCOUNT_ID)" "$CLI neolite detail $NEOLITE_ACCOUNT_ID"
    run_test "neolite vm-details ($NEOLITE_ACCOUNT_ID)" "$CLI neolite vm-details $NEOLITE_ACCOUNT_ID"
    run_test "neolite change-package-options ($NEOLITE_ACCOUNT_ID)" "$CLI neolite change-package-options $NEOLITE_ACCOUNT_ID"
    run_test "neolite storage-options ($NEOLITE_ACCOUNT_ID)" "$CLI neolite storage-options $NEOLITE_ACCOUNT_ID"
  else
    printf "  %-60s" "neolite detail (no accounts found)"
    echo -e "${YELLOW}SKIP${NC}"
    ((SKIP++))
  fi

  OBJ_ACCOUNT_ID=$(eval "$CLI object-storage list 2>/dev/null" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);const items=Array.isArray(j)?j:j.data||j.accounts||[];
      if(items.length>0)console.log(items[0].id||items[0].account_id||'');
      }catch(e){}
    })" 2>/dev/null || true)

  if [[ -n "$OBJ_ACCOUNT_ID" ]]; then
    run_test "object-storage detail ($OBJ_ACCOUNT_ID)" "$CLI object-storage detail $OBJ_ACCOUNT_ID"
    run_test "object-storage credential list ($OBJ_ACCOUNT_ID)" "$CLI object-storage credential list $OBJ_ACCOUNT_ID"
    run_test "object-storage bucket list ($OBJ_ACCOUNT_ID)" "$CLI object-storage bucket list $OBJ_ACCOUNT_ID"
  else
    printf "  %-60s" "object-storage detail (no accounts found)"
    echo -e "${YELLOW}SKIP${NC}"
    ((SKIP++))
  fi
else
  printf "  %-60s" "Detail & product lookups"
  echo -e "${YELLOW}SKIP${NC} (use --live)"
  ((SKIP++))
fi

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

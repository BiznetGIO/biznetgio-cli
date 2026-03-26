#!/usr/bin/env bash
#
# Test script untuk biznetgio-cli
# Menguji semua command --help dan operasi read-only (list, products, dll)
#
# Usage:
#   ./scripts/test-cli.sh              # Hanya test --help (tanpa API key)
#   ./scripts/test-cli.sh --live       # Test --help + live API calls
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$PROJECT_DIR/biznetgio-cli"
CLI="node $CLI_DIR/bin/biznetgio.js"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
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

subsection() {
  echo -e "  ${BOLD}── $1${NC}"
}

# ─────────────────────────────────────────────
# Pre-flight checks
# ─────────────────────────────────────────────

section "Pre-flight Checks"

run_test "Node.js is available" "node --version"
run_test "CLI entry point exists" "test -f $CLI_DIR/bin/biznetgio.js"
run_test "Dependencies installed" "test -d $CLI_DIR/node_modules"

# ─────────────────────────────────────────────
# Main help
# ─────────────────────────────────────────────

section "Main CLI Help"

run_test "biznetgio --help" "$CLI --help"
run_test "biznetgio --version" "$CLI --version"

# ─────────────────────────────────────────────
# NEO Metal
# ─────────────────────────────────────────────

section "NEO Metal Commands"

subsection "Help Tests"
run_test "metal --help" "$CLI metal --help"
run_test "metal list --help" "$CLI metal list --help"
run_test "metal detail --help" "$CLI metal detail --help"
run_test "metal create --help" "$CLI metal create --help"
run_test "metal delete --help" "$CLI metal delete --help"
run_test "metal update-label --help" "$CLI metal update-label --help"
run_test "metal state --help" "$CLI metal state --help"
run_test "metal set-state --help" "$CLI metal set-state --help"
run_test "metal rebuild --help" "$CLI metal rebuild --help"
run_test "metal openvpn --help" "$CLI metal openvpn --help"
run_test "metal products --help" "$CLI metal products --help"
run_test "metal product --help" "$CLI metal product --help"
run_test "metal product-os --help" "$CLI metal product-os --help"
run_test "metal rebuild-os --help" "$CLI metal rebuild-os --help"
run_test "metal states --help" "$CLI metal states --help"
run_test "metal keypair --help" "$CLI metal keypair --help"
run_test "metal keypair list --help" "$CLI metal keypair list --help"
run_test "metal keypair create --help" "$CLI metal keypair create --help"
run_test "metal keypair import --help" "$CLI metal keypair import --help"
run_test "metal keypair delete --help" "$CLI metal keypair delete --help"

subsection "Live API Tests"
run_live_test "metal list" "$CLI metal list"
run_live_test "metal products" "$CLI metal products"
run_live_test "metal states" "$CLI metal states"
run_live_test "metal keypair list" "$CLI metal keypair list"
run_live_test "metal openvpn" "$CLI metal openvpn"

# ─────────────────────────────────────────────
# NEO Elastic Storage
# ─────────────────────────────────────────────

section "NEO Elastic Storage Commands"

subsection "Help Tests"
run_test "elastic-storage --help" "$CLI elastic-storage --help"
run_test "elastic-storage list --help" "$CLI elastic-storage list --help"
run_test "elastic-storage detail --help" "$CLI elastic-storage detail --help"
run_test "elastic-storage create --help" "$CLI elastic-storage create --help"
run_test "elastic-storage upgrade --help" "$CLI elastic-storage upgrade --help"
run_test "elastic-storage change-package --help" "$CLI elastic-storage change-package --help"
run_test "elastic-storage delete --help" "$CLI elastic-storage delete --help"
run_test "elastic-storage products --help" "$CLI elastic-storage products --help"
run_test "elastic-storage product --help" "$CLI elastic-storage product --help"

subsection "Live API Tests"
run_live_test "elastic-storage list" "$CLI elastic-storage list"
run_live_test "elastic-storage products" "$CLI elastic-storage products"

# ─────────────────────────────────────────────
# Additional IP
# ─────────────────────────────────────────────

section "Additional IP Commands"

subsection "Help Tests"
run_test "additional-ip --help" "$CLI additional-ip --help"
run_test "additional-ip list --help" "$CLI additional-ip list --help"
run_test "additional-ip detail --help" "$CLI additional-ip detail --help"
run_test "additional-ip create --help" "$CLI additional-ip create --help"
run_test "additional-ip delete --help" "$CLI additional-ip delete --help"
run_test "additional-ip regions --help" "$CLI additional-ip regions --help"
run_test "additional-ip products --help" "$CLI additional-ip products --help"
run_test "additional-ip product --help" "$CLI additional-ip product --help"
run_test "additional-ip assignments --help" "$CLI additional-ip assignments --help"
run_test "additional-ip assigns --help" "$CLI additional-ip assigns --help"
run_test "additional-ip assign --help" "$CLI additional-ip assign --help"
run_test "additional-ip assign-detail --help" "$CLI additional-ip assign-detail --help"
run_test "additional-ip unassign --help" "$CLI additional-ip unassign --help"

subsection "Live API Tests"
run_live_test "additional-ip list" "$CLI additional-ip list"
run_live_test "additional-ip regions" "$CLI additional-ip regions"
run_live_test "additional-ip products" "$CLI additional-ip products"

# ─────────────────────────────────────────────
# NEO Lite
# ─────────────────────────────────────────────

section "NEO Lite Commands"

subsection "Help Tests"
run_test "neolite --help" "$CLI neolite --help"
run_test "neolite list --help" "$CLI neolite list --help"
run_test "neolite detail --help" "$CLI neolite detail --help"
run_test "neolite create --help" "$CLI neolite create --help"
run_test "neolite delete --help" "$CLI neolite delete --help"
run_test "neolite vm-details --help" "$CLI neolite vm-details --help"
run_test "neolite set-state --help" "$CLI neolite set-state --help"
run_test "neolite rename --help" "$CLI neolite rename --help"
run_test "neolite rebuild --help" "$CLI neolite rebuild --help"
run_test "neolite change-keypair --help" "$CLI neolite change-keypair --help"
run_test "neolite change-package-options --help" "$CLI neolite change-package-options --help"
run_test "neolite change-package --help" "$CLI neolite change-package --help"
run_test "neolite storage-options --help" "$CLI neolite storage-options --help"
run_test "neolite upgrade-storage --help" "$CLI neolite upgrade-storage --help"
run_test "neolite migrate-to-pro-products --help" "$CLI neolite migrate-to-pro-products --help"
run_test "neolite migrate-to-pro --help" "$CLI neolite migrate-to-pro --help"
run_test "neolite products --help" "$CLI neolite products --help"
run_test "neolite product --help" "$CLI neolite product --help"
run_test "neolite product-os --help" "$CLI neolite product-os --help"
run_test "neolite product-ip --help" "$CLI neolite product-ip --help"

subsection "Keypair Help"
run_test "neolite keypair --help" "$CLI neolite keypair --help"
run_test "neolite keypair list --help" "$CLI neolite keypair list --help"
run_test "neolite keypair create --help" "$CLI neolite keypair create --help"
run_test "neolite keypair import --help" "$CLI neolite keypair import --help"
run_test "neolite keypair delete --help" "$CLI neolite keypair delete --help"

subsection "Snapshot Help"
run_test "neolite snapshot --help" "$CLI neolite snapshot --help"
run_test "neolite snapshot list --help" "$CLI neolite snapshot list --help"
run_test "neolite snapshot detail --help" "$CLI neolite snapshot detail --help"
run_test "neolite snapshot create --help" "$CLI neolite snapshot create --help"
run_test "neolite snapshot create-instance --help" "$CLI neolite snapshot create-instance --help"
run_test "neolite snapshot restore --help" "$CLI neolite snapshot restore --help"
run_test "neolite snapshot delete --help" "$CLI neolite snapshot delete --help"
run_test "neolite snapshot products --help" "$CLI neolite snapshot products --help"
run_test "neolite snapshot product --help" "$CLI neolite snapshot product --help"

subsection "Disk Help"
run_test "neolite disk --help" "$CLI neolite disk --help"
run_test "neolite disk list --help" "$CLI neolite disk list --help"
run_test "neolite disk detail --help" "$CLI neolite disk detail --help"
run_test "neolite disk create --help" "$CLI neolite disk create --help"
run_test "neolite disk upgrade --help" "$CLI neolite disk upgrade --help"
run_test "neolite disk delete --help" "$CLI neolite disk delete --help"
run_test "neolite disk products --help" "$CLI neolite disk products --help"
run_test "neolite disk product --help" "$CLI neolite disk product --help"

subsection "Live API Tests"
run_live_test "neolite list" "$CLI neolite list"
run_live_test "neolite products" "$CLI neolite products"
run_live_test "neolite keypair list" "$CLI neolite keypair list"
run_live_test "neolite snapshot list" "$CLI neolite snapshot list"
run_live_test "neolite snapshot products" "$CLI neolite snapshot products"
run_live_test "neolite disk list" "$CLI neolite disk list"
run_live_test "neolite disk products" "$CLI neolite disk products"

# ─────────────────────────────────────────────
# NEO Lite Pro
# ─────────────────────────────────────────────

section "NEO Lite Pro Commands"

subsection "Help Tests"
run_test "neolite-pro --help" "$CLI neolite-pro --help"
run_test "neolite-pro list --help" "$CLI neolite-pro list --help"
run_test "neolite-pro detail --help" "$CLI neolite-pro detail --help"
run_test "neolite-pro create --help" "$CLI neolite-pro create --help"
run_test "neolite-pro delete --help" "$CLI neolite-pro delete --help"
run_test "neolite-pro vm-details --help" "$CLI neolite-pro vm-details --help"
run_test "neolite-pro set-state --help" "$CLI neolite-pro set-state --help"
run_test "neolite-pro rename --help" "$CLI neolite-pro rename --help"
run_test "neolite-pro rebuild --help" "$CLI neolite-pro rebuild --help"
run_test "neolite-pro change-keypair --help" "$CLI neolite-pro change-keypair --help"
run_test "neolite-pro change-package-options --help" "$CLI neolite-pro change-package-options --help"
run_test "neolite-pro change-package --help" "$CLI neolite-pro change-package --help"
run_test "neolite-pro storage-options --help" "$CLI neolite-pro storage-options --help"
run_test "neolite-pro upgrade-storage --help" "$CLI neolite-pro upgrade-storage --help"
run_test "neolite-pro products --help" "$CLI neolite-pro products --help"
run_test "neolite-pro product --help" "$CLI neolite-pro product --help"
run_test "neolite-pro product-os --help" "$CLI neolite-pro product-os --help"
run_test "neolite-pro product-ip --help" "$CLI neolite-pro product-ip --help"

subsection "Keypair / Snapshot / Disk Help"
run_test "neolite-pro keypair --help" "$CLI neolite-pro keypair --help"
run_test "neolite-pro snapshot --help" "$CLI neolite-pro snapshot --help"
run_test "neolite-pro disk --help" "$CLI neolite-pro disk --help"

subsection "Live API Tests"
run_live_test "neolite-pro list" "$CLI neolite-pro list"
run_live_test "neolite-pro products" "$CLI neolite-pro products"
run_live_test "neolite-pro keypair list" "$CLI neolite-pro keypair list"

# ─────────────────────────────────────────────
# Object Storage
# ─────────────────────────────────────────────

section "Object Storage Commands"

subsection "Help Tests"
run_test "object-storage --help" "$CLI object-storage --help"
run_test "object-storage list --help" "$CLI object-storage list --help"
run_test "object-storage detail --help" "$CLI object-storage detail --help"
run_test "object-storage create --help" "$CLI object-storage create --help"
run_test "object-storage upgrade-quota --help" "$CLI object-storage upgrade-quota --help"
run_test "object-storage products --help" "$CLI object-storage products --help"
run_test "object-storage product --help" "$CLI object-storage product --help"

subsection "Credential Help"
run_test "object-storage credential --help" "$CLI object-storage credential --help"
run_test "object-storage credential list --help" "$CLI object-storage credential list --help"
run_test "object-storage credential create --help" "$CLI object-storage credential create --help"
run_test "object-storage credential update --help" "$CLI object-storage credential update --help"
run_test "object-storage credential delete --help" "$CLI object-storage credential delete --help"

subsection "Bucket Help"
run_test "object-storage bucket --help" "$CLI object-storage bucket --help"
run_test "object-storage bucket list --help" "$CLI object-storage bucket list --help"
run_test "object-storage bucket create --help" "$CLI object-storage bucket create --help"
run_test "object-storage bucket info --help" "$CLI object-storage bucket info --help"
run_test "object-storage bucket usage --help" "$CLI object-storage bucket usage --help"
run_test "object-storage bucket set-acl --help" "$CLI object-storage bucket set-acl --help"
run_test "object-storage bucket delete --help" "$CLI object-storage bucket delete --help"

subsection "Object Help"
run_test "object-storage object --help" "$CLI object-storage object --help"
run_test "object-storage object list --help" "$CLI object-storage object list --help"
run_test "object-storage object info --help" "$CLI object-storage object info --help"
run_test "object-storage object download --help" "$CLI object-storage object download --help"
run_test "object-storage object url --help" "$CLI object-storage object url --help"
run_test "object-storage object copy --help" "$CLI object-storage object copy --help"
run_test "object-storage object move --help" "$CLI object-storage object move --help"
run_test "object-storage object mkdir --help" "$CLI object-storage object mkdir --help"
run_test "object-storage object set-acl --help" "$CLI object-storage object set-acl --help"
run_test "object-storage object delete --help" "$CLI object-storage object delete --help"

subsection "Live API Tests"
run_live_test "object-storage list" "$CLI object-storage list"
run_live_test "object-storage products" "$CLI object-storage products"

# ─────────────────────────────────────────────
# Output format tests
# ─────────────────────────────────────────────

section "Output Format Tests"

run_live_test "JSON output (default)" "$CLI metal list --output json"
run_live_test "Table output" "$CLI metal list --output table"

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

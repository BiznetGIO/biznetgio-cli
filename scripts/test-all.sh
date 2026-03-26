#!/usr/bin/env bash
#
# Run all tests for @biznetgio/cli and @biznetgio/mcp
# Loads .env automatically for staging tests
#
# Usage:
#   ./scripts/test-all.sh
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

EXIT_CODE=0

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║    Biznet Gio - Full Test Suite                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────
# Test CLI
# ─────────────────────────────────────────────

echo -e "${CYAN}${BOLD}▶ Running CLI Tests...${NC}"
echo ""
if bash "$SCRIPT_DIR/test-cli.sh"; then
  echo ""
  echo -e "${GREEN}${BOLD}✓ CLI tests passed${NC}"
else
  echo ""
  echo -e "${RED}${BOLD}✗ CLI tests had failures${NC}"
  EXIT_CODE=1
fi

echo ""
echo -e "${CYAN}${BOLD}──────────────────────────────────────────────────────────${NC}"
echo ""

# ─────────────────────────────────────────────
# Test MCP Server
# ─────────────────────────────────────────────

echo -e "${CYAN}${BOLD}▶ Running MCP Server Tests...${NC}"
echo ""
if bash "$SCRIPT_DIR/test-mcp.sh"; then
  echo ""
  echo -e "${GREEN}${BOLD}✓ MCP server tests passed${NC}"
else
  echo ""
  echo -e "${RED}${BOLD}✗ MCP server tests had failures${NC}"
  EXIT_CODE=1
fi

# ─────────────────────────────────────────────
# Final
# ─────────────────────────────────────────────

echo ""
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "║  ${GREEN}✓  ALL TEST SUITES PASSED                              ${CYAN}║"
else
  echo -e "║  ${RED}✗  SOME TEST SUITES FAILED                             ${CYAN}║"
fi
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

exit $EXIT_CODE

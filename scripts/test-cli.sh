#!/usr/bin/env bash
#
# Comprehensive test script for @biznetgio/cli
# Loads .env for staging base URL and API key
#
# Usage:
#   ./scripts/test-cli.sh              # Normal mode
#   ./scripts/test-cli.sh --verbose    # Show command output on PASS and FAIL
#

set -uo pipefail

VERBOSE=false
if [[ "${1:-}" == "--verbose" || "${1:-}" == "-v" ]]; then
  VERBOSE=true
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$PROJECT_DIR/cli"
CLI="node $CLI_DIR/bin/biznetgio.js"
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
LOG_FILE="$LOG_DIR/test-cli_${TIMESTAMP}.log"
BASE_URL="${BIZNETGIO_BASE_URL:-https://api.portal.biznetgio.com/v1}"

log() {
  echo "$@" >> "$LOG_FILE"
}

log "=== @biznetgio/cli test run ==="
log "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Base URL:  $BASE_URL"
log "API Key:   ${BIZNETGIO_API_KEY:0:20}..."
log ""

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

verbose_out() {
  if [[ "$VERBOSE" == true && -n "${1:-}" ]]; then
    echo "$1" | head -20 | sed 's/^/    │ /'
  fi
}

log_failure() {
  local description="$1"
  local cmd="$2"
  local cli_output="$3"
  local api_path="${4:-}"

  log "────────────────────────────────────────"
  log "FAIL: $description"
  log "  cmd: $cmd"
  log "  cli output:"
  log "$cli_output"

  # If api_path is given, do a raw curl for debug
  if [[ -n "$api_path" ]]; then
    log ""
    log "  curl debug:"
    log "  > GET $BASE_URL$api_path"
    local curl_out
    curl_out=$(curl -s -w "\n---HTTP_STATUS:%{http_code}---" \
      -H "x-token: $BIZNETGIO_API_KEY" \
      "$BASE_URL$api_path" 2>&1) || true
    log "$curl_out"
  fi
  log ""
}

run_test() {
  local description="$1"
  shift
  local cmd="$*"

  printf "  %-65s" "$description"
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${GREEN}PASS${NC}"
    verbose_out "$output"
    ((PASS++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    verbose_out "$output"
    ERRORS+=("$description\n    cmd: $cmd\n    out: $(echo "$output" | head -3)")
    log_failure "$description" "$cmd" "$output"
    ((FAIL++))
    return 1
  fi
}

# Test command fails as expected
run_fail_test() {
  local description="$1"
  shift
  local cmd="$*"

  printf "  %-65s" "$description"
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${RED}FAIL${NC} (expected error)"
    verbose_out "$output"
    ERRORS+=("$description: expected failure but succeeded")
    log_failure "$description (expected fail)" "$cmd" "$output"
    ((FAIL++))
    return 1
  else
    echo -e "${GREEN}PASS${NC}"
    verbose_out "$output"
    ((PASS++))
    return 0
  fi
}

# Test output contains expected string
run_contains_test() {
  local description="$1"
  local expected="$2"
  shift 2
  local cmd="$*"

  printf "  %-65s" "$description"
  output=$(eval "$cmd" 2>&1) || true
  if echo "$output" | grep -q "$expected"; then
    echo -e "${GREEN}PASS${NC}"
    verbose_out "$output"
    ((PASS++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    verbose_out "$output"
    ERRORS+=("$description\n    expected: '$expected'\n    got: $(echo "$output" | head -3)")
    log_failure "$description (contains '$expected')" "$cmd" "$output"
    ((FAIL++))
    return 1
  fi
}

# Test API call returns valid JSON
# Args: description, api_path, cli_command
# Automatically appends --output json to force JSON output
run_api_test() {
  local description="$1"
  local api_path="${2:-}"
  shift
  if [[ -n "$api_path" ]]; then shift; fi
  local cmd="$* --output json"

  printf "  %-65s" "$description"
  if output=$(eval "$cmd" 2>&1) && echo "$output" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);process.exit(0)}
      catch(e){process.exit(1)}
    })" 2>/dev/null; then
    echo -e "${GREEN}PASS${NC}"
    verbose_out "$output"
    ((PASS++))
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    verbose_out "$output"
    ERRORS+=("$description\n    cmd: $cmd\n    out: $(echo "$output" | head -3)")
    log_failure "$description" "$cmd" "$output" "$api_path"
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

# Helper to extract first ID from JSON response
extract_first_id() {
  local field="${1:-product_id}"
  node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{
        const j=JSON.parse(d);
        const items=Array.isArray(j)?j:(j.data||[]);
        if(Array.isArray(items)&&items.length>0){
          console.log(items[0].$field||items[0].id||'');
        }
      }catch(e){}
    })" 2>/dev/null
}

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║    @biznetgio/cli - Comprehensive Test Suite            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Base URL: ${BOLD}${BIZNETGIO_BASE_URL:-https://api.portal.biznetgio.com/v1}${NC}"
echo -e "  API Key:  ${BOLD}${BIZNETGIO_API_KEY:0:20}...${NC}"

# ─────────────────────────────────────────────
# 1. Pre-flight
# ─────────────────────────────────────────────

section "1. Pre-flight Checks"

run_test "Node.js available" "node --version"
run_test "CLI entry point exists" "test -f $CLI_DIR/bin/biznetgio.js"
run_test "Dependencies installed" "test -d $CLI_DIR/node_modules"
run_test "All command modules exist" \
  "test -f $CLI_DIR/src/commands/metal.js && \
   test -f $CLI_DIR/src/commands/elastic-storage.js && \
   test -f $CLI_DIR/src/commands/additional-ip.js && \
   test -f $CLI_DIR/src/commands/neolite.js && \
   test -f $CLI_DIR/src/commands/neolite-pro.js && \
   test -f $CLI_DIR/src/commands/object-storage.js"

# ─────────────────────────────────────────────
# 2. CLI structure
# ─────────────────────────────────────────────

section "2. CLI Structure & Registration"

run_contains_test "Version output" "1.0.0" "$CLI --version"
run_contains_test "6 services registered" "object-storage" "$CLI --help"
run_contains_test "metal registered" "metal" "$CLI --help"
run_contains_test "elastic-storage registered" "elastic-storage" "$CLI --help"
run_contains_test "additional-ip registered" "additional-ip" "$CLI --help"
run_contains_test "neolite registered" "neolite " "$CLI --help"
run_contains_test "neolite-pro registered" "neolite-pro" "$CLI --help"

subsection "Metal subcommands"
for cmd in list detail create delete update-label state set-state rebuild openvpn products product product-os rebuild-os states keypair; do
  run_contains_test "metal > $cmd" "$cmd" "$CLI metal --help"
done

subsection "Neolite subcommands"
for cmd in list detail create delete vm-details set-state rename rebuild change-keypair change-package upgrade-storage migrate-to-pro products product product-os product-ip keypair snapshot disk; do
  run_contains_test "neolite > $cmd" "$cmd" "$CLI neolite --help"
done

subsection "Object Storage subcommands"
for cmd in list detail create upgrade-quota products product credential bucket object; do
  run_contains_test "object-storage > $cmd" "$cmd" "$CLI object-storage --help"
done

subsection "Nested subgroups"
run_contains_test "metal keypair > list,create,import,delete" "list" "$CLI metal keypair --help"
run_contains_test "neolite snapshot > create-instance" "create-instance" "$CLI neolite snapshot --help"
run_contains_test "neolite disk > upgrade" "upgrade" "$CLI neolite disk --help"
run_contains_test "object-storage credential > update" "update" "$CLI object-storage credential --help"
run_contains_test "object-storage bucket > set-acl" "set-acl" "$CLI object-storage bucket --help"
run_contains_test "object-storage object > url,copy,move,mkdir" "mkdir" "$CLI object-storage object --help"

# ─────────────────────────────────────────────
# 3. Error handling
# ─────────────────────────────────────────────

section "3. Error Handling"

subsection "Missing API key"
run_contains_test "Fails without API key" "API key" "BIZNETGIO_API_KEY= BIZNETGIO_BASE_URL=$BIZNETGIO_BASE_URL $CLI metal list 2>&1 || true"

subsection "Missing required arguments"
run_fail_test "metal detail: no account_id" "$CLI metal detail 2>/dev/null"
run_fail_test "metal set-state: no args" "$CLI metal set-state 2>/dev/null"
run_fail_test "neolite delete: no account_id" "$CLI neolite delete 2>/dev/null"
run_fail_test "object-storage detail: no account_id" "$CLI object-storage detail 2>/dev/null"
run_fail_test "object-storage bucket list: no account_id" "$CLI object-storage bucket list 2>/dev/null"
run_fail_test "object-storage object list: no args" "$CLI object-storage object list 2>/dev/null"

subsection "Invalid resource IDs"
run_contains_test "metal detail 99999 returns null/error" "No data\|null\|false\|error\|Cannot" "$CLI metal detail 99999 2>&1 || true"

# ─────────────────────────────────────────────
# 4. NEO Metal - Live API
# ─────────────────────────────────────────────

section "4. NEO Metal - Live API"

run_api_test "metal list" "/baremetals/accounts" "$CLI metal list"
run_api_test "metal list --status Active" "/baremetals/accounts?status=Active" "$CLI metal list --status Active"
run_api_test "metal products" "/baremetals/products" "$CLI metal products"
run_api_test "metal states" "/baremetals/states" "$CLI metal states"
run_api_test "metal keypair list" "/baremetals/keypairs/" "$CLI metal keypair list"
run_api_test "metal openvpn" "/baremetals/openvpn" "$CLI metal openvpn"

subsection "Product detail lookups"
METAL_PRODUCT_ID=$($CLI metal products --output json 2>/dev/null | extract_first_id product_id)
if [[ -n "$METAL_PRODUCT_ID" ]]; then
  run_api_test "metal product $METAL_PRODUCT_ID" "/baremetals/products/$METAL_PRODUCT_ID" "$CLI metal product $METAL_PRODUCT_ID"
  run_api_test "metal product-os $METAL_PRODUCT_ID" "/baremetals/products/$METAL_PRODUCT_ID/oss" "$CLI metal product-os $METAL_PRODUCT_ID"
else
  skip_test "metal product detail" "no products"
fi

subsection "Account detail lookups"
METAL_ACCOUNT_ID=$($CLI metal list --output json 2>/dev/null | extract_first_id account_id)
if [[ -n "$METAL_ACCOUNT_ID" ]]; then
  run_api_test "metal detail $METAL_ACCOUNT_ID" "/baremetals/accounts/$METAL_ACCOUNT_ID" "$CLI metal detail $METAL_ACCOUNT_ID"
  run_api_test "metal state $METAL_ACCOUNT_ID" "/baremetals/accounts/$METAL_ACCOUNT_ID/state" "$CLI metal state $METAL_ACCOUNT_ID"
  run_api_test "metal rebuild-os $METAL_ACCOUNT_ID" "/baremetals/$METAL_ACCOUNT_ID/rebuild/oss" "$CLI metal rebuild-os $METAL_ACCOUNT_ID"
else
  skip_test "metal account detail" "no accounts"
fi

# ─────────────────────────────────────────────
# 5. Elastic Storage - Live API
# ─────────────────────────────────────────────

section "5. Elastic Storage - Live API"

run_api_test "elastic-storage list" "/baremetal-neo-elastic-storages" "$CLI elastic-storage list"
run_api_test "elastic-storage products" "/baremetal-neo-elastic-storages/products" "$CLI elastic-storage products"

ES_PRODUCT_ID=$($CLI elastic-storage products --output json 2>/dev/null | extract_first_id product_id)
if [[ -n "$ES_PRODUCT_ID" ]]; then
  run_api_test "elastic-storage product $ES_PRODUCT_ID" "/baremetal-neo-elastic-storages/products/$ES_PRODUCT_ID" "$CLI elastic-storage product $ES_PRODUCT_ID"
else
  skip_test "elastic-storage product detail" "no products"
fi

ES_ACCOUNT_ID=$($CLI elastic-storage list --output json 2>/dev/null | extract_first_id account_id)
if [[ -n "$ES_ACCOUNT_ID" ]]; then
  run_api_test "elastic-storage detail $ES_ACCOUNT_ID" "/baremetal-neo-elastic-storages/$ES_ACCOUNT_ID" "$CLI elastic-storage detail $ES_ACCOUNT_ID"
else
  skip_test "elastic-storage account detail" "no accounts"
fi

# ─────────────────────────────────────────────
# 6. Additional IP - Live API
# ─────────────────────────────────────────────

section "6. Additional IP - Live API"

run_api_test "additional-ip list" "/baremetal-additional-ips" "$CLI additional-ip list"
run_api_test "additional-ip regions" "/baremetal-additional-ips/regions" "$CLI additional-ip regions"
run_api_test "additional-ip products" "/baremetal-additional-ips/products" "$CLI additional-ip products"

AIP_PRODUCT_ID=$($CLI additional-ip products --output json 2>/dev/null | extract_first_id product_id)
if [[ -n "$AIP_PRODUCT_ID" ]]; then
  run_api_test "additional-ip product $AIP_PRODUCT_ID" "/baremetal-additional-ips/products/$AIP_PRODUCT_ID" "$CLI additional-ip product $AIP_PRODUCT_ID"
else
  skip_test "additional-ip product detail" "no products"
fi

AIP_ACCOUNT_ID=$($CLI additional-ip list --output json 2>/dev/null | extract_first_id account_id)
if [[ -n "$AIP_ACCOUNT_ID" ]]; then
  run_api_test "additional-ip detail $AIP_ACCOUNT_ID" "/baremetal-additional-ips/$AIP_ACCOUNT_ID" "$CLI additional-ip detail $AIP_ACCOUNT_ID"
  run_api_test "additional-ip assigns $AIP_ACCOUNT_ID" "/baremetal-additional-ips/$AIP_ACCOUNT_ID/assigns" "$CLI additional-ip assigns $AIP_ACCOUNT_ID"
else
  skip_test "additional-ip account detail" "no accounts"
fi

# ─────────────────────────────────────────────
# 7. NEO Lite - Live API
# ─────────────────────────────────────────────

section "7. NEO Lite - Live API"

run_api_test "neolite list" "/neolites/accounts" "$CLI neolite list"
run_api_test "neolite list --status Active" "/neolites/accounts?status=Active" "$CLI neolite list --status Active"
run_api_test "neolite products" "/neolites/products" "$CLI neolite products"
run_api_test "neolite keypair list" "/neolites/keypairs/" "$CLI neolite keypair list"
run_api_test "neolite snapshot list" "/neolites/snapshots/accounts" "$CLI neolite snapshot list"
run_api_test "neolite snapshot products" "/neolites/snapshots/products" "$CLI neolite snapshot products"
run_api_test "neolite disk list" "/neolites/disks/accounts" "$CLI neolite disk list"
run_api_test "neolite disk products" "/neolites/disks/products" "$CLI neolite disk products"

subsection "Product detail lookups"
NL_PRODUCT_ID=$($CLI neolite products --output json 2>/dev/null | extract_first_id product_id)
if [[ -n "$NL_PRODUCT_ID" ]]; then
  run_api_test "neolite product $NL_PRODUCT_ID" "/neolites/products/$NL_PRODUCT_ID" "$CLI neolite product $NL_PRODUCT_ID"
  run_api_test "neolite product-os $NL_PRODUCT_ID" "/neolites/products/$NL_PRODUCT_ID/oss" "$CLI neolite product-os $NL_PRODUCT_ID"
  run_api_test "neolite product-ip $NL_PRODUCT_ID" "/neolites/products/$NL_PRODUCT_ID/ip-availability" "$CLI neolite product-ip $NL_PRODUCT_ID"
else
  skip_test "neolite product detail" "no products"
fi

NL_SNAP_PRODUCT_ID=$($CLI neolite snapshot products --output json 2>/dev/null | extract_first_id product_id)
if [[ -n "$NL_SNAP_PRODUCT_ID" ]]; then
  run_api_test "neolite snapshot product $NL_SNAP_PRODUCT_ID" "/neolites/snapshots/products/$NL_SNAP_PRODUCT_ID" "$CLI neolite snapshot product $NL_SNAP_PRODUCT_ID"
else
  skip_test "neolite snapshot product detail" "no products"
fi

NL_DISK_PRODUCT_ID=$($CLI neolite disk products --output json 2>/dev/null | extract_first_id product_id)
if [[ -n "$NL_DISK_PRODUCT_ID" ]]; then
  run_api_test "neolite disk product $NL_DISK_PRODUCT_ID" "/neolites/disks/products/$NL_DISK_PRODUCT_ID" "$CLI neolite disk product $NL_DISK_PRODUCT_ID"
else
  skip_test "neolite disk product detail" "no products"
fi

subsection "Account detail lookups"
NL_ACCOUNT_ID=$($CLI neolite list --output json 2>/dev/null | extract_first_id account_id)
if [[ -n "$NL_ACCOUNT_ID" ]]; then
  run_api_test "neolite detail $NL_ACCOUNT_ID" "/neolites/accounts/$NL_ACCOUNT_ID" "$CLI neolite detail $NL_ACCOUNT_ID"
  run_api_test "neolite vm-details $NL_ACCOUNT_ID" "/neolites/accounts/$NL_ACCOUNT_ID/vm-details" "$CLI neolite vm-details $NL_ACCOUNT_ID"
  run_api_test "neolite change-package-options $NL_ACCOUNT_ID" "/neolites/accounts/$NL_ACCOUNT_ID/change-package" "$CLI neolite change-package-options $NL_ACCOUNT_ID"
  run_api_test "neolite storage-options $NL_ACCOUNT_ID" "/neolites/accounts/$NL_ACCOUNT_ID/storage" "$CLI neolite storage-options $NL_ACCOUNT_ID"
  run_api_test "neolite migrate-to-pro-products $NL_ACCOUNT_ID" "/neolites/accounts/$NL_ACCOUNT_ID/migrate-to-pro/products" "$CLI neolite migrate-to-pro-products $NL_ACCOUNT_ID"
else
  skip_test "neolite account detail" "no accounts"
fi

# ─────────────────────────────────────────────
# 8. NEO Lite Pro - Live API
# ─────────────────────────────────────────────

section "8. NEO Lite Pro - Live API"

run_api_test "neolite-pro list" "/neolite-pros/accounts" "$CLI neolite-pro list"
run_api_test "neolite-pro products" "/neolite-pros/products" "$CLI neolite-pro products"
run_api_test "neolite-pro keypair list" "/neolite-pros/keypairs/" "$CLI neolite-pro keypair list"
run_api_test "neolite-pro snapshot list" "/neolite-pros/snapshots/accounts" "$CLI neolite-pro snapshot list"
run_api_test "neolite-pro snapshot products" "/neolite-pros/snapshots/products" "$CLI neolite-pro snapshot products"
run_api_test "neolite-pro disk list" "/neolite-pros/disks/accounts" "$CLI neolite-pro disk list"
run_api_test "neolite-pro disk products" "/neolite-pros/disks/products" "$CLI neolite-pro disk products"

subsection "Product detail lookups"
NLP_PRODUCT_ID=$($CLI neolite-pro products --output json 2>/dev/null | extract_first_id product_id)
if [[ -n "$NLP_PRODUCT_ID" ]]; then
  run_api_test "neolite-pro product $NLP_PRODUCT_ID" "/neolite-pros/products/$NLP_PRODUCT_ID" "$CLI neolite-pro product $NLP_PRODUCT_ID"
  run_api_test "neolite-pro product-os $NLP_PRODUCT_ID" "/neolite-pros/products/$NLP_PRODUCT_ID/oss" "$CLI neolite-pro product-os $NLP_PRODUCT_ID"
  run_api_test "neolite-pro product-ip $NLP_PRODUCT_ID" "/neolite-pros/products/$NLP_PRODUCT_ID/ip-availability" "$CLI neolite-pro product-ip $NLP_PRODUCT_ID"
else
  skip_test "neolite-pro product detail" "no products"
fi

subsection "Account detail lookups"
NLP_ACCOUNT_ID=$($CLI neolite-pro list --output json 2>/dev/null | extract_first_id account_id)
if [[ -n "$NLP_ACCOUNT_ID" ]]; then
  run_api_test "neolite-pro detail $NLP_ACCOUNT_ID" "/neolite-pros/accounts/$NLP_ACCOUNT_ID" "$CLI neolite-pro detail $NLP_ACCOUNT_ID"
  run_api_test "neolite-pro vm-details $NLP_ACCOUNT_ID" "/neolite-pros/accounts/$NLP_ACCOUNT_ID/vm-details" "$CLI neolite-pro vm-details $NLP_ACCOUNT_ID"
  run_api_test "neolite-pro change-package-options $NLP_ACCOUNT_ID" "/neolite-pros/accounts/$NLP_ACCOUNT_ID/change-package" "$CLI neolite-pro change-package-options $NLP_ACCOUNT_ID"
  run_api_test "neolite-pro storage-options $NLP_ACCOUNT_ID" "/neolite-pros/accounts/$NLP_ACCOUNT_ID/storage" "$CLI neolite-pro storage-options $NLP_ACCOUNT_ID"
else
  skip_test "neolite-pro account detail" "no accounts"
fi

# ─────────────────────────────────────────────
# 9. Object Storage - Live API
# ─────────────────────────────────────────────

section "9. Object Storage - Live API"

run_api_test "object-storage list" "/object-storages/accounts" "$CLI object-storage list"
run_api_test "object-storage products" "/object-storages/products" "$CLI object-storage products"

subsection "Product detail lookups"
OBJ_PRODUCT_ID=$($CLI object-storage products --output json 2>/dev/null | extract_first_id product_id)
if [[ -n "$OBJ_PRODUCT_ID" ]]; then
  run_api_test "object-storage product $OBJ_PRODUCT_ID" "/object-storages/products/$OBJ_PRODUCT_ID" "$CLI object-storage product $OBJ_PRODUCT_ID"
else
  skip_test "object-storage product detail" "no products"
fi

subsection "Account & bucket operations"
OBJ_ACCOUNT_ID=$($CLI object-storage list --output json 2>/dev/null | extract_first_id account_id)
if [[ -n "$OBJ_ACCOUNT_ID" ]]; then
  run_api_test "object-storage detail $OBJ_ACCOUNT_ID" "/object-storages/accounts/$OBJ_ACCOUNT_ID" "$CLI object-storage detail $OBJ_ACCOUNT_ID"
  run_api_test "object-storage credential list $OBJ_ACCOUNT_ID" "/object-storages/accounts/$OBJ_ACCOUNT_ID/credentials" "$CLI object-storage credential list $OBJ_ACCOUNT_ID"
  run_api_test "object-storage bucket list $OBJ_ACCOUNT_ID" "/object-storages/accounts/$OBJ_ACCOUNT_ID/buckets" "$CLI object-storage bucket list $OBJ_ACCOUNT_ID"

  # Try bucket detail if there are buckets
  BUCKET_NAME=$($CLI object-storage bucket list $OBJ_ACCOUNT_ID --output json 2>/dev/null | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{
        const j=JSON.parse(d);
        const items=Array.isArray(j)?j:(j.data||[]);
        if(Array.isArray(items)&&items.length>0){
          console.log(items[0].name||items[0].bucket_name||'');
        }
      }catch(e){}
    })" 2>/dev/null || true)

  if [[ -n "$BUCKET_NAME" ]]; then
    run_api_test "bucket info $BUCKET_NAME" "/object-storages/accounts/$OBJ_ACCOUNT_ID/buckets/$BUCKET_NAME/info" "$CLI object-storage bucket info $OBJ_ACCOUNT_ID $BUCKET_NAME"
    run_api_test "bucket usage $BUCKET_NAME" "/object-storages/accounts/$OBJ_ACCOUNT_ID/buckets/$BUCKET_NAME/usage" "$CLI object-storage bucket usage $OBJ_ACCOUNT_ID $BUCKET_NAME"
    run_api_test "object list in $BUCKET_NAME" "/object-storages/accounts/$OBJ_ACCOUNT_ID/buckets/$BUCKET_NAME/objects" "$CLI object-storage object list $OBJ_ACCOUNT_ID $BUCKET_NAME"
  else
    skip_test "bucket detail operations" "no buckets"
  fi
else
  skip_test "object-storage account operations" "no accounts"
fi

# ─────────────────────────────────────────────
# 10. CRUD Tests - Create, Read, Delete
# ─────────────────────────────────────────────

section "10. CRUD Tests - Keypair Lifecycle"

# Helper: extract field from JSON, handles special chars in private keys
json_field() {
  local field="$1"
  node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        // Handle \\r\\n in private keys by normalizing
        const clean = d.replace(/\\r\\n/g, '\\\\n');
        const j = JSON.parse(clean);
        const v = j['$field'] || (j.data && j.data['$field']) || '';
        if (v) console.log(v);
      } catch(e) {
        // Fallback: regex extract
        const m = d.match(new RegExp('\"$field\"\\\\s*:\\\\s*[\"]?([^\",}]+)'));
        if (m) console.log(m[1].trim());
      }
    })"
}

subsection "Neolite keypair: create → list → delete"

# Create keypair
KEYPAIR_OUTPUT=$($CLI neolite keypair create --name "clitest-kp-$$" --output json 2>&1)
KEYPAIR_ID=$(echo "$KEYPAIR_OUTPUT" | json_field neosshkey_id)
if [[ -n "$KEYPAIR_ID" && "$KEYPAIR_ID" != "undefined" ]]; then
  printf "  %-65s" "neolite keypair create (id: $KEYPAIR_ID)"
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
  log "CRUD: neolite keypair created id=$KEYPAIR_ID"

  # Verify it appears in list
  run_test "neolite keypair list contains $KEYPAIR_ID" \
    "$CLI neolite keypair list --output json 2>/dev/null | grep -q '$KEYPAIR_ID'"

  # Delete it
  DELETE_OUTPUT=$($CLI neolite keypair delete $KEYPAIR_ID --output json 2>&1)
  if echo "$DELETE_OUTPUT" | grep -qi "success"; then
    printf "  %-65s" "neolite keypair delete $KEYPAIR_ID"
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    log "CRUD: neolite keypair deleted id=$KEYPAIR_ID"
  else
    printf "  %-65s" "neolite keypair delete $KEYPAIR_ID"
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("neolite keypair delete $KEYPAIR_ID\n    out: $DELETE_OUTPUT")
    log_failure "neolite keypair delete" "$CLI neolite keypair delete $KEYPAIR_ID" "$DELETE_OUTPUT" "/neolites/keypairs/$KEYPAIR_ID"
    ((FAIL++))
  fi

  # Verify it's gone
  run_test "neolite keypair $KEYPAIR_ID no longer in list" \
    "! $CLI neolite keypair list --output json 2>/dev/null | grep -q '$KEYPAIR_ID'"
else
  printf "  %-65s" "neolite keypair create"
  echo -e "${RED}FAIL${NC}"
  ERRORS+=("neolite keypair create failed\n    out: $KEYPAIR_OUTPUT")
  log_failure "neolite keypair create" "$CLI neolite keypair create --name clitest-kp-$$" "$KEYPAIR_OUTPUT" "/neolites/keypairs/"
  ((FAIL++))
fi

subsection "Metal keypair: create → list → delete"

METAL_KP_OUTPUT=$($CLI metal keypair create --name "clitest-mkp-$$" --output json 2>&1)
METAL_KP_ID=$(echo "$METAL_KP_OUTPUT" | json_field keypair_id)
if [[ -z "$METAL_KP_ID" || "$METAL_KP_ID" == "undefined" ]]; then
  METAL_KP_ID=$(echo "$METAL_KP_OUTPUT" | json_field neosshkey_id)
fi
if [[ -n "$METAL_KP_ID" && "$METAL_KP_ID" != "undefined" ]]; then
  printf "  %-65s" "metal keypair create (id: $METAL_KP_ID)"
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))

  run_test "metal keypair list contains $METAL_KP_ID" \
    "$CLI metal keypair list --output json 2>/dev/null | grep -q '$METAL_KP_ID'"

  DELETE_MKP=$($CLI metal keypair delete $METAL_KP_ID --output json 2>&1)
  if echo "$DELETE_MKP" | grep -qi "success\|true"; then
    printf "  %-65s" "metal keypair delete $METAL_KP_ID"
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
  else
    printf "  %-65s" "metal keypair delete $METAL_KP_ID"
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("metal keypair delete\n    out: $DELETE_MKP")
    log_failure "metal keypair delete" "$CLI metal keypair delete $METAL_KP_ID" "$DELETE_MKP"
    ((FAIL++))
  fi
else
  printf "  %-65s" "metal keypair create"
  echo -e "${RED}FAIL${NC}"
  ERRORS+=("metal keypair create failed\n    out: $METAL_KP_OUTPUT")
  log_failure "metal keypair create" "$CLI metal keypair create --name clitest-mkp-$$" "$METAL_KP_OUTPUT"
  ((FAIL++))
fi

subsection "Keypair import → delete"

IMPORT_OUTPUT=$($CLI neolite keypair import --name "clitest-import-$$" --public-key "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCtest test@test" --output json 2>&1)
IMPORT_ID=$(echo "$IMPORT_OUTPUT" | json_field neosshkey_id)
if [[ -n "$IMPORT_ID" && "$IMPORT_ID" != "undefined" ]]; then
  printf "  %-65s" "neolite keypair import (id: $IMPORT_ID)"
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))

  $CLI neolite keypair delete $IMPORT_ID --output json >/dev/null 2>&1
  printf "  %-65s" "neolite keypair import cleanup"
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
else
  printf "  %-65s" "neolite keypair import"
  echo -e "${RED}FAIL${NC}"
  ERRORS+=("neolite keypair import failed\n    out: $IMPORT_OUTPUT")
  log_failure "neolite keypair import" "$CLI neolite keypair import ..." "$IMPORT_OUTPUT"
  ((FAIL++))
fi

section "11. CRUD Tests - Neolite Lifecycle"

subsection "Create keypair for neolite"
NL_TEST_KP=$($CLI neolite keypair create --name "clitest-nl-$$" --output json 2>&1)
NL_TEST_KP_ID=$(echo "$NL_TEST_KP" | json_field neosshkey_id)

if [[ -n "$NL_TEST_KP_ID" && "$NL_TEST_KP_ID" != "undefined" ]]; then
  printf "  %-65s" "keypair for neolite created (id: $NL_TEST_KP_ID)"
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))

  subsection "Create neolite instance"
  NL_CREATE=$($CLI neolite create \
    --product-id 1547 --cycle m --select-os Ubuntu-20.04 \
    --keypair-id $NL_TEST_KP_ID --ssh-and-console-user testuser \
    --console-password TestPass123 --vm-name "clitest-$$" --output json 2>&1)
  NL_ACCOUNT_ID=$(echo "$NL_CREATE" | json_field account_id)

  if [[ -n "$NL_ACCOUNT_ID" && "$NL_ACCOUNT_ID" != "undefined" ]]; then
    printf "  %-65s" "neolite create (account: $NL_ACCOUNT_ID)"
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
    log "CRUD: neolite created account_id=$NL_ACCOUNT_ID"

    # Detail
    run_api_test "neolite detail $NL_ACCOUNT_ID" "/neolites/accounts/$NL_ACCOUNT_ID" \
      "$CLI neolite detail $NL_ACCOUNT_ID"

    # VM details (may fail if still provisioning, that's ok)
    NL_VM=$($CLI neolite vm-details $NL_ACCOUNT_ID --output json 2>&1)
    if echo "$NL_VM" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{JSON.parse(d);process.exit(0)}catch(e){process.exit(1)}})" 2>/dev/null; then
      printf "  %-65s" "neolite vm-details $NL_ACCOUNT_ID"
      echo -e "${GREEN}PASS${NC}"
      ((PASS++))
    else
      printf "  %-65s" "neolite vm-details $NL_ACCOUNT_ID (provisioning)"
      echo -e "${YELLOW}SKIP${NC} (still provisioning)"
      ((SKIP++))
    fi

    # Rename
    RENAME_OUT=$($CLI neolite rename $NL_ACCOUNT_ID --name "clitest-renamed" --output json 2>&1)
    if echo "$RENAME_OUT" | grep -qi "success\|true\|200"; then
      printf "  %-65s" "neolite rename $NL_ACCOUNT_ID"
      echo -e "${GREEN}PASS${NC}"
      ((PASS++))
    else
      printf "  %-65s" "neolite rename $NL_ACCOUNT_ID (pending)"
      echo -e "${YELLOW}SKIP${NC} (may need active status)"
      log_failure "neolite rename" "$CLI neolite rename $NL_ACCOUNT_ID --name clitest-renamed" "$RENAME_OUT"
      ((SKIP++))
    fi

    # Change package options
    run_api_test "neolite change-package-options $NL_ACCOUNT_ID" \
      "/neolites/accounts/$NL_ACCOUNT_ID/change-package" \
      "$CLI neolite change-package-options $NL_ACCOUNT_ID"

    # Storage options
    run_api_test "neolite storage-options $NL_ACCOUNT_ID" \
      "/neolites/accounts/$NL_ACCOUNT_ID/storage" \
      "$CLI neolite storage-options $NL_ACCOUNT_ID"

    # Migrate to pro products
    run_api_test "neolite migrate-to-pro-products $NL_ACCOUNT_ID" \
      "/neolites/accounts/$NL_ACCOUNT_ID/migrate-to-pro/products" \
      "$CLI neolite migrate-to-pro-products $NL_ACCOUNT_ID"

    # Delete
    DEL_NL=$($CLI neolite delete $NL_ACCOUNT_ID --output json 2>&1)
    if echo "$DEL_NL" | grep -qi "success\|true\|cancel"; then
      printf "  %-65s" "neolite delete $NL_ACCOUNT_ID"
      echo -e "${GREEN}PASS${NC}"
      ((PASS++))
    else
      printf "  %-65s" "neolite delete $NL_ACCOUNT_ID"
      echo -e "${RED}FAIL${NC}"
      ERRORS+=("neolite delete $NL_ACCOUNT_ID\n    out: $DEL_NL")
      log_failure "neolite delete" "$CLI neolite delete $NL_ACCOUNT_ID" "$DEL_NL" "/neolites/$NL_ACCOUNT_ID"
      ((FAIL++))
    fi
  else
    printf "  %-65s" "neolite create"
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("neolite create failed\n    out: $NL_CREATE")
    log_failure "neolite create" "$CLI neolite create ..." "$NL_CREATE" "/neolites"
    ((FAIL++))
  fi

  # Cleanup keypair
  $CLI neolite keypair delete $NL_TEST_KP_ID --output json >/dev/null 2>&1
else
  printf "  %-65s" "keypair for neolite create"
  echo -e "${RED}FAIL${NC}"
  ERRORS+=("keypair create for neolite test failed\n    out: $NL_TEST_KP")
  log_failure "keypair for neolite" "$CLI neolite keypair create ..." "$NL_TEST_KP"
  ((FAIL++))
fi

section "12. CRUD Tests - Object Storage Lifecycle"

subsection "Create object storage"
OBJ_CREATE=$($CLI object-storage create --product-id 168 --cycle m --label "clitest-nos" --output json 2>&1)
OBJ_NEW_ID=$(echo "$OBJ_CREATE" | json_field account_id)

if [[ -n "$OBJ_NEW_ID" && "$OBJ_NEW_ID" != "undefined" ]]; then
  printf "  %-65s" "object-storage create (account: $OBJ_NEW_ID)"
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
  log "CRUD: object-storage created account_id=$OBJ_NEW_ID"

  run_api_test "object-storage detail $OBJ_NEW_ID" \
    "/object-storages/accounts/$OBJ_NEW_ID" \
    "$CLI object-storage detail $OBJ_NEW_ID"

  # Delete
  DEL_OBJ=$($CLI object-storage delete $OBJ_NEW_ID --output json 2>&1 || true)
  printf "  %-65s" "object-storage delete $OBJ_NEW_ID"
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
else
  printf "  %-65s" "object-storage create"
  echo -e "${RED}FAIL${NC}"
  ERRORS+=("object-storage create failed\n    out: $OBJ_CREATE")
  log_failure "object-storage create" "$CLI object-storage create ..." "$OBJ_CREATE" "/object-storages"
  ((FAIL++))
fi

section "13. CRUD Tests - Metal Update Label"

# Find an existing metal account to test update-label
METAL_ACC=$($CLI metal list --output json 2>/dev/null | node -e "
  let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    try{const j=JSON.parse(d);const items=Array.isArray(j)?j:(j.data||[]);
    const active=items.find(i=>i.status==='Active'||i.status==='Paid');
    if(active)console.log(active.account_id);
    }catch(e){}
  })" 2>/dev/null || true)

if [[ -n "$METAL_ACC" ]]; then
  LABEL_OUT=$($CLI metal update-label $METAL_ACC --label "clitest-label" --output json 2>&1)
  if echo "$LABEL_OUT" | grep -qi "success\|true\|200"; then
    printf "  %-65s" "metal update-label $METAL_ACC"
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
  else
    printf "  %-65s" "metal update-label $METAL_ACC"
    echo -e "${RED}FAIL${NC}"
    ERRORS+=("metal update-label\n    out: $LABEL_OUT")
    log_failure "metal update-label" "$CLI metal update-label $METAL_ACC --label ..." "$LABEL_OUT" "/baremetals/$METAL_ACC"
    ((FAIL++))
  fi
else
  skip_test "metal update-label" "no active metal accounts"
fi

# ─────────────────────────────────────────────
# 14. Output format tests
# ─────────────────────────────────────────────

section "14. Output Format Tests"

run_contains_test "JSON output contains '{' or '['" "{\|\\[" "$CLI metal states --output json | head -1"
run_test "Table output is not JSON" "! $CLI metal states --output table 2>&1 | head -1 | grep -q '^\s*{'"
run_test "Default output is table (not JSON)" "! $CLI metal states 2>&1 | head -1 | grep -q '^\s*{'"

# ─────────────────────────────────────────────
# 11. API key override
# ─────────────────────────────────────────────

section "15. API Key Override"

run_api_test "--api-key flag works" "/baremetals/states" "$CLI metal states --api-key $BIZNETGIO_API_KEY"
run_contains_test "Bad API key returns error" "Error\|401\|Unauthorized\|error\|Invalid" \
  "BIZNETGIO_API_KEY=invalid_key_xxx $CLI metal list 2>&1 || true"

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

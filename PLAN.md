# Biznet Gio CLI & MCP Server - Implementation Plan

## Context
Build a CLI tool and MCP Server from the Biznet Gio Portal API (`https://api.portal.biznetgio.com/v1/`). Both projects are separate, built with Node.js, and use the `BIZNETGIO_API_KEY` environment variable for authentication (sent as the `x-token` header).

Run via `npx`:
- CLI: `npx @biznetgio/cli@latest`
- MCP: `npx @biznetgio/mcp@latest`

---

## Project Structure

```
bgn-cli/
  cli/          # @biznetgio/cli - CLI Package
  mcp-server/   # @biznetgio/mcp - MCP Server Package
```

---

## Part 1: @biznetgio/cli (CLI Tool)

### Tech Stack
- **Runtime**: Node.js
- **CLI Framework**: Commander.js
- **HTTP Client**: Built-in fetch (Node 18+)
- **Output Formatting**: cli-table3 (tables), chalk (colors)
- **Config**: dotenv for env vars

### Package Structure
```
cli/
  package.json
  bin/
    biznetgio.js            # CLI entry point
  src/
    client.js               # HTTP client wrapper (base URL, auth header)
    commands/
      metal.js              # NEO Metal commands
      elastic-storage.js    # NEO Elastic Storage commands
      additional-ip.js      # NEO Metal Additional IP commands
      neolite.js            # NEO Lite commands
      neolite-pro.js        # NEO Lite Pro commands
      object-storage.js     # NEO Object Storage commands
    utils/
      formatter.js          # Output formatting (table/json)
      common.js             # Shared options & helpers
```

### CLI Command Design

```
npx @biznetgio/cli@latest <service> <action> [options]
```

#### NEO Metal (`metal`)
- `metal list` — List accounts
- `metal detail <account_id>` — Account details
- `metal create` — Create NEO Metal
- `metal delete <account_id>` — Delete
- `metal update-label <account_id> --label <label>` — Update label
- `metal state <account_id>` — Get server state
- `metal set-state <account_id> <on|off|reset>` — Set state
- `metal rebuild <account_id> [--os <os>]` — Rebuild
- `metal openvpn` — Get OpenVPN config
- `metal products` — List products
- `metal product <product_id>` — Product detail
- `metal product-os <product_id>` — List OS for product
- `metal rebuild-os <account_id>` — List rebuild OS options
- `metal states` — List available states
- `metal keypair list` — List keypairs
- `metal keypair create --name <name>` — Create keypair
- `metal keypair import --name <name> --public-key <key>` — Import keypair
- `metal keypair delete <keypair_id>` — Delete keypair

#### NEO Elastic Storage (`elastic-storage`)
- `elastic-storage list` — List storages
- `elastic-storage detail <account_id>` — Storage detail
- `elastic-storage create` — Create storage
- `elastic-storage upgrade <account_id> --size <size>` — Upgrade
- `elastic-storage change-package <account_id> --product-id <id>` — Change package
- `elastic-storage delete <account_id>` — Delete
- `elastic-storage products` — List products
- `elastic-storage product <product_id>` — Product detail

#### NEO Metal Additional IP (`additional-ip`)
- `additional-ip list` — List IPs
- `additional-ip detail <account_id>` — IP detail
- `additional-ip create` — Create
- `additional-ip delete <account_id>` — Delete
- `additional-ip regions` — List regions
- `additional-ip products` — List products
- `additional-ip product <product_id>` — Product detail
- `additional-ip assignments <metal_account_id>` — View assignments
- `additional-ip assigns <account_id>` — IP-to-machine mappings
- `additional-ip assign <account_id> --metal-account-id <id>` — Assign to machine
- `additional-ip assign-detail <account_id> <metal_account_id>` — Specific assignment
- `additional-ip unassign <account_id> <metal_account_id>` — Unassign

#### NEO Lite (`neolite`)
- `neolite list` — List accounts
- `neolite detail <account_id>` — Account details
- `neolite create` — Create instance
- `neolite delete <account_id>` — Delete
- `neolite vm-details <account_id>` — VM info
- `neolite set-state <account_id> <stop|suspend|resume|shutdown|start|reset>`
- `neolite rename <account_id> --name <name>` — Rename VM
- `neolite rebuild <account_id> [--os <os>]` — Rebuild
- `neolite change-keypair <account_id> --keypair-id <id>`
- `neolite snapshot create <account_id>` — Create snapshot
- `neolite change-package <account_id> --product-id <id>`
- `neolite upgrade-storage <account_id> --disk-size <size>`
- `neolite migrate-to-pro <account_id> --product-id <id>`
- `neolite products` — List products
- `neolite product <product_id>` — Product detail
- `neolite product-os <product_id>` — List OS
- `neolite product-ip <product_id>` — IP availability
- `neolite keypair list|create|import|delete`
- **Snapshot sub-commands**: `neolite snapshot list|detail|create-instance|restore|delete|products`
- **Disk sub-commands**: `neolite disk list|detail|create|upgrade|delete|products`

#### NEO Lite Pro (`neolite-pro`)
- Same as NEO Lite, API path prefix `/neolite-pros`
- States: stop, suspend, resume, shutdown, start, reset
- Includes: snapshot & disk sub-commands

#### NEO Object Storage (`object-storage`)
- `object-storage list` — List accounts
- `object-storage detail <account_id>` — Account detail
- `object-storage create` — Create
- `object-storage upgrade-quota <account_id> --quota <size>`
- `object-storage credential list|create|update|delete <account_id>`
- `object-storage bucket list|create|delete|info|usage|set-acl <account_id>`
- `object-storage object list|upload|download|delete|copy|move|set-acl|url <account_id> <bucket>`
- `object-storage products` — List products
- `object-storage product <product_id>`

### Global Options
- `--output json|table` — Output format (default: json)
- `--api-key <key>` — Override env var

### Authentication
- Header: `x-token: <BIZNETGIO_API_KEY>`
- From env `BIZNETGIO_API_KEY` or `--api-key` flag

---

## Part 2: @biznetgio/mcp (MCP Server)

### Tech Stack
- **Runtime**: Node.js
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Transport**: stdio (standard MCP transport)
- **HTTP Client**: Built-in fetch (Node 18+)
- **Schema Validation**: zod

### Package Structure
```
mcp-server/
  package.json
  src/
    index.js                # MCP server entry point
    client.js               # HTTP client wrapper
    tools/
      metal.js              # NEO Metal tools (18 tools)
      elastic-storage.js    # NEO Elastic Storage tools (8 tools)
      additional-ip.js      # Additional IP tools (12 tools)
      neolite.js            # NEO Lite tools (35 tools)
      neolite-pro.js        # NEO Lite Pro tools (33 tools)
      object-storage.js     # Object Storage tools (25 tools)
```

### MCP Tools Design

Each API endpoint is exposed as an MCP tool. Naming convention: `<service>_<action>`

#### Example Tools:
- `metal_list` — List NEO Metal accounts
- `metal_detail` — Get account details (input: account_id)
- `metal_create` — Create NEO Metal (input: product_id, cycle, select_os, keypair_id, label, public_ip)
- `metal_delete` — Delete (input: account_id)
- `metal_set_state` — Set server state (input: account_id, state)
- `neolite_list` — List NEO Lite accounts
- `neolite_create` — Create instance
- `neolite_vm_details` — Get VM details
- `object_storage_bucket_list` — List buckets
- `object_storage_object_url` — Generate signed URL
- ... (131 tools total across all endpoints)

### MCP Tool Input Schema
Each tool defines a JSON Schema for input parameters using zod, derived directly from the OpenAPI spec schemas.

---

## Implementation Steps

### Step 1: Setup both projects
- Init `cli/` and `mcp-server/` with `npm init`
- Install dependencies

### Step 2: Shared HTTP Client
- Create `client.js` in each project
- Base URL: `https://api.portal.biznetgio.com/v1`
- Auto-attach `x-token` header from env
- Standard error handling

### Step 3: CLI — Implement commands per service
- Start with `metal` (most straightforward)
- Continue with `elastic-storage`, `additional-ip`
- Then `neolite`, `neolite-pro`
- Finally `object-storage` (most complex)

### Step 4: MCP Server — Implement tools per service
- Setup MCP server with stdio transport
- Register all tools with input schemas
- Implement handler for each tool

### Step 5: Testing & Verification
- CLI: `BIZNETGIO_API_KEY=xxx npx @biznetgio/cli@latest metal list`
- CLI: `npx @biznetgio/cli@latest --help` to verify all commands
- MCP: Test with MCP inspector or Claude Desktop config
- MCP: Verify tool listing and schema validation

---

## Enum Reference (for input validation)
- **Cycle options**: m (monthly), a (annually), q (quarterly), s (semi-annually), b (biennially), t (triennially), p4, p5
- **State options (Metal)**: on, off, reset
- **State options (Neolite/Pro)**: stop, suspend, resume, shutdown, start, reset
- **Object ACL**: private, public-read, public-read-write, authenticated-read, log-delivery-write
- **Public IP**: 1 (fixed)

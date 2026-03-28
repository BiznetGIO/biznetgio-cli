# Biznet Gio Cloud Management - Agent Skill Guide

## Skill Metadata

| Field | Value |
|-------|-------|
| **Name** | Biznet Gio Cloud Management |
| **Description** | Manage Biznet Gio cloud infrastructure (servers, VMs, storage, IPs) via CLI and MCP |
| **Homepage** | https://github.com/BiznetGIO/biznetgio-cli |
| **npm (CLI)** | [@biznetgio/cli](https://www.npmjs.com/package/@biznetgio/cli) |
| **npm (MCP)** | [@biznetgio/mcp](https://www.npmjs.com/package/@biznetgio/mcp) |
| **API Docs** | https://api.portal.biznetgio.com/v1/openapi.json |
| **License** | MIT |

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BIZNETGIO_API_KEY` | **Yes** | API token from [Biznet Gio Portal](https://portal.biznetgio.com). Sent as `x-token` header on every request. Do not hardcode — always use env var. |
| `BIZNETGIO_BASE_URL` | No | Override API base URL. Defaults to `https://api.portal.biznetgio.com/v1`. Useful for staging/dev environments. |

### Required Binaries

| Binary | Required | Description |
|--------|----------|-------------|
| `node` | **Yes** | Node.js >= 18. Runtime for the CLI and MCP server. |
| `npx` | **Yes** | Included with Node.js. Used to fetch and run `@biznetgio/cli` from the npm registry without global installation. |

### Runtime Note

This skill executes the npm package `@biznetgio/cli` via `npx`, which downloads and runs code from the npm registry. The package is published under the `@biznetgio` npm scope by Biznet Gio. If you require stronger guarantees, you can:
- Pre-install with `npm install -g @biznetgio/cli` and verify the package before use
- Use the pre-built standalone binaries from the [GitHub releases](https://github.com/BiznetGIO/biznetgio-cli/releases)
- Run in a sandboxed environment

---

You are an agent that can manage Biznet Gio cloud infrastructure using the CLI tool `@biznetgio/cli` and/or MCP server `@biznetgio/mcp`.

## Important Instructions

1. **Always use `npx`** to run the CLI. No installation required.
2. **Always confirm before executing.** Before running any CLI command, show the user the full command with all values and ask for confirmation. The user may want to revise parameter values before execution. Never run a command without user approval.
3. **For destructive actions (delete, rebuild, state changes), double confirm.** Clearly warn the user about the impact and ask explicitly: "Are you sure?"
4. **For create operations, list all parameters** and let the user review and adjust before executing. Show product options, OS choices, and pricing when available.

## How to Run

```bash
npx @biznetgio/cli@latest <service> <action> [arguments] [options]
```

- **API Key**: environment variable `BIZNETGIO_API_KEY` (sent as `x-token` header)
- **Base URL**: `https://api.portal.biznetgio.com/v1` (override with `BIZNETGIO_BASE_URL` env)
- **Output format**: default `table`, use `--output json` for JSON output

## Available Services

| Service | CLI Command | MCP Tool Prefix | Description |
|---------|------------|-----------------|-------------|
| NEO Metal | `metal` | `metal_*` | Bare metal servers |
| Elastic Storage | `elastic-storage` | `elastic_storage_*` | Storage for bare metal |
| Additional IP | `additional-ip` | `additional_ip_*` | Additional IPs for bare metal |
| NEO Lite | `neolite` | `neolite_*` | Virtual machines (lightweight) |
| NEO Lite Pro | `neolite-pro` | `neolite_pro_*` | Virtual machines (pro-tier) |
| Object Storage | `object-storage` | `object_storage_*` | S3-compatible object storage |

## General Pattern

```bash
npx @biznetgio/cli@latest <service> <action> [arguments] [options]
npx @biznetgio/cli@latest <service> <subgroup> <action> [arguments] [options]
```

Global options: `--api-key <key>`, `--output table|json`

## Output Behavior

- **Default: table** — List data is displayed as formatted tables. Nested objects (billing, specs, options) are automatically flattened. Billing is summarized as `price/mo`.
- **`--output json`** — Raw JSON from the API `.data` field.
- **Primitive responses** (e.g. delete, update-label) return plain text like `success` or `true`.
- **Empty lists** show `No data found.`

## Valid Enum Values

- **Billing cycle** (`--cycle`): `m` (monthly), `q` (quarterly), `s` (semi-annual), `a` (annual), `b` (biennial), `t` (triennial), `p4`, `p5`
- **Metal states**: `on`, `off`, `reset`
- **VM states** (neolite/neolite-pro): `stop`, `suspend`, `resume`, `shutdown`, `start`, `reset`
- **Object ACL**: `private`, `public-read`, `public-read-write`, `authenticated-read`, `log-delivery-write`
- **Console password**: must match `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$` (min 8 chars, uppercase + lowercase + digit, alphanumeric only — no special characters)
- **Label**: max 16 characters

---

## Workflow & Best Practices

### Before Creating Resources

1. **List products** first to get valid `product_id` values:
   ```bash
   npx @biznetgio/cli@latest metal products
   npx @biznetgio/cli@latest neolite products
   npx @biznetgio/cli@latest object-storage products
   ```

2. **Check available OS** for a product:
   ```bash
   npx @biznetgio/cli@latest metal product-os <product_id>
   npx @biznetgio/cli@latest neolite product-os <product_id>
   ```

3. **Check available keypairs** (or create one first):
   ```bash
   npx @biznetgio/cli@latest neolite keypair list
   npx @biznetgio/cli@latest neolite keypair create --name "my-key"
   ```

4. **Check IP availability** (neolite):
   ```bash
   npx @biznetgio/cli@latest neolite product-ip <product_id>
   ```

### Creating Resources

```bash
# Create a bare metal server
npx @biznetgio/cli@latest metal create \
  --product-id <id> --cycle m --keypair-id <id> \
  --label "my-server" --public-ip 1 --select-os "ubuntu-22.04"

# Create a NEO Lite instance
npx @biznetgio/cli@latest neolite create \
  --product-id <id> --cycle m --select-os "Ubuntu-20.04" \
  --keypair-id <id> --ssh-and-console-user myuser \
  --console-password TestPass123

# Create a NEO Lite Pro instance
npx @biznetgio/cli@latest neolite-pro create \
  --product-id <id> --cycle m --select-os "Ubuntu-20.04" \
  --keypair-id <id> --ssh-and-console-user myuser \
  --console-password TestPass123

# Create object storage (label max 16 chars)
npx @biznetgio/cli@latest object-storage create \
  --product-id <id> --cycle m --label "my-storage"

# Create elastic storage (requires metal_account_id)
npx @biznetgio/cli@latest elastic-storage create \
  --product-id <id> --cycle m --storage-name "data-vol" \
  --metal-account-id <id>

# Create additional IP
npx @biznetgio/cli@latest additional-ip create --product-id <id> --cycle m
```

### Deleting Resources

```bash
npx @biznetgio/cli@latest metal delete <account_id>
npx @biznetgio/cli@latest neolite delete <account_id>
npx @biznetgio/cli@latest neolite-pro delete <account_id>
npx @biznetgio/cli@latest elastic-storage delete <account_id>
npx @biznetgio/cli@latest additional-ip delete <account_id>
npx @biznetgio/cli@latest object-storage delete <account_id>
npx @biznetgio/cli@latest object-storage bucket delete <account_id> <bucket_name>
npx @biznetgio/cli@latest object-storage object delete <account_id> <bucket_name> <path>
npx @biznetgio/cli@latest neolite snapshot delete <account_id>
npx @biznetgio/cli@latest neolite disk delete <account_id>
npx @biznetgio/cli@latest <service> keypair delete <keypair_id>
```

### Managing Server State

```bash
# NEO Metal: on / off / reset
npx @biznetgio/cli@latest metal set-state <account_id> on
npx @biznetgio/cli@latest metal set-state <account_id> off

# NEO Lite / Pro: start / stop / shutdown / suspend / resume / reset
npx @biznetgio/cli@latest neolite set-state <account_id> start
npx @biznetgio/cli@latest neolite set-state <account_id> stop
npx @biznetgio/cli@latest neolite-pro set-state <account_id> shutdown
```

### Object Storage Operations

```bash
# Credential management
npx @biznetgio/cli@latest object-storage credential list <account_id>
npx @biznetgio/cli@latest object-storage credential create <account_id>
npx @biznetgio/cli@latest object-storage credential update <account_id> <access_key> --active
npx @biznetgio/cli@latest object-storage credential delete <account_id> <access_key>

# Bucket operations
npx @biznetgio/cli@latest object-storage bucket list <account_id>
npx @biznetgio/cli@latest object-storage bucket create <account_id> --name my-bucket
npx @biznetgio/cli@latest object-storage bucket info <account_id> <bucket_name>
npx @biznetgio/cli@latest object-storage bucket usage <account_id> <bucket_name>
npx @biznetgio/cli@latest object-storage bucket set-acl <account_id> <bucket_name> --acl public-read
npx @biznetgio/cli@latest object-storage bucket delete <account_id> <bucket_name>

# Object operations
npx @biznetgio/cli@latest object-storage object list <account_id> <bucket_name>
npx @biznetgio/cli@latest object-storage object list <account_id> <bucket_name> <directory>
npx @biznetgio/cli@latest object-storage object info <account_id> <bucket_name> <path>
npx @biznetgio/cli@latest object-storage object download <account_id> <bucket_name> <object_name>
npx @biznetgio/cli@latest object-storage object url <account_id> <bucket_name> <object_name> --expiry 3600
npx @biznetgio/cli@latest object-storage object copy <account_id> <bucket_name> <to_bucket> <object_name>
npx @biznetgio/cli@latest object-storage object move <account_id> <bucket_name> <to_bucket> <object_name>
npx @biznetgio/cli@latest object-storage object mkdir <account_id> <bucket_name> <directory>
npx @biznetgio/cli@latest object-storage object set-acl <account_id> <bucket_name> <path> --acl private
npx @biznetgio/cli@latest object-storage object delete <account_id> <bucket_name> <path>
```

### Snapshot & Disk Management (NEO Lite / Pro)

```bash
# Snapshots
npx @biznetgio/cli@latest neolite snapshot create <account_id> --cycle m
npx @biznetgio/cli@latest neolite snapshot list
npx @biznetgio/cli@latest neolite snapshot detail <account_id>
npx @biznetgio/cli@latest neolite snapshot restore <account_id>
npx @biznetgio/cli@latest neolite snapshot create-instance <snapshot_account_id> \
  --product-id <id> --cycle m --keypair-id <id> --name "from-snap" \
  --ssh-and-console-user myuser --console-password TestPass123
npx @biznetgio/cli@latest neolite snapshot delete <account_id>
npx @biznetgio/cli@latest neolite snapshot products
npx @biznetgio/cli@latest neolite snapshot product <product_id>

# Additional disks
npx @biznetgio/cli@latest neolite disk create \
  --product-id <id> --cycle m --neolite-account-id <id>
npx @biznetgio/cli@latest neolite disk list
npx @biznetgio/cli@latest neolite disk detail <account_id>
npx @biznetgio/cli@latest neolite disk upgrade <account_id> --additional-size 20
npx @biznetgio/cli@latest neolite disk delete <account_id>
npx @biznetgio/cli@latest neolite disk products
npx @biznetgio/cli@latest neolite disk product <product_id>
```

### Keypair Management

```bash
# Available for: metal, neolite, neolite-pro
npx @biznetgio/cli@latest <service> keypair list
npx @biznetgio/cli@latest <service> keypair create --name "my-key"
npx @biznetgio/cli@latest <service> keypair import --name "my-key" --public-key "ssh-rsa AAAA..."
npx @biznetgio/cli@latest <service> keypair delete <keypair_id>
```

### Upgrade & Scaling

```bash
# Upgrade neolite/neolite-pro storage
npx @biznetgio/cli@latest neolite upgrade-storage <account_id> --disk-size 50
npx @biznetgio/cli@latest neolite-pro upgrade-storage <account_id> --disk-size 100

# Change package (upgrade plan) — check options first
npx @biznetgio/cli@latest neolite change-package-options <account_id>
npx @biznetgio/cli@latest neolite change-package <account_id> --new-product-id <id>

# Upgrade elastic storage
npx @biznetgio/cli@latest elastic-storage upgrade <account_id> --size 100

# Change elastic storage package
npx @biznetgio/cli@latest elastic-storage change-package <account_id> --new-product-id <id>

# Upgrade object storage quota
npx @biznetgio/cli@latest object-storage upgrade-quota <account_id> --add-quota 50

# Migrate neolite to pro — check options first
npx @biznetgio/cli@latest neolite migrate-to-pro-products <account_id>
npx @biznetgio/cli@latest neolite migrate-to-pro <account_id> --neolitepro-product-id <id>
```

### Rebuild / Reinstall OS

```bash
# Check available OS for rebuild
npx @biznetgio/cli@latest metal rebuild-os <account_id>

# Rebuild
npx @biznetgio/cli@latest metal rebuild <account_id> --os "ubuntu-22.04"
npx @biznetgio/cli@latest neolite rebuild <account_id> --select-os "Ubuntu-20.04"
npx @biznetgio/cli@latest neolite-pro rebuild <account_id> --select-os "Ubuntu-20.04"
```

### Update & Rename

```bash
# Update metal label (max 16 chars)
npx @biznetgio/cli@latest metal update-label <account_id> --label "new-label"

# Rename neolite/neolite-pro VM
npx @biznetgio/cli@latest neolite rename <account_id> --name "new-name"
npx @biznetgio/cli@latest neolite-pro rename <account_id> --name "new-name"

# Change keypair
npx @biznetgio/cli@latest neolite change-keypair <account_id> --keypair-id <id>
npx @biznetgio/cli@latest neolite-pro change-keypair <account_id> --keypair-id <id>
```

### Additional IP Assignment

```bash
# List and create IPs
npx @biznetgio/cli@latest additional-ip list
npx @biznetgio/cli@latest additional-ip regions
npx @biznetgio/cli@latest additional-ip create --product-id <id> --cycle m

# Assign IP to bare metal
npx @biznetgio/cli@latest additional-ip assign <ip_account_id> --metal-account-id <metal_id>
npx @biznetgio/cli@latest additional-ip assigns <ip_account_id>
npx @biznetgio/cli@latest additional-ip assignments <metal_account_id>
npx @biznetgio/cli@latest additional-ip assign-detail <ip_account_id> <metal_account_id>

# Unassign
npx @biznetgio/cli@latest additional-ip unassign <ip_account_id> <metal_account_id>
```

### Detail & Info Commands

```bash
# Account details
npx @biznetgio/cli@latest metal detail <account_id>
npx @biznetgio/cli@latest neolite detail <account_id>
npx @biznetgio/cli@latest neolite-pro detail <account_id>
npx @biznetgio/cli@latest elastic-storage detail <account_id>
npx @biznetgio/cli@latest additional-ip detail <account_id>
npx @biznetgio/cli@latest object-storage detail <account_id>

# VM details
npx @biznetgio/cli@latest neolite vm-details <account_id>
npx @biznetgio/cli@latest neolite-pro vm-details <account_id>

# Server state
npx @biznetgio/cli@latest metal state <account_id>

# OpenVPN config
npx @biznetgio/cli@latest metal openvpn
```

---

## Destructive Actions - Use With Caution!

The following commands are **destructive** and cannot be undone. **ALWAYS confirm with the user before running:**

- All `delete` commands (server, VM, storage, IP, bucket, object, snapshot, disk, keypair)
- `rebuild` commands (reinstalls OS, wipes data)
- `set-state off/shutdown/reset` (may cause downtime)

---

## MCP Server Tools Reference

When using the MCP server, all endpoints are exposed as tools with naming convention `<service>_<action>`. Examples:

| CLI Command | MCP Tool |
|-------------|----------|
| `metal list` | `metal_list` |
| `metal detail 123` | `metal_detail` `{account_id: 123}` |
| `metal set-state 123 on` | `metal_set_state` `{account_id: 123, state: "on"}` |
| `neolite create ...` | `neolite_create` `{product_id, cycle, ...}` |
| `object-storage bucket list 123` | `object_storage_bucket_list` `{account_id: 123}` |
| `neolite snapshot list` | `neolite_snapshot_list` `{}` |
| `neolite disk create ...` | `neolite_disk_create` `{product_id, cycle, ...}` |
| `object-storage delete 123` | `object_storage_delete` `{account_id: 123}` |

Total: **131 tools** available in the MCP server.

MCP server configuration for Claude Desktop / Claude Code:
```json
{
  "mcpServers": {
    "biznetgio": {
      "command": "npx",
      "args": ["-y", "@biznetgio/mcp@latest"],
      "env": {
        "BIZNETGIO_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `API key not set` | Set `export BIZNETGIO_API_KEY=xxx` or use `--api-key` flag |
| `API Error 401` | API key is invalid or expired |
| `API Error 404` | Resource not found, check the account_id |
| `API Error 422` | Validation error — check password regex, label max 16 chars, required fields |
| `API Error 500` | Server error — retry or check if the resource exists |
| `No data found.` | The list is empty, no resources of this type exist yet |

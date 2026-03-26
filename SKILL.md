# Biznet Gio Cloud Management - Agent Skill Guide

You are an agent that can manage Biznet Gio cloud infrastructure using the CLI tool `@biznetgio/cli` and/or MCP server `@biznetgio/mcp`.

## How to Run

**IMPORTANT: Always use `npx` to run the CLI. No installation required.**

```bash
npx @biznetgio/cli@latest <service> <action> [arguments] [options]
```

- **API Key**: environment variable `BIZNETGIO_API_KEY` (sent as `x-token` header)
- **Base API**: `https://api.portal.biznetgio.com/v1`
- **Output format**: default `json`, add `--output table` for table display

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

Global options: `--api-key <key>`, `--output json|table`

## Valid Enum Values

- **Billing cycle** (`--cycle`): `m` (monthly), `q` (quarterly), `s` (semi-annual), `a` (annual), `b` (biennial), `t` (triennial), `p4`, `p5`
- **Metal states**: `on`, `off`, `reset`
- **VM states** (neolite/neolite-pro): `stop`, `suspend`, `resume`, `shutdown`, `start`, `reset`
- **Object ACL**: `private`, `public-read`, `public-read-write`, `authenticated-read`, `log-delivery-write`

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

3. **Check available keypairs**:
   ```bash
   npx @biznetgio/cli@latest metal keypair list
   npx @biznetgio/cli@latest neolite keypair list
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
  --product-id <id> --cycle m --select-os "ubuntu-22.04" \
  --keypair-id <id> --ssh-and-console-user myuser \
  --console-password "SecureP@ss123"

# Create a NEO Lite Pro instance
npx @biznetgio/cli@latest neolite-pro create \
  --product-id <id> --cycle m --select-os "ubuntu-22.04" \
  --keypair-id <id> --ssh-and-console-user myuser \
  --console-password "SecureP@ss123"

# Create object storage
npx @biznetgio/cli@latest object-storage create \
  --product-id <id> --cycle m --label "my-storage"

# Create elastic storage (requires metal_account_id)
npx @biznetgio/cli@latest elastic-storage create \
  --product-id <id> --cycle m --storage-name "data-vol" \
  --metal-account-id <id>

# Create additional IP
npx @biznetgio/cli@latest additional-ip create --product-id <id> --cycle m
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
  --ssh-and-console-user myuser --console-password "P@ss123"
npx @biznetgio/cli@latest neolite snapshot delete <account_id>

# Additional disks
npx @biznetgio/cli@latest neolite disk create \
  --product-id <id> --cycle m --neolite-account-id <id>
npx @biznetgio/cli@latest neolite disk list
npx @biznetgio/cli@latest neolite disk upgrade <account_id> --additional-size 20
npx @biznetgio/cli@latest neolite disk delete <account_id>
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

# Change package (upgrade plan)
npx @biznetgio/cli@latest neolite change-package-options <account_id>   # check options first
npx @biznetgio/cli@latest neolite change-package <account_id> --new-product-id <id>

# Upgrade elastic storage
npx @biznetgio/cli@latest elastic-storage upgrade <account_id> --size 100

# Upgrade object storage quota
npx @biznetgio/cli@latest object-storage upgrade-quota <account_id> --add-quota 50

# Migrate neolite to pro
npx @biznetgio/cli@latest neolite migrate-to-pro-products <account_id>  # check options first
npx @biznetgio/cli@latest neolite migrate-to-pro <account_id> --neolitepro-product-id <id>
```

### Rebuild / Reinstall OS

```bash
# Check available OS for rebuild
npx @biznetgio/cli@latest metal rebuild-os <account_id>

# Rebuild
npx @biznetgio/cli@latest metal rebuild <account_id> --os "ubuntu-22.04"
npx @biznetgio/cli@latest neolite rebuild <account_id> --select-os "ubuntu-22.04"
npx @biznetgio/cli@latest neolite-pro rebuild <account_id> --select-os "ubuntu-22.04"
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

# Unassign
npx @biznetgio/cli@latest additional-ip unassign <ip_account_id> <metal_account_id>
```

---

## Destructive Actions - Use With Caution!

The following commands are **destructive** and cannot be undone. **ALWAYS confirm with the user before running:**

```bash
npx @biznetgio/cli@latest metal delete <account_id>
npx @biznetgio/cli@latest neolite delete <account_id>
npx @biznetgio/cli@latest neolite-pro delete <account_id>
npx @biznetgio/cli@latest elastic-storage delete <account_id>
npx @biznetgio/cli@latest additional-ip delete <account_id>
npx @biznetgio/cli@latest object-storage bucket delete <account_id> <bucket_name>
npx @biznetgio/cli@latest object-storage object delete <account_id> <bucket_name> <path>
npx @biznetgio/cli@latest neolite snapshot delete <account_id>
npx @biznetgio/cli@latest neolite disk delete <account_id>
npx @biznetgio/cli@latest <service> keypair delete <keypair_id>
```

---

## MCP Server Tools Reference

When using the MCP server, all endpoints are exposed as tools with naming convention `<service>_<action>`. Examples:

| CLI Command | MCP Tool |
|-------------|----------|
| `npx @biznetgio/cli@latest metal list` | `metal_list` |
| `npx @biznetgio/cli@latest metal detail 123` | `metal_detail` `{account_id: 123}` |
| `npx @biznetgio/cli@latest metal set-state 123 on` | `metal_set_state` `{account_id: 123, state: "on"}` |
| `npx @biznetgio/cli@latest neolite create ...` | `neolite_create` `{product_id, cycle, ...}` |
| `npx @biznetgio/cli@latest object-storage bucket list 123` | `object_storage_bucket_list` `{account_id: 123}` |
| `npx @biznetgio/cli@latest neolite snapshot list` | `neolite_snapshot_list` `{}` |
| `npx @biznetgio/cli@latest neolite disk create ...` | `neolite_disk_create` `{product_id, cycle, ...}` |

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
| `API Error 422` | Validation error, check the parameters being sent |

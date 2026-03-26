# Biznet Gio CLI & MCP Server

Command-line tool and MCP (Model Context Protocol) server for managing [Biznet Gio](https://portal.biznetgio.com) cloud services via the [Portal API](https://api.portal.biznetgio.com/v1/openapi.json).

## Packages

| Package | Description |
|---------|-------------|
| [`@biznetgio/cli`](./biznetgio-cli) | CLI tool for managing Biznet Gio services from the terminal |
| [`@biznetgio/mcp`](./biznetgio-mcp-server) | MCP server so AI assistants (Claude, etc.) can access the Biznet Gio API |

## Supported Services

- **NEO Metal** — Bare metal server management
- **NEO Elastic Storage** — Elastic storage for bare metal
- **NEO Metal Additional IP** — Additional IP management
- **NEO Lite** — Lightweight virtual machines
- **NEO Lite Pro** — Pro-tier virtual machines
- **NEO Object Storage** — S3-compatible object storage

## Prerequisites

- Node.js >= 18
- API Key from [Biznet Gio Portal](https://portal.biznetgio.com)

## API Key Setup

```bash
export BIZNETGIO_API_KEY=your_api_key_here
```

---

## @biznetgio/cli

### Installation

```bash
# Run directly without installing
npx @biznetgio/cli@latest <service> <action> [options]

# Or install globally
npm install -g @biznetgio/cli
biznetgio <service> <action> [options]
```

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `--api-key <key>` | API key (overrides env var) | `BIZNETGIO_API_KEY` |
| `--output <format>` | Output format: `json` or `table` | `json` |
| `-V, --version` | Show version | |
| `-h, --help` | Show help | |

### Usage Examples

```bash
# List all NEO Metal servers
npx @biznetgio/cli@latest metal list

# Server detail with table output
npx @biznetgio/cli@latest metal detail 12345 --output table

# List NEO Lite products
npx @biznetgio/cli@latest neolite products

# Create a NEO Lite instance
npx @biznetgio/cli@latest neolite create \
  --product-id 1 \
  --cycle m \
  --select-os ubuntu-22.04 \
  --keypair-id 10 \
  --ssh-and-console-user myuser \
  --console-password MyP@ssw0rd

# Manage VM state
npx @biznetgio/cli@latest neolite set-state 12345 start
npx @biznetgio/cli@latest neolite set-state 12345 stop

# List object storage buckets
npx @biznetgio/cli@latest object-storage bucket list 12345

# Generate a signed URL for an object
npx @biznetgio/cli@latest object-storage object url 12345 my-bucket file.pdf --expiry 3600

# Manage keypairs
npx @biznetgio/cli@latest metal keypair list
npx @biznetgio/cli@latest metal keypair create --name my-key

# Override API key per command
npx @biznetgio/cli@latest metal list --api-key another_key_here
```

### Command Reference

| Service | Commands | Description |
|---------|----------|-------------|
| `metal` | `list`, `detail`, `create`, `delete`, `update-label`, `state`, `set-state`, `rebuild`, `openvpn`, `products`, `product`, `product-os`, `rebuild-os`, `states` | NEO Metal management |
| `metal keypair` | `list`, `create`, `import`, `delete` | Keypair management |
| `elastic-storage` | `list`, `detail`, `create`, `upgrade`, `change-package`, `delete`, `products`, `product` | Elastic Storage management |
| `additional-ip` | `list`, `detail`, `create`, `delete`, `regions`, `products`, `product`, `assignments`, `assigns`, `assign`, `assign-detail`, `unassign` | Additional IP management |
| `neolite` | `list`, `detail`, `create`, `delete`, `vm-details`, `set-state`, `rename`, `rebuild`, `change-keypair`, `change-package`, `upgrade-storage`, `migrate-to-pro`, `products`, `product`, `product-os`, `product-ip` | NEO Lite management |
| `neolite keypair` | `list`, `create`, `import`, `delete` | Keypair management |
| `neolite snapshot` | `list`, `detail`, `create`, `create-instance`, `restore`, `delete`, `products`, `product` | Snapshot management |
| `neolite disk` | `list`, `detail`, `create`, `upgrade`, `delete`, `products`, `product` | Additional disk management |
| `neolite-pro` | Same as `neolite` (without migrate-to-pro) | NEO Lite Pro management |
| `object-storage` | `list`, `detail`, `create`, `upgrade-quota`, `products`, `product` | Object Storage account management |
| `object-storage credential` | `list`, `create`, `update`, `delete` | S3 credential management |
| `object-storage bucket` | `list`, `create`, `info`, `usage`, `set-acl`, `delete` | Bucket management |
| `object-storage object` | `list`, `info`, `download`, `url`, `copy`, `move`, `mkdir`, `set-acl`, `delete` | Object management |

---

## @biznetgio/mcp

MCP server that exposes all Biznet Gio API endpoints as tools for AI assistants.

### Installation

```bash
# Run directly without installing
npx @biznetgio/mcp@latest

# Or install globally
npm install -g @biznetgio/mcp
biznetgio-mcp
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

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

### Claude Code Configuration

Add to `.mcp.json` in your project directory:

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

### Available Tools (131 total)

| Category | Tool Count | Examples |
|----------|-----------|----------|
| NEO Metal | 18 | `metal_list`, `metal_create`, `metal_set_state`, `metal_keypair_list` |
| Elastic Storage | 8 | `elastic_storage_list`, `elastic_storage_create`, `elastic_storage_upgrade` |
| Additional IP | 12 | `additional_ip_list`, `additional_ip_assign`, `additional_ip_regions` |
| NEO Lite | 35 | `neolite_list`, `neolite_create`, `neolite_snapshot_create`, `neolite_disk_list` |
| NEO Lite Pro | 33 | `neolite_pro_list`, `neolite_pro_create`, `neolite_pro_snapshot_list` |
| Object Storage | 25 | `object_storage_list`, `object_storage_bucket_create`, `object_storage_object_url` |

### Manual Testing

```bash
# Test MCP server startup
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | BIZNETGIO_API_KEY=test npx @biznetgio/mcp@latest
```

---

## API Reference

- **Base URL**: `https://api.portal.biznetgio.com/v1`
- **Auth**: `x-token` header
- **OpenAPI Spec**: `https://api.portal.biznetgio.com/v1/openapi.json`

### Billing Cycle Codes

| Code | Description |
|------|-------------|
| `m` | Monthly |
| `q` | Quarterly |
| `s` | Semi-annually |
| `a` | Annually |
| `b` | Biennially |
| `t` | Triennially |
| `p4` | Period 4 |
| `p5` | Period 5 |

### Server States

| Service | States |
|---------|--------|
| NEO Metal | `on`, `off`, `reset` |
| NEO Lite / Pro | `stop`, `suspend`, `resume`, `shutdown`, `start`, `reset` |

### Object Storage ACL

`private`, `public-read`, `public-read-write`, `authenticated-read`, `log-delivery-write`

---

## License

[MIT](./LICENSE)

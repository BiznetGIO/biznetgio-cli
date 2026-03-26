#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMetalTools } from './tools/metal.js';
import { registerElasticStorageTools } from './tools/elastic-storage.js';
import { registerAdditionalIpTools } from './tools/additional-ip.js';
import { registerNeoliteTools } from './tools/neolite.js';
import { registerNeoliteProTools } from './tools/neolite-pro.js';
import { registerObjectStorageTools } from './tools/object-storage.js';

const server = new McpServer({
  name: 'biznetgio',
  version: '1.0.0',
  description: 'MCP Server for Biznet Gio Portal API',
});

registerMetalTools(server);
registerElasticStorageTools(server);
registerAdditionalIpTools(server);
registerNeoliteTools(server);
registerNeoliteProTools(server);
registerObjectStorageTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

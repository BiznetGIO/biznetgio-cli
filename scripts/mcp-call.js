#!/usr/bin/env node
// MCP test helper — spawns MCP server and sends JSON-RPC requests
// Usage:
//   node mcp-call.js <entry> list                    — list all tools
//   node mcp-call.js <entry> call <tool> [args-json]  — call a tool

const { spawn } = require('child_process');
const entry = process.argv[2];
const action = process.argv[3] || 'list';
const toolName = process.argv[4] || '';
const argsJson = process.argv[5] || '{}';

if (!entry) { console.error('Usage: node mcp-call.js <entry.js> list|call [tool] [args]'); process.exit(1); }

const child = spawn('node', [entry], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env,
});

let out = '';
child.stdout.on('data', d => { out += d.toString(); });

// Send initialize
child.stdin.write(JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } }
}) + '\n');

// Send initialized notification
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

// Send the actual request
if (action === 'list') {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n');
} else if (action === 'call') {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: toolName, arguments: JSON.parse(argsJson) }
  }) + '\n');
}

let exited = false;
function finish() {
  if (exited) return;
  exited = true;
  try { child.kill(); } catch(e) {}
  // Extract only the response with id:2 by parsing balanced JSON objects
  const results = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') { if (depth === 0) start = i; depth++; }
    if (c === '}') { depth--; if (depth === 0 && start >= 0) { results.push(out.slice(start, i + 1)); start = -1; } }
  }
  // Print the response with id:2 (our request)
  for (const r of results) {
    try {
      const parsed = JSON.parse(r);
      if (parsed.id === 2) { console.log(r); process.exit(0); }
    } catch(e) {}
  }
  // Fallback: print last response
  if (results.length > 1) console.log(results[results.length - 1]);
  else if (results.length === 1) console.log(results[0]);
  process.exit(0);
}

setTimeout(finish, 15000);
child.on('close', () => setTimeout(finish, 200));

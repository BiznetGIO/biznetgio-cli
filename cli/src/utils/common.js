import { getApiKey } from '../client.js';

export function withAuth(action) {
  return async function (...args) {
    const cmd = args[args.length - 1];
    const opts = cmd.opts ? cmd.opts() : cmd;
    // Walk up the parent chain to collect all options (root has --output, --api-key)
    const ancestors = {};
    let p = cmd.parent;
    while (p) {
      Object.assign(ancestors, p.opts ? p.opts() : {});
      p = p.parent;
    }
    const merged = { ...ancestors, ...opts };
    merged.apiKey = getApiKey(merged);
    try {
      await action(merged, ...args.slice(0, -1));
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  };
}

export const CYCLE_CHOICES = ['m', 'a', 'q', 's', 'b', 't', 'p4', 'p5'];
export const METAL_STATES = ['on', 'off', 'reset'];
export const VM_STATES = ['stop', 'suspend', 'resume', 'shutdown', 'start', 'reset'];
export const ACL_OPTIONS = ['private', 'public-read', 'public-read-write', 'authenticated-read', 'log-delivery-write'];

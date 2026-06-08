import { load, getApiKey, getPortalURL, getCredentialsPath, DEFAULT_PORTAL_URL } from '../utils/credentials.js';
import { decodeJWTPayload } from './login.js';

/**
 * Resolve identity from credential file or JWT decode.
 *
 * Priority:
 *   1. Credential file (api_key + stored fields)
 *   2. API key from flag / env (JWT decode only)
 *
 * Returns an object { email, client_id, portal_url, updated_at, source }
 * where source is 'credential_file' or 'api_key'.
 * Returns null when no credential source is available at all.
 * Throws if the credential file is corrupt.
 */
export function resolveWhoami({ flagApiKey = null } = {}) {
  const creds = load(); // throws on corrupt, null on missing

  if (creds?.api_key) {
    const info = {
      email: creds.email || '',
      client_id: creds.client_id ?? null,
      portal_url: creds.portal_url || DEFAULT_PORTAL_URL,
      updated_at: creds.updated_at || '',
      source: 'credential_file',
    };
    // Fill any missing identity fields by decoding the stored JWT
    if (!info.email || info.client_id == null) {
      try {
        const payload = decodeJWTPayload(creds.api_key);
        if (!info.email) info.email = payload.email || payload.sub || '';
        if (info.client_id == null) info.client_id = payload.client_id ?? payload.clientId ?? null;
      } catch { /* non-JWT key – leave fields empty */ }
    }
    return info;
  }

  // No credential file – try API key from flag or env
  const apiKey = getApiKey(flagApiKey);
  if (!apiKey) return null;

  const info = {
    email: '',
    client_id: null,
    portal_url: getPortalURL(),
    updated_at: '',
    source: 'api_key',
  };
  try {
    const payload = decodeJWTPayload(apiKey);
    info.email = payload.email || payload.sub || '';
    info.client_id = payload.client_id ?? payload.clientId ?? null;
  } catch { /* non-JWT key – show what we have */ }
  return info;
}

function printTable(info) {
  const credPath = getCredentialsPath();
  const sourceLabel = info.source === 'credential_file'
    ? `${credPath}${info.updated_at ? ` (updated ${info.updated_at})` : ''}`
    : 'API key (JWT decode)';

  const rows = [
    ['email',      info.email      || '(unknown)'],
    ['client_id',  info.client_id  ?? '(unknown)'],
    ['portal_url', info.portal_url || DEFAULT_PORTAL_URL],
    ['source',     sourceLabel],
  ];
  const w = Math.max(...rows.map(([k]) => k.length));
  for (const [k, v] of rows) {
    console.log(`  ${k.padEnd(w)}  ${v}`);
  }
}

export function registerWhoamiCommand(program) {
  program
    .command('whoami')
    .description('Show current authentication identity')
    .action(async (...args) => {
      // Commander always puts the Command instance last; grab it to walk the parent chain
      const cmd = args[args.length - 1];
      const ancestors = {};
      let p = cmd.parent;
      while (p) {
        Object.assign(ancestors, p.opts ? p.opts() : {});
        p = p.parent;
      }
      const merged = { ...ancestors, ...cmd.opts() };
      const outputFmt = merged.output || 'table';

      let info;
      try {
        info = resolveWhoami({ flagApiKey: merged.apiKey });
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }

      if (!info) {
        console.error(
          'Error: Not logged in. Run `biznetgio login` or set BIZNETGIO_API_KEY.'
        );
        process.exit(1);
      }

      if (outputFmt === 'json') {
        const { source, updated_at, ...rest } = info;
        const out = { ...rest, source };
        if (updated_at) out.updated_at = updated_at;
        console.log(JSON.stringify(out, null, 2));
        return;
      }

      printTable(info);
    });
}

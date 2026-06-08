import { readFileSync, writeFileSync, chmodSync, renameSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { randomBytes } from 'crypto';

export const DEFAULT_PORTAL_URL = 'portal.biznetgio.com';

export function getCredentialsPath() {
  return process.env.BIZNETGIO_CREDENTIALS_PATH || join(homedir(), '.biznetgio.json');
}

/**
 * Load credentials from file.
 * Returns null if file does not exist.
 * Throws a descriptive error if file exists but contains invalid JSON.
 */
export function load() {
  const path = getCredentialsPath();
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Credentials file ${path} contains invalid JSON. Fix or remove it to continue.`
    );
  }
}

/**
 * Atomically write credentials to file with mode 0600.
 * Uses write-temp-then-rename to prevent corruption on kill.
 */
export function save(creds) {
  const path = getCredentialsPath();
  const payload = { ...creds, updated_at: new Date().toISOString() };
  const data = JSON.stringify(payload, null, 2) + '\n';
  // Temp file in same directory to ensure rename is atomic (same filesystem)
  const tmp = join(dirname(path), `.biznetgio.json.${randomBytes(8).toString('hex')}.tmp`);
  writeFileSync(tmp, data, { mode: 0o600 });
  renameSync(tmp, path);
  chmodSync(path, 0o600);
}

/**
 * Resolve API key using the priority chain:
 *   1. cmdFlagValue  (--api-key flag)
 *   2. credential file api_key
 *   3. BIZNETGIO_API_KEY env var
 * Returns null if none found.
 */
export function getApiKey(cmdFlagValue) {
  if (cmdFlagValue) return cmdFlagValue;
  const creds = load();
  if (creds?.api_key) return creds.api_key;
  return process.env.BIZNETGIO_API_KEY || null;
}

/**
 * Resolve portal URL using the priority chain:
 *   1. credential file portal_url
 *   2. BIZNETGIO_PORTAL_URL env var
 *   3. DEFAULT_PORTAL_URL
 */
export function getPortalURL() {
  const creds = load();
  if (creds?.portal_url) return creds.portal_url;
  return process.env.BIZNETGIO_PORTAL_URL || DEFAULT_PORTAL_URL;
}

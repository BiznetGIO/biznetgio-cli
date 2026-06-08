import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function getCredentialsPath() {
  return process.env.BIZNETGIO_CREDENTIALS_PATH || join(homedir(), '.biznetgio.json');
}

function load() {
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
 * Resolve API key using the priority chain:
 *   1. credential file api_key
 *   2. BIZNETGIO_API_KEY env var
 * Throws if no key is found.
 */
export function getApiKey() {
  const creds = load();
  if (creds?.api_key) return creds.api_key;
  const envKey = process.env.BIZNETGIO_API_KEY;
  if (envKey) return envKey;
  throw new Error(
    'API key not set. Run `biznetgio login` or set BIZNETGIO_API_KEY environment variable.'
  );
}

import { randomBytes, createHash } from 'crypto';
import { getPortalURL, save, getCredentialsPath } from '../utils/credentials.js';

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 5 * 60 * 1_000;
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Generate a cryptographically-secure random SHA-512 hex string.
 */
export function generateSHA512Token() {
  return createHash('sha512').update(randomBytes(64)).digest('hex');
}

/**
 * Decode the payload section of a JWT (no signature verification).
 * Throws if the token does not have the expected structure.
 */
export function decodeJWTPayload(token) {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT format: expected at least 2 dot-separated parts');
  const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(json);
}

/**
 * Poll the validate endpoint once.
 * Returns the API key string on success, or null to indicate "keep waiting".
 * Network errors and 5xx responses return null (caller should retry).
 *
 * @param {string} portalURL  Bare host, e.g. "portal.biznetgio.com"
 * @param {string} token      SHA-512 hex token
 * @param {Function} [fetchFn]  Injected fetch for testing; defaults to global fetch
 */
export async function pollOnce(portalURL, token, fetchFn = globalThis.fetch) {
  const url = `https://${portalURL}/api/api-key/validate/${token}`;
  let res;
  try {
    res = await fetchFn(url);
  } catch {
    return null; // network error — retry
  }
  if (res.status >= 500) return null; // server error — retry
  let data;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  if (data?.status === 'success' && data?.data?.key) return data.data.key;
  return null; // still pending
}

/**
 * Run the full polling loop.
 * Returns the API key on success, or null on timeout.
 *
 * @param {string} portalURL
 * @param {string} token
 * @param {object} [opts]
 * @param {number}   [opts.pollIntervalMs=5000]
 * @param {number}   [opts.timeoutMs=300000]
 * @param {Function} [opts.fetchFn]
 * @param {Function} [opts.onTick]  Called each poll iteration (for spinner/tests)
 */
export async function runLoginFlow(portalURL, token, {
  pollIntervalMs = POLL_INTERVAL_MS,
  timeoutMs = TIMEOUT_MS,
  fetchFn = globalThis.fetch,
  onTick = null,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    onTick?.();
    const key = await pollOnce(portalURL, token, fetchFn);
    if (key) return key;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise(r => setTimeout(r, Math.min(pollIntervalMs, remaining)));
  }
  return null;
}

export function registerLoginCommand(program) {
  program
    .command('login')
    .description('Authenticate via browser and save credentials to ~/.biznetgio.json')
    .action(async () => {
      let portalURL;
      try {
        portalURL = getPortalURL();
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }

      const token = generateSHA512Token();
      const loginURL = `https://${portalURL}/user/login?refresh=${token}`;

      console.log('\nOpen the following URL in your browser to log in:\n');
      console.log(`  ${loginURL}\n`);
      console.log('Waiting for authentication (timeout: 5 minutes)...');

      const sigintHandler = () => {
        process.stdout.write('\r\x1b[K');
        console.log('\nLogin cancelled.');
        process.exit(0);
      };
      process.on('SIGINT', sigintHandler);

      let spinnerIdx = 0;
      const startTime = Date.now();

      const apiKey = await runLoginFlow(portalURL, token, {
        onTick: () => {
          const char = SPINNER[spinnerIdx++ % SPINNER.length];
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          process.stdout.write(`\r${char} Polling... (${elapsed}s elapsed)`);
        },
      });

      process.removeListener('SIGINT', sigintHandler);
      process.stdout.write('\r\x1b[K');

      if (!apiKey) {
        console.error('Error: Login timed out after 5 minutes. Please try again.');
        process.exit(1);
      }

      let email = '';
      let clientId = null;
      try {
        const payload = decodeJWTPayload(apiKey);
        email = payload.email || payload.sub || '';
        clientId = payload.client_id ?? payload.clientId ?? null;
      } catch {
        // JWT decode failure is non-fatal; save what we have
      }

      try {
        save({ api_key: apiKey, portal_url: portalURL, email, client_id: clientId });
      } catch (err) {
        console.error(`Error saving credentials: ${err.message}`);
        process.exit(1);
      }

      const credPath = getCredentialsPath();
      const who = email ? ` as ${email}` : '';
      const cid = clientId != null ? ` (client_id: ${clientId})` : '';
      console.log(`\n✓ Logged in${who}${cid}`);
      console.log(`  Credentials saved to ${credPath}`);
    });
}

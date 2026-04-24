import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Helpers to control which credential file is used
const origCredPath  = process.env.BIZNETGIO_CREDENTIALS_PATH;
const origApiKey    = process.env.BIZNETGIO_API_KEY;
const origPortalURL = process.env.BIZNETGIO_PORTAL_URL;

function clearEnv() {
  delete process.env.BIZNETGIO_CREDENTIALS_PATH;
  delete process.env.BIZNETGIO_API_KEY;
  delete process.env.BIZNETGIO_PORTAL_URL;
}
function restoreEnv() {
  if (origCredPath  !== undefined) process.env.BIZNETGIO_CREDENTIALS_PATH = origCredPath;  else delete process.env.BIZNETGIO_CREDENTIALS_PATH;
  if (origApiKey    !== undefined) process.env.BIZNETGIO_API_KEY           = origApiKey;    else delete process.env.BIZNETGIO_API_KEY;
  if (origPortalURL !== undefined) process.env.BIZNETGIO_PORTAL_URL        = origPortalURL; else delete process.env.BIZNETGIO_PORTAL_URL;
}

function makeJWT(payload) {
  const header  = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

const { resolveWhoami } = await import('../src/commands/whoami.js');
const { DEFAULT_PORTAL_URL } = await import('../src/utils/credentials.js');

let tmpDir;
let credPath;

describe('resolveWhoami', () => {
  beforeEach(() => {
    clearEnv();
    tmpDir   = mkdtempSync(join(tmpdir(), 'bng-whoami-'));
    credPath = join(tmpDir, '.biznetgio.json');
    process.env.BIZNETGIO_CREDENTIALS_PATH = credPath;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    restoreEnv();
  });

  // ─── reads from credential file ──────────────────────────────────────────

  test('returns all fields from credential file', () => {
    writeFileSync(credPath, JSON.stringify({
      api_key:    makeJWT({ email: 'a@b.com', client_id: 7 }),
      portal_url: 'myportal.com',
      email:      'a@b.com',
      client_id:  7,
      updated_at: '2026-01-01T00:00:00Z',
    }));
    const info = resolveWhoami();
    assert.strictEqual(info.email,      'a@b.com');
    assert.strictEqual(info.client_id,  7);
    assert.strictEqual(info.portal_url, 'myportal.com');
    assert.strictEqual(info.updated_at, '2026-01-01T00:00:00Z');
    assert.strictEqual(info.source,     'credential_file');
  });

  test('fills missing email/client_id from JWT when file has no identity fields', () => {
    const jwt = makeJWT({ email: 'jwt@user.io', client_id: 42 });
    writeFileSync(credPath, JSON.stringify({ api_key: jwt, portal_url: 'p.com' }));
    const info = resolveWhoami();
    assert.strictEqual(info.email,     'jwt@user.io');
    assert.strictEqual(info.client_id, 42);
    assert.strictEqual(info.source,    'credential_file');
  });

  test('leaves email/client_id empty when key is not a JWT', () => {
    writeFileSync(credPath, JSON.stringify({ api_key: 'opaque-token', portal_url: 'p.com' }));
    const info = resolveWhoami();
    assert.strictEqual(info.email,     '');
    assert.strictEqual(info.client_id, null);
    assert.strictEqual(info.source,    'credential_file');
  });

  // ─── falls back to API key when no file ──────────────────────────────────

  test('decodes JWT from env key when no credential file', () => {
    const jwt = makeJWT({ email: 'env@user.com', client_id: 99 });
    process.env.BIZNETGIO_API_KEY = jwt;
    const info = resolveWhoami();
    assert.strictEqual(info.email,     'env@user.com');
    assert.strictEqual(info.client_id, 99);
    assert.strictEqual(info.source,    'api_key');
  });

  test('decodes JWT from --api-key flag, ignoring env key', () => {
    process.env.BIZNETGIO_API_KEY = makeJWT({ email: 'env@user.com', client_id: 1 });
    const flagJwt = makeJWT({ email: 'flag@user.com', client_id: 2 });
    const info = resolveWhoami({ flagApiKey: flagJwt });
    assert.strictEqual(info.email, 'flag@user.com');
    assert.strictEqual(info.client_id, 2);
    assert.strictEqual(info.source, 'api_key');
  });

  test('returns info with empty identity fields for opaque env key', () => {
    process.env.BIZNETGIO_API_KEY = 'not-a-jwt';
    const info = resolveWhoami();
    assert.strictEqual(info.email,     '');
    assert.strictEqual(info.client_id, null);
    assert.strictEqual(info.source,    'api_key');
  });

  // ─── portal_url resolution ────────────────────────────────────────────────

  test('uses portal_url from credential file', () => {
    writeFileSync(credPath, JSON.stringify({ api_key: 'k', portal_url: 'custom.portal.com' }));
    const info = resolveWhoami();
    assert.strictEqual(info.portal_url, 'custom.portal.com');
  });

  test('uses BIZNETGIO_PORTAL_URL env when no file', () => {
    process.env.BIZNETGIO_API_KEY    = 'k';
    process.env.BIZNETGIO_PORTAL_URL = 'env.portal.com';
    const info = resolveWhoami();
    assert.strictEqual(info.portal_url, 'env.portal.com');
  });

  test('falls back to DEFAULT_PORTAL_URL when nothing set', () => {
    process.env.BIZNETGIO_API_KEY = 'k';
    const info = resolveWhoami();
    assert.strictEqual(info.portal_url, DEFAULT_PORTAL_URL);
  });

  // ─── no credentials ──────────────────────────────────────────────────────

  test('returns null when no file and no API key', () => {
    const result = resolveWhoami();
    assert.strictEqual(result, null);
  });

  // ─── corrupt file ────────────────────────────────────────────────────────

  test('throws descriptive error on corrupt credential file', () => {
    writeFileSync(credPath, '{bad json}');
    assert.throws(() => resolveWhoami(), /invalid JSON/);
  });
});

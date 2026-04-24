import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, statSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Point the credentials module at a temp directory for all tests
let tmpDir;
const originalCredPath = process.env.BIZNETGIO_CREDENTIALS_PATH;
const originalApiKey = process.env.BIZNETGIO_API_KEY;
const originalPortalURL = process.env.BIZNETGIO_PORTAL_URL;

function setCredPath(p) {
  process.env.BIZNETGIO_CREDENTIALS_PATH = p;
}
function clearEnv() {
  delete process.env.BIZNETGIO_CREDENTIALS_PATH;
  delete process.env.BIZNETGIO_API_KEY;
  delete process.env.BIZNETGIO_PORTAL_URL;
}
function restoreEnv() {
  if (originalCredPath !== undefined) process.env.BIZNETGIO_CREDENTIALS_PATH = originalCredPath;
  else delete process.env.BIZNETGIO_CREDENTIALS_PATH;
  if (originalApiKey !== undefined) process.env.BIZNETGIO_API_KEY = originalApiKey;
  else delete process.env.BIZNETGIO_API_KEY;
  if (originalPortalURL !== undefined) process.env.BIZNETGIO_PORTAL_URL = originalPortalURL;
  else delete process.env.BIZNETGIO_PORTAL_URL;
}

// Import after env setup so path is computed per-call (dynamic)
const { load, save, getApiKey, getPortalURL, DEFAULT_PORTAL_URL } =
  await import('../src/utils/credentials.js');

describe('credentials module', () => {
  beforeEach(() => {
    clearEnv();
    tmpDir = mkdtempSync(join(tmpdir(), 'biznetgio-test-'));
    setCredPath(join(tmpDir, '.biznetgio.json'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    restoreEnv();
  });

  // ─── load() ──────────────────────────────────────────────────────────────

  test('load() returns null when file does not exist', () => {
    const result = load();
    assert.strictEqual(result, null);
  });

  test('load() returns parsed object when file exists', () => {
    const creds = { api_key: 'key123', portal_url: 'portal.example.com', email: 'a@b.com', client_id: 42 };
    writeFileSync(process.env.BIZNETGIO_CREDENTIALS_PATH, JSON.stringify(creds));
    const result = load();
    assert.strictEqual(result.api_key, 'key123');
    assert.strictEqual(result.portal_url, 'portal.example.com');
    assert.strictEqual(result.email, 'a@b.com');
    assert.strictEqual(result.client_id, 42);
  });

  test('load() throws descriptive error on corrupt JSON', () => {
    writeFileSync(process.env.BIZNETGIO_CREDENTIALS_PATH, '{invalid json}');
    assert.throws(
      () => load(),
      (err) => {
        assert.ok(err.message.includes('.biznetgio.json'));
        assert.ok(err.message.includes('invalid JSON'));
        return true;
      }
    );
  });

  // ─── save() ──────────────────────────────────────────────────────────────

  test('save() writes valid JSON with expected fields', () => {
    save({ api_key: 'mykey', portal_url: 'portal.biz.com', email: 'x@y.com', client_id: 99 });
    const raw = readFileSync(process.env.BIZNETGIO_CREDENTIALS_PATH, 'utf8');
    const data = JSON.parse(raw);
    assert.strictEqual(data.api_key, 'mykey');
    assert.strictEqual(data.portal_url, 'portal.biz.com');
    assert.strictEqual(data.email, 'x@y.com');
    assert.strictEqual(data.client_id, 99);
    assert.ok(data.updated_at, 'updated_at should be set');
  });

  test('save() creates file with mode 0600', () => {
    save({ api_key: 'k', portal_url: 'p.com', email: '', client_id: null });
    const stat = statSync(process.env.BIZNETGIO_CREDENTIALS_PATH);
    const mode = stat.mode & 0o777;
    assert.strictEqual(mode, 0o600, `expected 0600 but got 0${mode.toString(8)}`);
  });

  test('save() overwrites existing file', () => {
    save({ api_key: 'first', portal_url: 'p.com', email: '', client_id: null });
    save({ api_key: 'second', portal_url: 'p.com', email: '', client_id: null });
    const data = load();
    assert.strictEqual(data.api_key, 'second');
  });

  test('save() sets updated_at as RFC3339 UTC', () => {
    const before = new Date();
    save({ api_key: 'k', portal_url: 'p.com', email: '', client_id: null });
    const after = new Date();
    const data = load();
    const ts = new Date(data.updated_at);
    assert.ok(ts >= before && ts <= after, 'updated_at should be current time');
  });

  // ─── getApiKey() ─────────────────────────────────────────────────────────

  test('getApiKey() returns flag value when provided', () => {
    process.env.BIZNETGIO_API_KEY = 'env-key';
    save({ api_key: 'file-key', portal_url: 'p.com', email: '', client_id: null });
    assert.strictEqual(getApiKey('flag-key'), 'flag-key');
  });

  test('getApiKey() returns file api_key when no flag', () => {
    process.env.BIZNETGIO_API_KEY = 'env-key';
    save({ api_key: 'file-key', portal_url: 'p.com', email: '', client_id: null });
    assert.strictEqual(getApiKey(undefined), 'file-key');
  });

  test('getApiKey() falls back to env var when no file', () => {
    process.env.BIZNETGIO_API_KEY = 'env-key';
    assert.strictEqual(getApiKey(undefined), 'env-key');
  });

  test('getApiKey() returns null when nothing set', () => {
    assert.strictEqual(getApiKey(undefined), null);
  });

  test('getApiKey() treats empty string flag as falsy (falls through to file)', () => {
    save({ api_key: 'file-key', portal_url: 'p.com', email: '', client_id: null });
    assert.strictEqual(getApiKey(''), 'file-key');
  });

  // ─── getPortalURL() ──────────────────────────────────────────────────────

  test('getPortalURL() returns file portal_url when present', () => {
    process.env.BIZNETGIO_PORTAL_URL = 'env.portal.com';
    save({ api_key: 'k', portal_url: 'file.portal.com', email: '', client_id: null });
    assert.strictEqual(getPortalURL(), 'file.portal.com');
  });

  test('getPortalURL() falls back to env var when no file', () => {
    process.env.BIZNETGIO_PORTAL_URL = 'env.portal.com';
    assert.strictEqual(getPortalURL(), 'env.portal.com');
  });

  test('getPortalURL() returns default when nothing set', () => {
    assert.strictEqual(getPortalURL(), DEFAULT_PORTAL_URL);
  });

  test('getPortalURL() throws when credentials file is corrupt', () => {
    writeFileSync(process.env.BIZNETGIO_CREDENTIALS_PATH, 'not-json');
    assert.throws(() => getPortalURL(), /invalid JSON/);
  });
});

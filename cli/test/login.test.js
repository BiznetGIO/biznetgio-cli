import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateSHA512Token,
  decodeJWTPayload,
  pollOnce,
  runLoginFlow,
} from '../src/commands/login.js';

// ─── generateSHA512Token ────────────────────────────────────────────────────

describe('generateSHA512Token', () => {
  test('returns a 128-character hex string', () => {
    const token = generateSHA512Token();
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(token.length, 128);
    assert.ok(/^[0-9a-f]+$/.test(token), 'should be lowercase hex');
  });

  test('returns unique values on each call', () => {
    const tokens = new Set(Array.from({ length: 20 }, generateSHA512Token));
    assert.strictEqual(tokens.size, 20, 'expected all 20 tokens to be unique');
  });
});

// ─── decodeJWTPayload ───────────────────────────────────────────────────────

describe('decodeJWTPayload', () => {
  function makeJWT(payload) {
    const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${body}.fakesig`;
  }

  test('extracts email and client_id from payload', () => {
    const jwt = makeJWT({ email: 'test@example.com', client_id: 1234, sub: 'test@example.com' });
    const payload = decodeJWTPayload(jwt);
    assert.strictEqual(payload.email, 'test@example.com');
    assert.strictEqual(payload.client_id, 1234);
  });

  test('handles base64url padding correctly', () => {
    // Payloads of various lengths to exercise padding edge cases
    for (const email of ['a@b.co', 'ab@cd.com', 'abc@def.io', 'abcd@efgh.net']) {
      const jwt = makeJWT({ email });
      const payload = decodeJWTPayload(jwt);
      assert.strictEqual(payload.email, email);
    }
  });

  test('throws on malformed JWT (no dots)', () => {
    assert.throws(() => decodeJWTPayload('notajwt'), /Invalid JWT/);
  });

  test('throws on invalid base64 payload', () => {
    // header.!@#$%.sig — invalid chars in payload
    assert.throws(() => decodeJWTPayload('header.!@#$%.sig'));
  });
});

// ─── pollOnce ───────────────────────────────────────────────────────────────

describe('pollOnce', () => {
  function mockFetch(status, body) {
    return async () => ({
      status,
      json: async () => body,
    });
  }

  test('returns key on success response', async () => {
    const fetch = mockFetch(200, {
      status: 'success',
      code: 200,
      message: 'API Key has been retrieved succesfully.',
      data: { key: 'jwt.payload.signature' },
    });
    const result = await pollOnce('portal.test.com', 'abc123', fetch);
    assert.strictEqual(result, 'jwt.payload.signature');
  });

  test('returns null on pending response', async () => {
    const fetch = mockFetch(200, {
      status: 'error',
      code: 400,
      message: 'Failed to get API Key.',
      count: 0,
      data: null,
    });
    const result = await pollOnce('portal.test.com', 'abc123', fetch);
    assert.strictEqual(result, null);
  });

  test('returns null (retry) on 5xx response', async () => {
    const fetch = mockFetch(500, { message: 'Internal Server Error' });
    const result = await pollOnce('portal.test.com', 'abc123', fetch);
    assert.strictEqual(result, null);
  });

  test('returns null (retry) on network error', async () => {
    const fetch = async () => { throw new Error('ECONNREFUSED'); };
    const result = await pollOnce('portal.test.com', 'abc123', fetch);
    assert.strictEqual(result, null);
  });

  test('returns null when data.key is missing', async () => {
    const fetch = mockFetch(200, { status: 'success', code: 200, data: {} });
    const result = await pollOnce('portal.test.com', 'abc123', fetch);
    assert.strictEqual(result, null);
  });

  test('calls the correct URL', async () => {
    let capturedURL;
    const fetch = async (url) => {
      capturedURL = url;
      return { status: 200, json: async () => ({ status: 'error', data: null }) };
    };
    await pollOnce('myportal.com', 'MYTOKEN', fetch);
    assert.strictEqual(capturedURL, 'https://myportal.com/api/api-key/validate/MYTOKEN');
  });
});

// ─── runLoginFlow ───────────────────────────────────────────────────────────

describe('runLoginFlow', () => {
  test('returns key immediately on first successful poll', async () => {
    const fetch = async () => ({
      status: 200,
      json: async () => ({ status: 'success', data: { key: 'the-key' } }),
    });
    const result = await runLoginFlow('portal.test.com', 'tok', {
      pollIntervalMs: 10,
      timeoutMs: 5000,
      fetchFn: fetch,
    });
    assert.strictEqual(result, 'the-key');
  });

  test('returns key after pending then success', async () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      if (calls < 3) {
        return { status: 200, json: async () => ({ status: 'error', data: null }) };
      }
      return { status: 200, json: async () => ({ status: 'success', data: { key: 'late-key' } }) };
    };
    const result = await runLoginFlow('portal.test.com', 'tok', {
      pollIntervalMs: 10,
      timeoutMs: 5000,
      fetchFn: fetch,
    });
    assert.strictEqual(result, 'late-key');
    assert.strictEqual(calls, 3);
  }, { timeout: 500 });

  test('returns null after timeout without success', async () => {
    const fetch = async () => ({
      status: 200,
      json: async () => ({ status: 'error', data: null }),
    });
    const result = await runLoginFlow('portal.test.com', 'tok', {
      pollIntervalMs: 10,
      timeoutMs: 50,
      fetchFn: fetch,
    });
    assert.strictEqual(result, null);
  }, { timeout: 500 });

  test('retries after 5xx and eventually succeeds', async () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      if (calls <= 2) return { status: 503, json: async () => ({}) };
      return { status: 200, json: async () => ({ status: 'success', data: { key: 'recovered' } }) };
    };
    const result = await runLoginFlow('portal.test.com', 'tok', {
      pollIntervalMs: 10,
      timeoutMs: 5000,
      fetchFn: fetch,
    });
    assert.strictEqual(result, 'recovered');
    assert.strictEqual(calls, 3);
  }, { timeout: 500 });

  test('calls onTick for each poll attempt', async () => {
    let ticks = 0;
    let calls = 0;
    const fetch = async () => {
      calls++;
      if (calls < 3) return { status: 200, json: async () => ({ status: 'error', data: null }) };
      return { status: 200, json: async () => ({ status: 'success', data: { key: 'k' } }) };
    };
    await runLoginFlow('portal.test.com', 'tok', {
      pollIntervalMs: 10,
      timeoutMs: 5000,
      fetchFn: fetch,
      onTick: () => ticks++,
    });
    assert.strictEqual(ticks, 3);
  }, { timeout: 500 });
});

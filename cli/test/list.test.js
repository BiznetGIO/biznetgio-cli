import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Force production base URL regardless of local credential file
process.env.BIZNETGIO_BASE_URL = 'https://api.portal.biznetgio.com/v1';
// Prevent reads from the local ~/.biznetgio.json
process.env.BIZNETGIO_CREDENTIALS_PATH = '/dev/null';

const { apiRequest } = await import('../src/client.js');

const BASE_URL = 'https://api.portal.biznetgio.com/v1';
const TEST_KEY = 'test-api-key';

// ─── fetch mock helpers ──────────────────────────────────────────────────────

let originalFetch;

function mockFetch(status, body, { asText = false } = {}) {
  global.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (asText ? body : JSON.stringify(body)),
  });
}

function capturingFetch(status, body) {
  let captured = {};
  global.fetch = async (url, opts) => {
    captured.url = url;
    captured.method = opts?.method;
    captured.headers = opts?.headers;
    captured.body = opts?.body;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    };
  };
  return captured;
}

beforeEach(() => { originalFetch = global.fetch; });
afterEach(() => { global.fetch = originalFetch; });

// ─── apiRequest — core behaviour ────────────────────────────────────────────

describe('apiRequest', () => {
  test('sends x-token header and GET method', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY });
    assert.strictEqual(cap.method, 'GET');
    assert.strictEqual(cap.headers['x-token'], TEST_KEY);
  });

  test('returns parsed JSON body on success', async () => {
    mockFetch(200, [{ id: 1, name: 'test' }]);
    const result = await apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY });
    assert.deepEqual(result, [{ id: 1, name: 'test' }]);
  });

  test('returns raw text when response is not JSON', async () => {
    mockFetch(200, 'plain text response', { asText: true });
    const result = await apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY });
    assert.strictEqual(result, 'plain text response');
  });

  test('throws Error with status code on 4xx response', async () => {
    mockFetch(401, { detail: 'Unauthorized' });
    await assert.rejects(
      () => apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('401'), `expected 401 in message, got: ${err.message}`);
        return true;
      }
    );
  });

  test('throws Error with status code on 5xx response', async () => {
    mockFetch(500, { detail: 'Internal Server Error' });
    await assert.rejects(
      () => apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY }),
      /API Error 500/
    );
  });

  test('propagates network error (ECONNREFUSED)', async () => {
    global.fetch = async () => { throw new Error('ECONNREFUSED'); };
    await assert.rejects(
      () => apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY }),
      /ECONNREFUSED/
    );
  });

  test('propagates DNS resolution failure', async () => {
    global.fetch = async () => { throw new Error('getaddrinfo ENOTFOUND api.portal.biznetgio.com'); };
    await assert.rejects(
      () => apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY }),
      /ENOTFOUND/
    );
  });

  test('propagates fetch timeout error', async () => {
    global.fetch = async () => { throw new Error('The operation was aborted due to timeout'); };
    await assert.rejects(
      () => apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY }),
      /aborted/
    );
  });

  test('appends scalar query params to URL', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY, query: { page: 1, size: 10 } });
    const url = new URL(cap.url);
    assert.strictEqual(url.searchParams.get('page'), '1');
    assert.strictEqual(url.searchParams.get('size'), '10');
  });

  test('appends array query params as repeated keys', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY, query: { status: ['Active', 'Pending'] } });
    const url = new URL(cap.url);
    assert.deepEqual(url.searchParams.getAll('status'), ['Active', 'Pending']);
  });

  test('omits null/undefined query params', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY, query: { status: undefined, page: null } });
    const url = new URL(cap.url);
    assert.strictEqual(url.searchParams.get('status'), null);
    assert.strictEqual(url.searchParams.get('page'), null);
  });

  test('sends JSON body with Content-Type header on POST', async () => {
    const cap = capturingFetch(200, { id: 'new-123' });
    await apiRequest('POST', '/neolites', { apiKey: TEST_KEY, body: { product_id: 'p1', cycle: 'm' } });
    assert.strictEqual(cap.method, 'POST');
    assert.strictEqual(cap.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(cap.body), { product_id: 'p1', cycle: 'm' });
  });
});

// ─── list endpoints — correct URL construction ───────────────────────────────

describe('list endpoint URLs', () => {
  test('neolite list → GET /neolites/accounts', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/neolites/accounts`);
  });

  test('neolite list with status filter', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY, query: { status: ['Active', 'Suspended'] } });
    const url = new URL(cap.url);
    assert.strictEqual(url.pathname, '/v1/neolites/accounts');
    assert.deepEqual(url.searchParams.getAll('status'), ['Active', 'Suspended']);
  });

  test('metal list → GET /baremetals/accounts', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/baremetals/accounts', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/baremetals/accounts`);
  });

  test('metal list with status filter', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/baremetals/accounts', { apiKey: TEST_KEY, query: { status: ['Active'] } });
    const url = new URL(cap.url);
    assert.deepEqual(url.searchParams.getAll('status'), ['Active']);
  });

  test('neolite keypair list → GET /neolites/keypairs/', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/keypairs/', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/neolites/keypairs/`);
  });

  test('metal keypair list → GET /baremetals/keypairs/', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/baremetals/keypairs/', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/baremetals/keypairs/`);
  });

  test('neolite snapshot list → GET /neolites/snapshots/accounts', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/snapshots/accounts', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/neolites/snapshots/accounts`);
  });

  test('neolite disk list → GET /neolites/disks/accounts', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/neolites/disks/accounts', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/neolites/disks/accounts`);
  });

  test('additional-ip list → GET /baremetal-additional-ips', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/baremetal-additional-ips', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/baremetal-additional-ips`);
  });

  test('object-storage list → GET /object-storages/accounts', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/object-storages/accounts', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/object-storages/accounts`);
  });

  test('elastic-storage list → GET /elastic-storages/accounts (via common.js pattern)', async () => {
    const cap = capturingFetch(200, []);
    await apiRequest('GET', '/elastic-storages/accounts', { apiKey: TEST_KEY });
    assert.strictEqual(cap.url, `${BASE_URL}/elastic-storages/accounts`);
  });
});

// ─── error response shapes ───────────────────────────────────────────────────

describe('API error message formatting', () => {
  test('includes JSON error body in thrown message', async () => {
    mockFetch(404, { detail: 'Account not found' });
    await assert.rejects(
      () => apiRequest('GET', '/neolites/accounts/nonexistent', { apiKey: TEST_KEY }),
      (err) => {
        assert.ok(err.message.includes('404'));
        assert.ok(err.message.includes('Account not found'));
        return true;
      }
    );
  });

  test('includes plain text error body in thrown message', async () => {
    mockFetch(403, 'Forbidden', { asText: true });
    await assert.rejects(
      () => apiRequest('GET', '/neolites/accounts', { apiKey: TEST_KEY }),
      (err) => {
        assert.ok(err.message.includes('403'));
        assert.ok(err.message.includes('Forbidden'));
        return true;
      }
    );
  });

  test('422 validation error includes detail', async () => {
    mockFetch(422, { detail: [{ loc: ['body', 'product_id'], msg: 'field required', type: 'value_error.missing' }] });
    await assert.rejects(
      () => apiRequest('POST', '/neolites', { apiKey: TEST_KEY, body: {} }),
      /422/
    );
  });
});

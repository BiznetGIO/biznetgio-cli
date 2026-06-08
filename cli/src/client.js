import { getApiKey as credGetApiKey } from './utils/credentials.js';

const BASE_URL = process.env.BIZNETGIO_BASE_URL || 'https://api.portal.biznetgio.com/v1';

export function getApiKey(cmdOpts) {
  const key = credGetApiKey(cmdOpts?.apiKey);
  if (!key) {
    console.error(
      'Error: API key not set. Run `biznetgio login`, use --api-key flag, or set BIZNETGIO_API_KEY environment variable.'
    );
    process.exit(1);
  }
  return key;
}

export async function apiRequest(method, path, { apiKey, body, query } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v)) {
          v.forEach(item => url.searchParams.append(k, item));
        } else {
          url.searchParams.set(k, v);
        }
      }
    }
  }

  const headers = { 'x-token': apiKey };
  const opts = { method, headers };

  if (body) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), opts);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    throw new Error(`API Error ${res.status}: ${msg}`);
  }

  return data;
}

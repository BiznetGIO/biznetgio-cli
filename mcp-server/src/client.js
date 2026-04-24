import { getApiKey } from './utils/credentials.js';

const BASE_URL = process.env.BIZNETGIO_BASE_URL || 'https://api.portal.biznetgio.com/v1';

export async function apiRequest(method, path, { body, query } = {}) {
  const apiKey = getApiKey();

  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v)) v.forEach(item => url.searchParams.append(k, item));
        else url.searchParams.set(k, v);
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
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`API Error ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
  return data;
}

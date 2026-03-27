import Table from 'cli-table3';
import chalk from 'chalk';

// Extract .data from API response wrapper {success, code, data}
function extractData(data) {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data) {
    return data.data;
  }
  return data;
}

// Keys to skip entirely in table display
const SKIP_KEYS = new Set(['billing_extra']);

// Keys to summarize instead of showing raw
const BILLING_KEY = 'billing';

// Flatten a row for table display
function flattenRow(row) {
  const flat = {};
  for (const [k, v] of Object.entries(row)) {
    if (SKIP_KEYS.has(k)) continue;

    if (v === null || v === undefined) {
      flat[k] = '';
    } else if (k === BILLING_KEY && Array.isArray(v)) {
      const monthly = v.find(b => b.cycle === 'm');
      flat['price/mo'] = monthly ? monthly.price : (v[0] ? v[0].price : '');
    } else if (k === 'specs' && Array.isArray(v)) {
      flat[k] = v.join(', ');
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        flat[k] = '';
      } else if (typeof v[0] !== 'object') {
        flat[k] = v.join(', ');
      } else {
        flat[k] = `[${v.length} items]`;
      }
    } else if (typeof v === 'object') {
      // Inline nested object fields with prefix
      for (const [nk, nv] of Object.entries(v)) {
        if (nv === null || nv === undefined || nv === '') continue;
        if (typeof nv === 'object' && !Array.isArray(nv)) {
          // 2nd level nested: flatten with dot notation
          for (const [nnk, nnv] of Object.entries(nv)) {
            if (nnv !== null && nnv !== undefined && nnv !== '') {
              flat[`${nk}.${nnk}`] = Array.isArray(nnv) ? nnv.join(', ') : String(nnv);
            }
          }
        } else if (Array.isArray(nv)) {
          if (nv.length > 0 && typeof nv[0] !== 'object') {
            flat[nk] = nv.join(', ');
          } else if (nv.length > 0) {
            flat[nk] = `[${nv.length} items]`;
          }
        } else {
          flat[nk] = String(nv);
        }
      }
    } else {
      flat[k] = String(v);
    }
  }
  return flat;
}

// Truncate string to max length
function truncate(str, max = 50) {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

export function output(data, opts = {}) {
  const format = opts.output || 'table';
  const extracted = extractData(data);

  if (format === 'json') {
    console.log(JSON.stringify(extracted, null, 2));
    return;
  }

  if (format === 'table') {
    if (extracted === null || extracted === undefined) {
      console.log('No data found.');
    } else if (Array.isArray(extracted)) {
      printTable(extracted);
    } else if (typeof extracted === 'object') {
      printObject(extracted);
    } else {
      console.log(extracted);
    }
    return;
  }

  console.log(JSON.stringify(extracted, null, 2));
}

function printTable(arr) {
  if (arr.length === 0) {
    console.log('No data found.');
    return;
  }

  // Array of primitives
  if (typeof arr[0] !== 'object') {
    const table = new Table({
      head: [chalk.cyan('#'), chalk.cyan('value')],
      style: { head: [], border: [] },
    });
    arr.forEach((v, i) => table.push([i + 1, String(v)]));
    console.log(table.toString());
    return;
  }

  // Flatten all rows
  const rows = arr.map(flattenRow);

  // Collect all unique keys preserving insertion order
  const keySet = new Set();
  for (const row of rows) {
    for (const k of Object.keys(row)) keySet.add(k);
  }
  const keys = [...keySet];

  const table = new Table({
    head: keys.map(k => chalk.cyan(k)),
    style: { head: [], border: [] },
    wordWrap: true,
  });

  for (const row of rows) {
    table.push(keys.map(k => truncate(row[k] || '', 60)));
  }

  console.log(table.toString());
}

function printObject(obj) {
  const flat = flattenRow(obj);
  const table = new Table({
    style: { head: [], border: [] },
    wordWrap: true,
  });

  for (const [k, v] of Object.entries(flat)) {
    table.push({ [chalk.cyan(k)]: truncate(String(v), 100) });
  }

  console.log(table.toString());
}

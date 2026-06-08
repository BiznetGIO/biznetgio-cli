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

// Keys whose values are masked in table output
const SENSITIVE_KEYS = new Set(['password', 'console_password', 'secret', 'secret_key', 'access_key', 'token']);

// Preferred columns for the compact table view, in display order
const PRIORITY_KEYS = [
  'id', 'name', 'label', 'hostname', 'username', 'bucket',
  'status', 'state', 'ip', 'ip_address', 'price/mo', 'type', 'region',
];

// Max columns shown in the compact table view before hiding the rest
const MAX_TABLE_COLS = 5;

// cli-table3 chars for compact style: only a header separator, no other borders
const COMPACT_CHARS = {
  'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
  'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
  'left': '', 'left-mid': '─', 'mid': '─', 'mid-mid': '─',
  'right': '', 'right-mid': '─', 'middle': '  ',
};

// Pick up to MAX_TABLE_COLS columns: priority keys first, then fill in order
function selectColumns(allKeys) {
  const selected = [];
  for (const k of PRIORITY_KEYS) {
    if (allKeys.includes(k)) selected.push(k);
  }
  for (const k of allKeys) {
    if (selected.length >= MAX_TABLE_COLS) break;
    if (!selected.includes(k)) selected.push(k);
  }
  return selected.slice(0, MAX_TABLE_COLS);
}

// Flatten a row for table display
function flattenRow(row) {
  const flat = {};
  for (const [k, v] of Object.entries(row)) {
    if (SKIP_KEYS.has(k)) continue;

    if (SENSITIVE_KEYS.has(k)) {
      flat[k] = '••••••••';
      continue;
    }

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
        if (SENSITIVE_KEYS.has(nk)) {
          flat[nk] = '••••••••';
        } else if (typeof nv === 'object' && !Array.isArray(nv)) {
          // 2nd level nested: flatten with dot notation
          for (const [nnk, nnv] of Object.entries(nv)) {
            if (nnv !== null && nnv !== undefined && nnv !== '') {
              flat[`${nk}.${nnk}`] = SENSITIVE_KEYS.has(nnk) ? '••••••••' : (Array.isArray(nnv) ? nnv.join(', ') : String(nnv));
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

  if (extracted === null || extracted === undefined) {
    console.log('No data found.');
    return;
  }

  // Vertical view: each record as a key:value block. Best for many fields.
  if (format === 'list') {
    if (Array.isArray(extracted)) {
      printList(extracted);
    } else if (typeof extracted === 'object') {
      printObject(extracted);
    } else {
      console.log(String(extracted));
    }
    return;
  }

  // Default compact table (column-limited for arrays)
  if (format === 'table') {
    if (Array.isArray(extracted)) {
      printTable(extracted);
    } else if (typeof extracted === 'object') {
      printObject(extracted);
    } else {
      console.log(String(extracted));
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
  const allKeys = [...keySet];

  // Limit to priority columns so wide data stays readable
  const keys = selectColumns(allKeys);
  const hidden = allKeys.length - keys.length;

  const table = new Table({
    head: keys.map(k => chalk.cyan(k)),
    chars: COMPACT_CHARS,
    style: { head: [], border: [] },
    wordWrap: false,
  });

  for (const row of rows) {
    table.push(keys.map(k => truncate(row[k] || '', 40)));
  }

  console.log(table.toString());

  if (hidden > 0) {
    console.log(chalk.dim(`\n… +${hidden} more column${hidden > 1 ? 's' : ''} hidden. Use --output list or --output json to see all fields.`));
  }
}

// Vertical list: render each record as a key:value block separated by a rule
function printList(arr) {
  if (arr.length === 0) {
    console.log('No data found.');
    return;
  }

  if (typeof arr[0] !== 'object') {
    arr.forEach((v, i) => console.log(`${chalk.dim(`[${i + 1}]`)} ${String(v)}`));
    return;
  }

  arr.forEach((row, i) => {
    const flat = flattenRow(row);
    const keyWidth = Math.max(...Object.keys(flat).map(k => k.length), 0);
    if (i > 0) console.log(chalk.dim('─'.repeat(40)));
    for (const [k, v] of Object.entries(flat)) {
      console.log(`${chalk.cyan(k.padEnd(keyWidth))}  ${truncate(String(v), 100)}`);
    }
  });
}

// Single record: aligned key/value pairs, no per-row separators
function printObject(obj) {
  const flat = flattenRow(obj);
  const keyWidth = Math.max(...Object.keys(flat).map(k => k.length), 0);
  for (const [k, v] of Object.entries(flat)) {
    console.log(`${chalk.cyan(k.padEnd(keyWidth))}  ${truncate(String(v), 100)}`);
  }
}

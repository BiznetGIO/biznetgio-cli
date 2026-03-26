import Table from 'cli-table3';
import chalk from 'chalk';

// Extract .data from API response wrapper {success, code, data}
function extractData(data) {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data) {
    return data.data;
  }
  return data;
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

  // If array of primitives (strings, numbers)
  if (typeof arr[0] !== 'object') {
    const table = new Table({
      head: [chalk.cyan('#'), chalk.cyan('value')],
      style: { head: [], border: [] },
    });
    arr.forEach((v, i) => table.push([i + 1, String(v)]));
    console.log(table.toString());
    return;
  }

  const keys = Object.keys(arr[0]);
  const table = new Table({
    head: keys.map(k => chalk.cyan(k)),
    style: { head: [], border: [] },
  });

  for (const row of arr) {
    table.push(keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    }));
  }

  console.log(table.toString());
}

function printObject(obj) {
  const table = new Table({
    style: { head: [], border: [] },
  });

  for (const [k, v] of Object.entries(obj)) {
    const val = v === null || v === undefined ? '' :
      typeof v === 'object' ? JSON.stringify(v) : String(v);
    table.push({ [chalk.cyan(k)]: val });
  }

  console.log(table.toString());
}

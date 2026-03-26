import Table from 'cli-table3';
import chalk from 'chalk';

export function output(data, opts = {}) {
  const format = opts.output || 'json';

  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (format === 'table') {
    if (Array.isArray(data)) {
      printTable(data);
    } else if (typeof data === 'object' && data !== null) {
      printObject(data);
    } else {
      console.log(data);
    }
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

function printTable(arr) {
  if (arr.length === 0) {
    console.log('No data found.');
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

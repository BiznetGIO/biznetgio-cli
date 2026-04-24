import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { performLogout } from '../src/commands/logout.js';

let tmpDir;

describe('performLogout', () => {
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bng-logout-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns "deleted" and removes the file when it exists', () => {
    const credPath = join(tmpDir, '.biznetgio.json');
    writeFileSync(credPath, '{"api_key":"k"}');
    const result = performLogout(credPath);
    assert.strictEqual(result, 'deleted');
    assert.strictEqual(existsSync(credPath), false);
  });

  test('returns "not_found" when file does not exist', () => {
    const credPath = join(tmpDir, '.biznetgio.json');
    const result = performLogout(credPath);
    assert.strictEqual(result, 'not_found');
  });

  test('rethrows non-ENOENT filesystem errors', () => {
    // Passing a directory path triggers an error that is not ENOENT → must be rethrown
    assert.throws(
      () => performLogout(tmpDir),
      (err) => err.code !== 'ENOENT'
    );
  });
});

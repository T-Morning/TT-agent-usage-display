import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const source = new URL('../outputs/TTJL-Quota-Companion/scripts/mac-entry.sh', import.meta.url);

test('command launcher finds Homebrew Node with Finder-style PATH and preserves result', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'quota installer '));
  try {
    mkdirSync(path.join(root, 'scripts'));
    const runtime = path.join(root, 'homebrew node');
    writeFileSync(runtime, '#!/bin/bash\nif [ "$1" = "-e" ]; then exit 0; fi\n[ "$1" = "./manage.cjs" ] && [ "$2" = "install" ] && exit 23\nexit 99\n', {mode: 0o755});
    // Isolate app/PATH probes; map the actual Homebrew fallback to our test runtime.
    const script = readFileSync(source, 'utf8')
      .replaceAll('/Applications/', '/missing-applications/')
      .replace('"$(command -v node 2>/dev/null || true)"', '"/missing-node"')
      .replace('/opt/homebrew/bin/node', runtime);
    const entry = path.join(root, 'scripts/mac-entry.sh');
    writeFileSync(entry, script);
    const result = spawnSync('/bin/bash', [entry, 'install'], {
      env: {HOME: root, PATH: '/usr/bin:/bin:/usr/sbin:/sbin'}, input: '\n', encoding: 'utf8'
    });
    assert.equal(result.status, 23, result.stderr + result.stdout);
    assert.doesNotMatch(result.stdout, /未找到/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

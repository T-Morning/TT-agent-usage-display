import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileChecksum, patchProductChecksum, patchWorkbenchHtml, unpatchWorkbenchHtml} from '../integrations/cursor-billing/install-cursor.mjs';
import {agentPlist, installRelease, label, uninstallRelease} from '../integrations/cursor-billing/release-install.mjs';

test('workbench patch is idempotent', () => {
  const html = '<script src="./workbench.js" type="module"></script>\n</html>\n';
  const once = patchWorkbenchHtml(html);
  assert.match(once, /huanling-billing\.js/);
  assert.equal(patchWorkbenchHtml(once), once);
});

test('product checksum replacement keeps the rest of the file', () => {
  const json = '{"checksums":{"vs/code/electron-sandbox/workbench/workbench.html": "old"}}';
  const next = patchProductChecksum(json, fileChecksum(Buffer.from('workbench')));
  assert.equal(next.includes('old'), false);
  assert.match(next, /workbench\.html": "[A-Za-z0-9+/]{43}"/);
});

test('workbench unpatch removes the chip script', () => {
  const html = '<script src="./workbench.js" type="module"></script>\n</html>\n';
  const patched = patchWorkbenchHtml(html);
  const removed = unpatchWorkbenchHtml(patched);
  assert.equal(removed.includes('huanling-billing.js'), false);
  assert.match(removed, /workbench\.js/);
});

test('release install copies the reader and can be removed', () => {
  const home = mkdtempSync(join(tmpdir(), 'huanling-cursor-'));
  const app = join(home, 'Cursor.app');
  const workbench = join(app, 'Contents', 'Resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench');
  mkdirSync(workbench, {recursive:true});
  writeFileSync(join(workbench, 'workbench.html'), '<script src="./workbench.js" type="module"></script>\n</html>\n');
  writeFileSync(join(app, 'Contents', 'Resources', 'app', 'product.json'), '{"checksums":{"vs/code/electron-sandbox/workbench/workbench.html": "old"}}');
  const sourceDir = join(import.meta.dirname, '..');
  const installed = installRelease({sourceDir, home, nodePath:'/usr/local/bin/node', app, launch:false});
  const html = readFileSync(join(workbench, 'workbench.html'), 'utf8');
  assert.match(html, /huanling-billing\.js/);
  assert.equal(readFileSync(join(workbench, 'huanling-billing.js'), 'utf8').includes('cursor-billing-chip'), true);
  const plist = readFileSync(installed.plistPath, 'utf8');
  assert.match(plist, new RegExp(label));
  assert.match(plist, /summary-server\.mjs/);
  assert.match(agentPlist({nodePath:'/bin/node', serverPath:'/tmp/a&b.mjs'}), /\/tmp\/a&amp;b\.mjs/);
  uninstallRelease({home, app, launch:false});
  assert.equal(readFileSync(join(workbench, 'workbench.html'), 'utf8').includes('huanling-billing.js'), false);
  assert.equal(readFileSync(join(app, 'Contents', 'Resources', 'app', 'product.json'), 'utf8').includes('old'), false);
});

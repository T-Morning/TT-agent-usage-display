import test from 'node:test';
import assert from 'node:assert/strict';
import {fileChecksum, patchProductChecksum, patchWorkbenchHtml} from '../integrations/cursor-billing/install-cursor.mjs';

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

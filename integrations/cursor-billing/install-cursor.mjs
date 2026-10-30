import {createHash} from 'node:crypto';
import {copyFileSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const workbenchDir = '/Applications/Cursor.app/Contents/Resources/app/out/vs/code/electron-sandbox/workbench';
const marker = 'huanling-billing.js';

export function patchWorkbenchHtml(html) {
  if (html.includes(marker)) return html;
  return html.replace('</html>', `\t<script src="./${marker}" type="module"></script>\n</html>\n`);
}

export function fileChecksum(bytes) {
  return createHash('sha256').update(bytes).digest('base64').replace(/=+$/, '');
}

const htmlChecksumKey = 'vs/code/electron-sandbox/workbench/workbench.html';

export function patchProductChecksum(json, checksum) {
  const key = `"${htmlChecksumKey}": "`;
  const start = json.indexOf(key);
  if (start < 0) throw new Error('找不到工作台校验值');
  const valueStart = start + key.length;
  const valueEnd = json.indexOf('"', valueStart);
  return json.slice(0, valueStart) + checksum + json.slice(valueEnd);
}

export function installCursorBilling({
  htmlPath = join(workbenchDir, 'workbench.html'),
  dir = workbenchDir,
  productPath = '/Applications/Cursor.app/Contents/Resources/app/product.json'
} = {}) {
  copyFileSync(join(here, 'huanling-billing-logic.js'), join(dir, 'huanling-billing-logic.js'));
  copyFileSync(join(here, 'huanling-billing.js'), join(dir, marker));
  const next = patchWorkbenchHtml(readFileSync(htmlPath, 'utf8'));
  writeFileSync(htmlPath, next);
  const product = readFileSync(productPath, 'utf8');
  writeFileSync(productPath, patchProductChecksum(product, fileChecksum(readFileSync(htmlPath))));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  installCursorBilling();
  console.log('已写入 Cursor 顶部栏。重新加载窗口后，金额会出现在窗口最上方正中。');
}

import {createHash} from 'node:crypto';
import {readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const workbenchDir = '/Applications/Cursor.app/Contents/Resources/app/out/vs/code/electron-sandbox/workbench';
const marker = 'huanling-billing.js';

const scriptTag = `\t<script src="./${marker}" type="module"></script>\n`;

export function patchWorkbenchHtml(html) {
  if (html.includes(marker)) return html;
  return html.replace('</html>', `${scriptTag}</html>\n`);
}

export function unpatchWorkbenchHtml(html) {
  return html.replaceAll(scriptTag, '').replaceAll(`<script src="./${marker}" type="module"></script>\n`, '');
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

function placeFile(source, target) {
  writeFileSync(target, readFileSync(source));
}

export function installCursorBilling({
  htmlPath = join(workbenchDir, 'workbench.html'),
  dir = workbenchDir,
  productPath = '/Applications/Cursor.app/Contents/Resources/app/product.json'
} = {}) {
  placeFile(join(here, 'huanling-billing-logic.js'), join(dir, 'huanling-billing-logic.js'));
  placeFile(join(here, 'huanling-billing.js'), join(dir, marker));
  const next = patchWorkbenchHtml(readFileSync(htmlPath, 'utf8'));
  writeFileSync(htmlPath, next);
  const product = readFileSync(productPath, 'utf8');
  writeFileSync(productPath, patchProductChecksum(product, fileChecksum(readFileSync(htmlPath))));
}

export function uninstallCursorBilling({
  htmlPath = join(workbenchDir, 'workbench.html'),
  dir = workbenchDir,
  productPath = '/Applications/Cursor.app/Contents/Resources/app/product.json'
} = {}) {
  const next = unpatchWorkbenchHtml(readFileSync(htmlPath, 'utf8'));
  writeFileSync(htmlPath, next);
  rmSync(join(dir, 'huanling-billing-logic.js'), {force:true});
  rmSync(join(dir, marker), {force:true});
  rmSync(join(dir, 'huanling-billing.json'), {force:true});
  const product = readFileSync(productPath, 'utf8');
  writeFileSync(productPath, patchProductChecksum(product, fileChecksum(readFileSync(htmlPath))));
}

function pathsFromArgv(argv) {
  const paths = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--html') paths.htmlPath = argv[++index];
    else if (argv[index] === '--dir') paths.dir = argv[++index];
    else if (argv[index] === '--product') paths.productPath = argv[++index];
  }
  return paths;
}

export function isDirectRun(entry = process.argv[1], moduleUrl = import.meta.url) {
  if (!entry) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(entry);
  } catch {
    return fileURLToPath(moduleUrl) === entry;
  }
}

if (isDirectRun()) {
  const action = process.argv[2];
  const paths = pathsFromArgv(process.argv.slice(3));
  if (action === 'uninstall') uninstallCursorBilling(paths);
  else if (action === 'install') installCursorBilling(paths);
  else {
    installCursorBilling();
    console.log('已写入 Cursor 顶部栏。请用 Cmd+Q 完全退出 Cursor，再重新打开。');
  }
}

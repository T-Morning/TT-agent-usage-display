import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundleFiles} from './release-install.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
export const cursorZipPath = join(root, 'outputs', 'Huanling-Cursor-macOS-v0.1.0.zip');

const layout = [
  ['integrations/cursor-billing/mac/安装.command', '安装.command', 0o755],
  ['integrations/cursor-billing/mac/卸载.command', '卸载.command', 0o755],
  ['integrations/cursor-billing/mac/说明.txt', '说明.txt', 0o644],
  ...bundleFiles.map(relative => [relative, relative, 0o644]),
  ['integrations/cursor-billing/release-install.mjs', 'integrations/cursor-billing/release-install.mjs', 0o644]
];

export function buildCursorZip(output = cursorZipPath) {
  mkdirSync(dirname(output), {recursive:true});
  const script = `
import sys, zipfile
from pathlib import Path
root = Path(sys.argv[1])
output = Path(sys.argv[2])
folder = "Huanling-Cursor-macOS"
rows = sys.argv[3:]
with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for row in rows:
        source, name, mode = row.split("\\t")
        info = zipfile.ZipInfo(f"{folder}/{name}")
        info.flag_bits |= 0x800
        info.create_system = 3
        info.external_attr = (0o100000 | int(mode, 8)) << 16
        archive.writestr(info, (root / source).read_bytes())
`;
  const rows = layout.map(([source, name, mode]) => `${source}\t${name}\t${mode.toString(8)}`);
  const result = spawnSync('python3', ['-c', script, root, output, ...rows], {encoding:'utf8'});
  if (result.status !== 0) throw new Error(result.stderr || '打包失败');
  return output;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(buildCursorZip());
}

import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
export const claudeZipPath = join(root, 'outputs', 'Huanling-Claude-macOS-v0.1.0.zip');

const layout = [
  ['integrations/claude-usage/mac/安装.command', '安装.command', 0o755],
  ['integrations/claude-usage/mac/卸载.command', '卸载.command', 0o755],
  ['integrations/claude-usage/mac/说明.txt', '说明.txt', 0o644],
  ['integrations/claude-usage/chip.js', 'integrations/claude-usage/chip.js', 0o644],
  ['integrations/claude-usage/install-claude.mjs', 'integrations/claude-usage/install-claude.mjs', 0o644],
  ['integrations/claude-usage/summary-server.mjs', 'integrations/claude-usage/summary-server.mjs', 0o644],
  ['src/claude-usage.mjs', 'src/claude-usage.mjs', 0o644]
];

export function buildClaudeZip(output = claudeZipPath) {
  mkdirSync(dirname(output), {recursive:true});
  const script = `
import sys, zipfile
from pathlib import Path
root = Path(sys.argv[1])
output = Path(sys.argv[2])
folder = "Huanling-Claude-macOS"
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
  console.log(buildClaudeZip());
}

import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {installCursorBilling, uninstallCursorBilling} from './install-cursor.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const label = 'com.ttjl.cursor-billing';
export const bundleFiles = [
  'integrations/cursor-billing/huanling-billing.js',
  'integrations/cursor-billing/huanling-billing-logic.js',
  'integrations/cursor-billing/install-cursor.mjs',
  'integrations/cursor-billing/summary-server.mjs',
  'src/cursor-billing.mjs',
  'src/cursor-secret.mjs',
  'src/cursor-session.mjs'
];

export function cursorBillingHome(home = homedir()) {
  return join(home, 'Library', 'Application Support', 'Huanling', 'CursorBilling');
}

export function launchAgentPath(home = homedir()) {
  return join(home, 'Library', 'LaunchAgents', `${label}.plist`);
}

export function findCursorApp(home = homedir()) {
  const candidates = [process.env.CURSOR_APP, '/Applications/Cursor.app', join(home, 'Applications', 'Cursor.app')].filter(Boolean);
  for (const app of candidates) {
    if (existsSync(join(app, 'Contents', 'Resources', 'app', 'product.json'))) return app;
  }
  throw new Error('找不到 Cursor.app。请先安装 Cursor。');
}

export function cursorPaths(app) {
  const resources = join(app, 'Contents', 'Resources', 'app');
  const dir = join(resources, 'out', 'vs', 'code', 'electron-sandbox', 'workbench');
  return {dir, htmlPath:join(dir, 'workbench.html'), productPath:join(resources, 'product.json')};
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function agentPlist({nodePath, serverPath, logPath = '/tmp/huanling-billing-server.log'}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(nodePath)}</string>
    <string>${xmlEscape(serverPath)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(logPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(logPath)}</string>
</dict>
</plist>
`;
}

export function copyBundle(sourceDir, destDir) {
  for (const relative of bundleFiles) {
    const target = join(destDir, relative);
    mkdirSync(dirname(target), {recursive:true});
    cpSync(join(sourceDir, relative), target);
  }
}

function domain() {
  return `gui/${process.getuid()}`;
}

function enableAgent(plistPath) {
  const target = `${domain()}/${label}`;
  try { execFileSync('launchctl', ['bootout', target], {stdio:'ignore'}); } catch { /* not loaded yet */ }
  execFileSync('launchctl', ['bootstrap', domain(), plistPath], {stdio:'inherit'});
  execFileSync('launchctl', ['kickstart', '-k', target], {stdio:'inherit'});
}

function disableAgent() {
  try { execFileSync('launchctl', ['bootout', `${domain()}/${label}`], {stdio:'ignore'}); } catch { /* already stopped */ }
}

export function installRelease({
  sourceDir = join(here, '..', '..'),
  home = homedir(),
  nodePath = process.execPath,
  app = findCursorApp(home),
  launch = true
} = {}) {
  const root = cursorBillingHome(home);
  copyBundle(sourceDir, root);
  installCursorBilling(cursorPaths(app));
  const plistPath = launchAgentPath(home);
  mkdirSync(dirname(plistPath), {recursive:true});
  writeFileSync(plistPath, agentPlist({
    nodePath,
    serverPath:join(root, 'integrations', 'cursor-billing', 'summary-server.mjs')
  }));
  if (launch) enableAgent(plistPath);
  return {root, plistPath, app};
}

export function uninstallRelease({
  home = homedir(),
  app = findCursorApp(home),
  launch = true
} = {}) {
  if (launch) disableAgent();
  rmSync(launchAgentPath(home), {force:true});
  uninstallCursorBilling(cursorPaths(app));
  rmSync(cursorBillingHome(home), {recursive:true, force:true});
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2] === 'uninstall' ? 'uninstall' : 'install';
  try {
    if (command === 'uninstall') {
      uninstallRelease();
      console.log('已卸下 Cursor 顶部圆环。请用 Cmd+Q 完全退出 Cursor，再重新打开。');
    } else {
      installRelease();
      console.log('已安装 Cursor 顶部圆环。请用 Cmd+Q 完全退出 Cursor，再重新打开。个人按量会显示在窗口最上方正中。');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : '安装失败');
    process.exitCode = 1;
  }
}

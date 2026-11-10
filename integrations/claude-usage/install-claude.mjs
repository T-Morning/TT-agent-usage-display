import {execFileSync} from 'node:child_process';
import {chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const marker = 'huanling-claude-usage';
export const label = 'com.ttjl.claude-usage';
const mainFile = join('Contents', 'Resources', 'app.asar', '.vite', 'build', 'index.pre.js');

export function claudePreloadPath(app) {
  return resolve(join(app, mainFile), '..', '..', '..', '..', 'preload', 'default.js');
}

export function preloadSource() {
  const chip = readFileSync(join(here, 'chip.js'), 'utf8').replace(/^export function /m, 'function ');
  return `/* ${marker} */\n${chip}\nconst HUANLING_USAGE = 'http://127.0.0.1:39232/usage';\nasync function huanlingRefresh() {\n  let view = {fiveHour:{remaining:null,text:''},week:{remaining:null,text:''},detail:''};\n  try {\n    const response = await fetch(HUANLING_USAGE);\n    if (response.ok) view = await response.json();\n  } catch { /* keep the empty rings */ }\n  if (document.documentElement) mountClaudeUsageChip(document, view);\n}\nfunction huanlingBoot() {\n  huanlingRefresh();\n  setInterval(huanlingRefresh, 60000);\n}\nif (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', huanlingBoot);\nelse huanlingBoot();\n`;
}

function openAppManagementSettings() {
  const panes = [
    'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AppBundles',
    'x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles'
  ];
  for (const pane of panes) {
    try {
      execFileSync('open', [pane], {stdio:'ignore'});
      return;
    } catch { /* this macOS build uses another settings address */ }
  }
}

export function installPreload(app) {
  const target = claudePreloadPath(app);
  if (existsSync(target) && !readFileSync(target, 'utf8').includes(marker)) {
    throw new Error('Claude 的预加载脚本已存在，已停止写入。');
  }
  try {
    mkdirSync(dirname(target), {recursive:true});
    writeFileSync(target, preloadSource());
  } catch (error) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      openAppManagementSettings();
      throw new Error('还不能修改 Claude。请在刚打开的「系统设置 → 隐私与安全性 → App 管理」里允许 Cursor，然后告诉我再装一次。');
    }
    throw error;
  }
  return target;
}

export function uninstallPreload(app) {
  const target = claudePreloadPath(app);
  if (!existsSync(target)) return target;
  if (!readFileSync(target, 'utf8').includes(marker)) throw new Error('预加载脚本不是环灵写入的，未删除。');
  rmSync(target);
  return target;
}

export function supportRoot(home = homedir()) {
  return join(home, 'Library', 'Application Support', 'Huanling', 'ClaudeUsage');
}

export function launchAgentPath(home = homedir()) {
  return join(home, 'Library', 'LaunchAgents', `${label}.plist`);
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function agentPlist({nodePath, serverPath, logPath}) {
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

function domain() {
  return `gui/${process.getuid()}`;
}

function enableAgent(plistPath) {
  const target = `${domain()}/${label}`;
  try { execFileSync('launchctl', ['bootout', target], {stdio:'ignore'}); } catch { /* not loaded yet */ }
  try {
    execFileSync('launchctl', ['bootstrap', domain(), plistPath], {stdio:'pipe'});
  } catch { /* already registered */ }
  try { execFileSync('launchctl', ['kickstart', '-k', target], {stdio:'pipe'}); } catch { /* the existing service keeps running */ }
}

function disableAgent() {
  try { execFileSync('launchctl', ['bootout', `${domain()}/${label}`], {stdio:'ignore'}); } catch { /* already stopped */ }
}

export function installClaudeUsage({
  app = '/Applications/Claude.app',
  home = homedir(),
  nodePath = process.execPath,
  sourceDir = here,
  launch = true
} = {}) {
  if (!existsSync(join(app, 'Contents', 'Info.plist'))) throw new Error('找不到 Claude.app。');
  const root = supportRoot(home);
  mkdirSync(join(root, 'integrations', 'claude-usage'), {recursive:true});
  mkdirSync(join(root, 'src'), {recursive:true});
  for (const [from, to] of [
    [join(sourceDir, 'summary-server.mjs'), join(root, 'integrations', 'claude-usage', 'summary-server.mjs')],
    [join(sourceDir, '..', '..', 'src', 'claude-usage.mjs'), join(root, 'src', 'claude-usage.mjs')]
  ]) {
    cpSync(from, to);
    chmodSync(to, 0o644);
  }
  const preloadPath = installPreload(app);
  const plistPath = launchAgentPath(home);
  mkdirSync(dirname(plistPath), {recursive:true});
  const logPath = join(home, 'Library', 'Logs', 'huanling-claude-usage.log');
  writeFileSync(plistPath, agentPlist({
    nodePath,
    serverPath:join(root, 'integrations', 'claude-usage', 'summary-server.mjs'),
    logPath
  }));
  if (launch) enableAgent(plistPath);
  return {preloadPath, plistPath, root};
}

export function uninstallClaudeUsage({
  app = '/Applications/Claude.app',
  home = homedir(),
  launch = true
} = {}) {
  uninstallPreload(app);
  if (launch) disableAgent();
  rmSync(supportRoot(home), {recursive:true, force:true});
  rmSync(launchAgentPath(home), {force:true});
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2] === 'uninstall' ? 'uninstall' : 'install';
  try {
    if (command === 'uninstall') {
      uninstallClaudeUsage();
      console.log('已卸下 Claude 顶部圆环。请用 Cmd+Q 完全退出 Claude，再重新打开。');
    } else {
      installClaudeUsage();
      console.log('已安装 Claude 顶部圆环。请用 Cmd+Q 完全退出 Claude，再重新打开。5 小时和每周额度在窗口最上方正中。');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : '安装失败');
    process.exitCode = 1;
  }
}

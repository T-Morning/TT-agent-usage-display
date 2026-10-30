const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {windowsLayout, codexDesktopCandidates, agentLauncher, codexLauncher, schtasksCreateArgs, schtasksDeleteArgs} = require('./layout.cjs');

const copied = ['agent.cjs', 'manage.cjs', 'windows/layout.cjs', 'windows/cli.cjs'];

function findCodex(home, env) {
  return codexDesktopCandidates(home, env, env.CODEX_BADGE_APP || '').find(file => {
    try { return fs.statSync(file).isFile(); } catch { return false; }
  }) || '';
}

function install({sourceDir = __dirname ? path.join(__dirname, '..') : '', home = os.homedir(), env = process.env, nodePath = process.execPath} = {}) {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 22) throw new Error('Windows 安装需要 Node.js 22 或更新版本');
  const layout = windowsLayout(home, env);
  const appPath = findCodex(home, env);
  fs.mkdirSync(layout.logs, {recursive: true});
  for (const name of copied) {
    const target = path.join(layout.installDir, name);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(sourceDir, name), target);
  }
  const agentCmd = path.join(layout.installDir, 'run-agent.cmd');
  const openCmd = path.join(layout.installDir, '启动环灵.cmd');
  fs.writeFileSync(agentCmd, agentLauncher({nodePath, installDir: layout.installDir, appPath}), {encoding: 'utf8'});
  fs.writeFileSync(openCmd, appPath ? codexLauncher(appPath) : '@echo off\r\necho 未找到 Codex.exe。请安装 Codex 桌面版后重新运行安装。\r\n', {encoding: 'utf8'});
  fs.writeFileSync(path.join(layout.installDir, 'installed-version.json'), JSON.stringify({schema: 1, platform: 'win32', version: '0.1.0', app: appPath, node: nodePath}) + '\n', {encoding: 'utf8'});
  execFileSync('schtasks', schtasksCreateArgs(layout.taskName, agentCmd), {stdio: 'inherit', windowsHide: true});
  console.log(appPath
    ? `已安装到 ${layout.installDir}。请完全退出 Codex，再双击 ${openCmd}。登录后环灵会在侧栏加载。`
    : `后台已安装到 ${layout.installDir}，但没有找到 Codex.exe。安装 Codex 桌面版后请重新运行安装。`);
}

function uninstall({home = os.homedir(), env = process.env} = {}) {
  const layout = windowsLayout(home, env);
  try { execFileSync('schtasks', schtasksDeleteArgs(layout.taskName), {stdio: 'ignore', windowsHide: true}); } catch {}
  fs.rmSync(layout.installDir, {recursive: true, force: true});
  console.log(`已卸载。计划任务已删除，目录已移除：${layout.installDir}`);
}

function status({home = os.homedir(), env = process.env} = {}) {
  const layout = windowsLayout(home, env);
  let task = '未注册';
  try {
    execFileSync('schtasks', ['/Query', '/TN', layout.taskName], {stdio: 'ignore', windowsHide: true});
    task = '已注册';
  } catch {}
  console.log('版本：0.1.0');
  console.log('平台：Windows');
  console.log('安装目录：' + layout.installDir);
  console.log('登录任务：' + task);
  console.log('Codex：' + (findCodex(home, env) || '未找到'));
}

async function main(argv) {
  const action = argv[0];
  if (action === 'install') install();
  else if (action === 'uninstall') uninstall();
  else if (action === 'status') status();
  else throw new Error('Windows 上可用操作：install、uninstall、status');
}

module.exports = {install, uninstall, status, main, findCodex};

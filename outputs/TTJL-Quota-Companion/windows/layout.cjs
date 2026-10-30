const path = require('node:path').win32;

function windowsLayout(home, env = {}) {
  const roaming = env.APPDATA || path.join(home, 'AppData', 'Roaming');
  const local = env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const installDir = path.join(roaming, 'Huanling');
  return {installDir, logs: path.join(installDir, 'logs'), taskName: 'Huanling', local, roaming};
}

function codexDesktopCandidates(home, env = {}, explicit = '') {
  const {local} = windowsLayout(home, env);
  const programFiles = env.ProgramFiles || 'C:\\Program Files';
  return [explicit, path.join(local, 'Programs', 'Codex', 'Codex.exe'), path.join(local, 'Programs', 'codex', 'Codex.exe'), path.join(local, 'OpenAI', 'Codex', 'Codex.exe'), path.join(local, 'OpenAI', 'Codex', 'app', 'Codex.exe'), path.join(programFiles, 'Codex', 'Codex.exe'), path.join(local, 'Programs', 'ChatGPT', 'ChatGPT.exe')].filter(Boolean);
}

function quoteCmd(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function agentLauncher({nodePath, installDir, appPath}) {
  return `@echo off\r\nset CODEX_BADGE_APP=${appPath}\r\nset CODEX_BADGE_PORT=39222\r\n${quoteCmd(nodePath)} ${quoteCmd(path.join(installDir, 'agent.cjs'))}\r\n`;
}

function codexLauncher(appPath) {
  return `@echo off\r\nstart "" ${quoteCmd(appPath)} --remote-debugging-address=127.0.0.1 --remote-debugging-port=39222\r\n`;
}

function schtasksCreateArgs(taskName, commandPath) {
  return ['/Create', '/F', '/TN', taskName, '/SC', 'ONLOGON', '/RL', 'LIMITED', '/TR', `cmd.exe /c ${quoteCmd(commandPath)}`];
}

function schtasksDeleteArgs(taskName) {
  return ['/Delete', '/F', '/TN', taskName];
}

module.exports = {windowsLayout, codexDesktopCandidates, quoteCmd, agentLauncher, codexLauncher, schtasksCreateArgs, schtasksDeleteArgs};

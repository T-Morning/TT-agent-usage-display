import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {windowsLayout, codexDesktopCandidates, agentLauncher, codexLauncher, schtasksCreateArgs, schtasksDeleteArgs} = require('../outputs/TTJL-Quota-Companion/windows/layout.cjs');

test('windows install lives in roaming app data', () => {
  const layout = windowsLayout('C:\\Users\\Ada', {APPDATA: 'D:\\Roaming', LOCALAPPDATA: 'D:\\Local'});
  assert.equal(layout.installDir, 'D:\\Roaming\\Huanling');
  assert.equal(layout.logs, 'D:\\Roaming\\Huanling\\logs');
  assert.equal(layout.taskName, 'Huanling');
});

test('codex candidates prefer an explicit path and the local programs folder', () => {
  const found = codexDesktopCandidates('C:\\Users\\Ada', {LOCALAPPDATA: 'D:\\Local', ProgramFiles: 'E:\\PF'}, 'E:\\Apps\\Codex.exe');
  assert.equal(found[0], 'E:\\Apps\\Codex.exe');
  assert.equal(found[1], 'D:\\Local\\Programs\\Codex\\Codex.exe');
  assert.ok(found.includes('E:\\PF\\Codex\\Codex.exe'));
});

test('launchers quote paths and the logon task calls the agent command', () => {
  const agent = agentLauncher({nodePath: 'C:\\Program Files\\nodejs\\node.exe', installDir: 'D:\\Roaming\\Huanling', appPath: 'D:\\Local\\Programs\\Codex\\Codex.exe'});
  assert.match(agent, /"C:\\Program Files\\nodejs\\node.exe"/);
  assert.match(agent, /CODEX_BADGE_PORT=39222/);
  const open = codexLauncher('D:\\Local\\Programs\\Codex\\Codex.exe');
  assert.match(open, /remote-debugging-port=39222/);
  assert.deepEqual(schtasksCreateArgs('Huanling', 'D:\\Roaming\\Huanling\\run-agent.cmd').slice(0, 8), ['/Create', '/F', '/TN', 'Huanling', '/SC', 'ONLOGON', '/RL', 'LIMITED']);
  assert.deepEqual(schtasksDeleteArgs('Huanling'), ['/Delete', '/F', '/TN', 'Huanling']);
});

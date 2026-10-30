import test from 'node:test';
import assert from 'node:assert/strict';
import {agentPlist,installPaths} from '../scripts/embedded-config.mjs';
test('use isolated user-level install and launch-agent paths',()=>{
 const p=installPaths('/Users/test user');
 assert.equal(p.directory,'/Users/test user/Library/Application Support/TTJLQuotaPanel');
 assert.equal(p.plist,'/Users/test user/Library/LaunchAgents/com.ttjl.codex-quota-panel.plist');
});
test('plist keeps absolute executable paths and escapes XML',()=>{
 const xml=agentPlist({home:'/Users/测 & 试',node:'/usr/local/bin/node',codex:'/Users/a & b/codex'});
 assert.match(xml,/<string>\/usr\/local\/bin\/node<\/string>/);
 assert.match(xml,/a &amp; b\/codex/);
 assert.match(xml,/<key>RunAtLoad<\/key><true\/>/);
 assert.match(xml,/<key>PORT<\/key><string>4319<\/string>/);
 assert.ok(!xml.includes('/Applications/ChatGPT.app'));
});

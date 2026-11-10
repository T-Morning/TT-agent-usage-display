import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {claudeUsageView, normalizeClaudeUsage, percentUsed, usageFromHistory} from '../src/claude-usage.mjs';
import {claudePreloadPath, installPreload, marker, uninstallPreload} from '../integrations/claude-usage/install-claude.mjs';
import {readUsageView, startUsageServer} from '../integrations/claude-usage/summary-server.mjs';

test('fractional utilization becomes a percent and a whole percent stays put', () => {
  assert.equal(percentUsed(0.25), 25);
  assert.equal(percentUsed(42), 42);
  assert.equal(percentUsed(0), 0);
  assert.equal(percentUsed(1), 1);
});

test('five hour and weekly windows stay separate', () => {
  const usage = normalizeClaudeUsage({
    five_hour:{utilization:42, resets_at:'2026-11-10T08:30:00.000Z'},
    seven_day:{utilization:18, resets_at:'2026-11-16T00:00:00.000Z'}
  }, 1);
  assert.equal(usage.status, 'ready');
  assert.equal(usage.fiveHour.used, 42);
  assert.equal(usage.week.used, 18);
  const view = claudeUsageView(usage);
  assert.equal(view.fiveHour.kind, '5h');
  assert.equal(view.week.kind, '周');
  assert.equal(view.fiveHour.text, '58%');
  assert.equal(view.week.text, '82%');
  assert.match(view.detail, /^5h 58%/);
  assert.match(view.detail, /周 82%/);
  assert.match(view.detail, /5小时重置/);
  assert.match(view.detail, /每周重置/);
});

test('desktop history uses the newest five hour and weekly sample', () => {
  const now = 1_700_000_000_000;
  const fresh = usageFromHistory({samples:[{t:now - 1000, u:{fh:10, sd:20}}, {t:now - 2000, org:'hidden', u:{fh:1, sd:2}}]}, now);
  assert.equal(fresh.fiveHour.used, 10);
  assert.equal(fresh.week.used, 20);
  assert.equal(fresh.status, 'ready');
  assert.equal(JSON.stringify(fresh).includes('hidden'), false);
  const stale = usageFromHistory({samples:[{t:now - 21 * 60 * 1000, u:{fh:9, sd:8}}]}, now);
  assert.equal(stale.status, 'unavailable');
  assert.equal(claudeUsageView(stale).fiveHour.text, '');
  assert.equal(claudeUsageView(stale).week.text, '');
  assert.equal(claudeUsageView(stale).detail, '');
  assert.equal(claudeUsageView(usageFromHistory({})).fiveHour.text, '');
});

test('the usage service returns percents and drops the organization id', async () => {
  const home = mkdtempSync(join(tmpdir(), 'claude-usage-'));
  const dir = join(home, 'Library', 'Application Support', 'Claude');
  mkdirSync(dir, {recursive:true});
  writeFileSync(join(dir, 'plan-usage-history.json'), JSON.stringify({
    samples:[{t:Date.now(), org:'org-secret', u:{fh:33, sd:44}}]
  }));
  const view = readUsageView({home});
  assert.equal(view.fiveHour.text, '67%');
  assert.equal(view.week.text, '56%');
  assert.equal(JSON.stringify(view).includes('org-secret'), false);
  const server = await startUsageServer({readView:() => view, port:0});
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/usage`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.fiveHour.text, '67%');
  } finally {
    server.close();
    rmSync(home, {recursive:true, force:true});
  }
});

test('preload lands beside the app resources and can be removed', () => {
  const app = mkdtempSync(join(tmpdir(), 'claude-app-'));
  assert.equal(claudePreloadPath(app), join(app, 'Contents', 'Resources', 'preload', 'default.js'));
  const target = installPreload(app);
  const source = readFileSync(target, 'utf8');
  assert.equal(source.includes(marker), true);
  assert.equal(source.includes('export function'), false);
  assert.match(source, /function mountClaudeUsageChip\(doc, view\)/);
  assert.match(source, /const kinds = \['5h', '周'\]/);
  writeFileSync(target, 'sentry');
  assert.throws(() => installPreload(app), /已存在/);
  writeFileSync(target, source);
  uninstallPreload(app);
  assert.equal(existsSync(target), false);
  rmSync(app, {recursive:true, force:true});
});

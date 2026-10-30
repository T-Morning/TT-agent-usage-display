import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {clampTip} from '../integrations/cursor-billing/huanling-billing-logic.js';
import {billingView, cursorSummaryHeaders, formatDollars, normalizeCursorBilling, readCursorBilling} from '../src/cursor-billing.mjs';
import {decryptCursorSecret, encryptCursorSecret} from '../src/cursor-secret.mjs';
import {startSummaryServer} from '../integrations/cursor-billing/summary-server.mjs';
import {cursorStatePath, readCursorAccessToken} from '../src/cursor-session.mjs';

const summary = {
  individualUsage: {plan:{used:12840, limit:40000}, onDemand:{used:500}},
  teamUsage: {onDemand:{used:4200, limit:50000, remaining:45800}}
};

test('hover detail stays inside the window', () => {
  const nearRight = clampTip({left:900, top:6, width:120, height:22, bottom:28}, {width:260, height:180}, {width:1000, height:700});
  assert.equal(nearRight.left + nearRight.width <= 992, true);
  assert.equal(nearRight.top + nearRight.height <= 692, true);
  const tall = clampTip({left:400, top:640, width:80, height:22, bottom:662}, {width:200, height:180}, {width:1000, height:700});
  assert.equal(tall.top >= 8, true);
  assert.equal(tall.top + tall.height <= 692, true);
});

test('missing Cursor spend stays unavailable', () => {
  const bill = normalizeCursorBilling({});
  assert.equal(bill.status, 'unavailable');
  assert.equal(bill.kind, null);
  assert.equal(billingView(bill).label, '—');
});

test('personal and team amounts stay separate and zero stays zero', () => {
  const both = normalizeCursorBilling(summary, 1);
  assert.equal(both.status, 'ready');
  assert.equal(both.kind, 'both');
  assert.equal(both.personal.spend, 128.4);
  assert.equal(both.personal.limit, 400);
  assert.equal(both.personal.onDemand, 5);
  assert.equal(both.team.spend, 42);
  assert.equal(both.team.remaining, 458);
  assert.equal(normalizeCursorBilling({individualUsage:{plan:{used:0, limit:1000}}}).kind, 'personal');
  assert.equal(normalizeCursorBilling({teamUsage:{onDemand:{used:'0', limit:100}}}).kind, 'team');
  assert.equal(formatDollars(0), '$0.00');
});

test('enterprise usage-summary keeps the included plan and the team pool apart', () => {
  const bill = normalizeCursorBilling({
    billingCycleStart:'2026-10-03T05:33:03.000Z',
    billingCycleEnd:'2026-11-03T05:33:03.000Z',
    membershipType:'enterprise',
    limitType:'team',
    individualUsage:{plan:{enabled:true, used:2000, limit:2000, remaining:0, totalPercentUsed:100}, onDemand:{enabled:true, used:25951, limit:52600, remaining:26649}},
    teamUsage:{onDemand:{enabled:true, used:16043189, limit:48000000, remaining:31956811}}
  });
  assert.equal(bill.kind, 'both');
  assert.equal(bill.membership, 'enterprise');
  assert.equal(bill.limitType, 'team');
  assert.equal(bill.personal.spend, 20);
  assert.equal(bill.personal.remaining, 0);
  assert.equal(bill.personal.onDemand, 259.51);
  assert.equal(bill.personal.onDemandRemaining, 266.49);
  assert.equal(bill.team.spend, 160431.89);
  assert.equal(bill.team.limit, 480000);
  assert.equal(bill.team.remaining, 319568.11);
  const view = billingView(bill);
  assert.equal(view.label, '$259.51 / $526.00');
  assert.ok(Math.abs(view.percent - (259.51 / 526) * 100) < 0.001);
  assert.match(view.detail, /企业/);
  assert.match(view.detail, /套餐剩余 \$0\.00/);
  assert.match(view.detail, /按量剩余 \$266\.49/);
  assert.match(view.detail, /周期结束 11\/3 13:33/);
  assert.doesNotMatch(view.detail, /团队/);
  assert.doesNotMatch(view.label, /160,431\.89/);
});

test('the chip shows on-demand spend over its quota', () => {
  assert.equal(billingView(normalizeCursorBilling(summary)).label, '—');
  assert.equal(billingView(normalizeCursorBilling(summary)).percent, null);
  assert.match(billingView(normalizeCursorBilling(summary)).detail, /套餐已用 \$128\.40/);
  assert.match(billingView(normalizeCursorBilling(summary)).detail, /按量已用 \$5\.00/);
  assert.doesNotMatch(billingView(normalizeCursorBilling(summary)).detail, /团队/);
  assert.equal(billingView(normalizeCursorBilling({individualUsage:{plan:{used:100, limit:200}}})).label, '—');
  assert.equal(billingView(normalizeCursorBilling({individualUsage:{onDemand:{used:5000, limit:10000}}})).label, '$50.00 / $100.00');
  assert.equal(billingView(normalizeCursorBilling({teamUsage:{onDemand:{used:250, limit:1000, remaining:750}}})).label, '—');
});

test('unauthorized and transport failures do not invent a balance', async () => {
  const denied = await readCursorBilling({token:'abc', fetchImpl: async () => ({status:401, ok:false})});
  assert.equal(denied.status, 'unauthorized');
  assert.equal(denied.personal, null);
  assert.equal(denied.team, null);
  const offline = await readCursorBilling({token:'abc', fetchImpl: async () => { throw new Error('offline'); }});
  assert.equal(offline.status, 'unavailable');
});

test('a website session is sent as a cookie and an opaque token stays a bearer', () => {
  const payload = Buffer.from(JSON.stringify({sub:'user_123'})).toString('base64url');
  const jwt = `eyJhbGciOiJub25lIn0.${payload}.sig`;
  assert.equal(cursorSummaryHeaders(jwt).Cookie, `WorkosCursorSessionToken=user_123::${jwt}`);
  assert.equal(cursorSummaryHeaders('desktop-token-0123456789').Authorization, 'Bearer desktop-token-0123456789');
});

test('an at-rest Cursor secret round-trips without keeping the password in the result', () => {
  const stored = encryptCursorSecret('eyJhbGciOiJub25lIn0.e30.sig', 'local-password');
  assert.equal(stored.startsWith('cursor-safe-storage:v1:'), true);
  assert.equal(decryptCursorSecret(stored, 'local-password'), 'eyJhbGciOiJub25lIn0.e30.sig');
});

test('the local summary server returns the upstream bill and hides failures', async () => {
  const server = await startSummaryServer({port:0, fetchSummary: async () => ({membershipType:'enterprise'})});
  const failing = await startSummaryServer({port:0, fetchSummary: async () => { throw new Error('401'); }});
  try {
    const ok = await fetch(`http://127.0.0.1:${server.address().port}/usage-summary`);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).membershipType, 'enterprise');
    const denied = await fetch(`http://127.0.0.1:${failing.address().port}/usage-summary`);
    assert.equal(denied.status, 503);
    const preflight = await fetch(`http://127.0.0.1:${server.address().port}/usage-summary`, {method:'OPTIONS'});
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');
  } finally {
    server.close();
    failing.close();
  }
});

test('a successful usage summary becomes the split view', async () => {
  const bill = await readCursorBilling({
    token:'desktop-token-0123456789',
    now: 5,
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://cursor.com/api/usage-summary');
      assert.equal(init.method, 'GET');
      assert.equal(init.headers.Authorization, 'Bearer desktop-token-0123456789');
      return {status:200, ok:true, json: async () => summary};
    }
  });
  assert.equal(bill.kind, 'both');
  assert.equal(bill.updatedAt, 5);
});

test('state database locations stay outside the repo', () => {
  assert.equal(cursorStatePath('darwin', '/Users/me'), '/Users/me/Library/Application Support/Cursor/User/globalStorage/state.vscdb');
  assert.match(cursorStatePath('win32', 'C:\\Users\\me'), /state\.vscdb$/);
  assert.match(cursorStatePath('linux', '/home/me'), /\.config\/Cursor\/User\/globalStorage\/state\.vscdb$/);
});

test('access token is read from the desktop state table and short values are ignored', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cursor-billing-'));
  const dbPath = join(dir, 'state.vscdb');
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE ItemTable (key TEXT, value TEXT)');
  db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)').run('cursorAuth/accessToken', 'short');
  db.close();
  assert.equal(readCursorAccessToken(dbPath), null);
  const writable = new DatabaseSync(dbPath);
  writable.prepare('UPDATE ItemTable SET value = ? WHERE key = ?').run('desktop-token-0123456789', 'cursorAuth/accessToken');
  writable.close();
  assert.equal(readCursorAccessToken(dbPath), 'desktop-token-0123456789');
  rmSync(dir, {recursive:true, force:true});
});

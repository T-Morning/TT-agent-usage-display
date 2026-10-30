import {execFileSync} from 'node:child_process';
import {renameSync, writeFileSync} from 'node:fs';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {cursorSummaryHeaders} from '../../src/cursor-billing.mjs';
import {decryptCursorSecret} from '../../src/cursor-secret.mjs';
import {cursorStatePath, readCursorAccessToken} from '../../src/cursor-session.mjs';
export function uninstallCommandPath(scriptUrl = import.meta.url) {
  return fileURLToPath(new URL('./mac/卸载.command', scriptUrl));
}

const SUMMARY = 'https://cursor.com/api/usage-summary';
const snapshotPath = '/Applications/Cursor.app/Contents/Resources/app/out/vs/code/electron-sandbox/workbench/huanling-billing.json';

function publish(body) {
  const temporary = `${snapshotPath}.tmp`;
  writeFileSync(temporary, JSON.stringify(body));
  renameSync(temporary, snapshotPath);
}

export async function readStoredUsageSummary({
  password,
  stored,
  fetchImpl = fetch
} = {}) {
  const token = decryptCursorSecret(stored, password);
  const response = await fetchImpl(SUMMARY, {method:'GET', headers:cursorSummaryHeaders(token)});
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

export function startSummaryServer({fetchSummary, onUninstall, port = 39231, host = '127.0.0.1'} = {}) {
  const server = http.createServer(async (req, res) => {
    const headers = {
      'content-type':'application/json',
      'access-control-allow-origin':'*',
      'access-control-allow-private-network':'true',
      'access-control-allow-methods':'GET, POST, OPTIONS'
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }
    if (req.method === 'POST' && req.url === '/uninstall') {
      if (typeof onUninstall !== 'function') {
        res.writeHead(404, headers);
        res.end('{"error":"not-found"}');
        return;
      }
      try {
        await onUninstall();
        res.writeHead(204, headers);
        res.end();
      } catch (error) {
        console.error('uninstall', error instanceof Error ? error.message : 'failed');
        if (res.headersSent) return;
        res.writeHead(500, headers);
        res.end('{"error":"uninstall-failed"}');
      }
      return;
    }
    if (req.url !== '/usage-summary') {
      res.writeHead(404, headers);
      res.end('{"error":"not-found"}');
      return;
    }
    try {
      const body = JSON.stringify(await fetchSummary());
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      if (res.headersSent) return;
      res.writeHead(503, headers);
      res.end('{"error":"unavailable"}');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

async function main() {
  const password = execFileSync('security', ['find-generic-password', '-s', 'Cursor Safe Storage', '-w'], {encoding:'utf8'}).trim();
  const stored = readCursorAccessToken(cursorStatePath());
  let cached = null;
  let cachedAt = 0;
  const server = await startSummaryServer({
    fetchSummary: async () => {
      if (cached && Date.now() - cachedAt < 20000) return cached;
      cached = await readStoredUsageSummary({password, stored});
      cachedAt = Date.now();
      try { publish(cached); } catch (error) { console.error('snapshot', error instanceof Error ? error.code || error.message : 'write-failed'); }
      return cached;
    },
    onUninstall: async () => {
      execFileSync('/usr/bin/open', [uninstallCommandPath()]);
    }
  });
  console.log(`账单服务已在 http://127.0.0.1:${server.address().port}/usage-summary`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : '账单服务启动失败');
    process.exitCode = 1;
  });
}

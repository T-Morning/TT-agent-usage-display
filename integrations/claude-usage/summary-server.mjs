import {readFileSync} from 'node:fs';
import http from 'node:http';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {claudeUsageView, usageFromHistory} from '../../src/claude-usage.mjs';

export const usagePort = 39232;

export function historyPath(home = homedir()) {
  return join(home, 'Library', 'Application Support', 'Claude', 'plan-usage-history.json');
}

export function readUsageView({home = homedir(), now = Date.now(), read = readFileSync} = {}) {
  try {
    const history = JSON.parse(read(historyPath(home), 'utf8'));
    return claudeUsageView(usageFromHistory(history, now));
  } catch {
    return claudeUsageView({status:'unavailable'});
  }
}

export function startUsageServer({readView = () => readUsageView(), port = usagePort, host = '127.0.0.1'} = {}) {
  const server = http.createServer((req, res) => {
    const headers = {
      'content-type':'application/json; charset=utf-8',
      'access-control-allow-origin':'*',
      'access-control-allow-private-network':'true',
      'access-control-allow-methods':'GET, OPTIONS',
      'cache-control':'no-store'
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }
    if (req.method !== 'GET' || new URL(req.url, 'http://127.0.0.1').pathname !== '/usage') {
      res.writeHead(404, headers);
      res.end('{"error":"not-found"}');
      return;
    }
    res.writeHead(200, headers);
    res.end(JSON.stringify(readView()));
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startUsageServer().then(server => {
    console.log(`Claude 额度服务已在 http://127.0.0.1:${server.address().port}/usage`);
  }).catch(error => {
    console.error(error instanceof Error ? error.message : '额度服务启动失败');
    process.exitCode = 1;
  });
}

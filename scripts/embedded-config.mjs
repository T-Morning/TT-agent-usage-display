import path from 'node:path';
export const label='com.ttjl.codex-quota-panel';
export function installPaths(home) {
  return {directory:path.join(home,'Library/Application Support/TTJLQuotaPanel'),plist:path.join(home,`Library/LaunchAgents/${label}.plist`),logs:path.join(home,'Library/Logs/TTJLQuotaPanel')};
}
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export function agentPlist({home,node,codex}) {
  const p=installPaths(home);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(path.join(p.directory,'src/server.mjs'))}</string><string>--preview</string></array>
<key>WorkingDirectory</key><string>${xml(p.directory)}</string>
<key>EnvironmentVariables</key><dict><key>CODEX_BINARY</key><string>${xml(codex)}</string><key>PORT</key><string>4319</string><key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
<key>StandardOutPath</key><string>${xml(path.join(p.logs,'service.log'))}</string>
<key>StandardErrorPath</key><string>${xml(path.join(p.logs,'service-error.log'))}</string>
</dict></plist>\n`;
}

import {homedir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

export function cursorStatePath(platform = process.platform, home = homedir()) {
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  if (platform === 'win32') return join(home, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  return join(home, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
}

export function readCursorAccessToken(dbPath, open = path => new DatabaseSync(path, {readOnly:true})) {
  const db = open(dbPath);
  try {
    const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get('cursorAuth/accessToken');
    const token = typeof row?.value === 'string' ? row.value.trim() : '';
    return token.length >= 20 ? token : null;
  } finally {
    db.close();
  }
}

import {createCipheriv, createDecipheriv, pbkdf2Sync} from 'node:crypto';

const envelope = 'cursor-safe-storage:v1:';

export function decryptCursorSecret(stored, password) {
  if (!stored.startsWith(envelope)) return stored;
  const body = Buffer.from(stored.slice(envelope.length), 'base64').subarray(3);
  const key = pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
  const decipher = createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, ' '));
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

export function encryptCursorSecret(plain, password) {
  const key = pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
  const cipher = createCipheriv('aes-128-cbc', key, Buffer.alloc(16, ' '));
  const body = Buffer.concat([Buffer.from('v10'), cipher.update(plain), cipher.final()]);
  return envelope + body.toString('base64');
}

export function workosSessionCookie(token) {
  const part = token.split('.')[1];
  if (!part) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload.sub !== 'string' || payload.sub === '') return null;
  return `WorkosCursorSessionToken=${payload.sub}::${token}`;
}

// auth.js · 密码哈希（scrypt）、会话签发与鉴权
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, nowIso } from './db.js';

const SESSION_DAYS = 14;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const N = 16384, r = 8, p = 1;
  const hash = scryptSync(password, salt, 64, { N, r, p });
  return `scrypt:${N}:${r}:${p}:${salt.toString('base64')}:${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  const actual = scryptSync(password, salt, expected.length, { N, r, p });
  return timingSafeEqual(actual, expected);
}

export function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expiresAt);
  return { token, expiresAt };
}

export function getUserByToken(token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.email, u.created_at, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { id: row.id, username: row.username, email: row.email, created_at: row.created_at };
}

export function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// 登录限流：同一 ip+用户名 30 秒内最多 5 次（内存即可）
const loginAttempts = new Map();
export function allowLoginAttempt(key) {
  const now = Date.now();
  const arr = (loginAttempts.get(key) || []).filter((t) => now - t < 30_000);
  if (arr.length >= 5) {
    loginAttempts.set(key, arr);
    return false;
  }
  arr.push(now);
  loginAttempts.set(key, arr);
  return true;
}

// 注册限流：同一 ip 每小时最多 10 次
const registerAttempts = new Map();
export function allowRegisterAttempt(ip) {
  const now = Date.now();
  const arr = (registerAttempts.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (arr.length >= 10) {
    registerAttempts.set(ip, arr);
    return false;
  }
  arr.push(now);
  registerAttempts.set(ip, arr);
  return true;
}

export function createUser(username, email, password) {
  const id = randomUUID();
  const hash = hashPassword(password);
  db.prepare('INSERT INTO users (id, username, password_hash, email, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, username, hash, email || null, nowIso());
  return { id, username, email: email || null };
}
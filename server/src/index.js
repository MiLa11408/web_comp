// index.js · Fastify 应用入口（阶段 1：注册/登录/内容/检索/印章/批注/进度）
import Fastify from 'fastify';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, nowIso } from './db.js';
import {
  createUser, createSession, verifyPassword, getUserByToken, destroySession,
  allowLoginAttempt, allowRegisterAttempt,
} from './auth.js';
import { initSearch, search } from './search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT, 'content');

const ctx = initSearch(CONTENT_DIR);

const app = Fastify({ logger: true });

// ---------- 样章预览页（阶段 2 换 3D 界面） ----------
const WEB_INDEX = path.join(ROOT, 'web', 'index.html');
app.get('/', async (request, reply) => {
  if (!existsSync(WEB_INDEX)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: '预览页未生成' } });
  return reply.type('text/html; charset=utf-8').send(readFileSync(WEB_INDEX, 'utf8'));
});

// ---------- 鉴权装饰 ----------
app.decorateRequest('user', null);

async function authHook(request, reply) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (request.cookies && request.cookies.mm_token) || null;
  const user = getUserByToken(token);
  if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: '请先登录' } });
  request.user = user;
  request._token = token;
}

const auth = { preHandler: authHook };

function fail(reply, status, code, message) {
  return reply.code(status).send({ error: { code, message } });
}

// ---------- 健康 ----------
app.get('/api/health', async () => ({ ok: true, chapters: ctx.chapters.size }));

// ---------- 认证 ----------
app.post('/api/register', async (request, reply) => {
  const { username, password, email } = request.body || {};
  if (!allowRegisterAttempt(request.ip)) {
    return fail(reply, 429, 'RATE_LIMITED', '注册太频繁，请稍后再试');
  }
  if (typeof username !== 'string' || username.length < 3 || username.length > 32) {
    return fail(reply, 400, 'BAD_REQUEST', '用户名需 3–32 个字符');
  }
  if (!/^[\w\u4e00-\u9fff.-]+$/.test(username)) {
    return fail(reply, 400, 'BAD_REQUEST', '用户名只能含中文、字母、数字、点与短横线');
  }
  if (typeof password !== 'string' || password.length < 8) {
    return fail(reply, 400, 'BAD_REQUEST', '密码至少 8 位');
  }
  if (email !== undefined && email !== null && email !== '' &&
      (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
    return fail(reply, 400, 'BAD_REQUEST', '邮箱格式不对（可留空）');
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return fail(reply, 409, 'CONFLICT', '用户名已被占用');

  const user = createUser(username, email || null, password);
  const { token } = createSession(user.id);
  setCookie(reply, token);
  return reply.code(201).send({ token, user });
});

app.post('/api/login', async (request, reply) => {
  const { username, password } = request.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return fail(reply, 400, 'BAD_REQUEST', '缺少用户名或密码');
  }
  if (!allowLoginAttempt(`${request.ip}|${username}`)) {
    return fail(reply, 429, 'RATE_LIMITED', '尝试次数过多，30 秒后再试');
  }
  const row = db.prepare('SELECT id, username, email, password_hash FROM users WHERE username = ?').get(username);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return fail(reply, 401, 'BAD_CREDENTIALS', '用户名或密码错误');
  }
  const { token } = createSession(row.id);
  setCookie(reply, token);
  return reply.send({ token, user: { id: row.id, username: row.username, email: row.email } });
});

app.post('/api/logout', auth, async (request, reply) => {
  destroySession(request._token);
  reply.header('Set-Cookie', 'mm_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return reply.code(204).send();
});

app.get('/api/me', auth, async (request) => {
  const u = request.user;
  const stamps = db.prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?').get(u.id).c;
  const notes = db.prepare('SELECT COUNT(*) AS c FROM annotations WHERE user_id = ?').get(u.id).c;
  const done = db.prepare("SELECT COUNT(*) AS c FROM progress WHERE user_id = ? AND state = 'done'").get(u.id).c;
  return { user: u, stamps, annotations: notes, read: done };
});

// ---------- 内容 ----------
app.get('/api/books', async () => ctx.books);

app.get('/api/books/:id', async (request, reply) => {
  const book = ctx.books.find((b) => b.id === request.params.id || b.call === request.params.id);
  if (!book) return fail(reply, 404, 'NOT_FOUND', '没有这本书');
  const chapters = [...ctx.chapters.values()]
    .filter(({ meta }) => meta.book === book.id)
    .map(({ meta }) => ({
      id: meta.id, no: meta.no, title: meta.title, title_en: meta.title_en,
      style: meta.style, year: meta.year, tags: meta.tags, summary: meta.summary,
      features: meta.features || [],
    }))
    .sort((a, b) => a.no - b.no);
  return { ...book, chapters };
});

app.get('/api/chapters/:id', async (request, reply) => {
  const entry = ctx.chapters.get(request.params.id);
  if (!entry) return fail(reply, 404, 'NOT_FOUND', '没有这一章');
  return { meta: entry.meta, content: entry.body };
});

app.get('/api/search', async (request, reply) => {
  const q = (request.query.q || '').toString().trim();
  if (!q) return { results: [] };
  const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 10));
  return { results: search(ctx, q, limit) };
});

app.get('/api/graph', async (request, reply) => {
  return jsonContent(reply, 'graph.json');
});

app.get('/api/rail', async (request, reply) => {
  return jsonContent(reply, 'rail.json');
});

function jsonContent(reply, file) {
  const p = path.join(CONTENT_DIR, file);
  if (!existsSync(p)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: file } });
  return JSON.parse(readFileSync(p, 'utf8'));
}

// ---------- 用户互动（需登录） ----------
const KNOWN_CHAPTERS = new Set(ctx.chapters.keys());

app.get('/api/stamps', auth, async (request) => {
  return db.prepare('SELECT chapter_id, kind, created_at FROM stamps WHERE user_id = ? ORDER BY created_at DESC').all(request.user.id);
});

app.post('/api/stamps', auth, async (request, reply) => {
  const { chapter_id, kind } = request.body || {};
  if (!KNOWN_CHAPTERS.has(chapter_id)) {
    return fail(reply, 400, 'BAD_REQUEST', '章节不存在');
  }
  if (!['chapter', 'book', 'route'].includes(kind)) {
    return fail(reply, 400, 'BAD_REQUEST', 'kind 需为 chapter / book / route');
  }
  db.prepare('INSERT OR IGNORE INTO stamps (user_id, chapter_id, kind, created_at) VALUES (?, ?, ?, ?)')
    .run(request.user.id, chapter_id, kind, nowIso());
  return reply.code(201).send({ chapter_id, kind });
});

app.get('/api/annotations', auth, async (request) => {
  const { chapter_id } = request.query;
  if (chapter_id) {
    return db.prepare('SELECT id, chapter_id, quote, note, created_at FROM annotations WHERE user_id = ? AND chapter_id = ? ORDER BY created_at DESC')
      .all(request.user.id, chapter_id);
  }
  return db.prepare('SELECT id, chapter_id, quote, note, created_at FROM annotations WHERE user_id = ? ORDER BY created_at DESC')
    .all(request.user.id);
});

app.post('/api/annotations', auth, async (request, reply) => {
  const { chapter_id, quote, note } = request.body || {};
  if (!KNOWN_CHAPTERS.has(chapter_id)) return fail(reply, 400, 'BAD_REQUEST', '章节不存在');
  if (typeof quote !== 'string' || !quote.trim()) return fail(reply, 400, 'BAD_REQUEST', '引文不能为空');
  if (typeof note !== 'string' || !note.trim()) return fail(reply, 400, 'BAD_REQUEST', '批注不能为空');
  if (note.length > 4000) return fail(reply, 400, 'BAD_REQUEST', '批注太长');
  const r = db.prepare('INSERT INTO annotations (user_id, chapter_id, quote, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(request.user.id, chapter_id, quote.trim(), note.trim(), nowIso());
  return reply.code(201).send({ id: r.lastInsertRowid, chapter_id });
});

app.get('/api/progress', auth, async (request) => {
  return db.prepare('SELECT chapter_id, state, read_at FROM progress WHERE user_id = ? ORDER BY read_at DESC').all(request.user.id);
});

app.post('/api/progress', auth, async (request, reply) => {
  const { chapter_id, state } = request.body || {};
  if (!KNOWN_CHAPTERS.has(chapter_id)) return fail(reply, 400, 'BAD_REQUEST', '章节不存在');
  if (!['started', 'done'].includes(state)) return fail(reply, 400, 'BAD_REQUEST', 'state 需为 started / done');
  db.prepare('INSERT INTO progress (user_id, chapter_id, state, read_at) VALUES (?, ?, ?, ?) ' +
             'ON CONFLICT(user_id, chapter_id) DO UPDATE SET state = excluded.state, read_at = excluded.read_at')
    .run(request.user.id, chapter_id, state, nowIso());
  return { chapter_id, state };
});

// ---------- Cookie ----------
function setCookie(reply, token) {
  reply.header('Set-Cookie', `mm_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`);
}

// ---------- 启动 ----------
const port = Number(process.env.PORT) || 3300;
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// 优雅退出
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    app.close().then(() => process.exit(0));
  });
}
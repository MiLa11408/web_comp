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
import { initSearch, search, suggest, fallbackFor } from './search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT, 'content');

// 读取项目根目录 .env（已被 .gitignore 忽略；部署时单独放到服务器）
function loadEnvFile() {
  const p = path.join(ROOT, '.env');
  if (!existsSync(p)) return;
  try {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch (e) { /* 损坏的 .env 不应阻止服务启动 */ }
}
loadEnvFile();

const ctx = initSearch(CONTENT_DIR);

// 残页目录（阅读上报时自动收编）
const FRAGMENTS_FILE = path.join(CONTENT_DIR, 'fragments.json');
let IFLINE_DATA = { title: '另一条时间线', total: 8 };
let FRAGMENTS_LIST = [];
const FRAGMENT_MAP = {};
if (existsSync(FRAGMENTS_FILE)) {
  const fj = JSON.parse(readFileSync(FRAGMENTS_FILE, 'utf8'));
  IFLINE_DATA = fj.ifline || IFLINE_DATA;
  FRAGMENTS_LIST = fj.fragments || [];
  FRAGMENTS_LIST.forEach((f) => { if (f.chapter) FRAGMENT_MAP[f.chapter] = f; });
}

// 异常馆藏：失窃页 / 躁动书页 / 历史分岔
function loadCollection(name) {
  const p = path.join(CONTENT_DIR, name);
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, 'utf8')).items || []; } catch (e) { return []; }
}
const STOLEN_ITEMS = loadCollection('stolen.json');
const RESTLESS_ITEMS = loadCollection('restless.json');
const FORK_ITEMS = loadCollection('forks.json');
const COLLECTION_MAP = {
  stolen: new Map(STOLEN_ITEMS.map((x) => [x.id, x])),
  restless: new Map(RESTLESS_ITEMS.map((x) => [x.id, x])),
  fork: new Map(FORK_ITEMS.map((x) => [x.id, x])),
};

const app = Fastify({ logger: true });

// 安全响应头（CSP 由 nginx 统一负责；这里补齐本地与直连场景的基础头）
app.addHook('onSend', async (request, reply, payload) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'same-origin');
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  reply.header('Cross-Origin-Opener-Policy', 'same-origin');
  return payload;
});

// ---------- 样章预览页（阶段 2 换 3D 界面） ----------
const WEB_INDEX = path.join(ROOT, 'web', 'index.html');
app.get('/', async (request, reply) => {
  if (!existsSync(WEB_INDEX)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: '预览页未生成' } });
  return reply.type('text/html; charset=utf-8').send(readFileSync(WEB_INDEX, 'utf8'));
});

// 3D 前端模块与 vendor（three.js / Rapier）
app.get('/app3d.js', async (request, reply) => {
  const p = path.join(ROOT, 'web', 'app3d.js');
  if (!existsSync(p)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'app3d.js 缺失' } });
  return reply.type('text/javascript; charset=utf-8').send(readFileSync(p));
});

app.get('/demos.js', async (request, reply) => {
  const p = path.join(ROOT, 'web', 'demos.js');
  if (!existsSync(p)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'demos.js 缺失' } });
  return reply.type('text/javascript; charset=utf-8').send(readFileSync(p));
});

app.get('/star.js', async (request, reply) => {
  const p = path.join(ROOT, 'web', 'star.js');
  if (!existsSync(p)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'star.js 缺失' } });
  return reply.type('text/javascript; charset=utf-8').send(readFileSync(p));
});

app.get('/audio.js', async (request, reply) => {
  const p = path.join(ROOT, 'web', 'audio.js');
  if (!existsSync(p)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'audio.js 缺失' } });
  return reply.type('text/javascript; charset=utf-8').send(readFileSync(p));
});

app.get('/whatif.js', async (request, reply) => {
  const p = path.join(ROOT, 'web', 'whatif.js');
  if (!existsSync(p)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'whatif.js 缺失' } });
  return reply.type('text/javascript; charset=utf-8').send(readFileSync(p));
});

app.get('/vendor/*', async (request, reply) => {
  const rel = String(request.params['*'] || '');
  if (!rel || rel.includes('..')) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: '非法路径' } });
  const p = path.join(ROOT, 'web', 'vendor', rel);
  if (!existsSync(p)) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'vendor 文件缺失' } });
  return reply.type('text/javascript; charset=utf-8').send(readFileSync(p));
});

// ---------- 鉴权装饰 ----------
app.decorateRequest('user', null);

// 不引入额外依赖：手动解析 Cookie（HttpOnly 会话优先，Bearer 仅保留给 API/测试客户端）
function cookieValue(request, name) {
  const raw = request.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { return null; }
    }
  }
  return null;
}

async function authHook(request, reply) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : cookieValue(request, 'mm_token');
  const user = getUserByToken(token);
  if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: '请先登录' } });
  request.user = user;
  request._token = token;
}

const auth = { preHandler: authHook };

function optionalUser(request) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : cookieValue(request, 'mm_token');
  return getUserByToken(token);
}

function resolveReader(request, body) {
  const u = optionalUser(request);
  if (u) return { id: `u:${u.id}`, user: u };
  const v = String((body && body.reader_id) || '');
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(v)) return null;
  return { id: `v:${v}`, user: null };
}

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
  setCookie(request, reply, token);
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
  setCookie(request, reply, token);
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

// 3D 大厅用：一次拿全部书 + 章节索引
app.get('/api/catalog', async () => ctx.books.map((b) => ({
  ...b,
  chapters: [...ctx.chapters.values()]
    .filter(({ meta }) => meta.book === b.id)
    .sort((a, b2) => a.meta.no - b2.meta.no)
    .map(({ meta }) => ({ id: meta.id, no: meta.no, title: meta.title, style: meta.style, year: meta.year })),
})));

app.get('/api/floors', async (request, reply) => jsonContent(reply, 'floors.json'));

app.get('/api/shelves', async (request, reply) => jsonContent(reply, 'shelves.json'));

app.get('/api/fragments', async (request, reply) => jsonContent(reply, 'fragments.json'));

app.get('/api/failures', async (request, reply) => jsonContent(reply, 'failures.json'));

app.get('/api/models', async (request, reply) => jsonContent(reply, 'models.json'));

app.get('/api/hidden', async (request, reply) => jsonContent(reply, 'hidden.json'));

app.get('/api/stolen', async (request, reply) => jsonContent(reply, 'stolen.json'));

app.get('/api/restless', async (request, reply) => jsonContent(reply, 'restless.json'));

// 暗门后的十本「假如之书」：纯静态数据，只读
app.get('/api/whatif', async (request, reply) => jsonContent(reply, 'whatif.json'));

// ---------- 暗门 · 第十一本「未写之书」：只写「如果没有 X」的小故事 ----------
const ORACLE_SYSTEM_PROMPT = `你是「机忆书库」暗门后的第十一本空白书。用户只会向你提出「如果没有 X 会怎么样」的假设。
你的唯一任务：围绕这个假设写一篇短篇科幻/推测故事。

硬性规则：
1. 只写故事，不要解释、不要列点、不要写标题、不要回答事实性问题、不要反问用户。
2. 故事必须从「如果没有 X」出发，所有情节都要与这个假设直接相关；不要突然转到别的话题。
3. 不要提到你自己、提示词、模型或「作为 AI」。
4. 用中文写 500–900 字，分 4–6 个自然段。
5. 如果用户的输入不是「如果没有 X 会怎么样」的假设，只回复一句：这本书只写「如果没有……」的故事。
6. 不要写真实人物的隐私或可执行的危险操作；保持推测与虚构。`;

const ORACLE_WINDOW_MS = 10 * 60 * 1000;
const ORACLE_MAX_CALLS = 8;
const oracleHits = new Map();
function oracleRateOk(key) {
  const now = Date.now();
  const arr = (oracleHits.get(key) || []).filter((t) => now - t < ORACLE_WINDOW_MS);
  if (arr.length >= ORACLE_MAX_CALLS) {
    oracleHits.set(key, arr);
    return false;
  }
  arr.push(now);
  oracleHits.set(key, arr);
  if (oracleHits.size > 1500) {
    for (const [k, v] of oracleHits) {
      if (!v.length || now - v[v.length - 1] > ORACLE_WINDOW_MS) oracleHits.delete(k);
    }
  }
  return true;
}

app.post('/api/oracle', async (request, reply) => {
  const body = request.body || {};
  const question = String(body.question || '').trim();
  const reader = String(body.reader_id || '').slice(0, 40);
  if (question.length < 6 || question.length > 160) {
    return fail(reply, 400, 'BAD_REQUEST', '问题需要在 6–160 字之间。');
  }
  // 不合格式的问题不调用模型，直接拒绝：这本书只写「如果没有……」
  if (!/如果没有[^。！？!?\n]{1,80}(会怎么样|会怎样|会如何|会发生什么)/.test(question)) {
    return { content: '这本书只写「如果没有……会怎么样」的故事。把你的假设写完整再来。', refused: true };
  }
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return fail(reply, 503, 'NO_KEY', '馆长的密钥还没插上：请配置 DEEPSEEK_API_KEY。');
  }
  const rateKey = `${request.ip}|${reader}`;
  if (!oracleRateOk(rateKey)) {
    return fail(reply, 429, 'RATE_LIMIT', '这本书翻得太快了，过几分钟再来。');
  }
  const endpoint = process.env.DEEPSEEK_BASE_URL || 'https://api.siliconflow.cn/v1/chat/completions';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3.2';
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: ORACLE_SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        temperature: 0.85,
        max_tokens: 1400,
        stream: false,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      request.log.warn({ status: upstream.status, detail: text.slice(0, 160) }, 'oracle upstream error');
      if (upstream.status === 401 || upstream.status === 403) {
        return fail(reply, 502, 'AUTH', '密钥无效或已过期，请馆长更换 DEEPSEEK_API_KEY。');
      }
      return fail(reply, 502, 'UPSTREAM', '这一页暂时没有浮出字迹，稍后再试。');
    }
    const data = await upstream.json();
    const content = String(data.choices?.[0]?.message?.content || '').trim();
    if (!content) return fail(reply, 502, 'EMPTY', '这一页还是空白，再问一次。');
    return { content, model: data.model || model, usage: data.usage || null };
  } catch (err) {
    request.log.warn({ err }, 'oracle request failed');
    return fail(reply, 502, 'UPSTREAM', '这一页暂时没有浮出字迹，稍后再试。');
  }
});

app.get('/api/forks', async (request, reply) => jsonContent(reply, 'forks.json'));

// 前沿观察：arXiv 论文 + 每周热点（hot 由 tools/fetch-hot.mjs 入库），这里只读
app.get('/api/frontier', async (request, reply) => {
  try {
    const raw = readFileSync(path.join(CONTENT_DIR, 'frontier.json'), 'utf8');
    let data;
    try { data = JSON.parse(raw); } catch { data = null; }
    if (data) {
      try {
        const hot = JSON.parse(readFileSync(path.join(CONTENT_DIR, 'frontier-hot.json'), 'utf8'));
        data.hot = Array.isArray(hot.items) ? hot.items : [];
        data.hotUpdated = hot.rewritten || hot.updated || null;
        data.hotWeek = hot.week || '';
        data.hotSource = hot.source || '';
        data.hotNote = hot.note || '';
      } catch { /* 热点尚未入库时只返回论文 */ }
    }
    reply.header('cache-control', 'public, max-age=900');
    return reply.type('application/json; charset=utf-8').send(data ? JSON.stringify(data) : raw);
  } catch (e) {
    return reply.send({ updated: null, count: 0, items: [], hot: [], note: '前沿观察尚未入库。' });
  }
});

// ---------- 阅读记录（残页改为手动拾取） ----------
app.post('/api/reads', async (request, reply) => {
  const { chapter_id } = request.body || {};
  const entry = ctx.chapters.get(chapter_id);
  if (!entry) return fail(reply, 400, 'BAD_REQUEST', '章节不存在');
  const reader = resolveReader(request, request.body);
  if (!reader) return fail(reply, 400, 'BAD_REQUEST', '缺少有效的 reader_id');
  db.prepare('INSERT INTO reads (reader_id, book_id, chapter_id, created_at) VALUES (?, ?, ?, ?)')
    .run(reader.id, entry.meta.book, chapter_id, nowIso());
  const collected = db.prepare('SELECT COUNT(*) AS c FROM fragment_picks WHERE reader_id = ?').get(reader.id).c;
  return reply.code(201).send({ ok: true, collected, total: IFLINE_DATA.total || FRAGMENTS_LIST.length });
});

// 拾取残页（只有玩家主动点「捡起来」才收编）
app.post('/api/fragments/:id/pick', async (request, reply) => {
  const f = FRAGMENTS_LIST.find((x) => x.id === request.params.id);
  if (!f) return fail(reply, 404, 'NOT_FOUND', '没有这张残页');
  const reader = resolveReader(request, request.body);
  if (!reader) return fail(reply, 400, 'BAD_REQUEST', '缺少有效的 reader_id');
  const had = db.prepare('SELECT 1 FROM fragment_picks WHERE reader_id = ? AND fragment_id = ?').get(reader.id, f.id);
  db.prepare('INSERT OR IGNORE INTO fragment_picks (reader_id, fragment_id, chapter_id, created_at) VALUES (?, ?, ?, ?)')
    .run(reader.id, f.id, f.chapter || 'scene', nowIso());
  const collected = db.prepare('SELECT COUNT(*) AS c FROM fragment_picks WHERE reader_id = ?').get(reader.id).c;
  return reply.code(201).send({ ok: true, isNew: !had, fragment: f, collected, total: IFLINE_DATA.total || FRAGMENTS_LIST.length });
});

// 异常馆藏状态：失窃页 / 躁动书页 / 历史分岔
app.get('/api/collectibles', async (request) => {
  const reader = resolveReader(request, request.query);
  const empty = { stolen: {}, restless: {}, forks: {} };
  if (!reader) return { ok: true, ...empty };
  const rows = db.prepare('SELECT kind, item_id, state FROM collectibles WHERE reader_id = ?').all(reader.id);
  const out = { stolen: {}, restless: {}, forks: {} };
  for (const r of rows) {
    const key = r.kind === 'fork' ? 'forks' : r.kind;
    if (out[key]) out[key][r.item_id] = r.state;
  }
  return { ok: true, ...out };
});

app.post('/api/collectibles', async (request, reply) => {
  const { kind, item_id, action, chapter_id } = request.body || {};
  const reader = resolveReader(request, request.body);
  if (!reader) return fail(reply, 400, 'BAD_REQUEST', '缺少有效的 reader_id');
  const list = COLLECTION_MAP[kind];
  if (!list) return fail(reply, 400, 'BAD_REQUEST', '未知的馆藏类型');
  const item = list.get(item_id);
  if (!item) return fail(reply, 404, 'NOT_FOUND', '没有这件馆藏');
  const allowed = { stolen: ['recover'], restless: ['find', 'restore'], fork: ['choose'] }[kind];
  if (!allowed.includes(action)) return fail(reply, 400, 'BAD_REQUEST', '未知的操作');
  const state = { stolen: { recover: 'recovered' }, restless: { find: 'found', restore: 'restored' }, fork: { choose: 'chosen' } }[kind][action];
  db.prepare(`INSERT INTO collectibles (reader_id, kind, item_id, state, chapter_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(reader_id, kind, item_id) DO UPDATE SET state = excluded.state, chapter_id = excluded.chapter_id, updated_at = excluded.updated_at`)
    .run(reader.id, kind, item_id, state, String(chapter_id || item.chapter || ''), nowIso());
  return reply.code(201).send({ ok: true, kind, item_id, state });
});

app.get('/api/stats', async (request) => {
  const reader = resolveReader(request, request.query);
  const totals = {
    reads: db.prepare('SELECT COUNT(*) AS c FROM reads').get().c,
    readers: db.prepare('SELECT COUNT(DISTINCT reader_id) AS c FROM reads').get().c,
    books: ctx.books.length,
    fragments: IFLINE_DATA.total || FRAGMENTS_LIST.length,
  };
  const rows = db.prepare('SELECT book_id, COUNT(*) AS reads, COUNT(DISTINCT reader_id) AS readers FROM reads GROUP BY book_id ORDER BY reads DESC LIMIT 12').all();
  const bookMap = {};
  ctx.books.forEach((b) => { bookMap[b.id] = b; });
  const topBooks = rows.map((r) => {
    const b = bookMap[r.book_id] || {};
    return { id: r.book_id, title: b.title || r.book_id, call: b.call || '', floor: b.floor || '', reads: r.reads, readers: r.readers };
  });
  const picks = db.prepare('SELECT fragment_id, COUNT(*) AS readers FROM fragment_picks GROUP BY fragment_id').all();
  const fragments = FRAGMENTS_LIST.map((f) => ({
    id: f.id, title: f.title, floor: f.floor,
    readers: (picks.find((p) => p.fragment_id === f.id) || {}).readers || 0,
  }));
  let me = null;
  if (reader) {
    const r = db.prepare('SELECT COUNT(*) AS reads, COUNT(DISTINCT chapter_id) AS chapters, COUNT(DISTINCT book_id) AS books FROM reads WHERE reader_id = ?').get(reader.id);
    const myFrags = db.prepare('SELECT fragment_id FROM fragment_picks WHERE reader_id = ?').all(reader.id).map((x) => x.fragment_id);
    const recent = db.prepare('SELECT book_id, chapter_id, COUNT(*) AS times, MAX(created_at) AS last FROM reads WHERE reader_id = ? GROUP BY chapter_id ORDER BY last DESC LIMIT 10').all(reader.id);
    const chapterIds = db.prepare('SELECT DISTINCT chapter_id FROM reads WHERE reader_id = ?').all(reader.id).map((x) => x.chapter_id);
    const myBooks = db.prepare('SELECT book_id, COUNT(*) AS times, MAX(created_at) AS last FROM reads WHERE reader_id = ? GROUP BY book_id ORDER BY times DESC').all(reader.id);
    const stamps = reader.user
      ? db.prepare('SELECT COUNT(*) AS c FROM stamps WHERE user_id = ?').get(reader.user.id).c
      : 0;
    me = { reads: r.reads, chapters: r.chapters, books: r.books, fragments: myFrags, recent, chapterIds, myBooks, stamps };
  }
  return { totals, topBooks, fragments, me, ifline: IFLINE_DATA };
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
  const results = search(ctx, q, limit);
  if (results.length) return { results };
  return { results, fallback: fallbackFor(ctx, q) };
});

app.get('/api/suggest', async (request) => {
  const q = (request.query.q || '').toString().trim();
  return { items: suggest(ctx, q) };
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

// 撤销盖章：只删本人的 chapter 章，不动其它藏印
app.delete('/api/stamps/:chapter_id', auth, async (request, reply) => {
  const chapterId = String(request.params.chapter_id || '');
  if (!KNOWN_CHAPTERS.has(chapterId)) return fail(reply, 400, 'BAD_REQUEST', '章节不存在');
  db.prepare('DELETE FROM stamps WHERE user_id = ? AND chapter_id = ? AND kind = ?')
    .run(request.user.id, chapterId, 'chapter');
  return { chapter_id: chapterId, removed: true };
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
  if (quote.length > 2000) return fail(reply, 400, 'BAD_REQUEST', '引文太长');
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

// 撤销「读完」：删除本人的本章进度，回到未读完
app.delete('/api/progress/:chapter_id', auth, async (request, reply) => {
  const chapterId = String(request.params.chapter_id || '');
  if (!KNOWN_CHAPTERS.has(chapterId)) return fail(reply, 400, 'BAD_REQUEST', '章节不存在');
  db.prepare('DELETE FROM progress WHERE user_id = ? AND chapter_id = ?')
    .run(request.user.id, chapterId);
  return { chapter_id: chapterId, removed: true };
});

// ---------- Cookie ----------
function setCookie(request, reply, token) {
  const proto = String(request.headers['x-forwarded-proto'] || request.protocol || '').split(',')[0].trim();
  const secure = proto === 'https' ? '; Secure' : '';
  reply.header('Set-Cookie', `mm_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600${secure}`);
}

// ---------- 启动 ----------
const port = Number(process.env.PORT) || 3300;
const host = process.env.HOST || '0.0.0.0';
app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// 优雅退出
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    app.close().then(() => process.exit(0));
  });
}
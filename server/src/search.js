// search.js · 内容加载 + 内存倒排索引（中文二元组 + 英文词）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

// 中文停用字：切出来的二元组含这些字就丢弃
const STOP_CN = new Set('的了是在和与或不这那你我他她它我们你们他们一个于之及其就已还又被把让给到得着所为由而但因故更最很没有可会来去说看从对中大涨上');
const STOP_EN = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'and', 'or', 'for', 'on', 'with', 'is', 'are', 'was', 'were',
  'be', 'been', 'by', 'at', 'as', 'it', 'its', 'this', 'that', 'these', 'those', 'from', 'which',
  'what', 'why', 'how', 'into', 'over', 'under', 'between', 'machine', 'intelligence',
]);

export function parseChapter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('章节缺少 frontmatter');
  return { meta: YAML.parse(m[1]), body: m[2] };
}

// 中文：连续汉字串切二元组（单字串保留单字）；英文：小写分词去停用词
export function tokenize(text) {
  const out = [];
  const runs = text.match(/[\u4e00-\u9fff]+/g) || [];
  for (const run of runs) {
    if (run.length === 1) {
      if (!STOP_CN.has(run)) out.push(run);
    } else {
      for (let i = 0; i < run.length - 1; i++) {
        const bg = run.slice(i, i + 2);
        if (![...bg].some((c) => STOP_CN.has(c))) out.push(bg);
      }
    }
  }
  const words = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{1,}/g) || [];
  for (const w of words) {
    if (!STOP_EN.has(w)) out.push(w);
  }
  return out;
}

export function initSearch(contentDir) {
  const booksPath = path.join(contentDir, 'books.json');
  const books = JSON.parse(readFileSync(booksPath, 'utf8'));
  const chaptersDir = path.join(contentDir, 'chapters');

  const chapters = new Map();   // id -> {meta, body}
  const bookMeta = new Map();   // book id -> book
  for (const b of books) {
    bookMeta.set(b.id, b);
    bookMeta.set(b.call, b);
  }

  if (existsSync(chaptersDir)) {
    for (const dir of readdirSync(chaptersDir)) {
      const dirPath = path.join(chaptersDir, dir);
      if (!existsSync(dirPath)) continue;
      for (const file of readdirSync(dirPath)) {
        if (!file.endsWith('.md')) continue;
        const raw = readFileSync(path.join(dirPath, file), 'utf8');
        const { meta, body } = parseChapter(raw);
        chapters.set(meta.id, { meta, body });
      }
    }
  }

  // 倒排索引：term -> Map(docId -> weight)
  // 权重即检索优先级（Boss 定）：标题(12) > tag/别名(8) > 小标题/人物/摘要(3-4) > 正文出现次数(1，逐次累计)
  const index = new Map();
  const addDoc = (docId, fieldText, weight) => {
    for (const term of tokenize(fieldText)) {
      if (!index.has(term)) index.set(term, new Map());
      const docMap = index.get(term);
      docMap.set(docId, (docMap.get(docId) || 0) + weight);
    }
  };

  const titleSets = new Map(); // docId -> 标题分词集合（章节标题）
  const bookTitleSets = new Map(); // docId -> 书名分词集合（大标题优先）
  const tagSets = new Map();   // docId -> tag+别名分词集合（命中加成次之）
  const suggestTitles = [];
  const suggestTags = new Set();
  const suggestAliases = new Set();
  const suggestPeople = new Set();

  for (const [id, { meta, body }] of chapters) {
    const book = bookMeta.get(meta.book);
    addDoc(id, ((book && book.title) || ''), 14);       // 优先级 0：大标题（书名）
    addDoc(id, meta.title || '', 12);                   // 优先级 1：章节标题
    addDoc(id, (meta.tags || []).join(' '), 8);         // 优先级 2：章节 tag
    addDoc(id, ((book && book.tags) || []).join(' '), 8); // 优先级 2：书 tag
    addDoc(id, ((book && book.aliases) || []).join(' '), 8);
    addDoc(id, meta.summary || '', 4);
    addDoc(id, ((meta.people || []).map((p) => p.name).join(' ')), 3);
    // 小标题与正文
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]).join(' ');
    addDoc(id, headings, 3);
    addDoc(id, body, 1);

    bookTitleSets.set(id, new Set(tokenize(`${(book && book.title) || ''} ${(book && book.title_en) || ''}`)));
    titleSets.set(id, new Set(tokenize(meta.title || '')));
    tagSets.set(id, new Set(tokenize(`${(meta.tags || []).join(' ')} ${((book && book.aliases) || []).join(' ')} ${((book && book.tags) || []).join(' ')}`)));
    if (meta.title) suggestTitles.push(meta.title);
    for (const t of meta.tags || []) suggestTags.add(t);
    for (const t of (book && book.tags) || []) suggestTags.add(t);
    for (const t of (book && book.aliases) || []) suggestAliases.add(t);
    for (const p of meta.people || []) if (p.name) suggestPeople.add(p.name);
  }

  return { books, chapters, index, titleSets, bookTitleSets, tagSets, suggestTitles, suggestTags, suggestAliases, suggestPeople };
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) >= 0) {
    count += 1;
    pos += needle.length;
  }
  return count;
}

function editDistance(a, b, max = 1) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[a.length];
}

// 英文拼写容错：只在完全无命中时启用，避免影响正常排序
function fuzzyTokens(ctx, tokens) {
  const out = new Set();
  for (const t of tokens) {
    if (!/^[a-z0-9-]{3,}$/.test(t)) continue;
    for (const term of ctx.index.keys()) {
      if (term === t) continue;
      if (Math.abs(term.length - t.length) > 1) continue;
      if (editDistance(t, term) <= 1) out.add(term);
    }
  }
  return [...out];
}

export function search(ctx, q, limit = 10) {
  const tokens = tokenize(q || '');
  if (tokens.length === 0) return [];
  let usedTokens = tokens;
  let fuzzy = false;
  let scores = new Map();
  let matched = new Map();

  const accumulate = (terms) => {
    const s = new Map();
    const m = new Map();
    for (const term of terms) {
      const docMap = ctx.index.get(term);
      if (!docMap) continue;
      for (const [docId, weight] of docMap) {
        s.set(docId, (s.get(docId) || 0) + weight);
        if (!m.has(docId)) m.set(docId, new Set());
        m.get(docId).add(term);
      }
    }
    return { s, m };
  };

  ({ s: scores, m: matched } = accumulate(tokens));

  // 无命中时尝试英文拼写容错；中文仍走精确二元组，避免噪声
  if (scores.size === 0) {
    const fuzzyList = fuzzyTokens(ctx, tokens);
    if (fuzzyList.length) {
      usedTokens = fuzzyList;
      fuzzy = true;
      ({ s: scores, m: matched } = accumulate(fuzzyList));
    }
  }
  if (scores.size === 0) return [];

  // 层级加成（Boss 定的检索优先级）：大标题(书名) +60/词 > 章节标题 +35 > tag/别名 +12 > 正文频次（索引权重递增）
  for (const [docId, score] of scores) {
    const bookTitleSet = ctx.bookTitleSets.get(docId) || new Set();
    const titleSet = ctx.titleSets.get(docId) || new Set();
    const tagSet = ctx.tagSets.get(docId) || new Set();
    let bonus = 0;
    for (const t of usedTokens) {
      if (bookTitleSet.has(t)) bonus += 60;
    }
    for (const t of usedTokens) {
      if (titleSet.has(t)) bonus += 35;
    }
    for (const t of usedTokens) {
      if (tagSet.has(t)) bonus += 12;
    }
    scores.set(docId, score + bonus);
  }
  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return ranked.map(([docId, score]) => {
    const { meta, body } = ctx.chapters.get(docId);
    const book = ctx.books.find((b) => b.id === meta.book);
    const bookTitleSet = ctx.bookTitleSets.get(docId) || new Set();
    const titleSet = ctx.titleSets.get(docId) || new Set();
    const tagSet = ctx.tagSets.get(docId) || new Set();
    const bodyLower = body.toLowerCase();
    let bodyHits = 0;
    const why = [];
    for (const t of usedTokens) {
      bodyHits += countOccurrences(bodyLower, t.toLowerCase());
      if (bookTitleSet.has(t)) why.push(`书名「${t}」`);
      else if (titleSet.has(t)) why.push(`章节标题「${t}」`);
      else if (tagSet.has(t)) why.push(`标签「${t}」`);
    }
    if (bodyHits) why.push(`正文提及 ${bodyHits} 次`);
    if (fuzzy) why.unshift('近似拼写');
    return {
      id: docId,
      title: meta.title,
      title_en: meta.title_en || '',
      book: meta.book,
      book_title: book ? book.title : '',
      tags: meta.tags || [],
      score,
      bodyHits,
      why: [...new Set(why)].slice(0, 4),
      snippet: makeSnippet(body, [...(matched.get(docId) || [])]),
    };
  });
}

// 零结果兜底：给书与标签方向，而不是空白页
export function fallbackFor(ctx, q, limit = 6) {
  const tokens = tokenize(q || '');
  const hit = (b) => tokens.some((t) =>
    b.title.includes(t) || (b.tags || []).some((x) => x.includes(t)) || (b.aliases || []).some((x) => x.includes(t)));
  const picked = ctx.books.filter(hit);
  const books = (picked.length ? picked : ctx.books).slice(0, limit).map((b) => ({
    id: b.id, call: b.call, title: b.title, floor: b.floor, tags: (b.tags || []).slice(0, 3),
  }));
  const tags = [...new Set(books.flatMap((b) => b.tags))].slice(0, 8);
  return { books, tags };
}

// 输入补全：书名 / 章节标题 / 标签 / 别名 / 人物（拉丁字母走前缀匹配，中文走包含匹配）
export function suggest(ctx, q, limit = 10) {
  const key = (q || '').trim().toLowerCase();
  if (!key) return [];
  const isLatin = /^[a-z0-9]/.test(key);
  const match = (s) => {
    const lower = String(s).toLowerCase();
    return isLatin ? lower.startsWith(key) : lower.includes(key);
  };
  const out = [];
  const seen = new Set();
  const perType = { 书: 0, 章节: 0, 标签: 0, 别名: 0, 人物: 0 };
  const push = (text, type) => {
    const k = type + ':' + text;
    if (seen.has(k) || perType[type] >= 3 || out.length >= limit) return;
    seen.add(k);
    perType[type] += 1;
    out.push({ text, type });
  };
  for (const b of ctx.books) if (match(b.title)) push(b.title, '书');
  for (const t of ctx.suggestTitles) if (match(t)) push(t, '章节');
  for (const t of ctx.suggestTags) if (match(t)) push(t, '标签');
  for (const t of ctx.suggestAliases) if (match(t)) push(t, '别名');
  for (const t of ctx.suggestPeople) if (match(t)) push(t, '人物');
  return out;
}

function escHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function makeSnippet(body, tokens) {
  const flat = body.replace(/[#*`>|]/g, '').replace(/\s+/g, ' ');
  let best = -1;
  for (const t of tokens) {
    const pos = flat.indexOf(t);
    if (pos >= 0 && (best < 0 || pos < best)) best = pos;
  }
  const start = best >= 0 ? Math.max(0, best - 60) : 0;
  const end = best >= 0 ? Math.min(flat.length, best + 80) : Math.min(flat.length, 120);
  let seg = escHtml(flat.slice(start, end));
  for (const t of tokens) {
    const te = escHtml(t);
    if (te) seg = seg.split(te).join('<mark>' + te + '</mark>');
  }
  return (start > 0 ? '…' : '') + seg + (end < flat.length ? '…' : '');
}
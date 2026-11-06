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

  const titleSets = new Map(); // docId -> 标题分词集合（命中加成最高）
  const tagSets = new Map();   // docId -> tag+书名别名分词集合（命中加成次之）
  const suggestTitles = [];
  const suggestTags = new Set();
  const suggestPeople = new Set();

  for (const [id, { meta, body }] of chapters) {
    const book = bookMeta.get(meta.book);
    addDoc(id, meta.title || '', 12);
    addDoc(id, (meta.tags || []).join(' '), 8);
    addDoc(id, ((book && book.aliases) || []).join(' '), 8);
    addDoc(id, meta.summary || '', 4);
    addDoc(id, ((meta.people || []).map((p) => p.name).join(' ')), 3);
    // 小标题与正文
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]).join(' ');
    addDoc(id, headings, 3);
    addDoc(id, body, 1);

    titleSets.set(id, new Set(tokenize(meta.title || '')));
    tagSets.set(id, new Set(tokenize(`${(meta.tags || []).join(' ')} ${((book && book.aliases) || []).join(' ')}`)));
    if (meta.title) suggestTitles.push(meta.title);
    for (const t of meta.tags || []) suggestTags.add(t);
    for (const p of meta.people || []) if (p.name) suggestPeople.add(p.name);
  }

  return { books, chapters, index, titleSets, tagSets, suggestTitles, suggestTags, suggestPeople };
}

export function search(ctx, q, limit = 10) {
  const tokens = tokenize(q || '');
  if (tokens.length === 0) return [];
  const scores = new Map();
  const matched = new Map();
  for (const term of tokens) {
    const docMap = ctx.index.get(term);
    if (!docMap) continue;
    for (const [docId, weight] of docMap) {
      scores.set(docId, (scores.get(docId) || 0) + weight);
      if (!matched.has(docId)) matched.set(docId, new Set());
      matched.get(docId).add(term);
    }
  }
  // 层级加成：命中标题 +40/词，命中 tag/别名 +12/词，保证 标题 > tag > 正文频次 的梯队
  for (const [docId, score] of scores) {
    const titleSet = ctx.titleSets.get(docId) || new Set();
    const tagSet = ctx.tagSets.get(docId) || new Set();
    let bonus = 0;
    for (const t of tokens) if (titleSet.has(t)) bonus += 40;
    for (const t of tokens) if (tagSet.has(t)) bonus += 12;
    scores.set(docId, score + bonus);
  }
  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return ranked.map(([docId, score]) => {
    const { meta, body } = ctx.chapters.get(docId);
    const book = ctx.books.find((b) => b.id === meta.book);
    return {
      id: docId,
      title: meta.title,
      title_en: meta.title_en || '',
      book: meta.book,
      book_title: book ? book.title : '',
      tags: meta.tags || [],
      score,
      snippet: makeSnippet(body, [...(matched.get(docId) || [])]),
    };
  });
}

// 输入补全：章节标题 / 书名 / 标签 / 人物（拉丁字母走前缀匹配，中文走包含匹配）
export function suggest(ctx, q, limit = 10) {
  const key = (q || '').trim().toLowerCase();
  if (!key) return [];
  const isLatin = /^[a-z0-9]/.test(key);
  const match = (s) => {
    const lower = String(s).toLowerCase();
    return isLatin ? lower.startsWith(key) : lower.includes(key);
  };
  const out = [];
  for (const t of ctx.suggestTitles) if (match(t)) out.push({ text: t, type: '章节' });
  for (const b of ctx.books) if (match(b.title)) out.push({ text: b.title, type: '书' });
  for (const t of ctx.suggestTags) if (match(t)) out.push({ text: t, type: '标签' });
  for (const t of ctx.suggestPeople) if (match(t)) out.push({ text: t, type: '人物' });
  return out.slice(0, limit);
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
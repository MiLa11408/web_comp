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
  const index = new Map();
  const addDoc = (docId, fieldText, weight) => {
    for (const term of tokenize(fieldText)) {
      if (!index.has(term)) index.set(term, new Map());
      const docMap = index.get(term);
      docMap.set(docId, (docMap.get(docId) || 0) + weight);
    }
  };

  for (const [id, { meta, body }] of chapters) {
    const book = bookMeta.get(meta.book);
    addDoc(id, meta.title || '', 6);
    addDoc(id, (meta.tags || []).join(' '), 5);
    addDoc(id, ((book && book.aliases) || []).join(' '), 5);
    addDoc(id, meta.summary || '', 3);
    addDoc(id, ((meta.people || []).map((p) => p.name).join(' ')), 3);
    // 小标题与正文
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]).join(' ');
    addDoc(id, headings, 3);
    addDoc(id, body, 1);
  }

  return { books, chapters, index };
}

export function search(ctx, q, limit = 10) {
  const tokens = tokenize(q || '');
  if (tokens.length === 0) return [];
  const scores = new Map();
  for (const term of tokens) {
    const docMap = ctx.index.get(term);
    if (!docMap) continue;
    for (const [docId, weight] of docMap) {
      scores.set(docId, (scores.get(docId) || 0) + weight);
    }
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
      snippet: makeSnippet(body, tokens),
    };
  });
}

function makeSnippet(body, tokens) {
  const flat = body.replace(/[#*`>|]/g, '').replace(/\s+/g, ' ');
  let best = -1;
  for (const t of tokens) {
    const pos = flat.indexOf(t);
    if (pos >= 0 && (best < 0 || pos < best)) best = pos;
  }
  if (best < 0) return flat.slice(0, 120);
  const start = Math.max(0, best - 60);
  const end = Math.min(flat.length, best + 80);
  return (start > 0 ? '…' : '') + flat.slice(start, end) + (end < flat.length ? '…' : '');
}
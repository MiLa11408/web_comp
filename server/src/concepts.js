// concepts.js · 概念手册：加载 concepts.json，提供精确匹配与章节映射
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export function loadConcepts(contentDir) {
  const file = path.join(contentDir, 'concepts.json');
  const empty = { list: [], byId: new Map(), byChapter: new Map() };
  if (!existsSync(file)) return empty;
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { return empty; }
  const list = Array.isArray(data) ? data : (data.concepts || []);
  const byId = new Map(list.map((c) => [c.id, c]));
  const byChapter = new Map();
  for (const c of list) {
    const ids = new Set();
    if (c.start && c.start.chapter) ids.add(c.start.chapter);
    for (const p of c.paths || []) for (const s of p.steps || []) if (s.chapter) ids.add(s.chapter);
    for (const id of ids) {
      if (!byChapter.has(id)) byChapter.set(id, []);
      byChapter.get(id).push(c);
    }
  }
  return { list, byId, byChapter };
}

export function normalizeConceptQuery(q) {
  return String(q || '').toLowerCase()
    .replace(/[\s，。！？、,.!?：:；;“”"'（）()《》【】\[\]]/g, '')
    .replace(/^(什么是|什么叫|啥是|请问一下|请问)/, '')
    .replace(/(是什么意思|是什么|是啥|的定义|怎么理解)$/, '');
}

export function matchConcepts(concepts, q, limit = 3) {
  const key = normalizeConceptQuery(q);
  if (!key) return [];
  const hits = [];
  for (const c of concepts.list) {
    const names = [c.name, c.en, ...(c.aliases || [])].map(normalizeConceptQuery);
    if (names.includes(key)) hits.push(c);
    if (hits.length >= limit) break;
  }
  return hits.map((c) => ({
    id: c.id, name: c.name, en: c.en, group: c.group,
    one_line: c.one_line, analogy: c.analogy, start: c.start, paths: c.paths,
  }));
}

export function conceptsForChapter(concepts, chapterId) {
  return (concepts.byChapter.get(chapterId) || []).map((c) => ({
    id: c.id, name: c.name, group: c.group, one_line: c.one_line, start: c.start,
  }));
}

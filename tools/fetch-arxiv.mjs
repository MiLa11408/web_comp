// tools/fetch-arxiv.mjs · 前沿观察入库
// 用法：node tools/fetch-arxiv.mjs [--max 30]
// 从 arXiv API 拉取 cs.AI / cs.CL / cs.CV / cs.LG 最新投稿，写入 content/frontier.json。
// 定时任务（服务器）：crontab 每天 04:17 执行一次；
//   17 4 * * * cd /opt/machine-memory && node tools/fetch-arxiv.mjs >> /var/log/mm-frontier.log 2>&1
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'content', 'frontier.json');
const MAX = (() => {
  const i = process.argv.indexOf('--max');
  return i > -1 ? Math.max(1, Number(process.argv[i + 1]) || 30) : 30;
})();

const CATS = ['cs.AI', 'cs.CL', 'cs.CV', 'cs.LG'];
const QUERY = CATS.map((c) => `cat:${c}`).join('+OR+');
const URL = `http://export.arxiv.org/api/query?search_query=${QUERY}&sortBy=submittedDate&sortOrder=descending&max_results=${MAX}`;

// 领域 → 中文栏目 + 一句「这一栏在看什么」
const FIELD = {
  'cs.AI': { zh: '通用智能', note: '智能体、推理、规划与知识表示' },
  'cs.CL': { zh: '语言', note: '语言模型、翻译、对话与评测' },
  'cs.CV': { zh: '视觉', note: '识别、生成、多模态与三维' },
  'cs.LG': { zh: '学习理论', note: '训练方法、架构、优化与泛化' },
};

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}
function pickAll(block, tag) {
  return [...block.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1].replace(/\s+/g, ' ').trim());
}
function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function parse(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const b = m[1];
    const idUrl = pick(b, 'id');
    // category 是自闭合标签，必须按 term 属性解析
    const cats = [...b.matchAll(/<category[^>]*term="([^"]+)"/g)].map((x) => x[1]);
    // 主分类：优先更具体的 cs.CL/CV/LG，避免所有条目都被 cs.AI 吞掉
    const main = cats.find((c) => c !== 'cs.AI' && FIELD[c]) || cats.find((c) => FIELD[c]) || cats[0] || 'cs.AI';
    const f = FIELD[main] || { zh: '交叉', note: '跨领域方法与评测' };
    return {
      id: idUrl.split('/abs/').pop() || idUrl,
      title: decode(pick(b, 'title')),
      authors: pickAll(b, 'name').slice(0, 4),
      summary: decode(pick(b, 'summary')).slice(0, 620),
      published: pick(b, 'published').slice(0, 10),
      link: idUrl.replace('http://', 'https://'),
      cats: cats.slice(0, 3),
      field: f.zh,
      note: f.note,
    };
  }).filter((x) => x.title && x.link);
}

async function main() {
  let xml = '';
  try {
    const res = await fetch(URL, { headers: { 'User-Agent': 'machine-memory/1.0 (archive project)' }, signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (e) {
    const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
    if (old && Array.isArray(old.items) && old.items.length) {
      console.warn(`拉取失败（${e.message}），保留上一次入库的 ${old.items.length} 条。`);
      process.exit(0);
    }
    console.error(`拉取失败（${e.message}），且没有历史数据。`);
    process.exit(1);
  }
  const items = parse(xml);
  if (!items.length) {
    console.error('arXiv 返回为空，未覆盖旧数据。');
    process.exit(1);
  }
  // 保留已经编译好的中文科普导读（按原文链接对齐），避免每日刷新把 news 冲掉
  const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  const newsByLink = new Map();
  if (old && Array.isArray(old.items)) {
    for (const x of old.items) if (x.news && x.news.title_zh) newsByLink.set(x.link, x.news);
  }
  for (const x of items) {
    if (!x.news && newsByLink.has(x.link)) x.news = newsByLink.get(x.link);
  }
  const payload = {
    updated: new Date().toISOString(),
    source: 'arXiv API · cs.AI / cs.CL / cs.CV / cs.LG',
    sourceUrl: 'https://arxiv.org/list/cs.AI/recent',
    note: '前沿观察每天从 arXiv 选新论文：中文标题/导读/为什么值得看由馆员编译，可能不完整；数字、结论与原文冲突时以 arXiv 原文为准。未编译的条目保留英文元数据。',
    count: items.length,
    items,
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`已入库 ${items.length} 篇，最新日期 ${items[0].published}。`);
}

main();

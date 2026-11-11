// tools/fetch-hot.mjs · 前沿观察「每周热点」入库
// 用法：node tools/fetch-hot.mjs [--auto 6] [--days 14]
// 组成：馆员挑选的发布级热点（content/frontier-picks.json）+ OpenAI / Google 官方 RSS 的近期发布。
// 输出：content/frontier-hot.json。拉取失败时保留上一次结果；没有旧结果但有馆员挑选时仍然写入。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'content', 'frontier-hot.json');
const PICKS = join(ROOT, 'content', 'frontier-picks.json');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Math.max(1, Number(process.argv[i + 1]) || fallback) : fallback;
};
const AUTO_MAX = arg('--auto', 6);
const DAYS = arg('--days', 14);

const FEEDS = [
  { name: 'OpenAI 官方', url: 'https://openai.com/news/rss.xml' },
  { name: 'Google 官方', url: 'https://blog.google/technology/ai/rss/' },
];

// 官方 RSS 里混着公益、客户故事和活动稿；只留模型/产品/研究/安全相关的发布
const TECH = /\b(GPT-?\d|Claude|Gemini|DeepSeek|Qwen|Kimi|Llama|Mistral|Grok|models?|API|benchmark|reasoning|agents?|multimodal|open[- ]source|robot|chip|GPU|inference)\b/i;
const NOISE = /\b(caregivers|veterans|students|teachers|universit|nonprofit|foundation|art|legacy|museum|tabletop|rethink|law|bank|retail|customer|case study|fund|IPO|S-1|hiring|jobs|policy|government|election|education|partnership|healthcare|cyber|defense|freelance|factories|factory|scales?|ships?|delivers|self-service)\b/i;

const norm = (u) => {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, '') + x.pathname).toLowerCase().replace(/\/+$/, '');
  } catch {
    return String(u || '').toLowerCase();
  }
};
const isHttp = (u) => /^https?:\/\//i.test(String(u || ''));

function readJson(p) {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function decode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#\d+;/g, ' ');
}
function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]) : '';
}
function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseFeed(xml, source) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const b = m[1];
    const title = pick(b, 'title').replace(/\s+/g, ' ').trim();
    const link = pick(b, 'link').trim();
    const summary = stripHtml(pick(b, 'description')).slice(0, 320);
    const pub = pick(b, 'pubDate');
    const t = new Date(pub);
    const date = Number.isNaN(t.getTime()) ? '' : t.toISOString().slice(0, 10);
    const blob = `${title} ${summary}`;
    return { title, link, summary, date, source, keep: TECH.test(title) && !NOISE.test(blob) };
  }).filter((x) => x.title && isHttp(x.link) && x.date && x.keep)
    .map(({ keep, ...x }) => x);
}

async function fetchFeeds() {
  const cutoff = new Date(Date.now() - DAYS * 86400 * 1000).toISOString().slice(0, 10);
  const all = [];
  await Promise.all(FEEDS.map(async (f) => {
    try {
      const res = await fetch(f.url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; machine-memory/1.0)' },
        signal: AbortSignal.timeout(18000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseFeed(await res.text(), f.name).filter((x) => x.date >= cutoff);
      all.push(...items);
      console.log(`${f.name}: ${items.length} 条`);
    } catch (e) {
      console.warn(`${f.name} 拉取失败：${e.message}`);
    }
  }));
  all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const out = [];
  const links = new Set();
  for (const x of all) {
    const k = norm(x.link);
    if (links.has(k)) continue;
    links.add(k);
    out.push({
      id: `feed-${k.replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
      date: x.date,
      source: x.source,
      link: x.link,
      title: x.title,
      summary: x.summary,
      tags: [],
      level: '',
    });
    if (out.length >= AUTO_MAX) break;
  }
  return out;
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil((((t - y) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}

async function main() {
  const picksDoc = readJson(PICKS);
  const picks = (picksDoc && Array.isArray(picksDoc.items) ? picksDoc.items : [])
    .filter((x) => x && x.title_zh && isHttp(x.link))
    .map((x) => ({ ...x, curated: true, points: Number(x.points) || 0 }));
  if (!picks.length) console.warn('content/frontier-picks.json 为空或不可读，本次只写官方 RSS。');

  let auto = [];
  try { auto = await fetchFeeds(); } catch (e) { console.warn(`官方 RSS 拉取失败：${e.message}`); }

  if (!auto.length) {
    const old = readJson(OUT);
    auto = (old && Array.isArray(old.items) ? old.items : []).filter((x) => x && !x.curated && x.title);
    if (auto.length) console.warn(`保留上一次的 ${auto.length} 条官方 RSS 热点。`);
  }

  const seen = new Set(picks.map((x) => norm(x.link)));
  const old = readJson(OUT);
  const zhByLink = new Map();
  for (const x of (old && Array.isArray(old.items) ? old.items : [])) {
    if (x && x.title_zh && isHttp(x.link)) zhByLink.set(norm(x.link), x);
  }
  const fresh = auto
    .filter((x) => !seen.has(norm(x.link)))
    .map((x) => {
      const prev = zhByLink.get(norm(x.link));
      return prev ? {
        ...x,
        title_zh: prev.title_zh,
        lede: prev.lede || '',
        why: prev.why || '',
        tags: Array.isArray(prev.tags) ? prev.tags : [],
        level: prev.level || '',
      } : x;
    });
  const items = [...picks, ...fresh].slice(0, 12);

  if (!items.length) {
    console.error('没有热点数据，且没有历史结果。');
    process.exit(1);
  }

  const now = new Date();
  const payload = {
    updated: now.toISOString(),
    week: isoWeek(now),
    source: '馆员热榜 · 官方发布 + 官方 RSS',
    note: '每周更新：馆员挑选发布级事件，其余由 OpenAI / Google 官方 RSS 自动补入近 14 天的更新；中文导读只依据官方标题与摘要，细节以原文为准。',
    count: items.length,
    items,
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`热点入库 ${items.length} 条（馆员 ${picks.length} + 官方 RSS ${fresh.length}），周 ${payload.week}。`);
}

main();

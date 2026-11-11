// tools/rewrite-frontier.mjs · 把 arXiv 元数据编译成中文科普新闻
// 用法：node tools/rewrite-frontier.mjs [--max 8]
// 只读取 content/frontier.json 的标题/摘要，不引入外部事实；结果写回每条的 news 字段。
// 需要项目根 .env 的 DEEPSEEK_API_KEY；未配置时安全退出，不阻塞每日入库。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'content', 'frontier.json');
const MAX = (() => {
  const i = process.argv.indexOf('--max');
  return i > -1 ? Math.max(1, Number(process.argv[i + 1]) || 8) : 8;
})();

function loadEnv() {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

const KEY = process.env.DEEPSEEK_API_KEY || '';
const BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.siliconflow.cn/v1/chat/completions';
const ENDPOINT = BASE.endsWith('/chat/completions') ? BASE : BASE.replace(/\/+$/, '') + '/chat/completions';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3.2';

if (!KEY) {
  console.log('未配置 DEEPSEEK_API_KEY，跳过科普编译（保留英文元数据）。');
  process.exit(0);
}
if (!existsSync(FILE)) {
  console.error('content/frontier.json 不存在，请先运行 tools/fetch-arxiv.mjs。');
  process.exit(1);
}

const json = JSON.parse(readFileSync(FILE, 'utf8'));
const items = Array.isArray(json.items) ? json.items : [];

const SYSTEM = `你是「机忆书库」的科普编辑。读者是对 AI 感兴趣但非专业的普通人。
只根据用户给出的论文标题和摘要写中文科普导读，不得引入摘要之外的数字、结论、人物或机构。
语气克制、具体、不夸张；不要写「颠覆」「革命性」这类词。
只输出一个 JSON 对象，不要 Markdown，不要解释。字段：
title_zh：中文标题，≤22 字，具体；
lede：一句话讲清楚这篇论文做了什么，≤60 字；
why：为什么普通读者值得知道，≤45 字；
tags：2-3 个中文标签，优先从给定领域和论文主题中选。`;

function clean(s, max) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function rewrite(item) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `领域：${item.field || '交叉'}\n英文标题：${item.title}\n摘要：${item.summary}` },
    ],
    temperature: 0.3,
    max_tokens: 320,
    response_format: { type: 'json_object' },
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('模型没有返回 JSON');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const news = {
    title_zh: clean(parsed.title_zh, 40),
    lede: clean(parsed.lede, 120),
    why: clean(parsed.why, 90),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((x) => clean(x, 16)).filter(Boolean).slice(0, 3) : [],
  };
  if (!news.title_zh || !news.lede) throw new Error('字段不完整');
  return news;
}

let done = 0;
let failed = 0;
for (const item of items) {
  if (item.news && item.news.title_zh && item.news.lede) continue;
  if (done >= MAX) break;
  let ok = false;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    try {
      item.news = await rewrite(item);
      ok = true;
      done += 1;
      console.log(`OK  ${item.news.title_zh}  ←  ${item.title}`);
    } catch (e) {
      if (attempt === 2) {
        failed += 1;
        console.warn(`SKIP ${item.title}  (${e.message})`);
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  writeFileSync(FILE, JSON.stringify(json, null, 2) + '\n', 'utf8');
  await new Promise((r) => setTimeout(r, 350));
}

json.newsUpdated = new Date().toISOString();
json.note = '前沿观察每天从 arXiv 选新论文：中文标题/导读/为什么值得看由馆员编译，可能不完整；数字、结论与原文冲突时以 arXiv 原文为准。未编译的条目保留英文元数据。';
writeFileSync(FILE, JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log(`编译完成：新增 ${done} 条，失败 ${failed} 条，共 ${items.length} 条。`);

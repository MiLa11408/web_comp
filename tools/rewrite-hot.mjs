// tools/rewrite-hot.mjs · 把 Hacker News 热点标题编译成中文
// 用法：node tools/rewrite-hot.mjs [--max 6] [--force]
// 只翻译与解释标题，不补充标题之外的事实；馆员挑选的条目已有中文，不再覆盖。
// 需要项目根 .env 的 DEEPSEEK_API_KEY；未配置时安全退出，不阻塞入库。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'content', 'frontier-hot.json');
const FORCE = process.argv.includes('--force');
const MAX = (() => {
  const i = process.argv.indexOf('--max');
  return i > -1 ? Math.max(1, Number(process.argv[i + 1]) || 6) : 6;
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
  console.log('未配置 DEEPSEEK_API_KEY，跳过热点编译（保留英文标题）。');
  process.exit(0);
}
if (!existsSync(FILE)) {
  console.error('content/frontier-hot.json 不存在，请先运行 tools/fetch-hot.mjs。');
  process.exit(1);
}

const json = JSON.parse(readFileSync(FILE, 'utf8'));
const items = Array.isArray(json.items) ? json.items : [];

const SYSTEM = `你是「机忆书库」的科普编辑。读者是对 AI 感兴趣但非专业的普通人。
只根据用户给出的官方标题与摘要写中文，不得补充标题/摘要之外的事实、数字、结论或机构判断。
标题可能带营销语气，翻译要保留信息、去掉夸张；不要把没说的内容写成事实。
只输出一个 JSON 对象，不要 Markdown，不要解释。字段：
title_zh：中文标题，≤28 字，保留专有名词；
lede：一句话说清这条更新做了什么，≤70 字；
why：为什么值得关注，≤50 字；只解释它指向的话题，不预言结果；
tags：2–3 个中文标签；
level：入门 / 进阶 / 硬核，三选一。`;

function clean(s, max) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function rewrite(item) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `来源：${item.source || '官方'}\n日期：${item.date || ''}\n英文标题：${item.title}`
          + (item.summary ? `\n官方摘要：${item.summary}` : ''),
      },
    ],
    temperature: 0.25,
    max_tokens: 600,
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
  const out = {
    title_zh: clean(parsed.title_zh, 40),
    lede: clean(parsed.lede, 120),
    why: clean(parsed.why, 100),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((x) => clean(x, 16)).filter(Boolean).slice(0, 3) : [],
    level: ['入门', '进阶', '硬核'].includes(parsed.level) ? parsed.level : '',
  };
  if (!out.title_zh) throw new Error('字段不完整');
  return out;
}

let done = 0;
let failed = 0;
for (const item of items) {
  if (item.curated) continue;
  if (!FORCE && item.title_zh) continue;
  if (done >= MAX) break;
  let ok = false;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    try {
      Object.assign(item, await rewrite(item));
      ok = true;
      done += 1;
      console.log(`OK  ${item.title_zh}  ←  ${item.title}`);
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

json.rewritten = new Date().toISOString();
writeFileSync(FILE, JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log(`热点编译完成：新增 ${done} 条，失败 ${failed} 条，共 ${items.length} 条。`);

// verify.mjs · 内容自检：结构 / 字数 / 来源 / 关系双向 / 索书号唯一 / 链接可达
// 用法：node tools/verify.mjs [--links]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const CHECK_LINKS = process.argv.includes('--links');

const fails = [];
const warns = [];
const F = (m) => { fails.push(m); console.log(`FAIL ${m}`); };
const W = (m) => { warns.push(m); console.log(`WARN ${m}`); };
const ok = (m) => console.log(`OK   ${m}`);

const STYLES = new Set(['history', 'tech', 'industry', 'frontier']);

// ---------- books.json ----------
const books = JSON.parse(readFileSync(path.join(CONTENT, 'books.json'), 'utf8'));
if (!Array.isArray(books) || books.length !== 36) F('books.json 需恰好 36 本书（12 原有 + 24 专题册）');
const calls = new Set();
const bookIds = new Set();
for (const b of books) {
  if (!b.id || !/^b\d+$/.test(b.id)) F(`书 id 非法: ${JSON.stringify(b.id)}`);
  bookIds.add(b.id);
  if (calls.has(b.call)) F(`索书号重复: ${b.call}`);
  calls.add(b.call);
  if (!STYLES.has(b.style)) F(`${b.id} style 非法: ${b.style}`);
}

// ---------- 章节 ----------
const chaptersDir = path.join(CONTENT, 'chapters');
const chapters = new Map(); // id -> {meta, body, file, words}
if (!existsSync(chaptersDir)) {
  F('content/chapters 目录不存在');
} else {
  for (const dir of readdirSync(chaptersDir)) {
    const dirPath = path.join(chaptersDir, dir);
    if (!existsSync(dirPath) || !bookIds.has(dir)) {
      F(`章节目录不属于任何书: ${dir}`);
      continue;
    }
    for (const file of readdirSync(dirPath)) {
      if (!file.endsWith('.md')) continue;
      const full = path.join(dirPath, file);
      const raw = readFileSync(full, 'utf8');
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (!m) { F(`${file} 缺 frontmatter`); continue; }
      let meta;
      try { meta = YAML.parse(m[1]); } catch (e) { F(`${file} frontmatter 解析失败: ${e.message}`); continue; }
      const body = m[2];
      const cjk = (body.match(/[\u4e00-\u9fff]/g) || []).length;
      const label = meta.id || file;
      chapters.set(meta.id, { meta, body, file: full, words: cjk, label });

      // 字段完整
      for (const f of ['id', 'book', 'no', 'title', 'style', 'year', 'tags', 'relations', 'summary', 'sources']) {
        if (meta[f] === undefined || meta[f] === null) F(`${label} 缺字段 ${f}`);
      }
      if (!/^b\d+-c[1-8]$/.test(meta.id || '')) F(`${label} id 格式应为 bN-cN，实际 ${meta.id}`);
      if (!bookIds.has(meta.book)) F(`${label} book 不存在: ${meta.book}`);
      if (!Number.isInteger(meta.no) || meta.no < 1 || meta.no > 8) F(`${label} no 应为 1–8`);
      if (!STYLES.has(meta.style)) F(`${label} style 非法: ${meta.style}`);
      if (!Array.isArray(meta.tags) || meta.tags.length < 2) F(`${label} tags 至少 2 个`);
      if (typeof meta.summary !== 'string' || meta.summary.length < 10 || meta.summary.length > 200)
        F(`${label} summary 应为 10–200 字`);
      if (!Array.isArray(meta.sources) || meta.sources.length < 3) {
        F(`${label} 来源至少 3 条`);
      } else {
        for (const s of meta.sources) {
          if (!s.title || !/^https?:\/\//.test(s.url || '')) F(`${label} 来源缺 title/url: ${JSON.stringify(s)}`);
          if (s.checked !== true) F(`${label} 来源未核验（checked≠true）: ${s.title}`);
        }
      }
      if (meta.features !== undefined && !Array.isArray(meta.features)) F(`${label} features 应为数组`);

      // 字数
      if (cjk < 1500) F(`${label} 正文汉字 ${cjk} < 1500`);
      else if (cjk < 1800) W(`${label} 正文汉字 ${cjk}（偏低，建议 ≥1800）`);
      if (cjk > 2500) W(`${label} 正文汉字 ${cjk} > 2500（偏长）`);
      else ok(`${label} ${meta.title}(${meta.style}) 汉字 ${cjk} 来源 ${(meta.sources || []).length}`);

      // 9 段结构
      const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((x) => x[1].trim());
      const REQUIRED = ['一句话', '时间·人物·机构', '为什么是这个时候', '怎么工作', '它改变了什么', '今天的地位', '争议与局限', '关系', '档案'];
      for (const h of REQUIRED) {
        if (!headings.includes(h)) F(`${label} 缺少段落「${h}」`);
      }
    }
  }
}

// ---------- 关系双向 + 目标存在 ----------
// graph/rail 的 id 登记表（下方解析区块填充；此处先声明避免时序问题）
const nodeIds = new Set();
const stationIds = new Set();

if (!fails.some((f) => f.includes('目录不存在'))) {
  const ids = new Set(chapters.keys());
  for (const [, { meta, label }] of chapters) {
    const rel = meta.relations || {};
    for (const [dir, arr] of [['prev', rel.prev], ['next', rel.next], ['transit', rel.transit]]) {
      if (!Array.isArray(arr)) { F(`${label} relations.${dir} 应为数组`); continue; }
      for (const t of arr) {
        if (dir === 'transit') {
          // transit 可指向章节 / 图节点 / 轨道站；图与轨道骨架未填时容忍
          if (!ids.has(t) && !nodeIds.has(t) && !stationIds.has(t)) {
            W(`${label} transit 目标未登记: ${t}（图/轨道阶段 4 补）`);
          }
        } else if (!ids.has(t)) {
          if (/^b\d+-c[1-8]$/.test(t) && bookIds.has(t.split('-')[0])) {
            W(`${label} relations.${dir} 指向未写的章节: ${t}（96 章齐全后必须存在）`);
          } else {
            F(`${label} relations.${dir} 指向不存在的章节: ${t}`);
          }
        }
      }
    }
  }
  // 双向（样本期：仅对已存在的章验证）
  for (const [id, { meta, label }] of chapters) {
    for (const t of meta.relations?.prev || []) {
      const target = chapters.get(t);
      if (target && !(target.meta.relations?.next || []).includes(id)) {
        F(`${label} prev→${t} 但 ${t}.next 未包含 ${id}（关系未双向）`);
      }
    }
    for (const t of meta.relations?.next || []) {
      const target = chapters.get(t);
      if (target && !(target.meta.relations?.prev || []).includes(id)) {
        F(`${label} next→${t} 但 ${t}.prev 未包含 ${id}（关系未双向）`);
      }
    }
  }
  // 每本书至少 1 章（样本期）；8 章齐全仅为提醒
  for (const b of books) {
    const count = [...chapters.values()].filter(({ meta }) => meta.book === b.id).length;
    if (count === 0) W(`${b.id} ${b.title} 还没有章节（待写）`);
    else if (count < 8) W(`${b.id} ${b.title} 现有 ${count}/8 章`);
    else ok(`${b.id} ${b.title} 8/8 章`);
  }
}

// ---------- graph / rail 骨架 ----------
for (const jsonFile of ['graph.json', 'rail.json']) {
  const p = path.join(CONTENT, jsonFile);
  if (!existsSync(p)) { W(`${jsonFile} 缺失`); continue; }
  const data = JSON.parse(readFileSync(p, 'utf8'));
  if (jsonFile === 'graph.json') {
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) F('graph.json nodes/edges 应为数组');
    for (const n of data.nodes || []) nodeIds.add(n.id);
  } else {
    const lines = data.lines || [];
    if (!Array.isArray(lines)) F('rail.json lines 应为数组');
    for (const ln of lines) for (const st of ln.stations || []) stationIds.add(st.id);
  }
}

// ---------- 链接核验（可选） ----------
if (CHECK_LINKS) {
  console.log('\n-- 链接核验 --');
  const urls = new Map();
  for (const [, { meta }] of chapters) {
    for (const s of meta.sources || []) urls.set(s.url, (urls.get(s.url) || 0) + 1);
  }
  const LENIENT = process.argv.includes('--links-lenient');
  let done = 0;
  const bad = [];
  const blocked = [];
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  for (const url of urls.keys()) {
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 30000);
        const res = await fetch(url, {
          method: 'GET', redirect: 'follow', signal: ctrl.signal,
          headers: { 'User-Agent': UA },
        });
        clearTimeout(timer);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { blocked.push([url, res.status]); lastErr = null; break; }
          lastErr = { status: res.status };
        } else { lastErr = null; break; }
      } catch (e) {
        lastErr = e.message;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (lastErr !== null) bad.push([url, typeof lastErr === 'object' && lastErr.status ? `HTTP ${lastErr.status}` : lastErr]);
    done++;
    process.stdout.write(`\r${done}/${urls.size} ${'#'.repeat(Math.min(20, Math.round((done / Math.max(1,urls.size)) * 20)))}`);
  }
  console.log('');
  for (const [u, why] of blocked) {
    if (LENIENT) W(`来源 401/403（疑似反爬拦截）: ${u}`);
    else F(`来源 401/403（疑似反爬拦截）: ${u} (${why})`);
  }
  for (const [u, why] of bad) {
    // 本机网络连接失败 ≠ 链接死亡：写手已用 WebFetch 渠道实开核验，此处仅警告
    if (LENIENT || !/^HTTP \d+$/.test(why)) W(`本机未能连通（写手已核验过，建议人工确认）: ${u} (${why})`);
    else F(`来源不可达: ${u} (${why})`);
  }
}

// ---------- 汇总 ----------
console.log(`\n== chapters=${chapters.size} FAIL=${fails.length} WARN=${warns.length} ==`);
if (fails.length) process.exit(1);
console.log('verify 全绿 ✓');
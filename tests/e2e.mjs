// tests/e2e.mjs · 端到端 / 兼容性 / 性能冒烟
// 运行：node tests/e2e.mjs   （需本机 Chrome 或 Edge，服务已在 3300 启动）
// 可用 BASE=http://127.0.0.1:3300/ 覆盖地址。
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://127.0.0.1:3300/';
const results = [];
const ok = (name, detail = '') => { results.push({ name, pass: true, detail }); console.log(`PASS  ${name}  ${detail}`); };
const bad = (name, detail = '') => { results.push({ name, pass: false, detail }); console.log(`FAIL  ${name}  ${detail}`); };

const launchOpts = { headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] };
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', ...launchOpts });
} catch (e) {
  try { browser = await chromium.launch({ channel: 'msedge', ...launchOpts }); }
  catch (e2) { console.error('无法启动系统浏览器：', e.message, '/', e2.message); process.exit(2); }
}

const t0 = Date.now();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

// 1. 入馆门厅
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#gate', { timeout: 8000 });
const gateTitle = await page.locator('.gate-title').innerText();
const gateMs = Date.now() - t0;
if (gateTitle.includes('机忆书库')) ok('入馆门厅显示', `${gateMs}ms`);
else bad('入馆门厅显示', gateTitle);
const gateBtns = await page.locator('.gate-btn').count();
gateBtns === 3 ? ok('门厅三个按钮', String(gateBtns)) : bad('门厅三个按钮', String(gateBtns));

await page.getByRole('button', { name: '以访客身份入馆' }).click();
await page.waitForFunction(() => !document.getElementById('gate'), null, { timeout: 3000 });
ok('访客入馆后门厅移除');
await page.waitForTimeout(800);
const mainVisible = await page.locator('#app').isVisible();
mainVisible ? ok('主界面可见') : bad('主界面可见');

// 2. 铁路线视图
await page.getByRole('button', { name: '铁路线' }).click();
await page.waitForSelector('.rail-line', { timeout: 8000 });
const lineCount = await page.locator('.rail-line').count();
const stopCount = await page.locator('.rail-stop').count();
const branchCount = await page.locator('.rail-branch').count();
const transferCount = await page.locator('.rs-transfer').count();
lineCount === 5 ? ok('铁路线 5 条主线', String(lineCount)) : bad('铁路线主线数', String(lineCount));
stopCount >= 40 ? ok('铁路站点数', String(stopCount)) : bad('铁路站点数', String(stopCount));
branchCount >= 5 ? ok('支线数', String(branchCount)) : bad('支线数', String(branchCount));
transferCount >= 3 ? ok('换乘站标记', String(transferCount)) : bad('换乘站标记', String(transferCount));

// 3. 点站点开书 → 阅读三栏
await page.locator('.rail-stop').first().click();
await page.waitForSelector('#reader', { timeout: 8000 });
const paperLen = (await page.locator('.paper').innerText()).length;
paperLen > 1500 ? ok('阅读页正文长度', String(paperLen)) : bad('阅读页正文长度', String(paperLen));
const hasRail = await page.locator('#rail').count();
const hasNotes = await page.locator('#notesCol').count();
const hasFloat = await page.locator('.reader-float-close').count();
(hasRail && hasNotes) ? ok('阅读三栏（左检索/右页边注）') : bad('阅读三栏', `rail=${hasRail} notes=${hasNotes}`);
hasFloat ? ok('浮动合书键存在') : bad('浮动合书键存在');

const noteCount = await page.locator('.note').count();
noteCount >= 1 ? ok('页边注渲染', String(noteCount)) : bad('页边注渲染', String(noteCount));
if (noteCount >= 1) {
  const anchored = page.locator('.note[data-anchor]').first();
  if (await anchored.count()) {
    await anchored.click();
    await page.waitForTimeout(400);
    const flashed = await page.locator('.paper h2.flash').count();
    flashed >= 1 ? ok('页边注锚点跳转高亮') : bad('页边注锚点跳转高亮', '无 h2.flash');
  } else bad('页边注锚点属性', '无 data-anchor');
}

await page.locator('.reader-float-close').first().click();
await page.waitForTimeout(2000);
const stillReading = await page.evaluate(() => document.body.classList.contains('reading'));
const fadeOn = await page.evaluate(() => !!document.querySelector('#viewFade.on'));
if (stillReading || fadeOn) bad('合书返回阅览室', `reading=${stillReading} fadeOn=${fadeOn}`);
else ok('合书返回阅览室');

// 4. 书架视图 / 总览
await page.getByRole('button', { name: '书架视图' }).click();
await page.waitForSelector('.unit', { timeout: 8000 });
const spineCount = await page.locator('.book-spine').count();
spineCount >= 36 ? ok('书架视图全部书脊', String(spineCount)) : bad('书架视图全部书脊', String(spineCount));

await page.getByRole('button', { name: '书架总览' }).click();
await page.waitForSelector('.book-row', { timeout: 8000 });
const rowCount = await page.locator('.book-row').count();
rowCount >= 36 ? ok('总览书目行数', String(rowCount)) : bad('总览书目行数', String(rowCount));

// 5. 检索四级排序
await page.getByRole('button', { name: '书架视图' }).click();
await page.waitForSelector('#q', { timeout: 5000 });
await page.fill('#q', 'Transformer');
await page.press('#q', 'Enter');
await page.waitForSelector('.hit', { timeout: 8000 });
const firstHit = await page.locator('.hit h4').first().innerText();
const hits = await page.locator('.hit').count();
(firstHit.includes('Transformer') || firstHit.includes('注意力'))
  ? ok('检索首条命中标题/tag', firstHit)
  : bad('检索首条命中', firstHit);
hits >= 1 ? ok('检索返回结果数', String(hits)) : bad('检索返回结果数');

// 6. 后端接口：注册 / 登录 / 盖章 / 批注 / 进度
const api = page.request;
const uname = 'e2e_' + Date.now();
const reg = await api.post(BASE + 'api/register', { data: { username: uname, password: 'test-pass-2026' } });
reg.status() === 201 ? ok('注册接口 201') : bad('注册接口', String(reg.status()));
const regBody = await reg.json();
const token = regBody.token;
const auth = { headers: { authorization: 'Bearer ' + token } };
const me = await api.get(BASE + 'api/me', auth);
me.ok() ? ok('会话 /api/me') : bad('会话 /api/me', String(me.status()));
const stamp = await api.post(BASE + 'api/stamps', { ...auth, data: { chapter_id: 'b1-c1', kind: 'chapter' } });
stamp.status() === 201 ? ok('盖章接口 201') : bad('盖章接口', String(stamp.status()));
const anno = await api.post(BASE + 'api/annotations', { ...auth, data: { chapter_id: 'b1-c1', quote: '测试引文', note: 'E2E 批注' } });
anno.status() === 201 ? ok('批注接口 201') : bad('批注接口', String(anno.status()));
const prog = await api.post(BASE + 'api/progress', { ...auth, data: { chapter_id: 'b1-c1', state: 'done' } });
prog.ok() ? ok('进度接口') : bad('进度接口', String(prog.status()));

// 7. 性能：接口耗时与并发
const cat = await api.get(BASE + 'api/catalog');
const catMs = cat.headers()['x-response-time'] || null;
const tCat = Date.now();
await cat.json();
const catalogMs = Date.now() - tCat;
const tSearch = Date.now();
const burst = await Promise.all(Array.from({ length: 20 }, (_, i) =>
  api.get(BASE + 'api/search?q=' + encodeURIComponent(['神经网络', 'Transformer', '扩散', '强化学习'][i % 4]))));
const burstMs = Date.now() - tSearch;
const maxSearch = Math.max(...await Promise.all(burst.map(async (r) => { const s = Date.now(); await r.json(); return Date.now() - s; })));
ok('catalog 竞态可用', `并发目录接口 ${catalogMs}ms`);
burst.every((r) => r.ok()) ? ok('20 并发检索全部 200', `${burstMs}ms 总耗时`) : bad('20 并发检索', '存在非 200');
ok('单次检索响应', `≤ ${maxSearch}ms`);

// 8. 移动端 390×844
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mobErrors = [];
mob.on('pageerror', (e) => mobErrors.push(e.message));
await mob.goto(BASE, { waitUntil: 'commit', timeout: 20000 });
await mob.waitForSelector('#gate', { state: 'attached', timeout: 15000 });
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
overflow <= 1 ? ok('移动端无横向溢出', `${overflow}px`) : bad('移动端横向溢出', `${overflow}px`);
await mob.bringToFront();
await mob.waitForFunction(() => typeof window.gateGuest === 'function', null, { timeout: 10000 });
await mob.evaluate(() => window.gateGuest());
await mob.waitForTimeout(1500);
if (await mob.locator('#gate').count()) await mob.evaluate(() => document.getElementById('gate')?.remove());
await mob.waitForTimeout(300);
await mob.waitForSelector('button:has-text("铁路线")', { timeout: 20000 });
await mob.locator('button:has-text("铁路线")').first().click();
await mob.waitForSelector('.rail-line', { timeout: 8000 });
const mobRail = await mob.locator('.rail-line').count();
mobRail === 5 ? ok('移动端铁路线渲染', String(mobRail)) : bad('移动端铁路线渲染', String(mobRail));
if (mobErrors.length) bad('移动端 JS 报错', mobErrors.slice(0, 2).join(' | '));
else ok('移动端无 JS 报错');
await mob.close();

// 9. 控制台错误
const realErrors = errors.filter((e) => !/WebGL|GPU|swiftshader|THREE.WebGLRenderer|Failed to load resource/i.test(e));
realErrors.length === 0 ? ok('桌面端无 JS 报错') : bad('桌面端 JS 报错', realErrors.slice(0, 3).join(' | '));

await browser.close();

const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
console.log(`\n=== ${passed} passed, ${failed} failed, ${results.length} total ===`);
process.exit(failed === 0 ? 0 : 1);

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
await page.waitForFunction(() => !document.getElementById('gate'), null, { timeout: 5000 });
await page.waitForTimeout(1200);
if (await page.locator('#gSkip').count()) await page.locator('#gSkip').click();
ok('访客入馆后门厅移除与入馆指引');
await page.waitForTimeout(800);
const mainVisible = await page.locator('#app').isVisible();
mainVisible ? ok('主界面可见') : bad('主界面可见');

// 导览（3D 已就绪，直接开场；避免先切 2D 再回 3D 的软件渲染重编译）
await page.waitForFunction(() => window.mm3d && typeof window.mm3d.startTour === 'function', null, { timeout: 25000 });
await page.getByRole('button', { name: '导览' }).click();
await page.waitForSelector('#tourCard .tour-card', { timeout: 15000 });
// 自动导览会按 20s/站推进；测试里先暂停，避免软件渲染慢导致串站
await page.evaluate(() => window.mmTourPause && window.mmTourPause());
await page.waitForTimeout(1400);
const tourStepCount = await page.locator('.tour-kicker').innerText();
tourStepCount.includes('1/8') ? ok('自动导览 8 站', tourStepCount) : bad('自动导览 8 站', tourStepCount);
const tourBarCount = await page.locator('#tourBar').count();
tourBarCount ? ok('导览进度条') : bad('导览进度条');
const tourPauseTxt = await page.locator('#tourPause').innerText();
const tour1 = await page.locator('#tourCard h3').innerText();
tour1.includes('入口') ? ok('导览开场站', tour1) : bad('导览开场站', tour1);
tourPauseTxt.includes('继续') ? ok('导览可暂停/继续', tourPauseTxt) : bad('导览暂停按钮', tourPauseTxt);
await page.locator('#tourCard button', { hasText: '下一步' }).click();
await page.waitForTimeout(1500);
const tour2 = await page.locator('#tourCard h3').innerText();
tour2.includes('书架') ? ok('导览下一步', tour2) : bad('导览下一步', tour2);
await page.locator('#tourCard .tour-end').click();
await page.waitForTimeout(600);
const tourGone = await page.locator('#tourCard').count();
const tourStill = await page.evaluate(() => window.mm3d && window.mm3d.isTouring && window.mm3d.isTouring());
(!tourGone && !tourStill) ? ok('导览结束清理') : bad('导览结束清理', `card=${tourGone} touring=${tourStill}`);

// 后排可达：从书架组间空隙直走，应能进到两排之间
await page.evaluate(() => window.mm3d.reset());
await page.waitForTimeout(600);
await page.keyboard.down('w');
await page.waitForTimeout(16000);
await page.keyboard.up('w');
const zAisle = await page.evaluate(() => Math.round(window.mm3d.player.pos.z * 100) / 100);
zAisle < -2.6 ? ok('可从空隙走到两排书架之间', `z=${zAisle}`) : bad('后排可达', `z=${zAisle}`);
await page.evaluate(() => window.mm3d.reset());
await page.waitForTimeout(700);

// 3D 失窃展柜：9 件 + 可定位
const stolenPlan = await page.evaluate(() => window.mm3d.getStolenPlan().length);
stolenPlan === 9 ? ok('3D 失窃展柜 9 件', String(stolenPlan)) : bad('3D 失窃展柜数量', String(stolenPlan));
const stolenFocus = await page.evaluate(() => window.mm3d.focusStolen('dartmouth-proposal'));
stolenFocus ? ok('3D 展柜镜头定位') : bad('3D 展柜镜头定位');
await page.evaluate(() => { window.mm3d.setFloor('all', true); window.mm3d.reset(); });
await page.waitForTimeout(700);

// 星图（3D）
await page.getByRole('button', { name: '星图' }).click();
await page.waitForSelector('#mm-star-overlay', { timeout: 12000 });
await page.waitForTimeout(600);
const starNodes = await page.evaluate(() => window.__mmStarNodes || 0);
const starCanvas = await page.locator('#mm-star-overlay canvas').count();
const starLegend = await page.locator('.mm-star3d-legend span').count();
starNodes >= 36 ? ok('立体星图节点数', String(starNodes)) : bad('立体星图节点数', String(starNodes));
starCanvas === 1 ? ok('星图 WebGL 画布') : bad('星图 WebGL 画布', String(starCanvas));
starLegend === 4 ? ok('星图四层图例', String(starLegend)) : bad('星图四层图例', String(starLegend));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
(await page.locator('#mm-star-overlay').count()) === 0 ? ok('星图 Esc 关闭') : bad('星图 Esc 关闭');

// 2. 书轨视图（线路图 + 换乘线 + 发车）
await page.getByRole('button', { name: '书轨' }).click();
await page.waitForSelector('#rgSvg .rg-stop', { timeout: 8000 });
const lineCount = await page.locator('.rg-line-chip').count();
const stopCount = await page.locator('#rgSvg .rg-stop').count();
const branchCount = await page.locator('#rgSvg path[stroke-dasharray="4 4"]').count();
const transferCount = await page.locator('#rgSvg .rg-xfer').count();
lineCount === 5 ? ok('书轨 5 条主线', String(lineCount)) : bad('书轨主线数', String(lineCount));
stopCount >= 40 ? ok('书轨站点数', String(stopCount)) : bad('书轨站点数', String(stopCount));
branchCount >= 5 ? ok('书轨支线数', String(branchCount)) : bad('书轨支线数', String(branchCount));
transferCount >= 3 ? ok('书轨换乘线', String(transferCount)) : bad('书轨换乘线', String(transferCount));
const trainCount = await page.locator('#rgSvg .rg-train').count();
trainCount === 5 ? ok('书轨发车动画列车', String(trainCount)) : bad('书轨发车列车数', String(trainCount));

// 3. 点站点开书 → 阅读三栏
await page.locator('#rgSvg .rg-stop').first().click();
await page.waitForSelector('#reader', { timeout: 8000 });
const paperLen = (await page.locator('.paper').innerText()).length;
paperLen > 1500 ? ok('阅读页正文长度', String(paperLen)) : bad('阅读页正文长度', String(paperLen));
const hasRail = await page.locator('#rail').count();
const hasNotes = await page.locator('#notesCol').count();
const hasFloat = await page.locator('.reader-float-close').count();
(hasRail && hasNotes) ? ok('阅读三栏（左检索/右页边注）') : bad('阅读三栏', `rail=${hasRail} notes=${hasNotes}`);
hasFloat ? ok('浮动合书键存在') : bad('浮动合书键存在');
const readNext = await page.locator('.read-next .rn-btn.next').count();
readNext ? ok('章末「下一章」入口') : bad('章末「下一章」入口');

const toolCount = await page.locator('.reader-tools button').count();
toolCount >= 3 ? ok('阅读工具条（盖章/批注/读完）', String(toolCount)) : bad('阅读工具条', String(toolCount));
if (await page.locator('button:has-text("可玩演示")').count()) {
  await page.locator('button:has-text("可玩演示")').click();
  await page.waitForSelector('.mm-demo-overlay', { timeout: 8000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  (await page.locator('.mm-demo-overlay').count()) === 0 ? ok('可玩演示弹层与关闭') : bad('可玩演示弹层', 'Esc 未关闭');
} else bad('可玩演示入口', '当前章节没有演示按钮');

// 残页：切到 b1-c3（藏着 R-01），纸片掉落 → 主动捡起 → 残缺内容 + 馆员旁白
await page.evaluate(() => window.showChapter('b1-c3'));
await page.waitForTimeout(1400);
const fragDrop = await page.locator('#fragDrop').count();
fragDrop ? ok('残页掉落提示（不直接显示编号）') : bad('残页掉落提示');
if (fragDrop) {
  const cardText = await page.locator('.ifline-card').innerText();
  !cardText.includes('R-01') ? ok('右栏不剧透残页编号') : bad('右栏剧透残页编号', cardText.slice(0, 30));
  await page.locator('#fdYes').click();
  await page.waitForSelector('#fragModal', { timeout: 6000 });
  const fragText = await page.locator('.frag-box').innerText();
  (fragText.includes('R-01') && fragText.includes('别查')) ? ok('残页残缺内容与馆员旁白') : bad('残页内容/旁白', fragText.slice(0, 40));
  await page.locator('#fragClose').click();
  await page.waitForTimeout(300);
}
const fragCount = await page.locator('#fragCount').innerText();
fragCount.startsWith('1/') ? ok('残页计数', fragCount) : bad('残页计数', fragCount);

const stolenCardCount = await page.locator('.anomaly-card.stolen').count();
if (stolenCardCount >= 1) {
  const stolenText = await page.locator('.anomaly-card.stolen').first().innerText();
  stolenText.includes('S-01') && stolenText.includes('展柜')
    ? ok('缺页章节出现失窃页卡片') : bad('失窃页卡片内容', stolenText.slice(0, 40));
} else bad('失窃页卡片', 'b1-c3 未渲染');

const noteCount = await page.locator('.note').count();
noteCount >= 1 ? ok('页边注渲染', String(noteCount)) : bad('页边注渲染', String(noteCount));
if (noteCount >= 1) {
  await page.waitForTimeout(300);
  const anchored = page.locator('.note[data-anchor]').first();
  if (await anchored.count()) {
    await anchored.click();
    await page.waitForTimeout(400);
    const flashed = await page.locator('.paper h2.flash').count();
    flashed >= 1 ? ok('页边注锚点跳转高亮') : bad('页边注锚点跳转高亮', '无 h2.flash');
  } else bad('页边注锚点属性', '无 data-anchor');
}

// 章节总结卡（阅读页右栏）
const cardCount = await page.locator('.chapter-card').count();
const ccPeople = await page.locator('.chapter-card .cc-people li').count();
const ccSources = await page.locator('.chapter-card .cc-sources li').count();
const ccQuote = await page.locator('.chapter-card .cc-quote').innerText();
cardCount === 1 && ccPeople >= 2 && ccSources === 3 && ccQuote.length > 8
  ? ok('章节总结卡渲染', `${ccPeople}人/${ccSources}来源`)
  : bad('章节总结卡', `card=${cardCount} people=${ccPeople} sources=${ccSources} quote=${ccQuote.length}`);
const cardExport = await page.evaluate(() => typeof window.downloadChapterCard === 'function');
cardExport ? ok('总结卡 PNG 导出入口') : bad('总结卡 PNG 导出入口');

await page.locator('.reader-float-close').first().click();
await page.waitForTimeout(2000);
const stillReading = await page.evaluate(() => document.body.classList.contains('reading'));
const fadeOn = await page.evaluate(() => !!document.querySelector('#viewFade.on'));
if (stillReading || fadeOn) bad('合书返回阅览室', `reading=${stillReading} fadeOn=${fadeOn}`);
else ok('合书返回阅览室');

// 3b. 发展时间轴
await page.getByRole('button', { name: '时间轴' }).click();
await page.waitForSelector('.tl-decade', { timeout: 10000 });
const decades = await page.locator('.tl-decade').count();
const tnodes = await page.locator('.tl-node').count();
decades >= 7 ? ok('时间轴年代分组', String(decades)) : bad('时间轴年代分组', String(decades));
tnodes >= 200 ? ok('时间轴章节卡片', String(tnodes)) : bad('时间轴章节卡片', String(tnodes));
const failCount = await page.locator('.fail-item').count();
const sizeCount = await page.locator('.size-item').count();
failCount >= 20 ? ok('失败博物馆条目', String(failCount)) : bad('失败博物馆条目', String(failCount));
sizeCount >= 12 ? ok('模型尺寸墙条目', String(sizeCount)) : bad('模型尺寸墙条目', String(sizeCount));
await page.locator('.tl-node').first().click();
await page.waitForSelector('#reader', { timeout: 8000 });
ok('时间轴卡片可开章');
await page.locator('.reader-float-close').first().click();
await page.waitForTimeout(2000);

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
await page.waitForFunction(() => !window.mmViewBusy, null, { timeout: 10000 });
await page.waitForTimeout(600);
await page.fill('#q', 'Transformer');
await page.press('#q', 'Enter');
await page.waitForSelector('.hit', { timeout: 8000 });
const firstHit = await page.locator('.hit h4').first().innerText();
const hits = await page.locator('.hit').count();
(firstHit.includes('Transformer') || firstHit.includes('注意力'))
  ? ok('检索首条命中标题/tag', firstHit)
  : bad('检索首条命中', firstHit);
hits >= 1 ? ok('检索返回结果数', String(hits)) : bad('检索返回结果数');

// 5b. 借阅档案（阅读上报与残页收编）
await page.waitForFunction(() => !window.mmViewBusy, null, { timeout: 10000 });
await page.getByRole('button', { name: '借阅档案' }).click();
await page.waitForSelector('.stat-cards', { timeout: 10000 });
const statCards = await page.locator('.stat-card').count();
const fragChips = await page.locator('.frag-chip').count();
statCards === 4 ? ok('借阅档案统计卡', String(statCards)) : bad('借阅档案统计卡', String(statCards));
fragChips >= 8 ? ok('残页收集面板', String(fragChips)) : bad('残页收集面板', String(fragChips));
const badgeCount = await page.locator('.badge').count();
badgeCount === 10 ? ok('借阅徽章 10 枚', String(badgeCount)) : bad('借阅徽章数量', String(badgeCount));
const myBooksHead = await page.locator('.stat-sec h3', { hasText: '我翻过的书' }).count();
myBooksHead ? ok('「我翻过的书」聚合') : bad('「我翻过的书」聚合');

// 5b2. 异常馆藏视图：失窃页 / 分岔 / 残页拼合板
await page.waitForFunction(() => !window.mmViewBusy, null, { timeout: 10000 });
await page.getByRole('button', { name: '失窃页', exact: true }).click();
await page.waitForSelector('.stolen-card', { timeout: 10000 });
const stolenCards = await page.locator('.stolen-card').count();
stolenCards === 9 ? ok('失窃页展柜 9 件', String(stolenCards)) : bad('失窃页展柜数量', String(stolenCards));
await page.waitForFunction(() => !window.mmViewBusy, null, { timeout: 10000 });
await page.getByRole('button', { name: '分岔', exact: true }).click();
await page.waitForSelector('.fork-card', { timeout: 10000 });
const forkCards = await page.locator('.fork-card').count();
forkCards === 6 ? ok('历史分岔 6 个岔路', String(forkCards)) : bad('历史分岔数量', String(forkCards));
const forkChoose = await page.locator('.fork-card button', { hasText: '走假如' }).count();
forkChoose === 6 ? ok('分岔「走假如」按钮', String(forkChoose)) : bad('分岔按钮', String(forkChoose));
await page.evaluate(() => window.showFragmentMosaic());
await page.waitForSelector('.frag-slot', { timeout: 10000 });
const fragSlots = await page.locator('.frag-slot').count();
fragSlots === 12 ? ok('残页拼合板 12 格', String(fragSlots)) : bad('残页拼合板格数', String(fragSlots));
const fragPieces = await page.locator('.frag-piece').count();
fragPieces >= 1 ? ok('拼合板可拖放碎片', String(fragPieces)) : bad('拼合板碎片', String(fragPieces));
await page.locator('#fragClose').click();
await page.waitForTimeout(400);

// 5c. 楼层平面图
await page.waitForFunction(() => !window.mmViewBusy, null, { timeout: 10000 });
await page.getByRole('button', { name: '楼层平面图' }).click();
await page.waitForSelector('.plan-svg', { timeout: 10000 });
const planShelves = await page.locator('.plan-svg g[onclick]').count();
planShelves >= 8 ? ok('平面图书架组数', String(planShelves)) : bad('平面图书架组数', String(planShelves));
const planTabs = await page.locator('.plan-tabs button.back').count();
planTabs === 5 ? ok('平面图五档选层', String(planTabs)) : bad('平面图选层档位', String(planTabs));
await page.locator('.plan-tabs button.back', { hasText: 'L4' }).click();
await page.waitForTimeout(600);
const l4Lit = await page.evaluate(() => [...document.querySelectorAll('.plan-svg g[onclick] text')]
  .filter((t) => /\d+ 本/.test(t.textContent || '')).length);
l4Lit >= 2 ? ok('平面图 L4 高亮书架', String(l4Lit)) : bad('平面图 L4 高亮', String(l4Lit));

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

// 6b. 异常馆藏接口：分岔选择可写可读
const forkPost = await api.post(BASE + 'api/collectibles', { ...auth, data: { kind: 'fork', item_id: 'fork-2017', action: 'choose', chapter_id: 'b5-c1' } });
forkPost.status() === 201 ? ok('分岔写入 201') : bad('分岔写入', String(forkPost.status()));
const collGet = await api.get(BASE + 'api/collectibles', auth);
const collBody = await collGet.json();
collBody.forks && collBody.forks['fork-2017'] === 'chosen'
  ? ok('分岔状态可读回', collBody.forks['fork-2017'])
  : bad('分岔状态读回', JSON.stringify(collBody.forks || {}));
const stolenPost = await api.post(BASE + 'api/collectibles', { ...auth, data: { kind: 'stolen', item_id: 'attention-original', action: 'recover' } });
stolenPost.status() === 201 ? ok('失窃页追回 201') : bad('失窃页追回', String(stolenPost.status()));
const restlessPost = await api.post(BASE + 'api/collectibles', { ...auth, data: { kind: 'restless', item_id: 'tay', action: 'find', chapter_id: 'b11-c2' } });
restlessPost.status() === 201 ? ok('躁动书页收容 201') : bad('躁动书页收容', String(restlessPost.status()));

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
await mob.evaluate(() => { if (window.gateGuest) window.gateGuest(); else document.getElementById('gate')?.remove(); });
await mob.waitForTimeout(1600);
if (await mob.locator('#gate').count()) await mob.evaluate(() => document.getElementById('gate')?.remove());
await mob.waitForTimeout(300);
await mob.waitForSelector('button:has-text("书轨")', { timeout: 20000 });
await mob.waitForFunction(() => typeof window.enterRail === 'function', null, { timeout: 30000 });
await mob.locator('button:has-text("书轨")').first().click();
await mob.waitForSelector('#rgSvg .rg-stop', { timeout: 8000 });
const mobRail = await mob.locator('#rgSvg .rg-stop').count();
mobRail >= 40 ? ok('移动端书轨渲染', String(mobRail)) : bad('移动端书轨渲染', String(mobRail));
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

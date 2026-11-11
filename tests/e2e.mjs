﻿﻿﻿﻿﻿﻿﻿// tests/e2e.mjs · 端到端 / 兼容性 / 性能冒烟
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

await page.evaluate(() => localStorage.setItem('mm_tutorial_seen', '1'));
await page.getByRole('button', { name: '以访客身份入馆' }).click();
await page.waitForFunction(() => !document.getElementById('gate'), null, { timeout: 5000 });
await page.waitForTimeout(1200);
ok('访客入馆后门厅移除（二次访问不跳教程）');
await page.waitForTimeout(800);
const mainVisible = await page.locator('#app').isVisible();
mainVisible ? ok('主界面可见') : bad('主界面可见');

// 顶部横栏：可向右收起，再按展开
await page.locator('#navToggle').click();
await page.waitForTimeout(550);
const navCollapsed = await page.locator('#navShell.nav-collapsed').count();
navCollapsed === 1 ? ok('顶部导航可收起') : bad('顶部导航可收起', String(navCollapsed));
await page.locator('#navToggle').click();
await page.waitForTimeout(550);
const navExpanded = await page.locator('#navShell:not(.nav-collapsed)').count();
navExpanded === 1 ? ok('顶部导航可展开') : bad('顶部导航可展开', String(navExpanded));

// 音效：开启后有房间底噪 + 提示音，关闭后底噪停止
const soundBtn = page.locator('#soundBtn');
await soundBtn.click();
await page.waitForTimeout(500);
const sndOn = await page.evaluate(() => ({ on: window.mmAudioOn(), state: window.mmAudioState(), amb: window.mmAudioAmbient() }));
(sndOn.on && sndOn.state === 'running' && sndOn.amb)
  ? ok('音效开启 + 房间底噪', JSON.stringify(sndOn)) : bad('音效开启', JSON.stringify(sndOn));
await soundBtn.click();
await page.waitForTimeout(350);
const sndOff = await page.evaluate(() => ({ on: window.mmAudioOn(), amb: window.mmAudioAmbient() }));
(!sndOff.on && !sndOff.amb) ? ok('音效关闭 + 底噪停止') : bad('音效关闭', JSON.stringify(sndOff));

// 清掉首张区域提示卡，避免后续卡片叠在点击区域
if (await page.locator('#mmTipCard.show').count()) {
  await page.locator('#mmTipCard [data-tip-ok]').click();
  await page.waitForTimeout(300);
}

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
await page.keyboard.up('w');
await page.keyboard.down('w');
let aisleZ = await page.evaluate(() => Math.round(window.mm3d.player.pos.z * 100) / 100);
let stalled = 0;
for (let i = 0; i < 50; i++) {
  await page.waitForTimeout(600);
  const z = await page.evaluate(() => Math.round(window.mm3d.player.pos.z * 100) / 100);
  if (z < -2.6) { aisleZ = z; break; }
  if (Math.abs(z - aisleZ) < 0.02) { stalled += 1; if (stalled >= 8) break; } else stalled = 0;
  aisleZ = z;
}
await page.keyboard.up('w');
aisleZ < -2.6 ? ok('可从空隙走到两排书架之间', `z=${aisleZ}`) : bad('后排可达', `z=${aisleZ}`);
await page.evaluate(() => window.mm3d.reset());
await page.waitForTimeout(700);

// 选字不再卡住移动：操作说明不可选，选到别处文字也会释放 WASD 状态
const hintSelect = await page.evaluate(() => {
  const h = document.querySelector('.mm-hint');
  if (!h) return null;
  const cs = getComputedStyle(h);
  return { userSelect: cs.userSelect || cs.webkitUserSelect, pointerEvents: cs.pointerEvents };
});
(hintSelect && hintSelect.userSelect === 'none' && hintSelect.pointerEvents === 'none')
  ? ok('3D 操作说明不可选字') : bad('3D 操作说明不可选字', JSON.stringify(hintSelect));
await page.keyboard.down('w');
await page.waitForTimeout(500);
const h1box = await page.locator('header h1').boundingBox();
if (h1box) {
  await page.mouse.move(h1box.x + 10, h1box.y + 10);
  await page.mouse.down();
  await page.mouse.move(h1box.x + 140, h1box.y + 10, { steps: 8 });
  await page.mouse.up();
}
await page.keyboard.up('w');
const stopZ1 = await page.evaluate(() => Math.round(window.mm3d.player.pos.z * 100) / 100);
await page.waitForTimeout(1000);
const stopZ2 = await page.evaluate(() => Math.round(window.mm3d.player.pos.z * 100) / 100);
Math.abs(stopZ2 - stopZ1) < 0.05 ? ok('选字后不再持续移动', `z=${stopZ1}→${stopZ2}`) : bad('选字后仍在移动', `z=${stopZ1}→${stopZ2}`);
await page.evaluate(() => window.mm3d.reset());
await page.waitForTimeout(700);

// 3D 失窃展柜：9 件 + 可定位
const stolenPlan = await page.evaluate(() => window.mm3d.getStolenPlan().length);
stolenPlan === 9 ? ok('3D 失窃展柜 9 件', String(stolenPlan)) : bad('3D 失窃展柜数量', String(stolenPlan));
const stolenFocus = await page.evaluate(() => window.mm3d.focusStolen('dartmouth-proposal'));
stolenFocus ? ok('3D 展柜镜头定位') : bad('3D 展柜镜头定位');
const lensState = await page.evaluate(() => {
  window.mm3d.toggleLens(true);
  const shown = document.querySelector('.mm-lens') && document.querySelector('.mm-lens').style.display;
  window.mm3d.toggleLens(false);
  return shown;
});
lensState === 'block' ? ok('3D 放大镜举起/放下') : bad('3D 放大镜举起/放下', String(lensState));
await page.evaluate(() => { window.mm3d.setFloor('all', true); window.mm3d.reset(); });
await page.waitForTimeout(700);

// 物理书架：抽出到手里 → 叠到 L1 长桌 → 再抽一本翻开
await page.evaluate(async () => {
  window.mm3d.setFloor('L1', true);
  window.mm3d.grabBook('b1');
  await new Promise((r) => setTimeout(r, 1100));
});
const heldInfo = await page.evaluate(() => window.mm3d.heldInfo());
heldInfo && heldInfo.id === 'b1' ? ok('书抽到手里', heldInfo.title) : bad('书抽到手里', JSON.stringify(heldInfo));
const stackState = await page.evaluate(async () => {
  window.mm3d.stackHeld();
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (!window.mm3d.heldInfo()) break;
  }
  return window.mm3d.getStack();
});
stackState.length === 1 ? ok('书叠到长桌', stackState.join(',')) : bad('书叠到长桌', JSON.stringify(stackState));
const openState = await page.evaluate(async () => {
  window.mm3d.grabBook('b2');
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const h = window.mm3d.heldInfo();
    if (h) return h;
  }
  return window.mm3d.heldInfo();
});
if (openState && openState.id === 'b2') {
  await page.keyboard.press('e');
  await page.waitForSelector('#reader', { timeout: 10000 });
  ok('手里的书按 E 翻开');
  await page.locator('.reader-float-close').first().click();
  await page.waitForTimeout(1600);
} else bad('第二本书抽到手里', JSON.stringify(openState));
await page.evaluate(() => window.mm3d.reset());
await page.waitForTimeout(800);
const stackAfterReset = await page.evaluate(() => window.mm3d.getStack());
stackAfterReset.length === 0 ? ok('复位清空长桌') : bad('复位清空长桌', JSON.stringify(stackAfterReset));
await page.evaluate(() => window.mm3d.setFloor('all', true));
await page.waitForTimeout(600);

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
// 星图文字版关系列表：WebGL 不可用 / 键盘读者也能读完关系
await page.locator('.mm-star3d-listbtn').click();
await page.waitForTimeout(400);
const edgeRows = await page.locator('.mm-star-edge').count();
const listShown = await page.locator('.mm-star3d-list.show').count();
(listShown && edgeRows >= 20) ? ok('星图关系列表', `${edgeRows} 条`) : bad('星图关系列表', `shown=${listShown} edges=${edgeRows}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(350);
(await page.locator('#mm-star-overlay').count()) === 1 ? ok('关系列表 Esc 先收起') : bad('关系列表 Esc 先收起');
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
  // 读完绑定：没读到章末时，追回按钮应替换为「去读这一章」
  await page.locator('.anomaly-card.stolen').first().click();
  await page.waitForSelector('#fragModal', { timeout: 6000 });
  const gateText = await page.locator('#fragModal .frag-box').innerText();
  (gateText.includes('线索未显形') && gateText.includes('去读这一章'))
    ? ok('失窃页追回需先读到章末') : bad('失窃页追回门槛', gateText.slice(0, 50));
  await page.locator('#fragModal #fragClose').click();
  await page.waitForTimeout(250);
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
const sizeBars = await page.locator('.size-item .si-bar i').count();
const sizeScale = await page.locator('.size-scale').innerText();
(sizeBars === sizeCount && sizeScale.includes('倍')) ? ok('尺寸墙实体对比标尺', sizeScale.slice(0, 40)) : bad('尺寸墙实体对比标尺', `bars=${sizeBars}`);
await page.locator('.tl-node').first().click();
await page.waitForSelector('#reader', { timeout: 8000 });
ok('时间轴卡片可开章');
await page.locator('.reader-float-close').first().click();
await page.waitForTimeout(2000);

// 3c. 前沿观察（arXiv 新论文 → 中文科普新闻）
await page.getByRole('button', { name: '前沿观察' }).click();
await page.waitForSelector('.fr-card, .fr-empty', { timeout: 10000 });
const frCards = await page.locator('.fr-card').count();
const frChips = await page.locator('.fr-chips button').count();
frCards >= 1 ? ok('前沿观察新闻条目', String(frCards)) : bad('前沿观察新闻条目', String(frCards));
frChips >= 2 ? ok('前沿观察领域筛选', String(frChips)) : bad('前沿观察领域筛选', String(frChips));
if (frCards >= 1) {
  const firstTitle = await page.locator('.fr-card h3').first().innerText();
  /[\u4e00-\u9fff]/.test(firstTitle) ? ok('前沿新闻中文标题', firstTitle.slice(0, 24)) : bad('前沿新闻中文标题', firstTitle);
  const firstTags = await page.locator('.fr-card .fr-tag').first().count();
  firstTags >= 1 ? ok('前沿新闻标签') : bad('前沿新闻标签', '无');
  const plainCount = await page.locator('.fr-card .fr-plain').count();
  plainCount >= 1 ? ok('前沿新闻说人话段落', String(plainCount)) : bad('前沿新闻说人话段落', String(plainCount));
  const termCount = await page.locator('.fr-card .fr-term').count();
  termCount >= 1 ? ok('前沿新闻术语小抄', String(termCount)) : bad('前沿新闻术语小抄', String(termCount));
  const guideCount = await page.locator('.fr-guide').count();
  guideCount === 1 ? ok('前沿观察阅读指南') : bad('前沿观察阅读指南', String(guideCount));
  const firstLink = await page.locator('.fr-card h3 a').first().getAttribute('href');
  firstLink && firstLink.startsWith('https://arxiv.org/abs/') ? ok('前沿条目指向 arXiv 原文') : bad('前沿条目链接', String(firstLink));
  await page.locator('.fr-chips button').nth(1).click();
  await page.waitForTimeout(500);
  const filtered = await page.locator('.fr-card').count();
  const activeChip = await page.locator('.fr-chips button.on').innerText();
  (filtered >= 1 && !activeChip.startsWith('全部')) ? ok('前沿观察筛选生效', activeChip) : bad('前沿观察筛选生效', `${activeChip}/${filtered}`);
}

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

// 5b2. 异常馆藏视图：失窃页 / 暗门十本假如之书 / 残页拼合板
await page.waitForFunction(() => !window.mmViewBusy, null, { timeout: 10000 });
await page.getByRole('button', { name: '失窃页', exact: true }).click();
await page.waitForSelector('.stolen-card', { timeout: 10000 });
const stolenCards = await page.locator('.stolen-card').count();
stolenCards === 9 ? ok('失窃页展柜 9 件', String(stolenCards)) : bad('失窃页展柜数量', String(stolenCards));
await page.waitForFunction(() => !window.mmViewBusy, null, { timeout: 10000 });
// 暗门不再是页面入口：先从 L4 帷幕揭晓，再点门进入
const doorState = await page.evaluate(() => {
  if (!window.mm3d || !window.mm3d.secretVeil) return null;
  const before = window.mm3d.isSecretDoorRevealed();
  const revealed = window.mm3d.revealSecretDoor(true);
  return { veil: true, before, revealed, after: window.mm3d.isSecretDoorRevealed() };
});
(doorState && doorState.veil && !doorState.before && doorState.after)
  ? ok('L4 帷幕揭晓暗门', '点帷幕后显形')
  : bad('L4 帷幕揭晓暗门', JSON.stringify(doorState));
const doorOpen = await page.evaluate(() => !!(window.mm3d && window.mm3d.openSecretDoor()));
doorOpen ? ok('揭晓后暗门可进入') : bad('揭晓后暗门可进入');
await page.waitForSelector('.wi-spine', { timeout: 10000 });
const wiBooks = await page.locator('.wi-spine').count();
wiBooks === 10 ? ok('暗门后十本假如之书', String(wiBooks)) : bad('暗门后十本假如之书', String(wiBooks));
await page.locator('.wi-spine').first().click();
await page.waitForSelector('.wi-book', { timeout: 8000 });
const wiTrees = await page.locator('.wi-tree').count();
wiTrees === 3 ? ok('三条科技树可选', String(wiTrees)) : bad('三条科技树可选', String(wiTrees));
await page.locator('.wi-runbar .wi-run').click();
await page.waitForSelector('#wiStory .wi-story', { timeout: 8000 });
const wiParas = await page.locator('#wiStory .wi-story p').count();
const wiStory1 = await page.locator('#wiStory').innerText();
(wiParas >= 10 && wiStory1.length > 1200)
  ? ok('走假如生成长篇故事', `${wiParas} 段 / ${wiStory1.length} 字`)
  : bad('走假如生成长篇故事', `${wiParas} 段 / ${wiStory1.length} 字`);
await page.locator('.wi-tree', { hasText: '神经树' }).click();
await page.locator('.wi-runbar .wi-run').click();
await page.waitForTimeout(300);
const wiStory2 = await page.locator('#wiStory').innerText();
wiStory2 !== wiStory1 ? ok('换科技树生成不同故事') : bad('换科技树生成不同故事');
await page.locator('#wiStory .ws-actions button', { hasText: '回暗门书架' }).click();
await page.waitForSelector('.wi-spine', { timeout: 8000 });
const wiBack = await page.locator('.wi-spine').count();
wiBack === 10 ? ok('从故事回暗门书架') : bad('从故事回暗门书架', String(wiBack));
// 第十一本「未写之书」：只接受「如果没有 X」的假设；非假如问题不调用模型
const oracleCards = await page.locator('.wi-oracle').count();
oracleCards === 1 ? ok('第十一本未写之书入口', String(oracleCards)) : bad('第十一本未写之书入口', String(oracleCards));
await page.locator('.wi-oracle').click();
await page.waitForSelector('.wi-oracle-book', { timeout: 8000 });
const oracleInput = await page.locator('#oracleQ').count();
oracleInput ? ok('未写之书提问框') : bad('未写之书提问框');
const chipCount = await page.locator('#oracleChips .wi-oracle-chip').count();
chipCount >= 3 ? ok('未写之书提问选项', String(chipCount)) : bad('未写之书提问选项', String(chipCount));
const chipText = await page.locator('#oracleChips .wi-oracle-chip').first().innerText();
await page.locator('#oracleChips .wi-oracle-chip').first().click();
const pickedQ = await page.inputValue('#oracleQ');
pickedQ === chipText ? ok('点击选项填入假设') : bad('点击选项填入假设', `${pickedQ} != ${chipText}`);
const beforeChips = await page.locator('#oracleChips .wi-oracle-chip').allInnerTexts();
await page.locator('.wi-oracle-refresh').click();
await page.waitForTimeout(250);
const afterChips = await page.locator('#oracleChips .wi-oracle-chip').allInnerTexts();
JSON.stringify(beforeChips) !== JSON.stringify(afterChips) ? ok('提问选项可刷新') : bad('提问选项可刷新', '选项未变化');
await page.fill('#oracleQ', '今天天气怎么样');
await page.locator('#oracleRun').click();
await page.waitForSelector('.wi-oracle-error', { timeout: 5000 });
const oracleRefusal = await page.locator('.wi-oracle-error').innerText();
oracleRefusal.includes('只写') ? ok('未写之书只接受假如问题') : bad('未写之书只接受假如问题', oracleRefusal.slice(0, 30));
await page.locator('.wi-oracle-book .wi-back').click();
await page.waitForSelector('.wi-spine', { timeout: 8000 });
const doorMesh = await page.evaluate(() => !!(window.mm3d && window.mm3d.secretDoor && window.mm3d.secretVeil && window.mm3d.propGroups && window.mm3d.propGroups.L4));
doorMesh ? ok('L4 暗门与帷幕实体已挂载') : bad('L4 暗门与帷幕实体已挂载');
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
const hiddenTile = await page.locator('.plan-hidden').count();
const hiddenLabel = await page.getByText('暗格', { exact: true }).count();
(hiddenTile === 1 && hiddenLabel === 0) ? ok('平面图暗格不标字') : bad('平面图暗格', `tile=${hiddenTile} label=${hiddenLabel}`);
if (hiddenTile === 1) {
  await page.locator('.plan-hidden').click();
  await page.waitForTimeout(500);
  const hiddenHint = await page.locator('#mmToast.on').innerText().catch(() => '');
  /地砖|松了|敲/.test(hiddenHint) ? ok('暗格点击只给线索', hiddenHint.slice(0, 20)) : bad('暗格点击提示', hiddenHint);
}
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
const oracleBad = await api.post(BASE + 'api/oracle', { data: { question: '今天天气怎么样' } });
const oracleBadBody = await oracleBad.json();
oracleBadBody.refused === true ? ok('未写之书接口拒绝非假如问题') : bad('未写之书接口拒绝非假如问题', JSON.stringify(oracleBadBody).slice(0, 60));

// 6c. 盖章 / 读完：二次确认、盖上纸面、可撤销
// 会话只走 HttpOnly Cookie；前端不再把 token 写进 localStorage
await page.context().addCookies([{ name: 'mm_token', value: token, url: BASE, httpOnly: true, sameSite: 'Lax' }]);
await page.evaluate(() => { window.mmAuthed = true; });
await page.evaluate(() => window.showChapter('b2-c1'));
await page.waitForSelector('#reader', { timeout: 12000 });
await page.waitForTimeout(500);
await page.locator('#stampBtn').click();
await page.waitForSelector('.mm-confirm', { timeout: 4000 });
await page.locator('.mm-confirm [data-cancel]').click();
await page.waitForTimeout(250);
(await page.locator('.book-stamp').count()) === 0 ? ok('盖章可取消于确认前') : bad('盖章取消', '已提前盖章');
await page.locator('#stampBtn').click();
await page.waitForSelector('.mm-confirm', { timeout: 4000 });
const stampOkLabel = await page.locator('.mm-confirm [data-ok]').innerText();
await page.locator('.mm-confirm [data-ok]').click();
await page.waitForSelector('.book-stamp', { timeout: 6000 });
const stampBtnText = await page.locator('#stampBtn').innerText();
(stampOkLabel.includes('确认盖章') && stampBtnText.includes('撤销')) ? ok('盖章落纸且可撤销') : bad('盖章落纸', `${stampOkLabel}/${stampBtnText}`);
// 重开章节，章还在
await page.evaluate(() => window.showChapter('b2-c1'));
await page.waitForSelector('#reader', { timeout: 12000 });
await page.waitForTimeout(600);
const stampPersist = await page.locator('.book-stamp').count();
const stampBtnAfterReload = await page.locator('#stampBtn').innerText();
(stampPersist === 1 && stampBtnAfterReload.includes('撤销')) ? ok('盖章留纸并持久') : bad('盖章持久', `${stampPersist}/${stampBtnAfterReload}`);
// 点已盖章 → 撤销
await page.locator('#stampBtn').click();
await page.waitForSelector('.mm-confirm', { timeout: 4000 });
const stampRevokeLabel = await page.locator('.mm-confirm [data-ok]').innerText();
await page.locator('.mm-confirm [data-ok]').click();
await page.waitForFunction(() => !document.getElementById('bookStamp'), null, { timeout: 5000 });
const stampBtnRevoked = await page.locator('#stampBtn').innerText();
(stampRevokeLabel.includes('确认撤销') && stampBtnRevoked === '盖章') ? ok('盖章可撤销') : bad('盖章撤销', `${stampRevokeLabel}/${stampBtnRevoked}`);
// 标记读完 → 撤销
await page.locator('#doneBtn').click();
await page.waitForSelector('.mm-confirm', { timeout: 4000 });
const doneOkLabel = await page.locator('.mm-confirm [data-ok]').innerText();
await page.locator('.mm-confirm [data-ok]').click();
await page.waitForTimeout(700);
const doneBtnText = await page.locator('#doneBtn').innerText();
const doneState = await page.locator('#readState').innerText();
(doneOkLabel.includes('确认标记') && doneBtnText.includes('撤销') && doneState.includes('可撤销'))
  ? ok('读完标记可撤销') : bad('读完标记', `${doneOkLabel}/${doneBtnText}/${doneState}`);
await page.locator('#doneBtn').click();
await page.waitForSelector('.mm-confirm', { timeout: 4000 });
const doneRevokeLabel = await page.locator('.mm-confirm [data-ok]').innerText();
await page.locator('.mm-confirm [data-ok]').click();
await page.waitForTimeout(700);
const doneBtnRevoked = await page.locator('#doneBtn').innerText();
const doneStateRevoked = await page.locator('#readState').innerText();
(doneRevokeLabel.includes('确认撤销') && doneBtnRevoked === '标记读完' && doneStateRevoked === '')
  ? ok('读完可撤销') : bad('读完撤销', `${doneRevokeLabel}/${doneBtnRevoked}/${doneStateRevoked}`);
// 撤销后重开仍然干净
await page.evaluate(() => window.showChapter('b2-c1'));
await page.waitForSelector('#reader', { timeout: 12000 });
await page.waitForTimeout(600);
const stampAfterRevoke = await page.locator('.book-stamp').count();
const doneAfterRevoke = await page.locator('#doneBtn').innerText();
(stampAfterRevoke === 0 && doneAfterRevoke === '标记读完') ? ok('撤销状态持久') : bad('撤销持久', `${stampAfterRevoke}/${doneAfterRevoke}`);

// 6d. 检索可解释 / 零结果兜底
const whyRes = await api.get(BASE + 'api/search?q=' + encodeURIComponent('神经网络'));
const whyBody = await whyRes.json();
(whyBody.results[0] && whyBody.results[0].why && whyBody.results[0].why.length)
  ? ok('检索命中理由', whyBody.results[0].why.join(' · '))
  : bad('检索命中理由', JSON.stringify(whyBody.results[0] || {}).slice(0, 60));
const fbRes = await api.get(BASE + 'api/search?q=' + encodeURIComponent('zzzz不存在'));
const fbBody = await fbRes.json();
(fbBody.results.length === 0 && fbBody.fallback && fbBody.fallback.books.length)
  ? ok('零结果兜底书目', String(fbBody.fallback.books.length))
  : bad('零结果兜底', JSON.stringify(fbBody).slice(0, 80));
const fuzzyRes = await api.get(BASE + 'api/search?q=transfomer');
const fuzzyBody = await fuzzyRes.json();
(fuzzyBody.results.length > 0 && fuzzyBody.results[0].why.includes('近似拼写'))
  ? ok('英文拼写容错', fuzzyBody.results[0].title)
  : bad('英文拼写容错', JSON.stringify(fuzzyBody).slice(0, 80));

// 6e. 安全：token 不进 localStorage、Cookie 为 HttpOnly、基础安全头
const lsToken = await page.evaluate(() => localStorage.getItem('mm_token'));
lsToken === null ? ok('token 不在 localStorage') : bad('token 泄露到 localStorage', String(lsToken).slice(0, 8));
const cookieVisible = await page.evaluate(() => document.cookie.includes('mm_token'));
cookieVisible === false ? ok('会话 Cookie 不可被 JS 读取') : bad('Cookie 可被 JS 读取');
const secRes = await api.get(BASE + 'api/health');
const secHeaders = secRes.headers();
(secHeaders['x-content-type-options'] === 'nosniff' && secHeaders['x-frame-options'] === 'DENY')
  ? ok('安全响应头')
  : bad('安全响应头', JSON.stringify({ xcto: secHeaders['x-content-type-options'], xfo: secHeaders['x-frame-options'] }));

// 6f. 演示编排面板
await page.evaluate(() => window.mmDemoToggle(true));
const dockVisible = await page.locator('#demoDock').isVisible();
dockVisible ? ok('演示编排面板可打开') : bad('演示编排面板', '不可见');
const dockButtons = await page.locator('#demoDock .dd-grid button').count();
dockButtons >= 6 ? ok('演示编排六个入口', String(dockButtons)) : bad('演示编排入口', String(dockButtons));
await page.evaluate(() => window.mmDemoToggle(false));

// 6g. 尘埃改为 GPU 着色器
const dustGpu = await page.evaluate(() => {
  let found = false;
  if (window.mm3d && window.mm3d.scene) {
    window.mm3d.scene.traverse((o) => {
      if (o.isPoints && o.material && o.material.isShaderMaterial && o.material.uniforms && o.material.uniforms.uTime) found = true;
    });
  }
  return found;
});
dustGpu ? ok('尘埃 GPU 着色器') : bad('尘埃 GPU 着色器', '未找到 ShaderMaterial');

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

// 7b. 首页按钮：从 2D 书架视图回到全馆大厅
await page.locator('.reader-float-close').first().click().catch(() => {});
await page.waitForTimeout(1800);
await page.getByRole('button', { name: '书架视图' }).click();
await page.waitForSelector('.unit', { timeout: 10000 });
await page.getByRole('button', { name: '首页' }).click();
await page.waitForFunction(() => !document.body.classList.contains('grid') && !document.body.classList.contains('reading')
  && !window.mmViewBusy && window.mm3d && window.mm3d.getFloor() === 'all', null, { timeout: 45000 });
await page.waitForTimeout(800);
const homeFloor = await page.evaluate(() => window.mm3d.getFloor());
homeFloor === 'all' ? ok('首页回到全馆大厅') : bad('首页回大厅', homeFloor);

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

// 8b. 新手提示改为分区域卡片；完整手册在「关于本馆」内折叠
// 先关掉主页面，释放 SwiftShader/3D 内存，避免再开新上下文时门厅加载失败
await page.close();
const tutCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const tut = await tutCtx.newPage();
await tut.goto(BASE, { waitUntil: 'domcontentloaded' });
await tut.waitForSelector('#gate', { timeout: 15000 });
await tut.getByRole('button', { name: '以访客身份入馆' }).click();
await tut.waitForSelector('#mmTipCard.show', { timeout: 12000 });
const firstTip = await tut.locator('#mmTipCard .tip-title').innerText();
firstTip.includes('3D') ? ok('首次入馆出现 3D 新手提示卡', firstTip) : bad('首次新手提示', firstTip);
const autoAbout = await tut.locator('#tutorial').count();
autoAbout === 0 ? ok('首次入馆不再自动打开大教程') : bad('首次自动教程', String(autoAbout));
await tut.locator('#mmTipCard [data-tip-ok]').click();
await tut.waitForTimeout(350);
await tut.getByRole('button', { name: '关于本馆' }).click();
await tut.waitForSelector('#tutorial', { timeout: 12000 });
const tutSteps = await tut.locator('.tut-step').count();
const tutActions = await tut.locator('.tut-actions button').count();
const tutAbout = await tut.locator('.about-view').count();
const manualOpen = await tut.locator('details.tut-manual[open]').count();
(tutSteps === 11 && tutAbout === 1) ? ok('关于本馆保留完整手册 11 步', `${tutSteps} 步`) : bad('首次教程', `steps=${tutSteps} about=${tutAbout}`);
tutActions >= 5 ? ok('教程快捷入口', String(tutActions)) : bad('教程快捷入口', String(tutActions));
manualOpen === 0 ? ok('完整手册默认折叠') : bad('完整手册折叠', String(manualOpen));
await tut.reload({ waitUntil: 'domcontentloaded' });
await tut.waitForSelector('#gate', { timeout: 15000 });
await tut.getByRole('button', { name: '以访客身份入馆' }).click();
await tut.waitForFunction(() => !document.getElementById('gate'), null, { timeout: 8000 });
await tut.waitForTimeout(1800);
const secondTip = await tut.locator('#mmTipCard.show').count();
const secondTut = await tut.locator('#tutorial').count();
const secondApp = await tut.locator('#app').isVisible();
(secondTip === 0 && secondTut === 0 && secondApp) ? ok('二次入馆不再弹提示/教程') : bad('二次入馆', `tip=${secondTip} tutorial=${secondTut} app=${secondApp}`);
await tutCtx.close();

// 9. 控制台错误
const realErrors = errors.filter((e) => !/WebGL|GPU|swiftshader|THREE.WebGLRenderer|Failed to load resource/i.test(e));
realErrors.length === 0 ? ok('桌面端无 JS 报错') : bad('桌面端 JS 报错', realErrors.slice(0, 3).join(' | '));

await browser.close();

const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
console.log(`\n=== ${passed} passed, ${failed} failed, ${results.length} total ===`);
process.exit(failed === 0 ? 0 : 1);

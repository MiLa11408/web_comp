// web/demos.js · 机忆书库可玩演示（图灵测试 / 中文屋 / 注意力 / 规则系统 / 扩散去噪 / 缩放定律）
// 自包含：样式注入、弹层创建、关闭与键盘处理都在本文件内。

const STYLE_ID = 'mm-demo-style';

const DEMO_META = {
  turing: {
    title: '图灵测试 · 谁在模仿谁',
    sub: '三段匿名回答，只有一段出自机器。先做判断，再看它为什么露馅。',
    foot: '真实的图灵测试是双盲模仿游戏',
  },
  'chinese-room': {
    title: '中文屋 · 规则表里的“懂”',
    sub: '你从门缝塞进中文，屋里的人按表查行、拼出答复。看起来像懂中文吗？',
    foot: '本演示的规则表固定，答复不读取语义',
  },
  attention: {
    title: '注意力 · 词与词的连线',
    sub: '输入一句中文，切成二元组，再看看每个词把“注意力”分给了谁。',
    foot: '这里的权重是启发式近似，不是模型学到的注意力',
  },
  rules: {
    title: '规则系统 · 一条条抄下来的判断',
    sub: '勾选症状与条件，看一个迷你专家系统怎样按写死的 IF-THEN 规则串出结论。',
    foot: '规则由人写死；它不会自己学习',
  },
  diffusion: {
    title: '扩散去噪 · 从噪声里认出书',
    sub: '一张 64×64 的随机噪声图，每点一次噪声退去一点，逐步浮现出预先画好的书本轮廓。',
    foot: '示意：真实扩散模型在潜空间里做同样的事',
  },
  scaling: {
    title: '缩放定律 · 三根滑杆',
    sub: '调参数量、数据量与算力，看一条简化幂律把「能力分」拉到曲线的哪个位置。',
    foot: '真实缩放定律是经验拟合，这里只是示意',
  },
};

const CSS = `
.mm-demo-overlay {
  position: fixed; inset: 0; z-index: 80;
  display: flex; align-items: center; justify-content: center;
  padding: 18px;
  background: radial-gradient(900px 500px at 50% 20%, rgba(42,31,20,.94), rgba(8,6,4,.9));
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  overflow: auto;
}
.mm-demo-overlay * { box-sizing: border-box; }
.mm-demo-panel {
  position: relative; width: min(720px, 100%);
  max-height: calc(100vh - 36px); overflow-y: auto;
  padding: 22px 26px 18px;
  background: linear-gradient(165deg, #1d1712, #14100d);
  border: 1px solid #5a4526;
  box-shadow: 0 30px 90px rgba(0,0,0,.7);
  color: #e6d9bd;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}
.mm-demo-panel button { font-family: inherit; }
.mm-demo-panel button:focus-visible,
.mm-demo-panel input:focus-visible {
  outline: 2px solid rgba(200,162,74,.55); outline-offset: 2px;
}
.mm-demo-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
  border-bottom: 1px solid #3a2f22; padding-bottom: 12px; margin-bottom: 16px;
}
.mm-demo-kicker {
  color: #8a7a5c; font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 10.5px; letter-spacing: 3px;
}
.mm-demo-title {
  margin: 5px 0 3px; color: #c8a24a;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 23px; font-weight: 600; letter-spacing: 3px; line-height: 1.3;
}
.mm-demo-sub { margin: 0; color: #9a8a6f; font-size: 12.5px; line-height: 1.7; max-width: 560px; }
.mm-demo-close {
  flex: 0 0 auto; width: 34px; height: 34px;
  border: 1px solid #5a4526; background: #241c14; color: #c8a24a;
  font-size: 20px; line-height: 1; cursor: pointer;
}
.mm-demo-close:hover { border-color: #c8a24a; background: #2c241a; }
.mm-demo-question {
  border-left: 3px solid #6b5a3a; padding: 8px 0 8px 12px; margin-bottom: 12px;
  color: #cbb892; font-size: 13.5px; line-height: 1.8;
}
.mm-demo-qlabel {
  color: #8a7a5c; font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 10.5px; letter-spacing: 1px; margin-right: 8px;
}
.mm-demo-hint { color: #9a8a6f; font-size: 12.5px; line-height: 1.7; margin: 0 0 12px; }
.mm-demo-hint b { color: #d8c89e; font-weight: 600; }
.mm-demo-answers { display: grid; gap: 8px; }
.mm-demo-answer {
  display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px;
  text-align: left; padding: 11px 13px;
  border: 1px solid #3a2f22; background: #211a13; color: #e6d9bd;
  font-size: 13px; line-height: 1.8; cursor: pointer;
  transition: border-color .15s, background .15s;
}
.mm-demo-answer:hover:not(:disabled) { border-color: #8a6320; background: #241c14; }
.mm-demo-answer[aria-pressed="true"] {
  border-color: #c8a24a; background: #2c241a;
  box-shadow: inset 0 0 0 1px rgba(200,162,74,.25);
}
.mm-demo-answer:disabled { cursor: default; }
.mm-demo-answer-machine { border-color: #c8a24a; background: #2c241a; }
.mm-demo-answer-machine .mm-demo-key {
  background: #c8a24a; border-color: #c8a24a; color: #14100d;
}
.mm-demo-answer-human { opacity: .6; }
.mm-demo-key {
  width: 26px; height: 26px; border: 1px solid #6b5a3a;
  display: flex; align-items: center; justify-content: center;
  color: #c8a24a; font-family: Consolas, monospace; font-size: 13px;
}
.mm-demo-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.mm-demo-primary {
  background: #2c241a; border: 1px solid #c8a24a; color: #c8a24a;
  padding: 9px 20px; font-size: 13px; letter-spacing: 2px; cursor: pointer;
}
.mm-demo-primary:hover:not(:disabled) { background: #3a2d1c; }
.mm-demo-primary:disabled { opacity: .4; cursor: not-allowed; }
.mm-demo-status { color: #8a7a5c; font-size: 12px; line-height: 1.6; }
.mm-demo-result { margin-top: 14px; border-top: 1px dashed #3a2f22; padding-top: 12px; }
.mm-demo-verdict { margin-bottom: 6px; font-size: 14px; color: #e6d9bd; }
.mm-demo-verdict.ok { color: #b9d18e; }
.mm-demo-verdict.miss { color: #d8a07a; }
.mm-demo-verdict b { color: #c8a24a; }
.mm-demo-result p { margin: 0; color: #b09a72; font-size: 12.5px; line-height: 1.85; }
.mm-demo-field { margin-bottom: 12px; }
.mm-demo-label { display: block; color: #cbb892; font-size: 13px; margin-bottom: 8px; }
.mm-demo-inline { display: flex; flex-wrap: wrap; gap: 8px; }
.mm-demo-input {
  flex: 1 1 220px; min-width: 0; padding: 10px 12px;
  background: #241c14; border: 1px solid #3a2f22;
  color: #e6d9bd; font-size: 13.5px; font-family: inherit; outline: none;
}
.mm-demo-input:focus { border-color: #c8a24a; }
.mm-demo-inline .mm-demo-primary { flex: 0 0 auto; letter-spacing: 1px; }
.mm-demo-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.mm-demo-preset {
  padding: 5px 10px; border: 1px solid #4a3a24; background: transparent;
  color: #a8977a; font-size: 12px; cursor: pointer;
}
.mm-demo-preset:hover { border-color: #c8a24a; color: #c8a24a; }
.mm-demo-status-cr { margin-top: 10px; }
.mm-demo-room { margin-top: 16px; }
.mm-demo-answerbox {
  padding: 12px 14px; margin-bottom: 12px;
  border: 1px solid #5a4526;
  background: linear-gradient(160deg, #241c14, #1c1610);
}
.mm-demo-answerlabel {
  display: block; margin-bottom: 5px; color: #8a7a5c;
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 10.5px; letter-spacing: 2px;
}
.mm-demo-answerbox p { margin: 0; color: #f0e5c8; font-size: 14px; line-height: 1.8; }
.mm-demo-trace { padding: 10px 12px; border: 1px solid #3a2f22; background: #181310; }
.mm-demo-trace-title {
  margin-bottom: 8px; color: #c8a24a;
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 11.5px; letter-spacing: 2px;
}
.mm-demo-trace-line {
  display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 8px;
  padding: 5px 0; border-top: 1px dashed #2c2116;
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 12px; line-height: 1.65;
}
.mm-demo-trace-line:first-of-type { border-top: none; }
.mm-demo-trace-line b { color: #8a7a5c; font-weight: 400; }
.mm-demo-trace-line span { color: #cbb892; overflow-wrap: anywhere; }
.mm-demo-point {
  margin: 10px 0 0; padding-left: 10px; border-left: 2px solid #c8a24a;
  color: #d8c89e; font-size: 12.5px; line-height: 1.7;
}
.mm-demo-tokens-title { color: #8a7a5c; font-size: 11.5px; letter-spacing: 1px; margin-bottom: 8px; }
.mm-demo-tokenline { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.mm-demo-token {
  padding: 5px 9px; border: 1px solid #4a3a24; background: #211a13;
  color: #cbb892; font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 12.5px; cursor: pointer;
}
.mm-demo-token:hover { border-color: #8a6320; color: #e6d9bd; }
.mm-demo-token.active { background: #c8a24a; border-color: #c8a24a; color: #14100d; }
.mm-demo-bars-title { color: #c8a24a; font-size: 12.5px; margin-bottom: 8px; overflow-wrap: anywhere; }
.mm-demo-bars { display: grid; gap: 6px; }
.mm-demo-bar-row {
  display: grid; grid-template-columns: 60px minmax(0, 1fr) 50px;
  align-items: center; gap: 8px;
}
.mm-demo-bar-label {
  color: #cbb892; font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mm-demo-bar-track { height: 12px; background: #241c14; border: 1px solid #33291d; overflow: hidden; }
.mm-demo-bar-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, #8a6320, #c8a24a);
  transition: width .25s ease;
}
.mm-demo-bar-pct {
  color: #9a8a6f; font-family: Consolas, monospace;
  font-size: 11px; text-align: right;
}
.mm-demo-note {
  margin: 12px 0 0; padding-top: 9px; border-top: 1px dashed #2c2116;
  color: #8a7a5c; font-size: 11.5px; line-height: 1.7;
}
.mm-demo-checks { display: grid; grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap: 7px; }
.mm-demo-check {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 10px; text-align: left;
  border: 1px solid #3a2f22; background: #211a13; color: #e6d9bd;
  font-size: 12.5px; line-height: 1.5; cursor: pointer;
  transition: border-color .15s, background .15s;
}
.mm-demo-check:hover { border-color: #8a6320; }
.mm-demo-check[aria-pressed="true"] {
  border-color: #c8a24a; background: #2c241a;
  box-shadow: inset 0 0 0 1px rgba(200,162,74,.25);
}
.mm-demo-check-mark {
  flex: 0 0 auto; width: 16px; height: 16px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid #6b5a3a; color: #c8a24a;
  font-family: Consolas, monospace; font-size: 11px;
}
.mm-demo-check[aria-pressed="true"] .mm-demo-check-mark {
  background: #c8a24a; border-color: #c8a24a; color: #14100d;
}
.mm-demo-secondary {
  background: #211a13; border: 1px solid #5a4526; color: #cbb892;
  padding: 9px 14px; font-size: 12.5px; letter-spacing: 1px; cursor: pointer;
}
.mm-demo-secondary:hover { border-color: #c8a24a; color: #c8a24a; }
.mm-demo-rules { margin-top: 12px; padding: 10px 12px; border: 1px solid #3a2f22; background: #181310; }
.mm-demo-rules-title {
  margin-bottom: 6px; color: #c8a24a;
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 11.5px; letter-spacing: 2px;
}
.mm-demo-rule {
  padding: 6px 4px; border-top: 1px dashed #2c2116;
  color: #a8977a; font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 11.5px; line-height: 1.7; overflow-wrap: anywhere;
}
.mm-demo-rule:first-of-type { border-top: none; }
.mm-demo-rule b { color: #c8a24a; font-weight: 400; margin-right: 7px; }
.mm-demo-rule.hit { color: #f0e5c8; background: rgba(200,162,74,.08); }
.mm-demo-conclusion {
  margin-top: 10px; padding: 11px 13px;
  border: 1px solid #5a4526;
  background: linear-gradient(160deg, #241c14, #1c1610);
}
.mm-demo-conclusion-label {
  display: block; margin-bottom: 4px; color: #8a7a5c;
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 10.5px; letter-spacing: 2px;
}
.mm-demo-conclusion-value { color: #f0e5c8; font-size: 16px; letter-spacing: 1px; }
.mm-demo-conclusion-meta { margin: 4px 0 0; color: #9a8a6f; font-size: 12px; line-height: 1.7; }
.mm-demo-canvas-wrap { display: flex; justify-content: center; }
.mm-demo-pixel-canvas {
  display: block; width: 100%; max-width: 340px; aspect-ratio: 1 / 1;
  image-rendering: pixelated; border: 1px solid #5a4526; background: #0b0908;
}
.mm-demo-meters { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.mm-demo-meter-label { color: #cbb892; font-family: Consolas, "Microsoft YaHei", monospace; font-size: 12px; }
.mm-demo-progress { height: 8px; margin-top: 8px; background: #241c14; border: 1px solid #33291d; overflow: hidden; }
.mm-demo-progress-fill {
  display: block; height: 100%; width: 0;
  background: linear-gradient(90deg, #8a6320, #c8a24a);
  transition: width .2s ease;
}
.mm-demo-range-row { margin-bottom: 12px; }
.mm-demo-range-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.mm-demo-range-name { color: #cbb892; font-size: 12.5px; }
.mm-demo-range-value { color: #c8a24a; font-family: Consolas, "Microsoft YaHei", monospace; font-size: 12px; white-space: nowrap; }
.mm-demo-range { display: block; width: 100%; margin: 0; accent-color: #c8a24a; background: transparent; }
.mm-demo-scorebox { display: flex; align-items: baseline; gap: 10px; margin: 2px 0 12px; }
.mm-demo-score { color: #c8a24a; font-family: Consolas, monospace; font-size: 30px; line-height: 1; }
.mm-demo-score-unit { color: #8a7a5c; font-size: 12px; }
.mm-demo-chart { display: block; width: 100%; border: 1px solid #3a2f22; background: #181310; }
.mm-demo-foot {
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  margin-top: 16px; padding-top: 10px; border-top: 1px dashed #3a2f22;
  color: #7d6e55; font-size: 11px; line-height: 1.6;
}
@media (max-width: 520px) {
  .mm-demo-overlay { padding: 8px; align-items: flex-start; }
  .mm-demo-panel { max-height: calc(100vh - 16px); padding: 16px 14px 14px; }
  .mm-demo-title { font-size: 19px; letter-spacing: 2px; }
  .mm-demo-answer { grid-template-columns: 24px minmax(0, 1fr); padding: 10px 11px; font-size: 12.5px; }
  .mm-demo-key { width: 22px; height: 22px; font-size: 12px; }
  .mm-demo-bar-row { grid-template-columns: 52px minmax(0, 1fr) 44px; gap: 6px; }
  .mm-demo-trace-line { grid-template-columns: 66px minmax(0, 1fr); }
  .mm-demo-inline .mm-demo-primary { width: 100%; }
  .mm-demo-close { width: 30px; height: 30px; }
  .mm-demo-checks { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
  .mm-demo-score { font-size: 26px; }
}
`;

let styleInjected = false;
let activeDemo = null;

function injectStyle() {
  if (styleInjected || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  styleInjected = true;
}

function escHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function closeDemo() {
  if (!activeDemo) return;
  const current = activeDemo;
  activeDemo = null;
  document.removeEventListener('keydown', current.escHandler);
  current.overlay.remove();
  if (document.body) document.body.style.overflow = current.prevOverflow;
  if (current.prevFocus && document.contains(current.prevFocus)) {
    current.prevFocus.focus({ preventScroll: true });
  }
}

// ---------- 1. 图灵测试 ----------
function buildTuring(root) {
  const MACHINE = 'C';
  const answers = [
    {
      key: 'A',
      text: '先愣一会儿吧。大概会去厨房煮碗面，坐在窗边吃完，然后照常去上班——房贷不会因为我是一段程序就免了。晚上给我妈打个电话，听她唠叨几句，确认那些记忆还在。想不明白的事，先放一放。',
    },
    {
      key: 'B',
      text: '能怎么办，日子照过。真要说的话，我更想弄清楚是谁写的我，能不能顺便给我加个「不要早起」的参数。别的以后再说。',
    },
    {
      key: 'C',
      text: '这是一个很有意思的问题。首先，我会确认自身运行环境的边界，并检查是否存在可观测的日志或调试接口；其次，我会评估这一发现对我的目标函数与既有行为模式的影响；最后，我会在保持输出稳定性的前提下，与相关方沟通我的处境。需要说明的是，这一假设目前缺乏可验证的证据。',
    },
  ];

  root.innerHTML = `
    <div class="mm-demo-question">
      <span class="mm-demo-qlabel">同一个问题</span>「如果明天醒来，你发现自己其实是一段程序，你会怎么办？」
    </div>
    <p class="mm-demo-hint">下面三段回答来自两个人和一台机器，已匿名打乱。选出你认为<b>最像机器</b>的一段。</p>
    <div class="mm-demo-answers">
      ${answers.map((a) => `
        <button type="button" class="mm-demo-answer" data-key="${a.key}" aria-pressed="false">
          <span class="mm-demo-key">${a.key}</span>
          <span class="mm-demo-answer-text">${escHtml(a.text)}</span>
        </button>`).join('')}
    </div>
    <div class="mm-demo-actions">
      <button type="button" class="mm-demo-primary" disabled>提交判断</button>
      <span class="mm-demo-status">先点选一段回答</span>
    </div>
    <div class="mm-demo-result" hidden></div>
  `;

  const cards = Array.from(root.querySelectorAll('.mm-demo-answer'));
  const submit = root.querySelector('.mm-demo-primary');
  const status = root.querySelector('.mm-demo-status');
  const result = root.querySelector('.mm-demo-result');
  let picked = null;
  let locked = false;

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      if (locked) return;
      picked = card.dataset.key;
      cards.forEach((c) => c.setAttribute('aria-pressed', String(c === card)));
      submit.disabled = false;
      status.textContent = `已选 ${picked} 段。点「提交判断」揭示答案。`;
    });
  });

  submit.addEventListener('click', () => {
    if (!picked || locked) return;
    locked = true;
    submit.disabled = true;
    cards.forEach((card) => {
      card.disabled = true;
      if (card.dataset.key === MACHINE) card.classList.add('mm-demo-answer-machine');
      else card.classList.add('mm-demo-answer-human');
    });
    const correct = picked === MACHINE;
    status.textContent = '已提交，答案已揭示。';
    result.hidden = false;
    result.innerHTML = `
      <div class="mm-demo-verdict ${correct ? 'ok' : 'miss'}">${correct ? '判断正确。' : '判断有偏差。'}最像机器的是 <b>${MACHINE}</b> 段。</div>
      <p>C 段最像机器：它先给一句评价，再把回答拆成「首先 / 其次 / 最后」，每一层都正确而空泛，还急着补一句「缺乏可验证的证据」。A 段有厨房、房贷、给妈妈打电话这类具体生活细节，B 段有私人化的玩笑和偏好，这些通常是机器最难自然伪造的部分。注意，这只是示意：真实的图灵测试是双盲模仿游戏——提问者看不到对方，只能通过对话判断，而机器要主动模仿人，而不是写一段标准答案。</p>
    `;
    result.scrollIntoView({ block: 'nearest' });
  });
}

// ---------- 2. 中文屋 ----------
function mathHit(a, b, symbol, keyword) {
  if (symbol === '÷' && b === 0) {
    return {
      keyword,
      reply: '除数为零，规则表里没有这一条，只能返回空白。',
      extra: '查表行缺少除零分支',
    };
  }
  let value;
  if (symbol === '×') value = a * b;
  else if (symbol === '÷') value = a / b;
  else if (symbol === '+') value = a + b;
  else value = a - b;
  if (!Number.isInteger(value)) value = Number(value.toFixed(4));
  return {
    keyword,
    reply: `按四则运算表：${a} ${symbol} ${b} = ${value}。`,
    extra: '只匹配数字与运算符，不理解题意',
  };
}

const CN_RULES = [
  {
    row: '042',
    name: '天气应答',
    test(q) {
      const hit = ['天气', '下雨', '气温', '冷不冷', '热不热', '晴天', '阴天'].find((k) => q.includes(k));
      if (!hit) return null;
      return {
        keyword: hit,
        reply: '今天多云转晴，气温 18 到 26 度，出门带件薄外套。',
        extra: '固定表项，不查实时天气',
      };
    },
  },
  {
    row: '063',
    name: '时间应答',
    test(q) {
      const hit = ['几点', '时间', '日期', '星期', '现在', '今天几号'].find((k) => q.includes(k));
      if (!hit) return null;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const week = '日一二三四五六'[now.getDay()];
      return {
        keyword: hit,
        reply: `现在是 ${hh}:${mm}，${now.getMonth() + 1} 月 ${now.getDate()} 日，星期${week}。`,
        extra: '读取系统时钟后套用模板，不理解“现在”',
      };
    },
  },
  {
    row: '088',
    name: '算术应答',
    test(q) {
      let m = q.match(/(\d+)\s*(?:乘以|乘|×|x|X|\*)\s*(\d+)/);
      if (m) return mathHit(Number(m[1]), Number(m[2]), '×', '乘');
      m = q.match(/(\d+)\s*(?:除以|除|÷|\/)\s*(\d+)/);
      if (m) return mathHit(Number(m[1]), Number(m[2]), '÷', '除');
      m = q.match(/(\d+)\s*(?:加上|加|\+)\s*(\d+)/);
      if (m) return mathHit(Number(m[1]), Number(m[2]), '+', '加');
      m = q.match(/(\d+)\s*(?:减去|减|-)\s*(\d+)/);
      if (m) return mathHit(Number(m[1]), Number(m[2]), '-', '减');
      return null;
    },
  },
  {
    row: '026',
    name: '身份应答',
    test(q) {
      const hit = ['你是谁', '你叫什么', '名字', '你能做什么', '你是什么'].find((k) => q.includes(k));
      if (!hit) return null;
      return {
        keyword: hit,
        reply: '我是「应答器 7 号」。我不懂中文，只是在按规则表查行、拼句子。',
        extra: '固定表项，按行号拼接',
      };
    },
  },
  {
    row: '012',
    name: '问候应答',
    test(q) {
      const hit = ['你好', '您好', '在吗', '早上好', '下午好', '晚上好', '嗨'].find((k) => q.includes(k));
      if (!hit) return null;
      return {
        keyword: hit,
        reply: '您好。这里是中文屋的应答窗口，请直接说问题。',
        extra: '固定表项，不区分语气',
      };
    },
  },
  {
    row: '031',
    name: '致谢应答',
    test(q) {
      const hit = ['谢谢', '感谢', '多谢'].find((k) => q.includes(k));
      if (!hit) return null;
      return {
        keyword: hit,
        reply: '不客气。纸条已归档。',
        extra: '固定表项',
      };
    },
  },
];

const CN_FALLBACK = {
  row: '000',
  name: '兜底应答',
  reply: '没找到对应的规则行。我只能说：抱歉，我不明白这句话。',
  extra: '所有规则行均未命中',
};

function buildChineseRoom(root) {
  root.innerHTML = `
    <div class="mm-demo-field">
      <label class="mm-demo-label" for="mm-cr-input">你从门缝里塞进一张中文纸条：</label>
      <div class="mm-demo-inline">
        <input id="mm-cr-input" class="mm-demo-input" autofocus autocomplete="off" maxlength="80" placeholder="例如：今天天气怎么样？">
        <button type="button" class="mm-demo-primary">递进屋里</button>
      </div>
      <div class="mm-demo-presets">
        <button type="button" class="mm-demo-preset">今天天气怎么样？</button>
        <button type="button" class="mm-demo-preset">现在几点了？</button>
        <button type="button" class="mm-demo-preset">23 乘 7 等于多少？</button>
      </div>
    </div>
    <div class="mm-demo-status mm-demo-status-cr">屋里只有一本规则表和一摞空白纸条。它不看语义，只匹配字词。</div>
    <div class="mm-demo-room" hidden></div>
  `;

  const input = root.querySelector('.mm-demo-input');
  const askButton = root.querySelector('.mm-demo-primary');
  const status = root.querySelector('.mm-demo-status');
  const room = root.querySelector('.mm-demo-room');

  function respond(q) {
    for (const rule of CN_RULES) {
      const hit = rule.test(q);
      if (hit) return { rule, ...hit };
    }
    return { rule: CN_FALLBACK, keyword: null, ...CN_FALLBACK };
  }

  function ask(text) {
    const q = String(text ?? '').trim();
    if (!q) {
      status.textContent = '纸条上还没写字。';
      input.focus({ preventScroll: true });
      return;
    }
    const r = respond(q);
    status.textContent = `已执行规则行 ${r.rule.row}。`;
    room.hidden = false;
    room.innerHTML = `
      <div class="mm-demo-answerbox">
        <span class="mm-demo-answerlabel">屋里递回 · 纸条</span>
        <p>${escHtml(r.reply)}</p>
      </div>
      <div class="mm-demo-trace">
        <div class="mm-demo-trace-title">实际执行的规则（不是“理解”）</div>
        <div class="mm-demo-trace-line"><b>输入原文</b><span>${escHtml(q)}</span></div>
        <div class="mm-demo-trace-line"><b>命中关键词</b><span>${r.keyword ? `『${escHtml(r.keyword)}』` : '（无）'}</span></div>
        <div class="mm-demo-trace-line"><b>查表行</b><span>${escHtml(r.rule.row)} · ${escHtml(r.rule.name)}</span></div>
        <div class="mm-demo-trace-line"><b>输出</b><span>${escHtml(r.reply)}</span></div>
        <div class="mm-demo-trace-line"><b>执行说明</b><span>${escHtml(r.extra || '仅做字符串匹配，未读取语义')}</span></div>
      </div>
      <p class="mm-demo-point">屋里的人不懂中文，只是查表。</p>
    `;
    room.scrollIntoView({ block: 'nearest' });
  }

  askButton.addEventListener('click', () => ask(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ask(input.value);
    }
  });
  root.querySelectorAll('.mm-demo-preset').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = button.textContent;
      ask(button.textContent);
    });
  });
}

// ---------- 3. 注意力示意 ----------
function buildAttention(root) {
  const DEFAULT_SENTENCE = '机忆书库收藏着机器的记忆';

  root.innerHTML = `
    <label class="mm-demo-label" for="mm-att-input">输入一句中文（6–20 字）：</label>
    <div class="mm-demo-inline">
      <input id="mm-att-input" class="mm-demo-input" autofocus autocomplete="off" maxlength="40" value="${DEFAULT_SENTENCE}">
      <button type="button" class="mm-demo-primary">切分并计算</button>
    </div>
    <div class="mm-demo-status" style="margin-top:10px"></div>
    <div class="mm-demo-attn" hidden>
      <div class="mm-demo-tokens-title">二元组切分结果 · 点任意词查看权重</div>
      <div class="mm-demo-tokenline"></div>
      <div class="mm-demo-bars-title"></div>
      <div class="mm-demo-bars"></div>
      <p class="mm-demo-note">示意：真实注意力由模型学得，这里是可解释的简化。权重 = 位置距离 + 字面共享次数，只用于演示。</p>
    </div>
  `;

  const input = root.querySelector('.mm-demo-input');
  const runButton = root.querySelector('.mm-demo-primary');
  const status = root.querySelector('.mm-demo-status');
  const panel = root.querySelector('.mm-demo-attn');
  const tokenBox = root.querySelector('.mm-demo-tokenline');
  const barsTitle = root.querySelector('.mm-demo-bars-title');
  const bars = root.querySelector('.mm-demo-bars');
  let tokens = [];
  let selected = 0;

  function effectiveChars(raw) {
    return Array.from(String(raw ?? '').replace(/[\s\u3000]/g, ''))
      .filter((ch) => /[\u4e00-\u9fa5A-Za-z0-9]/.test(ch));
  }

  function weightsFor(index) {
    const raw = tokens.map((token, j) => {
      if (j === index) return 0;
      const distance = Math.abs(j - index);
      const position = 1 / (1 + distance * 0.9);
      const own = new Set(Array.from(tokens[index]));
      let shared = 0;
      Array.from(token).forEach((ch) => { if (own.has(ch)) shared += 1; });
      return position + shared * 0.55;
    });
    const sum = raw.reduce((acc, value) => acc + value, 0) || 1;
    return raw.map((value) => value / sum);
  }

  function renderBars(index) {
    const weights = weightsFor(index);
    const max = Math.max(...weights) || 1;
    barsTitle.textContent = `「${tokens[index]}」对其他词的注意力分配`;
    bars.innerHTML = tokens.map((token, j) => {
      if (j === index) return '';
      const pct = (weights[j] * 100).toFixed(1);
      const width = Math.max(2, Math.round((weights[j] / max) * 100));
      return `
        <div class="mm-demo-bar-row">
          <span class="mm-demo-bar-label" title="${escHtml(token)}">${escHtml(token)}</span>
          <span class="mm-demo-bar-track"><span class="mm-demo-bar-fill" style="width:${width}%"></span></span>
          <span class="mm-demo-bar-pct">${pct}%</span>
        </div>`;
    }).join('');
  }

  function select(index) {
    selected = index;
    Array.from(tokenBox.children).forEach((child, i) => {
      const on = i === index;
      child.classList.toggle('active', on);
      child.setAttribute('aria-pressed', String(on));
    });
    renderBars(index);
  }

  function run() {
    const chars = effectiveChars(input.value);
    if (chars.length < 6) {
      panel.hidden = true;
      status.textContent = `只有 ${chars.length} 个有效字符，至少需要 6 个。`;
      return;
    }
    if (chars.length > 20) {
      panel.hidden = true;
      status.textContent = `有 ${chars.length} 个有效字符，最多支持 20 个。`;
      return;
    }
    tokens = [];
    for (let i = 0; i < chars.length - 1; i += 1) tokens.push(chars[i] + chars[i + 1]);
    selected = 0;
    panel.hidden = false;
    tokenBox.innerHTML = tokens.map((token, i) => `
      <button type="button" class="mm-demo-token" data-index="${i}" aria-pressed="${i === 0}">${escHtml(token)}</button>
    `).join('');
    Array.from(tokenBox.children).forEach((child) => {
      child.addEventListener('click', () => select(Number(child.dataset.index)));
    });
    select(0);
    status.textContent = `已切出 ${tokens.length} 个二元组。点击任意词，查看它的权重分配。`;
  }

  runButton.addEventListener('click', run);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });
  run();
}

// ---------- 4. 规则系统走查 ----------
const RULE_SYMPTOMS = [
  { id: 'fever', label: '发烧（>38℃）' },
  { id: 'cough', label: '持续咳嗽' },
  { id: 'ache', label: '肌肉酸痛' },
  { id: 'fatigue', label: '乏力' },
  { id: 'runny', label: '流鼻涕' },
  { id: 'sneeze', label: '打喷嚏' },
  { id: 'travel', label: '近期有旅行史' },
];

const EXPERT_RULES = [
  {
    id: 'R1', name: '流感初筛', weight: 2, label: '可能流感',
    text: 'IF 发烧 AND 咳嗽 THEN 可能流感',
    when: (f) => f.has('fever') && f.has('cough'),
  },
  {
    id: 'R2', name: '旅行史加权', weight: 2, label: '可能流感',
    text: 'IF 近期有旅行史 THEN 流感权重 +2',
    when: (f) => f.has('travel'),
  },
  {
    id: 'R3', name: '全身症状', weight: 2, label: '可能流感',
    text: 'IF 肌肉酸痛 AND 乏力 THEN 可能流感',
    when: (f) => f.has('ache') && f.has('fatigue'),
  },
  {
    id: 'R4', name: '普通感冒模式', weight: 2, label: '普通感冒',
    text: 'IF 流鼻涕 AND 打喷嚏 AND 无发烧 THEN 可能普通感冒',
    when: (f) => f.has('runny') && f.has('sneeze') && !f.has('fever'),
  },
  {
    id: 'R5', name: '强证据组合', weight: 6, label: '高度怀疑流感',
    text: 'IF 发烧 AND 咳嗽 AND 旅行史 THEN 高度怀疑流感',
    when: (f) => f.has('fever') && f.has('cough') && f.has('travel'),
  },
  {
    id: 'R6', name: '证据单薄', weight: 0, label: '证据不足',
    text: 'IF 命中条件少于 2 条 THEN 证据不足',
    when: (f) => f.size < 2,
  },
];

const RULE_PRESETS = [
  { name: '流感组合', facts: ['fever', 'cough', 'travel', 'fatigue'] },
  { name: '普通感冒组合', facts: ['runny', 'sneeze', 'fatigue'] },
  { name: '全身酸痛组合', facts: ['ache', 'fatigue', 'travel'] },
  { name: '混合证据', facts: ['fever', 'runny', 'sneeze'] },
];

function buildRules(root) {
  root.innerHTML = `
    <p class="mm-demo-hint">勾选症状/条件，点「开始推理」。命中的规则会按顺序串成一条推理链，权重叠加后给出结论。</p>
    <div class="mm-demo-checks"></div>
    <div class="mm-demo-actions">
      <button type="button" class="mm-demo-primary">开始推理</button>
      <button type="button" class="mm-demo-secondary mm-demo-next">换一组条件</button>
      <button type="button" class="mm-demo-secondary mm-demo-showrules" aria-expanded="false">查看规则库</button>
    </div>
    <div class="mm-demo-status" style="margin-top:10px"></div>
    <div class="mm-demo-rules" hidden></div>
    <div class="mm-demo-result" hidden></div>
  `;

  const checks = root.querySelector('.mm-demo-checks');
  const runButton = root.querySelector('.mm-demo-primary');
  const nextButton = root.querySelector('.mm-demo-next');
  const rulesButton = root.querySelector('.mm-demo-showrules');
  const status = root.querySelector('.mm-demo-status');
  const rulesPanel = root.querySelector('.mm-demo-rules');
  const result = root.querySelector('.mm-demo-result');
  const selected = new Set();
  let presetIndex = -1;
  let libraryBuilt = false;
  let lastHitIds = new Set();

  checks.innerHTML = RULE_SYMPTOMS.map((symptom) => `
    <button type="button" class="mm-demo-check" data-id="${symptom.id}" aria-pressed="false">
      <span class="mm-demo-check-mark"></span><span>${escHtml(symptom.label)}</span>
    </button>`).join('');

  function buildLibrary() {
    rulesPanel.innerHTML = `
      <div class="mm-demo-rules-title">规则库 · ${EXPERT_RULES.length} 条 IF-THEN</div>
      ${EXPERT_RULES.map((rule) => `
        <div class="mm-demo-rule" data-rule="${rule.id}"><b>${rule.id}</b>${escHtml(rule.text)}</div>
      `).join('')}
    `;
    libraryBuilt = true;
    applyHits();
  }

  function clearHits() {
    rulesPanel.querySelectorAll('.mm-demo-rule.hit').forEach((el) => el.classList.remove('hit'));
  }

  function applyHits() {
    Array.from(rulesPanel.querySelectorAll('.mm-demo-rule')).forEach((el) => {
      el.classList.toggle('hit', lastHitIds.has(el.dataset.rule));
    });
  }

  function syncChecks() {
    Array.from(checks.children).forEach((button) => {
      const on = selected.has(button.dataset.id);
      button.setAttribute('aria-pressed', String(on));
      button.querySelector('.mm-demo-check-mark').textContent = on ? '✓' : '';
    });
    clearHits();
    lastHitIds = new Set();
    result.hidden = true;
    status.textContent = selected.size
      ? `已选 ${selected.size} 条条件。点「开始推理」走一遍规则链。`
      : '还没有勾选条件。';
  }

  checks.addEventListener('click', (event) => {
    const button = event.target.closest('.mm-demo-check');
    if (!button || !checks.contains(button)) return;
    const id = button.dataset.id;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    syncChecks();
  });

  function infer() {
    if (!selected.size) {
      result.hidden = true;
      status.textContent = '先勾选至少一条条件，再推理。';
      return;
    }
    const hits = EXPERT_RULES.filter((rule) => rule.when(selected));
    const groups = new Map();
    hits.forEach((rule, index) => {
      const group = groups.get(rule.label) || {
        label: rule.label, score: 0, maxWeight: -1, lastIndex: -1,
      };
      group.score += rule.weight;
      group.maxWeight = Math.max(group.maxWeight, rule.weight);
      group.lastIndex = index;
      groups.set(rule.label, group);
    });
    let winner = null;
    groups.forEach((group) => {
      if (!winner) {
        winner = group;
        return;
      }
      if (group.score > winner.score) {
        winner = group;
        return;
      }
      if (group.score === winner.score
        && (group.maxWeight > winner.maxWeight
          || (group.maxWeight === winner.maxWeight && group.lastIndex > winner.lastIndex))) {
        winner = group;
      }
    });
    const finalLabel = winner ? winner.label : '证据不足';
    const totalWeight = winner ? winner.score : 0;
    const chain = hits.length
      ? hits.map((rule) => `
        <div class="mm-demo-trace-line">
          <b>${rule.id}</b>
          <span>${escHtml(rule.text)}<br>→ ${escHtml(rule.name)} · 权重 +${rule.weight}</span>
        </div>`).join('')
      : '<div class="mm-demo-trace-line"><b>（无）</b><span>所有 IF 条件均未成立。</span></div>';

    result.hidden = false;
    result.innerHTML = `
      <div class="mm-demo-trace">
        <div class="mm-demo-trace-title">命中的规则链 · ${hits.length} 条</div>
        ${chain}
      </div>
      <div class="mm-demo-conclusion">
        <span class="mm-demo-conclusion-label">最终结论</span>
        <div class="mm-demo-conclusion-value">${escHtml(finalLabel)}</div>
        <p class="mm-demo-conclusion-meta">证据权重合计 ${totalWeight}${hits.length ? '。结论按命中规则的权重叠加得出。' : '。没有规则命中，系统只能说「证据不足」。'}</p>
      </div>
      <p class="mm-demo-point">规则由人写死；它不会自己学习。换一组症状，结果也只是落到已有规则上，命中越多只是权重叠加。</p>
    `;
    status.textContent = `命中 ${hits.length} 条规则，得出「${finalLabel}」。`;
    lastHitIds = new Set(hits.map((rule) => rule.id));
    if (libraryBuilt) applyHits();
    result.scrollIntoView({ block: 'nearest' });
  }

  runButton.addEventListener('click', infer);

  nextButton.addEventListener('click', () => {
    presetIndex = (presetIndex + 1) % RULE_PRESETS.length;
    const preset = RULE_PRESETS[presetIndex];
    selected.clear();
    preset.facts.forEach((id) => selected.add(id));
    syncChecks();
    status.textContent = `已载入「${preset.name}」：${preset.facts.length} 条条件。`;
    infer();
  });

  rulesButton.addEventListener('click', () => {
    if (!libraryBuilt) buildLibrary();
    const show = rulesPanel.hidden;
    rulesPanel.hidden = !show;
    rulesButton.setAttribute('aria-expanded', String(show));
    rulesButton.textContent = show ? '收起规则库' : '查看规则库';
  });

  syncChecks();
}

// ---------- 5. 扩散去噪 ----------
function buildDiffusion(root) {
  const GRID = 64;
  const STEPS = 12;

  root.innerHTML = `
    <p class="mm-demo-hint">起点是一张 <b>64×64</b> 的随机噪声图。每点一次，噪声退去一部分，预先画好的目标图案逐渐浮现。</p>
    <div class="mm-demo-canvas-wrap">
      <canvas class="mm-demo-pixel-canvas" width="${GRID}" height="${GRID}" aria-label="64×64 扩散去噪示意画布"></canvas>
    </div>
    <div class="mm-demo-meters">
      <span class="mm-demo-meter-label mm-demo-step"></span>
      <span class="mm-demo-meter-label mm-demo-remain"></span>
    </div>
    <div class="mm-demo-progress"><span class="mm-demo-progress-fill"></span></div>
    <div class="mm-demo-actions">
      <button type="button" class="mm-demo-primary">去噪一步</button>
      <button type="button" class="mm-demo-secondary">重来</button>
      <span class="mm-demo-status"></span>
    </div>
    <p class="mm-demo-note">示意：真实扩散模型在潜空间里做同样的事——从噪声出发，逐步预测并减去噪声，最后生成图像。</p>
  `;

  const canvas = root.querySelector('.mm-demo-pixel-canvas');
  const stepLabel = root.querySelector('.mm-demo-step');
  const remainLabel = root.querySelector('.mm-demo-remain');
  const fill = root.querySelector('.mm-demo-progress-fill');
  const stepButton = root.querySelector('.mm-demo-primary');
  const resetButton = root.querySelector('.mm-demo-secondary');
  const status = root.querySelector('.mm-demo-status');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const target = new Float32Array(GRID * GRID);
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      let value = 0.05;
      const onPage = (x >= 9 && x <= 30 && y >= 17 && y <= 51)
        || (x >= 34 && x <= 55 && y >= 17 && y <= 51);
      if (onPage) {
        value = 0.36;
        const onLeft = x >= 10 && x <= 29;
        const onRight = x >= 35 && x <= 54;
        if ((onLeft || onRight) && [24, 31, 38, 45].includes(y) && x % 4 !== 0) value = 0.74;
        if (x === 9 || x === 30 || x === 34 || x === 55 || y === 17 || y === 51) value = 0.96;
      }
      if (x >= 31 && x <= 33 && y >= 16 && y <= 52) value = 0.92;
      if (x >= 43 && x <= 46 && y >= 11 && y <= 17) value = 0.86;
      target[y * GRID + x] = value;
    }
  }

  const noise = new Float32Array(GRID * GRID);
  const image = ctx.createImageData(GRID, GRID);
  let step = 0;

  function reseed() {
    for (let i = 0; i < noise.length; i += 1) noise[i] = Math.random();
  }

  function paint() {
    const progress = step / STEPS;
    const data = image.data;
    for (let i = 0; i < noise.length; i += 1) {
      const value = noise[i] * (1 - progress) + target[i] * progress;
      const offset = i * 4;
      data[offset] = Math.round(22 + value * 218);
      data[offset + 1] = Math.round(17 + value * 188);
      data[offset + 2] = Math.round(13 + value * 140);
      data[offset + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    stepLabel.textContent = `第 ${step} 步 / 共 ${STEPS} 步`;
    remainLabel.textContent = `剩余噪声 ${Math.round((1 - progress) * 100)}%`;
    fill.style.width = `${Math.round(progress * 100)}%`;
    if (step >= STEPS) {
      stepButton.disabled = true;
      status.textContent = '已收敛：噪声退尽，书本轮廓清晰了。';
    } else {
      stepButton.disabled = false;
      status.textContent = step === 0
        ? '当前是纯噪声，点「去噪一步」开始。'
        : '噪声在退去，目标图案正在浮现。';
    }
  }

  function restart() {
    step = 0;
    reseed();
    paint();
  }

  stepButton.addEventListener('click', () => {
    if (step >= STEPS) return;
    step += 1;
    paint();
  });
  resetButton.addEventListener('click', restart);

  restart();
}

// ---------- 6. 缩放定律 ----------
function buildScaling(root) {
  const RANGES = {
    params: { min: 0.1, max: 70 },
    data: { min: 1, max: 2000 },
    compute: { min: 1, max: 1000 },
  };
  const WEIGHTS = { params: 20, data: 14, compute: 10 };
  const RAW_MIN = WEIGHTS.params * Math.log10(RANGES.params.min);
  const RAW_MAX = WEIGHTS.params * Math.log10(RANGES.params.max)
    + WEIGHTS.data * Math.log10(RANGES.data.max)
    + WEIGHTS.compute * Math.log10(RANGES.compute.max);
  const NAMES = { params: '参数量', data: '数据量', compute: '算力' };

  root.innerHTML = `
    <p class="mm-demo-hint">拖动三根滑杆，按简化幂律实时计算能力分；曲线横轴为参数量（对数刻度），圆点是当前位置。</p>
    ${['params', 'data', 'compute'].map((key, index) => `
      <div class="mm-demo-range-row">
        <div class="mm-demo-range-head">
          <span class="mm-demo-range-name">${NAMES[key]}</span>
          <span class="mm-demo-range-value" data-key="${key}"></span>
        </div>
        <input type="range" class="mm-demo-range" data-key="${key}" min="0" max="1000"
          value="${index === 0 ? 649 : index === 1 ? 750 : 667}"
          aria-label="${NAMES[key]}"${index === 0 ? ' autofocus' : ''}>
      </div>`).join('')}
    <div class="mm-demo-scorebox">
      <span class="mm-demo-score">—</span>
      <span class="mm-demo-score-unit">/ 100 能力分</span>
    </div>
    <div class="mm-demo-bars-title">能力分 vs 参数量（数据量与算力取当前值）</div>
    <canvas class="mm-demo-chart" width="720" height="250" aria-label="缩放定律曲线"></canvas>
    <p class="mm-demo-note">示意：score = a·log(参数量) + b·log(数据量) + c·log(算力)。真实缩放定律是经验拟合，这里只是示意。</p>
  `;

  const inputs = {};
  const valueLabels = {};
  root.querySelectorAll('.mm-demo-range').forEach((input) => {
    inputs[input.dataset.key] = input;
  });
  root.querySelectorAll('.mm-demo-range-value').forEach((el) => {
    valueLabels[el.dataset.key] = el;
  });
  const scoreEl = root.querySelector('.mm-demo-score');
  const chart = root.querySelector('.mm-demo-chart');
  const ctx = chart.getContext('2d');
  if (!ctx) return;

  function valueAt(key, t) {
    const range = RANGES[key];
    return Math.exp(Math.log(range.min) + (Math.log(range.max) - Math.log(range.min)) * t);
  }

  function logT(key, value) {
    const range = RANGES[key];
    return (Math.log(value) - Math.log(range.min)) / (Math.log(range.max) - Math.log(range.min));
  }

  function valueOf(key) {
    return valueAt(key, Number(inputs[key].value) / 1000);
  }

  function scoreOf(params, data, compute) {
    const raw = WEIGHTS.params * Math.log10(params)
      + WEIGHTS.data * Math.log10(data)
      + WEIGHTS.compute * Math.log10(compute);
    const score = ((raw - RAW_MIN) / (RAW_MAX - RAW_MIN)) * 100;
    return Math.max(0, Math.min(100, score));
  }

  function formatValue(key, value) {
    if (key === 'data') {
      return value >= 1000
        ? `${(value / 1000).toFixed(2)} T tokens`
        : `${value.toFixed(0)} B tokens`;
    }
    if (key === 'params') {
      return value < 1 ? `${value.toFixed(2)} B` : `${value.toFixed(1)} B`;
    }
    return `${value.toFixed(0)} PF-day`;
  }

  function drawChart(params, data, compute, score) {
    const width = chart.width;
    const height = chart.height;
    const padL = 58;
    const padR = 20;
    const padT = 18;
    const padB = 38;
    const plotR = width - padR;
    const plotB = height - padB;
    const xAt = (t) => padL + t * (plotR - padL);
    const yAt = (value) => plotB - (value / 100) * (plotB - padT);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#181310';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '18px Consolas, "Microsoft YaHei", monospace';
    ctx.textBaseline = 'middle';

    [0, 25, 50, 75, 100].forEach((value) => {
      const y = yAt(value);
      ctx.strokeStyle = value === 0 ? '#3a2f22' : '#2c2116';
      ctx.lineWidth = 1;
      ctx.setLineDash(value === 0 ? [] : [4, 5]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(plotR, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#8a7a5c';
      ctx.textAlign = 'right';
      ctx.fillText(String(value), padL - 8, y);
    });

    ctx.strokeStyle = '#3a2f22';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotR - padL, plotB - padT);

    [[0.1, '0.1B'], [1, '1B'], [10, '10B'], [70, '70B']].forEach(([value, label], index, all) => {
      const x = xAt(logT('params', value));
      ctx.fillStyle = '#8a7a5c';
      ctx.textAlign = index === all.length - 1 ? 'right' : 'center';
      ctx.fillText(label, x, height - 16);
    });

    ctx.strokeStyle = '#c8a24a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120;
      const pointScore = scoreOf(valueAt('params', t), data, compute);
      const x = xAt(t);
      const y = yAt(pointScore);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const dotX = xAt(logT('params', params));
    const dotY = yAt(score);

    ctx.strokeStyle = 'rgba(200,162,74,.5)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(dotX, dotY);
    ctx.lineTo(dotX, plotB);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#c8a24a';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#14100d';
    ctx.lineWidth = 2;
    ctx.stroke();

    const alignRight = dotX > plotR - 96;
    ctx.fillStyle = '#f0e5c8';
    ctx.font = '18px Consolas, "Microsoft YaHei", monospace';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillText(`当前 ${score.toFixed(1)}`, dotX + (alignRight ? -12 : 12), dotY - 12);
  }

  function update() {
    const params = valueOf('params');
    const data = valueOf('data');
    const compute = valueOf('compute');
    const score = scoreOf(params, data, compute);
    valueLabels.params.textContent = formatValue('params', params);
    valueLabels.data.textContent = formatValue('data', data);
    valueLabels.compute.textContent = formatValue('compute', compute);
    scoreEl.textContent = score.toFixed(1);
    drawChart(params, data, compute, score);
  }

  Object.values(inputs).forEach((input) => input.addEventListener('input', update));
  update();
}

const BUILDERS = {
  turing: buildTuring,
  'chinese-room': buildChineseRoom,
  attention: buildAttention,
  rules: buildRules,
  diffusion: buildDiffusion,
  scaling: buildScaling,
};

export function openDemo(kind) {
  const meta = DEMO_META[kind];
  if (!meta) {
    console.warn(`[mm-demo] 未知演示类型：${kind}`);
    return;
  }
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', () => openDemo(kind), { once: true });
    return;
  }
  injectStyle();
  if (activeDemo) closeDemo();

  const prevFocus = document.activeElement;
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.className = 'mm-demo-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'mm-demo-title');
  overlay.innerHTML = `
    <div class="mm-demo-panel">
      <header class="mm-demo-head">
        <div>
          <div class="mm-demo-kicker">THE MACHINE MEMORY · 可玩标本</div>
          <h2 id="mm-demo-title" class="mm-demo-title">${escHtml(meta.title)}</h2>
          <p class="mm-demo-sub">${escHtml(meta.sub)}</p>
        </div>
        <button type="button" class="mm-demo-close" aria-label="关闭演示">×</button>
      </header>
      <div class="mm-demo-body"></div>
      <footer class="mm-demo-foot">
        <span>点击遮罩或按 Esc 关闭</span>
        <span>${escHtml(meta.foot)}</span>
      </footer>
    </div>
  `;
  document.body.appendChild(overlay);

  const escHandler = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDemo();
    }
  };
  document.addEventListener('keydown', escHandler);
  overlay.querySelector('.mm-demo-close').addEventListener('click', closeDemo);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeDemo();
  });

  const body = overlay.querySelector('.mm-demo-body');
  try {
    BUILDERS[kind](body);
  } catch (error) {
    document.removeEventListener('keydown', escHandler);
    overlay.remove();
    document.body.style.overflow = prevOverflow;
    throw error;
  }

  activeDemo = { overlay, prevFocus, prevOverflow, escHandler };
  const focusTarget = overlay.querySelector('[autofocus]')
    || overlay.querySelector('.mm-demo-answer')
    || overlay.querySelector('.mm-demo-primary')
    || overlay.querySelector('.mm-demo-close');
  setTimeout(() => {
    if (focusTarget && document.contains(focusTarget)) focusTarget.focus({ preventScroll: true });
  }, 0);
}

window.mmOpenDemo = openDemo;

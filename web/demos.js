// web/demos.js · 机忆书库三个可玩演示（图灵测试 / 中文屋 / 注意力示意）
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

const BUILDERS = {
  turing: buildTuring,
  'chinese-room': buildChineseRoom,
  attention: buildAttention,
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

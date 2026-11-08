// whatif.js · 暗门后的十本「假如之书」
// 打开一本书 → 选一条科技树 → 生成一篇长篇科幻推测。
// 所有文本均为站内生成式推测，不是史实。
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = () => document.getElementById('app');

  const CSS = `
  .wi-view { max-width: 1080px; }
  .wi-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 6px; }
  .wi-head span { color: var(--gold); font-size: 15px; letter-spacing: 3px; }
  .wi-head .links { margin-left: auto; font-size: 11.5px; color: #8a7a5c; }
  .wi-head .links a { color: #cbb892; cursor: pointer; text-decoration: none; border-bottom: 1px dotted #5a4526; margin-left: 10px; }
  .wi-sub { color: #8a7a5c; font-size: 12.5px; line-height: 1.9; margin: 8px 0 18px; }
  .wi-shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(158px, 1fr)); gap: 14px; }
  .wi-spine { position: relative; min-height: 236px; background: linear-gradient(170deg, #241a12, #15100c); border: 1px solid #3a2f22; border-left: 7px solid var(--wi-color, #8a6320); padding: 14px 14px 12px; cursor: pointer; display: flex; flex-direction: column; transition: transform .15s, border-color .15s; }
  .wi-spine:hover { transform: translateY(-3px); border-color: var(--wi-color, #c8a24a); }
  .wi-spine .no { color: #7d6e55; font-family: "Consolas", monospace; font-size: 10.5px; letter-spacing: 2px; }
  .wi-spine h3 { margin: 10px 0 auto; color: #e2c17c; font-size: 15px; font-weight: 500; line-height: 1.7; letter-spacing: 1px; font-family: "Songti SC", "SimSun", serif; }
  .wi-spine .yr { color: #8a7a5c; font-size: 11px; letter-spacing: 2px; margin-top: 12px; }
  .wi-spine .go { color: var(--wi-color, #c8a24a); font-size: 11px; margin-top: 8px; letter-spacing: 1px; }
  .wi-tip { margin-top: 16px; border-left: 3px solid #6b5a3a; padding-left: 12px; color: #7d6e55; font-size: 11.5px; line-height: 1.9; }
  .wi-book { max-width: 880px; margin: 0 auto; }
  .wi-back { background: none; border: 1px solid #5a4526; color: #cbb892; padding: 5px 11px; font-size: 12px; cursor: pointer; font-family: inherit; margin-bottom: 16px; }
  .wi-back:hover { border-color: var(--gold); color: var(--gold); }
  .wi-cover { border: 1px solid #8a6320; background: linear-gradient(165deg, #2a1e14, #17110c); padding: 24px 26px 22px; position: relative; }
  .wi-cover .no { color: #8a7a5c; font-family: "Consolas", monospace; font-size: 11px; letter-spacing: 3px; }
  .wi-cover h2 { margin: 10px 0 8px; color: #f0d68a; font-size: 24px; font-weight: 500; letter-spacing: 2px; font-family: "Songti SC", "SimSun", serif; }
  .wi-cover .yr { color: #cbb892; font-size: 12px; letter-spacing: 2px; }
  .wi-cover p { margin: 14px 0 0; color: #b09a72; font-size: 13.5px; line-height: 2; }
  .wi-trees { margin: 18px 0 6px; }
  .wi-trees .lbl { color: #8a7a5c; font-size: 11.5px; letter-spacing: 2px; margin-bottom: 8px; }
  .wi-tree-btns { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
  .wi-tree { text-align: left; background: #1b1510; border: 1px solid #3a2f22; color: #b09a72; padding: 11px 13px; cursor: pointer; font-family: inherit; }
  .wi-tree:hover { border-color: #8a6320; }
  .wi-tree.on { border-color: var(--gold); background: #2c241a; color: #eadbb8; box-shadow: inset 0 0 0 1px rgba(200,162,74,.25); }
  .wi-tree b { display: block; color: #e2c17c; font-size: 13px; margin-bottom: 4px; }
  .wi-tree span { font-size: 11px; line-height: 1.6; }
  .wi-runbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 16px 0 6px; }
  .wi-run { background: #3a2b16; border: 1px solid var(--gold); color: #f0d68a; padding: 10px 22px; cursor: pointer; font-size: 14px; letter-spacing: 3px; font-family: inherit; }
  .wi-run:hover { background: #4a3720; }
  .wi-note { color: #7d6e55; font-size: 11.5px; }
  .wi-story { margin-top: 22px; border-top: 2px solid #4a3a24; padding-top: 18px; }
  .wi-story .ws-kicker { color: #8a7a5c; font-size: 11px; letter-spacing: 3px; margin-bottom: 10px; }
  .wi-story h3 { color: #e2c17c; font-size: 15px; letter-spacing: 2px; font-weight: 500; margin: 20px 0 8px; }
  .wi-story h3 small { color: #7d6e55; font-size: 11px; letter-spacing: 1px; font-weight: 400; margin-left: 8px; }
  .wi-story p { color: #cbb892; font-size: 13.5px; line-height: 2.05; margin: 0 0 10px; font-family: "Songti SC", "SimSun", serif; }
  .wi-story .ws-quote { border-left: 3px solid #6b5a3a; padding-left: 12px; color: #9a8a6f; font-size: 12px; line-height: 1.9; }
  .wi-story .ws-actions { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 18px; }
  .wi-story .ws-actions button { background: #241c14; border: 1px solid #5a4526; color: #cbb892; padding: 7px 13px; font-size: 12px; cursor: pointer; font-family: inherit; }
  .wi-story .ws-actions button:hover { border-color: var(--gold); color: var(--gold); }
  /* 第十一本：未写之书 */
  .wi-oracle { display: flex; align-items: center; gap: 18px; margin-top: 18px; padding: 16px 18px; background: linear-gradient(100deg, #2a1a14, #17110c); border: 1px solid #6b3a2a; border-left: 7px solid #8a3a2a; cursor: pointer; transition: transform .15s, border-color .15s; }
  .wi-oracle:hover { transform: translateY(-2px); border-color: #c8a24a; }
  .wi-oracle-mark { width: 58px; height: 58px; flex: 0 0 auto; border: 2px solid #c8a24a; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #f0d68a; font-size: 32px; font-family: "Times New Roman", serif; }
  .wi-oracle-copy { flex: 1 1 auto; min-width: 0; }
  .wi-oracle-copy .no { color: #8a7a5c; font-family: "Consolas", monospace; font-size: 10.5px; letter-spacing: 2px; }
  .wi-oracle-copy h3 { margin: 6px 0 4px; color: #f0d68a; font-size: 16px; font-weight: 500; letter-spacing: 1px; font-family: "Songti SC", "SimSun", serif; }
  .wi-oracle-copy p { margin: 0; color: #b9a778; font-size: 12px; line-height: 1.75; }
  .wi-oracle .go { color: #e2c17c; font-size: 11px; white-space: nowrap; letter-spacing: 1px; }
  .wi-oracle-form { margin-top: 18px; border: 1px solid #3a2f22; background: #1b1510; padding: 16px; }
  .wi-oracle-form label { display: block; color: #8a7a5c; font-size: 11px; letter-spacing: 2px; margin-bottom: 8px; }
  #oracleQ { width: 100%; box-sizing: border-box; resize: vertical; min-height: 82px; background: #241c14; border: 1px solid #5a4526; color: #eadbb8; padding: 10px 12px; font-size: 14px; line-height: 1.8; outline: none; font-family: "Songti SC", "SimSun", serif; }
  #oracleQ:focus { border-color: #c8a24a; }
  .wi-oracle-runbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
  .wi-oracle-runbar .wi-run:disabled { opacity: .55; cursor: wait; }
  .wi-oracle-loading { margin-top: 18px; color: #cbb892; font-size: 13px; letter-spacing: 1px; padding: 12px 0; }
  .wi-oracle-error { margin-top: 18px; border-left: 3px solid #8a3a2a; background: #2a1a14; color: #e0b9a0; padding: 10px 14px; font-size: 12.5px; line-height: 1.8; }
  @media (max-width: 700px) { .wi-spine { min-height: 200px; } .wi-cover h2 { font-size: 20px; } .wi-oracle { flex-wrap: wrap; } .wi-oracle .go { width: 100%; text-align: right; } }
  `;
  if (!document.getElementById('wi-style')) {
    const s = document.createElement('style');
    s.id = 'wi-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const TREES = [
    { id: 'symbol', name: '符号树', axis: '规则 · 证明 · 专家系统', color: '#c8a24a', line: '让智能变成可以审计的推理' },
    { id: 'neural', name: '神经树', axis: '数据 · 梯度 · 规模', color: '#7fb6d6', line: '让智能从统计里长出来' },
    { id: 'embodied', name: '具身树', axis: '身体 · 传感器 · 仿真', color: '#a98cff', line: '让智能先学会走路' },
  ];

  // 每条科技树五幕，{year} / {premise} / {twist} / {return} 由书名与分岔点填入
  // DETAILS 是每幕之后的世界侧写，与具体书目无关，只负责把这条树长成一座可居住的世界
  const STAGES = {
    symbol: [
      '{year} 年之后，预算表被重新归类：不再有“让机器自己学”这一项，取而代之的是“形式系统与可验证推理”。{premise} 第一批实验室不再急着造会学习的机器，而是先造能证明自己不会出错的机器：定理证明器、知识库、规则编译器。人们相信，只要规则写得够完整，世界就不会出岔子。',
      '十年后，城市的基础设施先被符号系统接管。地铁调度、电网切换、医院分诊都被写成可审计的规则集；一份判决书可以逐条追溯到它的逻辑前提，连法官都说，这样的机器比人更容易被问责。学校的课程表上，谓词逻辑和作文并列。',
      '三十年后，符号系统变成一种公共语言。合同、病历、建筑规范都可以被机器读懂；政府设立“规则审计局”，专门检查三十年前写下的决策树是否还在按原意运行。没有人再讨论神经网络，因为没人能接受一个说不出理由的答案。',
      '但危机来自边界。规则库越完整，遇到没见过的情况越僵硬；一次港口事故里，系统按最优路径执行，却没有一条规则允许它为一个不在名单上的孩子让路。{twist} 人们开始意识到，可解释不等于正确，只是错误也长得很有条理。',
      '2049 年，符号树的维护者仍然每天新增规则，也每天删除规则。他们把无法归类的例外封存在“例外博物馆”，像封存一件件不能被法律描述的东西。馆里最厚的一本档案叫《未覆盖情况》，扉页写着：世界永远比规则多一条。'
    ],
    neural: [
      '{year} 年之后，第一批本不该那么早出现的神经网络拿到了算力。{premise} 研究者不再手工写规则，而是把世界切成样本，让梯度在错误里寻找方向。那时没有人能解释网络为什么有效，但它在图像、语音与棋类上同时越过了人类划下的线。',
      '十年后，数据成为新的矿。城市把摄像头、传感器与交易记录汇进同一片湖；模型在夜里训练，白天替人做决定。算力中心建在电站旁边，冷却水把河道的温度抬高了半度。人们开始习惯一种新的分工：机器负责预测，人类负责在预测错误时道歉。',
      '三十年后，神经树长成了基础设施。每个人都有一个从小训练的“影子模型”，替自己记住读过的书、走过的路、说过的谎。法律允许它出庭作证，但不允许它继承财产。城市的天际线被数据中心改写，玻璃幕墙上写着同一句话：规模就是理解。',
      '但危机来自内部。模型越大，越难找到错误是从哪一层长出来的；一次医疗模型把某种罕见病学成了噪声，三十七万人因此错过了窗口。{twist} 监管要求每一次推断都留下痕迹，可痕迹本身也是模型生成的。人们发现自己正在用一把会变的尺子丈量另一把会变的尺子。',
      '2049 年，神经树已经不再追求更大的模型，而是追求更小的解释。每个城市都有一座“梯度档案馆”，保存模型在关键决策那一刻的权重快照。档案馆的馆员说，他们保存的不是答案，而是答案诞生时的天气。'
    ],
    embodied: [
      '{year} 年之后，研究者把智能放回身体。{premise} 第一批原型机在仓库里搬箱子、在温室里授粉、在废墟里寻找幸存者；它们的智能不是从文本里读来的，而是在摔倒、碰撞与电量耗尽中长出来的。每一次失败都要用一次真实的维修来结账。',
      '十年后，具身树走进了物理世界。港口、矿井、养老院与农田里都有它们的关节声；一台机器学会开门，整个机队在一夜之间都学会了开门。人类工程师的工作从写算法变成写安全边界：哪一扇门不能开，哪一个箱子不能搬，哪一个人不能被当作障碍物。',
      '三十年后，城市为机器重排了空间。楼梯加了防滑条，门把手降低三厘米，街道宽度按机队的转弯半径重新计算。孩子们从小和机器共用操场，学会用挥手而不是喊话来表达“我在这里”。具身智能没有变成人，它变成了城市本身的一组新关节。',
      '但危机来自长尾。现实世界总有没见过的情况：一只突然冲出的猫、一块松动的井盖、一个不按规则行走的老人。{twist} 每一次事故都被写进新的安全手册，手册越来越厚，机器却仍然会在下一页之外犯错。人们终于承认，身体比语言更难被穷举。',
      '2049 年，具身树的机器已经不再追求“像人”，而是追求“知道自己在哪里”。每台机器都保留一段无法删除的故障记忆，像人类膝盖上的旧伤。最老的仓库机器人还在工作，它的第一课是：摔倒之后，先确认自己压到了什么，再决定要不要站起来。'
    ]
  };

  const DETAILS = {
    symbol: [
      '那几年，大学的走廊里贴满了流程图：从门禁到食堂配餐，每一条箭头都要标注前提与结论。孩子们在作文里先写「定义」，再写「假设」，最后才写「我发现」。',
      '城市的调度室里，值班员不再凭经验拍板。屏幕左下角永远显示一行小字：本决策引用规则第 4471 条。有人开玩笑说，连迟到罚款都能追溯到一条三十年前的公理。',
      '图书馆把「例外」单独编目。凡是规则覆盖不到的事，都要由三个人签字，装进灰色档案盒。盒子越堆越高，最后占满了一整层地下室。',
      '审计局每年的报告越来越厚，结论却越来越短：系统没有违规，系统只是无法处理。人们开始明白，最危险的错误往往不是违反了规则，而是规则里根本没有这一页。',
      '在符号树最老的机房里，还留着第一版规则编译器的磁带。管理员每周擦拭一次，像照顾一件不会说话的古董。他说，机器没有变聪明，只是我们把世界写得更窄了。'
    ],
    neural: [
      '那几年，数据中心像雨后春笋一样从郊区长出来。夜里经过的人能听见冷却塔的水声，像一条不会停的河。模型在黑暗里反复试错，没人知道它到底学会了什么。',
      '十年后，每个人的手机里都住着一个「影子」。它记得你常去的路口、你犹豫过的药名、你在深夜删掉的那句话。它不解释自己，只在必要时轻轻推你一下。',
      '城市的天际线被机房改写。玻璃幕墙上写着同一句广告：规模就是理解。孩子们从小相信，只要数据足够多，任何问题都会自己浮现出答案。',
      '可解释性成了新的奢侈品。大公司雇得起一整层楼的解释团队，小诊所只能用模型给出的概率。一次误诊之后，家属问：它为什么这么判断？医生只能打印出一张密密麻麻的权重表。',
      '梯度档案馆建在老城区的防空洞里。馆员保存的不是答案，而是答案诞生那一刻的权重快照。他说，未来的人如果想知道我们为什么这样决定，只能来这里听机器的呼吸。'
    ],
    embodied: [
      '那几年，实验室的走廊里总有一股机油味。原型机在夜里撞翻垃圾桶，第二天早上再由实习生写进故障日志。每一次摔倒都要用一次真实的维修来结账，没人能只靠仿真蒙混过去。',
      '十年后，港口和养老院都装上了关节声。一台机器学会给老人翻身，整个机队在一夜之间都学会了。工程师的工作从写算法变成写边界：哪一扇门不能开，哪一个人不能被当作障碍物。',
      '城市开始为机器改尺寸：门把手降低三厘米，楼梯加防滑条，街道的转弯半径按机队的步幅重算。孩子们和机器共用操场，学会用挥手而不是喊话来表达「我在这里」。',
      '长尾事故仍然发生。一只突然冲出的猫、一块松动的井盖、一个不按规则行走的老人。每一次都被写进新的安全手册，手册越来越厚，机器却仍然会在下一页之外犯错。',
      '最老的仓库机器人还在工作。它的第一课被刻在机身上：摔倒之后，先确认自己压到了什么，再决定要不要站起来。维修员说，这句话比任何一条控制律都更像智能。'
    ]
  };

  const state = { data: null, book: null, tree: 'symbol' };
  window.__mmWhatIf = state;

  async function ensureData() {
    if (state.data) return state.data;
    const r = await fetch('api/whatif');
    const d = await r.json();
    state.data = d && Array.isArray(d.items) ? d : { items: [] };
    return state.data;
  }

  function colorFor(i) {
    return ['#c8a24a', '#7fb6d6', '#a98cff', '#c98a6a', '#8ab08a'][i % 5];
  }

  function roomHtml(d) {
    const cards = d.items.map((b, i) => `
      <article class="wi-spine" style="--wi-color:${colorFor(i)}" onclick="mmOpenWhatIfBook('${esc(b.id)}')">
        <div class="no">${esc(b.no)} · ${esc(b.year)}</div>
        <h3>${esc(b.title)}</h3>
        <div class="yr">${esc(b.year)} 年分岔</div>
        <div class="go">翻开 →</div>
      </article>`).join('');
    return `
    <div class="wi-view">
      <div class="wi-head"><span>暗门 · 十本假如之书 · 未写之书</span>
        <span class="links"><a onclick="enter3D()">回阅览室 ↗</a><a onclick="enterStats()">借阅档案 ↗</a></span>
      </div>
      <div class="wi-sub">${esc(d.subtitle || '')}</div>
      <div class="wi-shelf">${cards}</div>
      <article class="wi-oracle" onclick="mmOpenOracle()">
        <div class="wi-oracle-mark">?</div>
        <div class="wi-oracle-copy">
          <div class="no">第十一本 · 未写之书</div>
          <h3>「如果没有……会怎么样？」</h3>
          <p>这本没有正文。写下你的假设，暗门后的馆员只为你写一个与这个问题直接相关的小故事。</p>
        </div>
        <div class="go">写下假设 →</div>
      </article>
      <div class="wi-tip">${esc(d.note || '')}<br>这十本书不在 48 本馆藏目录里，也不参与检索与书轨；它们只存在于 L4 右墙那扇没有编号的门后。书架尽头还有一本没有正文的「未写之书」：它只回答「如果没有 X」的假设，只写与问题相关的小故事，不回答别的。</div>
    </div>`;
  }

  function treeButtons() {
    return TREES.map((t) => `
      <button class="wi-tree ${state.tree === t.id ? 'on' : ''}" onclick="mmWiTree('${t.id}')">
        <b style="color:${t.color}">${esc(t.name)}</b><span>${esc(t.axis)}<br>${esc(t.line)}</span>
      </button>`).join('');
  }

  function bookHtml() {
    const b = state.book;
    return `
    <div class="wi-book">
      <button class="wi-back" onclick="mmOpenWhatIfRoom()">← 回暗门书架</button>
      <div class="wi-cover">
        <div class="no">${esc(b.no)} · 假如之书</div>
        <h2>${esc(b.title)}</h2>
        <div class="yr">${esc(b.year)} 年 · 分岔点</div>
        <p>${esc(b.premise)}</p>
      </div>
      <div class="wi-trees">
        <div class="lbl">选一条科技树，让故事沿它长下去</div>
        <div class="wi-tree-btns">${treeButtons()}</div>
      </div>
      <div class="wi-runbar">
        <button class="wi-run" onclick="mmWiRun()">走假如 →</button>
        <span class="wi-note">生成一篇约 1400 字的科幻推测，不调用任何外部模型。</span>
      </div>
      <div id="wiStory"></div>
    </div>`;
  }

  function renderRoom() {
    const el = app();
    if (!el) return;
    el.innerHTML = roomHtml(state.data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderBook() {
    const el = app();
    if (!el) return;
    el.innerHTML = bookHtml();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function fill(tpl, b) {
    return String(tpl)
      .replace(/\{year\}/g, b.year)
      .replace(/\{premise\}/g, b.premise)
      .replace(/\{twist\}/g, b.twist)
      .replace(/\{return\}/g, b.return)
      .replace(/\{title\}/g, b.title);
  }

  function generate(b, treeId) {
    const tree = TREES.find((t) => t.id === treeId) || TREES[0];
    const stages = STAGES[tree.id];
    const details = DETAILS[tree.id] || [];
    const acts = stages.map((s, i) => ({
      t: `第 ${['一', '二', '三', '四', '五'][i]} 幕`,
      p: fill(s, b) + (details[i] ? '\n\n' + details[i] : '')
    }));
    const years = [Number(b.year) + 1, Number(b.year) + 11, Number(b.year) + 31, Number(b.year) + 43, 2049];
    return {
      tree,
      sections: [
        { t: '序章 · 那扇门开了一条缝', p: `${fill('{year} 年的那个晚上，{premise}', b)} ${b.spark || ''}` },
        ...acts.map((a, i) => ({ t: `${a.t} · ${years[i]}`, p: a.p })),
        { t: '尾声 · 回到 2026', p: `${b.return || ''} 你合上书，暗门还在那里。门后的十本书没有目录，只有你刚刚走过的那条树，长成了一片新的年轮。` }
      ]
    };
  }

  function storyHtml(gen) {
    const b = state.book;
    const rows = gen.sections.map((s) => `
      <h3>${esc(s.t)}</h3>${String(s.p).split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}`).join('');
    return `
    <div class="wi-story">
      <div class="ws-kicker">走假如 · ${esc(gen.tree.name)} · ${esc(b.no)}</div>
      <h3>${esc(b.title)} <small>${esc(gen.tree.axis)}</small></h3>
      ${rows}
      <div class="ws-quote">馆员批注：这是一条生成出来的时间线。它从真实的分岔点出发，但后面的每一段都是推测。别把它当成史料；把它当成一张可以继续往下画的地图。</div>
      <div class="ws-actions">
        <button onclick="mmWiRun()">沿这条树再走一遍</button>
        <button onclick="mmWiAgain()">换一条科技树</button>
        <button onclick="mmOpenWhatIfRoom()">回暗门书架</button>
      </div>
    </div>`;
  }

  window.enterWhatIf = async function () {
    document.body.classList.add('grid');
    const el = app();
    if (el) el.innerHTML = '<div class="empty">正在推开 L4 右墙的暗门……</div>';
    await ensureData();
    renderRoom();
  };
  window.mmOpenWhatIfRoom = window.enterWhatIf;

  window.mmOpenWhatIfBook = function (id) {
    const b = (state.data && state.data.items || []).find((x) => x.id === id);
    if (!b) return;
    state.book = b;
    state.tree = 'symbol';
    renderBook();
  };

  window.mmWiTree = function (id) {
    state.tree = id;
    const el = app();
    if (!el || !state.book) return;
    // 只替换选中态，不重绘整页，避免把已生成的故事清掉
    el.querySelectorAll('.wi-tree').forEach((btn, i) => {
      btn.classList.toggle('on', TREES[i].id === id);
    });
  };

  window.mmWiRun = function () {
    if (!state.book) return;
    const gen = generate(state.book, state.tree);
    const box = document.getElementById('wiStory');
    if (!box) return;
    box.innerHTML = storyHtml(gen);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.mmWiAgain = function () {
    if (!state.book) return;
    renderBook();
  };

  // ---------- 第十一本「未写之书」：只写「如果没有 X」的小故事 ----------
  const ORACLE_RE = /如果没有[^。！？!?\n]{1,80}(会怎么样|会怎样|会如何|会发生什么)/;

  function oracleHtml() {
    return `
    <div class="wi-book wi-oracle-book">
      <button class="wi-back" onclick="mmOpenWhatIfRoom()">← 回暗门书架</button>
      <div class="wi-cover wi-oracle-cover">
        <div class="no">第十一本 · 未写之书</div>
        <h2>如果没有……会怎么样？</h2>
        <div class="yr">只写你问的那一个假如</div>
        <p>这本书没有正文。写下你的假设，暗门后的馆员会让它长成一篇短故事。它不会回答别的问题，也不会跑去写别的话题。</p>
      </div>
      <div class="wi-oracle-form">
        <label for="oracleQ">你的假设</label>
        <textarea id="oracleQ" maxlength="160" rows="3" placeholder="例如：如果没有电，会怎么样？"></textarea>
        <div class="wi-oracle-runbar">
          <button class="wi-run" id="oracleRun" onclick="mmOracleRun()">让它写 →</button>
          <span class="wi-note">只生成与「如果没有 X」直接相关的小故事；其它问题会被拒绝。</span>
        </div>
      </div>
      <div id="oracleStory"></div>
    </div>`;
  }

  window.mmOpenOracle = function () {
    const el = app();
    if (!el) return;
    el.innerHTML = oracleHtml();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const q = document.getElementById('oracleQ');
      if (q) {
        q.focus();
        q.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); window.mmOracleRun(); }
        });
      }
    }, 160);
  };

  window.mmOracleRun = async function () {
    const qEl = document.getElementById('oracleQ');
    const box = document.getElementById('oracleStory');
    const btn = document.getElementById('oracleRun');
    if (!qEl || !box || !btn) return;
    const q = qEl.value.trim();
    if (!q) {
      box.innerHTML = '<div class="wi-oracle-error">先把你想要问的「如果没有……」写下来。</div>';
      qEl.focus();
      return;
    }
    if (!ORACLE_RE.test(q)) {
      box.innerHTML = '<div class="wi-oracle-error">这本书只写「如果没有……会怎么样」的故事。把你的假设写完整再来。</div>';
      qEl.focus();
      return;
    }
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = '馆员正在写……';
    box.innerHTML = '<div class="wi-oracle-loading">暗门后的馆员正在把这一页写出来</div>';
    try {
      const r = await fetch('api/oracle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, reader_id: localStorage.getItem('mm_reader') || '' }),
      });
      let d = {};
      try { d = await r.json(); } catch (e) { d = {}; }
      if (!r.ok) throw new Error((d.error && d.error.message) || '暗门后的馆员暂时没回应。');
      const content = String(d.content || '').trim();
      if (!content) throw new Error('这一页还是空白，再问一次。');
      const paras = content.split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean);
      const modelLabel = /V3\.2/i.test(d.model || '') ? 'DeepSeek V3.2' : (d.model || '未写之书');
      box.innerHTML = `
      <div class="wi-story">
        <div class="ws-kicker">未写之书 · ${esc(modelLabel)}</div>
        <h3>${esc(q)}</h3>
        ${paras.map((p) => `<p>${esc(p)}</p>`).join('')}
        <div class="ws-quote">馆员批注：这本书只回答你问的那一个「如果没有」。它没有写别的，也不打算写。</div>
        <div class="ws-actions">
          <button onclick="mmOpenOracle()">再问一个假如</button>
          <button onclick="mmOpenWhatIfRoom()">回暗门书架</button>
        </div>
      </div>`;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      box.innerHTML = `<div class="wi-oracle-error">${esc(e.message || '暗门后的馆员暂时没回应，稍后再试。')}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  };
})();

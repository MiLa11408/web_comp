// web/star.js · 星图：36 本书的概念关系覆盖层（无外部依赖）
// 用法：import { showStarMap } from './star.js'; 或 window.mmShowStar()

const SVG_NS = 'http://www.w3.org/2000/svg';

const FLOORS = {
  L1: { name: '历史典藏', color: '#8a6d33', ratio: 0.22 },
  L2: { name: '技术工坊', color: '#3f6b8a', ratio: 0.45 },
  L3: { name: '产业观察', color: '#7a5a4a', ratio: 0.68 },
  L4: { name: '未编目地库', color: '#5a4a6a', ratio: 0.90 },
};
const FLOOR_ORDER = ['L1', 'L2', 'L3', 'L4'];

const CSS = `
.mm-star {
  position: fixed; inset: 0; z-index: 75; overflow: hidden;
  background: radial-gradient(ellipse 74% 62% at 50% 50%, #241c14 0%, #14100d 58%, #0b0806 100%);
  color: #e6d9bd; font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  animation: mm-star-in .28s ease-out;
}
@keyframes mm-star-in { from { opacity: 0; } to { opacity: 1; } }
.mm-star *, .mm-star *::before, .mm-star *::after { box-sizing: border-box; }

.mm-star-head {
  position: absolute; inset: 0 0 auto 0; z-index: 3;
  display: flex; align-items: center; gap: 16px; padding: 14px 22px 26px;
  background: linear-gradient(180deg, rgba(20,16,13,.96) 0%, rgba(20,16,13,.72) 55%, rgba(20,16,13,0) 100%);
  pointer-events: none;
}
.mm-star-head > * { pointer-events: auto; }
.mm-star-title { display: flex; align-items: baseline; gap: 10px; flex: 0 0 auto; color: #c8a24a; letter-spacing: 4px; }
.mm-star-title b { font-size: 18px; font-weight: 600; }
.mm-star-title small { font-size: 10px; letter-spacing: 3px; color: #8a7a5c; font-weight: 400; }
.mm-star-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; justify-content: center; align-items: center; flex: 1 1 auto; min-width: 0; }
.mm-star-legend-item { display: inline-flex; align-items: center; gap: 6px; color: #a9997a; font-size: 11.5px; letter-spacing: 1px; white-space: nowrap; }
.mm-star-legend-item i { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 8px rgba(200,162,74,.55); }
.mm-star-close {
  flex: 0 0 auto; background: #241c14; color: #c8a24a; border: 1px solid #c8a24a;
  padding: 8px 16px; font-size: 12.5px; letter-spacing: 2px; cursor: pointer; font-family: inherit;
}
.mm-star-close:hover { background: #2c241a; color: #e6c878; }
.mm-star-close:focus-visible { outline: 1px solid #e6c878; outline-offset: 2px; }

.mm-star-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.mm-star-ring { fill: none; stroke-width: 1; }
.mm-star-edge {
  stroke: #c8a24a; stroke-opacity: .28; stroke-linecap: round;
  transition: stroke-opacity .18s ease, stroke .18s ease;
}
.mm-star-edge.on { stroke: #e2c06a; stroke-opacity: .9; }
.mm-star-node { cursor: pointer; transition: opacity .18s ease; }
.mm-star-node:focus { outline: none; }
.mm-star-node .mm-star-dot { transition: r .18s ease; }
.mm-star-node:hover .mm-star-dot, .mm-star-node:focus-visible .mm-star-dot { r: 7.5; }
.mm-star-node .mm-star-halo { transition: stroke-opacity .18s ease, stroke-width .18s ease; }
.mm-star-node:hover .mm-star-halo, .mm-star-node:focus-visible .mm-star-halo { stroke-opacity: .95; stroke-width: 2; }
.mm-star-label {
  fill: #cbb892; font-size: 12px; letter-spacing: .5px; pointer-events: none;
  transition: opacity .18s ease, fill .18s ease;
}
.mm-star-svg.dim .mm-star-node { opacity: .26; }
.mm-star-svg.dim .mm-star-node.on { opacity: 1; }
.mm-star-svg.dim .mm-star-label { opacity: .22; }
.mm-star-svg.dim .mm-star-label.on { opacity: 1; fill: #f0e2bc; }
.mm-star-svg.dim .mm-star-edge { stroke-opacity: .06; }
.mm-star-svg.dim .mm-star-edge.on { stroke-opacity: .92; }
.mm-star-svg.compact .mm-star-label { display: none; }

.mm-star-status {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  padding: 90px 24px 0; text-align: center; pointer-events: none;
  color: #9a8a6f; font-size: 14px; letter-spacing: 4px;
}
.mm-star-status.error { color: #c88a6a; letter-spacing: 1px; font-size: 13px; }

.mm-star-tip {
  position: absolute; z-index: 5; width: max-content; max-width: 300px;
  background: rgba(29,23,18,.97); border: 1px solid #c8a24a;
  padding: 12px 14px 11px; box-shadow: 0 18px 46px rgba(0,0,0,.65);
  opacity: 0; transform: translateY(5px); transition: opacity .14s ease, transform .14s ease;
  pointer-events: none;
}
.mm-star-tip.show { opacity: 1; transform: translateY(0); }
.mm-star-tip h4 { margin: 0 0 3px; color: #c8a24a; font-size: 14px; font-weight: 600; letter-spacing: 1px; }
.mm-star-tip .mm-star-tip-meta { margin-bottom: 8px; color: #8a7a5c; font-size: 11px; letter-spacing: 1px; }
.mm-star-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.mm-star-tag { border: 1px solid #3a2f22; background: #241c14; color: #b09a72; font-size: 11px; padding: 2px 6px; }
.mm-star-rel-title {
  margin-bottom: 6px; padding-top: 8px; border-top: 1px dashed #3a2f22;
  color: #8a7a5c; font-size: 11px; letter-spacing: 2px;
}
.mm-star-rel { margin-bottom: 5px; color: #d8c89e; font-size: 12px; line-height: 1.55; }
.mm-star-rel b { color: #c8a24a; font-weight: 500; }
.mm-star-rel-empty { color: #7d6e55; font-size: 12px; }

@media (max-width: 640px) {
  .mm-star-head { padding: 10px 12px 20px; gap: 8px; flex-wrap: wrap; }
  .mm-star-title { letter-spacing: 2px; }
  .mm-star-title b { font-size: 15px; }
  .mm-star-title small { display: none; }
  .mm-star-legend { order: 3; flex: 1 0 100%; justify-content: flex-start; gap: 6px 12px; }
  .mm-star-legend-item { font-size: 10.5px; letter-spacing: .5px; }
  .mm-star-close { margin-left: auto; padding: 6px 12px; font-size: 12px; letter-spacing: 1px; }
  .mm-star-tip { max-width: 78vw; }
}
`;

function ensureStyle() {
  if (document.getElementById('mm-star-style')) return;
  const style = document.createElement('style');
  style.id = 'mm-star-style';
  style.textContent = CSS;
  document.head.appendChild(style);
}

async function loadGraph() {
  const sources = ['api/graph', 'content/graph.json', '../content/graph.json'];
  let lastError = null;
  for (const src of sources) {
    try {
      const res = await fetch(src, { cache: 'no-cache' });
      if (!res.ok) { lastError = new Error(`${src} ${res.status}`); continue; }
      const data = await res.json();
      if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) return data;
      lastError = new Error(`${src} 数据结构不正确`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('星图数据不可用');
}

function normalizeGraph(data) {
  const nodes = (data.nodes || [])
    .filter((n) => n && typeof n.id === 'string' && FLOORS[n.floor])
    .map((n) => ({
      id: n.id,
      title: String(n.title || n.id),
      floor: n.floor,
      tags: Array.isArray(n.tags) ? n.tags.map(String) : [],
    }));
  const known = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set();
  const edges = (data.edges || [])
    .filter((e) => e && known.has(e.source) && known.has(e.target) && e.source !== e.target)
    .map((e) => {
      const a = e.source;
      const b = e.target;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        source: a,
        target: b,
        weight: Number(e.weight) > 0 ? Number(e.weight) : 1,
        reason: String(e.reason || '概念相近，暂未写下来由。'),
        key,
      };
    })
    .filter(Boolean);
  return { nodes, edges };
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function idNum(id) {
  const m = String(id).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function shortTitle(title) {
  const text = String(title || '');
  return text.length > 10 ? `${text.slice(0, 9)}…` : text;
}

export function showStarMap() {
  ensureStyle();
  const existing = document.getElementById('mm-star-overlay');
  if (existing) {
    if (typeof existing.__mmClose === 'function') existing.focus({ preventScroll: true });
    return existing;
  }

  const prevOverflow = document.body.style.overflow;
  const prevFocus = document.activeElement;

  const overlay = document.createElement('div');
  overlay.id = 'mm-star-overlay';
  overlay.className = 'mm-star';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '星图');
  overlay.tabIndex = -1;

  const head = document.createElement('div');
  head.className = 'mm-star-head';

  const title = document.createElement('div');
  title.className = 'mm-star-title';
  const titleB = document.createElement('b');
  titleB.textContent = '星图';
  const titleSmall = document.createElement('small');
  titleSmall.textContent = 'THE CONSTELLATION';
  title.append(titleB, titleSmall);
  head.appendChild(title);

  const legend = document.createElement('div');
  legend.className = 'mm-star-legend';
  for (const floor of FLOOR_ORDER) {
    const item = document.createElement('span');
    item.className = 'mm-star-legend-item';
    const dot = document.createElement('i');
    dot.style.background = FLOORS[floor].color;
    const text = document.createElement('span');
    text.textContent = `${floor} ${FLOORS[floor].name}`;
    item.append(dot, text);
    legend.appendChild(item);
  }
  head.appendChild(legend);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'mm-star-close';
  closeBtn.textContent = '关闭 ×';
  closeBtn.setAttribute('aria-label', '关闭星图');
  head.appendChild(closeBtn);
  overlay.appendChild(head);

  const svg = svgEl('svg', { class: 'mm-star-svg', 'aria-label': '书籍关系星图' });
  overlay.appendChild(svg);

  const tip = document.createElement('div');
  tip.className = 'mm-star-tip';
  tip.setAttribute('aria-hidden', 'true');
  overlay.appendChild(tip);

  const status = document.createElement('div');
  status.className = 'mm-star-status';
  status.textContent = '正在展开星图……';
  overlay.appendChild(status);

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  closeBtn.focus({ preventScroll: true });

  let closed = false;
  let graph = null;
  let tipTimer = 0;

  function closeStar() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', scheduleResize);
    if (resizeTimer) clearTimeout(resizeTimer);
    if (tipTimer) clearTimeout(tipTimer);
    document.body.style.overflow = prevOverflow;
    overlay.remove();
    if (prevFocus && typeof prevFocus.focus === 'function') {
      try { prevFocus.focus({ preventScroll: true }); } catch (err) { /* 忽略 */ }
    }
  }

  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeStar();
    }
  }

  function onResize() {
    if (closed || !graph) return;
    hideTip();
    draw(graph);
  }

  let resizeTimer = 0;
  function scheduleResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { resizeTimer = 0; onResize(); }, 180);
  }

  closeBtn.addEventListener('click', closeStar);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', scheduleResize);
  overlay.__mmClose = closeStar;

  function hideTip() {
    if (tipTimer) { clearTimeout(tipTimer); tipTimer = 0; }
    tip.classList.remove('show');
    tip.setAttribute('aria-hidden', 'true');
  }

  function showTip(node, anchorEl, known, adjacency) {
    const floor = FLOORS[node.floor];
    tip.replaceChildren();

    const h4 = document.createElement('h4');
    h4.textContent = node.title;
    const meta = document.createElement('div');
    meta.className = 'mm-star-tip-meta';
    meta.textContent = `${node.floor} · ${floor.name}`;
    tip.append(h4, meta);

    if (node.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'mm-star-tags';
      for (const tag of node.tags) {
        const chip = document.createElement('span');
        chip.className = 'mm-star-tag';
        chip.textContent = tag;
        tags.appendChild(chip);
      }
      tip.appendChild(tags);
    }

    const relTitle = document.createElement('div');
    relTitle.className = 'mm-star-rel-title';
    relTitle.textContent = '关系';
    tip.appendChild(relTitle);

    const rels = (adjacency.get(node.id) || []).slice().sort((a, b) => b.weight - a.weight);
    if (!rels.length) {
      const empty = document.createElement('div');
      empty.className = 'mm-star-rel-empty';
      empty.textContent = '暂无连线，独立成星。';
      tip.appendChild(empty);
    } else {
      for (const rel of rels) {
        const other = known.get(rel.other);
        const line = document.createElement('div');
        line.className = 'mm-star-rel';
        const name = document.createElement('b');
        name.textContent = `《${other ? other.title : rel.other}》`;
        line.append(name, document.createTextNode(` — ${rel.reason}`));
        tip.appendChild(line);
      }
    }

    tip.classList.remove('show');
    tip.setAttribute('aria-hidden', 'false');
    const host = overlay.getBoundingClientRect();
    const anchor = anchorEl.getBoundingClientRect();
    const ax = anchor.left - host.left + anchor.width / 2;
    const ay = anchor.top - host.top + anchor.height / 2;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = ax + 18;
    if (left + tw > host.width - 12) left = ax - tw - 18;
    left = Math.max(12, Math.min(left, host.width - tw - 12));
    let top = ay - th / 2;
    top = Math.max(72, Math.min(top, host.height - th - 12));
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;

    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = window.setTimeout(() => tip.classList.add('show'), 30);
  }

  function openNode(id) {
    try {
      if (typeof window.openBookFirst === 'function') window.openBookFirst(id);
      else console.warn('[star] 未找到全局 openBookFirst，无法取书。');
    } catch (err) {
      console.error('[star] openBookFirst 调用失败', err);
    } finally {
      closeStar();
    }
  }

  function draw(current) {
    const W = Math.max(320, window.innerWidth);
    const H = Math.max(360, window.innerHeight);
    const compact = Math.min(W, H) < 620;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    svg.classList.remove('dim');
    svg.classList.toggle('compact', compact);
    hideTip();

    const cx = W / 2;
    const cy = H / 2 + (compact ? 14 : 8);
    const R = Math.max(96, Math.min(W, H) / 2 - (compact ? 34 : 72));
    const known = new Map(current.nodes.map((n) => [n.id, n]));

    const adjacency = new Map();
    for (const edge of current.edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
      adjacency.get(edge.source).push({ other: edge.target, weight: edge.weight, reason: edge.reason });
      adjacency.get(edge.target).push({ other: edge.source, weight: edge.weight, reason: edge.reason });
    }

    const degree = new Map();
    for (const edge of current.edges) {
      degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
    }

    const ringLayer = svgEl('g', { class: 'mm-star-rings' });
    const edgeLayer = svgEl('g', { class: 'mm-star-edges' });
    const nodeLayer = svgEl('g', { class: 'mm-star-nodes' });
    const labelLayer = svgEl('g', { class: 'mm-star-labels' });
    svg.append(ringLayer, edgeLayer, nodeLayer, labelLayer);

    for (const floor of FLOOR_ORDER) {
      const ring = svgEl('circle', {
        cx, cy, r: R * FLOORS[floor].ratio, class: 'mm-star-ring',
        stroke: FLOORS[floor].color, 'stroke-opacity': 0.16,
      });
      ringLayer.appendChild(ring);
    }

    const byFloor = {};
    for (const node of current.nodes) {
      if (!byFloor[node.floor]) byFloor[node.floor] = [];
      byFloor[node.floor].push(node);
    }
    const positions = new Map();
    FLOOR_ORDER.forEach((floor, floorIndex) => {
      const list = (byFloor[floor] || []).slice().sort((a, b) => idNum(a.id) - idNum(b.id));
      const offset = floorIndex * 0.09;
      list.forEach((node, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / list.length + offset;
        const radius = R * FLOORS[floor].ratio;
        positions.set(node.id, {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          angle,
          node,
          radius,
        });
      });
    });

    const edgeEls = new Map();
    const edgeByNode = new Map();
    for (const edge of current.edges) {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) continue;
      const line = svgEl('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 'mm-star-edge', 'stroke-width': 0.7 + Math.min(3, edge.weight) * 0.35,
        'data-edge': edge.key,
      });
      edgeLayer.appendChild(line);
      edgeEls.set(edge.key, line);
      for (const id of [edge.source, edge.target]) {
        if (!edgeByNode.has(id)) edgeByNode.set(id, []);
        edgeByNode.get(id).push(line);
      }
    }

    const nodeEls = new Map();
    const labelEls = new Map();

    function setHighlight(id) {
      svg.classList.add('dim');
      svg.querySelectorAll('.mm-star-node.on, .mm-star-label.on, .mm-star-edge.on')
        .forEach((el) => el.classList.remove('on'));
      if (!id) return;
      const own = nodeEls.get(id);
      if (own) own.classList.add('on');
      const ownLabel = labelEls.get(id);
      if (ownLabel) ownLabel.classList.add('on');
      for (const rel of adjacency.get(id) || []) {
        const relNode = nodeEls.get(rel.other);
        if (relNode) relNode.classList.add('on');
        const relLabel = labelEls.get(rel.other);
        if (relLabel) relLabel.classList.add('on');
      }
      for (const line of edgeByNode.get(id) || []) line.classList.add('on');
    }

    function clearHighlight() {
      svg.classList.remove('dim');
      svg.querySelectorAll('.mm-star-node.on, .mm-star-label.on, .mm-star-edge.on')
        .forEach((el) => el.classList.remove('on'));
    }

    for (const node of current.nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      const color = FLOORS[node.floor].color;
      const deg = degree.get(node.id) || 0;
      const dotR = compact ? 3.4 + Math.min(3, deg) * 0.6 : 4 + Math.min(3, deg) * 0.8;

      const group = svgEl('g', {
        class: 'mm-star-node', 'data-id': node.id,
        transform: `translate(${pos.x} ${pos.y})`,
        tabindex: '0', role: 'button',
        'aria-label': `${node.title}，${node.floor} ${FLOORS[node.floor].name}`,
      });
      const halo = svgEl('circle', {
        class: 'mm-star-halo', cx: 0, cy: 0, r: dotR + 3,
        fill: 'none', stroke: color, 'stroke-opacity': 0.35, 'stroke-width': 1,
      });
      const dot = svgEl('circle', {
        class: 'mm-star-dot', cx: 0, cy: 0, r: dotR, fill: color,
      });
      const core = svgEl('circle', {
        cx: 0, cy: 0, r: Math.max(1.1, dotR * 0.32), fill: '#f0e2bc', 'fill-opacity': 0.78,
      });
      const hit = svgEl('circle', {
        cx: 0, cy: 0, r: Math.max(11, dotR + 5), fill: 'transparent',
      });
      group.append(halo, dot, core, hit);

      group.addEventListener('mouseenter', () => {
        setHighlight(node.id);
        showTip(node, dot, known, adjacency);
      });
      group.addEventListener('mouseleave', () => {
        clearHighlight();
        hideTip();
      });
      group.addEventListener('focus', () => {
        setHighlight(node.id);
        showTip(node, dot, known, adjacency);
      });
      group.addEventListener('blur', () => {
        clearHighlight();
        hideTip();
      });
      group.addEventListener('click', () => openNode(node.id));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openNode(node.id);
        }
      });

      nodeLayer.appendChild(group);
      nodeEls.set(node.id, group);

      const direction = node.floor === 'L4' ? pos.angle + Math.PI : pos.angle;
      const cos = Math.cos(direction);
      const sin = Math.sin(direction);
      const anchorX = pos.x + cos * (dotR + 7);
      const anchorY = pos.y + sin * (dotR + 7);
      let textAnchor = 'middle';
      if (cos > 0.35) textAnchor = 'start';
      else if (cos < -0.35) textAnchor = 'end';
      let baseline = 'middle';
      if (Math.abs(cos) <= 0.35) baseline = sin < 0 ? 'auto' : 'hanging';

      const label = svgEl('text', {
        class: 'mm-star-label', 'data-id': node.id,
        x: anchorX, y: anchorY, 'text-anchor': textAnchor,
        'dominant-baseline': baseline,
      });
      label.textContent = shortTitle(node.title);
      labelLayer.appendChild(label);
      labelEls.set(node.id, label);
    }
  }

  loadGraph()
    .then((data) => {
      if (closed) return;
      graph = normalizeGraph(data);
      if (!graph.nodes.length) throw new Error('星图没有可用节点');
      status.remove();
      draw(graph);
    })
    .catch((err) => {
      if (closed) return;
      status.classList.add('error');
      status.textContent = `星图暂不可用：${err && err.message ? err.message : '数据读取失败'}`;
      console.error('[star] 星图数据读取失败', err);
    });

  return overlay;
}

window.mmShowStar = showStarMap;

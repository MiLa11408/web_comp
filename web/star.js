// star.js · 立体星图（three.js）：群星环绕、四层星轨、弧光关系线、悬停/定位
import * as THREE from './vendor/three.module.js';

const FLOORS = [
  { id: 'L1', name: '历史典藏', color: 0xc8a24a, radius: 6.2 },
  { id: 'L2', name: '技术工坊', color: 0x7fb6d6, radius: 8.2 },
  { id: 'L3', name: '产业观察', color: 0x9ec27a, radius: 10.2 },
  { id: 'L4', name: '未编目地库', color: 0xc49ae0, radius: 12.2 },
];

const FONT = '"Songti SC", "STSong", "SimSun", serif';
const INITIAL_YAW = 0.42;
const INITIAL_PITCH = 0.06;
const INITIAL_FOV = 65;

const CSS = `
.mm-star3d { position: fixed; inset: 0; z-index: 75; background: radial-gradient(1200px 780px at 50% 44%, #17110c, #0c0906 58%, #070503 100%); overflow: hidden; font-family: ${FONT}; }
.mm-star3d::after { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; box-shadow: inset 0 0 180px 52px rgba(0,0,0,.72); }
.mm-star3d-head { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 18px; padding: 14px 20px; z-index: 3; background: linear-gradient(180deg, rgba(9,7,4,.95) 0%, rgba(9,7,4,.6) 62%, rgba(9,7,4,0)); }
.mm-star3d-title { color: #eadbb8; font-size: 17px; letter-spacing: 5px; white-space: nowrap; text-shadow: 0 0 18px rgba(200,162,74,.28); }
.mm-star3d-title small { color: #8a7a5c; font-size: 11px; letter-spacing: 1px; margin-left: 10px; }
.mm-star3d-legend { display: flex; gap: 14px; margin-left: auto; color: #a8977a; font-size: 11px; flex-wrap: wrap; }
.mm-star3d-legend span { white-space: nowrap; }
.mm-star3d-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: middle; box-shadow: 0 0 6px currentColor; }
.mm-star3d-tools { display: flex; align-items: center; gap: 8px; }
.mm-star3d-find { width: 152px; background: #140f0b; border: 1px solid #46371f; color: #d8c8a8; padding: 5px 8px; font-family: inherit; font-size: 12px; letter-spacing: 1px; outline: none; transition: border-color .2s, box-shadow .2s; }
.mm-star3d-find::placeholder { color: #6f6048; }
.mm-star3d-find:focus { border-color: #c8a24a; box-shadow: 0 0 0 1px rgba(200,162,74,.25); }
.mm-star3d-find.miss { border-color: #9c4c32; box-shadow: 0 0 0 1px rgba(156,76,50,.3); }
.mm-star3d-btn, .mm-star3d-close { background: #241c14; color: #c8a24a; border: 1px solid #8a6320; height: 30px; cursor: pointer; font-family: inherit; font-size: 12px; letter-spacing: 1px; transition: background .18s, color .18s; }
.mm-star3d-btn { padding: 0 12px; white-space: nowrap; }
.mm-star3d-btn:hover, .mm-star3d-close:hover { background: #332714; color: #e2c17c; }
.mm-star3d-close { width: 30px; padding: 0; font-size: 15px; line-height: 1; }
.mm-star3d-canvas { position: absolute; inset: 0; z-index: 0; }
.mm-star3d-canvas canvas { display: block; }
.mm-star3d-hint { position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); color: #8b7a5c; font-size: 11px; letter-spacing: 2px; z-index: 3; text-align: center; width: 92%; pointer-events: none; text-shadow: 0 1px 8px rgba(0,0,0,.8); }
.mm-star-tip { position: fixed; z-index: 80; max-width: 300px; background: #1d1712; border: 1px solid #8a6320; padding: 10px 12px; color: #cbb892; font-size: 12px; line-height: 1.65; pointer-events: none; display: none; box-shadow: 0 10px 30px rgba(0,0,0,.6); font-family: ${FONT}; }
.mm-star-tip b { color: #c8a24a; display: block; margin-bottom: 4px; letter-spacing: 1px; }
.mm-star-tip em { font-style: normal; color: #7d6e55; display: block; margin-top: 4px; }
/* 关系列表：给低配 / 键盘 / 读屏用户一张可读的「星图文字版」 */
.mm-star3d-list { position: absolute; top: 62px; right: 20px; bottom: 64px; width: min(430px, 92vw); z-index: 4; display: none;
  background: rgba(22,16,11,.96); border: 1px solid #8a6320; box-shadow: 0 18px 60px rgba(0,0,0,.6); overflow-y: auto; padding: 12px 15px 18px; }
.mm-star3d-list.show { display: block; }
.mm-star3d-list h4 { margin: 2px 0 4px; color: #c8a24a; font-size: 13px; letter-spacing: 3px; font-weight: 500; }
.mm-star3d-list .mm-star-list-sub { color: #7d6e55; font-size: 11px; line-height: 1.7; margin-bottom: 10px; }
.mm-star-edge { border-top: 1px dashed #3a2f22; padding: 9px 0; }
.mm-star-edge-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.mm-star-edge-top button { background: none; border: 1px solid #5a4526; color: #cbb892; padding: 4px 8px; font-family: inherit; font-size: 12px; cursor: pointer; text-align: left; }
.mm-star-edge-top button:hover { border-color: #c8a24a; color: #eadbb8; }
.mm-star-edge-top span { color: #8a7a5c; font-size: 11px; }
.mm-star-edge p { margin: 6px 0 0; color: #8a7a5c; font-size: 11.5px; line-height: 1.7; }
.mm-star3d-listbtn.on { background: #3a2b16; color: #e2c17c; }
@media (max-width: 820px) { .mm-star3d-legend { display: none; } }
@media (max-width: 620px) {
  .mm-star3d-head { gap: 8px; padding: 10px 12px; }
  .mm-star3d-title { font-size: 14px; letter-spacing: 2px; }
  .mm-star3d-title small { display: none; }
  .mm-star3d-find { width: 104px; font-size: 11px; }
  .mm-star3d-btn { padding: 0 8px; font-size: 11px; }
  .mm-star3d-hint { font-size: 10px; letter-spacing: 0; bottom: 10px; }
}
`;

function injectCss() {
  if (document.getElementById('mm-star3d-style')) return;
  const s = document.createElement('style');
  s.id = 'mm-star3d-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

async function loadGraph() {
  for (const url of ['api/graph', 'content/graph.json']) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const d = await r.json();
      if (d && Array.isArray(d.nodes) && Array.isArray(d.edges)) return d;
    } catch (e) { /* 尝试下一个来源 */ }
  }
  return null;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function makeDotTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,.94)');
  g.addColorStop(0.5, 'rgba(255,255,255,.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture() {
  const size = 96;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,.85)');
  g.addColorStop(0.22, 'rgba(255,255,255,.45)');
  g.addColorStop(0.55, 'rgba(255,255,255,.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeNebulaTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,.40)');
  g.addColorStop(0.34, 'rgba(255,255,255,.16)');
  g.addColorStop(0.7, 'rgba(255,255,255,.045)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLabelSprite(title, colorHex) {
  const fontPx = 30;
  const h = 72;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `${fontPx}px ${FONT}`;
  const textW = Math.ceil(probe.measureText(title).width);
  const w = Math.min(512, Math.max(148, textW + 46));

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  // 低调的深色衬底，减少星点对文字的干扰
  const r = 10;
  ctx.beginPath();
  ctx.moveTo(r, 1);
  ctx.lineTo(w - r, 1);
  ctx.quadraticCurveTo(w - 1, 1, w - 1, r);
  ctx.lineTo(w - 1, h - r);
  ctx.quadraticCurveTo(w - 1, h - 1, w - r, h - 1);
  ctx.lineTo(r, h - 1);
  ctx.quadraticCurveTo(1, h - 1, 1, h - r);
  ctx.lineTo(1, r);
  ctx.quadraticCurveTo(1, 1, r, 1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(11,8,5,.52)';
  ctx.fill();

  ctx.strokeStyle = colorHex;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, h - 9);
  ctx.lineTo(w - 16, h - 9);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.9)';
  ctx.shadowBlur = 7;
  ctx.fillStyle = 'rgba(240,229,205,.96)';

  let size = fontPx;
  if (textW > w - 46) {
    size = Math.max(18, Math.floor(fontPx * (w - 46) / textW));
    ctx.font = `${size}px ${FONT}`;
  } else {
    ctx.font = `${fontPx}px ${FONT}`;
  }
  ctx.fillText(title, w / 2, h / 2 - 3);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true, opacity: 0 });
  const sp = new THREE.Sprite(mat);
  const labelH = 0.55;
  sp.scale.set(labelH * w / h, labelH, 1);
  sp.visible = false;
  sp.renderOrder = 6;
  return sp;
}

export async function showStarMap() {
  if (document.getElementById('mm-star-overlay')) return;
  const data = await loadGraph();
  if (!data) return;
  injectCss();

  const colors = FLOORS.map((f) => '#' + f.color.toString(16).padStart(6, '0'));
  const overlay = document.createElement('div');
  overlay.id = 'mm-star-overlay';
  overlay.className = 'mm-star3d';
  overlay.innerHTML = `
    <div class="mm-star3d-head">
      <div class="mm-star3d-title">星图 · 群星环绕<small>${data.nodes.length} 本书 · 悬停点亮关系 · 点星开书</small></div>
      <div class="mm-star3d-legend">${FLOORS.map((f, i) => `<span><i style="background:${colors[i]};color:${colors[i]}"></i>${f.name}</span>`).join('')}</div>
      <div class="mm-star3d-tools">
        <input class="mm-star3d-find" type="text" placeholder="按书名定位" aria-label="按书名定位" autocomplete="off" list="mm-star3d-books">
        <datalist id="mm-star3d-books">${data.nodes.map((n) => `<option value="${esc(n.title)}"></option>`).join('')}</datalist>
        <button class="mm-star3d-btn mm-star3d-reset" type="button">重置视线</button>
        <button class="mm-star3d-btn mm-star3d-listbtn" type="button" title="星图文字版关系列表（快捷键 L）">关系列表</button>
        <button class="mm-star3d-close" type="button" aria-label="关闭星图">×</button>
      </div>
    </div>
    <div class="mm-star3d-canvas"></div>
    <div class="mm-star3d-list" aria-hidden="true">
      <h4>关系列表</h4>
      <div class="mm-star-list-sub">${data.nodes.length} 本书 · ${data.edges.length} 条关系。点书名直接开书；这张表不依赖 WebGL。</div>
      ${data.edges.map((e) => {
        const a = data.nodes.find((n) => n.id === e.source);
        const b = data.nodes.find((n) => n.id === e.target);
        if (!a || !b) return '';
        return `<div class="mm-star-edge"><div class="mm-star-edge-top">
          <button type="button" data-book="${esc(a.id)}">${esc(a.title)}</button><span>⇄</span>
          <button type="button" data-book="${esc(b.id)}">${esc(b.title)}</button>
        </div><p>${esc(e.reason || '共享主题')}</p></div>`;
      }).join('')}
    </div>
    <div class="mm-star3d-hint">拖拽环顾 · 滚轮远近 · 悬停看关系 · 点击开书 · L 关系列表 · Esc 关闭</div>`;
  document.body.appendChild(overlay);
  if (window.mmAudioStarStart) window.mmAudioStarStart();
  window.__mmStarNodes = data.nodes.length;

  const tip = document.createElement('div');
  tip.className = 'mm-star-tip';
  document.body.appendChild(tip);

  const container = overlay.querySelector('.mm-star3d-canvas');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0906);
  scene.fog = new THREE.FogExp2(0x0c0906, 0.0055);

  const camera = new THREE.PerspectiveCamera(INITIAL_FOV, container.clientWidth / container.clientHeight, 0.1, 140);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  let yaw = INITIAL_YAW;
  let pitch = INITIAL_PITCH;

  const group = new THREE.Group();
  group.rotation.order = 'XYZ';
  group.rotation.set(pitch, yaw, 0);
  scene.add(group);

  scene.add(new THREE.AmbientLight(0xfff2d8, 1.0));
  const coreLight = new THREE.PointLight(0xffd98a, 2.4, 42, 1.6);
  scene.add(coreLight);

  const dotTex = makeDotTexture();
  const glowTex = makeGlowTexture();
  const nebulaTex = makeNebulaTexture();

  // 背景星野：三层冷暖白 + 银河带 + 星云
  const starLayers = [
    { count: 1600, rMin: 25, rMax: 38, size: 0.34, color: 0xd5e4ff, opacity: 0.72 },
    { count: 2200, rMin: 37, rMax: 55, size: 0.55, color: 0xf3ecdd, opacity: 0.55 },
    { count: 1600, rMin: 54, rMax: 70, size: 0.85, color: 0xffe3bd, opacity: 0.4 },
  ];
  starLayers.forEach((def) => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(def.count * 3);
    for (let i = 0; i < def.count; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const r = def.rMin + Math.random() * (def.rMax - def.rMin);
      arr[i * 3] = Math.cos(th) * s * r;
      arr[i * 3 + 1] = u * r;
      arr[i * 3 + 2] = Math.sin(th) * s * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({
      map: dotTex, color: def.color, size: def.size, sizeAttenuation: true,
      transparent: true, opacity: def.opacity, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    group.add(pts);
  });

  // 银河带：沿大圆聚集的密集星点
  {
    const count = 1300;
    const n = new THREE.Vector3(0.86, 0.18, 0.48).normalize();
    const u = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    const v = n.clone().cross(u).normalize();
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const th = Math.random() * Math.PI * 2;
      const off = (Math.random() + Math.random() + Math.random() - 1.5) * 0.09;
      const dir = new THREE.Vector3()
        .addScaledVector(u, Math.cos(th))
        .addScaledVector(v, Math.sin(th))
        .addScaledVector(n, off)
        .normalize();
      const r = 36 + Math.random() * 27;
      arr[i * 3] = dir.x * r;
      arr[i * 3 + 1] = dir.y * r;
      arr[i * 3 + 2] = dir.z * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({
      map: dotTex, color: 0xdfceb0, size: 0.5, sizeAttenuation: true,
      transparent: true, opacity: 0.55, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const band = new THREE.Points(geo, mat);
    band.frustumCulled = false;
    group.add(band);
  }

  // 低透明度星云：紫 / 琥珀
  const nebulas = [
    { dir: [0.15, 0.2, -0.97], color: 0x8d6fb8, scale: 36, opacity: 0.14 },
    { dir: [0.55, -0.5, -0.68], color: 0xc8a24a, scale: 32, opacity: 0.10 },
    { dir: [-0.75, 0.4, -0.4], color: 0x7b62a8, scale: 30, opacity: 0.09 },
    { dir: [-0.2, 0.75, 0.6], color: 0xc99a55, scale: 34, opacity: 0.08 },
  ];
  nebulas.forEach((nb) => {
    const mat = new THREE.SpriteMaterial({
      map: nebulaTex, color: nb.color, transparent: true, opacity: nb.opacity,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const sp = new THREE.Sprite(mat);
    const dir = new THREE.Vector3(nb.dir[0], nb.dir[1], nb.dir[2]).normalize();
    sp.position.copy(dir.multiplyScalar(58));
    sp.scale.set(nb.scale, nb.scale, 1);
    sp.renderOrder = 1;
    group.add(sp);
  });

  // 布局：每层一个球壳，Fibonacci 均匀撒点
  const byFloor = {};
  data.nodes.forEach((n) => { (byFloor[n.floor] || (byFloor[n.floor] = [])) .push(n); });
  const pos = new Map();
  FLOORS.forEach((f, fi) => {
    const list = byFloor[f.id] || [];
    list.forEach((n, i) => {
      const t = (i + 0.5) / Math.max(1, list.length);
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + fi * 0.7);
      const y = Math.cos(phi) * f.radius * 0.72;
      const r = Math.sqrt(Math.max(0, f.radius * f.radius - y * y));
      pos.set(n.id, new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
    });
  });

  const nodeGeo = new THREE.SphereGeometry(1, 16, 16);
  const nodeItems = [];
  const itemsById = new Map();
  data.nodes.forEach((n) => {
    const fi = FLOORS.findIndex((f) => f.id === n.floor);
    const floor = FLOORS[fi] || FLOORS[0];
    const fIndex = Math.max(0, fi);
    const coreScale = 0.11 + fIndex * 0.014;
    const p = pos.get(n.id);

    const mat = new THREE.MeshStandardMaterial({
      color: floor.color, emissive: floor.color, emissiveIntensity: 0.9,
      roughness: 0.32, metalness: 0.18,
    });
    const core = new THREE.Mesh(nodeGeo, mat);
    core.position.copy(p);
    core.scale.setScalar(coreScale);
    group.add(core);

    const glowMat = new THREE.SpriteMaterial({
      map: glowTex, color: floor.color, transparent: true, opacity: 0.44,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const glow = new THREE.Sprite(glowMat);
    const glowScale = 0.54 + fIndex * 0.15;
    glow.position.copy(p);
    glow.scale.set(glowScale, glowScale, 1);
    glow.renderOrder = 3;
    group.add(glow);

    const label = makeLabelSprite(n.title, colors[fIndex]);
    scene.add(label);

    const item = {
      node: n, pos: p, core, glow, label,
      coreScale, glowScale, glowOpacity: 0.44,
      world: new THREE.Vector3(), dir: new THREE.Vector3(), dist: 0,
      amp: 0, labelAlpha: 0,
    };
    core.userData.item = item;
    glow.userData.item = item;
    nodeItems.push(item);
    itemsById.set(n.id, item);
  });

  const adjacency = new Map();
  data.edges.forEach((e) => {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    if (!adjacency.has(e.target)) adjacency.set(e.target, []);
    adjacency.get(e.source).push(e.target);
    adjacency.get(e.target).push(e.source);
  });

  const labelOf = new Map(data.nodes.map((n) => [n.id, n.title]));

  // 关系线：二次贝塞尔弧线 + 加色混合 + 两端淡出
  const edgeItems = [];
  const radialSegments = 5;
  const EDGE_R = 13.6; // 关系线落在所有星壳之外的“天球”上，屏幕上仍与节点对齐
  data.edges.forEach((e) => {
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) return;
    const da = a.clone().normalize().multiplyScalar(EDGE_R);
    const db = b.clone().normalize().multiplyScalar(EDGE_R);
    const angle = Math.acos(Math.max(-1, Math.min(1, a.clone().normalize().dot(b.clone().normalize()))));
    // 控制点向天球外侧 + 侧向偏出：屏幕上是弯弧，而不是穿过视线的直线
    let midDir = new THREE.Vector3().addVectors(da, db);
    if (midDir.lengthSq() < 1e-6) {
      midDir = new THREE.Vector3(0, 1, 0).cross(da);
      if (midDir.lengthSq() < 1e-6) midDir = new THREE.Vector3(1, 0, 0).cross(da);
    }
    midDir.normalize();
    let side = new THREE.Vector3().crossVectors(da, db);
    if (side.lengthSq() < 1e-6) side = new THREE.Vector3(0, 1, 0).cross(da);
    if (side.lengthSq() < 1e-6) side = new THREE.Vector3(1, 0, 0).cross(da);
    side.normalize();
    const ctrl = midDir.multiplyScalar(EDGE_R * 1.28)
      .add(side.multiplyScalar(EDGE_R * 0.42));
    const curve = new THREE.QuadraticBezierCurve3(da, ctrl, db);
    const tubularSegments = angle > 1.8 ? 46 : 34;
    const radius = angle > 1.2 ? 0.03 : 0.038;
    const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
    const base = new THREE.Color(0x9a7a3a);
    const colorArr = new Float32Array(geo.attributes.position.count * 3);
    const perSeg = radialSegments + 1;
    for (let vi = 0; vi < geo.attributes.position.count; vi++) {
      const t = Math.floor(vi / perSeg) / tubularSegments;
      let f = Math.min(1, t * 7, (1 - t) * 7);
      f = f * f * (3 - 2 * f);
      const k = 0.06 + 0.94 * f;
      colorArr[vi * 3] = base.r * k;
      colorArr[vi * 3 + 1] = base.g * k;
      colorArr[vi * 3 + 2] = base.b * k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    group.add(mesh);
    edgeItems.push({ source: e.source, target: e.target, curve, material: mat, lit: false, fadeTarget: 0 });
  });

  // 关系线默认全部收起，只留星星；悬停或定位到某颗星时，才点亮它自己的关系线。
  // 50 条弧线同时挂在半径 13.6 的天球上会互相缠绕，看起来像一团乱线。
  // 这里只改目标透明度，真正的淡入淡出交给 updateEdges 每帧推进。
  const applyEdgeFocus = (item) => {
    const id = item ? item.node.id : '';
    edgeItems.forEach((ed) => {
      const lit = !!id && (ed.source === id || ed.target === id);
      ed.lit = lit;
      ed.fadeTarget = lit ? 0.9 : 0;
      ed.material.color.set(lit ? 0xffe2ae : 0xffffff);
    });
  };
  // 拖动视角时保留上一条链，不会一按下去线就消失；松开后指针移到别处再淡出
  function updateEdges(dt) {
    const k = 1 - Math.exp(-7 * dt);
    for (const ed of edgeItems) {
      const cur = ed.material.opacity;
      if (Math.abs(ed.fadeTarget - cur) < 0.002) {
        if (cur !== ed.fadeTarget) ed.material.opacity = ed.fadeTarget;
        continue;
      }
      ed.material.opacity += (ed.fadeTarget - cur) * k;
    }
  }

  // 每条边一颗沿曲线缓慢移动的流星
  const meteorPos = new Float32Array(edgeItems.length * 3);
  const meteorCol = new Float32Array(edgeItems.length * 3);
  const meteorGeo = new THREE.BufferGeometry();
  meteorGeo.setAttribute('position', new THREE.BufferAttribute(meteorPos, 3).setUsage(THREE.DynamicDrawUsage));
  meteorGeo.setAttribute('color', new THREE.BufferAttribute(meteorCol, 3).setUsage(THREE.DynamicDrawUsage));
  const meteorMat = new THREE.PointsMaterial({
    map: dotTex, size: 0.16, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.95, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const meteors = new THREE.Points(meteorGeo, meteorMat);
  meteors.frustumCulled = false;
  meteors.renderOrder = 4;
  group.add(meteors);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickTargets = nodeItems.flatMap((it) => [it.core, it.glow]);
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let hoveredItem = null;
  let anim = 0;
  let running = false;
  let lastNow = 0;
  let lookAnim = null;
  let focusItem = null;
  let focusUntil = 0;
  let missTimer = 0;
  let compact = container.clientWidth < 620;

  const FRONT_COS = Math.cos(46 * Math.PI / 180);
  const NEAR_DIST = 8.8;
  const SEP_COS = Math.cos(10 * Math.PI / 180);

  const pick = (clientX, clientY) => {
    const rect = container.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickTargets, false);
    for (const hit of hits) {
      const item = hit.object.userData.item;
      if (item) return item;
    }
    return null;
  };

  const setHover = (item) => {
    if (hoveredItem === item) return;
    hoveredItem = item;
    applyEdgeFocus(item || focusItem);
    renderer.domElement.style.cursor = item ? 'pointer' : (dragging ? 'grabbing' : 'grab');
  };

  const showTip = (e, item) => {
    const n = item.node;
    const near = (adjacency.get(n.id) || []).slice(0, 4).map((id) => labelOf.get(id) || id);
    tip.innerHTML = `<b>${esc(n.title)}</b>${(n.tags || []).slice(0, 4).join(' · ')}<em>${near.length ? '相连：' + esc(near.join('、')) : '暂无连线'}</em>`;
    tip.style.display = 'block';
    tip.style.left = Math.min(window.innerWidth - 310, e.clientX + 16) + 'px';
    tip.style.top = Math.min(window.innerHeight - 120, e.clientY + 16) + 'px';
  };

  const onPointerDown = (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    lookAnim = null;
    focusItem = null;
    focusUntil = 0;
    // 不在这里熄灭关系线：拖动视角时线留在原处，松手后指针移开再淡出
    renderer.domElement.setPointerCapture?.(e.pointerId);
    renderer.domElement.style.cursor = 'grabbing';
    tip.style.display = 'none';
  };

  const onPointerMove = (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      yaw += dx * 0.0062;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.0042));
      lastX = e.clientX;
      lastY = e.clientY;
      tip.style.display = 'none';
      return;
    }
    if (e.target !== renderer.domElement) {
      setHover(null);
      tip.style.display = 'none';
      return;
    }
    const item = pick(e.clientX, e.clientY);
    setHover(item);
    if (item) showTip(e, item);
    else tip.style.display = 'none';
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    renderer.domElement.style.cursor = hoveredItem ? 'pointer' : 'grab';
    if (moved < 6) {
      const item = pick(e.clientX, e.clientY);
      if (item && typeof window.openBookFirst === 'function') {
        const id = item.node.id;
        close();
        window.openBookFirst(id);
      }
    }
  };

  const onPointerCancel = () => {
    dragging = false;
    renderer.domElement.style.cursor = 'grab';
  };

  const onWheel = (e) => {
    e.preventDefault();
    camera.fov = Math.max(35, Math.min(95, camera.fov + e.deltaY * 0.03));
    camera.updateProjectionMatrix();
  };

  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    compact = w < 620;
  };

  const listEl = overlay.querySelector('.mm-star3d-list');
  const listBtn = overlay.querySelector('.mm-star3d-listbtn');
  const toggleList = () => {
    const on = listEl.classList.toggle('show');
    listBtn.classList.toggle('on', on);
    listEl.setAttribute('aria-hidden', String(!on));
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      if (listEl.classList.contains('show')) toggleList();
      else close();
      return;
    }
    const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
    if (!typing && (e.key === 'l' || e.key === 'L')) toggleList();
  };

  const onVisibility = () => {
    if (document.hidden) stopLoop();
    else startLoop();
  };

  const resetView = () => {
    lookAnim = null;
    focusItem = null;
    focusUntil = 0;
    applyEdgeFocus(hoveredItem);
    yaw = INITIAL_YAW;
    pitch = INITIAL_PITCH;
    camera.fov = INITIAL_FOV;
    camera.updateProjectionMatrix();
  };

  const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  const focusStar = (target) => {
    const p = pos.get(target.id);
    if (!p) return;
    const yawTo = Math.atan2(p.x, -p.z);
    const r = Math.hypot(p.x, p.z);
    const pitchTo = Math.max(-1.25, Math.min(1.25, Math.atan2(-p.y, r)));
    lookAnim = {
      fromYaw: yaw,
      fromPitch: pitch,
      toYaw: yaw + wrapAngle(yawTo - yaw),
      toPitch: pitchTo,
      start: performance.now(),
      dur: 950,
    };
    focusItem = itemsById.get(target.id) || null;
    focusUntil = performance.now() + 950 + 1200;
    applyEdgeFocus(focusItem);
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerCancel);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.mm-star3d-close').addEventListener('click', close);
  overlay.querySelector('.mm-star3d-reset').addEventListener('click', resetView);
  listBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleList(); });
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-book]');
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.book;
    close();
    setTimeout(() => {
      if (typeof window.openBookFirst === 'function') window.openBookFirst(id);
    }, 80);
  });

  const findInput = overlay.querySelector('.mm-star3d-find');
  findInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = findInput.value.trim();
    if (!q) return;
    const target = data.nodes.find((n) => n.title === q)
      || data.nodes.find((n) => n.title.includes(q))
      || data.nodes.find((n) => n.id === q);
    if (!target) {
      findInput.classList.add('miss');
      clearTimeout(missTimer);
      missTimer = setTimeout(() => findInput.classList.remove('miss'), 900);
      return;
    }
    findInput.classList.remove('miss');
    findInput.blur();
    focusStar(target);
  });

  const euler = new THREE.Euler(0, 0, 0, 'XYZ');
  const tmpWorld = new THREE.Vector3();
  const tmpNdc = new THREE.Vector3();

  function updateLabels() {
    euler.set(pitch, yaw, 0, 'XYZ');
    camera.updateMatrixWorld();
    nodeItems.forEach((it) => {
      tmpWorld.copy(it.pos).applyEuler(euler);
      it.world.copy(tmpWorld);
      it.dist = tmpWorld.length();
      it.dir.copy(tmpWorld).normalize();
      it.label.position.copy(tmpWorld);
      it.label.position.y += 0.52;
    });

    for (const it of nodeItems) it._show = false;
    if (focusItem) focusItem._show = true;
    if (hoveredItem) hoveredItem._show = true;

    if (!compact) {
      const cand = [];
      nodeItems.forEach((it) => {
        if (it._show) return;
        if (it.dir.z > -FRONT_COS) return; // 只取正前方
        if (it.dist > NEAR_DIST) return;
        const ndc = tmpNdc.copy(it.world).project(camera);
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const halfX = (it.label.scale.x / 2) / (it.dist * tanHalf * camera.aspect);
        const halfY = (it.label.scale.y / 2) / (it.dist * tanHalf);
        if (Math.abs(ndc.x) + halfX > 0.94 || Math.abs(ndc.y) + halfY > 0.94) return;
        cand.push(it);
      });
      cand.sort((a, b) => (-a.dir.z) - (-b.dir.z) || a.dist - b.dist);
      const seen = [];
      if (focusItem) seen.push(focusItem.dir);
      if (hoveredItem) seen.push(hoveredItem.dir);
      for (const it of cand) {
        if (seen.some((d) => d.dot(it.dir) > SEP_COS)) continue;
        it._show = true;
        seen.push(it.dir);
        if (seen.length >= 6) break;
      }
    }

    nodeItems.forEach((it) => {
      const target = it._show ? 1 : 0;
      it.labelAlpha += (target - it.labelAlpha) * 0.24;
      if (it.labelAlpha > 0.02) {
        it.label.visible = true;
        it.label.material.opacity = 0.94 * it.labelAlpha;
      } else {
        it.label.visible = false;
        it.label.material.opacity = 0;
      }
    });
  }

  function updateNodes(now) {
    nodeItems.forEach((it) => {
      const want = it === hoveredItem || it === focusItem ? 1 : 0;
      it.amp += (want - it.amp) * 0.18;
      const coreS = it.coreScale * (1 + 0.5 * it.amp);
      it.core.scale.setScalar(coreS);
      let pulse = 0;
      if (it === focusItem) pulse = 0.28 * (0.5 + 0.5 * Math.sin(now * 0.009));
      const glowS = it.glowScale * (1 + 0.55 * it.amp + pulse);
      it.glow.scale.set(glowS, glowS, 1);
      it.glow.material.opacity = it.glowOpacity * (1 + 0.55 * it.amp + pulse);
    });
    if (focusItem && now > focusUntil) {
      focusItem = null;
      applyEdgeFocus(hoveredItem);
    }
  }

  function updateMeteors(now) {
    for (let i = 0; i < edgeItems.length; i++) {
      const ed = edgeItems[i];
      const t = (now * 0.000032 + i * 0.081) % 1;
      const pt = ed.curve.getPointAt(t);
      meteorPos[i * 3] = pt.x;
      meteorPos[i * 3 + 1] = pt.y;
      meteorPos[i * 3 + 2] = pt.z;
      // 没有点亮的边不跑流星；用当前透明度做淡出，松开指针时不会突然消失
      const fade = Math.min(1, ed.material.opacity / 0.9);
      const k = fade * (0.16 + 0.84 * Math.sin(Math.PI * t));
      meteorCol[i * 3] = 1.0 * k;
      meteorCol[i * 3 + 1] = 0.83 * k;
      meteorCol[i * 3 + 2] = 0.52 * k;
    }
    meteorGeo.attributes.position.needsUpdate = true;
    meteorGeo.attributes.color.needsUpdate = true;
  }

  function frame(now) {
    if (!running) return;
    anim = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
    lastNow = now;

    if (lookAnim) {
      const t = Math.min(1, Math.max(0, (now - lookAnim.start) / lookAnim.dur));
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      yaw = lookAnim.fromYaw + (lookAnim.toYaw - lookAnim.fromYaw) * e;
      pitch = lookAnim.fromPitch + (lookAnim.toPitch - lookAnim.fromPitch) * e;
      if (t >= 1) lookAnim = null;
    }

    group.rotation.set(pitch, yaw, 0);
    updateNodes(now);
    updateLabels();
    updateEdges(dt);
    updateMeteors(now);
    renderer.render(scene, camera);
  }

  function startLoop() {
    if (running) return;
    running = true;
    lastNow = performance.now();
    anim = requestAnimationFrame(frame);
  }

  function stopLoop() {
    running = false;
    if (anim) cancelAnimationFrame(anim);
    anim = 0;
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (window.mmAudioStarStop) window.mmAudioStarStop();
    stopLoop();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(missTimer);

    const textures = new Set();
    const geometries = new Set();
    scene.traverse((obj) => {
      // Sprite 的几何是 three 内部共享的，跳过以免影响页面其他 Sprite
      if (obj.geometry && !obj.isSprite && !geometries.has(obj.geometry)) {
        geometries.add(obj.geometry);
        obj.geometry.dispose();
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m.map && !textures.has(m.map)) {
            textures.add(m.map);
            m.map.dispose();
          }
          m.dispose();
        });
      }
    });
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss?.();
    overlay.remove();
    tip.remove();
  }

  startLoop();
  window.__mmStarNodes = data.nodes.length;
  window.__mmStarEdges = () => ({
    total: edgeItems.length,
    lit: edgeItems.filter((ed) => ed.lit).length,
    opacity: Number(Math.max(0, ...edgeItems.map((ed) => ed.material.opacity)).toFixed(3)),
  });
}

window.mmShowStar = showStarMap;

// star.js · 立体星图（three.js）：四层球壳、关系连线、拖拽旋转、滚轮缩放、点星开书
import * as THREE from './vendor/three.module.js';

const FLOORS = [
  { id: 'L1', name: '历史典藏', color: 0xc8a24a, radius: 6.2 },
  { id: 'L2', name: '技术工坊', color: 0x7fb6d6, radius: 8.2 },
  { id: 'L3', name: '产业观察', color: 0x9ec27a, radius: 10.2 },
  { id: 'L4', name: '未编目地库', color: 0xc49ae0, radius: 12.2 },
];

const CSS = `
.mm-star3d { position: fixed; inset: 0; z-index: 75; background: radial-gradient(900px 620px at 50% 42%, #17110c, #080604 76%); overflow: hidden; }
.mm-star3d-head { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 18px; padding: 14px 20px; z-index: 3; }
.mm-star3d-title { color: #e6d9bd; font-size: 16px; letter-spacing: 4px; }
.mm-star3d-title small { color: #8a7a5c; font-size: 11px; letter-spacing: 1px; margin-left: 8px; }
.mm-star3d-legend { display: flex; gap: 14px; margin-left: auto; color: #a8977a; font-size: 11px; flex-wrap: wrap; }
.mm-star3d-legend span { white-space: nowrap; }
.mm-star3d-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
.mm-star3d-close { background: #241c14; color: #c8a24a; border: 1px solid #8a6320; width: 32px; height: 32px; cursor: pointer; font-size: 16px; line-height: 1; }
.mm-star3d-canvas { position: absolute; inset: 0; }
.mm-star3d-canvas canvas { display: block; }
.mm-star3d-hint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); color: #7d6e55; font-size: 11px; letter-spacing: 1px; z-index: 3; text-align: center; width: 92%; }
.mm-star-tip { position: fixed; z-index: 80; max-width: 300px; background: #1d1712; border: 1px solid #8a6320; padding: 10px 12px; color: #cbb892; font-size: 12px; line-height: 1.65; pointer-events: none; display: none; box-shadow: 0 10px 30px rgba(0,0,0,.6); }
.mm-star-tip b { color: #c8a24a; display: block; margin-bottom: 4px; letter-spacing: 1px; }
.mm-star-tip em { font-style: normal; color: #7d6e55; display: block; margin-top: 4px; }
@media (max-width: 620px) { .mm-star3d-legend { display: none; } .mm-star3d-title small { display: none; } }
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

function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 96);
  ctx.font = '32px "Songti SC", "SimSun", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(230,217,189,.92)';
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(1.9, 0.36, 1);
  return sp;
}

export async function showStarMap() {
  if (document.getElementById('mm-star-overlay')) return;
  const data = await loadGraph();
  if (!data) return;
  injectCss();

  const overlay = document.createElement('div');
  overlay.id = 'mm-star-overlay';
  overlay.className = 'mm-star3d';
  overlay.innerHTML = `
    <div class="mm-star3d-head">
      <div class="mm-star3d-title">星图 · 3D<small>36 本书 · 四层同心球壳 · 点星开书</small></div>
      <div class="mm-star3d-legend">${FLOORS.map((f) => `<span><i style="background:#${f.color.toString(16).padStart(6, '0')}"></i>${f.name}</span>`).join('')}</div>
      <button class="mm-star3d-close" aria-label="关闭星图">×</button>
    </div>
    <div class="mm-star3d-canvas"></div>
    <div class="mm-star3d-hint">拖拽旋转 · 滚轮缩放 · 悬停看关系 · 点击星点打开书 · Esc 关闭</div>`;
  document.body.appendChild(overlay);

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
  scene.fog = new THREE.FogExp2(0x0c0906, 0.028);

  const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 120);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  const group = new THREE.Group();
  group.rotation.y = 0.4;
  scene.add(group);

  scene.add(new THREE.AmbientLight(0xfff2d8, 1.35));
  const core = new THREE.PointLight(0xffd98a, 2.2, 40, 1.6);
  scene.add(core);

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

  const nodeGeo = new THREE.SphereGeometry(0.15, 14, 14);
  const nodeItems = [];
  data.nodes.forEach((n) => {
    const color = (FLOORS.find((f) => f.id === n.floor) || FLOORS[0]).color;
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85, roughness: 0.35, metalness: 0.2 });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    mesh.position.copy(pos.get(n.id));
    mesh.userData.node = n;
    group.add(mesh);
    const label = makeLabel(n.title);
    label.position.copy(mesh.position).add(new THREE.Vector3(0, 0.34, 0));
    group.add(label);
    nodeItems.push({ mesh, label, node: n });
  });

  const edgeColor = new THREE.Color(0x9a7a3a);
  data.edges.forEach((e) => {
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) return;
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.45 }));
    group.add(line);
  });

  // 移动端隐藏标签
  const compact = container.clientWidth < 620;
  nodeItems.forEach((it) => { it.label.visible = !compact; });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let hovered = null;
  let anim = 0;

  const pick = (clientX, clientY) => {
    const rect = container.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(nodeItems.map((it) => it.mesh), false);
    return hits.length ? hits[0].object : null;
  };

  const onPointerDown = (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.domElement.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      group.rotation.y += dx * 0.006;
      group.rotation.x = Math.max(-1.1, Math.min(1.1, group.rotation.x + dy * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
      tip.style.display = 'none';
      return;
    }
    const hit = pick(e.clientX, e.clientY);
    if (hit) {
      if (hovered && hovered !== hit) { hovered.scale.setScalar(1); }
      hovered = hit;
      hit.scale.setScalar(1.45);
      const n = hit.userData.node;
      const near = data.edges
        .filter((ed) => ed.source === n.id || ed.target === n.id)
        .map((ed) => (ed.source === n.id ? ed.target : ed.source))
        .slice(0, 4);
      tip.innerHTML = `<b>${n.title}</b>${(n.tags || []).slice(0, 4).join(' · ')}<em>${near.length ? '相连：' + near.join('、') : '暂无连线'}</em>`;
      tip.style.display = 'block';
      tip.style.left = Math.min(window.innerWidth - 310, e.clientX + 16) + 'px';
      tip.style.top = Math.min(window.innerHeight - 120, e.clientY + 16) + 'px';
      renderer.domElement.style.cursor = 'pointer';
    } else {
      if (hovered) { hovered.scale.setScalar(1); hovered = null; }
      tip.style.display = 'none';
      renderer.domElement.style.cursor = dragging ? 'grabbing' : 'grab';
    }
  };
  const onPointerUp = (e) => {
    dragging = false;
    if (moved < 6) {
      const hit = pick(e.clientX, e.clientY);
      if (hit && typeof window.openBookFirst === 'function') {
        const id = hit.userData.node.id;
        close();
        window.openBookFirst(id);
      }
    }
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
    renderer.setSize(w, h);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.mm-star3d-close').addEventListener('click', close);

  function close() {
    cancelAnimationFrame(anim);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKey);
    renderer.dispose();
    nodeGeo.dispose();
    nodeItems.forEach((it) => {
      it.mesh.material.dispose();
      if (it.label.material.map) it.label.material.map.dispose();
      it.label.material.dispose();
    });
    group.children.forEach((c) => { if (c.geometry && c.geometry !== nodeGeo) c.geometry.dispose(); });
    overlay.remove();
    tip.remove();
  }

  function loop() {
    anim = requestAnimationFrame(loop);
    renderer.render(scene, camera);
  }
  loop();

  window.__mmStarNodes = data.nodes.length;
}

window.mmShowStar = showStarMap;

// app3d.js · 阶段 2：3D 主阅览室（three.js + Rapier）
// 书架程序化生成、书脊 Canvas 排版、取书翻开动画、黄铜电梯选层、尘埃与星图台。
import * as THREE from 'three';
import RAPIER from 'rapier';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const SHELF_X = [-4.4, 0, 4.4];
const SHELF_Z = -3.1;
const BOARD_Y = [0.6, 1.6, 2.6];
const BOOK_H = 0.44;

const CSS = `
.mm-root { position: fixed; inset: 0; z-index: 0; overflow: hidden; }
body.reading .mm-root, body.grid .mm-root { display: none; }
.mm-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: #9a8a6f; font-size: 14px; letter-spacing: 6px; background: #120e0b; z-index: 20; }
.mm-hint { position: absolute; left: 24px; bottom: 18px; color: #8a7a5c; font-size: 12px; letter-spacing: 1px;
  background: rgba(18,14,11,.55); padding: 6px 10px; border: 1px solid #2c2116; }
.mm-toast { position: absolute; left: 50%; bottom: 84px; transform: translateX(-50%); background: rgba(27,21,16,.96);
  color: #e6d9bd; border: 1px solid #c8a24a; padding: 10px 16px; font-size: 13px; z-index: 25; opacity: 0;
  transition: opacity .3s; max-width: 72%; text-align: center; pointer-events: none; }
.mm-toast.show { opacity: 1; }
.mm-fade { position: absolute; inset: 0; background: #0b0805; opacity: 0; pointer-events: none;
  transition: opacity .3s; z-index: 40; }
.mm-fade.on { opacity: 1; }
.mm-elev { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: #1b1510;
  border: 1px solid #c8a24a; padding: 18px 20px 14px; z-index: 30; min-width: 290px; display: none;
  box-shadow: 0 24px 80px rgba(0,0,0,.7); }
.mm-elev.show { display: block; }
.mm-elev h3 { color: #c8a24a; font-size: 13px; letter-spacing: 3px; margin: 0 0 12px; font-weight: 600; }
.mm-elev button { display: flex; justify-content: space-between; align-items: center; width: 100%; margin: 7px 0;
  padding: 9px 12px; background: #241c14; color: #e6d9bd; border: 1px solid #3a2f22; cursor: pointer;
  text-align: left; font-size: 13px; font-family: "Segoe UI", "Microsoft YaHei", sans-serif; }
.mm-elev button:hover { border-color: #c8a24a; color: #c8a24a; }
.mm-elev button i { font-style: normal; color: #8a7a5c; font-size: 11px; }
.mm-elev .close { position: absolute; right: 10px; top: 8px; width: auto; margin: 0; padding: 2px 8px;
  background: none; border: none; color: #8a7a5c; font-size: 14px; }
.mm-elev .close:hover { color: #c8a24a; }
.mm-elev-btn { position: absolute; right: 22px; bottom: 18px; background: rgba(27,21,16,.92); color: #c8a24a;
  border: 1px solid #c8a24a; padding: 8px 14px; cursor: pointer; font-size: 12.5px; letter-spacing: 1px;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif; z-index: 25; }
.mm-elev-btn:hover { background: #2c241a; }
`;

function injectCss() {
  if (document.getElementById('mm3d-style')) return;
  const s = document.createElement('style');
  s.id = 'mm3d-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------- 书脊：Canvas 竖排 ----------
function spineTexture(book) {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = book.color || '#4a3a2e';
  ctx.fillRect(0, 0, 192, 512);
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * 192, Math.random() * 512, 2, 2);
  }
  ctx.strokeStyle = '#c8a24a';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 168, 488);
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, 152, 472);

  const title = String(book.title || '').replace(/[《》]/g, '');
  ctx.fillStyle = '#f0e2c0';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px "Songti SC", "SimSun", serif';
  [...title].slice(0, 9).forEach((ch, i) => ctx.fillText(ch, 96, 66 + i * 46));

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#d8b45a';
  ctx.fillText(String(book.call || ''), 96, 470);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export async function init3D({ container, books, floors, onOpenBook }) {
  injectCss();

  const root = document.createElement('div');
  root.className = 'mm-root';
  container.appendChild(root);

  const loading = document.createElement('div');
  loading.className = 'mm-loading';
  loading.textContent = '正在开馆……';
  root.appendChild(loading);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120e0b);
  scene.fog = new THREE.Fog(0x120e0b, 7, 26);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 60);
  const cam = {
    theta: 0, phi: 1.27, radius: 7.6, target: new THREE.Vector3(0, 1.5, -0.6),
    tTheta: 0, tPhi: 1.27, tRadius: 7.6, tTarget: new THREE.Vector3(0, 1.5, -0.6),
  };

  // ---------- 灯光 ----------
  scene.add(new THREE.AmbientLight(0x4a3a28, 0.9));
  scene.add(new THREE.HemisphereLight(0x6b5a3a, 0x120e0b, 0.45));

  const spot = new THREE.SpotLight(0xffd9a0, 2.3, 0, 0.95, 0.55, 1.2);
  spot.position.set(0, 5.6, 2.2);
  spot.target.position.set(0, 0.8, -2.6);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0005;
  scene.add(spot);
  scene.add(spot.target);

  const sideL = new THREE.PointLight(0xffb066, 0.55, 8, 2);
  sideL.position.set(-4.6, 2.6, -1.4);
  scene.add(sideL);
  const sideR = new THREE.PointLight(0x9fc2ff, 0.4, 8, 2);
  sideR.position.set(4.6, 2.6, -1.4);
  scene.add(sideR);

  // ---------- 房间 ----------
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.82, metalness: 0.05 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x362415, roughness: 0.75, metalness: 0.06 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1510, roughness: 0.9 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(19, 14), new THREE.MeshStandardMaterial({ color: 0x241a11, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.2), new THREE.MeshStandardMaterial({ color: 0x3a2216, roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.2, 0.012, 0.2);
  rug.receiveShadow = true;
  scene.add(rug);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(19, 6.5), wallMat);
  backWall.position.set(0, 3.25, -4.6);
  backWall.receiveShadow = true;
  scene.add(backWall);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.5), wallMat);
    side.rotation.y = sx * Math.PI / 2;
    side.position.set(sx * 9.5, 3.25, 0);
    scene.add(side);
  }
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(19, 14), new THREE.MeshStandardMaterial({ color: 0x0e0a07, roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 6.5;
  scene.add(ceiling);

  // ---------- 书架 ----------
  function createShelf(x) {
    const g = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.09, 3.3, 0.52);
    for (const px of [-1.52, 1.52]) {
      const post = new THREE.Mesh(postGeo, wood);
      post.position.set(px, 1.65, 0);
      post.castShadow = true;
      g.add(post);
    }
    const boardGeo = new THREE.BoxGeometry(3.1, 0.06, 0.48);
    for (const by of BOARD_Y) {
      const board = new THREE.Mesh(boardGeo, wood);
      board.position.set(0, by, 0);
      board.castShadow = true;
      board.receiveShadow = true;
      g.add(board);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.09, 0.54), wood);
    top.position.set(0, 3.3, 0);
    top.castShadow = true;
    g.add(top);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.56), woodDark);
    plinth.position.set(0, 0.07, 0);
    g.add(plinth);
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.0, 0.03), woodDark);
    backPanel.position.set(0, 1.6, -0.23);
    g.add(backPanel);
    // 层板黄铜沿
    const brass = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, roughness: 0.35, metalness: 0.7 });
    for (const by of BOARD_Y) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(3.12, 0.015, 0.015), brass);
      edge.position.set(0, by + 0.035, 0.235);
      g.add(edge);
    }
    g.position.set(x, 0, SHELF_Z);
    scene.add(g);
    return g;
  }
  for (const x of SHELF_X) createShelf(x);

  // ---------- 书 ----------
  const bookItems = [];
  books.forEach((book, i) => {
    const unit = i % 3;
    const slot = Math.floor(i / 3); // 0..3
    const level = BOARD_Y[slot < 2 ? 0 : 1] + 0.03;
    const sx = slot % 2 === 0 ? -0.36 : 0.2;
    const basePos = new THREE.Vector3(SHELF_X[unit] + sx, level + BOOK_H / 2 + 0.004, SHELF_Z + 0.02);
    const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (Math.random() - 0.5) * 0.08, 0));

    const sideMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(book.color || '#4a3a2e').multiplyScalar(0.62),
      roughness: 0.7, metalness: 0.05,
    });
    const spineMat = new THREE.MeshStandardMaterial({ map: spineTexture(book), roughness: 0.62, metalness: 0.05 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, BOOK_H, 0.30), [sideMat, sideMat, sideMat, sideMat, spineMat, sideMat]);
    mesh.position.copy(basePos);
    mesh.quaternion.copy(baseQuat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const chapterId = (book.chapters && book.chapters[0] && book.chapters[0].id) || null;
    const item = { mesh, book, basePos, baseQuat, chapterId, body: null, animating: false };
    bookItems.push(item);
    mesh.userData.item = item;
  });

  // ---------- 黄铜电梯（左墙） ----------
  const elevator = new THREE.Group();
  const brassMat = new THREE.MeshStandardMaterial({ color: 0x9a7a3a, roughness: 0.3, metalness: 0.8 });
  const brassDark = new THREE.MeshStandardMaterial({ color: 0x5a4520, roughness: 0.45, metalness: 0.65 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.3, 0.3), brassDark);
  frame.position.set(0, 1.65, 0);
  elevator.add(frame);
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.9, 0.06), brassMat);
  doorL.position.set(-0.44, 1.55, 0.17);
  elevator.add(doorL);
  const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.9, 0.06), brassMat);
  doorR.position.set(0.44, 1.55, 0.17);
  elevator.add(doorR);
  const panelBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.06), brassDark);
  panelBox.position.set(1.2, 1.5, 0.17);
  elevator.add(panelBox);
  const knobGeo = new THREE.SphereGeometry(0.035, 12, 12);
  for (let k = 0; k < 3; k++) {
    const knob = new THREE.Mesh(knobGeo, new THREE.MeshStandardMaterial({ color: 0xd8b45a, emissive: 0x8a6320, emissiveIntensity: 0.6 }));
    knob.position.set(1.2, 1.38 + k * 0.12, 0.21);
    elevator.add(knob);
  }
  elevator.position.set(-6.2, 0, -0.6);
  elevator.rotation.y = Math.PI / 2;
  scene.add(elevator);

  // ---------- 星图台 ----------
  const starTable = new THREE.Group();
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.72, 16), woodDark);
  pedestal.position.y = 0.36;
  starTable.add(pedestal);
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.92, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.4, metalness: 0.3 }));
  tableTop.position.y = 0.76;
  tableTop.castShadow = true;
  starTable.add(tableTop);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.015, 8, 64), new THREE.MeshStandardMaterial({ color: 0xc8a24a, emissive: 0x8a6320, emissiveIntensity: 0.5 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.82;
  starTable.add(ring);
  const starDots = [];
  for (let d = 0; d < 10; d++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xc8a24a, emissiveIntensity: 0.9 }));
    const a = (d / 10) * Math.PI * 2;
    const rr = 0.2 + (d % 3) * 0.22;
    dot.position.set(Math.cos(a) * rr, 0.81, Math.sin(a) * rr);
    starTable.add(dot);
    starDots.push(dot);
  }
  starTable.position.set(0.4, 0, 0.6);
  scene.add(starTable);

  // ---------- 卡片目录柜 ----------
  const cabinet = new THREE.Group();
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 0.55), woodDark);
  cabBody.position.y = 1.0;
  cabBody.castShadow = true;
  cabinet.add(cabBody);
  const drawerMat = new THREE.MeshStandardMaterial({ color: 0x45301c, roughness: 0.6 });
  const drawGeo = new THREE.BoxGeometry(0.62, 0.34, 0.04);
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 2; col++) {
      const dr = new THREE.Mesh(drawGeo, drawerMat);
      dr.position.set(-0.34 + col * 0.68, 0.55 + r * 0.42, 0.29);
      cabinet.add(dr);
      const label = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.01), new THREE.MeshStandardMaterial({ color: 0xc8a24a, metalness: 0.5, roughness: 0.4 }));
      label.position.set(-0.34 + col * 0.68, 0.58 + r * 0.42, 0.315);
      cabinet.add(label);
    }
  }
  cabinet.position.set(5.9, 0, -0.9);
  cabinet.rotation.y = -0.35;
  scene.add(cabinet);

  // ---------- 尘埃 ----------
  const dustCount = 320;
  const dustGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 17;
    positions[i * 3 + 1] = Math.random() * 5.4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xd9c8a8, size: 0.022, transparent: true, opacity: 0.28, depthWrite: false }));
  scene.add(dust);

  // ---------- 物理（Rapier） ----------
  let world = null;
  try {
    await RAPIER.init();
    world = new RAPIER.World({ x: 0, y: -4.2, z: 0 });
    world.timestep = 1 / 60;
    const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(9, 0.5, 6.5).setFriction(0.9), ground);
    for (const x of SHELF_X) {
      for (const by of BOARD_Y) {
        const rb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, by, SHELF_Z));
        world.createCollider(RAPIER.ColliderDesc.cuboid(1.55, 0.03, 0.23).setFriction(0.95), rb);
      }
    }
    for (const item of bookItems) {
      const rb = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(item.basePos.x, item.basePos.y, item.basePos.z)
          .setRotation({ x: item.baseQuat.x, y: item.baseQuat.y, z: item.baseQuat.z, w: item.baseQuat.w })
          .setLinearDamping(0.4)
          .setAngularDamping(0.7)
      );
      world.createCollider(RAPIER.ColliderDesc.cuboid(0.08, BOOK_H / 2, 0.15).setFriction(0.98).setRestitution(0.02), rb);
      item.body = rb;
    }
  } catch (e) {
    console.warn('[3D] Rapier 初始化失败，退化为静态摆放', e);
  }

  // ---------- UI：提示 / 提示条 / 遮罩 / 电梯面板 ----------
  const hint = document.createElement('div');
  hint.className = 'mm-hint';
  hint.textContent = '拖拽环视 · 点击书取书 · 点击左侧黄铜电梯选层';
  root.appendChild(hint);

  const toastEl = document.createElement('div');
  toastEl.className = 'mm-toast';
  root.appendChild(toastEl);
  let toastTimer = null;
  function toast(text, ms = 3200) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  const fadeEl = document.createElement('div');
  fadeEl.className = 'mm-fade';
  root.appendChild(fadeEl);
  const fade = (on) => fadeEl.classList.toggle('on', on);

  const elevPanel = document.createElement('div');
  elevPanel.className = 'mm-elev';
  elevPanel.innerHTML = '<h3>黄铜电梯 · 选层</h3>';

  const elevBtn = document.createElement('button');
  elevBtn.className = 'mm-elev-btn';
  elevBtn.textContent = '黄铜电梯 · 选层';
  elevBtn.onclick = () => elevPanel.classList.add('show');
  root.appendChild(elevBtn);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => elevPanel.classList.remove('show');
  elevPanel.appendChild(closeBtn);
  const allBtn = document.createElement('button');
  allBtn.innerHTML = '<span>全馆大厅</span><i>三排书架 · 12 本</i>';
  allBtn.onclick = () => { setFloor('all'); elevPanel.classList.remove('show'); };
  elevPanel.appendChild(allBtn);
  for (const f of floors) {
    const b = document.createElement('button');
    b.innerHTML = `<span>${f.name}</span><i>${f.librarian}</i>`;
    b.onclick = () => { setFloor(f.id); elevPanel.classList.remove('show'); };
    elevPanel.appendChild(b);
  }
  root.appendChild(elevPanel);

  let currentFloor = 'all';
  function setFloor(fid) {
    currentFloor = fid;
    for (const it of bookItems) {
      it.mesh.visible = fid === 'all' || it.book.floor === fid;
    }
    const idx = floors.findIndex((f) => f.id === fid);
    if (fid === 'all') {
      cam.tTheta = 0; cam.tPhi = 1.27; cam.tRadius = 7.6; cam.tTarget.set(0, 1.5, -0.6);
      toast('全馆大厅：三排书架都在，慢慢看。');
    } else {
      const f = floors[idx];
      cam.tTheta = [-0.26, 0, 0.26, 0][idx] ?? 0;
      cam.tPhi = 1.24;
      cam.tRadius = 5.9;
      cam.tTarget.set(0, 1.65, -2.2);
      toast(`${f.name} · ${f.librarian}：${f.welcome}`);
    }
  }

  // ---------- 相机控制 ----------
  const el = renderer.domElement;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let downY = 0;

  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) {
      hoverPick(e);
      return;
    }
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    cam.tTheta = Math.max(-0.75, Math.min(0.75, cam.tTheta - dx * 0.0035));
    cam.tPhi = Math.max(1.12, Math.min(1.45, cam.tPhi + dy * 0.0025));
  });
  window.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved < 6) pick(e.clientX, e.clientY);
  });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.tRadius = Math.max(4.5, Math.min(10.5, cam.tRadius + Math.sign(e.deltaY) * 0.4));
  }, { passive: false });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function setPointer(x, y) {
    pointer.x = (x / window.innerWidth) * 2 - 1;
    pointer.y = -(y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function hoverPick(e) {
    setPointer(e.clientX, e.clientY);
    const hits = raycaster.intersectObjects(bookItems.map((it) => it.mesh), false);
    const hitElev = raycaster.intersectObject(elevator, true);
    el.style.cursor = (hits.length || hitElev.length) ? 'pointer' : 'grab';
  }

  function pick(x, y) {
    setPointer(x, y);
    const elevHits = raycaster.intersectObject(elevator, true);
    if (elevHits.length) {
      elevPanel.classList.add('show');
      return;
    }
    const hits = raycaster.intersectObjects(bookItems.map((it) => it.mesh), false);
    if (!hits.length) return;
    const item = hits[0].object.userData.item;
    if (!item) return;
    if (!item.chapterId) { toast('这本书还没上架（样章未写）'); return; }
    if (item.animating) return;
    takeBook(item);
  }

  // ---------- 取书翻开（签名时刻） ----------
  let taking = false;
  function takeBook(item) {
    if (taking) return;
    taking = true;
    item.animating = true;
    if (item.body) item.body.setEnabled(false);

    const start = item.mesh.position.clone();
    const startQ = item.mesh.quaternion.clone();
    const dir = camera.getWorldDirection(new THREE.Vector3());
    const target = camera.position.clone().add(dir.multiplyScalar(0.95));
    target.y -= 0.1;
    const dummy = new THREE.Object3D();
    dummy.position.copy(start);
    dummy.lookAt(camera.position);
    const targetQ = dummy.quaternion.clone();

    const t0 = performance.now();
    const dur = 950;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = easeInOut(p);
      item.mesh.position.lerpVectors(start, target, e);
      item.mesh.position.z += Math.sin(p * Math.PI) * 0.16;
      item.mesh.quaternion.copy(startQ).slerp(targetQ, e);
      item.mesh.scale.setScalar(1 + 0.35 * e);
      if (p < 1) requestAnimationFrame(step);
      else {
        fade(true);
        setTimeout(() => {
          onOpenBook(item.chapterId);
          setTimeout(() => fade(false), 380);
        }, 240);
        setTimeout(() => {
          item.mesh.position.copy(item.basePos);
          item.mesh.quaternion.copy(item.baseQuat);
          item.mesh.scale.setScalar(1);
          if (item.body) {
            item.body.setTranslation({ x: item.basePos.x, y: item.basePos.y, z: item.basePos.z }, true);
            item.body.setRotation({ x: item.baseQuat.x, y: item.baseQuat.y, z: item.baseQuat.z, w: item.baseQuat.w }, true);
            item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            item.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            item.body.setEnabled(true);
          }
          item.animating = false;
          taking = false;
        }, 780);
      }
    };
    requestAnimationFrame(step);
  }

  // ---------- 复位（从阅读页回到房间时调用） ----------
  function reset() {
    taking = false;
    for (const item of bookItems) {
      item.animating = false;
      item.mesh.position.copy(item.basePos);
      item.mesh.quaternion.copy(item.baseQuat);
      item.mesh.scale.setScalar(1);
      item.mesh.visible = true;
      if (item.body) {
        item.body.setTranslation({ x: item.basePos.x, y: item.basePos.y, z: item.basePos.z }, true);
        item.body.setRotation({ x: item.baseQuat.x, y: item.baseQuat.y, z: item.baseQuat.z, w: item.baseQuat.w }, true);
        item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        item.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        item.body.setEnabled(true);
      }
    }
    fade(false);
    setFloor('all');
    currentFloor = 'all';
  }

  // ---------- 渲染循环 ----------
  function updateCamera() {
    cam.theta += (cam.tTheta - cam.theta) * 0.09;
    cam.phi += (cam.tPhi - cam.phi) * 0.09;
    cam.radius += (cam.tRadius - cam.radius) * 0.09;
    cam.target.lerp(cam.tTarget, 0.09);
    const sinPhi = Math.sin(cam.phi);
    camera.position.set(
      cam.target.x + cam.radius * sinPhi * Math.sin(cam.theta),
      cam.target.y + cam.radius * Math.cos(cam.phi),
      cam.target.z + cam.radius * sinPhi * Math.cos(cam.theta)
    );
    camera.lookAt(cam.target);
  }

  let elapsed = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = (now || 0) / 1000;
    elapsed += 1 / 60;
    updateCamera();

    if (world) {
      world.step();
      for (const item of bookItems) {
        if (!item.body || item.animating) continue;
        const p = item.body.translation();
        if (p.y < 0.2) {
          item.mesh.position.copy(item.basePos);
          item.mesh.quaternion.copy(item.baseQuat);
          item.body.setTranslation({ x: item.basePos.x, y: item.basePos.y, z: item.basePos.z }, true);
          item.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          continue;
        }
        const q = item.body.rotation();
        item.mesh.position.set(p.x, p.y, p.z);
        item.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      }
    }

    dust.rotation.y = Math.sin(elapsed * 0.06) * 0.03;
    ring.rotation.z = elapsed * 0.12;
    for (let d = 0; d < starDots.length; d++) {
      starDots[d].material.emissiveIntensity = 0.6 + 0.35 * Math.sin(elapsed * 1.3 + d);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
  requestAnimationFrame(() => loading.remove());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { reset, setFloor, scene, camera, renderer, bookItems, elevator };
}

export function dispose3D(api) {
  if (!api) return;
  api.renderer.dispose();
}

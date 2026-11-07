// app3d.js · 阶段 2：3D 主阅览室（three.js + Rapier）
// 书架程序化生成、书脊 Canvas 排版、取书翻开动画、黄铜电梯选层、尘埃与星图台。
import * as THREE from './vendor/three.module.js';
import RAPIER from './vendor/rapier.mjs';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const DECAY = ['完好', '轻残', '中残', '高残'];

// 房间尺寸：在旧 19×14×6.5 基础上放大 1.5 倍（28.5×21×9.75）
const ROOM = {
  w: 28.5, d: 21, h: 9.75,
  backZ: -6.9, sideX: 14.25,
  minX: 12.6, minZ: -1.5, maxZ: 9.4,
};
const CHANDELIER_POS = { x: 0, y: 4.8, z: 1.8 };
const SCONCE_POS = [[-1, -2.6], [1, -2.6], [-1, 3.4], [1, 3.4]];
const FLOOR_LAMP_POS = [[-7.2, 6.2], [7.2, 6.2]];

// 书架容量可配置：按书数动态计算需要多少组书架、排成几行
function layoutShelves(totalBooks, capacity, maxPerRow = 6) {
  const units = Math.max(1, Math.ceil(totalBooks / capacity));
  const rows = Math.ceil(units / maxPerRow);
  const base = Math.floor(units / rows);
  const extra = units % rows;
  const spacing = 4.4;
  const out = [];
  for (let r = 0; r < rows; r++) {
    const count = base + (r < extra ? 1 : 0);
    const startX = -((count - 1) * spacing) / 2;
    const z = -5.4 + r * 2.9;
    for (let i = 0; i < count; i++) out.push({ x: startX + i * spacing, z });
  }
  return out;
}
const BOARD_Y = [0.6, 1.6, 2.6];
const BOOK_H = 0.60;

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
  c.width = 256;
  c.height = 768;
  const ctx = c.getContext('2d');
  ctx.fillStyle = book.color || '#4a3a2e';
  ctx.fillRect(0, 0, 256, 768);
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 768, 2, 2);
  }
  ctx.strokeStyle = '#c8a24a';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 228, 740);
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, 208, 720);

  const title = String(book.title || '').replace(/[《》]/g, '');
  ctx.fillStyle = '#f6ecc9';
  ctx.textAlign = 'center';
  ctx.font = 'bold 54px "Songti SC", "SimSun", serif';
  [...title].slice(0, 10).forEach((ch, i) => ctx.fillText(ch, 128, 90 + i * 64));

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#e2c06a';
  ctx.fillText(String(book.call || ''), 128, 716);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------- 程序化贴图：地面 / 墙面 / 挂画 / 蓝图 ----------
function canvasTexture(w, h, painter) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  painter(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeFloorTexture(kind) {
  const tex = canvasTexture(512, 512, (g, W, H) => {
    if (kind === 'wood') {
      g.fillStyle = '#402e1d';
      g.fillRect(0, 0, W, H);
      const tones = ['#4a3722', '#44311f', '#503c26', '#3e2c1b'];
      for (let y = 0; y < H; y += 64) {
        g.fillStyle = tones[(y / 64) % tones.length];
        g.fillRect(0, y, W, 64);
        for (let i = 0; i < 18; i++) {
          g.strokeStyle = `rgba(18,11,5,${0.06 + Math.random() * 0.09})`;
          g.lineWidth = 1;
          g.beginPath();
          let yy = y + Math.random() * 64;
          g.moveTo(0, yy);
          for (let x = 0; x <= W; x += 48) {
            yy += Math.sin((x + i * 33 + y) / 70) * 1.8 + (Math.random() - 0.5) * 1.6;
            g.lineTo(x, yy);
          }
          g.stroke();
        }
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(0, y + 63, W, 1);
        const off = (y / 64) % 2 ? 128 : 0;
        for (let x = off; x < W; x += 256) g.fillRect(x, y, 1, 64);
      }
      for (let i = 0; i < 12; i++) {
        const kx = Math.random() * W;
        const ky = Math.random() * H;
        g.strokeStyle = 'rgba(20,12,6,.35)';
        for (let r = 3; r < 11; r += 3) {
          g.beginPath();
          g.ellipse(kx, ky, r, r * 0.6, 0, 0, Math.PI * 2);
          g.stroke();
        }
      }
    } else if (kind === 'metal') {
      g.fillStyle = '#2b343b';
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 64) {
        g.fillStyle = (y / 64) % 2 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.06)';
        g.fillRect(0, y, W, 64);
        g.fillStyle = 'rgba(10,14,18,.75)';
        g.fillRect(0, y, W, 2);
        g.fillStyle = 'rgba(120,150,168,.18)';
        g.fillRect(0, y + 2, W, 1);
      }
      for (let x = 0; x < W; x += 64) {
        g.fillStyle = 'rgba(10,14,18,.6)';
        g.fillRect(x, 0, 2, H);
      }
      for (let y = 32; y < H; y += 64) {
        for (let x = 32; x < W; x += 64) {
          g.fillStyle = 'rgba(130,158,174,.45)';
          g.beginPath();
          g.arc(x, y, 3.2, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(12,16,20,.6)';
          g.beginPath();
          g.arc(x, y, 1.3, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.strokeStyle = 'rgba(127,182,214,.08)';
      for (let i = -H; i < W; i += 64) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + H, H);
        g.stroke();
      }
      for (let i = 0; i < 1300; i++) {
        g.fillStyle = `rgba(160,180,195,${Math.random() * 0.05})`;
        g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
    } else if (kind === 'stone') {
      g.fillStyle = '#33251a';
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 128) {
        for (let x = 0; x < W; x += 128) {
          const t = 0.04 + Math.random() * 0.07;
          g.fillStyle = `rgba(${Math.random() < 0.5 ? '90,70,50' : '60,45,32'},${t})`;
          g.fillRect(x + 3, y + 3, 122, 122);
          g.strokeStyle = 'rgba(16,10,6,.65)';
          g.lineWidth = 3;
          g.strokeRect(x + 2, y + 2, 124, 124);
        }
      }
      for (let i = 0; i < 18; i++) {
        g.strokeStyle = 'rgba(10,7,4,.35)';
        g.lineWidth = 1;
        g.beginPath();
        let x = Math.random() * W;
        let y = Math.random() * H;
        g.moveTo(x, y);
        for (let s = 0; s < 6; s++) {
          x += (Math.random() - 0.5) * 70;
          y += (Math.random() - 0.5) * 70;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(20,13,8,${Math.random() * 0.08})`;
        g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
    } else {
      g.fillStyle = '#181420';
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 96) {
        for (let x = 0; x < W; x += 96) {
          g.fillStyle = `rgba(${40 + Math.random() * 16},${34 + Math.random() * 12},${56 + Math.random() * 18},.35)`;
          g.fillRect(x + 2, y + 2, 92, 92);
          g.strokeStyle = 'rgba(6,5,10,.7)';
          g.lineWidth = 2;
          g.strokeRect(x + 1, y + 1, 94, 94);
        }
      }
      g.strokeStyle = 'rgba(138,96,180,.12)';
      g.lineWidth = 2;
      for (let r = 40; r <= 200; r += 40) {
        g.beginPath();
        g.arc(256, 256, r, 0, Math.PI * 2);
        g.stroke();
      }
      for (let i = 0; i < 10; i++) {
        g.strokeStyle = 'rgba(160,40,50,.14)';
        g.beginPath();
        let x = Math.random() * W;
        let y = Math.random() * H;
        g.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          x += (Math.random() - 0.5) * 110;
          y += (Math.random() - 0.5) * 110;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      for (let i = 0; i < 1200; i++) {
        g.fillStyle = `rgba(150,130,180,${Math.random() * 0.04})`;
        g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
    }
  });
  const reps = { wood: [4.5, 3.4], metal: [12, 9], stone: [6, 4.5], dark: [6, 4.5] };
  const r = reps[kind] || reps.wood;
  tex.repeat.set(r[0], r[1]);
  return tex;
}

function makePlasterTexture() {
  const tex = canvasTexture(256, 256, (g, W, H) => {
    g.fillStyle = '#b8b2a8';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      const v = Math.random();
      g.fillStyle = v < 0.5 ? `rgba(40,34,28,${Math.random() * 0.09})` : `rgba(255,250,240,${Math.random() * 0.05})`;
      g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    for (let i = 0; i < 8; i++) {
      g.strokeStyle = `rgba(50,40,30,${0.04 + Math.random() * 0.05})`;
      g.lineWidth = 1;
      g.beginPath();
      let x = Math.random() * W;
      g.moveTo(x, 0);
      for (let y = 0; y <= H; y += 32) g.lineTo(x + Math.sin(y / 20) * 3, y);
      g.stroke();
    }
  });
  tex.repeat.set(7, 4);
  return tex;
}

function makePaintingTexture() {
  return canvasTexture(512, 384, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#5a4a32');
    grad.addColorStop(1, '#241c12');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(226,192,106,.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.arc(W * 0.28, H * 0.55, 30 + i * 17, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = 'rgba(200,162,74,.5)';
    g.beginPath();
    g.moveTo(0, H * 0.72);
    for (let x = 0; x <= W; x += 32) g.lineTo(x, H * 0.72 + Math.sin(x / 48) * 12);
    g.stroke();
    g.fillStyle = 'rgba(18,14,9,.55)';
    g.fillRect(W * 0.58, H * 0.2, W * 0.32, H * 0.5);
    g.strokeStyle = 'rgba(226,192,106,.55)';
    g.strokeRect(W * 0.58, H * 0.2, W * 0.32, H * 0.5);
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(W * 0.6, H * (0.26 + i * 0.07));
      g.lineTo(W * 0.88, H * (0.26 + i * 0.07));
      g.stroke();
    }
    g.fillStyle = 'rgba(200,162,74,.6)';
    g.beginPath();
    g.arc(W * 0.18, H * 0.25, 8, 0, Math.PI * 2);
    g.fill();
  });
}

function makeBlueprintTexture() {
  return canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = '#1d3546';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(170,214,240,.22)';
    g.lineWidth = 1;
    for (let i = 0; i <= W; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, H);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(W, i);
      g.stroke();
    }
    g.strokeStyle = 'rgba(200,230,255,.5)';
    g.lineWidth = 2;
    for (let i = 0; i <= W; i += 128) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, H);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(W, i);
      g.stroke();
    }
    g.strokeStyle = 'rgba(210,238,255,.7)';
    g.strokeRect(90, 130, 210, 150);
    g.strokeRect(130, 170, 130, 70);
    g.beginPath();
    g.arc(360, 320, 70, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(380, 300);
    g.lineTo(460, 240);
    g.stroke();
    g.strokeStyle = 'rgba(200,230,255,.35)';
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(60, 360 + i * 10);
      g.lineTo(200 + i * 18, 360 + i * 10);
      g.stroke();
    }
  });
}

export async function init3D({ container, books, floors, shelfConfig = {}, onOpenBook }) {
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
  renderer.toneMappingExposure = 1.7;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x171009);
  scene.fog = new THREE.Fog(0x171009, 12, 48);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 95);
  camera.rotation.order = 'YXZ';
  // 第一人称：WASD 移动 + 鼠标拖拽转视角
  const player = {
    pos: new THREE.Vector3(0, 1.68, 9.1),
    yaw: 0, pitch: -0.03, tYaw: 0, tPitch: -0.03,
  };
  const keys = { w: false, a: false, s: false, d: false };

  // 书架容量：内容配置决定每组书架能放多少本，组数由实际书数动态推导
  const booksPerBoard = Math.max(1, Number(shelfConfig.booksPerBoard) || 3);
  const boardsPerUnit = Math.min(BOARD_Y.length, Math.max(1, Number(shelfConfig.boardsPerUnit) || 2));
  const perUnit = booksPerBoard * boardsPerUnit;
  const SHELF_UNITS = layoutShelves(books.length, perUnit);

  // ---------- 灯光 ----------
  const ambient = new THREE.AmbientLight(0x7a6a52, 2.2);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x9a8a6a, 0x3a2f22, 1.6);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe3b0, 2.2);
  key.position.set(4.5, 8.5, 7.5);
  scene.add(key);

  // 书架灯：照亮书脊（只保留 2 盏，控制灯数）
  const shelfLights = [];
  for (const u of SHELF_UNITS.slice(0, 2)) {
    const lamp = new THREE.PointLight(0xffc37a, 0.95, 8, 2);
    lamp.position.set(u.x, 3.3, u.z + 1.05);
    scene.add(lamp);
    shelfLights.push(lamp);
  }

  const spot = new THREE.SpotLight(0xffd9a0, 5.4, 0, 0.62, 0.5, 1.15);
  spot.position.set(CHANDELIER_POS.x, CHANDELIER_POS.y, CHANDELIER_POS.z);
  spot.target.position.set(0, 0.6, CHANDELIER_POS.z);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0005;
  scene.add(spot);
  scene.add(spot.target);

  // 楼层主题光（颜色随楼层变化）
  const accent = new THREE.PointLight(0xffc37a, 0.9, 20, 2);
  accent.position.set(0, 6.4, 2.4);
  scene.add(accent);

  // 壁灯 / 落地灯共 6 个补光灯（随楼层换色，固定灯数避免 shader 重编译）
  const wallLights = [];
  for (const [sx, sz] of SCONCE_POS) {
    const l = new THREE.PointLight(0xffb066, 1.05, 9, 2);
    l.position.set(sx * (ROOM.sideX - 0.7), 3.65, sz);
    scene.add(l);
    wallLights.push(l);
  }
  for (const [fx, fz] of FLOOR_LAMP_POS) {
    const l = new THREE.PointLight(0xffc37a, 1.25, 9, 2);
    l.position.set(fx, 1.85, fz);
    scene.add(l);
    wallLights.push(l);
  }
  // 机密层警示灯（常态关闭，L4 脉冲）
  const beaconLight = new THREE.PointLight(0xff2a2a, 0, 10, 2);
  beaconLight.position.set(8.6, 2.6, 3.2);
  scene.add(beaconLight);

  // ---------- 房间 ----------
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x523a24, roughness: 0.82, metalness: 0.05 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.75, metalness: 0.06 });

  // 每层地面材质：木纹 / 金属格栅 / 石纹 / 暗石（CanvasTexture 程序化）
  const floorTexCache = {};
  const floorMats = {};
  const floorKind = { all: 'wood', L1: 'wood', L2: 'metal', L3: 'stone', L4: 'dark' };
  for (const fid of Object.keys(floorKind)) {
    const kind = floorKind[fid];
    if (!floorTexCache[kind]) floorTexCache[kind] = makeFloorTexture(kind);
    floorMats[fid] = new THREE.MeshStandardMaterial({
      map: floorTexCache[kind],
      roughness: kind === 'metal' ? 0.42 : kind === 'dark' ? 0.78 : 0.9,
      metalness: kind === 'metal' ? 0.38 : 0.04,
    });
  }

  // 每层墙面材质：同一张灰泥贴图，颜色/粗糙度/金属度不同
  const plasterTex = makePlasterTexture();
  const wallHex = { all: 0x342a20, L1: 0x3f3021, L2: 0x2b3740, L3: 0x3a2c1e, L4: 0x2a2436 };
  const wallMats = {};
  for (const fid of Object.keys(wallHex)) {
    wallMats[fid] = new THREE.MeshStandardMaterial({
      color: wallHex[fid], map: plasterTex,
      roughness: fid === 'L2' ? 0.6 : 0.92,
      metalness: fid === 'L2' ? 0.28 : 0.03,
    });
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), floorMats.all);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const rugMat = new THREE.MeshStandardMaterial({ color: 0x5a3520, roughness: 0.95 });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 6.3), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.5, 0.012, 2.8);
  rug.receiveShadow = true;
  scene.add(rug);

  const wallMeshes = [];
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.h), wallMats.all);
  backWall.position.set(0, ROOM.h / 2, ROOM.backZ);
  backWall.receiveShadow = true;
  scene.add(backWall);
  wallMeshes.push(backWall);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.d, ROOM.h), wallMats.all);
    side.rotation.y = sx * Math.PI / 2;
    side.position.set(sx * ROOM.sideX, ROOM.h / 2, 0);
    side.receiveShadow = true;
    scene.add(side);
    wallMeshes.push(side);
  }
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 1 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.h;
  scene.add(ceiling);

  // 踢脚线
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.7, metalness: 0.15 });
  const baseBack = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.22, 0.12), trimMat);
  baseBack.position.set(0, 0.11, ROOM.backZ + 0.06);
  scene.add(baseBack);
  for (const sx of [-1, 1]) {
    const baseSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 17.3), trimMat);
    baseSide.position.set(sx * (ROOM.sideX - 0.06), 0.11, 1.8);
    scene.add(baseSide);
  }

  // 墙面挂画（共用一张程序化画布，边框随楼层换色）
  const paintingTex = makePaintingTexture();
  const paintingFrameMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, roughness: 0.4, metalness: 0.6 });
  const paintingMat = new THREE.MeshStandardMaterial({ map: paintingTex, color: 0xd8c090, roughness: 0.85 });
  function addPainting(x, y, z, rotY, w, h) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.08), paintingFrameMat);
    g.add(frame);
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paintingMat);
    canvas.position.z = 0.05;
    g.add(canvas);
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    scene.add(g);
  }
  addPainting(ROOM.sideX - 0.08, 4.6, -0.4, -Math.PI / 2, 1.5, 1.05);
  addPainting(-ROOM.sideX + 0.08, 4.9, 2.6, Math.PI / 2, 1.25, 0.9);
  addPainting(0, 5.7, ROOM.backZ + 0.04, 0, 1.7, 1.15);

  // ---------- 书架 ----------
  // 共享几何：立柱 / 层板 / 檐口 / 铜边
  const shelfPostGeo = new THREE.BoxGeometry(0.1, 3.3, 0.52);
  const shelfBoardGeo = new THREE.BoxGeometry(3.1, 0.06, 0.48);
  const shelfTopGeo = new THREE.BoxGeometry(3.2, 0.09, 0.54);
  const shelfPlinthGeo = new THREE.BoxGeometry(3.2, 0.14, 0.56);
  const shelfBackGeo = new THREE.BoxGeometry(3.1, 3.0, 0.03);
  const shelfCapGeo = new THREE.BoxGeometry(0.18, 0.14, 0.58);
  const shelfFluteGeo = new THREE.BoxGeometry(0.045, 2.9, 0.04);
  const shelfCorniceGeo = new THREE.BoxGeometry(3.42, 0.13, 0.64);
  const shelfCorniceTopGeo = new THREE.BoxGeometry(3.54, 0.07, 0.7);
  const shelfEdgeGeo = new THREE.BoxGeometry(3.12, 0.018, 0.018);
  const shelfEdgeMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, roughness: 0.35, metalness: 0.7 });
  const shelfRedMat = new THREE.LineBasicMaterial({ color: 0x8a2626, transparent: true, opacity: 0.5 });

  function createShelf(unit) {
    const g = new THREE.Group();
    for (const px of [-1.52, 1.52]) {
      const post = new THREE.Mesh(shelfPostGeo, wood);
      post.position.set(px, 1.65, 0);
      post.castShadow = true;
      g.add(post);
      // 立柱细节：上下柱头 + 正面凹槽
      for (const cy of [0.18, 3.16]) {
        const cap = new THREE.Mesh(shelfCapGeo, woodDark);
        cap.position.set(px, cy, 0);
        g.add(cap);
      }
      const flute = new THREE.Mesh(shelfFluteGeo, woodDark);
      flute.position.set(px, 1.68, 0.265);
      g.add(flute);
    }
    for (const by of BOARD_Y) {
      const board = new THREE.Mesh(shelfBoardGeo, wood);
      board.position.set(0, by, 0);
      board.castShadow = true;
      board.receiveShadow = true;
      g.add(board);
      // 层板铜边
      const edge = new THREE.Mesh(shelfEdgeGeo, shelfEdgeMat);
      edge.position.set(0, by + 0.038, 0.238);
      g.add(edge);
    }
    const top = new THREE.Mesh(shelfTopGeo, wood);
    top.position.set(0, 3.3, 0);
    top.castShadow = true;
    g.add(top);
    const plinth = new THREE.Mesh(shelfPlinthGeo, woodDark);
    plinth.position.set(0, 0.07, 0);
    g.add(plinth);
    const backPanel = new THREE.Mesh(shelfBackGeo, woodDark);
    backPanel.position.set(0, 1.6, -0.23);
    g.add(backPanel);
    // 顶部檐口 + 压顶
    const cornice = new THREE.Mesh(shelfCorniceGeo, woodDark);
    cornice.position.set(0, 3.4, 0);
    cornice.castShadow = true;
    g.add(cornice);
    const corniceTop = new THREE.Mesh(shelfCorniceTopGeo, shelfEdgeMat);
    corniceTop.position.set(0, 3.5, 0);
    g.add(corniceTop);
    // 红线：书架层板上的细红丝（关系网氛围）
    for (const by of BOARD_Y) {
      const lg = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.52, by + 0.065, 0.245),
        new THREE.Vector3(1.52, by + 0.065, 0.245),
      ]);
      g.add(new THREE.Line(lg, shelfRedMat));
    }
    for (let i = 0; i < BOARD_Y.length - 1; i++) {
      const lg = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.46, BOARD_Y[i] + 0.065, 0.245),
        new THREE.Vector3(1.46, BOARD_Y[i + 1] + 0.065, 0.245),
      ]);
      g.add(new THREE.Line(lg, shelfRedMat));
    }
    g.position.set(unit.x, 0, unit.z);
    scene.add(g);
    return g;
  }
  for (const u of SHELF_UNITS) createShelf(u);

  // ---------- 书 ----------
  const bookItems = [];
  books.forEach((book, i) => {
    const unitIdx = i % SHELF_UNITS.length;
    const slot = Math.floor(i / SHELF_UNITS.length); // 0..perUnit-1
    const unit = SHELF_UNITS[unitIdx];
    const board = Math.floor(slot / booksPerBoard);
    const pos = slot % booksPerBoard;
    const level = (BOARD_Y[board] ?? BOARD_Y[BOARD_Y.length - 1]) + 0.03;
    const sx = (pos - (booksPerBoard - 1) / 2) * 0.72;
    const basePos = new THREE.Vector3(unit.x + sx, level + BOOK_H / 2 + 0.004, unit.z + 0.05);
    const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (Math.random() - 0.5) * 0.08, 0));

    const baseColor = new THREE.Color(book.color || '#4a3a2e');
    const sideMat = new THREE.MeshStandardMaterial({
      color: baseColor.clone().multiplyScalar(0.78),
      roughness: 0.7, metalness: 0.05,
    });
    const spineMat = new THREE.MeshStandardMaterial({
      map: spineTexture(book), roughness: 0.62, metalness: 0.05,
      emissive: baseColor.clone().multiplyScalar(0.25), emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, BOOK_H, 0.40), [sideMat, sideMat, sideMat, sideMat, spineMat, sideMat]);
    mesh.position.copy(basePos);
    mesh.quaternion.copy(baseQuat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // 楼层个性：L2 蓝图带 / L3 账签 / L4 封蜡
    if (book.floor === 'L2') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.228, 0.035, 0.408), new THREE.MeshStandardMaterial({ color: 0x7fb6d6, emissive: 0x2a4a5a, emissiveIntensity: 0.45 }));
      band.position.y = 0.18;
      mesh.add(band);
    } else if (book.floor === 'L3') {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0xd8b45a, metalness: 0.55, roughness: 0.35 }));
      tag.position.set(0.02, 0.02, 0.21);
      mesh.add(tag);
    } else if (book.floor === 'L4') {
      const seal = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6a4a86, emissive: 0x3a2460, emissiveIntensity: 0.55 }));
      seal.position.set(0, -0.18, 0.21);
      mesh.add(seal);
    }
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
  elevator.position.set(-12.8, 0, -0.6);
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
  ring.position.y = 0.84;
  starTable.add(ring);

  // 星盘：Canvas 绘制的同心圆、刻度与星图连线
  const chartCanvas = document.createElement('canvas');
  chartCanvas.width = 1024;
  chartCanvas.height = 1024;
  const g2d = chartCanvas.getContext('2d');
  g2d.fillStyle = '#241a10';
  g2d.fillRect(0, 0, 1024, 1024);
  g2d.strokeStyle = 'rgba(200,162,74,.55)';
  g2d.lineWidth = 2;
  for (let i = 1; i <= 4; i++) {
    g2d.beginPath();
    g2d.arc(512, 512, i * 112, 0, Math.PI * 2);
    g2d.stroke();
  }
  for (let i = 0; i < 72; i++) {
    const a = i * Math.PI / 36;
    const r1 = 470;
    const r2 = i % 6 === 0 ? 428 : 450;
    g2d.beginPath();
    g2d.moveTo(512 + Math.cos(a) * r1, 512 + Math.sin(a) * r1);
    g2d.lineTo(512 + Math.cos(a) * r2, 512 + Math.sin(a) * r2);
    g2d.stroke();
  }
  const chartPts = [];
  g2d.fillStyle = '#e2c06a';
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39;
    const r = 120 + ((i * 37) % 330);
    const x = 512 + Math.cos(a) * r;
    const y = 512 + Math.sin(a) * r;
    chartPts.push([x, y]);
    g2d.beginPath();
    g2d.arc(x, y, 3.5, 0, Math.PI * 2);
    g2d.fill();
  }
  g2d.strokeStyle = 'rgba(200,162,74,.4)';
  for (let i = 0; i < chartPts.length - 1; i++) {
    g2d.beginPath();
    g2d.moveTo(chartPts[i][0], chartPts[i][1]);
    g2d.lineTo(chartPts[i + 1][0], chartPts[i + 1][1]);
    g2d.stroke();
  }
  const chartTex = new THREE.CanvasTexture(chartCanvas);
  chartTex.anisotropy = 4;
  const chart = new THREE.Mesh(
    new THREE.CircleGeometry(0.86, 64),
    new THREE.MeshStandardMaterial({ map: chartTex, roughness: 0.55, metalness: 0.25 })
  );
  chart.rotation.x = -Math.PI / 2;
  chart.position.y = 0.795;
  starTable.add(chart);

  const starDots = [];
  for (let d = 0; d < 10; d++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xc8a24a, emissiveIntensity: 0.9 }));
    const a = (d / 10) * Math.PI * 2;
    const rr = 0.2 + (d % 3) * 0.22;
    dot.position.set(Math.cos(a) * rr, 0.81, Math.sin(a) * rr);
    starTable.add(dot);
    starDots.push(dot);
  }

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xc8a24a, emissive: 0xc8a24a, emissiveIntensity: 0.85, transparent: true, opacity: 0.92, roughness: 0.3 })
  );
  orb.position.y = 1.02;
  starTable.add(orb);

  // 三层倾斜铜环 + 玻璃穹顶 + 环绕星点
  const hoopMat = new THREE.MeshStandardMaterial({ color: 0xc8a24a, metalness: 0.7, roughness: 0.25, emissive: 0x5a4520, emissiveIntensity: 0.25 });
  [[0.36, Math.PI / 2, 0.2], [0.3, 0.5, 0.9], [0.26, 1.2, 0.3]].forEach(([r, rx, rz]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 12, 64), hoopMat);
    m.position.y = 1.02;
    m.rotation.x = rx;
    m.rotation.z = rz;
    starTable.add(m);
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x9fc8e0, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide })
  );
  dome.position.y = 1.02;
  starTable.add(dome);
  const domeWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(0.442, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
    new THREE.LineBasicMaterial({ color: 0x6f9fb8, transparent: true, opacity: 0.22 })
  );
  domeWire.position.y = 1.02;
  starTable.add(domeWire);
  const orbitDots = [];
  for (let d = 0; d < 12; d++) {
    const a = (d / 12) * Math.PI * 2;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xc8a24a, emissiveIntensity: 1 })
    );
    dot.position.set(Math.cos(a) * 0.44, 1.02 + Math.sin(a * 1.5) * 0.12, Math.sin(a) * 0.44);
    starTable.add(dot);
    orbitDots.push(dot);
  }

  starTable.position.set(0.4, 0, 0.9);
  scene.add(starTable);

  // ---------- 散落的域外残页（不在书里） ----------
  const fragPapers = [];
  const fragMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, emissive: 0x8a6320, emissiveIntensity: 0.22, side: THREE.DoubleSide });
  [[-8.8, 0.02, 5.2, -0.5], [9.6, 0.02, -3.8, 0.7]].forEach(([x, y, z, rz]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46), fragMat);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = rz;
    p.position.set(x, y, z);
    scene.add(p);
    fragPapers.push(p);
  });

  // ---------- 卡片目录柜 ----------
  const cabinet = new THREE.Group();
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 0.55), woodDark);
  cabBody.position.y = 1.0;
  cabBody.castShadow = true;
  cabinet.add(cabBody);
  const drawerMat = new THREE.MeshStandardMaterial({ color: 0x45301c, roughness: 0.6 });
  const drawGeo = new THREE.BoxGeometry(0.62, 0.34, 0.04);
  const cabinetDrawers = [];
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 2; col++) {
      const dr = new THREE.Mesh(drawGeo, drawerMat);
      dr.position.set(-0.34 + col * 0.68, 0.55 + r * 0.42, 0.29);
      dr.userData.closedZ = 0.29;
      dr.userData.open = false;
      cabinet.add(dr);
      cabinetDrawers.push(dr);
      const label = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.01), new THREE.MeshStandardMaterial({ color: 0xc8a24a, metalness: 0.5, roughness: 0.4 }));
      label.position.set(-0.34 + col * 0.68, 0.58 + r * 0.42, 0.315);
      cabinet.add(label);
    }
  }
  cabinet.position.set(10.5, 0, 2.4);
  cabinet.rotation.y = -0.35;
  scene.add(cabinet);

  // ---------- 可互动道具：台灯 / 放大镜 / 抽屉 / 隐藏书 ----------
  const lampLight = new THREE.PointLight(0xffc873, 1.6, 7, 1.5);
  lampLight.position.set(2.6, 1.32, 2.6);
  scene.add(lampLight);
  const lampGroup = new THREE.Group();
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.05, 20), brassDark);
  lampBase.position.y = 0.025;
  lampGroup.add(lampBase);
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 10), brassMat);
  lampPole.position.y = 0.38;
  lampGroup.add(lampPole);
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.2, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xd8b45a, emissive: 0xffc873, emissiveIntensity: 0.55, side: THREE.DoubleSide, roughness: 0.5 })
  );
  lampShade.position.y = 0.84;
  lampShade.rotation.x = Math.PI;
  lampGroup.add(lampShade);
  lampGroup.position.set(2.6, 0, 2.6);
  scene.add(lampGroup);
  let lampOn = true;
  function toggleLamp() {
    lampOn = !lampOn;
    lampLight.intensity = lampOn ? 1.6 : 0;
    lampShade.material.emissiveIntensity = lampOn ? 0.55 : 0.05;
    toast(lampOn ? '台灯亮了。' : '台灯灭了，书脊上的烫金字看不清了。');
    if (window.mmAudioPlay) window.mmAudioPlay('step');
  }

  const zoomGroup = new THREE.Group();
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 10, 32), brassMat);
  const lensGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide })
  );
  zoomGroup.add(lensRing, lensGlass);
  const zoomHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.26, 10), brassDark);
  zoomHandle.position.set(0.16, -0.2, 0);
  zoomHandle.rotation.z = -0.9;
  zoomGroup.add(zoomHandle);
  zoomGroup.position.set(10.5, 2.17, 2.45);
  zoomGroup.rotation.x = -0.7;
  zoomGroup.rotation.y = -0.35;
  scene.add(zoomGroup);

  const hiddenBook = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.62, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x120f0c, emissive: 0x6a1a1a, emissiveIntensity: 0.35, roughness: 0.85 })
  );
  hiddenBook.position.set(0.6, 0.35, 7.4);
  hiddenBook.rotation.y = 0.18;
  hiddenBook.visible = false;
  scene.add(hiddenBook);

  // ---------- 各层专属陈设（切层显示） ----------
  const propGroups = {};
  const propMats = {
    paper: new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }),
    parchment: new THREE.MeshStandardMaterial({ color: 0xd8c49a, roughness: 0.95, side: THREE.DoubleSide }),
    blue: new THREE.MeshStandardMaterial({ color: 0x7fb6d6, roughness: 0.6 }),
    ledger: new THREE.MeshStandardMaterial({ color: 0x3a4a34, roughness: 0.8 }),
    wax: new THREE.MeshStandardMaterial({ color: 0xd8c89e, roughness: 0.5 }),
    flame: new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffa040, emissiveIntensity: 1.3 }),
    violetFlame: new THREE.MeshStandardMaterial({ color: 0xd8c8ff, emissive: 0x9a6aff, emissiveIntensity: 1.2 }),
    drape: new THREE.MeshStandardMaterial({ color: 0x241c33, roughness: 1, side: THREE.DoubleSide }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2c2a33, roughness: 0.52, metalness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x77858f, roughness: 0.36, metalness: 0.75 }),
    steelShade: new THREE.MeshStandardMaterial({ color: 0x8fa4b2, roughness: 0.4, metalness: 0.6, emissive: 0x1d4a66, emissiveIntensity: 0.3, side: THREE.DoubleSide }),
    carpet: new THREE.MeshStandardMaterial({ color: 0x461b18, roughness: 1 }),
    redSeal: new THREE.MeshStandardMaterial({ color: 0x7a1a1a, roughness: 0.48 }),
    redGlow: new THREE.MeshStandardMaterial({ color: 0xff4040, emissive: 0xff1010, emissiveIntensity: 1.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.24, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide }),
  };
  const shadeWarmMat = new THREE.MeshStandardMaterial({ color: 0xe8c07a, emissive: 0xffa040, emissiveIntensity: 0.8, side: THREE.DoubleSide, roughness: 0.5 });
  const shadeCoolMat = new THREE.MeshStandardMaterial({ color: 0xa8cff0, emissive: 0x3a7ab0, emissiveIntensity: 0.85, side: THREE.DoubleSide, roughness: 0.45 });
  const shadeAmberMat = new THREE.MeshStandardMaterial({ color: 0xd8a85a, emissive: 0xff8a30, emissiveIntensity: 0.85, side: THREE.DoubleSide, roughness: 0.5 });
  const shadeRedMat = new THREE.MeshStandardMaterial({ color: 0xc05a5a, emissive: 0xff2020, emissiveIntensity: 1.0, side: THREE.DoubleSide, roughness: 0.55 });
  const blueprintMat = new THREE.MeshStandardMaterial({ map: makeBlueprintTexture(), roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide });

  function makePropGroup(name) {
    const g = new THREE.Group();
    g.name = name;
    g.visible = false;
    scene.add(g);
    return g;
  }

  // 共享几何缓存：避免重复创建相同尺寸的几何体
  const geoCache = new Map();
  function boxG(w, h, d) {
    const k = `b${w}|${h}|${d}`;
    let g = geoCache.get(k);
    if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
    return g;
  }
  function cylG(rt, rb, h, seg = 12, open = false) {
    const k = `c${rt}|${rb}|${h}|${seg}|${open ? 1 : 0}`;
    let g = geoCache.get(k);
    if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); geoCache.set(k, g); }
    return g;
  }
  function coneG(r, h, seg = 16) {
    const k = `k${r}|${h}|${seg}`;
    let g = geoCache.get(k);
    if (!g) { g = new THREE.ConeGeometry(r, h, seg, 1, true); geoCache.set(k, g); }
    return g;
  }
  function torusG(r, t, seg = 8, tSeg = 32) {
    const k = `t${r}|${t}|${seg}|${tSeg}`;
    let g = geoCache.get(k);
    if (!g) { g = new THREE.TorusGeometry(r, t, seg, tSeg); geoCache.set(k, g); }
    return g;
  }
  function sphereG(r, seg = 10) {
    const k = `s${r}|${seg}`;
    let g = geoCache.get(k);
    if (!g) { g = new THREE.SphereGeometry(r, seg, seg); geoCache.set(k, g); }
    return g;
  }
  function planeG(w, h) {
    const k = `p${w}|${h}`;
    let g = geoCache.get(k);
    if (!g) { g = new THREE.PlaneGeometry(w, h); geoCache.set(k, g); }
    return g;
  }
  function circleG(r, seg = 24) {
    const k = `o${r}|${seg}`;
    let g = geoCache.get(k);
    if (!g) { g = new THREE.CircleGeometry(r, seg); geoCache.set(k, g); }
    return g;
  }
  function put(parent, geo, mat, x, y, z, shadow = false) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (shadow) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    parent.add(m);
    return m;
  }

  function addTable(parent, x, z, w, d, topMat, legMat) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    parent.add(g);
    put(g, boxG(w, 0.1, d), topMat, 0, 0.76, 0, true);
    for (const lx of [-w / 2 + 0.14, w / 2 - 0.14]) {
      for (const lz of [-d / 2 + 0.14, d / 2 - 0.14]) {
        put(g, boxG(0.1, 0.72, 0.1), legMat, lx, 0.36, lz, true);
      }
    }
    return g;
  }

  function addChair(parent, x, z, rotY, mat) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    parent.add(g);
    put(g, boxG(0.5, 0.08, 0.5), mat, 0, 0.44, 0, true);
    for (const lx of [-0.2, 0.2]) {
      for (const lz of [-0.2, 0.2]) put(g, boxG(0.06, 0.44, 0.06), mat, lx, 0.22, lz);
    }
    put(g, boxG(0.5, 0.6, 0.06), mat, 0, 0.76, -0.22, true);
    return g;
  }

  // 壁灯（灯体随层切换，真实光源已固定在场中）
  function addSconce(parent, side, z, fixtureMat, shadeMat) {
    const wx = side * (ROOM.sideX - 0.12);
    put(parent, boxG(0.06, 0.36, 0.08), fixtureMat, wx, 3.45, z);
    put(parent, boxG(0.34, 0.05, 0.05), fixtureMat, wx - side * 0.16, 3.55, z);
    const shade = put(parent, cylG(0.1, 0.2, 0.24, 12, true), shadeMat, wx - side * 0.38, 3.66, z);
    shade.rotation.z = side * 0.18;
    put(parent, sphereG(0.05, 8), shadeMat, wx - side * 0.38, 3.72, z);
  }
  function buildSconces(parent, fixtureMat, shadeMat) {
    for (const [side, z] of SCONCE_POS) addSconce(parent, side, z, fixtureMat, shadeMat);
  }

  function addFloorLamp(parent, x, z, fixtureMat, shadeMat, kind) {
    put(parent, cylG(0.22, 0.26, 0.06, 16), fixtureMat, x, 0.03, z, true);
    put(parent, cylG(0.035, 0.035, 1.5, 8), fixtureMat, x, 0.78, z, true);
    if (kind === 'drum') {
      put(parent, cylG(0.3, 0.26, 0.34, 16, true), shadeMat, x, 1.62, z);
    } else if (kind === 'cage') {
      put(parent, cylG(0.28, 0.24, 0.4, 12, true), shadeMat, x, 1.62, z);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        put(parent, cylG(0.012, 0.012, 0.46, 6), fixtureMat, x + Math.cos(a) * 0.25, 1.62, z + Math.sin(a) * 0.25);
      }
    } else {
      put(parent, coneG(0.28, 0.34, 16), shadeMat, x, 1.66, z);
    }
    put(parent, sphereG(0.09, 10), shadeMat, x, 1.56, z);
  }

  // 主吊灯：每层不同造型，共用同一盏真实 SpotLight（避免灯数波动导致 shader 重编译）
  const volumeCones = [];
  const beacons = [];
  function buildChandelier(parent, style) {
    const ch = new THREE.Group();
    ch.position.set(CHANDELIER_POS.x, CHANDELIER_POS.y, CHANDELIER_POS.z);
    parent.add(ch);
    let coneColor = 0xffc37a;
    let coneOpacity = 0.065;
    const rodMat = style === 'L2' ? propMats.steel : style === 'L4' ? propMats.iron : brassDark;
    const rodLen = ROOM.h - CHANDELIER_POS.y;
    put(ch, cylG(0.05, 0.05, rodLen, 8), rodMat, 0, rodLen / 2, 0);
    if (style === 'L2') {
      // 金属方框 + 工业灯罩
      for (const dx of [-0.8, 0.8]) put(ch, boxG(0.07, 0.07, 1.7), propMats.steel, dx, -0.16, 0);
      for (const dz of [-0.8, 0.8]) put(ch, boxG(1.7, 0.07, 0.07), propMats.steel, 0, -0.16, dz);
      put(ch, cylG(0.78, 0.42, 0.42, 16, true), propMats.steelShade, 0, -0.03, 0);
      put(ch, sphereG(0.16, 12), shadeCoolMat, 0, -0.18, 0);
      coneColor = 0x8fc4ff;
      coneOpacity = 0.06;
    } else if (style === 'L4') {
      // 铁环 + 黑烛 + 悬链
      const ring = put(ch, torusG(0.9, 0.045, 8, 36), propMats.iron, 0, 0, 0);
      ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const link = put(ch, torusG(0.055, 0.014, 6, 10), propMats.iron, Math.cos(a) * 0.95, -0.1, Math.sin(a) * 0.95);
        link.rotation.x = i % 2 ? Math.PI / 2 : 0;
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = 0.72;
        put(ch, cylG(0.04, 0.05, 0.34, 8), propMats.iron, Math.cos(a) * r, 0.22, Math.sin(a) * r);
        put(ch, sphereG(0.045, 8), propMats.violetFlame, Math.cos(a) * r, 0.44, Math.sin(a) * r);
      }
      coneColor = 0x8a6aff;
      coneOpacity = 0.075;
    } else {
      // L1 / L3 / 大厅：黄铜环 + 蜡烛
      const ring = put(ch, torusG(style === 'L3' ? 0.95 : 1.0, 0.04, 8, 40), brassMat, 0, 0, 0);
      ring.rotation.x = Math.PI / 2;
      put(ch, sphereG(0.17, 12), brassMat, 0, -0.05, 0);
      if (style === 'L3') {
        put(ch, boxG(1.9, 0.06, 0.06), woodDark, 0, 0, 0);
        put(ch, boxG(0.06, 0.06, 1.9), woodDark, 0, 0, 0);
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = style === 'L3' ? 0.82 : 0.86;
        put(ch, cylG(0.035, 0.035, 0.34, 8), propMats.wax, Math.cos(a) * r, 0.22, Math.sin(a) * r);
        put(ch, sphereG(0.045, 8), propMats.flame, Math.cos(a) * r, 0.44, Math.sin(a) * r);
      }
      coneColor = style === 'L3' ? 0xffb066 : 0xffc37a;
      coneOpacity = style === 'L3' ? 0.065 : 0.07;
    }
    // 体积光锥：Additive + 低透明度 + 不写深度
    const coneH = CHANDELIER_POS.y - 0.6;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.25, coneH, 28, 1, true),
      new THREE.MeshBasicMaterial({
        color: coneColor, transparent: true, opacity: coneOpacity,
        depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      })
    );
    cone.position.y = -coneH / 2;
    cone.rotation.z = 0.04;
    ch.add(cone);
    volumeCones.push({ mesh: cone, base: coneOpacity, phase: volumeCones.length * 1.6, spin: style === 'L4' ? 0.05 : 0.03 });
    return ch;
  }

  // ===== L1 旧纸层 =====
  const p1 = makePropGroup('prop-L1');
  buildChandelier(p1, 'L1');
  buildSconces(p1, brassDark, shadeWarmMat);
  addFloorLamp(p1, FLOOR_LAMP_POS[0][0], FLOOR_LAMP_POS[0][1], brassDark, shadeWarmMat, 'cone');
  addFloorLamp(p1, FLOOR_LAMP_POS[1][0], FLOOR_LAMP_POS[1][1], brassDark, shadeWarmMat, 'cone');
  // 旧纸堆
  for (const [sx, sz] of [[-9.6, 0.6], [-8.9, 1.2], [8.4, -1.2]]) {
    for (let i = 0; i < 5; i++) {
      const box = put(p1, boxG(0.64, 0.08, 0.48), propMats.paper, sx + (i % 3 - 1) * 0.05, 0.05 + i * 0.075, sz + (i % 2 - 0.5) * 0.06, true);
      box.rotation.y = (i - 2) * 0.06;
    }
  }
  // 卷轴
  for (let i = 0; i < 3; i++) {
    const roll = put(p1, cylG(0.08, 0.08, 1.3, 12), propMats.parchment, -10.7 + i * 0.18, 0.1 + i * 0.14, 4.6 - i * 0.12, true);
    roll.rotation.z = Math.PI / 2;
    roll.rotation.y = 0.18 * i;
  }
  // 长木桌 + 两把椅子
  const t1 = addTable(p1, -3.4, 5.0, 4.2, 1.3, wood, woodDark);
  addChair(p1, -5.95, 5.0, -Math.PI / 2, woodDark);
  addChair(p1, -0.85, 5.0, Math.PI / 2, woodDark);
  put(t1, boxG(0.6, 0.06, 0.44), propMats.paper, -0.8, 0.84, 0);
  put(t1, boxG(0.55, 0.05, 0.4), propMats.paper, -0.74, 0.89, 0.03);
  // 放大镜桌
  const t2 = addTable(p1, 4.4, 3.4, 1.9, 0.9, wood, woodDark);
  const mag = new THREE.Group();
  mag.position.set(0.1, 0.88, 0.05);
  mag.rotation.x = -1.0;
  t2.add(mag);
  put(mag, torusG(0.15, 0.014, 8, 24), brassMat, 0, 0, 0);
  put(mag, circleG(0.135, 24), propMats.glass, 0, 0, 0.006);
  put(mag, cylG(0.012, 0.016, 0.3, 8), brassDark, 0, -0.3, 0);
  // 长凳
  const bench = new THREE.Group();
  bench.position.set(9.2, 0, 6.4);
  p1.add(bench);
  put(bench, boxG(2.4, 0.08, 0.5), wood, 0, 0.45, 0, true);
  for (const lx of [-1.0, 1.0]) put(bench, boxG(0.1, 0.45, 0.44), woodDark, lx, 0.22, 0);

  // ===== L2 蓝图工坊 =====
  const p2 = makePropGroup('prop-L2');
  buildChandelier(p2, 'L2');
  buildSconces(p2, propMats.steel, shadeCoolMat);
  addFloorLamp(p2, FLOOR_LAMP_POS[0][0], FLOOR_LAMP_POS[0][1], propMats.steel, shadeCoolMat, 'drum');
  addFloorLamp(p2, FLOOR_LAMP_POS[1][0], FLOOR_LAMP_POS[1][1], propMats.steel, shadeCoolMat, 'drum');
  // 蓝图桌 + 图纸
  const bt = addTable(p2, 3.2, 4.8, 2.6, 1.4, propMats.steel, propMats.steel);
  const sheet = put(bt, planeG(2.2, 1.15), blueprintMat, 0, 0.825, 0, true);
  sheet.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const roll = put(bt, cylG(0.08, 0.08, 1.1, 12), propMats.blue, -0.7 + i * 0.3, 0.92, 0.5);
    roll.rotation.z = Math.PI / 2;
    roll.rotation.y = 0.1 * i;
  }
  // 工具墙：扳手 / 尺规 / 齿轮
  const tw = new THREE.Group();
  tw.position.set(ROOM.sideX - 0.14, 2.8, -0.6);
  tw.rotation.y = -Math.PI / 2;
  p2.add(tw);
  put(tw, boxG(2.6, 1.8, 0.1), woodDark, 0, 0, 0, true);
  put(tw, boxG(2.7, 0.08, 0.14), propMats.steel, 0, 0.94, 0);
  const wrench = new THREE.Group();
  wrench.position.set(-0.7, 0.15, 0.08);
  wrench.rotation.z = 0.55;
  tw.add(wrench);
  put(wrench, boxG(0.08, 0.8, 0.035), propMats.steel, 0, 0, 0);
  put(wrench, boxG(0.22, 0.1, 0.035), propMats.steel, 0, 0.42, 0);
  put(wrench, boxG(0.22, 0.1, 0.035), propMats.steel, 0, -0.42, 0);
  const ruler = put(tw, boxG(1.6, 0.14, 0.035), propMats.steel, 0.5, -0.55, 0.08);
  ruler.rotation.z = -0.1;
  for (let i = 0; i < 8; i++) put(tw, boxG(0.02, i % 2 ? 0.06 : 0.09, 0.045), propMats.iron, -0.23 + i * 0.2, -0.5, 0.095);
  const gear = put(tw, torusG(0.2, 0.045, 8, 20), propMats.steel, 0.55, 0.35, 0.09);
  gear.rotation.z = 0.3;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.3;
    const spoke = put(tw, boxG(0.34, 0.03, 0.03), propMats.steel, 0.55, 0.35, 0.09);
    spoke.rotation.z = a;
  }
  // 梯子
  const ladder = new THREE.Group();
  ladder.position.set(11.8, 1.6, 4.6);
  ladder.rotation.y = -0.3;
  ladder.rotation.z = -0.16;
  p2.add(ladder);
  for (const lx of [-0.34, 0.34]) put(ladder, boxG(0.08, 3.2, 0.08), propMats.steel, lx, 0, 0, true);
  for (let i = 0; i < 7; i++) put(ladder, boxG(0.76, 0.05, 0.05), propMats.steel, 0, -1.4 + i * 0.46, 0);
  // 钢架
  const scaffold = new THREE.Group();
  scaffold.position.set(-11.6, 0, -1.0);
  p2.add(scaffold);
  for (const sx of [-0.8, 0.8]) put(scaffold, boxG(0.1, 3.2, 0.1), propMats.steel, sx, 1.6, 0, true);
  for (const sy of [0.3, 1.6, 3.05]) put(scaffold, boxG(1.8, 0.08, 0.08), propMats.steel, 0, sy, 0);
  put(scaffold, boxG(1.9, 0.08, 0.7), woodDark, 0, 1.62, 0.1, true);
  // 工作台 + 工具箱 / 管件
  const wb = addTable(p2, -10.6, 2.4, 2.2, 1.0, propMats.steel, propMats.steel);
  put(wb, boxG(0.7, 0.4, 0.4), propMats.iron, -0.5, 0.99, 0, true);
  put(wb, boxG(0.18, 0.12, 0.3), propMats.steel, 0.4, 1.04, 0);
  for (let i = 0; i < 3; i++) {
    const pipe = put(wb, cylG(0.06, 0.06, 0.8, 10), propMats.steel, 0.5, 0.88, -0.25 + i * 0.18);
    pipe.rotation.z = Math.PI / 2;
  }

  // ===== L3 账房 =====
  const p3 = makePropGroup('prop-L3');
  buildChandelier(p3, 'L3');
  buildSconces(p3, brassDark, shadeAmberMat);
  addFloorLamp(p3, FLOOR_LAMP_POS[0][0], FLOOR_LAMP_POS[0][1], brassDark, shadeAmberMat, 'cone');
  addFloorLamp(p3, FLOOR_LAMP_POS[1][0], FLOOR_LAMP_POS[1][1], brassDark, shadeAmberMat, 'cone');
  // 账桌 + 铜秤 + 算盘
  const desk = addTable(p3, -3.4, 4.6, 3.2, 1.4, wood, woodDark);
  const scale = new THREE.Group();
  scale.position.set(-0.8, 0.82, 0);
  desk.add(scale);
  put(scale, cylG(0.22, 0.28, 0.06, 16), brassDark, 0, 0.03, 0, true);
  put(scale, cylG(0.03, 0.03, 0.7, 8), brassMat, 0, 0.38, 0);
  put(scale, boxG(0.9, 0.035, 0.035), brassMat, 0, 0.72, 0);
  for (const side of [-1, 1]) {
    put(scale, cylG(0.008, 0.008, 0.18, 6), brassDark, side * 0.42, 0.62, 0);
    put(scale, cylG(0.12, 0.14, 0.03, 16), brassMat, side * 0.42, 0.52, 0);
  }
  const abacus = new THREE.Group();
  abacus.position.set(1.0, 0.92, 0);
  abacus.rotation.x = -0.45;
  desk.add(abacus);
  put(abacus, boxG(0.92, 0.6, 0.06), woodDark, 0, 0, 0, true);
  for (let row = 0; row < 5; row++) {
    const ry = 0.2 - row * 0.1;
    put(abacus, boxG(0.78, 0.018, 0.018), brassMat, 0, ry, 0.05);
    for (let b = 0; b < 7; b++) {
      put(abacus, sphereG(0.035, 8), brassMat, -0.33 + b * 0.11, ry, 0.07);
    }
  }
  // 桌上报表 / 账本（让切层后第一眼能看到账房元素）
  for (const [rx2, rz2] of [[0.15, 0.36], [0.45, -0.34]]) {
    for (let i = 0; i < 4; i++) {
      const paperPile = put(desk, boxG(0.5, 0.055, 0.36), propMats.paper, rx2, 0.86 + i * 0.055, rz2);
      paperPile.rotation.y = (i % 2 - 0.5) * 0.1;
    }
  }
  put(desk, boxG(0.48, 0.12, 0.36), propMats.ledger, 0.2, 0.91, -0.42);
  // 账本架
  const rack = new THREE.Group();
  rack.position.set(10.8, 0, -3.6);
  p3.add(rack);
  for (const rx of [-0.85, 0.85]) put(rack, boxG(0.08, 2.5, 0.5), woodDark, rx, 1.25, 0, true);
  for (const ry of [0.45, 1.05, 1.65, 2.25]) put(rack, boxG(1.8, 0.06, 0.48), wood, 0, ry, 0, true);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 4; i++) {
      put(rack, boxG(0.34, 0.12, 0.38), propMats.ledger, -0.62 + i * 0.42, 0.53 + row * 0.6, 0);
    }
  }
  // 报表堆
  for (const [sx, sz] of [[-10.8, 1.0], [-9.9, 1.6]]) {
    for (let i = 0; i < 6; i++) {
      const pile = put(p3, boxG(0.72, 0.07, 0.52), propMats.paper, sx, 0.05 + i * 0.075, sz, true);
      pile.rotation.y = (i % 3 - 1) * 0.06;
    }
  }
  // 保险柜
  const safe = new THREE.Group();
  safe.position.set(-11.8, 0, 5.2);
  p3.add(safe);
  put(safe, boxG(0.9, 1.15, 0.8), propMats.iron, 0, 0.58, 0, true);
  put(safe, boxG(0.74, 0.96, 0.06), propMats.steel, 0, 0.6, 0.42);
  const dial = put(safe, cylG(0.13, 0.13, 0.05, 16), brassMat, 0, 0.72, 0.47);
  dial.rotation.x = Math.PI / 2;
  put(safe, boxG(0.04, 0.3, 0.04), brassMat, 0.34, 0.7, 0.47);
  // 厚重地毯
  const carpet = put(p3, planeG(8.0, 5.2), propMats.carpet, 1.2, 0.028, 3.8);
  carpet.rotation.x = -Math.PI / 2;
  carpet.receiveShadow = true;
  for (const cy of [-2.5, 2.5]) put(p3, boxG(7.9, 0.014, 0.12), propMats.wax, 1.2, 0.032, 3.8 + cy);
  for (const cx of [-3.9, 3.9]) put(p3, boxG(0.12, 0.014, 5.1), propMats.wax, 1.2 + cx, 0.032, 3.8);
  // 铜钱 / 硬币堆
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const coin = put(p3, cylG(0.07, 0.07, 0.02, 12), brassMat, 9.6 + i * 0.18, 0.02 + j * 0.025, -1.4);
    }
  }

  // ===== L4 机密地库 =====
  const p4 = makePropGroup('prop-L4');
  buildChandelier(p4, 'L4');
  buildSconces(p4, propMats.iron, shadeRedMat);
  addFloorLamp(p4, FLOOR_LAMP_POS[0][0], FLOOR_LAMP_POS[0][1], propMats.iron, shadeCoolMat, 'cage');
  addFloorLamp(p4, FLOOR_LAMP_POS[1][0], FLOOR_LAMP_POS[1][1], propMats.iron, shadeCoolMat, 'cage');
  // 帷幕
  for (const dx of [-4.2, 0, 4.2]) {
    const panel = put(p4, planeG(3.0, 5.9), propMats.drape, dx, 4.0, ROOM.backZ + 0.18);
    panel.rotation.y = 0;
  }
  put(p4, boxG(12.6, 0.2, 0.18), propMats.iron, 0, 6.98, ROOM.backZ + 0.2);
  const sideDrape = put(p4, planeG(3.2, 5.2), propMats.drape, -ROOM.sideX + 0.16, 3.6, 1.4);
  sideDrape.rotation.y = Math.PI / 2;
  // 封蜡桌 + 封蜡文件
  const wt = addTable(p4, 3.0, 4.8, 2.0, 1.0, woodDark, propMats.iron);
  for (let i = 0; i < 3; i++) {
    const doc = put(wt, planeG(0.52, 0.38), propMats.parchment, -0.5 + i * 0.5, 0.82, -0.1 + (i % 2) * 0.2);
    doc.rotation.x = -Math.PI / 2;
    doc.rotation.z = (i - 1) * 0.12;
    put(wt, sphereG(0.06, 8), propMats.redSeal, -0.5 + i * 0.5, 0.845, -0.1 + (i % 2) * 0.2);
  }
  // 锁链
  function addChain(parent, x, y, z, links) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    for (let i = 0; i < links; i++) {
      const link = put(g, torusG(0.07, 0.018, 6, 10), propMats.iron, 0, -i * 0.13, 0);
      link.rotation.x = i % 2 ? Math.PI / 2 : 0;
    }
    return g;
  }
  addChain(p4, -12.4, 4.6, 0.8, 12);
  addChain(p4, 12.4, 4.6, -3.2, 12);
  // 铁柜
  const ic = new THREE.Group();
  ic.position.set(11.2, 0, -2.8);
  p4.add(ic);
  put(ic, boxG(1.6, 2.2, 0.75), propMats.iron, 0, 1.1, 0, true);
  for (const dx of [-0.4, 0.4]) put(ic, boxG(0.75, 1.9, 0.06), propMats.steel, dx, 1.1, 0.4);
  const lock = put(ic, torusG(0.1, 0.02, 6, 14), propMats.redGlow, 0, 1.1, 0.45);
  lock.rotation.y = 0;
  // 烛台（围着仪式红环）
  for (const [cx, cz, ch2] of [[-2.6, 6.1, 1.2], [-0.4, 6.3, 1.0], [-2.0, 5.2, 1.35]]) {
    const stand = new THREE.Group();
    stand.position.set(cx, 0, cz);
    p4.add(stand);
    put(stand, cylG(0.18, 0.24, 0.06, 14), propMats.iron, 0, 0.03, 0, true);
    put(stand, cylG(0.035, 0.035, ch2, 8), propMats.iron, 0, ch2 / 2 + 0.06, 0);
    put(stand, cylG(0.1, 0.1, 0.08, 12), brassDark, 0, ch2 + 0.08, 0);
    put(stand, cylG(0.05, 0.05, 0.32, 8), propMats.wax, 0, ch2 + 0.26, 0);
    put(stand, sphereG(0.04, 8), propMats.violetFlame, 0, ch2 + 0.46, 0);
  }
  // 散落残页
  const fragSpots = [[1.4, 5.7, 0.5], [2.3, 5.2, -0.3], [3.1, 6.1, 1.1], [0.8, 6.2, -0.8], [4.0, 5.4, 0.2], [-1.1, 6.8, 0.9], [-3.4, 6.4, -0.4]];
  for (const [fx, fz, rz] of fragSpots) {
    const f = put(p4, planeG(0.36, 0.48), propMats.parchment, fx, 0.022, fz);
    f.rotation.x = -Math.PI / 2;
    f.rotation.z = rz;
  }
  // 仪式红环 + 红线
  const ritual = put(p4, torusG(1.4, 0.025, 8, 48), propMats.redGlow, -1.4, 0.04, 6.0);
  ritual.rotation.x = Math.PI / 2;
  const redLineMat = new THREE.LineBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.55 });
  const redPts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    redPts.push(new THREE.Vector3(-1.4 + Math.cos(a) * 1.9, 0.045, 6.0 + Math.sin(a) * 1.9));
    redPts.push(new THREE.Vector3(-1.4 + Math.cos(a + 0.5) * 0.5, 0.045, 6.0 + Math.sin(a + 0.5) * 0.5));
  }
  p4.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(redPts), redLineMat));
  // 红线警戒灯
  const beacon = new THREE.Group();
  beacon.position.set(8.6, 0, 3.2);
  p4.add(beacon);
  put(beacon, cylG(0.06, 0.09, 2.4, 8), propMats.iron, 0, 1.2, 0, true);
  const beaconHead = put(beacon, sphereG(0.16, 12), propMats.redGlow, 0, 2.55, 0);
  beacons.push({ mesh: beaconHead });
  // 铁箱
  for (const [bx, bz] of [[-11.8, -0.6], [-11.1, -1.3]]) {
    const crate = put(p4, boxG(0.8, 0.7, 0.8), propMats.iron, bx, 0.35, bz, true);
    crate.rotation.y = 0.12;
  }

  propGroups.L1 = p1;
  propGroups.L2 = p2;
  propGroups.L3 = p3;
  propGroups.L4 = p4;

  // 大厅吊灯（仅 all 层显示）
  const hallPendant = new THREE.Group();
  scene.add(hallPendant);
  buildChandelier(hallPendant, 'L1');

  // ---------- 双层尘埃：近处大颗粒（500）+ 远处细尘（1200） ----------
  function buildDust(count, size, speed, opacity, color) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const j = i * 3;
      pos[j] = (Math.random() - 0.5) * 27.6;
      pos[j + 1] = 0.06 + Math.random() * 9.1;
      pos[j + 2] = -6.6 + Math.random() * 16.6;
      vel[j] = (Math.random() - 0.5) * speed;
      vel[j + 1] = (Math.random() - 0.35) * speed;
      vel[j + 2] = (Math.random() - 0.5) * speed;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity, depthWrite: false, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return { points: pts, geo, vel, count };
  }
  const dustNear = buildDust(500, 0.045, 0.06, 0.34, 0xffe0b0);
  const dustFar = buildDust(1200, 0.016, 0.16, 0.18, 0xd9c8a8);

  function updateDust(layer, dt) {
    const arr = layer.geo.attributes.position.array;
    const vel = layer.vel;
    for (let i = 0; i < layer.count; i++) {
      const j = i * 3;
      arr[j] += vel[j] * dt;
      arr[j + 1] += vel[j + 1] * dt;
      arr[j + 2] += vel[j + 2] * dt;
      if (arr[j + 1] > 9.2) arr[j + 1] = 0.06;
      else if (arr[j + 1] < 0.04) arr[j + 1] = 9.2;
      if (arr[j] > 13.8) arr[j] = -13.8;
      else if (arr[j] < -13.8) arr[j] = 13.8;
      if (arr[j + 2] > 10.0) arr[j + 2] = -6.6;
      else if (arr[j + 2] < -6.6) arr[j + 2] = 10.0;
    }
    layer.geo.attributes.position.needsUpdate = true;
  }

  // ---------- 物理（Rapier） ----------
  let world = null;
  try {
    await RAPIER.init();
    world = new RAPIER.World({ x: 0, y: -4.2, z: 0 });
    world.timestep = 1 / 60;
    const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 1.2));
    world.createCollider(RAPIER.ColliderDesc.cuboid(14.25, 0.5, 10.5).setFriction(0.9), ground);
    for (const u of SHELF_UNITS) {
      for (const by of BOARD_Y) {
        const rb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(u.x, by, u.z));
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
      world.createCollider(RAPIER.ColliderDesc.cuboid(0.11, BOOK_H / 2, 0.20).setFriction(0.98).setRestitution(0.02), rb);
      item.body = rb;
    }
  } catch (e) {
    console.warn('[3D] Rapier 初始化失败，退化为静态摆放', e);
  }

  // ---------- UI：提示 / 提示条 / 遮罩 / 电梯面板 ----------
  const hint = document.createElement('div');
  hint.className = 'mm-hint';
  hint.textContent = 'WASD 移动 · 鼠标拖拽转视角 · 点击书取书 · 点击黄铜电梯或右下按钮选层';
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
  allBtn.innerHTML = `<span>全馆大厅</span><i>${SHELF_UNITS.length} 组书架 · ${books.length} 本</i>`;
  allBtn.onclick = () => { elevPanel.classList.remove('show'); travelTo('all'); };
  elevPanel.appendChild(allBtn);
  for (const f of floors) {
    const b = document.createElement('button');
    b.innerHTML = `<span>${f.name}</span><i>等级 ${f.tier} · ${DECAY[f.decay] || '残'} · ${f.librarian}</i>`;
    b.onclick = () => { elevPanel.classList.remove('show'); travelTo(f.id); };
    elevPanel.appendChild(b);
  }
  root.appendChild(elevPanel);

  // 楼层氛围：越高层，雾越浓、光越暗、尘埃越少（但保证可读）
  const ATMOS = {
    all: { near: 12, far: 48, bg: 0x171009, amb: 2.2, spot: 5.4, dir: 2.2, dust: 0.38 },
    L1: { near: 10.5, far: 42, bg: 0x1a130b, amb: 2.5, spot: 6.0, dir: 2.4, dust: 0.42 },
    L2: { near: 9.5, far: 38, bg: 0x0e1620, amb: 2.1, spot: 5.4, dir: 2.1, dust: 0.36 },
    L3: { near: 8.5, far: 34, bg: 0x1a140c, amb: 1.9, spot: 4.8, dir: 1.9, dust: 0.30 },
    L4: { near: 7.0, far: 28, bg: 0x0b0910, amb: 1.5, spot: 3.8, dir: 1.4, dust: 0.24 },
  };
  // 楼层主题：书架 / 墙面 / 地面 / 尘埃 / 灯光色温（越高层越冷、越神秘）
  const THEME = {
    all: {
      shelf: 0x6b4a2a, shelfDark: 0x523a24, metal: 0.08, rough: 0.75,
      shelfAccent: 0x8a6a2f, shelfMetal: 0.7, shelfRough: 0.35,
      accent: 0xffc37a, acc: 0.9, trim: 0x2a2118, ceiling: 0x241c16, rug: 0x5a3520,
      painting: 0x8a6a2f, paintingCanvas: 0xd8c090,
      dustNear: 0xffe0b0, dustFar: 0xd9c8a8,
      key: 0xffe3b0, hemiSky: 0x9a8a6a, hemiGround: 0x3a2f22,
      sideL: 0xffb066, sideR: 0x9fc2ff, accentLight: 0xffc37a,
      spot: 0xffd2a0, wallLamp: 0xffb066, floorLamp: 0xffc37a,
      wallInt: 1.05, floorInt: 1.25, exposure: 1.7,
    },
    L1: {
      shelf: 0x6b4a2a, shelfDark: 0x523a24, metal: 0.1, rough: 0.72,
      shelfAccent: 0x8a6a2f, shelfMetal: 0.7, shelfRough: 0.35,
      accent: 0xffc37a, acc: 1.0, trim: 0x2c2218, ceiling: 0x2a2118, rug: 0x5e3a24,
      painting: 0x8a6a2f, paintingCanvas: 0xd8c090,
      dustNear: 0xffe0b0, dustFar: 0xe0cfa8,
      key: 0xffdfb0, hemiSky: 0xa08a68, hemiGround: 0x3a2f22,
      sideL: 0xffb066, sideR: 0xffcf9a, accentLight: 0xffc37a,
      spot: 0xffcf9a, wallLamp: 0xffb066, floorLamp: 0xffc37a,
      wallInt: 1.05, floorInt: 1.25, exposure: 1.75,
    },
    L2: {
      shelf: 0x5b6b74, shelfDark: 0x44525a, metal: 0.68, rough: 0.35,
      shelfAccent: 0x7b8a94, shelfMetal: 0.8, shelfRough: 0.3,
      accent: 0x7fb6d6, acc: 1.0, trim: 0x20262a, ceiling: 0x1a2228, rug: 0x2c3a44,
      painting: 0x5a7a8a, paintingCanvas: 0xbcd8e8,
      dustNear: 0xa8c8e0, dustFar: 0xc0d8e8,
      key: 0xcfe6ff, hemiSky: 0x8aa8c0, hemiGround: 0x2a3a44,
      sideL: 0x7fb6d6, sideR: 0x9fc2ff, accentLight: 0x7fb6d6,
      spot: 0xaad4ff, wallLamp: 0x9fc2ff, floorLamp: 0x7fb6d6,
      wallInt: 1.0, floorInt: 1.15, exposure: 1.65,
    },
    L3: {
      shelf: 0x6b5230, shelfDark: 0x4f3a22, metal: 0.12, rough: 0.7,
      shelfAccent: 0x9a7a3a, shelfMetal: 0.72, shelfRough: 0.34,
      accent: 0xffd27a, acc: 1.0, trim: 0x241a10, ceiling: 0x221a10, rug: 0x4a2418,
      painting: 0x8a6a2f, paintingCanvas: 0xd8b878,
      dustNear: 0xffd9a0, dustFar: 0xd8c090,
      key: 0xffd8a0, hemiSky: 0xa08060, hemiGround: 0x3a2818,
      sideL: 0xffc070, sideR: 0xffb066, accentLight: 0xffd27a,
      spot: 0xffc070, wallLamp: 0xffb066, floorLamp: 0xffc37a,
      wallInt: 1.1, floorInt: 1.25, exposure: 1.72,
    },
    L4: {
      shelf: 0x4a3a52, shelfDark: 0x362a3e, metal: 0.55, rough: 0.5,
      shelfAccent: 0x6a5a7a, shelfMetal: 0.62, shelfRough: 0.45,
      accent: 0xa98cff, acc: 0.9, trim: 0x1c1826, ceiling: 0x171320, rug: 0x2e1f2a,
      painting: 0x4a3a5a, paintingCanvas: 0x9a88b8,
      dustNear: 0xc8b0ff, dustFar: 0x9a88b8,
      key: 0x9a88c8, hemiSky: 0x6a5a88, hemiGround: 0x1a1424,
      sideL: 0xff4040, sideR: 0x9a7aff, accentLight: 0xa98cff,
      spot: 0xb48cff, wallLamp: 0xff3030, floorLamp: 0x9a7aff,
      wallInt: 1.3, floorInt: 1.15, exposure: 1.6,
    },
  };
  function applyAtmos(fid) {
    const a = ATMOS[fid] || ATMOS.all;
    const th = THEME[fid] || THEME.all;
    scene.fog.near = a.near;
    scene.fog.far = a.far;
    scene.fog.color.setHex(a.bg);
    scene.background.setHex(a.bg);
    ambient.intensity = a.amb;
    spot.intensity = a.spot;
    spot.color.setHex(th.spot);
    key.intensity = a.dir;
    key.color.setHex(th.key);
    hemi.color.setHex(th.hemiSky);
    hemi.groundColor.setHex(th.hemiGround);
    accent.color.setHex(th.accentLight);
    accent.intensity = th.acc;
    renderer.toneMappingExposure = th.exposure;

    floor.material = floorMats[fid] || floorMats.all;
    for (const w of wallMeshes) w.material = wallMats[fid] || wallMats.all;
    trimMat.color.setHex(th.trim);
    ceilingMat.color.setHex(th.ceiling);
    rugMat.color.setHex(th.rug);
    paintingFrameMat.color.setHex(th.painting);
    paintingMat.color.setHex(th.paintingCanvas);

    wood.color.setHex(th.shelf);
    wood.metalness = th.metal;
    wood.roughness = th.rough;
    woodDark.color.setHex(th.shelfDark);
    woodDark.metalness = th.metal * 0.9;
    woodDark.roughness = th.rough + 0.08;
    shelfEdgeMat.color.setHex(th.shelfAccent);
    shelfEdgeMat.metalness = th.shelfMetal;
    shelfEdgeMat.roughness = th.shelfRough;
    for (const l of shelfLights) l.color.setHex(th.spot);

    dustNear.points.material.color.setHex(th.dustNear);
    dustNear.points.material.opacity = a.dust;
    dustFar.points.material.color.setHex(th.dustFar);
    dustFar.points.material.opacity = a.dust * 0.55;

    for (let i = 0; i < wallLights.length; i++) {
      const isFloorLamp = i >= 4;
      wallLights[i].color.setHex(isFloorLamp ? th.floorLamp : th.wallLamp);
      wallLights[i].intensity = isFloorLamp ? th.floorInt : th.wallInt;
    }
    beaconLight.intensity = 0;

    for (const id of Object.keys(propGroups)) propGroups[id].visible = fid === id;
    hallPendant.visible = fid === 'all';
  }

  let currentFloor = 'all';
  function floorWelcome(fid) {
    if (fid === 'all') return '全馆大厅：所有书架都在，慢慢看。';
    const f = floors.find((x) => x.id === fid);
    return f ? `${f.name} · ${f.librarian}：${f.welcome}` : '';
  }
  function setFloor(fid, silent = false) {
    currentFloor = fid;
    applyAtmos(fid);
    for (const it of bookItems) {
      it.mesh.visible = fid === 'all' || it.book.floor === fid;
    }
    const idx = floors.findIndex((f) => f.id === fid);
    if (fid === 'all') {
      player.pos.set(0, 1.68, 9.1);
      player.tYaw = 0;
      player.tPitch = -0.03;
    } else {
      player.pos.set([-1.2, 1.2, -1.4, 0.6][idx] ?? 0, 1.68, [8.1, 8.0, 8.1, 8.2][idx] ?? 8.1);
      player.tYaw = [0.16, -0.14, 0.18, -0.06][idx] ?? 0;
      player.tPitch = -0.02;
    }
    if (!silent) toast(floorWelcome(fid));
  }

  // ---------- 相机控制：鼠标拖拽转视角 + WASD 移动 ----------
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
    player.tYaw -= dx * 0.0042;
    player.tPitch = Math.max(-1.15, Math.min(0.85, player.tPitch - dy * 0.0032));
  });
  window.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved < 6) pick(e.clientX, e.clientY);
  });
  el.addEventListener('wheel', (e) => { e.preventDefault(); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
      keys[k] = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
  });

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
    const hitStar = raycaster.intersectObject(starTable, true);
    const hitFrag = raycaster.intersectObjects(fragPapers, false);
    const hitLamp = raycaster.intersectObject(lampGroup, true);
    const hitZoom = raycaster.intersectObject(zoomGroup, true);
    const hitDrawer = raycaster.intersectObjects(cabinetDrawers, false);
    const hitHidden = hiddenBook.visible && raycaster.intersectObject(hiddenBook, false).length > 0;
    el.style.cursor = (hits.length || hitElev.length || hitStar.length || hitFrag.length || hitLamp.length || hitZoom.length || hitDrawer.length || hitHidden) ? 'pointer' : 'grab';
  }

  function pick(x, y) {
    if (traveling) return;
    setPointer(x, y);
    const elevHits = raycaster.intersectObject(elevator, true);
    if (elevHits.length) {
      if (window.mmAudioPlay) window.mmAudioPlay('elevator');
      elevPanel.classList.add('show');
      return;
    }
    const starHits = raycaster.intersectObject(starTable, true);
    if (starHits.length) {
      if (window.mmShowStar) window.mmShowStar();
      return;
    }
    const fragHits = raycaster.intersectObjects(fragPapers, false);
    if (fragHits.length) {
      if (window.mmPickSceneFragment) window.mmPickSceneFragment();
      return;
    }
    if (hiddenBook.visible) {
      const hb = raycaster.intersectObject(hiddenBook, false);
      if (hb.length) {
        if (window.mmOpenHiddenBook) window.mmOpenHiddenBook();
        return;
      }
    }
    const lampHits = raycaster.intersectObject(lampGroup, true);
    if (lampHits.length) {
      toggleLamp();
      return;
    }
    const zoomHits = raycaster.intersectObject(zoomGroup, true);
    if (zoomHits.length) {
      toast('你举起放大镜，书脊上的烫金小字清楚了一点。');
      return;
    }
    const drawerHits = raycaster.intersectObjects(cabinetDrawers, false);
    if (drawerHits.length) {
      const dr = drawerHits[0].object;
      dr.userData.open = !dr.userData.open;
      dr.position.z = dr.userData.open ? dr.userData.closedZ + 0.2 : dr.userData.closedZ;
      toast(dr.userData.open ? '抽屉拉开了：里面是一叠空白索引卡。' : '抽屉合上了。');
      if (window.mmAudioPlay) window.mmAudioPlay('step');
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
  let traveling = false;
  function takeBook(item) {
    if (taking) return;
    taking = true;
    if (window.mmAudioPlay) window.mmAudioPlay('page');
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

  // ---------- 电梯入舱转场 ----------
  let override = null;
  function tween(dur, onUpdate) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        onUpdate(easeInOut(p), p);
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  function setDoors(open) {
    doorL.position.x = -0.44 - 0.44 * open;
    doorR.position.x = 0.44 + 0.44 * open;
  }

  function snapCamToPreset() {
    player.yaw = player.tYaw;
    player.pitch = player.tPitch;
    updateCamera();
  }

  async function travelTo(fid) {
    if (traveling || taking) return;
    traveling = true;
    hint.style.opacity = '0';
    const startPos = camera.position.clone();
    const doorLook = new THREE.Vector3(-12.6, 1.45, -0.6);
    const doorFront = new THREE.Vector3(-11.2, 1.55, -0.6);
    const insidePos = new THREE.Vector3(-13.05, 1.5, -0.6);
    const insideLook = new THREE.Vector3(-13.6, 1.45, -0.6);

    // 1. 飞到电梯门前
    await tween(900, (e) => {
      override = { pos: startPos.clone().lerp(doorFront, e), look: doorLook.clone() };
    });
    // 2. 门开
    await tween(550, (e) => { setDoors(e); });
    // 3. 走入轿厢，灯光渐暗
    await tween(850, (e) => {
      override = { pos: doorFront.clone().lerp(insidePos, e), look: doorLook.clone().lerp(insideLook, e) };
      if (e > 0.55) fade(true);
    });
    // 4. 门关（全黑）
    await tween(520, (e) => { setDoors(1 - e); });
    await new Promise((r) => setTimeout(r, 200));
    // 5. 黑场中切换楼层，相机直接落到新楼层
    setFloor(fid, true);
    snapCamToPreset();
    override = null;
    setDoors(0);
    await new Promise((r) => setTimeout(r, 260));
    fade(false);
    setTimeout(() => toast(floorWelcome(fid)), 320);
    hint.style.opacity = '1';
    traveling = false;
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
    override = null;
    traveling = false;
    setDoors(0);
    setFloor(currentFloor, true);
    snapCamToPreset();
  }

  // ---------- 渲染循环 ----------
  let lastFrame = performance.now();
  function updateCamera() {
    player.yaw += (player.tYaw - player.yaw) * 0.12;
    player.pitch += (player.tPitch - player.pitch) * 0.12;
    camera.position.copy(player.pos);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  function movePlayer(dt) {
    if (traveling || taking) return;
    if (document.body.classList.contains('reading') || document.body.classList.contains('grid')) return;
    const speed = 4.2;
    let fx = 0;
    let fz = 0;
    if (keys.w) fz -= 1;
    if (keys.s) fz += 1;
    if (keys.a) fx -= 1;
    if (keys.d) fx += 1;
    if (!fx && !fz) return;
    const len = Math.hypot(fx, fz);
    fx /= len;
    fz /= len;
    const cos = Math.cos(player.yaw);
    const sin = Math.sin(player.yaw);
    const wx = fx * cos + fz * sin;
    const wz = -fx * sin + fz * cos;
    player.pos.x = Math.max(-ROOM.minX, Math.min(ROOM.minX, player.pos.x + wx * speed * dt));
    player.pos.z = Math.max(ROOM.minZ, Math.min(ROOM.maxZ, player.pos.z + wz * speed * dt));
  }

  let elapsed = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const nowMs = now || performance.now();
    const dt = Math.min(0.06, Math.max(0.001, (nowMs - lastFrame) / 1000));
    lastFrame = nowMs;
    elapsed += dt;
    if (override) {
      camera.position.copy(override.pos);
      camera.lookAt(override.look);
    } else {
      movePlayer(dt);
      updateCamera();
    }

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

    updateDust(dustNear, dt);
    updateDust(dustFar, dt);
    for (let i = 0; i < volumeCones.length; i++) {
      const v = volumeCones[i];
      v.mesh.rotation.y += dt * v.spin;
      v.mesh.material.opacity = v.base * (0.82 + 0.18 * Math.sin(elapsed * 0.7 + v.phase));
    }
    for (let i = 0; i < beacons.length; i++) {
      beacons[i].mesh.rotation.y += dt * 1.6;
    }
    beaconLight.intensity = currentFloor === 'L4' ? 1.5 + Math.sin(elapsed * 5.0) * 0.9 : 0;
    orb.scale.setScalar(1 + Math.sin(elapsed * 0.9) * 0.05);
    for (let d = 0; d < starDots.length; d++) {
      starDots[d].material.emissiveIntensity = 0.6 + 0.35 * Math.sin(elapsed * 1.3 + d);
    }
    for (let d = 0; d < orbitDots.length; d++) {
      orbitDots[d].material.emissiveIntensity = 0.6 + 0.4 * Math.sin(elapsed * 1.6 + d * 1.2);
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

  return {
    reset, setFloor, scene, camera, renderer, bookItems, elevator, player, propGroups, shelfUnits: SHELF_UNITS,
    setHiddenVisible: (v) => { hiddenBook.visible = !!v; },
    getFloor: () => currentFloor,
    toastFloor: () => toast(floorWelcome(currentFloor)),
  };
}

export function dispose3D(api) {
  if (!api) return;
  api.renderer.dispose();
}

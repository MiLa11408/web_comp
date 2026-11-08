// app3d.js · 阶段 2：3D 主阅览室（three.js + Rapier）
// 书架程序化生成、书脊 Canvas 排版、取书翻开动画、黄铜电梯选层、尘埃与星图台。
import * as THREE from './vendor/three.module.js';
import RAPIER from './vendor/rapier.mjs';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const DECAY = ['完好', '轻残', '中残', '高残'];

// 房间尺寸：28.5×21，层高压到 6.6（原 9.75）
// 压低层高是为了让藻井、吊灯、高窗进入正常视野，而不是飘在一片黑里
const ROOM = {
  w: 28.5, d: 21, h: 6.6,
  backZ: -6.9, sideX: 14.25,
  minX: 12.6, minZ: -4.45, maxZ: 9.4,
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

// 失窃页展柜数据：与 content/stolen.json 的 id / no / floor / x / z / year 保持一致
const STOLEN_EXHIBITS = [
  { id: 'dartmouth-proposal', no: 'S-01', floor: 'L1', x: -10.4, z: 3.2, year: '1955' },
  { id: 'eu-ai-act-risk-tiers', no: 'S-02', floor: 'L4', x: -6.0, z: 7.0, year: '2024' },
  { id: 'siri-2011-keynote', no: 'S-03', floor: 'L1', x: 10.4, z: 5.2, year: '2011' },
  { id: 'casp13-results', no: 'S-04', floor: 'L3', x: -10.4, z: 2.4, year: '2018' },
  { id: 'usco-ai-registration', no: 'S-05', floor: 'L3', x: 10.4, z: 4.6, year: '2023' },
  { id: 'mark1-wiring', no: 'S-06', floor: 'L2', x: -10.4, z: 1.8, year: '1958' },
  { id: 'casp14-results', no: 'S-07', floor: 'L2', x: 10.4, z: 3.6, year: '2020' },
  { id: 'attention-original', no: 'S-08', floor: 'L2', x: -10.4, z: 5.6, year: '2017' },
  { id: 'alphago-move-37', no: 'S-09', floor: 'L2', x: 10.4, z: 7.2, year: '2016' },
];

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
.mm-joy { position: absolute; left: 20px; bottom: 20px; width: 124px; height: 124px; border-radius: 50%;
  border: 1px solid rgba(200,162,74,.55); background: rgba(18,14,11,.5); display: none; z-index: 26;
  touch-action: none; user-select: none; }
.mm-joy::before { content: ''; position: absolute; inset: 26px; border-radius: 50%; border: 1px dashed rgba(200,162,74,.32); }
.mm-joy i { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
  background: rgba(200,162,74,.3); border: 1px solid #c8a24a; transition: transform .08s linear; }
.mm-joy-label { position: absolute; left: 20px; bottom: 148px; color: #8a7a5c; font-size: 11px; letter-spacing: 1px;
  background: rgba(18,14,11,.5); padding: 3px 7px; border: 1px solid #2c2116; display: none; z-index: 26; }
.mm-lens { position: absolute; width: 190px; height: 190px; border-radius: 50%; border: 2px solid #c8a24a;
  box-shadow: 0 0 0 4px #2c2116, 0 12px 34px rgba(0,0,0,.65), inset 0 0 22px rgba(0,0,0,.55); overflow: hidden;
  pointer-events: none; display: none; z-index: 27; background: #0b0805; transform: translate(-50%, -50%); }
.mm-lens canvas { width: 100%; height: 100%; display: block; }
.mm-lens::after { content: ''; position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle at 34% 26%, rgba(255,240,200,.16), transparent 42%); }
`;

function injectCss() {
  if (document.getElementById('mm3d-style')) return;
  const s = document.createElement('style');
  s.id = 'mm3d-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------- 书脊：Canvas 版式（确定性 variant + L4 未编目） ----------
const ROMAN_NUMERALS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ'];

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seededRand(seed) {
  let s = (seed || 1) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function spineTexture(book, variant = 0, ordinal = 1) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 768;
  const ctx = c.getContext('2d');
  const v = ((Number(variant) % 3) + 3) % 3;
  const base = new THREE.Color(book.color || '#4a3a2e');
  const bg = v === 2 ? base.clone().multiplyScalar(0.58) : base.clone();
  const rnd = seededRand(strHash(`${book.id || ''}|${book.call || ''}|${book.title || ''}`));

  ctx.fillStyle = `#${bg.getHexString()}`;
  ctx.fillRect(0, 0, 256, 768);
  // 布面颗粒（确定性，刷新不变）
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.07})`;
    ctx.fillRect(rnd() * 256, rnd() * 768, 1 + rnd() * 2.4, 1.6);
  }
  // 上下边缘暗部，增加装帧厚度感
  const edgeGrad = ctx.createLinearGradient(0, 0, 0, 768);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,.30)');
  edgeGrad.addColorStop(0.1, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(0.9, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,.34)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, 256, 768);

  const call = String(book.call || '');
  const rawTitle = String(book.title || '').replace(/[《》]/g, '');

  if (book.floor === 'L4') {
    // 绝密：不显示完整书名，仅罗马序号 + 未编目
    ctx.strokeStyle = 'rgba(200,162,74,.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 220, 732);
    ctx.fillStyle = 'rgba(200,162,74,.8)';
    ctx.fillRect(40, 132 + v * 12, 176, 5);
    const roman = ROMAN_NUMERALS[(Math.max(1, Number(ordinal) || 1) - 1) % ROMAN_NUMERALS.length];
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e6d9bd';
    ctx.font = 'bold 104px "Times New Roman", "Songti SC", serif';
    ctx.fillText(roman, 128, 372);
    ctx.fillStyle = 'rgba(230,217,189,.6)';
    ctx.font = '20px "Songti SC", "SimSun", serif';
    ctx.fillText('未编目', 128, 432);
    ctx.fillStyle = 'rgba(200,162,74,.75)';
    ctx.fillRect(52, 576, 152, 4);
    if (v > 0) {
      ctx.save();
      ctx.translate(128, 632);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = 'rgba(200,162,74,.72)';
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(200,162,74,.45)';
    ctx.fillRect(96, 700, 64, 2);
  } else if (v === 0) {
    // a. 竖排书名 + 金线框（原版式）
    ctx.strokeStyle = '#c8a24a';
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, 228, 740);
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, 208, 720);
    ctx.fillStyle = '#f6ecc9';
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px "Songti SC", "SimSun", serif';
    [...rawTitle].slice(0, 9).forEach((ch, i) => ctx.fillText(ch, 128, 96 + i * 66));
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#e2c06a';
    ctx.fillText(call, 128, 716);
  } else if (v === 1) {
    // b. 横排书名（两行内）+ 上下金色横带 + 索书号
    ctx.fillStyle = 'rgba(200,162,74,.9)';
    ctx.fillRect(0, 0, 256, 26);
    ctx.fillRect(0, 742, 256, 26);
    ctx.strokeStyle = 'rgba(246,236,201,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 46, 220, 676);
    const chars = [...rawTitle].slice(0, 14);
    const mid = Math.ceil(chars.length / 2);
    const lines = [chars.slice(0, mid).join(''), chars.slice(mid).join('')].filter(Boolean);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6ecc9';
    ctx.font = 'bold 46px "Songti SC", "SimSun", serif';
    lines.slice(0, 2).forEach((ln, i) => ctx.fillText(ln, 128, 208 + i * 60));
    ctx.fillStyle = 'rgba(200,162,74,.7)';
    ctx.fillRect(46, 344, 164, 4);
    ctx.fillStyle = 'rgba(246,236,201,.3)';
    for (let i = 0; i < 4; i++) ctx.fillRect(72, 560 + i * 14, 112, 2);
    ctx.fillStyle = '#e2c06a';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(call, 128, 702);
  } else {
    // c. 极简标签：仅索书号 + 小菱形，底色更深
    ctx.strokeStyle = 'rgba(230,217,189,.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, 200, 712);
    ctx.save();
    ctx.translate(128, 150);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(200,162,74,.85)';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,162,74,.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(58, 372, 140, 64);
    ctx.fillStyle = '#e2c06a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px monospace';
    ctx.fillText(call, 128, 418);
    ctx.fillStyle = 'rgba(200,162,74,.4)';
    ctx.fillRect(60, 640, 136, 3);
  }

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

// ---------- 墙面装饰贴图：旧地图 / 剪报 / 账页 / 紫色符印 ----------
function makeDecorTexture(kind) {
  if (kind === 'sigil') {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    const rnd = seededRand(31);
    g.translate(128, 128);
    g.strokeStyle = 'rgba(178,138,255,.85)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(0, 0, 108, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(150,110,235,.55)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(0, 0, 88, 0, Math.PI * 2);
    g.stroke();
    // 外圈符印刻度
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r1 = i % 3 === 0 ? 92 : 98;
      const r2 = 108;
      g.beginPath();
      g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      g.stroke();
    }
    // 内部符文折线 + 菱形
    g.strokeStyle = 'rgba(196,160,255,.7)';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      g.lineTo(Math.cos(a) * 62, Math.sin(a) * 62);
    }
    g.closePath();
    g.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 24, Math.sin(a) * 24);
      g.lineTo(Math.cos(a) * (54 + rnd() * 14), Math.sin(a) * (54 + rnd() * 14));
      g.stroke();
    }
    g.fillStyle = 'rgba(210,180,255,.9)';
    g.save();
    g.rotate(Math.PI / 4);
    g.fillRect(-8, -8, 16, 16);
    g.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  return canvasTexture(512, 512, (g, W, H) => {
    const rnd = seededRand(kind === 'map' ? 7 : kind === 'news' ? 13 : 23);
    if (kind === 'map') {
      g.fillStyle = '#d6c396';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 46; i++) {
        g.fillStyle = `rgba(120,95,55,${0.03 + rnd() * 0.05})`;
        g.fillRect(rnd() * W, rnd() * H, 18 + rnd() * 90, 16 + rnd() * 70);
      }
      g.strokeStyle = 'rgba(96,74,42,.32)';
      g.lineWidth = 1;
      for (let i = 40; i < W; i += 40) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke();
      }
      // 海岸线
      g.strokeStyle = '#5e4826';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(36, 392);
      for (let x = 36; x <= 476; x += 28) g.lineTo(x, 392 - Math.sin(x / 68) * 44 - rnd() * 16);
      g.stroke();
      // 河流
      g.strokeStyle = 'rgba(70,90,100,.55)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(120, 40);
      for (let y = 40; y <= 400; y += 24) g.lineTo(120 + Math.sin(y / 40) * 60, y);
      g.stroke();
      // 红色勘探路线
      g.strokeStyle = 'rgba(150,52,40,.72)';
      g.setLineDash([9, 6]);
      g.beginPath();
      g.moveTo(110, 260);
      g.lineTo(210, 230);
      g.lineTo(300, 300);
      g.lineTo(398, 250);
      g.stroke();
      g.setLineDash([]);
      // 地名墨线
      g.fillStyle = 'rgba(66,50,30,.55)';
      for (let i = 0; i < 12; i++) {
        const lx = 70 + (i % 4) * 110;
        const ly = 90 + Math.floor(i / 4) * 62;
        g.fillRect(lx, ly, 28 + rnd() * 52, 3);
      }
      // 红色圆印
      g.strokeStyle = 'rgba(140,44,36,.65)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(430, 452, 26, 0, Math.PI * 2); g.stroke();
      g.strokeRect(12, 12, W - 24, H - 24);
    } else if (kind === 'news') {
      g.fillStyle = '#cec1a0';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#2a241a';
      g.fillRect(28, 24, W - 56, 56);
      g.fillStyle = '#d8cba8';
      g.font = 'bold 30px "Songti SC", "SimSun", serif';
      g.textAlign = 'center';
      g.fillText('旧 闻 剪 报', W / 2, 62);
      g.strokeStyle = 'rgba(60,50,36,.55)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(28, 96); g.lineTo(W - 28, 96); g.stroke();
      g.fillStyle = 'rgba(54,44,32,.5)';
      for (let col = 0; col < 3; col++) {
        for (let row = 0; row < 12; row++) {
          g.fillRect(36 + col * 152, 118 + row * 28, 118 + rnd() * 18, 2);
        }
      }
      g.fillStyle = 'rgba(40,34,24,.75)';
      g.fillRect(36, 118, 120, 12);
      g.strokeStyle = 'rgba(140,44,36,.7)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(430, 440, 26, 0, Math.PI * 2); g.stroke();
      g.strokeRect(12, 12, W - 24, H - 24);
    } else {
      // 账页 / 报表板：深绿纸 + 铜边 + 横线格
      g.fillStyle = '#33443a';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#2a382f';
      g.fillRect(28, 24, W - 56, 52);
      g.fillStyle = '#cfc39c';
      g.font = 'bold 24px "Songti SC", "SimSun", serif';
      g.textAlign = 'left';
      g.fillText('账 页 · 年 度 结 余', 46, 58);
      g.strokeStyle = 'rgba(200,185,140,.55)';
      g.lineWidth = 1.5;
      for (let y = 110; y < H - 40; y += 34) {
        g.beginPath(); g.moveTo(36, y); g.lineTo(W - 36, y); g.stroke();
      }
      for (const x of [36, 150, 330, 420, W - 36]) {
        g.beginPath(); g.moveTo(x, 92); g.lineTo(x, H - 36); g.stroke();
      }
      g.fillStyle = 'rgba(220,208,170,.55)';
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 3; col++) {
          g.fillRect(46 + col * 180, 126 + row * 34, 60 + rnd() * 64, 3);
        }
      }
      g.strokeStyle = 'rgba(160,70,54,.8)';
      g.lineWidth = 3;
      g.beginPath(); g.arc(438, 430, 34, 0, Math.PI * 2); g.stroke();
      g.font = 'bold 20px "Songti SC", "SimSun", serif';
      g.fillStyle = 'rgba(160,70,54,.8)';
      g.textAlign = 'center';
      g.fillText('已核', 438, 437);
      g.strokeStyle = 'rgba(180,150,90,.5)';
      g.lineWidth = 2;
      g.strokeRect(12, 12, W - 24, H - 24);
    }
  });
}

export async function init3D({ container, books, floors, shelfConfig = {}, onOpenBook, onOpenStolen }) {
  injectCss();

  const root = document.createElement('div');
  root.className = 'mm-root';
  container.appendChild(root);

  const loading = document.createElement('div');
  loading.className = 'mm-loading';
  loading.textContent = '正在开馆……';
  root.appendChild(loading);

  // 移动端 / 低配降级：窄屏（<760px）或低内存（deviceMemory ≤ 4）设备降低像素比并关闭阴影
  const BASE_DPR = Math.min(2, window.devicePixelRatio || 1);
  const LOW_SPEC = window.innerWidth < 760
    || (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(LOW_SPEC ? Math.min(1.5, BASE_DPR) : BASE_DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !LOW_SPEC;
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
  let tour = null;

  // 书架容量：内容配置决定每组书架能放多少本，组数由实际书数动态推导
  const booksPerBoard = Math.max(1, Number(shelfConfig.booksPerBoard) || 3);
  const boardsPerUnit = Math.min(BOARD_Y.length, Math.max(1, Number(shelfConfig.boardsPerUnit) || 2));
  const perUnit = booksPerBoard * boardsPerUnit;
  const SHELF_UNITS = layoutShelves(books.length, perUnit);
  // 书架碰撞体：允许从书架组之间的空隙绕到后排，但不能穿书架走
  const SHELF_BLOCKERS = SHELF_UNITS.map((u) => ({ x: u.x, z: u.z, hw: 1.55, hd: 0.35 }));
  const PLAYER_RADIUS = 0.22;
  function blockedAt(x, z) {
    for (const b of SHELF_BLOCKERS) {
      if (Math.abs(x - b.x) < b.hw + PLAYER_RADIUS && Math.abs(z - b.z) < b.hd + PLAYER_RADIUS) return true;
    }
    return false;
  }

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

  // 低配：关闭第二盏书架灯与两盏落地灯，减少实时点光数量（不影响桌面端）
  if (LOW_SPEC) {
    if (shelfLights[1]) shelfLights[1].visible = false;
    for (let i = SCONCE_POS.length; i < wallLights.length; i++) wallLights[i].visible = false;
  }

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
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x382a1d, roughness: 0.98, emissive: 0x241a11, emissiveIntensity: 0.55 });
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

  // ---------- 建筑细节：护墙板 / 高窗 / 壁柱 / 藻井 ----------
  const detailTrimMat = new THREE.MeshStandardMaterial({ color: 0x2e2418, roughness: 0.72, metalness: 0.1 });
  const wainscotMat = new THREE.MeshStandardMaterial({ color: 0x3a2b1c, roughness: 0.86, metalness: 0.04 });
  const pilasterMat = new THREE.MeshStandardMaterial({ color: 0x33261a, roughness: 0.78, metalness: 0.06 });
  const panelGeo = new THREE.BoxGeometry(1, 1, 0.05);
  const chairRailGeo = new THREE.BoxGeometry(1, 0.09, 0.14);

  // 护墙板：墙裙 + 竖向格条 + 腰线（贴在三面墙内侧）
  function addWainscot(cx, cz, length, rotY) {
    const g = new THREE.Group();
    const dado = new THREE.Mesh(panelGeo, wainscotMat);
    dado.scale.set(length, 0.92, 1);
    dado.position.y = 0.47;
    g.add(dado);
    const rail = new THREE.Mesh(chairRailGeo, detailTrimMat);
    rail.scale.x = length;
    rail.position.y = 0.98;
    g.add(rail);
    const n = Math.max(2, Math.round(length / 1.35));
    const stile = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.86, 0.055), detailTrimMat);
    for (let i = 0; i <= n; i++) {
      const s = stile.clone();
      s.position.set(-length / 2 + (length / n) * i, 0.46, 0.012);
      g.add(s);
    }
    g.position.set(cx, 0, cz);
    g.rotation.y = rotY;
    scene.add(g);
  }
  addWainscot(0, ROOM.backZ + 0.06, ROOM.w - 0.5, 0);
  addWainscot(ROOM.sideX - 0.06, 0.6, ROOM.d - 1.2, -Math.PI / 2);
  addWainscot(-ROOM.sideX + 0.06, 0.6, ROOM.d - 1.2, Math.PI / 2);

  // 壁柱：侧墙分三段，柱头柱脚各压一道线
  const pilasterGeo = new THREE.BoxGeometry(0.42, 4.1, 0.26);
  const pilasterCapGeo = new THREE.BoxGeometry(0.56, 0.14, 0.34);
  for (const sx of [-1, 1]) {
    for (const pz of [-8.6, -1.0, 2.8, 8.8]) {
      const col = new THREE.Mesh(pilasterGeo, pilasterMat);
      col.position.set(sx * (ROOM.sideX - 0.16), 2.05, pz);
      col.castShadow = true;
      scene.add(col);
      for (const cy of [0.36, 3.9]) {
        const cap = new THREE.Mesh(pilasterCapGeo, detailTrimMat);
        cap.position.set(sx * (ROOM.sideX - 0.16), cy, pz);
        scene.add(cap);
      }
    }
  }

  // 高窗：拱形发光玻璃 + 黄铜窗棂 + 窗台，窗光在地面留一片淡影
  function makeWindowTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 384;
    const x = c.getContext('2d');
    const grad = x.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, '#f0d8a0');
    grad.addColorStop(0.55, '#c9a86a');
    grad.addColorStop(1, '#6b5636');
    x.fillStyle = grad;
    x.fillRect(0, 0, 256, 384);
    // 远处树影与窗框投影
    x.fillStyle = 'rgba(30,22,14,.35)';
    for (let i = 0; i < 16; i++) {
      const bx = (i * 53) % 256;
      const bh = 40 + ((i * 37) % 90);
      x.fillRect(bx, 384 - bh, 18 + (i % 4) * 9, bh);
    }
    x.fillStyle = 'rgba(20,14,9,.55)';
    x.fillRect(0, 0, 10, 384);
    x.fillRect(246, 0, 10, 384);
    return new THREE.CanvasTexture(c);
  }
  const windowTex = makeWindowTexture();
  const windowMat = new THREE.MeshBasicMaterial({ map: windowTex, color: 0xffe6b8, fog: false });
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x1f1913, roughness: 0.7, metalness: 0.2 });
  const glowTexCanvas = document.createElement('canvas');
  glowTexCanvas.width = 128; glowTexCanvas.height = 128;
  (() => {
    const gx = glowTexCanvas.getContext('2d');
    const rg = gx.createRadialGradient(64, 64, 4, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,220,150,.55)');
    rg.addColorStop(0.5, 'rgba(255,210,140,.2)');
    rg.addColorStop(1, 'rgba(255,200,130,0)');
    gx.fillStyle = rg;
    gx.fillRect(0, 0, 128, 128);
  })();
  const windowGlowTex = new THREE.CanvasTexture(glowTexCanvas);
  const windowGlowMat = new THREE.MeshBasicMaterial({
    map: windowGlowTex, transparent: true, opacity: 0.7, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  });

  function addWindow(sx, z) {
    const g = new THREE.Group();
    const W = 1.7;
    const H = 2.5;
    const R = W / 2;
    const body = new THREE.Mesh(new THREE.PlaneGeometry(W, H), windowMat);
    body.position.y = H / 2;
    g.add(body);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(R, 24, 0, Math.PI), windowMat);
    arch.position.y = H;
    g.add(arch);
    // 外框 + 窗棂
    const frameMat = windowFrameMat;
    const fw = 0.08;
    for (const side of [-1, 1]) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(fw, H, 0.1), frameMat);
      v.position.set(side * (W / 2 + fw / 2), H / 2, 0.02);
      g.add(v);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(W + 0.42, 0.12, 0.3), detailTrimMat);
    sill.position.set(0, -0.02, 0.06);
    g.add(sill);
    const mullV = new THREE.Mesh(new THREE.BoxGeometry(0.05, H + R * 0.5, 0.06), frameMat);
    mullV.position.set(0, (H + R * 0.5) / 2, 0.04);
    g.add(mullV);
    for (const my of [H * 0.34, H * 0.68]) {
      const mullH = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, 0.06), frameMat);
      mullH.position.set(0, my, 0.04);
      g.add(mullH);
    }
    const archRing = new THREE.Mesh(new THREE.TorusGeometry(R + 0.025, 0.045, 8, 24, Math.PI), frameMat);
    archRing.position.set(0, H, 0.02);
    g.add(archRing);
    // 室内一侧的柔光
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.6, H * 2.0), windowGlowMat);
    glow.position.set(0, H * 0.55, 0.08);
    g.add(glow);
    g.position.set(sx * (ROOM.sideX - 0.09), 2.55, z);
    g.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(g);
    // 地面光斑
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.4, 3.2), windowGlowMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(sx * (ROOM.sideX - 1.5), 0.02, z);
    scene.add(pool);
  }
  addWindow(1, -4.9);
  addWindow(1, 6.2);
  addWindow(-1, -4.9);
  addWindow(-1, 6.2);

  // 天花藻井：纵横木梁 + 中央圆花 + 四周檐口
  const ceilBeamMat = new THREE.MeshStandardMaterial({ color: 0x2a2016, roughness: 0.9, metalness: 0.04, emissive: 0x1a120b, emissiveIntensity: 0.5 });
  const beamLongGeo = new THREE.BoxGeometry(0.22, 0.24, ROOM.d - 1.6);
  const beamCrossGeo = new THREE.BoxGeometry(ROOM.w - 1.6, 0.24, 0.22);
  // 梁底藏灯：很细的一条暖光，只为了让藻井不是一片黑
  const coveMat = new THREE.MeshBasicMaterial({
    color: 0xffc37a, transparent: true, opacity: 0.16, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  });
  const coveLongGeo = new THREE.BoxGeometry(0.06, 0.02, ROOM.d - 1.8);
  const coveCrossGeo = new THREE.BoxGeometry(ROOM.w - 1.8, 0.02, 0.06);
  for (const bx of [-9.4, -4.7, 4.7, 9.4]) {
    const b = new THREE.Mesh(beamLongGeo, ceilBeamMat);
    b.position.set(bx, ROOM.h - 0.12, 0);
    scene.add(b);
    const cove = new THREE.Mesh(coveLongGeo, coveMat);
    cove.position.set(bx, ROOM.h - 0.25, 0);
    scene.add(cove);
  }
  for (const bz of [-4.6, 0, 4.6]) {
    const b = new THREE.Mesh(beamCrossGeo, ceilBeamMat);
    b.position.set(0, ROOM.h - 0.12, bz);
    scene.add(b);
    const cove = new THREE.Mesh(coveCrossGeo, coveMat);
    cove.position.set(0, ROOM.h - 0.25, bz);
    scene.add(cove);
  }
  // 四周檐口：把天花与墙面接住
  const ceilTrim = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.2, 0.2), detailTrimMat);
  ceilTrim.position.set(0, ROOM.h - 0.1, ROOM.backZ + 0.12);
  scene.add(ceilTrim);
  for (const sx of [-1, 1]) {
    const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, ROOM.d), detailTrimMat);
    sideTrim.position.set(sx * (ROOM.sideX - 0.12), ROOM.h - 0.1, 0);
    scene.add(sideTrim);
  }
  // 中央圆花：吊灯从这里垂下
  const rose1 = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.5, 0.1, 32), detailTrimMat);
  rose1.position.set(CHANDELIER_POS.x, ROOM.h - 0.06, CHANDELIER_POS.z);
  scene.add(rose1);
  const rose2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 40), new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 0.6, roughness: 0.35 }));
  rose2.rotation.x = Math.PI / 2;
  rose2.position.set(CHANDELIER_POS.x, ROOM.h - 0.1, CHANDELIER_POS.z);
  scene.add(rose2);


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
  const shelfLabelGeo = new THREE.BoxGeometry(0.26, 0.05, 0.016);
  const shelfLabelMat = new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 0.6, roughness: 0.38, emissive: 0x3a2a10, emissiveIntensity: 0.18 });
  // 檐口齿饰：用一张重复贴图代替几十个小方块
  const dentilCanvas = document.createElement('canvas');
  dentilCanvas.width = 128;
  dentilCanvas.height = 16;
  (() => {
    const dx = dentilCanvas.getContext('2d');
    dx.fillStyle = '#241a12';
    dx.fillRect(0, 0, 128, 16);
    dx.fillStyle = '#463322';
    for (let i = 0; i < 8; i++) dx.fillRect(i * 16 + 3, 2, 10, 12);
  })();
  const dentilTex = new THREE.CanvasTexture(dentilCanvas);
  dentilTex.wrapS = THREE.RepeatWrapping;
  dentilTex.repeat.set(7, 1);
  const shelfDentilGeo = new THREE.BoxGeometry(3.42, 0.09, 0.014);
  const shelfDentilMat = new THREE.MeshStandardMaterial({ map: dentilTex, roughness: 0.82, metalness: 0.06 });
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
      // 层板前沿的黄铜标签夹
      const label = new THREE.Mesh(shelfLabelGeo, shelfLabelMat);
      label.position.set(0, by - 0.004, 0.252);
      g.add(label);
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
    // 檐口齿饰（一张重复贴图，成本低于几十个齿块）
    const dentil = new THREE.Mesh(shelfDentilGeo, shelfDentilMat);
    dentil.position.set(0, 3.4, 0.324);
    g.add(dentil);
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

  // 滑梯：靠在一组书架前的木梯，铜钩挂住檐口（馆里最像图书馆的一件东西）
  (() => {
    const host = SHELF_UNITS.reduce((a, b) => (b.z > a.z ? b : a), SHELF_UNITS[0]);
    const lad = new THREE.Group();
    const railGeo = new THREE.BoxGeometry(0.07, 3.5, 0.07);
    for (const dx of [-0.28, 0.28]) {
      const r = new THREE.Mesh(railGeo, wood);
      r.position.set(dx, 1.75, 0);
      r.castShadow = true;
      lad.add(r);
    }
    const rungGeo = new THREE.BoxGeometry(0.6, 0.05, 0.07);
    for (let i = 0; i < 8; i++) {
      const rung = new THREE.Mesh(rungGeo, woodDark);
      rung.position.set(0, 0.3 + i * 0.4, 0);
      lad.add(rung);
    }
    for (const dx of [-0.28, 0.28]) {
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 12), shelfEdgeMat);
      hook.position.set(dx, 3.48, -0.04);
      hook.rotation.x = Math.PI / 2;
      lad.add(hook);
    }
    lad.position.set(host.x + 1.02, 0, host.z + 0.78);
    lad.rotation.x = -0.14;
    scene.add(lad);
  })();

  // ---------- 书 ----------
  const BOOK_W = [0.16, 0.21, 0.26];
  const BOOK_HS = [0.54, 0.57, 0.60, 0.63];
  const bookItems = [];
  const floorSeq = {};
  const goldBandMat = new THREE.MeshStandardMaterial({ color: 0xc8a24a, metalness: 0.72, roughness: 0.28, emissive: 0x3a2a10, emissiveIntensity: 0.25 });
  const wornMat = new THREE.MeshStandardMaterial({ color: 0x17100a, roughness: 0.96, transparent: true, opacity: 0.7 });
  books.forEach((book, i) => {
    const unitIdx = i % SHELF_UNITS.length;
    const slot = Math.floor(i / SHELF_UNITS.length); // 0..perUnit-1
    const unit = SHELF_UNITS[unitIdx];
    const board = Math.floor(slot / booksPerBoard);
    const pos = slot % booksPerBoard;
    const level = (BOARD_Y[board] ?? BOARD_Y[BOARD_Y.length - 1]) + 0.03;
    const sx = (pos - (booksPerBoard - 1) / 2) * 0.72;
    // 确定性版式：厚度 / 高度 / 版式 / 材质都随书索引变化，刷新不变
    const variant = i % 3;
    const thickness = BOOK_W[variant];
    const height = BOOK_HS[(i + variant) % 4] || BOOK_H;
    const ordinal = (floorSeq[book.floor] = (floorSeq[book.floor] || 0) + 1);
    const basePos = new THREE.Vector3(unit.x + sx, level + height / 2 + 0.004, unit.z + 0.05);
    const jitter = ((strHash(String(book.id || i)) % 1000) / 1000 - 0.5) * 0.08;
    const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, jitter, 0));

    const baseColor = new THREE.Color(book.color || '#4a3a2e');
    const sideMat = new THREE.MeshStandardMaterial({
      color: baseColor.clone().multiplyScalar(0.78),
      roughness: [0.7, 0.58, 0.82][variant], metalness: [0.05, 0.12, 0.03][variant],
    });
    const spineMat = new THREE.MeshStandardMaterial({
      map: spineTexture(book, variant, ordinal),
      roughness: [0.62, 0.48, 0.8][variant], metalness: [0.05, 0.18, 0.02][variant],
      emissive: baseColor.clone().multiplyScalar(variant === 2 ? 0.18 : 0.25),
      emissiveIntensity: variant === 2 ? 0.28 : 0.35,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, 0.40), [sideMat, sideMat, sideMat, sideMat, spineMat, sideMat]);
    mesh.position.copy(basePos);
    mesh.quaternion.copy(baseQuat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // 金色横带：横排版式两条，其余部分书一条
    if (variant === 1) {
      for (const [by, bh] of [[height * 0.30, 0.028], [height * 0.17, 0.022]]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(thickness + 0.008, bh, 0.014), goldBandMat);
        band.position.set(0, by, 0.204);
        mesh.add(band);
      }
    } else if (i % 2 === 0) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(thickness + 0.008, 0.024, 0.014), goldBandMat);
      band.position.set(0, height * 0.28, 0.204);
      mesh.add(band);
    }
    // 部分书脊底边磨损暗条
    if (variant === 2 || i % 4 === 0) {
      const wear = new THREE.Mesh(new THREE.BoxGeometry(thickness + 0.006, 0.026, 0.012), wornMat);
      wear.position.set(0, -height / 2 + 0.032, 0.204);
      mesh.add(wear);
    }
    // 楼层个性：L2 蓝图带 / L3 账签 / L4 封蜡
    if (book.floor === 'L2') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(thickness + 0.010, 0.035, 0.408), new THREE.MeshStandardMaterial({ color: 0x7fb6d6, emissive: 0x2a4a5a, emissiveIntensity: 0.45 }));
      band.position.y = Math.min(0.18, height * 0.30);
      mesh.add(band);
    } else if (book.floor === 'L3') {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0xd8b45a, metalness: 0.55, roughness: 0.35 }));
      tag.position.set(0.02, 0.02, 0.21);
      mesh.add(tag);
    } else if (book.floor === 'L4') {
      const seal = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6a4a86, emissive: 0x3a2460, emissiveIntensity: 0.55 }));
      seal.position.set(0, -height * 0.30, 0.21);
      mesh.add(seal);
    }
    scene.add(mesh);

    const chapterId = (book.chapters && book.chapters[0] && book.chapters[0].id) || null;
    const item = { mesh, book, basePos, baseQuat, chapterId, body: null, animating: false, w: thickness, h: height };
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
  // 墙面装饰材质（程序化贴图，不引入外部资源）
  const decorMapMat = new THREE.MeshStandardMaterial({ map: makeDecorTexture('map'), roughness: 0.94, metalness: 0.02, side: THREE.DoubleSide });
  const decorNewsMat = new THREE.MeshStandardMaterial({ map: makeDecorTexture('news'), roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide });
  const decorLedgerMat = new THREE.MeshStandardMaterial({ map: makeDecorTexture('ledger'), roughness: 0.86, metalness: 0.05, side: THREE.DoubleSide });
  const decorSigilMat = new THREE.MeshBasicMaterial({ map: makeDecorTexture('sigil'), transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const decorFrameGoldMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, roughness: 0.45, metalness: 0.55 });
  const decorFrameKraftMat = new THREE.MeshStandardMaterial({ color: 0x5a4228, roughness: 0.86, metalness: 0.05 });
  const decorClipMat = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 0.7 });

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

  // ---------- 失窃页展柜（9 件：细铜柱 + 倾斜阅读台 + 纸页 + 玻璃罩 + 标签牌） ----------
  // 不参与 Rapier 物理；几何体与铜/玻璃/纸材质共用，只有标签纹理与标签材质逐件生成
  const stolenGroup = new THREE.Group();
  stolenGroup.name = 'stolenGroup';
  scene.add(stolenGroup);

  const stolenCopperMat = new THREE.MeshStandardMaterial({ color: 0x9a7a3a, roughness: 0.32, metalness: 0.8 });
  const stolenGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbfe0f0, transparent: true, opacity: 0.16, roughness: 0.05,
    metalness: 0.15, side: THREE.DoubleSide, depthWrite: false,
  });
  const stolenPaperMat = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.92, side: THREE.DoubleSide });
  const stolenPaperLitMat = new THREE.MeshStandardMaterial({
    color: 0xf6ecd0, roughness: 0.82, emissive: 0x6a5220, emissiveIntensity: 0.35, side: THREE.DoubleSide,
  });
  const stolenGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd8b45a, roughness: 0.24, metalness: 0.88, emissive: 0x4a3308, emissiveIntensity: 0.4,
  });
  const stolenRedMat = new THREE.MeshStandardMaterial({
    color: 0x5a1212, emissive: 0x8a1212, emissiveIntensity: 0.55, roughness: 0.55,
  });

  const stolenCaseGeo = {
    base: cylG(0.13, 0.17, 0.05, 20),
    post: cylG(0.026, 0.038, 0.82, 10),
    desk: boxG(0.42, 0.035, 0.32),
    glass: boxG(0.30, 0.12, 0.24),
    paper: planeG(0.22, 0.29),
    label: planeG(0.24, 0.12),
    seal: cylG(0.045, 0.045, 0.012, 18),
    ring: torusG(0.17, 0.014, 6, 32),
  };

  function stolenLabelTexture(item) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#1b1510';
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = 'rgba(200,162,74,.85)';
    g.lineWidth = 3;
    g.strokeRect(7, 7, 242, 114);
    g.strokeStyle = 'rgba(200,162,74,.3)';
    g.lineWidth = 1;
    g.strokeRect(15, 15, 226, 98);
    g.fillStyle = '#e6d9bd';
    g.textAlign = 'left';
    g.font = 'bold 42px monospace';
    g.fillText(String(item.no || 'S-00'), 26, 70);
    g.textAlign = 'right';
    g.fillStyle = '#c8a24a';
    g.font = 'bold 28px monospace';
    g.fillText(String(item.year || ''), 230, 70);
    g.textAlign = 'center';
    g.fillStyle = 'rgba(230,217,189,.5)';
    g.font = '15px "Songti SC", "SimSun", serif';
    g.fillText('失 窃 页 · 档 案', 128, 104);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  const stolenCases = [];
  for (const item of STOLEN_EXHIBITS) {
    const g = new THREE.Group();
    g.name = `stolen-${item.no || item.id}`;
    g.userData.stolenId = item.id;
    g.position.set(item.x, 0, item.z);
    // 左侧展柜朝 +X、右侧展柜朝 -X，正面朝向大厅中线
    g.rotation.y = item.x < 0 ? Math.PI / 2 : -Math.PI / 2;

    put(g, stolenCaseGeo.base, stolenCopperMat, 0, 0.025, 0, true);
    put(g, stolenCaseGeo.post, stolenCopperMat, 0, 0.46, 0, true);

    // 倾斜阅读台：整体绕 X 轴抬起，台面朝向读者
    const desk = new THREE.Group();
    desk.position.set(0, 0.87, 0);
    desk.rotation.x = 0.42;
    g.add(desk);
    put(desk, stolenCaseGeo.desk, stolenCopperMat, 0, 0.0175, 0, true);

    const paper = put(desk, stolenCaseGeo.paper, stolenPaperMat, 0, 0.045, 0);
    paper.rotation.x = -Math.PI / 2;

    put(desk, stolenCaseGeo.glass, stolenGlassMat, 0, 0.092, 0);

    // 追回后显示的镀金封条圆盘
    const seal = put(desk, stolenCaseGeo.seal, stolenGoldMat, 0.045, 0.055, -0.015);
    seal.visible = false;

    put(g, stolenCaseGeo.label, new THREE.MeshStandardMaterial({
      map: stolenLabelTexture(item), roughness: 0.68, metalness: 0.08,
      emissive: 0x2a2010, emissiveIntensity: 0.18, side: THREE.DoubleSide,
    }), 0, 0.66, 0.058);

    // 未追回：底座一圈暗红呼吸光环
    const ring = put(g, stolenCaseGeo.ring, stolenRedMat, 0, 0.062, 0);
    ring.rotation.x = Math.PI / 2;

    stolenGroup.add(g);
    stolenCases.push({ item, group: g, paperMesh: paper, sealMesh: seal, ringMesh: ring, recovered: false });
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

  // 墙面装饰：画框 + 纸面（严格贴墙，控制在每层 ≤12 个 mesh）
  function addWallBoard(parent, x, y, z, rotY, w, h, paperMat, frameMat, clipMat) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    parent.add(g);
    put(g, boxG(w + 0.13, h + 0.13, 0.055), frameMat, 0, 0, 0, true);
    put(g, planeG(w, h), paperMat, 0, 0, 0.034);
    if (clipMat) put(g, boxG(0.24, 0.13, 0.06), clipMat, 0, h / 2 - 0.06, 0.045);
    return g;
  }
  function addWallSigil(parent, x, y, z, rotY, radius) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    parent.add(g);
    put(g, torusG(radius, 0.018, 8, 48), propMats.violetFlame, 0, 0, 0);
    put(g, circleG(radius * 0.86, 32), decorSigilMat, 0, 0, 0.014);
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
    // 烛盘 + 水晶坠：细节层，低配直接跳过
    if (!LOW_SPEC && style !== 'L2') {
      const cR = style === 'L4' ? 0.72 : (style === 'L3' ? 0.82 : 0.86);
      const panMat = style === 'L4' ? propMats.iron : brassMat;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        put(ch, cylG(0.1, 0.075, 0.025, 10), panMat, Math.cos(a) * cR, 0.05, Math.sin(a) * cR);
      }
      const ringR = style === 'L3' ? 0.95 : (style === 'L4' ? 0.9 : 1.0);
      const crysMat = new THREE.MeshStandardMaterial({
        color: 0xe8f0ff, metalness: 0.8, roughness: 0.12, transparent: true, opacity: 0.78,
        emissive: 0x2a3a4a, emissiveIntensity: 0.45,
      });
      const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.042, 0), crysMat, 20);
      const cm = new THREE.Matrix4();
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        cm.makeTranslation(Math.cos(a) * ringR, -0.11, Math.sin(a) * ringR);
        crystals.setMatrixAt(i, cm);
      }
      crystals.instanceMatrix.needsUpdate = true;
      ch.add(crystals);
    }
    // 体积光锥：Additive + 低透明度 + 不写深度
    // 低配：只给半数吊灯生成光锥（透明叠绘减半），分段数同时减半
    const coneH = CHANDELIER_POS.y - 0.6;
    if (!LOW_SPEC || volumeCones.length % 2 === 0) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(2.25, coneH, LOW_SPEC ? 14 : 28, 1, true),
        new THREE.MeshBasicMaterial({
          color: coneColor, transparent: true, opacity: coneOpacity,
          depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        })
      );
      cone.position.y = -coneH / 2;
      cone.rotation.z = 0.04;
      ch.add(cone);
      volumeCones.push({ mesh: cone, base: coneOpacity, phase: volumeCones.length * 1.6, spin: style === 'L4' ? 0.05 : 0.03 });
    }
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
  // 墙面装饰：旧地图 / 报纸剪贴
  addWallBoard(p1, -4.7, 5.7, ROOM.backZ + 0.05, 0, 1.35, 0.95, decorMapMat, decorFrameGoldMat);
  addWallBoard(p1, 5.5, 5.4, ROOM.backZ + 0.05, 0, 1.0, 0.75, decorNewsMat, decorFrameGoldMat);
  addWallBoard(p1, -ROOM.sideX + 0.08, 6.0, -3.9, Math.PI / 2, 1.15, 0.8, decorMapMat, decorFrameGoldMat);

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
  // 墙面装饰：蓝图框（蓝色纸面 + 白色网格线）
  addWallBoard(p2, -5.2, 5.6, ROOM.backZ + 0.05, 0, 1.3, 0.9, blueprintMat, propMats.steel);
  addWallBoard(p2, 5.2, 6.1, ROOM.backZ + 0.05, 0, 1.1, 0.78, blueprintMat, propMats.steel);
  addWallBoard(p2, ROOM.sideX - 0.08, 5.7, -4.4, -Math.PI / 2, 1.25, 0.85, blueprintMat, propMats.steel);

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
  // 墙面装饰：报表板 / 账页夹 + 铜夹
  addWallBoard(p3, -5.4, 5.9, ROOM.backZ + 0.05, 0, 1.2, 0.9, decorLedgerMat, decorFrameKraftMat, decorClipMat);
  addWallBoard(p3, 5.2, 5.4, ROOM.backZ + 0.05, 0, 1.0, 0.75, decorLedgerMat, decorFrameKraftMat, decorClipMat);
  addWallBoard(p3, -ROOM.sideX + 0.08, 5.8, -4.2, Math.PI / 2, 1.1, 0.82, decorLedgerMat, decorFrameKraftMat, decorClipMat);

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
  // 墙面装饰：紫色符印圆环 + 暗色帷幕条
  addWallSigil(p4, ROOM.sideX - 0.08, 6.5, -3.9, -Math.PI / 2, 0.62);
  addWallSigil(p4, -ROOM.sideX + 0.08, 6.3, -4.7, Math.PI / 2, 0.5);
  const wallDrapeStrip = put(p4, planeG(0.95, 3.2), propMats.drape, ROOM.sideX - 0.1, 5.5, 4.9);
  wallDrapeStrip.rotation.y = -Math.PI / 2;

  // ===== L4 右墙暗门：十本「假如之书」的入口 =====
  // 门不参与物理与检索，只在 L4 可见；点击后交给 whatif.js 的暗门书架。
  const secretDoor = new THREE.Group();
  secretDoor.name = 'secretDoor';
  secretDoor.position.set(ROOM.sideX - 0.16, 0, 0.8);
  secretDoor.rotation.y = -Math.PI / 2;
  p4.add(secretDoor);
  const doorIronMat = new THREE.MeshStandardMaterial({ color: 0x211d24, roughness: 0.46, metalness: 0.7 });
  const doorWoodMat = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.84, metalness: 0.06 });
  const doorBrassMat = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.3, metalness: 0.86, emissive: 0x2a1c04, emissiveIntensity: 0.4 });
  const doorGlowMat = new THREE.MeshStandardMaterial({ color: 0xf0d68a, emissive: 0xc8a24a, emissiveIntensity: 0.95, roughness: 0.28, metalness: 0.55 });
  const doorSeamMat = new THREE.MeshBasicMaterial({ color: 0x8a6aff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  // 门缝里的紫光
  put(secretDoor, planeG(2.04, 3.7), doorSeamMat, 0, 1.96, 0.1);
  // 铁门框 / 门楣 / 门槛
  put(secretDoor, boxG(0.26, 3.94, 0.34), doorIronMat, -1.06, 1.97, 0.05, true);
  put(secretDoor, boxG(0.26, 3.94, 0.34), doorIronMat, 1.06, 1.97, 0.05, true);
  put(secretDoor, boxG(2.38, 0.26, 0.38), doorIronMat, 0, 3.9, 0.05, true);
  put(secretDoor, boxG(2.42, 0.12, 0.5), doorIronMat, 0, 0.06, 0.16, true);
  // 门板 + 四道铁箍 + 黄铜包边
  put(secretDoor, boxG(1.88, 3.6, 0.1), doorWoodMat, 0, 1.94, 0.16, true);
  for (const y of [0.56, 1.32, 2.72, 3.42]) put(secretDoor, boxG(1.92, 0.07, 0.035), doorIronMat, 0, y, 0.222);
  for (const [bx, by, bw, bh] of [[0, 3.7, 1.9, 0.035], [0, 0.18, 1.9, 0.035], [-0.93, 1.94, 0.035, 3.55], [0.93, 1.94, 0.035, 3.55]]) {
    put(secretDoor, boxG(bw, bh, 0.03), doorBrassMat, bx, by, 0.238);
  }
  // 门底透出的紫光
  put(secretDoor, planeG(1.78, 0.045), doorSeamMat, 0, 0.15, 0.243);
  // 十道书脊刻痕（两排五本）
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 5; i++) {
      put(secretDoor, boxG(0.1, 0.34, 0.03), doorGlowMat, -0.58 + i * 0.29, 1.66 + r * 0.44, 0.235);
    }
  }
  // 黄铜圆环符印
  put(secretDoor, torusG(0.29, 0.025, 8, 40), doorBrassMat, 0, 2.62, 0.24);
  put(secretDoor, circleG(0.26, 32), decorSigilMat, 0, 2.62, 0.242);
  // 门牌：X · 十本未编目
  const doorPlateCanvas = document.createElement('canvas');
  doorPlateCanvas.width = 512;
  doorPlateCanvas.height = 256;
  const dpc = doorPlateCanvas.getContext('2d');
  dpc.fillStyle = '#17110c';
  dpc.fillRect(0, 0, 512, 256);
  dpc.strokeStyle = '#c8a24a';
  dpc.lineWidth = 8;
  dpc.strokeRect(12, 12, 488, 232);
  dpc.textAlign = 'center';
  dpc.fillStyle = '#e6d9bd';
  dpc.font = 'bold 92px "Times New Roman", serif';
  dpc.fillText('X', 256, 124);
  dpc.fillStyle = '#c8a24a';
  dpc.font = '38px "Songti SC", "SimSun", serif';
  dpc.fillText('十本 · 未编目', 256, 198);
  const doorPlateTex = new THREE.CanvasTexture(doorPlateCanvas);
  doorPlateTex.colorSpace = THREE.SRGBColorSpace;
  const doorPlateMat = new THREE.MeshStandardMaterial({ map: doorPlateTex, roughness: 0.52, metalness: 0.3, emissive: 0x2a1c04, emissiveIntensity: 0.25 });
  put(secretDoor, planeG(0.7, 0.35), doorPlateMat, 0, 3.4, 0.245);
  // 门环把手
  put(secretDoor, torusG(0.1, 0.028, 8, 24), doorBrassMat, 0.66, 1.12, 0.27);
  put(secretDoor, sphereG(0.045, 10), doorBrassMat, 0.66, 1.26, 0.26);

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
  // 低配：粉尘数量减半，降低每帧 BufferAttribute 更新与填充开销
  const dustNear = buildDust(LOW_SPEC ? 250 : 500, 0.045, 0.06, 0.34, 0xffe0b0);
  const dustFar = buildDust(LOW_SPEC ? 600 : 1200, 0.016, 0.16, 0.18, 0xd9c8a8);

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
      world.createCollider(RAPIER.ColliderDesc.cuboid(item.w / 2, item.h / 2, 0.20).setFriction(0.98).setRestitution(0.02), rb);
      item.body = rb;
    }
  } catch (e) {
    console.warn('[3D] Rapier 初始化失败，退化为静态摆放', e);
  }

  // ---------- UI：提示 / 提示条 / 遮罩 / 电梯面板 ----------
  const hint = document.createElement('div');
  hint.className = 'mm-hint';
  hint.textContent = 'WASD 移动 · 拖拽转视角 · 点书抽出 · E 翻开 · Q 叠到 L1 长桌 · 右键放回';
  root.appendChild(hint);

  // 触屏：左下虚拟摇杆负责移动，画面拖动转视角（canvas 的 pointer 事件已通用）
  const joyEl = document.createElement('div');
  joyEl.className = 'mm-joy';
  joyEl.innerHTML = '<i></i>';
  root.appendChild(joyEl);
  const joyLabel = document.createElement('div');
  joyLabel.className = 'mm-joy-label';
  joyLabel.textContent = '拖动 / 点按摇杆移动';
  root.appendChild(joyLabel);
  const joyKnob = joyEl.querySelector('i');
  const joy = { x: 0, z: 0, active: false, id: null };
  const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarsePointer) {
    joyEl.style.display = 'block';
    joyLabel.style.display = 'block';
    hint.textContent = '左下摇杆移动 · 拖动画面转视角 · 点书抽出 · 长按/点按查看';
  }
  function joyMove(e) {
    const rect = joyEl.getBoundingClientRect();
    const max = rect.width / 2 - 20;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    joy.x = dx / max;
    joy.z = dy / max;
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  joyEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    joy.active = true;
    joy.id = e.pointerId;
    try { joyEl.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    joyMove(e);
  });
  joyEl.addEventListener('pointermove', (e) => {
    if (!joy.active || e.pointerId !== joy.id) return;
    e.preventDefault();
    joyMove(e);
  });
  function joyReset() {
    joy.active = false;
    joy.id = null;
    joy.x = 0;
    joy.z = 0;
    joyKnob.style.transform = 'translate(0, 0)';
  }
  joyEl.addEventListener('pointerup', joyReset);
  joyEl.addEventListener('pointercancel', joyReset);

  // 放大镜：点击桌上镜片可「举起」，镜片跟随鼠标，把画面局部真实放大
  const lensEl = document.createElement('div');
  lensEl.className = 'mm-lens';
  lensEl.innerHTML = '<canvas width="380" height="380"></canvas>';
  root.appendChild(lensEl);
  const lensCtx = lensEl.querySelector('canvas').getContext('2d');
  let lensOn = false;
  const lensXY = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  function lensPlace(x, y) {
    lensXY.x = x;
    lensXY.y = y;
    lensEl.style.left = x + 'px';
    lensEl.style.top = y + 'px';
  }
  function toggleLens(force) {
    lensOn = typeof force === 'boolean' ? force : !lensOn;
    lensEl.style.display = lensOn ? 'block' : 'none';
    if (lensOn) lensPlace(lensXY.x, lensXY.y);
    toast(lensOn ? '你举起了放大镜：把镜片移到书脊或书页上。' : '你把放大镜放回桌上。');
  }
  function drawLens() {
    if (!lensOn) return;
    const host = renderer.domElement;
    const rect = host.getBoundingClientRect();
    const x = lensXY.x - rect.left;
    const y = lensXY.y - rect.top;
    if (x < -20 || y < -20 || x > rect.width + 20 || y > rect.height + 20) {
      lensEl.style.display = 'none';
      return;
    }
    lensEl.style.display = 'block';
    const bw = host.width;
    const bh = host.height;
    const sw = Math.max(10, Math.round(bw * 0.085));
    let sx = Math.round((x / rect.width) * bw) - sw / 2;
    let sy = Math.round((y / rect.height) * bh) - sw / 2;
    sx = Math.max(0, Math.min(bw - sw, sx));
    sy = Math.max(0, Math.min(bh - sw, sy));
    try {
      lensCtx.drawImage(host, sx, sy, sw, sw, 0, 0, 380, 380);
    } catch (err) { /* 个别浏览器读取 WebGL 缓冲失败时静默 */ }
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lensOn) toggleLens(false);
  });

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
    L4: { near: 7.0, far: 28, bg: 0x120f1a, amb: 2.2, spot: 5.2, dir: 1.9, dust: 0.24 },
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
      shelf: 0x55465f, shelfDark: 0x3c3046, metal: 0.3, rough: 0.58,
      shelfAccent: 0x7a6a8e, shelfMetal: 0.62, shelfRough: 0.45,
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
    // 建筑细节跟随楼层主题：护墙板、壁柱、梁、窗光
    detailTrimMat.color.setHex(th.trim);
    wainscotMat.color.setHex(th.shelfDark);
    pilasterMat.color.setHex(th.trim);
    ceilBeamMat.color.setHex(th.shelfDark);
    // 极暗的主题色在顶上会糊成一片黑，给一点自发光把木梁托出来
    ceilingMat.emissive.setHex(th.ceiling);
    ceilingMat.emissive.multiplyScalar(2.0);
    ceilBeamMat.emissive.setHex(th.shelfDark);
    ceilBeamMat.emissive.multiplyScalar(0.6);
    windowFrameMat.color.setHex(th.trim);
    const winTint = { all: 0xffe6b8, L1: 0xffe0a8, L2: 0xa8d4f0, L3: 0xffce8a, L4: 0xb9a4ff };
    windowMat.color.setHex(winTint[fid] || winTint.all);
    windowGlowMat.color.setHex(winTint[fid] || winTint.all);

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
    clearHover(); // 切层后旧高亮目标可能已隐藏，先还原缩放
    applyAtmos(fid);
    for (const it of bookItems) {
      // 手里的书、桌上叠着的书不跟楼层隐藏，否则拿在手上会突然消失
      it.mesh.visible = it.stacked || it === heldBook || fid === 'all' || it.book.floor === fid;
    }
    for (const c of stolenCases) {
      c.group.visible = fid === 'all' || c.item.floor === fid;
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
    if (!silent) {
      toast(floorWelcome(fid));
      // L4 首次到达时补一句暗门提示，避免玩家错过右墙上的门
      if (fid === 'L4') {
        setTimeout(() => { if (currentFloor === 'L4') toast('右墙有一扇没有编号的门，门后传来十本书翻动的声音。', 4200); }, 2600);
      }
    }
  }

  // ---------- 相机控制：鼠标拖拽转视角 + WASD 移动 ----------
  const el = renderer.domElement;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let downY = 0;

  el.addEventListener('pointerdown', (e) => {
    if (tour) return;
    if (e.button === 2) return; // 右键留给「放回」
    dragging = true;
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (lensOn) lensPlace(e.clientX, e.clientY);
    if (tour) {
      dragging = false;
      return;
    }
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
    if (tour) {
      dragging = false;
      return;
    }
    if (!dragging) return;
    dragging = false;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved < 6) pick(e.clientX, e.clientY);
  });
  el.addEventListener('contextmenu', (e) => {
    if (!heldBook) return;
    e.preventDefault();
    putBackHeld();
  });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (tour) return;
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (tour) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
      keys[k] = true;
      e.preventDefault();
      return;
    }
    if (!heldBook) return;
    if (k === 'e' || k === 'enter') { openHeldBook(); e.preventDefault(); }
    else if (k === 'q') { placeOnTable(heldBook); e.preventDefault(); }
    else if (k === 'escape') { putBackHeld(); e.preventDefault(); }
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

  // 悬停反馈：仅临时放大 1.04 倍，不克隆材质、不新增网格；离开或换目标时还原
  let hovered = null;
  function clearHover() {
    if (!hovered) return;
    hovered.obj.scale.copy(hovered.scale);
    hovered = null;
    el.style.cursor = 'grab';
  }
  function applyHover(obj) {
    if (!obj) { clearHover(); return; }
    if (hovered && hovered.obj === obj) { el.style.cursor = 'pointer'; return; }
    clearHover();
    hovered = { obj, scale: obj.scale.clone() };
    obj.scale.multiplyScalar(1.04);
    el.style.cursor = 'pointer';
  }

  function hoverPick(e) {
    if (tour || traveling || taking) { clearHover(); return; }
    if (!isSceneVisible()) { clearHover(); return; }
    setPointer(e.clientX, e.clientY);
    const hits = raycaster.intersectObjects(bookItems.map((it) => it.mesh), false);
    const hitElev = raycaster.intersectObject(elevator, true);
    const hitStar = raycaster.intersectObject(starTable, true);
    const hitFrag = raycaster.intersectObjects(fragPapers, false);
    const hitLamp = raycaster.intersectObject(lampGroup, true);
    const hitZoom = raycaster.intersectObject(zoomGroup, true);
    const hitDrawer = raycaster.intersectObjects(cabinetDrawers, false);
    const hitHidden = hiddenBook.visible ? raycaster.intersectObject(hiddenBook, false) : [];
    const hitStolen = raycaster.intersectObjects(stolenCases.filter((c) => c.group.visible).map((c) => c.group), true);
    const hitDoor = currentFloor === 'L4' ? raycaster.intersectObject(secretDoor, true) : [];
    // 高亮目标与 pick 的拾取优先级保持一致，避免悬停提示与点击结果不一致
    let target = null;
    if (hitElev.length) target = elevator;
    else if (hitStar.length) target = starTable;
    else if (hitFrag.length) target = hitFrag[0].object;
    else if (hitHidden.length) target = hiddenBook;
    else if (hitStolen.length) {
      let obj = hitStolen[0].object;
      while (obj && obj.userData.stolenId == null) obj = obj.parent;
      target = obj || null;
    } else if (hitDoor.length && (!hits.length || hitDoor[0].distance < hits[0].distance)) target = secretDoor;
    else if (hitLamp.length) target = lampGroup;
    else if (hitZoom.length) target = zoomGroup;
    else if (hitDrawer.length) target = hitDrawer[0].object;
    else if (hits.length) {
      const item = hits[0].object.userData.item;
      target = item && !item.animating && item !== heldBook ? hits[0].object : null;
    }
    applyHover(target);
  }

  function pick(x, y) {
    if (tour || traveling) return;
    setPointer(x, y);
    // 手里有书：点自己=翻开，点别的书=先把手里这本叠到长桌，点空白=放回架上
    if (heldBook) {
      const heldHits = raycaster.intersectObjects(bookItems.map((it) => it.mesh), false);
      const target = heldHits.length ? heldHits[0].object.userData.item : null;
      if (target === heldBook) { openHeldBook(); return; }
      if (target && target !== heldBook && target.chapterId && !target.animating) {
        placeOnTable(heldBook);
        takeBook(target);
        return;
      }
      putBackHeld(true);
    }
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
    // 失窃页展柜：残页/隐藏书之后、书之前
    if (!taking) {
      const stolenHits = raycaster.intersectObjects(
        stolenCases.filter((c) => c.group.visible).map((c) => c.group), true
      );
      if (stolenHits.length) {
        let obj = stolenHits[0].object;
        while (obj && obj.userData.stolenId == null) obj = obj.parent;
        const stolenId = obj && obj.userData.stolenId;
        if (stolenId != null) {
          if (typeof onOpenStolen === 'function') onOpenStolen(stolenId);
          return;
        }
      }
    }
    // L4 右墙暗门：门比书近时才触发，避免隔着书架误点
    if (currentFloor === 'L4') {
      const doorHits = raycaster.intersectObject(secretDoor, true);
      const shelfHits = raycaster.intersectObjects(bookItems.map((it) => it.mesh), false);
      if (doorHits.length && (!shelfHits.length || doorHits[0].distance < shelfHits[0].distance)) {
        if (window.mmAudioPlay) window.mmAudioPlay('page');
        if (window.mmOpenWhatIfRoom) window.mmOpenWhatIfRoom();
        else toast('门后没有回应。');
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
      toggleLens();
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

  // ---------- 取书：先抽到手里，再翻开 / 叠到长桌 ----------
  let taking = false;
  let traveling = false;
  let heldBook = null;
  const stackItems = [];
  const handLook = new THREE.Object3D();
  const handTarget = new THREE.Vector3();
  const handQ = new THREE.Quaternion();
  const handDir = new THREE.Vector3();
  const handRight = new THREE.Vector3();

  function handPoint(out) {
    camera.getWorldDirection(handDir);
    handRight.crossVectors(handDir, camera.up).normalize();
    out.copy(camera.position).addScaledVector(handDir, 0.95).addScaledVector(handRight, 0.42);
    out.y -= 0.22;
    return out;
  }
  function handQuaternion(out) {
    handLook.position.copy(handPoint(handTarget));
    handLook.lookAt(camera.position);
    return out.copy(handLook.quaternion);
  }

  function restoreToShelf(item, animate = true) {
    if (item.stacked) {
      item.stacked = false;
      if (item.mesh.parent !== scene) scene.attach(item.mesh);
    }
    const si = stackItems.indexOf(item);
    if (si >= 0) stackItems.splice(si, 1);
    const done = () => {
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
    };
    if (!animate) { done(); return; }
    const start = item.mesh.position.clone();
    const startQ = item.mesh.quaternion.clone();
    item.animating = true;
    const t0 = performance.now();
    const dur = 480;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = easeInOut(p);
      item.mesh.position.lerpVectors(start, item.basePos, e);
      item.mesh.position.y += Math.sin(p * Math.PI) * 0.18;
      item.mesh.quaternion.copy(startQ).slerp(item.baseQuat, e);
      item.mesh.scale.setScalar(1 + 0.1 * Math.sin(p * Math.PI));
      if (p < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  }

  // 桌上 3 摞，按书脊厚度自然加高
  function layoutStack() {
    const heights = {};
    stackItems.forEach((it, i) => {
      const col = i % 3;
      const th = it.w || 0.2;
      const h = heights[col] || 0;
      it.mesh.position.set(-0.75 + col * 0.75, 0.82 + h + th / 2, 0.02);
      it.mesh.quaternion.setFromEuler(new THREE.Euler(0, (i - 1) * 0.07, Math.PI / 2, 'YXZ'));
      it.mesh.scale.setScalar(1);
      heights[col] = h + th + 0.008;
    });
  }

  function placeOnTable(item) {
    if (!item) return;
    if (currentFloor !== 'L1') {
      heldBook = null;
      restoreToShelf(item);
      toast('长桌在 L1 旧纸层，这本书先放回架上。');
      return;
    }
    heldBook = null;
    item.animating = false;
    item.stacked = true;
    if (item.body) item.body.setEnabled(false);
    if (item.mesh.parent !== t1) t1.attach(item.mesh);
    stackItems.push(item);
    if (stackItems.length > 12) restoreToShelf(stackItems.shift());
    layoutStack();
    if (window.mmAudioPlay) window.mmAudioPlay('step');
    toast(`《${item.book.title}》放在长桌上，已叠 ${stackItems.length} 本。`);
  }

  function putBackHeld(silent = false) {
    if (!heldBook) return;
    const item = heldBook;
    heldBook = null;
    restoreToShelf(item);
    if (!silent) toast('书已放回架上。');
  }

  function openHeldBook() {
    if (!heldBook) return;
    const item = heldBook;
    heldBook = null;
    clearHover();
    taking = true;
    item.animating = true;
    if (item.body) item.body.setEnabled(false);
    const start = item.mesh.position.clone();
    const startQ = item.mesh.quaternion.clone();
    camera.getWorldDirection(handDir);
    const target = camera.position.clone().addScaledVector(handDir, 0.52);
    const dummy = new THREE.Object3D();
    dummy.position.copy(target);
    dummy.lookAt(camera.position);
    const targetQ = dummy.quaternion.clone();
    const t0 = performance.now();
    const dur = 460;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = easeInOut(p);
      item.mesh.position.lerpVectors(start, target, e);
      item.mesh.quaternion.copy(startQ).slerp(targetQ, e);
      item.mesh.scale.setScalar(0.5 + 0.35 * e);
      if (p < 1) requestAnimationFrame(step);
      else {
        fade(true);
        setTimeout(() => {
          onOpenBook(item.chapterId);
          setTimeout(() => fade(false), 380);
        }, 200);
        setTimeout(() => {
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
          item.animating = false;
          taking = false;
        }, 780);
      }
    };
    requestAnimationFrame(step);
  }

  function takeBook(item) {
    if (taking || tour || !item) return;
    clearHover();
    if (heldBook) putBackHeld(true);
    taking = true;
    if (window.mmAudioPlay) window.mmAudioPlay('page');
    item.animating = true;
    if (item.stacked) {
      item.stacked = false;
      if (item.mesh.parent !== scene) scene.attach(item.mesh);
      const si = stackItems.indexOf(item);
      if (si >= 0) stackItems.splice(si, 1);
      layoutStack();
    }
    if (item.body) item.body.setEnabled(false);
    const start = item.mesh.position.clone();
    const startQ = item.mesh.quaternion.clone();
    const target = handPoint(new THREE.Vector3());
    const targetQ = handQuaternion(new THREE.Quaternion());
    const t0 = performance.now();
    const dur = 720;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = easeInOut(p);
      item.mesh.position.lerpVectors(start, target, e);
      item.mesh.position.y += Math.sin(p * Math.PI) * 0.14;
      item.mesh.quaternion.copy(startQ).slerp(targetQ, e);
      item.mesh.scale.setScalar(1 - 0.5 * e);
      if (p < 1) requestAnimationFrame(step);
      else {
        item.animating = false;
        taking = false;
        heldBook = item;
        item.mesh.visible = true;
        toast(`《${item.book.title}》已抽到手里：左键/E 翻开 · 右键 放回 · Q 放到长桌。`);
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

  // ---------- 导览（供 index.html 调用） ----------
  function tourRestoreHome() {
    if (!tour || !tour.home) return;
    player.pos.copy(tour.home.pos);
    player.tYaw = tour.home.tYaw;
    player.tPitch = tour.home.tPitch;
  }

  function endTour() {
    const home = tour && tour.home;
    tour = null;
    override = null;
    joyReset();
    if (home) {
      player.pos.copy(home.pos);
      player.tYaw = home.tYaw;
      player.tPitch = home.tPitch;
      player.yaw = home.tYaw;
      player.pitch = home.tPitch;
      updateCamera();
    }
  }

  function tourGo(i) {
    if (!tour) return;
    const idx = Number(i);
    const stops = tour.stops;
    if (!Number.isFinite(idx) || idx < 0 || idx >= stops.length) {
      const handlers = tour.handlers || {};
      endTour();
      if (typeof handlers.onEnd === 'function') handlers.onEnd();
      return;
    }
    const stop = stops[idx] || {};
    const n = (v, d) => (v == null || !Number.isFinite(Number(v)) ? d : Number(v));
    if (stop.floor && stop.floor !== currentFloor) {
      setFloor(stop.floor, true);
      tourRestoreHome();
    }
    const toPos = new THREE.Vector3(n(stop.x, 0), n(stop.y, 1.68), n(stop.z, 0));
    const toLook = new THREE.Vector3(
      n(stop.lookX, toPos.x),
      n(stop.lookY, toPos.y),
      n(stop.lookZ, toPos.z - 1),
    );
    const fromPos = camera.position.clone();
    const fromLook = fromPos.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4));
    tour.hold = { pos: toPos, look: toLook };
    tour.anim = { t0: performance.now(), dur: 900, fromPos, fromLook, toPos, toLook, i: idx };
  }

  function startTour(stops, handlers = {}) {
    if (!Array.isArray(stops) || !stops.length) return;
    if (traveling || taking) return;
    clearHover(); // 导览期间不接受悬停，先还原旧高亮
    if (heldBook) putBackHeld(true);
    if (tour) endTour();
    for (const k in keys) keys[k] = false;
    const home = { pos: player.pos.clone(), tYaw: player.tYaw, tPitch: player.tPitch };
    tour = { stops, handlers, anim: null, hold: null, home };
    if (stops[0] && stops[0].floor) {
      setFloor(stops[0].floor, true);
      tourRestoreHome();
    }
    tourGo(0);
  }

  function isTouring() {
    return !!tour;
  }

  async function travelTo(fid) {
    if (tour || traveling || taking) return;
    clearHover(); // 转场期间还原悬停缩放
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
    if (tour) endTour();
    clearHover();
    joyReset();
    if (lensOn) toggleLens(false);
    taking = false;
    heldBook = null;
    stackItems.length = 0;
    for (const item of bookItems) {
      item.stacked = false;
      if (item.mesh.parent !== scene) scene.attach(item.mesh);
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
    if (tour || traveling || taking) return;
    if (document.body.classList.contains('reading') || document.body.classList.contains('grid')) return;
    const speed = 4.2;
    let fx = 0;
    let fz = 0;
    if (keys.w) fz -= 1;
    if (keys.s) fz += 1;
    if (keys.a) fx -= 1;
    if (keys.d) fx += 1;
    // 手机虚拟摇杆：保留模拟量，轻推慢走、推满快走
    if (joy.active) {
      if (Math.abs(joy.x) > 0.12) fx += joy.x;
      if (Math.abs(joy.z) > 0.12) fz += joy.z;
    }
    if (!fx && !fz) return;
    const len = Math.hypot(fx, fz);
    if (len > 1) { fx /= len; fz /= len; }
    const cos = Math.cos(player.yaw);
    const sin = Math.sin(player.yaw);
    const wx = fx * cos + fz * sin;
    const wz = -fx * sin + fz * cos;
    const oldX = player.pos.x;
    const oldZ = player.pos.z;
    const nx = Math.max(-ROOM.minX, Math.min(ROOM.minX, oldX + wx * speed * dt));
    const nz = Math.max(ROOM.minZ, Math.min(ROOM.maxZ, oldZ + wz * speed * dt));
    // 分轴滑动碰撞：贴着书架走，可从组间空隙绕到后排，但不能穿过书架
    if (!blockedAt(nx, oldZ)) player.pos.x = nx;
    if (!blockedAt(player.pos.x, nz)) player.pos.z = nz;
  }

  let elapsed = 0;
  // 3D 可见性：2D 页面（body 含 grid/reading）、后台标签页或容器隐藏时不渲染
  let sceneHost = null;
  function isSceneVisible() {
    if (document.hidden) return false;
    const body = document.body;
    if (body && (body.classList.contains('grid') || body.classList.contains('reading'))) return false;
    if (!sceneHost || !sceneHost.isConnected) sceneHost = document.getElementById('scene3d');
    if (!sceneHost) return false;
    if (sceneHost.clientWidth === 0 && sceneHost.clientHeight === 0) return false;
    const cs = window.getComputedStyle(sceneHost);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function tick(now) {
    requestAnimationFrame(tick);
    const nowMs = now || performance.now();
    if (!isSceneVisible()) {
      // 隐藏时只推进时间戳：不 step 物理、不更新粒子、不渲染，恢复时 dt 不跳变
      lastFrame = nowMs;
      return;
    }
    const dt = Math.min(0.06, Math.max(0.001, (nowMs - lastFrame) / 1000));
    lastFrame = nowMs;
    elapsed += dt;
    // 导览：用 override 驱动相机，动画 900ms easeInOut，到位后停在目标
    if (tour) {
      if (tour.anim) {
        const a = tour.anim;
        const p = Math.max(0, Math.min(1, (nowMs - a.t0) / a.dur));
        const e = easeInOut(p);
        override = {
          pos: a.fromPos.clone().lerp(a.toPos, e),
          look: a.fromLook.clone().lerp(a.toLook, e),
        };
        if (p >= 1) {
          const cb = tour.handlers && tour.handlers.onStep;
          const idx = a.i;
          tour.anim = null;
          override = { pos: a.toPos, look: a.toLook };
          if (typeof cb === 'function') cb(idx);
        }
      } else if (tour.hold) {
        override = { pos: tour.hold.pos, look: tour.hold.look };
      }
    }
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
        // 手里的书、桌上的书由动画/桌面位置接管，不让物理体把它们拉回书架
        if (!item.body || item.animating || item === heldBook || item.stacked) continue;
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
    // 暗门书脊刻痕与门缝的呼吸
    if (currentFloor === 'L4') {
      const doorPulse = 0.55 + Math.sin(elapsed * 2.1) * 0.3;
      doorGlowMat.emissiveIntensity = doorPulse;
      doorSeamMat.opacity = 0.2 + (doorPulse - 0.25) * 0.35;
    }
    // 未追回展柜的暗红呼吸光环（共用材质，仅可见的环在脉动）
    stolenRedMat.emissiveIntensity = 0.4 + 0.28 * Math.sin(elapsed * 1.7);
    orb.scale.setScalar(1 + Math.sin(elapsed * 0.9) * 0.05);
    for (let d = 0; d < starDots.length; d++) {
      starDots[d].material.emissiveIntensity = 0.6 + 0.35 * Math.sin(elapsed * 1.3 + d);
    }
    for (let d = 0; d < orbitDots.length; d++) {
      orbitDots[d].material.emissiveIntensity = 0.6 + 0.4 * Math.sin(elapsed * 1.6 + d * 1.2);
    }
    // 手里的书跟着人走：握住位置随视角，带一点呼吸浮动
    if (heldBook && !taking) {
      heldBook.mesh.position.lerp(handPoint(handTarget), 0.28);
      heldBook.mesh.quaternion.slerp(handQuaternion(handQ), 0.28);
      heldBook.mesh.scale.setScalar(0.5 + Math.sin(elapsed * 2.4) * 0.006);
      heldBook.mesh.visible = true;
    }
    renderer.render(scene, camera);
    drawLens();
  }
  requestAnimationFrame(tick);
  requestAnimationFrame(() => loading.remove());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 标签页重新可见时重置时间戳，避免恢复首帧 dt 跳变
  document.addEventListener('visibilitychange', () => {
    lastFrame = performance.now();
  });

  // ---------- 楼层平面图数据（供 2D 平面图 / 导览） ----------
  function getPlan() {
    const shelves = SHELF_UNITS.map((u) => ({ x: u.x, z: u.z, bookIds: [] }));
    bookItems.forEach((it, i) => {
      const target = shelves[i % SHELF_UNITS.length];
      if (target) target.bookIds.push(it.book.id || it.book.call || '');
    });
    return {
      room: { w: ROOM.w, d: ROOM.d, sideX: ROOM.sideX, backZ: ROOM.backZ, minZ: ROOM.minZ, maxZ: ROOM.maxZ },
      shelves,
      elevator: { x: elevator.position.x, z: elevator.position.z },
      star: { x: starTable.position.x, z: starTable.position.z },
      cabinet: { x: cabinet.position.x, z: cabinet.position.z },
      lamp: { x: lampGroup.position.x, z: lampGroup.position.z },
      hidden: { x: hiddenBook.position.x, z: hiddenBook.position.z },
    };
  }

  // ---------- 失窃页状态 / 定位（供 index.html 调用） ----------
  function setCollectibleStates(states) {
    const recoveredMap = (states && states.stolen) || {};
    for (const c of stolenCases) {
      const recovered = recoveredMap[c.item.id] === 'recovered';
      c.recovered = recovered;
      c.paperMesh.material = recovered ? stolenPaperLitMat : stolenPaperMat;
      c.sealMesh.visible = recovered;
      c.ringMesh.visible = !recovered;
    }
  }

  function focusStolen(id) {
    const found = stolenCases.find((c) => c.item.id === id);
    if (!found) return false;
    if (traveling || taking) return false;
    if (tour) endTour();
    if (found.item.floor !== currentFloor) setFloor(found.item.floor, true);
    override = null;
    for (const k in keys) keys[k] = false;
    // 展柜正面朝大厅中线：局部 +Z 经 rotation.y 后的方向
    const fx = Math.sin(found.group.rotation.y);
    const fz = Math.cos(found.group.rotation.y);
    const px = found.item.x + fx * 1.6;
    const pz = found.item.z + fz * 1.6;
    player.pos.set(px, 1.68, pz);
    const dx = found.item.x - px;
    const dz = found.item.z - pz;
    player.tYaw = Math.atan2(-dx, -dz);
    player.tPitch = Math.atan2(0.85 - player.pos.y, Math.hypot(dx, dz));
    snapCamToPreset();
    return true;
  }

  function getStolenPlan() {
    return stolenCases.map((c) => ({
      id: c.item.id, no: c.item.no, floor: c.item.floor, x: c.item.x, z: c.item.z,
    }));
  }

  return {
    reset, setFloor, scene, camera, renderer, bookItems, elevator, player, propGroups, shelfUnits: SHELF_UNITS,
    secretDoor,
    setHiddenVisible: (v) => { hiddenBook.visible = !!v; },
    getFloor: () => currentFloor,
    toastFloor: () => toast(floorWelcome(currentFloor)),
    startTour,
    tourGo,
    endTour,
    isTouring,
    getPlan,
    setCollectibleStates,
    focusStolen,
    getStolenPlan,
    toggleLens,
    isLensOn: () => lensOn,
    // 抽书 / 叠书（也供 E2E 与后续脚本调用）
    grabBook: (id) => {
      const item = bookItems.find((it) => (it.book.id || it.book.call) === id);
      if (!item) return false;
      takeBook(item);
      return true;
    },
    heldInfo: () => (heldBook ? { id: heldBook.book.id, title: heldBook.book.title } : null),
    openHeld: () => { if (!heldBook) return false; openHeldBook(); return true; },
    stackHeld: () => { if (heldBook) { placeOnTable(heldBook); return true; } return false; },
    getStack: () => stackItems.map((it) => it.book.id),
  };
}

export function dispose3D(api) {
  if (!api) return;
  api.renderer.dispose();
}

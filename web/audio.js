// audio.js · 极简环境音（WebAudio 程序生成，无外部素材）
// 音效默认关闭；开启后有房间底噪 + 翻书 / 脚步 / 电梯 / 拾页 / 开关提示音。
(function () {
  let ac = null;
  let master = null;
  let ambientSrc = null;
  let ambientGain = null;
  let starNodes = [];
  let starOpen = false;
  let lastSound = '';

  function enabled() {
    return localStorage.getItem('mm_sound') === 'on';
  }

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.62;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  // 浏览器要求用户手势后才能出声：把播放统一放到 resume 之后
  function withAudio(fn) {
    try {
      const a = ctx();
      if (!a) return;
      if (a.state === 'suspended') a.resume().then(() => fn(a)).catch(() => {});
      else fn(a);
    } catch (e) { /* 音频失败不影响使用 */ }
  }

  function toneAt(a, freq, dur, type, gain, slideTo, delay = 0) {
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(Math.max(0.0001, gain), t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noiseAt(a, dur, gain, highpass, delay = 0) {
    const t0 = a.currentTime + delay;
    const len = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass || 800;
    const g = a.createGain();
    g.gain.value = gain;
    src.connect(hp).connect(g).connect(master);
    src.start(t0);
  }

  // 低音量房间底噪：开/关音效时能立刻听出差别
  function startAmbient(a) {
    if (!a || ambientSrc) return;
    const len = Math.max(1, Math.floor(a.sampleRate * 4));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    ambientSrc = a.createBufferSource();
    ambientSrc.buffer = buf;
    ambientSrc.loop = true;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 360;
    ambientGain = a.createGain();
    ambientGain.gain.value = 0.035;
    ambientSrc.connect(lp).connect(ambientGain).connect(master);
    ambientSrc.start();
  }

  function stopAmbient() {
    if (ambientSrc) {
      try { ambientSrc.stop(); } catch (e) { /* 已停止 */ }
      try { ambientSrc.disconnect(); } catch (e) { /* 忽略 */ }
      ambientSrc = null;
    }
    if (ambientGain) {
      try { ambientGain.disconnect(); } catch (e) { /* 忽略 */ }
      ambientGain = null;
    }
  }

  // 星图：很轻的星河流转 pad + 高频微光，进出星图时淡入淡出
  function startStar(a) {
    starOpen = true;
    if (!a || starNodes.length) return;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.018, a.currentTime + 1.4);
    const o1 = a.createOscillator(); o1.type = 'sine'; o1.frequency.value = 196;
    const o2 = a.createOscillator(); o2.type = 'sine'; o2.frequency.value = 293.66;
    const o3 = a.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 392;
    const lfo = a.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.07;
    const lg = a.createGain(); lg.gain.value = 0.006;
    lfo.connect(lg).connect(g.gain);
    const len = Math.max(1, Math.floor(a.sampleRate * 2));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.22;
    const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.8;
    const ng = a.createGain(); ng.gain.value = 0.012;
    o1.connect(g); o2.connect(g); o3.connect(g);
    src.connect(bp).connect(ng).connect(g);
    g.connect(master);
    o1.start(); o2.start(); o3.start(); lfo.start(); src.start();
    starNodes = [o1, o2, o3, lfo, src, g, ng];
  }

  function stopStar() {
    starOpen = false;
    if (!starNodes.length) return;
    const [o1, o2, o3, lfo, src, g, ng] = starNodes;
    try {
      g.gain.cancelScheduledValues(ac.currentTime);
      g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.22);
    } catch (e) { /* 忽略 */ }
    setTimeout(() => {
      try { o1.stop(); o2.stop(); o3.stop(); lfo.stop(); src.stop(); } catch (e) { /* 已停止 */ }
      try { g.disconnect(); ng.disconnect(); } catch (e) { /* 忽略 */ }
      starNodes = [];
    }, 800);
  }

  function render(name, a) {
    lastSound = name;
    if (name === 'page') {
      noiseAt(a, 0.12, 0.1, 2200);
      noiseAt(a, 0.18, 0.075, 1500, 0.09);
    } else if (name === 'step') {
      toneAt(a, 72, 0.1, 'sine', 0.06);
    } else if (name === 'elevator') {
      toneAt(a, 210, 0.95, 'sine', 0.045, 120);
      noiseAt(a, 0.9, 0.02, 380);
    } else if (name === 'ding') {
      toneAt(a, 660, 0.65, 'sine', 0.05);
      toneAt(a, 990, 0.85, 'sine', 0.032, null, 0.06);
    } else if (name === 'frag') {
      noiseAt(a, 0.2, 0.1, 2800);
      toneAt(a, 880, 0.12, 'triangle', 0.03, 1040);
    } else if (name === 'lampOn') {
      noiseAt(a, 0.04, 0.03, 1800);
      toneAt(a, 440, 0.12, 'sine', 0.04, 520);
    } else if (name === 'lampOff') {
      noiseAt(a, 0.04, 0.03, 1400);
      toneAt(a, 360, 0.14, 'sine', 0.035, 220);
    } else if (name === 'stamp') {
      noiseAt(a, 0.06, 0.07, 900);
      toneAt(a, 120, 0.18, 'sine', 0.055);
    } else if (name === 'door') {
      noiseAt(a, 0.35, 0.045, 300);
      toneAt(a, 80, 0.5, 'sine', 0.04, 55);
    } else if (name === 'on') {
      toneAt(a, 520, 0.16, 'sine', 0.08);
      toneAt(a, 780, 0.22, 'sine', 0.055, null, 0.12);
    } else if (name === 'off') {
      toneAt(a, 360, 0.18, 'sine', 0.06, 220);
    }
  }

  function play(name) {
    if (!enabled()) return;
    withAudio((a) => render(name, a));
  }

  function toggle() {
    const on = enabled();
    if (on) {
      // 先响一个下行提示音，再关掉底噪与星图 pad
      withAudio((a) => render('off', a));
      localStorage.setItem('mm_sound', 'off');
      stopAmbient();
      stopStar();
      return false;
    }
    localStorage.setItem('mm_sound', 'on');
    withAudio((a) => {
      startAmbient(a);
      if (starOpen) startStar(a);
      render('on', a);
    });
    return true;
  }

  function isOn() { return enabled(); }

  // 页面刷新后若音效仍是开，等第一次用户手势再把底噪接上（浏览器自动播放限制）
  window.addEventListener('pointerdown', function bootAmbient() {
    if (enabled()) withAudio((a) => startAmbient(a));
  }, { once: true });

  window.mmAudioPlay = play;
  window.mmAudioToggle = toggle;
  window.mmAudioOn = isOn;
  window.mmAudioState = () => (ac ? ac.state : 'none');
  window.mmAudioAmbient = () => !!ambientSrc;
  window.mmAudioStarStart = () => {
    starOpen = true;
    if (enabled()) withAudio((a) => startStar(a));
  };
  window.mmAudioStarStop = stopStar;
  window.mmAudioStarOn = () => starOpen;
  window.mmAudioLast = () => lastSound;
})();

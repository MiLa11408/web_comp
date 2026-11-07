// audio.js · 极简环境音（WebAudio 程序生成，无外部素材）
(function () {
  let ac = null;
  let master = null;

  function enabled() {
    return localStorage.getItem('mm_sound') !== 'off';
  }

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.55;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function toneAt(a, freq, dur, type, gain, slideTo) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), a.currentTime + dur);
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g).connect(master);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }

  function noiseAt(a, dur, gain, highpass) {
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
    src.start();
  }

  function play(name) {
    if (!enabled()) return;
    try {
      const a = ctx();
      if (!a) return;
      if (name === 'page') {
        noiseAt(a, 0.11, 0.09, 2400);
        setTimeout(() => { try { noiseAt(a, 0.16, 0.07, 1600); } catch (e) {} }, 90);
      } else if (name === 'step') {
        toneAt(a, 72, 0.09, 'sine', 0.045);
      } else if (name === 'elevator') {
        toneAt(a, 210, 0.9, 'sine', 0.03, 120);
        noiseAt(a, 0.9, 0.015, 380);
      } else if (name === 'frag') {
        noiseAt(a, 0.18, 0.08, 3000);
      }
    } catch (e) { /* 音频失败不影响使用 */ }
  }

  function toggle() {
    const on = enabled();
    localStorage.setItem('mm_sound', on ? 'off' : 'on');
    if (!on) { try { const a = ctx(); if (a) play('page'); } catch (e) {} }
    return !on;
  }

  function isOn() { return enabled(); }

  window.mmAudioPlay = play;
  window.mmAudioToggle = toggle;
  window.mmAudioOn = isOn;
})();

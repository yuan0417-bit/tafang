// audio.js - Stellar Bastion 程序化音效
const BastionAudio = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  const last = {};

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }
  function cooldown(n, ms) {
    const now = performance.now();
    if ((last[n] || 0) + ms > now) return false;
    last[n] = now; return true;
  }
  function tone(freq, dur, o = {}) {
    if (!ensure() || muted) return;
    resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.4, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  function noise(dur, o = {}) {
    if (!ensure() || muted) return;
    resume();
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g).connect(master);
    src.start(t);
  }

  return {
    setMuted(v) { muted = !!v; },
    isMuted() { return muted; },
    resume, ensure,

    shoot(level = 0) {
      // low to high pitch based on level
      const f = 520 + level * 60;
      tone(f, 0.06, { type: 'square', vol: 0.15, glide: f * 0.6 });
    },
    shootHeavy() {
      tone(180, 0.12, { type: 'sawtooth', vol: 0.22, glide: 90 });
    },
    shootRapid() {
      if (!cooldown('rapid', 18)) return;
      tone(900, 0.04, { type: 'square', vol: 0.1 });
    },
    shootSpread() {
      tone(660, 0.07, { type: 'triangle', vol: 0.16 });
    },
    shootBlack() {
      tone(220, 0.18, { type: 'sawtooth', vol: 0.28, glide: 60 });
      tone(440, 0.14, { type: 'triangle', vol: 0.18 });
    },
    hit() {
      if (!cooldown('hit', 30)) return;
      tone(800, 0.04, { type: 'square', vol: 0.1 });
    },
    slow() {
      tone(1200, 0.12, { type: 'sine', vol: 0.18, glide: 600 });
    },
    trap() {
      noise(0.18, { vol: 0.32 });
      tone(160, 0.2, { type: 'sawtooth', vol: 0.28, glide: 70 });
    },
    shield() {
      tone(440, 0.1, { type: 'sine', vol: 0.22 });
      tone(880, 0.08, { type: 'triangle', vol: 0.16 });
    },
    special() {
      [523, 659, 784, 988].forEach((f, i) => setTimeout(() => tone(f, 0.16, { type: 'triangle', vol: 0.25 }), i * 70));
    },
    coin() {
      tone(1200, 0.06, { type: 'square', vol: 0.14 });
      tone(1600, 0.04, { type: 'square', vol: 0.1 });
    },
    freeze() {
      tone(1500, 0.3, { type: 'sine', vol: 0.28, glide: 400 });
    },
    leak() {
      tone(220, 0.1, { type: 'sawtooth', vol: 0.22, glide: 110 });
    },
    die() {
      noise(0.4, { vol: 0.4 });
      tone(180, 0.4, { type: 'sawtooth', vol: 0.32, glide: 60 });
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.2, { type: 'sine', vol: 0.3 }), i * 100));
    },
    click() {
      tone(720, 0.04, { type: 'square', vol: 0.12 });
    },
    error() {
      tone(180, 0.1, { type: 'sawtooth', vol: 0.22 });
    },
    reroll() {
      [400, 600, 800].forEach((f, i) => setTimeout(() => tone(f, 0.08, { type: 'triangle', vol: 0.18 }), i * 60));
    },
    waveStart() {
      tone(330, 0.1, { type: 'sine', vol: 0.22 });
      setTimeout(() => tone(440, 0.12, { type: 'sine', vol: 0.22 }), 100);
    },
    bossWarn() {
      [220, 220, 220].forEach((f, i) => setTimeout(() => tone(f, 0.25, { type: 'sawtooth', vol: 0.28 }), i * 350));
    },
  };
})();

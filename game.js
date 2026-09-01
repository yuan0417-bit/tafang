// game.js - Stellar Bastion 主引擎
// 依赖：parts.js (PARTS, RARITY_*, rollRarity), waves.js (PATHS, SLOTS, MONSTER_TYPES, STAGE_WAVES, STAGE_META), audio.js (BastionAudio)

const BACKEND_URL = (() => {
  const u = new URL(location.href);
  const override = u.searchParams.get('api');
  if (override) return override.replace(/\/$/, '');
  return 'http://localhost:8001';
})();

const STORAGE_KEYS = {
  best: 'stellar-bastion.best.v1',
  name: 'stellar-bastion.name.v1',
};

function $(id) { return document.getElementById(id); }
function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[ch]));
}

const Store = {
  load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
};

const Leaderboard = {
  async fetch() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(BACKEND_URL + '/api/scores?limit=10', { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      return { ok: true, data };
    } catch (e) { return { ok: false, error: e.message || String(e) }; }
  },
  async submit(payload) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(BACKEND_URL + '/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: data.detail || ('HTTP ' + r.status) };
      return { ok: true, data };
    } catch (e) { return { ok: false, error: e.message || String(e) }; }
  },
};

// ===== Game State & Config =====
const CFG = {
  CANVAS_W: 960, CANVAS_H: 540,
  HP_MAX: 10, HP_START: 8,
  REROLL_COST: 30, AD_REWARD: 100, AD_DURATION: 5, AD_COOLDOWN: 30,
  SHOP_SLOTS: 3, PATH_WIDTH: 30, SLOT_RANGE: 140,
  RARITY_PER_SLOT: { black: 3, red: 9, yellow: 28, white: 58, special: 2 },
};

const G = {
  stage: 1, hp: CFG.HP_START, maxHp: CFG.HP_MAX,
  coins: 0, score: 0, wave: 0, totalWaves: 0,
  phase: 'shop', // shop | wave | win | lose
  slots: [], monsters: [], bullets: [], effects: [], traps: [],
  shields: 0, freezeNext: false, freezeActive: 0,
  doubleCoins: false, hasRevive: false, reviveUsed: false,
  perfectThisStage: true, startHp: CFG.HP_START,
  shop: [], rerollCount: 0, adCooldown: 0,
  pendingBuy: null,
  waveSpawnQueue: [], waveTime: 0,
  totalMonstersSpawned: 0, totalMonstersKilled: 0,
  totalWavesCleared: 0, stagesCleared: 0,
};

function resetState() {
  G.hp = CFG.HP_START; G.maxHp = CFG.HP_MAX;
  G.coins = 0; G.score = 0; G.wave = 0;
  G.phase = 'shop';
  G.slots = []; G.monsters = []; G.bullets = []; G.effects = []; G.traps = [];
  G.shields = 0; G.freezeNext = false; G.freezeActive = 0;
  G.doubleCoins = false; G.hasRevive = false; G.reviveUsed = false;
  G.perfectThisStage = true; G.startHp = CFG.HP_START;
  G.shop = []; G.rerollCount = 0; G.adCooldown = 0;
  G.pendingBuy = null; G.waveSpawnQueue = []; G.waveTime = 0;
  G.totalMonstersSpawned = 0; G.totalMonstersKilled = 0;
}

// ===== Monster =====
class Monster {
  constructor(type, stage) {
    const tpl = window.MONSTER_TYPES[type];
    const bossHp = window.STAGE_BOSS_HP[stage] || 1500;
    const miniHp = window.STAGE_MINI_HP && window.STAGE_MINI_HP[stage] || 600;
    this.type = type;
    let rawHp = (type === 'boss' ? bossHp : (type === 'mini' ? miniHp : tpl.hp));
    // 高关卡怪物血量/速度缩放
    const hpScale = (window.STAGE_SCALE ? window.STAGE_SCALE(stage) : 1);
    const spScale = (window.STAGE_SPEED_SCALE ? window.STAGE_SPEED_SCALE(stage) : 1);
    this.maxHp = rawHp * hpScale;
    this.hp = this.maxHp;
    this.baseSpeed = tpl.speed * spScale;
    this.gold = tpl.gold;
    this.size = tpl.size;
    this.color = tpl.color;
    this.path = window.PATHS[stage];
    this.segIdx = 0; this.segT = 0;
    this.x = this.path[0].x; this.y = this.path[0].y;
    this.slowFactor = 1; this.slowTimer = 0;
    this.dead = false; this.reached = false; this.flash = 0;
    this.isBoss = (type === 'boss' || type === 'mini');
  }
  speed() { return this.baseSpeed * this.slowFactor; }
  update(dt) {
    if (this.dead || this.reached) return;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) { this.slowFactor = 1; this.slowTimer = 0; }
    }
    if (this.flash > 0) this.flash -= dt;
    const speed = this.speed();
    const seg = this.path[this.segIdx];
    const next = this.path[this.segIdx + 1];
    if (!next) { this.reached = true; return; }
    const dx = next.x - seg.x, dy = next.y - seg.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.1) { this.segIdx++; return; }
    this.segT += (speed * dt) / segLen;
    if (this.segT >= 1) {
      this.segT = 0; this.segIdx++;
      if (this.segIdx >= this.path.length - 1) { this.reached = true; return; }
    }
    const cur = this.path[this.segIdx], nxt = this.path[this.segIdx + 1];
    this.x = lerp(cur.x, nxt.x, this.segT);
    this.y = lerp(cur.y, nxt.y, this.segT);
    for (const tr of G.traps) {
      if (tr.armed && Math.hypot(this.x - tr.x, this.y - tr.y) < this.size + 6) {
        tr.armed = false; triggerTrap(tr, this); break;
      }
    }
  }
  takeDamage(dmg) {
    this.hp -= dmg; this.flash = 0.12;
    if (this.hp <= 0) {
      this.dead = true;
      const coin = this.gold * (G.doubleCoins ? 2 : 1);
      G.coins += coin; G.totalMonstersKilled++;
      BastionAudio.coin();
      spawnEffect(this.x, this.y, '+' + coin, '#ffd76b');
      return true;
    }
    return false;
  }
  applySlow(factor, dur) {
    if (factor < this.slowFactor) { this.slowFactor = factor; this.slowTimer = dur; }
    else if (Math.abs(factor - this.slowFactor) < 0.001) { this.slowTimer = Math.max(this.slowTimer, dur); }
  }
  draw(ctx, t) {
    if (t === undefined) t = performance.now() / 1000;
    ctx.save();
    // fade-out + shrink on leak
    if (this._fadeOut && this._fadeOut > 0) {
      const k = this._fadeOut / 0.35;
      ctx.globalAlpha = k;
      ctx.translate(this.x, this.y);
      ctx.scale(k, k);
    } else {
      ctx.translate(this.x, this.y);
    }
    // boss aura
    if (this.isBoss) {
      const auraGrd = ctx.createRadialGradient(0, 0, this.size, 0, 0, this.size + 14);
      auraGrd.addColorStop(0, 'rgba(180,139,255,0.4)'); auraGrd.addColorStop(1, 'rgba(180,139,255,0)');
      ctx.fillStyle = auraGrd;
      ctx.beginPath(); ctx.arc(0, 0, this.size + 14, 0, Math.PI * 2); ctx.fill();
    }
    // pick sprite
    const S = window.Sprites;
    if (this.type === 'boss' || this.type === 'mini') S.boss(ctx, this.size, t);
    else if (this.type === 'fast') S.wasp(ctx, this.size, t);
    else if (this.type === 'tank') S.mech(ctx, this.size, t);
    else if (this.type === 'fly') S.saucer(ctx, this.size, t);
    else if (this.type === 'suicide') S.bomb(ctx, this.size, t);
    else S.drone(ctx, this.size, t);
    // hit flash overlay
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(0, 0, this.size * 1.05, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // HP bar (not affected by monster rotation/translation)
    const w = this.size * 2.4, h = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(this.x - w/2, this.y - this.size - 10, w, h);
    ctx.fillStyle = this.hp / this.maxHp > 0.4 ? '#6df1ff' : '#ff7e7e';
    ctx.fillRect(this.x - w/2, this.y - this.size - 10, w * (this.hp / this.maxHp), h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(this.x - w/2, this.y - this.size - 10, w, h);
  }
}

// ===== Bullet =====
class Bullet {
  constructor(fromX, fromY, target, dmg, opts) {
    opts = opts || {};
    this.x = fromX; this.y = fromY;
    this.target = target; this.dmg = dmg;
    this.speed = opts.speed || 480;
    this.color = opts.color || '#ffe27a';
    this.pierce = opts.pierce || 0;
    this.splash = opts.splash || 0;
    this.size = opts.size || 3;
    this.dead = false; this.trail = [];
  }
  update(dt) {
    if (this.dead) return;
    if (!this.target || this.target.dead || this.target.reached) {
      let best = null, bd = 200;
      for (const m of G.monsters) {
        if (m.dead || m.reached) continue;
        const d = Math.hypot(m.x - this.x, m.y - this.y);
        if (d < bd) { bd = d; best = m; }
      }
      this.target = best;
      if (!best) { this.dead = true; return; }
    }
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
    if (dist <= step + this.target.size) this.hit();
    else { this.x += (dx / dist) * step; this.y += (dy / dist) * step; }
  }
  hit() {
    if (this.dead) return;
    const m = this.target;
    if (m && !m.dead && !m.reached) {
      m.takeDamage(this.dmg); BastionAudio.hit();
      spawnEffect(m.x, m.y, '-' + Math.round(this.dmg), this.color);
      if (this.splash > 0) {
        for (const o of G.monsters) {
          if (o === m || o.dead || o.reached) continue;
          if (Math.hypot(o.x - m.x, o.y - m.y) <= this.splash) o.takeDamage(this.dmg * 0.6);
        }
      }
    }
    this.pierce--;
    if (this.pierce < 0) { this.dead = true; return; }
    let best = null, bd = 100;
    for (const o of G.monsters) {
      if (o.dead || o.reached || o === m) continue;
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      if (d < bd) { bd = d; best = o; }
    }
    this.target = best;
    if (!best) this.dead = true;
  }
  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (i + 1) / this.trail.length * 0.4;
      ctx.fillStyle = this.color; ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(t.x, t.y, this.size * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
}

// ===== Traps =====
function triggerTrap(trap, monster) {
  BastionAudio.trap();
  for (const m of G.monsters) {
    if (m.dead || m.reached) continue;
    if (Math.hypot(m.x - trap.x, m.y - trap.y) <= (trap.splash || 0) + 40) m.takeDamage(trap.dmg);
  }
  if (trap.pull) {
    for (const m of G.monsters) {
      if (m.dead || m.reached) continue;
      if (Math.hypot(m.x - trap.x, m.y - trap.y) <= (trap.splash || 0) + 60) {
        const ang = Math.atan2(trap.y - m.y, trap.x - m.x);
        m.x += Math.cos(ang) * 20; m.y += Math.sin(ang) * 20;
      }
    }
  }
  spawnEffect(trap.x, trap.y, '💥', trap.color || '#ff7e7e');
}

function placeTrapOnPath(slotIdx) {
  const slot = G.slots[slotIdx];
  if (!slot || !slot.part || slot.part.sub !== 'trap') return;
  const part = slot.part;
  if (slot.charges <= 0) return;
  const path = G.path;
  let best = { x: 0, y: 0, d: Infinity };
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    for (let t = 0.2; t < 1; t += 0.2) {
      const px = lerp(a.x, b.x, t), py = lerp(a.y, b.y, t);
      const d = Math.hypot(px - slot.x, py - slot.y);
      if (d < best.d) best = { x: px, y: py, d };
    }
  }
  G.traps.push({
    x: best.x, y: best.y, dmg: part.dmg,
    splash: part.splash || 0, pull: part.pull || 0,
    armed: true, color: part.color,
  });
  slot.charges--;
  toast('陷阱已部署');
}

// ===== Effects =====
function spawnEffect(x, y, text, color) { G.effects.push({ x, y, text, color, life: 1.0 }); }
function updateEffects(dt) {
  for (const e of G.effects) e.life -= dt;
  G.effects = G.effects.filter(e => e.life > 0);
}
function drawEffects(ctx) {
  ctx.save();
  ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  for (const e of G.effects) {
    const a = clamp(e.life, 0, 1);
    ctx.globalAlpha = a; ctx.fillStyle = e.color;
    ctx.fillText(e.text, e.x, e.y - (1 - a) * 30);
  }
  ctx.restore();
}

// ===== Shop =====
function rollShop() {
  G.shop = [];
  for (let i = 0; i < CFG.SHOP_SLOTS; i++) {
    const rarity = window.rollRarity();
    const pool = window.PARTS.filter(p => p.rarity === rarity);
    if (pool.length === 0) { i--; continue; }
    G.shop.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  renderShop();
}

function rerollShop() {
  if (G.coins < CFG.REROLL_COST) { toast('金币不足'); BastionAudio.error(); return; }
  G.coins -= CFG.REROLL_COST; G.rerollCount++;
  rollShop(); BastionAudio.reroll(); refreshHud();
}

function renderShop() {
  const cardsEl = $('shop-cards');
  cardsEl.innerHTML = '';
  $('shop-coin').textContent = G.coins;
  $('shop-reroll').textContent = G.rerollCount;
  $('shop-next-wave').textContent = Math.min(G.wave + 1, G.totalWaves);
  G.shop.forEach((p, i) => {
    if (!p) return;
    const card = document.createElement('button');
    card.className = 'shop-card';
    if (p.rarity === 'special') card.classList.add('special');
    const insufficient = G.coins < p.price;
    card.innerHTML =
      '<span class="rarity-tag" style="background:' + window.RARITY_GLOW[p.rarity] + ';color:' + window.RARITY_COLOR[p.rarity] + '">' + window.RARITY_LABEL[p.rarity] + '</span>' +
      '<div class="part-icon" style="background:radial-gradient(circle at 30% 30%, #fff8, ' + p.color + ', ' + p.color + ');box-shadow:0 0 16px ' + window.RARITY_GLOW[p.rarity] + '">' + subIcon(p) + '</div>' +
      '<div class="part-name">' + escapeHtml(p.name) + '</div>' +
      '<div class="part-sub">' + (window.SUB_LABEL[p.sub] || p.category) + '</div>' +
      '<div class="part-desc">' + escapeHtml(p.desc) + '</div>' +
      statHtml(p) +
      '<div class="part-price ' + (insufficient ? 'insufficient' : '') + '">💰 ' + p.price + '</div>';
    card.addEventListener('click', () => buyFromShop(i));
    cardsEl.appendChild(card);
  });
}

function subIcon(p) {
  if (p.sub === 'spread') return '✦';
  if (p.sub === 'heavy') return '◆';
  if (p.sub === 'rapid') return '≫';
  if (p.sub === 'slow') return '❄';
  if (p.sub === 'trap') return '✸';
  if (p.sub === 'shield') return '◈';
  if (p.sub === 'heal') return '+';
  if (p.sub === 'refresh') return '↻';
  if (p.sub === 'coin') return '$';
  if (p.sub === 'freeze') return '❅';
  if (p.sub === 'revive') return '✚';
  return '·';
}

function statHtml(p) {
  const parts = [];
  if (p.dmg != null) parts.push('伤害 <b>' + p.dmg + '</b>');
  if (p.shots != null && p.shots > 1) parts.push('弹数 <b>' + p.shots + '</b>');
  if (p.fireRate != null) parts.push('射速 <b>' + p.fireRate.toFixed(1) + '/s</b>');
  if (p.range != null) parts.push('射程 <b>' + p.range + '</b>');
  if (p.pierce) parts.push('穿透 <b>' + p.pierce + '</b>');
  if (p.splash) parts.push('溅射 <b>' + p.splash + '</b>');
  if (p.slowFactor != null) parts.push('减速 <b>' + Math.round((1 - p.slowFactor) * 100) + '%</b>');
  if (p.slowDur != null) parts.push('持续 <b>' + p.slowDur + 's</b>');
  if (p.charges != null) parts.push('次数 <b>' + p.charges + '</b>');
  if (p.blocks != null) parts.push('抵挡 <b>' + p.blocks + '</b>');
  if (p.reflect) parts.push('反弹 <b>' + p.reflect + '</b>');
  if (p.coinBonus) parts.push('+ <b>' + p.coinBonus + '</b> 金币');
  if (parts.length === 0) parts.push('立即生效');
  return '<div class="part-stats">' + parts.slice(0, 4).map(s => '<div>' + s + '</div>').join('') + '</div>';
}

function buyFromShop(idx) {
  const part = G.shop[idx];
  if (!part) return;
  if (G.coins < part.price) { toast('金币不足'); BastionAudio.error(); return; }
  if (part.category === 'special') {
    G.coins -= part.price; applySpecial(part);
    G.shop[idx] = null; renderShop(); refreshHud(); return;
  }
  G.pendingBuy = { idx, part };
  showSlotPicker(part);
}

function applySpecial(part) {
  if (part.sub === 'heal') {
    if (G.hp >= CFG.HP_MAX) { G.coins += part.price; toast('生命已满'); return; }
    G.hp = Math.min(CFG.HP_MAX, G.hp + 1); toast('+1 生命值');
  } else if (part.sub === 'refresh') { rollShop(); toast('商店已刷新'); }
  else if (part.sub === 'coin') { G.coins += part.coinBonus || 200; toast('+' + part.coinBonus + ' 金币'); }
  else if (part.sub === 'freeze') { G.freezeNext = true; toast('下一波冻结生效'); }
  else if (part.sub === 'revive') { G.hasRevive = true; toast('复活十字已装备'); }
  BastionAudio.special();
}

function showSlotPicker(part) {
  $('slot-picker').classList.remove('hidden');
  const row = $('slots-row'); row.innerHTML = '';
  G.slots.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'slot-pick-btn';
    const occupied = !!s.part;
    btn.innerHTML =
      '<div class="slot-icon" style="' + (occupied ? 'background:radial-gradient(circle at 30% 30%, #fff8,' + s.part.color + ',' + s.part.color + ')' : 'background:rgba(255,255,255,0.05);color:var(--fg-dim)') + '">' + (occupied ? subIcon(s.part) : '+') + '</div>' +
      '<div class="slot-label">塔位 ' + (i + 1) + '</div>' +
      '<div class="slot-part-name" style="color:' + (occupied ? window.RARITY_COLOR[s.part.rarity] : 'var(--fg-dim)') + '">' + (occupied ? s.part.name : '空位') + '</div>';
    btn.addEventListener('click', () => confirmPlace(i));
    row.appendChild(btn);
  });
}

function hideSlotPicker() { $('slot-picker').classList.add('hidden'); G.pendingBuy = null; }

function confirmPlace(slotIdx) {
  const part = G.pendingBuy && G.pendingBuy.part;
  if (!part) return;
  G.coins -= part.price;
  const slot = G.slots[slotIdx];
  slot.part = part; slot.cooldown = 0;
  slot.charges = part.charges || 0; slot.blocks = part.blocks || 0;
  slot.slowField = part.slowField || 0;
  if (part.sub === 'shield') G.shields += part.blocks;
  if (part.sub === 'trap' && G.phase !== 'wave') placeTrapOnPath(slotIdx);
  G.shop[G.pendingBuy.idx] = null;
  hideSlotPicker(); renderShop(); refreshHud();
  toast('已装备：' + part.name); BastionAudio.click();
}

// ===== HUD =====
function refreshHud() {
  $('top-coin').textContent = fmt(G.coins);
  $('top-wave').textContent = G.wave + '/' + G.totalWaves;
  const hearts = $('hp-hearts'); hearts.innerHTML = '';
  for (let i = 0; i < CFG.HP_MAX; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    if (i >= G.hp) h.classList.add('empty');
    if (i >= 8 && i < G.hp) h.classList.add('overflow');
    hearts.appendChild(h);
  }
  $('hp-text').textContent = G.hp + '/' + CFG.HP_MAX;
  if (G.adCooldown > 0) {
    $('ad-cooldown').textContent = '(' + Math.ceil(G.adCooldown) + 's)';
    $('btn-watch-ad').disabled = true;
  } else {
    $('ad-cooldown').textContent = '';
    $('btn-watch-ad').disabled = false;
  }
}

// ===== Wave spawning =====
function startNextWave() {
  if (G.phase !== 'shop') return;
  if (G.wave >= G.totalWaves) return;
  G.wave++;
  const waveDef = window.STAGE_WAVES[G.stage][G.wave - 1];
  G.waveSpawnQueue = waveDef.map(g => ({
    type: g.type, count: g.count, gap: g.gap,
    delay: g.delay || 0, spawned: 0, nextSpawn: g.delay || 0,
  }));
  G.waveTime = 0;
  G.freezeActive = G.freezeNext ? 5 : 0;
  G.freezeNext = false; G.doubleCoins = false;
  G.phase = 'wave';
  $('shop-overlay').classList.add('hidden');
  hideSlotPicker();
  showBanner('第 ' + G.wave + ' 波'); BastionAudio.waveStart();
  for (const g of G.waveSpawnQueue) {
    if (g.type === 'boss' || g.type === 'mini') {
      $('boss-warn').classList.remove('hidden');
      setTimeout(() => $('boss-warn').classList.add('hidden'), 3000);
      BastionAudio.bossWarn(); break;
    }
  }
}

function updateWaveSpawn(dt) {
  if (G.phase !== 'wave') return;
  G.waveTime += dt;
  for (const grp of G.waveSpawnQueue) {
    if (grp.spawned >= grp.count) continue;
    if (G.waveTime < grp.delay) continue;
    if (G.waveTime >= grp.nextSpawn) {
      const m = new Monster(grp.type, G.stage);
      G.monsters.push(m); G.totalMonstersSpawned++;
      grp.spawned++; grp.nextSpawn += grp.gap;
    }
  }
}

function checkWaveComplete() {
  if (G.phase !== 'wave') return;
  const allSpawned = G.waveSpawnQueue.every(g => g.spawned >= g.count);
  if (allSpawned && G.monsters.length === 0) {
    G.totalWavesCleared++;
    const bonus = window.STAGE_META[G.stage].coinBonus || 0;
    G.coins += bonus;
    spawnEffect(CFG.CANVAS_W / 2, CFG.CANVAS_H / 2, '+' + bonus + ' 金币奖励', '#66ffb8');
    if (G.wave >= G.totalWaves) {
      onStageWin();
    } else {
      G.phase = 'shop'; rollShop();
      $('shop-overlay').classList.remove('hidden');
      $('shop-title').textContent = '✓ 第 ' + G.wave + ' 波完成 · 选择配件';
      showBanner('✓ 第 ' + G.wave + ' 波完成 · 剩余 HP ' + G.hp + '/' + G.maxHp, 2500);
      toast('✓ 第 ' + G.wave + ' 波完成 · +' + bonus + ' 金币');
    }
  }
}

// ===== Slots update =====
function updateSlots(dt) {
  for (let s = 0; s < G.slots.length; s++) {
    const slot = G.slots[s];
    if (!slot.part) continue;
    const p = slot.part;
    slot.cooldown -= dt;
    if (slot.cooldown > 0) continue;
    if (p.sub === 'trap') {
      if (G.phase === 'wave' && slot.charges > 0) {
        placeTrapOnPath(s); slot.cooldown = 0.5;
      }
      continue;
    }
    if (p.sub === 'slow') {
      const affected = G.monsters.filter(m => !m.dead && !m.reached && Math.hypot(m.x - slot.x, m.y - slot.y) <= p.range);
      if (affected.length > 0) {
        for (const m of affected) m.applySlow(p.slowFactor, p.slowDur);
        BastionAudio.slow();
      }
      slot.cooldown = 1 / p.fireRate;
      continue;
    }
    if (p.sub === 'shield') continue;
    if (!['spread', 'heavy', 'rapid'].includes(p.sub)) continue;
    const inRange = G.monsters.filter(m => !m.dead && !m.reached && Math.hypot(m.x - slot.x, m.y - slot.y) <= p.range);
    if (inRange.length === 0) continue;
    let target;
    if (p.sub === 'heavy') target = inRange.reduce((a, b) => (b.hp > a.hp ? b : a));
    else target = inRange.reduce((a, b) => {
      const ap = a.segIdx + a.segT, bp = b.segIdx + b.segT;
      return bp > ap ? b : a;
    });
    if (p.sub === 'spread') {
      const shots = p.shots || 3;
      const spread = (p.spreadDeg || 20) * Math.PI / 180;
      const start = -spread * (shots - 1) / 2;
      const baseAng = Math.atan2(target.y - slot.y, target.x - slot.x);
      for (let i = 0; i < shots; i++) {
        const angle = baseAng + start + spread * i;
        const fake = {
          x: slot.x + Math.cos(angle) * 200, y: slot.y + Math.sin(angle) * 200,
          size: target.size, dead: false, reached: false,
          takeDamage: target.takeDamage.bind(target),
        };
        const b = new Bullet(slot.x, slot.y, fake, p.dmg, { speed: 520, color: p.color });
        b.size = 4; G.bullets.push(b);
      }
      BastionAudio.shootSpread();
    } else if (p.sub === 'rapid') {
      G.bullets.push(new Bullet(slot.x, slot.y, target, p.dmg, { speed: 600, color: p.color }));
      BastionAudio.shootRapid();
    } else if (p.sub === 'heavy') {
      G.bullets.push(new Bullet(slot.x, slot.y, target, p.dmg, {
        speed: 520, color: p.color, pierce: p.pierce || 0, splash: p.splash || 0,
      }));
      BastionAudio.shootHeavy();
    }
    if (p.rarity === 'black') BastionAudio.shootBlack();
    slot.cooldown = 1 / p.fireRate;
  }
  for (const slot of G.slots) {
    if (!slot.part || slot.part.sub !== 'shield' || !slot.part.slowField) continue;
    for (const m of G.monsters) {
      if (m.dead || m.reached) continue;
      if (Math.hypot(m.x - slot.x, m.y - slot.y) <= 80) m.applySlow(1 - slot.part.slowField, 0.5);
    }
  }
}

function slotReflectDamage() {
  for (const slot of G.slots) {
    if (!slot.part || slot.part.sub !== 'shield' || !slot.part.reflect) continue;
    if (Math.hypot(G.playerX - slot.x, G.playerY - slot.y) > 200) continue;
    for (const m of G.monsters) {
      if (m.dead || m.reached) continue;
      if (Math.hypot(m.x - G.playerX, m.y - G.playerY) <= 100) m.takeDamage(slot.part.reflect);
    }
    spawnEffect(G.playerX, G.playerY, '反弹!', '#ff7e7e'); BastionAudio.shield();
  }
}

// ===== Main loop =====
let lastTime = 0;
let renderTime = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  renderTime += dt;
  update(dt); render(renderTime);
  requestAnimationFrame(tick);
}

function update(dt) {
  if (G.adCooldown > 0) G.adCooldown = Math.max(0, G.adCooldown - dt);
  if (G.phase !== 'wave') { updateEffects(dt); refreshHud(); return; }
  if (G.freezeActive > 0) {
    G.freezeActive = Math.max(0, G.freezeActive - dt);
    updateEffects(dt); refreshHud(); return;
  }
  updateWaveSpawn(dt);
  for (const m of G.monsters) m.update(dt);
  for (const m of G.monsters) {
    if (m.reached && !m._processed) { m._processed = true; handleLeak(m); }
  }
  // tick fade-out timers
  for (const m of G.monsters) {
    if (m._fadeOut && m._fadeOut > 0) m._fadeOut -= dt;
  }
  // 关键修复：filter 掉所有 dead + reached + 淡出完毕的怪物，否则 checkWaveComplete 永不成立
  G.monsters = G.monsters.filter(m => !m.dead && !m.reached && (!m._fadeOut || m._fadeOut > 0));
  updateSlots(dt);
  for (const b of G.bullets) b.update(dt);
  G.bullets = G.bullets.filter(b => !b.dead);
  updateEffects(dt);
  G.traps = G.traps.filter(t => t.armed);
  refreshHud();
  checkWaveComplete();
}

function handleLeak(monster) {
  if (G.shields > 0) {
    G.shields--;
    spawnEffect(G.playerX, G.playerY, '🛡 阻挡', '#6df1ff');
    BastionAudio.shield();
    slotReflectDamage();
    monster._fadeOut = 0.35; // 屏蔽阻挡也淡出
    return;
  }
  if (G.hp <= 1 && G.hasRevive && !G.reviveUsed) {
    G.reviveUsed = true; G.hp = 3;
    spawnEffect(G.playerX, G.playerY, '✚ 复活!', '#ff7eb6');
    BastionAudio.special();
    monster._fadeOut = 0.35;
    return;
  }
  G.hp--;
  G.perfectThisStage = false;
  // 大字提示
  spawnEffect(G.playerX, G.playerY - 24, '-1 ❤', '#ff5577');
  spawnEffect(G.playerX, G.playerY + 24, '剩余 ' + G.hp + '/' + G.maxHp, '#ffb0c0');
  // 漏到的怪开始淡出 + 缩小（不再卡在玩家位置）
  monster._fadeOut = 0.35;
  BastionAudio.leak();
  // 屏幕红色脉动（CSS class）
  if (G.hp <= 2) {
    document.body.classList.add('low-hp');
  }
  if (G.hp <= 0) onStageLose();
}

// ===== Render =====
let canvas, ctx;
function initCanvas() { canvas = $('battle'); ctx = canvas.getContext('2d'); }

function render(t) {
  if (!ctx) return;
  if (t === undefined) t = performance.now() / 1000;
  ctx.clearRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);
  drawPath(ctx); drawTraps(ctx, t); drawSlots(ctx, t);
  drawBullets(ctx); drawMonsters(ctx, t); drawPlayer(ctx, t); drawEffects(ctx);
  if (G.freezeActive > 0 && G.phase === 'wave') {
    ctx.fillStyle = 'rgba(109,241,255,0.1)';
    ctx.fillRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);
  }
}

function drawPath(ctx) {
  const path = window.PATHS[G.stage];
  if (!path) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(180,139,255,0.2)';
  ctx.lineWidth = CFG.PATH_WIDTH; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(109,241,255,0.35)';
  ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}

function drawSlots(ctx, t) {
  if (t === undefined) t = performance.now() / 1000;
  const S = window.Sprites;
  for (const slot of G.slots) {
    if (slot.part) {
      ctx.save();
      ctx.strokeStyle = window.RARITY_GLOW[slot.part.rarity] || 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, slot.part.range || CFG.SLOT_RANGE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(slot.x, slot.y);
    if (slot.part) {
      const p = slot.part;
      if (p.sub === 'spread') S.spreadTurret(ctx, p, t);
      else if (p.sub === 'heavy') S.heavyTurret(ctx, p, t);
      else if (p.sub === 'rapid') S.rapidTurret(ctx, p, t);
      else if (p.sub === 'slow') S.slowTurret(ctx, p, t);
      else if (p.sub === 'trap') S.trapTurret(ctx, p, t);
      else if (p.sub === 'shield') S.shieldTower(ctx, p, t);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTraps(ctx, t) {
  if (t === undefined) t = performance.now() / 1000;
  for (const trap of G.traps) {
    if (!trap.armed) continue;
    ctx.save(); ctx.translate(trap.x, trap.y);
    window.Sprites.deployedTrap(ctx, trap, t);
    ctx.restore();
  }
}

function drawBullets(ctx) { for (const b of G.bullets) b.draw(ctx); }
function drawMonsters(ctx, t) { for (const m of G.monsters) m.draw(ctx, t); }

function drawPlayer(ctx, t) {
  if (t === undefined) t = performance.now() / 1000;
  const path = window.PATHS[G.stage];
  if (!path) return;
  const px = path[path.length - 1].x, py = path[path.length - 1].y;
  G.playerX = px; G.playerY = py;
  ctx.save(); ctx.translate(px, py);
  window.Sprites.heroBase(ctx, G.hp, G.maxHp, G.shields, t);
  ctx.restore();
}

// ===== Banner =====
function showBanner(text, dur) {
  const b = $('stage-banner');
  b.textContent = text;
  b.classList.remove('hidden');
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  setTimeout(() => b.classList.add('hidden'), dur || 1600);
}

// ===== Stage select =====
function renderStageGrid() {
  const grid = $('stage-grid'); grid.innerHTML = '';
  const best = Store.load(STORAGE_KEYS.best, {});
  const clearedStages = Object.keys(best).filter(k => best[k]).length;
  for (let i = 1; i <= (window.MAX_STAGE || 7); i++) {
    const meta = window.STAGE_META[i];
    const card = document.createElement('button');
    card.className = 'stage-card';
    const locked = i > 1 && !best[i - 1];
    if (locked) card.classList.add('locked');
    let dotsHtml = '';
    for (let d = 0; d < (window.MAX_STAGE || 7); d++) {
      dotsHtml += '<div class="' + (d < clearedStages ? 'dot cleared' : 'dot') + '"></div>';
    }
    card.innerHTML =
      '<div class="stage-num">第 ' + i + ' 关 · ' + meta.tier + (i === (window.MAX_STAGE || 7) ? ' 终极' : '') + '</div>' +
      '<div class="stage-name" style="color:' + meta.color + '">' + escapeHtml(meta.name) + '</div>' +
      '<div class="stage-desc">' + meta.desc + '</div>' +
      '<div class="stage-progress">' + dotsHtml + '</div>' +
      (best[i] ? '<div class="stage-best">最佳：' + fmt(best[i].score) + ' 分 / ' + best[i].waves + ' 波</div>' : '');
    if (!locked) {
      card.addEventListener('click', () => { BastionAudio.click(); startStage(i); });
    } else {
      card.addEventListener('click', () => toast('先通关上一关'));
    }
    grid.appendChild(card);
  }
}

// ===== Stage start / end =====
function startStage(stage) {
  resetState();
  G.stage = stage;
  G.path = window.PATHS[stage];
  G.totalWaves = window.STAGE_META[stage].waves;
  const slotDefs = window.SLOTS[stage];
  G.slots = slotDefs.map(s => ({ x: s.x, y: s.y, part: null, cooldown: 0, charges: 0, blocks: 0, slowField: 0 }));
  // 起始金币随关卡提升，让高关卡也能买到前期配件
  G.coins = 80 + (stage - 1) * 40;
  rollShop();
  showScreen('game'); refreshHud();
  document.body.classList.remove('low-hp');
  $('shop-overlay').classList.remove('hidden');
  $('shop-title').textContent = '⚔ 准备阶段 · 选择初始配件';
  $('result-overlay').classList.add('hidden');
  showBanner('⚔ ' + window.STAGE_META[stage].name + ' · ' + window.STAGE_META[stage].desc, 2500);
  toast('第 ' + stage + ' 关 · ' + window.STAGE_META[stage].name + ' · ' + window.STAGE_META[stage].desc);
}

function onStageWin() {
  G.phase = 'win';
  G.stagesCleared++;
  // 完美通关（从未扣血 = 当前 HP 等于起始 HP）
  const isPerfect = G.perfectThisStage;
  let perfectBonus = 0;
  if (isPerfect) {
    perfectBonus = G.stage * 150; // 1关 150, 2关 300, 3关 450
    G.coins += perfectBonus;
  }
  G.score = G.stagesCleared * 1000 + G.totalWavesCleared * 10 + Math.floor(G.coins);
  const best = Store.load(STORAGE_KEYS.best, {});
  const cur = best[G.stage];
  if (!cur || G.score > cur.score) {
    best[G.stage] = { score: G.score, waves: G.totalWavesCleared, perfect: isPerfect };
    Store.save(STORAGE_KEYS.best, best);
  }
  // 关闭低血量屏幕脉动
  document.body.classList.remove('low-hp');
  // 标题
  $('result-title').textContent = isPerfect ? '⭐ 完美通关！' : ('✓ ' + window.STAGE_META[G.stage].name + ' 通关');
  const remainHp = G.hp + '/' + G.maxHp;
  const maxStage = window.MAX_STAGE || 7;
  const subBits = [];
  subBits.push('剩余 HP ' + remainHp);
  if (isPerfect) subBits.push('⭐ 未受伤 · +' + perfectBonus + ' 金币奖励');
  else subBits.push('通关了！');
  subBits.push(G.stage < maxStage ? '解锁下一关' : '你已征服所有要塞');
  $('result-sub').textContent = subBits.join(' · ');
  $('result-wave').textContent = G.wave + '/' + G.totalWaves;
  $('result-coin').textContent = fmt(G.coins);
  $('result-score').textContent = fmt(G.score);
  $('result-hp').textContent = G.hp + '/' + CFG.HP_MAX;
  $('result-overlay').classList.remove('hidden');
  $('btn-next-stage').classList.toggle('hidden', G.stage >= (window.MAX_STAGE || 7));
  $('name-row').classList.remove('hidden');
  $('rank-info').classList.add('hidden');
  const savedName = Store.load(STORAGE_KEYS.name, '');
  if (savedName) $('name-input').value = savedName;
  $('submit-score').disabled = false;
  $('submit-score').textContent = '提交成绩';
  // 横幅：3 秒强调
  if (isPerfect) {
    showBanner('⭐ ' + window.STAGE_META[G.stage].name + ' · 完美通关！剩余 HP ' + remainHp, 3000);
    toast('⭐ 完美通关！本关未受伤 · +' + perfectBonus + ' 金币');
  } else {
    showBanner('✓ ' + window.STAGE_META[G.stage].name + ' 通关 · 剩余 HP ' + remainHp, 3000);
    toast('✓ 通关！剩余 HP ' + remainHp);
  }
  BastionAudio.victory();
}

function onStageLose() {
  G.phase = 'lose';
  G.score = Math.max(0, G.stagesCleared * 1000 + G.totalWavesCleared * 10 + Math.floor(G.coins));
  document.body.classList.remove('low-hp');
  $('result-title').textContent = '✗ 要塞沦陷';
  $('result-sub').textContent = '波次 ' + G.wave + '/' + G.totalWaves + ' · 剩余金币 ' + fmt(G.coins);
  $('result-wave').textContent = G.wave + '/' + G.totalWaves;
  $('result-coin').textContent = fmt(G.coins);
  $('result-score').textContent = fmt(G.score);
  $('result-hp').textContent = '0/' + CFG.HP_MAX;
  $('result-overlay').classList.remove('hidden');
  $('btn-next-stage').classList.add('hidden');
  $('name-row').classList.remove('hidden');
  $('rank-info').classList.add('hidden');
  const savedName = Store.load(STORAGE_KEYS.name, '');
  if (savedName) $('name-input').value = savedName;
  $('submit-score').disabled = false;
  $('submit-score').textContent = '提交成绩';
  showBanner('✗ 第 ' + G.stage + ' 关 · 要塞沦陷', 3000);
  toast('✗ 失败 - 振作起来再来一局');
  BastionAudio.die();
}

async function submitScore() {
  const name = ($('name-input').value || '').trim().slice(0, 12);
  if (!name) { toast('请先输入昵称'); return; }
  Store.save(STORAGE_KEYS.name, name);
  $('submit-score').disabled = true;
  $('submit-score').textContent = '提交中…';
  const payload = {
    name, score: G.score,
    stagesCleared: G.stagesCleared,
    totalWavesCleared: G.totalWavesCleared,
    coinsRemaining: Math.floor(G.coins),
    hpRemaining: G.hp, stage: G.stage,
  };
  const r = await Leaderboard.submit(payload);
  if (!r.ok) {
    $('submit-score').disabled = false;
    $('submit-score').textContent = '提交成绩';
    $('rank-info').classList.remove('hidden');
    $('rank-info').textContent = '排行榜不可用：' + r.error;
    return;
  }
  const parts = [];
  parts.push('全国排名 #' + (r.data.rank || '-'));
  if (r.data.best != null) parts.push('个人最佳 ' + fmt(r.data.best));
  $('rank-info').classList.remove('hidden');
  $('rank-info').innerHTML = parts.map((p, i) => i === 0 ? '<span style="color:var(--gold)">' + p + '</span>' : p).join(' · ');
  $('submit-score').textContent = '已提交 ✓';
}

// ===== Watch Ad =====
let adTimer = null;
function startAd() {
  if (G.adCooldown > 0) { toast('冷却中'); return; }
  $('ad-modal').classList.remove('hidden');
  let sec = CFG.AD_DURATION;
  $('ad-timer').textContent = sec;
  adTimer = setInterval(() => {
    sec--; $('ad-timer').textContent = sec;
    if (sec <= 0) { clearInterval(adTimer); adTimer = null; completeAd(); }
  }, 1000);
}
function cancelAd() { if (adTimer) { clearInterval(adTimer); adTimer = null; } $('ad-modal').classList.add('hidden'); }
function completeAd() {
  $('ad-modal').classList.add('hidden');
  G.coins += CFG.AD_REWARD;
  G.adCooldown = CFG.AD_COOLDOWN;
  toast('+100 金币'); BastionAudio.coin(); refreshHud();
}

// ===== Bottom buttons =====
function restartStage() {
  if (G.phase === 'wave') { if (!confirm('当前波次进行中，确定重新开始吗？')) return; }
  startStage(G.stage);
}
function refreshParts() {
  if (G.phase !== 'shop') { toast('仅在波次间隙可刷新'); return; }
  rerollShop();
}

// ===== Leaderboard (menu) =====
async function refreshLeaderboard() {
  const list = $('lb-list');
  list.innerHTML = '<li class="lb-empty">加载中…</li>';
  const r = await Leaderboard.fetch();
  if (!r.ok) {
    list.innerHTML = '<li class="lb-offline">排行榜不可用：' + (r.error || '网络错误') + '</li>';
    return;
  }
  const data = r.data || [];
  if (data.length === 0) {
    list.innerHTML = '<li class="lb-empty">暂无数据 · 来当第一个！</li>';
    return;
  }
  list.innerHTML = '';
  data.forEach((e, i) => {
    const li = document.createElement('li');
    li.className = 'lb-item ' + (i < 3 ? 'top' + (i + 1) : '');
    const meta = [];
    if (e.stagesCleared != null) meta.push('通关 ' + e.stagesCleared);
    if (e.totalWavesCleared != null) meta.push('波次 ' + e.totalWavesCleared);
    li.innerHTML =
      '<span class="lb-rank">#' + (i + 1) + '</span>' +
      '<span class="lb-name">' + escapeHtml(e.name) +
        '<span class="lb-meta">' + meta.join(' · ') + '</span>' +
      '</span>' +
      '<span class="lb-score">' + fmt(e.score) + '</span>';
    list.appendChild(li);
  });
}

// ===== Screen =====
function showScreen(name) {
  const ids = ['menu', 'howto', 'stages', 'game'];
  for (const id of ids) {
    const el = $('screen-' + id);
    if (!el) continue;
    el.classList.toggle('hidden', id !== name);
  }
  if (name === 'menu') refreshLeaderboard();
}

// ===== Toast =====
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

// ===== Setup =====
function setupMenu() {
  $('btn-play').addEventListener('click', () => {
    BastionAudio.click(); renderStageGrid(); showScreen('stages');
  });
  $('btn-howto').addEventListener('click', () => {
    BastionAudio.click(); showScreen('howto');
  });
  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => { BastionAudio.click(); showScreen('menu'); });
  });
  $('game-home').addEventListener('click', () => {
    if (G.phase === 'wave') { if (!confirm('当前波次进行中，确定返回主页吗？')) return; }
    showScreen('menu');
  });
  $('btn-reroll').addEventListener('click', rerollShop);
  $('btn-start-wave').addEventListener('click', startNextWave);
  $('btn-cancel-pick').addEventListener('click', hideSlotPicker);
  $('btn-watch-ad').addEventListener('click', startAd);
  $('btn-ad-cancel').addEventListener('click', cancelAd);
  $('btn-refresh-parts').addEventListener('click', refreshParts);
  $('btn-restart-stage').addEventListener('click', restartStage);
  $('btn-replay').addEventListener('click', () => {
    BastionAudio.click();
    $('result-overlay').classList.add('hidden');
    startStage(G.stage);
  });
  $('btn-next-stage').addEventListener('click', () => {
    BastionAudio.click();
    $('result-overlay').classList.add('hidden');
    if (G.stage < (window.MAX_STAGE || 7)) startStage(G.stage + 1); else showScreen('menu');
  });
  $('btn-back-menu').addEventListener('click', () => {
    BastionAudio.click();
    $('result-overlay').classList.add('hidden');
    showScreen('menu');
  });
  $('submit-score').addEventListener('click', submitScore);
  $('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitScore(); });
}

function boot() {
  initCanvas(); setupMenu();
  showScreen('menu');
  requestAnimationFrame((t) => { lastTime = t; tick(t); });
}

window.addEventListener('DOMContentLoaded', boot);

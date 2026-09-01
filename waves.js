// waves.js - 7 关塔防的波次与路径定义
// Stage 1-3 手写波次，Stage 4-7 由 generateStageWaves 程序化生成。

window.PATHS = {
  // Stage 1 - 简单 S 形
  1: [
    { x: -10, y: 270 }, { x: 200, y: 270 }, { x: 200, y: 110 },
    { x: 520, y: 110 }, { x: 520, y: 430 }, { x: 820, y: 430 },
    { x: 820, y: 270 }, { x: 940, y: 270 },
  ],
  // Stage 2 - 复杂之字形
  2: [
    { x: -10, y: 90 }, { x: 180, y: 90 }, { x: 180, y: 320 },
    { x: 360, y: 320 }, { x: 360, y: 150 }, { x: 540, y: 150 },
    { x: 540, y: 410 }, { x: 720, y: 410 }, { x: 720, y: 220 }, { x: 940, y: 220 },
  ],
  // Stage 3 - 多弯折长路径
  3: [
    { x: -10, y: 80 }, { x: 140, y: 80 }, { x: 140, y: 260 },
    { x: 280, y: 260 }, { x: 280, y: 100 }, { x: 420, y: 100 },
    { x: 420, y: 320 }, { x: 560, y: 320 }, { x: 560, y: 180 },
    { x: 700, y: 180 }, { x: 700, y: 460 }, { x: 840, y: 460 },
    { x: 840, y: 270 }, { x: 940, y: 270 },
  ],
  // Stage 4 - 噩梦要塞（蛇形多弯）
  4: [
    { x: -10, y: 100 }, { x: 130, y: 100 }, { x: 130, y: 250 },
    { x: 280, y: 250 }, { x: 280, y: 80 },  { x: 430, y: 80 },
    { x: 430, y: 320 }, { x: 580, y: 320 }, { x: 580, y: 150 },
    { x: 720, y: 150 }, { x: 720, y: 400 }, { x: 860, y: 400 },
    { x: 860, y: 220 }, { x: 940, y: 220 },
  ],
  // Stage 5 - 虚空裂隙（复杂迷宫）
  5: [
    { x: -10, y: 70 },  { x: 100, y: 70 },  { x: 100, y: 240 },
    { x: 220, y: 240 }, { x: 220, y: 90 },  { x: 340, y: 90 },
    { x: 340, y: 290 }, { x: 460, y: 290 }, { x: 460, y: 120 },
    { x: 580, y: 120 }, { x: 580, y: 350 }, { x: 700, y: 350 },
    { x: 700, y: 180 }, { x: 820, y: 180 }, { x: 820, y: 440 }, { x: 940, y: 440 },
  ],
  // Stage 6 - 深渊回响（蜿蜒长路径）
  6: [
    { x: -10, y: 60 },  { x: 90, y: 60 },   { x: 90, y: 220 },
    { x: 200, y: 220 }, { x: 200, y: 100 }, { x: 310, y: 100 },
    { x: 310, y: 270 }, { x: 420, y: 270 }, { x: 420, y: 130 },
    { x: 530, y: 130 }, { x: 530, y: 320 }, { x: 640, y: 320 },
    { x: 640, y: 160 }, { x: 750, y: 160 }, { x: 750, y: 400 },
    { x: 860, y: 400 }, { x: 860, y: 240 }, { x: 940, y: 240 },
  ],
  // Stage 7 - 永恒堡垒（极限多弯折）
  7: [
    { x: -10, y: 50 },  { x: 80, y: 50 },   { x: 80, y: 200 },
    { x: 180, y: 200 }, { x: 180, y: 80 },  { x: 280, y: 80 },
    { x: 280, y: 250 }, { x: 380, y: 250 }, { x: 380, y: 110 },
    { x: 480, y: 110 }, { x: 480, y: 310 }, { x: 580, y: 310 },
    { x: 580, y: 150 }, { x: 680, y: 150 }, { x: 680, y: 370 },
    { x: 780, y: 370 }, { x: 780, y: 190 }, { x: 870, y: 190 },
    { x: 870, y: 460 }, { x: 940, y: 460 },
  ],
};

// 塔位：每个塔位可放置一个配件
window.SLOTS = {
  1: [
    { x: 130, y: 180 }, { x: 280, y: 180 }, { x: 450, y: 220 }, { x: 620, y: 340 },
  ],
  2: [
    { x: 120, y: 180 }, { x: 270, y: 240 }, { x: 420, y: 230 },
    { x: 600, y: 280 }, { x: 800, y: 320 },
  ],
  3: [
    { x: 90, y: 170 }, { x: 210, y: 180 }, { x: 350, y: 200 },
    { x: 490, y: 240 }, { x: 630, y: 280 }, { x: 820, y: 380 },
  ],
  4: [
    { x: 80,  y: 180 }, { x: 220, y: 170 }, { x: 370, y: 190 },
    { x: 520, y: 240 }, { x: 660, y: 280 }, { x: 800, y: 320 }, { x: 920, y: 280 },
  ],
  5: [
    { x: 70,  y: 160 }, { x: 180, y: 160 }, { x: 300, y: 200 },
    { x: 420, y: 210 }, { x: 540, y: 240 }, { x: 670, y: 280 }, { x: 820, y: 400 },
  ],
  6: [
    { x: 60,  y: 150 }, { x: 160, y: 180 }, { x: 270, y: 200 },
    { x: 390, y: 230 }, { x: 500, y: 250 }, { x: 610, y: 280 }, { x: 720, y: 310 }, { x: 830, y: 350 },
  ],
  7: [
    { x: 50,  y: 140 }, { x: 150, y: 170 }, { x: 250, y: 200 },
    { x: 360, y: 220 }, { x: 470, y: 250 }, { x: 580, y: 280 }, { x: 690, y: 310 }, { x: 810, y: 380 },
  ],
};

// 怪物原型（基础值，高关卡 Monster 会乘以 stage 缩放系数）
window.MONSTER_TYPES = {
  normal:  { name: '普通', hp: 22,  speed: 50, gold: 4,  size: 12, color: '#9aa3c8' },
  fast:    { name: '快速', hp: 14,  speed: 95, gold: 5,  size: 10, color: '#ffd76b' },
  tank:    { name: '坦克', hp: 110, speed: 28, gold: 18, size: 18, color: '#ff7e7e' },
  fly:     { name: '飞行', hp: 30,  speed: 70, gold: 12, size: 11, color: '#6df1ff' },
  suicide: { name: '自爆', hp: 40,  speed: 60, gold: 12, size: 13, color: '#ff5577' },
  mini:    { name: '精英', hp: 600, speed: 32, gold: 80, size: 22, color: '#ff5577' },
  boss:    { name: 'BOSS', hp: 1800, speed: 24, gold: 400, size: 32, color: '#b48bff' },
};

// BOSS 血量随关卡递增
window.STAGE_BOSS_HP = {
  1: 800, 2: 1800, 3: 3500, 4: 5500, 5: 8000, 6: 12000, 7: 18000,
};

// 精英怪血量随关卡递增
window.STAGE_MINI_HP = {
  1: 600, 2: 1200, 3: 1800, 4: 2800, 5: 4000, 6: 5500, 7: 8000,
};

// Stage 1-3 手写波次
function handWrittenWaves() {
  const s1 = [
    [{ type: 'normal', count: 5,  gap: 1.2 }],
    [{ type: 'normal', count: 8,  gap: 1.0 }],
    [{ type: 'normal', count: 10, gap: 0.9 }, { type: 'fast', count: 2, gap: 0.8, delay: 4 }],
    [{ type: 'normal', count: 12, gap: 0.8 }],
    [{ type: 'normal', count: 14, gap: 0.7 }, { type: 'fast', count: 3, gap: 0.6, delay: 5 }],
    [{ type: 'tank',   count: 4,  gap: 2.0 }, { type: 'normal', count: 10, gap: 0.8, delay: 2 }],
    [{ type: 'normal', count: 18, gap: 0.5 }, { type: 'fast', count: 4, gap: 0.5, delay: 4 }, { type: 'mini', count: 1, delay: 12 }],
    [{ type: 'normal', count: 20, gap: 0.5 }, { type: 'fast', count: 5, gap: 0.4, delay: 5 }, { type: 'tank', count: 2, gap: 1.5, delay: 8 }, { type: 'boss', count: 1, delay: 14 }],
  ];

  const s2 = [
    [{ type: 'normal', count: 10, gap: 0.8 }, { type: 'fast', count: 2, gap: 0.6, delay: 3 }],
    [{ type: 'fast',   count: 12, gap: 0.45 }, { type: 'normal', count: 8, gap: 0.7, delay: 2 }],
    [{ type: 'tank',   count: 4,  gap: 1.8 }, { type: 'fast', count: 8, gap: 0.5, delay: 3 }, { type: 'normal', count: 6, gap: 0.6, delay: 1 }],
    [{ type: 'normal', count: 20, gap: 0.45 }, { type: 'fast', count: 6, gap: 0.5, delay: 4 }],
    [{ type: 'tank',   count: 8,  gap: 1.2 }, { type: 'fast', count: 10, gap: 0.45, delay: 2 }],
    [{ type: 'suicide',count: 6,  gap: 1.0 }, { type: 'tank', count: 6, gap: 1.5, delay: 2 }, { type: 'mini', count: 1, delay: 14 }],
    [{ type: 'normal', count: 25, gap: 0.35 }, { type: 'fast', count: 10, gap: 0.4, delay: 3 }],
    [{ type: 'tank',   count: 12, gap: 1.0 }, { type: 'fast', count: 12, gap: 0.4, delay: 2 }, { type: 'suicide', count: 4, gap: 0.8, delay: 6 }],
    [{ type: 'tank',   count: 18, gap: 0.9 }, { type: 'fast', count: 15, gap: 0.4, delay: 3 }],
    [{ type: 'fly',    count: 12, gap: 0.7 }, { type: 'tank', count: 8, gap: 1.4, delay: 3 }, { type: 'suicide', count: 6, gap: 0.8, delay: 6 }, { type: 'mini', count: 1, delay: 14 }],
    [{ type: 'normal', count: 30, gap: 0.3 }, { type: 'fast', count: 18, gap: 0.35, delay: 2 }, { type: 'tank', count: 6, gap: 1.2, delay: 6 }],
    [{ type: 'tank', count: 18, gap: 0.9 }, { type: 'fly', count: 18, gap: 0.5, delay: 3 }, { type: 'suicide', count: 8, gap: 0.7, delay: 6 }, { type: 'boss', count: 1, delay: 18 }],
  ];

  const s3 = [
    [{ type: 'fast',   count: 15, gap: 0.4 }, { type: 'normal', count: 10, gap: 0.6, delay: 2 }],
    [{ type: 'tank',   count: 8,  gap: 1.0 }, { type: 'fast', count: 12, gap: 0.45, delay: 2 }, { type: 'fly', count: 4, gap: 1.0, delay: 4 }],
    [{ type: 'suicide',count: 12, gap: 0.5 }, { type: 'normal', count: 15, gap: 0.4, delay: 2 }],
    [{ type: 'tank',   count: 12, gap: 0.9 }, { type: 'fast', count: 18, gap: 0.35, delay: 3 }, { type: 'fly', count: 6, gap: 0.8, delay: 6 }],
    [{ type: 'tank',   count: 16, gap: 0.8 }, { type: 'suicide', count: 8, gap: 0.6, delay: 4 }, { type: 'fly', count: 10, gap: 0.6, delay: 6 }],
    [{ type: 'fly',    count: 18, gap: 0.5 }, { type: 'fast', count: 20, gap: 0.3, delay: 3 }, { type: 'mini', count: 1, delay: 16 }],
    [{ type: 'normal', count: 35, gap: 0.25 }, { type: 'tank', count: 10, gap: 1.0, delay: 4 }, { type: 'suicide', count: 10, gap: 0.6, delay: 8 }],
    [{ type: 'boss', count: 1, delay: 0 }, { type: 'fast', count: 25, gap: 0.3, delay: 8 }, { type: 'tank', count: 8, gap: 1.0, delay: 12 }],
    [{ type: 'tank',   count: 18, gap: 0.7 }, { type: 'suicide', count: 15, gap: 0.5, delay: 4 }, { type: 'fly', count: 12, gap: 0.6, delay: 6 }],
    [{ type: 'fast',   count: 30, gap: 0.25 }, { type: 'fly', count: 15, gap: 0.5, delay: 3 }],
    [{ type: 'tank',   count: 20, gap: 0.7 }, { type: 'fly', count: 20, gap: 0.4, delay: 4 }, { type: 'mini', count: 1, delay: 18 }],
    [{ type: 'suicide',count: 25, gap: 0.35 }, { type: 'tank', count: 15, gap: 0.8, delay: 4 }, { type: 'fly', count: 15, gap: 0.5, delay: 8 }],
    [{ type: 'fast',   count: 40, gap: 0.22 }, { type: 'tank', count: 18, gap: 0.7, delay: 5 }, { type: 'fly', count: 20, gap: 0.45, delay: 8 }],
    [{ type: 'tank',   count: 25, gap: 0.6 }, { type: 'suicide', count: 20, gap: 0.4, delay: 3 }, { type: 'mini', count: 1, delay: 20 }],
    [{ type: 'fly',    count: 30, gap: 0.4 }, { type: 'fast', count: 30, gap: 0.25, delay: 2 }, { type: 'tank', count: 20, gap: 0.6, delay: 8 }],
    [{ type: 'tank', count: 30, gap: 0.5 }, { type: 'fly', count: 30, gap: 0.35, delay: 3 }, { type: 'suicide', count: 20, gap: 0.4, delay: 8 }, { type: 'boss', count: 1, delay: 20 }],
  ];

  return { 1: s1, 2: s2, 3: s3 };
}

// 程序化生成 Stage 4-7 的波次
function generateStageWaves(stage, totalWaves) {
  const waves = [];
  // 决定 mini-boss 关卡位置
  const miniAt = new Set();
  miniAt.add(Math.floor(totalWaves * 0.25));
  miniAt.add(Math.floor(totalWaves * 0.55));
  miniAt.add(Math.floor(totalWaves * 0.78));
  // BOSS 必在最后一波
  const bossAt = totalWaves - 1;

  for (let w = 0; w < totalWaves; w++) {
    const p = w / Math.max(1, totalWaves - 1); // 0..1 进度
    const waveGroups = [];

    // BOSS / mini-boss
    if (w === bossAt) {
      waveGroups.push({ type: 'boss', count: 1, gap: 0, delay: 0 });
    } else if (miniAt.has(w)) {
      waveGroups.push({ type: 'mini', count: 1, gap: 0, delay: 0 });
    }

    // 怪物数量（按进度递增）
    const baseGap = Math.max(0.18, 0.55 - p * 0.32);
    const normalCount = Math.max(0, Math.floor(8 + p * 28));
    const fastCount = Math.max(0, Math.floor(p * 22));
    const tankCount = Math.max(0, Math.floor(p * 14));
    const flyCount = p > 0.2 ? Math.floor((p - 0.2) * 20) : 0;
    const suicideCount = p > 0.3 ? Math.floor((p - 0.3) * 14) : 0;

    if (normalCount > 0) waveGroups.push({ type: 'normal', count: normalCount, gap: baseGap, delay: 0 });
    if (fastCount > 0)   waveGroups.push({ type: 'fast',   count: fastCount,   gap: baseGap * 0.7, delay: 2 });
    if (tankCount > 0)   waveGroups.push({ type: 'tank',   count: tankCount,   gap: baseGap * 2.5, delay: 5 });
    if (flyCount > 0)    waveGroups.push({ type: 'fly',    count: flyCount,    gap: baseGap, delay: 8 });
    if (suicideCount > 0) waveGroups.push({ type: 'suicide', count: suicideCount, gap: baseGap * 1.2, delay: 11 });

    // 关卡 5/6/7 每 6 波再来一个 mini
    if (stage >= 5 && (w % 6 === 3) && w !== bossAt && !miniAt.has(w)) {
      waveGroups.push({ type: 'mini', count: 1, gap: 0, delay: 16 });
    }
    // 关卡 7 中段加一次 BOSS
    if (stage >= 7 && w === Math.floor(totalWaves * 0.6)) {
      waveGroups.push({ type: 'boss', count: 1, gap: 0, delay: 8 });
    }

    waves.push(waveGroups);
  }
  return waves;
}

const handWaves = handWrittenWaves();
const generatedWaves = {
  4: generateStageWaves(4, 20),
  5: generateStageWaves(5, 24),
  6: generateStageWaves(6, 28),
  7: generateStageWaves(7, 32),
};
window.STAGE_WAVES = Object.assign({}, handWaves, generatedWaves);

window.STAGE_META = {
  1: { name: '入门要塞',   desc: '8 波 · 教学难度',   waves: 8,  slotCount: 4, color: '#6df1ff', coinBonus: 50,  tier: 'I'   },
  2: { name: '中级要塞',   desc: '12 波 · 中等难度',  waves: 12, slotCount: 5, color: '#ffd76b', coinBonus: 100, tier: 'II'  },
  3: { name: '终极要塞',   desc: '16 波 · 极限挑战',  waves: 16, slotCount: 6, color: '#ff7e7e', coinBonus: 200, tier: 'III' },
  4: { name: '噩梦要塞',   desc: '20 波 · 蛇形防线',  waves: 20, slotCount: 7, color: '#ff5577', coinBonus: 300, tier: 'IV'  },
  5: { name: '虚空裂隙',   desc: '24 波 · 迷宫挑战',  waves: 24, slotCount: 7, color: '#66ffb8', coinBonus: 400, tier: 'V'   },
  6: { name: '深渊回响',   desc: '28 波 · 蜿蜒长路',  waves: 28, slotCount: 8, color: '#ff7eb6', coinBonus: 500, tier: 'VI'  },
  7: { name: '永恒堡垒',   desc: '32 波 · 至高试炼',  waves: 32, slotCount: 8, color: '#ffd76b', coinBonus: 800, tier: 'VII' },
};

// 最大关卡数（用于解锁逻辑与 UI 判断）
window.MAX_STAGE = 7;

// 按 stage 缩放怪物 HP / 速度的辅助
window.STAGE_SCALE = function (stage) {
  // stage 1 = 1.0, stage 7 ≈ 2.8
  return 1 + (stage - 1) * 0.3;
};
window.STAGE_SPEED_SCALE = function (stage) {
  // stage 1 = 1.0, stage 7 ≈ 1.5
  return 1 + (stage - 1) * 0.08;
};

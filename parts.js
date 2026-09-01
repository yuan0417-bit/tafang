// parts.js - Stellar Bastion 配件目录
// 6 类配件（3 攻击 + 3 防御）× 4 阶稀有度 + 5 件特殊 = 29 件
//
// 稀有度概率（每次刷新 3 槽位各自独立掷骰）：
//   黑色 3% / 红色 9% / 黄色 28% / 白色 58% / 特殊 2%

window.PARTS = [
  // ============ 攻击：散射 (spread) ============
  {
    id: 'spread_white', name: '弹弓', category: 'attack', sub: 'spread', rarity: 'white',
    desc: '3 发齐射，单发伤害较低',
    price: 50, dmg: 4, shots: 3, spreadDeg: 22, range: 120, fireRate: 1.2, color: '#a8b0d0',
  },
  {
    id: 'spread_yellow', name: '霰弹枪', category: 'attack', sub: 'spread', rarity: 'yellow',
    desc: '4 发齐射，伤害中等',
    price: 120, dmg: 9, shots: 4, spreadDeg: 26, range: 130, fireRate: 1.0, color: '#ffe27a',
  },
  {
    id: 'spread_red', name: '雷霆阵', category: 'attack', sub: 'spread', rarity: 'red',
    desc: '5 发齐射，高伤害',
    price: 250, dmg: 16, shots: 5, spreadDeg: 30, range: 145, fireRate: 0.85, color: '#ff7e7e',
  },
  {
    id: 'spread_black', name: '虚空风暴', category: 'attack', sub: 'spread', rarity: 'black',
    desc: '8 发扇形扫射，毁灭性范围',
    price: 500, dmg: 22, shots: 8, spreadDeg: 38, range: 160, fireRate: 0.75, color: '#b48bff',
  },

  // ============ 攻击：强化攻击 (heavy) ============
  {
    id: 'heavy_white', name: '穿甲弹', category: 'attack', sub: 'heavy', rarity: 'white',
    desc: '单体高伤，射速较慢',
    price: 60, dmg: 22, shots: 1, range: 150, fireRate: 0.6, pierce: 1, color: '#a8b0d0',
  },
  {
    id: 'heavy_yellow', name: '重炮', category: 'attack', sub: 'heavy', rarity: 'yellow',
    desc: '高伤害，可穿透 2 个目标',
    price: 130, dmg: 45, shots: 1, range: 165, fireRate: 0.5, pierce: 2, color: '#ffe27a',
  },
  {
    id: 'heavy_red', name: '歼星炮', category: 'attack', sub: 'heavy', rarity: 'red',
    desc: '极高伤害 + 小范围溅射',
    price: 270, dmg: 90, shots: 1, range: 180, fireRate: 0.42, splash: 50, color: '#ff7e7e',
  },
  {
    id: 'heavy_black', name: '湮灭射线', category: 'attack', sub: 'heavy', rarity: 'black',
    desc: '贯穿全场的死亡光束',
    price: 520, dmg: 200, shots: 1, range: 220, fireRate: 0.32, pierce: 99, splash: 40, color: '#b48bff',
  },

  // ============ 攻击：攻击速度 (rapid) ============
  {
    id: 'rapid_white', name: '连弩', category: 'attack', sub: 'rapid', rarity: 'white',
    desc: '低伤高速连射',
    price: 55, dmg: 3, shots: 1, range: 125, fireRate: 3.0, color: '#a8b0d0',
  },
  {
    id: 'rapid_yellow', name: '机枪', category: 'attack', sub: 'rapid', rarity: 'yellow',
    desc: '中伤极高射速',
    price: 125, dmg: 6, shots: 1, range: 135, fireRate: 5.5, color: '#ffe27a',
  },
  {
    id: 'rapid_red', name: '激光阵列', category: 'attack', sub: 'rapid', rarity: 'red',
    desc: '持续高能光束',
    price: 260, dmg: 10, shots: 1, range: 150, fireRate: 9.0, color: '#ff7e7e',
  },
  {
    id: 'rapid_black', name: '量子纠缠', category: 'attack', sub: 'rapid', rarity: 'black',
    desc: '射速无上限，单体湮灭',
    price: 510, dmg: 14, shots: 1, range: 165, fireRate: 14.0, color: '#b48bff',
  },

  // ============ 防御：减速 (slow) ============
  {
    id: 'slow_white', name: '寒霜', category: 'defense', sub: 'slow', rarity: 'white',
    desc: '范围减速 30%，持续 1.5s',
    price: 60, slowFactor: 0.30, slowDur: 1.5, range: 120, fireRate: 1.0, color: '#7adfff',
  },
  {
    id: 'slow_yellow', name: '冰狱', category: 'defense', sub: 'slow', rarity: 'yellow',
    desc: '减速 50%，持续 2.5s',
    price: 130, slowFactor: 0.50, slowDur: 2.5, range: 135, fireRate: 0.85, color: '#a8f0ff',
  },
  {
    id: 'slow_red', name: '时停力场', category: 'defense', sub: 'slow', rarity: 'red',
    desc: '减速 70%，持续 3.5s',
    price: 260, slowFactor: 0.70, slowDur: 3.5, range: 150, fireRate: 0.7, color: '#c8a8ff',
  },
  {
    id: 'slow_black', name: '维度冻结', category: 'defense', sub: 'slow', rarity: 'black',
    desc: '减速 85%，持续 5s',
    price: 500, slowFactor: 0.85, slowDur: 5.0, range: 180, fireRate: 0.6, color: '#b48bff',
  },

  // ============ 防御：陷阱 (trap) ============
  {
    id: 'trap_white', name: '地雷', category: 'defense', sub: 'trap', rarity: 'white',
    desc: '单体地雷，30 伤害一次性',
    price: 40, dmg: 30, charges: 1, color: '#a8b0d0',
  },
  {
    id: 'trap_yellow', name: '尖刺阵', category: 'defense', sub: 'trap', rarity: 'yellow',
    desc: '尖刺地板，80 伤害',
    price: 100, dmg: 80, charges: 2, color: '#ffe27a',
  },
  {
    id: 'trap_red', name: '黑洞雷', category: 'defense', sub: 'trap', rarity: 'red',
    desc: '160 伤害 + 范围溅射',
    price: 220, dmg: 160, charges: 2, splash: 45, color: '#ff7e7e',
  },
  {
    id: 'trap_black', name: '奇点陷阱', category: 'defense', sub: 'trap', rarity: 'black',
    desc: '400 伤害 + 大范围吸引',
    price: 460, dmg: 400, charges: 3, splash: 80, pull: 60, color: '#b48bff',
  },

  // ============ 防御：护盾 (shield) ============
  {
    id: 'shield_white', name: '小盾', category: 'defense', sub: 'shield', rarity: 'white',
    desc: '为玩家阻挡 2 次漏怪',
    price: 80, blocks: 2, color: '#a8b0d0',
  },
  {
    id: 'shield_yellow', name: '大盾', category: 'defense', sub: 'shield', rarity: 'yellow',
    desc: '阻挡 5 次漏怪',
    price: 180, blocks: 5, reflect: 5, color: '#ffe27a',
  },
  {
    id: 'shield_red', name: '能量墙', category: 'defense', sub: 'shield', rarity: 'red',
    desc: '阻挡 12 次 + 反弹 12 伤',
    price: 340, blocks: 12, reflect: 12, color: '#ff7e7e',
  },
  {
    id: 'shield_black', name: '时空壁垒', category: 'defense', sub: 'shield', rarity: 'black',
    desc: '阻挡 25 次 + 反弹 25 伤 + 范围减速',
    price: 600, blocks: 25, reflect: 25, slowField: 0.3, color: '#b48bff',
  },

  // ============ 特殊 (special) ============
  {
    id: 'spec_heal', name: '急救包', category: 'special', sub: 'heal', rarity: 'special',
    desc: '玩家 +1 生命（最多 10）',
    price: 150, color: '#66ffb8',
  },
  {
    id: 'spec_refresh', name: '重组水晶', category: 'special', sub: 'refresh', rarity: 'special',
    desc: '立即免费刷新当前商店',
    price: 60, color: '#66ffb8',
  },
  {
    id: 'spec_coin', name: '金币风暴', category: 'special', sub: 'coin', rarity: 'special',
    desc: '立刻获得 200 金币',
    price: 80, coinBonus: 200, color: '#ffd76b',
  },
  {
    id: 'spec_freeze', name: '时间冻结', category: 'special', sub: 'freeze', rarity: 'special',
    desc: '冻结所有怪物 5 秒（一次性，下一波生效）',
    price: 200, color: '#6df1ff',
  },
  {
    id: 'spec_revive', name: '复活十字', category: 'special', sub: 'revive', rarity: 'special',
    desc: '本关卡若 HP 归零，恢复至 3 HP（单次）',
    price: 280, color: '#ff7eb6',
  },
];

// 稀有度概率（总和 100%）
window.RARITY_TABLE = [
  { rarity: 'black',   weight: 3  },
  { rarity: 'red',     weight: 9  },
  { rarity: 'yellow',  weight: 28 },
  { rarity: 'white',   weight: 58 },
  { rarity: 'special', weight: 2  },
];

// 颜色映射（用于 UI 与图标）
window.RARITY_COLOR = {
  white:   '#d8def0',
  yellow:  '#ffd76b',
  red:     '#ff5577',
  black:   '#b48bff',
  special: '#66ffb8',
};

window.RARITY_GLOW = {
  white:   'rgba(216, 222, 240, 0.3)',
  yellow:  'rgba(255, 215, 107, 0.5)',
  red:     'rgba(255, 85, 119, 0.7)',
  black:   'rgba(180, 139, 255, 0.85)',
  special: 'rgba(102, 255, 184, 0.7)',
};

window.RARITY_LABEL = {
  white:   '普通',
  yellow:  '稀有',
  red:     '史诗',
  black:   '传说',
  special: '特殊',
};

// 子类别显示名
window.SUB_LABEL = {
  spread: '散射',
  heavy:  '强化',
  rapid:  '急速',
  slow:   '减速',
  trap:   '陷阱',
  shield: '护盾',
  heal:   '加血',
  refresh:'刷新',
  coin:   '金币',
  freeze: '冻结',
  revive: '复活',
};

// 工具：按 id 取配件
window.PART_BY_ID = Object.fromEntries(window.PARTS.map(p => [p.id, p]));

// 工具：按稀有度掷骰
window.rollRarity = function () {
  const r = Math.random() * 100;
  let acc = 0;
  for (const e of window.RARITY_TABLE) {
    acc += e.weight;
    if (r < acc) return e.rarity;
  }
  return 'white';
};

// 工具：按稀有度过滤
window.partsByRarity = function (rarity) {
  return window.PARTS.filter(p => p.rarity === rarity);
};

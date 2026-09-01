// sprites.js - 具象化精灵绘制（纯 Canvas 几何，无图片资源）
// 每个函数接收 ctx + 在 (0,0) 坐标系下绘制，使用 size 控制整体缩放
// 设计原则：尺寸 ~30-40px，用多层几何 + 渐变 + 阴影表达角色身份

window.Sprites = (function() {
  const TAU = Math.PI * 2;

  // ===== 工具：圆角多边形 =====
  function roundedPoly(ctx, points, r) {
    if (r <= 0) { ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]); ctx.closePath(); return; }
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p0 = points[(i - 1 + points.length) % points.length];
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const v1x = (p1[0] - p0[0]), v1y = (p1[1] - p0[1]);
      const v2x = (p2[0] - p1[0]), v2y = (p2[1] - p1[1]);
      const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
      const ax = p1[0] - v1x / l1 * r, ay = p1[1] - v1y / l1 * r;
      const bx = p1[0] + v2x / l2 * r, by = p1[1] + v2y / l2 * r;
      if (i === 0) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
      ctx.quadraticCurveTo(p1[0], p1[1], bx, by);
    }
    ctx.closePath();
  }

  // ===== 怪物精灵 =====
  // Drone: 悬浮侦察无人机
  function drone(ctx, size, t) {
    const s = size;
    ctx.save();
    // 悬浮偏移
    const bob = Math.sin(t * 3) * 1.2;
    ctx.translate(0, bob);
    // 主体阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.8, s * 0.18, 0, 0, TAU); ctx.fill();
    // 翼（左右两片带金属感）
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * s * 0.6, -s * 0.1);
      ctx.rotate(side * Math.sin(t * 6) * 0.15);
      const grd = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
      grd.addColorStop(0, '#dde2ff'); grd.addColorStop(1, '#5a6490');
      ctx.fillStyle = grd;
      roundedPoly(ctx, [[0, 0], [side * s * 0.5, -s * 0.3], [side * s * 0.6, s * 0.2], [side * s * 0.2, s * 0.3]], 1.5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    }
    // 主体（球形）
    const grd = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 1, 0, 0, s * 0.85);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.5, '#9aa3c8'); grd.addColorStop(1, '#3a4060');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.85, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    // 中央传感器眼（青色）
    const eyeGrd = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 0.4);
    eyeGrd.addColorStop(0, '#fff'); eyeGrd.addColorStop(0.5, '#6df1ff'); eyeGrd.addColorStop(1, '#2070a0');
    ctx.fillStyle = eyeGrd;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, TAU); ctx.fill();
    // 瞳孔
    ctx.fillStyle = '#001828';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.15, 0, TAU); ctx.fill();
    // 高光
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.1, s * 0.08, 0, TAU); ctx.fill();
    // 底部推进器喷火
    const flamePulse = 0.7 + Math.sin(t * 20) * 0.3;
    ctx.fillStyle = 'rgba(255,180,80,' + flamePulse + ')';
    ctx.beginPath(); ctx.arc(0, s * 0.8, s * 0.18, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Wasp: 迅捷黄蜂
  function wasp(ctx, size, t) {
    const s = size;
    ctx.save();
    const bob = Math.sin(t * 8) * 1.5;
    ctx.translate(0, bob);
    // 翅膀（半透明，扇动）
    const wing = Math.abs(Math.sin(t * 25));
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * s * 0.3, -s * 0.5);
      ctx.rotate(side * 0.3 + (1 - wing) * 0.3 * side);
      ctx.fillStyle = 'rgba(220,240,255,' + (0.35 + wing * 0.3) + ')';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * s * 0.9, -s * 0.6, side * s * 1.1, s * 0.1);
      ctx.quadraticCurveTo(side * s * 0.5, s * 0.3, 0, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,160,200,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    }
    // 身体（椭圆，拉长）
    const grd = ctx.createLinearGradient(-s, 0, s, 0);
    grd.addColorStop(0, '#806020'); grd.addColorStop(0.5, '#ffd76b'); grd.addColorStop(1, '#806020');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#503810'; ctx.lineWidth = 1; ctx.stroke();
    // 条纹
    ctx.fillStyle = '#503810';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-s * 0.7 + i * s * 0.5, -s * 0.45, s * 0.18, s * 0.9);
    }
    // 大眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s * 0.4, -s * 0.18, s * 0.28, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(s * 0.45, -s * 0.18, s * 0.14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s * 0.48, -s * 0.22, s * 0.05, 0, TAU); ctx.fill();
    // 毒刺
    ctx.fillStyle = '#503810';
    ctx.beginPath(); ctx.moveTo(-s * 1.0, 0); ctx.lineTo(-s * 1.4, -s * 0.2); ctx.lineTo(-s * 1.4, s * 0.2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Mech: 履带重装机甲
  function mech(ctx, size, t) {
    const s = size;
    ctx.save();
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 1.1, s * 0.18, 0, 0, TAU); ctx.fill();
    // 履带
    ctx.fillStyle = '#1a1a1a';
    roundedPoly(ctx, [[-s * 0.95, s * 0.3], [s * 0.95, s * 0.3], [s * 0.95, s * 0.75], [-s * 0.95, s * 0.75]], 4);
    ctx.fill();
    // 履带轮
    ctx.fillStyle = '#444';
    for (let i = 0; i < 4; i++) {
      const x = -s * 0.7 + i * s * 0.45;
      ctx.beginPath(); ctx.arc(x, s * 0.55, s * 0.18, 0, TAU); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x, s * 0.55, s * 0.08, 0, TAU); ctx.fill();
      ctx.fillStyle = '#444';
    }
    // 底盘
    const grd = ctx.createLinearGradient(0, -s * 0.2, 0, s * 0.4);
    grd.addColorStop(0, '#ff8090'); grd.addColorStop(1, '#702030');
    ctx.fillStyle = grd;
    roundedPoly(ctx, [[-s * 0.85, -s * 0.2], [s * 0.85, -s * 0.2], [s * 0.7, s * 0.4], [-s * 0.7, s * 0.4]], 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    // 观察窗
    ctx.fillStyle = '#6df1ff';
    ctx.fillRect(-s * 0.35, -s * 0.05, s * 0.7, s * 0.2);
    ctx.strokeStyle = '#202830'; ctx.lineWidth = 1; ctx.strokeRect();
    // 装甲斜板
    ctx.fillStyle = '#aa4050';
    ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.2); ctx.lineTo(-s * 0.85, -s * 0.4); ctx.lineTo(-s * 0.4, -s * 0.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.2); ctx.lineTo(s * 0.85, -s * 0.4); ctx.lineTo(s * 0.4, -s * 0.4); ctx.closePath(); ctx.fill();
    // 短炮
    ctx.save();
    ctx.translate(0, -s * 0.35);
    ctx.rotate(Math.sin(t * 2) * 0.08);
    ctx.fillStyle = '#202020';
    ctx.fillRect(-s * 0.1, -s * 0.65, s * 0.2, s * 0.5);
    ctx.fillStyle = '#000';
    ctx.fillRect(-s * 0.13, -s * 0.75, s * 0.26, s * 0.1);
    ctx.restore();
    // 天线
    ctx.strokeStyle = '#202020'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.4); ctx.lineTo(-s * 0.6, -s * 0.85); ctx.stroke();
    ctx.fillStyle = '#ff5577';
    ctx.beginPath(); ctx.arc(-s * 0.6, -s * 0.9, s * 0.07, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Saucer: 飞行碟
  function saucer(ctx, size, t) {
    const s = size;
    ctx.save();
    const bob = Math.sin(t * 2) * 2;
    ctx.translate(0, bob);
    // 底部光晕
    const beam = ctx.createRadialGradient(0, s * 0.4, 1, 0, s * 0.4, s * 1.2);
    beam.addColorStop(0, 'rgba(109,241,255,0.5)'); beam.addColorStop(1, 'rgba(109,241,255,0)');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.arc(0, s * 0.4, s * 1.2, 0, TAU); ctx.fill();
    // 飞碟底盘（椭圆）
    const grd = ctx.createLinearGradient(0, -s * 0.2, 0, s * 0.4);
    grd.addColorStop(0, '#8af0ff'); grd.addColorStop(0.5, '#3090c0'); grd.addColorStop(1, '#103050');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 1.1, s * 0.35, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    // 装饰灯带
    ctx.fillStyle = (Math.floor(t * 3) % 2) ? '#ffd76b' : '#ff5577';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI + (i + 0.5) * Math.PI * 2 / 5;
      const x = Math.cos(a) * s * 1.0;
      const y = s * 0.1 + Math.sin(a) * s * 0.3;
      ctx.beginPath(); ctx.arc(x, y, s * 0.07, 0, TAU); ctx.fill();
    }
    // 顶部玻璃罩
    const domeGrd = ctx.createLinearGradient(0, -s * 0.7, 0, 0);
    domeGrd.addColorStop(0, '#cffcff'); domeGrd.addColorStop(1, '#4090c0');
    ctx.fillStyle = domeGrd;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.3, s * 0.55, s * 0.5, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.55, s * 0.18, s * 0.12, -0.4, 0, TAU); ctx.fill();
    // 顶部天线
    ctx.strokeStyle = '#202020'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, -s * 1.1); ctx.stroke();
    ctx.fillStyle = '#ff5577';
    ctx.beginPath(); ctx.arc(0, -s * 1.15, s * 0.08, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Bomb: 自爆虫
  function bomb(ctx, size, t) {
    const s = size;
    ctx.save();
    const pulse = 1 + Math.sin(t * 12) * 0.06;
    ctx.scale(pulse, pulse);
    // 引线（锯齿线，闪烁）
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(-s * 0.2, -s * 1.0);
    ctx.lineTo(s * 0.1, -s * 1.15);
    ctx.lineTo(-s * 0.1, -s * 1.3);
    ctx.stroke();
    // 引线火花（闪烁）
    const sparkSize = (Math.sin(t * 18) + 1) * 0.5;
    const sparkGrd = ctx.createRadialGradient(-s * 0.1, -s * 1.3, 0, -s * 0.1, -s * 1.3, s * 0.25);
    sparkGrd.addColorStop(0, '#fff'); sparkGrd.addColorStop(0.4, '#ffd76b'); sparkGrd.addColorStop(1, 'rgba(255,87,119,0)');
    ctx.fillStyle = sparkGrd;
    ctx.beginPath(); ctx.arc(-s * 0.1, -s * 1.3, s * 0.25 * (0.8 + sparkSize), 0, TAU); ctx.fill();
    // 身体（球）
    const grd = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 1, 0, 0, s);
    grd.addColorStop(0, '#ffb0c0'); grd.addColorStop(0.5, '#ff5577'); grd.addColorStop(1, '#5a1020');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    // 尖刺（5 根）
    ctx.fillStyle = '#3a1010';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5;
      const x = Math.cos(a) * s * 0.95, y = Math.sin(a) * s * 0.95;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(s * 0.4, 0); ctx.lineTo(-2, 2); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // 凶恶眼睛（红色 X）
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.15); ctx.lineTo(-s * 0.15, s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.15, -s * 0.15); ctx.lineTo(-s * 0.45, s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.15, -s * 0.15); ctx.lineTo(s * 0.45, s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.45, -s * 0.15); ctx.lineTo(s * 0.15, s * 0.15); ctx.stroke();
    ctx.restore();
  }

  // Boss: 大型机甲
  function boss(ctx, size, t) {
    const s = size;
    ctx.save();
    const sway = Math.sin(t * 1.5) * 0.05;
    ctx.rotate(sway);
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.85, s * 0.9, s * 0.18, 0, 0, TAU); ctx.fill();
    // 履带底座（巨型）
    ctx.fillStyle = '#1a1a1a';
    roundedPoly(ctx, [[-s * 0.9, s * 0.55], [s * 0.9, s * 0.55], [s * 0.9, s * 0.9], [-s * 0.9, s * 0.9]], 4);
    ctx.fill();
    // 履带轮
    ctx.fillStyle = '#555';
    for (let i = 0; i < 5; i++) {
      const x = -s * 0.7 + i * s * 0.35;
      ctx.beginPath(); ctx.arc(x, s * 0.72, s * 0.13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x, s * 0.72, s * 0.06, 0, TAU); ctx.fill();
      ctx.fillStyle = '#555';
    }
    // 主身体（装甲大块）
    const bodyGrd = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.5);
    bodyGrd.addColorStop(0, '#d0a0ff'); bodyGrd.addColorStop(0.5, '#9050d0'); bodyGrd.addColorStop(1, '#3a1050');
    ctx.fillStyle = bodyGrd;
    roundedPoly(ctx, [[-s * 0.85, -s * 0.35], [s * 0.85, -s * 0.35], [s * 0.7, s * 0.6], [-s * 0.7, s * 0.6]], 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    // 胸口发光核心
    const coreGrd = ctx.createRadialGradient(0, s * 0.15, 1, 0, s * 0.15, s * 0.35);
    const corePulse = 0.7 + Math.sin(t * 4) * 0.3;
    coreGrd.addColorStop(0, 'rgba(255,255,255,' + corePulse + ')');
    coreGrd.addColorStop(0.4, 'rgba(255,215,107,' + corePulse + ')');
    coreGrd.addColorStop(1, 'rgba(255,87,119,0)');
    ctx.fillStyle = coreGrd;
    ctx.beginPath(); ctx.arc(0, s * 0.15, s * 0.35, 0, TAU); ctx.fill();
    // 头部（六边形）
    ctx.fillStyle = '#602090';
    roundedPoly(ctx, [[-s * 0.4, -s * 0.6], [s * 0.4, -s * 0.6], [s * 0.5, -s * 0.3], [s * 0.3, 0], [-s * 0.3, 0], [-s * 0.5, -s * 0.3]], 4);
    ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    // 单眼
    ctx.fillStyle = '#ff5577';
    ctx.beginPath(); ctx.arc(0, -s * 0.42, s * 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -s * 0.42, s * 0.04, 0, TAU); ctx.fill();
    // 双角
    ctx.fillStyle = '#202020';
    ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 0.6); ctx.lineTo(-s * 0.5, -s * 0.95); ctx.lineTo(-s * 0.25, -s * 0.65); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.35, -s * 0.6); ctx.lineTo(s * 0.5, -s * 0.95); ctx.lineTo(s * 0.25, -s * 0.65); ctx.closePath(); ctx.fill();
    // 大炮（右侧）
    ctx.save();
    ctx.translate(s * 0.7, -s * 0.05);
    ctx.rotate(-0.4 + Math.sin(t * 1.2) * 0.08);
    ctx.fillStyle = '#202020';
    ctx.fillRect(-s * 0.12, -s * 0.15, s * 1.1, s * 0.3);
    ctx.fillStyle = '#000';
    ctx.fillRect(s * 0.95, -s * 0.2, s * 0.1, s * 0.4);
    ctx.restore();
    // 左臂
    ctx.fillStyle = '#602090';
    roundedPoly(ctx, [[-s * 0.85, -s * 0.2], [-s * 1.05, s * 0.1], [-s * 0.75, s * 0.2], [-s * 0.6, -s * 0.05]], 3);
    ctx.fill();
    ctx.restore();
  }

  // ===== 塔台精灵 =====
  function spreadTurret(ctx, part, t) {
    const s = 22;
    const r = part.rarity || 'white';
    // 八边形基座
    ctx.fillStyle = '#1a1a25';
    roundedPoly(ctx, [[s * 1.0, -s * 0.4], [s * 0.7, -s * 1.0], [-s * 0.7, -s * 1.0], [-s * 1.0, -s * 0.4], [-s * 1.0, s * 0.4], [-s * 0.7, s * 1.0], [s * 0.7, s * 1.0], [s * 1.0, s * 0.4]], 3);
    ctx.fill();
    ctx.strokeStyle = window.RARITY_COLOR[r]; ctx.lineWidth = 1.5; ctx.stroke();
    // 内圈装饰
    ctx.fillStyle = window.RARITY_GLOW[r];
    ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, TAU); ctx.fill();
    // 多管炮组（按 shots 数量）
    const shots = part.shots || 3;
    const rot = t * 0.8;
    for (let i = 0; i < shots; i++) {
      const a = rot + i * TAU / shots;
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = '#0a0a15';
      ctx.fillRect(s * 0.4, -s * 0.12, s * 0.8, s * 0.24);
      ctx.fillStyle = part.color;
      ctx.fillRect(s * 0.5, -s * 0.08, s * 0.6, s * 0.16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s * 1.05, -s * 0.05, s * 0.1, s * 0.1);
      ctx.restore();
    }
    // 中心齿轮
    ctx.fillStyle = window.RARITY_COLOR[r];
    ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.08, 0, TAU); ctx.fill();
  }

  function heavyTurret(ctx, part, t) {
    const s = 22;
    const r = part.rarity || 'white';
    // 方形厚重基座
    ctx.fillStyle = '#252018';
    ctx.fillRect(-s * 1.1, -s * 0.6, s * 2.2, s * 1.4);
    ctx.strokeStyle = window.RARITY_COLOR[r]; ctx.lineWidth = 2; ctx.strokeRect();
    // 装甲螺栓
    ctx.fillStyle = '#444';
    [[-s * 0.9, -s * 0.4], [s * 0.9, -s * 0.4], [-s * 0.9, s * 0.2], [s * 0.9, s * 0.2]].forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 1.8, 0, TAU); ctx.fill(); });
    // 大炮（缓慢左右摆动）
    ctx.save();
    ctx.rotate(Math.sin(t * 0.6) * 0.15);
    // 炮管基座
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-s * 0.4, -s * 0.45, s * 0.8, s * 0.9);
    // 主炮管（粗长）
    const grd = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
    grd.addColorStop(0, '#666'); grd.addColorStop(0.5, '#222'); grd.addColorStop(1, '#000');
    ctx.fillStyle = grd;
    ctx.fillRect(s * 0.4, -s * 0.25, s * 1.4, s * 0.5);
    // 炮口（深）
    ctx.fillStyle = '#000';
    ctx.fillRect(s * 1.7, -s * 0.3, s * 0.15, s * 0.6);
    // 炮口闪光圈
    ctx.strokeStyle = part.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s * 1.78, 0, s * 0.12, 0, TAU); ctx.stroke();
    // 散热片
    ctx.fillStyle = '#444';
    for (let i = 0; i < 3; i++) ctx.fillRect(s * 0.5, -s * 0.35 + i * s * 0.18, s * 1.0, s * 0.06);
    ctx.restore();
    // 弹药箱（基座上方）
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(-s * 0.5, -s * 0.85, s * 1.0, s * 0.25);
    ctx.strokeStyle = window.RARITY_COLOR[r]; ctx.lineWidth = 1; ctx.strokeRect();
  }

  function rapidTurret(ctx, part, t) {
    const s = 22;
    const r = part.rarity || 'white';
    // 三脚架基座
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7); ctx.lineTo(-s * 1.0, s * 0.8);
    ctx.moveTo(0, -s * 0.7); ctx.lineTo(s * 1.0, s * 0.8);
    ctx.moveTo(-s * 1.0, s * 0.8); ctx.lineTo(s * 1.0, s * 0.8);
    ctx.stroke();
    // 中心旋转轴
    ctx.fillStyle = window.RARITY_COLOR[r];
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.12, 0, TAU); ctx.fill();
    // 多管速射炮（快速旋转）
    const rot = t * 6;
    const barrels = 5;
    for (let i = 0; i < barrels; i++) {
      const a = rot + i * TAU / barrels;
      ctx.save(); ctx.translate(0, -s * 0.4); ctx.rotate(a);
      ctx.fillStyle = '#0a0a15';
      ctx.fillRect(s * 0.15, -s * 0.05, s * 1.1, s * 0.1);
      ctx.fillStyle = part.color;
      ctx.fillRect(s * 0.25, -s * 0.03, s * 0.9, s * 0.06);
      ctx.restore();
    }
    // 弹链（弧线）
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.55, 0, Math.PI * 1.5); ctx.stroke();
  }

  function slowTurret(ctx, part, t) {
    const s = 22;
    const r = part.rarity || 'white';
    // 基座（冰盘）
    ctx.fillStyle = '#1a3050';
    ctx.beginPath(); ctx.arc(0, s * 0.4, s * 1.0, 0, TAU); ctx.fill();
    ctx.strokeStyle = window.RARITY_COLOR[r]; ctx.lineWidth = 1.5; ctx.stroke();
    // 内部辐射光
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 1.0);
    halo.addColorStop(0, 'rgba(168,240,255,0.4)'); halo.addColorStop(1, 'rgba(168,240,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, s * 1.0, 0, TAU); ctx.fill();
    // 中心大晶体（钻石形）
    drawCrystal(ctx, 0, 0, s * 0.7, window.RARITY_COLOR[r], t);
    // 周围 4 颗小晶体
    for (let i = 0; i < 4; i++) {
      const a = t * 0.3 + i * Math.PI / 2;
      const x = Math.cos(a) * s * 0.65, y = Math.sin(a) * s * 0.65;
      drawCrystal(ctx, x, y, s * 0.3, '#a8f0ff', t + i);
    }
    // 漂浮冰粒
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + i * TAU / 6;
      const x = Math.cos(a) * s * 0.9, y = Math.sin(a) * s * 0.9 - s * 0.3;
      ctx.fillStyle = 'rgba(220,240,255,0.7)';
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill();
    }
  }
  function drawCrystal(ctx, x, y, sz, color, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5);
    const grd = ctx.createLinearGradient(0, -sz, 0, sz);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.4, color); grd.addColorStop(1, '#0a3050');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.5, 0); ctx.lineTo(0, sz); ctx.lineTo(-sz * 0.5, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.2, -sz * 0.3); ctx.lineTo(0, -sz * 0.5); ctx.fill();
    ctx.restore();
  }

  function trapTurret(ctx, part, t) {
    const s = 22;
    const r = part.rarity || 'white';
    // 圆形底座
    ctx.fillStyle = '#252018';
    ctx.beginPath(); ctx.arc(0, 0, s * 1.0, 0, TAU); ctx.fill();
    ctx.strokeStyle = window.RARITY_COLOR[r]; ctx.lineWidth = 1.5; ctx.stroke();
    // 内部警戒条纹（黄黑）
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, s * 0.85, 0, TAU); ctx.clip();
    for (let i = -3; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#ffd76b' : '#1a1a1a';
      ctx.save(); ctx.rotate(i * 0.5);
      ctx.fillRect(-s * 1.2, -s * 0.18, s * 2.4, s * 0.18);
      ctx.restore();
    }
    ctx.restore();
    // 8 根尖刺向外
    const spikeRot = t * 1.5;
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < 8; i++) {
      const a = spikeRot + i * TAU / 8;
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(s * 0.95, -2); ctx.lineTo(s * 1.4, 0); ctx.lineTo(s * 0.95, 2); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // 中央压力板
    const ppGrd = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 0.4);
    ppGrd.addColorStop(0, '#ff8080'); ppGrd.addColorStop(1, '#601020');
    ctx.fillStyle = ppGrd;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, TAU); ctx.fill();
    // LED（闪烁）
    const ledOn = (Math.floor(t * 3) % 2) === 0;
    ctx.fillStyle = ledOn ? '#ff3050' : '#400810';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = ledOn ? 'rgba(255,48,80,0.5)' : 'rgba(255,48,80,0)';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, TAU); ctx.fill();
  }

  function shieldTower(ctx, part, t) {
    const s = 22;
    const r = part.rarity || 'white';
    // 圆顶基座
    const grd = ctx.createLinearGradient(0, -s * 0.8, 0, s * 0.6);
    grd.addColorStop(0, '#604020'); grd.addColorStop(1, '#251810');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, s * 0.1, s * 1.0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = window.RARITY_COLOR[r]; ctx.lineWidth = 1.5; ctx.stroke();
    // 矩形底
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-s * 1.0, s * 0.1, s * 2.0, s * 0.6);
    ctx.strokeRect();
    // 中心能量核心
    const coreGrd = ctx.createRadialGradient(0, -s * 0.4, 1, 0, -s * 0.4, s * 0.5);
    coreGrd.addColorStop(0, '#fff'); coreGrd.addColorStop(0.5, window.RARITY_COLOR[r]); coreGrd.addColorStop(1, 'rgba(109,241,255,0)');
    ctx.fillStyle = coreGrd;
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.5, 0, TAU); ctx.fill();
    // 能量罩（半透明球）
    const shieldGrd = ctx.createRadialGradient(0, -s * 0.4, 1, 0, -s * 0.4, s * 0.9);
    shieldGrd.addColorStop(0, 'rgba(255,255,255,0)'); shieldGrd.addColorStop(0.7, 'rgba(109,241,255,0.15)'); shieldGrd.addColorStop(1, 'rgba(109,241,255,0.35)');
    ctx.fillStyle = shieldGrd;
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.9, 0, TAU); ctx.fill();
    // 旋转能量弧
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + i * TAU / 3;
      ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.85, a, a + 0.6); ctx.stroke();
    }
  }

  // ===== 玩家基地（要塞核心）=====
  function heroBase(ctx, hp, maxHp, shields, t) {
    const s = 22;
    ctx.save();
    // 能量平台光晕
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 1.7);
    const hpRatio = hp / maxHp;
    const haloColor = hp <= 2 ? '255,87,119' : (hp <= 5 ? '255,215,107' : '109,241,255');
    halo.addColorStop(0, 'rgba(' + haloColor + ',' + (0.4 + Math.sin(t * 3) * 0.1) + ')');
    halo.addColorStop(1, 'rgba(' + haloColor + ',0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, s * 1.7, 0, TAU); ctx.fill();
    // 六边形装甲底座
    ctx.fillStyle = '#0a0a18';
    roundedPoly(ctx, [[s * 1.2, 0], [s * 0.6, -s * 1.05], [-s * 0.6, -s * 1.05], [-s * 1.2, 0], [-s * 0.6, s * 1.05], [s * 0.6, s * 1.05]], 4);
    ctx.fill();
    ctx.strokeStyle = '#6df1ff'; ctx.lineWidth = 2; ctx.stroke();
    // 旋转的 4 块装甲板
    ctx.save(); ctx.rotate(t * 0.3);
    ctx.fillStyle = '#1a3050';
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2);
      roundedPoly(ctx, [[s * 0.7, -s * 0.15], [s * 1.05, 0], [s * 0.7, s * 0.15], [s * 0.4, 0]], 2);
      ctx.fill();
      ctx.strokeStyle = '#6df1ff'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // 核心星
    const coreGrd = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 0.65);
    const corePulse = 0.7 + Math.sin(t * 4) * 0.3;
    coreGrd.addColorStop(0, 'rgba(255,255,255,' + corePulse + ')');
    coreGrd.addColorStop(0.4, 'rgba(255,215,107,' + corePulse + ')');
    coreGrd.addColorStop(0.7, 'rgba(180,139,255,' + corePulse * 0.7 + ')');
    coreGrd.addColorStop(1, 'rgba(109,241,255,0)');
    ctx.fillStyle = coreGrd;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.65, 0, TAU); ctx.fill();
    // 五角星
    drawStar(ctx, 0, 0, 5, s * 0.4, s * 0.2, '#fff', t);
    // 护盾光环
    if (shields > 0) {
      const shGrd = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 1.3);
      shGrd.addColorStop(0, 'rgba(109,241,255,0)'); shGrd.addColorStop(0.85, 'rgba(109,241,255,0)'); shGrd.addColorStop(0.95, 'rgba(255,215,107,0.6)'); shGrd.addColorStop(1, 'rgba(255,215,107,0)');
      ctx.fillStyle = shGrd;
      ctx.beginPath(); ctx.arc(0, 0, s * 1.3, 0, TAU); ctx.fill();
      // 护盾数字
      ctx.fillStyle = '#ffd76b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🛡' + shields, 0, s * 1.35);
    }
    ctx.restore();
  }
  function drawStar(ctx, x, y, points, outer, inner, color, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + i * Math.PI / points;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
  }

  // ===== 部署的陷阱 =====
  function deployedTrap(ctx, trap, t) {
    const s = 8;
    // 闪烁红光
    const blink = 0.5 + Math.sin(t * 8) * 0.5;
    const grd = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 2.5);
    grd.addColorStop(0, 'rgba(255,80,80,' + blink * 0.6 + ')');
    grd.addColorStop(1, 'rgba(255,80,80,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, s * 2.5, 0, TAU); ctx.fill();
    // 底盘
    ctx.fillStyle = '#3a2818';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd76b'; ctx.lineWidth = 1; ctx.stroke();
    // 4 根尖刺
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2 + t * 0.5);
      ctx.beginPath(); ctx.moveTo(s * 0.85, -1.5); ctx.lineTo(s * 1.4, 0); ctx.lineTo(s * 0.85, 1.5); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // 中心压力板
    ctx.fillStyle = (Math.floor(t * 4) % 2) ? '#ff3050' : '#500810';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, TAU); ctx.fill();
  }

  return {
    drone, wasp, mech, saucer, bomb, boss,
    spreadTurret, heavyTurret, rapidTurret, slowTurret, trapTurret, shieldTower,
    heroBase, deployedTrap,
    roundedPoly,
  };
})();

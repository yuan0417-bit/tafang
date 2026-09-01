// server.js - Stellar Bastion Leaderboard
// Node.js + node:sqlite (Node 22+). CORS-enabled.
//
// Run:
//   node server.js
//
// Endpoints:
//   GET  /api/health
//   GET  /api/scores?limit=10
//   POST /api/scores

const { DatabaseSync } = require('node:sqlite');
const { createServer } = require('node:http');
const { URL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

const PORT = parseInt(process.env.PORT || '8000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.STELLAR_DB || path.join(__dirname, 'leaderboard.db');

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    stages_cleared INTEGER NOT NULL DEFAULT 0,
    total_waves_cleared INTEGER NOT NULL DEFAULT 0,
    coins_remaining INTEGER NOT NULL DEFAULT 0,
    hp_remaining INTEGER NOT NULL DEFAULT 0,
    stage INTEGER,
    created_at TEXT NOT NULL,
    ip TEXT
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_score ON scores(score DESC);');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
}
function jsonResponse(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body));
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': buf.length });
  res.end(buf);
}
function noContent(res, status = 204) { setCors(res); res.writeHead(status); res.end(); }

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) { req.destroy(); reject(new Error('Payload too large')); }
    });
    req.on('end', () => { if (!data) return resolve({}); try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function utcNowIso() { return new Date().toISOString(); }

function validateSubmit(p) {
  const errs = [];
  if (typeof p.name !== 'string') errs.push('name required');
  else { p.name = p.name.trim().slice(0, 12); if (!p.name) errs.push('name cannot be empty'); }
  if (!Number.isInteger(p.score) || p.score < 0) errs.push('score must be int >= 0');
  if (p.stagesCleared !== undefined && (!Number.isInteger(p.stagesCleared) || p.stagesCleared < 0)) errs.push('stagesCleared must be int >= 0');
  if (p.totalWavesCleared !== undefined && (!Number.isInteger(p.totalWavesCleared) || p.totalWavesCleared < 0)) errs.push('totalWavesCleared must be int >= 0');
  return errs;
}

function rowToEntry(row, rank) {
  return {
    rank,
    name: row.name,
    score: row.score,
    stagesCleared: row.stages_cleared,
    totalWavesCleared: row.total_waves_cleared,
    coinsRemaining: row.coins_remaining,
    hpRemaining: row.hp_remaining,
    stage: row.stage,
    createdAt: row.created_at,
  };
}

async function handleHealth(req, res) { return jsonResponse(res, 200, { ok: true, ts: utcNowIso() }); }

async function handleSubmit(req, res) {
  let payload;
  try { payload = await readJsonBody(req); }
  catch (e) { return jsonResponse(res, 400, { detail: 'Invalid JSON: ' + e.message }); }
  const errs = validateSubmit(payload);
  if (errs.length) return jsonResponse(res, 400, { detail: errs.join('; ') });

  const ip = getClientIp(req);
  const now = utcNowIso();

  db.prepare(
    'INSERT INTO scores (name, score, stages_cleared, total_waves_cleared, coins_remaining, hp_remaining, stage, created_at, ip) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    payload.name, payload.score,
    payload.stagesCleared || 0, payload.totalWavesCleared || 0,
    payload.coinsRemaining || 0, payload.hpRemaining || 0,
    payload.stage || null,
    now, ip,
  );

  const rankRow = db.prepare('SELECT COUNT(*) + 1 AS r FROM scores WHERE score > ?').get(payload.score);
  const rank = rankRow.r;
  const bestRow = db.prepare('SELECT MAX(score) AS s FROM scores WHERE ip = ?').get(ip);
  const best = (bestRow && bestRow.s) ? bestRow.s : payload.score;

  return jsonResponse(res, 200, { ok: true, rank, best });
}

async function handleTopScores(req, res, url) {
  const limit = clamp(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 1, 100);
  const rows = db.prepare(
    'SELECT name, score, stages_cleared, total_waves_cleared, coins_remaining, hp_remaining, stage, created_at ' +
    'FROM scores ORDER BY score DESC LIMIT ?'
  ).all(limit);
  const out = rows.map((r, i) => rowToEntry(r, i + 1));
  return jsonResponse(res, 200, out);
}

async function handleRoot(req, res) { return jsonResponse(res, 200, { name: 'Stellar Bastion Leaderboard', docs: '/api/health' }); }

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return noContent(res);
    const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    const pathname = url.pathname;
    if (req.method === 'GET' && pathname === '/api/health') return handleHealth(req, res);
    if (req.method === 'GET' && pathname === '/api/scores') return handleTopScores(req, res, url);
    if (req.method === 'POST' && pathname === '/api/scores') return handleSubmit(req, res);
    if (req.method === 'GET' && pathname === '/') return handleRoot(req, res);
    return jsonResponse(res, 404, { detail: 'Not Found' });
  } catch (err) {
    console.error('[server error]', err);
    return jsonResponse(res, 500, { detail: 'Internal Server Error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Stellar Bastion leaderboard listening on http://${HOST}:${PORT}`);
  console.log(`DB: ${DB_PATH} (${fs.existsSync(DB_PATH) ? 'exists' : 'new'})`);
});

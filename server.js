// Servidor estático + señalización WebRTC (un transmisor, varios espectadores).
// Variables: PORT (3000), BROADCAST_KEY (clave para transmitir), WATCH_KEY (clave opcional para ver)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const BROADCAST_KEY = process.env.BROADCAST_KEY || 'transmitir';
const WATCH_KEY = process.env.WATCH_KEY || '';
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  if (p === '/config') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ watchKeyRequired: !!WATCH_KEY }));
  }
  const file = path.join(PUB, p);
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    return res.end('No encontrado');
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const wss = new WebSocketServer({ server });
let broadcaster = null;
const viewers = new Map(); // id -> ws
const send = (ws, msg) => ws && ws.readyState === 1 && ws.send(JSON.stringify(msg));
const count = () => send(broadcaster, { type: 'viewers', n: viewers.size });

wss.on('connection', (ws) => {
  ws.id = crypto.randomUUID();
  ws.role = null;

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.type === 'join-broadcaster') {
      if (!safeEq(m.key || '', BROADCAST_KEY)) return send(ws, { type: 'error', error: 'Clave incorrecta' });
      if (broadcaster && broadcaster.readyState === 1) return send(ws, { type: 'error', error: 'Ya hay alguien transmitiendo' });
      ws.role = 'broadcaster';
      broadcaster = ws;
      send(ws, { type: 'ok' });
      count();
      // Avisar a los que esperaban
      for (const v of viewers.values()) send(v, { type: 'live' });
    } else if (m.type === 'join-viewer') {
      if (WATCH_KEY && !safeEq(m.key || '', WATCH_KEY)) return send(ws, { type: 'error', error: 'Clave incorrecta' });
      ws.role = 'viewer';
      viewers.set(ws.id, ws);
      send(ws, { type: 'ok', live: !!(broadcaster && broadcaster.readyState === 1) });
      count();
    } else if (m.type === 'want-stream' && ws.role === 'viewer') {
      send(broadcaster, { type: 'viewer-joined', id: ws.id });
    } else if (ws.role === 'broadcaster' && m.to) {
      // offer / candidate hacia un espectador
      send(viewers.get(m.to), { ...m, to: undefined });
    } else if (ws.role === 'viewer' && (m.type === 'answer' || m.type === 'candidate')) {
      send(broadcaster, { ...m, from: ws.id });
    }
  });

  ws.on('close', () => {
    if (ws === broadcaster) {
      broadcaster = null;
      for (const v of viewers.values()) send(v, { type: 'offline' });
    } else if (viewers.delete(ws.id)) {
      send(broadcaster, { type: 'viewer-left', id: ws.id });
      count();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Ver:        http://localhost:${PORT}/watch.html`);
  console.log(`Transmitir: http://localhost:${PORT}/broadcast.html  (clave: ${BROADCAST_KEY})`);
});

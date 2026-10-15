// Señalización por HTTPS (publicar con POST + escuchar con EventSource) usando ntfy.sh.
// No usa WebSocket, así que funciona en redes que lo bloquean.
const NTFY = () => window.NTFY_URL || 'https://ntfy.sh';
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }] };
const CHUNK = 3000;
const rid = () => Math.random().toString(36).slice(2, 10);

async function pack(obj) {
  const cs = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const u = new Uint8Array(await new Response(cs).arrayBuffer());
  let bin = ''; u.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
async function unpack(b64) {
  const u = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ds = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(ds).text());
}

function gather(pc, ms = 4000) {
  return new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    const done = () => { pc.removeEventListener('icegatheringstatechange', ch); res(); };
    const ch = () => pc.iceGatheringState === 'complete' && done();
    pc.addEventListener('icegatheringstatechange', ch);
    setTimeout(done, ms);
  });
}

class Signal {
  // since: ventana de mensajes viejos a recibir al conectar (ej. '9m'); '' = solo nuevos
  constructor(code, onmsg, { since = '', onstatus = () => {} } = {}) {
    this.topic = 'banzai-' + code;
    this.onmsg = onmsg; this.onstatus = onstatus;
    this.parts = new Map(); this.seen = new Set(); this.queue = Promise.resolve();
    const url = `${NTFY()}/${this.topic}/sse` + (since ? `?since=${since}` : '');
    this.es = new EventSource(url);
    this.es.onopen = () => onstatus('open');
    this.es.onerror = () => onstatus('error');
    this.es.onmessage = (e) => { this.queue = this.queue.then(() => this._handle(e.data)).catch(() => {}); };
  }
  async _handle(raw) {
    const ev = JSON.parse(raw);
    if (ev.event !== 'message' || this.seen.has(ev.id)) return;
    this.seen.add(ev.id);
    const c = JSON.parse(ev.message);
    const arr = this.parts.get(c.id) || []; arr[c.i] = c.d; this.parts.set(c.id, arr);
    if (arr.filter((x) => x !== undefined).length === c.n) {
      this.parts.delete(c.id);
      this.onmsg(await unpack(arr.join('')));
    }
  }
  async send(obj) {
    const b = await pack(obj), id = rid(), n = Math.ceil(b.length / CHUNK);
    for (let i = 0; i < n; i++) {
      const r = await fetch(`${NTFY()}/${this.topic}`, { method: 'POST', body: JSON.stringify({ id, i, n, d: b.slice(i * CHUNK, (i + 1) * CHUNK) }) });
      if (!r.ok) throw new Error('publish ' + r.status);
    }
  }
  close() { this.es.close(); }
}

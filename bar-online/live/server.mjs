// Vũ Trường Cõi Mạng — Bar Online Live Server
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // repo root: serves /assets, /live
const TTS_DIR = path.join(__dirname, 'tts');
fs.mkdirSync(TTS_DIR, { recursive: true });
for (const f of fs.readdirSync(TTS_DIR)) { try { fs.unlinkSync(path.join(TTS_DIR, f)); } catch {} }
const PORT = +process.env.PORT || 3001;

/* ------------------------------------------------------------------ state */
const settings = {
  title: 'VŨ TRƯỜNG CÕI MẠNG',
  subtitle: 'CHÁY HẾT MÌNH ĐÊM NAY · QUẨY LÊN ANH EM ƠI',
  voice: 'vi-VN-NamMinhNeural',
  pitch: 12,                    // Hz
  rate: 22,                     // %
  music: true,
  strobe: true,
  airhorn: true,
  seatMode: 'auto',             // 24 -> 36 -> 60
  joinOnEnter: false,
};

const viewers = new Map();      // id -> { id, name, skin, avatar, coins, joinedAt, lastAt, isVip, demo }
let hypeScore = 120;
const startedAt = Date.now();
let tiktok = null, tiktokState = { status: 'idle', uniqueId: '', error: '' };
const log = [];

function addLog(s) {
  const line = `[${new Date().toLocaleTimeString('vi-VN')}] ${s}`;
  log.push(line);
  if (log.length > 200) log.shift();
  broadcast({ t: 'log', line }, 'control');
  console.log(line);
}

const CAPS = [24, 36, 60];
function capacity() {
  if (settings.seatMode !== 'auto') return +settings.seatMode;
  const n = viewers.size;
  return CAPS.find(c => n <= c) || 60;
}

const SKIN_WORDS = [
  ['woman', ['nữ', 'nu', 'gái', 'gai', 'đầm', 'dam', 'váy', 'vay', 'chị', 'chi']],
  ['man', ['nam', 'anh', 'trai', 'vest', 'dân chơi', 'dan choi', 'dj', 'chủ tịch', 'chu tich']],
];
function skinFromText(t) {
  const w = String(t || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!w || w.split(' ').length > 3) return null;
  for (const [skin, words] of SKIN_WORDS) if (words.some(k => w === k || w.startsWith(k + ' '))) return skin;
  return null;
}
const DEFAULT_SKINS = ['man', 'woman', 'man', 'woman'];

function pub(v) {
  return { id: v.id, name: v.name, skin: v.skin, avatar: v.avatar || '', coins: v.coins, demo: !!v.demo };
}
function snapshot() {
  return {
    t: 'state',
    settings,
    viewers: [...viewers.values()].map(pub),
    cap: capacity(),
    hypeScore,
    startedAt,
    tiktok: tiktokState
  };
}

function seat(id, name, opts = {}) {
  let v = viewers.get(id);
  if (v) {
    v.lastAt = Date.now();
    if (opts.avatar) v.avatar = opts.avatar;
    return { v, isNew: false };
  }
  const maxCap = settings.seatMode !== 'auto' ? +settings.seatMode : 60;
  if (viewers.size >= maxCap) {
    const quiet = [...viewers.values()].filter(x => x.coins === 0).sort((a, b) => a.lastAt - b.lastAt)[0];
    if (!quiet) return { v: null, isNew: false };
    viewers.delete(quiet.id);
    broadcast({ t: 'leave', id: quiet.id });
  }
  v = {
    id,
    name: (name || id).slice(0, 18),
    skin: opts.skin || DEFAULT_SKINS[viewers.size % DEFAULT_SKINS.length],
    avatar: opts.avatar || '',
    coins: 0,
    joinedAt: Date.now(),
    lastAt: Date.now(),
    demo: !!opts.demo
  };
  viewers.set(id, v);
  broadcast({ t: 'join', v: pub(v), cap: capacity() });
  return { v, isNew: true };
}

/* ------------------------------------------------------------- events in */
function onChat(id, name, text, avatar) {
  text = String(text || '').slice(0, 100);
  const want = skinFromText(text);
  const { v, isNew } = seat(id, name, { avatar, skin: want || undefined });
  if (!v) return;

  if (!isNew && want && want !== v.skin) {
    v.skin = want;
    broadcast({ t: 'skin', id, skin: want });
    addLog(`👤 ${v.name} đổi trang phục: ${want}`);
  }

  const isToast = /\b(c[uụ]ng\s*ly|c[aạ]n\s*ly|ch[uú]c\s*m[uừ]ng|u[oố]ng|d[zds]o)\b/i.test(text);
  const isFire = /\b(b[aậ]t\s*qu[eẹ]t|l[eê]n\s*[đd][oồ]|ch[aá]y|l[uử]a)\b/i.test(text);
  const isChampagne = /\b(khui|s[aâ]m\s*panh|champagne|r[uư][oợ]u)\b/i.test(text);
  const action = isToast ? 'toast' : isFire ? 'fire' : isChampagne ? 'champagne' : null;

  v.lastAt = Date.now();
  hypeScore = Math.min(999, hypeScore + 2);
  broadcast({ t: 'chat', id, name: v.name, text, action, hypeScore });
}

function onLike(id, name, count) {
  const v = viewers.get(id);
  hypeScore = Math.min(999, hypeScore + (count || 1) * 2);
  broadcast({ t: 'like', id, n: count || 1, hypeScore });
}

const BAR_GIFTS = {
  rose: 'bông hồng đỏ', 'hoa hồng': 'bông hồng đỏ',
  perfume: 'nước hoa sang chảnh', 'nước hoa': 'nước hoa VIP',
  cap: 'kính râm VIP', 'kính râm': 'kính râm VIP', kính: 'kính râm VIP',
  beer: 'tháp bia tươi', bia: 'tháp bia tươi', 'tháp bia': 'tháp bia tươi',
  heart: 'trái tim bốc lửa', 'bắn tim': 'trái tim bốc lửa',
  car: 'siêu xe thể thao', 'siêu xe': 'siêu xe thể thao', xe: 'siêu xe thể thao',
  dragon: 'rồng lửa vũ trường', 'sư tử': 'sư tử bao quán',
};

function onGift(id, name, giftName, count, diamonds, avatar) {
  const { v } = seat(id, name, { avatar });
  if (!v) return;

  const totalDiamonds = (diamonds || 1) * (count || 1);
  v.coins += totalDiamonds;
  hypeScore = Math.min(999, hypeScore + totalDiamonds * 5);

  const cleanGift = BAR_GIFTS[giftName.toLowerCase()] || giftName;
  let tier = totalDiamonds >= 100 ? 3 : totalDiamonds >= 10 ? 2 : 1;
  let mcScript = '';

  if (tier === 3) {
    mcScript = `Toàn thể anh em chú ý! Dân chơi ${v.name} vừa bao trọn vũ trường với ${count} ${cleanGift}! Quẩy lên anh em ơi!`;
    addLog(`👑 BOSS: ${v.name} BAO TRỌN QUÁN (${count}x ${cleanGift} = ${totalDiamonds} kim cương)`);
  } else if (tier === 2) {
    mcScript = `Hú hú! Chào mừng chủ tịch ${v.name} vừa mở bàn VIP với ${count} ${cleanGift}!`;
    addLog(`🍸 VIP: ${v.name} mở bàn VIP (${count}x ${cleanGift})`);
  } else {
    mcScript = `Cảm ơn dân chơi ${v.name} vừa rót ${count} ly ${cleanGift}!`;
    addLog(`🍺 Rót rượu: ${v.name} tặng ${count}x ${cleanGift}`);
  }

  say(mcScript);

  broadcast({
    t: 'gift',
    id,
    name: v.name,
    avatar: v.avatar,
    giftName: cleanGift,
    count,
    diamonds: totalDiamonds,
    total: v.coins,
    tier,
    hypeScore
  });
}

/* ------------------------------------------------------------- TTS MC Hype */
const ttsQueue = [];
let ttsBusy = false;

function cleanForSpeech(s) {
  return String(s || '').replace(/[&<>"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function say(text) {
  const clean = cleanForSpeech(text);
  if (!clean || ttsQueue.length > 8) return;
  ttsQueue.push({ text: clean, id: Date.now() + Math.random().toString(36).slice(2, 6) });
  pumpTTS();
}

async function pumpTTS() {
  if (ttsBusy || !ttsQueue.length) return;
  ttsBusy = true;
  const item = ttsQueue.shift();
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(settings.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const filename = `mc_${item.id}.mp3`;
    const filepath = path.join(TTS_DIR, filename);

    const rateStr = (settings.rate >= 0 ? `+${settings.rate}` : `${settings.rate}`) + '%';
    const pitchStr = (settings.pitch >= 0 ? `+${settings.pitch}` : `${settings.pitch}`) + 'Hz';

    const { audioStream } = tts.toStream(item.text, { rate: rateStr, pitch: pitchStr });
    const chunks = [];
    await new Promise((res, rej) => {
      audioStream.on('data', c => chunks.push(c));
      audioStream.on('close', res);
      audioStream.on('error', rej);
    });
    try { tts.close(); } catch {}
    fs.writeFileSync(filepath, Buffer.concat(chunks));

    broadcast({ t: 'tts', url: `/live/tts/${filename}`, text: item.text });
    setTimeout(() => { try { fs.unlinkSync(filepath); } catch {} }, 35000);
  } catch (err) {
    addLog(`⚠️ Lỗi đọc MC TTS: ${err.message}`);
  } finally {
    ttsBusy = false;
    setTimeout(pumpTTS, 150);
  }
}

/* ------------------------------------------------------------- TikTok Connector */
async function connectTikTok(uniqueId) {
  if (!uniqueId) return;
  if (tiktok) { try { await tiktok.disconnect(); } catch {} }
  tiktokState = { status: 'connecting', uniqueId, error: '' };
  broadcast({ t: 'tiktok', ...tiktokState }, 'control');
  addLog(`🔄 Đang kết nối tới TikTok phòng live: @${uniqueId}`);

  try {
    const { WebcastPushConnection } = await import('tiktok-live-connector');
    tiktok = new WebcastPushConnection(uniqueId, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      requestPollingIntervalMs: 1000,
      clientParams: { app_language: 'vi-VN' },
    });
    await tiktok.connect();
    tiktokState = { status: 'connected', uniqueId, error: '' };
    addLog(`✅ Đã kết nối thành công phòng live: @${uniqueId}`);
    broadcast({ t: 'tiktok', ...tiktokState }, 'control');

    tiktok.on('chat', data => onChat(data.uniqueId, data.nickname, data.comment, data.profilePictureUrl));
    tiktok.on('like', data => onLike(data.uniqueId, data.nickname, data.likeCount));
    tiktok.on('gift', data => {
      if (data.giftType === 1 && !data.repeatEnd) return;
      onGift(data.uniqueId, data.nickname, data.giftName, data.repeatCount || 1, data.diamondCount || 1, data.profilePictureUrl);
    });
    tiktok.on('disconnected', () => {
      tiktokState = { status: 'disconnected', uniqueId, error: 'Mất kết nối TikTok' };
      addLog(`⚠️ TikTok đã ngắt kết nối.`);
      broadcast({ t: 'tiktok', ...tiktokState }, 'control');
    });
    tiktok.on('error', err => {
      addLog(`❌ Lỗi TikTok: ${err?.message || err}`);
    });
  } catch (err) {
    tiktokState = { status: 'error', uniqueId, error: err.message || 'Lỗi không xác định' };
    addLog(`❌ Không thể kết nối TikTok @${uniqueId}: ${err.message}`);
    broadcast({ t: 'tiktok', ...tiktokState }, 'control');
  }
}
function disconnectTikTok() {
  if (tiktok) { try { tiktok.disconnect(); } catch {} }
  tiktokState = { status: 'idle', uniqueId: '', error: '' };
  broadcast({ t: 'tiktok', ...tiktokState }, 'control');
}

/* ------------------------------------------------------------- HTTP & WebSocket */
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '/live' || urlPath === '/live/') {
    res.writeHead(302, { Location: '/live/control.html' });
    return res.end();
  }

  let filePath = null;
  if (urlPath.startsWith('/live/tts/')) {
    filePath = path.join(TTS_DIR, path.basename(urlPath));
  } else if (urlPath.startsWith('/live/')) {
    filePath = path.join(__dirname, path.basename(urlPath));
  } else if (urlPath.startsWith('/assets/')) {
    filePath = path.join(ROOT, 'assets', urlPath.slice('/assets/'.length));
  }

  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp3': 'audio/mpeg',
  };
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const wss = new WebSocketServer({ server });
const clients = new Set();

function broadcast(msg, target = null) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1) {
      if (!target || ws._role === target || target === 'all') {
        ws.send(data);
      }
    }
  }
}

wss.on('connection', (ws, req) => {
  const role = new URL(req.url, 'http://localhost').searchParams.get('role') || 'overlay';
  ws._role = role;
  clients.add(ws);
  ws.send(JSON.stringify(snapshot()));
  if (role === 'control') ws.send(JSON.stringify({ t: 'logs', lines: log }));

  ws.on('message', raw => {
    try {
      const m = JSON.parse(raw);
      if (m.t === 'ctl') onControl(m);
    } catch {}
  });

  ws.on('close', () => clients.delete(ws));
});

/* ------------------------------------------------------------- Bot & Test Control */
const DEMO_NAMES = ['DânChơi_HảiPhòng', 'CậuBa_SàiGòn', 'TiểuThư_HàThành', 'BéNa_QuẩyĐêm', 'CôngTử_BạcLiêu', 'DJ_SơnTùng', 'ĐạiGia_BấtĐộngSản', 'TrâmAnh_HàNội', 'HoàngTử_PhốCổ', 'MỹNhân_Bar', 'ChủTịch_HảiĐăng', 'HotGirl_Quận1'];
const DEMO_COMMENTS = ['Nhạc căng quá anh em ơi!', 'Lên đồ lên đồ!', 'Cạn ly nào mọi người!', 'Nay ai bao quán thế?', 'Cho bài Vinahouse đi ad', 'Quẩy banh nóc luôn'];

function fillDemo(n) {
  const have = [...viewers.values()].filter(v => v.demo).length;
  const maxCap = capacity();
  for (let i = have; i < n && viewers.size < maxCap; i++) {
    const name = DEMO_NAMES[i % DEMO_NAMES.length] + (i >= DEMO_NAMES.length ? ' ' + (Math.floor(i / DEMO_NAMES.length) + 1) : '');
    seat('demo_' + i, name, { demo: true, skin: i % 2 === 0 ? 'man' : 'woman' });
  }
  addLog(`Đổ khách mẫu: ${viewers.size} khách trên sàn`);
}

function clearSeats() {
  viewers.clear();
  broadcast(snapshot());
  addLog('Đã làm trống toàn bộ sàn nhảy');
}

let botTimer = null;
function setBots(on, n, pace) {
  clearInterval(botTimer); botTimer = null;
  if (on) {
    n = Math.max(1, Math.min(60, n));
    for (let i = 0; i < n; i++) seat('bot_' + i, DEMO_NAMES[(i + 4) % DEMO_NAMES.length] + ' ·bot', { demo: true, skin: i % 2 === 0 ? 'man' : 'woman' });
    const every = { slow: 4000, mid: 1800, fast: 800 }[pace] || 1800;
    botTimer = setInterval(() => {
      const ids = [...viewers.keys()].filter(id => id.startsWith('bot_'));
      if (!ids.length) return;
      const id = ids[Math.floor(Math.random() * ids.length)], v = viewers.get(id), r = Math.random();
      if (r < 0.6) onChat(id, v.name, DEMO_COMMENTS[Math.floor(Math.random() * DEMO_COMMENTS.length)]);
      else if (r < 0.88) onLike(id, v.name, 1 + Math.floor(Math.random() * 5));
      else if (r < 0.98) onGift(id, v.name, 'Hoa hồng', 1, 1);
      else onGift(id, v.name, 'Sâm panh', 1, 30);
    }, every);
  }
  broadcast({ t: 'bots', on }, 'control');
  addLog(on ? 'Đã bật bot quẩy tự động' : 'Đã tắt bot quẩy');
}

function onControl(m) {
  switch (m.cmd) {
    case 'connect': connectTikTok(m.uniqueId); break;
    case 'disconnect': disconnectTikTok(); addLog('Đã ngắt kết nối TikTok'); break;
    case 'chat': { const n = String(m.name || 'Dân chơi').slice(0, 18); onChat('sim_' + n, n, String(m.text || 'Quẩy lên!').slice(0, 100)); break; }
    case 'gift': { const n = String(m.name || 'Dân chơi').slice(0, 18); onGift('sim_' + n, n, String(m.gift || 'Hoa hồng').slice(0, 30), Math.max(1, +m.count || 1), Math.max(1, +m.diamonds || 1)); break; }
    case 'fill': fillDemo(+m.n || 24); break;
    case 'clear': clearSeats(); break;
    case 'focus': broadcast({ t: 'focus', id: m.id }); break;
    case 'strobe': broadcast({ t: 'strobe' }); break;
    case 'airhorn': broadcast({ t: 'airhorn' }); break;
    case 'say': if (m.text) say(m.text); break;
    case 'settings':
      if (m.settings) {
        Object.assign(settings, m.settings);
        broadcast({ t: 'settings', settings, cap: capacity() });
      }
      break;
    case 'bots': setBots(!!m.on, +m.n || 12, m.pace); break;
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`🍸 VŨ TRƯỜNG CÕI MẠNG ĐÃ MỞ CỬA TẠI PORT ${PORT}`);
  console.log(`👉 Bảng điều khiển:                 http://localhost:${PORT}/live/control.html`);
  console.log(`👉 Overlay 9:16 (OBS/TikTok Studio): http://localhost:${PORT}/live/overlay.html`);
  console.log(`======================================================\n`);
});

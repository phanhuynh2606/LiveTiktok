// Thả Thuyền Hoa Đăng Cầu Nguyện — TikTok LIVE Overlay Server
// Port: 3002 | Architecture: Node.js + WebSocket + Edge TTS + TikTok Live Connector

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TTS_DIR = path.join(__dirname, 'tts');
fs.mkdirSync(TTS_DIR, { recursive: true });
for (const f of fs.readdirSync(TTS_DIR)) { try { fs.unlinkSync(path.join(TTS_DIR, f)); } catch {} }
const PORT = +process.env.PORT || 3002;

/* ------------------------------------------------------------------ state */
const settings = {
  title: 'THẢ THUYỀN HOA ĐĂNG',
  subtitle: 'CẦU NGUYỆN AN LÀNH · VẠN SỰ CÁT TƯỜNG',
  voice: 'vi-VN-NamMinhNeural',
  pitch: -15, // Hz (trầm ấm)
  rate: -18,  // % (chậm rãi, thanh tịnh)
  music: true,
  bell: true,
  dragonCoinsThreshold: 99, // Quà từ 99 xu trở lên triệu hồi Thuyền Rồng Vàng
};

const lanterns = new Map(); // id -> { id, name, text, avatar, coins, tier, createdAt, demo }
const viewers = new Map();  // id -> { id, name, coins }
const startedAt = Date.now();
let tiktok = null, tiktokState = { status: 'idle', uniqueId: '', error: '' };
const log = [];

/* ------------------------------------------------------------- Like Milestones */
let totalLikes = 0;
const LIKE_MILESTONES = [
  { target: 100, name: 'Mưa Hoa Sen Phước Lành', type: 'petals' },
  { target: 200, name: 'Đại Hồng Chung Cầu An', type: 'bell' },
  { target: 300, name: 'Đại Lễ Thả Đèn Trời', type: 'sky' },
  { target: 1000, name: 'Triệu Hồi Thuyền Rồng Vàng', type: 'dragon' },
];
const passedMilestones = new Set();

function getNextLikeGoal() {
  const next = LIKE_MILESTONES.find(m => totalLikes < m.target);
  return next ? next.target : 1000;
}

function onLike(count) {
  totalLikes += count;
  const next = getNextLikeGoal();
  broadcast({ t: 'like', count, total: totalLikes, next });

  for (const m of LIKE_MILESTONES) {
    if (totalLikes >= m.target && !passedMilestones.has(m.target)) {
      passedMilestones.add(m.target);
      addLog(`🎉 ĐẠT MỐC ${m.target} TIM: ${m.name}!`);
      broadcast({ t: 'milestone', target: m.target, name: m.name, action: m.type });

      if (m.type === 'petals') {
        broadcast({ t: 'petals' });
      } else if (m.type === 'bell') {
        broadcast({ t: 'bell' });
      } else if (m.type === 'sky') {
        for (let k = 0; k < 6; k++) {
          setTimeout(() => broadcast({ t: 'sky_lantern', name: `Mốc ${m.target} Tim` }), k * 450);
        }
      } else if (m.type === 'dragon') {
        onGift('room', 'Đại Chúng Đồng Lòng', 'Đại Lễ Phật Quang', 1, 999, '');
      }
    }
  }
}

function addLog(s) {
  const line = `[${new Date().toLocaleTimeString('vi-VN')}] ${s}`;
  log.push(line);
  if (log.length > 200) log.shift();
  broadcast({ t: 'log', line }, 'control');
  console.log(line);
}

function broadcast(data, targetRole) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      if (!targetRole || client.role === targetRole || (targetRole === 'overlay' && client.role !== 'control')) {
        client.send(msg);
      }
    }
  }
}

function snapshot() {
  return {
    t: 'state',
    settings,
    lanternCount: lanterns.size,
    viewers: [...viewers.values()],
    startedAt,
    tiktok: tiktokState,
    totalLikes,
    nextLikeGoal: getNextLikeGoal(),
  };
}

/* ------------------------------------------------------------- Lanterns */
function spawnLantern(id, name, text, avatar, opts = {}) {
  text = String(text || '').slice(0, 80);
  name = (name || id).slice(0, 18);
  const coins = opts.coins || 0;
  const tier = coins >= 99 ? 3 : coins >= 10 ? 2 : 1;

  let viewer = viewers.get(id);
  if (!viewer) {
    viewer = { id, name, coins: 0 };
    viewers.set(id, viewer);
  }
  viewer.coins += coins;

  const item = {
    id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    userId: id,
    name,
    text,
    avatar: avatar || '',
    coins,
    tier,
    createdAt: Date.now(),
    demo: !!opts.demo,
  };

  lanterns.set(item.id, item);
  if (lanterns.size > 150) {
    const oldestKey = lanterns.keys().next().value;
    lanterns.delete(oldestKey);
  }

  broadcast({ t: 'lantern', item });
  broadcast({ t: 'join', v: viewer }, 'control');
  return item;
}

function onChat(id, name, text, avatar) {
  const lantern = spawnLantern(id, name, text, avatar);
  addLog(`🪷 ${lantern.name} thả hoa đăng: "${lantern.text || 'Cầu bình an'}"`);

  // Nhận diện từ khóa tương tác trong bình luận của khán giả
  const t = (text || '').toLowerCase().trim();
  if (t.includes('đèn trời') || t.includes('den troi')) {
    broadcast({ t: 'sky_lantern', name: lantern.name });
  } else if (t.includes('chuông') || t.includes('chuong')) {
    broadcast({ t: 'bell' });
  } else if (t.includes('rải hoa') || t.includes('rai hoa') || t.includes('hoa sen')) {
    broadcast({ t: 'petals' });
  }
}

/* ------------------------------------------------------------- Gifts & Dragon Boat */
const BUDDHIST_PRAYERS = [
  'Nguyện cầu gia đạo bình an, vạn sự cát tường',
  'Nguyện cầu cha mẹ mạnh khỏe, sống lâu trăm tuổi',
  'Nguyện hồi hướng công đức cho khắp muôn loài',
  'Nguyện cầu thân tâm an lạc, phiền não tiêu trừ',
  'Nguyện cầu công việc hanh thông, tài lộc dồi dào',
];

function onGift(id, name, giftName, count, diamonds, avatar) {
  count = Math.max(1, Math.min(9999, +count || 1));
  const coins = Math.max(1, (diamonds || 1) * count);
  const isDragon = coins >= settings.dragonCoinsThreshold;

  // Thả đèn sen ngọc hoàng kim (tier 2) hoặc Thuyền Rồng (tier 3)
  const lantern = spawnLantern(id, name, `Cúng dường ${giftName} x${count}`, avatar, { coins });
  const prayer = BUDDHIST_PRAYERS[Math.floor(Math.random() * BUDDHIST_PRAYERS.length)];

  // 1. PHÁT BANNER VÀ HIỆU ỨNG LÊN MÀN HÌNH NGAY LẬP TỨC (Không độ trễ)
  if (isDragon) {
    broadcast({
      t: 'dragon_boat',
      id,
      name: lantern.name,
      giftName,
      count,
      coins,
      avatar: lantern.avatar,
      prayer,
    });
    addLog(`🐉 ĐẠI LỄ: ${lantern.name} cúng dường ${giftName} x${count} ➔ TRIỆU HỒI THUYỀN RỒNG VÀNG!`);
    const speech = `Nam mô A Di Đà Phật. Cảm niệm đại công đức đại thí chủ ${spoken(lantern.name)} thành tâm cúng dường đại lễ ${giftName}. ${prayer}.`;
    say(speech);
  } else {
    broadcast({
      t: 'gift',
      id,
      name: lantern.name,
      giftName,
      count,
      coins,
      avatar: lantern.avatar,
      tier: lantern.tier,
      prayer,
    });
    addLog(`🎁 ${lantern.name} cúng dường ${giftName} x${count}`);
    const speech = `Cảm niệm công đức Phật tử ${spoken(lantern.name)} cúng dường ${giftName}. ${prayer}.`;
    say(speech);
  }
  broadcast({ t: 'merit', viewers: [...viewers.values()].filter(v => v.coins > 0) });
}

const spoken = s => String(s).replace(/[_@.]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').trim() || 'ẩn danh';

/* ------------------------------------------------------------- Edge TTS */
const ttsQueue = [];
let ttsBusy = false, ttsSeq = 0;
function esc(s) { return String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }

function say(text) {
  while (ttsQueue.length >= 2) ttsQueue.shift();
  ttsQueue.push({ text: String(text).slice(0, 250) });
  pumpTTS();
}

async function pumpTTS() {
  if (ttsBusy || !ttsQueue.length) return;
  ttsBusy = true;
  const { text } = ttsQueue.shift();

  for (let attempt = 0; attempt < 3; attempt++) {
    let tts = null;
    try {
      const file = `tts_${Date.now()}_${++ttsSeq}.mp3`;
      tts = new MsEdgeTTS();
      await tts.setMetadata(settings.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, {
        pitch: `${settings.pitch >= 0 ? '+' : ''}${settings.pitch}Hz`,
        rate: `${settings.rate >= 0 ? '+' : ''}${settings.rate}%`,
      });
      const chunks = [];
      await new Promise((res, rej) => {
        audioStream.on('data', c => chunks.push(c));
        audioStream.on('close', res);
        audioStream.on('end', res);
        audioStream.on('error', rej);
      });
      fs.writeFileSync(path.join(TTS_DIR, file), Buffer.concat(chunks));
      broadcast({ t: 'tts', url: `/live/tts/${file}`, text });
      const old = fs.readdirSync(TTS_DIR).sort();
      while (old.length > 30) { try { fs.unlinkSync(path.join(TTS_DIR, old.shift())); } catch {} }
      break;
    } catch (e) {
      if (attempt === 2) {
        addLog('TTS lỗi: ' + (e?.message || e));
      } else {
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      try { tts?.close(); } catch {}
    }
  }
  ttsBusy = false;
  setTimeout(pumpTTS, 50);
}

/* ------------------------------------------------------------- TikTok Live */
async function connectTikTok(uniqueId) {
  uniqueId = String(uniqueId || '').trim().replace(/^.*tiktok\.com\/@?/i, '').replace(/^@/, '').replace(/\/.*$/, '');
  if (!uniqueId) return;
  await disconnectTikTok();
  tiktokState = { status: 'connecting', uniqueId, error: '' };
  broadcast({ t: 'tiktok', ...tiktokState });

  try {
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import('tiktok-live-connector');
    const conn = new TikTokLiveConnection(uniqueId, { enableExtendedGiftInfo: false, processInitialData: false });
    const av = u => u?.avatarThumb?.urlList?.[0] || u?.profilePicture?.url?.[0] || '';
    const nm = u => u?.nickname || u?.uniqueId || 'Ẩn danh';
    const uid = u => u?.id || u?.uniqueId || nm(u);

    conn.on(WebcastEvent.CHAT, d => onChat(uid(d.user), nm(d.user), d.comment || d.content, av(d.user)));
    conn.on(WebcastEvent.GIFT, d => {
      const g = d.gift || d.giftDetails;
      if (g?.type === 1 && !d.repeatEnd) return;
      const gname = g?.name || 'Hoa đăng';
      const dia = g?.diamondCount ?? 1;
      onGift(uid(d.user), nm(d.user), gname, d.repeatCount || 1, dia, av(d.user));
    });
    conn.on(WebcastEvent.LIKE, d => onLike(d.count || d.likeCount || 1));
    conn.on(ControlEvent.DISCONNECTED, () => {
      tiktokState = { ...tiktokState, status: 'disconnected' };
      broadcast({ t: 'tiktok', ...tiktokState });
      addLog('TikTok: mất kết nối');
    });
    conn.on(ControlEvent.ERROR, e => addLog('TikTok lỗi: ' + (e?.message || e)));

    await conn.connect();
    tiktok = conn;
    tiktokState = { status: 'connected', uniqueId, error: '' };
    addLog(`✅ Đã kết nối phòng Live @${uniqueId}`);
  } catch (e) {
    tiktokState = { status: 'error', uniqueId, error: String(e?.message || e) };
    addLog(`❌ Kết nối lỗi @${uniqueId}: ${tiktokState.error}`);
  }
  broadcast({ t: 'tiktok', ...tiktokState });
}

async function disconnectTikTok() {
  if (tiktok) { try { await tiktok.disconnect(); } catch {} tiktok = null; }
  tiktokState = { status: 'idle', uniqueId: '', error: '' };
  broadcast({ t: 'tiktok', ...tiktokState });
}

/* ------------------------------------------------------------- Demo Data */
const DEMO_NAMES = ['Diệu Hạnh', 'Minh Tâm', 'Thiện Đức', 'Huệ An', 'Tịnh Nhã', 'Quảng Trí', 'Chơn Như', 'Pháp Hỷ', 'Nguyên Thanh', 'Tâm Đăng', 'Thu Hà', 'Đức Anh', 'Diệu Linh'];
const DEMO_PRAYERS = ['Cầu gia đạo bình an', 'Cầu cha mẹ khỏe mạnh', 'Nam mô A Di Đà Phật', 'Cầu con cái thi đỗ', 'Cầu công việc thuận lợi'];

function fillDemo(n) {
  for (let i = 0; i < n; i++) {
    const name = DEMO_NAMES[i % DEMO_NAMES.length];
    const text = DEMO_PRAYERS[i % DEMO_PRAYERS.length];
    spawnLantern('demo_' + i, name, text, '', { demo: true });
  }
  addLog(`Đã thả ${n} hoa đăng mẫu lên sông`);
}

/* ------------------------------------------------------------- HTTP Server */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = null;

  if (urlPath === '/' || urlPath === '/live' || urlPath === '/live/') {
    filePath = path.join(__dirname, 'overlay.html');
  } else if (urlPath.startsWith('/assets/')) {
    filePath = path.join(ROOT, urlPath);
  } else if (urlPath.startsWith('/live/')) {
    filePath = path.join(__dirname, urlPath.slice(6));
  }

  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

let botTimer = null;
function setBots(on, n, pace) {
  clearInterval(botTimer);
  if (!on) { addLog('Đã tắt bot mô phỏng'); broadcast({ t: 'bots', on: false }, 'control'); return; }
  const delay = pace === 'fast' ? 1800 : pace === 'slow' ? 6000 : 3500;
  botTimer = setInterval(() => {
    const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
    if (Math.random() < 0.25) {
      onGift('bot_' + name, name, 'Hoa hồng', 1, 1, '');
    } else {
      const text = DEMO_PRAYERS[Math.floor(Math.random() * DEMO_PRAYERS.length)];
      onChat('bot_' + name, name, text, '');
    }
  }, delay);
  addLog(`Đã bật ${n} bot mô phỏng (${pace || 'vừa'})`);
  broadcast({ t: 'bots', on: true }, 'control');
}

/* ------------------------------------------------------------- WebSocket */
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  ws.role = url.searchParams.get('role') || 'overlay';

  ws.send(JSON.stringify(snapshot()));
  if (log.length && ws.role === 'control') {
    ws.send(JSON.stringify({ t: 'logs', lines: log.slice(-40) }));
  }

  ws.on('message', raw => {
    try {
      const m = JSON.parse(raw);
      switch (m.cmd) {
        case 'connect': connectTikTok(m.uniqueId); break;
        case 'disconnect': disconnectTikTok(); break;
        case 'chat': onChat('sim_' + (m.name || 'Khách'), m.name || 'Phật Tử', m.text || 'Cầu bình an', ''); break;
        case 'like': onLike(m.count || 5); break;
        case 'gift': onGift('sim_' + (m.name || 'Khách'), m.name || 'Đại Thí Chủ', m.gift || 'Hoa đăng sen', m.count || 1, m.diamonds || 1, ''); break;
        case 'dragon':
          onGift('sim_' + (m.name || 'Đại Gia'), m.name || 'Đại Thí Chủ', 'Đại Lễ Phật Quang', 1, 999, '');
          break;
        case 'bell': broadcast({ t: 'bell' }); break;
        case 'sky':
          broadcast({ t: 'sky_lantern', name: m.name || 'Phật Tử' });
          addLog(`🏮 ${m.name || 'Phật Tử'} thả đèn trời cầu an`);
          break;
        case 'petals':
          broadcast({ t: 'petals' });
          addLog('🌸 Mưa hoa sen chúc phúc');
          break;
        case 'say': if (m.text) say(m.text); break;
        case 'settings':
          if (m.settings) {
            Object.assign(settings, m.settings);
            broadcast({ t: 'settings', settings });
          }
          break;
        case 'bots': setBots(!!m.on, +m.n || 12, m.pace); break;
        case 'fill': fillDemo(Math.max(1, Math.min(100, +m.n || 20))); break;
        case 'clear':
          lanterns.clear();
          viewers.clear();
          totalLikes = 0;
          passedMilestones.clear();
          broadcast({ t: 'clear' });
          broadcast({ t: 'like', count: 0, total: 0, next: 100 });
          addLog('Đã dọn sạch hoa đăng và reset mốc tim');
          break;
      }
    } catch {}
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🪷 THẢ THUYỀN HOA ĐĂNG CẦU NGUYỆN — Server đang chạy tại:`);
  console.log(`   - Màn hình Overlay 9:16 : http://localhost:${PORT}/live/overlay.html`);
  console.log(`   - Bảng điều khiển       : http://localhost:${PORT}/live/control.html\n`);
});


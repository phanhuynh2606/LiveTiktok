// Chánh Điện Tịnh Tâm — live server
// Runs on the streaming PC. Serves the overlay + control panel, listens to a TikTok LIVE room,
// keeps the list of seated viewers, generates Vietnamese voice lines with Edge TTS and pushes
// everything to the overlay over WebSocket.
//
//   cd live && npm install && node server.mjs        → http://localhost:3000/live/control.html
//
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { EdgeTTS } from '@andresaya/edge-tts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');            // repo root: serves /assets, /live
const TTS_DIR = path.join(__dirname, 'tts');
fs.mkdirSync(TTS_DIR, { recursive: true });
for (const f of fs.readdirSync(TTS_DIR)) { try { fs.unlinkSync(path.join(TTS_DIR, f)); } catch {} }
const PORT = +process.env.PORT || 3000;

/* ------------------------------------------------------------------ state */
const settings = {
  title: 'Chánh Điện Tịnh Tâm',
  subtitle: 'Nam Mô A Di Đà Phật',
  voice: 'vi-VN-NamMinhNeural',      // or vi-VN-HoaiMyNeural
  pitch: -18,                        // Hz
  rate: -4,                          // %
  music: true, mo: true, moBpm: 52,
  autoChant: true, chantEveryMin: 3,
  likeMilestone: 100,                // mốc tim gõ chuông (mỗi N tim, 0 = tắt)
  seatMode: 'auto',                  // tự mở rộng: 24 (ít người, thoáng) -> 36 -> 64 -> 100 (đông người)
  joinOnEnter: false,                // also seat viewers who only enter the room
  gifts: { readAll: true, minDiamonds: 1 },
};
const viewers = new Map();           // id -> { id, name, skin, avatar, coins, joinedAt, lastAt, lastText, lastTextAt, demo }
const startedAt = Date.now();
let tiktok = null, tiktokState = { status: 'idle', uniqueId: '', error: '' };
const log = [];
function addLog(s){ const line = `[${new Date().toLocaleTimeString('vi-VN')}] ${s}`; log.push(line); if (log.length > 300) log.shift(); broadcast({ t:'log', line }, 'control'); console.log(line); }

const CAPS = [24, 36, 64];
function capacity(){ if (settings.seatMode !== 'auto') return +settings.seatMode; const n = viewers.size; return CAPS.find(c => n <= c) || 64; }

/* skins: sprites that exist in /assets. Walking strips exist for man / woman / granny. */
// A comment changes the outfit only when it IS the keyword (≤ 3 words), so "Nam mô A Di Đà Phật" never reads as "nam".
const SKIN_WORDS = [
  ['master', ['cao tăng','cao tang']], ['monk', ['sư','su','sư thầy','su thay','thầy','thay']], ['nun', ['ni','ni cô','ni co','sư cô','su co']],
  ['child', ['tiểu','tieu','chú tiểu','chu tieu','bé','be']], ['granny', ['bà','ba','áo nâu','ao nau','cụ','cu']],
  ['woman', ['nữ','nu','chị','chi','gái','gai']], ['man', ['nam','anh','trai']],
];
function skinFromText(t){
  const w = String(t).toLowerCase().normalize('NFC').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!w || w.split(' ').length > 3) return null;
  for (const [skin, words] of SKIN_WORDS) if (words.some(k => w === k || w.startsWith(k + ' '))) return skin;
  return null;
}
const DEFAULT_SKINS = ['man', 'woman', 'woman', 'man', 'granny'];

function pub(v){ return { id:v.id, name:v.name, skin:v.skin, avatar:v.avatar||'', coins:v.coins, demo:!!v.demo }; }
function snapshot(){ return { t:'state', settings, viewers:[...viewers.values()].map(pub), cap: capacity(), startedAt, tiktok: tiktokState }; }

function seat(id, name, opts = {}){
  let v = viewers.get(id);
  if (v){ v.lastAt = Date.now(); if (opts.avatar) v.avatar = opts.avatar; return { v, isNew:false }; }
  const maxCap = settings.seatMode !== 'auto' ? +settings.seatMode : 64;
  if (viewers.size >= maxCap){                     // full: the longest-quiet non-donor stands up
    const quiet = [...viewers.values()].filter(x => x.coins === 0).sort((a,b) => a.lastAt - b.lastAt)[0];
    if (!quiet) return { v:null, isNew:false };
    viewers.delete(quiet.id); broadcast({ t:'leave', id: quiet.id });
  }
  v = { id, name: (name||id).slice(0, 18), skin: opts.skin || DEFAULT_SKINS[viewers.size % DEFAULT_SKINS.length],
        avatar: opts.avatar || '', coins: 0, joinedAt: Date.now(), lastAt: Date.now(), demo: !!opts.demo };
  viewers.set(id, v);
  broadcast({ t:'join', v: pub(v), cap: capacity() });
  return { v, isNew:true };
}

/* ------------------------------------------------------------- events in */
function onChat(id, name, text, avatar){
  text = String(text || '').slice(0, 120);
  const want = skinFromText(text);
  const { v, isNew } = seat(id, name, { avatar, skin: want || undefined });
  if (!v) return;
  if (!isNew && want && want !== v.skin){ v.skin = want; broadcast({ t:'skin', id, skin: want }); addLog(`👤 ${v.name} đổi trang phục: ${want}`); }
  const isBow = /\b(l[aạ]y|v[aá]i|s[aá]m\s*h[oố]i|[đd][aả]nh\s*l[eễ])\b/i.test(text);
  if (isBow) addLog(`🙏 ${v.name} thành tâm đảnh lễ lạy Phật`);
  v.lastText = text; v.lastTextAt = Date.now();
  broadcast({ t:'chat', id, name: v.name, text, bow: isBow });
}

let totalLikes = 0;
function onLike(id, n = 1, reportedTotal = 0){
  const count = Math.max(1, +n || 1);
  const prev = totalLikes;
  if (reportedTotal && reportedTotal > totalLikes) {
    if (prev === 0 && reportedTotal >= (+settings.likeMilestone || 100)) {
      totalLikes = reportedTotal;
      broadcast({ t:'like', id, n: count, totalLikes });
      return;
    }
    totalLikes = reportedTotal;
  } else {
    totalLikes += count;
  }
  broadcast({ t:'like', id, n: count, totalLikes });
  const milestone = +settings.likeMilestone || 0;
  if (milestone > 0) {
    const prevStep = Math.floor(prev / milestone);
    const currStep = Math.floor(totalLikes / milestone);
    if (currStep > prevStep) {
      const reached = currStep * milestone;
      broadcast({ t:'bell', big: true, milestone: reached });
      addLog(`🔔 Đạt mốc ${reached.toLocaleString('vi-VN')} lượt tim · Thỉnh đại hồng chung!`);
    }
  }
}

const BUDDHIST_GIFTS = {
  // Nhóm Hoa & Hương
  rose: 'đóa hoa tươi cúng Phật', 'hoa hồng': 'đóa hoa tươi cúng Phật', 'bông hồng': 'đóa hoa tươi cúng Phật',
  lotus: 'đóa sen thanh khiết', 'hoa sen': 'đóa sen thanh khiết', sen: 'đóa sen thanh khiết',
  perfume: 'hương thơm thanh tịnh', 'nước hoa': 'hương thơm thanh tịnh',
  candle: 'ngọn nến trí tuệ', 'cây nến': 'ngọn nến trí tuệ', nến: 'ngọn nến trí tuệ',
  // Nhóm Tâm thành & Đèn hoa
  'heart me': 'tấm lòng thành kính', 'finger heart': 'tấm lòng thành kính', 'bắn tim': 'tấm lòng thành kính',
  'thả tim': 'tấm lòng thành kính', 'trái tim': 'tấm lòng thành kính', heart: 'tấm lòng thành kính', love: 'tấm lòng thành kính',
  fireworks: 'hoa đăng rực rỡ', firework: 'hoa đăng rực rỡ', 'pháo hoa': 'hoa đăng rực rỡ',
  // Nhóm Ẩm thực cúng dường
  'ice cream cone': 'phẩm vật ngọt lành', 'ice cream': 'phẩm vật ngọt lành', 'cây kem': 'phẩm vật ngọt lành', kem: 'phẩm vật ngọt lành',
  doughnut: 'bánh ngọt cúng dường', donut: 'bánh ngọt cúng dường', 'bánh vòng': 'bánh ngọt cúng dường',
  tea: 'chén trà thanh tịnh', trà: 'chén trà thanh tịnh', water: 'nước cam lộ', nước: 'nước cam lộ',
  // Nhóm Linh vật & Phúc đức
  'paper crane': 'cánh hạc cát tường', 'hạc giấy': 'cánh hạc cát tường',
  swan: 'bạch hạc thanh cao', 'thiên nga': 'bạch hạc thanh cao',
  lion: 'sư tử hộ pháp', 'sư tử': 'sư tử hộ pháp',
  whale: 'đại ngư trợ duyên', 'cá voi': 'đại ngư trợ duyên',
  panda: 'linh vật an lành', 'gấu trúc': 'linh vật an lành',
  dragon: 'rồng vàng hộ pháp', 'rồng': 'rồng vàng hộ pháp',
  // Nhóm Trang nghiêm & Đại lễ
  crown: 'bảo mão công đức', 'little crown': 'bảo mão công đức', 'vương miện': 'bảo mão công đức',
  cap: 'mũ mão trang nghiêm', mũ: 'mũ mão trang nghiêm',
  universe: 'mười phương chư Phật', galaxy: 'mười phương chư Phật', 'vũ trụ': 'mười phương chư Phật',
  castle: 'tịnh xá trang nghiêm', 'lâu đài': 'tịnh xá trang nghiêm',
};
function viGift(s){
  if (!s || s === 'quà') return 'phẩm vật cúng dường';
  const k = String(s).toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, '');
  if (BUDDHIST_GIFTS[k]) return BUDDHIST_GIFTS[k];
  for (const [w, val] of Object.entries(BUDDHIST_GIFTS)){
    if (k.includes(w)) return val;
  }
  return `phẩm vật ${s}`;
}

function onGift(id, name, rawGift, count, diamonds, avatar){
  const giftName = viGift(rawGift).slice(0, 35); count = Math.max(1, Math.min(9999, +count || 1));
  const { v } = seat(id, name, { avatar });
  if (!v) return;
  const coins = Math.max(1, (diamonds || 1) * (count || 1));
  v.coins += coins;
  const prayer = (v.lastText && Date.now() - v.lastTextAt < 90_000 && v.lastText.length > 6) ? v.lastText : pickPrayer();
  const tier = coins >= 99 ? 3 : coins >= 10 ? 2 : 1;
  const fortune = pickFortune();
  const line = `Nam mô A Di Đà Phật. Cảm niệm công đức Phật tử ${spoken(v.name)} thành tâm cúng dường ${giftName}${count > 1 ? ', ' + count + ' phần' : ''}. ${prayer}.`;
  broadcast({ t:'gift', id, name: v.name, giftName, count, coins, total: v.coins, tier, prayer, fortune, avatar: v.avatar });
  addLog(`🎁 ${v.name} cúng dường ${giftName} · Gieo được ${fortune.num}`);
  if (settings.gifts.readAll || coins >= settings.gifts.minDiamonds) say(line, { tag:'gift', id });
}

function pickPrayer(){
  const P = ['Nguyện cầu gia đạo bình an, vạn sự cát tường', 'Nguyện cầu cha mẹ mạnh khỏe, sống lâu', 'Nguyện hồi hướng công đức cho khắp pháp giới chúng sinh',
             'Nguyện cầu thân tâm an lạc, phiền não tiêu trừ', 'Nguyện cầu công việc hanh thông, gia đình hạnh phúc'];
  return P[Math.floor(Math.random() * P.length)];
}
const FORTUNES = [
  { num:'Quẻ số 01 · Đại Cát', text:'Tâm an vạn sự an. Phúc đức tự tâm sinh, gia đạo thuận hòa, vạn sự hanh thông.' },
  { num:'Quẻ số 08 · Thượng Kiết', text:'Cần cù gieo nhân thiện, ắt gặt quả lành. Quý nhân tương trợ, tài lộc dồi dào.' },
  { num:'Quẻ số 16 · Thượng Kiết', text:'Bao dung hóa giải ưu phiền, hoan hỷ đón nhận duyên lành. Tình duyên như ý, gia môn ấm êm.' },
  { num:'Quẻ số 22 · Đại Cát', text:'Tâm từ bi sáng tựa trăng rằm. Thân tâm an lạc, tai ương tiêu trừ, phước thọ tăng long.' },
  { num:'Quẻ số 28 · Thượng Kiết', text:'Kiên trì vượt khó, qua cơn bĩ cực tới hồi thái lai. Công danh sự nghiệp thăng tiến.' },
  { num:'Quẻ số 33 · Thượng Kiết', text:'Một chữ nhẫn vạn sự bình yên. Hòa khí sinh tài, gia môn hưng vượng cát tường.' },
  { num:'Quẻ số 66 · Đại Cát', text:'Hoa sen vô nhiễm giữa bùn lầy. Trí tuệ quang minh, gặp dữ hóa lành, trăm sự viên thành.' },
  { num:'Quẻ số 79 · Thượng Kiết', text:'Biết ơn và chia sẻ là gieo hạt phước báu. Hỷ sự lâm môn, vạn dặm bình an.' },
  { num:'Quẻ số 88 · Đại Cát', text:'Ánh sáng trí tuệ soi tỏ bóng đêm. Vận số xoay chuyển cát lợi, tài lộc phúc thọ ngập tràn.' },
  { num:'Quẻ số 99 · Đại Cát', text:'Phước đức tổ tiên che chở, tâm thiện hướng Phật, vạn sự sở cầu giai đắc như ý.' }
];
const pickFortune = () => FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
const spoken = s => String(s).replace(/[_@.]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').trim() || 'ẩn danh';

/* ------------------------------------------------------------------ TTS */
const ttsQueue = []; let ttsBusy = false, ttsSeq = 0;
function say(text, meta = {}){ while (ttsQueue.length >= 2) ttsQueue.shift(); ttsQueue.push({ text: String(text).slice(0, 250), meta }); pumpTTS(); }
async function pumpTTS(){
  if (ttsBusy || !ttsQueue.length) return; ttsBusy = true;
  const { text, meta } = ttsQueue.shift();
  for (let attempt = 0; attempt < 3; attempt++){
    try {
      const file = `tts_${Date.now()}_${++ttsSeq}.mp3`;
      const tts = new EdgeTTS();
      await tts.synthesize(text, settings.voice, {
        pitch: `${settings.pitch >= 0 ? '+' : ''}${settings.pitch}Hz`,
        rate: `${settings.rate >= 0 ? '+' : ''}${settings.rate}%`
      });
      const buf = tts.toBuffer();
      if (!buf || !buf.length) throw new Error('Dữ liệu âm thanh trống');
      fs.writeFileSync(path.join(TTS_DIR, file), buf);
      broadcast({ t:'tts', url: `/live/tts/${file}`, text, ...meta });
      const old = fs.readdirSync(TTS_DIR).sort(); while (old.length > 40) { try { fs.unlinkSync(path.join(TTS_DIR, old.shift())); } catch {} }
      break;
    } catch (e) {
      if (attempt === 2) addLog('TTS lỗi: ' + (e?.message || e));
      else await new Promise(r => setTimeout(r, 400));
    }
  }
  ttsBusy = false; setTimeout(pumpTTS, 50);
}

const CHANTS = [
  'Nam mô Bổn Sư Thích Ca Mâu Ni Phật. Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sinh, đều trọn thành Phật đạo.',
  'Nam mô A Di Đà Phật. Nguyện sanh Tây Phương Tịnh Độ trung, cửu phẩm liên hoa vi phụ mẫu.',
  'Nam mô Đại Bi Quán Thế Âm Bồ Tát. Nguyện cho tất cả chúng sinh thân tâm an lạc, tai qua nạn khỏi.',
  'Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời, chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.',
  'Nam mô Dược Sư Lưu Ly Quang Vương Phật. Nguyện tiêu trừ bệnh tật, tai qua nạn khỏi, thân tâm an khang, phước thọ tăng long.',
  'Đệ tử chúng con thành tâm sám hối mọi lỗi lầm, nguyện bỏ ác làm lành, hướng tâm về nẻo giác, trọn thành Phật đạo.',
  'Nguyện ngày an lành, đêm an lành, đêm ngày sáu thời thường an lành. Nguyện chư Phật, chư Bồ Tát từ bi gia hộ.',
  'Nguyện cầu cho cha mẹ hiện tiền tăng long phước thọ, cha mẹ quá vãng sớm siêu sinh về miền Cực Lạc.',
];
let chantIdx = 0, chantTimer = null;
function chant(){ const text = CHANTS[chantIdx++ % CHANTS.length]; broadcast({ t:'chant', text }); say(text, { tag:'chant' }); }
function scheduleChant(){ clearInterval(chantTimer); if (settings.autoChant) chantTimer = setInterval(chant, Math.max(1, settings.chantEveryMin) * 60_000); }
scheduleChant();

/* --------------------------------------------------------------- TikTok */
let TikTokLib = null;
async function connectTikTok(uniqueId){
  uniqueId = String(uniqueId || '').trim().replace(/^.*tiktok\.com\/@?/i, '').replace(/^@/, '').replace(/\/.*$/, '');
  if (!uniqueId) return;
  await disconnectTikTok();
  tiktokState = { status: 'connecting', uniqueId, error: '' }; broadcast({ t:'tiktok', ...tiktokState });
  try {
    TikTokLib ||= await import('tiktok-live-connector');
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = TikTokLib;
    const conn = new TikTokLiveConnection(uniqueId, { enableExtendedGiftInfo: false, processInitialData: false, requestPollingIntervalMs: 400 });
    const av = u => u?.avatarThumb?.urlList?.[0] || u?.avatarMedium?.urlList?.[0] || u?.profilePicture?.url?.[0] || '';
    const nm = u => u?.nickname || u?.displayId || u?.uniqueId || 'ẩn danh';
    const uid = u => u?.id || u?.displayId || u?.uniqueId || u?.userId || nm(u);
    conn.on(WebcastEvent.CHAT, d => onChat(uid(d.user), nm(d.user), d.comment || d.content, av(d.user)));
    conn.on(WebcastEvent.GIFT, d => {
      const g = d.gift || d.giftDetails || d.extendedGiftInfo;
      const type = g?.type ?? g?.giftType;
      if (type === 1 && !d.repeatEnd) return;                       // streak still running
      const gname = g?.name || g?.giftName || 'quà';
      const dia = g?.diamondCount ?? g?.diamond_count ?? 1;
      onGift(uid(d.user), nm(d.user), gname, d.repeatCount || 1, dia, av(d.user));
      addLog(`🎁 ${nm(d.user)} cúng dường ${viGift(gname)} x${d.repeatCount || 1}`);
    });
    conn.on(WebcastEvent.MEMBER, d => { if (settings.joinOnEnter) seat(uid(d.user), nm(d.user), { avatar: av(d.user) }); });
    conn.on(WebcastEvent.LIKE, d => onLike(uid(d.user), d.count || d.likeCount || 1, d.totalLikeCount));
    conn.on(ControlEvent.DISCONNECTED, () => {
      tiktokState = { ...tiktokState, status: 'disconnected' };
      broadcast({ t:'tiktok', ...tiktokState });
      addLog('TikTok: mất kết nối, tự kết nối lại sau 5s...');
      if (tiktok === conn) setTimeout(() => { if (tiktokState.status === 'disconnected') connectTikTok(uniqueId); }, 5000);
    });
    conn.on(ControlEvent.ERROR, e => addLog('TikTok lỗi: ' + (e?.info || e?.message || e)));
    const st = await conn.connect();
    tiktok = conn;
    tiktokState = { status: 'connected', uniqueId, error: '', roomId: st?.roomId || '' };
    addLog(`✅ Đã kết nối live @${uniqueId}`);
  } catch (e) {
    tiktokState = { status: 'error', uniqueId, error: String(e?.message || e) };
    addLog(`❌ Không kết nối được @${uniqueId}: ${tiktokState.error}`);
  }
  broadcast({ t:'tiktok', ...tiktokState });
}
async function disconnectTikTok(){ totalLikes = 0; const prev = tiktok; tiktok = null; if (prev){ try { await prev.disconnect(); } catch {} } tiktokState = { status:'idle', uniqueId:'', error:'' }; broadcast({ t:'tiktok', ...tiktokState }); }

/* ------------------------------------------------------------- test data */
const DEMO_NAMES = ['Diệu Hạnh','Minh Tâm','Thiện Đức','Huệ An','Tịnh Nhã','Quảng Trí','Chơn Như','Pháp Hỷ','Nguyên Thanh','Tâm Đăng','Diệu Liên','Trí Hải','Phước Lộc','Hạnh Nguyện','Như Ý','Bảo Châu','Thanh Lương','Từ Tâm','An Lạc','Giác Hoa','Tuệ Minh','Liên Hương','Thu Hà','Ngọc Lan','Đức Anh','Hải Đăng','Mai Anh','Phương Thảo','Trung Kiên','Quang Huy','Bảo Ngọc','Diệu Linh'];
function fillDemo(n){
  const have = [...viewers.values()].filter(v => v.demo).length;
  const maxCap = settings.seatMode !== 'auto' ? +settings.seatMode : 64;
  for (let i = have; i < n && viewers.size < maxCap; i++){
    const name = DEMO_NAMES[i % DEMO_NAMES.length] + (i >= DEMO_NAMES.length ? ' ' + (Math.floor(i / DEMO_NAMES.length) + 1) : '');
    seat('demo_' + i, name, { demo: true, skin: ['man','woman','woman','man','granny','monk','nun','child'][i % 8] });
  }
}
function clearSeats(){ viewers.clear(); totalLikes = 0; broadcast(snapshot()); addLog('Đã làm trống bồ đoàn'); }

/* ------------------------------------------------------------- control */
function onControl(m){
  switch (m.cmd){
    case 'connect': connectTikTok(m.uniqueId); break;
    case 'disconnect': disconnectTikTok(); addLog('Đã ngắt kết nối TikTok'); break;
    case 'chat': { const n = String(m.name || 'Khách').slice(0, 18); onChat('sim_' + n, n, String(m.text || 'Nam mô A Di Đà Phật').slice(0, 120)); break; }
    case 'gift': { const n = String(m.name || 'Khách').slice(0, 18); onGift('sim_' + n, n, String(m.gift || 'Hoa hồng').slice(0, 30), clamp(m.count, 1, 99), clamp(m.diamonds, 1, 50000)); break; }
    case 'like': onLike('sim_' + String(m.name || 'Khách').slice(0, 18), clamp(m.n, 1, 1000)); break;
    case 'fill': fillDemo(clamp(m.n, 1, 100)); addLog(`Đổ người mẫu: ${viewers.size} người`); break;
    case 'clear': clearSeats(); break;
    case 'focus': broadcast({ t:'focus', id: m.id }); break;
    case 'bell': broadcast({ t:'bell' }); break;
    case 'mo': broadcast({ t:'mo1' }); break;
    case 'chant': chant(); break;
    case 'say': if (m.text) say(String(m.text).slice(0, 400), { tag:'say' }); break;
    case 'settings':
      applySettings(m.settings || {});
      scheduleChant(); broadcast({ t:'settings', settings, cap: capacity() }); break;
    case 'bots': setBots(!!m.on, +m.n || 12, m.pace); break;
  }
}

// Only known keys, right types, sane ranges: the panel is local, but nothing from the socket is trusted blindly.
const SETTING_RULES = {
  title: v => String(v).slice(0, 40), subtitle: v => String(v).slice(0, 60),
  voice: v => ['vi-VN-NamMinhNeural', 'vi-VN-HoaiMyNeural'].includes(v) ? v : settings.voice,
  pitch: v => clamp(v, -50, 50), rate: v => clamp(v, -50, 50), moBpm: v => clamp(v, 20, 120), chantEveryMin: v => clamp(v, 1, 60),
  likeMilestone: v => clamp(v, 0, 100000),
  music: Boolean, mo: Boolean, autoChant: Boolean, joinOnEnter: Boolean,
  seatMode: v => ['auto', '24', '36', '64', '100'].includes(String(v)) ? String(v) : 'auto',
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));
function applySettings(o){ for (const [k, fn] of Object.entries(SETTING_RULES)) if (k in o) settings[k] = fn(o[k]); }

/* ----------------------------------------------------------------- bots */
let botTimer = null;
const BOT_LINES = ['Nam mô A Di Đà Phật', 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật', 'Cầu cho gia đình bình an', 'Con xin thành tâm sám hối', 'nữ', 'nam', 'bà',
  'Nguyện cầu cha mẹ mạnh khỏe', 'Mô Phật, an lạc quá', 'Chúc mọi người một ngày bình an', 'sư', 'Cầu công việc hanh thông'];
function setBots(on, n, pace){
  clearInterval(botTimer); botTimer = null;
  if (on){
    n = clamp(n, 1, 64);
    for (let i = 0; i < n; i++) seat('bot_' + i, DEMO_NAMES[(i + 7) % DEMO_NAMES.length] + ' ·bot', { demo: true });
    const every = { slow: 4000, mid: 1800, fast: 700 }[pace] || 1800;
    botTimer = setInterval(() => {
      const ids = [...viewers.keys()].filter(id => id.startsWith('bot_')); if (!ids.length) return;
      const id = ids[Math.floor(Math.random() * ids.length)], v = viewers.get(id), r = Math.random();
      if (r < .62) onChat(id, v.name, BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]);
      else if (r < .9) onLike(id, 1 + Math.floor(Math.random() * 4));
      else if (r < .985) onGift(id, v.name, 'Hoa hồng', 1 + Math.floor(Math.random() * 3), 1);
      else onGift(id, v.name, 'Đèn hoa sen', 1, 99);
    }, every);
    addLog(`🤖 Bật ${n} bot, nhịp ${pace}`);
  } else {
    for (const id of [...viewers.keys()]) if (id.startsWith('bot_')) { viewers.delete(id); broadcast({ t:'leave', id }); }
    addLog('🤖 Tắt bot');
  }
  broadcast({ t:'bots', on }, 'control');
}

/* -------------------------------------------------------------- server */
// Security notes (this file is meant to be shared publicly):
//  • listens on 127.0.0.1 only; nothing is reachable from the LAN or internet unless HOST is changed on purpose
//  • Host header must be localhost/127.0.0.1 (blocks DNS-rebinding pages from talking to the server)
//  • WebSocket only accepts pages served by this server (Origin check), so other sites open in the
//    same browser cannot send control commands
//  • static files: only /assets and /live, no dot-files, no node_modules, no server source, no path escapes
//  • no TikTok password, cookie or session is ever used or stored; only public room events are read
const HOST = process.env.HOST || '127.0.0.1';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.mp3':'audio/mpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
const okHost = h => ALLOWED_HOSTS.has(String(h || '').toLowerCase());
const SEP = path.sep;
function resolveStatic(urlPath){
  let p = urlPath === '/' ? '/live/control.html' : urlPath;
  if (!/^\/(assets|live)\//.test(p)) return null;
  if (p.split('/').some(seg => seg.startsWith('.') || seg === 'node_modules')) return null;
  if (/\.(mjs|json|md|log)$/i.test(p) && !p.startsWith('/assets/')) return null;      // never serve server code / package files
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + SEP)) return null;
  return file;
}
const server = http.createServer((req, res) => {
  if (!okHost(req.headers.host)) { res.writeHead(421).end('wrong host'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  const file = resolveStatic(p);
  if (!file) { res.writeHead(404).end('not found'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': p.startsWith('/live/tts/') ? 'no-store' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  });
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024,
  verifyClient: ({ origin, req }) => {
    if (!okHost(req.headers.host)) return false;
    if (!origin) return true;                                   // OBS / non-browser clients send no Origin
    try { return okHost(new URL(origin).host); } catch { return false; }
  } });
function broadcast(msg, only){ const s = JSON.stringify(msg); for (const c of wss.clients) if (c.readyState === 1 && (!only || c.role === only)) c.send(s); }
wss.on('connection', (ws, req) => {
  ws.role = new URL(req.url, 'http://x').searchParams.get('role') === 'control' ? 'control' : 'overlay';
  ws.send(JSON.stringify(snapshot()));
  if (ws.role === 'control') ws.send(JSON.stringify({ t:'logs', lines: log }));
  ws.on('message', buf => {
    if (ws.role !== 'control') return;                          // overlays only listen
    try { const m = JSON.parse(buf); if (m && m.t === 'ctl') onControl(m); } catch (e) { addLog('Lệnh lỗi: ' + e.message); }
  });
});
server.listen(PORT, HOST, () => addLog(`Server chạy tại http://localhost:${PORT}  ·  Bảng điều khiển: http://localhost:${PORT}/live/control.html  ·  Overlay: http://localhost:${PORT}/live/overlay.html`));

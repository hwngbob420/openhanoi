// Khối âm thanh: SFX UI/gameplay, nhạc nền lofi, mưa, chuông gác chắn. API: window.__audio = {play, setRain, musicOn, resume}.
// Chỉ tạo AudioContext sau cú chạm/phím đầu tiên; mọi lỗi (bị chặn, không hỗ trợ) đều nuốt im lặng.
// World tự có WebAudio riêng cho SẤM (world.js: thunder) nên ta không làm sấm; ta lo mưa nền, chuông chắn tàu, nhạc, SFX.
import { bus } from '../core/bus.js'
import * as sfx from './sfx.js'
import { createAmbience } from './ambience.js'
import { createMusic } from './music.js'

const MUSIC_VOL = 0.28                                    // nhạc nền nhỏ để không lấn tiếng game
const LS = 'hanoi.musicOn'
let ctx = null, master = null, sfxBus = null, ambBus = null, amb = null, music = null, failed = false
let wantMusic = true, wantRain = 0, wantBell = false, sawWeather = false, sawBell = false, pollTimer = 0
try { const v = localStorage.getItem(LS); if (v === '0') wantMusic = false } catch (e) { /* bỏ qua */ }
const last = {}

function ensure() {
  if (ctx || failed) return !!ctx
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) { failed = true; return false }
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6; comp.attack.value = 0.005; comp.release.value = 0.2
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination)
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master)
    ambBus = ctx.createGain(); ambBus.gain.value = 1; ambBus.connect(master)
    amb = createAmbience(ctx, ambBus)
    music = createMusic(ctx, master)
    ctx.onstatechange = () => { if (ctx.state === 'running') applyState() }
    applyState()
    return true
  } catch (e) { ctx = null; failed = true; return false }
}
function applyState() {                                   // đưa trạng thái mong muốn xuống bộ máy (gọi khi ctx sẵn sàng/đang chạy)
  if (!ctx) return
  try {
    amb.setRain(wantRain); amb.bell(wantBell)
    if (wantMusic) music.start(MUSIC_VOL); else music.stop()
  } catch (e) { /* bỏ qua */ }
}
function resume() {
  if (!ensure()) return false
  try { if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {}) } catch (e) { /* bỏ qua */ }
  return true
}
function play(name, gain = 1) {
  if (!ctx || ctx.state !== 'running') return false
  const now = performance.now()
  if (now - (last[name] || 0) < 45) return false          // chống phát chồng khi nhiều khối cùng báo
  last[name] = now
  try { return sfx.play(ctx, sfxBus, name, gain) } catch (e) { return false }
}
function setRain(on) { wantRain = on === true ? 0.5 : on === false ? 0 : Math.max(0, Math.min(1, +on || 0)); if (ctx) try { amb.setRain(wantRain) } catch (e) { /* bỏ qua */ } }
function musicOn(on) {
  if (on === undefined) return wantMusic
  wantMusic = !!on
  try { localStorage.setItem(LS, wantMusic ? '1' : '0') } catch (e) { /* bỏ qua */ }
  if (ctx) try { wantMusic ? music.start(MUSIC_VOL) : music.stop() } catch (e) { /* bỏ qua */ }
  return wantMusic
}
function setBell(on, vol) { wantBell = !!on; if (ctx) try { amb.bell(wantBell, vol) } catch (e) { /* bỏ qua */ } }

export function init() {
  window.__audio = {
    play, setRain, musicOn, resume,
    isMusicOn: () => wantMusic,
    state: () => ({ ctx: ctx ? ctx.state : 'none', music: !!(music && music.playing), rain: amb ? amb.rain : 0, bell: !!(amb && amb.bellOn), failed }),
  }
  // cú chạm/phím đầu tiên mở khoá âm thanh (giữ lắng nghe tới khi ctx thực sự chạy, vì iOS có thể cần chạm lần nữa)
  const unlock = () => {
    resume()
    if (ctx && ctx.state === 'running') for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) removeEventListener(ev, unlock, true)
  }
  for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) addEventListener(ev, unlock, { capture: true, passive: true })
  // tiết kiệm pin: tab ẩn thì treo ctx, hiện lại thì chạy tiếp
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    try { document.hidden ? ctx.suspend() : ctx.resume() } catch (e) { /* bỏ qua */ }
  })

  bus.on('sfx', (d) => d && d.name && play(d.name))
  bus.on('weather', (d) => { sawWeather = true; setRain(d && d.storm ? 1 : d && d.rain ? 0.5 : 0) })
  bus.on('train:bell', (d) => { sawBell = true; setBell(d && d.on) })
  bus.on('money:earn', () => play('coin'))
  bus.on('minigame:start', () => play('pop'))
  bus.on('minigame:end', (d) => play(d && d.pay > 0 ? 'win' : 'lose'))

  // Dự phòng khi world chưa phát `weather`/`train:bell`: đọc trạng thái từ window.__world (chỉ đọc, 2 lần/giây). Tự tắt khi có sự kiện thật.
  pollTimer = setInterval(() => {
    const w = window.__world; if (!w || !w.sky) return
    if (!sawWeather) setRain(w.sky.storm > 0.6 ? 1 : w.sky.rain > 0.3 ? 0.5 : 0)
    if (!sawBell && w.crossings) { const on = w.crossings.some((c) => c.down); if (on !== wantBell) setBell(on, 0.45) }
    if (sawWeather && sawBell) { clearInterval(pollTimer); pollTimer = 0 }
  }, 500)
}

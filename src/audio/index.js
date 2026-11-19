// Khối âm thanh: SFX UI/gameplay, nhạc nền lofi, mưa, sấm, chuông gác chắn + âm không gian (tàu, chuông barie, âm khu vực).
// API: window.__audio = {play, playAt, has, setListener, debugSpatial, setRain, musicOn, resume, meter, mix}.
// Chỉ tạo AudioContext sau cú chạm/phím đầu tiên; mọi lỗi (bị chặn, không hỗ trợ) đều nuốt im lặng.
// ĐỢT 4: MỘT AudioContext, MỘT bus tổng (mixer.js): music/sfx/ambience -> limiter -> gain tổng -> loa. Sấm là sfx 'thunder'.
import { bus } from '../core/bus.js'
import * as sfx from './sfx.js'
import { createAmbience } from './ambience.js'
import { createMusic } from './music.js'
import * as sp from './spatial.js'
import { createMixer, createMeter } from './mixer.js'

const MUSIC_VOL = 0.28                                    // nhạc nền nhỏ để không lấn tiếng game
const LS = 'hanoi.musicOn'
let spat = null, spatTimer = 0, mixer = null, meter = null
let ctx = null, sfxBus = null, ambBus = null, amb = null, music = null, failed = false
let wantMusic = true, wantRain = 0, wantBell = false, sawWeather = false, sawBell = false, pollTimer = 0
try { const v = localStorage.getItem(LS); if (v === '0') wantMusic = false } catch (e) { /* bỏ qua */ }
const last = {}

function ensure() {
  if (ctx || failed) return !!ctx
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) { failed = true; return false }
    ctx = new AC()
    mixer = createMixer(ctx)                                // điểm duy nhất nối tới ctx.destination
    sfxBus = mixer.sfx; ambBus = mixer.amb
    try { meter = createMeter(ctx, mixer) } catch (e) { meter = null }
    amb = createAmbience(ctx, ambBus)
    music = createMusic(ctx, mixer.music)
    spat = sp.createSpatial(ctx, ambBus)
    ctx.onstatechange = () => { if (ctx.state === 'running') applyState() }
    applyState()
    return true
  } catch (e) { ctx = null; failed = true; return false }
}
function applyState() {                                   // đưa trạng thái mong muốn xuống bộ máy (gọi khi ctx sẵn sàng/đang chạy)
  if (!ctx) return
  try {
    amb.setRain(wantRain); amb.bell(wantBell, undefined, sp.bellSpatial)
    if (wantMusic) music.start(MUSIC_VOL); else music.stop()
  } catch (e) { /* bỏ qua */ }
}
function resume() {
  if (!ensure()) return false
  try { if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {}) } catch (e) { /* bỏ qua */ }
  return true
}
function playAt(name, gx, gy, opts = {}) {                 // phát có vị trí: nhỏ dần + lệch trái/phải theo khoảng cách tới người nghe
  if (!ctx || ctx.state !== 'running') return false
  const lis = sp.getListener()
  if (!lis || !Number.isFinite(gx) || !Number.isFinite(gy)) return play(name, opts.gain == null ? 1 : opts.gain)
  const r = sp.relative({ gx, gy }, lis, opts.r0, opts.r1)
  const g = r.gain * (opts.gain == null ? 1 : opts.gain)
  if (g < 0.01) return false                                // quá xa: không tạo node
  const now = performance.now(), key = name + '@'
  if (now - (last[key + name] || 0) < 45) return false
  last[key + name] = now
  try {
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    if (pn) { pn.pan.value = r.pan; pn.connect(sfxBus) }
    return sfx.play(ctx, pn || sfxBus, name, g)
  } catch (e) { return false }
}
function play(name, gain = 1, opts) {
  if (!ctx || ctx.state !== 'running') return false
  if (typeof gain === 'object' && gain) { opts = gain; gain = opts.gain == null ? 1 : opts.gain }
  const now = performance.now()
  if (now - (last[name] || 0) < 45) return false          // chống phát chồng khi nhiều khối cùng báo
  last[name] = now
  try { return sfx.play(ctx, sfxBus, name, gain, opts) } catch (e) { return false }
}
function setRain(on) { wantRain = on === true ? 0.5 : on === false ? 0 : Math.max(0, Math.min(1, +on || 0)); if (ctx) try { amb.setRain(wantRain) } catch (e) { /* bỏ qua */ } }
function musicOn(on) {
  if (on === undefined) return wantMusic
  wantMusic = !!on
  try { localStorage.setItem(LS, wantMusic ? '1' : '0') } catch (e) { /* bỏ qua */ }
  if (ctx) try { wantMusic ? music.start(MUSIC_VOL) : music.stop() } catch (e) { /* bỏ qua */ }
  return wantMusic
}
function setBell(on, vol) { wantBell = !!on; if (ctx) try { amb.bell(wantBell, vol, sp.bellSpatial) } catch (e) { /* bỏ qua */ } }

export function init() {
  window.__audio = {
    play, playAt, setRain, musicOn, resume,
    has: (name) => sfx.has(name),                         // không cần ctx: world hỏi trước cú chạm đầu tiên vẫn đúng
    // đồng hồ đầu ra tổng cho QA: meter() = đo tức thời; meter(true) bắt đầu theo dõi; meter(false) dừng & trả {peakDb, rmsDb, maxReductionDb}
    meter: (on) => { if (!meter) return null; if (on === true || on === false) return meter.track(on); return { ...meter.now(), track: meter.report() } },
    mix: (name, v) => { if (!mixer) return null; if (name) mixer.setGroup(name, v); return { ...mixer.groups(), reductionDb: +(+mixer.limiter.reduction).toFixed(2) } },
    setListener: (gx, gy) => sp.setListener(gx, gy),
    debugSpatial: () => { const d = spat ? spat.debug() : { ...sp.compute(), layers: [] }; return { train: d.train, bell: d.bell, zone: d.zone, listener: d.listener, layers: d.layers } },
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

  bus.on('sfx', (d) => {
    if (!d || !d.name) return
    if (d.name === 'thunder') return play('thunder', { gain: Number.isFinite(d.vol) ? Math.min(1.2, d.vol / 1.5) : 1, dist: d.dist, delay: d.delay })   // vol theo thang cũ của world (1.5 = sấm gần)
    if (Number.isFinite(d.gx) && Number.isFinite(d.gy)) playAt(d.name, d.gx, d.gy); else play(d.name)
  })
  bus.on('weather', (d) => { sawWeather = true; setRain(d && d.storm ? 1 : d && d.rain ? 0.5 : 0) })
  bus.on('train:bell', (d) => { sawBell = true; setBell(d && d.on) })
  bus.on('money:earn', () => play('coin'))
  bus.on('minigame:start', () => play('pop'))
  bus.on('minigame:end', (d) => play(d && d.pay > 0 ? 'win' : 'lose'))

  // vòng cập nhật không gian ~10 lần/giây (rẻ: vài phép tính; chỉ chạy khi ctx đang chạy và tab hiện)
  spatTimer = setInterval(() => { if (spat && ctx && ctx.state === 'running' && !document.hidden) try { spat.update() } catch (e) { /* bỏ qua */ } }, 100)

  // Dự phòng khi world chưa phát `weather`/`train:bell`: đọc trạng thái từ window.__world (chỉ đọc, 2 lần/giây). Tự tắt khi có sự kiện thật.
  pollTimer = setInterval(() => {
    const w = window.__world; if (!w || !w.sky) return
    if (!sawWeather) setRain(w.sky.storm > 0.6 ? 1 : w.sky.rain > 0.3 ? 0.5 : 0)
    if (!sawBell && w.crossings) { const on = w.crossings.some((c) => c.down); if (on !== wantBell) setBell(on, 0.45) }
    if (sawWeather && sawBell) { clearInterval(pollTimer); pollTimer = 0 }
  }, 500)
}

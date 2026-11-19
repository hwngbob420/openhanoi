// Các lớp âm thủ tục cho không khí không gian: đoàn tàu, hàng phở, gió hồ, ngõ sâu (radio cũ + chó sủa).
// Mỗi lớp = { start(), stop(), ... } do createLayer bọc: bật/tắt mượt bằng fadeTo; gain về 0 thật sự thì DỪNG node (không tốn CPU).
// Hàm thuần theo (ctx, out) nên dùng được với OfflineAudioContext để đo đỉnh.
import { zzfxG, SR, zzfxPlay } from './zzfx.js'

const TAU = Math.PI * 2
const norm = (d, peak) => { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m }
function mkBuf(ctx, secs) { const len = Math.round(ctx.sampleRate * secs); return { buf: ctx.createBuffer(1, len, ctx.sampleRate), len, sr: ctx.sampleRate } }
function loopSrc(ctx, buf, dest) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * buf.duration); if (dest) s.connect(dest); return s }
const cache = new WeakMap()
const memo = (ctx, key, fn) => { let m = cache.get(ctx); if (!m) cache.set(ctx, m = {}); return m[key] || (m[key] = fn()) }
// nhiễu lặp mượt (cross-fade đuôi vào đầu)
function noiseLoop(ctx, secs, lpK) {
  const { buf, len, sr } = mkBuf(ctx, secs), d = buf.getChannelData(0); let l = 0
  for (let i = 0; i < len; i++) { l += ((Math.random() * 2 - 1) - l) * lpK; d[i] = l }
  const f = Math.floor(sr * 0.4); for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[len - f + i] * (1 - a) }
  const out = ctx.createBuffer(1, len - f, sr); const o = out.getChannelData(0); for (let i = 0; i < o.length; i++) o[i] = d[i]
  norm(o, 0.8); return out
}

// Bọc một lớp: build(out) dựng node, trả {stop()}. fadeTo(target, secs) tự bật/tắt.
function createLayer(ctx, out, name, build, opts = {}) {
  const g = ctx.createGain(); g.gain.value = 0
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null
  if (pan) { g.connect(pan); pan.connect(out) } else g.connect(out)
  let live = null, target = 0, tok = 0, killT = 0
  const layer = {
    name, gainNode: g,
    get running() { return !!live },
    get target() { return target },
    get gain() { return g.gain.value },
    fadeTo(v, secs = 0.5) {
      v = Math.max(0, v); const t = ctx.currentTime
      if (v < 0.003) v = 0
      if (v === target && (v > 0 ? live : true)) return       // không đổi: giữ nguyên (kể cả hẹn giờ dừng node đang chờ)
      target = v
      if (v > 0 && !live) { try { live = build(g, pan) } catch (e) { live = null; return } }
      clearTimeout(killT); tok++
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t)
      if (secs > 0) g.gain.linearRampToValueAtTime(v, t + secs); else g.gain.setValueAtTime(v, t)
      if (v === 0 && live) {
        const my = tok
        const kill = () => { if (my === tok && live) { try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.value = 0; live.stop() } catch (e) { /* bỏ qua */ } live = null } }
        if (secs > 0 && !opts.offline) killT = setTimeout(kill, secs * 1000 + 80); else kill()
      }
    },
    setPan(p) { if (pan) pan.pan.setTargetAtTime(p, ctx.currentTime, 0.08) },
    get pan() { return pan ? pan.pan.value : 0 },
    setTone(f) { if (live && live.tone) live.tone(f) },
    kill() { clearTimeout(killT); tok++; if (live) { try { live.stop() } catch (e) { /* */ } live = null } g.gain.value = 0; target = 0 },
  }
  return layer
}

// ───────── đoàn tàu `loco` chạy: xình xịch + lách cách ray + ầm trầm ─────────
function trainBuffer(ctx) {
  return memo(ctx, 'train', () => {
    const per = 0.236, n = 10, { buf, len, sr } = mkBuf(ctx, per * n), d = buf.getChannelData(0), L = len / sr
    let lp = 0
    const f1 = Math.round(48 * L) / L, f2 = Math.round(71 * L) / L
    for (let i = 0; i < len; i++) {
      const t = i / sr, ph = t % per, beat = Math.floor(t / per) % 2 ? 0.72 : 1
      const w = Math.random() * 2 - 1; lp += (w - lp) * 0.22
      const env = Math.exp(-ph * 21) * (ph < 0.004 ? ph / 0.004 : 1)
      const tick = Math.exp(-((t % (per / 3)) * 380)) * w * 0.35
      d[i] = (lp * env * 1.3 + Math.sin(TAU * 62 * ph) * Math.exp(-ph * 13) * 0.5) * beat + tick + (Math.sin(TAU * f1 * t) * 0.12 + Math.sin(TAU * f2 * t) * 0.07)
    }
    norm(d, 0.8); return buf
  })
}
export function createTrainLayer(ctx, out, opts) {
  return createLayer(ctx, out, 'train', (g) => {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.connect(g)
    const s = loopSrc(ctx, trainBuffer(ctx), lp)
    return { stop() { try { s.stop() } catch (e) { /* */ } s.disconnect(); lp.disconnect() }, tone(gv) { lp.frequency.setTargetAtTime(700 + 3800 * gv, ctx.currentTime, 0.15) } }
  }, opts)
}

// ───────── hàng phở: nước dùng sôi lục bục + dao thớt lộc cộc ─────────
const CHOP = [0, 1, 2].map((k) => [1, 0.12, 170 + k * 28, 0, 0.012, 0.05, 4, 1, -4, 0, 0, 0, 0, 0.5, 0, 0, 0, 1, 0, 0, 1300])
const CLICK = [0.5, 0.1, 1500, 0, 0.003, 0.02, 4, 1, 0, 0, 0, 0, 0, 1]
let chopS = null
function chopSamples() {
  return chopS ||= CHOP.map((p) => { const a = zzfxG(...p), c = zzfxG(...CLICK), o = new Float32Array(Math.max(a.length, c.length)); for (let i = 0; i < a.length; i++) o[i] += a[i]; for (let i = 0; i < c.length; i++) o[i] += c[i]; norm(o, 0.6); return o })
}
export function createPhoLayer(ctx, out, opts) {
  return createLayer(ctx, out, 'pho', (g) => {
    const b = memo(ctx, 'broth', () => {
      const { buf, len, sr } = mkBuf(ctx, 4), d = buf.getChannelData(0); let l = 0, l2 = 0
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; l += (w - l) * 0.18; l2 += (w - l2) * 0.015; d[i] = (l - l2) * 0.25 }
      for (let k = 0; k < 26; k++) {                                         // bọt vỡ: nốt sin ngắn trượt lên
        const at = (Math.random() * (len - sr * 0.1)) | 0, f0 = 220 + Math.random() * 380, amp = 0.15 + Math.random() * 0.25, dur = (0.025 + Math.random() * 0.04) * sr
        for (let j = 0; j < dur; j++) d[at + j] += Math.sin(TAU * (f0 + j / sr * 1800) * j / sr) * amp * Math.exp(-j / dur * 4)
      }
      const f = Math.floor(sr * 0.2); for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[len - f + i] * (1 - a) }
      const o = ctx.createBuffer(1, len - f, sr), od = o.getChannelData(0); for (let i = 0; i < od.length; i++) od[i] = d[i]; norm(od, 0.8); return o
    })
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.5
    const bg = ctx.createGain(); bg.gain.value = 0.9; bp.connect(bg); bg.connect(g)
    const s = loopSrc(ctx, b, bp)
    let alive = true, tm = 0
    const burst = (n) => {
      if (!alive) return
      const smp = chopSamples()[(Math.random() * 3) | 0], src = zzfxPlay(ctx, g, smp, 0.8 + Math.random() * 0.2)
      src.playbackRate.value = 0.94 + Math.random() * 0.12
      if (n > 1) tm = setTimeout(() => burst(n - 1), 130 + Math.random() * 70)
      else tm = setTimeout(() => burst(2 + ((Math.random() * 4) | 0)), 900 + Math.random() * 1700)
    }
    if (!opts || !opts.offline) tm = setTimeout(() => burst(3), 250)
    return { stop() { alive = false; clearTimeout(tm); try { s.stop() } catch (e) { /* */ } s.disconnect(); bp.disconnect(); bg.disconnect() } }
  }, opts)
}

// ───────── Hồ Gươm: gió hồ + sóng vỗ nhẹ ─────────
export function createLakeLayer(ctx, out, opts) {
  return createLayer(ctx, out, 'lake', (g) => {
    const b = memo(ctx, 'wind', () => noiseLoop(ctx, 7, 0.2))
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7
    const wg = ctx.createGain(); wg.gain.value = 0.55; bp.connect(wg); wg.connect(g)
    const s = loopSrc(ctx, b, bp)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 0.35; lfo.connect(lg); lg.connect(wg.gain)       // gió thổi từng đợt
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.09; const lg2 = ctx.createGain(); lg2.gain.value = 180; lfo2.connect(lg2); lg2.connect(bp.frequency)
    lfo.start(); lfo2.start()
    const lap = ctx.createBiquadFilter(); lap.type = 'lowpass'; lap.frequency.value = 380                   // sóng vỗ bờ rất khẽ
    const lapG = ctx.createGain(); lapG.gain.value = 0.18; lap.connect(lapG); lapG.connect(g)
    const s2 = loopSrc(ctx, b, lap); s2.playbackRate.value = 0.6
    const lfo3 = ctx.createOscillator(); lfo3.frequency.value = 0.22; const lg3 = ctx.createGain(); lg3.gain.value = 0.16; lfo3.connect(lg3); lg3.connect(lapG.gain); lfo3.start()
    const all = [s, s2, lfo, lfo2, lfo3]
    return { stop() { for (const n of all) { try { n.stop() } catch (e) { /* */ } n.disconnect() } for (const n of [bp, wg, lg, lg2, lap, lapG, lg3]) n.disconnect() } }
  }, opts)
}

// ───────── ngõ sâu: radio cũ (giai điệu ngũ cung + nhiễu) và chó sủa khe khẽ, thưa ─────────
const hz = (n) => 440 * 2 ** ((n - 69) / 12)
function radioBuffer(ctx) {
  return memo(ctx, 'radio', () => {
    const secs = 12, { buf, len, sr } = mkBuf(ctx, secs), d = buf.getChannelData(0)
    // giai điệu chậm kiểu nhạc xưa: 9 nốt ngũ cung (C D E G A), mỗi nốt 1.3s
    const mel = [72, 74, 76, 79, 76, 74, 72, 69, 67]
    const nl = Math.floor(len / mel.length)
    mel.forEach((n, k) => {
      const s = zzfxG(1, 0, hz(n), 0.02, 0.5, 0.55, 1, 1, 0, 0, 0, 0, 0, 0, 0.03, 0, 0, 0.7, 0.05)
      for (let i = 0; i < s.length && k * nl + i < len; i++) d[k * nl + i] += s[i] * 0.55
    })
    let l = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; l += (w - l) * 0.5; d[i] += (w - l) * 0.09 + (Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.5 : 0) }   // xì xì + lách tách
    const f = Math.floor(sr * 0.1); for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[len - f + i] * (1 - a) }
    const o = ctx.createBuffer(1, len - f, sr), od = o.getChannelData(0); for (let i = 0; i < od.length; i++) od[i] = d[i]; norm(od, 0.8); return o
  })
}
const BARK = [[1, 0.08, 400, 0.005, 0.05, 0.07, 2, 1, -7, 0, 0, 0, 0, 0.12, 0, 0, 0, 0.9, 0, 0, 1700], [1, 0.08, 340, 0.005, 0.07, 0.1, 2, 1, -9, 0, 0, 0, 0, 0.12, 0, 0, 0, 0.9, 0, 0, 1500]]
let barkS = null
function barkSamples() { return barkS ||= (() => { const a = zzfxG(...BARK[0]), b = zzfxG(...BARK[1]), at = Math.round(0.19 * SR), o = new Float32Array(at + b.length); o.set(a); for (let i = 0; i < b.length; i++) o[at + i] += b[i]; norm(o, 0.6); return o })() }
export const barkPeak = () => { const s = barkSamples(); let m = 0; for (const v of s) m = Math.max(m, Math.abs(v)); return m }
export function createAlleyLayer(ctx, out, opts) {
  return createLayer(ctx, out, 'alley', (g) => {
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 380
    const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 3000; bp.Q.value = 1.1
    const rg = ctx.createGain(); rg.gain.value = 0.8; hp.connect(bp); bp.connect(rg); rg.connect(g)
    const s = loopSrc(ctx, radioBuffer(ctx), hp)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.37; const lg = ctx.createGain(); lg.gain.value = 22; lfo.connect(lg); lg.connect(s.detune); lfo.start()   // radio cũ chạy lệch tốc độ
    let alive = true, tm = 0
    const bark = () => {
      if (!alive) return
      const bg = ctx.createGain(); bg.gain.value = 0.3 + Math.random() * 0.15
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 1400                     // xa, bị tường ngõ nuốt bớt
      const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null
      if (pn) { pn.pan.value = Math.random() * 1.2 - 0.6; bg.connect(lpf); lpf.connect(pn); pn.connect(g) } else { bg.connect(lpf); lpf.connect(g) }
      zzfxPlay(ctx, bg, barkSamples(), 1).playbackRate.value = 0.9 + Math.random() * 0.2
      tm = setTimeout(bark, 12000 + Math.random() * 20000)
    }
    if (!opts || !opts.offline) tm = setTimeout(bark, 3000 + Math.random() * 6000)
    return { stop() { alive = false; clearTimeout(tm); for (const n of [s, lfo]) { try { n.stop() } catch (e) { /* */ } n.disconnect() } for (const n of [hp, bp, rg, lg]) n.disconnect() } }
  }, opts)
}
export const _forTest = { trainBuffer, radioBuffer, barkSamples, chopSamples }

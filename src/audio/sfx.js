// Hiệu ứng thủ tục ZzFX. Mỗi tiếng = danh sách "nốt" {at(giây), p:[tham số zzfx]} trộn vào một bộ đệm; đỉnh chuẩn hoá <= PEAK.
import { zzfxG, SR, zzfxPlay } from './zzfx.js'

export const PEAK = 0.7                                   // đỉnh tối đa mỗi tiếng (yêu cầu < 0.8)
const hz = (n) => 440 * 2 ** ((n - 69) / 12)              // số nốt MIDI -> Hz

// tham số zzfx: [vol, rand, freq, attack, sustain, release, shape, curve, slide, dSlide, jump, jumpT, repeat, noise, mod, crush, delay, susVol, decay, tremolo, filter]
const DEFS = {
  // ting: tiếng thông báo điện thoại "ting ting" (hai nốt chuông cao, vang ngắn)
  ting: { peak: 0.55, notes: [{ at: 0, p: [1, 0, hz(88), 0, 0.02, 0.35, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0.12, 0.5, 0.05] }, { at: 0.13, p: [1, 0, hz(93), 0, 0.02, 0.5, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0.14, 0.5, 0.06] }, { at: 0, p: [0.35, 0, hz(100), 0, 0.01, 0.2, 0, 1] }] },
  // coin: nhận tiền "keng" hai nốt nhảy quãng 5 đúng
  coin: { peak: 0.6, notes: [{ at: 0, p: [1, 0, hz(83), 0, 0.04, 0.1, 5, 0.5] }, { at: 0.07, p: [1, 0, hz(90), 0, 0.12, 0.28, 5, 0.5] }] },
  // pop: bóp bóng / bấm nhẹ, tần số trượt xuống rất nhanh
  pop: { peak: 0.6, notes: [{ at: 0, p: [1, 0.05, 520, 0, 0.01, 0.09, 0, 1, -18, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0] }] },
  // bell: một nhịp chuông gác chắn "leng" (kim loại, hài âm không nguyên)
  bell: { peak: 0.65, notes: [{ at: 0, p: [1, 0, 1180, 0, 0.03, 0.55, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.05] }, { at: 0, p: [0.6, 0, 1180 * 2.76, 0, 0.01, 0.3, 0, 1] }, { at: 0, p: [0.35, 0, 1180 * 5.4, 0, 0.005, 0.15, 0, 1] }] },
  // sizzle: chảo phở xèo xèo, nhiễu lọc cao ~0.9s kèm tiếng lách tách
  sizzle: { peak: 0.5, notes: [{ at: 0, p: [1, 0, 900, 0.03, 0.55, 0.35, 4, 1, 0, 0, 0, 0, 0, 1.4, 0, 0, 0, 0.8, 0, 0.6, 2500] }, { at: 0.2, p: [0.5, 0.5, 3200, 0, 0.004, 0.02, 4, 1, 0, 0, 0, 0, 0, 3] }, { at: 0.46, p: [0.5, 0.5, 2800, 0, 0.004, 0.02, 4, 1, 0, 0, 0, 0, 0, 3] }, { at: 0.71, p: [0.5, 0.5, 3600, 0, 0.004, 0.02, 4, 1, 0, 0, 0, 0, 0, 3] }] },
  // step: bước chân nhẹ trên gạch (cộp ngắn, có biến thể ngẫu nhiên)
  step: { peak: 0.3, variants: 4, notes: [{ at: 0, p: [1, 0.3, 160, 0, 0.006, 0.05, 4, 1, -2, 0, 0, 0, 0, 0.6, 0, 0, 0, 1, 0, 0, 900] }] },
  // error: "bụp bụp" trầm, hai nốt giảm
  error: { peak: 0.6, notes: [{ at: 0, p: [1, 0, 196, 0, 0.08, 0.08, 2, 1] }, { at: 0.13, p: [1, 0, 147, 0, 0.14, 0.14, 2, 1] }] },
  // win: arpeggio đi lên C-E-G-C (vui)
  win: { peak: 0.6, notes: [72, 76, 79, 84].map((n, k) => ({ at: k * 0.1, p: [1, 0, hz(n), 0, k === 3 ? 0.3 : 0.05, k === 3 ? 0.5 : 0.15, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0.02] })) },
  // lose: hai nốt đi xuống buồn, sau cùng trượt thấp
  lose: { peak: 0.6, notes: [{ at: 0, p: [1, 0, hz(67), 0, 0.12, 0.15, 1, 1] }, { at: 0.2, p: [1, 0, hz(62), 0, 0.12, 0.15, 1, 1] }, { at: 0.4, p: [1, 0, hz(55), 0.01, 0.2, 0.45, 1, 1, -1.5] }] },
  // click: bấm nút điện thoại, tạch khô ngắn
  click: { peak: 0.4, notes: [{ at: 0, p: [1, 0, 1900, 0, 0.004, 0.025, 2, 1, -30] }] },
  // chair: kéo ghế nhựa lê trên nền, nhiễu thấp trượt ~0.4s
  chair: { peak: 0.45, notes: [{ at: 0, p: [1, 0, 110, 0.03, 0.2, 0.15, 4, 1, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0.7, 0, 0, 700] }, { at: 0, p: [0.5, 0.2, 75, 0.02, 0.2, 0.15, 2, 1, 0.3] }] },
  // kinhcoong: chuông xích lô hai nhịp "kính — coong" (kính: ping cao ngắn; coong: nốt thấp hơn, hài âm kim loại, vang dài)
  kinhcoong: { peak: 0.6, notes: [{ at: 0, p: [1, 0, 2093, 0, 0.02, 0.16, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.02] }, { at: 0, p: [0.5, 0, 2093 * 2.76, 0, 0.005, 0.08, 0, 1] },
    { at: 0.17, p: [1, 0, 1397, 0, 0.1, 0.75, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.1] }, { at: 0.17, p: [0.55, 0, 1397 * 2.4, 0, 0.04, 0.4, 0, 1] }, { at: 0.17, p: [0.3, 0, 1397 * 3.9, 0, 0.01, 0.2, 0, 1] }] },
  // horn: còi xe máy "pin pin" hai tiếng (hai tần số chồng nhau)
  horn: { peak: 0.55, notes: [0, 0.2].flatMap((at) => [{ at, p: [1, 0, 440, 0.01, 0.11, 0.04, 5, 0.4] }, { at, p: [0.8, 0, 554, 0.01, 0.11, 0.04, 5, 0.4] }]) },
}
export const NAMES = Object.keys(DEFS)

// Tạo mẫu cho một tiếng (hàm thuần: dùng được cả offline). Trả {samples, peak, dur}.
export function render(name) {
  const d = DEFS[name]; if (!d) return null
  const parts = d.notes.map((n) => ({ at: Math.round(n.at * SR), s: zzfxG(...n.p) }))
  const len = Math.max(...parts.map((p) => p.at + p.s.length))
  const out = new Float32Array(len)
  for (const p of parts) for (let i = 0; i < p.s.length; i++) out[p.at + i] += p.s[i]
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[i]))
  const k = pk > 0 ? (d.peak || PEAK) / pk : 1
  for (let i = 0; i < len; i++) out[i] *= k
  for (let i = 0; i < 64 && i < len; i++) out[len - 1 - i] *= i / 64      // chốt đuôi về 0 để không "tách"
  return { samples: out, peak: pk * k, dur: len / SR }
}

// ───────── sấm (ĐỢT 4): dựng bằng node sống, mỗi tiếng một khác ─────────
// Gồm: tiếng NỔ/xé (nhiễu trắng lọc dải, chỉ rõ khi sấm gần) + ẦM VANG (nhiễu nâu qua lọc thấp trượt 600->50Hz, 3–5 đợt cuộn lên ngẫu nhiên, ~4–5 s).
// opts: dist 0 (sát) .. 1 (xa) — không có thì bốc ngẫu nhiên gần/xa; delay giây trễ sau tia chớp (mặc định dist*1.2); when thời điểm ctx; pan.
const noiseMemo = new WeakMap()
function noiseBufs(ctx) {
  let m = noiseMemo.get(ctx); if (m) return m
  const sr = ctx.sampleRate, n = Math.floor(sr * 3), br = ctx.createBuffer(1, n, sr), wh = ctx.createBuffer(1, Math.floor(sr * 0.6), sr)
  const d = br.getChannelData(0); let l = 0, mx = 0
  for (let i = 0; i < n; i++) { l = l * 0.985 + (Math.random() * 2 - 1) * 0.015; d[i] = l; mx = Math.max(mx, Math.abs(l)) }
  for (let i = 0; i < n; i++) d[i] *= 0.9 / mx
  const w = wh.getChannelData(0); for (let i = 0; i < w.length; i++) w[i] = (Math.random() * 2 - 1) * 0.9
  noiseMemo.set(ctx, m = { br, wh }); return m
}
// mức: sấm sát ~ -2 dBFS trước limiter (bench ĐỢT 4), nhỏ hơn sấm cũ của world ~5 dB RMS nhưng vẫn là tiếng to nhất game
export function thunder(ctx, dest, gain = 1, o = {}) {
  const R = Math.random
  const dist = Math.max(0, Math.min(1, Number.isFinite(o.dist) ? o.dist : (R() < 0.5 ? 0.1 + R() * 0.25 : 0.5 + R() * 0.45)))
  const t0 = (o.when || ctx.currentTime) + 0.03 + (Number.isFinite(o.delay) ? o.delay : dist * 1.2)
  const v = gain * 2.2 * (1 - dist * 0.5), { br, wh } = noiseBufs(ctx)
  const out = ctx.createGain(); out.gain.value = 1
  if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = Number.isFinite(o.pan) ? o.pan : (R() * 0.8 - 0.4); out.connect(pn); pn.connect(dest) } else out.connect(dest)
  const ramp = (p, a, t) => p.exponentialRampToValueAtTime(Math.max(0.0001, a), t)
  // ầm vang
  const len = 3.8 + R() * 1.4
  const src = ctx.createBufferSource(); src.buffer = br; src.loop = true; src.playbackRate.value = 0.85 + R() * 0.3
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8
  lp.frequency.setValueAtTime(620 - dist * 330, t0); ramp(lp.frequency, 50, t0 + len)
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0)
  ramp(g.gain, 0.95 * v, t0 + 0.06 + R() * 0.06)
  let t = 0.3 + R() * 0.2, a = 0.85
  for (let k = 0, nk = 3 + ((R() * 3) | 0); k < nk; k++) {                     // các đợt cuộn: lặng xuống rồi dâng lại, yếu dần
    ramp(g.gain, (0.18 + R() * 0.15) * a * v, t0 + t); t += 0.25 + R() * 0.35
    a *= 0.62 + R() * 0.2; ramp(g.gain, a * v, t0 + t); t += 0.2 + R() * 0.3
    if (t > len - 0.8) break
  }
  ramp(g.gain, 0.0001, t0 + len)
  src.connect(lp); lp.connect(g); g.connect(out); src.start(t0, R() * 1.5); src.stop(t0 + len + 0.05)
  // tiếng nổ/xé (gần mới nghe rõ)
  const cv = v * Math.pow(1 - dist, 1.6) * 0.55
  if (cv > 0.01) {
    const cs = ctx.createBufferSource(); cs.buffer = wh
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 + R() * 1400; bp.Q.value = 0.6
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.0001, t0); ramp(cg.gain, cv, t0 + 0.008)
    ramp(cg.gain, cv * 0.25, t0 + 0.09 + R() * 0.05); ramp(cg.gain, cv * 0.5, t0 + 0.16 + R() * 0.05); ramp(cg.gain, 0.0001, t0 + 0.55)
    cs.connect(bp); bp.connect(cg); cg.connect(out); cs.start(t0); cs.stop(t0 + 0.58)
  }
  return true
}
export const ALL = [...NAMES, 'thunder']
export const has = (name) => ALL.includes(name)

const cache = {}
export function play(ctx, dest, name, gain = 1, opts) {
  if (name === 'thunder') return ctx ? thunder(ctx, dest, gain, opts || {}) : false
  const d = DEFS[name]; if (!d || !ctx) return false
  const nv = d.variants || 1
  const c = (cache[name] ||= [])
  const k = nv > 1 ? (Math.random() * nv) | 0 : 0
  const r = (c[k] ||= render(name))
  zzfxPlay(ctx, dest, r.samples, gain)
  return true
}

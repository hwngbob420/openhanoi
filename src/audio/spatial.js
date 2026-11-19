// Âm thanh không gian: suy giảm + cân bằng trái/phải theo khoảng cách isometric từ nhân vật tới nguồn.
// Công thức (CONTRACT, ĐỢT 3): d = hypot(dx,dy) theo ô; gain = clamp(1-(d-r0)/(r1-r0),0,1)^1.5 (r0=2, r1=8);
// pan = clamp((dx-dy)/(r1*1.4),-1,1) với dx,dy = nguồn - người nghe (trục ngang màn hình isometric là gx-gy).
import { createTrainLayer, createPhoLayer, createLakeLayer, createAlleyLayer } from './zones.js'

export const R0 = 2, R1 = 8
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export function gainAt(d, r0 = R0, r1 = R1) { return Math.pow(clamp(1 - (d - r0) / (r1 - r0), 0, 1), 1.5) }
export function panAt(dx, dy, r1 = R1) { return clamp((dx - dy) / (r1 * 1.4), -1, 1) }
export function relative(src, lis, r0 = R0, r1 = R1) {
  const dx = src.gx - lis.gx, dy = src.gy - lis.gy, d = Math.hypot(dx, dy)
  return { d, gain: gainAt(d, r0, r1), pan: panAt(dx, dy, r1) }
}

// ── người nghe ──
let manual = null
export function setListener(gx, gy) { manual = (gx == null || gy == null) ? null : { gx: +gx, gy: +gy }; return manual }
export function getListener() {
  if (manual) return manual
  try { const p = window.__worldAPI?.getPlayer?.(); if (p && isFinite(p.gx) && isFinite(p.gy)) return { gx: p.gx, gy: p.gy } } catch (e) { /* bỏ qua */ }
  return null
}

// ── nguồn thật từ world (ưu tiên API đợt 3; chưa có thì dự phòng đọc window.__world, chỉ đọc) ──
const RAIL_GY = 81.5, BARRIER_GY = 79.5          // chỉ dùng cho dự phòng; API thật thay thế khi world có getTrain/getBarrier
export function getTrainSrc() {
  try {
    const A = window.__worldAPI
    if (A && A.getTrain) { const t = A.getTrain(); if (t) return { active: !!t.active, gx: t.gx, gy: t.gy, real: true } }
    const w = window.__world, tr = w && w.train
    if (tr) return { active: tr.state === 'run', gx: tr.head - tr.dir * 1.6, gy: RAIL_GY, real: false }
  } catch (e) { /* bỏ qua */ }
  return null
}
export function getBarrierSrc(lis) {
  try {
    const A = window.__worldAPI
    if (A && A.getBarrier) { const b = A.getBarrier(); if (b) return { down: !!b.down, gx: b.gx, gy: b.gy, real: true } }
    const w = window.__world
    if (w && w.crossings) {
      let best = null
      for (const c of w.crossings) { if (!c.down) continue; const s = { down: true, gx: c.x0 + 1.5, gy: BARRIER_GY, real: false }; if (!best || (lis && Math.hypot(s.gx - lis.gx, s.gy - lis.gy) < Math.hypot(best.gx - lis.gx, best.gy - lis.gy))) best = s }
      return best || { down: false, gx: 0, gy: BARRIER_GY, real: false }
    }
  } catch (e) { /* bỏ qua */ }
  return null
}
export function getZone(lis) {
  try { const z = window.__worldAPI?.getZoneAt?.(lis.gx, lis.gy); return typeof z === 'string' ? z : null } catch (e) { return null }
}

// ── tính toán thuần (dùng cho cả debug lẫn áp dụng) ──
export function compute() {
  const lis = getListener(), out = { listener: lis, train: { active: false, gain: 0, pan: 0, d: null }, bell: { on: false, gain: 0, pan: 0, d: null }, zone: null }
  if (!lis) return out
  const t = getTrainSrc()
  if (t) { const r = relative(t, lis); out.train = { active: t.active, gain: t.active ? r.gain : 0, pan: r.pan, d: r.d, real: t.real } }
  const b = getBarrierSrc(lis)
  if (b) { const r = relative(b, lis); out.bell = { on: b.down, gain: b.down ? r.gain : 0, pan: r.pan, d: r.d, real: b.real } }
  out.zone = getZone(lis)
  return out
}
// Cho chuông gác chắn: {gain,pan} hoặc null nếu không biết vị trí (khi đó chuông phát như cũ, không không gian).
export function bellSpatial() {
  const lis = getListener(); if (!lis) return null
  const b = getBarrierSrc(lis); if (!b) return null
  const r = relative(b, lis); return { gain: r.gain, pan: r.pan }
}

// ── bộ máy lớp âm (gắn vào ctx) ──
const ZONE_GAIN = { pho: 0.5, lake: 0.42, alley: 0.45 }
const TRAIN_GAIN = 0.55
export function createSpatial(ctx, out, opts) {
  const layers = {
    train: createTrainLayer(ctx, out, opts), pho: createPhoLayer(ctx, out, opts),
    lake: createLakeLayer(ctx, out, opts), alley: createAlleyLayer(ctx, out, opts),
  }
  let last = null
  function update() {
    const s = compute(); last = s
    const tg = s.train.active ? s.train.gain * TRAIN_GAIN : 0
    layers.train.fadeTo(tg, 0.25)
    if (tg > 0) { layers.train.setPan(s.train.pan); layers.train.setTone(s.train.gain) }
    for (const z of ['pho', 'lake', 'alley']) layers[z].fadeTo(s.zone === z ? ZONE_GAIN[z] : 0, 0.5)      // crossfade 0.5s
    return s
  }
  function debug() {
    const s = last ? compute() : compute()
    return { ...s, layers: Object.values(layers).map((l) => ({ name: l.name, target: +l.target.toFixed(4), gain: +l.gain.toFixed(4), pan: +l.pan.toFixed(3), running: l.running })) }
  }
  function stopAll() { for (const l of Object.values(layers)) l.kill() }
  return { layers, update, debug, stopAll }
}

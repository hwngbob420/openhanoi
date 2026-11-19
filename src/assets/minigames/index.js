// Bộ sprite mini-game (art). Danh sách tên: README.md cùng thư mục. Ảnh nằm trong mg-bundle.js (sinh bởi tools/make_minigames.mjs).
//   import { getMG, getMGFrames, drawMG, MG_META, mgReady } from '../../assets/minigames/index.js'
//   getMG(name)            -> canvas (sprite 1 khung) | [canvas…] (nhiều khung)
//   getMG(name, outfit)    -> như trên, đã đổi màu theo trang phục người chơi (chỉ sprite có recolor:'outfit'; outfit = env.outfit {hair,top,pants} mã màu)
//   getMGFrames(name, outfit?) -> luôn trả mảng khung
//   drawMG(ctx, name, x, y, {t, frame, outfit, flip}) -> vẽ đặt điểm NEO (anchor) của sprite vào (x,y); t (giây) tự chọn khung theo fps
//   MG_META[name] = {w,h,frames,fps,anchor:[x,y],group,desc,replaces,recolor}
// Canvas được tạo NGAY (đúng cỡ, rỗng) và tự vẽ khi ảnh giải mã xong (~vài chục ms) -> gọi lúc nào cũng an toàn. mgReady = Promise.
// Không cần init(): tự nạp ở lần gọi đầu (hoặc khi import, nếu có document).
import BUNDLE from './mg-bundle.js'

export const MG_META = BUNDLE.meta
const FR = {}                    // name -> [canvas]
const OUT = new Map()            // name|outfit -> [canvas] đã đổi màu
let started = false, loaded = false, readyRes
export const mgReady = new Promise((r) => { readyRes = r })
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }

function start() {
  if (started || typeof document === 'undefined') return
  started = true
  const names = Object.keys(MG_META); let left = names.length
  const done = () => { if (--left <= 0) { loaded = true; OUT.clear(); readyRes(true) } }
  for (const name of names) {
    const m = MG_META[name]
    FR[name] = Array.from({ length: m.frames }, () => mk(m.w, m.h))
    const im = new Image()
    im.onload = () => { FR[name].forEach((c, i) => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, i * m.w, 0, m.w, m.h, 0, 0, m.w, m.h) }); done() }
    im.onerror = done
    im.src = BUNDLE.png[name]
  }
}

// ---- đổi màu theo trang phục: màu khoá giống NPC thế giới ----
const KEY = { top: ['#3a8f8a', '#2a6a6c', '#6cc1b0'], pants: ['#3d4c7a', '#2b3558'], hair: ['#2b2230', '#443449'] }
const h2 = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const INK = h2('#1c1822'), CREAM = h2('#fbf6e8'), TEALC = h2('#2f7080')
const shade = (c) => mixc(mixc(c, INK, 0.28), TEALC, 0.22)
function recolorFrames(name, outfit) {
  const key = name + '|' + [outfit.top, outfit.pants, outfit.hair].join(',')
  if (OUT.has(key)) return OUT.get(key)
  const M = new Map(), put = (from, to) => { const f = h2(from); M.set((f[0] << 16) | (f[1] << 8) | f[2], to) }
  if (outfit.top) { const t = h2(outfit.top); put(KEY.top[0], t); put(KEY.top[1], shade(t)); put(KEY.top[2], mixc(t, CREAM, 0.3)) }
  if (outfit.pants) { const p = h2(outfit.pants); put(KEY.pants[0], p); put(KEY.pants[1], shade(p)) }
  if (outfit.hair) { const h = h2(outfit.hair); put(KEY.hair[0], h); put(KEY.hair[1], mixc(h, CREAM, 0.15)) }
  const out = FR[name].map((src) => {
    const c = mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data
    for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const n = M.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]); if (n) { a[i] = n[0]; a[i + 1] = n[1]; a[i + 2] = n[2] } }
    g.putImageData(d, 0, 0); return c
  })
  if (loaded) OUT.set(key, out)                    // chưa nạp xong: không lưu (lần gọi sau đổi màu lại trên ảnh thật)
  return out
}

export function getMGFrames(name, outfit) {
  start()
  const m = MG_META[name]; if (!m) { console.warn('[minigames] không có sprite', name); return [] }
  if (outfit && m.recolor === 'outfit') return recolorFrames(name, outfit)
  return FR[name] || []
}
export function getMG(name, outfit) { const f = getMGFrames(name, outfit); return MG_META[name] && MG_META[name].frames === 1 ? f[0] : f }
export function drawMG(ctx, name, x, y, o = {}) {
  const m = MG_META[name]; if (!m) return
  const fr = getMGFrames(name, o.outfit); if (!fr.length) return
  const i = o.frame != null ? ((o.frame % fr.length) + fr.length) % fr.length : m.fps && o.t != null ? Math.floor(o.t * m.fps) % fr.length : 0
  const [ax, ay] = m.anchor
  ctx.imageSmoothingEnabled = false
  if (o.flip) { ctx.save(); ctx.translate(Math.round(x), Math.round(y - ay)); ctx.scale(-1, 1); ctx.drawImage(fr[i], -ax, 0); ctx.restore() }
  else ctx.drawImage(fr[i], Math.round(x - ax), Math.round(y - ay))
}
export const listMG = () => Object.keys(MG_META)
export function init() { start(); if (typeof window !== 'undefined') window.__mg = { getMG, getMGFrames, drawMG, MG_META, listMG, ready: mgReady } }
init()

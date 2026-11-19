// Hình vẽ pixel dùng chung cho các mini-game (canvas logic 320x180, phóng to bằng CSS pixelated).
// Đợt 4: các game vẽ bằng sprite pixel của src/assets/minigames (drawMG đặt điểm NEO của sprite vào (x,y)); các hàm khối phẳng dưới đây
// chỉ còn dùng cho hiệu ứng nhỏ (bong bóng gọi món, thanh, tia sáng).
export { drawMG, getMGFrames, MG_META } from '../../assets/minigames/index.js'
import { getMGFrames as _frames, MG_META as _meta } from '../../assets/minigames/index.js'
// viền sáng 1px quanh sprite (làm nổi người bị va chạm): vẽ bóng đặc màu col lệch 4 hướng rồi tới sprite
const _sil = new Map()
export function drawMGOutlined(g, name, x, y, o = {}, col = '#ffffff') {
  const m = _meta[name]; if (!m) return
  const fr = _frames(name); if (!fr.length) return
  const i = o.frame != null ? ((o.frame % fr.length) + fr.length) % fr.length : m.fps && o.t != null ? Math.floor(o.t * m.fps) % fr.length : 0
  let s = _sil.get(m.w + 'x' + m.h)                    // một canvas tạm cho mỗi cỡ, vẽ lại mỗi lần (chỉ dùng cho 1 sprite/khung)
  if (!s) { s = document.createElement('canvas'); s.width = m.w; s.height = m.h; _sil.set(m.w + 'x' + m.h, s) }
  const c = s.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, m.w, m.h); c.drawImage(fr[i], 0, 0)
  c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, m.w, m.h); c.globalCompositeOperation = 'source-over'
  const dx = Math.round(x - m.anchor[0]), dy = Math.round(y - m.anchor[1])
  g.imageSmoothingEnabled = false
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(s, dx + ox, dy + oy)
  g.drawImage(fr[i], dx, dy)
}
export const W = 320, H = 180
export const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const rnd = (a, b) => a + Math.random() * (b - a)
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function shadow(g, x, y, w = 10) { R(g, x - w / 2, y - 1, w, 2, 'rgba(0,0,0,.28)') }

// người: (x,y) = giữa hai bàn chân. pc = {hair, top, pants} (màu). dir: 1 phải, -1 trái. step: pha chân.
export function person(g, x, y, pc, o = {}) {
  const { step = 0, dir = 1, back = false, skin = '#f0c49a', arms = 0 } = o
  shadow(g, x, y, 10)
  const s = Math.sin(step * 6) > 0 ? 1 : -1
  R(g, x - 3, y - 5 + (s > 0 ? 0 : 1), 3, 5 - (s > 0 ? 0 : 1), pc.pants)
  R(g, x, y - 5 + (s > 0 ? 1 : 0), 3, 5 - (s > 0 ? 1 : 0), pc.pants)
  R(g, x - 3, y - 10, 6, 6, pc.top)
  R(g, x - 4 + (arms ? dir * 2 : 0), y - 9 - arms * 2, 1, 4, skin); R(g, x + 3 + (arms ? dir * 2 : 0), y - 9 - arms * 2, 1, 4, skin)
  R(g, x - 3, y - 15, 6, 5, skin)
  R(g, x - 3, y - 15, 6, back ? 5 : 2, pc.hair)
  if (!back) { R(g, x - 3, y - 13, 1, 2, pc.hair); R(g, x + 2, y - 13, 1, 2, pc.hair); R(g, x - 2 + (dir > 0 ? 1 : 0), y - 12, 1, 1, '#2a2118'); R(g, x + 1 + (dir > 0 ? 1 : 0) - 1, y - 12, 1, 1, '#2a2118') }
}
// khách ngồi/đứng với màu ngẫu nhiên
export function npc(g, x, y, seed, o = {}) {
  const hairs = ['#2b2230', '#5a3a28', '#8a8a90', '#2b2230', '#7a2f28'], tops = ['#d9a441', '#4a8f7a', '#c25a6a', '#6a7fc0', '#e8e0cc', '#8a5ac0']
  person(g, x, y, { hair: hairs[seed % hairs.length], top: tops[(seed * 7) % tops.length], pants: seed % 2 ? '#3d4c7a' : '#4a4a52' }, { skin: seed % 3 ? '#f0c49a' : '#d9a67a', ...o })
}

// ─── món ăn (icon 14x10, (x,y) = giữa đáy) ───
export function icon(g, kind, x, y) {
  if (kind === 'pho') { R(g, x - 7, y - 6, 14, 5, '#f3efe6'); R(g, x - 6, y - 7, 12, 2, '#d8a54a'); R(g, x - 5, y - 8, 4, 1, '#6aa84f'); R(g, x + 1, y - 8, 4, 1, '#c2503a'); R(g, x - 4, y - 1, 8, 1, '#c9c3b4'); R(g, x - 2, y - 11, 1, 3, 'rgba(255,255,255,.7)'); R(g, x + 2, y - 12, 1, 3, 'rgba(255,255,255,.7)') }
  else if (kind === 'quay') { R(g, x - 6, y - 6, 3, 6, '#d99a3a'); R(g, x - 1, y - 7, 3, 7, '#e3a948'); R(g, x + 4, y - 6, 3, 6, '#d99a3a'); R(g, x - 6, y - 6, 3, 1, '#f0c26a'); R(g, x - 1, y - 7, 3, 1, '#f0c26a') }
  else if (kind === 'tra') { R(g, x - 4, y - 8, 8, 8, 'rgba(230,240,220,.95)'); R(g, x - 3, y - 6, 6, 5, '#d9b443'); R(g, x - 3, y - 8, 6, 1, '#e9f7e0'); R(g, x + 4, y - 6, 2, 3, '#e9f7e0') }
  else if (kind === 'bm') { R(g, x - 7, y - 6, 14, 5, '#d49a4a'); R(g, x - 6, y - 7, 12, 2, '#e8b866'); R(g, x - 5, y - 4, 10, 1, '#6aa84f'); R(g, x - 5, y - 3, 10, 1, '#c2503a'); R(g, x - 6, y - 1, 12, 1, '#a8763a') }
  else if (kind === 'bmtrung') { R(g, x - 7, y - 6, 14, 5, '#d49a4a'); R(g, x - 6, y - 7, 12, 2, '#e8b866'); R(g, x - 4, y - 5, 8, 3, '#f7f3e8'); R(g, x - 1, y - 5, 3, 2, '#f0b429'); R(g, x - 6, y - 1, 12, 1, '#a8763a') }
  else if (kind === 'mia') { R(g, x - 4, y - 9, 8, 9, 'rgba(230,240,220,.95)'); R(g, x - 3, y - 7, 6, 6, '#b8d86a'); R(g, x - 3, y - 9, 6, 1, '#e9f7e0'); R(g, x - 1, y - 12, 1, 4, '#4a8f3a') }
}

export function car(g, x, y, dir, col, o = {}) {      // 24x11, (x,y) = giữa đáy
  const w = 24; const x0 = x - w / 2
  shadow(g, x, y, 24)
  R(g, x0, y - 8, w, 7, col); R(g, x0 + 5, y - 11, 13, 4, col); R(g, x0 + 6, y - 10, 5, 3, '#bfe3f2'); R(g, x0 + 12, y - 10, 5, 3, '#bfe3f2')
  R(g, x0 + 2, y - 2, 5, 3, '#222'); R(g, x0 + w - 7, y - 2, 5, 3, '#222')
  R(g, dir > 0 ? x0 + w - 2 : x0, y - 6, 2, 2, '#ffe9a0'); R(g, dir > 0 ? x0 : x0 + w - 2, y - 6, 2, 2, '#c0392b')
  if (o.stripe) R(g, x0, y - 5, w, 1, o.stripe)
}
export function scooter(g, x, y, dir, col, pc) {       // xe máy 16x14
  shadow(g, x, y, 16)
  R(g, x - 8, y - 3, 4, 3, '#222'); R(g, x + 4, y - 3, 4, 3, '#222')
  R(g, x - 6, y - 6, 12, 3, col); R(g, x + (dir > 0 ? 3 : -5), y - 9, 2, 4, '#444')
  const p = pc || { hair: '#2b2230', top: '#c0392b', pants: '#33384a' }
  R(g, x - 2, y - 13, 4, 6, p.top); R(g, x - 2, y - 17, 4, 4, '#f0c49a'); R(g, x - 2, y - 17, 4, 2, p.hair)
}
export function chair(g, x, y, col = '#d34a3a') {      // ghế nhựa 8x9
  R(g, x - 3, y - 9, 6, 4, col); R(g, x - 3, y - 5, 6, 2, col); R(g, x - 3, y - 3, 1, 3, '#8c2a20'); R(g, x + 2, y - 3, 1, 3, '#8c2a20')
}
export function tree(g, x, y, s = 1, o = {}) {
  R(g, x - 1, y - 14 * s, 2, 14 * s, '#5a3d22')
  const c1 = o.c1 || '#4f9a4a', c2 = o.c2 || '#6bb85a'
  R(g, x - 8 * s, y - 24 * s, 16 * s, 12 * s, c1); R(g, x - 6 * s, y - 28 * s, 12 * s, 6 * s, c2); R(g, x - 10 * s, y - 20 * s, 4 * s, 6 * s, c1); R(g, x + 6 * s, y - 20 * s, 4 * s, 6 * s, c1)
}
export function willow(g, x, y, t = 0) {
  R(g, x - 1, y - 24, 3, 24, '#5a3d22'); R(g, x - 9, y - 30, 19, 7, '#5f9a4a')
  for (let i = -8; i <= 8; i += 3) { const l = 10 + ((i * 7) & 7); R(g, x + i + Math.round(Math.sin(t * 1.6 + i) * 0.6), y - 24, 1, l, '#79b35a') }
}
// ─── chữ pixel 3x5 có dấu tiếng Việt (cùng bộ chữ biển hiệu của sprite) — vẽ từng điểm, không nhoè ───
// (x,y) = góc trên-trái thân chữ; dấu thanh nằm 2 hàng phía trên, dấu nặng 1 hàng dưới -> dòng cách nhau >= 8px.
const FONT = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.', E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..',
  G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#', I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..', Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#',
  S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.', U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###', 'Đ': '##.|###|#.#|#.#|##.',
  0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.', 4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.',
  6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.', 8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.', '-': '...|...|###|...|...', '.': '...|...|...|...|.#.', ' ': '...|...|...|...|...',
}
function clusters(str) {
  const out = []
  for (const ch of String(str).normalize('NFD')) { if (/[̀-ͯ]/.test(ch)) { if (out.length) out[out.length - 1].m.push(ch) } else out.push({ c: ch.toUpperCase(), m: [] }) }
  return out
}
export const pxTextW = (str) => Math.max(0, clusters(str).length * 4 - 1)
export function pxText(g, x, y, str, col) {
  g.fillStyle = col; x = Math.round(x); y = Math.round(y)
  for (const cl of clusters(str)) {
    const rows = (FONT[cl.c] || FONT[' ']).split('|'), px = (k, r) => g.fillRect(x + k, y + r, 1, 1)
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (rows[r][k] === '#') px(k, r)
    for (const m of cl.m) {
      if (m === '̂') { px(0, -1); px(2, -1) } else if (m === '̆') { px(0, -1); px(1, -1); px(2, -1) } else if (m === '̛') px(3, 1)
      else if (m === '́') px(2, -2); else if (m === '̀') px(0, -2); else if (m === '̉') px(1, -2); else if (m === '̃') { px(0, -2); px(2, -2) } else if (m === '̣') px(1, 5)
    }
    x += 4
  }
}

export function bubble(g, x, y, w, h, fill = '#fffaf0') {
  R(g, x - w / 2 + 1, y - h, w - 2, h, '#2a2118'); R(g, x - w / 2, y - h + 1, w, h - 2, '#2a2118')
  R(g, x - w / 2 + 2, y - h + 1, w - 4, h - 2, fill); R(g, x - w / 2 + 1, y - h + 2, w - 2, h - 4, fill)
  R(g, x - 2, y, 4, 1, '#2a2118'); R(g, x - 1, y + 1, 2, 1, '#2a2118'); R(g, x - 1, y - 1, 2, 1, fill)
}
export function bar(g, x, y, w, frac, col = '#6bd06b', bg = '#2a2118') {
  R(g, x, y, w, 3, bg); R(g, x + 1, y + 1, Math.max(0, (w - 2) * clamp(frac, 0, 1)), 1, col)
}
export function burst(g, x, y, t, col = '#ffe14a') {     // vài hạt sáng nổ ra, t 0..1
  const n = 6
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + 0.5, d = 3 + t * 9; R(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 2, 2, col) }
}

// Khối nhân vật (paper-doll). Hợp đồng: src/core/CONTRACT.md  ->  window.__characters
// Lớp PNG nằm trong layers-bundle.js (sinh bởi tools/make_characters.mjs). Ghép lúc chạy bằng canvas:
//   thân -> quần -> giày -> áo -> tóc, rồi viền 1px tối + bóng => canvas 16x28.
import { bus } from '../../core/bus.js'
import BUNDLE from './layers-bundle.js'

const OUTLINE = [28, 26, 31]
const SHADOW = 'rgba(8,24,30,0.30)'

export const OUTFIT_OPTIONS = {
  hair: [
    { id: 'den', name: 'Tóc đen', color: '#2b2230', price: 0 },
    { id: 'nau', name: 'Nhuộm nâu hạt dẻ', color: '#6e3d25', price: 80000 },
    { id: 'camdo', name: 'Nhuộm đỏ cam', color: '#d5581f', price: 150000 },
    { id: 'khoi', name: 'Nhuộm xanh khói', color: '#6f909c', price: 120000 },
  ],
  top: [
    { id: 'tee', name: 'Áo phông đỏ gạch', color: '#b8503a', price: 0 },
    { id: 'somi', name: 'Sơ mi trắng', color: '#ece6d6', price: 180000 },
    { id: 'hoodie', name: 'Hoodie xanh', color: '#3f6fb0', price: 320000 },
    { id: 'polo', name: 'Áo polo xanh ngọc', color: '#3a8f8a', price: 220000 },
  ],
  pants: [
    { id: 'jean', name: 'Quần jean xanh', color: '#3d4c7a', price: 0 },
    { id: 'tay', name: 'Quần tây đen', color: '#363a42', price: 200000 },
    { id: 'short', name: 'Quần short kaki', color: '#b99d68', price: 120000 },
  ],
}

const DIRS3 = ['down', 'up', 'right']
const images = {}        // tên lớp -> HTMLImageElement đã decode
let pending = 0, ready = false
const cache = new Map()  // khoá trang phục -> sprites

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const clamp = (n, len) => Math.max(0, Math.min(len - 1, n | 0))
// outfit có thể là chỉ số (State.outfit = {hair:0, top:0, pants:0}) hoặc id chuỗi
function norm(o) {
  o = o || {}
  const pick = (kind) => {
    const list = OUTFIT_OPTIONS[kind], v = o[kind]
    if (typeof v === 'string') { const i = list.findIndex((x) => x.id === v); return i < 0 ? 0 : i }
    return clamp(Number.isFinite(+v) ? +v : 0, list.length)
  }
  return { hair: pick('hair'), top: pick('top'), pants: pick('pants') }
}
const keyOf = (n) => `${n.hair}.${n.top}.${n.pants}`

function loadAll() {
  for (const name of Object.keys(BUNDLE.layers)) {
    const im = new Image()
    pending++
    const done = () => {
      if (--pending > 0) return
      ready = true; cache.clear()
      // ảnh đã decode xong: báo thế giới / UI dựng lại sprite
      try { bus.emit('outfit:changed', { outfit: window.__state?.outfit, reason: 'characters:ready' }) } catch (e) { /* bus lỗi không làm sập */ }
    }
    im.onload = done; im.onerror = done
    im.src = BUNDLE.layers[name]
    images[name] = im
  }
}

// viền 1px + bóng. Đầu vào: canvas 16x28 đã vẽ các lớp.
function finish(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height
  const d = x.getImageData(0, 0, W, H), a = d.data, o = new Uint8ClampedArray(a)
  const solid = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && a[(Y * W + X) * 4 + 3] > 0
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    if (!solid(X, Y) && (solid(X + 1, Y) || solid(X - 1, Y) || solid(X, Y + 1) || solid(X, Y - 1))) {
      const i = (Y * W + X) * 4; o[i] = OUTLINE[0]; o[i + 1] = OUTLINE[1]; o[i + 2] = OUTLINE[2]; o[i + 3] = 255
    }
  }
  x.putImageData(new ImageData(o, W, H), 0, 0)
  x.globalCompositeOperation = 'destination-over'
  x.fillStyle = SHADOW; x.fillRect(4, H - 3, W - 8, 1); x.fillRect(2, H - 2, W - 4, 1); x.fillRect(3, H - 1, W - 6, 1)
  x.globalCompositeOperation = 'source-over'
  return c
}
const flip = (c) => { const m = mk(c.width, c.height), x = m.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return m }

function layerNames(n, dir, f) {
  return [
    `ch_body_0_${dir}_${f}`, `ch_pants_${n.pants}_${dir}_${f}`, `ch_shoes_0_${dir}_${f}`,
    `ch_top_${n.top}_${dir}_${f}`, `ch_hair_${n.hair}_${dir}_${f}`,
  ]
}
function compose(n, dir, f) {
  const c = mk(16, 28), x = c.getContext('2d')
  x.imageSmoothingEnabled = false
  for (const name of layerNames(n, dir, f)) { const im = images[name]; if (im && im.complete && im.naturalWidth) x.drawImage(im, 1, 1) }
  return finish(c)
}
// sprite tạm khi ảnh chưa decode: bóng người đơn giản cùng cỡ, đủ màu trang phục
function temp(n, dir, f) {
  const c = mk(16, 28), x = c.getContext('2d')
  const R = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h) }
  const bob = f === 1 || f === 3 ? 1 : 0
  R(5, 21, 3, 5, OUTFIT_OPTIONS.pants[n.pants].color); R(9, 21, 3, 5, OUTFIT_OPTIONS.pants[n.pants].color)
  R(3, 12, 10, 9, OUTFIT_OPTIONS.top[n.top].color)
  R(2, 1 + bob, 12, 11, '#f0c49a'); R(2, 1 + bob, 12, dir === 'up' ? 10 : 4, OUTFIT_OPTIONS.hair[n.hair].color)
  return finish(c)
}

export function getSprites(outfit) {
  const n = norm(outfit), key = keyOf(n)
  if (cache.has(key)) return cache.get(key)
  const S = { up: [], down: [], left: [], right: [] }
  for (const dir of DIRS3) for (let f = 0; f < 4; f++) S[dir][f] = ready ? compose(n, dir, f) : temp(n, dir, f)
  for (let f = 0; f < 4; f++) S.left[f] = flip(S.right[f])
  if (ready) cache.set(key, S)
  return S
}

// ảnh xem trước cho shop: nhân vật đứng nhìn thẳng, phóng `scale` lần (pixel nét)
export function renderPortrait(outfit, scale = 4) {
  const s = getSprites(outfit).down[0], k = Math.max(1, scale | 0)
  const c = mk(s.width * k, s.height * k), x = c.getContext('2d')
  x.imageSmoothingEnabled = false
  x.drawImage(s, 0, 0, c.width, c.height)
  return c
}

// ---------- người ngồi xe máy (xem seated.js) ----------
import { getSeatedSprites as seated } from './seated.js'
export function getSeatedSprites(outfit) { return seated(outfit, { norm, OUTFIT_OPTIONS, images, ready: () => ready, mk }) }

// ---------- VFX (xem vfx.js) ----------
import * as VFX from './vfx.js'

export function init() {
  loadAll()
  VFX.init(BUNDLE)
  window.__characters = { OUTFIT_OPTIONS, getSprites, renderPortrait, getSeatedSprites, vfx: VFX.api }
  bus.on('outfit:changed', () => { /* cache theo chỉ số trang phục nên không cần xoá; ảnh khởi tạo xong đã tự xoá */ })
}

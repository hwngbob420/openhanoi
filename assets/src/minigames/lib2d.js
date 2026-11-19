// ───────── lõi vẽ 2D (mini-game & dáng NPC) — nối SAU assets/src/lib/core.js (dùng Cv, mix, dark, lite, FONT, glyphClusters) ─────────
// Quy ước màu như thế giới: ánh sáng ấm từ trái-trên, bóng ngả teal, viền 1px tối.
const INK2 = '#1c1a1f'
const TEAL = '#2f7080'
const sh = (c, t = 0.28) => mix(dark(c, t), TEAL, 0.22)        // bóng teal
const hi = (c, t = 0.25) => lite(c, t)
const ramp = (c) => ({ a: c, b: sh(c), c: hi(c), d: sh(c, 0.5), e: hi(c, 0.5) })

// viền 1px màu cố định (người) — giống finish() của khối nhân vật
function outlineInk(cv, col = INK2) {
  const o = []
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    if (cv.get(x, y)) continue
    if (cv.get(x + 1, y) || cv.get(x - 1, y) || cv.get(x, y + 1) || cv.get(x, y - 1)) o.push([x, y])
  }
  for (const [x, y] of o) cv.set(x, y, col)
  return cv
}
function blit(dst, src, dx, dy, flip = false) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.b[y * src.w + (flip ? src.w - 1 - x : x)]; if (c) dst.set(dx + x, dy + y, c) }
}
function flipCv(cv) { const o = new Cv(cv.w, cv.h); blit(o, cv, 0, 0, true); return o }
const hl = (cv, x0, x1, y, c) => cv.rect(x0, y, x1 - x0 + 1, 1, c)
const vl = (cv, x, y0, y1, c) => cv.rect(x, y0, 1, y1 - y0 + 1, c)
function dither(cv, x, y, w, h, c1, c2) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cv.set(x + i, y + j, (i + j) % 2 ? c2 : c1) }
function noise(cv, x, y, w, h, c, dens, seed) { const r = rngOf(seed); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (r() < dens) cv.set(x + i, y + j, c) }
// thay màu trong một vùng (đổ bóng lên vật đã vẽ)
function shadeRect(cv, x, y, w, h, t = 0.28) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = cv.get(x + i, y + j); if (c) cv.set(x + i, y + j, sh(c, t)) } }

// ───────── chữ pixel 3x5 phẳng (có dấu tiếng Việt). (x,y) = góc trên-trái của thân chữ; dấu nằm 2 hàng phía trên ─────────
function glyph2d(cv, x, y, cl, col, sc = 1) {
  const g = (FONT[cl.c] || FONT[' ']).split('|')
  const px = (k, r) => cv.rect(x + k * sc, y + (4 - r) * sc, sc, sc, col)        // r: 0 = hàng đáy
  for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r][k] === '#') px(k, 4 - r)
  for (const m of cl.m) {
    if (m === '̂') { px(0, 5); px(2, 5) } else if (m === '̆') { px(0, 5); px(1, 5); px(2, 5) } else if (m === '̛') { px(3, 3) }
    else if (m === '́') px(2, 6); else if (m === '̀') px(0, 6); else if (m === '̉') px(1, 6); else if (m === '̃') { px(0, 6); px(2, 6) } else if (m === '̣') px(1, -1)
  }
}
const textW2 = (str, sc = 1) => (glyphClusters(str).length * 4 - 1) * sc
function text2d(cv, x, y, str, col, sc = 1) { let a = x; for (const cl of glyphClusters(str)) { glyph2d(cv, a, y, cl, col, sc); a += 4 * sc } }
function text2dC(cv, cx, y, str, col, sc = 1) { text2d(cv, Math.round(cx - textW2(str, sc) / 2), y, str, col, sc) }

// ───────── bánh xe nan hoa nhìn ngang: tâm (cx,cy) bán kính r, pha quay ph (radian) ─────────
function spokeWheel(cv, cx, cy, r, ph, o = {}) {
  const tire = o.tire || '#26232a', rim = o.rim || '#a9b2bc', spoke = o.spoke || '#7d8794', hub = o.hub || '#d4d9de', n = o.n || 8
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
    if (d <= r && d > r - 1.6) cv.set(x, y, tire)
    else if (d <= r - 1.6 && d > r - 2.6) cv.set(x, y, (x + 0.5 < cx && y + 0.5 < cy) ? hi(rim, 0.3) : rim)
  }
  for (let k = 0; k < n; k++) { const a = ph + k * Math.PI * 2 / n; cv.line(cx - 0.5 + Math.cos(a) * 1.2, cy - 0.5 + Math.sin(a) * 1.2, cx - 0.5 + Math.cos(a) * (r - 2.6), cy - 0.5 + Math.sin(a) * (r - 2.6), spoke) }
  cv.rect(Math.round(cx - 1), Math.round(cy - 1), 2, 2, hub)
}
// bánh xe máy/ô tô nhìn ngang: lốp dày + mâm, vạch mâm xoay theo pha
function solidWheel(cv, cx, cy, r, ph, o = {}) {
  const tire = o.tire || '#26232a', rim = o.rim || '#9aa3ad', hubc = o.hub || '#5a6470'
  cv.ell(cx, cy, r, r, tire)
  cv.ell(cx, cy, r * 0.55, r * 0.55, rim)
  for (let k = 0; k < 3; k++) { const a = ph + k * Math.PI * 2 / 3; cv.set(Math.round(cx - 0.5 + Math.cos(a) * r * 0.42), Math.round(cy - 0.5 + Math.sin(a) * r * 0.42), hubc) }
  cv.set(Math.round(cx - 0.5), Math.round(cy - 0.5), hubc)
  cv.set(Math.round(cx - r * 0.5), Math.round(cy - r * 0.6), '#4a4652')
}

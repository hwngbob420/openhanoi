// Hệ nhân vật paper-doll (Hà Nội Pixel): mỗi LỚP là một sprite 14x26 (chưa có viền/bóng) cùng khung với nhân vật cũ.
// Lúc chạy, src/assets/characters/index.js ghép: thân -> quần -> giày -> áo -> tóc, rồi thêm viền 1px + bóng => 16x28.
// 3 hướng vẽ tay (down, up, right); hướng trái = lật hình phải. Khung 0..3: 0 và 2 đứng, 1 và 3 bước (như nhân vật cũ).
// Tên file: ch_<lớp>_<biến thể>_<hướng>_<khung>.png   (lớp: body, shoes, hair, top, pants)
//
// Quy ước ký tự trong lưới nháp: a = màu chính, b = tối, c = sáng, d = phụ, e = mắt/chi tiết tối, . = trong suốt.

const W = 14, H = 26

// ---------- bảng màu (giữ gam ấm của nhân vật cũ: da f0c49a / c98e68, viền 1c1a1f) ----------
const SKIN = { a: '#f0c49a', b: '#c98e68', c: '#f7d6b4', e: '#1c1a1f' }
const SHOE = { a: '#efe6d2', b: '#b9ae96' }
const HAIRS = [
  { id: 'den',    a: '#2b2230', b: '#1c1620', c: '#4a3a50' },   // đen
  { id: 'nau',    a: '#6e3d25', b: '#4a2818', c: '#97583a' },   // nâu hạt dẻ
  { id: 'camdo',  a: '#d5581f', b: '#9c3a18', c: '#f58f42' },   // đỏ cam
  { id: 'khoi',   a: '#6f909c', b: '#4a6a76', c: '#a4bec6' },   // xanh khói
]
const TOPS = [
  { id: 'tee',    a: '#b8503a', b: '#8c3a2a', c: '#d87a62', d: '#d87a62' },            // áo phông đỏ gạch
  { id: 'somi',   a: '#ece6d6', b: '#bdb5a2', c: '#fffaf0', d: '#8a8576' },            // sơ mi trắng
  { id: 'hoodie', a: '#3f6fb0', b: '#2b4d86', c: '#6c9bd4', d: '#efe6d2' },            // hoodie xanh
  { id: 'polo',   a: '#3a8f8a', b: '#2a6a6c', c: '#6cc1b0', d: '#efe6d2' },            // polo teal (áo cũ)
]
const PANTS = [
  { id: 'jean',   a: '#3d4c7a', b: '#2b3558' },                                         // jean xanh
  { id: 'tay',    a: '#363a42', b: '#22252b' },                                         // quần tây đen
  { id: 'short',  a: '#b99d68', b: '#8a7348' },                                         // quần short kaki
]

// ---------- gán ký tự palette tự động cho từng màu ----------
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const colorChar = {}
let poolI = 0
const P = {}
function ch(hex) { if (!colorChar[hex]) { colorChar[hex] = POOL[poolI++]; P[colorChar[hex]] = hex } return colorChar[hex] }
const tint = (g, set) => g.map((r) => r.map((c) => (c === '.' ? '.' : set[c] ? ch(set[c]) : '.')))
const all = []
for (const s of [SKIN, SHOE, ...HAIRS, ...TOPS, ...PANTS]) for (const k of 'abcde') if (s[k]) ch(s[k])
pal(P)

// ---------- tiện ích lưới ----------
const G = () => Array.from({ length: H }, () => Array(W).fill('.'))
const put = (g, x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c }
const rect = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, c) }
const hline = (g, x0, x1, y, c) => rect(g, x0, y, x1 - x0 + 1, 1, c)
const paste = (g, x0, y0, rows) => rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== ' ' && c !== '.') put(g, x0 + i, y0 + j, c) }))
const lines = (g) => g.map((r) => r.join('')).join('\n')
const mirrorRow = (half) => half + [...half].reverse().join('')
const fix = (g, rowsStr, y0) => paste(g, 0, y0, rowsStr)

const idxLeg = [0, 1, 0, 2]            // khung 0..3 -> kiểu chân
const swing = [0, 1, 0, -1]            // vung tay nhìn ngang

// ---------- hình học chân nhìn trước/sau ----------
// trả về { L, R } mỗi chân: { x0,x1 (cột chân), shoeX0,shoeX1,shoeY, bottom (hàng cuối của quần/da) }
function frontLegs(f) {
  const liftL = f === 1, liftR = f === 3
  const mk = (x0, x1, sx0, sx1, lift) => lift
    ? { x0, x1, sx0: x0, sx1: x1, sy: 24, end: 23 }
    : { x0, x1, sx0, sx1, sy: 25, end: 24 }
  return { L: mk(2, 5, 1, 5, liftL), R: mk(8, 11, 8, 12, liftR) }
}
// chân nhìn ngang (hướng phải): mỗi chân { x0,x1,shade (P tối), sx0,sx1 }
function sideLegs(f) {
  const k = idxLeg[f]
  if (k === 0) return [{ x0: 4, x1: 5, back: true, sx0: 4, sx1: 10 }, { x0: 6, x1: 8, back: false, sx0: 4, sx1: 10, shoeOnly: true }]
  if (k === 1) return [{ x0: 2, x1: 4, back: true, sx0: 2, sx1: 5 }, { x0: 7, x1: 9, back: false, sx0: 7, sx1: 10 }]
  return [{ x0: 3, x1: 5, back: false, sx0: 3, sx1: 6 }, { x0: 8, x1: 10, back: true, sx0: 8, sx1: 11 }]
}

// ---------- đầu: viền ngoài ----------
const headCols = [[3, 10], [2, 11], [1, 12], [1, 12], [1, 12], [1, 12], [1, 12], [1, 12], [2, 11], [2, 11], [3, 10]]
const sideHead = [
  '...aaaaaa.....', '..aaaaaaaa....', '..aaaaaaaaa...', '..aaaaaaaaa...', '..aaaaaaaaa...', '..aaaaaaaaaa..',
  '..aaaaaaaaaa..', '..aaaaaaaaaa..', '...aaaaaaaa...', '....aaaaaa....', '.....aaaa.....',
]

// =============== THÂN (da) ===============
function body(dir, f) {
  const g = G()
  if (dir === 'down' || dir === 'up') {
    headCols.forEach(([a, b], y) => hline(g, a, b, y, 'a'))
    hline(g, 3, 10, 10, 'b')
    if (dir === 'down') {
      put(g, 3, 6, 'e'); put(g, 10, 6, 'e')
      put(g, 6, 8, 'b'); put(g, 7, 8, 'b')            // miệng nhỏ
      put(g, 2, 7, 'c'); put(g, 11, 7, 'c')           // má sáng
    }
    // thân + tay
    rect(g, 0, 11, 14, 9, 'a')
    hline(g, 5, 8, 11, 'b')                           // cổ tối dưới cằm
    for (let y = 12; y <= 19; y++) { put(g, 1, y, 'b'); put(g, 12, y, 'b') }
    // chân
    const { L, R } = frontLegs(f)
    for (const l of [L, R]) rect(g, l.x0, 22, l.x1 - l.x0 + 1, l.sy - 22, 'a')
    hline(g, 1, 12, 20, 'a'); hline(g, 1, 12, 21, 'a')
  } else {
    fix(g, sideHead, 0)
    for (let y = 0; y < 11; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'a') g[y][x] = 'a'
    put(g, 9, 6, 'e'); put(g, 11, 6, 'b'); put(g, 11, 5, 'a')
    put(g, 9, 8, 'b'); put(g, 8, 8, 'b')
    hline(g, 6, 9, 10, 'b'); put(g, 9, 9, 'b')
    put(g, 5, 6, 'b'); put(g, 5, 7, 'b')              // tai
    rect(g, 4, 11, 6, 9, 'a')
    put(g, 4, 11, 'b'); hline(g, 6, 8, 11, 'b')
    const sw = swing[f]
    rect(g, 5 + sw, 12, 3, 5, 'b')                    // tay (da tối hơn một chút)
    rect(g, 6 + sw, 17, 2, 2, 'a')                    // bàn tay
    hline(g, 4, 9, 20, 'a'); hline(g, 4, 9, 21, 'a')
    for (const l of sideLegs(f)) if (!l.shoeOnly) rect(g, l.x0, 22, l.x1 - l.x0 + 1, 3, l.back ? 'b' : 'a')
  }
  return g
}

// =============== GIÀY ===============
function shoes(dir, f) {
  const g = G()
  if (dir !== 'right') {
    const { L, R } = frontLegs(f)
    for (const l of [L, R]) { hline(g, l.sx0, l.sx1, l.sy, 'a'); if (l.sy === 25) { put(g, l.sx1 === 5 ? 5 : l.sx1, 25, 'b'); put(g, l.sx0, 25, 'a') } }
  } else {
    for (const l of sideLegs(f)) { hline(g, l.sx0, l.sx1, 25, l.back ? 'b' : 'a'); put(g, l.sx1, 25, 'a') }
    if (idxLeg[f] === 0) hline(g, 4, 10, 25, 'a')
  }
  return g
}

// =============== TÓC (kiểu 1: ngắn, mái lệch) ===============
function hair(dir, f) {
  const g = G()
  if (dir === 'down') {
    hline(g, 3, 10, 0, 'a'); hline(g, 2, 11, 1, 'a'); hline(g, 1, 12, 2, 'a'); hline(g, 1, 12, 3, 'a')
    hline(g, 1, 5, 4, 'a'); hline(g, 9, 12, 4, 'a'); put(g, 5, 4, 'b'); put(g, 1, 4, 'b'); put(g, 12, 4, 'b')
    put(g, 3, 2, 'c'); put(g, 4, 2, 'c'); put(g, 9, 1, 'c'); put(g, 10, 2, 'c')
    hline(g, 5, 8, 3, 'a'); put(g, 7, 3, 'b')
    put(g, 1, 5, 'b'); put(g, 12, 5, 'b')
  } else if (dir === 'up') {
    headCols.slice(0, 10).forEach(([a, b], y) => hline(g, a, b, y, 'a'))
    put(g, 3, 2, 'c'); put(g, 4, 2, 'c'); put(g, 9, 1, 'c'); put(g, 10, 2, 'c'); put(g, 5, 1, 'c')
    hline(g, 2, 11, 8, 'b'); hline(g, 2, 11, 9, 'b')
    hline(g, 4, 9, 9, 'b')
    put(g, 7, 5, 'b'); put(g, 6, 6, 'b')                // xoáy tóc
  } else {
    hline(g, 3, 8, 0, 'a'); hline(g, 2, 9, 1, 'a'); hline(g, 2, 10, 2, 'a'); hline(g, 2, 10, 3, 'a')
    hline(g, 2, 6, 4, 'a'); put(g, 6, 4, 'b'); hline(g, 2, 4, 5, 'a'); hline(g, 2, 4, 6, 'a'); hline(g, 2, 4, 7, 'a')
    hline(g, 3, 4, 8, 'a'); put(g, 4, 9, 'b'); put(g, 5, 10, 'b')
    put(g, 4, 2, 'c'); put(g, 5, 2, 'c'); put(g, 8, 1, 'c')
    put(g, 2, 8, 'b'); put(g, 3, 8, 'b'); put(g, 2, 7, 'b'); put(g, 10, 3, 'b')
  }
  return g
}

// =============== ÁO ===============
// kiểu: 'tee' (ngắn tay cổ tròn), 'somi' (dài tay cổ bẻ), 'hoodie' (dài tay, mũ, túi), 'polo' (ngắn tay cổ bẻ)
function top(kind, dir, f) {
  const g = G()
  const long = kind === 'somi' || kind === 'hoodie'
  if (dir === 'down' || dir === 'up') {
    rect(g, 0, 11, 14, 9, 'a')
    for (let y = 12; y <= 19; y++) { put(g, 1, y, 'b'); put(g, 12, y, 'b') }
    hline(g, 2, 11, 19, 'b')
    // tay: ngắn tay -> trả da lại cho thân từ hàng 15; dài tay -> chỉ chừa bàn tay hàng 18,19
    if (long) { for (const y of [18, 19]) { put(g, 0, y, '.'); put(g, 13, y, '.') } put(g, 1, 19, 'b'); put(g, 12, 19, 'b') }
    else { for (let y = 15; y <= 19; y++) for (const x of [0, 1, 12, 13]) put(g, x, y, '.') }
    if (kind === 'hoodie') {
      hline(g, 1, 12, 20, 'b'); hline(g, 2, 11, 20, 'a'); put(g, 1, 20, 'b'); put(g, 12, 20, 'b')
      hline(g, 2, 11, 19, 'b')
    }
    if (dir === 'down') {
      if (kind === 'tee') { for (let x = 5; x <= 8; x++) put(g, x, 11, '.'); put(g, 4, 11, 'b'); put(g, 9, 11, 'b'); put(g, 3, 13, 'c'); put(g, 10, 13, 'c') }
      if (kind === 'polo') { hline(g, 5, 8, 11, '.'); put(g, 4, 11, 'c'); put(g, 9, 11, 'c'); put(g, 5, 12, 'c'); put(g, 8, 12, 'c'); put(g, 6, 12, 'b'); put(g, 7, 12, 'b'); put(g, 6, 13, 'b'); put(g, 7, 13, 'b'); put(g, 3, 13, 'c'); put(g, 10, 13, 'c') }
      if (kind === 'somi') {
        hline(g, 5, 8, 11, '.'); put(g, 4, 11, 'c'); put(g, 5, 11, 'c'); put(g, 8, 11, 'c'); put(g, 9, 11, 'c'); put(g, 5, 12, 'c'); put(g, 8, 12, 'c')
        for (let y = 12; y <= 18; y++) put(g, 6, y, 'b')
        put(g, 7, 14, 'd'); put(g, 7, 17, 'd')
      }
      if (kind === 'hoodie') {
        hline(g, 3, 10, 11, 'b'); hline(g, 4, 9, 11, 'b'); put(g, 5, 11, 'a'); put(g, 8, 11, 'a'); put(g, 6, 11, '.'); put(g, 7, 11, '.')
        put(g, 5, 12, 'd'); put(g, 5, 13, 'd'); put(g, 8, 12, 'd'); put(g, 8, 13, 'd')
        hline(g, 4, 9, 16, 'b'); put(g, 3, 17, 'b'); put(g, 10, 17, 'b'); put(g, 4, 17, 'c'); put(g, 9, 17, 'c')
        put(g, 4, 18, 'b'); put(g, 9, 18, 'b'); hline(g, 4, 9, 18, 'b')
        put(g, 3, 13, 'c'); put(g, 10, 13, 'c')
      }
    } else {
      // lưng
      if (kind === 'tee') { hline(g, 5, 8, 11, 'b'); put(g, 4, 11, 'a') }
      if (kind === 'polo') { hline(g, 4, 9, 11, 'c') }
      if (kind === 'somi') { hline(g, 4, 9, 11, 'c'); hline(g, 5, 8, 12, 'c') }
      if (kind === 'hoodie') { hline(g, 3, 10, 11, 'b'); hline(g, 3, 10, 12, 'b'); hline(g, 4, 9, 13, 'b'); hline(g, 5, 8, 14, 'b'); put(g, 4, 12, 'c'); put(g, 9, 12, 'c') }
    }
  } else {
    // nhìn ngang, thân cột 4..9
    rect(g, 4, 11, 6, 9, 'a')
    for (let y = 12; y <= 19; y++) put(g, 4, y, 'b')
    hline(g, 4, 9, 19, 'b')
    put(g, 9, 12, 'c'); put(g, 8, 13, 'c')
    const sw = swing[f]
    const armTo = long ? 16 : 14
    rect(g, 5 + sw, 12, 3, armTo - 11, 'b')
    if (long) { put(g, 5 + sw, 16, 'b'); put(g, 6 + sw, 16, 'b'); put(g, 7 + sw, 16, 'b') }
    if (kind === 'hoodie') { hline(g, 4, 9, 20, 'b'); hline(g, 5, 9, 20, 'a'); put(g, 4, 20, 'b'); put(g, 8, 18, 'b'); put(g, 9, 17, 'b'); hline(g, 7, 9, 17, 'b'); hline(g, 3, 5, 11, 'b'); hline(g, 3, 5, 12, 'b'); put(g, 3, 13, 'b'); put(g, 4, 13, 'b'); hline(g, 6, 9, 11, 'b'); put(g, 9, 13, 'd'); put(g, 9, 14, 'd') }
    if (kind === 'tee') { hline(g, 6, 8, 11, '.'); put(g, 9, 11, 'b') }
    if (kind === 'polo') { hline(g, 6, 8, 11, '.'); put(g, 9, 11, 'c'); put(g, 8, 11, 'c'); put(g, 9, 12, 'b'); put(g, 9, 13, 'b') }
    if (kind === 'somi') { hline(g, 6, 8, 11, '.'); put(g, 9, 11, 'c'); put(g, 8, 11, 'c'); put(g, 4, 11, 'c'); put(g, 5, 11, 'c'); put(g, 9, 12, 'c'); put(g, 9, 14, 'd'); put(g, 9, 17, 'd') }
  }
  return g
}

// =============== QUẦN ===============
function pants(kind, dir, f) {
  const g = G()
  const short = kind === 'short'
  if (dir !== 'right') {
    hline(g, 1, 12, 20, 'a'); hline(g, 1, 12, 21, 'a')
    put(g, 1, 20, 'b'); put(g, 12, 20, 'b'); hline(g, 1, 12, 21, 'b'); hline(g, 2, 11, 21, 'a')
    hline(g, 6, 7, 21, 'b'); put(g, 6, 20, 'b'); put(g, 7, 20, 'b')
    const { L, R } = frontLegs(f)
    for (const l of [L, R]) {
      const last = short ? 23 : l.end
      rect(g, l.x0, 22, l.x1 - l.x0 + 1, Math.max(0, Math.min(last, l.end) - 22 + 1), 'a')
    }
    // bóng bên trong chân + túi
    for (const l of [L, R]) for (let y = 22; y <= (short ? 23 : l.end); y++) put(g, l === L ? l.x1 : l.x0, y, 'b')
    if (dir === 'down') { put(g, 2, 20, 'b'); put(g, 11, 20, 'b'); if (kind === 'jean') { put(g, 3, 22, 'b'); put(g, 10, 22, 'b') } }
  } else {
    hline(g, 4, 9, 20, 'a'); hline(g, 4, 9, 21, 'a'); put(g, 4, 20, 'b'); put(g, 4, 21, 'b'); hline(g, 5, 9, 21, 'a')
    for (const l of sideLegs(f)) if (!l.shoeOnly) rect(g, l.x0, 22, l.x1 - l.x0 + 1, short ? 2 : 3, l.back ? 'b' : 'a')
    if (idxLeg[f] === 0) rect(g, 6, 22, 3, short ? 2 : 3, 'a')
    hline(g, 4, 9, 21, 'b')
  }
  return g
}

// ---------- xuất ----------
const DIRS = ['down', 'up', 'right']
const emit = (name, g, set) => sprite(name, lines(tint(g, set)))
for (const d of DIRS) for (let f = 0; f < 4; f++) {
  emit(`ch_body_0_${d}_${f}`, body(d, f), SKIN)
  emit(`ch_shoes_0_${d}_${f}`, shoes(d, f), SHOE)
  HAIRS.forEach((h, i) => emit(`ch_hair_${i}_${d}_${f}`, hair(d, f), h))
  TOPS.forEach((t, i) => emit(`ch_top_${i}_${d}_${f}`, top(t.id, d, f), t))
  PANTS.forEach((p, i) => emit(`ch_pants_${i}_${d}_${f}`, pants(p.id, d, f), p))
}

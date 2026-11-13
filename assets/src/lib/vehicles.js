// ───────── xe cộ & tàu hỏa ─────────
// Mỗi xe là một danh sách khối trong toạ độ cục bộ (l = dọc thân xe, w = ngang), được xoay theo trục x/y và chiều chạy.
function vehExtents(s) { return s.axis === 'x' ? [s.L, s.W] : [s.W, s.L] }
LAYOUT.vehicle = (s) => {
  const [ex, ey] = vehExtents(s)
  const L = blockLayout(ex, ey, s.H + 16)
  L.fp = [ex / TILE, ey / TILE]; return L
}
function partsDraw(I, parts) {                   // vẽ khối xa trước, gần sau
  parts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2])
  for (const p of parts) { const [x0, y0, z0, x1, y1, z1, col, cols] = p; I.box(x0, y0, z0, x1, y1, z1, col, cols) }
}
// tạo bộ vẽ cục bộ: B(l0,l1,w0,w1,z0,z1,màu) với l tính từ đuôi xe (0) tới đầu xe (L)
function vehBuilder(s) {
  const parts = [], L = s.L
  const B = (l0, l1, w0, w1, z0, z1, col, cols) => {
    if (s.dir < 0) { const a = L - l1, b = L - l0; l0 = a; l1 = b }
    const p = s.axis === 'x' ? [l0, w0, z0, l1, w1, z1] : [w0, l0, z0, w1, l1, z1]
    parts.push([...p, col, cols])
  }
  return { B, parts }
}
function glassCols(top = RAMP.lake_teal[3]) { const g = mix(RAMP.lake_teal[0], INK, 0.2); return { top: mix(top, g, 0.3), left: mix(RAMP.lake_teal[2], g, 0.35), right: mix(g, SHADOW_TEAL, 0.3) } }

DRAW.vehicle = (cv, s, I) => {
  const { B, parts } = vehBuilder(s), L = s.L, W = s.W, c = s.col
  const body = faceCols(c), roof = { top: lite(c, 0.42), left: lite(c, 0.12), right: mix(dark(c, 0.3), SHADOW_TEAL, 0.22) }
  const WHEEL = { top: '#3a4556', left: '#262d3a', right: '#1c1822' }
  const GL = glassCols(), HEAD = { top: '#fff6c0', left: '#fff6c0', right: '#e8d89a' }, TAIL = { top: '#e0463a', left: '#d4382c', right: '#a3202a' }
  const after = []
  const shadowC = (col) => mix(dark(col, 0.28), SHADOW_TEAL, 0.22)
  const sc = (col) => s.axis === 'x' ? col : shadowC(col)           // mặt hông nhìn thấy
  const ec = (col) => s.axis === 'x' ? shadowC(col) : col           // mặt đầu/đuôi nhìn thấy
  const frontVisible = s.dir > 0
  const sideQ = (f0, f1, z0, z1, col) => after.push(() => { let a = L * f0, b = L * f1; if (s.dir < 0) [a, b] = [L - b, L - a]; s.axis === 'x' ? I.fL(W - 1, a, b, z0, z1, sc(col)) : I.fR(W - 1, a, b, z0, z1, sc(col)) })
  const endQ = (w0, w1, z0, z1, col) => after.push(() => { s.axis === 'x' ? I.fR(L, w0, w1, z0, z1, ec(col)) : I.fL(L, w0, w1, z0, z1, ec(col)) })
  const GLC = mix(RAMP.lake_teal[0], INK, 0.15), GLH = mix(RAMP.lake_teal[3], GLC, 0.4), HEADC = '#fff6c0', TAILC = '#d4382c'
  const lights = (z0, z1, w) => { if (frontVisible) { endQ(2, 2 + w, z0, z1, HEADC); endQ(W - 2 - w, W - 2, z0, z1, HEADC) } else { endQ(2, 2 + w, z0, z1, TAILC); endQ(W - 2 - w, W - 2, z0, z1, TAILC) } }
  if (s.type === 'car') {
    const wy = (l) => l
    B(6, 14, 0, 2, 0, 6, null, WHEEL); B(L - 15, L - 7, 0, 2, 0, 6, null, WHEEL); B(6, 14, W - 2, W + 0.5, 0, 6, null, WHEEL); B(L - 15, L - 7, W - 2, W + 0.5, 0, 6, null, WHEEL)
    B(0, L, 1, W - 1, 3, 12, null, body)
    B(L * 0.22, L * 0.74, 3, W - 3, 12, 22, null, GL)
    B(L * 0.22 + 2, L * 0.74 - 2, 3, W - 3, 21, 23, null, roof)
    for (const [l0, l1] of [[0.3, 0.46], [0.5, 0.66]]) B(L * l0, L * l1, 2.6, W - 2.6, 13, 20.5, null, GL)
    B(L * 0.22 + 1, L * 0.74 - 1, 4, W - 4, 21, 23, null, roof)
    B(L - 1, L + 0.5, 3, 7, 6, 9, null, HEAD); B(L - 1, L + 0.5, W - 7, W - 3, 6, 9, null, HEAD)
    B(-0.5, 1, 3, 7, 6, 9, null, TAIL); B(-0.5, 1, W - 7, W - 3, 6, 9, null, TAIL)
  } else if (s.type === 'bus') {
    for (const l of [14, L - 26]) { B(l, l + 11, 0, 3, 0, 9, null, WHEEL); B(l, l + 11, W - 3, W + 0.5, 0, 9, null, WHEEL) }
    B(0, L, 1, W - 1, 6, 42, null, body)
    B(2, L - 2, 3, W - 3, 42, 44, null, roof)
    B(L * 0.3, L * 0.3 + 14, 7, W - 7, 44, 47, null, faceCols('#aeb4ba'))
    sideQ(0, 1, 6, 15, s.band); sideQ(0, 1, 15, 16, lite(s.band, 0.35))
    for (let f = 0.05; f < 0.93; f += 0.112) { sideQ(f, f + 0.088, 22, 36, GLC); sideQ(f, f + 0.088, 32, 36, GLH) }
    endQ(3, W - 3, 20, 38, GLC); endQ(3, W - 3, 32, 38, GLH); endQ(1, W - 1, 6, 10, '#3a4556'); lights(10, 14, 5)
    if (frontVisible) endQ(6, W - 6, 39, 42, '#fbe08a')
  } else if (s.type === 'moto') {
    B(2, 9, 4, 6, 0, 9, null, WHEEL); B(L - 8, L - 2, 4, 6, 0, 9, null, WHEEL)               // 2 bánh (mảnh)
    B(7, L - 8, 3, 7, 5, 10, null, faceCols(dark(c, 0.15)))                                   // sườn xe
    B(L - 12, L - 3, 2, 8, 9, 17, null, faceCols(c))                                          // đầu xe / bình xăng
    B(L - 5, L - 4, 0, 10, 16, 18, null, faceCols('#23252b'))                                 // tay lái
    B(5, 14, 3, 7, 10, 12, null, faceCols('#23252b'))                                         // yên
    B(-1, 2, 4, 6, 8, 10, null, TAIL)
    if (s.rider) {
      B(8, 15, 2, 8, 11, 17, null, faceCols(s.pants || '#3d4c7a'))                            // chân
      B(6, 13, 3, 7, 17, 27, null, faceCols(s.shirt))                                         // thân
      B(L - 13, L - 6, 1, 3, 17, 25, null, faceCols(s.shirt)); B(L - 13, L - 6, 7, 9, 17, 25, null, faceCols(s.shirt))  // tay
      B(6, 13, 2.5, 7.5, 27, 34, null, faceCols(s.helm))                                      // mũ bảo hiểm
      B(11, 13.2, 3, 7, 28, 31, null, faceCols('#f0c49a'))                                    // mặt
      if (s.pillion) { B(-1, 5, 3, 7, 11, 17, null, faceCols('#3d4c7a')); B(-2, 4, 3, 7, 17, 26, null, faceCols(s.pillion)); B(-2, 4, 2.5, 7.5, 26, 32, null, faceCols(s.helm2 || '#23252b')) }
    }
  } else if (s.type === 'loco') {
    for (const l of [10, L - 26]) { B(l, l + 16, 1, 5, 0, 8, null, WHEEL); B(l, l + 16, W - 5, W - 1, 0, 8, null, WHEEL) }
    B(0, L, 1, W - 1, 6, 36, null, body)
    B(4, L - 4, 5, W - 5, 36, 40, null, roof); B(L * 0.3, L * 0.55, 8, W - 8, 40, 43, null, faceCols('#8a929a'))
    sideQ(0, 1, 6, 12, dark(s.col, 0.35)); sideQ(0, 1, 14, 19, s.band)
    sideQ(0.08, 0.26, 22, 33, GLC); sideQ(0.08, 0.26, 29, 33, GLH); sideQ(0.58, 0.74, 22, 33, GLC); sideQ(0.58, 0.74, 29, 33, GLH)
    endQ(4, W - 4, 22, 34, GLC); endQ(4, W - 4, 30, 34, GLH); endQ(1, W - 1, 14, 19, s.band); lights(8, 12, 5)
    if (frontVisible) endQ(11, W - 11, 35, 36, HEADC)
  } else if (s.type === 'coach') {
    for (const l of [14, L - 30]) { B(l, l + 16, 1, 5, 0, 7, null, WHEEL); B(l, l + 16, W - 5, W - 1, 0, 7, null, WHEEL) }
    B(0, L, 1, W - 1, 5, 34, null, body)
    B(2, L - 2, 4, W - 4, 34, 37, null, roof)
    sideQ(0, 1, 5, 11, s.band); sideQ(0, 1, 17, 19, s.band)
    for (let f = 0.05; f < 0.92; f += 0.1) { sideQ(f, f + 0.07, 21, 31, GLC); sideQ(f, f + 0.07, 27, 31, GLH) }
    endQ(8, W - 8, 12, 30, dark(s.col, 0.25))
  }
  partsDraw(I, parts)
  for (const f of after) f()
  cv.outline(0.5)
}

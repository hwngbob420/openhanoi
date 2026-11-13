// Thế giới mở Hà Nội 64x64 (isometric 2:1, ô 72x36). Toàn bộ hình ảnh lấy từ assets/world (dựng bằng claude-pxl).
// Phần này: sinh bản đồ, mô phỏng xe/tàu/thanh chắn/đèn, vẽ. Nhân vật & va chạm người chơi ở js/player.js.
'use strict'
const World = (() => {
  const N = 64, TW = 72, TH = 36
  const proj = (gx, gy) => [(gx - gy) * TW / 2, (gx + gy) * TH / 2]
  const cam = { x: 0, y: 0, zoom: 2 }
  const stats = { errors: [], fps: 0, objs: 0, vehicles: 0 }
  let MAN = null; const IMG = {}
  function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const R = rngOf(20241113), rnd = () => R(), pick = (a) => a[Math.floor(R() * a.length)], rr = (a, b) => a + R() * (b - a)
  const inR = (v, r) => v >= r[0] && v <= r[1], inAny = (v, L) => L.some((r) => inR(v, r))
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

  // ───────── bố cục đường ─────────
  const CORRX = [[12, 16], [29, 33], [48, 52]], ROADX = [[13, 15], [30, 32], [49, 51]]     // hành lang + lòng đường Bắc-Nam
  const CORRY = [[10, 14], [29, 33], [51, 55]], ROADY = [[11, 13], [30, 32], [52, 54]]     // Đông-Tây
  const RAILC = [40, 44], RAIL_Y = 42                                                       // phố tàu hỏa: ray hàng y=42, chạy hết map
  const BLOCKX = [[0, 11], [17, 28], [34, 47], [53, 63]], BLOCKY = [[0, 9], [15, 28], [34, 39], [45, 50], [56, 63]]

  async function load() {
    MAN = (await (await fetch('assets/world/manifest.json')).json()).sprites
    await Promise.all(Object.keys(MAN).map((n) => new Promise((res) => { const i = new Image(); i.onload = () => { IMG[n] = i; res() }; i.onerror = () => { stats.errors.push('thiếu ảnh ' + n); res() }; i.src = 'assets/world/' + n + '.png' })))
  }

  // ───────── sinh bản đồ ─────────
  const kind = Array.from({ length: N }, () => Array(N).fill('grass'))
  const tname = Array.from({ length: N }, () => Array(N).fill('g_grass_0'))
  const blk = Array.from({ length: N }, () => Array(N).fill(false))         // ô bị chặn (tĩnh)
  const occ = Array.from({ length: N }, () => Array(N).fill(false))         // ô đã có công trình / đã đặt chỗ
  const used = new Set()                                                     // ô vỉa hè đã đặt đồ
  const bridgeT = new Set()
  const statics = [], colliders = [], poles = []
  const pois = []

  const roadLike = new Set(['road', 'dash_x', 'dash_y', 'zebra_x', 'zebra_y', 'railroad'])
  function genGround() {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let k = 'grass'
      if (inAny(x, CORRX) || inAny(y, CORRY) || inR(y, RAILC)) k = 'walk'
      if (inR(y, [41, 43])) k = 'gravel'
      if (y === RAIL_Y) k = 'rail'
      const rx = inAny(x, ROADX), ry = inAny(y, ROADY)
      if (rx || ry) k = 'road'
      if (rx && y === RAIL_Y) k = 'railroad'
      kind[y][x] = k
    }
    for (const r of ROADY) for (let x = 0; x < N; x++) if (!inAny(x, CORRX)) kind[r[0] + 1][x] = 'dash_x'
    for (const r of ROADX) for (let y = 0; y < N; y++) if (!inAny(y, CORRY) && !inR(y, RAILC)) kind[y][r[0] + 1] = 'dash_y'
    for (const c of CORRX) for (const x of c) for (const r of ROADY) for (let y = r[0]; y <= r[1]; y++) kind[y][x] = 'zebra_x'
    for (const c of CORRY.filter((c) => c[0] !== 51 || true)) for (const y of c) for (const r of ROADX) for (let x = r[0]; x <= r[1]; x++) if (kind[y][x] === 'road') kind[y][x] = 'zebra_y'
  }

  function sprite(name, gx, gy, o = {}) {
    const m = MAN[name]; if (!m) { stats.errors.push('thiếu ' + name); return null }
    const [sx, sy] = proj(gx, gy), fp = m.fp
    const bb = o.bb || (fp ? [gx, gx + fp[0], gy, gy + fp[1]] : [gx - 0.28, gx + 0.28, gy - 0.28, gy + 0.28])
    const s = { name, img: IMG[name], dx: Math.round(sx - m.pivot[0]), dy: Math.round(sy - m.pivot[1]), w: m.w, h: m.h, bb, flat: !!o.flat }
    statics.push(s); return s
  }
  const cellsFree = (gx, gy, w, d) => { for (let y = gy; y < gy + d; y++) for (let x = gx; x < gx + w; x++) if (x < 0 || y < 0 || x >= N || y >= N || occ[y][x]) return false; return true }
  function mark(gx, gy, w, d, block = true) { for (let y = gy; y < gy + d; y++) for (let x = gx; x < gx + w; x++) if (x >= 0 && y >= 0 && x < N && y < N) { occ[y][x] = true; if (block) blk[y][x] = true } }

  const WALLS = ['ochre', 'lemon', 'mint', 'salmon', 'sky', 'cream']
  function house(fam, F, fl, wall, shop, gx, gy) {
    const along = fam.endsWith('R'), w = along ? 3 : F, d = along ? F : 3
    const nm = `h_${fam}_${F}_${fl}_${wall}${shop && !fam.startsWith('n') ? '_s' : ''}`
    if (!MAN[nm] || !cellsFree(gx, gy, w, d)) return false
    mark(gx, gy, w, d); sprite(nm, gx, gy)
    if (!fam.startsWith('n')) fronts.push({ fam, F, gx, gy, shop: !!shop })
    return true
  }
  const fronts = []
  const wfloors = (mix) => { const r = rnd(); let a = 0; for (const [f, p] of mix) { a += p; if (r < a) return f } return mix[mix.length - 1][0] }
  const MIX = { old: [[2, 0.12], [3, 0.4], [4, 0.48]], rail: [[2, 0.5], [3, 0.4], [4, 0.1]], mid: [[2, 0.25], [3, 0.5], [4, 0.25]] }
  function perimeter(b, o = {}) {
    const mix = MIX[o.mix || 'mid'], shopP = o.shop ?? 0.5
    for (let y = b.y0; y <= b.y1;) { let F = rnd() < 0.5 ? 2 : 1; if (y + F - 1 > b.y1) F = 1; house('R', F, wfloors(mix), pick(WALLS), rnd() < shopP, b.x1 - 2, y); y += F }
    for (let y = b.y0; y <= b.y1;) { let F = rnd() < 0.5 ? 2 : 1; if (y + F - 1 > b.y1) F = 1; house('nR', F, wfloors(mix), pick(WALLS), false, b.x0, y); y += F }
    for (let x = b.x0 + 3; x <= b.x1 - 3;) { let F = rnd() < 0.5 ? 2 : 1; if (x + F - 1 > b.x1 - 3) F = 1; house('L', F, wfloors(mix), pick(WALLS), rnd() < shopP, x, b.y1 - 2); x += F }
    for (let x = b.x0 + 3; x <= b.x1 - 3;) { let F = rnd() < 0.5 ? 2 : 1; if (x + F - 1 > b.x1 - 3) F = 1; house('nL', F, wfloors(mix), pick(WALLS), false, x, b.y0); x += F }
  }
  function interior(b, mix) {
    for (let y = b.y0 + 3; y <= b.y1 - 3;) { const F = (b.y1 - 3 - y >= 1 && rnd() < 0.5) ? 2 : 1; for (let x = b.x0 + 3; x <= b.x1 - 5; x += 3) house('R', F, wfloors(MIX[mix || 'mid']), pick(WALLS), false, x, y); y += F }
  }
  function modernBlock(b) {
    const mh = (fam, gx, gy) => { const fl = pick([3, 4]), c = pick(['white', 'grey']), nm = `m_${fam}_${fl}_${c}`, along = fam === 'R', w = along ? 3 : 2, d = along ? 2 : 3; if (cellsFree(gx, gy, w, d)) { mark(gx, gy, w, d); sprite(nm, gx, gy) } }
    for (let y = b.y0; y + 1 <= b.y1; y += 2) mh('R', b.x1 - 2, y)
    for (let y = b.y0; y <= b.y1;) { const F = y + 1 <= b.y1 ? 2 : 1; house('nR', F, 3, 'cream', false, b.x0, y); y += F }
    for (let x = b.x0 + 3; x + 1 <= b.x1 - 3; x += 2) mh('L', x, b.y1 - 2)
    for (let x = b.x0 + 3; x <= b.x1 - 3;) { const F = x + 1 <= b.x1 - 3 ? 2 : 1; house('nL', F, 3, 'cream', false, x, b.y0); x += F }
  }

  // ───────── đồ vật ─────────
  const PROP_R = { p_pho: 0.55, p_banhmi: 0.5, p_fruit: 0.6, p_kiosk: 0.55, p_cafe_red: 0.45, p_cafe_green: 0.45, p_stools: 0.0, p_bench_x: 0.4, p_bench_y: 0.4, p_planter: 0.4, p_cyclo: 0.45, p_bin: 0.22, p_lamp: 0.16, p_pole: 0.16, p_flagpole: 0.12, p_umb_red: 0.55, p_umb_yellow: 0.55, p_umb_teal: 0.55, p_umb_orange: 0.55 }
  function prop(name, gx, gy, o = {}) {
    if (!MAN[name]) return null
    const s = sprite(name, gx, gy, o)
    const r = o.r ?? PROP_R[name] ?? (name.startsWith('t_') ? 0.28 : 0.3)
    if (r > 0) colliders.push({ x: gx, y: gy, r })
    return s
  }
  const tileUse = (x, y) => { const k = x + ',' + y; if (used.has(k)) return false; used.add(k); return true }

  function streets() {
    // cột điện: vỉa hè phía bắc của hành lang Đông-Tây / phía tây của hành lang Bắc-Nam
    for (const c of [CORRY[0], CORRY[1], CORRY[2]]) for (let x = 2; x < N - 1; x += 5) if (!inAny(x, CORRX) && !occ[c[0]][x] && tileUse(x, c[0])) { prop('p_pole', x + 0.5, c[0] + 0.5); poles.push({ gx: x + 0.5, gy: c[0] + 0.5, axis: 'x' }) }
    for (const c of CORRX) for (let y = 3; y < N - 1; y += 5) if (!inAny(y, CORRY) && !inR(y, RAILC) && tileUse(c[0], y)) { prop('p_pole', c[0] + 0.5, y + 0.5); poles.push({ gx: c[0] + 0.5, gy: y + 0.5, axis: 'y' }) }
    for (const x of [3, 8, 20, 26, 38, 44, 55, 60]) { const y = RAILC[0]; if (tileUse(x, y)) { prop('p_pole', x + 0.5, y + 0.5); poles.push({ gx: x + 0.5, gy: y + 0.5, axis: 'x' }) } }
    // đèn đường + cây bàng ven đường (phía đối diện)
    for (const c of [CORRY[0], CORRY[1], CORRY[2]]) for (let x = 4; x < N - 1; x += 6) if (!inAny(x, CORRX) && !occ[c[1]][x] && tileUse(x, c[1])) prop('p_lamp', x + 0.5, c[1] + 0.5)
    for (const c of CORRX) for (let y = 5; y < N - 1; y += 6) if (!inAny(y, CORRY) && !inR(y, RAILC) && tileUse(c[1], y)) prop('p_lamp', c[1] + 0.5, y + 0.5)
    for (const c of [CORRY[0], CORRY[1], CORRY[2]]) for (let x = 7; x < N - 2; x += 9) if (!inAny(x, CORRX) && !inAny(x + 1, CORRX) && tileUse(x, c[1])) prop(pick(['t_bang_1', 't_bang_2', 't_bang_3', 't_phuong_1']), x + 0.5, c[1] + 0.6)
    for (const c of CORRX) for (let y = 7; y < N - 2; y += 9) if (!inAny(y, CORRY) && !inAny(y + 1, CORRY) && !inR(y, RAILC) && tileUse(c[0], y)) prop(pick(['t_bang_1', 't_bang_2', 't_small_3']), c[0] + 0.5, y + 0.6)
    // trạm xe buýt (vỉa hè bắc đường B)
    for (const x of [6, 22, 41]) { for (let k = -1; k <= 1; k++) used.add((x + k) + ',29'); prop('p_shelter_x', x + 0.5, 29.5, { r: 0, bb: [x - 0.4, x + 1.4, 29.1, 29.9] }); colliders.push({ x: x + 0.5, y: 29.2, r: 0.42 }, { x: x - 0.1, y: 29.2, r: 0.3 }, { x: x + 1.1, y: 29.2, r: 0.3 }) }
    BUSSTOPS.push(...[6, 22, 41].map((x) => x + 0.5))
  }
  const BUSSTOPS = []

  function streetLife() {                                    // sạp cà phê, phở, xe máy đỗ trước cửa nhà
    for (const f of fronts) {
      let sx, sy, axis
      if (f.fam === 'R') { sx = f.gx + 3; sy = f.gy + f.F / 2; axis = 'y' } else { sx = f.gx + f.F / 2; sy = f.gy + 3; axis = 'x' }
      const tx = Math.floor(sx), ty = Math.floor(sy)
      if (!inAny(f.fam === 'R' ? tx : ty, f.fam === 'R' ? CORRX : CORRY) || inR(f.fam === 'R' ? ty : tx, RAILC) && false) continue
      if (kind[ty]?.[tx] !== 'walk' || !tileUse(tx, ty)) continue
      const r = rnd(), cx = tx + 0.5, cy = ty + 0.5
      if (f.shop) {
        if (r < 0.28) prop(pick(['p_cafe_red', 'p_cafe_green']), cx, cy)
        else if (r < 0.42) prop('p_pho', cx, cy)
        else if (r < 0.52) prop('p_banhmi', cx, cy)
        else if (r < 0.62) prop('p_stools', cx, cy)
        else if (r < 0.72) prop('p_fruit', cx, cy)
      } else if (r < 0.45) {
        for (let k = 0; k < 2; k++) { const i = Math.floor(rnd() * 6); const o = (k - 0.5) * 0.7; prop(`mop_${i}_${axis}`, axis === 'y' ? cx : cx + o, axis === 'y' ? cy + o : cy, { r: 0.2 }) }
      } else if (r < 0.55) prop('p_planter', cx, cy)
    }
  }

  function genLake() {
    for (let y = 17; y <= 26; y++) for (let x = 36; x <= 45; x++) { kind[y][x] = 'water'; occ[y][x] = true }
    for (let y = 16; y <= 27; y++) for (let x = 35; x <= 46; x++) if (kind[y][x] !== 'water') kind[y][x] = 'walk'
    for (let y = 20; y <= 24; y++) for (let x = 39; x <= 43; x++) { kind[y][x] = 'grass'; occ[y][x] = true }
    for (let y = 21; y <= 23; y++) for (let x = 40; x <= 42; x++) kind[y][x] = 'plaza'
    for (const [x, y] of [[43, 25], [44, 25], [43, 26], [44, 26]]) { kind[y][x] = 'grass'; occ[y][x] = true }
    for (let y = 22; y <= 23; y++) for (let x = 36; x <= 38; x++) { bridgeT.add(x + ',' + y); occ[y][x] = true }
    for (let y = 15; y <= 28; y++) for (const x of [34, 47]) { if (kind[y][x] === 'grass') occ[y][x] = true }
    // đền Ngọc Sơn, Tháp Rùa, cầu Thê Húc
    mark(40, 21, 3, 3); sprite('lm_temple', 40, 21)
    mark(44, 25, 1, 1); sprite('lm_turtle', 44, 25)
    for (let x = 36; x <= 38; x++) sprite('lm_bridge', x, 22, { flat: true })
    prop('lm_bridge_gate', 35.5, 22, { r: 0, bb: [35.3, 35.7, 22.0, 24.0] }); colliders.push({ x: 35.5, y: 22.15, r: 0.2 }, { x: 35.5, y: 23.85, r: 0.2 })
    // cây, ghế, đèn quanh hồ
    const ringTrees = [[34.5, 17], [34.5, 20], [34.5, 24], [34.5, 27], [47.5, 17], [47.5, 21], [47.5, 25], [47.5, 27.5], [37, 15.5], [41, 15.5], [45, 15.5], [37, 28.5], [41, 28.5], [45, 28.5]]
    ringTrees.forEach(([x, y], i) => prop(['t_lieu_1', 't_phuong_1', 't_lieu_2', 't_bang_2'][i % 4], x, y))
    for (const [x, y, n] of [[35.4, 19.5, 'p_bench_y'], [35.4, 25.5, 'p_bench_y'], [46.6, 19.5, 'p_bench_y'], [46.6, 24, 'p_bench_y'], [38, 16.5, 'p_bench_x'], [43.5, 16.5, 'p_bench_x'], [38.5, 27.5, 'p_bench_x'], [43.5, 27.5, 'p_bench_x']]) prop(n, x, y)
    for (const [x, y] of [[35.5, 17.5], [35.5, 27.5], [46.5, 17.5], [46.5, 27.5], [40.5, 16.5], [40.5, 27.5]]) prop('p_lamp', x, y)
    for (const [x, y] of [[41, 20.4], [42.4, 24.2], [39.4, 24.0], [40.0, 20.3]]) prop('t_small_2', x, y, { r: 0.3 })
    prop('p_flagpole', 36.4, 24.8); prop('p_cyclo', 47.0, 22.8)
    pois.push({ id: 'bridge', label: 'Cầu Thê Húc', gx: 36.5, gy: 23, r: 2 }, { id: 'temple', label: 'Đền Ngọc Sơn', gx: 41.5, gy: 24.6, r: 2 }, { id: 'tower', label: 'Tháp Rùa', gx: 44, gy: 24.3, r: 1.8 })
  }

  function genGate() {
    mark(22, 9, 1, 7, false); for (const y of [9, 10, 14, 15]) blk[y][22] = true
    sprite('lm_gate', 22, 9)
    pois.push({ id: 'gate', label: 'Ô Quan Chưởng', gx: 24.0, gy: 12.0, r: 2.2 })
    prop('p_flagpole', 20.6, 14.6); prop('p_flagpole', 24.4, 14.6)
  }

  function genMarket() {
    for (let y = 17; y <= 26; y++) for (let x = 19; x <= 26; x++) kind[y][x] = 'plaza'
    for (let y = 18; y <= 25; y++) for (let x = 20; x <= 25; x++) kind[y][x] = 'market'
    for (let y = 15; y <= 17; y++) for (let x = 23; x <= 24; x++) { kind[y][x] = 'plaza'; occ[y][x] = true }
    for (let y = 26; y <= 28; y++) for (let x = 23; x <= 24; x++) { kind[y][x] = 'plaza'; occ[y][x] = true }
    for (let y = 21; y <= 22; y++) for (let x = 17; x <= 19; x++) { kind[y][x] = 'plaza'; occ[y][x] = true }
    for (let y = 18; y <= 25; y++) for (let x = 20; x <= 25; x++) occ[y][x] = true
    const col1 = [['p_umb_red', 19.3], ['p_pho', 21.9], ['p_umb_yellow', 24.5]], col2 = [['p_banhmi', 19.3], ['p_umb_teal', 21.9], ['p_fruit', 24.5]]
    for (const [n, y] of col1) prop(n, 21.0, y); for (const [n, y] of col2) prop(n, 25.0, y)
    prop('p_stools', 23.5, 20.4); prop('p_stools', 23.6, 23.4); prop('p_lamp', 22.3, 18.3); prop('p_lamp', 24.8, 25.3); prop('p_umb_orange', 23.5, 18.4, { r: 0.4 })
    pois.push({ id: 'market', label: 'Chợ phố cổ', gx: 23.5, gy: 22, r: 2.4 })
  }

  function genPark() {
    const b = { x0: 34, x1: 47, y0: 56, y1: 63 }
    for (let x = b.x0; x <= b.x1; x++) for (let y = 59; y <= 60; y++) { kind[y][x] = 'walk' }
    for (let y = b.y0; y <= b.y1; y++) for (let x = 40; x <= 41; x++) { kind[y][x] = 'walk' }
    for (let y = 59; y <= 60; y++) for (let x = 40; x <= 41; x++) kind[y][x] = 'plaza'
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) occ[y][x] = true
    const T = ['t_bang_1', 't_bang_2', 't_bang_3', 't_phuong_2', 't_small_1', 't_small_2', 't_lieu_2']
    for (const [x, y] of [[35.5, 57.5], [38, 57], [44, 57.5], [46, 57], [35.5, 62], [37.5, 61.5], [44, 62], [46.2, 61.5], [36.5, 59.4 + 2.6], [45.2, 59.6 + 2.4]]) prop(pick(T), x, y)
    for (const [x, y] of [[37, 61], [43, 57.2], [38.4, 57.4], [44.6, 62]]) prop('t_bush_2', x, y, { r: 0.25 })
    for (const [x, y, n] of [[37.5, 59.5, 'p_bench_x'], [44, 59.5, 'p_bench_x'], [40.4, 57.5, 'p_bench_y'], [41.6, 62, 'p_bench_y']]) prop(n, x, y)
    for (const [x, y] of [[39.5, 59.0], [42.5, 61.0], [39.4, 61.1], [42.6, 58.9]]) prop('p_planter', x, y)
    for (const [x, y] of [[38.5, 58.5], [43.5, 58.5], [38.5, 61.5], [43.5, 61.5]]) prop('p_lamp', x, y)
    pois.push({ id: 'park', label: 'Công viên', gx: 41, gy: 60, r: 2.4 })
  }

  function genTowers() {
    mark(56, 3, 3, 3); sprite('tower_a', 56, 3)
    mark(56, 19, 3, 3); sprite('tower_a', 56, 19)
    mark(56, 59, 2, 3); sprite('tower_b', 56, 59)
    pois.push({ id: 'glass', label: 'Khu cao ốc', gx: 59.5, gy: 6.5, r: 2.4 })
  }

  function genBlocks() {
    const B = (i, j) => ({ x0: BLOCKX[i][0], x1: BLOCKX[i][1], y0: BLOCKY[j][0], y1: BLOCKY[j][1] })
    for (const [i, j, mix] of [[0, 0, 'old'], [1, 0, 'old'], [2, 0, 'mid'], [0, 1, 'old'], [1, 1, 'old'], [0, 2, 'rail'], [1, 2, 'rail'], [2, 2, 'rail'], [3, 2, 'rail'], [0, 3, 'rail'], [1, 3, 'rail'], [2, 3, 'rail'], [3, 3, 'rail'], [0, 4, 'mid'], [1, 4, 'mid']]) {
      const b = B(i, j); perimeter(b, { mix, shop: j >= 2 && j <= 3 ? 0.4 : 0.55 }); interior(b, mix)
    }
    modernBlock(B(3, 0)); modernBlock(B(3, 1)); modernBlock(B(3, 4))
  }

  // ───────── mặt đất → tên ô ─────────
  function nameTiles() {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = kind[y][x]; let n
      const nb = (dx, dy) => (kind[y + dy] && kind[y + dy][x + dx]) || null
      if (k === 'road') n = 'g_asphalt'
      else if (k === 'dash_x') n = 'g_dash_x'; else if (k === 'dash_y') n = 'g_dash_y'
      else if (k === 'zebra_x') n = 'g_zebra_x'; else if (k === 'zebra_y') n = 'g_zebra_y'
      else if (k === 'railroad') n = 'g_railroad'; else if (k === 'rail') n = 'g_rail'; else if (k === 'gravel') n = 'g_gravel'
      else if (k === 'walk') { const m = (roadLike.has(nb(0, -1)) ? 1 : 0) | (roadLike.has(nb(1, 0)) ? 2 : 0) | (roadLike.has(nb(0, 1)) ? 4 : 0) | (roadLike.has(nb(-1, 0)) ? 8 : 0); n = 'g_walk_m' + m }
      else if (k === 'plaza') n = 'g_plaza_' + ((x + y) & 1)
      else if (k === 'market') n = 'g_market_' + ((x * 3 + y) & 1)
      else if (k === 'water') { const m = (nb(0, -1) !== 'water' ? 1 : 0) | (nb(1, 0) !== 'water' ? 2 : 0) | (nb(0, 1) !== 'water' ? 4 : 0) | (nb(-1, 0) !== 'water' ? 8 : 0); n = 'WATER' + m }
      else n = 'g_grass_' + (rnd() < 0.1 ? 1 : 0)
      tname[y][x] = n
    }
  }

  // ───────── sắp xếp độ sâu ─────────
  const behind = (a, b) => (a[1] <= b[0] + 0.02 && !(a[2] >= b[3] - 0.02)) || (a[3] <= b[2] + 0.02 && !(a[0] >= b[1] - 0.02))
  const overlap = (a, b) => a.dx < b.dx + b.w && b.dx < a.dx + a.w && a.dy < b.dy + b.h && b.dy < a.dy + a.h
  let statSorted = []
  function sortStatics() {
    const list = statics.filter((s) => !s.flat), n = list.length, state = new Array(n).fill(0), out = []
    const order = list.map((s, i) => i).sort((p, q) => (list[p].bb[1] + list[p].bb[3]) - (list[q].bb[1] + list[q].bb[3]))
    const before = Array.from({ length: n }, () => [])
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = list[i], b = list[j]
      if (!overlap(a, b)) continue
      if (behind(a.bb, b.bb)) before[j].push(i); else if (behind(b.bb, a.bb)) before[i].push(j)
    }
    const visit = (i) => { if (state[i]) return; state[i] = 1; for (const j of before[i]) visit(j); out.push(list[i]) }
    for (const i of order) visit(i)
    statSorted = out
  }

  // ───────── xe cộ ─────────
  const LANES = []
  const SUF = (axis, dir) => axis === 'x' ? (dir > 0 ? 'px' : 'nx') : (dir > 0 ? 'py' : 'ny')
  const ph = { t: 0, i: 0 }; const PH_DUR = [9, 2, 9, 2]
  const crossings = ROADX.map((r) => ({ x0: r[0], down: false, flash: 0 }))
  const train = { state: 'wait', t: 6, dir: 1, head: 0, speed: 5.2, cars: [], len: 0 }
  function newVeh(lane, pos) {
    const t = rnd(), v = { lane, pos, v: 0, lat: 0, dwell: 0, visited: new Set() }
    if (t < 0.68) { v.type = 'moto'; v.len = 0.83; v.vmax = rr(2.3, 3.3); v.sp = `mo_${Math.floor(rnd() * 6)}_`; v.lat = rr(-0.28, 0.28) }
    else if (t < 0.9) { v.type = 'car'; v.len = 1.72; v.vmax = rr(2.1, 2.8); v.sp = `car_${Math.floor(rnd() * 5)}_`; v.lat = rr(-0.1, 0.1) }
    else { v.type = 'bus'; v.len = 3.39; v.vmax = rr(1.7, 2.1); v.sp = `bus_${pick(['a', 'b', 'c'])}_`; v.lat = rr(-0.05, 0.05) }
    v.name = v.sp + SUF(lane.axis, lane.dir); return v
  }
  function genTraffic() {
    for (const r of ROADY) { LANES.push({ axis: 'x', dir: 1, c: r[0] + 2.5, vs: [], stops: [] }); LANES.push({ axis: 'x', dir: -1, c: r[0] + 0.5, vs: [], stops: [] }) }
    for (const r of ROADX) { LANES.push({ axis: 'y', dir: 1, c: r[0] + 0.5, vs: [], stops: [] }); LANES.push({ axis: 'y', dir: -1, c: r[0] + 2.5, vs: [], stops: [] }) }
    for (const L of LANES) {
      const corr = L.axis === 'x' ? CORRX : CORRY
      for (const c of corr) L.stops.push({ pos: L.dir > 0 ? c[0] - 0.1 : c[1] + 1.1, closed: () => (L.axis === 'x' ? ph.i !== 0 : ph.i !== 2) })
      if (L.axis === 'y') {
        const k = ROADX.findIndex((r) => inR(Math.floor(L.c), r))
        L.stops.push({ pos: L.dir > 0 ? 39.9 : 45.1, closed: () => crossings[k].down })
      }
      const n = 6 + Math.floor(rnd() * 3), span = N + 10
      for (let i = 0; i < n; i++) { const p = -5 + (i + rnd() * 0.6) * span / n; L.vs.push(newVeh(L, L.dir > 0 ? p : N - p + 0)) }
    }
  }
  function stepTraffic(dt) {
    ph.t += dt; if (ph.t > PH_DUR[ph.i]) { ph.t = 0; ph.i = (ph.i + 1) % 4 }
    const P = (typeof Game !== 'undefined' && Game.state && Game.state.player) || null
    for (const L of LANES) {
      L.vs.sort((a, b) => (b.pos - a.pos) * L.dir)
      for (let i = 0; i < L.vs.length; i++) {
        const v = L.vs[i], lead = L.vs[i - 1]
        let tv = v.vmax
        if (v.dwell > 0) { v.dwell -= dt; tv = 0 }
        if (lead) { const gap = (lead.pos - v.pos) * L.dir - (lead.len + v.len) / 2; if (gap < 0.3) tv = 0; else if (gap < 1.6) tv = Math.min(tv, (gap - 0.3) * 2.2) }
        const front = v.pos + L.dir * v.len / 2
        for (const s of L.stops) { const d = (s.pos - front) * L.dir; if (d > -0.05 && d < 7 && s.closed()) { if (d < 0.12) tv = 0; else tv = Math.min(tv, d * 1.8) } }
        if (P) { const along = (L.axis === 'x' ? P.gx : P.gy), lat = (L.axis === 'x' ? P.gy : P.gx), d = (along - front) * L.dir; if (d > -0.3 && d < 1.7 && Math.abs(lat - (L.c + v.lat)) < 0.85) tv = 0 }
        if (v.type === 'bus' && L.axis === 'x' && L.dir < 0 && L.c === 30.5) for (const bx of BUSSTOPS) if (!v.visited.has(bx) && Math.abs(v.pos - bx) < 0.3) { v.visited.add(bx); v.dwell = 3.5 }
        v.v += clamp(tv - v.v, -dt * 6.5, dt * 2.2); v.pos += L.dir * v.v * dt
        if (L.dir > 0 && v.pos > N + 5) { Object.assign(v, newVeh(L, -5 - rnd() * 4)) }
        else if (L.dir < 0 && v.pos < -5) { Object.assign(v, newVeh(L, N + 5 + rnd() * 4)) }
      }
    }
  }

  // ───────── tàu hỏa + thanh chắn ─────────
  const CAR_LEN = { loco: 118 / 36, coach: 132 / 36 }, GAP = 0.22
  function trainReset(dir) {
    train.dir = dir; train.cars = ['loco', 'coach', 'coach', 'coach', 'coach'].map((t) => ({ t, len: CAR_LEN[t] }))
    train.len = train.cars.reduce((s, c) => s + c.len, 0) + GAP * (train.cars.length - 1)
    train.head = dir > 0 ? 0 : N; train.state = 'run'; train.speed = rr(4.6, 5.6)
  }
  function stepTrain(dt) {
    if (train.state === 'wait') { train.t -= dt; if (train.t <= 0) trainReset(rnd() < 0.5 ? 1 : -1) }
    else {
      train.head += train.dir * train.speed * dt
      const done = train.dir > 0 ? train.head - train.len > N + 1 : train.head + train.len < -1
      if (done) { train.state = 'wait'; train.t = rr(14, 24) }
    }
    const xmin = train.dir > 0 ? train.head - train.len : train.head, xmax = train.dir > 0 ? train.head : train.head + train.len
    for (const c of crossings) {
      const xc = c.x0 + 1.5; let down = false
      if (train.state === 'run') down = train.dir > 0 ? (train.head > xc - 17 && xmin < xc + 4) : (train.head < xc + 17 && xmax > xc - 4)
      c.down = down; c.flash += dt
    }
    // người đứng trên đường ray khi tàu tới: đưa về vỉa hè
    const P = typeof Game !== 'undefined' && Game.state && Game.state.player
    if (P && train.state === 'run' && P.gy > 41.2 && P.gy < 43.8 && P.gx > xmin - 0.6 && P.gx < xmax + 0.6) { P.gx = clamp(P.gx, 0.5, N - 0.5); P.gy = 40.5; Game.toast('Tàu đang tới! Bạn được đưa vào vỉa hè an toàn.') }
  }
  function trainDrawables() {
    const out = []; let off = 0
    for (const c of train.cars) {
      const cx = train.dir > 0 ? train.head - off - c.len / 2 : train.head + off + c.len / 2; off += c.len + GAP
      const name = c.t === 'loco' ? (train.dir > 0 ? 'loco_px' : 'loco_nx') : 'coach_px'
      out.push(vehDrawable(name, cx, RAIL_Y + 0.5, 'train'))
    }
    return out
  }
  function vehDrawable(name, cx, cy, clipKind, lift = 0) {
    const m = MAN[name]; if (!m) return null; const fp = m.fp, gx = cx - fp[0] / 2, gy = cy - fp[1] / 2, [sx, sy] = proj(gx, gy)
    return { name, img: IMG[name], dx: Math.round(sx - m.pivot[0]), dy: Math.round(sy - m.pivot[1] - lift), w: m.w, h: m.h, bb: [gx, gx + fp[0], gy, gy + fp[1]], clip: clipKind, gx: cx, gy: cy }
  }

  // ───────── va chạm cho người chơi ─────────
  function isBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) return true
    if (blk[ty][tx]) return true
    if (kind[ty][tx] === 'water' && !bridgeT.has(tx + ',' + ty)) return true
    if ((ty === RAILC[0] || ty === RAILC[1])) for (const c of crossings) if (c.down && tx >= c.x0 && tx <= c.x0 + 2) return true
    return false
  }
  const groundZ = (gx, gy) => bridgeT.has(Math.floor(gx) + ',' + Math.floor(gy)) ? 9 : 0

  // ───────── vẽ ─────────
  let cv, ctx, hud, last = 0, T = 0, tod = 0
  const TOD_TINT = ['#ffffff', '#f3c9a0', '#6a76b4']
  function clipMap(ox, oy, sh) {
    const A = [0, -sh], B = [36 * N + sh, 18 * N - sh / 2], C = [0, 36 * N], D = [-36 * N - sh, 18 * N - sh / 2]
    ctx.beginPath(); ctx.moveTo(A[0] + ox, A[1] + oy); for (const p of [B, C, D]) ctx.lineTo(p[0] + ox, p[1] + oy); ctx.closePath(); ctx.clip()
  }
  function cable(a, b, ox, oy, off, sag) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])); ctx.fillStyle = '#16171b'
    for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(a[0] + (b[0] - a[0]) * t + ox), Math.round(a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t) + oy + off), 1, 1) }
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt
    stepTraffic(dt); stepTrain(dt); Game.update(dt)
    const z = cam.zoom, w = Math.ceil(innerWidth / z), h = Math.ceil(innerHeight / z)
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#1b1d23'; ctx.fillRect(0, 0, w, h)
    const ox = Math.round(w / 2 - cam.x), oy = Math.round(h / 2 - cam.y); Game.view = { w, h, ox, oy }
    const wf = Math.floor(T / 0.7) & 1
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const sx = (x - y) * 36 - 36 + ox, sy = (x + y) * 18 + oy
      if (sx > w || sx < -72 || sy > h || sy < -36) continue
      let n = tname[y][x]; if (n[0] === 'W') n = `g_water_m${n.slice(5)}_${wf}`
      ctx.drawImage(IMG[n], sx, sy)
    }
    for (const s of statics) if (s.flat && s.dx + ox < w && s.dx + s.w + ox > 0 && s.dy + oy < h && s.dy + s.h + oy > 0) ctx.drawImage(s.img, s.dx + ox, s.dy + oy)
    // danh sách vẽ: tĩnh (đã sắp) + động (chèn theo quan hệ trước/sau)
    const vis = []
    for (const s of statSorted) if (s.dx + ox < w && s.dx + s.w + ox > 0 && s.dy + oy < h && s.dy + s.h + oy > 0) vis.push(s)
    const dyn = []
    for (const c of crossings) {
      const st = c.down ? (Math.floor(c.flash / 0.4) & 1 ? 'a' : 'b') : 'up'
      dyn.push(barrierD(`p_barrier_p_${st}`, c.x0 - 0.5, 40.5), barrierD(`p_barrier_n_${st}`, c.x0 + 3.5, 44.5))
    }
    for (const L of LANES) for (const v of L.vs) {
      const cx = L.axis === 'x' ? v.pos : L.c + v.lat, cy = L.axis === 'x' ? L.c + v.lat : v.pos
      if (cx < -3 || cx > N + 3 || cy < -3 || cy > N + 3) continue
      const d = vehDrawable(v.name, cx, cy, 'veh'); if (d) dyn.push(d)
    }
    if (train.state === 'run') for (const d of trainDrawables()) if (d) dyn.push(d)
    const pl = []; Game.pushDrawable(pl); for (const p of pl) dyn.push(p)
    let nveh = 0
    for (const d of dyn) {
      if (d.dx === undefined) { d.dx = Math.round(proj(d.gx, d.gy)[0] - d.ox); d.dy = Math.round(proj(d.gx, d.gy)[1] - d.oy); d.w = d.c.width; d.h = d.c.height; d.img = d.c }
      if (d.dx + ox > w || d.dx + d.w + ox < 0 || d.dy + oy > h || d.dy + d.h + oy < 0) continue
      let lo = 0, hi = vis.length
      for (let i = 0; i < vis.length; i++) { const s = vis[i]; if (!overlap(d, s)) continue; if (behind(s.bb, d.bb)) lo = i + 1; else if (behind(d.bb, s.bb) && i < hi) hi = i }
      vis.splice(hi < lo ? hi : lo, 0, d); if (d.clip) nveh++
    }
    stats.objs = vis.length; stats.vehicles = nveh
    for (const o of vis) {
      const edge = o.clip && (o.gx < 6 || o.gx > N - 6 || o.gy < 6 || o.gy > N - 6)
      if (edge) { ctx.save(); clipMap(ox, oy, o.clip === 'train' ? 52 : 40) }
      ctx.drawImage(o.img, o.dx + ox, o.dy + oy)
      if (edge) ctx.restore()
    }
    // người chơi bị nhà che: vẽ thêm một bóng mờ lên trên để luôn nhìn thấy
    const pd = pl[0]
    if (pd) { const i0 = vis.indexOf(pd); if (i0 >= 0) { for (let i = i0 + 1; i < vis.length; i++) if (!vis[i].clip && overlap(pd, vis[i])) { ctx.globalAlpha = 0.55; ctx.drawImage(pd.img, pd.dx + ox, pd.dy + oy); ctx.globalAlpha = 1; break } } }
    // dây điện giữa các cột
    for (const a of poles) for (const b of poles) {
      if (a.axis !== b.axis) continue
      const d = a.axis === 'x' ? (b.gx - a.gx) * (Math.abs(b.gy - a.gy) < 0.1) : (b.gy - a.gy) * (Math.abs(b.gx - a.gx) < 0.1)
      if (d <= 0 || d > 7) continue
      const pa = proj(a.gx, a.gy), pb = proj(b.gx, b.gy); pa[1] -= 96; pb[1] -= 96
      if (Math.max(pa[0], pb[0]) + ox < 0 || Math.min(pa[0], pb[0]) + ox > w) continue
      for (let k = 0; k < 3; k++) cable([pa[0] + k - 1, pa[1] + k * 3], [pb[0] + k - 1, pb[1] + k * 3], ox, oy, 0, d * 3)
    }
    drawSignals(ox, oy)
    if (tod) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = TOD_TINT[tod]; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over' }
    stats.fps = Math.round(1 / Math.max(0.001, dt))
    hud.textContent = `Hà Nội ${N}x${N}   fps ${stats.fps}   vật thể ${stats.objs}   xe ${stats.vehicles}\n${train.state === 'run' ? 'tàu hỏa đang chạy' : 'tàu hỏa còn ' + Math.ceil(train.t) + 's'}   [wheel zoom · T giờ trong ngày · H ẩn]\n` + Game.hudLine()
  }
  function barrierD(name, gx, gy) { const m = MAN[name]; if (!m) return { dx: 0, dy: 0, w: 1, h: 1, bb: [0, 0, 0, 0], img: IMG.g_asphalt } ; const [sx, sy] = proj(gx, gy); return { name, img: IMG[name], dx: Math.round(sx - m.pivot[0]), dy: Math.round(sy - m.pivot[1]), w: m.w, h: m.h, bb: [gx - 0.2, gx + 0.2, gy - 0.2, gy + 0.2] } }
  function drawSignals(ox, oy) {
    const ew = ph.i === 0 ? '#3ad06a' : ph.i === 1 ? '#e8c43a' : '#e8483a', ns = ph.i === 2 ? '#3ad06a' : ph.i === 3 ? '#e8c43a' : '#e8483a'
    for (const cx of CORRX) for (const cy of [CORRY[0], CORRY[1], CORRY[2]]) for (const [x, y, c] of [[cx[0], cy[0], ew], [cx[1], cy[1], ew], [cx[1], cy[0], ns], [cx[0], cy[1], ns]]) {
      const [sx, sy] = proj(x + 0.5, y + 0.5); const X = Math.round(sx + ox), Y = Math.round(sy + oy)
      ctx.fillStyle = '#2a3b4a'; ctx.fillRect(X - 1, Y - 30, 2, 30); ctx.fillStyle = '#1c1822'; ctx.fillRect(X - 3, Y - 36, 6, 7); ctx.fillStyle = c; ctx.fillRect(X - 2, Y - 35, 4, 4)
    }
  }

  // ───────── khởi động ─────────
  function generate() {
    genGround(); genGate(); genLake(); genMarket(); genPark(); genTowers(); genBlocks(); streets(); streetLife(); nameTiles(); sortStatics(); genTraffic()
  }
  function start(canvas, hudEl) {
    cv = canvas; ctx = cv.getContext('2d'); hud = hudEl
    const [cx, cy] = proj(25.5, 10.5); cam.x = cx; cam.y = cy
    if (innerWidth < 700) { cam.zoom = 1; hud.style.display = 'none' }
    Game.init({ W: { ground: kind }, N, proj, cam, tile: () => [TW, TH], isBlocked, colliders, groundZ, spawn: [25.5, 10.5] })
    const found = new Set()
    const sync = () => { Game.extraHud = `khám phá ${found.size}/${pois.length}` }; sync()
    pois.push({ id: 'rail', label: 'Phố Tàu hỏa', gx: 31.5, gy: 40.4, r: 2.4 })
    for (const p of pois) Game.registerPOI({ ...p, onInteract: (q) => { found.add(q.id); sync(); Game.toast(found.size === pois.length ? `${q.label} — bạn đã khám phá đủ ${pois.length} địa danh!` : `${q.label} — đã khám phá ${found.size}/${pois.length}`) } })
    let drag = null
    cv.addEventListener('pointerdown', (e) => { if (Game.mode === 'play') { Game.pointer(e, 'down'); return } drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; cv.setPointerCapture(e.pointerId) })
    cv.addEventListener('pointermove', (e) => { if (Game.mode === 'play') { Game.pointer(e, 'move'); return } if (drag) { cam.x = drag.cx - (e.clientX - drag.x) / cam.zoom; cam.y = drag.cy - (e.clientY - drag.y) / cam.zoom } })
    cv.addEventListener('pointerup', () => { drag = null })
    cv.addEventListener('wheel', (e) => { e.preventDefault(); cam.zoom = clamp(cam.zoom + (e.deltaY < 0 ? 1 : -1), 1, 5) }, { passive: false })
    addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (k === 't') tod = (tod + 1) % 3; if (k === 'h') hud.style.display = hud.style.display === 'none' ? '' : 'none' })
    window.addEventListener('error', (e) => stats.errors.push(String(e.message)))
    window.__world = { statics, train, crossings, LANES, kind, ph, cam, stats, isBlocked, setTod: (v) => { tod = v }, forceTrain: (dir) => trainReset(dir || 1), frame: (t) => frame(t), step: (dt, n = 1) => { for (let i = 0; i < n; i++) { stepTraffic(dt); stepTrain(dt); Game.update(dt) } } }
    window.__stats = stats; window.__ready = true
    last = performance.now()
    ;(function loop(now) { try { frame(now) } catch (e) { stats.errors.push(String(e.stack || e)); hud.textContent = 'lỗi: ' + e.message; return } requestAnimationFrame(loop) })(last)
  }
  return { load, generate, start, cam, stats, N, proj }
})()

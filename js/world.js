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
    await Promise.all(['down', 'up', 'right'].flatMap((d) => [0, 1, 2, 3].map((f) => new Promise((res) => { const i = new Image(); i.onload = () => { PL[d + f] = i; res() }; i.onerror = () => res(); i.src = `assets/player/pl_${d}_${f}.png` }))))
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
    const s = { name, img: IMG[name], dx: Math.round(sx - m.pivot[0]), dy: Math.round(sy - m.pivot[1]), w: m.w, h: m.h, bb, flat: !!o.flat, sh: shadowSpec(name) }
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
    if (name === 'p_lamp') lamps.push({ gx, gy })
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
    for (let y = 15; y <= 28; y++) for (let x = 34; x <= 47; x++) occ[y][x] = true
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
    prop('p_flagpole', 35.4, 25.2); prop('p_cyclo', 47.0, 22.8)
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

  function fillGaps() {                                       // lấp các ô trống kín trong khu nhà bằng nhà / bụi cây
    const inBlock = (x, y) => BLOCKX.some((r) => inR(x, r)) && BLOCKY.some((r) => inR(y, r))
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (occ[y][x] || kind[y][x] !== 'grass' || !inBlock(x, y)) continue
      let ok = false
      for (const [fam, F] of [['R', 2], ['R', 1], ['L', 2], ['L', 1]]) if (house(fam, F, wfloors(MIX.mid), pick(WALLS), false, x, y)) { ok = true; break }
      if (!ok) { mark(x, y, 1, 1); prop('t_bush_1', x + 0.5, y + 0.55, { r: 0.2 }) }
    }
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
    const peds = pedList()
    for (const L of LANES) {
      L.vs.sort((a, b) => (b.pos - a.pos) * L.dir)
      for (let i = 0; i < L.vs.length; i++) {
        const v = L.vs[i], lead = L.vs[i - 1]
        let tv = v.vmax
        if (v.dwell > 0) { v.dwell -= dt; tv = 0 }
        if (lead) { const gap = (lead.pos - v.pos) * L.dir - (lead.len + v.len) / 2; if (gap < 0.3) tv = 0; else if (gap < 1.6) tv = Math.min(tv, (gap - 0.3) * 2.2) }
        const front = v.pos + L.dir * v.len / 2
        for (const s of L.stops) { const d = (s.pos - front) * L.dir; if (d > -0.05 && d < 7 && s.closed()) { if (d < 0.12) tv = 0; else tv = Math.min(tv, d * 1.8) } }
        for (const P of peds) { const along = (L.axis === 'x' ? P.gx : P.gy), lat = (L.axis === 'x' ? P.gy : P.gx), d = (along - front) * L.dir; if (d > -0.3 && d < 1.7 && Math.abs(lat - (L.c + v.lat)) < 0.8 && roadLike.has(kind[clamp(Math.floor(P.gy), 0, N - 1)][clamp(Math.floor(P.gx), 0, N - 1)])) { tv = 0; break } }
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
    return { name, img: IMG[name], dx: Math.round(sx - m.pivot[0]), dy: Math.round(sy - m.pivot[1] - lift), w: m.w, h: m.h, bb: [gx, gx + fp[0], gy, gy + fp[1]], clip: clipKind, gx: cx, gy: cy, sh: vehSh(name) }
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

  // ───────── giờ trong ngày, thời tiết ─────────
  const sky = { hour: 15.5, auto: false, speed: 0.06, weather: 'sunny', cloud: 0, rain: 0, storm: 0, wxTimer: 80, autoWx: true, flash: 0, nextFlash: 7 }
  const WXD = { sunny: [0, 0, 0], cloudy: [1, 0, 0], rain: [1, 1, 0], storm: [1, 1, 1] }
  const WXNAME = { sunny: 'nắng', cloudy: 'nhiều mây', rain: 'mưa', storm: 'mưa giông' }
  const GRADE = [[0, '#3a4880'], [5, '#4a5590'], [6.5, '#eab9a0'], [8, '#fff0dc'], [11, '#ffffff'], [15.5, '#fff2da'], [17.5, '#ffcd98'], [19, '#c68ea4'], [20.5, '#58639c'], [24, '#3a4880']]
  const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  const mixc = (a, b, t) => { const A = hex2(a), B = hex2(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('') }
  function gradeAt(h) { for (let i = 1; i < GRADE.length; i++) if (h <= GRADE[i][0]) { const [h0, c0] = GRADE[i - 1], [h1, c1] = GRADE[i]; return mixc(c0, c1, (h - h0) / (h1 - h0)) } return GRADE[GRADE.length - 1][1] }
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
  const nightAt = (h) => h < 5 ? 1 : h < 7 ? 1 - ss(5, 7, h) : h < 18 ? 0 : h < 20.5 ? ss(18, 20.5, h) : 1
  function stepSky(dt) {
    if (sky.auto) sky.hour = (sky.hour + sky.speed * dt) % 24
    const tg = WXD[sky.weather], k = Math.min(1, dt * 0.5)
    sky.cloud += (tg[0] - sky.cloud) * k; sky.rain += (tg[1] - sky.rain) * k; sky.storm += (tg[2] - sky.storm) * k
    if (sky.autoWx) { sky.wxTimer -= dt; if (sky.wxTimer <= 0) { sky.wxTimer = 70 + Math.random() * 80; const r = Math.random(); sky.weather = r < 0.45 ? 'sunny' : r < 0.7 ? 'cloudy' : r < 0.92 ? 'rain' : 'storm' } }
    sky.flash = Math.max(0, sky.flash - dt * 2.8)
    if (sky.storm > 0.6) { sky.nextFlash -= dt; if (sky.nextFlash <= 0) { sky.flash = 1; sky.nextFlash = 5 + Math.random() * 8 } }
  }
  const drops = Array.from({ length: 480 }, () => ({ u: Math.random(), v: Math.random(), s: 0.7 + Math.random() * 0.6 }))
  const ripples = []
  function drawRipples(dt, w, h) {
    if (sky.rain > 0.2 && ripples.length < 90) for (let i = 0; i < 2; i++) if (Math.random() < sky.rain * 0.9) ripples.push({ x: Math.random() * w, y: Math.random() * h, t: 0 })
    ctx.lineWidth = 1
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.t += dt * 1.6; if (r.t >= 1) { ripples.splice(i, 1); continue }
      ctx.strokeStyle = `rgba(225,238,255,${0.55 * (1 - r.t)})`; ctx.beginPath(); ctx.ellipse(Math.round(r.x), Math.round(r.y), 1 + r.t * 9, (1 + r.t * 9) / 2, 0, 0, 6.283); ctx.stroke()
    }
  }
  function drawRain(dt, w, h) {
    const n = Math.floor(drops.length * sky.rain * Math.min(1, (w * h) / 350000 + 0.35))
    ctx.fillStyle = 'rgba(205,222,245,0.62)'
    for (let i = 0; i < n; i++) {
      const d = drops[i]; d.v += dt * d.s * 1.5; d.u -= dt * d.s * 0.2; if (d.v > 1.05) { d.v = -0.05; d.u = Math.random() * 1.2 } if (d.u < -0.05) d.u += 1.1
      const x = d.u * w, y = d.v * h, len = 6 + Math.round(d.s * 5)
      for (let k = 0; k < len; k++) ctx.fillRect((x - k * 0.4) | 0, (y - k) | 0, 1, 1)
    }
  }

  // ───────── bóng đổ ─────────
  const shC = document.createElement('canvas'), shX = shC.getContext('2d')
  function shadowSpec(name) {
    if (/^(h_|m_|tower_|lm_gate|lm_temple|lm_turtle)/.test(name)) return { t: 'box', H: MAN[name].pivot[1] * 0.86 }
    if (name.startsWith('t_')) { const ty = name.split('_')[1]; return { t: 'tree', H: { bang: 82, small: 48, phuong: 76, lieu: 70, bush: 12 }[ty] || 60, r: { bang: 0.95, small: 0.55, phuong: 1.05, lieu: 0.7, bush: 0.35 }[ty] || 0.6 } }
    if (name === 'p_lamp') return { t: 'pole', H: 68 }
    if (name === 'p_pole') return { t: 'pole', H: 104 }
    if (name === 'p_flagpole') return { t: 'pole', H: 80 }
    if (name.startsWith('mop_')) return { t: 'box', H: 18 }
    if (/^p_(pho|banhmi|umb|fruit|cafe|kiosk)/.test(name)) return { t: 'blob', H: 44, r: 0.6 }
    if (/^p_(bench|bin|planter|stools|cyclo)/.test(name)) return { t: 'blob', H: 14, r: 0.35 }
    if (name.startsWith('p_shelter')) return { t: 'box', H: 42 }
    return null
  }
  const VEH_H = { mo: 30, ca: 24, bu: 48, lo: 44, co: 38 }
  const vehSh = (name) => ({ t: 'box', H: VEH_H[name.slice(0, 2)] || 24 })
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (pts.length < 3) return pts
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = []
    for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p) }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p) }
    lo.pop(); up.pop(); return lo.concat(up)
  }
  function sunState() {
    const h = sky.hour, d = clamp((h - 6) / 12, 0, 1), a = (135 - 180 * d) * Math.PI / 180, e = Math.sin(Math.PI * d), night = nightAt(h)
    const dim = (1 - sky.cloud * 0.55) * (1 - sky.rain * 0.4)
    const alpha = 0.36 * Math.sqrt(Math.max(0, e)) * dim + 0.1 * night * (1 - sky.cloud * 0.5)
    const k = e > 0.05 ? 0.3 + (1 - e) * 1.5 : 1.2
    const ang = night > 0.6 ? Math.PI / 4 : a
    return { dx: Math.cos(ang), dy: Math.sin(ang), k, alpha, e, night }
  }
  function shadowPoly(o, S) {
    const s = o.sh; if (!s) return null
    const v = (H, f = 1) => [S.dx * H / 36 * S.k * f, S.dy * H / 36 * S.k * f], pts = []
    const cx = (o.bb[0] + o.bb[1]) / 2, cy = (o.bb[2] + o.bb[3]) / 2
    if (s.t === 'box') { const [vx, vy] = v(s.H); for (const [x, y] of [[o.bb[0], o.bb[2]], [o.bb[1], o.bb[2]], [o.bb[1], o.bb[3]], [o.bb[0], o.bb[3]]]) { pts.push(proj(x, y)); pts.push(proj(x + vx, y + vy)) } }
    else if (s.t === 'pole') { const [vx, vy] = v(s.H); for (const [dx, dy] of [[-0.07, -0.07], [0.07, 0.07]]) { pts.push(proj(cx + dx, cy + dy)); pts.push(proj(cx + dx + vx, cy + dy + vy)) } }
    else { const [vx, vy] = v(s.H, s.t === 'tree' ? 0.85 : 0.7), r0 = s.t === 'tree' ? 0.3 : s.r * 0.6; for (let i = 0; i < 8; i++) { const c = Math.cos(i * 0.785), sn = Math.sin(i * 0.785); pts.push(proj(cx + c * r0, cy + sn * r0)); pts.push(proj(cx + vx + c * s.r, cy + vy + sn * s.r)) } }
    return hull(pts)
  }
  function drawShadows(vis, ox, oy, w, h) {
    const S = sunState(); if (S.alpha < 0.02) return
    shX.clearRect(0, 0, w, h); shX.fillStyle = '#0b1830'
    for (const o of vis) {
      if (o.dx + ox > w + 200 || o.dx + o.w + ox < -200 || o.dy + oy > h + 200 || o.dy + o.h + oy < -200) continue
      const p = shadowPoly(o, S); if (!p || p.length < 3) continue
      shX.beginPath(); shX.moveTo(p[0][0] + ox, p[0][1] + oy); for (let i = 1; i < p.length; i++) shX.lineTo(p[i][0] + ox, p[i][1] + oy); shX.closePath(); shX.fill()
    }
    ctx.save(); clipMap(ox, oy, 0); ctx.globalAlpha = S.alpha; ctx.drawImage(shC, 0, 0); ctx.restore()
  }

  // ───────── nhìn xuyên vật che người chơi ─────────
  const maskCache = new WeakMap(), scratch = document.createElement('canvas'), sctx = scratch.getContext('2d')
  function alphaMask(img) { let m = maskCache.get(img); if (!m) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); m = { w: c.width, d: x.getImageData(0, 0, c.width, c.height).data }; maskCache.set(img, m) } return m }
  const solidAt = (o, sx, sy) => { const lx = Math.floor(sx - o.dx), ly = Math.floor(sy - o.dy); if (lx < 0 || ly < 0 || lx >= o.w || ly >= o.h) return false; const m = alphaMask(o.img); return m.d[(ly * m.w + lx) * 4 + 3] > 40 }
  let xray = 0
  function drawCut(o, ox, oy, cx, cy, R, k) {
    if (scratch.width < o.w) scratch.width = o.w
    if (scratch.height < o.h) scratch.height = o.h
    sctx.globalCompositeOperation = 'source-over'; sctx.clearRect(0, 0, scratch.width, scratch.height); sctx.drawImage(o.img, 0, 0)
    sctx.globalCompositeOperation = 'destination-out'
    const g = sctx.createRadialGradient(cx - o.dx, cy - o.dy, R * 0.35, cx - o.dx, cy - o.dy, R)
    g.addColorStop(0, `rgba(0,0,0,${0.93 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)')
    sctx.fillStyle = g; sctx.fillRect(0, 0, o.w, o.h)
    ctx.drawImage(scratch, 0, 0, o.w, o.h, o.dx + ox, o.dy + oy, o.w, o.h)
  }

  // ───────── cửa sổ sáng đèn về đêm ─────────
  const litCache = new WeakMap(), G1 = mixc('#1e4a5a', '#1c1822', 0.35), G2 = mixc('#52949a', mixc('#1e4a5a', '#1c1822', 0.35), 0.45), G3 = mixc('#8cbfba', mixc('#1e4a5a', '#1c1822', 0.35), 0.3)
  const WARM = ['#ffd27a', '#ffe7a6', '#ffbf6a', '#fff0c8']
  function litOverlay(o) {
    if (litCache.has(o.img)) return litCache.get(o.img)
    if (!/^(h_|m_)/.test(o.name || '')) { litCache.set(o.img, null); return null }
    const W_ = o.img.width, H_ = o.img.height, c = document.createElement('canvas'); c.width = W_; c.height = H_
    const x = c.getContext('2d'); x.drawImage(o.img, 0, 0); const d = x.getImageData(0, 0, W_, H_), a = d.data
    const isG = (i) => { const r = a[i], g = a[i + 1], b = a[i + 2], hx = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); return a[i + 3] > 0 && (hx === G1 || hx === G2 || hx === G3) }
    const lab = new Int32Array(W_ * H_).fill(-1); let n = 0; const comps = []
    for (let p = 0; p < W_ * H_; p++) { if (lab[p] !== -1 || !isG(p * 4)) continue; const st = [p], cells = []; lab[p] = n; while (st.length) { const q = st.pop(); cells.push(q); const qx = q % W_, qy = (q / W_) | 0; for (const [dx, dy] of D4) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W_ || ny >= H_) continue; const r = ny * W_ + nx; if (lab[r] === -1 && isG(r * 4)) { lab[r] = n; st.push(r) } } } comps.push(cells); n++ }
    const out = new Uint8ClampedArray(W_ * H_ * 4); let any = false
    comps.forEach((cells, i) => { if (((i * 2654435761) >>> 0) % 100 > 58) return; const col = hex2(WARM[i % 4]); for (const q of cells) { out[q * 4] = col[0]; out[q * 4 + 1] = col[1]; out[q * 4 + 2] = col[2]; out[q * 4 + 3] = 255; any = true } })
    let res = null; if (any) { const oc = document.createElement('canvas'); oc.width = W_; oc.height = H_; oc.getContext('2d').putImageData(new ImageData(out, W_, H_), 0, 0); res = oc }
    litCache.set(o.img, res); return res
  }

  // ───────── người đi bộ (NPC) ─────────
  const PL = {}, NPC = [], NPC_SPR = []
  const ORIG = { t: '#3a8f8a', T: '#2a6a6c', u: '#6cc1b0', p: '#3d4c7a', P: '#2b3558', h: '#2b2230', H: '#443449', b: '#b5733f', B: '#7d4a28' }
  const NPC_LOOK = [
    { sh: ['#c94a3a', '#8f3328', '#e78a78'], pa: ['#2f2f33', '#1c1c20'], ha: ['#2b2230', '#443449'], bag: 0 },
    { sh: ['#e8e2d0', '#b9b2a0', '#fbf6e8'], pa: ['#3d4c7a', '#2b3558'], ha: ['#5a3a2a', '#7a5238'], bag: 1 },
    { sh: ['#d9a53c', '#a47a22', '#f0c868'], pa: ['#6a5a48', '#4a3d2e'], ha: ['#2b2230', '#443449'], bag: 0 },
    { sh: ['#3a6bb5', '#274a82', '#6a98d8'], pa: ['#2f2f33', '#1c1c20'], ha: ['#8a8a92', '#b0b0b8'], bag: 0 },
    { sh: ['#5aa56a', '#3a7a48', '#8acb98'], pa: ['#3d4c7a', '#2b3558'], ha: ['#2b2230', '#443449'], bag: 1 },
    { sh: ['#8a6bb0', '#634a86', '#b394d6'], pa: ['#2b3558', '#1c2438'], ha: ['#5a3a2a', '#7a5238'], bag: 0 },
    { sh: ['#e07a9a', '#a85070', '#f2a8c0'], pa: ['#d8d0c0', '#b0a894'], ha: ['#2b2230', '#443449'], bag: 1 },
    { sh: ['#2f2f33', '#1c1c20', '#55555c'], pa: ['#3d4c7a', '#2b3558'], ha: ['#2b2230', '#443449'], bag: 0 },
    { sh: ['#e08a2a', '#a8601a', '#f2b060'], pa: ['#3d4c7a', '#2b3558'], ha: ['#b08a3a', '#d8b058'], bag: 1 },
    { sh: ['#3a8f8a', '#2a6a6c', '#6cc1b0'], pa: ['#6a5a48', '#4a3d2e'], ha: ['#5a3a2a', '#7a5238'], bag: 1 },
  ]
  function recolor(img, look) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height), a = d.data
    const M = new Map(), put = (o, n) => { const O = hex2(o); M.set((O[0] << 16) | (O[1] << 8) | O[2], hex2(n)) }
    put(ORIG.T, look.sh[1]); put(ORIG.t, look.sh[0]); put(ORIG.u, look.sh[2]); put(ORIG.p, look.pa[0]); put(ORIG.P, look.pa[1]); put(ORIG.h, look.ha[0]); put(ORIG.H, look.ha[1])
    if (look.bag) { put(ORIG.b, look.sh[0]); put(ORIG.B, look.sh[1]) }
    for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const n = M.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]); if (n) { a[i] = n[0]; a[i + 1] = n[1]; a[i + 2] = n[2] } }
    x.putImageData(d, 0, 0); return c
  }
  function buildNpcSprites() {
    if (!PL.down0) return
    for (const look of NPC_LOOK) {
      const s = { down: [], up: [], right: [], left: [] }
      for (let f = 0; f < 4; f++) {
        s.down.push(recolor(PL['down' + f], look)); s.up.push(recolor(PL['up' + f], look)); const r = recolor(PL['right' + f], look); s.right.push(r)
        const m = document.createElement('canvas'); m.width = 16; m.height = 28; const mx = m.getContext('2d'); mx.translate(16, 0); mx.scale(-1, 1); mx.drawImage(r, 0, 0); s.left.push(m)
      }
      NPC_SPR.push(s)
    }
  }
  let npcOK = null
  const NPC_KINDS = new Set(['walk', 'plaza', 'market', 'grass', 'zebra_x', 'zebra_y'])
  function buildNpcGrid() {
    npcOK = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => {
      if (!NPC_KINDS.has(kind[y][x]) || blk[y][x]) return false
      for (const c of colliders) if (Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) < c.r + 0.28) return false
      return true
    }))
  }
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  function findPath(sx, sy, tx, ty) {
    const key = (x, y) => y * N + x, prev = new Map([[key(sx, sy), -1]]), q = [[sx, sy]]
    for (let qi = 0; qi < q.length && qi < 1400; qi++) {
      const [x, y] = q[qi]; if (x === tx && y === ty) break
      for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N || !npcOK[ny][nx]) continue; const k = key(nx, ny); if (prev.has(k)) continue; prev.set(k, key(x, y)); q.push([nx, ny]) }
    }
    if (!prev.has(key(tx, ty))) return null
    const out = []; for (let k = key(tx, ty); k !== -1; k = prev.get(k)) out.push([(k % N) + 0.5, Math.floor(k / N) + 0.5]); return out.reverse()
  }
  function genNpc(count) {
    buildNpcGrid(); buildNpcSprites(); if (!NPC_SPR.length) return
    const tiles = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (npcOK[y][x] && kind[y][x] !== 'grass') tiles.push([x, y])
    for (let i = 0; i < count; i++) { const [x, y] = tiles[Math.floor(Math.random() * tiles.length)]; NPC.push({ gx: x + 0.5, gy: y + 0.5, path: [], pi: 0, sp: 1.0 + Math.random() * 0.6, v: i % NPC_SPR.length, dir: 'down', t: Math.random() * 9, wait: Math.random() * 3, moving: false }) }
  }
  function stepNpc(dt) {
    for (const n of NPC) {
      n.t += dt
      if (n.pi >= n.path.length) {
        n.moving = false; n.wait -= dt
        if (n.wait <= 0) {
          const tx = clamp(Math.floor(n.gx) + Math.floor((Math.random() - 0.5) * 30), 0, N - 1), ty = clamp(Math.floor(n.gy) + Math.floor((Math.random() - 0.5) * 30), 0, N - 1)
          const p = npcOK[ty][tx] && kind[ty][tx] !== 'zebra_x' && kind[ty][tx] !== 'zebra_y' ? findPath(Math.floor(n.gx), Math.floor(n.gy), tx, ty) : null
          if (p && p.length > 1) { n.path = p; n.pi = 1 } else n.wait = 0.4
        }
        continue
      }
      const [tx, ty] = n.path[n.pi], dx = tx - n.gx, dy = ty - n.gy, d = Math.hypot(dx, dy), step = n.sp * dt
      if (d <= step) { n.gx = tx; n.gy = ty; n.pi++; if (n.pi >= n.path.length) n.wait = 1 + Math.random() * 5 } else { n.gx += dx / d * step; n.gy += dy / d * step }
      const sx = dx - dy, sy = (dx + dy) / 2; n.dir = Math.abs(sx) >= Math.abs(sy * 2) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up'); n.moving = true
    }
  }
  function npcDrawables() {
    const out = []
    for (const n of NPC) {
      const sp = NPC_SPR[n.v][n.dir][n.moving ? Math.floor(n.t * 7) % 4 : 0], [sx, sy] = proj(n.gx, n.gy), bob = n.moving && (Math.floor(n.t * 7) & 1) ? 1 : 0
      out.push({ img: sp, dx: Math.round(sx - 8), dy: Math.round(sy - 26 + bob), w: 16, h: 28, bb: [n.gx - 0.22, n.gx + 0.22, n.gy - 0.22, n.gy + 0.22], gx: n.gx, gy: n.gy, sh: { t: 'blob', H: 26, r: 0.22 } })
    }
    return out
  }
  const pedList = () => { const L = NPC.slice(); if (typeof Game !== 'undefined' && Game.state && Game.state.player) L.push(Game.state.player); return L }
  const lamps = []

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
    stepSky(dt); stepTraffic(dt); stepTrain(dt); stepNpc(dt); Game.update(dt)
    const z = cam.zoom, w = Math.ceil(innerWidth / z), h = Math.ceil(innerHeight / z)
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
    if (shC.width !== w || shC.height !== h) { shC.width = w; shC.height = h }
    ctx.imageSmoothingEnabled = false
    const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2c3b57'); bg.addColorStop(1, '#141824'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
    const ox = Math.round(w / 2 - cam.x), oy = Math.round(h / 2 - cam.y); Game.view = { w, h, ox, oy }
    drawSkirt(ox, oy)
    const wf = Math.floor(T / 0.7) & 1
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const sx = (x - y) * 36 - 36 + ox, sy = (x + y) * 18 + oy
      if (sx > w || sx < -72 || sy > h || sy < -36) continue
      let n = tname[y][x]; if (n[0] === 'W') n = `g_water_m${n.slice(5)}_${wf}`
      ctx.drawImage(IMG[n], sx, sy)
    }
    for (const s of statics) if (s.flat && s.dx + ox < w && s.dx + s.w + ox > 0 && s.dy + oy < h && s.dy + s.h + oy > 0) ctx.drawImage(s.img, s.dx + ox, s.dy + oy)
    if (sky.rain > 0.02) { ctx.save(); clipMap(ox, oy, 0); ctx.fillStyle = `rgba(28,44,72,${0.26 * sky.rain})`; ctx.fillRect(0, 0, w, h); ctx.restore(); drawRipples(dt, w, h) }
    // danh sách vẽ: tĩnh (đã sắp) + động (chèn theo quan hệ trước/sau)
    const vis = []
    for (const s of statSorted) if (s.dx + ox < w && s.dx + s.w + ox > 0 && s.dy + oy < h && s.dy + s.h + oy > 0) vis.push(s)
    const dyn = [], night = nightAt(sky.hour), glows = []
    for (const c of crossings) {
      const st = c.down ? (Math.floor(c.flash / 0.4) & 1 ? 'a' : 'b') : 'up'
      dyn.push(barrierD(`p_barrier_p_${st}`, c.x0 - 0.5, 40.5), barrierD(`p_barrier_n_${st}`, c.x0 + 3.5, 44.5))
      if (c.down) glows.push({ gx: c.x0 - 0.5, gy: 40.5, z: 46, r: 26, c: '255,70,50', a: 0.8, always: true }, { gx: c.x0 + 3.5, gy: 44.5, z: 46, r: 26, c: '255,70,50', a: 0.8, always: true })
    }
    for (const L of LANES) for (const v of L.vs) {
      const cx = L.axis === 'x' ? v.pos : L.c + v.lat, cy = L.axis === 'x' ? L.c + v.lat : v.pos
      if (cx < -3 || cx > N + 3 || cy < -3 || cy > N + 3) continue
      const d = vehDrawable(v.name, cx, cy, 'veh'); if (d) dyn.push(d)
      if (night > 0.05) { const f = L.dir * v.len / 2 + L.dir * 0.4; glows.push({ gx: L.axis === 'x' ? cx + f : cx, gy: L.axis === 'x' ? cy : cy + f, z: 6, r: v.type === 'moto' ? 20 : 32, c: '255,236,170', a: 0.7 }) }
    }
    if (train.state === 'run') for (const d of trainDrawables()) if (d) dyn.push(d)
    for (const d of npcDrawables()) dyn.push(d)
    const pl = []; Game.pushDrawable(pl); for (const p of pl) { p.sh = { t: 'blob', H: 26, r: 0.22 }; dyn.push(p) }
    let nveh = 0
    for (const d of dyn) {
      if (d.dx === undefined) { d.dx = Math.round(proj(d.gx, d.gy)[0] - d.ox); d.dy = Math.round(proj(d.gx, d.gy)[1] - d.oy); d.w = d.c.width; d.h = d.c.height; d.img = d.c }
      if (d.dx + ox > w || d.dx + d.w + ox < 0 || d.dy + oy > h || d.dy + d.h + oy < 0) continue
      let lo = 0, hi = vis.length
      for (let i = 0; i < vis.length; i++) { const s = vis[i]; if (!overlap(d, s)) continue; if (behind(s.bb, d.bb)) lo = i + 1; else if (behind(d.bb, s.bb) && i < hi) hi = i }
      vis.splice(hi < lo ? hi : lo, 0, d); if (d.clip) nveh++
    }
    stats.objs = vis.length; stats.vehicles = nveh
    drawShadows(vis, ox, oy, w, h)
    // người chơi bị che? -> làm mờ (khoét) mọi vật đứng trước quanh nhân vật để thấy hè phố, đường, đồ vật phía sau
    const pd = pl[0], pi = pd ? vis.indexOf(pd) : -1
    let occl = false
    if (pi >= 0) {
      const pts = [[pd.dx + 8, pd.dy + 4], [pd.dx + 8, pd.dy + 14], [pd.dx + 8, pd.dy + 24]]
      scan: for (let i = pi + 1; i < vis.length; i++) { const it = vis[i]; if (it.clip || !overlap(pd, it)) continue; for (const q of pts) if (solidAt(it, q[0], q[1])) { occl = true; break scan } }
    }
    const litDraw = []
    xray += ((occl ? 1 : 0) - xray) * Math.min(1, dt * 8)
    const qx = pd ? pd.dx + 8 : 0, qy = pd ? pd.dy + 14 : 0, QR = 70
    for (let i = 0; i < vis.length; i++) {
      const o = vis[i], edge = o.clip && (o.gx < 6 || o.gx > N - 6 || o.gy < 6 || o.gy > N - 6)
      if (edge) { ctx.save(); clipMap(ox, oy, o.clip === 'train' ? 52 : 40) }
      if (xray > 0.02 && i > pi && pi >= 0 && !o.clip && o.dx < qx + QR && o.dx + o.w > qx - QR && o.dy < qy + QR && o.dy + o.h > qy - QR) drawCut(o, ox, oy, qx, qy, QR, xray)
      else { ctx.drawImage(o.img, o.dx + ox, o.dy + oy); if (night > 0.05 && o.name && (o.name[0] === 'h' || o.name[0] === 'm') && o.name[1] === '_') litDraw.push(o) }
      if (edge) ctx.restore()
    }
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
    postFx(dt, w, h, ox, oy, glows, night, litDraw)
    stats.fps = Math.round(1 / Math.max(0.001, dt))
    const hh = Math.floor(sky.hour), mm = Math.floor((sky.hour - hh) * 60)
    hud.textContent = `Hà Nội ${N}x${N}   ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${WXNAME[sky.weather]}   fps ${stats.fps}   xe ${stats.vehicles}   người ${NPC.length}\n${train.state === 'run' ? 'tàu hỏa đang chạy' : 'tàu hỏa còn ' + Math.ceil(train.t) + 's'}   [R thời tiết · T đổi giờ · Y giờ tự chạy · H ẩn]\n` + Game.hudLine()
  }
  function drawSkirt(ox, oy) {                                // thành đất quanh mép map như một mô hình thu nhỏ
    const D = [-36 * N, 18 * N], C = [0, 36 * N], B = [36 * N, 18 * N], TK = 44
    for (const [P, Q, cols] of [[D, C, ['#5f8a46', '#6a4a36', '#5a3e2d']], [C, B, ['#476a38', '#4b3425', '#3f2b1f']]]) {
      for (let k = 0; k < TK; k += 4) {
        ctx.fillStyle = k < 4 ? cols[0] : (k >> 2) % 2 ? cols[1] : cols[2]
        ctx.beginPath(); ctx.moveTo(P[0] + ox, P[1] + k + oy); ctx.lineTo(Q[0] + ox, Q[1] + k + oy); ctx.lineTo(Q[0] + ox, Q[1] + k + 4 + oy); ctx.lineTo(P[0] + ox, P[1] + k + 4 + oy); ctx.closePath(); ctx.fill()
      }
    }
    const g = ctx.createLinearGradient(0, 36 * N + TK + oy, 0, 36 * N + TK + 90 + oy); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 36 * N + TK + oy, ctx.canvas.width, 90)
  }
  function glowAt(gx, gy, zh, r, rgb, a, ox, oy) {
    const [sx, sy] = proj(gx, gy), X = sx + ox, Y = sy - zh + oy
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g; ctx.fillRect(X - r, Y - r, r * 2, r * 2)
  }
  function postFx(dt, w, h, ox, oy, glows, night, litDraw) {
    const S = sunState(), clear = 1 - sky.cloud
    if (clear > 0.05 && S.e > 0.05) {                       // bóng mây trôi qua phố
      for (let k = 0; k < 5; k++) {
        const r = 150 + k * 40, cx = ((T * (7 + k) + k * 330) % (w + 600)) - 300, cy = (k * 211 + 90) % (h + 100) - 20
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.5)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(8,22,44,${0.12 * clear * S.e})`); g.addColorStop(1, 'rgba(8,22,44,0)')
        ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore()
      }
    }
    let col = gradeAt(sky.hour); col = mixc(col, '#cdd5de', sky.cloud * 0.3); col = mixc(col, '#97a6bb', sky.rain * 0.35); col = mixc(col, '#6c7990', sky.storm * 0.35)
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.fillRect(0, 0, w, h)
    if (clear > 0.1 && S.e > 0.1) {                         // nắng chói từ góc trên-trái
      ctx.globalCompositeOperation = 'screen'
      const g = ctx.createRadialGradient(w * 0.1, -h * 0.1, 0, w * 0.1, -h * 0.1, Math.max(w, h) * 0.9); g.addColorStop(0, `rgba(255,226,160,${0.2 * clear * S.e})`); g.addColorStop(1, 'rgba(255,226,160,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    }
    ctx.globalCompositeOperation = 'lighter'
    if (night > 0.05) { ctx.globalAlpha = Math.min(0.85, night); for (const o of litDraw) { const lo = litOverlay(o); if (lo) ctx.drawImage(lo, o.dx + ox, o.dy + oy) } ctx.globalAlpha = 1 }
    if (night > 0.04) for (const l of lamps) {
      const [sx, sy] = proj(l.gx, l.gy); if (sx + ox < -90 || sx + ox > w + 90 || sy + oy < -90 || sy + oy > h + 130) continue
      glowAt(l.gx, l.gy, 64, 62, '255,205,125', 0.6 * night, ox, oy); glowAt(l.gx, l.gy, 0, 46, '255,205,125', 0.22 * night, ox, oy)
    }
    for (const g of glows) { const [sx, sy] = proj(g.gx, g.gy); if (sx + ox < -60 || sx + ox > w + 60 || sy + oy < -60 || sy + oy > h + 80) continue; glowAt(g.gx, g.gy, g.z, g.r, g.c, g.a * (g.always ? 1 : Math.min(1, night * 1.2)), ox, oy) }
    ctx.globalCompositeOperation = 'source-over'
    if (sky.rain > 0.02) drawRain(dt, w, h)
    if (sky.flash > 0.02) { ctx.fillStyle = `rgba(236,242,255,${0.55 * sky.flash})`; ctx.fillRect(0, 0, w, h) }
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.14 + 0.12 * night + 0.1 * sky.rain})`)
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h)
  }
  function barrierD(name, gx, gy) { const m = MAN[name]; if (!m) return { dx: 0, dy: 0, w: 1, h: 1, bb: [0, 0, 0, 0], img: IMG.g_asphalt } ; const [sx, sy] = proj(gx, gy); return { name, img: IMG[name], dx: Math.round(sx - m.pivot[0]), dy: Math.round(sy - m.pivot[1]), w: m.w, h: m.h, bb: [gx - 0.2, gx + 0.2, gy - 0.2, gy + 0.2] } }
  function drawSignals(ox, oy) {
    const ew = ph.i === 0 ? '#3ad06a' : ph.i === 1 ? '#e8c43a' : '#e8483a', ns = ph.i === 2 ? '#3ad06a' : ph.i === 3 ? '#e8c43a' : '#e8483a'
    for (const cx of CORRX) for (const cy of [CORRY[0], CORRY[1], CORRY[2]]) for (const [x, y, c] of [[cx[0], cy[0], ew], [cx[1], cy[1], ew], [cx[1], cy[0], ns], [cx[0], cy[1], ns]]) {
      const [sx, sy] = proj(x + 0.5, y + 0.5); const X = Math.round(sx + ox), Y = Math.round(sy + oy)
      ctx.fillStyle = '#2a3b4a'; ctx.fillRect(X - 1, Y - 30, 2, 30); ctx.fillStyle = '#1c1822'; ctx.fillRect(X - 3, Y - 36, 6, 7); ctx.fillStyle = c; ctx.fillRect(X - 2, Y - 35, 4, 4)
    }
  }

  const HOURS = [7, 12, 15.5, 18, 21, 0.5]
  function jumpTime() { const nx = HOURS.find((x) => x > sky.hour + 0.05); sky.hour = nx === undefined ? HOURS[0] : nx }
  function setWeather(w) { sky.weather = w; sky.autoWx = false }
  function buildUI() {
    const d = document.createElement('div'); d.style.cssText = 'position:fixed;right:8px;top:8px;z-index:6;display:flex;gap:4px;font:16px system-ui,sans-serif;'
    const mkb = (label, title, fn) => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.style.cssText = 'width:36px;height:34px;border-radius:6px;border:1px solid #6b5f45;background:rgba(14,15,19,.78);color:#f4efe2;cursor:pointer;padding:0'; b.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn() }); d.appendChild(b) }
    mkb('☀', 'Nắng', () => setWeather('sunny')); mkb('☁', 'Nhiều mây', () => setWeather('cloudy')); mkb('🌧', 'Mưa', () => setWeather('rain')); mkb('⛈', 'Mưa giông', () => setWeather('storm')); mkb('🕒', 'Đổi giờ', jumpTime); mkb('⏯', 'Giờ tự chạy', () => { sky.auto = !sky.auto })
    document.body.appendChild(d)
  }
  // ───────── khởi động ─────────
  function generate() {
    genGround(); genGate(); genLake(); genMarket(); genPark(); genTowers(); genBlocks(); fillGaps(); streets(); streetLife(); nameTiles(); sortStatics(); genTraffic(); genNpc(36)
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
    buildUI()
    addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (k === 't') jumpTime(); if (k === 'y') sky.auto = !sky.auto; if (k === 'r') { const o = ['sunny', 'cloudy', 'rain', 'storm']; setWeather(o[(o.indexOf(sky.weather) + 1) % 4]) } if (k === 'h') hud.style.display = hud.style.display === 'none' ? '' : 'none' })
    window.addEventListener('error', (e) => stats.errors.push(String(e.message)))
    window.__world = { statics, train, crossings, LANES, kind, ph, cam, stats, isBlocked, setTod: (v) => { tod = v }, sky, setWeather, setHour: (hr) => { sky.hour = hr }, NPC, lamps, npcOK: () => npcOK, forceTrain: (dir) => trainReset(dir || 1), frame: (t) => frame(t), step: (dt, n = 1) => { for (let i = 0; i < n; i++) { stepTraffic(dt); stepTrain(dt); Game.update(dt) } } }
    window.__stats = stats; window.__ready = true
    last = performance.now()
    ;(function loop(now) { try { frame(now) } catch (e) { stats.errors.push(String(e.stack || e)); hud.textContent = 'lỗi: ' + e.message; return } requestAnimationFrame(loop) })(last)
  }
  return { load, generate, start, cam, stats, N, proj }
})()

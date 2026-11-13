// Thế giới mở Hà Nội 108x108 (isometric 2:1, ô 72x36). Toàn bộ hình ảnh lấy từ assets/world (dựng bằng claude-pxl).
// Phần này: sinh bản đồ, mô phỏng xe/tàu/thanh chắn/đèn, vẽ. Nhân vật & va chạm người chơi ở js/player.js.
'use strict'
const World = (() => {
  const N = 108, TW = 72, TH = 36
  const proj = (gx, gy) => [(gx - gy) * TW / 2, (gx + gy) * TH / 2]
  const cam = { x: 0, y: 0, zoom: 2 }
  const stats = { errors: [], fps: 0, objs: 0, vehicles: 0 }
  let MAN = null; const IMG = {}; const MAN_V = Date.now().toString(36)
  function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const R = rngOf(20241113), rnd = () => R(), pick = (a) => a[Math.floor(R() * a.length)], rr = (a, b) => a + R() * (b - a)
  const inR = (v, r) => v >= r[0] && v <= r[1], inAny = (v, L) => L.some((r) => inR(v, r))
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

  // ───────── bố cục đường ─────────
  const SW = 2                                                                              // vỉa hè rộng 2 ô mỗi bên
  const CORRX = [[12, 18], [31, 37], [63, 69], [82, 88]], ROADX = [[14, 16], [33, 35], [65, 67], [84, 86]]    // hành lang + lòng đường Bắc-Nam
  const CORRY = [[10, 16], [31, 37], [65, 71], [91, 97]], ROADY_ALL = [[12, 14], [33, 35], [67, 69], [93, 95]] // Đông-Tây: PED = phố đi bộ nối từ hồ, còn lại là đường xe
  const PED = 1, ROADY = ROADY_ALL.filter((_, i) => i !== PED), CORRY_T = CORRY.filter((_, i) => i !== PED)
  const BUSY = ROADY_ALL[2]                                                                  // tuyến buýt chạy dọc bờ nam hồ
  const RAILC = [78, 84], RAIL_Y = 81                                                       // phố tàu hỏa: ray hàng y=81, chạy hết map
  const RS = RAILC[0] + SW - 1, RN = RAILC[1] - (SW - 1)                                    // hàng vỉa hè đặt thanh chắn (phía bắc / phía nam)
  const BLOCKX = [[0, 11], [19, 30], [38, 62], [70, 81], [89, 107]], BLOCKY = [[0, 9], [17, 30], [38, 64], [72, 77], [85, 90], [98, 107]]
  const LAKE = { x0: 38, y0: 38, x1: 62, y1: 64 }                                           // khối hồ lớn (25 x 27 ô)
  const PLAY = { x0: 38, y0: 17, x1: 62, y1: 30 }                                           // khu vui chơi - mua sắm tương lai, đối diện hồ qua phố đi bộ
  const ARCHX = [38, 47, 61], SPAWN = [56.5, 34.5]

  async function load() {
    MAN = (await (await fetch('assets/world/manifest.json', { cache: 'no-cache' })).json()).sprites
    await Promise.all(Object.keys(MAN).map((n) => new Promise((res) => { const i = new Image(); i.onload = () => { IMG[n] = i; res() }; i.onerror = () => { stats.errors.push('thiếu ảnh ' + n); res() }; i.src = 'assets/world/' + n + '.png?v=' + MAN_V })))
    await Promise.all(['down', 'up', 'right'].flatMap((d) => [0, 1, 2, 3].map((f) => new Promise((res) => { const i = new Image(); i.onload = () => { PL[d + f] = i; res() }; i.onerror = () => res(); i.src = `assets/player/pl_${d}_${f}.png` }))))
  }

  // ───────── sinh bản đồ ─────────
  const kind = Array.from({ length: N }, () => Array(N).fill('grass'))
  const tname = Array.from({ length: N }, () => Array(N).fill('g_grass_0'))
  const blk = Array.from({ length: N }, () => Array(N).fill(false))         // ô bị chặn (tĩnh)
  const occ = Array.from({ length: N }, () => Array(N).fill(false))         // ô đã có công trình / đã đặt chỗ
  const used = new Set()                                                     // ô vỉa hè đã đặt đồ
  const bridgeT = new Set(), bridgeZ = new Map()
  const statics = [], colliders = [], poles = []
  const pois = []

  const roadLike = new Set(['road', 'dash_x', 'dash_y', 'zebra_x', 'zebra_y', 'railroad'])
  function genGround() {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let k = 'grass'
      if (inAny(x, CORRX) || inAny(y, CORRY) || inR(y, RAILC)) k = 'walk'
      if (inR(y, [RAIL_Y - 1, RAIL_Y + 1])) k = 'gravel'
      if (y === RAIL_Y) k = 'rail'
      if (inR(y, CORRY[PED]) && !inAny(x, ROADX)) k = (y >= ROADY_ALL[PED][0] && y <= ROADY_ALL[PED][1]) ? 'market' : 'plaza'
      const rx = inAny(x, ROADX), ry = inAny(y, ROADY)
      if (rx || ry) k = 'road'
      if (rx && y === RAIL_Y) k = 'railroad'
      kind[y][x] = k
    }
    for (const r of ROADY) for (let x = 0; x < N; x++) if (!inAny(x, CORRX)) kind[r[0] + 1][x] = 'dash_x'
    for (const r of ROADX) for (let y = 0; y < N; y++) if (!inAny(y, CORRY) && !inR(y, RAILC)) kind[y][r[0] + 1] = 'dash_y'
    for (const c of CORRX) for (const x of c) for (const r of ROADY) for (let y = r[0]; y <= r[1]; y++) kind[y][x] = 'zebra_x'
    for (const c of CORRY) for (const y of c) for (const r of ROADX) for (let x = r[0]; x <= r[1]; x++) if (kind[y][x] === 'road') kind[y][x] = 'zebra_y'
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
    // vỉa hè rộng 2 ô: cột điện, đèn, cây nằm ở hàng sát lề đường, hàng sát nhà để trống cho người đi bộ
    const cn = (c) => c[0] + SW - 1, cs = (c) => c[1] - (SW - 1)
    for (const c of CORRY_T) for (let x = 2; x < N - 1; x += 5) if (!inAny(x, CORRX) && tileUse(x, cn(c))) { prop('p_pole', x + 0.5, cn(c) + 0.5); poles.push({ gx: x + 0.5, gy: cn(c) + 0.5, axis: 'x' }) }
    for (const c of CORRX) for (let y = 3; y < N - 1; y += 5) if (!inAny(y, CORRY) && !inR(y, RAILC) && tileUse(cn(c), y)) { prop('p_pole', cn(c) + 0.5, y + 0.5); poles.push({ gx: cn(c) + 0.5, gy: y + 0.5, axis: 'y' }) }
    for (const [bx0, bx1] of BLOCKX) for (let x = bx0 + 7; x <= bx1; x += 8) { const y = RS; if (!inAny(x, CORRX) && tileUse(x, y)) { prop('p_pole', x + 0.5, y + 0.5); poles.push({ gx: x + 0.5, gy: y + 0.5, axis: 'x' }) } }
    for (const c of CORRY_T) for (let x = 4; x < N - 1; x += 6) if (!inAny(x, CORRX) && tileUse(x, cs(c))) prop('p_lamp', x + 0.5, cs(c) + 0.5)
    for (const c of CORRX) for (let y = 5; y < N - 1; y += 6) if (!inAny(y, CORRY) && !inR(y, RAILC) && tileUse(cs(c), y)) prop('p_lamp', cs(c) + 0.5, y + 0.5)
    for (const c of CORRY_T) for (let x = 7; x < N - 2; x += 9) if (!inAny(x, CORRX) && !inAny(x + 1, CORRX) && tileUse(x, cs(c))) prop(pick(['t_bang_1', 't_bang_2', 't_bang_3', 't_phuong_1']), x + 0.5, cs(c) + 0.6)
    for (const c of CORRX) for (let y = 7; y < N - 2; y += 9) if (!inAny(y, CORRY) && !inAny(y + 1, CORRY) && !inR(y, RAILC) && tileUse(cs(c), y)) prop(pick(['t_bang_1', 't_bang_2', 't_small_3']), cs(c) + 0.5, y + 0.6)
    for (let x = 3; x < N - 1; x += 6) if (!inAny(x, CORRX) && Math.abs(x - 24) > 2 && ARCHX.every((q) => Math.abs(x - q) > 1)) for (const y of [CORRY[PED][0], CORRY[PED][1]]) if (tileUse(x, y)) prop('p_lamp', x + 0.5, y + 0.5)
    const yb = cn(CORRY[2])
    for (const x of [6, 24, 46, 74, 96]) { for (let k = -1; k <= 1; k++) used.add((x + k) + ',' + yb); prop('p_shelter_x', x + 0.5, yb + 0.5, { r: 0, bb: [x - 0.4, x + 1.4, yb + 0.1, yb + 0.9] }); colliders.push({ x: x + 0.5, y: yb + 0.2, r: 0.42 }, { x: x - 0.1, y: yb + 0.2, r: 0.3 }, { x: x + 1.1, y: yb + 0.2, r: 0.3 }) }
    BUSSTOPS.push(...[6, 24, 46, 74, 96].map((x) => x + 0.5))
  }
  const BUSSTOPS = []
  function genSigns() {                                       // biển tên phố (xanh, chữ trắng) quanh hồ và ở các ngã tư; cổng chào phố đi bộ
    const plate = (ax, k, x, y) => { if (tileUse(Math.floor(x), Math.floor(y))) prop(`p_plate_${ax}_${k}`, Math.floor(x) + 0.5, Math.floor(y) + 0.5) }
    plate('y', 5, CORRX[2][0] + 1, LAKE.y0 + 1); plate('y', 5, CORRX[2][0] + 1, LAKE.y1 - 1)            // Đinh Tiên Hoàng (đông hồ)
    plate('y', 1, CORRX[1][1] - 1, LAKE.y0 + 1); plate('y', 1, CORRX[1][1] - 1, LAKE.y1 - 1)            // Lê Thái Tổ (tây hồ)
    plate('x', 0, LAKE.x0 + 2, CORRY[2][0] + 1); plate('x', 0, LAKE.x1 - 2, CORRY[2][0] + 1)             // Hàng Khay (nam hồ)
    plate('x', 6, LAKE.x0 + 3, CORRY[PED][1]); plate('x', 6, LAKE.x1 - 3, CORRY[PED][0])                   // phố đi bộ
    let k = 0; const names = [2, 3, 4, 7]
    for (const cx of CORRX) for (const cy of CORRY_T) { plate(k % 2 ? 'x' : 'y', names[k++ % 4], cx[0] + 1, cy[0] + 1) }
    for (const ax of ARCHX) {
      const nm = ax === 47 ? 'lm_arch_shop' : ax === 38 ? 'lm_arch_walk' : 'lm_arch_lake', gy = CORRY[PED][0]
      mark(ax, gy, 1, 7, false); sprite(nm, ax, gy)
      colliders.push({ x: ax + 0.5, y: gy + 10 / 36, r: 0.3 }, { x: ax + 0.5, y: gy + 7 - 10 / 36, r: 0.3 })
      for (const cy of [0.28, 6.72]) nightLights.push({ gx: ax + 0.5, gy: gy + cy, z: 60, r: 30, a: 0.5 })
      nightLights.push({ gx: ax + 0.5, gy: gy + 3.5, z: 85, r: 70, a: 0.35 })
    }
  }

  function streetLife() {                                    // sạp cà phê, phở, xe máy đỗ trước cửa nhà
    for (const f of fronts) {
      let sx, sy, axis
      if (f.fam === 'R') { sx = f.gx + 3; sy = f.gy + f.F / 2; axis = 'y' } else { sx = f.gx + f.F / 2; sy = f.gy + 3; axis = 'x' }
      const tx = Math.floor(sx), ty = Math.floor(sy)
      if (!inAny(f.fam === 'R' ? tx : ty, f.fam === 'R' ? CORRX : CORRY_T)) continue
      const cxk = (f.fam === 'R' ? tx + 1 : tx) + ',' + (f.fam === 'R' ? ty : ty + 1)       // ô sát lề cùng mặt cắt: phải còn trống để đi được
      if (kind[ty]?.[tx] !== 'walk' || used.has(cxk) || !tileUse(tx, ty)) continue
      used.add(cxk)
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
    // Hồ Hoàn Kiếm: dài theo hướng Bắc-Nam. Đảo Ngọc + đền Ngọc Sơn ở phía bắc, cầu Thê Húc đỏ nối từ bờ đông (cổng cầu, Tháp Bút, Đài Nghiên),
    // Tháp Rùa trên gò giữa hồ, đường dạo quanh hồ có liễu, phượng, ghế đá. Phố đi bộ chạy ngay phía bắc hồ.
    const X0 = LAKE.x0, Y0 = LAKE.y0, W = LAKE.x1 - X0 + 1, H = LAKE.y1 - Y0 + 1
    const at = (lx, ly) => [X0 + lx, Y0 + ly]
    const wet = (lx, ly) => { const dx = (lx + 0.5 - 12.5) / 9.6, dy = (ly + 0.5 - 13.5) / 11.2; return dx * dx + dy * dy < 1 }
    const water = Array.from({ length: H }, (_, ly) => Array.from({ length: W }, (_, lx) => wet(lx, ly)))
    for (let ly = 7; ly <= 8; ly++) water[ly][21] = false                 // bờ đông chỗ cầu hạ cánh
    for (let ly = 0; ly < H; ly++) for (let lx = 0; lx < W; lx++) { const [x, y] = at(lx, ly); occ[y][x] = true; kind[y][x] = water[ly][lx] ? 'water' : 'grass' }
    const near = (lx, ly) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (water[ly + j]?.[lx + i]) return true; return false }
    for (let ly = 0; ly < H; ly++) for (let lx = 0; lx < W; lx++) { if (water[ly][lx]) continue; const [x, y] = at(lx, ly); if (lx === 0 || ly === 0 || lx === W - 1 || ly === H - 1 || near(lx, ly)) kind[y][x] = 'walk' }
    const land = (lx0, ly0, lx1, ly1, k) => { for (let ly = ly0; ly <= ly1; ly++) for (let lx = lx0; lx <= lx1; lx++) { const [x, y] = at(lx, ly); water[ly][lx] = false; kind[y][x] = k } }
    land(11, 4, 16, 10, 'grass'); land(15, 6, 16, 9, 'plaza'); land(11, 14, 13, 16, 'grass'); land(12, 15, 12, 15, 'plaza')      // đảo Ngọc, gò Rùa
    for (let lx = 17; lx <= 20; lx++) for (let ly = 7; ly <= 8; ly++) { const [x, y] = at(lx, ly); bridgeT.add(x + ',' + y); bridgeZ.set(x + ',' + y, [5, 9, 9, 5][lx - 17]); occ[y][x] = true }
    for (let lx = 17; lx <= 20; lx++) sprite(lx === 17 || lx === 20 ? 'lm_bridge_lo' : 'lm_bridge', X0 + lx, Y0 + 7, { flat: true })
    prop('lm_bridge_gate', X0 + 21.5, Y0 + 7, { r: 0, bb: [X0 + 21.3, X0 + 21.7, Y0 + 7.0, Y0 + 9.0] }); colliders.push({ x: X0 + 21.5, y: Y0 + 7.15, r: 0.2 }, { x: X0 + 21.5, y: Y0 + 8.85, r: 0.2 })
    mark(X0 + 12, Y0 + 6, 3, 3); sprite('lm_temple', X0 + 12, Y0 + 6)
    mark(X0 + 12, Y0 + 15, 1, 1); sprite('lm_turtle', X0 + 12, Y0 + 15)
    mark(X0 + 21, Y0 + 4, 1, 1); sprite('lm_pen', X0 + 21, Y0 + 4)
    mark(X0 + 21, Y0 + 11, 1, 1); sprite('lm_ink', X0 + 21, Y0 + 11)
    // cây, ghế, đèn quanh hồ: dải cỏ ngoài cùng trồng liễu / phượng, ghế đá xen kẽ; không đặt lên đường dạo sát mép nước
    const T = ['t_lieu_1', 't_phuong_1', 't_lieu_2', 't_bang_2', 't_lieu_1', 't_phuong_2']
    const reserved = (lx, ly) => (lx >= 18 && ly >= 3 && ly <= 12)
    let ti = 0
    for (let ly = 0; ly < H; ly++) for (let lx = 0; lx < W; lx++) {
      const [x, y] = at(lx, ly)
      if (kind[y][x] !== 'grass' || water[ly][lx] || near(lx, ly) || reserved(lx, ly)) continue
      if ((lx + 2 * ly) % 4 === 0 && (lx <= 2 || lx >= W - 3 || ly <= 2 || ly >= H - 3)) prop(T[ti++ % T.length], x + 0.5, y + 0.55)
      else if ((lx + 2 * ly) % 4 === 2 && (lx === 1 || lx === W - 2)) prop('p_bench_y', x + 0.5, y + 0.5)
      else if ((lx + 2 * ly) % 4 === 2 && (ly === 1 || ly === H - 2)) prop('p_bench_x', x + 0.5, y + 0.5)
    }
    for (const [lx, ly] of [[0, 3], [0, 10], [0, 17], [0, 24], [24, 3], [24, 14], [24, 20], [24, 25], [6, 0], [13, 0], [19, 0], [6, 26], [13, 26], [19, 26]]) prop('p_lamp', ...at(lx, ly).map((v) => v + 0.5))
    for (const [lx, ly] of [[14.4, 5.2], [11.6, 9.4], [15.4, 9.8], [11.6, 4.6]]) prop('t_small_2', X0 + lx, Y0 + ly, { r: 0.3 })     // cây trên đảo Ngọc
    prop('p_flagpole', X0 + 23, Y0 + 9); prop('p_bench_y', X0 + 23.6, Y0 + 14.5); prop('p_bench_y', X0 + 23.6, Y0 + 16.8); prop('p_cyclo', X0 + 23.2, Y0 + 19.5)
    pois.push({ id: 'bridge', label: 'Cầu Thê Húc', gx: X0 + 19, gy: Y0 + 8, r: 2.1 }, { id: 'temple', label: 'Đền Ngọc Sơn (đảo Ngọc)', gx: X0 + 15.5, gy: Y0 + 7.5, r: 2.4 },
      { id: 'pen', label: 'Tháp Bút - Đài Nghiên', gx: X0 + 21.5, gy: Y0 + 5.5, r: 2.4 }, { id: 'tower', label: 'Tháp Rùa (ngắm từ bờ đông)', gx: X0 + 22.5, gy: Y0 + 15.5, r: 2.4 })
  }

  function genGate() {                                         // Ô Quan Chưởng nằm giữa phố đi bộ: hai bên đều là chợ đêm / ẩm thực
    const gx = 24, gy = CORRY[PED][0]
    mark(gx, gy, 1, 7, false)
    for (const dy of [0.22, 1.78, 5.22, 6.78]) for (const dx of [0.2, 0.5, 0.8]) colliders.push({ x: gx + dx, y: gy + dy, r: 0.24 })      // chỉ các trụ tường chặn: đi bộ qua được cả 3 cổng (giữa + 2 ô nhỏ)
    sprite('lm_gate', gx, gy)
    pois.push({ id: 'gate', label: 'Ô Quan Chưởng', gx: gx + 2.2, gy: gy + 3.5, r: 2.6 })
  }
  function genPedStreet() {                                    // phố đi bộ: dãy sạp hai bên, giữa để trống 3 ô cho người đi
    const y0 = CORRY[PED][0], names = ['p_umb_red', 'p_pho', 'p_umb_yellow', 'p_banhmi', 'p_umb_teal', 'p_fruit', 'p_cafe_red', 'p_umb_orange', 'p_cafe_green', 'p_kiosk']
    let k = 0
    for (let x = 1; x < N - 2; x += 3) {
      if ([0, 1, 2].some((d) => inAny(x + d, CORRX)) || (x >= 22 && x <= 25) || (x >= 44 && x <= 56) || ARCHX.some((q) => Math.abs(x + 1 - q) <= 1)) continue
      for (const row of [y0 + 1, y0 + 5]) {
        const nm = names[(k++ * 7 + x) % names.length]
        prop(nm, x + 1.0, row + 0.5); nightLights.push({ gx: x + 1.0, gy: row + 0.5, z: 48, r: 46, a: 0.62 })
        if (rnd() < 0.5) prop('p_stools', x + 1.0 + (row === y0 + 1 ? 0.05 : -0.05), row + (row === y0 + 1 ? 1.1 : -0.1), { r: 0 })
      }
    }
    for (const x of [8, 41, 59, 92]) prop('p_planter', x + 0.5, y0 + 3.5)
    for (const x of [45, 49, 53, 56]) { prop('p_bench_x', x + 0.5, y0 + 1.6); prop('p_bench_x', x + 0.5, y0 + 5.4) }
    prop('p_cyclo', 51.5, y0 + 3.5); prop('p_flagpole', 55.2, y0 + 3.5)
    pois.push({ id: 'walkstreet', label: 'Phố đi bộ Hồ Gươm', gx: 51.5, gy: y0 + 3.5, r: 3.2 })
  }

  const lanterns = []
  function genTrainStreet() {
    // hàng rào an toàn hai bên đường ray (trừ chỗ đường cắt ngang), quán cafe nằm ngoài hàng rào hướng ra đường tàu
    const yF = [RS + 1, RN], CAFE = ['green', 'red', 'blue', 'yellow'], SET = ['a', 'b', 'c', 'd', 'e']
    for (let x = 0; x < N; x++) {
      if (inAny(x, ROADX)) continue
      for (const y of yF) {
        sprite(x % 7 === 3 ? 'p_fence_b' : 'p_fence_a', x, y, { bb: [x, x + 1, y - 0.06, y + 0.06] })
        colliders.push({ x: x + 0.25, y: y + (y === yF[0] ? -0.06 : 0.06), r: 0.25 }, { x: x + 0.75, y: y + (y === yF[0] ? -0.06 : 0.06), r: 0.25 })
      }
    }
    const free = (x, y) => !used.has(Math.floor(x) + ',' + Math.floor(y))
    const put = (name, x, y, r, nl) => { if (!free(x, y)) return false; used.add(Math.floor(x) + ',' + Math.floor(y)); prop(name, x, y, { r }); if (nl) nightLights.push({ gx: x, gy: y, z: nl[0], r: nl[1], a: nl[2] }); return true }
    let seg = 0
    for (const [x0, x1] of BLOCKX) for (let x = x0 + 1; x + 5 <= x1; x += 8, seg++) {
      const yN = RS + 0.5, yS = RN + 0.5                                    // hàng sát hàng rào (bắc: 45, nam: 49)
      // phía bắc: quầy cafe sát nhà ở nửa đầu hàng 44, bàn ghế sát hàng rào ở nửa sau hàng 45 -> luôn có lối đi chéo qua đoạn quán
      if (free(x + 1.0, RAILC[0] + 0.5)) { used.add(Math.floor(x + 1.0) + ',' + RAILC[0]); prop('p_tc_counter_' + CAFE[seg % 4], x + 1.0, RAILC[0] + 0.55, { r: 0, bb: [x + 0.3, x + 1.7, RAILC[0] + 0.2, RAILC[0] + 0.9] }); colliders.push({ x: x + 0.7, y: RAILC[0] + 0.55, r: 0.4 }, { x: x + 1.3, y: RAILC[0] + 0.55, r: 0.4 }); nightLights.push({ gx: x + 1.0, gy: RAILC[0] + 0.55, z: 40, r: 44, a: 0.62 }) }
      put('p_tc_plants', x + 1.95, RAILC[0] + 0.5, 0.35)
      for (const dx of [3.45, 4.7]) put('p_tc_set_' + SET[(seg + Math.floor(dx * 3)) % 5], x + dx, yN, 0.55, [44, 34, 0.5])
      prop('p_tc_flag', x + 0.1, RAILC[0] + 0.5, { r: 0.1 })
      // phía nam: bàn ghế sát hàng rào ở nửa đầu hàng 49, chậu cây và tủ nước ở nửa sau hàng 50
      for (const dx of [0.8, 1.9]) put('p_tc_set_' + SET[(seg + Math.floor(dx * 5)) % 5], x + dx, yS, 0.55, [44, 34, 0.5])
      put('p_tc_plants', x + 3.9, RAILC[1] + 0.5, 0.35); put('p_tc_cooler', x + 4.8, RAILC[1] + 0.5, 0.3)
      // chuỗi đèn lồng giăng ngang phố
      for (const lx of [x + 1.0, x + 3.6]) lanterns.push({ x: lx, y0: RAILC[0] + 0.1, y1: RAILC[1] + 0.9 })
    }
    pois.push({ id: 'traincafe', label: 'Phố cà phê đường tàu', gx: BLOCKX[1][0] + 4, gy: RAIL_Y + 0.5, r: 3 })
  }
  function drawLanterns(ox, oy, w, h) {
    for (const L of lanterns) {
      const pa = proj(L.x, L.y0), pb = proj(L.x, L.y1); pa[1] -= 74; pb[1] -= 74
      if (Math.max(pa[0], pb[0]) + ox < -20 || Math.min(pa[0], pb[0]) + ox > w + 20 || Math.min(pa[1], pb[1]) + oy > h + 40 || Math.max(pa[1], pb[1]) + oy < -40) continue
      cable(pa, pb, ox, oy, 0, 18)
      for (let k = 1; k <= 7; k++) {
        const t = k / 8, g = L.y0 + (L.y1 - L.y0) * t, z = 74 - 18 * 4 * t * (1 - t), [sx, sy] = proj(L.x, g), X = Math.round(sx + ox), Y = Math.round(sy - z + oy)
        const c = ['#d4382c', '#f2c23c', '#e08a2a', '#d4382c'][k % 4]
        ctx.fillStyle = '#5a2a1c'; ctx.fillRect(X - 1, Y, 3, 1); ctx.fillStyle = c; ctx.fillRect(X - 1, Y + 1, 3, 4); ctx.fillStyle = lite4(c); ctx.fillRect(X, Y + 2, 1, 2); ctx.fillStyle = '#5a2a1c'; ctx.fillRect(X - 1, Y + 5, 3, 1)
      }
    }
  }
  const lite4 = (c) => mixc(c, '#fff6d8', 0.55)
  function genMarket() {
    const X0 = BLOCKX[1][0], Y0 = BLOCKY[1][0]
    for (let y = Y0 + 2; y <= Y0 + 11; y++) for (let x = X0 + 2; x <= X0 + 9; x++) kind[y][x] = 'plaza'
    for (let y = Y0 + 3; y <= Y0 + 10; y++) for (let x = X0 + 3; x <= X0 + 8; x++) kind[y][x] = 'market'
    for (let y = Y0; y <= Y0 + 2; y++) for (let x = X0 + 6; x <= X0 + 7; x++) { kind[y][x] = 'plaza'; occ[y][x] = true }
    for (let y = Y0 + 11; y <= Y0 + 13; y++) for (let x = X0 + 6; x <= X0 + 7; x++) { kind[y][x] = 'plaza'; occ[y][x] = true }
    for (let y = Y0 + 6; y <= Y0 + 7; y++) for (let x = X0; x <= X0 + 2; x++) { kind[y][x] = 'plaza'; occ[y][x] = true }
    for (let y = Y0 + 3; y <= Y0 + 10; y++) for (let x = X0 + 3; x <= X0 + 8; x++) occ[y][x] = true
    const sx = X0 - 17, sy = Y0 - 15
    const col1 = [['p_umb_red', 19.3], ['p_pho', 21.9], ['p_umb_yellow', 24.5]], col2 = [['p_banhmi', 19.3], ['p_umb_teal', 21.9], ['p_fruit', 24.5]]
    for (const [n, y] of col1) { prop(n, 21.0 + sx, y + sy); nightLights.push({ gx: 21.0 + sx, gy: y + sy, z: 48, r: 44, a: 0.6 }) }
    for (const [n, y] of col2) { prop(n, 25.0 + sx, y + sy); nightLights.push({ gx: 25.0 + sx, gy: y + sy, z: 48, r: 44, a: 0.6 }) }
    prop('p_stools', 23.5 + sx, 20.4 + sy); prop('p_stools', 23.6 + sx, 23.4 + sy); prop('p_lamp', 22.3 + sx, 18.3 + sy); prop('p_lamp', 24.8 + sx, 25.3 + sy); prop('p_umb_orange', 23.5 + sx, 18.4 + sy, { r: 0.4 })
    pois.push({ id: 'market', label: 'Chợ phố cổ', gx: 23.5 + sx, gy: 22 + sy, r: 2.4 })
  }
  // khu vui chơi - mua sắm (sắp mở): quảng trường mở ngay bên kia phố đi bộ, đối diện hồ; hiện có sạp hàng + chỗ trống để thêm trò chơi / cửa hàng
  function genPlay() {
    const { x0, y0, x1, y1 } = PLAY
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { kind[y][x] = 'plaza'; occ[y][x] = true }
    for (let y = y0 + 4; y <= y1 - 4; y++) for (let x = x0 + 3; x <= x1 - 3; x++) kind[y][x] = 'market'
    const names = ['p_umb_red', 'p_pho', 'p_umb_yellow', 'p_banhmi', 'p_umb_teal', 'p_fruit', 'p_cafe_red', 'p_umb_orange', 'p_cafe_green', 'p_kiosk']
    let k = 0
    for (let x = x0 + 2; x < x1 - 1; x += 3) for (const row of [y0 + 2, y1 - 2]) { prop(names[(k++ * 3 + x) % names.length], x + 1.0, row + 0.5); nightLights.push({ gx: x + 1.0, gy: row + 0.5, z: 48, r: 46, a: 0.6 }) }
    for (const x of [x0 + 12, x0 + 13]) for (const y of [y0 + 4, y1 - 4]) prop('p_planter', x + 0.5, y + 0.5)
    for (let x = x0 + 2; x <= x1 - 2; x += 4) for (const y of [y0 + 1, y1 - 1]) prop('p_lamp', x + 0.5, y + 0.5)
    for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 1, y1 - 1], [x1 - 1, y1 - 1]]) prop('t_bang_1', x + 0.5, y + 0.55)
    prop('p_flagpole', x0 + 12.5, y0 + 6.5); prop('p_bench_x', x0 + 10.5, y0 + 7.5); prop('p_bench_x', x0 + 14.5, y0 + 7.5)
    pois.push({ id: 'play', label: 'Khu vui chơi - mua sắm (sắp mở)', gx: (x0 + x1) / 2 + 0.5, gy: (y0 + y1) / 2 + 0.5, r: 5 })
  }

  function genPark() {                                          // công viên: hai lối dạo cắt nhau, quảng trường giữa, cây rải đều
    const b = { x0: BLOCKX[3][0], x1: BLOCKX[3][1], y0: BLOCKY[2][0], y1: BLOCKY[2][1] }, cx = 75, cy = 50
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { kind[y][x] = 'grass'; occ[y][x] = true }
    for (let y = b.y0; y <= b.y1; y++) for (const x of [cx, cx + 1]) kind[y][x] = 'walk'
    for (let x = b.x0; x <= b.x1; x++) for (const y of [cy, cy + 1]) kind[y][x] = 'walk'
    for (let y = cy - 1; y <= cy + 2; y++) for (let x = cx - 1; x <= cx + 2; x++) kind[y][x] = 'plaza'
    const T = ['t_bang_1', 't_bang_2', 't_bang_3', 't_phuong_2', 't_small_1', 't_small_2', 't_lieu_2', 't_phuong_1']
    for (let y = b.y0 + 1; y <= b.y1 - 1; y += 3) for (let x = b.x0 + 1; x <= b.x1 - 1; x += 3) {
      const gx = x + (y % 2), gy = y; if (kind[gy][gx] !== 'grass' || Math.abs(gx - cx) < 2 && Math.abs(gy - cy) < 3) continue
      if (kind[gy][gx + 1] !== 'grass') continue
      prop(pick(T), gx + 0.5, gy + 0.6)
    }
    for (const [x, y] of [[cx - 1.5, cy - 2.5], [cx + 2.5, cy - 2.5], [cx - 1.5, cy + 3.5], [cx + 2.5, cy + 3.5]]) prop('t_bush_2', x, y, { r: 0.25 })
    for (const [x, y, n] of [[cx - 1.5, cy + 0.5, 'p_bench_y'], [cx + 3, cy + 0.5, 'p_bench_y'], [cx + 0.5, cy - 1.8, 'p_bench_x'], [cx + 1.5, cy + 3.2, 'p_bench_x']]) prop(n, x + 0.5, y)
    for (const [x, y] of [[cx - 2.5, cy - 2.5], [cx + 3.5, cy - 2.5], [cx - 2.5, cy + 3.5], [cx + 3.5, cy + 3.5]]) prop('p_lamp', x + 0.5, y + 0.5)
    for (const [x, y] of [[cx + 0.5, cy - 4], [cx + 0.5, cy + 5], [cx - 4, cy + 0.5], [cx + 5, cy + 0.5]]) prop('p_planter', x + 0.5, y + 0.5)
    pois.push({ id: 'park', label: 'Công viên', gx: cx + 1, gy: cy + 1, r: 3 })
  }

  function genTowers() {
    const X0 = BLOCKX[4][0]
    mark(X0 + 3, 3, 3, 3); sprite('tower_a', X0 + 3, 3)
    mark(X0 + 3, BLOCKY[1][0] + 4, 3, 3); sprite('tower_a', X0 + 3, BLOCKY[1][0] + 4)
    mark(X0 + 3, BLOCKY[2][0] + 5, 3, 3); sprite('tower_a', X0 + 3, BLOCKY[2][0] + 5)
    mark(X0 + 8, BLOCKY[2][0] + 14, 2, 3); sprite('tower_b', X0 + 8, BLOCKY[2][0] + 14)
    mark(X0 + 3, BLOCKY[5][0] + 3, 2, 3); sprite('tower_b', X0 + 3, BLOCKY[5][0] + 3)
    pois.push({ id: 'glass', label: 'Khu cao ốc', gx: 88.5, gy: 4.5, r: 4.2 })
  }

  function genBlocks() {
    const B = (i, j) => ({ x0: BLOCKX[i][0], x1: BLOCKX[i][1], y0: BLOCKY[j][0], y1: BLOCKY[j][1] })
    const skip = new Set(['2,2', '2,1', '3,2']), modern = new Set(['4,0', '4,1', '4,2', '4,5'])
    for (let i = 0; i < BLOCKX.length; i++) for (let j = 0; j < BLOCKY.length; j++) {
      const key = i + ',' + j; if (skip.has(key)) continue
      if (modern.has(key)) { modernBlock(B(i, j)); continue }
      const mix = j === 3 || j === 4 ? 'rail' : i <= 1 && j <= 2 ? 'old' : 'mid'
      const b = B(i, j); perimeter(b, { mix, shop: j >= 3 && j <= 4 ? 0.4 : 0.55 }); interior(b, mix)
    }
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
      const corr = L.axis === 'x' ? CORRX : CORRY_T
      for (const c of corr) L.stops.push({ pos: L.dir > 0 ? c[0] - 0.1 : c[1] + 1.1, closed: () => (L.axis === 'x' ? ph.i !== 0 : ph.i !== 2) })
      if (L.axis === 'y') {
        const k = ROADX.findIndex((r) => inR(Math.floor(L.c), r))
        L.stops.push({ pos: L.dir > 0 ? RS - 0.1 : RN + 1.1, closed: () => crossings[k].down })
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
        if (v.type === 'bus' && L.axis === 'x' && L.dir < 0 && L.c === BUSY[0] + 0.5) for (const bx of BUSSTOPS) if (!v.visited.has(bx) && Math.abs(v.pos - bx) < 0.3) { v.visited.add(bx); v.dwell = 3.5 }
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
    if (P && train.state === 'run' && P.gy > RAIL_Y - 1.4 && P.gy < RAIL_Y + 1.4 && P.gx > xmin - 0.6 && P.gx < xmax + 0.6) { P.gx = clamp(P.gx, 0.5, N - 0.5); P.gy = RAILC[0] + 0.5; Game.toast('Tàu đang tới! Bạn được đưa vào vỉa hè an toàn.') }
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
    if ((ty === RS || ty === RN)) for (const c of crossings) if (c.down && tx >= c.x0 && tx <= c.x0 + 2) return true
    return false
  }
  const groundZ = (gx, gy) => bridgeZ.get(Math.floor(gx) + ',' + Math.floor(gy)) || 0

  // ───────── giờ trong ngày, thời tiết ─────────
  const sky = { hour: 15.5, auto: false, speed: 0.06, weather: 'sunny', cloud: 0, rain: 0, storm: 0, wxTimer: 80, autoWx: true, flash: 0, nextFlash: 7, fury: false, nextStrike: 3, shake: 0, bolts: [], pulses: [] }
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
    sky.flash = Math.max(0, sky.flash - dt * (sky.bolts.length ? 6 : 2.8))
    if (sky.fury) { if (sky.rain > 0.3) { sky.nextStrike -= dt; if (sky.nextStrike <= 0) { strike(); sky.nextStrike = 1.8 + Math.random() * 6 } } }
    else if (sky.storm > 0.6) { sky.nextFlash -= dt; if (sky.nextFlash <= 0) { sky.flash = 1; sky.nextFlash = 5 + Math.random() * 8; thunder(0.9, 1.4) } }
    for (let i = sky.bolts.length - 1; i >= 0; i--) { const b = sky.bolts[i]; b.t += dt; for (const pu of b.pulses) if (!pu.done && b.t >= pu[0]) { pu.done = true; sky.flash = Math.max(sky.flash, pu[1]) } if (b.t > b.life) sky.bolts.splice(i, 1) }
  }
  // sấm: tiếng nổ + ầm ì trễ theo khoảng cách (WebAudio, chỉ bật sau khi người chơi chạm/nhấn phím)
  let actx = null, noiseBuf = null
  function audioInit() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return }
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); const n = actx.sampleRate * 3, b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < n; i++) { l = l * 0.98 + (Math.random() * 2 - 1) * 0.02; d[i] = l * 6 } noiseBuf = b } catch (e) { actx = null }
  }
  function thunder(dist, vol) {                                // sấm rền: tiếng nổ đục rồi lăn dài, nhiều đợt, trễ theo khoảng cách
    if (!actx || actx.state !== 'running' || !noiseBuf) return
    const t0 = actx.currentTime + 0.05 + dist * 1.3
    const src = actx.createBufferSource(); src.buffer = noiseBuf; src.loop = true
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(560 - dist * 280, t0); lp.frequency.exponentialRampToValueAtTime(55, t0 + 4.2)
    const g = actx.createGain(), v = vol * (1 - dist * 0.45), ramp = (a, t) => g.gain.exponentialRampToValueAtTime(Math.max(0.0001, a * v), t0 + t)
    g.gain.setValueAtTime(0.0001, t0); ramp(0.8, 0.1); ramp(0.3, 0.45); ramp(0.75, 0.85); ramp(0.22, 1.4); ramp(0.5, 1.9); ramp(0.15, 2.7); ramp(0.0001, 4.3)
    src.connect(lp); lp.connect(g); g.connect(actx.destination); src.start(t0, Math.random() * 1.5); src.stop(t0 + 4.4)
  }
  function strike() {                                          // chỉ nháy sáng (vài nhịp) kèm tiếng sấm rền, không vẽ tia sét
    const near = Math.random() < 0.55, pulses = near ? [[0, 1], [0.1, 0.35], [0.22, 0.9], [0.36, 0.25]] : [[0, 0.7], [0.14, 0.3]]
    sky.bolts.push({ t: 0, life: 0.5, pulses })
    thunder(near ? 0.15 + Math.random() * 0.2 : 0.55 + Math.random() * 0.45, near ? 1.5 : 1.1)
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
    if (/^p_(pho|banhmi|umb|fruit|cafe|kiosk|tc_set|tc_counter)/.test(name)) return { t: 'blob', H: 44, r: 0.6 }
    if (/^p_tc_(plants|cooler)/.test(name)) return { t: 'blob', H: 12, r: 0.4 }
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
  const fadeVal = new Map()
  function blockKeyOf(o) {
    if (o.bk !== undefined) return o.bk
    let k = null
    if (o.name && /^(h_|m_|tower_)/.test(o.name)) { const cx = Math.floor((o.bb[0] + o.bb[1]) / 2), cy = Math.floor((o.bb[2] + o.bb[3]) / 2), i = BLOCKX.findIndex((r) => inR(cx, r)), j = BLOCKY.findIndex((r) => inR(cy, r)); if (i >= 0 && j >= 0) k = 'b' + i + '_' + j }
    o.bk = k; return k
  }
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
  // mỗi ô cửa kính là một "ô cửa"; cả một tầng (một hộ) bật/tắt cùng nhau, giờ bật theo lịch, mỗi toà nhà một tính cách
  const G1 = mixc('#1e4a5a', '#1c1822', 0.35), G2 = mixc('#52949a', mixc('#1e4a5a', '#1c1822', 0.35), 0.45), G3 = mixc('#8cbfba', mixc('#1e4a5a', '#1c1822', 0.35), 0.3)
  const WIN_AMBER = ['#ffcf84', '#f2b45c', '#e89a46'], WIN_TV = '#9cc2ea', WIN_SHOP = '#ffe9b0', WIN_CURTAIN = '#9a5a2a'
  const LIT_CURVE = [[16.5, 0], [18, 0.14], [19.5, 0.55], [21, 0.74], [22.5, 0.52], [24, 0.3], [25, 0.17], [27, 0.1], [29, 0.05], [30.5, 0.09], [31.5, 0]]
  function litFrac(h) { h = h < 6 ? h + 24 : h; for (let i = 1; i < LIT_CURVE.length; i++) if (h <= LIT_CURVE[i][0]) { const [h0, f0] = LIT_CURVE[i - 1], [h1, f1] = LIT_CURVE[i]; return f0 + (f1 - f0) * (h - h0) / (h1 - h0) } return 0 }
  const hash01 = (a, b = 0, c = 0) => { let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647) + 1274126177) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296 }
  const winCache = new WeakMap()
  function decodeWins(img, corner) {
    let r = winCache.get(img); if (r) return r
    const W_ = img.width, H_ = img.height, c = document.createElement('canvas'); c.width = W_; c.height = H_
    const x = c.getContext('2d'); x.drawImage(img, 0, 0); const a = x.getImageData(0, 0, W_, H_).data
    const isG = (i) => { if (a[i + 3] < 200) return false; const hx = '#' + ((1 << 24) | (a[i] << 16) | (a[i + 1] << 8) | a[i + 2]).toString(16).slice(1); return hx === G1 || hx === G2 || hx === G3 }
    const lab = new Uint8Array(W_ * H_); const wins = []
    for (let p0 = 0; p0 < W_ * H_; p0++) {
      if (lab[p0] || !isG(p0 * 4)) continue
      const st = [p0], px = []; lab[p0] = 1
      while (st.length) { const q = st.pop(); px.push(q); const qx = q % W_, qy = (q / W_) | 0; for (const [dx, dy] of D4) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W_ || ny >= H_) continue; const rr = ny * W_ + nx; if (!lab[rr] && isG(rr * 4)) { lab[rr] = 1; st.push(rr) } } }
      if (px.length < 6) continue                                          // vệt sáng lẻ, không phải ô cửa
      let mnx = 1e9, mxx = -1, mny = 1e9; for (const q of px) { const qx = q % W_, qy = (q / W_) | 0; if (qx < mnx) mnx = qx; if (qx > mxx) mxx = qx; if (qy < mny) mny = qy }
      const slices = (mxx - mnx + 1) > 12 ? Math.ceil((mxx - mnx + 1) / 9) : 1       // dải kính dài (nhà hiện đại) cắt thành từng ô
      const cells = Array.from({ length: slices }, () => new Map())
      for (const q of px) { const qx = q % W_, qy = (q / W_) | 0, k = slices === 1 ? 0 : Math.floor((qx - mnx) / 9); if (slices > 1 && (qx - mnx) % 9 === 8) continue; const m = cells[k]; if (!m.has(qy)) m.set(qy, []); m.get(qy).push(qx) }
      for (const m of cells) {
        if (!m.size) continue
        const runs = []; let sx = 0, sy = 0, n = 0, ymin = 1e9
        for (const [y, xs] of m) { xs.sort((u, v) => u - v); let s0 = xs[0], prev = xs[0]; for (let i = 1; i <= xs.length; i++) { if (i === xs.length || xs[i] !== prev + 1) { runs.push([y, s0, prev - s0 + 1]); if (i < xs.length) s0 = xs[i] } if (i < xs.length) prev = xs[i] } for (const v of xs) { sx += v; sy += y; n++ } if (y < ymin) ymin = y }
        if (n < 5) continue
        const cx = sx / n, cy = sy / n, face = cx < corner ? 1 : -1
        wins.push({ runs, cx, cy, face, v: cy - 0.5 * face * cx, ymin, n })
      }
    }
    for (const face of [1, -1]) {                                          // gom thành tầng: cùng đường nghiêng của mặt nhà
      const L = wins.filter((w) => w.face === face).sort((u, v) => v.v - u.v); let fl = -1, anchor = 1e9
      for (const w of L) { if (anchor - w.v > 9) { fl++; anchor = w.v } w.fl = fl }
    }
    winCache.set(img, wins); return wins
  }
  function instWins(o, hour) {
    const bucket = Math.floor(hour * 4)
    if (o._lw && o._lb === bucket) return o._lw
    const corner = (o.bb[1] - o.bb[3]) * 36 - o.dx, W = decodeWins(o.img, corner)
    const seed = ((Math.round(o.bb[0]) * 73856093) ^ (Math.round(o.bb[2]) * 19349663)) | 0
    const mood = hash01(seed, 7), fr = litFrac(hour) * (mood < 0.15 ? 0.15 : mood > 0.75 ? 1.45 : 1), shop = hour >= 17.5 && hour < 22.6
    const groups = new Map()
    W.forEach((w, i) => {
      const u = hash01(seed, w.fl, 1), ground = w.fl === 0
      const on = ground ? shop && hash01(seed, 5, w.face) < 0.8 : u < fr && hash01(seed, i, 3) > 0.1
      if (!on) return
      const hc = hash01(seed, w.fl, 2), col = ground ? WIN_SHOP : hc < 0.07 ? WIN_TV : WIN_AMBER[hc < 0.42 ? 0 : hc < 0.78 ? 1 : 2]
      let g = groups.get(col); if (!g) { g = { col, body: new Path2D(), top: new Path2D() }; groups.set(col, g) }
      for (const [y, x0, n] of w.runs) (y - w.ymin < 2 ? g.top : g.body).rect(x0, y, n, 1)
    })
    o._lw = [...groups.values()]; o._lb = bucket; return o._lw
  }
  // lớp phát sáng riêng: vẽ theo đúng thứ tự trước/sau, vật đứng trước xoá phần cửa sổ bị nó che
  const emiC = document.createElement('canvas'), ex = emiC.getContext('2d')
  const isLitHouse = (o) => o.name && (o.name[0] === 'h' || o.name[0] === 'm') && o.name[1] === '_'
  function paintWindows(o, ox, oy) {
    ex.globalCompositeOperation = 'source-over'; ex.setTransform(1, 0, 0, 1, o.dx + ox, o.dy + oy)
    for (const g of instWins(o, sky.hour)) { ex.fillStyle = g.col; ex.fill(g.body); ex.fillStyle = mixc(g.col, WIN_CURTAIN, 0.55); ex.fill(g.top) }
    ex.setTransform(1, 0, 0, 1, 0, 0)
  }
  function drawLitWindows(night) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(0.96, night * 1.2); ctx.drawImage(emiC, 0, 0); ctx.globalAlpha = 1 }

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
  function lookSet(look) {
    const s = { down: [], up: [], right: [], left: [] }
    for (let f = 0; f < 4; f++) {
      s.down.push(recolor(PL['down' + f], look)); s.up.push(recolor(PL['up' + f], look)); const r = recolor(PL['right' + f], look); s.right.push(r)
      const m = document.createElement('canvas'); m.width = 16; m.height = 28; const mx = m.getContext('2d'); mx.translate(16, 0); mx.scale(-1, 1); mx.drawImage(r, 0, 0); s.left.push(m)
    }
    return s
  }
  function buildNpcSprites() { if (!PL.down0) return; for (const look of NPC_LOOK) NPC_SPR.push(lookSet(look)) }
  // áo mưa: mũ trùm (thay màu tóc) + áo choàng phủ tới gối (thay màu áo, quần), mỗi người một màu
  const PONCHO = [['#3a7bd5', '#2a58a0', '#7fb0f2'], ['#e6c235', '#b08f1c', '#f8e28a'], ['#d4483c', '#9a2f27', '#f08a7c'], ['#3aa66a', '#27774a', '#86d4a8'], ['#a66ad6', '#7a45a6', '#cfa6ee'], ['#f08a2a', '#b0601a', '#f8b878']]
  const COAT = {}
  function coatSet(v, pc) {
    const k = v * 8 + pc; if (COAT[k]) return COAT[k]
    const c = PONCHO[pc], base = NPC_LOOK[v]
    COAT[k] = lookSet({ sh: c, pa: [c[1], c[1]], ha: [c[1], c[0]], bag: 1, hand: base.ha }); return COAT[k]
  }
  let npcOK = null, npcTiles = []
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
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((kind[y][x] === 'zebra_x' || kind[y][x] === 'zebra_y') && npcOK[y][x]) { let nb = 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && npcOK[ny][nx]) nb++ } if (nb < 2) npcOK[y][x] = false }     // vạch qua đường cụt: bỏ
    const tiles = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (npcOK[y][x] && kind[y][x] !== 'grass' && kind[y][x] !== 'zebra_x' && kind[y][x] !== 'zebra_y') tiles.push([x, y])
    npcTiles = tiles
    for (let i = 0; i < count; i++) { const [x, y] = tiles[Math.floor(Math.random() * tiles.length)]; NPC.push({ gx: x + 0.5, gy: y + 0.5, path: [], pi: 0, sp: 1.0 + Math.random() * 0.6, v: i % NPC_SPR.length, dir: 'down', t: Math.random() * 9, wait: Math.random() * 3, moving: false, rt: 0.12 + Math.random() * 0.55, pc: Math.floor(Math.random() * PONCHO.length), coat: false }) }
  }
  function stepNpc(dt) {
    for (const n of NPC) {
      n.t += dt
      if (!n.coat && sky.rain > n.rt) n.coat = true; else if (n.coat && sky.rain < n.rt - 0.14) n.coat = false
      if (n.pi >= n.path.length) {
        n.moving = false; n.wait -= dt
        if (n.wait <= 0) {
          const tx = clamp(Math.floor(n.gx) + Math.floor((Math.random() - 0.5) * 30), 0, N - 1), ty = clamp(Math.floor(n.gy) + Math.floor((Math.random() - 0.5) * 30), 0, N - 1)
          const p = npcOK[ty][tx] && kind[ty][tx] !== 'zebra_x' && kind[ty][tx] !== 'zebra_y' ? findPath(Math.floor(n.gx), Math.floor(n.gy), tx, ty) : null
          if (p && p.length > 1) { n.path = p; n.pi = 1 } else { n.wait = 0.4; const kk = kind[Math.floor(n.gy)][Math.floor(n.gx)]; if (roadLike.has(kk) && npcTiles.length) { const [rx, ry] = npcTiles[Math.floor(Math.random() * npcTiles.length)]; n.gx = rx + 0.5; n.gy = ry + 0.5 } }
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
      const sp = (n.coat ? coatSet(n.v, n.pc) : NPC_SPR[n.v])[n.dir][n.moving ? Math.floor(n.t * 7) % 4 : 0], [sx, sy] = proj(n.gx, n.gy), bob = n.moving && (Math.floor(n.t * 7) & 1) ? 1 : 0
      out.push({ img: sp, dx: Math.round(sx - 8), dy: Math.round(sy - 26 + bob), w: 16, h: 28, bb: [n.gx - 0.22, n.gx + 0.22, n.gy - 0.22, n.gy + 0.22], gx: n.gx, gy: n.gy, sh: { t: 'blob', H: 26, r: 0.22 } })
    }
    return out
  }
  const pedList = () => { const L = NPC.slice(); if (typeof Game !== 'undefined' && Game.state && Game.state.player) L.push(Game.state.player); return L }
  const lamps = [], nightLights = []

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
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; T += dt
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
      dyn.push(barrierD(`p_barrier_p_${st}`, c.x0 - 0.5, RS + 0.5), barrierD(`p_barrier_n_${st}`, c.x0 + 3.5, RN + 0.5))
      if (c.down) glows.push({ gx: c.x0 - 0.5, gy: RS + 0.5, z: 46, r: 26, c: '255,70,50', a: 0.8, always: true }, { gx: c.x0 + 3.5, gy: RN + 0.5, z: 46, r: 26, c: '255,70,50', a: 0.8, always: true })
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
      const ped = d.sh && d.sh.H === 26 && d.gx !== undefined
      for (let i = 0; i < vis.length; i++) { const s = vis[i]; if (!overlap(d, s)) continue; if (ped && s.name && /^lm_(gate|arch)/.test(s.name)) { if (d.gx > s.bb[0] + 0.1) lo = Math.max(lo, i + 1); else if (i < hi) hi = i; continue } if (behind(s.bb, d.bb)) lo = i + 1; else if (behind(d.bb, s.bb) && i < hi) hi = i }
      vis.splice(hi < lo ? hi : lo, 0, d); if (d.clip) nveh++
    }
    stats.objs = vis.length; stats.vehicles = nveh
    drawShadows(vis, ox, oy, w, h)
    // người chơi bị che -> làm mờ NGUYÊN CẢ KHỐI nhà che (và vật che lẻ) để thấy hết hè phố, đường, đồ vật phía sau
    const pd = pl[0], pi = pd ? vis.indexOf(pd) : -1
    const targets = new Set()
    if (pi >= 0) {
      const pts = [[pd.dx + 8, pd.dy + 4], [pd.dx + 8, pd.dy + 14], [pd.dx + 8, pd.dy + 24]], zone = { dx: pd.dx - 125, dy: pd.dy - 125, w: 266, h: 200 }, blocks = new Set()
      for (let i = pi + 1; i < vis.length; i++) { const it = vis[i]; if (it.clip || !overlap(pd, it)) continue; for (const q of pts) if (solidAt(it, q[0], q[1])) { targets.add(it); const bk = blockKeyOf(it); if (bk) blocks.add(bk); break } }
      for (let i = pi + 1; i < vis.length; i++) { const it = vis[i], bk = blockKeyOf(it); if (bk && blocks.has(bk) && overlap(zone, it)) targets.add(it) }
    }
    for (const k of targets) if (!fadeVal.has(k)) fadeVal.set(k, 0)
    for (const [k, v] of fadeVal) { const nv = v + ((targets.has(k) ? 1 : 0) - v) * Math.min(1, dt * 7); if (nv < 0.01 && !targets.has(k)) fadeVal.delete(k); else fadeVal.set(k, nv) }
    const litDraw = []
    if (night > 0.05) { if (emiC.width !== w || emiC.height !== h) { emiC.width = w; emiC.height = h } else ex.clearRect(0, 0, w, h) }
    for (let i = 0; i < vis.length; i++) {
      const o = vis[i], edge = o.clip && (o.gx < 6 || o.gx > N - 6 || o.gy < 6 || o.gy > N - 6)
      if (edge) { ctx.save(); clipMap(ox, oy, o.clip === 'train' ? 52 : 40) }
      const f = i > pi && pi >= 0 && fadeVal.size ? (fadeVal.get(o) || 0) : 0
      if (f > 0.02) { ctx.globalAlpha = 1 - 0.8 * f; ctx.drawImage(o.img, o.dx + ox, o.dy + oy); ctx.globalAlpha = 1 }
      else {
        ctx.drawImage(o.img, o.dx + ox, o.dy + oy)
        if (night > 0.05) { ex.globalCompositeOperation = 'destination-out'; ex.drawImage(o.img, o.dx + ox, o.dy + oy); if (isLitHouse(o)) paintWindows(o, ox, oy) }
      }
      if (edge) ctx.restore()
    }
    // dây điện giữa các cột
    for (const a of poles) for (const b of poles) {
      if (a.axis !== b.axis) continue
      const d = a.axis === 'x' ? (b.gx - a.gx) * (Math.abs(b.gy - a.gy) < 0.1) : (b.gy - a.gy) * (Math.abs(b.gx - a.gx) < 0.1)
      if (d <= 0 || d > 9.5) continue
      const pa = proj(a.gx, a.gy), pb = proj(b.gx, b.gy); pa[1] -= 96; pb[1] -= 96
      if (Math.max(pa[0], pb[0]) + ox < 0 || Math.min(pa[0], pb[0]) + ox > w) continue
      for (let k = 0; k < 3; k++) cable([pa[0] + k - 1, pa[1] + k * 3], [pb[0] + k - 1, pb[1] + k * 3], ox, oy, 0, d * 3)
    }
    drawLanterns(ox, oy, w, h)
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
    let col = gradeAt(sky.hour); col = mixc(col, '#cdd5de', sky.cloud * 0.3); col = mixc(col, '#97a6bb', sky.rain * 0.35); col = mixc(col, '#6c7990', sky.storm * 0.35); if (sky.flash > 0.02) col = mixc(col, '#dfe8ff', Math.min(0.9, sky.flash * 0.85))
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.fillRect(0, 0, w, h)
    if (clear > 0.1 && S.e > 0.1) {                         // nắng chói từ góc trên-trái
      ctx.globalCompositeOperation = 'screen'
      const g = ctx.createRadialGradient(w * 0.1, -h * 0.1, 0, w * 0.1, -h * 0.1, Math.max(w, h) * 0.9); g.addColorStop(0, `rgba(255,226,160,${0.2 * clear * S.e})`); g.addColorStop(1, 'rgba(255,226,160,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    }
    if (night > 0.05) drawLitWindows(night)
    ctx.globalCompositeOperation = 'lighter'
    if (night > 0.04) for (const l of lamps) {
      const [sx, sy] = proj(l.gx, l.gy); if (sx + ox < -90 || sx + ox > w + 90 || sy + oy < -90 || sy + oy > h + 130) continue
      glowAt(l.gx, l.gy, 64, 62, '255,205,125', 0.6 * night, ox, oy); glowAt(l.gx, l.gy, 0, 46, '255,205,125', 0.22 * night, ox, oy)
    }
    if (night > 0.05) for (const l of nightLights) { const [sx, sy] = proj(l.gx, l.gy); if (sx + ox < -90 || sx + ox > w + 90 || sy + oy < -90 || sy + oy > h + 130) continue; glowAt(l.gx, l.gy, l.z, l.r, '255,176,92', l.a * Math.min(1, night * 1.2), ox, oy) }
    if (night > 0.05) for (const L of lanterns) { const mx = L.x, my = (L.y0 + L.y1) / 2; const [sx, sy] = proj(mx, my); if (sx + ox < -90 || sx + ox > w + 90 || sy + oy < -120 || sy + oy > h + 120) continue; for (const t of [0.25, 0.5, 0.75]) glowAt(mx, L.y0 + (L.y1 - L.y0) * t, 74 - 18 * 4 * t * (1 - t), 20, '255,170,80', 0.55 * Math.min(1, night * 1.2), ox, oy) }
    for (const g of glows) { const [sx, sy] = proj(g.gx, g.gy); if (sx + ox < -60 || sx + ox > w + 60 || sy + oy < -60 || sy + oy > h + 80) continue; glowAt(g.gx, g.gy, g.z, g.r, g.c, g.a * (g.always ? 1 : Math.min(1, night * 1.2)), ox, oy) }
    ctx.globalCompositeOperation = 'source-over'
    if (sky.rain > 0.02) drawRain(dt, w, h)
    if (sky.flash > 0.02) { ctx.fillStyle = `rgba(236,242,255,${0.4 * sky.flash})`; ctx.fillRect(0, 0, w, h) }
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.14 + 0.12 * night + 0.1 * sky.rain})`)
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h)
  }
  function barrierD(name, gx, gy) { const m = MAN[name]; if (!m) return { dx: 0, dy: 0, w: 1, h: 1, bb: [0, 0, 0, 0], img: IMG.g_asphalt } ; const [sx, sy] = proj(gx, gy); return { name, img: IMG[name], dx: Math.round(sx - m.pivot[0]), dy: Math.round(sy - m.pivot[1]), w: m.w, h: m.h, bb: [gx - 0.2, gx + 0.2, gy - 0.2, gy + 0.2] } }
  function drawSignals(ox, oy) {
    const ew = ph.i === 0 ? '#3ad06a' : ph.i === 1 ? '#e8c43a' : '#e8483a', ns = ph.i === 2 ? '#3ad06a' : ph.i === 3 ? '#e8c43a' : '#e8483a'
    for (const cx of CORRX) for (const cy of CORRY_T) for (const [x, y, c] of [[cx[0], cy[0], ew], [cx[1], cy[1], ew], [cx[1], cy[0], ns], [cx[0], cy[1], ns]]) {
      const [sx, sy] = proj(x + 0.5, y + 0.5); const X = Math.round(sx + ox), Y = Math.round(sy + oy)
      ctx.fillStyle = '#2a3b4a'; ctx.fillRect(X - 1, Y - 30, 2, 30); ctx.fillStyle = '#1c1822'; ctx.fillRect(X - 3, Y - 36, 6, 7); ctx.fillStyle = c; ctx.fillRect(X - 2, Y - 35, 4, 4)
    }
  }

  const HOURS = [7, 12, 15.5, 18, 21, 0.5]
  function jumpTime() { const nx = HOURS.find((x) => x > sky.hour + 0.05); sky.hour = nx === undefined ? HOURS[0] : nx }
  function setWeather(w) { sky.weather = w; sky.autoWx = false }
  function buildUI() {
    const d = document.createElement('div'); d.style.cssText = 'position:fixed;right:8px;top:8px;z-index:6;display:flex;gap:4px;font:16px system-ui,sans-serif;'
    const mkb = (label, title, fn) => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.style.cssText = 'width:36px;height:34px;border-radius:6px;border:1px solid #6b5f45;background:rgba(14,15,19,.78);color:#f4efe2;cursor:pointer;padding:0'; b.addEventListener('pointerdown', (e) => { e.stopPropagation(); audioInit(); fn() }); d.appendChild(b); return b }
    mkb('☀', 'Nắng', () => setWeather('sunny')); mkb('☁', 'Nhiều mây', () => setWeather('cloudy')); mkb('🌧', 'Mưa', () => setWeather('rain')); mkb('⛈', 'Mưa giông', () => setWeather('storm')); const fb = mkb('⚡', 'Sấm chớp dữ dội (ngẫu nhiên)', () => { sky.fury = !sky.fury; fb.style.background = sky.fury ? 'rgba(120,90,20,.9)' : 'rgba(14,15,19,.78)'; if (sky.fury && sky.rain < 0.3 && sky.weather !== 'rain' && sky.weather !== 'storm') setWeather('storm') }); mkb('🕒', 'Đổi giờ', jumpTime); mkb('⏯', 'Giờ tự chạy', () => { sky.auto = !sky.auto })
    document.body.appendChild(d)
  }
  // ───────── khởi động ─────────
  function generate() {
    genGround(); genGate(); genLake(); genPlay(); genMarket(); genPark(); genTowers(); genBlocks(); fillGaps(); genTrainStreet(); streets(); streetLife(); genPedStreet(); genSigns(); nameTiles(); sortStatics(); genTraffic(); genNpc(90)
  }
  function start(canvas, hudEl) {
    cv = canvas; ctx = cv.getContext('2d'); hud = hudEl
    const [cx, cy] = proj(...SPAWN); cam.x = cx; cam.y = cy
    if (innerWidth < 700) { cam.zoom = 1; hud.style.display = 'none' }
    Game.init({ W: { ground: kind }, N, proj, cam, tile: () => [TW, TH], isBlocked, colliders, groundZ, spawn: SPAWN })
    const found = new Set()
    const sync = () => { Game.extraHud = `khám phá ${found.size}/${pois.length}` }; sync()
    pois.push({ id: 'rail', label: 'Phố Tàu hỏa', gx: 34.5, gy: RS - 0.6, r: 2.4 })
    for (const p of pois) Game.registerPOI({ ...p, onInteract: (q) => { found.add(q.id); sync(); Game.toast(found.size === pois.length ? `${q.label} — bạn đã khám phá đủ ${pois.length} địa danh!` : `${q.label} — đã khám phá ${found.size}/${pois.length}`) } })
    let drag = null
    cv.addEventListener('pointerdown', (e) => { if (Game.mode === 'play') { Game.pointer(e, 'down'); return } drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; cv.setPointerCapture(e.pointerId) })
    cv.addEventListener('pointermove', (e) => { if (Game.mode === 'play') { Game.pointer(e, 'move'); return } if (drag) { cam.x = drag.cx - (e.clientX - drag.x) / cam.zoom; cam.y = drag.cy - (e.clientY - drag.y) / cam.zoom } })
    cv.addEventListener('pointerup', () => { drag = null })
    cv.addEventListener('wheel', (e) => { e.preventDefault(); cam.zoom = clamp(cam.zoom + (e.deltaY < 0 ? 1 : -1), 1, 5) }, { passive: false })
    buildUI()
    addEventListener('pointerdown', audioInit)
    addEventListener('keydown', (e) => { audioInit(); const k = e.key.toLowerCase(); if (k === 'f') document.querySelector('button[title^="Sấm"]').dispatchEvent(new Event('pointerdown')); if (k === 't') jumpTime(); if (k === 'y') sky.auto = !sky.auto; if (k === 'r') { const o = ['sunny', 'cloudy', 'rain', 'storm']; setWeather(o[(o.indexOf(sky.weather) + 1) % 4]) } if (k === 'h') hud.style.display = hud.style.display === 'none' ? '' : 'none' })
    window.addEventListener('error', (e) => stats.errors.push(String(e.message)))
    window.__world = { strike, thunder, litFrac, instWins, decodeWins, statSorted: () => statSorted, statics, train, crossings, LANES, kind, ph, cam, stats, isBlocked, setTod: (v) => { tod = v }, sky, setWeather, setHour: (hr) => { sky.hour = hr }, NPC, lamps, npcOK: () => npcOK, forceTrain: (dir) => trainReset(dir || 1), frame: (t) => frame(t), step: (dt, n = 1) => { for (let i = 0; i < n; i++) { stepTraffic(dt); stepTrain(dt); Game.update(dt) } } }
    window.__stats = stats; window.__ready = true
    last = performance.now()
    ;(function loop(now) { try { frame(now) } catch (e) { stats.errors.push(String(e.stack || e)); hud.textContent = 'lỗi: ' + e.message; return } requestAnimationFrame(loop) })(last)
  }
  return { load, generate, start, cam, stats, N, proj }
})()

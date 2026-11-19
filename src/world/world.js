// Thế giới mở Hà Nội 108x108 (isometric 2:1, ô 72x36). Toàn bộ hình ảnh lấy từ assets/world (dựng bằng claude-pxl).
// Phần này: sinh bản đồ, mô phỏng xe/tàu/thanh chắn/đèn, vẽ. Nhân vật & va chạm người chơi ở js/player.js.
'use strict'
import { bus } from '../core/bus.js'
import * as SL from './streetlife.js'
const World = (() => {
  const N = 108, TW = 72, TH = 36
  const proj = (gx, gy) => [(gx - gy) * TW / 2, (gx + gy) * TH / 2]
  const cam = { x: 0, y: 0, zoom: 2, zoomTarget: 2 }                                      // zoom: số thực đang trôi; zoomTarget: nấc nguyên 1..5
  const stats = { errors: [], fps: 0, objs: 0, vehicles: 0 }
  let MAN = null; const IMG = {};
  function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const hooks = { frame: [], overlay: [], newday: null }                                    // api.js gắn vào: mỗi khung hình / lớp phủ cuối / qua 0h
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
    MAN = window.__BUNDLE.manifest.sprites
    await Promise.all(Object.keys(MAN).map((n) => new Promise((res) => { const i = new Image(); i.onload = () => { IMG[n] = i; res() }; i.onerror = () => { stats.errors.push('thiếu ảnh ' + n); res() }; i.src = window.__BUNDLE.world[n] })))
    await Promise.all(['down', 'up', 'right'].flatMap((d) => [0, 1, 2, 3].map((f) => new Promise((res) => { const i = new Image(); i.onload = () => { PL[d + f] = i; res() }; i.onerror = () => res(); i.src = window.__BUNDLE.player[d + "_" + f] }))))
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
    for (let i = 0; i < d; i++) if (alleyT.has(kk(gx - 1, gy + i))) fl = Math.min(fl, 2)                // nhà che trước mặt ngõ (phía camera) thấp xuống 2 tầng để nhìn vào được ngõ
    for (let i = 0; i < w; i++) if (alleyT.has(kk(gx + i, gy - 1))) fl = Math.min(fl, 2)
    const nm = `h_${fam}_${F}_${fl}_${wall}${shop && !fam.startsWith('n') ? '_s' : ''}`
    if (!MAN[nm] || !cellsFree(gx, gy, w, d)) return false
    mark(gx, gy, w, d); const s = sprite(nm, gx, gy)
    if (!fam.startsWith('n')) { const fr = { fam, F, gx, gy, shop: !!shop && nm.endsWith('_s') }; fronts.push(fr); if (s) s.front = fr }   // 4B: nhà biết mặt tiền của mình (tầng trệt theo giờ quán)
    return true
  }
  const fronts = []
  const wfloors = (mix) => { const r = rnd(); let a = 0; for (const [f, p] of mix) { a += p; if (r < a) return f } return mix[mix.length - 1][0] }
  const MIX = { old: [[2, 0.12], [3, 0.4], [4, 0.48]], rail: [[2, 0.5], [3, 0.4], [4, 0.1]], mid: [[2, 0.25], [3, 0.5], [4, 0.25]] }
  function perimeter(b, o = {}) {
    const mix = MIX[o.mix || 'mid'], shopP = o.shop ?? 0.5
    // dọc một cạnh block: nhà 2 ô, nếu vướng cửa ngõ thì thử lại 1 ô; ô nào không đặt được thì bỏ qua
    const side = (fam, lo, hi, fixed, horiz, shopOK) => {
      for (let t = lo; t <= hi;) {
        let step = 1
        for (const F of rnd() < 0.5 && t < hi ? [2, 1] : [1]) {
          const [gx, gy] = horiz ? [t, fixed] : [fixed, t]
          if (house(fam, F, wfloors(mix), pick(WALLS), shopOK && rnd() < shopP, gx, gy)) { step = F; break }
        }
        t += step
      }
    }
    side('R', b.y0, b.y1, b.x1 - 2, false, true); side('nR', b.y0, b.y1, b.x0, false, false)
    side('L', b.x0 + 3, b.x1 - 3, b.y1 - 2, true, true); side('nL', b.x0 + 3, b.x1 - 3, b.y0, true, false)
  }

  // ───────── ngõ, ngách: đường nhỏ xuyên ruột block nhà ─────────
  // Ngõ thông (hai đầu ra phố), ngõ cụt có sân chung / miếu thổ địa ở cuối, ngõ ngoằn nghèo rẽ liên tục, ngách nhỏ tách từ ngõ lớn.
  // Ngõ rộng 1 ô; hai ngõ không bao giờ sát nhau (luôn có ít nhất một dãy nhà ở giữa).
  const alleyT = new Set(), alleys = [], yardT = new Set(), mouthTiles = []
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], kk = (x, y) => x + ',' + y
  function carveAlleys(b, bi, bj) {
    const inB = (x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
    const ring = (x, y) => x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1
    const edges = []
    if (bi < BLOCKX.length - 1) edges.push(['E', [-1, 0]], ['E', [-1, 0]])             // cửa ngõ ưu tiên hai cạnh nhìn thấy từ camera (đông, nam)
    if (bj < BLOCKY.length - 1) edges.push(['S', [0, -1]], ['S', [0, -1]])
    if (bi > 0) edges.push(['W', [1, 0]])
    if (bj > 0) edges.push(['N', [0, 1]])
    const mouths = []
    const mouthOk = (x, y) => {
      if (occ[y][x] || alleyT.has(kk(x, y))) return false
      const onX = x === b.x0 || x === b.x1, onY = y === b.y0 || y === b.y1; if (onX && onY) return false
      const t = onX ? y : x, lo = onX ? b.y0 : b.x0, hi = onX ? b.y1 : b.x1
      if (t < lo + 2 || t > hi - 2) return false
      if (x === b.x1 && x + 1 >= N || x === b.x0 && x < 1 || y === b.y1 && y + 1 >= N || y === b.y0 && y < 1) return false     // mép bản đồ: không có phố bên ngoài
      return mouths.every(([mx, my]) => Math.abs(mx - x) + Math.abs(my - y) >= 4)
    }
    const ok = (x, y, px, py, dx, dy) => {                     // ô (x,y) đi từ (px,py) theo hướng (dx,dy): không được dính ngõ khác
      if (!inB(x, y) || ring(x, y) || occ[y][x] || alleyT.has(kk(x, y))) return false
      const ax = x + dx, ay = y + dy, aheadIn = alleyT.has(kk(ax, ay))
      for (const [ex, ey] of D8) {
        const nx = x + ex, ny = y + ey; if (!alleyT.has(kk(nx, ny)) || (nx === px && ny === py)) continue
        if (Math.abs(nx - px) + Math.abs(ny - py) === 1) continue
        if (aheadIn && ((nx === ax && ny === ay) || Math.abs(nx - ax) + Math.abs(ny - ay) === 1)) continue
        return false
      }
      return true
    }
    const ri = (a, c) => a + Math.floor(rnd() * (c - a + 1))
    const walk = (start, dir0, style, fresh) => {
      const path = [], add = (x, y) => { alleyT.add(kk(x, y)); path.push([x, y]) }
      let cur = start, dir = dir0, ended = 'dead', exit = null
      if (fresh) add(start[0], start[1])
      const maxLen = style === 'cut' ? ri(6, 10) : style === 'br' ? ri(3, 5) : 99
      const segLen = () => style === 'wind' ? ri(2, 4) : style === 'br' ? 99 : ri(5, 9)
      let seg = style === 'wind' ? ri(2, 3) : 99
      for (let guard = 0; guard < 90 && path.length < maxLen; guard++) {
        const fwd = () => {
          const nx = cur[0] + dir[0], ny = cur[1] + dir[1]
          if (!inB(nx, ny)) return false
          if (alleyT.has(kk(nx, ny))) { ended = 'join'; return 'stop' }
          if (ring(nx, ny)) {
            if (style === 'br' || !mouthOk(nx, ny)) return false          // ngách cụt không được thông ra phố (thông ra phố thì gọi là ngõ)
            for (const [ex, ey] of D8) { const mx = nx + ex, my = ny + ey; if (alleyT.has(kk(mx, my)) && !(mx === cur[0] && my === cur[1])) return false }
            add(nx, ny); exit = [nx, ny]; ended = 'thru'; return 'stop'
          }
          if (!ok(nx, ny, cur[0], cur[1], dir[0], dir[1])) return false
          add(nx, ny); cur = [nx, ny]; seg--; return true
        }
        const turn = () => {
          const sides = rnd() < 0.5 ? [[dir[1], dir[0]], [-dir[1], -dir[0]]] : [[-dir[1], -dir[0]], [dir[1], dir[0]]]
          for (const s of sides) {
            const tx = cur[0] + s[0], ty = cur[1] + s[1]
            if (ok(tx, ty, cur[0], cur[1], s[0], s[1])) { add(tx, ty); cur = [tx, ty]; dir = s; seg = segLen(); return true }
          }
          return false
        }
        const r = seg <= 0 ? (turn() || fwd()) : (fwd() || turn())
        if (r === 'stop') break
        if (!r) { ended = 'dead'; break }
      }
      return { path, cur, dir, ended, exit }
    }
    const undo = (w) => { for (const [x, y] of w.path) alleyT.delete(kk(x, y)) }
    const area = (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1), want = area < 150 ? 1 : area < 260 ? 2 : Math.min(5, Math.ceil(area / 110))
    const mine = []
    for (let k = 0; k < want; k++) for (let tries = 0; tries < 24; tries++) {
      const [e, d] = pick(edges), style = k === 0 ? (rnd() < 0.5 ? 'easy' : 'wind') : pick(['wind', 'wind', 'wind', 'cut', 'easy'])
      const x = e === 'E' ? b.x1 : e === 'W' ? b.x0 : ri(b.x0 + 2, b.x1 - 2), y = e === 'S' ? b.y1 : e === 'N' ? b.y0 : ri(b.y0 + 2, b.y1 - 2)
      if (!mouthOk(x, y)) continue
      const w = walk([x, y], d, style, true)
      if (w.path.length < 4 && w.ended === 'dead') { undo(w); continue }
      mouths.push([x, y]); if (w.exit) mouths.push(w.exit)
      mine.push({ style, main: true, mouth: [x, y], mouth2: w.exit, tiles: w.path, ended: w.ended, yard: [], last: w.cur, dir: w.dir })
      break
    }
    for (const a of mine.slice()) {                          // ngách: nhánh cụt ngắn tách ra từ ngõ dài
      if (a.tiles.length < 7 || rnd() < 0.3) continue
      for (let tries = 0; tries < 6; tries++) {
        const i = ri(2, a.tiles.length - 3), [bx, by] = a.tiles[i], [px, py] = a.tiles[i - 1], [nx, ny] = a.tiles[i + 1]
        if (px - nx !== 0 && py - ny !== 0) continue          // chỉ tách ở đoạn thẳng
        const s = px === nx ? (rnd() < 0.5 ? [1, 0] : [-1, 0]) : (rnd() < 0.5 ? [0, 1] : [0, -1])
        const w = walk([bx, by], s, 'br', false)
        if (w.path.length < 2) { undo(w); continue }
        mine.push({ style: 'br', main: false, mouth: null, tiles: [[bx, by], ...w.path], ended: 'dead', yard: [], last: w.cur, dir: w.dir }); break
      }
    }
    for (const a of mine) if (a.ended === 'dead' && (a.main || rnd() < 0.4)) {   // sân chung ở cuối ngõ cụt (2x2)
      const [ex, ey] = a.last, [dx, dy] = a.dir, sx = dy, sy = dx
      for (const sg of rnd() < 0.5 ? [1, -1] : [-1, 1]) {
        const T = [[ex + dx, ey + dy], [ex + sx * sg, ey + sy * sg], [ex + dx + sx * sg, ey + dy + sy * sg]], tail = new Set(a.tiles.slice(-3).map(([x, y]) => kk(x, y)))
        const fine = T.every(([x, y]) => inB(x, y) && !ring(x, y) && !occ[y][x] && !alleyT.has(kk(x, y)) && D8.every(([ex2, ey2]) => { const q = kk(x + ex2, y + ey2); return !alleyT.has(q) || tail.has(q) || T.some(([tx, ty]) => kk(tx, ty) === q) }))
        if (fine) { for (const [x, y] of T) { alleyT.add(kk(x, y)); yardT.add(kk(x, y)); a.yard.push([x, y]) } break }
      }
    }
    for (const a of mine) { alleys.push(a); for (const [x, y] of a.tiles.concat(a.yard)) { kind[y][x] = 'alley'; occ[y][x] = true } }
    for (const m of mouths) mouthTiles.push(m)
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
  // ───────── điểm dịch vụ (sites) cho gameplay / GPS: lấy từ vị trí thật của sạp phở, bánh mì, xích lô, bàn cà phê tàu, ki-ốt ─────────
  const sites = [], SITE_LABEL = { pho: 'Quán phở', tc: 'Quán trà chanh', banhmi: 'Xe bánh mì', xichlo: 'Xích lô', rail: 'Điểm xem tàu', hair: 'Ki-ốt cắt tóc' }
  const siteKindOf = (n) => n === 'p_pho' ? 'pho' : n === 'p_banhmi' ? 'banhmi' : n === 'p_cyclo' ? 'xichlo' : n === 'p_kiosk' ? 'hair' : /^p_tc_(set|counter)/.test(n) ? 'tc' : null
  const areaOf = (gx, gy) => inR(gy, RAILC) ? 'phố tàu' : inR(gy, CORRY[PED]) ? 'phố đi bộ' : (gx >= PLAY.x0 && gx <= PLAY.x1 + 1 && gy >= PLAY.y0 && gy <= PLAY.y1 + 1) ? 'khu vui chơi' : 'phố cổ'
  function addSite(k, gx, gy, label) {
    let id = `${k}_${Math.floor(gx)}_${Math.floor(gy)}`; for (let i = 2; sites.some((q) => q.id === id); i++) id = `${k}_${Math.floor(gx)}_${Math.floor(gy)}_${i}`
    sites.push({ id, kind: k, gx, gy, label: `${label || SITE_LABEL[k]} · ${areaOf(gx, gy)}` })
  }
  function prop(name, gx, gy, o = {}) {
    if (!MAN[name]) return null
    const sk = siteKindOf(name); if (sk) addSite(sk, gx, gy)
    const s = sprite(name, gx, gy, o)
    if (name === 'p_lamp') lamps.push({ gx, gy })
    const r = o.r ?? PROP_R[name] ?? (name.startsWith('t_') ? 0.28 : 0.3)
    if (SOFT.test(name)) { if (r > 0) softProps.push({ x: gx, y: gy, r }) }       // vật nhỏ: đi xuyên được (người chơi, Auto-Walk, NPC cùng luật)
    else if (r > 0) colliders.push({ x: gx, y: gy, r })
    return s
  }
  // Đợt 4 — vật NHỎ đi xuyên được: sạp hàng, ghế/bàn nhựa, ô dù, cột điện, cột đèn, cây, ghế đá, bồn hoa/chậu cây, biển tên phố/biển ngõ,
  // thùng rác, tủ nước, xe đỗ nhỏ (xe máy, xích lô), cột cờ, dây điện/dây phơi. VẪN CỨNG (không qua đây hoặc đẩy collider riêng):
  // nhà/tường (blk), nước, hàng rào đường ray, barie khi hạ, nhà chờ xe buýt, cổng Ô Quan Chưởng, cổng chào, cổng cầu, đền/tháp (mark).
  const SOFT = /^(t_|mop_|p_(pho|banhmi|fruit|kiosk|cafe_|stools|umb_|tc_set_|tc_counter_|tc_plants|tc_cooler|tc_flag|bench_|planter|pots_|bin|lamp|pole|flagpole|plate_|ngo_|cyclo|wires_|laundry_))/
  const softProps = []                                                        // vị trí vật nhỏ (chỉ để chọn chỗ ĐỨNG cạnh sạp, không chặn đường)
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
    // biển ngã tư chọn tên theo vị trí: bắc hồ (phía phố cổ) = Hàng Đào / Hàng Bạc; nam hồ = Tràng Tiền / Lý Thường Kiệt (không đổi vị trí, không gọi rnd)
    let k = 0; const NORTH = [3, 4], SOUTH = [2, 7]
    for (const cx of CORRX) for (const cy of CORRY_T) { const L = cy[1] < LAKE.y0 ? NORTH : SOUTH; plate(k % 2 ? 'x' : 'y', L[k++ % 2], cx[0] + 1, cy[0] + 1) }
    for (const ax of ARCHX) {
      const nm = ax === 47 ? 'lm_arch_shop' : ax === 38 ? 'lm_arch_walk' : 'lm_arch_lake', gy = CORRY[PED][0]
      mark(ax, gy, 1, 7, false); sprite(nm, ax, gy)
      colliders.push({ x: ax + 0.5, y: gy + 10 / 36, r: 0.3 }, { x: ax + 0.5, y: gy + 7 - 10 / 36, r: 0.3 })
      for (const cy of [0.28, 6.72]) nightLights.push({ gx: ax + 0.5, gy: gy + cy, z: 60, r: 30, a: 0.5, kind: 'lakePost', grp: 'deco' })
      nightLights.push({ gx: ax + 0.5, gy: gy + 3.5, z: 85, r: 70, a: 0.35, kind: 'lantern', grp: 'deco' })
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
      f.px = cx; f.py = cy; f.axis = axis                                   // 4B: chỗ vỉa hè trước cửa (đèn hắt ra, khách ngồi)
      if (f.shop) {
        if (r < 0.28) prop(f.prop = pick(['p_cafe_red', 'p_cafe_green']), cx, cy)
        else if (r < 0.42) prop(f.prop = 'p_pho', cx, cy)
        else if (r < 0.52) prop(f.prop = 'p_banhmi', cx, cy)
        else if (r < 0.62) prop(f.prop = 'p_stools', cx, cy)
        else if (r < 0.72) prop(f.prop = 'p_fruit', cx, cy)
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
      { id: 'pen', label: 'Tháp Bút – Đài Nghiên', gx: X0 + 21.5, gy: Y0 + 5.5, r: 2.4 }, { id: 'tower', label: 'Tháp Rùa (ngắm từ bờ đông)', gx: X0 + 22.5, gy: Y0 + 15.5, r: 2.4 })
  }

  function genGate() {                                         // Ô Quan Chưởng nằm giữa phố đi bộ: hai bên đều là chợ đêm / ẩm thực
    const gx = 24, gy = CORRY[PED][0]
    mark(gx, gy, 1, 7, false)
    for (const [a0, a1] of [[0, 0.667], [1.778, 2.944], [4.056, 5.222], [6.333, 7]]) {                    // chỉ các trụ tường chặn: đi bộ qua được cả 3 cổng (giữa + 2 ô nhỏ)
      const n = Math.max(2, Math.ceil((a1 - a0 - 0.4) / 0.35) + 1)
      for (let i = 0; i < n; i++) for (const dx of [0.2, 0.5, 0.8]) colliders.push({ x: gx + dx, y: gy + a0 + 0.2 + (a1 - a0 - 0.4) * i / (n - 1), r: 0.2 })
    }
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
        prop(nm, x + 1.0, row + 0.5); nightLights.push({ gx: x + 1.0, gy: row + 0.5, z: 48, r: 46, a: 0.62, stall: nm })
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
    const put = (name, x, y, r, nl) => { if (!free(x, y)) return false; used.add(Math.floor(x) + ',' + Math.floor(y)); prop(name, x, y, { r }); if (nl) nightLights.push({ gx: x, gy: y, z: nl[0], r: nl[1], a: nl[2], stall: name }); return true }
    let seg = 0
    for (const [x0, x1] of BLOCKX) for (let x = x0 + 1; x + 5 <= x1; x += 8, seg++) {
      const yN = RS + 0.5, yS = RN + 0.5                                    // hàng sát hàng rào (bắc: 45, nam: 49)
      // phía bắc: quầy cafe sát nhà ở nửa đầu hàng 44, bàn ghế sát hàng rào ở nửa sau hàng 45 -> luôn có lối đi chéo qua đoạn quán
      if (free(x + 1.0, RAILC[0] + 0.5)) { used.add(Math.floor(x + 1.0) + ',' + RAILC[0]); prop('p_tc_counter_' + CAFE[seg % 4], x + 1.0, RAILC[0] + 0.55, { r: 0, bb: [x + 0.3, x + 1.7, RAILC[0] + 0.2, RAILC[0] + 0.9] }); softProps.push({ x: x + 0.7, y: RAILC[0] + 0.55, r: 0.4 }, { x: x + 1.3, y: RAILC[0] + 0.55, r: 0.4 }); nightLights.push({ gx: x + 1.0, gy: RAILC[0] + 0.55, z: 40, r: 44, a: 0.62, stall: 'p_tc_counter' }) }
      put('p_tc_plants', x + 1.95, RAILC[0] + 0.5, 0.35)
      for (const dx of [3.45, 4.7]) put('p_tc_set_' + SET[(seg + Math.floor(dx * 3)) % 5], x + dx, yN, 0.55, [44, 34, 0.5])
      prop('p_tc_flag', x + 0.1, RAILC[0] + 0.5, { r: 0.1 })
      // phía nam: bàn ghế sát hàng rào ở nửa đầu hàng 49, chậu cây và tủ nước ở nửa sau hàng 50
      for (const dx of [0.8, 1.9]) put('p_tc_set_' + SET[(seg + Math.floor(dx * 5)) % 5], x + dx, yS, 0.55, [44, 34, 0.5])
      put('p_tc_plants', x + 3.9, RAILC[1] + 0.5, 0.35); put('p_tc_cooler', x + 4.8, RAILC[1] + 0.5, 0.3)
      // chuỗi đèn lồng giăng ngang phố
      for (const lx of [x + 1.0, x + 3.6]) lanterns.push({ x: lx, y0: RAILC[0] + 0.1, y1: RAILC[1] + 0.9 })
    }
    crossings.forEach((c, i) => addSite('rail', c.x0 + 1.5, RS + 0.5, `Chắn tàu số ${i + 1}`))
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
    for (const [n, y] of col1) { prop(n, 21.0 + sx, y + sy); nightLights.push({ gx: 21.0 + sx, gy: y + sy, z: 48, r: 44, a: 0.6, stall: n }) }
    for (const [n, y] of col2) { prop(n, 25.0 + sx, y + sy); nightLights.push({ gx: 25.0 + sx, gy: y + sy, z: 48, r: 44, a: 0.6, stall: n }) }
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
    for (let x = x0 + 2; x < x1 - 1; x += 3) for (const row of [y0 + 2, y1 - 2]) { const nm = names[(k++ * 3 + x) % names.length]; prop(nm, x + 1.0, row + 0.5); nightLights.push({ gx: x + 1.0, gy: row + 0.5, z: 48, r: 46, a: 0.6, stall: nm }) }
    for (const x of [x0 + 12, x0 + 13]) for (const y of [y0 + 4, y1 - 4]) prop('p_planter', x + 0.5, y + 0.5)
    for (let x = x0 + 2; x <= x1 - 2; x += 4) for (const y of [y0 + 1, y1 - 1]) prop('p_lamp', x + 0.5, y + 0.5)
    for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 1, y1 - 1], [x1 - 1, y1 - 1]]) prop('t_bang_1', x + 0.5, y + 0.55)
    prop('p_flagpole', x0 + 12.5, y0 + 6.5); prop('p_bench_x', x0 + 10.5, y0 + 7.5); prop('p_bench_x', x0 + 14.5, y0 + 7.5)
    pois.push({ id: 'play', label: 'Khu vui chơi – mua sắm (sắp mở)', gx: (x0 + x1) / 2 + 0.5, gy: (y0 + y1) / 2 + 0.5, r: 5 })
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

  function genAlleyLife() {                                   // biển số ngõ ở cửa ngõ, dây điện, dây phơi, chậu cây, xe máy, sân chung, miếu thổ địa
    const has = (x, y) => alleyT.has(kk(x, y)), ri = (a, c) => a + Math.floor(rnd() * (c - a + 1))
    const axisOf = (x, y) => { const ex = has(x - 1, y) || has(x + 1, y), ey = has(x, y - 1) || has(x, y + 1); return ex && !ey ? 'x' : ey && !ex ? 'y' : null }
    const edgeOf = (x, y) => { const bx = BLOCKX.find((r) => inR(x, r)), by = BLOCKY.find((r) => inR(y, r)); return x === bx[1] ? 'E' : y === by[1] ? 'S' : x === bx[0] ? 'W' : 'N' }
    let pn = 0
    const NGO_STREET = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11]                   // biển NGÕ gắn ở cửa ngõ ra phố (index 8 là biển NGÁCH, chỉ treo ở chỗ ngách tách ra từ ngõ)
    const done = new Set()
    for (const a of alleys) {
      for (const m of [a.mouth, a.mouth2]) if (m && !done.has(kk(...m))) {
        done.add(kk(...m)); const [x, y] = m, e = edgeOf(x, y), ax = e === 'E' || e === 'W' ? 'y' : 'x'
        const px = e === 'E' ? x + 0.86 : x + 0.14, py = e === 'S' ? y + 0.86 : y + 0.14
        prop(`p_ngo_${ax}_${NGO_STREET[pn++ % NGO_STREET.length]}`, px, py, { r: 0.06 })
        nightLights.push({ gx: x + 0.5, gy: y + 0.5, z: 56, r: 40, a: 0.55, grp: 'alley' })
        const [fx, fy] = e === 'E' ? [1, 0] : e === 'W' ? [-1, 0] : e === 'S' ? [0, 1] : [0, -1]
        for (let k = 1; k <= SW; k++) for (let l = -1; l <= 1; l++) used.add(kk(x + fx * k + Math.abs(fy) * l, y + fy * k + Math.abs(fx) * l))          // vỉa hè trước cửa ngõ (rộng 3 ô) để trống: không đặt cột điện, đèn, cây, sạp che lối vào
      }
      const T = a.tiles
      if (!a.main && T.length > 2 && rnd() < 0.6) {                // biển NGÁCH 9/3 ở chỗ ngách tách khỏi ngõ lớn
        const [bx, by] = T[1], [px0, py0] = T[0], horiz = bx !== px0
        prop(`p_ngo_${horiz ? 'y' : 'x'}_8`, bx + 0.14, by + 0.14, { r: 0.06 })
      }
      T.forEach(([x, y], i) => {
        if (a.mouth && i === 0 || yardT.has(kk(x, y))) return
        const ax = axisOf(x, y), cx = x + 0.5, cy = y + 0.5; if (!ax) return
        let wires = false
        if (i % 4 === 1) { prop(`p_wires_${ax}_${ri(0, 1)}`, cx, cy, { r: 0 }); wires = true }
        if (!wires && i % 4 === 3) prop(`p_laundry_${ax}_${ri(0, 2)}`, cx, cy, { r: 0 })
        const sg = rnd() < 0.5 ? 1 : -1, ox = ax === 'x' ? 0 : sg * 0.42, oy = ax === 'x' ? sg * 0.42 : 0
        if (i % 2 === 0 && rnd() < 0.55) prop('p_pots_' + ri(0, 3), cx + ox, cy + oy, { r: 0, bb: [cx + ox - 0.12, cx + ox + 0.12, cy + oy - 0.12, cy + oy + 0.12] })
        else if (i % 5 === 3 && rnd() < 0.55) { const m = ri(0, 5), s2 = 0.42 * -sg; prop(`mop_${m}_${ax}`, ax === 'x' ? cx : cx + s2, ax === 'x' ? cy + s2 : cy, { r: 0, bb: ax === 'x' ? [cx - 0.35, cx + 0.35, cy + s2 - 0.1, cy + s2 + 0.1] : [cx + s2 - 0.1, cx + s2 + 0.1, cy - 0.35, cy + 0.35] }) }
        if (i % 5 === 0) nightLights.push({ gx: cx, gy: cy, z: 50, r: 30, a: 0.5, grp: 'alley' })
      })
      const Y = a.yard
      if (Y.length === 4 || Y.length === 3) {
        const [t0, t1, t2] = Y, c = (t) => [t[0] + 0.5, t[1] + 0.5]
        const [a0, b0] = c(t0), [a1, b1] = c(t1), [a2, b2] = c(t2)
        const out = (px, py, d) => { const mx = (a0 + a1 + a2 + (a0 + a1 - a2)) / 4, my = (b0 + b1 + b2 + (b0 + b1 - b2)) / 4, vx = px - mx, vy = py - my, L = Math.hypot(vx, vy) || 1; return [px + vx / L * d, py + vy / L * d] }
        const q0 = out(a0, b0, 0.22), q1 = out(a1, b1, 0.22), q2 = out(a2, b2, 0.22)
        const f2 = out(a2, b2, 0.3), f0 = out(a0, b0, 0.3), f1 = out(a1, b1, 0.3)
        prop('p_shrine', f2[0], f2[1], { r: 0.12 }); prop('t_small_' + ri(1, 3), f0[0], f0[1], { r: 0.1 }); prop('p_pots_' + ri(0, 3), f1[0], f1[1], { r: 0 })
        for (const t of Y) nightLights.push({ gx: t[0] + 0.5, gy: t[1] + 0.5, z: 52, r: 44, a: 0.6, grp: 'yard' })
      } else if (a.ended === 'dead' && a.last) {
        const [ex, ey] = a.last, [dx, dy] = a.dir
        prop('p_shrine', ex + 0.5 + dx * 0.34, ey + 0.5 + dy * 0.34, { r: 0.07 }); nightLights.push({ gx: ex + 0.5, gy: ey + 0.5, z: 30, r: 34, a: 0.6, kind: 'shrine', grp: 'home' })
      }
    }
    const win = alleys.filter((a) => a.style === 'wind' && a.tiles.length >= 8).sort((p, q) => q.tiles.length - p.tiles.length)[0]
    if (win) { const [x, y] = win.tiles[Math.floor(win.tiles.length / 2)]; pois.push({ id: 'ngo', label: 'Ngõ ngoằn nghèo', gx: x + 0.5, gy: y + 0.5, r: 2.2 }) }
  }

  // ───────── nhà người chơi: một phòng trọ có cửa nhìn ra ngõ (chọn cố định, KHÔNG dùng rnd để bố cục bản đồ giữ nguyên) ─────────
  let home = null
  function homeSignCanvas() {                                  // đèn cửa vàng ấm + biển số nhà xanh nhỏ, vẽ cho mặt tường hướng nam (L); mặt đông (R) lật ngang
    const c = document.createElement('canvas'); c.width = 12; c.height = 17; const x = c.getContext('2d')
    const P = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1) }
    // đèn: chao tối, kính vàng, tay đỡ
    for (const [X, Y] of [[1, 0], [2, 0], [3, 0], [0, 1], [4, 1], [0, 2], [4, 2], [0, 3], [4, 3], [1, 4], [2, 4], [3, 4]]) P(X, Y, '#2a1c14')
    for (const [X, Y] of [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3], [3, 3]]) P(X, Y, '#ffcf5a')
    P(1, 1, '#fff4c4'); P(2, 1, '#fff4c4'); P(1, 2, '#fff4c4')
    P(2, 5, '#2a1c14'); P(3, 6, '#2a1c14')
    // biển số nhà: hình bình hành theo mặt tường (đi 2 px sang phải thì xuống 1 px), viền tối, nền xanh, số trắng
    for (let i = 0; i < 7; i++) {
      const X = 4 + i, y0 = 8 + (i >> 1)
      P(X, y0, '#1a2440'); P(X, y0 + 5, '#1a2440')
      for (let k = 1; k <= 4; k++) P(X, y0 + k, i === 0 || i === 6 ? '#1a2440' : '#2f62b4')
    }
    for (const [i, k] of [[2, 2], [2, 3], [4, 2], [4, 3], [5, 3]]) P(4 + i, 8 + (i >> 1) + k, '#f2f4f8')
    return c
  }
  function genHome() {
    const mouth = new Set(mouthTiles.map(([x, y]) => kk(x, y))), idx = new Map()
    for (const a of alleys) a.tiles.forEach(([x, y], i) => { const k = kk(x, y); if (!idx.has(k)) idx.set(k, i) })
    let best = null, bd = 1e9
    for (const f of fronts) {
      const half = Math.floor(f.F / 2), [tx, ty] = f.fam === 'R' ? [f.gx + 3, f.gy + half] : [f.gx + half, f.gy + 3], k = kk(tx, ty)
      if (!alleyT.has(k) || yardT.has(k) || mouth.has(k) || (idx.get(k) ?? 0) < 2) continue
      const d = Math.hypot(tx + 0.5 - SPAWN[0], ty + 0.5 - SPAWN[1]); if (d < bd) { bd = d; best = { f, tx, ty } }
    }
    if (!best) return
    const { f, tx, ty } = best, R = f.fam === 'R'
    const along = R ? f.gy + f.F / 2 : f.gx + f.F / 2                          // giữa mặt tiền = cửa
    const face = R ? f.gx + 3 : f.gy + 3
    const sg = R ? [face, along - 0.36] : [along + 0.36, face]                // đèn + biển cạnh cửa, trên tường
    const base = homeSignCanvas(), img = R ? (() => { const m = document.createElement('canvas'); m.width = base.width; m.height = base.height; const mx = m.getContext('2d'); mx.translate(base.width, 0); mx.scale(-1, 1); mx.drawImage(base, 0, 0); return m })() : base
    const [sx, sy] = proj(sg[0], sg[1]), Z = 24                               // mép trên hình ~ngang đầu cửa (cửa cao ~19 px)
    const bb = R ? [face + 0.01, face + 0.06, sg[1] - 0.12, sg[1] + 0.12] : [sg[0] - 0.12, sg[0] + 0.12, face + 0.01, face + 0.06]
    statics.push({ name: 'home_sign', img, dx: Math.round(sx - img.width / 2), dy: Math.round(sy - Z), w: img.width, h: img.height, bb, flat: false, sh: null })
    nightLights.push({ gx: R ? face + 0.08 : sg[0] - 0.1, gy: R ? sg[1] + 0.1 : face + 0.08, z: Z - 2, r: 22, a: 0.75, kind: 'warm', grp: 'home' })
    home = { door: { gx: R ? face + 0.1 : along, gy: R ? along : face + 0.1 }, tile: [tx, ty], fam: f.fam }
    sites.push({ id: 'home', kind: 'home', gx: tx + 0.5, gy: ty + 0.5, label: 'Phòng trọ của bạn', door: { ...home.door } })
  }

  function genBlocks() {
    const B = (i, j) => ({ x0: BLOCKX[i][0], x1: BLOCKX[i][1], y0: BLOCKY[j][0], y1: BLOCKY[j][1] })
    const skip = new Set(['2,2', '2,1', '3,2']), modern = new Set(['4,0', '4,1', '4,2', '4,5'])
    for (let i = 0; i < BLOCKX.length; i++) for (let j = 0; j < BLOCKY.length; j++) {
      const key = i + ',' + j; if (skip.has(key)) continue
      if (modern.has(key)) { carveAlleys(B(i, j), i, j); modernBlock(B(i, j)); continue }
      const mix = j === 3 || j === 4 ? 'rail' : i <= 1 && j <= 2 ? 'old' : 'mid'
      const b = B(i, j); if (mix !== 'rail') carveAlleys(b, i, j)
      perimeter(b, { mix, shop: j >= 3 && j <= 4 ? 0.4 : 0.55 }); interior(b, mix)
    }
  }

  function fillGaps() {                                       // lấp các ô trống kín trong khu nhà bằng nhà / bụi cây
    const inBlock = (x, y) => BLOCKX.some((r) => inR(x, r)) && BLOCKY.some((r) => inR(y, r))
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (occ[y][x] || kind[y][x] !== 'grass' || !inBlock(x, y)) continue
      let ok = false
      const bk = (px, py) => BLOCKX.findIndex((r) => inR(px, r)) * 100 + BLOCKY.findIndex((r) => inR(py, r))
      for (const [fam, F] of [['R', 2], ['R', 1], ['L', 2], ['L', 1]]) if (bk(x, y) === bk(x + (fam === 'R' ? 2 : F - 1), y + (fam === 'R' ? F - 1 : 2)) && house(fam, F, wfloors(MIX.mid), pick(WALLS), false, x, y)) { ok = true; break }
      if (!ok) { mark(x, y, 1, 1); prop('t_bush_1', x + 0.5, y + 0.55, { r: 0.2 }) }
    }
  }

  // ───────── 4B: loại quán ở mặt tiền + giờ mở cửa thật (docs/STREET_LIFE.md §3, §5.2) ─────────
  // Không gọi rnd() ở đây (giữ nguyên bản đồ + id site): loại quán và "tính cách" mở/đóng lấy từ hash vị trí.
  const SHOP_OPEN = { pho: 'pho', banhmi: 'banhmi', tea: 'trachanh', biahoi: 'biahoi', trada: 'trada', taphoa: 'taphoa', clothes: 'quanao', cafe: 'caphe', combinh: 'combinh', cstore: 'cstore' }
  const SHOP_LIGHT = { pho: 'pho', banhmi: 'banhmi', tea: 'tea', biahoi: 'biahoi', trada: 'cafe', taphoa: 'taphoa', clothes: 'clothes', cafe: 'cafe', combinh: 'pho', cstore: 'cstore' }
  const SITE_OPEN = { pho: 'pho', banhmi: 'banhmi', tc: 'caphe', hair: 'kiosk' }               // xích lô, điểm xem tàu, nhà: luôn "mở"
  function assignShops() {
    for (const f of fronts) {
      if (f.px === undefined) { if (f.fam === 'R') { f.px = f.gx + 3.5; f.py = f.gy + f.F / 2; f.axis = 'y' } else { f.px = f.gx + f.F / 2; f.py = f.gy + 3.5; f.axis = 'x' } }
      if (!f.shop) continue
      const u = hash01(f.gx * 31 + 7, f.gy * 17 + 3, 11), p = f.prop || ''
      f.sk = p === 'p_pho' ? 'pho' : p === 'p_banhmi' ? 'banhmi' : p.startsWith('p_cafe') ? 'tea' : p === 'p_stools' ? (u < 0.5 ? 'biahoi' : 'trada') : p === 'p_fruit' ? 'taphoa'
        : u < 0.36 ? 'clothes' : u < 0.6 ? 'taphoa' : u < 0.74 ? 'cafe' : u < 0.86 ? 'combinh' : 'biahoi'
      f.seed = hash01(f.gx * 13 + 1, f.gy * 29 + 5, 21)
    }
    for (const s of sites) {
      s.ped = inR(Math.floor(s.gy), CORRY[PED])                                   // sạp phố đi bộ: chợ đêm T6–CN
      const f = fronts.find((q) => q.px !== undefined && Math.abs(q.px - s.gx) < 0.05 && Math.abs(q.py - s.gy) < 0.05 && q.shop)
      if (f && (s.kind === 'pho' || s.kind === 'banhmi')) s.front = f                  // xe phở/bánh mì trước cửa hàng: mở cùng giờ với cửa hàng
      s.seed = hash01(Math.round(s.gx * 10), Math.round(s.gy * 10), 77)
    }
    pinSites()
  }
  function shopOpen(f, h = sky.hour, wd = cal.wd) {
    const key = Math.floor(h * 120) + wd * 4000; if (f._ok === key) return f._ov            // đệm theo nấc 30 giây game
    f._ok = key
    return (f._ov = f.pin ? SL.inHours(h, f.pin.open, f.pin.close) : f.seed < SL.openProb(SHOP_OPEN[f.sk] || 'taphoa', h, wd))
  }
  function siteOpenAt(s, h = sky.hour, wd = cal.wd) {
    if (!s) return false
    if (s.pin) return SL.inHours(h, s.pin.open, s.pin.close)
    const k = SITE_OPEN[s.kind]; if (!k) return true
    if (s.ped && (wd === 5 || wd === 6 || wd === 0) && h >= 18) return true          // chợ đêm phố đi bộ 18h–24h (§2)
    if (s.front) return shopOpen(s.front, h, wd)
    return s.seed < SL.openProb(k, h, wd)
  }
  // quán ghim (§3.3): giờ nào cũng ≥2 chỗ ăn. Chọn quán CÓ SẴN, xa nhau; không thêm site mới.
  const PINS = []
  function pinSites() {
    const food = (k) => sites.filter((s) => s.kind === k && !s.ped && !s.pin)
    const nearest = (L, x, y) => L.sort((a, b) => Math.hypot(a.gx - x, a.gy - y) - Math.hypot(b.gx - x, b.gy - y))[0]
    const pin = (s, id, open, close, label) => {
      if (!s) return
      s.pin = { id, open, close }; s.pinned = id; s.hours = `${SL.fmtH(open)}–${SL.fmtH(close)}`
      s.label = `${label}${open === close ? '' : ` (${s.hours})`} · ${areaOf(s.gx, s.gy)}`          // "Cửa hàng tiện lợi 24h · phố cổ", "Phở đêm (18:00–03:00) · phố cổ"
      if (s.front) { s.front.pin = { open, close }; if (id === 'circle_k') s.front.sk = 'cstore' }
      PINS.push(s)
    }
    pin(nearest(sites.filter((s) => s.kind === 'banhmi' && s.front && !s.ped), SPAWN[0], SPAWN[1]), 'circle_k', 0, 0, 'Cửa hàng tiện lợi 24h')   // bán bánh mì, đồ ăn nóng [21]
    pin(nearest(food('pho'), 20, 52), 'pho_dem', 18, 3, 'Phở đêm')                       // kiểu Phở Huy, Phùng Hưng [15]
    pin(nearest(food('pho'), 22, 18), 'pho_ganh', 3, 10, 'Phở gánh')           // kiểu phở gánh Hàng Chiếu [15]
    pin(nearest(food('banhmi'), 92, 62), 'banh_mi_khuya', 20, 4, 'Bánh mì khuya')         // xe bánh mì khuya [QS]
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
      else if (k === 'alley') n = 'g_alley_' + (yardT.has(kk(x, y)) ? 1 : (x * 5 + y * 3) % 11 === 0 ? 2 : 0)
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
  // 4B — nhịp xe theo giờ + thứ (docs/STREET_LIFE.md §1.2, §5.1): mỗi làn có một "kho" xe cố định (không đổi độ dài mảng),
  // xe nào `on` mới chạy/vẽ. Số xe bật = sức chứa × mật độ giờ đó. Giờ cao điểm ngày thường các trục chính bò chậm, dồn hàng.
  // Không đỗ trên ray/vạch qua đường/giữa ngã tư (vùng "giữ trống"). Phố đi bộ (T6 19h → CN 24h): đoạn quanh hồ có rào, xe quay đầu.
  const MOBILE = typeof innerWidth !== 'undefined' && innerWidth < 700
  const POOL = MOBILE ? 9 : 13, POOL_MAIN = MOBILE ? 16 : 28
  const tr = { D: SL.densityAt(15.5, 5), hornCD: 4, ws: false, lastH: null, lastDay: null }
  function newVeh(lane, pos) {
    const D = tr.D, t = rnd(), v = { lane, pos, v: 0, lat: 0, dwell: 0, visited: new Set(), on: true, brk: false, stopT: 0 }
    const pBus = lane.busOK ? 0.13 * D.bus : 0, pCar = clamp(D.car / (D.moto * 2.4 + D.car + 1e-6), 0.1, 0.42)
    if (t < pBus) { v.type = 'bus'; v.len = 3.39; v.vmax = rr(1.7, 2.1); v.sp = `bus_${pick(['a', 'b', 'c'])}_`; v.lat = rr(-0.05, 0.05) }
    else if (t < pBus + pCar) { v.type = 'car'; v.len = 1.72; v.vmax = rr(2.1, 2.8); v.sp = `car_${Math.floor(rnd() * 5)}_`; v.lat = rr(-0.1, 0.1) }
    else { v.type = 'moto'; v.len = 0.83; v.vmax = rr(2.3, 3.3); v.sp = `mo_${Math.floor(rnd() * 6)}_`; v.lat = rr(-0.28, 0.28) }
    v.name = v.sp + SUF(lane.axis, lane.dir); return v
  }
  function genTraffic() {
    for (const r of ROADY) { LANES.push({ axis: 'x', dir: 1, c: r[0] + 2.5, vs: [], stops: [] }); LANES.push({ axis: 'x', dir: -1, c: r[0] + 0.5, vs: [], stops: [] }) }
    for (const r of ROADX) { LANES.push({ axis: 'y', dir: 1, c: r[0] + 0.5, vs: [], stops: [] }); LANES.push({ axis: 'y', dir: -1, c: r[0] + 2.5, vs: [], stops: [] }) }
    const onRoad = (L, R) => inR(Math.floor(L.c), R)
    LANES.forEach((L, i) => {
      L.idx = i; L.pair = i ^ 1
      L.main = L.axis === 'x' ? onRoad(L, BUSY) : onRoad(L, ROADX[1]) || onRoad(L, ROADX[2])          // Hàng Khay, Lê Thái Tổ, Đinh Tiên Hoàng
      L.busOK = L.axis === 'x' ? onRoad(L, BUSY) || onRoad(L, ROADY[ROADY.length - 1]) : onRoad(L, ROADX[0]) || onRoad(L, ROADX[3])
      L.cl = null                                                                                  // đoạn cấm xe khi phố đi bộ: [a,b] theo trục làn
      if (L.axis === 'x' && onRoad(L, BUSY)) L.cl = [CORRX[1][0], CORRX[2][1] + 1]                 // Hàng Khay (cả hai chiều)
      if (L.axis === 'y' && onRoad(L, ROADX[2])) L.cl = [CORRY[PED][0], CORRY[2][1] + 1]           // Đinh Tiên Hoàng (cả hai chiều)
      if (L.axis === 'y' && onRoad(L, ROADX[1]) && L.dir < 0) L.cl = [CORRY[PED][0], CORRY[2][1] + 1]   // Lê Thái Tổ: chỉ nửa đường phía hồ [3]
      L.detour = !L.cl && (L.axis === 'x' ? onRoad(L, ROADY[0]) : onRoad(L, ROADX[1]))              // xe dồn sang phố bao quanh (×1.3)
      L.zones = (L.axis === 'x' ? CORRX : CORRY).map((c) => [c[0], c[1] + 1])                      // ngã tư + vạch qua đường
      if (L.axis === 'y') L.zones.push([RS, RN + 1])                                                // đường ray: không bao giờ dừng trên ray
      L.pool = L.main ? POOL_MAIN : POOL; L.tgt = 1; L.spawnT = 0
      const corr = L.axis === 'x' ? CORRX : CORRY_T
      for (const c of corr) L.stops.push({ pos: L.dir > 0 ? c[0] - 0.1 : c[1] + 1.1, closed: () => (L.axis === 'x' ? ph.i !== 0 : ph.i !== 2) })
      if (L.axis === 'y') {
        const k = ROADX.findIndex((r) => inR(Math.floor(L.c), r))
        L.stops.push({ pos: L.dir > 0 ? RS - 0.1 : RN + 1.1, closed: () => crossings[k].down })
      }
      const span = N + 10
      for (let k = 0; k < L.pool; k++) { const p = -5 + (k + rnd() * 0.6) * span / L.pool; L.vs.push(newVeh(L, L.dir > 0 ? p : N - p + 0)) }
    })
  }
  const inClosed = (L, p) => tr.ws && L.cl && p > L.cl[0] - 0.2 && p < L.cl[1] + 0.2
  function laneTarget(L) {
    const D = tr.D, base = 0.72 * D.moto + 0.28 * D.car
    let f = L.main ? 1 : 0.72
    if (tr.ws) f *= L.cl ? 0.9 : L.detour ? 1.3 : 1.1
    if (L.main) f *= 1 + 0.35 * D.rush
    return clamp(Math.round(L.pool * clamp(base, 0, 1) * f), 1, L.pool)
  }
  // rải lại xe theo mật độ mới (khi nhảy giờ / đổi ngày): không đặt vào vùng giữ trống hay đoạn cấm
  function resettleTraffic() {
    tr.D = SL.densityAt(sky.hour, cal.wd); tr.ws = tr.D.ws
    for (const L of LANES) {
      L.tgt = laneTarget(L); const n = L.tgt, span = N + 6
      L.vs.forEach((v, k) => {
        if (k >= n) { v.on = false; v.pos = L.dir > 0 ? -9 : N + 9; v.v = 0; return }
        let p = -3 + (k + 0.15 + rnd() * 0.5) * span / n
        for (const z of L.zones) if (p > z[0] - 1.2 && p < z[1] + 1.2) p = L.dir > 0 ? z[0] - 1.3 : z[1] + 1.3
        if (inClosed(L, p)) p = L.dir > 0 ? L.cl[0] - 1.5 - rnd() * 6 : L.cl[1] + 1.5 + rnd() * 6
        Object.assign(v, newVeh(L, p)); v.v = v.vmax * 0.6
      })
    }
  }
  function uturn(L, v) {                                                     // tới rào phố đi bộ: quay đầu sang làn ngược chiều (hoặc rẽ đi mất)
    const P = LANES[L.pair]
    if (P.axis === L.axis && !inClosed(P, v.pos)) {
      const clear = P.vs.every((u) => !u.on || Math.abs(u.pos - v.pos) > 1.6 + (u.len + v.len) / 2)
      if (!clear) return false
      const u = P.vs.find((q) => !q.on)
      if (u) { Object.assign(u, newVeh(P, v.pos)); Object.assign(u, { type: v.type, len: v.len, vmax: v.vmax, sp: v.sp, lat: v.lat, name: v.sp + SUF(P.axis, P.dir), v: 0.3 }) }
    }
    v.on = false; v.pos = L.dir > 0 ? -9 : N + 9; v.v = 0; return true
  }
  function stepTraffic(dt) {
    ph.t += dt; if (ph.t > PH_DUR[ph.i]) { ph.t = 0; ph.i = (ph.i + 1) % 4 }
    tr.D = SL.densityAt(sky.hour, cal.wd); tr.ws = tr.D.ws
    const peds = pedList().filter((P) => roadLike.has(kind[clamp(Math.floor(P.gy), 0, N - 1)][clamp(Math.floor(P.gx), 0, N - 1)])), slow = 1 - 0.64 * tr.D.rush   // chỉ người đang ở lòng đường
    const P0 = typeof Game !== 'undefined' && Game.state && Game.state.player
    tr.hornCD -= dt
    for (const L of LANES) {
      L.tgt = laneTarget(L)
      const act = L.vs.filter((v) => v.on)
      act.sort((a, b) => (b.pos - a.pos) * L.dir)
      let nOn = act.length
      for (let i = 0; i < act.length; i++) {
        const v = act[i], lead = act[i - 1]
        if (!v.on) continue
        let tv = v.vmax * (L.main ? slow : 1)
        if (v.dwell > 0) { v.dwell -= dt; tv = 0 }
        if (lead && lead.on) { const g0 = v.type === 'moto' && lead.type === 'moto' ? 0.1 : 0.3, gap = (lead.pos - v.pos) * L.dir - (lead.len + v.len) / 2; if (gap < g0) tv = 0; else if (gap < 1.4 + g0) tv = Math.min(tv, (gap - g0) * 2.2) }   // xe máy dồn sát nhau khi tắc
        const front = v.pos + L.dir * v.len / 2
        for (const s of L.stops) { const d = (s.pos - front) * L.dir; if (d > -0.05 && d < 7 && s.closed()) { if (d < 0.12) tv = 0; else tv = Math.min(tv, d * 1.8) } }
        // vùng giữ trống: chưa chắc qua hết thì dừng trước vạch, không đứng giữa ngã tư / trên ray
        if (lead && lead.on) for (const z of L.zones) {                       // chỗ trống phía sau vùng = vị trí xe trước sau ~0,8 s
          const entry = L.dir > 0 ? z[0] : z[1], exit = L.dir > 0 ? z[1] : z[0], d = (entry - front) * L.dir
          if (d > -0.05 && d < 1.8) { const room = (lead.pos + L.dir * lead.v * 0.8 - L.dir * lead.len / 2 - exit) * L.dir; if (room < v.len + 0.35) tv = Math.min(tv, d < 0.12 ? 0 : (d - 0.1) * 2) }
        }
        let atBar = false
        if (tr.ws && L.cl) { const e = L.dir > 0 ? L.cl[0] : L.cl[1], d = (e - front) * L.dir; if (d > -0.3 && d < 7) { atBar = d < 0.7; tv = Math.min(tv, d < 0.15 ? 0 : d * 1.6) } }
        for (const P of peds) { if (P.off) continue; const along = (L.axis === 'x' ? P.gx : P.gy), lat = (L.axis === 'x' ? P.gy : P.gx), d = (along - front) * L.dir; if (d > -0.3 && d < 1.7 && Math.abs(lat - (L.c + v.lat)) < 0.8 && roadLike.has(kind[clamp(Math.floor(P.gy), 0, N - 1)][clamp(Math.floor(P.gx), 0, N - 1)])) { tv = 0; break } }
        if (v.type === 'bus' && L.axis === 'x' && L.dir < 0 && L.c === BUSY[0] + 0.5) for (const bx of BUSSTOPS) if (!v.visited.has(bx) && Math.abs(v.pos - bx) < 0.3) { v.visited.add(bx); v.dwell = 3.5 }
        v.brk = tv < v.v - 0.08 || v.v < 0.15
        v.v += clamp(tv - v.v, -dt * 6.5, dt * 2.2); v.pos += L.dir * v.v * dt
        v.stopT = v.v < 0.2 ? v.stopT + dt : 0
        if (atBar && v.v < 0.25 && v.stopT > 0.6) { if (uturn(L, v)) nOn--; continue }
        if (L.main && tr.D.rush > 0.4 && v.stopT > 2.5 && tr.hornCD <= 0 && P0) {                 // còi thưa trong giờ tắc, chỉ khi ở gần người chơi
          const gx = L.axis === 'x' ? v.pos : L.c + v.lat, gy = L.axis === 'x' ? L.c + v.lat : v.pos
          if (Math.hypot(gx - P0.gx, gy - P0.gy) < 12) { bus.emit('sfx', { name: 'horn', gx, gy }); tr.hornCD = 5 + Math.random() * 7 }
        }
        const out = L.dir > 0 ? v.pos > N + 5 : v.pos < -5
        if (out) {
          if (nOn > L.tgt) { v.on = false; v.pos = L.dir > 0 ? -9 : N + 9; v.v = 0; nOn-- }
          else Object.assign(v, newVeh(L, L.dir > 0 ? -5 - rnd() * 4 : N + 5 + rnd() * 4))
        }
      }
      // thiếu xe so với mật độ: cho một xe mới vào từ mép bản đồ (cách quãng, không chồng lên xe đang vào)
      nOn = L.vs.reduce((s, v) => s + (v.on ? 1 : 0), 0)
      if (nOn < L.tgt && (L.spawnT -= dt) <= 0) {
        const e = L.dir > 0 ? -5 : N + 5
        if (L.vs.every((v) => !v.on || Math.abs(v.pos - e) > 2.4)) { const v = L.vs.find((q) => !q.on); if (v) { Object.assign(v, newVeh(L, e)); v.v = v.vmax * 0.8 } }
        L.spawnT = 0.25 + rnd() * 0.5
      }
    }
  }
  // rào phố đi bộ (chỉ vẽ, không va chạm): thanh sọc đỏ trắng ngang lòng đường ở đầu mỗi đoạn cấm
  const barCache = {}
  function barrierCanvas(ax, len) {
    const k = ax + len; if (barCache[k]) return barCache[k]
    const W_ = Math.ceil(len * 36) + 4, H_ = Math.ceil(len * 18) + 14, c = document.createElement('canvas'); c.width = W_; c.height = H_
    const g = c.getContext('2d'), P = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1) }
    const at = (t) => ax === 'x' ? [2 + t * 36, 11 + t * 18] : [W_ - 3 - t * 36, 11 + t * 18]       // chân rào trên mặt đất theo trục cắt ngang đường
    const n = Math.ceil(len * 36)
    for (let i = 0; i <= n; i++) { const t = i / 36, [x, y] = at(t), X = Math.round(x), Y = Math.round(y), red = Math.floor(i / 5) % 2 === 0; P(X, Y - 9, '#3a1a14'); P(X, Y - 8, red ? '#e0302a' : '#f4f0e6'); P(X, Y - 7, red ? '#b02420' : '#d8d2c4'); P(X, Y - 6, '#3a1a14') }
    for (let q = 0; q <= 3; q++) { const [x, y] = at(len * q / 3), X = Math.round(x), Y = Math.round(y); for (let k2 = -10; k2 <= 0; k2++) P(X, Y + k2, '#2a2a30'); P(X - 1, Y, '#2a2a30'); P(X + 1, Y, '#2a2a30'); if (q === 0 || q === 3) { P(X, Y - 11, '#ff5040'); P(X, Y - 12, '#ff8a70') } }
    c.x0 = at(0); return (barCache[k] = c)
  }
  const closures = []                                                         // vị trí rào (để vẽ + đèn đỏ nhấp nháy)
  function buildClosures() {
    const seen = new Set()
    for (const L of LANES) {
      if (!L.cl) continue
      const both = !!LANES[L.pair].cl, road = (L.axis === 'x' ? ROADY_ALL : ROADX).find((r) => inR(Math.floor(L.c), r))
      const lo = both ? road[0] : Math.floor(L.c), len = both ? 3 : 1
      for (const e of [L.cl[0] - 0.35, L.cl[1] + 0.35]) {
        const key = L.axis + ':' + e + ':' + lo; if (seen.has(key)) continue; seen.add(key)
        const ax = L.axis === 'x' ? 'y' : 'x', c = barrierCanvas(ax, len)
        const gx = L.axis === 'x' ? e : lo, gy = L.axis === 'x' ? lo : e, [sx, sy] = proj(gx, gy)
        const bb = ax === 'x' ? [gx, gx + len, gy - 0.05, gy + 0.05] : [gx - 0.05, gx + 0.05, gy, gy + len]
        closures.push({ img: c, dx: Math.round(sx - c.x0[0]), dy: Math.round(sy - c.x0[1]), w: c.width, h: c.height, bb, gx, gy, len, ax })
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
    if (P && train.state === 'run' && P.gy > RAIL_Y - 1.4 && P.gy < RAIL_Y + 1.4 && P.gx > xmin - 0.6 && P.gx < xmax + 0.6) { P.gx = clamp(P.gx, 0.5, N - 0.5); P.gy = RAILC[0] + 0.5; Game.toast('Tàu đang tới! Bạn được đưa lên vỉa hè cho an toàn.') }
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
  const sky = { hour: 15.5, auto: false, speed: 0.024, weather: 'sunny', cloud: 0, rain: 0, storm: 0, wxTimer: 80, autoWx: true, flash: 0, nextFlash: 7, fury: false, nextStrike: 3, shake: 0, bolts: [], pulses: [] }
  const WXD = { sunny: [0, 0, 0], cloudy: [1, 0, 0], rain: [1, 1, 0], storm: [1, 1, 1] }
  const WXNAME = { sunny: 'nắng', cloudy: 'nhiều mây', rain: 'mưa', storm: 'mưa giông' }
  // 4B: lịch + mặt trời. Ngày 1 = Thứ Sáu; giờ mặt trời Hà Nội theo ngày trong năm (ngày 1 = 18/11: mọc ~6:08, lặn ~17:18).
  const cal = { day: 1, wd: 5, sun: SL.sunTimes(1) }
  let GRADE = []
  function buildGrade() {                                     // màu nhân toàn cảnh theo mốc mặt trời (§4.6) — đêm giữ gần mức sáng cũ (#3a4880) cho dễ nhìn
    const R = cal.sun.rise, S = cal.sun.set
    GRADE = [[0, '#34417a'], [R - 0.95, '#323f78'], [R - 0.35, '#4a5590'], [R + 0.3, '#eab9a0'], [R + 1.7, '#fff0dc'], [11, '#ffffff'], [S - 2.2, '#fff2da'],
      [S - 0.6, '#ffcd98'], [S - 0.05, '#dc9888'], [S + 0.2, '#8e7ca8'], [S + 0.5, '#5a64a0'], [S + 1.0, '#46538e'], [22, '#3c4a84'], [24, '#34417a']]
  }
  function setDay(n) { n = Math.max(1, Math.floor(n) || 1); cal.day = n; cal.wd = SL.weekdayOf(n); cal.sun = SL.sunTimes(n); buildGrade() }
  setDay(1)
  const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  const mixc = (a, b, t) => { const A = hex2(a), B = hex2(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('') }
  function gradeAt(h) { for (let i = 1; i < GRADE.length; i++) if (h <= GRADE[i][0]) { const [h0, c0] = GRADE[i - 1], [h1, c1] = GRADE[i]; return mixc(c0, c1, (h - h0) / (h1 - h0)) } return GRADE[GRADE.length - 1][1] }
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
  const nightAt = (h) => h < 12 ? 1 - ss(cal.sun.rise - 0.75, cal.sun.rise + 0.25, h) : ss(cal.sun.set - 0.35, cal.sun.set + 0.6, h)   // §4.6: tối theo giờ lặn/mọc
  function stepSky(dt) {
    if (sky.auto) { const h0 = sky.hour; sky.hour = (h0 + sky.speed * dt) % 24; if (sky.hour < h0 && hooks.newday) hooks.newday() }
    const tg = WXD[sky.weather], k = Math.min(1, dt * 0.5)
    sky.cloud += (tg[0] - sky.cloud) * k; sky.rain += (tg[1] - sky.rain) * k; sky.storm += (tg[2] - sky.storm) * k
    if (sky.autoWx) { sky.wxTimer -= dt; if (sky.wxTimer <= 0) { sky.wxTimer = 70 + Math.random() * 80; const r = Math.random(); sky.weather = r < 0.45 ? 'sunny' : r < 0.7 ? 'cloudy' : r < 0.92 ? 'rain' : 'storm' } }
    sky.flash = Math.max(0, sky.flash - dt * (sky.bolts.length ? 6 : 2.8))
    if (sky.fury) { if (sky.rain > 0.3) { sky.nextStrike -= dt; if (sky.nextStrike <= 0) { strike(); sky.nextStrike = 1.8 + Math.random() * 6 } } }
    else if (sky.storm > 0.6) { sky.nextFlash -= dt; if (sky.nextFlash <= 0) { sky.flash = 1; sky.nextFlash = 5 + Math.random() * 8; thunder(0.9, 1.4) } }
    for (let i = sky.bolts.length - 1; i >= 0; i--) { const b = sky.bolts[i]; b.t += dt; for (const pu of b.pulses) if (!pu.done && b.t >= pu[0]) { pu.done = true; sky.flash = Math.max(sky.flash, pu[1]) } if (b.t > b.life) sky.bolts.splice(i, 1) }
  }
  // sấm: nếu khối audio có tiếng 'thunder' thì nhờ audio phát (một AudioContext chung, qua bộ nén tổng);
  // chưa có thì dùng cách cũ: tiếng nổ + ầm ì trễ theo khoảng cách (WebAudio riêng, chỉ bật sau khi người chơi chạm/nhấn phím)
  let actx = null, noiseBuf = null
  const audioHasThunder = () => { try { return !!window.__audio?.has?.('thunder') } catch (e) { return false } }
  function audioInit() {
    if (window.__audio) return                                 // có khối audio: KHÔNG mở AudioContext thứ hai (dự phòng chỉ khi thật sự thiếu __audio)
    if (actx) { if (actx.state === 'suspended') actx.resume(); return }
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); const n = actx.sampleRate * 3, b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < n; i++) { l = l * 0.98 + (Math.random() * 2 - 1) * 0.02; d[i] = l * 6 } noiseBuf = b } catch (e) { actx = null }
  }
  function thunder(dist, vol) {                                // sấm rền: tiếng nổ đục rồi lăn dài, nhiều đợt, trễ theo khoảng cách
    if (audioHasThunder()) { bus.emit('sfx', { name: 'thunder', dist, vol }); return }   // dist 0..1, vol 1.5 = sấm gần; audio tự trễ theo dist
    if (window.__audio) return
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
    const h = sky.hour, d = clamp((h - cal.sun.rise) / (cal.sun.set - cal.sun.rise), 0, 1), a = (135 - 180 * d) * Math.PI / 180, e = Math.sin(Math.PI * d), night = nightAt(h)
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
  const WIN_AMBER = ['#ffcf84', '#f2b45c', '#e89a46'], WIN_TUBE = '#e4eef8', WIN_TV = ['#6fa8ff', '#b4d2ff'], WIN_CURTAIN = '#9a5a2a'
  // 4B: màu ô kính tầng trệt theo loại quán (§4.4) — phở tuýp trắng xanh, tiện lợi trắng lạnh, quần áo vàng ấm...
  const SHOPWIN = { pho: '#e8fff6', banhmi: '#fff0cc', tea: '#ffd68a', biahoi: '#f0fff0', trada: '#ffd8a0', taphoa: '#fff0d8', clothes: '#ffe3b8', cafe: '#ffd8a0', combinh: '#eaf8f2', cstore: '#f7fbff' }
  const litFrac = (h) => SL.windowFrac(h, cal.sun.set, cal.sun.rise)     // §4.5: tỉ lệ cửa sổ sáng, tắt dần về khuya
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
    const bucket = Math.floor(hour * 4) + cal.day * 100
    if (o._lw && o._lb === bucket) return o._lw
    const corner = (o.bb[1] - o.bb[3]) * 36 - o.dx, W = decodeWins(o.img, corner)
    const seed = ((Math.round(o.bb[0]) * 73856093) ^ (Math.round(o.bb[2]) * 19349663)) | 0
    const mood = hash01(seed, 7), fr = litFrac(hour) * (mood < 0.15 ? 0.15 : mood > 0.75 ? 1.45 : 1), tv = SL.tvShare(hour)
    const sh = o.front && o.front.shop && o.front.sk ? o.front : null, shopOn = sh ? shopOpen(sh, hour) : false
    const groups = new Map()
    W.forEach((w, i) => {
      const u = hash01(seed, w.fl, 1), ground = w.fl === 0
      const on = ground && sh ? shopOn && hash01(seed, 5, w.face) < 0.9 : u < fr && hash01(seed, i, 3) > 0.1      // tầng trệt mặt phố là cửa hàng: theo giờ quán
      if (!on) return
      const hc = hash01(seed, w.fl, 2)
      const col = ground && sh ? SHOPWIN[sh.sk] || '#ffe9b0' : hc < tv * 0.55 ? 'TV' : hash01(seed, w.fl, 4) < 0.4 ? WIN_TUBE : WIN_AMBER[hc < 0.42 ? 0 : hc < 0.78 ? 1 : 2]
      let g = groups.get(col); if (!g) { g = { col, tv: col === 'TV', ph: hash01(seed, w.fl, 6), body: new Path2D(), top: new Path2D(), topCol: col === 'TV' ? '#3a5a90' : mixc(col, WIN_CURTAIN, sh && ground ? 0.2 : 0.55) }; groups.set(col, g) }
      for (const [y, x0, n] of w.runs) (y - w.ymin < 2 ? g.top : g.body).rect(x0, y, n, 1)
    })
    o._lw = [...groups.values()]; o._lb = bucket; return o._lw
  }
  // lớp phát sáng riêng: vẽ theo đúng thứ tự trước/sau, vật đứng trước xoá phần cửa sổ bị nó che
  const emiC = document.createElement('canvas'), ex = emiC.getContext('2d')
  const isLitHouse = (o) => o.name && (o.name[0] === 'h' || o.name[0] === 'm') && o.name[1] === '_'
  function paintWindows(o, ox, oy) {
    ex.globalCompositeOperation = 'source-over'; ex.setTransform(1, 0, 0, 1, o.dx + ox, o.dy + oy)
    for (const g of instWins(o, sky.hour)) { ex.fillStyle = g.tv ? WIN_TV[hash01(Math.floor(T / (0.3 + g.ph * 1.2)), g.ph * 1e6) < 0.5 ? 0 : 1] : g.col; ex.fill(g.body); ex.fillStyle = g.topCol; ex.fill(g.top) }      // ánh tivi xanh đổi sáng ngẫu nhiên 0,3–1,5 s
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
  const NPC_KINDS = new Set(['walk', 'plaza', 'market', 'alley', 'grass', 'zebra_x', 'zebra_y'])
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
  // 4B: người đi bộ theo giờ (§1.2): kho NPC cố định (không xoá phần tử để id 'npc'+i ổn định), bật/tắt NGOÀI khung hình theo mật độ.
  // Nhóm 'town' đi khắp phố cổ (pedOld), nhóm 'lake' quanh hồ + phố đi bộ (pedLake, tối phố đi bộ ×1.6).
  const NPC_CAP = MOBILE ? { town: 50, lake: 26 } : { town: 96, lake: 48 }
  let lakeTiles = []
  function genNpc() {
    buildNpcGrid(); buildNpcSprites(); if (!NPC_SPR.length) return
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((kind[y][x] === 'zebra_x' || kind[y][x] === 'zebra_y') && npcOK[y][x]) { let nb = 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && npcOK[ny][nx]) nb++ } if (nb < 2) npcOK[y][x] = false }     // vạch qua đường cụt: bỏ
    const tiles = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (npcOK[y][x] && kind[y][x] !== 'grass' && kind[y][x] !== 'zebra_x' && kind[y][x] !== 'zebra_y') tiles.push([x, y])
    npcTiles = tiles
    lakeTiles = tiles.filter(([x, y]) => x >= LAKE.x0 - 2 && x <= LAKE.x1 + 2 && y >= CORRY[PED][0] && y <= LAKE.y1 + 2)
    const total = NPC_CAP.town + NPC_CAP.lake
    for (let i = 0; i < total; i++) {
      const grp = i < NPC_CAP.town ? 'town' : 'lake', L = grp === 'lake' ? lakeTiles : tiles, [x, y] = L[Math.floor(Math.random() * L.length)]
      NPC.push({ gx: x + 0.5, gy: y + 0.5, path: [], pi: 0, sp: 1.0 + Math.random() * 0.6, v: i % NPC_SPR.length, dir: 'down', t: Math.random() * 9, wait: Math.random() * 3, moving: false, rt: 0.12 + Math.random() * 0.55, pc: Math.floor(Math.random() * PONCHO.length), coat: false, grp, off: true })
    }
  }
  function onScreen(gx, gy, m = 40) { const v = typeof Game !== 'undefined' && Game.state && Game.state.view; if (!v) return false; const [sx, sy] = proj(gx, gy), X = sx + v.ox, Y = sy + v.oy; return X > -m && X < v.w + m && Y > -m - 30 && Y < v.h + m }
  const npcTarget = () => { const D = tr.D; return { town: Math.round(NPC_CAP.town * clamp(D.pedOld, 0, 1)), lake: Math.round(NPC_CAP.lake * clamp(D.pedLake / 1.6 * 1.25, 0, 1)) } }
  function npcBalance(force) {
    const tg = npcTarget()
    for (const grp of ['town', 'lake']) {
      const L = NPC.filter((n) => n.grp === grp), on = L.filter((n) => !n.off), want = tg[grp]
      if (on.length > want) { let k = on.length - want; for (const n of on) { if (k <= 0) break; if (force || (n.pi >= n.path.length && !onScreen(n.gx, n.gy))) { n.off = true; k-- } } }
      else if (on.length < want) {
        let k = Math.min(want - on.length, force ? 999 : 6); const TL = grp === 'lake' ? lakeTiles : npcTiles
        for (const n of L) { if (k <= 0) break; if (!n.off) continue; for (let t = 0; t < 8; t++) { const [x, y] = TL[Math.floor(Math.random() * TL.length)]; if (force || !onScreen(x + 0.5, y + 0.5)) { Object.assign(n, { gx: x + 0.5, gy: y + 0.5, path: [], pi: 0, wait: Math.random() * 2, off: false, moving: false }); k--; break } } }
      }
    }
  }
  function stepNpc(dt) {
    for (const n of NPC) {
      if (n.off) continue
      n.t += dt
      if (!n.coat && sky.rain > n.rt) n.coat = true; else if (n.coat && sky.rain < n.rt - 0.14) n.coat = false
      if (n.pi >= n.path.length) {
        n.moving = false; n.wait -= dt
        if (n.wait <= 0) {
          let tx = clamp(Math.floor(n.gx) + Math.floor((Math.random() - 0.5) * 30), 0, N - 1), ty = clamp(Math.floor(n.gy) + Math.floor((Math.random() - 0.5) * 30), 0, N - 1)
          if (n.grp === 'lake' && lakeTiles.length) { const [lx, ly] = lakeTiles[Math.floor(Math.random() * lakeTiles.length)]; if (Math.abs(lx - n.gx) + Math.abs(ly - n.gy) < 32) { tx = lx; ty = ly } }
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
  // ───────── 4B: cảnh đời phố theo giờ (dáng __npcPoses, vẽ theo điểm neo) ─────────
  // sáng sớm: dưỡng sinh / vươn vai / thái cực bên hồ + chạy bộ quanh hồ; ngày: cụ ông trà đá, đánh cờ; tối: trà chanh ghế nhựa,
  // bia hơi vỉa hè, cặp đôi ghế đá ven hồ. Chỉ để vẽ (không va chạm), không ảnh hưởng tìm đường.
  const ACT = []
  let poseOK = false
  const poseCache = new Map()
  const SILK = { sh: ['#f4f2ea', '#cfcabb', '#ffffff'], pa: ['#f4f2ea', '#cfcabb'], ha: ['#8a8a92', '#b0b0b8'] }      // đồ lụa trắng tập thái cực [13b]
  function poseFrames(name, dir, look) {
    const key = name + '|' + dir + '|' + (typeof look === 'number' ? look : look ? 'S' : '-'); let f = poseCache.get(key); if (f) return f
    const P = window.__npcPoses; if (!poseOK || !P || !P.raw) return null
    const raw = P.raw(name, dir); if (!raw || !raw.length) return null
    const lk = typeof look === 'number' ? NPC_LOOK[look % NPC_LOOK.length] : look
    f = raw.map((c) => lk ? recolor(c, lk) : c); poseCache.set(key, f); return f
  }
  const dirOf = (dx, dy) => { const sx = dx - dy, sy = (dx + dy) / 2; return Math.abs(sx) >= Math.abs(sy * 2) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up') }
  const win = (h, a, b) => h >= a && h < b
  const ramp = (h, K2) => { if (h <= K2[0][0]) return K2[0][1]; for (let i = 1; i < K2.length; i++) if (h <= K2[i][0]) { const [a, fa] = K2[i - 1], [b, fb] = K2[i]; return fa + (fb - fa) * (h - a) / (b - a) } return K2[K2.length - 1][1] }
  function buildActors() {
    let id = 0
    const add = (o) => { o.id = 'act' + (id++); o.u = hash01(id, 17, 3); o.ph = hash01(id, 5, 1) * 8; ACT.push(o); return o }
    const lakeAM = (h) => win(h, 4.6, 8.1) ? clamp(tr.D.pedLake * 1.15, 0, 1) : 0
    // 1) dưỡng sinh / aerobic trước khu phố đi bộ bờ bắc hồ (giữa hai dãy ghế đá): 2 hàng × 3 + người hướng dẫn quay mặt lại
    const y0 = CORRY[PED][0]
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) add({ pose: 'exercise', dir: 'down', gx: 48.0 + c * 1.05 + r * 0.25, gy: y0 + 2.3 + r * 1.0, look: (r * 3 + c * 2) % 10, act: lakeAM, kind: 'ped' })
    add({ pose: 'exercise', dir: 'up', gx: 49.6, gy: y0 + 4.35, look: 6, act: lakeAM, kind: 'ped', lead: true })
    // 2) vươn vai nghiêng lườn: nhóm 4 người cạnh đó
    for (let c = 0; c < 4; c++) add({ pose: 'stretch', dir: 'down', gx: 52.3 + (c % 2) * 1.0, gy: y0 + 2.4 + Math.floor(c / 2) * 1.0, look: (c * 3 + 1) % 10, act: (h) => win(h, 5.0, 7.8) ? lakeAM(h) : 0, kind: 'ped' })
    // 3) thái cực quyền đồ lụa trắng ở bờ đông (phía Đinh Tiên Hoàng)
    for (let c = 0; c < 5; c++) add({ pose: 'exercise', dir: 'left', gx: LAKE.x0 + 22.9 + (c % 2) * 0.7, gy: LAKE.y0 + 18.4 + c * 0.75, look: SILK, act: (h) => win(h, 5.0, 7.4) ? lakeAM(h) : 0, kind: 'ped' })
    // 4) chạy bộ quanh hồ (vòng đường dạo ngoài cùng): sáng 4:45–8:15, tối 17:45–21:30
    const X0 = LAKE.x0 + 0.5, X1 = LAKE.x1 + 0.5, Y0 = LAKE.y0 + 0.5, Y1 = LAKE.y1 + 0.5, per = 2 * (X1 - X0 + Y1 - Y0)
    for (let i = 0; i < 9; i++) add({ pose: 'jog', jog: true, s0: hash01(i, 77) * per, sp: 1.9 + hash01(i, 78) * 0.5, cw: i % 3 !== 0, look: (i * 7 + 3) % 10, kind: 'ped',
      act: (h) => win(h, 4.75, 8.25) ? (i < 6 ? lakeAM(h) : 0) : win(h, 17.75, 21.5) ? (i >= 3 && i < 3 + (tr.ws ? 6 : 4) ? 0.85 : 0) : 0 })
    ACT.ring = { X0, X1, Y0, Y1, per }
    // 5) đôi tình nhân trên ghế đá ven hồ / phố đi bộ / công viên (18:30–23:00, đông nhất 20–22h)
    const coupleP = (h) => ramp(h, [[18.3, 0], [19, 0.25], [20, 0.6], [22, 0.6], [23, 0.2], [23.2, 0]]) * (tr.ws ? 1.25 : 1)
    statics.forEach((s, i) => {
      if (s.name !== 'p_bench_x' && s.name !== 'p_bench_y') return
      const gx = (s.bb[0] + s.bb[1]) / 2, gy = (s.bb[2] + s.bb[3]) / 2, bx = s.name === 'p_bench_x'
      add({ pose: 'coupleSit', dir: bx ? 'down' : 'right', gx, gy, look: i % 10, kind: 'sitter', hourly: true, ox: bx ? -2 : 3, oy: bx ? 1 : 1,
        bb: bx ? [gx - 0.25, gx + 0.25, gy + 0.29, gy + 0.33] : [gx + 0.29, gx + 0.33, gy - 0.25, gy + 0.25], act: coupleP })
    })
    // 6) quán vỉa hè trước cửa: trà đá ban ngày (cụ ông uống trà, đánh cờ), tối bia hơi / trà chanh ghế nhựa
    for (const f of fronts) {
      if (!f.shop || !f.prop) continue
      const ax = f.axis, cx = f.px, cy = f.py, A = ax === 'x' ? [1, 0] : [0, 1]
      const seat = (k, d) => [cx + A[0] * k * 0.34, cy + A[1] * k * 0.34, d]
      const facing = (k) => dirOf(-A[0] * k, -A[1] * k)
      if (f.prop === 'p_stools' && f.sk === 'trada') {
        const chess = hash01(f.gx, f.gy, 41) < 0.35
        if (chess) add({ pose: 'chess', dir: 'down', gx: cx, gy: cy + (ax === 'x' ? 0.05 : 0), look: (f.gx + f.gy) % 10, kind: 'sitter', act: (h) => (win(h, 8, 11) || win(h, 14, 18)) && shopOpen(f, h) ? 0.8 : 0 })
        else for (const k of [-1, 1]) { const [gx, gy] = seat(k); add({ pose: 'elderTea', dir: facing(k), gx, gy, look: (f.gx * 3 + k + 10) % 10, kind: 'sitter', act: (h) => (win(h, 7.5, 11) || win(h, 14, 18.5)) && shopOpen(f, h) ? 0.75 : 0 }) }
      } else if (f.prop === 'p_stools' || f.prop.startsWith('p_cafe')) {
        const tea = f.prop.startsWith('p_cafe')
        for (const k of tea ? [-1, 1, 2] : [-1, 1]) {
          const kk2 = k === 2 ? 0 : k, [gx, gy] = k === 2 ? [cx + A[1] * 0.36, cy + A[0] * 0.36] : seat(kk2)
          add({ pose: 'sitStool', dir: k === 2 ? dirOf(-A[1], -A[0]) : facing(kk2), gx, gy, look: (f.gy * 7 + k + 20) % 10, kind: 'sitter', hourly: true,
            act: (h) => !shopOpen(f, h) ? 0 : tea ? ramp(h, [[9, 0.15], [15, 0.3], [17.5, 0.6], [19, 0.9], [22.5, 0.85], [23.5, 0.4]]) : ramp(h, [[10.5, 0], [11.5, 0.6], [13, 0.6], [14, 0.15], [17, 0.3], [18.5, 0.85], [22.5, 0.8], [23.6, 0.3]]) })
        }
      }
    }
    // 7) cà phê đường tàu: khách ngồi bàn ghế sát hàng rào khi quán mở
    statics.forEach((s, i) => {
      if (!/^p_tc_set_/.test(s.name || '')) return
      const gx = (s.bb[0] + s.bb[1]) / 2, gy = (s.bb[2] + s.bb[3]) / 2, site = sites.find((q) => q.kind === 'tc' && Math.abs(q.gx - gx) < 0.4 && Math.abs(q.gy - gy) < 0.4)
      for (const k of [-1, 1]) add({ pose: 'sitStool', dir: k < 0 ? 'right' : 'left', gx: gx + k * 0.36, gy, look: (i * 3 + k + 30) % 10, kind: 'sitter', hourly: true,
        act: (h) => site && siteOpenAt(site, h) ? ramp(h, [[7, 0.3], [9, 0.6], [12, 0.4], [16, 0.5], [19, 0.8], [22, 0.6]]) : 0 })
    })
    // 8) đánh cờ ở quảng trường công viên (ngày)
    add({ pose: 'chess', dir: 'down', gx: 74.4, gy: 49.6, look: 2, kind: 'sitter', act: (h) => win(h, 8, 11) || win(h, 14, 17.5) ? 0.9 : 0 })
  }
  function actorOn(a, h) {
    const p = a.act(h); if (p <= 0) return false
    const u = a.hourly ? hash01(Math.floor(h * 2) + cal.day * 48, a.id.length * 131 + Math.round(a.u * 1e6), 9) : a.u      // ghế đá/quán đổi khách mỗi 30 phút game
    return u < p
  }
  function actorPos(a) {
    if (!a.jog) return [a.gx, a.gy, a.dir]
    const R = ACT.ring, per = R.per, w = R.X1 - R.X0, hgt = R.Y1 - R.Y0
    let s = ((a.s0 + (a.cw ? 1 : -1) * a.sp * T) % per + per) % per, x, y, dx, dy
    if (s < w) { x = R.X0 + s; y = R.Y0; dx = 1; dy = 0 } else if ((s -= w) < hgt) { x = R.X1; y = R.Y0 + s; dx = 0; dy = 1 } else if ((s -= hgt) < w) { x = R.X1 - s; y = R.Y1; dx = -1; dy = 0 } else { s -= w; x = R.X0; y = R.Y1 - s; dx = 0; dy = -1 }
    if (!a.cw) { dx = -dx; dy = -dy }
    return [x, y, dirOf(dx, dy)]
  }
  const actLive = []                                                            // cảnh đang hiện (cho getNpcs)
  function npcDrawables() {
    const out = []
    for (const n of NPC) {
      if (n.off) continue
      const sp = (n.coat ? coatSet(n.v, n.pc) : NPC_SPR[n.v])[n.dir][n.moving ? Math.floor(n.t * 7) % 4 : 0], [sx, sy] = proj(n.gx, n.gy), bob = n.moving && (Math.floor(n.t * 7) & 1) ? 1 : 0
      out.push({ img: sp, dx: Math.round(sx - 8), dy: Math.round(sy - 26 + bob), w: 16, h: 28, bb: [n.gx - 0.22, n.gx + 0.22, n.gy - 0.22, n.gy + 0.22], gx: n.gx, gy: n.gy, sh: { t: 'blob', H: 26, r: 0.22 } })
    }
    actLive.length = 0
    if (!poseOK || DBG.noAct) return out
    const h = sky.hour, rainy = sky.rain > 0.45
    for (const a of ACT) {
      if (rainy && a.kind === 'sitter' && !a.bb) continue                       // mưa to: khách vỉa hè vào trong
      const [gx, gy, dir] = actorPos(a)
      if (!onScreen(gx, gy, 60) || !actorOn(a, h)) continue
      const P = window.__npcPoses[a.pose], fr = poseFrames(a.pose, dir, a.look); if (!P || !fr) continue
      const k = Math.floor((T + a.ph) * P.fps) % fr.length, img = fr[k], [sx, sy] = proj(gx, gy)
      const bob = a.jog && (k & 1) ? 1 : 0
      out.push({ img, dx: Math.round(sx - P.anchor[0] + (a.ox || 0)), dy: Math.round(sy - P.anchor[1] + (a.oy || 0) + bob), w: img.width, h: img.height, bb: a.bb || [gx - 0.2, gx + 0.2, gy - 0.2, gy + 0.2], gx, gy, sh: { t: 'blob', H: 20, r: a.pose === 'chess' || a.pose === 'coupleSit' ? 0.36 : 0.22 } })
      actLive.push({ id: a.id, gx, gy, dir, kind: a.kind, pose: a.pose, look: typeof a.look === 'number' ? a.look : 0 })
    }
    return out
  }
  const pedList = () => { const L = NPC.filter((n) => !n.off); if (typeof Game !== 'undefined' && Game.state && Game.state.player) L.push(Game.state.player); return L }
  const lamps = [], nightLights = []

  // ───────── vẽ ─────────
  let cv, ctx, hud, last = 0, T = 0, tod = 0, npcT = 0
  const npcActive = () => NPC.reduce((s, n) => s + (n.off ? 0 : 1), 0)
  const TOD_TINT = ['#ffffff', '#f3c9a0', '#6a76b4']
  function clipMap(ox, oy, sh) {
    const A = [0, -sh], B = [36 * N + sh, 18 * N - sh / 2], C = [0, 36 * N], D = [-36 * N - sh, 18 * N - sh / 2]
    ctx.beginPath(); ctx.moveTo(A[0] + ox, A[1] + oy); for (const p of [B, C, D]) ctx.lineTo(p[0] + ox, p[1] + oy); ctx.closePath(); ctx.clip()
  }
  function cable(a, b, ox, oy, off, sag) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])); ctx.fillStyle = '#16171b'
    for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(a[0] + (b[0] - a[0]) * t + ox), Math.round(a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t) + oy + off), 1, 1) }
  }
  // ───────── zoom mượt: đích là nấc nguyên, cam.zoom trôi tới trong ~0,25 s (easeOutCubic), dừng đúng số nguyên → pixel sắc như cũ ─────────
  const ZOOM_DUR = 0.25, zA = { from: 2, t: 1, wrote: 2, anchor: null }
  function setZoomTarget(z, anchor) {                          // anchor {x,y} CSS px: giữ điểm dưới con trỏ (camera tự do); null = giữ tâm màn hình (đang theo nhân vật)
    if (!Number.isFinite(z)) return cam.zoomTarget
    z = clamp(Math.round(z), 1, 5); if (z === cam.zoomTarget) return z
    cam.zoomTarget = z; zA.from = cam.zoom; zA.t = 0; zA.anchor = anchor || null; return z
  }
  function stepZoom(dt) {
    if (cam.zoom !== zA.wrote) { const z = clamp(Math.round(cam.zoom) || 1, 1, 5); cam.zoom = cam.zoomTarget = zA.wrote = z; zA.t = 1; return }   // ai đó gán thẳng cam.zoom (test/mã cũ): nhận làm nấc mới
    if (zA.t >= 1 && cam.zoom === cam.zoomTarget) return
    zA.t = Math.min(1, zA.t + dt / ZOOM_DUR)
    const e = 1 - Math.pow(1 - zA.t, 3), z0 = cam.zoom
    let z = zA.from + (cam.zoomTarget - zA.from) * e
    if (zA.t >= 1 || Math.abs(z - cam.zoomTarget) < 0.01) { z = cam.zoomTarget; zA.t = 1 }
    if (zA.anchor) { const ax = zA.anchor.x - innerWidth / 2, ay = zA.anchor.y - innerHeight / 2; cam.x += ax * (1 / z0 - 1 / z); cam.y += ay * (1 / z0 - 1 / z) }
    cam.zoom = zA.wrote = z
  }
  let frameNo = 0
  function frame(now) {
    frameNo++
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; T += dt
    stepZoom(dt); stepSky(dt)
    { const dh = Math.abs((((sky.hour - (tr.lastH ?? sky.hour)) % 24) + 36) % 24 - 12)                      // nhảy giờ / đổi ngày (setHour, ngủ, test): rải lại xe + người theo mật độ mới
      if (tr.lastH === null || dh > 0.3 || tr.lastDay !== cal.day) { resettleTraffic(); tr.D = SL.densityAt(sky.hour, cal.wd); npcBalance(true) }
      tr.lastH = sky.hour; tr.lastDay = cal.day }
    stepTraffic(dt); stepTrain(dt); stepNpc(dt); Game.update(dt)
    if ((npcT -= dt) <= 0) { npcT = 0.5; npcBalance(false) }
    for (const f of hooks.frame) { try { f(dt) } catch (e) { stats.errors.push('hook: ' + (e.stack || e)) } }
    const z = cam.zoom, w = Math.ceil(innerWidth / z), h = Math.ceil(innerHeight / z)
    if (w < 8 || h < 8) return                                 // cửa sổ chưa có kích thước (đang xoay màn hình / tab nền): bỏ qua khung này
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
    vehLit = []
    for (const L of LANES) for (const v of L.vs) {
      if (!v.on) continue
      const cx = L.axis === 'x' ? v.pos : L.c + v.lat, cy = L.axis === 'x' ? L.c + v.lat : v.pos
      if (cx < -3 || cx > N + 3 || cy < -3 || cy > N + 3) continue
      const d = vehDrawable(v.name, cx, cy, 'veh'); if (d) { d.veh = v; d.lane = L; dyn.push(d); vehLit.push({ v, L, cx, cy }) }
    }
    if (tr.ws) for (const b of closures) dyn.push({ ...b })
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
    const headOnNow = SL.headlightsOn(sky.hour, night, sky.rain)
    if (night > 0.05) { if (emiC.width !== w || emiC.height !== h) { emiC.width = w; emiC.height = h } else ex.clearRect(0, 0, w, h) }
    for (let i = 0; i < vis.length; i++) {
      const o = vis[i], edge = o.clip && (o.gx < 6 || o.gx > N - 6 || o.gy < 6 || o.gy > N - 6)
      if (edge) { ctx.save(); clipMap(ox, oy, o.clip === 'train' ? 52 : 40) }
      const f = i > pi && pi >= 0 && fadeVal.size ? (fadeVal.get(o) || 0) : 0
      if (f > 0.02) { ctx.globalAlpha = 1 - 0.8 * f; ctx.drawImage(o.img, o.dx + ox, o.dy + oy); ctx.globalAlpha = 1 }
      else {
        ctx.drawImage(o.img, o.dx + ox, o.dy + oy)
        if (night > 0.05) { ex.globalCompositeOperation = 'destination-out'; ex.drawImage(o.img, o.dx + ox, o.dy + oy); if (isLitHouse(o)) paintWindows(o, ox, oy); else if (o.veh) paintVehLamps(o, ox, oy, headOnNow) }
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
    postFx(dt, w, h, ox, oy, glows, night)
    for (const f of hooks.overlay) { try { f(ctx, ox, oy, w, h, T) } catch (e) { stats.errors.push('overlay: ' + (e.stack || e)) } }       // lớp phủ cuối: GPS, marker (không bị bộ lọc ngày/đêm làm tối)
    stats.fps = Math.round(1 / Math.max(0.001, dt))
    const hh = Math.floor(sky.hour), mm = Math.floor((sky.hour - hh) * 60)
    hud.textContent = `Hà Nội ${N}x${N}   ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${WXNAME[sky.weather]}   fps ${stats.fps}   xe ${stats.vehicles}   người ${npcActive()} · ${SL.WEEKDAY_NAME[cal.wd]}${tr.ws ? ' · phố đi bộ' : ''}\n${train.state === 'run' ? 'tàu hỏa đang chạy' : 'tàu hỏa còn ' + Math.ceil(train.t) + 's'}   [R thời tiết · T đổi giờ · Y giờ tự chạy · H ẩn]\n` + Game.hudLine()
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
  // ───────── 4B: ánh sáng đêm ─────────
  // Bản đồ sáng (lightmap) cùng độ phân giải canvas thế giới: tô màu trời (ambient) → cộng các vũng sáng vẽ sẵn ('lighter')
  // → nhân lên cảnh ('multiply'): chỗ được chiếu giữ đúng màu vật, chỗ khác tối theo giờ. Sau đó cộng quầng nhỏ ở bóng đèn (bloom).
  // Mọi đèn là sprite cache (streetlife.js): vũng đất dẹt 2:1, quầng bóng đèn tròn, quạt đèn pha 4 hướng; 4 dải màu + dither Bayer.
  const lm = document.createElement('canvas'), lmx = lm.getContext('2d')
  const LCAP = MOBILE ? 80 : 240, VCAP = MOBILE ? 24 : 64                 // giới hạn số đèn tĩnh / xe có đèn pha vẽ mỗi khung
  const K = SL.LIGHT_KIND
  const lsp = (k, r, flat = true) => SL.lightSprite(K[k].core, K[k].halo, r ?? K[k].r, flat)
  const blit = (g, c, X, Y, a) => { if (a <= 0.01) return; g.globalAlpha = Math.min(1, a); g.drawImage(c, Math.round(X - c.ox), Math.round(Y - c.oy)) }
  const LIGHTS = [], DBG = {}                                                 // DBG: công tắc đo hiệu năng (QA)
  const STALL_KIND = (nm) => /^p_pho/.test(nm) ? 'pho' : /^p_banhmi/.test(nm) ? 'banhmi' : /^p_(cafe|tc_)/.test(nm) ? 'tea' : /^p_kiosk/.test(nm) ? 'taphoa' : 'stall'
  function buildLights() {
    const lakeArea = (x, y) => x >= LAKE.x0 - 1 && x <= LAKE.x1 + 1 && y >= CORRY[PED][0] && y <= LAKE.y1 + 1
    const inPark = (x, y) => inR(Math.floor(x), BLOCKX[3]) && inR(Math.floor(y), BLOCKY[2])
    const inPlay = (x, y) => x >= PLAY.x0 && x <= PLAY.x1 + 1 && y >= PLAY.y0 && y <= PLAY.y1 + 1
    lamps.forEach((l, i) => {
      const park = lakeArea(l.gx, l.gy) || inPark(l.gx, l.gy) || inPlay(l.gx, l.gy)
      const kind = park || (l.gx < CORRX[1][0] && l.gy < CORRY[2][0]) ? 'lakePost' : 'led'   // ven hồ + phố cổ: vàng ấm; trục lớn: LED trắng (§4.1)
      LIGHTS.push({ t: 'lamp', gx: l.gx, gy: l.gy, z: 64, kind, idx: i, park, ph: hash01(i, 3, 9), water: lakeArea(l.gx, l.gy) && l.gx > LAKE.x0 - 0.5 && l.gx < LAKE.x1 + 0.5 })
    })
    nightLights.forEach((l, i) => {
      const o = { t: 'nl', gx: l.gx, gy: l.gy, z: l.z, r: l.r, a: l.a, grp: l.grp || (l.stall ? 'stall' : 'misc'), idx: i, ph: hash01(i, 5, 9) }
      if (l.stall) { o.kind = STALL_KIND(l.stall); o.site = sites.find((s) => Math.abs(s.gx - l.gx) < 0.35 && Math.abs(s.gy - l.gy) < 0.35) || null }
      else if (l.grp === 'alley' || l.grp === 'yard') { const u = hash01(Math.round(l.gx * 3), Math.round(l.gy * 3), 13); o.kind = u < 0.3 ? 'sodium' : u < 0.75 ? 'compact' : 'led'; o.r = Math.min(l.r, 36) }   // ngõ: ~30% bóng natri cam còn sót
      else o.kind = l.kind || 'warm'
      LIGHTS.push(o)
    })
    for (const f of fronts) if (f.shop && f.sk) LIGHTS.push({ t: 'shop', f, gx: f.px, gy: f.py, z: 0, kind: SHOP_LIGHT[f.sk], ph: f.seed })
    const X0 = LAKE.x0, Y0 = LAKE.y0
    LIGHTS.push({ t: 'tower', gx: X0 + 12.5, gy: Y0 + 15.5, z: 40, kind: 'towerAutumn' })
    for (let k = 0; k <= 12; k++) for (const ry of [7.08, 8.92]) { const gx = X0 + 17 + k / 3; LIGHTS.push({ t: 'bridge', gx, gy: Y0 + ry, z: 13 + (bridgeZ.get(Math.floor(gx) + ',' + (Y0 + 7)) || 0), kind: 'bridge', south: ry > 8 }) }
    for (const l of LIGHTS) { const [sx, sy] = proj(l.gx, l.gy); l.sx = sx; l.sy = sy }
  }
  // lịch đèn đường "normal" (§4.2): bật lúc hoàng hôn + 10 phút; sau 23h tắt cột thứ 3 (công viên/ven hồ tắt một nửa); sau 2:30 còn một nửa; tắt trước bình minh 10 phút
  function lampLevel(L, h) {
    const S = cal.sun.set, R = cal.sun.rise, onAt = S + 1 / 6 + L.ph * 0.08, offAt = R - 1 / 6 - L.ph * 0.06
    if (!(h >= onAt || h < offAt)) return 0
    const fade = h >= onAt ? clamp((h - onAt) / 0.04, 0, 1) : clamp((offAt - h) / 0.04, 0, 1)
    if (h >= 23 || h < 2.5) { if (L.park ? L.idx % 2 === 1 : L.idx % 3 === 2) return 0 }
    else if (h < 12 && L.idx % 2 === 1) return 0
    return fade
  }
  const decoLevel = (h) => { const end = (cal.wd === 5 || cal.wd === 6 || cal.wd === 0) ? 24 : 23; return h >= cal.sun.set + 1 / 6 && h < end ? 1 : 0 }   // trang trí: tới 23h (cuối tuần 24h)
  function lightLevel(L, h) {
    if (L.t === 'lamp') return lampLevel(L, h)
    if (L.t === 'shop') return shopOpen(L.f, h) ? 1 : 0
    if (L.t === 'tower' || L.t === 'bridge') return decoLevel(h)
    if (L.grp === 'stall') {
      if (L.site) return siteOpenAt(L.site, h) ? 1 : 0
      if (inR(Math.floor(L.gy), CORRY[PED]) && (cal.wd === 5 || cal.wd === 6 || cal.wd === 0) && h >= 18) return 1      // chợ đêm phố đi bộ
      const key = Math.floor(h * 120) + cal.wd * 4000; if (L._sk !== key) { L._sk = key; L._sv = hash01(Math.round(L.gx * 10), Math.round(L.gy * 10), 55) < SL.openProb('taphoa', h, cal.wd) ? 1 : 0 }
      return L._sv                                                            // sạp ô dù, hoa quả: theo giờ tạp hoá
    }
    if (L.grp === 'alley' || L.grp === 'yard') return lampLevel(L, h)
    if (L.grp === 'deco') return decoLevel(h)
    return 1
  }
  // dữ liệu xe đang thấy (dựng trong frame) để vẽ quạt đèn pha + đèn hậu
  let vehLit = []
  function vehEnds(v, L, cx, cy) { const F = L.axis === 'x' ? [L.dir, 0] : [0, L.dir]; return { F, S: [-F[1], F[0]], nose: [cx + F[0] * v.len / 2, cy + F[1] * v.len / 2], rear: [cx - F[0] * v.len / 2, cy - F[1] * v.len / 2] } }
  const VL = { moto: { lat: [0], len: 2.5, deg: 34, a: 0.42, hz: 15, tz: 13 }, car: { lat: [-0.24, 0.24], len: 3.6, deg: 46, a: 0.4, hz: 8, tz: 9 }, bus: { lat: [-0.32, 0.32], len: 4, deg: 50, a: 0.42, hz: 9, tz: 11 } }
  // đèn của xe vào lớp phát sáng (bị vật đứng trước che đúng): đầu xe thấy được khi xe chạy về phía camera (+x/+y), còn lại thấy đèn hậu
  const glassCache = new WeakMap()
  function busGlass(img) {
    let c = glassCache.get(img); if (c) return c
    c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data
    for (let i = 0; i < a.length; i += 4) { const r = a[i], gg = a[i + 1], b = a[i + 2]; if (a[i + 3] > 200 && r < 110 && gg >= 60 && b >= r + 18 && gg >= r) { const top = ((i / 4) % c.width) & 1; a[i] = 206; a[i + 1] = 228; a[i + 2] = 250; a[i + 3] = top ? 225 : 190 } else a[i + 3] = 0 }
    g.putImageData(d, 0, 0); glassCache.set(img, c); return c
  }
  function paintVehLamps(o, ox, oy, headOn) {
    const v = o.veh, L = o.lane, P = VL[v.type]; if (!P) return
    const E = vehEnds(v, L, o.gx, o.gy)
    ex.globalCompositeOperation = 'source-over'
    if (v.type === 'bus') ex.drawImage(busGlass(o.img), o.dx + ox, o.dy + oy)
    if (L.dir > 0) { if (!headOn) return; for (const la of P.lat) { const [sx, sy] = proj(E.nose[0] + E.S[0] * la, E.nose[1] + E.S[1] * la); ex.fillStyle = '#fffbe6'; ex.fillRect(Math.round(sx + ox) - 1, Math.round(sy + oy - P.hz), 2, 2) } }
    else for (const la of P.lat.length > 1 ? P.lat : [0]) { const [sx, sy] = proj(E.rear[0] + E.S[0] * la * 0.9, E.rear[1] + E.S[1] * la * 0.9); ex.fillStyle = v.brk ? '#ff5a3c' : '#e8281c'; ex.fillRect(Math.round(sx + ox) - 1, Math.round(sy + oy - P.tz), 2, v.brk ? 2 : 1) }
  }
  const vis_ = (X, Y, w, h, m = 100) => X > -m && X < w + m && Y > -m && Y < h + m + 40
  function drawLightmap(w, h, ox, oy, fade, headOn) {               // fade: đèn tĩnh (0 ban ngày, kể cả khi mưa); vf: đèn xe (bật khi mưa cả ban ngày)
    const hr = sky.hour, wet = sky.rain > 0.4, vf = Math.max(fade, headOn ? 0.35 : 0)
    lmx.globalCompositeOperation = 'lighter'
    let n = 0
    for (const L of LIGHTS) {
      const X = L.sx + ox, Y = L.sy + oy; if (!vis_(X, Y, w, h)) continue
      const lv = (L._lv = lightLevel(L, hr)) * fade; L._lf = frameNo; if (lv <= 0.01) continue
      if (++n > LCAP) break
      const k = K[L.kind] || K.warm
      if (L.t === 'lamp') {
        blit(lmx, SL.poolSprite(k.core, k.halo, k.r, k.a * 1.3, 1.5, 0.18), X, Y, lv)        // lõi + tán rộng nhạt (một sprite)
        if (L.water) blit(lmx, SL.streakSprite(k.core, k.halo, 5, 34), X + 36 + Math.round(Math.sin(T * 2 + L.gy) * 1.2), Y + 18, 0.4 * lv)   // phản chiếu trên mặt hồ
      } else if (L.t === 'shop') {
        const big = L.kind === 'cstore'
        blit(lmx, lsp(L.kind, big ? 64 : k.r), X, Y, k.a * lv)
        if (big) blit(lmx, lsp('cstore', 30), X, Y - 6, 0.6 * lv)
      } else if (L.t === 'tower') {
        blit(lmx, lsp('towerAutumn', 46), X, Y, 0.75 * lv); blit(lmx, SL.streakSprite(k.core, k.halo, 9, 46), X + Math.round(Math.sin(T * 1.7) * 1.5), Y + 10, 0.45 * lv)
      } else if (L.t === 'bridge') {
        if (L.south && Math.round(L.gx * 3) % 2 === 0) blit(lmx, SL.streakSprite(k.core, k.halo, 3, 22), X + Math.round(Math.sin(T * 2.3 + L.gx) * 1), Y + 4, 0.5 * lv)
      } else {
        const dim = L.grp === 'alley' || L.grp === 'yard' ? 0.6 : 1                    // đèn ngõ: nhỏ, không loang lên mái nhà che phía trước
        blit(lmx, lsp(L.kind, Math.round((L.r || k.r) * (dim < 1 ? 0.85 : 1.05))), X, Y, Math.min(0.75, (L.a || k.a) * 1.05) * lv * dim)
      }
    }
    // lồng đèn phố tàu: vũng ấm nhỏ dưới mỗi chuỗi
    for (const Ln of lanterns) { const [sx, sy] = proj(Ln.x, (Ln.y0 + Ln.y1) / 2); const X = sx + ox, Y = sy + oy; if (vis_(X, Y, w, h)) blit(lmx, lsp('lantern', 40), X, Y, 0.45 * decoLevel(hr) * fade) }
    // xe: quạt đèn cốt chiếu xuống mặt đường + vũng đỏ đèn hậu (đèn phanh đỏ đậm hơn → dải đỏ ở chỗ tắc)
    let nv = 0
    for (const e of vehLit) {
      const { v, L, cx, cy } = e, P = VL[v.type]; if (!P) continue
      const E = vehEnds(v, L, cx, cy), [nx, ny] = proj(E.nose[0], E.nose[1]), X = nx + ox, Y = ny + oy
      if (!vis_(X, Y, w, h, 160)) continue
      if (++nv > VCAP) break
      if (headOn) { const d = SUF(L.axis, L.dir), hk = v.type === 'moto' ? K.head : K.headLED; for (const la of P.lat) blit(lmx, SL.fanSprite(d, P.len, P.deg, la, hk.core, hk.halo, wet), X, Y, P.a * (wet ? 1.25 : 1) * vf) }
      const [rx, ry] = proj(E.rear[0], E.rear[1])
      if (headOn) blit(lmx, SL.lightSprite(K.brake.core, K.tail.core, v.brk ? 13 : 8, true), rx + ox, ry + oy, (v.brk ? 0.5 : 0.28) * Math.max(vf, 0.5))
    }
    for (const c of crossings) if (c.down) for (const [gx, gy] of [[c.x0 - 0.5, RS + 0.5], [c.x0 + 3.5, RN + 0.5]]) { const [sx, sy] = proj(gx, gy); blit(lmx, lsp('barrier', 30), sx + ox, sy + oy, (Math.floor(c.flash / 0.4) & 1 ? 0.6 : 0.25) * fade) }
    if (tr.ws) for (const b of closures) { const [sx, sy] = proj(b.gx, b.gy); blit(lmx, lsp('barrier', 18), sx + ox, sy + oy, (Math.floor(T * 2) & 1 ? 0.45 : 0.15) * fade) }
    lmx.globalAlpha = 1; lmx.globalCompositeOperation = 'source-over'
    return n
  }
  // quầng nhỏ ở bóng đèn/biển hiệu sau khi nhân (bloom) — ít, alpha thấp, vẫn lượng tử
  function drawBloom(w, h, ox, oy, fade, headOn) {
    const hr = sky.hour, vf = Math.max(fade, headOn ? 0.35 : 0)
    ctx.globalCompositeOperation = 'lighter'
    let n = 0
    for (const L of LIGHTS) {
      const X = L.sx + ox, Y = L.sy + oy - (L.z || 0); if (!vis_(X, Y, w, h, 60)) continue
      const lv = (L._lf === frameNo ? L._lv : lightLevel(L, hr)) * fade; if (lv <= 0.01) continue
      if (++n > LCAP) break
      const k = K[L.kind] || K.warm
      if (L.t === 'lamp') blit(ctx, MOBILE ? lsp(L.kind, 6, false) : SL.bulbSprite(k.core, k.halo, 5, 0.9, 18, 0.34), X, Y, lv)
      else if (L.t === 'shop') {
        const f = L.f
        if (L.kind === 'tea') {                                              // trà chanh: đèn dây bóng vàng dọc mặt tiền, nhấp nháy nhẹ
          const n2 = 2 + f.F * 3
          for (let i = 0; i <= n2; i++) { const t = i / n2, gx = f.fam === 'R' ? f.gx + 3.02 : f.gx + t * f.F, gy = f.fam === 'R' ? f.gy + t * f.F : f.gy + 3.02, [sx, sy] = proj(gx, gy), z = 30 + Math.round(3 * Math.sin(t * Math.PI)), tw = 0.75 + 0.25 * Math.sin(T * 3 + i * 1.7 + f.seed * 9)
            const XX = Math.round(sx + ox), YY = Math.round(sy + oy - z); ctx.globalAlpha = lv * tw; ctx.fillStyle = '#ffd27a'; ctx.fillRect(XX, YY, 1, 1); blit(ctx, lsp('tea', 4, false), XX, YY, 0.45 * lv * tw) }
        } else if (L.kind === 'cstore') {                                    // biển cửa hàng tiện lợi: dải đỏ / cam / tím sáng
          for (let i = 0; i <= 14; i++) { const t = i / 14, gx = f.fam === 'R' ? f.gx + 3.02 : f.gx + t * f.F, gy = f.fam === 'R' ? f.gy + t * f.F : f.gy + 3.02, [sx, sy] = proj(gx, gy), XX = Math.round(sx + ox), YY = Math.round(sy + oy - 27); ctx.globalAlpha = lv; ctx.fillStyle = '#e5262d'; ctx.fillRect(XX, YY, 1, 1); ctx.fillStyle = '#f7931e'; ctx.fillRect(XX, YY + 1, 1, 1); ctx.fillStyle = '#6b2c91'; ctx.fillRect(XX, YY + 2, 1, 1) }
          blit(ctx, lsp('cstore', 26, false), X, Y - 22, 0.22 * lv)
        }
      } else if (L.t === 'tower') { blit(ctx, SL.bulbSprite(k.core, k.halo, 12, 0.35, 34, 0.3), X, Y, lv) }
      else if (L.t === 'bridge') { ctx.globalAlpha = lv; ctx.fillStyle = '#ff7a5a'; ctx.fillRect(Math.round(X), Math.round(Y), 1, 1); blit(ctx, lsp('bridge', 5, false), X, Y, 0.5 * lv) }
      else if (L.kind === 'tea' && L.grp === 'stall') { for (let i = -3; i <= 3; i++) { const XX = Math.round(X + i * 4), YY = Math.round(Y - 4 + Math.abs(i) * 0.6); const tw = 0.7 + 0.3 * Math.sin(T * 3 + i + L.ph * 9); ctx.globalAlpha = lv * tw; ctx.fillStyle = '#ffd27a'; ctx.fillRect(XX, YY, 1, 1); blit(ctx, lsp('tea', 4, false), XX, YY, 0.4 * lv * tw) } }
      else blit(ctx, lsp(L.kind, Math.max(6, Math.round((L.r || 30) * 0.28)), false), X, Y, 0.45 * lv)
    }
    for (const Ln of lanterns) { const mx = Ln.x; const [sx, sy] = proj(mx, (Ln.y0 + Ln.y1) / 2); if (!vis_(sx + ox, sy + oy, w, h, 120)) continue; const lv = decoLevel(hr) * fade; for (const t of [0.25, 0.5, 0.75]) { const [px, py] = proj(mx, Ln.y0 + (Ln.y1 - Ln.y0) * t); blit(ctx, lsp('lantern', 12, false), px + ox, py + oy - (74 - 18 * 4 * t * (1 - t)), 0.55 * lv) } }
    if (headOn) {
      let nv = 0
      for (const e of vehLit) {                                             // quạt sáng mờ trong không khí (thấy được cả lúc chạng vạng)
        const { v, L, cx, cy } = e, P = VL[v.type]; if (!P) continue
        if (++nv > VCAP) break
        const E = vehEnds(v, L, cx, cy), [nx, ny] = proj(E.nose[0], E.nose[1]), hk = v.type === 'moto' ? K.head : K.headLED
        if (vis_(nx + ox, ny + oy, w, h, 160)) blit(ctx, SL.fanSprite(SUF(L.axis, L.dir), P.len, P.deg, 0, hk.core, hk.halo, sky.rain > 0.4), nx + ox, ny + oy, 0.13 * vf * (P.lat.length > 1 ? 1.4 : 1))
      }
      nv = 0
      for (const e of vehLit) {
        const { v, L, cx, cy } = e, P = VL[v.type]; if (!P) continue
        if (++nv > VCAP) break
        const E = vehEnds(v, L, cx, cy)
        if (L.dir > 0) for (const la of P.lat) { const [sx, sy] = proj(E.nose[0] + E.S[0] * la, E.nose[1] + E.S[1] * la); blit(ctx, SL.lightSprite(K.head.core, K.head.halo, 6, false), sx + ox, sy + oy - P.hz, 0.5 * vf) }
        else { const [sx, sy] = proj(E.rear[0], E.rear[1]); blit(ctx, SL.lightSprite(K.brake.core, K.tail.core, v.brk ? 7 : 4, false), sx + ox, sy + oy - P.tz, (v.brk ? 0.55 : 0.3) * vf) }
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
  }
  function postFx(dt, w, h, ox, oy, glows, night) {
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
    const fade = clamp((night - 0.04) * 1.6, 0, 1), headOn = SL.headlightsOn(sky.hour, night, sky.rain)
    stats.lights = 0
    if (fade <= 0 && !(headOn && night > 0.02)) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.fillRect(0, 0, w, h) }
    else {
      if (lm.width !== w || lm.height !== h) { lm.width = w; lm.height = h }
      lmx.globalCompositeOperation = 'source-over'; lmx.globalAlpha = 1; lmx.fillStyle = col; lmx.fillRect(0, 0, w, h)
      stats.lights = DBG.noLM ? 0 : drawLightmap(w, h, ox, oy, fade, headOn)
      ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(lm, 0, 0)
    }
    if (clear > 0.1 && S.e > 0.1) {                         // nắng chói từ góc trên-trái
      ctx.globalCompositeOperation = 'screen'
      const g = ctx.createRadialGradient(w * 0.1, -h * 0.1, 0, w * 0.1, -h * 0.1, Math.max(w, h) * 0.9); g.addColorStop(0, `rgba(255,226,160,${0.2 * clear * S.e})`); g.addColorStop(1, 'rgba(255,226,160,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    }
    if (night > 0.05) drawLitWindows(night)
    if ((fade > 0 || headOn) && !DBG.noBloom) drawBloom(w, h, ox, oy, fade, headOn)
    ctx.globalCompositeOperation = 'lighter'
    for (const g of glows) { const [sx, sy] = proj(g.gx, g.gy); if (!vis_(sx + ox, sy + oy, w, h, 60)) continue; blit(ctx, SL.lightSprite('#FF6A50', '#FF3020', g.r, false), sx + ox, sy + oy - g.z, g.a * 0.8) }   // đèn đỏ chắn tàu (cả ban ngày)
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
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
    const mkb = (label, title, fn) => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.style.cssText = 'width:' + (innerWidth < 700 ? 44 : 36) + 'px;height:' + (innerWidth < 700 ? 44 : 34) + 'px;border-radius:6px;border:1px solid #6b5f45;background:rgba(14,15,19,.78);color:#f4efe2;cursor:pointer;padding:0'; b.addEventListener('pointerdown', (e) => { e.stopPropagation(); audioInit(); fn() }); d.appendChild(b); return b }
    mkb('☀', 'Nắng', () => setWeather('sunny')); mkb('☁', 'Nhiều mây', () => setWeather('cloudy')); mkb('🌧', 'Mưa', () => setWeather('rain')); mkb('⛈', 'Mưa giông', () => setWeather('storm')); const fb = mkb('⚡', 'Sấm chớp dữ dội (ngẫu nhiên)', () => { sky.fury = !sky.fury; fb.style.background = sky.fury ? 'rgba(120,90,20,.9)' : 'rgba(14,15,19,.78)'; if (sky.fury && sky.rain < 0.3 && sky.weather !== 'rain' && sky.weather !== 'storm') setWeather('storm') }); mkb('🕒', 'Đổi giờ', jumpTime); mkb('⏯', 'Giờ tự chạy', () => { sky.auto = !sky.auto })
    document.body.appendChild(d)
  }
  // ───────── khởi động ─────────
  function generate() {
    genGround(); genGate(); genLake(); genPlay(); genMarket(); genPark(); genTowers(); genBlocks(); fillGaps(); genAlleyLife(); genHome(); genTrainStreet(); streets(); streetLife(); genPedStreet(); genSigns(); nameTiles(); sortStatics(); genTraffic(); genNpc()
    assignShops(); buildClosures(); buildLights(); buildActors()                                // 4B: loại quán + giờ mở, rào phố đi bộ, đèn, cảnh đời phố
  }
  function start(canvas, hudEl) {
    cv = canvas; ctx = cv.getContext('2d'); hud = hudEl
    const [cx, cy] = proj(...SPAWN); cam.x = cx; cam.y = cy
    if (innerWidth < 700) { cam.zoom = cam.zoomTarget = zA.wrote = zA.from = 1; hud.style.display = 'none' }
    Game.init({ W: { ground: kind }, N, proj, cam, tile: () => [TW, TH], isBlocked, colliders, groundZ, spawn: SPAWN })
    const found = new Set()
    const sync = () => { Game.extraHud = `khám phá ${found.size}/${pois.length}` }; sync()
    pois.push({ id: 'rail', label: 'Phố tàu hỏa', gx: 34.5, gy: RS - 0.6, r: 2.4 })
    for (const p of pois) Game.registerPOI({ ...p, onInteract: (q) => { found.add(q.id); sync(); Game.toast(found.size === pois.length ? `${q.label} — bạn đã khám phá đủ ${pois.length} địa danh!` : `${q.label} — đã khám phá ${found.size}/${pois.length}`) } })
    let drag = null
    cv.addEventListener('pointerdown', (e) => { if (Game.mode === 'play') { Game.pointer(e, 'down'); return } drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; cv.setPointerCapture(e.pointerId) })
    cv.addEventListener('pointermove', (e) => { if (Game.mode === 'play') { Game.pointer(e, 'move'); return } if (drag) { cam.x = drag.cx - (e.clientX - drag.x) / cam.zoom; cam.y = drag.cy - (e.clientY - drag.y) / cam.zoom } })
    cv.addEventListener('pointerup', () => { drag = null })
    // bánh xe: CỘNG DỒN deltaY, đủ ~100 mới đổi 1 nấc. Chuột thường (mỗi khấc ≥50, thường 100/120) = đúng 1 nấc/khấc;
    // trackpad (nhiều sự kiện nhỏ, có quán tính) cộng dồn; sau mỗi nấc thì khoá tới khi ngừng vuốt (nghỉ 160 ms, tối đa 0,6 s) → một lần vuốt = 1 nấc, không vọt.
    let wAcc = 0, wLast = -1e9, wStep = -1e9, wGest = false
    cv.addEventListener('wheel', (e) => {
      e.preventDefault()
      const now = performance.now(), dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1)
      if (!dy) return
      const gap = now - wLast; wLast = now
      if (gap > 160) wGest = false                                                             // ngừng tay: lần cuộn mới
      if (gap < 40 || Math.abs(dy) < 50) wGest = true                                          // dồn dập hoặc delta nhỏ = trackpad (giữ tới hết lần vuốt)
      if (gap > 220 || Math.sign(dy) !== Math.sign(wAcc)) wAcc = 0                             // nghỉ lâu hoặc đổi chiều: tính lại từ đầu
      if (now - wStep < (wGest ? 600 : 50)) { wAcc = 0; return }                               // vừa đổi nấc: chuột nghỉ 50 ms, trackpad tối đa 1 nấc / 0,6 s
      wAcc = Math.abs(dy) >= 50 ? Math.sign(dy) * 100 : wAcc + dy
      if (Math.abs(wAcc) < 100) return
      const free = Game.mode !== 'play'
      setZoomTarget(cam.zoomTarget + (wAcc < 0 ? 1 : -1), free ? { x: e.clientX, y: e.clientY } : null)
      wAcc = 0; wStep = now
    }, { passive: false })
    buildUI()
    addEventListener('pointerdown', audioInit)
    addEventListener('keydown', (e) => { audioInit(); const k = e.key.toLowerCase(); if (k === 'f') document.querySelector('button[title^="Sấm"]').dispatchEvent(new Event('pointerdown')); if (k === 't') jumpTime(); if (k === 'y') sky.auto = !sky.auto; if (k === 'r') { const o = ['sunny', 'cloudy', 'rain', 'storm']; setWeather(o[(o.indexOf(sky.weather) + 1) % 4]) } if (k === 'h') hud.style.display = hud.style.display === 'none' ? '' : 'none' })
    window.addEventListener('error', (e) => stats.errors.push(String(e.message)))
    window.__world = { alleys, alleyT, occ, blk, pois, strike, thunder, litFrac, instWins, decodeWins, statSorted: () => statSorted, statics, train, crossings, LANES, kind, ph, cam, stats, isBlocked, setTod: (v) => { tod = v }, sky, setWeather, setHour: (hr) => { sky.hour = hr }, NPC, lamps, LIGHTS, ACT, actLive, poseOK: () => poseOK, DBG, closures, tr, cal, PINS, fronts, npcOK: () => npcOK, npcActive, forceTrain: (dir) => trainReset(dir || 1), frame: (t) => frame(t), step: (dt, n = 1) => { for (let i = 0; i < n; i++) { stepTraffic(dt); stepTrain(dt); Game.update(dt) } } }
    window.__stats = stats; window.__ready = true
    try { const P = window.__npcPoses; if (P && P.ready) P.ready.then(() => { poseOK = true }); else { const t0 = setInterval(() => { const Q = window.__npcPoses; if (Q && Q.ready) { clearInterval(t0); Q.ready.then(() => { poseOK = true }) } }, 500) } } catch (e) { /* chưa có dáng: bỏ qua cảnh */ }
    last = performance.now()
    ;(function loop(now) { try { frame(now) } catch (e) { stats.errors.push(String(e.stack || e)); hud.textContent = 'lỗi: ' + e.message; return } requestAnimationFrame(loop) })(last)
  }
  // chặn tĩnh (không tính thanh chắn tàu đang hạ) dùng cho tìm đường
  const staticBlocked = (tx, ty) => tx < 0 || ty < 0 || tx >= N || ty >= N || blk[ty][tx] || (kind[ty][tx] === 'water' && !bridgeT.has(tx + ',' + ty))
  // 4B: lịch/nhịp phố cho api.js
  const streetInfo = () => ({ day: cal.day, weekday: cal.wd, label: SL.WEEKDAY_NAME[cal.wd], sunrise: +cal.sun.rise.toFixed(3), sunset: +cal.sun.set.toFixed(3), walkingStreet: tr.ws, rush: +tr.D.rush.toFixed(2),
    density: { moto: +tr.D.moto.toFixed(2), car: +tr.D.car.toFixed(2), bus: +tr.D.bus.toFixed(2), pedOld: +tr.D.pedOld.toFixed(2), pedLake: +tr.D.pedLake.toFixed(2) },
    vehiclesOn: LANES.reduce((s, L) => s + L.vs.filter((v) => v.on).length, 0), npcOn: npcActive(), actors: actLive.length, lights: stats.lights || 0, night: +nightAt(sky.hour).toFixed(2), headlights: SL.headlightsOn(sky.hour, nightAt(sky.hour), sky.rain) })
  const gameApi = { sites, pois, hooks, sky, train, crossings, kind, colliders, softProps, getHome: () => home, setZoomTarget, staticBlocked, areaOf, groundZ, RS, RN, RAIL_Y, RAILC, LAKE, TW, TH, NPC, LANES, roadLike,
    cal, setDay, siteOpenAt, PINS, actLive, streetInfo, nightAt: (h) => nightAt(h ?? sky.hour) }
  return { load, generate, start, cam, stats, N, proj, ...gameApi }
})()
window.World = World
export { World }

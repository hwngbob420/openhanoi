// Danh mục asset: nguồn duy nhất cho tên, kích thước, tâm (pivot) và tham số vẽ.
export function specs() {
  const S = []
  const add = (s) => S.push(s)

  // ── nền ──
  add({ name: 'g_asphalt', kind: 'tile', k: 'asphalt' })
  for (const l of ['xa', 'xb', 'ya', 'yb']) add({ name: 'g_road_' + l, kind: 'tile', k: 'asphalt', line: l })
  add({ name: 'g_dash_x', kind: 'tile', k: 'asphalt', dash: 'x' })
  add({ name: 'g_dash_y', kind: 'tile', k: 'asphalt', dash: 'y' })
  add({ name: 'g_zebra_x', kind: 'tile', k: 'zebra', axis: 'x' })
  add({ name: 'g_zebra_y', kind: 'tile', k: 'zebra', axis: 'y' })
  for (let m = 0; m < 16; m++) add({ name: 'g_walk_m' + m, kind: 'tile', k: 'sidewalk', mask: m })
  add({ name: 'g_walk_a1', kind: 'tile', k: 'sidewalk', alt: 1 })
  for (const a of [0, 1]) add({ name: 'g_plaza_' + a, kind: 'tile', k: 'plaza', alt: a })
  for (const a of [0, 1]) add({ name: 'g_grass_' + a, kind: 'tile', k: 'grass', alt: a })
  for (let m = 0; m < 16; m++) for (const f of [0, 1]) add({ name: `g_water_m${m}_${f}`, kind: 'tile', k: 'water', mask: m, frame: f })
  add({ name: 'g_rail', kind: 'tile', k: 'rail' })
  add({ name: 'g_railroad', kind: 'tile', k: 'railroad' })
  for (const a of [0, 1]) add({ name: 'g_market_' + a, kind: 'tile', k: 'market', alt: a })
  add({ name: 'g_dirt', kind: 'tile', k: 'dirt' })
  add({ name: 'g_gravel', kind: 'tile', k: 'gravel' })

  // ── nhà ống / nhà mặt phố ── (họ R,L = mặt tiền hướng +x / +y; nR,nL = mặt tiền quay đi, chỉ thấy lưng nhà)
  const WALLS = { ochre: '#ecc474', lemon: '#f2e09a', mint: '#b2cfa6', salmon: '#eab08c', sky: '#aec8d8', cream: '#eee3ca' }
  const wk = Object.keys(WALLS)
  for (const fam of ['R', 'L', 'nR', 'nL']) for (const F of [1, 2]) for (const fl of [2, 3, 4]) for (let ci = 0; ci < wk.length; ci++) for (const shop of (fam.startsWith('n') ? [0] : [0, 1])) {
    const along = fam.endsWith('R'), roof = (ci + fl) % 2 === 0 ? 'tile' : 'flat'
    add({ name: `h_${fam}_${F}_${fl}_${wk[ci]}${shop ? '_s' : ''}`, kind: 'house', group: 'house_' + fam, w: along ? 3 : F, d: along ? F : 3, floors: fl, wall: WALLS[wk[ci]], front: fam.startsWith('n') ? 'N' : fam, ridge: along ? 'x' : 'y', roof, shop, style: 'old', outline: 0.45 })
  }
  for (const fam of ['R', 'L']) for (const fl of [3, 4]) for (const [ci, wc] of [['white', '#e9edf0'], ['grey', '#c9d0d6']]) {
    const along = fam === 'R'
    add({ name: `m_${fam}_${fl}_${ci}`, kind: 'house', group: 'modern_' + fam, w: along ? 3 : 2, d: along ? 2 : 3, floors: fl, wall: wc, front: fam, ridge: along ? 'x' : 'y', roof: 'flat', shop: 0, style: 'modern', outline: 0.45 })
  }
  add({ name: 'tower_a', kind: 'tower', group: 'tower', w: 3, d: 3, h: 300, outline: 0.5 })
  add({ name: 'tower_b', kind: 'tower', group: 'tower', w: 2, d: 3, h: 210, outline: 0.5 })

  // ── cây ──
  const tree = (name, type, r, h, extra = {}) => add({ name, kind: 'tree', group: 'tree_' + type, type, r, h, w: 2 * r + 26, h: h + r + 10, px: r + 13, py: h + r + 4, ...extra })
  for (let i = 1; i <= 3; i++) tree('t_bang_' + i, 'bang', 28 + i * 2, 74 + i * 4)
  for (let i = 1; i <= 3; i++) tree('t_small_' + i, 'small', 13 + i * 2, 44 + i * 3)
  for (let i = 1; i <= 2; i++) tree('t_phuong_' + i, 'phuong', 32 + i * 2, 70 + i * 4)
  for (let i = 1; i <= 2; i++) tree('t_lieu_' + i, 'lieu', 24 + i * 2, 66 + i * 4)
  tree('t_bush_1', 'bush', 12, 14); tree('t_bush_2', 'bush', 14, 16, { flower: 1 })

  // ── xe ── (tên: ...px/nx/py/ny = chạy theo +x/-x/+y/-y)
  const HEAD = [['px', 'x', 1], ['nx', 'x', -1], ['py', 'y', 1], ['ny', 'y', -1]]
  const SHIRT = ['#e8e2d0', '#3a6bb5', '#c94a3a', '#2f2f33', '#d9a53c', '#5aa56a'], HELM = ['#e8e2d0', '#23252b', '#d9a53c', '#3a6bb5', '#c94a3a', '#4a9a5a']
  const BODY = ['#d93a2b', '#2f62c9', '#e8e2d0', '#23252b', '#e3a82c', '#2f8f59']
  for (let i = 0; i < 6; i++) for (const [h, axis, dir] of HEAD) add({ name: `mo_${i}_${h}`, kind: 'vehicle', group: 'moto', type: 'moto', rider: 1, pillion: i % 3 === 0 ? SHIRT[(i + 2) % 6] : null, axis, dir, L: 30, W: 10, H: 36, col: BODY[i], shirt: SHIRT[(i + 3) % 6], helm: HELM[i], helm2: HELM[(i + 2) % 6] })
  for (let i = 0; i < 6; i++) for (const [h, axis, dir] of HEAD.slice(0, 1).concat(HEAD.slice(2, 3))) add({ name: `mop_${i}_${axis}`, kind: 'vehicle', group: 'moto_parked', type: 'moto', rider: 0, axis, dir, L: 30, W: 10, H: 20, col: BODY[i] })
  const CAR = ['#e8e2d0', '#d93a2b', '#2f62c9', '#e3a82c', '#4a7d5c']
  for (let i = 0; i < CAR.length; i++) for (const [h, axis, dir] of HEAD) add({ name: `car_${i}_${h}`, kind: 'vehicle', group: 'car', type: 'car', axis, dir, L: 62, W: 26, H: 26, col: CAR[i] })
  const BUS = [['a', '#efe6d2', '#d93a2b'], ['b', '#f2c23c', '#a3202a'], ['c', '#e8f0e0', '#2f7a58']]
  for (const [k, col, band] of BUS) for (const [h, axis, dir] of HEAD) add({ name: `bus_${k}_${h}`, kind: 'vehicle', group: 'bus', type: 'bus', axis, dir, L: 122, W: 32, H: 50, col, band })
  for (const [h, axis, dir] of HEAD.slice(0, 2)) add({ name: `loco_${h}`, kind: 'vehicle', group: 'loco', type: 'loco', axis, dir, L: 118, W: 32, H: 46, col: '#2f5fa8', band: '#f2c23c' })
  add({ name: 'coach_px', kind: 'vehicle', group: 'coach', type: 'coach', axis: 'x', dir: 1, L: 132, W: 32, H: 40, col: '#ece7da', band: '#2f5fa8' })

  // ── công trình mốc ──
  add({ name: 'lm_gate', kind: 'gate', group: 'landmark', w: 1, d: 7, hup: 180 })
  add({ name: 'lm_bridge', kind: 'bridge', group: 'landmark', w: 1, d: 2, z: 9, hup: 40 })
  add({ name: 'lm_bridge_gate', kind: 'bridge_gate', group: 'landmark', w: 150, h: 130, px: 92, py: 86 })
  add({ name: 'lm_temple', kind: 'temple', group: 'landmark', w: 3, d: 3, hup: 140 })
  add({ name: 'lm_turtle', kind: 'turtle_tower', group: 'landmark', w: 1, d: 1, hup: 150 })

  // ── đồ phố ──
  const P = (name, type, extra = {}) => add({ name: 'p_' + name, kind: 'prop', group: 'prop', type, w: 120, h: 140, px: 60, py: 112, ...extra })
  P('lamp', 'lamp', { py: 90, h: 118 }); P('pole', 'pole', { py: 122, h: 140 })
  P('bench_x', 'bench', { axis: 'x' }); P('bench_y', 'bench', { axis: 'y' }); P('bin', 'bin')
  P('shelter_x', 'shelter', { axis: 'x', w: 150 }); P('shelter_y', 'shelter', { axis: 'y', w: 150 })
  P('pho', 'pho'); P('banhmi', 'banhmi'); P('fruit', 'fruit')
  const UMB = [['red', ['#d4382c', '#efe6d2'], ['#e0a52a', '#d4382c', '#7aa57a']], ['yellow', ['#f2c23c', '#fbf6e8'], ['#d4382c', '#7aa57a', '#e08a2a']], ['teal', ['#3f8f7b', '#fbf6e8'], ['#e0a52a', '#d9629a', '#7aa57a']], ['orange', ['#e08a2a', '#efe6d2'], ['#7aa57a', '#d4382c', '#e0a52a']]]
  for (const [n, cols, goods] of UMB) P('umb_' + n, 'umbrella', { cols, goods })
  P('cafe_red', 'cafe', { col: '#d4382c' }); P('cafe_green', 'cafe', { col: '#2f7a58' }); P('stools', 'stools'); P('kiosk', 'kiosk'); P('cyclo', 'cyclo'); P('planter', 'planter'); P('flagpole', 'flagpole', { py: 100 })
  // ── phố cafe đường tàu ──
  P('fence_a', 'fence', { w: 70, h: 44, px: 8, py: 30 }); P('fence_b', 'fence', { w: 70, h: 44, px: 8, py: 30, sign: 1 })
  const TCC = [['green', ['#2f7a58', '#efe6d2'], '#8a5a34'], ['red', ['#d4382c', '#efe6d2'], '#5a3d2b'], ['blue', ['#3a6bb5', '#efe6d2'], '#6b4a32'], ['yellow', ['#e0a52a', '#fbf6e8'], '#7a5a3c']]
  for (const [n, cols, body] of TCC) P('tc_counter_' + n, 'tc_counter', { cols, body, w: 150, h: 130, px: 74, py: 108 })
  const TCS = [['a', ['#d4382c', '#efe6d2'], ['#d4382c', '#3a6bb5', '#2f8f59', '#f2c23c']], ['b', ['#2f7a58', '#fbf6e8'], ['#3a6bb5', '#d4382c', '#f2c23c', '#2f8f59']], ['c', ['#3a6bb5', '#fbf6e8'], ['#f2c23c', '#2f8f59', '#d4382c', '#3a6bb5']], ['d', ['#e08a2a', '#efe6d2'], ['#2f8f59', '#f2c23c', '#3a6bb5', '#d4382c']], ['e', ['#8a6bb0', '#fbf6e8'], ['#d4382c', '#f2c23c', '#2f8f59', '#3a6bb5']]]
  for (const [n, cols, st] of TCS) P('tc_set_' + n, 'tc_set', { cols, st })
  P('tc_cooler', 'tc_cooler', { w: 70, h: 60, px: 35, py: 48 }); P('tc_plants', 'tc_plants', { w: 100, h: 70, px: 50, py: 56 }); P('tc_flag', 'tc_flag', { py: 56, h: 70 })
  for (const [d, nm] of [[1, 'p'], [-1, 'n']]) for (const st of ['a', 'b', 'up']) P(`barrier_${nm}_${st}`, 'barrier', { dir: d, state: st, w: 150, h: 128, px: d > 0 ? 28 : 122, py: 82 })
  return S
}

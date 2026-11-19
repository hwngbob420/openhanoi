// ───────── Cảnh dựng thử 320x180 cho từng mini-game (chỉ để duyệt; vị trí theo code hiện tại) ─────────
const MOCKS = []
function mock(name, label, fn) { MOCKS.push({ name, label, draw: (get) => { const c = NEW(320, 180); const put = (n, x, y, f = 0, flip = false) => { const { cv, s } = get(n, f); const a = s.anchor || [0, 0]; blit(c, cv, Math.round(x - (flip ? s.w - 1 - a[0] : a[0])), Math.round(y - a[1]), flip) }; fn(c, put); return c } }) }
const tileX = (put, n, w, y, x0 = 0, x1 = 320, f = 0) => { for (let x = x0; x < x1; x += w) put(n, x, y, f) }

mock('cyclo', 'Xích lô Hồ Gươm', (c, put) => {
  for (let y = 0; y < 58; y++) c.rect(0, y, 320, 1, ['#bfe3f2', '#cde9f4', '#dcf0f6', '#e8f6f4'][Math.min(3, y / 14 | 0)])
  put('cy_cloud', 30, 10); put('cy_cloud', 200, 20)
  for (let x = -20; x < 320; x += 160) put('cy_far_shore', x, 60)
  for (let x = 0; x < 320; x += 64) put('cy_water', x, 58, 1)
  put('cy_turtle_tower', 240, 96); put('cy_ngocson', 70, 104)
  tileX(put, 'cy_bank', 32, 108)
  put('cy_willow', 30, 122, 0); put('cy_willow', 150, 122, 1); put('cy_willow', 280, 122, 2); put('cy_lamp', 95, 122, 0); put('cy_lamp', 215, 122, 0); put('cy_bench', 120, 121); put('cy_bench', 250, 121)
  tileX(put, 'cy_road', 32, 122)
  put('ped_0_down', 230, 142, 1); put('ico_warn', 230, 112, 0); put('ped_3_left', 270, 136, 2)
  put('cyclo', 110, 160, 1); put('fx_bell', 70, 120, 1)
})
mock('rail', 'Gác chắn đường tàu', (c, put) => {
  c.rect(0, 0, 320, 180, '#b9a98a'); for (let y = 0; y < 180; y += 16) for (let x = 0; x < 320; x += 16) put('tc_pave', x, y)
  put('rail_house_0', 4, 4); put('rail_house_1', 70, 4); put('rail_house_2', 194, 4); put('rail_house_3', 256, 4)
  put('rail_house_2', 4, 126); put('rail_house_3', 70, 126); put('rail_house_0', 194, 126); put('rail_house_1', 256, 126)
  c.rect(134, 0, 52, 180, '#566478'); for (let y = 0; y < 180; y += 20) c.rect(159, y, 2, 10, '#d9d2b0')
  for (let x = 0; x < 320; x += 16) put(x >= 128 && x < 186 ? 'rail_track_cross' : 'rail_track', x, 85)
  put('veh_motot_0_down', 150, 40, 0); put('veh_cart_1_down', 150, 66, 0); put('veh_motot_2_up', 170, 140, 1); put('veh_cart_0_up', 170, 160, 0); put('ico_angry', 150, 50, 1)
  put('rail_loco_r', 160, 105, 0); put('rail_coach', 116, 105, 0); put('rail_coach', 72, 105, 1)
  put('rail_signal', 128, 80, 0); put('rail_boom', 134, 76, 4); put('rail_signal', 192, 124, 1); put('rail_boom_l', 186, 120, 4)
})
mock('ship', 'Shipper ngõ sâu', (c, put) => {
  for (let y = -10; y < 180; y += 40) { put('ship_wall_l_' + ((y / 40 | 0) & 1), 0, y); put('ship_wall_r_' + ((y / 40 | 0) & 1 ^ 1), 228, y) }
  for (let y = -6; y < 180; y += 48) put('ship_floor', 92, y)
  put('ship_door_l', 84, 70, 1); put('ship_door_r', 236, 150, 0)
  put('ship_parcel', 128, 40); put('ship_pot_1', 192, 70); put('ship_cat', 160, 100, 1); put('ship_cart', 128, 120); put('ped_6_down', 192, 30, 1)
  put('ship_rider', 160, 168, 0); put('ship_wires', 92, 4)
})
mock('tc', 'Xếp ghế trà chanh', (c, put) => {
  for (let x = 0; x < 320; x += 16) for (let y = 26; y < 56; y += 16) put('tc_pave', x, y)
  put('tc_shopfront', 0, 0)
  put('tc_cart', 20, 50)
  ;[44, 100, 160, 220, 276].forEach((x, i) => { if (i < 3) { put('cust_' + [2, 6, 3][i] + '_down', x, 52, i % 2); put('tc_table', x + 14, 50) } else put('tc_slot', x, 50, 0) })
  for (let x = 0; x < 320; x += 32) { put('tc_road', x, 56); put('tc_road_dash', x, 82); put('tc_road_dash', x, 108); c.rect(x, 134, 32, 8, '#566478') }
  for (let x = 0; x < 320; x += 32) { put('tc_curb', x, 54); put('tc_curb', x, 140) }
  for (let x = 0; x < 320; x += 16) for (let y = 144; y < 180; y += 16) put('tc_pave', x, y)
  put('tc_stack', 150, 176)
  put('veh_moto_1_r', 60, 76, 0); put('veh_bus_l', 220, 102, 1); put('veh_car_0_r', 120, 128, 0); put('veh_moto_3_l', 290, 76, 1)
  put('player_carry_down', 160, 168, 1); put('tc_stool_0', 160, 142)
})
mock('pho', 'Phụ quán phở', (c, put) => {
  put('pho_wall', 0, 0); put('pho_pot', 40, 76, 1)
  put('player_serve', 160, 80, 1)
  put('pho_counter', 0, 72)
  for (let x = 0; x < 320; x += 32) put('pho_floor', x, 110)
  ;[46, 118, 190, 262].forEach((x, i) => { put('cust_' + [0, 4, 7, 5][i] + '_up', x, 172, i % 2); })
  put('food_pho', 46, 136, 0); put('food_quay', 118, 136); put('food_tra', 190, 136); put('food_pho', 262, 136, 1)
})

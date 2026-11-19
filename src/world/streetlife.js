// Nhịp phố theo giờ + thứ, giờ mở quán, mặt trời, bảng màu đèn — số liệu lấy từ docs/STREET_LIFE.md (§1, §3, §4, §5).
// Mọi hệ số mật độ là ước lượng thiết kế [TKG] neo vào mốc có nguồn; nội suy tuyến tính theo giờ thực (float).
// File này chỉ có bảng + hàm thuần + bộ đệm sprite ánh sáng (vẽ sẵn, lượng tử 4 dải + dither Bayer để giữ chất pixel).

// ───────── lịch: ngày 1 = Thứ Sáu (hợp đồng 4B), 0 = Chủ nhật ─────────
export const WEEKDAY_NAME = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
export const weekdayOf = (day) => (((Math.floor(day) + 4) % 7) + 7) % 7
const DOY0 = 322                                                    // ngày 1 của game = 18/11 (ngày thứ 322 trong năm)

// ───────── mặt trời Hà Nội (§4.7): [ngày trong năm, bình minh, hoàng hôn] (giờ thập phân, UTC+7) ─────────
const SUN = [[16, 6 + 34 / 60, 17 + 35 / 60], [159, 5 + 13 / 60, 18 + 36 / 60], [185, 5 + 17 / 60, 18 + 43 / 60], [258, 5 + 43 / 60, 17 + 59 / 60], [288, 5 + 51 / 60, 17 + 32 / 60], [331, 6 + 13 / 60, 17 + 15 / 60], [349, 6 + 24 / 60, 17 + 19 / 60]]
export function sunTimes(day) {
  const d = ((DOY0 + Math.floor(day) - 1 - 1) % 365 + 365) % 365 + 1
  const K = [...SUN, [SUN[0][0] + 365, SUN[0][1], SUN[0][2]]], dd = d < SUN[0][0] ? d + 365 : d
  for (let i = 1; i < K.length; i++) if (dd <= K[i][0]) { const [d0, r0, s0] = K[i - 1], [d1, r1, s1] = K[i], t = (dd - d0) / (d1 - d0); return { rise: r0 + (r1 - r0) * t, set: s0 + (s1 - s0) * t } }
  return { rise: 6.13, set: 17.3 }
}

// ───────── mật độ theo giờ (§5.1) ─────────
export const DENSITY_KEYS = [
//  h,    moto, car,  bus,  pedOld, pedLake
  [0,    0.12, 0.06, 0,    0.12,   0.10],
  [2,    0.04, 0.02, 0,    0.04,   0.03],
  [4,    0.08, 0.03, 0,    0.10,   0.25],
  [5,    0.20, 0.06, 0.20, 0.25,   0.70],
  [6,    0.50, 0.22, 0.70, 0.45,   1.00],
  [7.5,  1.00, 0.80, 1.00, 0.55,   0.75],   // cao điểm sáng 6:30–8:30 [4]
  [8.5,  0.80, 0.75, 0.90, 0.45,   0.30],
  [10,   0.55, 0.60, 0.60, 0.50,   0.45],
  [12,   0.70, 0.60, 0.60, 0.65,   0.40],
  [13.5, 0.45, 0.50, 0.50, 0.30,   0.25],
  [15,   0.55, 0.60, 0.60, 0.40,   0.30],
  [17.5, 1.00, 0.95, 1.00, 0.65,   0.60],   // cao điểm chiều 16:30–18:30 [4]
  [18.5, 0.90, 0.85, 0.90, 0.75,   0.85],
  [20,   0.70, 0.55, 0.60, 0.90,   0.90],
  [21.5, 0.50, 0.40, 0.40, 0.70,   0.70],
  [22.5, 0.35, 0.25, 0.10, 0.50,   0.45],   // buýt cuối ~22:30 [24]
  [23.5, 0.20, 0.12, 0,    0.30,   0.25],
  [24,   0.12, 0.06, 0,    0.12,   0.10],
]
function lerpRow(K, h) {
  h = ((h % 24) + 24) % 24
  for (let i = 1; i < K.length; i++) if (h <= K[i][0]) { const a = K[i - 1], b = K[i], t = (h - a[0]) / (b[0] - a[0]); return a.map((v, j) => v + (b[j] - v) * t) }
  return K[K.length - 1].slice()
}
// phố đi bộ Hồ Gươm: 19:00 thứ Sáu → 24:00 Chủ nhật, liên tục [1][2]
export const walkingStreetOn = (wd, h) => (wd === 5 && h >= 19) || wd === 6 || wd === 0
// giờ cao điểm ngày thường (khung cấm xe >16 chỗ [4]): 0..1, có dốc vào/ra 30 phút
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export function rushAt(wd, h) {
  if (wd === 0 || wd === 6) return 0
  const m = ss(6.5, 7.1, h) * (1 - ss(8.3, 8.9, h)), e = ss(16.4, 17.0, h) * (1 - ss(18.4, 19.0, h))
  return Math.max(m, e)
}
// → {moto,car,bus,pedOld,pedLake,ws,rush}
export function densityAt(h, wd) {
  const r = lerpRow(DENSITY_KEYS, h), ws = walkingStreetOn(wd, h), wkEnd = wd === 0 || wd === 6
  let [, moto, car, bus, pedOld, pedLake] = r
  if (wkEnd && h >= 6.5 && h < 9.5) { moto *= 0.6; car *= 0.7 }                        // T7/CN sáng không có giờ đi làm (×0.6)
  if (ws && h >= 18.5 && h < 23.5) pedLake = Math.min(1.6, pedLake * 1.6)                // ven hồ ×1.6 tối phố đi bộ
  if (ws && h >= 23 && h < 24) pedLake = Math.max(pedLake, 0.6)                         // phố đi bộ 23–24h vẫn đông 0.6
  if (wkEnd && h >= 9 && h < 18) { pedLake = Math.max(pedLake, 0.55); pedOld *= 1.15 }   // cuối tuần ban ngày: khách dạo hồ, phố cổ
  return { moto, car, bus, pedOld, pedLake, ws, rush: rushAt(wd, h) }
}
// đèn xe bắt buộc 18:00–06:00 hoặc thời tiết xấu [30]; thêm: trời đã tối (hoàng hôn tháng 11 sớm hơn 18h)
export const headlightsOn = (h, night, rain) => h >= 18 || h < 6 || rain > 0.25 || night > 0.3

// ───────── giờ mở quán (§5.2) ─────────
export const OPEN_HOURS = [0, 3, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23, 24]
export const OPEN = {
  //         0     3     5     6     8     10    12    14    16    18    20    22    23
  pho:      [0.05, 0.06, 0.35, 0.90, 1.00, 0.70, 0.45, 0.15, 0.35, 0.85, 0.80, 0.40, 0.15],
  banhmi:   [0.08, 0.03, 0.30, 0.80, 0.90, 0.50, 0.40, 0.30, 0.40, 0.60, 0.60, 0.40, 0.25],
  xoi:      [0,    0,    0.50, 1.00, 0.80, 0.10, 0,    0,    0,    0,    0,    0,    0],
  trachanh: [0.05, 0,    0,    0,    0.05, 0.15, 0.25, 0.40, 0.60, 0.90, 1.00, 0.70, 0.35],
  caphe:    [0.03, 0,    0.10, 0.45, 0.90, 0.95, 0.90, 0.85, 0.90, 0.95, 0.95, 0.60, 0.25],
  biahoi:   [0.15, 0,    0,    0,    0,    0.30, 0.80, 0.40, 0.60, 0.95, 1.00, 0.80, 0.50],
  taphoa:   [0,    0,    0.10, 0.50, 0.90, 0.95, 0.90, 0.85, 0.90, 0.95, 0.90, 0.50, 0.15],
  kiosk:    [0,    0,    0.20, 0.70, 0.90, 0.95, 0.90, 0.90, 0.90, 0.85, 0.60, 0.10, 0],
  quanao:   [0,    0,    0,    0,    0.20, 0.90, 0.90, 0.95, 1.00, 1.00, 0.95, 0.30, 0.05],
  combinh:  [0,    0,    0,    0,    0.05, 0.50, 1.00, 0.20, 0.30, 0.40, 0.20, 0,    0],
  trada:    [0,    0,    0.05, 0.30, 0.70, 0.80, 0.80, 0.80, 0.80, 0.70, 0.60, 0.20, 0.05],
  cstore:   [1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1],   // cửa hàng tiện lợi 24/7 [21]
}
const WEEKEND_LATE = new Set(['trachanh', 'caphe', 'biahoi', 'quanao'])
export function openProb(kind, h, wd) {
  const row = OPEN[kind]; if (!row) return 1
  h = ((h % 24) + 24) % 24
  const at = (i) => i < row.length ? row[i] : row[0]                 // 23 → 24 nối về 0h
  let p = row[0]
  for (let i = 1; i < OPEN_HOURS.length; i++) if (h <= OPEN_HOURS[i]) { const t = (h - OPEN_HOURS[i - 1]) / (OPEN_HOURS[i] - OPEN_HOURS[i - 1]); p = at(i - 1) + (at(i) - at(i - 1)) * t; break }
  const wkEndNight = ((wd === 5 || wd === 6) && h >= 21) || ((wd === 6 || wd === 0) && h < 1)   // tối T6, T7 (và quá nửa đêm sang T7, CN)
  if (WEEKEND_LATE.has(kind) && wkEndNight) p = Math.min(1, p * 1.3)             // cuối tuần đóng muộn hơn ~1 giờ
  return p
}
// quán ghim (§3.3): giờ đóng < giờ mở = qua đêm
export const inHours = (h, open, close) => open === close ? true : open < close ? h >= open && h < close : h >= open || h < close
export const fmtH = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

// ───────── tỉ lệ cửa sổ nhà dân sáng (§4.5) — giờ quy về 0..30 (sau 24h cộng 24) ─────────
export function windowFrac(h, sunset, sunrise) {
  const x = h < 12 ? h + 24 : h
  const K = [[sunset - 0.2, 0], [sunset + 0.4, 0.45], [19, 0.6], [20, 0.75], [21, 0.74], [22, 0.62], [23, 0.4], [24, 0.18], [26, 0.07], [28.4, 0.03], [28.7, 0.08], [29.2, 0.15], [24 + Math.max(5.3, sunrise - 0.2), 0.15], [24 + sunrise + 0.4, 0]]
  if (x <= K[0][0]) return 0
  for (let i = 1; i < K.length; i++) if (x <= K[i][0]) { const [a, fa] = K[i - 1], [b, fb] = K[i]; return b > a ? fa + (fb - fa) * (x - a) / (b - a) : fb }
  return 0
}
export function tvShare(h) { const x = h < 12 ? h + 24 : h; return x < 19 ? 0.15 : x < 22 ? 0.35 : x < 23 ? 0.25 : x < 24 ? 0.1 : x < 26 ? 0.03 : 0 }

// ───────── màu đèn theo loại (§4.4, §5.4) ─────────
export const LIGHT_KIND = {
  sodium:   { core: '#FFC27A', halo: '#FF932C', r: 66, a: 0.62 },
  led:      { core: '#FFF4E6', halo: '#FFD1A3', r: 58, a: 0.62 },
  lakePost: { core: '#FFE0B0', halo: '#FFA957', r: 50, a: 0.66 },
  compact:  { core: '#F2F8FF', halo: '#C8DCF0', r: 34, a: 0.5 },     // bóng compact trắng nhà dân treo ra ngõ
  pho:      { core: '#E8FFF6', halo: '#BFEFFF', r: 44, a: 0.66 },    // tuýp huỳnh quang trắng xanh
  banhmi:   { core: '#FFF6DE', halo: '#FFD08A', r: 36, a: 0.62 },    // bóng tuýp ấm trên xe bánh mì
  biahoi:   { core: '#F2FFF0', halo: '#FFF1C8', r: 54, a: 0.62 },
  tea:      { core: '#FFD27A', halo: '#FFB050', r: 34, a: 0.6 },     // trà chanh: đèn dây bóng vàng
  stall:    { core: '#FFE6B8', halo: '#FFB46B', r: 40, a: 0.6 },     // sạp hàng ô dù: bóng vàng treo
  cstore:   { core: '#F7FBFF', halo: '#DDEBFF', r: 70, a: 0.9 },     // cửa hàng tiện lợi: trắng lạnh rất sáng
  clothes:  { core: '#FFE3B8', halo: '#FFB46B', r: 44, a: 0.66 },    // quần áo: vàng ấm trong cửa kính
  taphoa:   { core: '#FFF0D8', halo: '#F2C890', r: 36, a: 0.55 },
  cafe:     { core: '#FFD8A0', halo: '#FFA860', r: 40, a: 0.6 },
  lantern:  { core: '#FF6A3D', halo: '#FF3D1F', r: 20, a: 0.55 },
  shrine:   { core: '#FF8A50', halo: '#E0402A', r: 22, a: 0.6 },     // đèn thờ đỏ ở miếu ngõ
  warm:     { core: '#FFE0B0', halo: '#FFA957', r: 28, a: 0.66 },    // đèn cửa nhà
  head:     { core: '#FFF1D0', halo: '#FFE2A8' }, headLED: { core: '#F4F8FF', halo: '#D8E6FF' },
  tail:     { core: '#FF2A1A' }, brake: { core: '#FF4A30' }, busInt: { core: '#E6F4FF', halo: '#CFE6FF' },
  towerAutumn: { core: '#FFC24A', halo: '#FFB000', r: 46, a: 0.6 }, bridge: { core: '#FF5A3C', halo: '#FF2A1A', r: 12, a: 0.7 },
  barrier:  { core: '#FF5040', halo: '#FF2010', r: 26, a: 0.8 },
}
export const hexRGB = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }

// ───────── sprite ánh sáng vẽ sẵn: 4 dải + dither Bayer 4x4 ở mép dải, không gradient mỗi khung ─────────
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const CACHE = new Map()
function quant(v, x, y, bands) { const q = v * bands + BAYER[(y & 3) * 4 + (x & 3)] - 0.5; return Math.max(0, Math.min(bands, Math.floor(q + 0.5))) / bands }
function paint(w, h, fn) {
  const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h)
  const g = c.getContext('2d'), d = g.createImageData(c.width, c.height), a = d.data
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const px = fn(x, y); if (!px) continue; const i = (y * c.width + x) * 4; a[i] = px[0]; a[i + 1] = px[1]; a[i + 2] = px[2]; a[i + 3] = px[3] }
  g.putImageData(d, 0, 0); return c
}
const mixRGB = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]
// vũng sáng trên mặt đất: elip dẹt 2:1 (rộng 2r, cao r); flat=false → quầng tròn quanh bóng đèn
export function lightSprite(core, halo, r, flat = true, bands = 4) {
  r = Math.max(3, Math.round(r))
  const key = `${core}|${halo}|${r}|${flat}|${bands}`; let c = CACHE.get(key); if (c) return c
  const C = hexRGB(core), H = hexRGB(halo), rx = r, ry = flat ? Math.max(2, Math.round(r / 2)) : r
  c = paint(rx * 2 + 1, ry * 2 + 1, (x, y) => {
    const dx = (x - rx) / rx, dy = (y - ry) / ry, d = Math.sqrt(dx * dx + dy * dy); if (d >= 1) return null
    const v = Math.pow(1 - d, flat ? 0.95 : 1.6), q = quant(v, x, y, bands); if (q <= 0) return null
    const col = mixRGB(H, C, Math.min(1, q * 1.15)); return [col[0], col[1], col[2], Math.round(255 * q)]
  })
  c.ox = rx; c.oy = ry; CACHE.set(key, c); return c
}
// vũng đèn đường gộp sẵn: lõi (alpha a) + tán rộng nhạt (×hs bán kính, alpha ha) trong MỘT sprite → 1 lệnh vẽ / cột đèn
export function poolSprite(core, halo, r, a, hs = 1.5, ha = 0.16) {
  const key = `pool|${core}|${r}|${a}|${hs}|${ha}`; let c = CACHE.get(key); if (c) return c
  const A = lightSprite(core, halo, r, true), B = lightSprite(core, halo, Math.round(r * hs), true)
  c = document.createElement('canvas'); c.width = B.width; c.height = B.height; const g = c.getContext('2d')
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = ha; g.drawImage(B, 0, 0); g.globalAlpha = Math.min(1, a); g.drawImage(A, B.ox - A.ox, B.oy - A.oy)
  c.ox = B.ox; c.oy = B.oy; CACHE.set(key, c); return c
}
// quầng bóng đèn gộp sẵn: tán tròn r2 (alpha a2) + lõi sáng r1 (alpha a1) → 1 lệnh vẽ
export function bulbSprite(core, halo, r1, a1, r2, a2) {
  const key = `bulb|${core}|${r1}|${a1}|${r2}|${a2}`; let c = CACHE.get(key); if (c) return c
  const A = lightSprite(core, halo, r1, false), B = lightSprite(core, halo, r2, false)
  c = document.createElement('canvas'); c.width = B.width; c.height = B.height; const g = c.getContext('2d')
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = a2; g.drawImage(B, 0, 0); g.globalAlpha = a1; g.drawImage(A, B.ox - A.ox, B.oy - A.oy)
  c.ox = B.ox; c.oy = B.oy; CACHE.set(key, c); return c
}
// quạt đèn pha (đèn cốt) chiếu xuống mặt đường theo trục làn: dir 'px','nx','py','ny'; len, half-angle theo ô; lat = lệch ngang (ô)
// Toạ độ màn hình iso 2:1: sx = (wx-wy)*36, sy = (wx+wy)*18. Gốc quạt (ox,oy) = mũi xe trên mặt đất.
export function fanSprite(dir, len, deg, lat, core, halo, wet = false) {
  const key = `fan|${dir}|${len}|${deg}|${lat}|${core}|${wet}`; let c = CACHE.get(key); if (c) return c
  const C = hexRGB(core), H = hexRGB(halo), tanA = Math.tan(deg * Math.PI / 360), L = len + (wet ? 1 : 0)
  const F = { px: [1, 0], nx: [-1, 0], py: [0, 1], ny: [0, -1] }[dir], S = [-F[1], F[0]]
  const pts = []; for (const [f, l] of [[0, -0.2], [0, 0.2], [L, -L * tanA - 0.3], [L, L * tanA + 0.3]]) { const wx = F[0] * f + S[0] * (l + lat), wy = F[1] * f + S[1] * (l + lat); pts.push([(wx - wy) * 36, (wx + wy) * 18]) }
  const x0 = Math.floor(Math.min(...pts.map((p) => p[0]))) - 1, x1 = Math.ceil(Math.max(...pts.map((p) => p[0]))) + 1
  const y0 = Math.floor(Math.min(...pts.map((p) => p[1]))) - 1, y1 = Math.ceil(Math.max(...pts.map((p) => p[1]))) + 1
  const peak = 0.3 * L
  c = paint(x1 - x0 + 1, y1 - y0 + 1, (x, y) => {
    const sx = x + x0 + 0.5, sy = y + y0 + 0.5, wx = (sx / 36 + sy / 18) / 2, wy = (sy / 18 - sx / 36) / 2
    const f = wx * F[0] + wy * F[1], l = wx * S[0] + wy * S[1] - lat
    if (f < 0.05 || f > L) return null
    const edge = f * tanA + 0.2; if (Math.abs(l) > edge) return null
    const along = f < peak ? 0.5 + 0.5 * f / peak : Math.pow(1 - (f - peak) / (L - peak), 1.15)
    const side = 1 - Math.pow(Math.abs(l) / edge, 2.2) * 0.75
    const q = quant(Math.max(0, along * side), x, y, 3); if (q <= 0) return null
    const col = mixRGB(H, C, q); return [col[0], col[1], col[2], Math.round(255 * q)]
  })
  c.ox = -x0; c.oy = -y0; CACHE.set(key, c); return c
}
// vệt phản chiếu dọc trên mặt nước (đèn sát hồ)
export function streakSprite(core, halo, w, h) {
  const key = `streak|${core}|${w}|${h}`; let c = CACHE.get(key); if (c) return c
  const C = hexRGB(core), H = hexRGB(halo)
  c = paint(w, h, (x, y) => {
    const t = y / h, u = Math.abs(x - (w - 1) / 2) / (w / 2); if (u > 1) return null
    const v = (1 - t) * (1 - u * u) * ((y & 1) ? 0.55 : 1); const q = quant(v, x, y, 3); if (q <= 0) return null
    const col = mixRGB(H, C, q); return [col[0], col[1], col[2], Math.round(255 * q)]
  })
  c.ox = Math.floor(w / 2); c.oy = 0; CACHE.set(key, c); return c
}
export const spriteCacheSize = () => CACHE.size

// window.__worldAPI — giao diện của khối world cho gameplay / ui / audio / QA (xem src/core/CONTRACT.md).
// Tìm đường: easystarjs 0.4.4 (MIT, chép vào ./vendor). Lưới theo ô, dùng đúng luật va chạm của người chơi (bán kính 0.22).
import EasyStar from './vendor/easystar-0.4.4.js'
import { bus } from '../core/bus.js'
import { World } from './world.js'
import { Game } from './player.js'

const BR = 0.27                                   // bán kính thân khi dò lưới đường đi: lớn hơn người chơi (0.22) một chút để dư chỗ, không kẹt cột nhỏ
const Q = 4, CS = 1 / Q                           // lưới 1/4 ô (0.25): mịn hơn thân người (0.46) nên đường đi không chui qua cột/cây mảnh; ngõ 1 ô vẫn đi được
const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
let N = 0, M = 0, ok = null, reach = null, es = null, spawnCell = [0, 0], free = null, grid = null
const TC = [1, 5, 3, 2, 14]                      // chi phí theo loại ô: 0 vỉa hè/vạch/ngõ, 1 lòng đường, 2 sỏi, 3 cỏ, 4 đường ray (tránh, ưu tiên đường chắn)
const dayNow = () => World.cal.day                 // 4B: ngày nằm trong World (world cần thứ mỗi khung hình); ngày 1 = Thứ Sáu
const markers = new Set()
let gps = null, gpsToken = 0

// ───────── lưới đi bộ ─────────
function buildGrid() {
  N = World.N; M = N * Q
  const hash = new Map()                                          // colliders theo ô để tra nhanh
  for (const c of World.colliders) { const k = Math.floor(c.y) * 1000 + Math.floor(c.x); let b = hash.get(k); if (!b) hash.set(k, b = []); b.push(c) }
  // điểm (x,y) có đứng được không: 4 góc thân không rơi vào ô bị chặn tĩnh, và không đè collider (thanh chắn tàu coi như mở)
  free = (x, y) => {
    for (const [dx, dy] of [[-BR, -BR], [BR, -BR], [-BR, BR], [BR, BR]]) if (World.staticBlocked(Math.floor(x + dx), Math.floor(y + dy))) return false
    const tx = Math.floor(x), ty = Math.floor(y)
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const b = hash.get((ty + j) * 1000 + tx + i); if (b) for (const c of b) if (Math.hypot(x - c.x, y - c.y) < BR + c.r) return false }
    return true
  }
  ok = Array.from({ length: M }, (_, cy) => Array.from({ length: M }, (_, cx) => free((cx + 0.5) * CS, (cy + 0.5) * CS)))
  // 0 = vỉa hè / vạch sang đường / ngõ (rẻ nhất); đường xe, đường ray, cỏ đắt hơn nên GPS ưu tiên vỉa hè và vạch kẻ
  const cost = { road: 1, dash_x: 1, dash_y: 1, railroad: 1, rail: 4, gravel: 2, grass: 3 }
  grid = ok.map((row, cy) => row.map((v, cx) => v ? (cost[World.kind[Math.floor(cy * CS)][Math.floor(cx * CS)]] || 0) : 9))
  es = new EasyStar.js()
  es.setGrid(grid); es.setAcceptableTiles([0, 1, 2, 3, 4]); es.enableDiagonals(); es.disableCornerCutting()
  es.setTileCost(1, 5); es.setTileCost(2, 3); es.setTileCost(3, 2); es.setTileCost(4, 14); es.setIterationsPerCalculation(100000)
  // thành phần liên thông chứa điểm xuất phát
  spawnCell = nearestOk(56.5, 34.5, false)
  reach = Array.from({ length: M }, () => new Uint8Array(M))
  const q = [spawnCell]; reach[spawnCell[1]][spawnCell[0]] = 1
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i]
    for (const [dx, dy] of D8) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= M || ny >= M || reach[ny][nx] || !ok[ny][nx]) continue
      if (dx && dy && (!ok[y][nx] || !ok[ny][x])) continue                  // không cắt góc
      reach[ny][nx] = 1; q.push([nx, ny])
    }
  }
}
// ô lưới (1/4 ô) đi được gần điểm (gx,gy) nhất (và nối với khu vực chính nếu needReach; extra(x,y) = điều kiện thêm theo ô lưới)
function nearestOk(gx, gy, needReach = true, extra = null) {
  const cx = Math.floor(gx * Q), cy = Math.floor(gy * Q)
  let best = null, bd = 1e9
  for (let r = 0; r <= 14 * Q; r++) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || x < 0 || y < 0 || x >= M || y >= M || !ok[y][x]) continue
      if (needReach && reach && !reach[y][x]) continue
      if (extra && !extra(x, y)) continue
      const d = Math.hypot((x + 0.5) * CS - gx, (y + 0.5) * CS - gy); if (d < bd) { bd = d; best = [x, y] }
    }
    if (best && bd <= r * CS) break                                           // các vòng xa hơn không thể gần hơn
  }
  return best || [Math.max(0, Math.min(M - 1, cx)), Math.max(0, Math.min(M - 1, cy))]
}
const centerOf = ([x, y]) => ({ gx: (x + 0.5) * CS, gy: (y + 0.5) * CS })

// ───────── tìm đường ─────────
function pathTo(gx, gy) {
  if (!es || !Number.isFinite(gx) || !Number.isFinite(gy)) return Promise.resolve(null)
  const p = Game.state.player
  const s = nearestOk(p.gx, p.gy), e = nearestOk(gx, gy)
  if (s[0] === e[0] && s[1] === e[1]) return Promise.resolve([centerOf(e)])
  return new Promise((resolve) => {
    let done = false
    es.findPath(s[0], s[1], e[0], e[1], (path) => { done = true; resolve(path ? path.map((n) => centerOf([n.x, n.y])) : null) })
    const tick = () => { if (done) return; es.calculate(); if (!done) setTimeout(tick, 0) }
    tick()
  })
}

// ───────── sites ─────────
let siteList = []
// Vật nhỏ (sạp, ghế, cây...) nay đi xuyên được, nên chỗ ĐỨNG của mỗi site chọn ô lưới không nằm trong thân vật nhỏ nào (đứng cạnh sạp, không đứng lọt trong xe phở).
function standOf(s) {
  const soft = World.softProps || []
  const near = soft.filter((c) => Math.abs(c.x - s.gx) < 4 && Math.abs(c.y - s.gy) < 4)
  const clear = (x, y) => { const px = (x + 0.5) * CS, py = (y + 0.5) * CS; return near.every((c) => Math.hypot(px - c.x, py - c.y) >= c.r + 0.2) }
  const away = (x, y) => clear(x, y) && Math.hypot((x + 0.5) * CS - s.gx, (y + 0.5) * CS - s.gy) >= 0.45
  return centerOf(s.kind === 'home' ? nearestOk(s.gx, s.gy) : nearestOk(s.gx, s.gy, true, away))
}
function buildSites() { siteList = World.sites.map((s) => ({ ...s, standAt: standOf(s) })) }
// Giờ mở cửa thật (4B, docs/STREET_LIFE.md §3/§5.2): theo loại quán + giờ + thứ, mỗi quán một "tính cách" cố định (không nhấp nháy);
// 4 quán ghim (Phở đêm 18–3h, Phở gánh 3–10h, Bánh mì khuya 20–4h, cửa hàng tiện lợi 24h) → giờ nào cũng ≥2 chỗ ăn. id không tồn tại → false.
const siteOpenAt = (s, h = World.sky.hour, wd) => World.siteOpenAt(s, h, wd)
function isSiteOpen(id) { return siteOpenAt(siteList.find((s) => s.id === id)) }
const pub = (s, h) => { const { front, seed, pin, ped, ...o } = s; return { ...o, standAt: { ...s.standAt }, open: siteOpenAt(s, h) } }
function getSites(kind = 'any') {
  const h = World.sky.hour
  return siteList.filter((s) => kind === 'any' || s.kind === kind).map((s) => pub(s, h))
}
// kiểm 48 mốc nửa giờ × (ngày thường, T7, CN): đếm chỗ ăn no (phở + bánh mì) đang mở VÀ đi tới được
let openSweep = null
function sweepOpen() {
  const food = siteList.filter((s) => s.kind === 'pho' || s.kind === 'banhmi'), rows = []
  let min = 99, minAt = null
  for (const wd of [1, 5, 6, 0]) for (let h = 0; h < 24; h += 0.5) {
    const n = food.filter((s) => siteOpenAt(s, h, wd) && api.isReachable(s.standAt.gx, s.standAt.gy)).length
    rows.push([wd, h, n]); if (n < min) { min = n; minAt = { wd, h } }
  }
  openSweep = { ok: min >= 2, min, minAt, pinned: World.PINS.map((s) => ({ id: s.id, pin: s.pinned, hours: s.hours, label: s.label })), byHour: rows.filter((r) => r[0] === 1).map((r) => r[2]) }
  if (!openSweep.ok) console.warn('[world] giờ mở quán: có mốc chỉ còn', min, 'chỗ ăn mở', minAt)
  return openSweep
}
// cộng giờ game; mỗi lần qua 0h tăng ngày và phát time:newday (giờ đã là giờ mới khi sự kiện phát)
function advanceTime(h) {
  if (!Number.isFinite(h) || h <= 0) return { hour: World.sky.hour, day: dayNow() }
  const t = World.sky.hour + h, days = Math.floor(t / 24)
  World.sky.hour = t - days * 24
  for (let i = 0; i < days; i++) World.hooks.newday && World.hooks.newday()
  return { hour: World.sky.hour, day: dayNow() }
}

// ───────── marker ─────────
function addMarker(m) {
  if (!m || !Number.isFinite(m.gx) || !Number.isFinite(m.gy)) throw new Error('addMarker cần gx, gy')
  if (m.id !== undefined) for (const o of [...markers]) if (o.id === m.id) removeMarker(o)       // cùng id thì thay mới
  const poi = Game.registerPOI({ id: m.id, gx: m.gx, gy: m.gy, r: m.r ?? 1.6, label: m.label || '', marker: true, onInteract: () => { if (m.onInteract) m.onInteract(poi); else Game.toast(poi.label) } })
  markers.add(poi)
  return () => removeMarker(poi)
}
function removeMarker(poi) { if (!markers.delete(poi)) return; Game.unregisterPOI(poi) }

// ───────── GPS: vòng la bàn ánh sáng dưới chân nhân vật ─────────
const M_PER_TILE = 2                                                        // 1 ô = 2 m (cho dễ hiểu)
function resolveTarget(target) {
  if (typeof target === 'string') target = siteList.find((s) => s.id === target) || [...markers].find((m) => m.id === target)
  if (!target || !Number.isFinite(target.gx) || !Number.isFinite(target.gy)) return null
  return target
}
function setGps(target) {
  if (target == null) { gps = null; return }
  target = resolveTarget(target)
  if (!target) { gps = null; return }
  const goal = target.standAt ? { ...target.standAt } : centerOf(nearestOk(target.gx, target.gy))
  gps = { target, goal }
}
function gpsTick() {
  if (!gps) return
  const p = Game.state.player, t = gps.target
  if (Math.hypot(p.gx - gps.goal.gx, p.gy - gps.goal.gy) < 0.9 || Math.hypot(p.gx - t.gx, p.gy - t.gy) < Math.max(1.3, t.r || 0)) {
    const tg = gps.target; gps = null
    bus.emit('gps:arrived', { target: tg })
  }
}
// hướng trên MÀN HÌNH isometric từ người chơi tới đích: góc độ (0 = sang phải, tăng theo chiều kim đồng hồ, trục y hướng xuống)
function gpsInfo() {
  if (!gps) return null
  const p = Game.state.player, dx = gps.target.gx - p.gx, dy = gps.target.gy - p.gy
  const sx = (dx - dy) * 36, sy = (dx + dy) * 18
  return { target: gps.target, distM: Math.round(Math.hypot(dx, dy) * M_PER_TILE), angle: Math.round(Math.atan2(sy, sx) * 1800 / Math.PI) / 10 }
}

// vẽ: vòng sáng ở đích + vòng la bàn dưới chân (lớp cuối, không bị bộ lọc ngày/đêm làm tối)
function ring(ctx, X, Y, r, rgb, a, lw = 1.5) {
  const rx = r * 50.9, ry = r * 25.5
  ctx.lineWidth = lw + 1.5; ctx.strokeStyle = `rgba(40,18,0,${a * 0.85})`; ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 6.283); ctx.stroke()
  ctx.lineWidth = lw; ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 6.283); ctx.stroke()
}
// Vòng la bàn GỌN (đợt 4): elip điểm ảnh mảnh cỡ bóng chân (rộng ~17 px thế giới ≈ 1,4 lần thân 12 px), vẽ sắc từng điểm ảnh,
// phần vòng trùng thân nhân vật bị khoét để trông như nằm DƯỚI chân; mũi tên nhỏ ở mép vòng; chữ mét là nhãn DOM nhỏ cỡ cố định.
const CRX = 8, CRY = 4, CPAD = 7                                             // bán trục elip (px thế giới) và lề cho mũi tên
const GOLD = '#ffd84a', GOLD_HI = '#fff3b0', INK = 'rgba(42,22,0,0.78)'
let ringCv = null, scratchCv = null, distEl = null
function pixelSet(fillFn, w, h, dark) {                                       // tô các điểm ảnh lõi + viền tối 1px quanh lõi
  const core = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fillFn(x, y)) core[y * w + x] = 1
  const out = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (core[y * w + x]) { out.push([x, y, 1]); continue }
    if (!dark) continue
    let nb = false; for (let j = -1; j <= 1 && !nb; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < w && Y < h && core[Y * w + X] && (i === 0 || j === 0)) { nb = true; break } }
    if (nb) out.push([x, y, 0])
  }
  return out
}
function ringCanvas() {
  if (ringCv) return ringCv
  const w = CRX * 2 + 3, h = CRY * 2 + 3, cx = w / 2, cy = h / 2
  ringCv = document.createElement('canvas'); ringCv.width = w; ringCv.height = h
  const x = ringCv.getContext('2d'), on = new Set()
  for (let i = 0; i < 360; i++) { const a = i * Math.PI / 180; on.add(Math.floor(cx + Math.cos(a) * CRX) + ',' + Math.floor(cy + Math.sin(a) * CRY)) }
  for (const [X, Y, c] of pixelSet((X, Y) => on.has(X + ',' + Y), w, h, true)) { x.fillStyle = c ? (Y > cy ? GOLD_HI : GOLD) : INK; x.fillRect(X, Y, 1, 1) }
  return ringCv
}
function compass(ctx, X, Y, dx, dy, T, distM, pd, ox, oy) {
  const ring0 = ringCanvas(), S = CRX * 2 + CPAD * 2 + 3, H = CRY * 2 + CPAD * 2 + 3
  if (!scratchCv) { scratchCv = document.createElement('canvas'); scratchCv.width = S; scratchCv.height = H }
  const sx = scratchCv.getContext('2d'), x0 = X - Math.floor(S / 2), y0 = Y - Math.floor(H / 2)
  sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, S, H)
  sx.drawImage(ring0, Math.floor(S / 2) - Math.floor(ring0.width / 2), Math.floor(H / 2) - Math.floor(ring0.height / 2))
  if (pd && pd.c) { sx.globalCompositeOperation = 'destination-out'; sx.drawImage(pd.c, pd.dx + ox - x0, pd.dy + oy - y0) }   // khoét phần vòng nằm sau thân/chân
  sx.globalCompositeOperation = 'source-over'
  ctx.drawImage(scratchCv, x0, y0)
  // mũi tên: tam giác nhỏ ở mép vòng theo hướng mục tiêu trên mặt đất (đập ra 0/1 px)
  const L = Math.hypot(dx, dy) || 1, c = dx / L, s = dy / L
  let vx = (c - s) * 36, vy = (c + s) * 18; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl
  const k = Math.hypot((c - s) * 36 / CRX, (c + s) * 18 / CRY) || 1, ex = (c - s) * 36 / k, ey = (c + s) * 18 / k    // điểm trên mép elip
  const pu = Math.sin(T * 5) > 0.2 ? 1 : 0, bx = X + 0.5 + ex + vx * (0.8 + pu), by = Y + 0.5 + ey + vy * (0.8 + pu)
  const tip = [bx + vx * 5, by + vy * 5], a = [bx - vy * 3, by + vx * 3], b = [bx + vy * 3, by - vx * 3]
  const ins = (px, py) => { const d = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]); const P = [px, py], d1 = d(P, tip, a), d2 = d(P, a, b), d3 = d(P, b, tip); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) }
  const L0 = Math.floor(Math.min(tip[0], a[0], b[0])) - 1, T0 = Math.floor(Math.min(tip[1], a[1], b[1])) - 1, W = Math.ceil(Math.max(tip[0], a[0], b[0])) - L0 + 2, Hh = Math.ceil(Math.max(tip[1], a[1], b[1])) - T0 + 2
  let bottom = Y + CRY + 1
  for (const [px, py, cc] of pixelSet((px, py) => ins(L0 + px + 0.5, T0 + py + 0.5), W, Hh, true)) { ctx.fillStyle = cc ? GOLD : INK; ctx.fillRect(L0 + px, T0 + py, 1, 1); bottom = Math.max(bottom, T0 + py) }
  return { below: bottom - Y + 1 }                                             // khoảng từ chân tới mép dưới vòng/mũi tên (px thế giới) để đặt nhãn mét
}
function distLabel(show, txt, gx, gy, below) {
  if (!distEl) {
    distEl = document.createElement('div'); distEl.id = 'gps-dist'
    distEl.style.cssText = 'position:fixed;left:0;top:0;z-index:4;pointer-events:none;display:none;font:bold 11px/13px ui-monospace,Consolas,monospace;color:#fff3b0;background:rgba(30,14,0,.74);border:1px solid rgba(255,216,74,.55);border-radius:3px;padding:0 4px;white-space:nowrap;letter-spacing:.2px'
    document.body.appendChild(distEl)
  }
  if (!show) { if (distEl.style.display !== 'none') distEl.style.display = 'none'; return }
  if (distEl.textContent !== txt) distEl.textContent = txt
  const p = worldToScreen(gx, gy), z = World.cam.zoom, X = Math.round(p.x), Yp = Math.round(p.y + below * z + 2)
  const tf = `translate(${X}px,${Yp}px) translateX(-50%)`
  if (distEl.style.transform !== tf) distEl.style.transform = tf
  if (distEl.style.display !== '') distEl.style.display = ''
}
function overlay(ctx, ox, oy, w, h, T) {
  const proj = World.proj, P = Game.state.player
  const scr = (gx, gy) => { const [x, y] = proj(gx, gy); return [x + ox, y - World.groundZ(gx, gy) + oy] }
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
  for (const m of markers) {                                                  // vòng nhỏ quanh điểm việc vặt
    const [X, Y] = scr(m.gx, m.gy); if (X < -80 || X > w + 80 || Y < -60 || Y > h + 60) continue
    ring(ctx, X, Y, 0.38 + 0.08 * (0.5 + 0.5 * Math.sin(T * 3 + m.gx)), '120,230,255', 0.85)
  }
  if (gps) {
    const pu = 0.5 + 0.5 * Math.sin(T * 4)
    const [X, Y] = scr(gps.target.gx, gps.target.gy)                          // vòng sáng + cột sáng ở đích
    if (X > -120 && X < w + 120 && Y > -120 && Y < h + 120) {
      const g = ctx.createLinearGradient(0, Y - 70, 0, Y); g.addColorStop(0, 'rgba(255,225,90,0)'); g.addColorStop(1, 'rgba(255,225,90,0.5)')
      ctx.fillStyle = g; ctx.fillRect(Math.round(X) - 5, Y - 70, 10, 70)
      ring(ctx, X, Y, 0.62 + 0.28 * pu, '255,225,90', 0.95); ring(ctx, X, Y, 0.34, '255,248,200', 0.8)
    }
    const info = gpsInfo()
    if (info) {
      const [PX, PY] = scr(P.gx, P.gy), pl = []; Game.pushDrawable(pl)
      const pd = pl[0] && { c: pl[0].c, dx: Math.round(World.proj(pl[0].gx, pl[0].gy)[0] - pl[0].ox), dy: Math.round(World.proj(pl[0].gx, pl[0].gy)[1] - pl[0].oy) }
      const cp = compass(ctx, Math.round(PX), Math.round(PY), gps.target.gx - P.gx, gps.target.gy - P.gy, T, info.distM, pd, ox, oy)
      const txt = info.distM >= 1000 ? (info.distM / 1000).toFixed(1).replace('.', ',') + ' km' : info.distM + ' m'
      distLabel(Game.mode === 'play', txt, P.gx, P.gy, cp.below)
    } else distLabel(false)
  } else distLabel(false)
  ctx.restore()
}

// ───────── Auto-Walk: easystar + vuốt thẳng đường, nhân vật đi như đang bấm phím ─────────
let aw = null, awToken = 0
function smoothPath(raw) {
  const p = Game.state.player, pts = [{ gx: p.gx, gy: p.gy }, ...raw]
  const cs = (x, y) => TC[grid[Math.max(0, Math.min(M - 1, Math.floor(y * Q)))][Math.max(0, Math.min(M - 1, Math.floor(x * Q)))]]
  const out = [pts[0]]; let i = 0
  while (i < pts.length - 1) {
    let best = i + 1
    for (let j = Math.min(pts.length - 1, i + 30); j > i + 1; j--) {
      let mc = 0; for (let k = i; k <= j; k++) mc = Math.max(mc, cs(pts[k].gx, pts[k].gy))
      const a = pts[i], b = pts[j], L = Math.hypot(b.gx - a.gx, b.gy - a.gy), n = Math.ceil(L / 0.1); let good = L <= 8.5   // QA: đoạn dài hơn 9 ô làm player.js tưởng "lạc đường" (d > 9 -> stuck) và Auto-Walk bị huỷ
      for (let k = 1; k < n && good; k++) { const t = k / n, x = a.gx + (b.gx - a.gx) * t, y = a.gy + (b.gy - a.gy) * t; if (!free(x, y) || cs(x, y) > mc) good = false }
      if (good) { best = j; break }
    }
    out.push(pts[best]); i = best
  }
  return out.slice(1)
}
const crossingWait = () => { const p = Game.state.player; return Math.abs(p.gy - World.RAIL_Y) < 4 && World.crossings.some((c) => c.down) }
function finishAw(reason, tok) {
  if (!aw || aw.tok !== tok) return
  const a = aw; aw = null
  const res = reason === 'arrived' ? 'arrived' : reason === 'nopath' ? 'nopath' : 'cancelled'
  bus.emit('autowalk:stop', { reason: reason === 'arrived' || reason === 'manual' || reason === 'nopath' ? reason : 'cancelled', target: a.target })
  a.resolve(res)
}
function autoWalk(target, opts = {}) {
  return new Promise((resolve) => {
    if (aw) { const old = aw; aw = null; Game.stopAuto('cancelled'); bus.emit('autowalk:stop', { reason: 'cancelled', target: old.target }); old.resolve('cancelled') }
    const t = resolveTarget(target)
    if (!t || Game.locked || !es) { resolve('cancelled'); return }
    const tok = ++awToken
    const goal = t.standAt ? { ...t.standAt } : centerOf(nearestOk(t.gx, t.gy))
    aw = { tok, target: t, goal, resolve, retries: 0 }
    bus.emit('autowalk:start', { target: t })
    const go = () => {
      if (!aw || aw.tok !== tok) return
      pathTo(goal.gx, goal.gy).then((path) => {
        if (!aw || aw.tok !== tok) return
        if (!path) { finishAw('nopath', tok); return }
        const sm = smoothPath(path)
        if (!sm.length) { finishAw('arrived', tok); return }
        aw.path = sm
        const ok = Game.startAuto(sm, (reason) => {
          if (reason === 'stuck' && aw && aw.tok === tok && aw.retries < 3) { aw.retries++; go(); return }
          finishAw(reason, tok)
        }, crossingWait)
        if (!ok) finishAw('cancelled', tok)
      })
    }
    go()
  })
}
function stopAutoWalk() { if (!aw) return false; const tok = aw.tok; Game.stopAuto('cancelled'); finishAw('cancelled', tok); return true }

// ───────── API đọc cho UI / audio ─────────
const lp = (a) => Math.round(a * 100) / 100
function getNpcs() {
  const P = Game.state.player, out = []
  for (let i = 0; i < World.NPC.length; i++) { const n = World.NPC[i]; if (n.off) continue; const d = Math.hypot(n.gx - P.gx, n.gy - P.gy); if (d < 24) out.push({ d, o: { id: 'npc' + i, gx: lp(n.gx), gy: lp(n.gy), dir: n.dir, kind: 'ped', look: n.v } }) }
  for (const a of World.actLive) { const d = Math.hypot(a.gx - P.gx, a.gy - P.gy); if (d < 24) out.push({ d, o: { id: a.id, gx: lp(a.gx), gy: lp(a.gy), dir: a.dir, kind: a.kind, look: a.look, pose: a.pose } }) }   // 4B: người tập, cụ ông, khách quán, cặp đôi
  return out.sort((a, b) => a.d - b.d).slice(0, 60).map((e) => e.o)
}
const vehIds = new WeakMap(); let vehSeq = 0
function getVehicles() {
  const out = []
  for (const L of World.LANES) for (const v of L.vs) {
    if (!v.on) continue
    if (!vehIds.has(v)) vehIds.set(v, ++vehSeq)
    const gx = L.axis === 'x' ? v.pos : L.c + v.lat, gy = L.axis === 'x' ? L.c + v.lat : v.pos
    if (gx < -2 || gy < -2 || gx > N + 2 || gy > N + 2) continue
    out.push({ id: 'v' + vehIds.get(v), kind: v.type, gx: lp(gx), gy: lp(gy), dir: (L.axis === 'x' ? (L.dir > 0 ? 'px' : 'nx') : (L.dir > 0 ? 'py' : 'ny')) })
  }
  return out
}
function getTrain() {
  const t = World.train, len = 118 / 36, active = t.state === 'run'
  return { active, gx: lp(t.dir > 0 ? t.head - len / 2 : t.head + len / 2), gy: World.RAIL_Y + 0.5 }
}
function getBarrier() {
  const p = Game.state.player; let best = null, bd = 1e9
  for (const c of World.crossings) { const d = Math.abs(p.gx - (c.x0 + 1.5)); if (d < bd) { bd = d; best = c } }
  return best ? { gx: best.x0 + 1.5, gy: World.RAIL_Y + 0.5, down: !!best.down } : null
}
function getZoneAt(gx, gy) {
  const tx = Math.floor(gx), ty = Math.floor(gy), k = World.kind[ty] && World.kind[ty][tx]
  if (k === 'alley') return 'alley'
  if (ty >= World.RAILC[0] && ty <= World.RAILC[1]) return 'rail'
  const L = World.LAKE; if (tx >= L.x0 - 1 && tx <= L.x1 + 1 && ty >= L.y0 - 1 && ty <= L.y1 + 1) return 'lake'
  for (const s of siteList) if (s.kind === 'pho' && Math.hypot(s.gx - gx, s.gy - gy) < 3.5) return 'pho'
  return 'street'
}
function getZoom() { return World.cam.zoomTarget ?? Math.round(World.cam.zoom) }   // nấc nguyên (bong bóng dùng để quyết định hiện chữ, không nhấp nháy)
function getZoomLive() { return World.cam.zoom }                                    // số thực đang trôi
function setZoom(z) { return World.setZoomTarget(z, null) }                        // trôi mượt tới nấc mới, giữ tâm màn hình
function worldToScreen(gx, gy) {                                             // toạ độ CSS px (chân ô) đã tính camera + zoom
  const v = Game.state.view, [x, y] = World.proj(gx, gy), cw = innerWidth, ch = innerHeight
  if (!v) return { x: cw / 2, y: ch / 2 }
  return { x: (x + v.ox) * cw / v.w, y: (y - World.groundZ(gx, gy) + v.oy) * ch / v.h }
}
const getViewport = () => ({ w: innerWidth, h: innerHeight })

// sự kiện suýt va chạm: traffic:cut (xe/tàu tạt đầu) và npc:pass (hai người đi lướt nhau), mỗi loại tối đa 1 lần / 3 giây
let cutAt = -9, passAt = -9, evT = 0, passAcc = 0
function eventsTick(dt) {
  evT += dt; passAcc += dt
  const p = Game.state.player
  if (evT - cutAt > 3) {
    let hit = null
    for (const L of World.LANES) for (const v of L.vs) {
      if (!v.on || v.v < 1.2) continue
      const gx = L.axis === 'x' ? v.pos : L.c + v.lat, gy = L.axis === 'x' ? L.c + v.lat : v.pos
      const ahead = ((L.axis === 'x' ? p.gx - gx : p.gy - gy) * L.dir)              // người nằm phía trước đầu xe
      const lat = Math.abs(L.axis === 'x' ? p.gy - gy : p.gx - gx)
      if (ahead > 0.2 && ahead < 1.6 + v.len / 2 && lat < 0.9) { hit = v.type; break }
    }
    const t = World.train
    if (!hit && t.state === 'run' && Math.abs(p.gy - World.RAIL_Y) < 2.4) { const hx = t.head, tail = t.dir > 0 ? t.head - t.len : t.head + t.len; if (p.gx > Math.min(hx, tail) - 3.5 && p.gx < Math.max(hx, tail) + 3.5) hit = 'train' }
    if (hit) { cutAt = evT; bus.emit('traffic:cut', { kind: hit }) }
  }
  if (passAcc > 0.25) {
    passAcc = 0
    if (evT - passAt > 3) {
      const N2 = World.NPC; let found = null
      const near = []; for (let i = 0; i < N2.length; i++) if (!N2[i].off && N2[i].moving && Math.hypot(N2[i].gx - p.gx, N2[i].gy - p.gy) < 14) near.push(i)
      for (let u = 0; u < near.length && !found; u++) for (let v = u + 1; v < near.length; v++) {
        const a = N2[near[u]], b = N2[near[v]]
        if (Math.hypot(a.gx - b.gx, a.gy - b.gy) < 1.0 && a.dir !== b.dir) { found = ['npc' + near[u], 'npc' + near[v]]; break }
      }
      if (found) { passAt = evT; bus.emit('npc:pass', { a: found[0], b: found[1] }) }
    }
  }
}

// ───────── sự kiện thế giới ─────────
let lastWx = null, lastBell = null
function worldTick(dt) {
  const wx = World.sky.weather, rain = wx === 'rain' || wx === 'storm', storm = wx === 'storm'
  if (!lastWx || lastWx.rain !== rain || lastWx.storm !== storm) { lastWx = { rain, storm }; bus.emit('weather', { rain, storm }) }
  const bell = World.crossings.some((c) => c.down)
  if (lastBell !== bell) { const first = lastBell === null; lastBell = bell; if (!first || bell) bus.emit('train:bell', { on: bell }) }
  gpsTick(dt); eventsTick(dt)
}

// ───────── API ─────────
const hourNow = () => World.sky.hour
const api = {
  getPlayer: () => ({ gx: Game.state.player.gx, gy: Game.state.player.gy }),
  getSites, pathTo, setGps, addMarker,
  getGpsInfo: gpsInfo, autoWalk, stopAutoWalk, isAutoWalking: () => !!aw,
  getZoom, getZoomLive, setZoom, worldToScreen, advanceTime, isSiteOpen,
  getHome: () => { const s = siteList.find((q) => q.id === 'home'); return s ? { ...s, standAt: { ...s.standAt } } : null }, getViewport, getNpcs, getVehicles, getTrain, getBarrier, getZoneAt,
  lockPlayer: (b) => Game.setLocked(!!b),
  teleport(gx, gy) {
    if (gx && typeof gx === 'object') { gy = gx.gy; gx = gx.gx }
    if (!Game.walkableAt(gx, gy)) { const c = centerOf(nearestOk(gx, gy)); gx = c.gx; gy = c.gy }
    Game.teleport(gx, gy)
  },
  getHour: hourNow,
  getDay: () => dayNow(),
  setDay(n) { if (Number.isFinite(n) && n >= 1) World.setDay(Math.floor(n)) },
  getWeekday: () => World.cal.wd,                                            // 0 = Chủ nhật … 6 = Thứ Bảy (ngày 1 = Thứ Sáu)
  getDayInfo: () => { const i = World.streetInfo(); return { day: i.day, weekday: i.weekday, label: i.label } },
  getStreetInfo: () => World.streetInfo(),                                   // mật độ, phố đi bộ, cao điểm, giờ mặt trời (cho QA/âm thanh)
  getSunTimes: () => ({ sunrise: World.cal.sun.rise, sunset: World.cal.sun.set }),
  isNight: () => World.nightAt() >= 0.5,                                     // theo giờ mặt trời (tháng 11 tối từ ~17:45)
  isWalkingStreet: () => !!World.streetInfo().walkingStreet,
  getOpenSweep: () => openSweep || sweepOpen(),
  isRaining: () => { const w = World.sky.weather; return w === 'rain' || w === 'storm' },
  // ── tiện ích thêm (ngoài hợp đồng) cho QA / gameplay ──
  setHour: (h) => { World.sky.hour = ((h % 24) + 24) % 24 },
  setClockRunning: (b) => { World.sky.auto = !!b },
  setWeather: (w) => { World.sky.weather = w; World.sky.autoWx = false },
  getPois: () => World.pois.map((p) => ({ ...p })),
  isReachable: (gx, gy) => { const t = nearestOk(gx, gy), c = centerOf(t); return !!(reach && reach[t[1]][t[0]]) && Math.hypot(c.gx - gx, c.gy - gy) < 1.6 },
  _aw: () => aw && { path: aw.path, retries: aw.retries },
  getGps: () => gps && { target: gps.target, goal: gps.goal, pathLen: null },
  debug: () => ({ N, cells: M, okCells: ok.flat().filter(Boolean).length, reachable: reach.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0), spawnCell, markers: markers.size, sites: siteList.length }),
  _ok: (x, y) => { for (let j = 0; j < Q; j++) for (let i = 0; i < Q; i++) if (ok[y * Q + j][x * Q + i]) return true; return false }, _reach: (x, y) => { for (let j = 0; j < Q; j++) for (let i = 0; i < Q; i++) if (reach[y * Q + j][x * Q + i]) return 1; return 0 }, free: (x, y) => free(x, y),
}

export function init() {
  buildGrid(); buildSites()
  // điểm tương tác mặc định ở cửa phòng trọ: nhấn E/chạm → phát poi:interact {poi:{id:'home',kind:'home'}}.
  // Gameplay muốn hiện bảng Nghỉ/Ngủ thì addMarker tại getSites('home')[0] (marker luôn thắng POI) hoặc nghe poi:interact.
  const hs = siteList.find((s) => s.id === 'home')
  if (hs) Game.registerPOI({ id: 'home', kind: 'home', label: hs.label, gx: hs.gx, gy: hs.gy, r: 1.1, onInteract: () => Game.toast('Phòng trọ của bạn') })
  World.hooks.frame.push(worldTick); World.hooks.overlay.push(overlay)
  World.hooks.newday = () => { World.setDay(dayNow() + 1); bus.emit('time:newday', { day: dayNow() }) }
  World.sky.auto = true                                                       // đồng hồ game chạy (gameplay cần giờ để tính hạn việc)
  window.__worldAPI = api
  try { sweepOpen() } catch (e) { console.warn('[world] sweepOpen', e) }
}
export { api }

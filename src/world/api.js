// window.__worldAPI — giao diện của khối world cho gameplay / ui / audio / QA (xem src/core/CONTRACT.md).
// Tìm đường: easystarjs 0.4.4 (MIT, chép vào ./vendor). Lưới theo ô, dùng đúng luật va chạm của người chơi (bán kính 0.22).
import EasyStar from './vendor/easystar-0.4.4.js'
import { bus } from '../core/bus.js'
import { World } from './world.js'
import { Game } from './player.js'

const BR = 0.23                                   // bán kính thân người chơi khi kiểm tra (player.js dùng 0.22)
const Q = 2, CS = 1 / Q                           // lưới nửa ô (0.5): tường mảnh như hàng rào, ngõ 1 ô vẫn đi được, không bị "rò" qua tường như lưới theo ô
const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
let N = 0, M = 0, ok = null, reach = null, es = null, spawnCell = [0, 0], free = null
let day = 1
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
  const cost = { road: 1, dash_x: 1, dash_y: 1, railroad: 1, rail: 2, gravel: 2, grass: 3 }
  const grid = ok.map((row, cy) => row.map((v, cx) => v ? (cost[World.kind[Math.floor(cy * CS)][Math.floor(cx * CS)]] || 0) : 9))
  es = new EasyStar.js()
  es.setGrid(grid); es.setAcceptableTiles([0, 1, 2, 3]); es.enableDiagonals(); es.disableCornerCutting()
  es.setTileCost(1, 5); es.setTileCost(2, 3); es.setTileCost(3, 2); es.setIterationsPerCalculation(100000)
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
// ô lưới (nửa ô) đi được gần điểm (gx,gy) nhất (và nối với khu vực chính nếu needReach)
function nearestOk(gx, gy, needReach = true) {
  const cx = Math.floor(gx * Q), cy = Math.floor(gy * Q)
  let best = null, bd = 1e9
  for (let r = 0; r <= 28; r++) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || x < 0 || y < 0 || x >= M || y >= M || !ok[y][x]) continue
      if (needReach && reach && !reach[y][x]) continue
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
function buildSites() { siteList = World.sites.map((s) => ({ ...s, standAt: centerOf(nearestOk(s.gx, s.gy)) })) }
function getSites(kind = 'any') {
  return siteList.filter((s) => kind === 'any' || s.kind === kind).map((s) => ({ ...s, standAt: { ...s.standAt } }))
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

// ───────── GPS ─────────
function setGps(target) {
  gpsToken++
  if (target == null) { gps = null; return }
  if (typeof target === 'string') target = siteList.find((s) => s.id === target) || [...markers].find((m) => m.id === target)
  if (!target || !Number.isFinite(target.gx) || !Number.isFinite(target.gy)) { gps = null; return }
  const goal = target.standAt ? { ...target.standAt } : centerOf(nearestOk(target.gx, target.gy))
  gps = { target, goal, path: null, busy: false, last: { gx: -99, gy: -99 }, timer: 0 }
  repath()
}
function repath() {
  if (!gps || gps.busy) return
  const g = gps, tok = gpsToken, p = Game.state.player
  g.busy = true; g.last = { gx: p.gx, gy: p.gy }; g.timer = 0.8
  pathTo(g.goal.gx, g.goal.gy).then((path) => { g.busy = false; if (tok === gpsToken) g.path = path })
}
function gpsTick(dt) {
  if (!gps) return
  const p = Game.state.player, t = gps.target
  if (Math.hypot(p.gx - gps.goal.gx, p.gy - gps.goal.gy) < 0.9 || Math.hypot(p.gx - t.gx, p.gy - t.gy) < Math.max(1.3, t.r || 0)) {
    const tg = gps.target; gps = null; gpsToken++
    bus.emit('gps:arrived', { target: tg }); return
  }
  gps.timer -= dt
  if (gps.timer <= 0 && Math.hypot(p.gx - gps.last.gx, p.gy - gps.last.gy) > 0.5) repath()
}

// vẽ: chấm chạy dọc đường + mũi tên dẫn + vòng sáng ở đích (lớp cuối, không bị bộ lọc ngày/đêm làm tối)
function ring(ctx, X, Y, r, rgb, a) {
  const rx = r * 50.9, ry = r * 25.5
  ctx.lineWidth = 3; ctx.strokeStyle = `rgba(40,18,0,${a * 0.85})`; ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 6.283); ctx.stroke()
  ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 6.283); ctx.stroke()
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
    const pts = []                                                            // đường còn lại, bắt đầu từ người chơi
    if (gps.path && gps.path.length) {
      let bi = 0, bd = 1e9; gps.path.forEach((n, i) => { const d = Math.hypot(n.gx - P.gx, n.gy - P.gy); if (d < bd) { bd = d; bi = i } })
      pts.push({ gx: P.gx, gy: P.gy }); for (let i = bi; i < gps.path.length; i++) pts.push(gps.path[i])
    } else pts.push({ gx: P.gx, gy: P.gy }, { gx: gps.goal.gx, gy: gps.goal.gy })
    const STEP = 0.8, phase = (T * 2.4) % STEP
    let n = 0, arrow = null, along = 0
    const ARROW_AT = 3.2
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b.gx - a.gx, b.gy - a.gy); if (L < 1e-6) continue
      const ux = (b.gx - a.gx) / L, uy = (b.gy - a.gy) / L
      // chấm nằm ở các vị trí k*STEP + phase tính từ người chơi dọc đường
      for (let s = ((phase - along) % STEP + STEP) % STEP; s < L; s += STEP, n++) {
        const dd = along + s, [X0, Y0] = scr(a.gx + ux * s, a.gy + uy * s), X = Math.round(X0), Y = Math.round(Y0)
        if (X < -10 || X > w + 10 || Y < -10 || Y > h + 10) continue
        ctx.globalAlpha = Math.min(1, dd / 1.2)
        ctx.fillStyle = '#3a1c00'; ctx.fillRect(X - 4, Y - 2, 9, 5); ctx.fillRect(X - 3, Y - 3, 7, 7)
        ctx.fillStyle = Math.round(dd / STEP) % 3 === 0 ? '#fff2a0' : '#ffd23a'; ctx.fillRect(X - 3, Y - 2, 7, 5); ctx.fillRect(X - 2, Y - 3 + 1, 5, 1); ctx.fillStyle = '#fff8d0'; ctx.fillRect(X - 2, Y - 1, 5, 2)
      }
      if (!arrow && along + L >= ARROW_AT) { const s = ARROW_AT - along; arrow = { gx: a.gx + ux * s, gy: a.gy + uy * s, ux, uy } }
      along += L
    }
    ctx.globalAlpha = 1
    if (arrow && along > 4.5) {                                              // mũi tên dẫn lơ lửng phía trước người chơi
      const [X0, Y0] = scr(arrow.gx, arrow.gy), bob = Math.sin(T * 5) * 1.5
      const ang = Math.atan2((arrow.ux + arrow.uy) * 18, (arrow.ux - arrow.uy) * 36)
      ctx.save(); ctx.translate(Math.round(X0), Math.round(Y0 - 12 + bob)); ctx.rotate(ang)
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-4, -6); ctx.lineTo(-1, 0); ctx.lineTo(-4, 6); ctx.closePath()
      ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#3a1c00'; ctx.stroke(); ctx.fillStyle = '#ffe14a'; ctx.fill(); ctx.restore()
    }
    const [X, Y] = scr(gps.target.gx, gps.target.gy), pu = 0.5 + 0.5 * Math.sin(T * 4)   // vòng sáng + cột sáng ở đích
    if (X > -120 && X < w + 120 && Y > -120 && Y < h + 120) {
      const g = ctx.createLinearGradient(0, Y - 70, 0, Y); g.addColorStop(0, 'rgba(255,225,90,0)'); g.addColorStop(1, 'rgba(255,225,90,0.5)')
      ctx.fillStyle = g; ctx.fillRect(Math.round(X) - 5, Y - 70, 10, 70)
      ring(ctx, X, Y, 0.62 + 0.28 * pu, '255,225,90', 0.95); ring(ctx, X, Y, 0.34, '255,248,200', 0.8)
    }
  }
  ctx.restore()
}

// ───────── sự kiện thế giới ─────────
let lastWx = null, lastBell = null
function worldTick(dt) {
  const wx = World.sky.weather, rain = wx === 'rain' || wx === 'storm', storm = wx === 'storm'
  if (!lastWx || lastWx.rain !== rain || lastWx.storm !== storm) { lastWx = { rain, storm }; bus.emit('weather', { rain, storm }) }
  const bell = World.crossings.some((c) => c.down)
  if (lastBell !== bell) { const first = lastBell === null; lastBell = bell; if (!first || bell) bus.emit('train:bell', { on: bell }) }
  gpsTick(dt)
}

// ───────── API ─────────
const hourNow = () => World.sky.hour
const api = {
  getPlayer: () => ({ gx: Game.state.player.gx, gy: Game.state.player.gy }),
  getSites, pathTo, setGps, addMarker,
  lockPlayer: (b) => Game.setLocked(!!b),
  teleport(gx, gy) {
    if (gx && typeof gx === 'object') { gy = gx.gy; gx = gx.gx }
    if (!Game.walkableAt(gx, gy)) { const c = centerOf(nearestOk(gx, gy)); gx = c.gx; gy = c.gy }
    Game.teleport(gx, gy)
  },
  getHour: hourNow,
  getDay: () => day,
  setDay(n) { if (Number.isFinite(n) && n >= 1) day = Math.floor(n) },
  isNight: () => { const h = hourNow(); return h >= 19 || h < 6 },
  isRaining: () => { const w = World.sky.weather; return w === 'rain' || w === 'storm' },
  // ── tiện ích thêm (ngoài hợp đồng) cho QA / gameplay ──
  setHour: (h) => { World.sky.hour = ((h % 24) + 24) % 24 },
  setClockRunning: (b) => { World.sky.auto = !!b },
  setWeather: (w) => { World.sky.weather = w; World.sky.autoWx = false },
  getPois: () => World.pois.map((p) => ({ ...p })),
  isReachable: (gx, gy) => { const t = nearestOk(gx, gy), c = centerOf(t); return !!(reach && reach[t[1]][t[0]]) && Math.hypot(c.gx - gx, c.gy - gy) < 1.6 },
  getGps: () => gps && { target: gps.target, goal: gps.goal, pathLen: gps.path ? gps.path.length : null },
  debug: () => ({ N, cells: M, okCells: ok.flat().filter(Boolean).length, reachable: reach.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0), spawnCell, markers: markers.size, sites: siteList.length }),
  _ok: (x, y) => ok[y * Q][x * Q] || ok[y * Q + 1][x * Q] || ok[y * Q][x * Q + 1] || ok[y * Q + 1][x * Q + 1], _reach: (x, y) => reach[y * Q][x * Q] | reach[y * Q + 1][x * Q] | reach[y * Q][x * Q + 1] | reach[y * Q + 1][x * Q + 1], free: (x, y) => free(x, y),
}

export function init() {
  buildGrid(); buildSites()
  World.hooks.frame.push(worldTick); World.hooks.overlay.push(overlay)
  World.hooks.newday = () => { day++; bus.emit('time:newday', { day }) }
  World.sky.auto = true                                                       // đồng hồ game chạy (gameplay cần giờ để tính hạn việc)
  window.__worldAPI = api
}
export { api }

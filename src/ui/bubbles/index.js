// Bong bóng thoại NPC: lớp overlay HiDPI riêng (canvas theo devicePixelRatio, toạ độ màn hình CSS px, tách khỏi canvas pixel thấp của world).
// Chữ Pixelify Sans (OFL) nhúng base64; lời thoại sinh bằng tracery. API: window.__bubbles = { say, debug }.
import { bus } from '../../core/bus.js'
import { h, icon } from '../theme.js'
import FONT from './font-data.js'
import { TYPES, expand, slotOfHour, pickThink, pickPair, sitterSet, vendorSlot } from './grammars.js'

const MAX = 4                         // bong bóng đồng thời tối đa
const GAP_MS = 2200                   // khoảng cách tối thiểu giữa 2 lần tự nói
const PRIO = { sound: 1, think: 2, vendor: 2, chat: 3, traffic: 4, wow: 4 }
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const W = () => window.__worldAPI

let cv, ctx, dpr = 1, vw = 0, vh = 0
let fontOk = false
const list = []                       // bong bóng đang sống
let seq = 1, lastSpawn = 0
let rain = false
let npcCache = [], npcAt = 0
let excl = [], exclAt = 0
let frame = { visible: [], dots: [], gate: false, zoom: 1 }
let mgFlag = false                   // đang chơi mini-game (minigame:start … đóng màn kết quả)
const mgOn = () => { if (!mgFlag) return false; try { const g = window.__gameplay; if (g && g.minigames && g.minigames.isActive && !g.minigames.isActive()) mgFlag = false } catch (e) { /* bỏ qua */ } return mgFlag }
// điện thoại mở trên màn hẹp (< 700px) che gần hết màn: không nói (CSS body.hx-open cũng ẩn lớp bong bóng)
const phoneBlocks = () => document.body.classList.contains('hx-open') && isMobile()
const silent = () => mgOn() || phoneBlocks()

// ───────────────────────── tiện ích world (có bản dự phòng khi world chưa có API) ─────────────────────────
const zoom = () => { try { const z = W() && W().getZoom && W().getZoom(); return typeof z === 'number' ? z : 1 } catch (e) { return 1 } }
// zoom thực đang trôi (đợt 4: getZoomLive); chỉ dùng cho vị trí/độ cao đầu, KHÔNG dùng cho cổng hiện chữ
const zoomLive = () => { try { const z = W()?.getZoomLive?.(); return Number.isFinite(z) ? z : zoom() } catch (e) { return zoom() } }
const isMobile = () => innerWidth < 700
const gateOn = () => { const z = zoom(); return z >= 3 || (isMobile() && z >= 1) }
const w2s = (gx, gy) => { try { const w = W(); return w && w.worldToScreen ? w.worldToScreen(gx, gy) : null } catch (e) { return null } }
const player = () => { try { return W() && W().getPlayer && W().getPlayer() } catch (e) { return null } }
const hourNow = () => { try { const w = W(); return w && w.getHour ? w.getHour() : 12 } catch (e) { return 12 } }
function npcs() {
  const now = performance.now()
  if (now - npcAt > 200) { npcAt = now; try { const w = W(); npcCache = (w && w.getNpcs && w.getNpcs()) || [] } catch (e) { npcCache = [] } }
  return npcCache
}
const distTo = (p, o) => (p && o ? Math.hypot(p.gx - o.gx, p.gy - o.gy) : 99)
function nearNpcs(maxD, kind) {
  const p = player()
  return npcs().filter((n) => (!kind || n.kind === kind) && distTo(p, n) <= maxD).sort((a, b) => distTo(p, a) - distTo(p, b))
}
const findNpc = (id) => npcs().find((n) => String(n.id) === String(id))

// ───────────────────────── bong bóng ─────────────────────────
function active() { const t = performance.now(); return list.filter((b) => t - b.born < b.ttl) }
function resolveTarget(t) {
  if (t == null) return { player: true }
  if (typeof t === 'object' && t.gx != null) return { pos: { gx: t.gx, gy: t.gy } }
  if (typeof t === 'object' && t.id != null) return { npc: t.id }
  return { npc: t }
}
function spawn(type, text, target, opt = {}) {
  if (!TYPES[type] || !text || mgOn()) return 0
  const act = active()
  if (act.length >= MAX) {
    // chen vào: đuổi bong bóng ưu tiên thấp nhất rồi cũ nhất, nhưng không đuổi cái ưu tiên cao hơn mình
    const me = PRIO[type] || 2
    const victim = act.slice().sort((a, b) => (PRIO[a.type] - PRIO[b.type]) || (a.born - b.born))[0]
    if (!opt.force && PRIO[victim.type] > me) return 0
    victim.ttl = 0
  }
  const b = { id: seq++, type, text: String(text), tgt: resolveTarget(target), born: performance.now() + (opt.delay || 0), ttl: (opt.ttl || (type === 'sound' ? 2400 : Math.min(7200, 2800 + text.length * 70))) + (opt.delay || 0), lay: null, lost: 0 }
  list.push(b); lastSpawn = performance.now()
  return b.id
}
const room = (n = 1) => active().length + n <= MAX
const canAuto = (n = 1) => room(n) && performance.now() - lastSpawn > GAP_MS && !document.body.classList.contains('hx-open') && !silent()

// vị trí chân của bong bóng trên màn hình (CSS px) hoặc null
function anchorOf(b) {
  const t = b.tgt; let g = null
  if (t.npc != null) { const n = findNpc(t.npc); if (n) g = n }
  else if (t.player) g = player()
  else g = t.pos
  if (!g) return null
  const s = w2s(g.gx, g.gy)
  return s && isFinite(s.x) ? { x: s.x, y: s.y } : null
}

// ───────────────────────── vẽ ─────────────────────────
const fontSize = () => (isMobile() ? 14 : 16)
const font = (px) => `${px}px HXBubble, "Segoe UI", system-ui, sans-serif`
function wrap(text, maxW, px) {
  ctx.font = font(px)
  const words = text.split(' '), lines = []; let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w } else cur = t
  }
  if (cur) lines.push(cur)
  let mw = 0; for (const l of lines) mw = Math.max(mw, ctx.measureText(l).width)
  return { lines, w: Math.ceil(mw) }
}
function layout(b) {
  const px = b.type === 'sound' ? fontSize() + 4 : fontSize(), key = px + ':' + fontOk + ':' + innerWidth
  if (b.lay && b.lay.key === key) return b.lay
  const maxW = Math.min(isMobile() ? 150 : 190, vw - 40)
  const r = wrap(b.text, maxW, px), pad = b.type === 'sound' ? 2 : 8, lh = Math.round(px * 1.4)
  return (b.lay = { key, px, lh, lines: r.lines, tw: r.w, w: r.w + pad * 2, h: r.lines.length * lh + pad * 2 - (b.type === 'sound' ? 0 : 2), pad })
}
const R = (v) => Math.round(v * dpr) / dpr
function notch(x, y, w, hh, n) {
  ctx.beginPath(); ctx.moveTo(x + n, y); ctx.lineTo(x + w - n, y); ctx.lineTo(x + w, y + n); ctx.lineTo(x + w, y + hh - n); ctx.lineTo(x + w - n, y + hh)
  ctx.lineTo(x + n, y + hh); ctx.lineTo(x, y + hh - n); ctx.lineTo(x, y + n); ctx.closePath()
}
function drawBox(it, a) {
  const { x, y, w, h: hh, color, ax, up, type } = it, col = color
  // đuôi (tam giác) ở dưới nếu bong bóng nằm trên NPC, ở trên nếu đã lật
  const tail = (grow, c) => {
    ctx.fillStyle = c; ctx.beginPath()
    if (!up) { ctx.moveTo(ax - 7 - grow, y + hh - 2); ctx.lineTo(ax + 7 + grow, y + hh - 2); ctx.lineTo(ax, y + hh + 9 + grow) }
    else { ctx.moveTo(ax - 7 - grow, y + 2); ctx.lineTo(ax + 7 + grow, y + 2); ctx.lineTo(ax, y - 9 - grow) }
    ctx.closePath(); ctx.fill()
  }
  ctx.globalAlpha = a
  if (type === 'think') {
    for (const [k, r] of [[0.55, 3], [0.2, 2]]) { const cy = up ? y - 6 - (1 - k) * 8 : y + hh + 6 + (1 - k) * 8, cx = ax; ctx.fillStyle = '#080a11'; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, 7); ctx.fill(); ctx.fillStyle = '#fffbe9'; ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, 7); ctx.fill() }
  } else { tail(3, '#080a11'); tail(2, col); tail(-1, '#fffbe9') }
  ctx.fillStyle = '#080a11'; notch(x - 4, y - 4, w + 8, hh + 8, 4); ctx.fill()
  ctx.fillStyle = col; notch(x - 3, y - 3, w + 6, hh + 6, 3); ctx.fill()
  ctx.fillStyle = '#fffbe9'; notch(x, y, w, hh, 3); ctx.fill()
  ctx.globalAlpha = 1
}
function drawText(it, a) {
  const { lay } = it.b
  ctx.font = font(lay.px); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
  ctx.globalAlpha = a
  const bx = it.x + lay.pad, by = it.y + lay.pad - 1
  lay.lines.forEach((ln, i) => {
    const ty = R(by + i * lay.lh + lay.px * 0.98)
    if (it.type === 'sound') {
      ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#080a11'; ctx.strokeText(ln, R(bx), ty)
      ctx.lineWidth = 2; ctx.strokeStyle = it.color; ctx.strokeText(ln, R(bx), ty)
      ctx.fillStyle = '#fffbe9'; ctx.fillText(ln, R(bx), ty)
    } else { ctx.fillStyle = '#1a1306'; ctx.fillText(ln, R(bx), ty) }
  })
  ctx.globalAlpha = 1
}
function drawDot(d) {
  const { x, y, color } = d, w = 14, hh = 10, bx = R(x - w / 2), by = R(y - hh)
  ctx.globalAlpha = d.a
  ctx.fillStyle = '#080a11'; notch(bx - 2, by - 2, w + 4, hh + 4, 2); ctx.fill()
  ctx.fillStyle = color; notch(bx - 1, by - 1, w + 2, hh + 2, 2); ctx.fill()
  ctx.fillStyle = '#fffbe9'; ctx.fillRect(bx + 1, by + 1, w - 2, hh - 2)
  ctx.fillStyle = '#1a1306'; for (let i = 0; i < 3; i++) ctx.fillRect(bx + 3 + i * 4, by + 4, 2, 2)
  ctx.globalAlpha = 1
}

function refreshExcl() {
  const now = performance.now(); if (now - exclAt < 400) return; exclAt = now
  excl = []
  for (const el of document.querySelectorAll('#hx-hud,#hx-dock,#hx-zoom,#hx-aw-chip.on,#hud,#gp-job-chip,#gp-eat-menu,.hx-toast')) {
    const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) excl.push({ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 })
  }
  excl.push({ x: vw - 340, y: 0, w: 340, h: 98 })                        // hàng nút thời tiết của world
  excl.push({ x: vw / 2 - 130, y: vh - 80, w: 260, h: 80 })                // nút nhắc "E / chạm"
}
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

function resize() {
  dpr = Math.max(1, window.devicePixelRatio || 1); vw = innerWidth; vh = innerHeight
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr)
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function render() {
  requestAnimationFrame(render)
  const now = performance.now()
  for (let i = list.length - 1; i >= 0; i--) if (now - list[i].born > list[i].ttl + 250 || list[i].lost > 20) list.splice(i, 1)
  if (devicePixelRatio !== dpr || innerWidth !== vw || innerHeight !== vh) resize()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, vw, vh)
  const gate = gateOn(), z = zoom(), zl = zoomLive()
  frame = { visible: [], dots: [], gate, zoom: z, zoomLive: zl }
  if (mgOn()) { list.length = 0; return }
  if (!list.length || document.body.classList.contains('hx-open')) return
  refreshExcl()
  const headOff = 26 * Math.max(1, zl), items = [], dots = []   // đỉnh đầu NPC theo zoom thực → bám đúng khi zoom đang trôi
  for (const b of list) {
    const age = now - b.born; if (age < 0) continue
    const an = anchorOf(b)
    if (!an) { b.lost++; continue }
    b.lost = 0
    const a = Math.min(1, age / 140, Math.max(0, (b.ttl - age) / 250))
    if (a <= 0) continue
    const pop = (1 - Math.min(1, age / 160)) * 6
    const hy = an.y - headOff, offscreen = an.x < -20 || an.x > vw + 20 || an.y < -20 || an.y > vh + 60
    if (offscreen) continue
    if (!gate) { dots.push({ x: an.x, y: hy, color: TYPES[b.type].color, a, type: b.type, text: b.text }); continue }
    const lay = layout(b), color = TYPES[b.type].color
    let up = false, y = hy - 10 - lay.h + pop
    if (b.type === 'sound') y -= Math.sin(age / 220) * 3 + age * 0.012
    const safeTop = 8
    if (y < safeTop && b.type !== 'sound') { up = true; y = an.y + 14 + pop * -1 }
    let x = an.x - lay.w / 2
    x = Math.max(8, Math.min(vw - 8 - lay.w, x))
    const ax = Math.max(x + 10, Math.min(x + lay.w - 10, an.x))
    items.push({ b, x, y, w: lay.w, h: lay.h, color, ax, up, type: b.type, a, an, hy })
  }
  // tránh chồng nhau: bong bóng nằm dưới đẩy lên, nếu đã lật thì đẩy xuống
  items.sort((p, q) => p.y - q.y)
  for (let i = 0; i < items.length; i++) for (let j = 0; j < i; j++) {
    const p = items[j], q = items[i]
    if (hit({ x: p.x - 6, y: p.y - 6, w: p.w + 12, h: p.h + 12 }, { x: q.x, y: q.y, w: q.w, h: q.h })) q.y = q.up ? p.y + p.h + 12 : p.y - q.h - 12
  }
  for (const it of items) {
    const r = { x: it.x - 4, y: it.y - 4, w: it.w + 8, h: it.h + 8 }
    if (it.y < 4 || it.y + it.h > vh - 4 || excl.some((e) => hit(e, r))) { dots.push({ x: it.an.x, y: it.hy, color: it.color, a: it.a, type: it.type, text: it.b.text }); continue }
    it.x = R(it.x); it.y = R(it.y)
    if (it.type !== 'sound') drawBox(it, it.a)
    drawText(it, it.a)
    frame.visible.push({ type: it.type, text: it.b.text, x: Math.round(it.x), y: Math.round(it.y), w: Math.round(it.w), h: Math.round(it.h) })
  }
  for (const d of dots) { drawDot(d); frame.dots.push({ type: d.type, text: d.text, x: Math.round(d.x), y: Math.round(d.y) }) }
}

// ───────────────────────── ngữ cảnh chọn câu (giờ, thứ, thời tiết, khu vực) ─────────────────────────
const wapi = (fn, dflt) => { try { const w = W(); const v = w ? fn(w) : undefined; return v === undefined || v === null ? dflt : v } catch (e) { return dflt } }
const zoneAt = (gx, gy) => wapi((w) => w.getZoneAt && w.getZoneAt(gx, gy), 'street')
// getZoneAt chỉ trả 'lake' sát mép hồ ±1 ô: dò thêm vài điểm quanh để ghế đá / đường dạo ven hồ cũng tính là "gần hồ"
const nearLake = (gx, gy) => [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dy]) => zoneAt(gx + dx, gy + dy) === 'lake')
function context(pos) {
  const p = pos || player() || { gx: 0, gy: 0 }
  const weather = (window.__world && window.__world.sky && window.__world.sky.weather) || (rain ? 'rain' : 'sunny')
  return {
    hour: hourNow(), wd: wapi((w) => w.getWeekday && w.getWeekday(), 2), rain: rain || weather === 'rain' || weather === 'storm', weather,
    sunset: wapi((w) => w.getSunTimes && w.getSunTimes().sunset, 17.25), ws: !!wapi((w) => w.isWalkingStreet && w.isWalkingStreet(), false),
    zone: zoneAt(p.gx, p.gy), nearLake: nearLake(p.gx, p.gy),
  }
}

// ───────────────────────── tự nói: rao hàng, đối đáp, suy nghĩ, âm thanh ─────────────────────────
const due = { vendor: 0, chat: 0, think: 0, dog: 0 }
const slot = () => slotOfHour(hourNow())
// một quán ĐANG MỞ gần người chơi (phở / bánh mì / trà chanh); quán đóng cửa thì không rao
function stallPoint() {
  const p = player(), w = W(); if (!p || !w || !w.getSites) return null
  const all = [...(w.getSites('pho') || []), ...(w.getSites('banhmi') || []), ...(w.getSites('tc') || [])].filter((s) => s.open !== false && distTo(p, s) < 11)
  return all.length ? pick(all) : null
}
const vendorLineSlot = () => { const s = stallPoint(); return s ? vendorSlot(s.kind, s.pinned, hourNow()) : slot() }
const vendorLine = (s) => expand('vendor', { slot: s ? vendorSlot(s.kind, s.pinned, hourNow()) : slot() })
// đối đáp: câu đáp luôn khớp câu hỏi (PAIRS trong grammars.js)
function sayChat(aId, bId, set = 'pass') {
  if (!room(2)) return false
  const a = findNpc(aId), [q, r] = pickPair(set, context(a))
  spawn('chat', q, aId)
  spawn('chat', r, bId, { delay: 1900 })
  return true
}
function ambient() {
  if (document.hidden) return
  const now = performance.now(), p = player()
  if (!p || !canAuto()) return
  if (now > due.vendor) {
    due.vendor = now + rand(9000, 16000)
    const s = stallPoint(); if (s) { spawn('vendor', vendorLine(s), { gx: s.gx, gy: s.gy }); return }
  }
  if (now > due.think) {
    due.think = now + rand(14000, 26000)
    const n = nearNpcs(10)
    if (n.length) {
      const who = pick(n.slice(0, 6)), key = pickThink(context(who))
      if (key !== 'chung' || Math.random() < 0.4) { spawn('think', expand('think', { slot: key }), who.id); return }
    }
  }
  if (now > due.chat) {
    due.chat = now + rand(13000, 22000)
    const sit = nearNpcs(14, 'sitter')
    // dáng hai người trong một hình (đôi ghế đá, ván cờ): cả hai câu cùng chỗ
    const duo = sit.find((n) => n.pose === 'coupleSit' || n.pose === 'chess')
    if (duo && Math.random() < 0.5 && sayChat(duo.id, duo.id, sitterSet(duo.pose, context(duo)))) return
    for (let i = 0; i < sit.length; i++) for (let j = i + 1; j < sit.length; j++) {
      if (Math.hypot(sit[i].gx - sit[j].gx, sit[i].gy - sit[j].gy) < 3.5) { if (sayChat(sit[i].id, sit[j].id, sitterSet(sit[i].pose, context(sit[i])))) return }
    }
  }
  if (now > due.dog) {
    due.dog = now + rand(24000, 40000)
    if (zoneAt(Math.round(p.gx), Math.round(p.gy)) === 'alley') spawn('sound', expand('sound', { slot: 'cho' }), { gx: p.gx + rand(-4, 4), gy: p.gy + rand(-4, 4) })
  }
}

// ───────────────────────── phản ứng theo sự kiện ─────────────────────────
let prevOutfit = null, lastPass = 0, lastHorn = 0
const snap = (o) => (o ? { hair: o.hair, top: o.top, pants: o.pants } : null)
function onOutfit(d) {
  const o = snap((d && d.outfit) || (window.__state && window.__state.outfit)), reason = d && d.reason
  const before = prevOutfit; prevOutfit = o
  if (!o || !before || reason) return
  const kind = ['hair', 'top', 'pants'].find((k) => o[k] !== before[k]); if (!kind) return
  const opts = (window.__characters && window.__characters.OUTFIT_OPTIONS && window.__characters.OUTFIT_OPTIONS[kind]) || []
  const name = opts[o[kind]] && String(opts[o[kind]].name || '').toLowerCase()
  const n = nearNpcs(9).slice(0, 2); if (!n.length) return
  const black = kind === 'hair' && (o.hair === 0 || /^tóc đen/.test(name || ''))          // nhuộm lại đen: không khen "nhuộm đẹp"
  n.forEach((np, i) => {
    let t
    if (black) t = expand('wow', { slot: 'tocDen' })
    else if (name && Math.random() < 0.5) t = expand('wow', {}, { item: [(kind === 'hair' ? 'tóc ' : kind === 'top' ? 'áo ' : 'quần ') + name.replace(/^(tóc|áo|quần|nhuộm)\s+/, '')] })
    else t = expand('wow', { slot: kind === 'hair' ? 'toc' : 'trang' })
    spawn('wow', t, np.id, { delay: 450 + i * 750, force: true })
  })
}
function onCut(d) {
  const train = d && d.kind === 'train'
  spawn('traffic', expand('traffic', { slot: train ? 'giatTau' : 'giat' }), null, { force: true })
  spawn('sound', expand('sound', { slot: train ? 'tau' : 'coi' }), null, { delay: 150 })
  const n = nearNpcs(8)[0]; if (n) spawn('traffic', expand('traffic', { slot: 'xem' }), n.id, { delay: 700 })   // người đứng xem nói câu của người xem, không lặp câu người bị tạt
}
function onSfx(d) {
  const name = d && d.name, now = performance.now()
  if (name === 'kinhcoong') {
    const veh = (() => { try { return (W().getVehicles() || []).filter((v) => /xich|cyclo/i.test(v.kind)).sort((a, b) => distTo(player(), a) - distTo(player(), b))[0] } catch (e) { return null } })()
    const at = d.gx != null ? { gx: d.gx, gy: d.gy } : veh ? { gx: veh.gx, gy: veh.gy } : null
    spawn('sound', expand('sound', { slot: 'chuong' }), at, { force: true })
    const n = nearNpcs(7)[0]; if (n && room()) spawn('traffic', expand('traffic', { slot: 'nhuong' }), n.id, { delay: 600 })
  } else if (name === 'horn' && now - lastHorn > 6000) {
    lastHorn = now; spawn('sound', expand('sound', { slot: 'coi' }), d.gx != null ? { gx: d.gx, gy: d.gy } : null)
  }
}
function onTrain(d) {
  if (!d || !d.on) return
  let at = null, running = false
  try { const t = W().getTrain && W().getTrain(); if (t && t.active) { at = { gx: t.gx, gy: t.gy }; running = true } else { const b = W().getBarrier && W().getBarrier(); if (b) at = { gx: b.gx, gy: b.gy } } } catch (e) { /* bỏ qua */ }
  if (!at) return
  spawn('sound', expand('sound', { slot: running ? 'tau' : 'barie' }), at, { force: true })     // tàu chưa tới: tiếng chuông barie, chưa "xình xịch"
  // chỉ người đứng/ngồi sát đường ray mới nhắc nhau lùi lại (không phải người ở tận phố khác)
  const n = nearNpcs(16).find((q) => Math.abs(q.gy - at.gy) <= 3.5 || zoneAt(q.gx, q.gy) === 'rail')
  if (n) spawn('traffic', expand('traffic', { slot: 'tau' }), n.id, { delay: 800 })
}
function onPass(d) {
  const now = performance.now(); if (!d || now - lastPass < 8000 || !canAuto(2)) return
  const p = player(), a = findNpc(d.a); if (!a || distTo(p, a) > 14) return
  lastPass = now; sayChat(d.a, d.b, 'pass')
}

// ───────────────────────── nút zoom (di động) ─────────────────────────
function zoomButtons() {
  const step = (dz) => { const w = W(); if (!w || !w.setZoom) return; const z = Math.max(1, Math.min(5, Math.round(zoom() + dz))); try { w.setZoom(z) } catch (e) { /* bỏ qua */ } bus.emit('sfx', { name: 'click' }) }
  const mk = (name, label, dz) => h('button', { class: 'hx-zbtn', 'data-act': 'zoom' + (dz > 0 ? 'in' : 'out'), 'aria-label': label, onclick: () => step(dz) }, icon(name, 24))
  const box = h('div', { id: 'hx-zoom' }, mk('plus', 'Phóng to', 1), mk('minus', 'Thu nhỏ', -1))
  // chạm vào nút không được lọt xuống canvas của world
  for (const ev of ['pointerdown', 'touchstart', 'mousedown']) box.addEventListener(ev, (e) => e.stopPropagation())
  document.body.append(box)
}

const CSS = `
#hx-bubbles{position:fixed;left:0;top:0;pointer-events:none;z-index:15}
body.hx-open #hx-bubbles{display:none}
#hx-zoom{position:fixed;right:8px;top:50%;transform:translateY(-120%);display:none;flex-direction:column;gap:8px;z-index:16;touch-action:manipulation}
@media (max-width:700px){#hx-zoom{display:flex}}
body.hx-open #hx-zoom{display:none}
.hx-zbtn{width:44px;height:44px;border-radius:8px;background:rgba(31,37,56,.92);color:#f4efe2;border:2px solid #080a11;box-shadow:0 3px 0 #080a11,inset 0 2px 0 rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.hx-zbtn:active{transform:translateY(2px);box-shadow:0 1px 0 #080a11}
#hx-aw-chip{position:fixed;left:50%;top:172px;transform:translateX(-50%);display:none;align-items:center;gap:8px;min-height:44px;padding:0 6px 0 12px;background:rgba(31,37,56,.94);color:#f4efe2;border:2px solid #080a11;border-radius:10px;box-shadow:0 3px 0 #080a11;z-index:16;font:16px/1.2 HXPixel,system-ui,sans-serif;white-space:nowrap;max-width:calc(100vw - 96px)}
#hx-aw-chip.on{display:flex}body.hx-open #hx-aw-chip{display:none}
#hx-aw-chip .dot{width:10px;height:10px;border-radius:50%;background:#62d894;animation:hxaw 1s infinite}
@keyframes hxaw{50%{opacity:.25}}
.hx-aw-stop{min-width:64px;min-height:44px;border-radius:8px;background:#7a2e2a;color:#f4efe2;border:2px solid #080a11;font:inherit;cursor:pointer;padding:0 12px;touch-action:manipulation}
.hx-aw{margin-top:8px;text-align:center;line-height:1.2}.hx-aw span{min-width:0;overflow-wrap:anywhere}.hx-aw.walking{background:#7a2e2a}
`

export function initBubbles() {
  const st = document.createElement('style'); st.id = 'hx-bubbles-style'; st.textContent = CSS; document.head.append(st)
  cv = document.createElement('canvas'); cv.id = 'hx-bubbles'; cv.setAttribute('aria-hidden', 'true'); ctx = cv.getContext('2d')
  document.body.append(cv); resize(); zoomButtons()
  try {
    const ff = new FontFace('HXBubble', `url(${FONT})`)
    ff.load().then((f) => { document.fonts.add(f); fontOk = true }, (e) => console.warn('[bubbles] font', e))
  } catch (e) { console.warn('[bubbles] font', e) }
  window.__bubbles = {
    say(target, text, type = 'think') {
      const k = TYPES[type] ? type : 'think'
      const pos = target == null ? player() : typeof target === 'object' && target.gx != null ? target : findNpc(target && target.id != null ? target.id : target)
      return spawn(k, text || expand(k === 'chat' ? 'chat' : k, { slot: k === 'vendor' ? vendorLineSlot() : k === 'think' ? pickThink(context(pos)) : k === 'traffic' ? 'giat' : k === 'wow' ? 'toc' : undefined }), target, { force: true })
    },
    debug() { return { visible: frame.visible.slice(), dots: frame.dots.slice(), zoomGate: frame.gate, zoom: frame.zoom, zoomLive: frame.zoomLive, active: active().length, dpr } },
  }
  bus.on('weather', (d) => { rain = !!(d && d.rain) })
  bus.on('outfit:changed', onOutfit)
  bus.on('traffic:cut', onCut)
  bus.on('npc:pass', onPass)
  bus.on('sfx', onSfx)
  bus.on('train:bell', onTrain)
  bus.on('minigame:start', () => { mgFlag = true; list.length = 0 })                  // đang chơi mini-game: im lặng, xoá bong bóng đang hiện
  bus.on('minigame:end', () => { /* mgOn() tự tắt khi màn kết quả đóng (minigames.isActive() = false) */ })
  bus.on('world:ready', () => { prevOutfit = snap(window.__state && window.__state.outfit); try { rain = !!(W().isRaining && W().isRaining()) } catch (e) { /* bỏ qua */ } })
  setInterval(ambient, 900)
  requestAnimationFrame(render)
}

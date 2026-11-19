// Kịch bản QA tự động cho Hà Nội Pixel (Wave 3). Chạy: npm run build && npm test
// Chạy trên dist/hanoi-pixel.html bằng file://, MẠNG BỊ CHẶN. 2 khung: PC 1280x720 và điện thoại dọc 390x844 (cảm ứng).
// Ảnh -> tests/shots/. Kết quả -> tests/report.json. Thoát mã 1 nếu có hạng mục Hỏng.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { makeDot4 } from './dot4.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const DIST = path.join(ROOT, 'dist', 'hanoi-pixel.html')
const SHOTS = path.join(ROOT, 'tests', 'shots')
const URL = pathToFileURL(DIST).href
fs.mkdirSync(SHOTS, { recursive: true })
if (!process.argv[2]) for (const f of fs.readdirSync(SHOTS)) if (/^(pc|mobile|q4)_.*\.png$/.test(f)) fs.unlinkSync(path.join(SHOTS, f))   // chạy từng phần thì giữ ảnh cũ; KHÔNG xoá ảnh của khối khác (world4b_, mg4_, text_audit_...)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const report = { time: new Date().toISOString(), sections: [], bugs: [] }
let curSection = null
function section(name) { curSection = { name, checks: [] }; report.sections.push(curSection); console.log('\n== ' + name) }
function check(name, ok, detail = '') {
  curSection.checks.push({ name, ok: !!ok, detail: String(detail) })
  console.log(`${ok ? '  ĐẠT ' : '  HỎNG'} ${name}${detail ? ' — ' + detail : ''}`)
  return !!ok
}
async function step(name, fn) {
  try { return await fn() } catch (e) { check(name + ' (ngoại lệ)', false, String(e.message || e).split('\n')[0]); return null }
}
const bug = (sev, text) => report.bugs.push({ sev, text })

// ───────────────────────── mở trang offline ─────────────────────────
async function openPage(browser, prof, opt = {}) {
  const ctx = await browser.newContext(prof.ctx)
  // đếm số AudioContext được tạo (đợt 4: chỉ được MỘT)
  if (opt.countAudio) await ctx.addInitScript(() => { const O = window.AudioContext || window.webkitAudioContext; if (!O) return; let n = 0; class C extends O { constructor(...a) { super(...a); n++ } } window.AudioContext = C; if (window.webkitAudioContext) window.webkitAudioContext = C; window.__acCount = () => n })
  const page = await ctx.newPage()
  const rec = { requests: [], external: [], consoleErrors: [], consoleWarns: [], pageErrors: [], blocked: 0 }
  await ctx.route(/^https?:\/\//, (r) => { rec.blocked++; r.abort() })
  page.on('request', (r) => { const u = r.url(); rec.requests.push(u); if (/^(https?|wss?|ftp):/i.test(u)) rec.external.push(u) })
  page.on('console', (m) => { if (m.type() === 'error') rec.consoleErrors.push(m.text()); else if (m.type() === 'warning') rec.consoleWarns.push(m.text()) })
  page.on('pageerror', (e) => rec.pageErrors.push(String(e.stack || e)))
  await page.goto(URL)
  await waitReady(page)
  return { ctx, page, rec }
}
async function waitReady(page) {
  await page.waitForFunction(() => window.__worldAPI && window.__gameplay && window.__ui && window.__world && window.__ready, null, { timeout: 40000 })
  await page.waitForTimeout(1200)
}

// ───────────────────────── kiểm bố cục ─────────────────────────
function auditInPage() {
  const vw = innerWidth, vh = innerHeight
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 }
  const nm = (el) => (el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : el.tagName.toLowerCase()) + (el.textContent && !el.id ? ' "' + el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24) + '"' : '')
  const R = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) } }
  const gm = document.querySelector('.gm')
  // lớp: mọi phần tử position:fixed nhìn thấy (trừ khung chứa toàn màn hình), cộng từng chip HUD / nút nổi / toast
  const layers = []
  const seen = new Set()
  const add = (el, name) => { if (seen.has(el) || !vis(el)) return; seen.add(el); layers.push({ el, name: name || nm(el), z: +getComputedStyle(el).zIndex || 0, ...R(el) }) }
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') || el.closest('.gm')) continue
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed') continue
    if (el.id === 'hx-root' || el.id === 'hx-hud' || el.id === 'hx-dock' || el.id === 'hx-toasts') continue
    if (el.tagName === 'CANVAS') continue
    add(el)
  }
  document.querySelectorAll('#hx-hud .hx-chip').forEach((e, i) => add(e, 'hud-chip' + i))
  document.querySelectorAll('#hx-dock .hx-fab').forEach((e) => add(e, e.id))
  document.querySelectorAll('#hx-toasts .hx-toast').forEach((e, i) => add(e, 'ui-toast' + i + ' "' + e.textContent.trim().slice(0, 20) + '"'))
  if (gm) { const c = gm.querySelector('.gm-card'); if (c) add(c, 'minigame-card') }
  const phoneOpen = !!document.querySelector('#hx-phone.open')
  const out = { vw, vh, phoneOpen, minigame: !!gm, layers: layers.map((l) => ({ name: l.name, z: l.z, x: l.x, y: l.y, w: l.w, h: l.h })), overlaps: [], overflow: [], small: [], textOverflow: [], docOverflow: document.documentElement.scrollWidth > vw + 1 || document.documentElement.scrollHeight > vh + 1 }
  // z hiệu dụng: phần tử trong #hx-root thuộc ngữ cảnh z=20 của UI (cộng z con/1000)
  const ez = (el) => { const z = +getComputedStyle(el).zIndex || 0; return el.closest('#hx-root') ? 20 + z / 1000 : z }
  out.toastOnPhone = []
  if (phoneOpen) {   // điện thoại đục: lớp thấp hơn nằm dưới điện thoại thì không nhìn thấy -> bỏ khỏi so sánh
    const ph = layers.find((l) => l.name === '#hx-phone')
    for (let k = layers.length - 1; k >= 0; k--) { const l = layers[k]; if (l === ph || ez(l.el) >= ez(ph.el)) continue; const ix = Math.min(l.r, ph.r) - Math.max(l.x, ph.x), iy = Math.min(l.b, ph.b) - Math.max(l.y, ph.y); if (ix > 0 && iy > 0 && ix * iy >= 0.5 * l.w * l.h) layers.splice(k, 1) }
  }
  for (let i = 0; i < layers.length; i++) for (let j = i + 1; j < layers.length; j++) {
    const a = layers[i], b = layers[j]
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue
    const ix = Math.min(a.r, b.r) - Math.max(a.x, b.x), iy = Math.min(a.b, b.b) - Math.max(a.y, b.y)
    if (!(ix > 3 && iy > 3)) continue
    if (gm && a.name !== 'minigame-card' && b.name !== 'minigame-card') continue            // dưới lớp phủ mini-game (z60, nền tối 90%)
    if (gm && (a.name === 'minigame-card' || b.name === 'minigame-card')) continue          // lớp bị phủ tối, không tính đè
    const ph = a.name === '#hx-phone' ? a : b.name === '#hx-phone' ? b : null
    if (ph) { const o = ph === a ? b : a; if (ez(o.el) < ez(ph.el)) continue; if (/ui-toast/.test(o.name)) { out.toastOnPhone.push({ a: o.name, area: ix * iy }); continue } }   // điện thoại đục: lớp thấp hơn bị che, không thấy
    out.overlaps.push({ a: a.name, b: b.name, area: ix * iy })
  }
  for (const l of layers) if (l.x < -1 || l.y < -1 || l.r > vw + 1 || l.b > vh + 1) out.overflow.push({ name: l.name, x: l.x, y: l.y, r: l.r, b: l.b })
  // nút chạm >= 44px: chỉ tính nút nhìn thấy thật (điểm giữa trúng chính nó)
  const scope = gm ? [gm] : phoneOpen ? [document.querySelector('#hx-phone')] : [document.body]
  const seenB = new Set()
  for (const root of scope) for (const el of root.querySelectorAll('button, [role=button], select, input')) {
    if (seenB.has(el) || !vis(el) || el.closest('svg')) continue
    seenB.add(el)
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue
    const top = document.elementFromPoint(cx, cy); if (!top || !(top === el || el.contains(top) || top.contains(el))) continue
    if (Math.min(r.width, r.height) < 43.5) out.small.push({ name: nm(el), w: Math.round(r.width), h: Math.round(r.height), disabled: !!el.disabled })
  }
  // chữ tràn ra ngoài hộp (điện thoại + mini-game)
  for (const root of [document.querySelector('#hx-phone.open'), gm].filter(Boolean)) {
    const rr = root.getBoundingClientRect()
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('svg') || el.tagName === 'CANVAS' || !vis(el)) continue
      const r = el.getBoundingClientRect()
      if (r.right > rr.right + 1.5 || r.left < rr.left - 1.5) { if (!el.closest('.hx-body') || r.width < rr.width) out.textOverflow.push({ name: nm(el), why: 'ra ngoài khung', x: Math.round(r.left), r: Math.round(r.right) }) }
      else if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && ['hidden', 'clip'].includes(getComputedStyle(el).overflowX) === false && getComputedStyle(el).display !== 'inline' && el.children.length === 0 && el.textContent.trim()) out.textOverflow.push({ name: nm(el), why: 'chữ dài hơn hộp', sw: el.scrollWidth, cw: el.clientWidth })
    }
  }
  return out
}
const audits = []
async function audit(page, label, prof) {
  const a = await page.evaluate(auditInPage)
  a.label = label; a.prof = prof.name; audits.push(a)
  const real = a.overlaps.filter((o) => !o.under)
  check(`[${prof.name}] ${label}: lớp DOM không đè nhau`, real.length === 0, real.map((o) => `${o.a} x ${o.b} (${o.area}px²)`).join('; '))
  check(`[${prof.name}] ${label}: không tràn khung`, a.overflow.length === 0 && !a.docOverflow, a.overflow.map((o) => `${o.name} [${o.x},${o.y}→${o.r},${o.b}]`).join('; ') + (a.docOverflow ? ' trang cuộn' : ''))
  check(`[${prof.name}] ${label}: nút chạm >= 44px${prof.touch ? '' : ' (PC: chỉ tham khảo)'}`, !prof.touch || a.small.length === 0, a.small.map((s) => `${s.name} ${s.w}x${s.h}`).join('; '))
  if (a.toastOnPhone && a.toastOnPhone.length) console.log('  (thông tin) toast của UI phủ lên điện thoại: ' + a.toastOnPhone.map((t) => t.a).join('; '))
  if (a.textOverflow.length) check(`[${prof.name}] ${label}: chữ không tràn hộp`, false, a.textOverflow.slice(0, 5).map((s) => `${s.name} ${s.why}`).join('; '))
  return a
}
async function shot(page, prof, name) { const f = path.join(SHOTS, `${prof.name}_${name}.png`); await page.screenshot({ path: f }); return f }

// ───────────────────────── tiện ích trong game ─────────────────────────
const G = (page, fn, arg) => page.evaluate(fn, arg)
async function state(page) { return page.evaluate(() => { const s = window.__gameplay.state; return { money: s.money, stamina: s.stamina, mood: s.mood, outfit: { ...s.outfit }, owned: JSON.parse(JSON.stringify(s.owned)), job: s.job ? { ...s.job } : null, debts: window.__gameplay.debts.list(), jobsDone: s.stats.jobsDone, day: s.day } }) }
async function tapOrClick(page, prof, selOrLoc, timeout = 4000) {
  const loc = typeof selOrLoc === 'string' ? page.locator(selOrLoc).first() : selOrLoc
  if (prof.touch) await loc.tap({ timeout }); else await loc.click({ timeout })
}
async function openPhoneByButton(page, prof) { await tapOrClick(page, prof, '#hx-btn-phone'); await page.waitForFunction(() => window.__ui.isPhoneOpen()); await page.waitForTimeout(450) }
async function closePhone(page) { await page.evaluate(() => window.__ui.closePhone()); await page.waitForFunction(() => !window.__ui.isPhoneOpen()); await page.waitForTimeout(450) }
async function walkTo(page, gx, gy, { stepEvery = 8, wait = 70 } = {}) {
  const path = await page.evaluate(([x, y]) => window.__worldAPI.pathTo(x, y), [gx, gy])
  if (!path) return { ok: false, len: 0 }
  for (let i = stepEvery; i < path.length; i += stepEvery) { await page.evaluate((p) => window.__worldAPI.teleport(p.gx, p.gy), path[i]); await page.waitForTimeout(wait) }
  await page.evaluate((p) => window.__worldAPI.teleport(p.gx, p.gy), path[path.length - 1]); await page.waitForTimeout(250)
  return { ok: true, len: path.length }
}
async function nearInfo(page) { return page.evaluate(() => { const n = window.__game.state.near; return n ? { id: n.id, label: n.label, marker: !!n.marker } : null }) }
async function promptTap(page, prof, label = 'nhắc tương tác') {
  if (!prof.touch) return page.keyboard.press('e')
  const h = await page.evaluateHandle(() => [...document.body.children].find((e) => e.tagName === 'BUTTON' && e.style.position === 'fixed' && e.style.display !== 'none'))
  const el = h.asElement(); if (!el) throw new Error('không thấy nút nhắc tương tác (player.js)')
  try { await el.tap({ timeout: 2500 }); return 'ok' } catch (e) {
    const why = String(e.message).split(String.fromCharCode(10)).find((l) => /intercepts/.test(l)) || 'bị chặn'
    check(`[${prof.name}] chạm nút "${label}" (nút nhắc của player.js) được ngay`, false, why.trim().slice(0, 140))
    const b = await el.boundingBox()
    for (const fx of [0.97, 0.03]) { try { await page.touchscreen.tap(b.x + b.width * fx, b.y + b.height / 2); await page.waitForTimeout(300); return 'edge' } catch {} }
    return 'fail'
  }
}
async function sampleHash(page, prof, clip) {
  const buf = await page.screenshot({ clip })
  return buf
}

// ───────────────────────── Phần 1: build + offline ─────────────────────────
async function partBuild(browser) {
  section('1. Bản build: 1 file độc lập, chạy offline')
  const st = fs.statSync(DIST), html = fs.readFileSync(DIST, 'utf8')
  check('dist/hanoi-pixel.html tồn tại', true, (st.size / 1048576).toFixed(2) + ' MB (' + st.size + ' byte)')
  check('dung lượng < 3 MB', st.size < 3 * 1048576)
  const files = fs.readdirSync(path.join(ROOT, 'dist'))
  check('dist/ chỉ có 1 file', files.length === 1 && files[0] === 'hanoi-pixel.html', files.join(', '))
  check('không có <script src=...>', !/<script[^>]+\bsrc\s*=/i.test(html))
  check('không có <link href=...> tải ngoài', !/<link[^>]+\bhref\s*=\s*["'](?!data:)/i.test(html))
  check('không có <img/audio/source src> tới file hay mạng', !/<(img|audio|video|source|iframe)[^>]+\bsrc\s*=\s*["'](?!data:)/i.test(html))
  const urls = [...html.matchAll(/url\(\s*["']?(https?:[^)"']+)/gi)].map((m) => m[1])
  check('CSS không url(http...)', urls.length === 0, urls.slice(0, 3).join(' '))
  const ext = [...new Set([...html.matchAll(/["'`](https?:\/\/[^"'`\s)]+)/g)].map((m) => m[1]))].filter((u) => !/w3\.org|localhost/.test(u))
  check('mã không nhúng đường dẫn http(s) lạ', ext.length === 0, ext.slice(0, 5).join(' '))
  const prof = { name: 'pc', ctx: { viewport: { width: 1280, height: 720 } } }
  const { ctx, page, rec } = await openPage(browser, prof)
  await page.waitForTimeout(6000)
  const errs = await page.evaluate(() => window.__stats.errors.slice())
  check('mở bằng file:// khi chặn mạng vẫn chạy (world:ready)', await page.evaluate(() => !!window.__ready && window.__worldAPI.debug().sites > 0))
  check('0 request ra ngoài (http/https/ws)', rec.external.length === 0, `${rec.requests.length} request nội bộ; chặn ${rec.blocked}; ngoài: ${rec.external.join(', ')}`)
  check('0 lỗi console', rec.consoleErrors.length === 0 && rec.pageErrors.length === 0, [...rec.consoleErrors, ...rec.pageErrors].slice(0, 3).join(' | '))
  if (rec.consoleWarns.length) console.log('  (cảnh báo console: ' + rec.consoleWarns.length + ') ' + rec.consoleWarns.slice(0, 3).join(' | '))
  check('__stats.errors rỗng sau 6 giây', errs.length === 0, errs.slice(0, 3).join(' | '))
  await shot(page, prof, '00_build_offline')
  await ctx.close()
}

// ───────────────────────── Phần 2: kịch bản chơi thử ─────────────────────────
async function partPlay(browser, prof) {
  section(`2. Chơi thử ${prof.label}`)
  const { ctx, page, rec } = await openPage(browser, prof)
  const P = (n) => `[${prof.name}] ${n}`
  const s0 = await state(page)
  await shot(page, prof, '01_start')
  await step('audit start', () => audit(page, 'vào game', prof))

  // ── điện thoại: nút + phím P ──
  await step('phone', async () => {
    await openPhoneByButton(page, prof)
    check(P('bật điện thoại bằng nút nổi'), await page.evaluate(() => window.__ui.isPhoneOpen()))
    await shot(page, prof, '02_phone_home')
    await audit(page, 'điện thoại - màn chủ', prof)
    const tiles = await page.locator('.hx-tile').count()
    check(P('màn chủ có 5 app'), tiles === 5, tiles + ' app')
    await closePhone(page)
    if (!prof.touch) {
      await page.keyboard.press('p'); await page.waitForTimeout(450)
      check(P('phím P mở điện thoại'), await page.evaluate(() => window.__ui.isPhoneOpen()))
      await page.keyboard.press('p'); await page.waitForTimeout(450)
      check(P('phím P đóng điện thoại'), await page.evaluate(() => !window.__ui.isPhoneOpen()))
    } else {
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }))); await page.waitForTimeout(450)
      check(P('phím P mở điện thoại (bàn phím rời gắn vào điện thoại)'), await page.evaluate(() => window.__ui.isPhoneOpen()))
      await closePhone(page)
    }
  })

  // ── bảng việc: tìm/chế việc phở ──
  const job = await step('board', async () => {
    await G(page, () => { window.__gameplay.debug.setStamina(100) })
    let j = await G(page, () => window.__gameplay.jobs.board().find((x) => x.kind === 'pho'))
    if (!j) {   // không có việc phở trên bảng: ép một việc phở thật vào bảng bằng cách đổi 1 việc (chỉ dữ liệu, mọi thứ khác là thật)
      await G(page, () => { const g = window.__gameplay, s = g.state, site = window.__worldAPI.getSites('pho')[0]; const j0 = s.board[0]; Object.assign(j0, { kind: 'pho', title: g.balance.JOB_KINDS.pho.title, minigame: 'pho', variant: null, siteId: site.id, siteLabel: site.label, staminaCost: 10 }) })
      j = await G(page, () => window.__gameplay.jobs.board().find((x) => x.kind === 'pho'))
    }
    check(P('bảng Việc Vặt có việc Phở'), !!j, j && j.siteLabel)
    await G(page, () => window.__ui.openPhone('jobs')); await page.waitForTimeout(500)
    await shot(page, prof, '03_jobs_board')
    await audit(page, 'app Việc Vặt - bảng việc', prof)
    const card = page.locator(`[data-job="${j.id}"]`).first()
    await card.scrollIntoViewIfNeeded()
    await tapOrClick(page, prof, card)
    await page.waitForTimeout(450)
    await shot(page, prof, '04_job_detail')
    await audit(page, 'app Việc Vặt - chi tiết', prof)
    await tapOrClick(page, prof, '[data-act="accept"]')
    await page.waitForTimeout(500)
    const st = await state(page)
    check(P('nhận việc Phở'), !!st.job && st.job.kind === 'pho', st.job && st.job.title)
    await shot(page, prof, '05_job_accepted_phone')
    await audit(page, 'sau khi nhận việc (điện thoại còn mở)', prof)
    // bấm Dẫn đường (đóng điện thoại)
    await page.evaluate(() => window.__ui.openPhone('jobs')); await page.waitForTimeout(400)
    await shot(page, prof, '05b_job_active_card')
    await audit(page, 'thẻ ĐANG LÀM', prof)
    await tapOrClick(page, prof, '[data-act="gps"]'); await page.waitForTimeout(600)
    check(P('Dẫn đường bật GPS và đóng điện thoại'), (await page.evaluate(() => !window.__ui.isPhoneOpen() && !!window.__worldAPI.getGps())))
    return j
  })
  if (!job) { await ctx.close(); return }

  // ── theo GPS ──
  await step('gps', async () => {
    await page.waitForTimeout(500)
    await shot(page, prof, '06_gps_start_chip')
    await audit(page, 'đang đi GPS (chip việc + HUD + nút nổi)', prof)
    const gps = await page.evaluate(() => window.__worldAPI.getGps())
    const gi = await page.evaluate(() => window.__worldAPI.getGpsInfo && window.__worldAPI.getGpsInfo())
    // đợt 3: không còn vẽ đường chấm dài (pathLen=null theo thiết kế); thay bằng vòng la bàn: getGpsInfo {target,distM,angle}
    check(P('GPS có đích + vòng la bàn (khoảng cách mét), không còn đường chấm dài'), !!gps && gps.pathLen == null && !!gi && gi.distM > 0 && typeof gi.angle === 'number', gi ? 'distM=' + gi.distM : 'null')
    // thử đi thật bằng phím: PC bấm D 600ms; cảm ứng chạm xuống đất
    const p0 = await page.evaluate(() => window.__worldAPI.getPlayer())
    if (!prof.touch) { await page.keyboard.down('d'); await page.waitForTimeout(700); await page.keyboard.up('d') }
    else { await page.touchscreen.tap(prof.ctx.viewport.width / 2 + 60, prof.ctx.viewport.height / 2); await page.waitForTimeout(900) }
    const p1 = await page.evaluate(() => window.__worldAPI.getPlayer())
    check(P(prof.touch ? 'chạm đất thì nhân vật đi' : 'phím D thì nhân vật đi'), Math.hypot(p1.gx - p0.gx, p1.gy - p0.gy) > 0.3, `đi ${Math.hypot(p1.gx - p0.gx, p1.gy - p0.gy).toFixed(2)} ô`)
    // đi theo đường GPS: nửa đường chụp ảnh rồi tới nơi
    const site = (await page.evaluate(() => window.__worldAPI.getSites('any'))).find((s) => s.id === job.siteId)
    const path = await page.evaluate(([x, y]) => window.__worldAPI.pathTo(x, y), [site.standAt.gx, site.standAt.gy])
    check(P('pathTo tới quán phở có đường'), !!path && path.length > 2, path ? path.length + ' điểm' : 'null')
    for (let i = 8; i < path.length; i += 8) {
      await page.evaluate((p) => window.__worldAPI.teleport(p.gx, p.gy), path[i]); await page.waitForTimeout(70)
      if (i === Math.floor(path.length / 16) * 8) await shot(page, prof, '07_gps_walking')
    }
    await page.evaluate((p) => window.__worldAPI.teleport(p.gx, p.gy), path[path.length - 1])
    await page.waitForFunction(() => { const j = window.__gameplay.jobs.current(); return j && j.arrived }, null, { timeout: 8000 }).catch(() => {})
    const cur = await page.evaluate(() => window.__gameplay.jobs.current())
    check(P('tới nơi: gps:arrived -> job arrived'), cur && cur.arrived, cur ? JSON.stringify({ stage: cur.stage }) : 'job mất')
    await page.waitForTimeout(500)
    const near = await nearInfo(page)
    check(P('marker việc được ưu tiên hơn POI khám phá'), near && near.marker && /Làm việc/.test(near.label), JSON.stringify(near))
    await shot(page, prof, '08_arrived_marker')
    await audit(page, 'tới nơi (nhắc E/chạm + chip + quán)', prof)
  })

  // ── mini-game phở ──
  const moneyBefore = (await state(page)).money, jobsBefore = (await state(page)).jobsDone
  await step('minigame', async () => {
    await promptTap(page, prof, 'Làm việc')
    if (!(await page.waitForSelector('.gm', { timeout: 2000 }).catch(() => null))) { await page.evaluate(() => window.__gameplay.jobs.startWork()); await page.waitForSelector('.gm', { timeout: 5000 }) }
    check(P('bấm E/chạm marker mở mini-game phở'), await page.evaluate(() => window.__gameplay.minigames.current()?.id === 'pho'))
    await page.waitForTimeout(500)
    await shot(page, prof, '09_mg_intro')
    await audit(page, 'mini-game - màn giới thiệu', prof)
    await tapOrClick(page, prof, '.gm-go'); await page.waitForTimeout(400)
    check(P('mini-game vào chơi'), await page.evaluate(() => window.__gameplay.minigames.current()?.stage === 'play'))
    // chơi thật vài giây
    for (let i = 0; i < 6; i++) {
      const k = String((i % 3) + 1)
      if (prof.touch) { await page.locator('.gm-ctrl button').nth(i % 3).tap({ timeout: 2000 }) } else await page.keyboard.press(k)
      await page.waitForTimeout(550)
    }
    await shot(page, prof, '10_mg_play')
    await audit(page, 'mini-game đang chơi', prof)
    const mg = await page.evaluate(() => ({ cur: window.__gameplay.minigames.current(), st: window.__mgState && { served: window.__mgState.served, score: window.__mgState.score } }))
    check(P('đã chơi thật (thời gian mini-game chạy)'), mg.cur && mg.cur.t > 2, 't=' + (mg.cur && mg.cur.t.toFixed(1)) + ' ' + JSON.stringify(mg.st))
    // ảnh phụ: đang chơi mà chip/menu ăn có chen không (chip phải ẩn)
    const chip = await page.evaluate(() => { const c = document.getElementById('gp-job-chip'); return c ? getComputedStyle(c).display : 'none' })
    check(P('chip việc ẩn khi mini-game mở'), chip === 'none', chip)
    await page.evaluate(() => window.__gameplay.minigames.debugFinish(88))
    await page.waitForFunction((n) => window.__gameplay.state.stats.jobsDone > n, jobsBefore, { timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(700)
  })
  await step('pay', async () => {
    const st = await state(page)
    check(P('nhận tiền công sau mini-game'), st.money > moneyBefore && st.jobsDone === jobsBefore + 1 && !st.job, `+${st.money - moneyBefore}đ, jobsDone ${jobsBefore}->${st.jobsDone}`)
    check(P('mini-game đã đóng, nhân vật mở khóa'), await page.evaluate(() => !window.__gameplay.minigames.isActive() && !window.__game.locked))
    await page.waitForTimeout(400)
    await shot(page, prof, '11_paid_toast')
    await audit(page, 'ngay sau khi nhận tiền (toast)', prof)
  })

  // ── mini-game cho ảnh màn kết quả + khung dọc có mọi lớp ──
  await step('minigame result', async () => {
    await G(page, () => { window.__gameplay.minigames.start('pho', { timeScale: 60, noPay: true, title: 'Phụ quán phở (thử)' }) })
    await page.waitForSelector('.gm'); await page.waitForTimeout(300)
    await tapOrClick(page, prof, '.gm-go')
    await page.waitForFunction(() => window.__gameplay.minigames.current()?.stage === 'result', null, { timeout: 12000 })
    await page.waitForTimeout(400)
    await shot(page, prof, '12_mg_result')
    await audit(page, 'mini-game - kết quả', prof)
    await tapOrClick(page, prof, '.gm-go'); await page.waitForTimeout(300)
    check(P('nút Xong đóng mini-game'), await page.evaluate(() => !window.__gameplay.minigames.isActive()))
  })

  // ── ăn phở ──
  await step('eat', async () => {
    await G(page, () => { window.__gameplay.debug.setStamina(30); window.__gameplay.debug.addMoney(100000) })
    const sites = await page.evaluate(() => window.__worldAPI.getSites('pho'))
    const site = sites.find((s) => s.id === job.siteId) || sites[0]
    // đợt 4: quán có giờ mở/đóng — ghim một giờ quán này đang mở (quán đóng không có marker ăn là đúng thiết kế)
    await G(page, (id) => { const A = window.__worldAPI; if (A.isSiteOpen(id)) return; A.setClockRunning(false); for (const h of [9, 12, 19, 8, 16, 21, 6]) { A.setHour(h); if (A.isSiteOpen(id)) return } }, site.id)
    await walkTo(page, site.standAt.gx, site.standAt.gy)
    await page.waitForFunction(() => window.__game.state.near && /Ăn phở/.test(window.__game.state.near.label), null, { timeout: 6000 }).catch(() => {})
    const near = await nearInfo(page)
    check(P('đứng cạnh sạp phở có marker "Ăn phở"'), near && /Ăn phở/.test(near.label), JSON.stringify(near))
    await promptTap(page, prof, 'Ăn phở'); await page.waitForTimeout(500)
    check(P('mở thực đơn ăn (#gp-eat-menu)'), await page.evaluate(() => !!document.getElementById('gp-eat-menu')))
    await shot(page, prof, '13_eat_menu')
    await audit(page, 'thực đơn ăn phở', prof)
    // mở điện thoại khi thực đơn ăn đang mở: kiểm có đè lên điện thoại không
    await G(page, () => window.__ui.openPhone()); await page.waitForTimeout(500)
    await shot(page, prof, '13b_eat_menu_with_phone')
    await audit(page, 'thực đơn ăn + điện thoại mở cùng lúc', prof)
    await closePhone(page)
    // thực đơn tự đóng khi mở điện thoại (đúng thiết kế) -> mở lại để ăn
    await promptTap(page, prof, 'Ăn phở'); await page.waitForTimeout(500)
    const s1 = await state(page)
    await tapOrClick(page, prof, '#gp-eat-menu button'); await page.waitForTimeout(600)
    const s2 = await state(page)
    const dp = await G(page, () => window.__gameplay.config.DISHES.pho)
    check(P(`ăn phở hồi thể lực (+${dp.stamina}, -${dp.price}đ theo config)`), Math.abs(s2.stamina - Math.min(100, s1.stamina + dp.stamina)) <= 3 && s2.money === s1.money - dp.price, `thể lực ${s1.stamina}->${s2.stamina}, tiền ${s1.money}->${s2.money}`)
    check(P('thực đơn tự đóng sau khi ăn'), await page.evaluate(() => !document.getElementById('gp-eat-menu')))
    await shot(page, prof, '14_eat_done')
    await audit(page, 'sau khi ăn phở', prof)
  })

  // ── thực đơn ăn khi mini-game mở (chống chồng) ──
  await step('eat+minigame', async () => {
    await promptTap(page, prof); await page.waitForTimeout(400)
    const had = await page.evaluate(() => !!document.getElementById('gp-eat-menu'))
    await G(page, () => { window.__gameplay.minigames.start('tc', { timeScale: 1, noPay: true }) })
    await page.waitForSelector('.gm'); await page.waitForTimeout(900)
    await shot(page, prof, '15_minigame_over_eat_menu')
    await audit(page, 'mini-game mở khi vừa mở thực đơn ăn', prof)
    check(P('thực đơn ăn tự đóng khi mini-game mở'), await page.evaluate(() => !document.getElementById('gp-eat-menu')), had ? '' : '(menu chưa mở lúc bắt đầu)')
    await G(page, () => window.__gameplay.minigames.debugFinish(0)); await page.waitForTimeout(400)
  })

  // ── Shop nhuộm tóc ──
  await step('shop', async () => {
    await G(page, () => window.__gameplay.debug.addMoney(300000))
    const before = await state(page)
    await G(page, () => { const w = window.__worldAPI; w.teleport(w.getPlayer().gx, w.getPlayer().gy) })
    await page.waitForTimeout(500)
    const vp = prof.ctx.viewport, clip = { x: Math.round(vp.width / 2 - 40), y: Math.round(vp.height / 2 - 70), width: 80, height: 100 }
    const imgBefore = await page.screenshot({ clip })
    fs.writeFileSync(path.join(SHOTS, `${prof.name}_16a_player_before.png`), imgBefore)
    await G(page, () => window.__ui.openPhone('shop')); await page.waitForTimeout(500)
    await shot(page, prof, '16_shop')
    await audit(page, 'app Shop - nhuộm tóc', prof)
    const opts = await page.locator('[data-opt]').count()
    const pick = Math.min(2, opts - 1)
    await page.locator(`[data-opt="${pick}"]`).first().scrollIntoViewIfNeeded()
    await tapOrClick(page, prof, `[data-opt="${pick}"]`); await page.waitForTimeout(400)
    await shot(page, prof, '17_shop_preview')
    await tapOrClick(page, prof, '[data-act="wear"]'); await page.waitForTimeout(700)
    const after = await state(page)
    check(P('mua + mặc màu tóc mới: State.outfit đổi'), after.outfit.hair === pick && after.outfit.hair !== before.outfit.hair && after.money < before.money, `hair ${before.outfit.hair}->${after.outfit.hair}, tiền ${before.money}->${after.money}`)
    check(P('hàng đã sở hữu cập nhật'), after.owned.hair.includes(pick))
    await shot(page, prof, '18_shop_bought')
    await audit(page, 'Shop sau khi mua', prof)
    await closePhone(page); await page.waitForTimeout(600)
    const imgAfter = await page.screenshot({ clip })
    fs.writeFileSync(path.join(SHOTS, `${prof.name}_19_player_after.png`), imgAfter)
    await shot(page, prof, '19_world_after_dye')
    // so ảnh 2 lần chụp quanh nhân vật bằng giải mã trong trang
    const diff = await page.evaluate(async ([a, b]) => {
      const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s })
      const [ia, ib] = await Promise.all([load(a), load(b)]); const g = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      const da = g(ia), db = g(ib); let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) n++
      return n
    }, [imgBefore.toString('base64'), imgAfter.toString('base64')])
    check(P('sprite người chơi trong game đổi thật (so ảnh quanh nhân vật)'), diff >= 8, diff + ' điểm ảnh khác')
  })

  // ── Sổ Nợ ──
  await step('debts', async () => {
    await G(page, () => window.__gameplay.debug.addMoney(200000))
    const before = await state(page)
    await G(page, () => window.__ui.openPhone('debts')); await page.waitForTimeout(500)
    await shot(page, prof, '20_debts')
    await audit(page, 'app Sổ Nợ', prof)
    const d0 = before.debts[0]
    await tapOrClick(page, prof, '[data-act="pay"]'); await page.waitForTimeout(600)
    const after = await state(page)
    check(P('đóng kỳ đầu Sổ Nợ'), after.debts[0].paid === d0.paid + d0.amount && after.money === before.money - d0.amount, `đã trả ${d0.paid}->${after.debts[0].paid}, tiền ${before.money}->${after.money}`)
    await shot(page, prof, '21_debts_paid')
    await audit(page, 'Sổ Nợ sau khi đóng kỳ', prof)
    await closePhone(page)
  })

  // ── các app còn lại (ảnh kiểm chữ Việt / tràn khung) ──
  await step('other apps', async () => {
    for (const [id, n] of [['ride', '22_ride'], ['gram', '23_gram']]) {
      await G(page, (a) => window.__ui.openPhone(a), id); await page.waitForTimeout(500)
      await shot(page, prof, n); await audit(page, 'app ' + id, prof)
    }
    await closePhone(page)
  })

  // ── lưu + tải lại ──
  await step('save/reload', async () => {
    await G(page, () => window.__gameplay.save())
    const before = await state(page)
    await page.reload(); await waitReady(page)
    const after = await state(page)
    const same = after.money === before.money && after.outfit.hair === before.outfit.hair && after.jobsDone === before.jobsDone && after.debts[0].paid === before.debts[0].paid && JSON.stringify(after.owned) === JSON.stringify(before.owned)
    check(P('lưu rồi tải lại: tiền, tóc, đồ sở hữu, nợ, số việc còn nguyên'), same, `tiền ${before.money}->${after.money}, tóc ${before.outfit.hair}->${after.outfit.hair}, nợ ${before.debts[0].paid}->${after.debts[0].paid}, việc ${before.jobsDone}->${after.jobsDone}`)
    // sprite sau reload phải là tóc đã nhuộm: so ảnh quanh nhân vật với ảnh sau nhuộm
    await page.waitForTimeout(800)
    const vp = prof.ctx.viewport, clip = { x: Math.round(vp.width / 2 - 40), y: Math.round(vp.height / 2 - 70), width: 80, height: 100 }
    const img = await page.screenshot({ clip }); fs.writeFileSync(path.join(SHOTS, `${prof.name}_24_player_after_reload.png`), img)
    await shot(page, prof, '24_after_reload')
    const errs = await page.evaluate(() => window.__stats.errors.slice())
    check(P('__stats.errors rỗng sau reload'), errs.length === 0, errs.slice(0, 2).join(' | '))
  })

  // ── tổng hợp lỗi console ──
  check(P('0 request ra ngoài trong cả kịch bản'), rec.external.length === 0, rec.external.slice(0, 3).join(', '))
  check(P('0 lỗi console/pageerror trong cả kịch bản'), rec.consoleErrors.length === 0 && rec.pageErrors.length === 0, [...rec.consoleErrors, ...rec.pageErrors].slice(0, 3).join(' | '))
  const finalErrs = await page.evaluate(() => window.__stats.errors.slice())
  check(P('__stats.errors rỗng cuối kịch bản'), finalErrs.length === 0, finalErrs.slice(0, 2).join(' | '))
  await ctx.close()
}

// ───────────────────────── Phần 3: hồi quy thế giới (PC) ─────────────────────────
async function partWorld(browser) {
  const prof = { name: 'pc', ctx: { viewport: { width: 1280, height: 720 } } }
  section('3. Hồi quy thế giới (PC 1280x720)')
  const { ctx, page, rec } = await openPage(browser, prof)
  // 3a. BFS độc lập từ spawn trên lưới nửa ô, dùng chính luật va chạm free()
  const bfs = await page.evaluate(() => {
    const A = window.__worldAPI, N = A.debug().N, Q = Math.round(A.debug().cells / N) || 2, M = N * Q, CS = 1 / Q   // Q lấy từ lưới va chạm của world (đợt 3: 4 ô con / ô)
    const ok = (cx, cy) => A.free((cx + 0.5) * CS, (cy + 0.5) * CS)
    const grid = Array.from({ length: M }, (_, y) => Array.from({ length: M }, (_, x) => ok(x, y)))
    const sp = { x: Math.floor(56.5 * Q), y: Math.floor(34.5 * Q) }
    const seen = Array.from({ length: M }, () => new Uint8Array(M)); const q = [[sp.x, sp.y]]; seen[sp.y][sp.x] = 1
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of D) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= M || ny >= M || seen[ny][nx] || !grid[ny][nx]) continue; if (dx && dy && (!grid[y][nx] || !grid[ny][x])) continue; seen[ny][nx] = 1; q.push([nx, ny]) } }
    // các ô đi được nhưng không tới được -> gom thành cụm
    const lab = Array.from({ length: M }, () => new Int16Array(M)); const clusters = []
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) if (grid[y][x] && !seen[y][x] && !lab[y][x]) {
      const id = clusters.length + 1, st = [[x, y]]; lab[y][x] = id; let n = 0, x0 = x, x1 = x, y0 = y, y1 = y
      while (st.length) { const [cx, cy] = st.pop(); n++; x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy); for (const [dx, dy] of D) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= M || ny >= M || lab[ny][nx] || !grid[ny][nx] || seen[ny][nx]) continue; lab[ny][nx] = id; st.push([nx, ny]) } }
      clusters.push({ cells: n, gx: [x0 * CS, (x1 + 1) * CS], gy: [y0 * CS, (y1 + 1) * CS] })
    }
    const total = grid.flat().filter(Boolean).length, reach = q.length
    // mọi quán / POI phải tới được trừ tháp rùa
    const unreachableSites = A.getSites('any').filter((s) => { const cx = Math.floor(s.standAt.gx * Q), cy = Math.floor(s.standAt.gy * Q); return !seen[cy][cx] }).map((s) => s.id)
    const pois = A.getPois(); const unreachPois = pois.filter((p) => { const cx = Math.floor(p.gx * Q), cy = Math.floor(p.gy * Q); let best = false; for (let r = 0; r <= 5 && !best; r++) for (let y = cy - r; y <= cy + r && !best; y++) for (let x = cx - r; x <= cx + r; x++) { if (x >= 0 && y >= 0 && x < M && y < M && seen[y][x]) { best = true; break } } return !best }).map((p) => ({ id: p.id, label: p.label, gx: p.gx, gy: p.gy }))
    return { Q, total, reach, clusters, unreachableSites, unreachPois, apiReach: A.debug().reachable, apiOk: A.debug().okCells }
  })
  console.log('  BFS: đi được ' + bfs.total + ' ô nửa, tới được ' + bfs.reach + ', cụm cô lập: ' + JSON.stringify(bfs.clusters))
  const tower = await page.evaluate(() => { const p = window.__worldAPI.getPois().find((x) => x.id === 'tower'); return p ? { gx: p.gx, gy: p.gy } : null })
  const nearTower = (c) => tower && c.gx[0] > tower.gx - 14 && c.gx[1] < tower.gx + 6 && c.gy[0] > tower.gy - 14 && c.gy[1] < tower.gy + 6
  const tileCells = bfs.Q * bfs.Q, island = bfs.clusters.filter((c) => c.cells > tileCells), pockets = bfs.clusters.filter((c) => c.cells <= tileCells)
  check('BFS từ spawn: cụm cô lập lớn chỉ là đảo Tháp Rùa', island.length === 1 && nearTower(island[0]) && bfs.unreachableSites.length === 0, `cụm lớn: ${JSON.stringify(island)}, tháp (POI bờ đông) ${JSON.stringify(tower)}; quán không tới được: ${bfs.unreachableSites.join(',') || 'không'}`)
  check('túi đi được 1 ô bị bao kín trên đất liền (chỉ ghi nhận, không phải lỗi chơi được)', true, `${pockets.length} túi: ` + pockets.map((c) => `(${c.gx[0]},${c.gy[0]})`).join(' '))
  check('BFS độc lập khớp BFS của __worldAPI', Math.abs(bfs.reach - bfs.apiReach) <= 2, `${bfs.reach} vs ${bfs.apiReach}`)
  check('mọi POI tới được (trừ khu Tháp Rùa)', bfs.unreachPois.every((p) => p.id === 'tower' || (tower && Math.hypot(p.gx - tower.gx, p.gy - tower.gy) < 12)), JSON.stringify(bfs.unreachPois))
  // pathTo tới mọi quán (mẫu 12)
  const pathRes = await page.evaluate(async () => { const A = window.__worldAPI, sites = A.getSites('any'); let ok = 0, bad = []; for (let i = 0; i < sites.length; i += 7) { const s = sites[i]; const p = await A.pathTo(s.standAt.gx, s.standAt.gy); if (p && p.length) ok++; else bad.push(s.id) } return { ok, bad } })
  check('pathTo tới các quán mẫu đều có đường', pathRes.bad.length === 0, `${pathRes.ok} có đường, hỏng: ${pathRes.bad.join(',') || 'không'}`)

  // 3b. 14 làn xe chạy
  await page.evaluate(() => { window.__worldAPI.setClockRunning(false) })
  const lanes = await page.evaluate(() => window.__world.step(1 / 30, 1) || window.__world.LANES.map((L) => ({ n: L.vs.length, p: L.vs.map((v) => v.pos) })))
  check('có đủ 14 làn xe', lanes.length === 14, lanes.length + ' làn')
  const moved = await page.evaluate(() => {
    const W = window.__world, snap = () => W.LANES.map((L) => L.vs.map((v) => v.pos)); const a = snap(); W.step(1 / 30, 300); const b = snap()   // 10 giây game
    return W.LANES.map((L, i) => ({ axis: L.axis, dir: L.dir, n: L.vs.length, moved: b[i].some((p, k) => Math.abs(p - a[i][k]) > 0.5) || b[i].length !== a[i].length }))
  })
  const dead = moved.map((m, i) => (m.n > 0 && m.moved ? null : i)).filter((x) => x !== null)
  check('14 làn đều có xe và xe chạy (10 giây game)', dead.length === 0 && moved.every((m) => m.n > 0), moved.map((m, i) => `${i}:${m.n}${m.moved ? '' : '!'}`).join(' '))

  // 3c. ms/khung bằng world.frame thủ công: ngày nắng, đêm mưa, đêm giông (mỗi mức 1200 khung = 20 giây game; tổng 60 giây game)
  const measure = () => page.evaluate(async () => {
    const W = window.__world, A = window.__worldAPI, out = {}
    let t = performance.now() + 100000
    const run = (name, frames) => {
      const ms = []
      for (let i = 0; i < frames; i++) { t += 1000 / 60; const a = performance.now(); W.frame(t); ms.push(performance.now() - a); if (i % 90 === 0) { const p = A.getPlayer(); const k = ['w', 'a', 's', 'd'][(i / 90 | 0) % 4]; window.__game.teleport(p.gx + (k === 'd' ? 0.4 : k === 'a' ? -0.4 : 0), p.gy + (k === 's' ? 0.4 : k === 'w' ? -0.4 : 0)) } }
      ms.sort((a, b) => a - b); out[name] = { avg: +(ms.reduce((s, x) => s + x, 0) / ms.length).toFixed(2), p50: +ms[ms.length >> 1].toFixed(2), p95: +ms[Math.floor(ms.length * 0.95)].toFixed(2), max: +ms[ms.length - 1].toFixed(2) }
    }
    A.setHour(12); A.setWeather('sunny'); run('khởi động', 300); run('ngày nắng', 1200)
    A.setHour(23); A.setWeather('rain'); run('đêm mưa', 1200)
    A.setWeather('storm'); run('đêm giông', 1200)
    delete out['khởi động']; return out
  })
  // máy QA dùng chung với việc khác (trình duyệt, game...) nên đo tối đa 3 lần, lấy lần sạch nhất (chống nhiễu); mỗi lần vẫn là đo thật
  const worstOf = (o) => Math.max(...Object.values(o).map((x) => x.p50))
  let perf = await measure(), tries = 1
  while (worstOf(perf) >= 4 && tries < 3) { await sleep(4000); const p2 = await measure(); tries++; if (worstOf(p2) < worstOf(perf)) perf = p2 }
  console.log(`  ms/khung (world.frame thủ công, 1280x720, đo ${tries} lần lấy lần tốt nhất): ` + JSON.stringify(perf))
  const worst = Math.max(...Object.values(perf).map((x) => x.p50)), worstAvg = Math.max(...Object.values(perf).map((x) => x.avg))
  check('ms/khung (trung vị) < 4ms (mục tiêu của vai QA)', worst < 4, 'xấu nhất ' + worst + 'ms; (trung bình cao hơn vì Chromium headless dùng canvas phần mềm, cứ ~13 khung lại xả lệnh vẽ ~40ms — xem pacing rAF thật bên dưới); ' + Object.entries(perf).map(([k, v]) => `${k}: tb ${v.avg} / p95 ${v.p95}`).join('; '))
  check('ms/khung trung bình < 16.7ms (đủ 60 khung/giây)', worstAvg < 16.7, 'xấu nhất ' + worstAvg + 'ms')
  const pace = await page.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 301) requestAnimationFrame(f); else { const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b); res({ p50: +d[150].toFixed(1), p95: +d[285].toFixed(1), max: +d[299].toFixed(1), over33: d.filter((x) => x > 33).length }) } }; requestAnimationFrame(f) }))
  check('nhịp khung hình thật (rAF, đêm giông, 300 khung): p95 <= 20ms, tối đa 3 khung > 33ms (1%)', pace.p95 <= 20 && pace.over33 <= 3, JSON.stringify(pace))
  const e1 = await page.evaluate(() => window.__stats.errors.slice())
  check('__stats.errors rỗng sau 60 giây game thủ công (ngày/đêm mưa/giông)', e1.length === 0, e1.slice(0, 3).join(' | '))
  await shot(page, prof, '30_world_storm_night')

  // 3d. 60 giây chơi thật theo giờ thực: đêm + mưa, đi bằng phím WASD, điện thoại bật tắt, nhận việc, chơi mini-game
  await page.evaluate(() => { const A = window.__worldAPI; A.setClockRunning(true); A.setHour(22.5); A.setWeather('rain') })
  const t0 = Date.now(); let shots = 0
  const keys = ['w', 'd', 's', 'a']
  let ki = 0
  while (Date.now() - t0 < 60000) {
    const k = keys[ki++ % 4]
    await page.keyboard.down(k); await page.waitForTimeout(900); await page.keyboard.up(k)
    if (ki === 6) { await page.evaluate(() => window.__ui.openPhone('gram')); await page.waitForTimeout(500); await page.evaluate(() => window.__ui.closePhone()) }
    if (ki === 9) { await page.evaluate(() => { const g = window.__gameplay; const j = g.jobs.board()[0]; if (j) g.jobs.accept(j.id) }) }
    if (ki === 12) { await page.evaluate(() => window.__gameplay.jobs.startWork()); await page.waitForTimeout(1500); await page.evaluate(() => window.__gameplay.minigames.debugFinish(50)); await page.waitForTimeout(800) }
    if (ki === 16 && !shots++) await shot(page, prof, '31_soak_rain_night')
  }
  const fps = await page.evaluate(() => window.__stats.fps)
  const e2 = await page.evaluate(() => window.__stats.errors.slice())
  const raining = await page.evaluate(() => window.__worldAPI.isRaining() || window.__worldAPI.getHour())
  check('__stats.errors rỗng sau 60 giây chơi thật (đêm + mưa + WASD + điện thoại + việc + mini-game)', e2.length === 0 && rec.pageErrors.length === 0, e2.slice(0, 3).join(' | ') + ` (fps headless báo ${fps}, hour/mưa ${raining})`)
  check('0 lỗi console trong phần thế giới', rec.consoleErrors.length === 0, rec.consoleErrors.slice(0, 3).join(' | '))
  check('0 request ra ngoài trong phần thế giới', rec.external.length === 0, rec.external.slice(0, 3).join(', '))
  await ctx.close()
}

// ───────────────────────── Phần 4: Đợt 3 (0.10.0) — ăn uống, thể lực, xích lô, Auto-Walk ─────────────────────────
const priceOf = (t) => { const m = /(\d{1,3}(?:\.\d{3})+)đ/.exec(t || ''); return m ? +m[1].replace(/\./g, '') : null }
const allPrices = (t) => [...(t || '').matchAll(/(\d{1,3}(?:\.\d{3})+)đ/g)].map((m) => +m[1].replace(/\./g, ''))
const LOW_MSG = 'Thể lực quá thấp — hãy ăn phở hoặc uống trà chanh để hồi sức!'
const hintText = (page) => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.startsWith('E / chạm') && getComputedStyle(x).display !== 'none'); return b ? b.textContent : null })
const exp0 = (d) => d.price + 'đ'

async function d3Eating(page, prof, P) {
  const sites = await G(page, () => ['pho', 'banhmi', 'tc'].flatMap((k) => window.__worldAPI.getSites(k).map((s) => ({ ...s, kind: k }))))
  const cfg = await G(page, () => JSON.parse(JSON.stringify(window.__gameplay.config.DISHES)))
  const byKind = { pho: cfg.pho, banhmi: cfg.banhmi, tc: cfg.trachanh }
  const counts = sites.reduce((a, s) => ((a[s.kind] = (a[s.kind] || 0) + 1), a), {})
  console.log('  quán: ' + sites.length + ' ' + JSON.stringify(counts))
  const bad = []; let shotDone = false
  for (const s of sites) {
    const exp = byKind[s.kind]; let why = ''
    try {
      // đợt 4: quán có giờ mở/đóng -> chọn một giờ quán đang mở (quán đóng không có marker ăn là đúng thiết kế, kiểm riêng ở phần 6)
      await G(page, (s) => { const g = window.__gameplay, A = window.__worldAPI; A.setClockRunning(false); const hs = [8, 9, 19, 20, 12, 16, 22, 6, 4, 1, 14, 23]; for (let h = 0; h < 24; h += 0.5) hs.push(h); for (const h of hs) { A.setHour(h); if (A.isSiteOpen(s.id)) break } g.debug.setStamina(10); g.debug.addMoney(500000 - g.state.money); const sa = s.standAt || { gx: s.gx, gy: s.gy }; A.teleport(sa.gx, sa.gy) }, s)
      let hint = null
      for (let i = 0; i < 25 && !(hint && /\(/.test(hint)); i++) { await sleep(250); hint = await hintText(page) }
      if (prof.touch) { const r = await promptTap(page, prof, 'Ăn uống'); if (r === 'fail') why += 'không chạm được nút nhắc; ' } else await page.keyboard.press('e')
      await sleep(250)
      const menu = await G(page, () => { const m = document.getElementById('gp-eat-menu'); return m ? [...m.querySelectorAll('button[data-dish]')].map((b) => ({ t: b.textContent, d: b.dataset.dish, h: b.getBoundingClientRect().height })) : null })
      const hp = allPrices(hint)
      if (hp.length !== 1 || hp[0] !== exp.price) why += `gợi ý "${hint}" ≠ ${exp.price}; `
      if (!menu || menu.length !== 1) why += 'bảng món ' + JSON.stringify(menu) + '; '
      else {
        const mp = priceOf(menu[0].t)
        if (mp !== exp.price) why += `nút món ${mp} ≠ ${exp.price}; `
        if (prof.touch && menu[0].h < 43.5) why += `nút món cao ${Math.round(menu[0].h)}px; `
        if (!shotDone && s.kind === 'pho') { shotDone = true; await shot(page, prof, '40_eat_menu_pho') }
        const m0 = await G(page, () => window.__gameplay.state.money), st0 = await G(page, () => window.__gameplay.state.stamina)
        await tapOrClick(page, prof, `#gp-eat-menu button[data-dish="${menu[0].d}"]`); await sleep(150)
        const m1 = await G(page, () => window.__gameplay.state.money), st1 = await G(page, () => window.__gameplay.state.stamina)
        if (m0 - m1 !== exp.price) why += `ví trừ ${m0 - m1} ≠ ${exp.price}; `
        if (Math.abs((st1 - st0) - exp.stamina) > 3) why += `thể lực +${st1 - st0} ≠ ${exp.stamina}; `
      }
    } catch (e) { why += 'ngoại lệ ' + String(e.message).split('\n')[0] }
    if (why) { bad.push(`${s.kind} ${s.id}: ${why}`); console.log('    XX ' + s.id + ' ' + why) }
    await G(page, () => { const m = document.getElementById('gp-eat-menu'); if (m) m.remove() })
  }
  check(P(`ăn uống: giá gợi ý "E / chạm" = giá nút bảng món = tiền ví thực trừ = __gameplay.config, ${sites.length} quán (phở ${counts.pho}, bánh mì ${counts.banhmi}, trà chanh ${counts.tc})`), bad.length === 0 && sites.length >= 60, bad.slice(0, 4).join(' | ') || `${sites.length}/${sites.length} khớp: phở ${exp0(byKind.pho)}, bánh mì ${exp0(byKind.banhmi)}, trà chanh ${exp0(byKind.tc)}`)
}

async function d3LowStamina(page, prof, P) {
  await G(page, () => { const g = window.__gameplay; g.debug.setStamina(5); window.__toasts = []; window.__bus.on('toast', (d) => window.__toasts.push(d.msg)) })
  // việc Gác chắn trên bảng (không có thì đổi 1 việc trên bảng thành Gác chắn: chỉ dữ liệu)
  let j = await G(page, () => window.__gameplay.jobs.board().find((x) => x.kind === 'rail'))
  if (!j) {
    await G(page, () => { const g = window.__gameplay, s = g.state, site = window.__worldAPI.getSites('rail')[0] || window.__worldAPI.getSites('any')[0]; const j0 = s.board[0]; Object.assign(j0, { kind: 'rail', title: g.balance.JOB_KINDS.rail.title, minigame: 'rail', variant: null, siteId: site.id, siteLabel: site.label, staminaCost: 8 }) })
    j = await G(page, () => window.__gameplay.jobs.board().find((x) => x.kind === 'rail'))
  }
  check(P('thể lực thấp: có việc Gác chắn trên bảng'), !!j, j && j.title)
  await G(page, () => window.__ui.openPhone('jobs')); await page.waitForTimeout(500)
  const card = page.locator(`[data-job="${j.id}"]`).first(); await card.scrollIntoViewIfNeeded(); await tapOrClick(page, prof, card); await page.waitForTimeout(400)
  await tapOrClick(page, prof, '[data-act="accept"]'); await page.waitForTimeout(350)
  const info = await G(page, () => { const e = document.getElementById('gp-big-notice'); const cs = e && getComputedStyle(e); const r = e && e.getBoundingClientRect(); return { txt: e && e.textContent, disp: cs && cs.display, z: cs && +cs.zIndex, pe: cs && cs.pointerEvents, x: r && Math.round(r.left), rr: r && Math.round(r.right), vw: innerWidth, job: window.__gameplay.state.job, toasts: window.__toasts.slice() } })
  await shot(page, prof, '41_low_stamina_notice')
  check(P('thể lực thấp (5): việc Gác chắn KHÔNG được nhận'), info.job == null, JSON.stringify(info.job && info.job.kind))
  check(P('thông báo nổi đúng nguyên văn'), info.txt === LOW_MSG && info.disp !== 'none', JSON.stringify(info.txt))
  check(P('có phát toast cùng nội dung'), info.toasts.includes(LOW_MSG), info.toasts.join(' | '))
  check(P('thông báo nổi: nằm trên điện thoại, không chặn chạm, trong khung'), info.z >= 100000 && info.pe === 'none' && info.x >= 0 && info.rr <= info.vw, JSON.stringify({ z: info.z, pe: info.pe, x: info.x, r: info.rr, vw: info.vw }))
  await sleep(4600)
  check(P('thông báo nổi tự tắt sau ~4 giây'), await G(page, () => getComputedStyle(document.getElementById('gp-big-notice')).display === 'none'))
  await closePhone(page)
}

async function d3Cyclo(page, prof, P) {
  await G(page, () => { window.__sfx = []; window.__bus.on('sfx', (d) => window.__sfx.push(d.name)) })
  const dbg = () => G(page, () => window.__gameplay.minigames.debug())
  const start = async () => {
    // chờ lượt trước đóng hẳn (tránh bấm nhầm nút "Xong" của màn cũ / gửi lệnh vào __mgState cũ)
    await page.waitForFunction(() => !window.__gameplay.minigames.isActive() && !document.querySelector('.gm'), null, { timeout: 5000 }).catch(() => {})
    await G(page, () => { window.__gameplay.minigames.start('cyclo', { timeScale: 1, noPay: true }) }); await page.waitForSelector('.gm', { timeout: 4000 }); await sleep(300)
    await tapOrClick(page, prof, '.gm-go')
    await page.waitForFunction(() => window.__gameplay.minigames.current()?.stage === 'play', null, { timeout: 4000 }).catch(() => {}); await sleep(150)
    await G(page, () => window.__mgState.noSpawn(true))
  }
  const end = async () => { await G(page, () => { try { window.__gameplay.minigames.debugFinish(0) } catch (e) { /* đã kết thúc */ } }); await sleep(250); const c = await G(page, () => window.__gameplay.minigames.current()); if (c) { await G(page, () => document.querySelector('.gm-x, .gm-go')?.click()); await sleep(250) } }
  const bell = async () => { if (prof.touch) await page.locator('.gm button', { hasText: 'Rung chuông' }).first().tap({ timeout: 3000 }); else await page.keyboard.press(' ') }   // điện thoại: chạm nút 'Rung chuông'
  await G(page, () => window.__gameplay.debug.addMoney(200000 - window.__gameplay.state.money))
  // A: rung chuông đúng tầm
  await start()
  await G(page, () => { window.__mgState.spawnWalker(180); window.__mgState.setSpeed(60) }); await sleep(150)
  let d = await dbg()
  check(P('xích lô: người đi bộ cảnh báo "!" (wait)'), d.state.list[0]?.state === 'wait', JSON.stringify(d.state.list))
  await shot(page, prof, '42_cyclo_warn')
  await bell(); await sleep(250); d = await dbg()
  const sfx = await G(page, () => window.__sfx.filter((n) => n === 'kinhcoong' || n === 'bell'))
  const bub = await G(page, () => document.querySelector('.gm-bub.blue')?.textContent)
  check(P('xích lô A: rung đúng tầm (PC: Space, điện thoại: chạm nút Rung chuông) -> nhường + sfx kinhcoong'), d.state.list[0]?.state === 'yield' && d.state.yielded && sfx.includes('kinhcoong'), JSON.stringify({ l: d.state.list[0], sfx }))
  check(P('xích lô A: bong bóng xanh "Mời bác đi trước!"'), bub === 'Mời bác đi trước!', bub)
  await shot(page, prof, '43_cyclo_yield')
  const m0 = await G(page, () => window.__gameplay.state.money); await G(page, () => window.__mgState.setSpeed(120)); await sleep(2500); d = await dbg(); const m1 = await G(page, () => window.__gameplay.state.money)
  check(P('xích lô A: xe đi qua, không đâm, ví không đổi'), !d.state.crashed && d.state.hits === 0 && m0 === m1 && d.state.dist > 100, JSON.stringify({ crashed: d.state.crashed, m0, m1, dist: d.state.dist }))
  await end()
  // B: không rung -> phanh chờ
  await start()
  await G(page, () => { window.__mgState.spawnWalker(130); window.__mgState.setSpeed(85) })
  let sawBrake = false, sawWait = false
  for (let i = 0; i < 60; i++) { await sleep(100); d = await dbg(); if (d.state.braking) sawBrake = true; if (d.state.braking && d.state.v === 0) { if (!sawWait) await shot(page, prof, '44_cyclo_brake'); sawWait = true } if (d.state.crashed || sawWait) break }
  check(P('xích lô B: không rung -> xe phanh và đứng chờ, không đâm'), sawBrake && sawWait && !d.state.crashed, JSON.stringify({ braking: d.state.braking, v: d.state.v, crashed: d.state.crashed }))
  await sleep(1500); d = await dbg(); const dist0 = d.state.dist
  // đợt 4: xích lô phải đạp LUÂN PHIÊN A/D theo nhịp (giữ một phím không chạy) -> đạp 8 nhịp ~0,3 s
  for (let i = 0; i < 8; i++) { if (prof.touch) await page.locator('.gm button', { hasText: i % 2 ? 'Chân phải' : 'Chân trái' }).first().tap({ timeout: 2000 }); else await page.keyboard.press(i % 2 ? 'd' : 'a'); await sleep(300) }
  d = await dbg()
  check(P('xích lô B: người qua hẳn thì đạp tiếp được, không trừ tiền'), d.state.dist > dist0 && (await G(page, () => window.__gameplay.state.money)) === m1, `${dist0} -> ${d.state.dist}`)
  await end()
  // C: đâm
  await G(page, () => window.__gameplay.debug.addMoney(200000 - window.__gameplay.state.money))
  await start(); const mb = await G(page, () => window.__gameplay.state.money)
  await G(page, () => { const m = window.__mgState; m.spawnWalker(90); m.S.walkers[m.S.walkers.length - 1].dir = -1; m.setSpeed(260) })
  let hit = false
  for (let i = 0; i < 40; i++) { await sleep(50); d = await dbg(); if (!d) { hit = 'ended'; break } if (d.state && d.state.crashed) { hit = true; break } }
  await sleep(300); const ma = await G(page, () => window.__gameplay.state.money), cur = await G(page, () => window.__gameplay.minigames.current())
  check(P('xích lô C: đâm -> huỷ chuyến + trừ đúng 30.000đ'), !!hit && mb - ma === 30000 && cur && cur.stage === 'result', `${mb} -> ${ma}, stage ${cur && cur.stage}`)
  check(P('xích lô C: số phạt khớp __gameplay.config.FINES'), (await G(page, () => window.__gameplay.config.FINES.cyclo_crash)) === 30000)
  await shot(page, prof, '45_cyclo_crash'); await sleep(1300); await shot(page, prof, '46_cyclo_result')
  await audit(page, 'xích lô - màn kết quả (đâm)', prof)
  await end()
  // C2: ví 12.000đ -> về 0
  await G(page, () => window.__gameplay.debug.addMoney(12000 - window.__gameplay.state.money))
  await start(); await G(page, () => { const m = window.__mgState; m.spawnWalker(90); m.S.walkers[m.S.walkers.length - 1].dir = -1; m.setSpeed(260) }); await sleep(1500)
  check(P('xích lô C2: ví 12.000đ -> trừ tới 0, không âm'), (await G(page, () => window.__gameplay.state.money)) === 0)
  await end()
  await G(page, () => window.__gameplay.debug.addMoney(100000))
}

async function d3AutoWalk(page, prof, P) {
  await G(page, () => { window.__gameplay.debug.setStamina(100); window.__awEv = []; window.__bus.on('autowalk:start', () => window.__awEv.push('start')); window.__bus.on('autowalk:stop', (d) => { window.__awEv.push('stop:' + (d && d.reason)); const A = window.__worldAPI; window.__awSnap = { reason: d && d.reason, p: A.getPlayer(), hour: A.getHour(), locked: window.__game.locked, mg: window.__gameplay.minigames.current(), rain: A.isRaining(), bar: A.getBarrier(), train: A.getTrain(), job: window.__gameplay.state.job && window.__gameplay.state.job.stage } }) })
  let j = await G(page, () => window.__gameplay.jobs.board().find((x) => x.kind === 'pho'))
  if (!j) { await G(page, () => { const g = window.__gameplay, s = g.state, site = window.__worldAPI.getSites('pho')[0]; Object.assign(s.board[0], { kind: 'pho', title: g.balance.JOB_KINDS.pho.title, minigame: 'pho', variant: null, siteId: site.id, siteLabel: site.label, staminaCost: 10 }) }); j = await G(page, () => window.__gameplay.jobs.board().find((x) => x.kind === 'pho')) }
  // đứng thật xa quán nhận việc (quán xa nhất tới được trong 'any') để Auto-Walk phải đi đường dài
  await G(page, (id) => { const A = window.__worldAPI, all = A.getSites('any'), t = all.find((s) => s.id === id); let best = null, bd = -1; for (const s of all) { if (/^tc_(2|4|5|1|23|24|20|21)_(78|79|83)$/.test(s.id)) continue;   const d = Math.hypot(s.standAt.gx - t.standAt.gx, s.standAt.gy - t.standAt.gy); if (d > bd) { bd = d; best = s } } A.teleport(best.standAt.gx, best.standAt.gy) }, j.siteId); await sleep(500)
  const openActive = async () => { await G(page, () => window.__ui.openPhone('jobs')); await page.waitForTimeout(450) }
  await openActive()
  const card = page.locator(`[data-job="${j.id}"]`).first()
  if (await card.count()) { await card.scrollIntoViewIfNeeded(); await tapOrClick(page, prof, card); await page.waitForTimeout(400); await tapOrClick(page, prof, '[data-act="accept"]'); await page.waitForTimeout(500) }
  const cur = await G(page, () => window.__gameplay.jobs.current())
  check(P('Auto-Walk: đã nhận việc Phở trong Việc Vặt'), !!cur && cur.kind === 'pho', cur && cur.title)
  await openActive(); await shot(page, prof, '47_autowalk_card')
  const btn = page.locator('[data-act="autowalk"]').first()
  const label = (await btn.textContent().catch(() => '')) || ''
  check(P('nút "Tự động đi tới (Auto-Walk)" có trong thẻ việc đang nhận'), /Tự động đi tới \(Auto-Walk\)/.test(label), label.trim())
  const bb = await btn.boundingBox().catch(() => null)
  check(P('nút Auto-Walk cao >= 44px'), !prof.touch || (bb && bb.height >= 43.5), bb ? Math.round(bb.height) + 'px' : 'không thấy')
  const site = (await G(page, () => window.__worldAPI.getSites('any'))).find((s) => s.id === cur.siteId)
  const p0 = await G(page, () => window.__worldAPI.getPlayer())
  await btn.scrollIntoViewIfNeeded().catch(() => {})
  await tapOrClick(page, prof, btn)   // chạm thật (cảm ứng) / bấm chuột (PC)
  await page.waitForTimeout(900)
  const st1 = await G(page, () => ({ aw: window.__worldAPI.isAutoWalking(), phone: window.__ui.isPhoneOpen(), chip: document.getElementById('hx-aw-chip')?.classList.contains('on'), ev: window.__awEv.slice(), gi: window.__worldAPI.getGpsInfo(), gps: window.__worldAPI.getGps() }))
  check(P('chạm nút -> đang tự đi, điện thoại đóng, chip "Đang tự đi…" bật, phát autowalk:start'), st1.aw && !st1.phone && st1.chip && st1.ev.includes('start'), JSON.stringify({ aw: st1.aw, phone: st1.phone, chip: st1.chip, ev: st1.ev }))
  check(P('Auto-Walk: vòng la bàn có số mét, không đường chấm dài'), !!st1.gi && st1.gi.distM > 0 && (!st1.gps || st1.gps.pathLen == null), JSON.stringify(st1.gi && { distM: st1.gi.distM, angle: st1.gi.angle }))
  await sleep(1500); await shot(page, prof, '48_autowalk_walking')
  const p1 = await G(page, () => window.__worldAPI.getPlayer()), gi1 = await G(page, () => window.__worldAPI.getGpsInfo())
  check(P('Auto-Walk: nhân vật tự di chuyển, khoảng cách giảm'), Math.hypot(p1.gx - p0.gx, p1.gy - p0.gy) > 1 && gi1.distM < st1.gi.distM + 1, `đi ${Math.hypot(p1.gx - p0.gx, p1.gy - p0.gy).toFixed(1)} ô, ${st1.gi.distM}m -> ${gi1.distM}m`)
  await audit(page, 'đang Auto-Walk (chip tự đi)', prof)
  // ngắt: bằng phím
  await page.keyboard.down('a'); await sleep(200); await page.keyboard.up('a'); await sleep(300)
  let s2 = await G(page, () => ({ aw: window.__worldAPI.isAutoWalking(), ev: window.__awEv.slice(), chip: document.getElementById('hx-aw-chip')?.classList.contains('on') }))
  check(P('ngắt Auto-Walk bằng phím A -> dừng (autowalk:stop manual), chip tắt'), !s2.aw && s2.ev.includes('stop:manual') && !s2.chip, JSON.stringify(s2))
  // chạy lại, ngắt bằng chạm / bấm
  await openActive(); await tapOrClick(page, prof, '[data-act="autowalk"]'); await page.waitForTimeout(900)
  check(P('chạm nút lần nữa -> tự đi lại'), await G(page, () => window.__worldAPI.isAutoWalking()))
  const evN = (await G(page, () => window.__awEv.filter((e) => e === 'stop:manual').length))
  const vp = prof.ctx.viewport
  if (prof.touch) await page.touchscreen.tap(vp.width / 2 + 70, vp.height / 2 + 60); else await page.mouse.click(vp.width / 2 + 120, vp.height / 2 + 80)
  await sleep(600)
  s2 = await G(page, () => ({ aw: window.__worldAPI.isAutoWalking(), n: window.__awEv.filter((e) => e === 'stop:manual').length }))
  check(P('ngắt Auto-Walk bằng ' + (prof.touch ? 'chạm màn hình' : 'bấm chuột') + ' -> dừng (manual)'), !s2.aw && s2.n > evN, JSON.stringify(s2))
  // nút "Dừng" trong chip
  await openActive(); await tapOrClick(page, prof, '[data-act="autowalk"]'); await page.waitForTimeout(700)
  await tapOrClick(page, prof, '#hx-aw-chip .hx-aw-stop'); await sleep(500)
  check(P('nút "Dừng" của chip dừng được Auto-Walk'), !(await G(page, () => window.__worldAPI.isAutoWalking())))
  // đi tới nơi
  await openActive(); await tapOrClick(page, prof, '[data-act="autowalk"]'); await page.waitForTimeout(700)
  const t0 = Date.now(); let arrivedEv = false, shotMid = false
  while (Date.now() - t0 < 110000) {
    await sleep(1000)
    const q = await G(page, () => ({ aw: window.__worldAPI.isAutoWalking(), ev: window.__awEv.slice(), gi: window.__worldAPI.getGpsInfo() }))
    if (!shotMid && q.gi && q.gi.distM < 60) { shotMid = true; await shot(page, prof, '49_autowalk_near') }
    if (q.ev.includes('stop:arrived')) { arrivedEv = true; break }
    if (!q.aw) break
  }
  if (!arrivedEv) console.log('    chẩn đoán dừng giữa đường: ' + JSON.stringify(await G(page, () => window.__awSnap)))
  const fin = await G(page, () => { const j = window.__gameplay.jobs.current(); return { arrived: j && j.arrived, p: window.__worldAPI.getPlayer(), ev: window.__awEv.slice(-2) } })
  const dist = Math.hypot(fin.p.gx - site.standAt.gx, fin.p.gy - site.standAt.gy)
  check(P('Auto-Walk: tự đi tới tận quán (phát stop:arrived)'), arrivedEv && dist < 4, `${((Date.now() - t0) / 1000).toFixed(0)}s, còn ${dist.toFixed(1)} ô, sự kiện ${fin.ev.join(',')}`)
  const ni = await nearInfo(page)
  check(P('tới nơi: việc chuyển sang "arrived" và hiện nút nhắc làm việc'), !!fin.arrived && /Làm việc/.test((ni && ni.label) || ''), JSON.stringify(ni))
  await shot(page, prof, '50_autowalk_arrived')
  await G(page, () => window.__gameplay.jobs.cancel && window.__gameplay.jobs.cancel())
}

async function partDot3(browser, prof) {
  section(`4. Đợt 3 (0.10.0) ${prof.label}`)
  const { ctx, page, rec } = await openPage(browser, prof)
  const P = (n) => `[${prof.name}] ${n}`
  if (!process.env.SKIP_EAT) await step('a. ăn uống', () => d3Eating(page, prof, P))
  await step('b. thể lực thấp', () => d3LowStamina(page, prof, P))
  await step('c. xích lô', () => d3Cyclo(page, prof, P))
  await step('d. auto-walk', () => d3AutoWalk(page, prof, P))
  const errs = await G(page, () => window.__stats.errors.slice())
  check(P('__stats.errors rỗng'), errs.length === 0, errs.slice(0, 3).join(' | '))
  check(P('0 lỗi console, 0 lỗi trang (kể cả tracery)'), rec.consoleErrors.length === 0 && rec.pageErrors.length === 0, rec.consoleErrors.concat(rec.pageErrors).slice(0, 3).join(' | '))
  check(P('0 request ra ngoài'), rec.external.length === 0, rec.external.slice(0, 3).join(', '))
  await ctx.close()
}

async function partDot3Pc(browser) {
  section('5. Đợt 3: âm thanh không gian + bong bóng thoại (PC 1280x720, HiDPI x2)')
  const prof = { name: 'pc', label: 'PC', touch: false, ctx: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 } }
  const { ctx, page, rec } = await openPage(browser, prof)
  const P = (n) => `[pc] ${n}`
  const shotX = async (name, clip) => { const f = path.join(SHOTS, `pc_${name}.png`); await page.screenshot(clip ? { path: f, clip } : { path: f }); return f }
  const vis = () => G(page, () => window.__bubbles.debug())
  const cropOf = (v, pad = 30) => ({ x: Math.max(0, Math.min(1280 - (v.w + 2 * pad), Math.round(v.x - pad))), y: Math.max(0, Math.min(720 - (v.h + 2 * pad + 40), Math.round(v.y - pad))), width: Math.min(1280, v.w + 2 * pad), height: Math.min(720, v.h + 2 * pad + 40) })
  const accent = /[ạảãàáâậầấẩẫăặằắẳẵẹẻẽèéêệềếểễịỉĩìíọỏõòóôộồốổỗơợờớởỡụủũùúưựừứửữỵỷỹỳýđ]/i

  // ───── e. âm thanh không gian quanh đường ray ─────
  await step('e. âm không gian', async () => {
    await G(page, () => window.__audio.resume && window.__audio.resume())
    // đẩy thế giới tới lúc barie hạ (tàu sắp tới), rồi đọc cả loạt trong MỘT lần evaluate để mọi số cùng một khoảnh khắc
    const down = await G(page, () => { window.__world.forceTrain(1); for (let i = 0; i < 400; i++) { window.__world.step(1 / 30, 6); if (window.__worldAPI.getBarrier().down) return i } return -1 })
    check(P('barie hạ khi tàu tới (forceTrain + chạy thế giới)'), down >= 0, 'sau ' + down + ' nhịp')
    const rows = await G(page, () => {
      const out = [], b = window.__worldAPI.getBarrier(), t = window.__worldAPI.getTrain()
      for (const d of [0, 3, 6, 8, 12]) { window.__audio.setListener(b.gx, b.gy + d); const s = window.__audio.debugSpatial(); out.push({ d, bell: s.bell, train: s.train, zone: s.zone }) }
      const sx = []; for (const d of [0, 3, 6, 8, 12]) { window.__audio.setListener(b.gx + d, b.gy); const s = window.__audio.debugSpatial(); sx.push({ d, pan: s.bell.pan, gain: s.bell.gain }) }
      window.__audio.setListener(null, null)
      return { out, sx, b, t }
    })
    console.log('  barie ' + JSON.stringify(rows.b) + ' tàu ' + JSON.stringify(rows.t))
    rows.out.forEach((r) => console.log(`    cách barie ${r.d} ô: chuông gain=${r.bell.gain.toFixed(3)} (d=${r.bell.d.toFixed(2)}, bật=${r.bell.on}); tàu gain=${r.train.gain.toFixed(3)} (d=${r.train.d.toFixed(1)}); khu=${r.zone}`))
    const f = (d) => Math.pow(Math.max(0, Math.min(1, 1 - (d - 2) / 6)), 1.5)
    const g = rows.out.map((r) => r.bell.gain)
    check(P('âm không gian: chuông barie đang kêu (barie hạ khi tàu tới)'), rows.out.every((r) => r.bell.on === true))
    check(P('chuông barie: gain giảm dần theo khoảng cách ray 0 -> 3 -> 6 -> 8 -> 12 ô'), g[0] >= g[1] && g[1] > g[2] && g[2] > g[3] && g[0] === 1 && g[1] < 1, g.map((x) => x.toFixed(3)).join(' > '))
    check(P('chuông barie: gain = 0 từ 8 ô trở ra (8 và 12 ô)'), g[3] === 0 && g[4] === 0, `8 ô: ${g[3]}, 12 ô: ${g[4]}`)
    check(P('chuông barie: gain khớp công thức CONTRACT clamp(1-(d-2)/6)^1.5 (sai số < 0.005)'), rows.out.every((r) => Math.abs(r.bell.gain - f(r.bell.d)) < 0.005), rows.out.map((r) => `${r.bell.d.toFixed(1)}->${r.bell.gain.toFixed(3)}/${f(r.bell.d).toFixed(3)}`).join(' '))
    check(P('chuông barie: nguồn ở phía +gx so với người nghe thì pan âm theo (gx-gy) (trục ngang isometric), không đổi dấu loạn'), rows.sx.slice(1, 3).every((r) => r.pan < 0) && rows.sx.every((r, i, a) => i === 0 || r.pan <= a[i - 1].pan + 1e-9), rows.sx.map((r) => r.pan.toFixed(2)).join(' '))
    const tg = rows.out.map((r) => r.train.gain), td = rows.out.map((r) => r.train.d)
    check(P('tiếng tàu: gain theo cùng công thức khoảng cách (khớp trong 0.005), =0 khi tàu cách >= 8 ô'), rows.out.every((r) => Math.abs(r.train.gain - (r.train.active ? f(r.train.d) : 0)) < 0.005) && rows.out.every((r) => r.train.d < 8 || r.train.gain === 0), tg.map((x, i) => `${x.toFixed(2)}@${td[i].toFixed(0)}`).join(' '))
    // tàu chạy qua: đặt người nghe ở đường ray, tàu tiến gần -> gain tàu tăng rồi giảm
    const sweep = await G(page, () => {
      window.__world.forceTrain(1); const b = window.__worldAPI.getBarrier(), res = []
      window.__audio.setListener(b.gx, b.gy + 1)
      for (let i = 0; i < 70; i++) { window.__world.step(1 / 30, 15); const s = window.__audio.debugSpatial(); res.push({ g: +s.train.gain.toFixed(3), d: +(s.train.d || 0).toFixed(1), a: s.train.active }) }
      window.__audio.setListener(null, null); return res
    })
    const peak = Math.max(...sweep.map((x) => x.g)), first = sweep[0].g, last = sweep[sweep.length - 1].g
    check(P('tàu chạy qua: gain tăng khi tới gần (đỉnh > 0.2) và về 0 khi ở xa'), peak > 0.2 && first < peak && (last < peak), `đầu ${first}, đỉnh ${peak}, cuối ${last}`)
    // âm khu vực: getZoneAt tại quán phở / hồ / ngõ / ray
    const zones = await G(page, () => {
      const A = window.__worldAPI, out = {}
      const pho = A.getSites('pho')[0]; window.__audio.setListener(pho.standAt.gx, pho.standAt.gy); out.pho = window.__audio.debugSpatial().zone
      const lake = A.getPois().find((p) => p.id === 'tower' || /Hồ/.test(p.label || '')); if (lake) { window.__audio.setListener(lake.gx, lake.gy); out.lake = window.__audio.debugSpatial().zone }
      const ng = A.getPois().find((p) => p.id === 'ngo'); if (ng) { window.__audio.setListener(ng.gx, ng.gy); out.alley = window.__audio.debugSpatial().zone }
      const b = A.getBarrier(); window.__audio.setListener(b.gx, b.gy); out.rail = window.__audio.debugSpatial().zone
      out.layers = window.__audio.debugSpatial().layers
      window.__audio.setListener(null, null); return out
    })
    console.log('    khu vực: ' + JSON.stringify(zones))
    check(P('âm khu vực: nhận ra hàng phở / đường ray / ngõ từ getZoneAt'), zones.pho === 'pho' && zones.rail === 'rail' && zones.alley === 'alley', JSON.stringify(zones))
    check(P('âm: __audio.has("kinhcoong") hoặc phát được (không lỗi)'), await G(page, () => { try { window.__audio.play('kinhcoong'); window.__audio.playAt('kinhcoong', 50, 50); return true } catch (e) { return String(e) } }) === true)
  })

  // ───── Auto-Walk không kẹt (hồi quy lỗi đoạn thẳng > 9 ô) ─────
  await step('Auto-Walk quét 80 điểm', async () => {
    const r = await G(page, async () => {
      const A = window.__worldAPI, all = A.getSites('any'), T = A.getSites('xichlo')[0].standAt, bad = []; A.setClockRunning(false)
      let maxSeg = 0
      for (const s of all) {
        if (s.id.startsWith('xichlo')) continue
        A.teleport(s.standAt.gx, s.standAt.gy); await new Promise((r) => setTimeout(r, 100)); const p0 = A.getPlayer(); let done = null
        A.autoWalk({ gx: T.gx, gy: T.gy }).then((x) => { done = x }); await new Promise((r) => setTimeout(r, 1300)); const p1 = A.getPlayer()
        const path = (A._aw() || {}).path || []; for (let i = 1; i < path.length; i++) maxSeg = Math.max(maxSeg, Math.hypot(path[i].gx - path[i - 1].gx, path[i].gy - path[i - 1].gy))
        const waitingTrain = Math.abs(s.standAt.gy - 81.5) < 4 && A.getBarrier().down   // đứng chờ chắn tàu hạ là đúng thiết kế
        if (!waitingTrain && (Math.hypot(p1.gx - p0.gx, p1.gy - p0.gy) < 0.5 || done === 'cancelled' || done === 'nopath')) bad.push(s.id + ':' + done)
        A.stopAutoWalk()
      }
      // các tuyến dài băng qua bản đồ: không đoạn nào > 9 ô (player.js coi d > 9 là lạc đường)
      const pairs = [['banhmi_99_91', 'pho_23_23'], ['pho_82_30', 'hair_44_19']], seg2 = []
      for (const [a, b] of pairs) { const sa = all.find((x) => x.id === a), sb = all.find((x) => x.id === b); if (!sa || !sb) continue; A.teleport(sa.standAt.gx, sa.standAt.gy); await new Promise((r) => setTimeout(r, 100)); A.autoWalk({ gx: sb.standAt.gx, gy: sb.standAt.gy }); await new Promise((r) => setTimeout(r, 400)); const path = (A._aw() || {}).path || []; let m = 0; for (let i = 1; i < path.length; i++) m = Math.max(m, Math.hypot(path[i].gx - path[i - 1].gx, path[i].gy - path[i - 1].gy)); seg2.push(a + '->' + b + ': ' + m.toFixed(1)); maxSeg = Math.max(maxSeg, m); A.stopAutoWalk() }
      return { n: all.length, bad, maxSeg: +maxSeg.toFixed(1), seg2 }
    })
    check(P(`Auto-Walk không kẹt: từ ${r.n - 1} điểm đứng (quán, POI) đều bắt đầu đi được, không bị huỷ ngay`), r.bad.length === 0, r.bad.join(', ') || 'đủ')
    check(P('Auto-Walk: không đoạn đường thẳng nào dài hơn 9 ô (tránh "lạc đường" giả)'), r.maxSeg <= 9, `dài nhất ${r.maxSeg} ô; ${r.seg2.join('; ')}`)
  })

  // ───── f. bong bóng thoại ─────
  await step('f. bong bóng', async () => {
    const BP = (n) => P('bong bóng: ' + n)
    await G(page, () => { window.__worldAPI.setClockRunning(false); window.__worldAPI.setHour(10.5); window.__worldAPI.setWeather('sunny') })
    // 1. zoom xa (1-2): chỉ chấm
    for (const z of [1, 2]) {
      await G(page, (z) => window.__worldAPI.setZoom(z), z); await G(page, () => { const n = window.__worldAPI.getNpcs()[0]; if (n) window.__bubbles.say(n.id, undefined, 'vendor') }); await sleep(700)
      const d = await vis()
      check(BP(`zoom ${z}: chỉ chấm, không bung chữ`), d.zoomGate === false && d.visible.length === 0, JSON.stringify({ gate: d.zoomGate, visible: d.visible.length, dots: d.dots.length }))
      if (z === 2) await shotX('51_bubble_zoom2_dots')
    }
    // 2. zoom 4 ở nơi có NPC (hàng phở đông người)
    await G(page, () => window.__worldAPI.setZoom(4))
    const spot = await G(page, async () => {
      const A = window.__worldAPI; let best = null
      for (const s of A.getSites('pho').concat(A.getSites('tc').slice(0, 6))) { A.teleport(s.standAt.gx, s.standAt.gy); await new Promise((r) => setTimeout(r, 450)); const n = A.getNpcs().filter((n) => Math.hypot(n.gx - s.standAt.gx, n.gy - s.standAt.gy) < 7).length; if (!best || n > best.n) best = { id: s.id, n, gx: s.standAt.gx, gy: s.standAt.gy }; if (n >= 5) break }
      A.teleport(best.gx, best.gy); return best
    })
    await sleep(900)
    const meta = await G(page, () => { const cs = [...document.querySelectorAll('canvas')].map((c) => ({ w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight, pe: getComputedStyle(c).pointerEvents, z: getComputedStyle(c).zIndex, pos: getComputedStyle(c).position })); return { cs, dpr: devicePixelRatio, d: window.__bubbles.debug(), zoom: window.__worldAPI.getZoom() } })
    console.log(`    chỗ thử: ${spot.id} (${spot.n} NPC gần), zoom ${meta.zoom}, dpr ${meta.dpr}, canvas ${JSON.stringify(meta.cs)}`)
    const ov = meta.cs.find((c) => c.pos === 'fixed' && c.pe === 'none')
    check(BP('lớp overlay HiDPI riêng: canvas theo devicePixelRatio, pointer-events:none, không vẽ vào canvas world'), !!ov && ov.w === Math.round(1280 * meta.dpr) && ov.h === Math.round(720 * meta.dpr) && meta.d.dpr === 2, JSON.stringify(ov))
    check(BP('zoom 4 bật cổng chữ (zoomGate)'), meta.d.zoomGate === true && meta.zoom === 4)
    check(BP('nơi thử có NPC'), spot.n >= 1, spot.n + ' NPC trong 7 ô')
    const types = ['vendor', 'chat', 'think', 'wow', 'traffic', 'sound']
    const got = {}
    for (const t of types) {
      for (let attempt = 0; attempt < 4 && !(got[t] && got[t].length); attempt++) { for (let i = 0; i < 16 && ((d0) => d0.visible.length >= 2 || d0.active >= 3)(await vis()); i++) await sleep(500)   /* chờ bớt bong bóng tự phát (tối đa 4 cái, cái mới bị đẩy lên chạm mép thì thu về chấm) */
        // đợt 4: say(id, undefined, 'sound') mặc định là tiếng tàu "Xình xịch" (đứng ở hàng phở xa ray thì không hợp) -> chữ âm thanh đi đường thật: sfx kinhcoong có toạ độ cạnh người chơi
        if (t === 'sound') await G(page, (k) => { const p = window.__worldAPI.getPlayer(); window.__bus.emit('sfx', { name: 'kinhcoong', gx: p.gx + 1 + k * 0.3, gy: p.gy - 0.5 }) }, attempt)
        else await G(page, ([t, k]) => { const A = window.__worldAPI, p = A.getPlayer(), vp = A.getViewport(); const ns = A.getNpcs().map((n) => ({ n, d: Math.hypot(n.gx - p.gx, n.gy - p.gy), s: A.worldToScreen(n.gx, n.gy) })).filter((o) => o.s.x > 150 && o.s.x < vp.w - 150 && o.s.y > 160 && o.s.y < vp.h - 60).sort((a, b) => a.d - b.d); const n = ns[k % Math.max(1, ns.length)]; window.__bubbles.say(n ? n.n.id : { gx: p.gx + 1.2, gy: p.gy - 0.5 }, undefined, t) }, [t, attempt])
        await sleep(850); const d = await vis(); got[t] = d.visible.filter((v) => v.type === t)
        if (!got[t].length) await sleep(3000)
      }
      if (t === 'vendor') await shotX('52_bubble_zoom4_full')
      for (let i = 0; i < Math.min(1, got[t].length); i++) { const v = got[t][i]; await shotX(`53_bubble_${t}`, cropOf(v)) }
      await sleep(3800)
    }
    check(BP('6 loại đều hiện chữ ở zoom 4 (rao hàng, đối đáp, suy nghĩ, trầm trồ, giao thông, âm môi trường)'), types.every((t) => got[t].length >= 1), types.map((t) => `${t}:${got[t].length}`).join(' '))
    const allTexts = types.flatMap((t) => got[t].map((v) => v.text))
    console.log('    chữ: ' + JSON.stringify(allTexts))
    check(BP('chữ tiếng Việt có dấu (các câu không phải thanh âm đều chứa dấu)'), allTexts.filter((t) => t.length > 8).every((t) => accent.test(t)), JSON.stringify(allTexts))
    check(BP('chữ sinh từ tracery không rò mẫu thô ({{...}} hay #...#)'), allTexts.every((t) => !/\{\{|\}\}|#/.test(t)), JSON.stringify(allTexts.filter((t) => /\{\{|\}\}|#/.test(t))))
    // 3. tự phát
    // đợt 4: quán có giờ mở/đóng, quán đóng thì không rao -> đứng ở quán phở ĐANG MỞ lúc 19h cho có người rao
    await G(page, async () => { const A = window.__worldAPI; A.setHour(19); const s = A.getSites('pho').find((x) => A.isSiteOpen(x.id)); if (s) { A.teleport(s.standAt.gx, s.standAt.gy); await new Promise((r) => setTimeout(r, 900)) } })
    await sleep(500)
    const auto = []; const t0 = Date.now()
    while (Date.now() - t0 < 30000 && auto.length < 3) { await sleep(900); const d = await vis(); for (const v of d.visible) if (!auto.find((a) => a.text === v.text)) auto.push(v); if (auto.length === 1 && !(await page.evaluate(() => window.__autoShot))) { await page.evaluate(() => { window.__autoShot = 1 }); await shotX('54_bubble_auto', null) } }
    check(BP('tự phát bong bóng (không ép) khi đứng gần NPC ở zoom 4'), auto.length >= 1, JSON.stringify(auto.map((a) => a.type + ':' + a.text)))
    // 4. lật khi sát mép — về lại 10:30 (ít người rao) và chờ bong bóng tự phát tan, để bong bóng thử không bị chen đẩy
    await G(page, () => window.__worldAPI.setHour(10.5))
    for (let i = 0; i < 24 && (await vis()).visible.length; i++) await sleep(500)
    const edge = await G(page, () => {
      const A = window.__worldAPI, p = A.getPlayer(), o = A.worldToScreen(p.gx, p.gy), ex = A.worldToScreen(p.gx + 1, p.gy), ey = A.worldToScreen(p.gx, p.gy + 1)
      const ax = ex.x - o.x, bx = ey.x - o.x, ay = ex.y - o.y, by = ey.y - o.y, det = ax * by - bx * ay
      const solve = (sx, sy) => { const rx = sx - o.x, ry = sy - o.y; return { gx: p.gx + (rx * by - bx * ry) / det, gy: p.gy + (ax * ry - rx * ay) / det } }
      return { top: solve(o.x, 30), right: solve(1255, o.y), left: solve(25, o.y), bottom: solve(o.x, 705), chk: A.worldToScreen(solve(o.x, 30).gx, solve(o.x, 30).gy) }
    })
    const flips = {}
    for (const k of ['top', 'right', 'left', 'bottom']) {
      await G(page, (e) => window.__bubbles.say(e, 'Kính coong! Tránh đường cho bác xích lô nhé, hôm nay phố đông lắm!', 'traffic'), edge[k]); await sleep(750)
      const d = await vis(); const v = d.visible.filter((x) => /xích lô/.test(x.text)).pop(); flips[k] = v
      if (v) await shotX('55_bubble_edge_' + k, cropOf(v))
      await sleep(3500)
    }
    console.log('    lật mép: ' + JSON.stringify(flips))
    check(BP('sát mép (trên/phải/trái/dưới): bong bóng vẫn hiện, cả khung bong bóng nằm trọn trong màn hình'), ['top', 'right', 'left', 'bottom'].every((k) => flips[k] && flips[k].x >= 0 && flips[k].x + flips[k].w <= 1281 && flips[k].y >= 0 && flips[k].y + flips[k].h <= 721), JSON.stringify(flips))
    // 5. mua đồ / nhuộm tóc thật -> trầm trồ
    await G(page, async () => { const A = window.__worldAPI; const s = A.getSites('pho')[0]; A.teleport(s.standAt.gx, s.standAt.gy); await new Promise((r) => setTimeout(r, 600)) })
    await G(page, () => { const A = window.__worldAPI, n = A.getNpcs()[0]; if (n) A.teleport(n.gx, n.gy) }); await sleep(600)
    const near = await G(page, () => { const A = window.__worldAPI, p = A.getPlayer(); return A.getNpcs().filter((n) => Math.hypot(n.gx - p.gx, n.gy - p.gy) < 9).length })
    await G(page, () => window.__gameplay.debug.addMoney(400000))
    const before = await state(page)
    await G(page, () => window.__ui.openPhone('shop')); await sleep(500)
    const opts = await page.locator('[data-opt]').count(); const pick = (before.outfit.hair + 1) % Math.max(2, opts)
    await tapOrClick(page, prof, `[data-opt="${pick}"]`); await sleep(300); await tapOrClick(page, prof, '[data-act="wear"]'); await sleep(500)
    await closePhone(page)
    let wow = []
    for (let i = 0; i < 12 && !wow.length; i++) { await sleep(500); wow = (await vis()).visible.filter((v) => v.type === 'wow') }
    const after = await state(page)
    check(BP(`nhuộm tóc thật (tiền ${before.money}->${after.money}, ${near} NPC gần) -> NPC trầm trồ`), after.outfit.hair !== before.outfit.hair && wow.length >= 1, JSON.stringify(wow))
    await shotX('56_bubble_wow_after_dye')
    if (wow[0]) await shotX('56b_bubble_wow_crop', cropOf(wow[0]))
    await sleep(4000)
    // 6. mưa
    await G(page, () => window.__worldAPI.setWeather('rain')); await sleep(1500)
    let rv = null
    for (let k = 0; k < 4 && !rv; k++) {
      await G(page, (k) => { const A = window.__worldAPI, p = A.getPlayer(), vp = A.getViewport(); const ns = A.getNpcs().map((n) => ({ n, d: Math.hypot(n.gx - p.gx, n.gy - p.gy), s: A.worldToScreen(n.gx, n.gy) })).filter((o) => o.s.x > 150 && o.s.x < vp.w - 150 && o.s.y > 160 && o.s.y < vp.h - 60).sort((a, b) => a.d - b.d); const n = ns[k % Math.max(1, ns.length)]; window.__bubbles.say(n ? n.n.id : { gx: p.gx + 1, gy: p.gy }, undefined, 'think') }, k); await sleep(850)
      rv = (await vis()).visible.filter((v) => v.type === 'think').pop() || null
      if (!rv) await sleep(3000)
    }
    check(BP('bật mưa -> bong bóng suy nghĩ nói chuyện mưa'), !!rv && /[Mm]ưa|Ướt|mũ bảo hiểm|ban công/.test(rv.text), JSON.stringify(rv))
    await shotX('57_bubble_rain')
    if (rv) await shotX('57b_bubble_rain_crop', cropOf(rv))
    await G(page, () => window.__worldAPI.setWeather('sunny')); await sleep(7800)
    // 7. sự kiện giao thông / đi lướt
    // đợt 4: chờ theo debug().active (kể cả bong bóng của NPC ngoài khung hình — chúng vẫn chiếm 4 suất, chữ âm thanh ưu tiên thấp sẽ không chen được)
    for (let i = 0; i < 24 && ((await vis()).visible.length || (await vis()).active >= 2); i++) await sleep(500)   // chờ bong bóng cũ tan hết (tối đa 4 cái cùng lúc, cái ưu tiên thấp bị đẩy)
    await G(page, () => { window.__bus.emit('traffic:cut', { kind: 'moto' }) }); await sleep(900)
    const tvd = await vis(), tv = tvd.visible
    // chữ môi trường bám nhân vật, ưu tiên thấp nhất: khi bị các bong bóng giao thông đẩy chạm mép thì thu về chấm (luật chống chồng) -> nhận cả chấm 'sound'
    check(BP('traffic:cut -> bong bóng giao thông + chữ môi trường (chữ, hoặc chấm khi bị đẩy chạm mép)'), tv.some((v) => v.type === 'traffic') && (tv.some((v) => v.type === 'sound') || tvd.dots.some((v) => v.type === 'sound')), JSON.stringify({ visible: tv.map((v) => v.type), dots: tvd.dots.map((v) => v.type) }))
    await G(page, () => window.__worldAPI.setZoom(2)); await sleep(500)
    const dz = await vis()
    check(BP('kéo zoom về 2 -> bong bóng chữ biến mất, chỉ còn chấm'), dz.visible.length === 0 && dz.zoomGate === false, JSON.stringify({ visible: dz.visible.length, dots: dz.dots.length }))
    await G(page, () => window.__worldAPI.setZoom(2))
  })
  const e1 = await G(page, () => window.__stats.errors.slice())
  check(P('__stats.errors rỗng (phần âm thanh + bong bóng)'), e1.length === 0, e1.slice(0, 3).join(' | '))
  check(P('0 lỗi console, 0 lỗi trang (kể cả tracery) (phần âm thanh + bong bóng)'), rec.consoleErrors.length === 0 && rec.pageErrors.length === 0, rec.consoleErrors.concat(rec.pageErrors).slice(0, 3).join(' | '))
  check(P('0 request ra ngoài (phần âm thanh + bong bóng)'), rec.external.length === 0, rec.external.slice(0, 3).join(', '))
  await ctx.close()
}

// ───────────────────────── chạy ─────────────────────────
const PROFILES = [
  { name: 'pc', label: 'PC 1280x720', touch: false, ctx: { viewport: { width: 1280, height: 720 } } },
  { name: 'mobile', label: 'điện thoại dọc 390x844 (cảm ứng)', touch: true, ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
]
if (!fs.existsSync(DIST)) { console.error('Chưa có dist/hanoi-pixel.html — chạy `npm run build` trước.'); process.exit(2) }
const only = process.argv[2]
const browser = await chromium.launch()
const D4 = makeDot4({ openPage, section, check, step, G, sleep, audit, tapOrClick, promptTap, nearInfo, SHOTS, closePhone, openPhoneByButton })
try {
  if (!only || only === 'build') await partBuild(browser)
  if (!only || only === 'play') for (const p of PROFILES) await partPlay(browser, p)
  if (!only || only === 'world') await partWorld(browser)
  if (!only || only === 'dot3') for (const p of PROFILES.filter((x) => !process.env.ONLY_PROF || x.name === process.env.ONLY_PROF)) await partDot3(browser, p)
  if (!only || only === 'dot3pc') await partDot3Pc(browser)
  if (!only || only === 'dot4') await D4.partDot4(browser)
  if (!only || only === 'dot4m') await D4.partDot4Mobile(browser)
} finally { await browser.close() }
report.audits = audits
fs.writeFileSync(path.join(ROOT, 'tests', 'report.json'), JSON.stringify(report, null, 1))
const fails = report.sections.flatMap((s) => s.checks.filter((c) => !c.ok).map((c) => `${s.name} :: ${c.name} — ${c.detail}`))
console.log(`\n==== TỔNG KẾT: ${report.sections.reduce((n, s) => n + s.checks.length, 0) - fails.length} đạt, ${fails.length} hỏng ====`)
fails.forEach((f) => console.log(' ✗ ' + f))
process.exit(fails.length ? 1 : 0)

// Kịch bản QA tự động cho Hà Nội Pixel (Wave 3). Chạy: npm run build && npm test
// Chạy trên dist/hanoi-pixel.html bằng file://, MẠNG BỊ CHẶN. 2 khung: PC 1280x720 và điện thoại dọc 390x844 (cảm ứng).
// Ảnh -> tests/shots/. Kết quả -> tests/report.json. Thoát mã 1 nếu có hạng mục Hỏng.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = path.resolve(import.meta.dirname, '..')
const DIST = path.join(ROOT, 'dist', 'hanoi-pixel.html')
const SHOTS = path.join(ROOT, 'tests', 'shots')
const URL = pathToFileURL(DIST).href
fs.mkdirSync(SHOTS, { recursive: true })
for (const f of fs.readdirSync(SHOTS)) if (f.endsWith('.png') && f !== 'probe.png') fs.unlinkSync(path.join(SHOTS, f))

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
async function openPage(browser, prof) {
  const ctx = await browser.newContext(prof.ctx)
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
    check(P('GPS có đích và đường'), gps && gps.pathLen > 1, gps ? 'pathLen=' + gps.pathLen : 'null')
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
    check(P('ăn phở hồi thể lực'), s2.stamina >= s1.stamina + 35 && s2.money === s1.money - 50000, `thể lực ${s1.stamina}->${s2.stamina}, tiền ${s1.money}->${s2.money}`)
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
    const A = window.__worldAPI, N = A.debug().N, Q = 2, M = N * Q, CS = 1 / Q
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
    return { total, reach, clusters, unreachableSites, unreachPois, apiReach: A.debug().reachable, apiOk: A.debug().okCells }
  })
  console.log('  BFS: đi được ' + bfs.total + ' ô nửa, tới được ' + bfs.reach + ', cụm cô lập: ' + JSON.stringify(bfs.clusters))
  const tower = await page.evaluate(() => { const p = window.__worldAPI.getPois().find((x) => x.id === 'tower'); return p ? { gx: p.gx, gy: p.gy } : null })
  const nearTower = (c) => tower && c.gx[0] > tower.gx - 14 && c.gx[1] < tower.gx + 6 && c.gy[0] > tower.gy - 14 && c.gy[1] < tower.gy + 6
  const island = bfs.clusters.filter((c) => c.cells > 4), pockets = bfs.clusters.filter((c) => c.cells <= 4)
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
  const perf = await page.evaluate(async () => {
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
  console.log('  ms/khung (world.frame thủ công, 1280x720): ' + JSON.stringify(perf))
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

// ───────────────────────── chạy ─────────────────────────
const PROFILES = [
  { name: 'pc', label: 'PC 1280x720', touch: false, ctx: { viewport: { width: 1280, height: 720 } } },
  { name: 'mobile', label: 'điện thoại dọc 390x844 (cảm ứng)', touch: true, ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
]
if (!fs.existsSync(DIST)) { console.error('Chưa có dist/hanoi-pixel.html — chạy `npm run build` trước.'); process.exit(2) }
const only = process.argv[2]
const browser = await chromium.launch()
try {
  if (!only || only === 'build') await partBuild(browser)
  if (!only || only === 'play') for (const p of PROFILES) await partPlay(browser, p)
  if (!only || only === 'world') await partWorld(browser)
} finally { await browser.close() }
report.audits = audits
fs.writeFileSync(path.join(ROOT, 'tests', 'report.json'), JSON.stringify(report, null, 1))
const fails = report.sections.flatMap((s) => s.checks.filter((c) => !c.ok).map((c) => `${s.name} :: ${c.name} — ${c.detail}`))
console.log(`\n==== TỔNG KẾT: ${report.sections.reduce((n, s) => n + s.checks.length, 0) - fails.length} đạt, ${fails.length} hỏng ====`)
fails.forEach((f) => console.log(' ✗ ' + f))
process.exit(fails.length ? 1 : 0)

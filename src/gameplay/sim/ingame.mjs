// Kiểm trong game: nhà / nghỉ / ngủ / trả góp qua đêm / quán đóng / chụp ảnh 2 khung
import { createRequire } from 'module'
const require = createRequire('C:/opensource/game/package.json')
const { chromium } = require('playwright')
const OUT = 'C:/opensource/game/tests/tmp/gameplay_shots/'
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true })
const results = []
const check = (name, ok, extra = '') => { results.push([ok ? 'OK ' : 'XX ', name, extra]); console.log((ok ? 'OK  ' : 'XX  ') + name + (extra ? '  — ' + extra : '')) }
const b = await chromium.launch()
for (const prof of [{ name: 'pc', vp: { width: 1280, height: 720 }, touch: false }, { name: 'mb', vp: { width: 390, height: 844 }, touch: true, dpr: 2 }]) {
  const ctx = await b.newContext({ viewport: prof.vp, hasTouch: prof.touch, isMobile: prof.touch, deviceScaleFactor: prof.dpr || 1 })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e))
  await page.goto('http://localhost:8803/')
  await page.waitForFunction(() => window.__worldAPI && window.__gameplay && window.__ready, null, { timeout: 40000 })
  await page.evaluate(() => { window.__gameplay.reset({ backup: false }); window.__worldAPI.setClockRunning?.(false) })
  await page.waitForTimeout(800)
  const P = (s) => `[${prof.name}] ${s}`
  const shot = (n) => page.screenshot({ path: OUT + `${prof.name}_${n}.png` })

  // ── kinh tế ──
  const econ = await page.evaluate(() => { const g = window.__gameplay; return { board: g.jobs.board().map((j) => [j.kind, j.pay, j.payMin, j.payMax]), stam: g.config.STAMINA_COST, rest: g.config.REST } })
  check(P('bảng việc hiện tiền theo đường cong mới (khoảng ~63k cho 70 điểm)'), econ.board.length > 0 && econ.board.every((r) => r[1] >= 55000 && r[1] <= 75000 && r[3] <= 110000), JSON.stringify(econ.board))

  // ── nhà ──
  const home = await page.evaluate(() => window.__gameplay.home())
  check(P('có nhà (site home hoặc dự phòng)'), !!home, JSON.stringify(home && { gx: home.gx, gy: home.gy, fallback: home.fallback, label: home.label }))
  await page.evaluate((h) => { window.__worldAPI.teleport(h.standAt ? h.standAt.gx : h.gx, h.standAt ? h.standAt.gy : h.gy); window.__worldAPI.setHour(21.5); window.__gameplay.debug.setStamina(42) }, home)
  await page.waitForTimeout(900)
  await shot('01_home_prompt')
  if (prof.touch) { const el = await page.$('text=/Về phòng trọ/'); if (el) await el.tap().catch(() => {}); else await page.keyboard.press('e') } else await page.keyboard.press('e')
  await page.waitForTimeout(400)
  let menu = await page.$('#gp-home-menu')
  if (!menu) { await page.keyboard.press('e'); await page.waitForTimeout(400); menu = await page.$('#gp-home-menu') }
  check(P('bấm E / chạm ở cửa mở bảng Nghỉ / Ngủ'), !!menu, menu ? (await menu.innerText()).replace(/\n/g, ' | ') : '')
  await shot('02_home_menu')

  // nghỉ 1 tiếng
  const h0 = await page.evaluate(() => window.__worldAPI.getHour())
  const nap = await page.evaluate(() => window.__gameplay.rest('nap', { fast: true }))
  const h1 = await page.evaluate(() => window.__worldAPI.getHour())
  check(P('Nghỉ 1 tiếng: +25 thể lực, +1 giờ'), nap.ok && Math.abs(nap.stamina - 65) <= 1 && Math.abs(((h1 - h0 + 24) % 24) - 1) < 0.05, JSON.stringify(nap) + ` giờ ${h0.toFixed(2)}→${h1.toFixed(2)}`)
  const nap2 = await page.evaluate(() => window.__gameplay.rest('nap', { fast: true }))
  check(P('Nghỉ liền lần 2 bị chặn (cách nhau 3 giờ)'), !nap2.ok, nap2.reason)

  // có việc -> không ngủ; nghỉ thì tùy hạn
  await page.evaluate(() => { const g = window.__gameplay; g.jobs.refresh(); const j = g.jobs.board()[0]; g.debug.setStamina(90); g.jobs.accept(j.id) })
  const sl1 = await page.evaluate(() => window.__gameplay.rest('sleep', { fast: true }))
  check(P('Đang có việc: không cho ngủ, báo rõ'), !sl1.ok && /Đang có việc/.test(sl1.reason), sl1.reason)
  await page.evaluate(() => { document.querySelector('#gp-home-menu')?.remove() })
  await page.evaluate((h) => window.__worldAPI.teleport(h.gx, h.gy), home); await page.keyboard.press('e'); await page.waitForTimeout(350)
  await shot('03_home_menu_job')
  // việc sắp hết hạn -> không nghỉ được
  await page.evaluate(() => { const s = window.__gameplay.state; s.job.deadlineAbs = (s.day - 1) * 24 + s.hour + 1.2; s.flags.lastNapAbs = -99; s.flags.napCount = 0; window.__gameplay.debug.setStamina(50) })
  const napLate = await page.evaluate(() => window.__gameplay.rest('nap', { fast: true }))
  check(P('Có việc, nghỉ xong lố hạn: chặn nghỉ'), !napLate.ok && /lố hạn/.test(napLate.reason), napLate.reason)
  await page.evaluate(() => window.__gameplay.jobs.cancel())

  // trả góp: khoản tới hạn hôm nay chưa trả, ngủ qua đêm -> trễ kỳ khi dậy
  await page.evaluate(() => { const s = window.__gameplay.state; s.debts[0].nextDay = s.day; s.debts[0].late = 0; window.__worldAPI.setHour(22.4); window.__gameplay.debug.setStamina(30); window.__gameplay.debug.setMood(60) })
  const st = await page.evaluate(() => window.__gameplay.home())
  check(P('Bảng cảnh báo khoản hạn hôm nay trước khi ngủ'), st.dueWarn.length === 1, JSON.stringify(st.dueWarn))
  const day0 = await page.evaluate(() => window.__worldAPI.getDay())
  // chụp màn tối dần "Ngủ ngon…"
  const pr = page.evaluate(() => window.__gameplay.rest('sleep'))
  await page.waitForTimeout(1500); await shot('04_sleep_veil')
  const sl = await pr
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => { const g = window.__gameplay, s = g.state; return { day: window.__worldAPI.getDay(), sday: s.day, hour: window.__worldAPI.getHour(), stamina: s.stamina, mood: s.mood, late: s.debts[0].late, saved: JSON.parse(localStorage.getItem('hanoi-pixel-save-v1')).day } })
  check(P('Ngủ: sang ngày mới, 6:00, đầy thể lực, lưu game'), sl.ok && after.day === day0 + 1 && after.sday === after.day && Math.abs(after.hour - 6) < 0.05 && after.stamina === 100 && after.saved === after.day, JSON.stringify(sl) + ' ' + JSON.stringify(after))
  check(P('Trả góp hạn hôm qua chưa trả -> trễ kỳ 1 ngày (tâm trạng -8 rồi +6 ngủ)'), after.late === 1 && after.mood === 58, `late=${after.late} mood=${after.mood}`)
  const sl2 = await page.evaluate(() => { window.__worldAPI.setHour(5.5); return window.__gameplay.rest('sleep', { fast: true }) })
  check(P('5:30 sáng: không cho ngủ (sắp sáng)'), !sl2.ok, sl2.reason)

  // ── quán đóng cửa ──
  const closed = await page.evaluate(async () => {
    const w = window.__worldAPI, orig = w.getSites, origOpen = w.isSiteOpen
    const pho = orig('pho')[0]
    w.teleport(pho.standAt.gx, pho.standAt.gy)
    await new Promise((r) => setTimeout(r, 900))
    const before = !!document.querySelector('#gp-eat-menu') || true
    const markersOpen = w.debug().markers
    // giả lập: mọi quán phở đóng cửa
    w.getSites = (k) => orig(k).map((s) => (s.kind === 'pho' ? { ...s, open: false } : s))
    w.isSiteOpen = (id) => !String(id).startsWith('pho')
    await new Promise((r) => setTimeout(r, 900))
    const markersClosed = w.debug().markers
    const g = window.__gameplay; g.state.board = []; g.jobs.refresh()
    const boardPho = g.jobs.board().filter((j) => String(j.siteId).startsWith('pho')).length
    w.getSites = orig; if (origOpen) w.isSiteOpen = origOpen; else delete w.isSiteOpen
    await new Promise((r) => setTimeout(r, 900))
    return { markersOpen, markersClosed, boardPho, markersAfter: w.debug().markers }
  })
  check(P('Quán đóng: bỏ marker ăn + bảng việc không có việc ở quán đóng'), closed.markersClosed < closed.markersOpen && closed.boardPho === 0 && closed.markersAfter === closed.markersOpen, JSON.stringify(closed))

  // ── mini-game ảnh ──
  await page.evaluate(() => { window.__gameplay.minigames.start('rail', { title: 'Gác chắn đường tàu' }) })
  await page.waitForTimeout(500); await shot('05_rail_intro')
  await page.keyboard.press('Enter'); await page.waitForTimeout(4200); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(2600); await shot('06_rail_play')
  await page.evaluate(() => window.__gameplay.minigames.debugFinish(77)); await page.waitForTimeout(300)
  await page.evaluate(() => { window.__gameplay.minigames.start('cyclo', {}) }); await page.waitForTimeout(400)
  await page.keyboard.press('Enter')
  for (let i = 0; i < 18; i++) { await page.keyboard.press(i % 2 ? 'd' : 'a'); await page.waitForTimeout(300) }
  await shot('07_cyclo_play')
  // kết thúc tự nhiên nhanh để thấy màn kết quả có điểm + tiền mới
  await page.evaluate(() => { const st = window.__mgState; if (st) { st.S.dist = 1500; st.S.met = 4; st.S.yields = 3 } })
  await page.evaluate(() => window.__gameplay.minigames.debugFinish(undefined))
  await page.waitForTimeout(200)
  await page.evaluate(() => { window.__gameplay.minigames.start('pho', { title: 'Phụ quán phở' }) }); await page.waitForTimeout(400)
  await page.keyboard.press('Enter'); await page.waitForTimeout(3000); await page.keyboard.press('1'); await page.waitForTimeout(1500)
  await shot('08_pho_play')
  await page.waitForTimeout(100)
  const res = await page.evaluate(async () => { const g = window.__gameplay; const p = new Promise((r) => { const off = (d) => r(d) ; window.__bus_end = off }); return g.minigames.debug() })
  check(P('mini-game chạy, đọc debug được'), !!res, JSON.stringify(res && { id: res.id, stage: res.stage }))
  // để mini-game tự kết thúc với timeScale lớn để thấy màn kết quả thật
  await page.evaluate(() => window.__gameplay.minigames.debugFinish(0)); await page.waitForTimeout(200)
  const p2 = page.evaluate(() => window.__gameplay.minigames.start('ship', { timeScale: 12 }))
  await page.waitForTimeout(300); await page.keyboard.press('Enter'); for (let i = 0; i < 6; i++) { await page.keyboard.press(' '); await page.waitForTimeout(120) }
  const shipRes = await p2
  await page.waitForTimeout(300); await shot('09_ship_result_spam')
  check(P('Shipper bấm Space loạn -> điểm thấp'), shipRes.score <= 40, JSON.stringify(shipRes))
  await page.keyboard.press('Enter'); await page.waitForTimeout(300)

  // đo quãng đi bộ giữa các điểm việc (để đặt hạn việc)
  if (prof.name === 'pc') {
    const tr = await page.evaluate(async () => {
      const w = window.__worldAPI, sites = ['pho', 'banhmi', 'tc', 'rail', 'xichlo'].flatMap((k) => w.getSites(k))
      const L = []
      for (let i = 0; i < 24; i++) { const a = sites[Math.floor(Math.random() * sites.length)], c = sites[Math.floor(Math.random() * sites.length)]; w.teleport(a.standAt.gx, a.standAt.gy); const p = await w.pathTo(c.standAt.gx, c.standAt.gy); if (p) { let d = 0; for (let k = 1; k < p.length; k++) d += Math.hypot(p[k].gx - p[k - 1].gx, p[k].gy - p[k - 1].gy); L.push(d) } }
      L.sort((x, y) => x - y); return { n: L.length, median: L[Math.floor(L.length / 2)], max: L[L.length - 1] }
    })
    check(P('đo đường đi bộ giữa 2 điểm việc ngẫu nhiên (ô)'), true, `trung vị ${tr.median?.toFixed(0)} ô = ${(tr.median / 3.4).toFixed(0)}s · xa nhất ${tr.max?.toFixed(0)} ô = ${(tr.max / 3.4).toFixed(0)}s`)
  }
  const relevant = errs.filter((e) => !/tracery/i.test(e))
  check(P('console: 0 lỗi (ngoài tracery của khối UI)'), relevant.length === 0, `${errs.length} lỗi tổng; ` + errs.slice(0, 4).join(' || '))
  await ctx.close()
}
await b.close()

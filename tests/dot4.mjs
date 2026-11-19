// Đợt 4 (0.11.0) — kịch bản QA mới, gọi từ tests/run.mjs (phần 'dot4' và 'dot4m'). Ảnh: tests/shots/q4_*.png
// Phạm vi: âm lượng tổng + limiter, ngày 1000 giây, nhà + nghỉ/ngủ, va chạm vật nhỏ, zoom mượt, quán mở/đóng,
// mini-game (tiền công theo điểm, gác chắn 6 tàu, xích lô 3 nhánh), ánh sáng/nhịp phố, bong bóng, hồi quy.
import path from 'node:path'

export function makeDot4(H) {
  const { openPage, section, check, step, G, sleep, audit, tapOrClick, promptTap, nearInfo, SHOTS } = H
  const qshot = async (page, prof, name, opt = {}) => { const f = path.join(SHOTS, `q4_${prof.name}_${name}.png`); await page.screenshot({ path: f, ...opt }); return f }
  // hằng số bố cục từ src/world/world.js (window.__world không lộ ra): phố tàu RAILC=[78,84], ray y=81, hàng rào phía bắc y=80 (yF=[RS+1,RN]=[80,83]), khối hồ
  const GEO = { RAILC: [78, 84], RAIL_Y: 81, FENCE_N: 80, FENCE_S: 83, LAKE: { x0: 38, y0: 38, x1: 62, y1: 64 } }

  // ───────────── a. âm thanh: tình huống xấu nhất qua limiter ─────────────
  async function audioWorst(page, prof, P) {
    // mở khoá âm bằng cú bấm thật (chính sách trình duyệt), rồi chồng mọi nguồn to nhất cùng lúc
    const vp = prof.ctx.viewport
    if (prof.touch) await page.touchscreen.tap(vp.width / 2, vp.height / 2 + 40); else await page.mouse.click(vp.width / 2 + 40, vp.height / 2 + 40)
    await sleep(600)
    const st0 = await G(page, () => { window.__audio.resume(); return window.__audio.state() })
    await sleep(300)
    await G(page, async (GEO) => {
      const A = window.__worldAPI, W = window.__world, au = window.__audio
      au.musicOn(true); A.setWeather('storm'); window.__bus.emit('weather', { rain: true, storm: true })
      // đứng sát barie (vỉa hè phía bắc phố tàu) và gọi tàu: barie hạ -> chuông + tiếng tàu ầm ầm tới gần
      const b = A.getBarrier(); A.teleport(b.gx, GEO.RAILC[0] + 0.6)
      // tàu vào từ mép bản đồ: chạy nhanh thế giới tới lúc barie cạnh người chơi hạ và tàu còn cách ~14 ô, rồi mới đo theo thời gian thật
      W.forceTrain(1)
      for (let i = 0; i < 3000; i++) { W.step(1 / 30, 2); const t = A.getTrain(), bb = A.getBarrier(); if (bb.down && t.active && b.gx - t.gx > 3 && b.gx - t.gx < 14) break }   // forceTrain(1): tàu chạy chiều +gx
      A.teleport(b.gx, GEO.RAILC[0] + 0.6)
    }, GEO)
    // meter(true) của audio lấy mẫu 50 ms một lần với cửa sổ 2048 mẫu (~43 ms) -> hở ~15%. QA thêm vòng đọc meter() 15 ms/lần để phủ kín đỉnh sấm
    await G(page, () => { window.__audio.meter(true); window.__qaPk = -200; window.__qaN = 0; window.__qaT = setInterval(() => { const m = window.__audio.meter(); if (m) { window.__qaPk = Math.max(window.__qaPk, m.peakDb); window.__qaN++ } }, 15) })
    const t0 = Date.now(); let k = 0, gMax = { bell: 0, train: 0 }
    while (Date.now() - t0 < 9000) {
      const sp = await G(page, (k) => {
        const bus = window.__bus, g = window.__gameplay
        if (k % 3 === 0) bus.emit('sfx', { name: 'thunder', vol: 1.5 })              // sấm gần (thang cũ của world)
        if (k % 2 === 0) bus.emit('sfx', { name: 'sizzle' })                          // chảo phở
        if (k % 4 === 1) { g.debug.addMoney(60000); g.eat('pho') }                    // ăn phở thật (coin + sizzle + toast)
        if (k % 5 === 2) bus.emit('sfx', { name: 'horn' })
        if (k % 6 === 3) bus.emit('sfx', { name: 'bell' })
        const d = window.__audio.debugSpatial(); return { bell: (d.bell && d.bell.gain) || 0, train: (d.train && d.train.gain) || 0 }
      }, k++)
      gMax.bell = Math.max(gMax.bell, sp.bell); gMax.train = Math.max(gMax.train, sp.train)
      await sleep(450)
    }
    const rep = await G(page, () => ({ qa: (clearInterval(window.__qaT), { peakDb: window.__qaPk, n: window.__qaN }), m: window.__audio.meter(false), st: window.__audio.state(), now: window.__audio.meter(), sp: window.__audio.debugSpatial(), train: window.__worldAPI.getTrain(), bar: window.__worldAPI.getBarrier(), acs: window.__acCount ? window.__acCount() : -1, mix: window.__audio.mix() }))
    await qshot(page, prof, 'a_audio_worst')
    console.log('    đo âm: ' + JSON.stringify({ meter: rep.m, state: rep.st, mix: rep.mix, train: rep.train, bar: rep.bar, gainTàu: rep.sp.train && rep.sp.train.gain, gainChuông: rep.sp.bell && rep.sp.bell.gain }))
    check(P('âm: AudioContext đang chạy (đã mở khoá bằng cú bấm thật)'), rep.st.ctx === 'running', JSON.stringify(st0) + ' -> ' + JSON.stringify(rep.st))
    check(P('âm: có tiếng thật trong lúc đo (rms > -60 dBFS) và chuông barie + tàu thật sự ở gần (gain không gian > 0,3)'), rep.m.rmsDb != null && rep.m.rmsDb > -60 && gMax.bell > 0.3 && gMax.train > 0.3, `rms ${rep.m.rmsDb} dB; gain lớn nhất: chuông ${gMax.bell.toFixed(2)}, tàu ${gMax.train.toFixed(2)}`)
    check(P('âm: tình huống xấu nhất (giông + sấm + tàu sát barie + chuông + nhạc + ăn phở) đỉnh < -1 dBFS'), rep.m.peakDb < -1 && rep.qa.peakDb < -1 && rep.qa.n > 300, `đỉnh ${rep.m.peakDb} dBFS (meter 50ms), ${rep.qa.peakDb} dBFS (QA đọc ${rep.qa.n} lần, 15ms/lần), limiter nén tối đa ${rep.m.maxReductionDb} dB trong ${rep.m.secs}s`)
    check(P('âm: chỉ MỘT AudioContext trong cả trang'), rep.acs === 1, rep.acs + ' AudioContext')
    await G(page, () => { window.__worldAPI.setWeather('sunny'); window.__bus.emit('weather', { rain: false, storm: false }) })
  }

  // ───────────── b. ngày / giờ ─────────────
  async function dayTime(page, prof, P) {
    const d0 = await G(page, () => ({ info: window.__worldAPI.getDayInfo(), wd: window.__worldAPI.getWeekday(), speed: window.__world.sky.speed }))
    check(P('ngày 1 = Thứ Sáu (getDayInfo / getWeekday)'), d0.info.day === 1 && d0.info.weekday === 5 && d0.info.label === 'Thứ Sáu' && d0.wd === 5, JSON.stringify(d0.info))
    check(P('sky.speed = 0.024 giờ game/giây'), d0.speed === 0.024, d0.speed)
    // đo thật bằng đồng hồ tự chạy
    const r = await G(page, async () => { const A = window.__worldAPI; A.setHour(9); A.setClockRunning(true); await new Promise((r) => setTimeout(r, 300)); const h0 = A.getHour(), t0 = performance.now(); await new Promise((r) => setTimeout(r, 8000)); const h1 = A.getHour(), t1 = performance.now(); return { dh: h1 - h0, dt: (t1 - t0) / 1000 } })
    const secPerHour = r.dt / r.dh
    check(P('1 giờ game ≈ 41,7 giây thật (đo 8 giây đồng hồ chạy, sai số ≤ 12%)'), Math.abs(secPerHour - 41.67) / 41.67 <= 0.12, `${secPerHour.toFixed(1)} giây / giờ game (${r.dh.toFixed(3)} giờ trong ${r.dt.toFixed(1)}s)`)
    const adv = await G(page, () => {
      const A = window.__worldAPI, ev = []; const off = window.__bus.on('time:newday', (d) => ev.push({ day: d.day, hourAtEmit: A.getHour() }))
      A.setClockRunning(false); A.setHour(23); const day0 = A.getDay()
      const a1 = A.advanceTime(0.5); const ev1 = ev.length
      const a2 = A.advanceTime(2); const info = A.getDayInfo()
      if (typeof off === 'function') off()
      return { day0, a1, ev1, a2, ev: ev.slice(), info, gpDay: window.__gameplay.state.day }
    })
    check(P('advanceTime 23:00 + 0,5 giờ: không qua 0h -> không đổi ngày, không phát time:newday'), adv.ev1 === 0 && adv.a1.day === adv.day0 && Math.abs(adv.a1.hour - 23.5) < 1e-6, JSON.stringify(adv.a1))
    check(P('advanceTime qua 0h: ngày +1, phát time:newday đúng 1 lần (giờ đã là giờ mới), gameplay cùng ngày'), adv.a2.day === adv.day0 + 1 && adv.ev.length === 1 && adv.ev[0].day === adv.day0 + 1 && Math.abs(adv.ev[0].hourAtEmit - 1.5) < 1e-6 && adv.gpDay === adv.a2.day, JSON.stringify({ a2: adv.a2, ev: adv.ev, gp: adv.gpDay }))
    check(P('ngày 2 = Thứ Bảy'), adv.info.weekday === 6 && adv.info.label === 'Thứ Bảy', JSON.stringify(adv.info))
  }

  // ───────────── d. va chạm: đi bằng phím ─────────────
  // keys: '+gx' = S+D, '+gy' = S+A (trục lưới isometric)
  const KEYS = { '+gx': ['s', 'd'], '+gy': ['s', 'a'] }
  async function keyWalk(page, start, dir, ms) {
    await G(page, (s) => { const A = window.__worldAPI; A.teleport(s.gx, s.gy); window.__trace = []; const f = () => { const p = A.getPlayer(); window.__trace.push([p.gx, p.gy]); if (window.__traceOn) requestAnimationFrame(f) }; window.__traceOn = true; requestAnimationFrame(f) }, start)
    await sleep(120)
    for (const k of KEYS[dir]) await page.keyboard.down(k)
    await sleep(ms)
    for (const k of KEYS[dir]) await page.keyboard.up(k)
    await sleep(80)
    return G(page, () => { window.__traceOn = false; return window.__trace.slice() })
  }
  async function collisions(page, prof, P) {
    await G(page, () => { const A = window.__worldAPI; A.setClockRunning(false); A.setHour(11); A.setWeather('sunny'); window.__gameplay.debug.setStamina(100) })
    // chọn mẫu vật nhỏ: đường thẳng 2,6 ô theo trục đi qua tâm vật phải trống theo lưới API (vật nhỏ không tính)
    const picks = await G(page, () => {
      const A = window.__worldAPI, W = window.__world, cats = { 'sạp hàng': /^p_(pho|banhmi|fruit|kiosk)/, 'cột điện': /^p_pole/, 'cây': /^t_/, 'ghế đá': /^p_bench_/, 'cột đèn': /^p_lamp/ }, out = {}
      for (const [cat, re] of Object.entries(cats)) {
        const cand = W.statics.filter((s) => re.test(s.name) && s.bb)
        let best = null
        for (const s of cand) {
          const cx = (s.bb[0] + s.bb[1]) / 2, cy = (s.bb[2] + s.bb[3]) / 2
          for (const dir of ['+gx', '+gy']) {
            const ux = dir === '+gx' ? 1 : 0, uy = 1 - ux
            let okLine = true
            for (let t = -1.4; t <= 1.6 && okLine; t += 0.1) if (!A.free(cx + ux * t, cy + uy * t)) okLine = false
            if (okLine && A.isReachable(cx - ux * 1.3, cy - uy * 1.3)) { best = { name: s.name, cx, cy, dir, n: cand.length }; break }
          }
          if (best) break
        }
        out[cat] = best || { none: true, n: cand.length, centerFree: cand.slice(0, 8).map((s) => A.free((s.bb[0] + s.bb[1]) / 2, (s.bb[2] + s.bb[3]) / 2)) }
      }
      return out
    })
    for (const [cat, pk] of Object.entries(picks)) {
      if (pk.none) { check(P(`va chạm: đi xuyên ${cat}`), false, `không tìm được ${cat} nào có đường thẳng trống qua tâm (${pk.n} cái; tâm trống? ${JSON.stringify(pk.centerFree)})`); continue }
      const ux = pk.dir === '+gx' ? 1 : 0, uy = 1 - ux
      const tr = await keyWalk(page, { gx: pk.cx - ux * 1.3, gy: pk.cy - uy * 1.3 }, pk.dir, 800)
      const last = tr[tr.length - 1], prog = (last[0] - pk.cx) * ux + (last[1] - pk.cy) * uy
      check(P(`va chạm: đi bằng phím xuyên qua ${cat} (${pk.name})`), prog > 0.5, `vượt tâm vật ${prog.toFixed(2)} ô (${tr.length} khung)`)
      if (cat === 'sạp hàng') { await G(page, (pk) => window.__worldAPI.teleport(pk.cx, pk.cy), pk); await G(page, () => window.__worldAPI.setZoom(4)); await sleep(500); await qshot(page, prof, 'd_through_stall'); await G(page, () => window.__worldAPI.setZoom(2)); await sleep(400) }
    }
    // vật cứng: nhà, nước, hàng rào ray
    const hard = await G(page, (GEO) => {
      const A = window.__worldAPI, W = window.__world, N = A.debug().N, out = {}
      const freeLine = (x, y, ux, uy, a, b) => { for (let t = a; t <= b; t += 0.1) if (!A.free(x + ux * t, y + uy * t)) return false; return true }
      // nhà: ô blk có 2 ô trống liền phía -gx
      for (let y = 10; y < N - 10 && !out.house; y++) for (let x = 10; x < N - 10; x++) if (W.blk[y][x] && !W.blk[y][x - 1] && freeLine(x - 1.6, y + 0.5, 1, 0, 0, 1.2) && A.isReachable(x - 1.6, y + 0.5)) { out.house = { tx: x, ty: y, start: { gx: x - 1.6, gy: y + 0.5 }, dir: '+gx', lim: x }; break }
      // nước: ô 'water' (không phải cầu) có bờ trống phía -gx
      for (let y = 10; y < N - 10 && !out.water; y++) for (let x = 10; x < N - 10; x++) if (W.kind[y][x] === 'water' && W.kind[y][x - 1] !== 'water' && freeLine(x - 1.6, y + 0.5, 1, 0, 0, 1.2) && A.isReachable(x - 1.6, y + 0.5)) { out.water = { tx: x, ty: y, start: { gx: x - 1.6, gy: y + 0.5 }, dir: '+gx', lim: x }; break }
      // hàng rào ray phía bắc (world: yF = [RS+1, RN] = [80, 83], collider ở y≈79.94) — đi +gy từ vỉa hè phía bắc vào ray, chỗ có rào (không phải lối qua đường)
      const fy = GEO.FENCE_N
      for (let x = 8; x < N - 8 && !out.fence; x++) { const sx = x + 0.5, sy = fy - 1.3; if (A.free(sx, sy) && A.isReachable(sx, sy) && freeLine(sx, sy, 0, 1, 0, 0.5) && !A.free(sx, fy)) out.fence = { tx: x, ty: fy, start: { gx: sx, gy: sy }, dir: '+gy', lim: fy } }
      return out
    }, GEO)
    for (const [k, nm] of [['house', 'nhà'], ['water', 'nước (hồ)'], ['fence', 'hàng rào đường ray']]) {
      const h = hard[k]
      if (!h) { check(P(`va chạm: ${nm} vẫn chặn`), false, 'không tìm được chỗ thử'); continue }
      const tr = await keyWalk(page, h.start, h.dir, 1000)
      const ax = h.dir === '+gx' ? 0 : 1, maxP = Math.max(...tr.map((p) => p[ax]))
      check(P(`va chạm: ${nm} vẫn chặn khi đi bằng phím`), maxP < h.lim + 0.05, `đi tới ${maxP.toFixed(2)} (mép vật cản ${h.lim}) từ ${JSON.stringify(h.start)}`)
    }
  }
  async function autoWalkAll(page, prof, P) {
    // Auto-Walk tới đủ 81 site: chạy thế giới nhanh bằng __world.step (người chơi đi bằng chính vòng Game.update)
    const r = await G(page, async () => {
      const A = window.__worldAPI, W = window.__world, sites = A.getSites('any'), bad = [], times = []
      A.setClockRunning(false); A.setHour(11)
      const sp = { gx: 56.5, gy: 34.5 }
      for (const s of sites) {
        A.teleport(sp.gx, sp.gy); let res = null
        A.autoWalk({ gx: s.standAt.gx, gy: s.standAt.gy }).then((x) => { res = x })
        await new Promise((r) => setTimeout(r, 0))
        let n = 0
        while (A.isAutoWalking() && n < 6000) { W.step(1 / 30, 30); n += 30; if (n % 600 === 0) await new Promise((r) => setTimeout(r, 0)) }
        await new Promise((r) => setTimeout(r, 0))
        const p = A.getPlayer(), d = Math.hypot(p.gx - s.standAt.gx, p.gy - s.standAt.gy)
        times.push(n / 30)
        if (res !== 'arrived' || d > 1) bad.push(`${s.id}:${res}:${d.toFixed(1)}`)
        A.stopAutoWalk()
      }
      times.sort((a, b) => a - b)
      return { n: sites.length, bad, med: times[times.length >> 1], max: times[times.length - 1] }
    })
    check(P(`Auto-Walk tới đủ ${r.n} site từ chỗ xuất phát (chạy thế giới nhanh), tất cả 'arrived'`), r.n >= 81 && r.bad.length === 0, r.bad.slice(0, 6).join(', ') || `đủ ${r.n}; thời gian đi game: trung vị ${r.med.toFixed(0)}s, xa nhất ${r.max.toFixed(0)}s`)
  }

  // ───────────── e. zoom mượt ─────────────
  async function zoomWheel(page, prof, P) {
    await G(page, () => { window.__worldAPI.setZoom(2) }); await sleep(500)
    const vp = prof.ctx.viewport
    await page.mouse.move(vp.width / 2 + 100, vp.height / 2 - 60)
    const z0 = await G(page, () => window.__worldAPI.getZoom())
    // 1 khấc chuột (deltaY -100) -> đúng 1 nấc; ghi zoom thực từng khung để thấy trôi mượt
    await G(page, () => { window.__zt = []; const t0 = performance.now(); const f = () => { window.__zt.push([+(performance.now() - t0).toFixed(0), window.__worldAPI.getZoomLive(), window.__worldAPI.getZoom()]); if (performance.now() - t0 < 700) requestAnimationFrame(f) }; requestAnimationFrame(f) })
    await page.mouse.wheel(0, -100)
    await sleep(800)
    const zt = await G(page, () => window.__zt.slice())
    const z1 = await G(page, () => ({ z: window.__worldAPI.getZoom(), live: window.__worldAPI.getZoomLive() }))
    const mids = zt.filter((r) => r[1] > z0 + 0.02 && r[1] < z0 + 0.98)
    check(P('zoom: 1 khấc lăn chuột = đúng 1 nấc'), z1.z === z0 + 1, `${z0} -> ${z1.z}`)
    check(P('zoom: trôi mượt (getZoomLive có giá trị trung gian, getZoom vẫn nguyên)'), mids.length >= 3 && zt.every((r) => Number.isInteger(r[2])), `${mids.length} khung trung gian: ` + mids.slice(0, 5).map((r) => `${r[0]}ms:${r[1].toFixed(2)}`).join(' '))
    const tEnd = (zt.find((r) => r[1] === z0 + 1) || [null])[0]
    check(P('zoom: dừng đúng số nguyên (~0,25 giây)'), z1.live === z1.z && Number.isInteger(z1.live) && tEnd != null && tEnd < 600, `live ${z1.live}, tới đích sau ~${tEnd}ms`)
    // 2 khấc cách nhau 300ms -> +2; một cú vuốt trackpad (nhiều delta nhỏ dồn dập) -> chỉ 1 nấc
    await page.mouse.wheel(0, 100); await sleep(300); await page.mouse.wheel(0, 100); await sleep(500)
    const z2 = await G(page, () => window.__worldAPI.getZoom())
    check(P('zoom: 2 khấc lăn xuống -> lùi 2 nấc'), z2 === z0 - 1, `${z0 + 1} -> ${z2}`)
    await sleep(300)
    for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, -12); await sleep(16) }
    await sleep(500)
    const z3 = await G(page, () => window.__worldAPI.getZoom())
    check(P('zoom: một cú vuốt trackpad (14 delta nhỏ) -> chỉ 1 nấc, không vọt'), z3 === z2 + 1, `${z2} -> ${z3}`)
    await G(page, () => window.__worldAPI.setZoom(2)); await sleep(400)
  }
  async function zoomButtons(page, prof, P) {
    const box = await G(page, () => { const b = document.getElementById('hx-zoom'); if (!b) return null; const r = [...b.querySelectorAll('button')].map((x) => { const q = x.getBoundingClientRect(); return { act: x.dataset.act, w: q.width, h: q.height } }); return { disp: getComputedStyle(b).display, r } })
    check(P('zoom: có nút +/− trên điện thoại, mỗi nút ≥ 44px'), box && box.disp !== 'none' && box.r.length === 2 && box.r.every((x) => x.w >= 43.5 && x.h >= 43.5), JSON.stringify(box))
    const z0 = await G(page, () => window.__worldAPI.getZoom())
    await page.locator('#hx-zoom [data-act="zoomin"]').tap(); await sleep(120)
    const mid = await G(page, () => ({ z: window.__worldAPI.getZoom(), live: window.__worldAPI.getZoomLive() }))
    await sleep(500)
    const z1 = await G(page, () => ({ z: window.__worldAPI.getZoom(), live: window.__worldAPI.getZoomLive() }))
    check(P('zoom: chạm nút + -> lên 1 nấc, trôi mượt rồi dừng ở số nguyên'), z1.z === z0 + 1 && z1.live === z1.z && mid.live > z0 && mid.live <= z0 + 1, `${z0} -> ${z1.z} (giữa chừng ${mid.live.toFixed(2)})`)
    await page.locator('#hx-zoom [data-act="zoomin"]').tap(); await sleep(450)
    await qshot(page, prof, 'e_zoom_plus')
    await page.locator('#hx-zoom [data-act="zoomout"]').tap(); await sleep(450)
    await page.locator('#hx-zoom [data-act="zoomout"]').tap(); await sleep(450)
    const z2 = await G(page, () => window.__worldAPI.getZoom())
    check(P('zoom: chạm nút − hai lần -> về nấc cũ'), z2 === z0, `${z2}`)
  }

  // ───────────── f. quán mở / đóng ─────────────
  async function openClose(page, prof, P) {
    const sw = await G(page, () => {
      const A = window.__worldAPI, out = []
      A.setClockRunning(false)
      for (const [day, nm] of [[4, 'Thứ Hai'], [2, 'Thứ Bảy']]) {
        A.setDay(day)
        for (let h = 0; h < 24; h += 0.5) {
          A.setHour(h)
          const food = A.getSites('pho').concat(A.getSites('banhmi')).filter((s) => s.open)
          const reach = food.filter((s) => A.isReachable(s.standAt.gx, s.standAt.gy))
          out.push({ nm, h, n: reach.length, ids: reach.slice(0, 3).map((s) => s.id) })
        }
      }
      A.setDay(1)
      return { rows: out, sweep: A.getOpenSweep() }
    })
    const minRow = sw.rows.reduce((a, b) => (b.n < a.n ? b : a))
    check(P('quán: quét 48 mốc nửa giờ × (Thứ Hai, Thứ Bảy): luôn ≥ 2 chỗ ăn (phở/bánh mì) mở và tới được'), sw.rows.length === 96 && minRow.n >= 2, `ít nhất ${minRow.n} chỗ lúc ${minRow.h}h ${minRow.nm}; world tự quét: ${JSON.stringify({ ok: sw.sweep.ok, min: sw.sweep.min, minAt: sw.sweep.minAt })}`)
    console.log('    số chỗ ăn mở theo giờ (Thứ Hai): ' + sw.rows.filter((r) => r.nm === 'Thứ Hai').map((r) => r.n).join(' '))
    // một quán đóng thật: không marker ăn, không việc
    const c = await G(page, async () => {
      const A = window.__worldAPI, g = window.__gameplay
      A.setHour(14.5)
      const all = ['pho', 'banhmi', 'tc'].flatMap((k) => A.getSites(k))
      const closed = all.filter((s) => !s.open), open = all.filter((s) => s.open)
      const s = closed.find((x) => x.kind === 'pho') || closed[0]
      if (!s) return { none: true, nOpen: open.length }
      g.debug.setStamina(10); g.debug.addMoney(300000)
      A.teleport(s.standAt.gx, s.standAt.gy)
      await new Promise((r) => setTimeout(r, 1500))
      const near = window.__game.state.near
      g.state.board = []; g.jobs.refresh()
      const board = g.jobs.board()
      const closedIds = new Set(closed.map((x) => x.id))
      return { id: s.id, label: s.label, isOpen: A.isSiteOpen(s.id), near: near && { label: near.label, marker: !!near.marker }, boardBad: board.filter((j) => closedIds.has(j.siteId)).map((j) => j.siteId), board: board.map((j) => j.siteId), nClosed: closed.length, nOpen: open.length }
    })
    if (c.none) { check(P('quán: lúc 14:30 có quán đóng để thử'), false, 'không quán nào đóng'); return }
    await qshot(page, prof, 'f_closed_stall')
    check(P(`quán đóng (${c.id} lúc 14:30): isSiteOpen=false, đứng cạnh không có marker ăn`), c.isOpen === false && !(c.near && /Ăn|Uống|Mua/.test(c.near.label)), `${c.label}; nhắc: ${JSON.stringify(c.near)}; ${c.nClosed} quán đóng / ${c.nOpen} mở`)
    check(P('quán đóng: bảng việc không giao việc ở quán đóng'), c.boardBad.length === 0, `bảng: ${c.board.join(', ')}; sai: ${c.boardBad.join(',') || 'không'}`)
    // marker ăn ở quán mở cùng giờ vẫn có
    const o = await G(page, async () => { const A = window.__worldAPI; const s = A.getSites('pho').concat(A.getSites('banhmi')).find((x) => x.open); A.teleport(s.standAt.gx, s.standAt.gy); await new Promise((r) => setTimeout(r, 1500)); const n = window.__game.state.near; return { id: s.id, near: n && n.label } })
    check(P('quán mở cùng giờ vẫn có marker ăn'), /Ăn|Mua/.test(o.near || ''), JSON.stringify(o))
  }

  // ───────────── g. mini-game ─────────────
  async function minigames(page, prof, P) {
    const cfg = await G(page, () => ({ full: window.__gameplay.balance.PAY_FULL, exp: window.__gameplay.balance.PAY_EXP, kinds: Object.fromEntries(Object.entries(window.__gameplay.balance.JOB_KINDS).map(([k, v]) => [k, v.mult])), bells: window.__gameplay.balance.MG.rail.bells }))
    const formula = (score, mult) => Math.round(cfg.full * Math.pow(Math.max(0, Math.min(100, score)) / 100, cfg.exp) * mult / 1000) * 1000
    const games = [['pho', 'Phở'], ['pho:banhmi', 'Bánh mì (nước mía)'], ['tc', 'Xếp ghế'], ['rail', 'Gác chắn'], ['ship', 'Shipper'], ['cyclo', 'Xích lô']]
    const results = []
    for (const [gid, nm] of games) {
      const [id, variant] = gid.split(':')
      const mult = 1.05
      await G(page, ([id, variant, mult]) => { window.__mgRes = null; const K = window.__gameplay.balance.JOB_KINDS; window.__gameplay.minigames.start(id, { timeScale: 3, variant, mult, noPay: true, title: (K[variant || id] || {}).title }).then((r) => { window.__mgRes = r }) }, [id, variant, mult])
      await page.waitForSelector('.gm', { timeout: 4000 }); await sleep(350)
      await qshot(page, prof, `g_${id}${variant ? '_' + variant : ''}_intro`)
      await tapOrClick(page, prof, '.gm-go'); await sleep(200)
      if (id === 'rail') { const n = await G(page, () => window.__mgState && window.__mgState.S && window.__mgState.S.trains.length); check(P('gác chắn: 6 chuyến tàu mỗi lượt'), n === 6 && cfg.bells.length === 6, `${n} tàu (config ${cfg.bells.length})`) }
      // chơi một chút bằng phím thật để có trạng thái giữa lượt
      const keys = { pho: ['1', '2', '3'], tc: ['ArrowUp', 'ArrowUp', 'ArrowDown'], rail: ['ArrowDown', 'ArrowUp'], ship: [' ', ' '], cyclo: ['a', 'd', 'a', 'd'] }[id]
      for (let i = 0; i < 10; i++) { if (!prof.touch) await page.keyboard.press(keys[i % keys.length]); await sleep(260) }
      await qshot(page, prof, `g_${id}${variant ? '_' + variant : ''}_mid`)
      // chờ hết lượt thật (timeScale 3: 45 s -> 15 s) rồi đọc kết quả
      await page.waitForFunction(() => window.__gameplay.minigames.current()?.stage === 'result' || !window.__gameplay.minigames.isActive(), null, { timeout: 30000 }).catch(() => {})
      await sleep(500)
      await qshot(page, prof, `g_${id}${variant ? '_' + variant : ''}_result`)
      await G(page, () => document.querySelector('.gm .gm-go, .gm .gm-x')?.click()); await sleep(400)
      const r = await G(page, () => window.__mgRes)
      results.push({ nm, r })
      const exp = r && !r.failed ? formula(r.score, mult) : 0
      check(P(`mini-game ${nm}: chơi trọn 1 lượt, tiền công = công thức config (${cfg.full}×(điểm/100)^${cfg.exp}×hệ số, tròn nghìn)`), r && Number.isFinite(r.score) && r.pay === exp, JSON.stringify(r) + ' kỳ vọng ' + exp)
    }
    console.log('    điểm 1 lượt (bot QA bấm vài phím rồi để trôi): ' + results.map((x) => `${x.nm} ${x.r && x.r.score}đ/${x.r && x.r.pay}`).join(' · '))
    // mức tiền theo điểm qua debugFinish: 0 -> 0đ, 70, 100 (hệ số việc thật)
    const tbl = []
    for (const sc of [0, 40, 70, 100]) {
      const r = await G(page, async (sc) => { const p = window.__gameplay.minigames.start('pho', { timeScale: 1, mult: 1, noPay: true }); await new Promise((r) => setTimeout(r, 250)); window.__gameplay.minigames.debugFinish(sc); const res = await p; return res }, sc)
      tbl.push([sc, r.pay])
      await sleep(150); await G(page, () => document.querySelector('.gm .gm-go, .gm .gm-x')?.click()); await sleep(250)
    }
    check(P('tiền công theo điểm: 0 điểm = 0đ, 40 ≈ 32k, 70 ≈ 63k, 100 = 96k'), tbl.every(([s, p]) => p === formula(s, 1)) && tbl[0][1] === 0, tbl.map(([s, p]) => `${s}đ→${p}`).join(', '))
    // việc thật trọn vòng: tiền vào ví = công thức × hệ số việc × hệ số tâm trạng
    const job = await G(page, async () => {
      const g = window.__gameplay, A = window.__worldAPI
      A.setHour(9); g.debug.setStamina(100); g.debug.setMood(60); g.state.board = []; g.jobs.refresh()
      const j = g.jobs.board().find((x) => x.kind === 'pho' || x.kind === 'tc' || x.kind === 'banhmi') || g.jobs.board()[0]
      g.jobs.accept(j.id)
      const m0 = g.state.money
      g.jobs.startWork(); await new Promise((r) => setTimeout(r, 400))
      document.querySelector('.gm .gm-go')?.click(); await new Promise((r) => setTimeout(r, 300))
      g.minigames.debugFinish(70); await new Promise((r) => setTimeout(r, 600))
      document.querySelector('.gm .gm-go, .gm .gm-x')?.click(); await new Promise((r) => setTimeout(r, 400))
      return { kind: j.kind, shown: j.pay, got: g.state.money - m0, mood: g.state.mood }
    })
    const expJob = formula(70, cfg.kinds[job.kind])
    check(P(`việc thật (${job.kind}, 70 điểm, tâm trạng thường): ví +${expJob}đ = số "khoảng" trên bảng việc`), job.got === expJob && job.shown === expJob, JSON.stringify(job))
  }
  async function cycloGfx(page, prof, P) {
    // chụp 3 nhánh xích lô với sprite mới (luật/kiểm số đã có ở phần 4 — chỉ thêm ảnh xem bằng mắt)
    await G(page, () => { window.__gameplay.minigames.start('cyclo', { timeScale: 1, noPay: true }) }); await page.waitForSelector('.gm'); await sleep(300)
    await tapOrClick(page, prof, '.gm-go'); await sleep(250)
    await G(page, () => { window.__mgState.noSpawn(true); window.__mgState.spawnWalker(180); window.__mgState.setSpeed(60) }); await sleep(200)
    await qshot(page, prof, 'g_cyclo_warn')
    await G(page, () => window.__gameplay.minigames.debugFinish(0)); await sleep(300); await G(page, () => document.querySelector('.gm .gm-go, .gm .gm-x')?.click()); await sleep(300)
  }

  // ───────────── h. ăn uống: chữ "Uống…" cho đồ uống ─────────────
  async function drinkText(page, prof, P) {
    const r = await G(page, async () => {
      const A = window.__worldAPI, g = window.__gameplay, toasts = []; window.__bus.on('toast', (d) => toasts.push(d.msg))
      let s = null
      for (let h = 20; h < 44 && !s; h += 1) { A.setHour(h % 24); s = A.getSites('tc').find((x) => x.open) }
      g.debug.setStamina(20); g.debug.addMoney(100000)
      A.teleport(s.standAt.gx, s.standAt.gy); await new Promise((r) => setTimeout(r, 1300))
      const hint = [...document.querySelectorAll('button')].find((x) => x.textContent.startsWith('E / chạm') && getComputedStyle(x).display !== 'none')?.textContent
      g.eat('trachanh'); await new Promise((r) => setTimeout(r, 300))
      return { id: s.id, hour: A.getHour(), hint, toasts }
    })
    check(P('đồ uống: nút nhắc "Uống trà chanh (15.000đ)", toast "Uống cốc trà chanh: +8 thể lực (-15.000đ)"'), /Uống trà chanh \(15\.000đ\)/.test(r.hint || '') && r.toasts.some((t) => /^Uống cốc trà chanh: \+8 thể lực \(-15\.000đ\)/.test(t)), JSON.stringify(r))
  }

  // ───────────── i. ánh sáng + nhịp phố ─────────────
  async function lighting(page, prof, P) {
    const spots = await G(page, (GEO) => {
      const A = window.__worldAPI, L = GEO.LAKE
      // phố đi bộ: đường phía bắc hồ, gần Ô Quan Chưởng; phố cổ: một quán phở
      const gate = A.getPois().find((p) => p.id === 'gate')
      const pho = A.getSites('pho')[0]
      const b = A.getBarrier()   // phố có xe: chỗ đường cắt ray (thấy xe, đèn pha, barie)
      return { lakeN: { gx: (L.x0 + L.x1) / 2, gy: L.y0 - 2.5 }, gate: gate && { gx: gate.gx, gy: gate.gy }, pho: pho.standAt, road: { gx: b.gx + 2.5, gy: GEO.RAILC[0] - 1.2 }, L }
    }, GEO)
    const plan = [[5.5, 4, 'road', '0530'], [8, 4, 'road', '0800'], [12, 4, 'road', '1200'], [17.5, 4, 'road', '1730'], [20, 2, 'lake', '2000_t7_phodibo'], [23.5, 4, 'road', '2330'], [23.5, 4, 'pho', '2330_quan']]
    const info = []
    for (const [h, day, where, tag] of plan) {
      await G(page, ([h, day, sp]) => { const A = window.__worldAPI; A.setClockRunning(false); A.setWeather('sunny'); A.setDay(day); A.setHour(h); const ok = A.isReachable(sp.gx, sp.gy); A.teleport(sp.gx, sp.gy); A.setZoom(2) }, [h, day, where === 'lake' ? (spots.gate || spots.lakeN) : spots[where]])
      await sleep(1600)
      const si = await G(page, () => { const i = window.__worldAPI.getStreetInfo(); return { label: i.label, ws: i.walkingStreet, night: i.night, head: i.headlights, lights: i.lights, veh: i.vehiclesOn, npc: i.npcOn, act: i.actors, rush: i.rush } })
      info.push({ tag, ...si })
      await qshot(page, prof, `i_${tag}`)
    }
    console.log('    ánh sáng/nhịp phố: ' + info.map((x) => `${x.tag}: ${x.label}${x.ws ? ' PĐB' : ''} đêm=${x.night} đèn xe=${x.head} đèn=${x.lights} xe=${x.veh} người=${x.npc}+${x.act}`).join(' | '))
    const sat = info.find((x) => x.tag.startsWith('2000'))
    check(P('20:00 thứ Bảy: phố đi bộ bật'), sat.ws === true && sat.label === 'Thứ Bảy', JSON.stringify(sat))
    const night = info.filter((x) => ['2000_t7_phodibo', '2330'].includes(x.tag)), noon = info.find((x) => x.tag === '1200')
    check(P('ban đêm: đèn pha xe bật, có nguồn sáng; 12:00 đèn pha tắt'), night.every((x) => x.head && x.lights > 0) && !noon.head, night.map((x) => `${x.tag}: đèn xe ${x.head}, ${x.lights} đèn`).join('; ') + `; 12h đèn xe ${noon.head}`)
    // không xe đứng trên ray: cho tàu chạy qua nhiều lần, quét xe đứng yên trong dải ray
    const rail = await G(page, (GEO) => {
      // dải ray: giữa hai hàng rào (80..83); xe trục y đứng yên (|v|<0.05) trong dải này ở BẤT KỲ khung nào là lỗi (CONTRACT 4B), có barie hay không
      const A = window.__worldAPI, W = window.__world, y0 = GEO.FENCE_N - 0.2, y1 = GEO.FENCE_S + 0.2, bad = []
      A.setDay(4); A.setHour(17.5)                                  // cao điểm chiều ngày thường: xe tắc dài
      let downFrames = 0, frames = 0, badDown = 0, seenY = 0
      for (let k = 0; k < 3; k++) {
        W.forceTrain(k % 2 ? -1 : 1)
        for (let i = 0; i < 900; i++) {
          W.step(1 / 30, 1); frames++
          const anyDown = W.crossings.some((c) => c.down); if (anyDown) downFrames++
          for (const L of W.LANES) for (const v of L.vs) {
            if (!v.on || L.axis !== 'y') continue
            const gy = v.pos
            if (gy > y0 && gy < y1) { seenY++; if (Math.abs(v.v) < 0.05) { if (bad.length < 400) bad.push({ lane: L.c, gy: +gy.toFixed(2), type: v.type, down: anyDown }); if (anyDown) badDown++ } }
          }
        }
      }
      return { bad: bad.slice(0, 6), n: bad.length, badDown, downFrames, frames, seenY, y0, y1 }
    }, GEO)
    check(P('không xe đứng yên trên dải ray (mọi khung, 3 chuyến tàu, cao điểm 17:30 thứ Hai)'), rail.n === 0 && rail.downFrames > 0 && rail.seenY > 0, `${rail.n} lần xe đứng trong dải [${rail.y0},${rail.y1}] (${rail.badDown} lần lúc barie hạ); ${JSON.stringify(rail.bad)}; ${rail.frames} khung, barie hạ ${rail.downFrames} khung, ${rail.seenY} lượt xe đi qua dải`)
    await G(page, (GEO) => { const A = window.__worldAPI; const b = A.getBarrier(); A.teleport(b.gx + 2.5, GEO.RAILC[0] - 1.2); A.setZoom(2) }, GEO); await sleep(600)
    await qshot(page, prof, 'i_rail_rush_1730')
    await G(page, () => { window.__worldAPI.setDay(1); window.__worldAPI.setHour(11) })
  }

  // ───────────── j. bong bóng ─────────────
  async function bubbles(page, prof, P) {
    const say4 = (type, near) => G(page, ([type, near]) => { const A = window.__worldAPI, p = A.getPlayer(); const ns = A.getNpcs().filter((n) => Math.hypot(n.gx - p.gx, n.gy - p.gy) < (near || 10)); for (const n of ns.slice(0, 6)) window.__bubbles.say(n.id, undefined, type) }, [type, near])
    // 1. ẩn khi mini-game chạy
    await G(page, async () => { const A = window.__worldAPI; A.setClockRunning(false); A.setDay(1); A.setHour(10); A.setWeather('sunny'); const s = A.getSites('pho').find((x) => x.open) || A.getSites('pho')[0]; A.teleport(s.standAt.gx, s.standAt.gy); A.setZoom(4) })
    await sleep(900)
    await say4('vendor'); await sleep(700)
    const before = (await G(page, () => window.__bubbles.debug())).visible.length
    await G(page, () => { window.__gameplay.minigames.start('tc', { timeScale: 1, noPay: true }) }); await page.waitForSelector('.gm'); await sleep(400)
    await say4('chat'); await G(page, () => window.__bus.emit('traffic:cut', { kind: 'moto' })); await sleep(900)
    const during = await G(page, () => window.__bubbles.debug())
    await qshot(page, prof, 'j_minigame_no_bubbles')
    check(P('bong bóng: ẩn hết khi mini-game đang chạy (kể cả ép nói + traffic:cut)'), during.visible.length === 0, `trước ${before} bóng, trong mini-game ${during.visible.length}: ${JSON.stringify(during.visible.map((v) => v.text))}`)
    await G(page, () => window.__gameplay.minigames.debugFinish(0)); await sleep(300); await G(page, () => document.querySelector('.gm .gm-go, .gm .gm-x')?.click()); await sleep(600)
    // 2. câu về tàu chỉ ở gần ray: xa ray (hồ, phố cổ) ép nhiều loại câu, không câu nào nhắc tàu
    const farTexts = []
    for (const where of ['lake', 'pho']) {
      await G(page, ([where, L]) => { const A = window.__worldAPI; if (where === 'lake') A.teleport(L.x1 + 1.5, (L.y0 + L.y1) / 2); else { const s = A.getSites('pho')[2] || A.getSites('pho')[0]; A.teleport(s.standAt.gx, s.standAt.gy) } }, [where, GEO.LAKE])
      await sleep(700)
      for (const t of ['chat', 'think', 'vendor', 'sound', 'traffic']) { await say4(t, 12); await sleep(500); const d = await G(page, () => window.__bubbles.debug()); for (const v of d.visible.concat(d.dots || [])) farTexts.push(v.text)   /* chấm (bong bóng thu nhỏ vì chen / khuất) vẫn mang câu đã sinh -> kiểm nội dung cả hai */ }
      await sleep(4000)
    }
    const trainWords = farTexts.filter((t) => /tàu|xình xịch|đường ray|barie|gác chắn|thanh chắn|chắn tàu/i.test(t))   // không bắt "chắc chắn", "che chắn"
    check(P('bong bóng: xa đường ray không có câu về tàu'), farTexts.length >= 5 && trainWords.length === 0, `${farTexts.length} câu; dính tàu: ${JSON.stringify(trainWords)}`)
    // 3. chữ Việt sắc nét ở zoom 4, DPR 2: chụp cận
    await G(page, () => { const A = window.__worldAPI; const s = A.getSites('pho')[0]; A.teleport(s.standAt.gx, s.standAt.gy); A.setZoom(4) }); await sleep(900)
    let v = null
    for (let k = 0; k < 4 && !v; k++) { await G(page, (k) => { const A = window.__worldAPI, p = A.getPlayer(), vp = A.getViewport(); const ns = A.getNpcs().map((n) => ({ n, s: A.worldToScreen(n.gx, n.gy) })).filter((o) => o.s.x > 200 && o.s.x < vp.w - 200 && o.s.y > 200 && o.s.y < vp.h - 80); const n = ns[k % Math.max(1, ns.length)]; window.__bubbles.say(n ? n.n.id : { gx: p.gx + 1, gy: p.gy - 0.5 }, 'Phở bò tái lăn đây, nóng hổi vừa thổi vừa ăn!', 'vendor') }, k); await sleep(800); v = (await G(page, () => window.__bubbles.debug())).visible.find((x) => /Phở bò/.test(x.text)) }
    if (v) await qshot(page, prof, 'j_bubble_crisp_zoom4_dpr2', { clip: { x: Math.max(0, v.x - 30), y: Math.max(0, v.y - 30), width: Math.min(v.w + 60, 600), height: Math.min(v.h + 80, 300) } })
    const meta = await G(page, () => ({ dpr: devicePixelRatio, d: window.__bubbles.debug() }))
    check(P('bong bóng: zoom 4, DPR 2 hiện câu có dấu đầy đủ (ảnh cận để xem bằng mắt)'), !!v && meta.dpr === 2 && meta.d.dpr === 2 && meta.d.zoomGate, v ? v.text : 'không bung chữ')
    await G(page, () => window.__worldAPI.setZoom(2)); await sleep(400)
  }

  // ───────────── k. điện thoại khi thể lực thấp (PC 1280x720) ─────────────
  async function tiredPhone(page, prof, P) {
    await G(page, () => { window.__gameplay.debug.setStamina(12) }); await sleep(300)
    await G(page, () => window.__ui.openPhone()); await sleep(600)
    await qshot(page, prof, 'k_phone_tired')
    const r = await G(page, () => {
      const ph = document.querySelector('#hx-phone'), pr = ph.getBoundingClientRect()
      const tiles = [...document.querySelectorAll('#hx-phone .hx-tile')].map((t) => { const q = t.getBoundingClientRect(); const sc = t.closest('.hx-body') || ph; const sr = sc.getBoundingClientRect(); return { lb: t.textContent.trim(), b: Math.round(q.bottom), top: Math.round(q.top), vis: q.bottom <= sr.bottom + 1 && q.top >= sr.top - 1 } })
      const home = document.querySelector('#hx-phone [data-act="gohome"]'); const hr = home && home.getBoundingClientRect()
      return { tiles, phone: { top: Math.round(pr.top), b: Math.round(pr.bottom) }, home: hr && { h: Math.round(hr.height), b: Math.round(hr.bottom) } }
    })
    const hidden = r.tiles.filter((t) => !t.vis)
    check(P('điện thoại, thể lực thấp: thấy đủ 5 app (kể cả Phố Thị Gram) và nút "Về nhà" mà không phải cuộn'), r.tiles.length === 5 && hidden.length === 0 && r.home, `ẩn: ${hidden.map((t) => t.lb).join(', ') || 'không'}; ${JSON.stringify(r)}`)
    await audit(page, 'điện thoại - thể lực thấp (thẻ Về nhà)', prof)
    await H.closePhone(page)
    await G(page, () => window.__gameplay.debug.setStamina(100))
  }

  // ───────────── c. nhà: Auto-Walk về nhà, bảng nghỉ/ngủ, ngủ ─────────────
  async function homeFlow(page, prof, P) {
    await G(page, () => { const A = window.__worldAPI, g = window.__gameplay; A.setClockRunning(false); A.setDay(1); A.setHour(21.5); g.debug.setStamina(15); if (g.state.job) g.jobs.cancel(); A.teleport(56.5, 34.5) })
    await sleep(400)
    await H.openPhoneByButton(page, prof)
    const btn = page.locator('#hx-phone [data-act="gohome"]').first()
    await btn.scrollIntoViewIfNeeded().catch(() => {})
    await qshot(page, prof, 'c_phone_home_card')
    const lb = (await btn.textContent().catch(() => '')) || ''
    check(P('điện thoại có nút "Về nhà (Auto-Walk)"'), /Về nhà \(Auto-Walk\)/.test(lb), lb.trim())
    const bb = await btn.boundingBox()
    check(P('nút "Về nhà" ≥ 44px'), bb && bb.height >= 43.5, bb && Math.round(bb.height) + 'px')
    await tapOrClick(page, prof, btn)    // chạm thật trên điện thoại
    await sleep(700)
    const s1 = await G(page, () => ({ aw: window.__worldAPI.isAutoWalking(), phone: window.__ui.isPhoneOpen(), home: window.__gameplay.home() }))
    check(P('chạm "Về nhà" -> đóng điện thoại và tự đi về phòng trọ'), s1.aw && !s1.phone, JSON.stringify({ aw: s1.aw, phone: s1.phone }))
    await sleep(1500); await qshot(page, prof, 'c_walking_home')
    const t0 = Date.now()
    while (Date.now() - t0 < 60000 && (await G(page, () => window.__worldAPI.isAutoWalking()))) await sleep(700)
    const h = s1.home, sa = h.standAt || h
    const pos = await G(page, () => window.__worldAPI.getPlayer())
    const dist = Math.hypot(pos.gx - sa.gx, pos.gy - sa.gy)
    check(P('Auto-Walk về tới cửa phòng trọ'), dist < 2.5, `còn ${dist.toFixed(2)} ô sau ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    await sleep(600)
    const near = await nearInfo(page)
    check(P('ở cửa: nút nhắc E/chạm của nhà'), !!near && /trọ|nhà|Nghỉ|Ngủ/i.test(near.label), JSON.stringify(near))
    await qshot(page, prof, 'c_home_door')
    await promptTap(page, prof, 'nhà'); await sleep(500)
    const menu = await G(page, () => { const m = document.getElementById('gp-home-menu'); return m && { text: m.innerText, btns: [...m.querySelectorAll('button')].map((b) => ({ t: b.textContent, dis: b.disabled, h: Math.round(b.getBoundingClientRect().height) })) } })
    await qshot(page, prof, 'c_home_menu')
    check(P('bảng nhà: "Nghỉ 1 tiếng (+25 thể lực)" + "Ngủ tới 6:00 sáng (đầy thể lực, +tâm trạng)"'), !!menu && menu.btns.some((b) => b.t === 'Nghỉ 1 tiếng (+25 thể lực)' && !b.dis) && menu.btns.some((b) => b.t === 'Ngủ tới 6:00 sáng (đầy thể lực, +tâm trạng)' && !b.dis), menu ? menu.text.replace(/\n/g, ' | ') : 'không mở')
    if (menu) check(P('bảng nhà: nút ≥ 44px'), !prof.touch || menu.btns.every((b) => b.h >= 43.5), menu.btns.map((b) => b.h).join(','))
    if (menu) await audit(page, 'bảng nghỉ/ngủ ở nhà', prof)
    // nghỉ 1 tiếng thật (chạm nút): giờ +1, thể lực +25 (trần 100)
    const n0 = await G(page, () => ({ h: window.__worldAPI.getHour(), st: window.__gameplay.state.stamina, d: window.__worldAPI.getDay() }))
    await tapOrClick(page, prof, '#gp-home-menu [data-rest="nap"]')
    await sleep(700); await qshot(page, prof, 'c_nap_veil')
    await page.waitForFunction(() => { const v = document.getElementById('gp-sleep'); return !v || getComputedStyle(v).display === 'none' }, null, { timeout: 15000 }).catch(() => {})
    await sleep(300)
    const n1 = await G(page, () => ({ h: window.__worldAPI.getHour(), st: window.__gameplay.state.stamina, d: window.__worldAPI.getDay() }))
    check(P('nghỉ 1 tiếng: giờ +1, thể lực +25'), Math.abs((n1.h + 24 * (n1.d - n0.d)) - n0.h - 1) < 0.05 && Math.abs(n1.st - Math.min(100, n0.st + 25)) <= 1.5, `${JSON.stringify(n0)} -> ${JSON.stringify(n1)}`)
    if (!(await G(page, () => !!document.getElementById('gp-home-menu')))) { await promptTap(page, prof, 'nhà'); await sleep(500) }
    const d0 = await G(page, () => window.__worldAPI.getDay())
    await tapOrClick(page, prof, '#gp-home-menu [data-rest="sleep"]')
    await sleep(1600); await qshot(page, prof, 'c_sleep_veil')
    await page.waitForFunction(() => getComputedStyle(document.getElementById('gp-sleep')).display === 'none', null, { timeout: 15000 }).catch(() => {})
    await sleep(400)
    const af = await G(page, () => { const g = window.__gameplay, A = window.__worldAPI; let saved = null; try { saved = JSON.parse(localStorage.getItem('hanoi-pixel-save-v1')) } catch (e) {} return { day: A.getDay(), hour: A.getHour(), st: g.state.stamina, sday: g.state.day, saved: saved && { day: saved.day, stamina: saved.stamina } } })
    await qshot(page, prof, 'c_morning')
    check(P('ngủ -> 6:00 sáng hôm sau, đầy thể lực, đã lưu'), af.day === d0 + 1 && Math.abs(af.hour - 6) < 0.05 && af.st === 100 && af.saved && af.saved.day === af.day && af.saved.stamina === 100, JSON.stringify(af))
    // đang có việc: không cho ngủ (nút bị khoá + lý do), rest('sleep') từ chối
    const jb = await G(page, async () => { const g = window.__gameplay; g.state.board = []; g.jobs.refresh(); const j = g.jobs.board()[0]; g.jobs.accept(j.id); const r = await g.rest('sleep', { fast: true }); return { job: g.state.job && g.state.job.title, r } })
    await G(page, () => { const h = window.__gameplay.home(), sa = h.standAt || h; window.__worldAPI.teleport(sa.gx, sa.gy) }); await sleep(600)
    await promptTap(page, prof, 'nhà'); await sleep(500)
    const m2 = await G(page, () => { const m = document.getElementById('gp-home-menu'); if (!m) return null; const b = m.querySelector('[data-rest="sleep"]'); return { dis: b.disabled, note: m.querySelector('[data-note="sleep"]')?.textContent } })
    await qshot(page, prof, 'c_home_menu_job')
    check(P('đang có việc: không cho ngủ (nút khoá + lý do rõ), rest("sleep") từ chối'), !jb.r.ok && /Đang có việc/.test(jb.r.reason) && m2 && m2.dis && /Đang có việc/.test(m2.note || ''), JSON.stringify({ r: jb.r, menu: m2 }))
    await G(page, () => { document.getElementById('gp-home-menu')?.remove(); window.__gameplay.jobs.cancel() })
  }

  // ───────────── chạy ─────────────
  async function partDot4(browser) {
    const prof = { name: 'pc', label: 'PC 1280x720', touch: false, ctx: { viewport: { width: 1280, height: 720 } } }
    section('6. Đợt 4 (0.11.0) PC 1280x720')
    const { ctx, page, rec } = await openPage(browser, prof, { countAudio: true })
    const P = (n) => `[pc] ${n}`
    await step('b. ngày/giờ', () => dayTime(page, prof, P))
    await step('a. âm thanh', () => audioWorst(page, prof, P))
    await step('e. zoom', () => zoomWheel(page, prof, P))
    await step('d. va chạm', () => collisions(page, prof, P))
    await step('d. auto-walk 81', () => autoWalkAll(page, prof, P))
    await step('f. quán mở/đóng', () => openClose(page, prof, P))
    await step('h. đồ uống', () => drinkText(page, prof, P))
    await step('g. mini-game', () => minigames(page, prof, P))
    await step('g. xích lô ảnh', () => cycloGfx(page, prof, P))
    await step('c. nhà (PC)', () => homeFlow(page, prof, P))
    await step('k. điện thoại thể lực thấp', () => tiredPhone(page, prof, P))
    await step('i. ánh sáng', () => lighting(page, prof, P))
    const errs = await G(page, () => window.__stats.errors.slice())
    check(P('đợt 4: __stats.errors rỗng'), errs.length === 0, errs.slice(0, 3).join(' | '))
    check(P('đợt 4: 0 lỗi console, 0 lỗi trang'), rec.consoleErrors.length === 0 && rec.pageErrors.length === 0, rec.consoleErrors.concat(rec.pageErrors).slice(0, 3).join(' | '))
    check(P('đợt 4: 0 request ra ngoài'), rec.external.length === 0, rec.external.slice(0, 3).join(', '))
    await ctx.close()
    // bong bóng: HiDPI ×2
    const prof2 = { name: 'pc2x', label: 'PC 1280x720 DPR2', touch: false, ctx: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 } }
    const o2 = await openPage(browser, prof2)
    await step('j. bong bóng', () => bubbles(o2.page, prof2, (n) => `[pc×2] ${n}`))
    check('[pc×2] 0 lỗi console', o2.rec.consoleErrors.length === 0 && o2.rec.pageErrors.length === 0, o2.rec.consoleErrors.concat(o2.rec.pageErrors).slice(0, 3).join(' | '))
    await o2.ctx.close()
  }
  async function partDot4Mobile(browser) {
    const prof = { name: 'mobile', label: 'điện thoại dọc 390x844 (cảm ứng)', touch: true, ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } }
    section('7. Đợt 4 (0.11.0) điện thoại 390x844 cảm ứng')
    const { ctx, page, rec } = await openPage(browser, prof, { countAudio: true })
    const P = (n) => `[mobile] ${n}`
    await step('c. nhà (chạm thật)', () => homeFlow(page, prof, P))
    await step('e. nút zoom', () => zoomButtons(page, prof, P))
    await step('a. âm thanh (di động)', async () => {
      await page.touchscreen.tap(195, 500); await sleep(500)
      const r = await G(page, () => ({ st: window.__audio.state(), acs: window.__acCount() }))
      check(P('âm: chạm màn hình mở khoá, chỉ 1 AudioContext'), r.st.ctx === 'running' && r.acs === 1, JSON.stringify(r))
    })
    await step('k. điện thoại thể lực thấp (di động)', () => tiredPhone(page, prof, P))
    await step('g. mini-game ảnh (di động)', async () => {
      for (const gid of ['pho', 'pho:banhmi', 'tc', 'rail', 'ship', 'cyclo']) {
        const [id, variant] = gid.split(':'), tag = id + (variant ? '_' + variant : '')
        await G(page, ([id, variant]) => { window.__mgRes = null; const K = window.__gameplay.balance.JOB_KINDS; window.__gameplay.minigames.start(id, { timeScale: 6, variant, noPay: true, title: (K[variant || id] || {}).title }).then((r) => { window.__mgRes = r }) }, [id, variant]); await page.waitForSelector('.gm'); await sleep(300)
        await qshot(page, prof, `g_${tag}_intro`); await audit(page, `mini-game ${tag} giới thiệu`, prof)
        await tapOrClick(page, prof, '.gm-go'); await sleep(300)
        // chạm thật vài nút điều khiển trên màn mini-game
        for (let i = 0; i < 6; i++) { const b = page.locator('.gm-ctrl button'); const n = await b.count(); if (n) await b.nth(i % n).tap({ timeout: 1500 }).catch(() => {}); await sleep(300) }
        await qshot(page, prof, `g_${tag}_mid`); await audit(page, `mini-game ${tag} đang chơi`, prof)
        // chờ hết lượt thật (timeScale 6: 45 s -> ~7,5 s) để có màn kết quả (debugFinish bỏ qua màn kết quả)
        await page.waitForFunction(() => window.__gameplay.minigames.current()?.stage === 'result' || !window.__gameplay.minigames.isActive(), null, { timeout: 20000 }).catch(() => {}); await sleep(500)
        await qshot(page, prof, `g_${tag}_result`); await audit(page, `mini-game ${tag} kết quả`, prof)
        if (await page.locator('.gm .gm-go').count()) await tapOrClick(page, prof, '.gm .gm-go').catch(() => {}); await sleep(350)
        const left = await G(page, () => window.__gameplay.minigames.isActive())
        if (left) await G(page, () => document.querySelector('.gm .gm-go, .gm .gm-x')?.click()), await sleep(300)
        const r = await G(page, () => window.__mgRes)
        check(P(`mini-game ${tag}: chạm chơi được và đóng sạch`), !!r && !(await G(page, () => window.__gameplay.minigames.isActive())), JSON.stringify(r && { score: r.score, pay: r.pay, failed: r.failed }))
      }
    })
    const errs = await G(page, () => window.__stats.errors.slice())
    check(P('đợt 4: __stats.errors rỗng'), errs.length === 0, errs.slice(0, 3).join(' | '))
    check(P('đợt 4: 0 lỗi console, 0 lỗi trang'), rec.consoleErrors.length === 0 && rec.pageErrors.length === 0, rec.consoleErrors.concat(rec.pageErrors).slice(0, 3).join(' | '))
    await ctx.close()
  }
  return { partDot4, partDot4Mobile }
}

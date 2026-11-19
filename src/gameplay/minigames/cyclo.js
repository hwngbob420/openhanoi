// Mini-game #5: Đạp xích lô quanh Hồ Gươm. Đạp luân phiên chân trái / phải (A và D, ← và →, hoặc 2 nút) để lấy đà;
// đạp cùng một bên liên tục thì yếu. Có người qua đường: bấm RUNG CHUÔNG (Space) trước khi tới gần, nếu không phải phanh gấp.
// Luật đi bộ: người đi bộ sắp sang đường hiện dấu `!` đỏ từ xa. Space đúng tầm = "kính coong" -> họ dừng bên lề, bong bóng xanh
// "Mời bác đi trước!", xe đi qua. Không rung: họ vẫn bước qua, xe tự phanh chờ họ qua hẳn mới đạp tiếp; đạp quá nhanh thì phanh
// không kịp -> đâm: huỷ chuyến ngay, bồi thường (economy-config FINES) trừ thẳng vào ví, không để ví âm.
import { R, shadow, burst, clamp, rnd, drawMG, drawMGOutlined, W, H } from './gfx.js'
import { bus } from '../../core/bus.js'
import { fine as fineWallet } from '../economy.js'
import { CYCLO_FINE, fmtVND } from '../economy-config.js'
import { MG } from '../balance.js'

const K = MG.cyclo
const lerp = (a, b, f) => a + (b - a) * clamp(f, 0, 1)

// Đợt 4: tốc độ đến từ NHỊP đạp (luân phiên, khoảng cách hai nhịp gần nhịp chuẩn K.cadence0 -> K.cadence1 nhanh dần trong lượt);
// đạp dồn quá nhanh (< K.minGap) = hụt xích, mất đà. Quãng đường K.goal ứng với phần điểm quãng đường tối đa.
const WARN_DX = 215                            // dấu ! hiện từ xa tới đây
const CROSS_DX = 72                            // không được nhường thì người đi bộ bước ra đường khi xe cách chừng này
const BRAKE = 130                              // gia tốc phanh (px/s²)
const CX = 104                                 // vị trí xích lô trên màn hình

export default {
  id: 'cyclo',
  title: 'Đạp xích lô Hồ Gươm',
  how: 'Đạp luân phiên hai chân: A rồi D (hoặc ← rồi →, hoặc chạm hai nút Chân trái / Chân phải), giữ NHỊP ĐỀU khoảng 3–4 lần mỗi giây (thanh xanh dương = độ đều). Đạp dồn quá nhanh sẽ hụt xích.\nThấy dấu ! đỏ là có người sắp sang đường: bấm Space (nút Rung chuông) cho kêu kính coong, họ sẽ nhường xe bạn đi trước. Không rung thì phải phanh chờ họ qua; rung chuông vô cớ bị trừ điểm; đạp quá nhanh mà đâm người thì chuyến bị hủy và phải đền ' + fmtVND(CYCLO_FINE) + '.',
  create(env) {
    const S = { dist: 0, v: 0, last: '', streak: 0, flow: 0, hits: 0, walkers: [], nextWalker: 380, fx: [], crank: 0, stumble: 0, bellFx: 0, taps: 0, wid: 0,
      yields: 0, bells: 0, lastBell: '', braking: false, crashed: false, fine: 0, fineWanted: 0, stopTime: 0, bubs: new Map(), noSpawn: false,
      t: 0, lastTap: -9, slips: 0, badBells: 0, met: 0, dur: env.dur || 45 }
    const cadence = () => lerp(K.cadence0, K.cadence1, S.t / S.dur)
    env.setHint('Đạp LUÂN PHIÊN trái – phải (A / D hoặc ← / →) theo nhịp đều, đừng dồn. Thấy dấu ! thì bấm Space / nút chuông.')
    env.btn('Chân trái', { key: 'a', cls: 'green', sub: 'A / ←' })
    env.btn('Rung chuông', { cls: '', onDown: () => bell(), sub: 'Space' })
    env.btn('Chân phải', { key: 'd', cls: 'green', sub: 'D / →' })
    const over = env.overlay
    const night = !!(window.__worldAPI?.isNight?.())          // chỉ phần vẽ: đèn bờ hồ sáng khi trời tối
    function playBell() {          // "kính coong"; audio chưa có tiếng này (has() === false) thì dùng 'bell'
      const has = window.__audio && typeof window.__audio.has === 'function' ? window.__audio.has('kinhcoong') : true
      S.lastBell = has ? 'kinhcoong' : 'bell'
      bus.emit('sfx', { name: S.lastBell })
    }
    function bubble(key, text, cls, x, y) {      // bong bóng DOM (chữ đủ dấu, nét sắc) neo theo toạ độ logic 320x180
      let b = S.bubs.get(key)
      if (!b) { b = document.createElement('div'); b.className = 'gm-bub ' + cls; b.textContent = text; b.dataset.key = key; over.appendChild(b); S.bubs.set(key, b) }
      b.style.left = (x / W * 100) + '%'; b.style.top = (y / H * 100) + '%'
      const ow = over.clientWidth, bw = b.offsetWidth                       // giữ bong bóng trọn trong khung (người đứng sát mép phải/trái)
      if (ow && bw) { const cx = x / W * ow, lo = bw / 2 + 4, hi = ow - bw / 2 - 4; if (cx < lo || cx > hi) b.style.left = clamp(cx, lo, Math.max(lo, hi)) + 'px' }
      return b
    }
    function dropBubble(key) { const b = S.bubs.get(key); if (b) { b.remove(); S.bubs.delete(key) } }
    function bell() {
      if (S.crashed) return
      S.bellFx = 0.6; S.bells++; playBell()
      let t = null          // người đi bộ gần nhất đang đợi bên lề trong tầm nhìn -> nhường
      for (const w of S.walkers) { const dx = w.x - S.dist; if (w.state === 'wait' && dx > 18 && dx < WARN_DX && (!t || dx < t.x - S.dist)) t = w }
      if (!t) S.badBells++                      // rung vô cớ (không có ai đang chờ trong tầm)
      if (t) { t.state = 'yield'; t.yieldT = 0; S.yields++; S.met++; S.fx.push({ x: CX + (t.x - S.dist), y: 100, t: 0, c: '#6bb8ff' }) }
    }
    function pedal(side) {
      if (S.stumble > 0 || S.crashed || S.braking) return
      S.taps++
      const gap = S.t - S.lastTap; S.lastTap = S.t
      const alt = side !== S.last
      S.last = side
      if (gap < K.minGap) { S.slips++; S.v *= 0.85; S.streak = 0; S.flow = clamp(S.flow - 0.2, 0, 1); return }   // dồn quá nhanh: hụt xích
      const q = alt ? Math.max(0, 1 - ((gap - cadence()) / K.band) ** 2) : 0                                       // độ khớp nhịp 0..1
      S.streak = q > 0.5 ? S.streak + 1 : 0
      S.v = Math.min(150, S.v + K.power * q)
      S.crank += 0.9
      S.flow = clamp(S.flow * 0.65 + q * 0.35, 0, 1)
    }
    function spawnWalker(dx = 420) { S.walkers.push({ id: ++S.wid, x: S.dist + dx, seed: S.wid * 5 + 1, state: 'wait', p: 0, yieldT: 0, hit: false, dir: Math.random() < 0.5 ? 1 : -1 }) }
    function crash(w) {
      w.hit = true; S.hits++; S.crashed = true; S.braking = false; S.v = 0; S.stumble = 1
      env.sfx('horn')
      S.fineWanted = CYCLO_FINE
      S.fine = (env.fine || fineWallet)(CYCLO_FINE, 'bồi thường')          // trừ thẳng vào ví, tối đa bằng số tiền đang có
      S.fx.push({ x: CX + (w.x - S.dist), y: 100, t: 0, c: '#e0553f' })
      bubble('crash', 'Á! Đụng người rồi! −' + fmtVND(S.fine) + (S.fine < CYCLO_FINE ? ' (hết sạch ví)' : ''), 'red', CX + 6, 112)
      env.end('crash')                                       // huỷ chuyến ngay
    }
    env.expose({ S, spawnWalker, ring: bell, setSpeed: (v) => { S.v = v }, setDist: (d) => { S.dist = d }, noSpawn: (on) => { S.noSpawn = !!on } })
    return {
      key(k, down) {
        if (!down) return
        if (k === 'a' || k === 'arrowleft') pedal('L')
        else if (k === 'd' || k === 'arrowright') pedal('R')
        else if (k === ' ' || k === 'b' || k === 'arrowup' || k === 'enter') bell()
      },
      pointer(type, x) { if (type === 'down') { if (x < W * 0.4) pedal('L'); else if (x > W * 0.6) pedal('R'); else bell() } },
      debug() {
        return {
          cadence: +cadence().toFixed(3), slips: S.slips, badBells: S.badBells, met: S.met, flow: +S.flow.toFixed(2),
          walkers: S.walkers.length, list: S.walkers.map((w) => ({ id: w.id, dx: Math.round(w.x - S.dist), state: w.state, p: +w.p.toFixed(2) })),
          yields: S.yields, yielded: S.yields > 0, bells: S.bells, lastBell: S.lastBell, braking: S.braking, crashed: S.crashed, hits: S.hits,
          fine: S.fine, fineWanted: S.fineWanted, dist: Math.round(S.dist), v: Math.round(S.v), stopTime: +S.stopTime.toFixed(2),
        }
      },
      update(dt, t) {
        S.t = t
        if (S.crashed) { S.bellFx = 0; for (const f of S.fx) f.t += dt * 2; return }
        S.flow = Math.max(0, S.flow - dt * 0.12)
        if (S.stumble > 0) { S.stumble -= dt; S.v *= Math.exp(-4 * dt) }
        // có người đang sang đường phía trước -> phanh (xe chậm thì kịp dừng, quá nhanh thì đâm)
        S.braking = S.walkers.some((w) => w.state === 'cross' && !w.hit && w.p < 1 && w.x - S.dist > -2 && w.x - S.dist < 120)
        if (S.braking) { S.v = Math.max(0, S.v - BRAKE * dt); if (S.v < 1) { S.v = 0; S.stopTime += dt } } else S.v *= Math.exp(-K.drag * dt)
        S.dist += S.v * dt
        if (!S.noSpawn && S.dist > S.nextWalker) { spawnWalker(420); S.nextWalker += rnd(360, 560) * lerp(1, K.walkerGapEnd, t / S.dur) }
        for (const w of S.walkers) {
          const dx = w.x - S.dist
          if (w.state === 'wait' && dx < CROSS_DX) { w.state = 'cross'; S.met++ }                       // không ai nhường -> bước ra đường
          if (w.state === 'yield') { w.yieldT += dt; if (dx < -16 && w.yieldT > 1.2) { w.state = 'cross'; dropBubble('y' + w.id) } }   // xe qua rồi họ mới sang
          if (w.state === 'cross') {
            w.p = Math.min(1, w.p + dt * 0.7)
            const q = w.dir > 0 ? w.p : 1 - w.p                                            // vị trí ngang đường (0 mép hồ .. 1 mép xa)
            if (!w.hit && dx < 10 && dx > -8 && q > 0.3 && q < 0.98) { crash(w); return }
            if (w.p >= 1) w.state = 'done'
          }
        }
        S.walkers = S.walkers.filter((w) => { const keep = w.state === 'done' ? w.x - S.dist > -10 : w.x - S.dist > -70; if (!keep) dropBubble('y' + w.id); return keep })
        S.bellFx = Math.max(0, S.bellFx - dt)
        for (const f of S.fx) f.t += dt * 2
        S.fx = S.fx.filter((f) => f.t < 1)
      },
      hud() { return `Quãng đường ${Math.round(S.dist / 10)}m${S.flow > 0.5 ? ' · đạp đều' : ''}${S.braking ? ' · phanh chờ người đi bộ' : ''}${S.yields ? ' · được nhường ' + S.yields : ''}` },
      draw(g, t, stage) {
        const T = stage === 'play' ? t : performance.now() / 1000
        const d = S.dist
        // trời
        const bands = ['#bfe3f2', '#cde9f4', '#dcf0f6', '#e8f6f4']
        bands.forEach((c, i) => R(g, 0, i * 14, W, 14, c))
        // mây
        for (let i = 0; i < 4; i++) { const x = ((i * 97 - d * 0.04) % (W + 60) + W + 60) % (W + 60) - 30; drawMG(g, 'cy_cloud', Math.round(x), 6 + (i % 2) * 14) }
        // bờ hồ bên kia: nhà ống mái ngói + cây (ghép liền mỗi 160px, trôi chậm)
        for (let x = -(((d * 0.12) % 160) + 160) % 160; x < W; x += 160) drawMG(g, 'cy_far_shore', Math.round(x), 60)
        // mặt Hồ Gươm, sóng lăn tăn
        for (let x = -(((d * 0.25) % 64) + 64) % 64; x < W; x += 64) drawMG(g, 'cy_water', Math.round(x), 58, { t: T })
        // Tháp Rùa, cầu Thê Húc + đền Ngọc Sơn (trôi theo xe)
        const lm = (off, name, y) => { const x = off - d * 0.35; if (x > -70 && x < W + 70) drawMG(g, name, Math.round(x), y) }
        lm(400, 'cy_turtle_tower', 96); lm(1250, 'cy_ngocson', 104); lm(2300, 'cy_turtle_tower', 96); lm(3300, 'cy_ngocson', 104)
        // bờ cỏ + kè đá, liễu rủ, cột đèn gang, ghế đá
        for (let x = -(((d * 0.7) % 32) + 32) % 32; x < W; x += 32) drawMG(g, 'cy_bank', Math.round(x), 108)
        for (let i = 0; i < 8; i++) {
          const x = Math.round((((i * 83 - d * 0.7) % 664) + 664) % 664 - 40)
          if (i % 4 === 1) { drawMG(g, 'cy_lamp', x, 122, { frame: night ? 1 : 0 }); drawMG(g, 'cy_bench', x + 26, 121) }
          else drawMG(g, 'cy_willow', x, 122, { t: T + i * 0.3 })
        }
        // vỉa hè lát đá + đường nhựa có vạch (cuộn đúng tốc độ xe)
        for (let x = -((d % 32) + 32) % 32; x < W; x += 32) drawMG(g, 'cy_road', Math.round(x), 122)
        // xích lô (người đạp màu theo trang phục + khách Tây); bánh quay theo quãng đường nên phanh là bánh đứng
        const wob = Math.round(Math.sin(S.crank * 3) * (S.v > 6 ? 0.8 : 0)) + (S.stumble > 0 ? Math.round(Math.sin(T * 40) * 1.5) : 0), by = 152 + wob
        const cyBase = 157
        const drawCyclo = () => {
          shadow(g, CX + 4, by + 4, 56)
          drawMG(g, 'cyclo', CX + 4, by + 5, { frame: Math.floor(d / 9) % 4, outfit: env.outfit })
          if (S.bellFx > 0) drawMG(g, 'fx_bell', CX - 18, by - 38, { t: T })
          if (S.crashed) R(g, CX - 26, by + 5, 60, 1, 'rgba(60,40,30,.55)')          // vệt phanh gấp
        }
        // người qua đường (dấu ! đỏ cảnh báo từ xa, bong bóng xanh khi nhường) — sắp theo chân với xích lô; người bị đâm luôn vẽ trên cùng
        const live = new Set(), front = [], back = []
        for (const w of S.walkers) {
          const dx = w.x - d, sx = Math.round(CX + dx), q = w.dir > 0 ? w.p : 1 - w.p, wy = 118 + q * 46, fy = Math.round(wy + 14)
          if (sx > W + 20) continue
          const face = w.dir > 0 ? 'down' : 'up'                      // chờ bên lề cũng quay mặt ra đường
          const walking = w.state === 'cross' && !w.hit
          const dr = () => {
            if (w.hit) drawMGOutlined(g, `ped_${w.seed % 8}_${face}`, sx, fy, { frame: 0 }, Math.floor(T * 6) % 2 ? '#ffffff' : '#ff5a4a')   // người bị đâm: viền sáng nháy, luôn ở trên xe
            else drawMG(g, `ped_${w.seed % 8}_${face}`, sx, fy, walking ? { t: T + w.seed * 0.13 } : { frame: 0 })
            if (w.hit) { R(g, sx - 9, fy - 31, 1, 1, '#ffe14a'); R(g, sx + 8, fy - 29, 1, 1, '#ffe14a'); R(g, sx - 6, fy - 34, 2, 2, '#ff8a3a'); R(g, sx + 5, fy - 33, 2, 2, '#ff8a3a') }
            if (w.state === 'wait' && dx > 0 && dx < WARN_DX) drawMG(g, 'ico_warn', sx, fy - 31, { t: T })
          }
          ;(w.hit ? front : fy > cyBase ? front : back).push(w.hit ? { y: 1e9, dr } : { y: fy, dr })
          if (w.state === 'yield') { bubble('y' + w.id, 'Mời bác đi trước!', 'blue', sx, fy - 32); live.add('y' + w.id) }
        }
        for (const k of [...S.bubs.keys()]) if (k[0] === 'y' && !live.has(k)) dropBubble(k)
        back.sort((a, b) => a.y - b.y).forEach((o) => o.dr())
        drawCyclo()
        front.sort((a, b) => a.y - b.y).forEach((o) => o.dr())
        for (const f of S.fx) burst(g, f.x, f.y, f.t, f.c)
        // đồng hồ tốc độ
        R(g, 8, H - 14, 70, 7, '#2a2118'); const sp = clamp(S.v / 110, 0, 1); R(g, 9, H - 13, 68 * sp, 5, sp > 0.45 && sp < 0.95 ? '#6bd06b' : '#e8c34a'); R(g, 8, H - 9, 70, 1, 'rgba(255,255,255,.2)')
        R(g, 84, H - 14, 70, 7, '#2a2118'); R(g, 85, H - 13, 68 * S.flow, 5, '#6aa0e8')
      },
      result() {
        for (const k of [...S.bubs.keys()]) if (k !== 'crash') dropBubble(k)
        if (S.crashed) return { score: 0, failed: true, fine: S.fine, summary: `Xe đâm người đi bộ sau ${Math.round(S.dist / 10)}m. Chuyến bị hủy, đền ${fmtVND(S.fine)}${S.fine < S.fineWanted ? ' (ví chỉ có bấy nhiêu, đã trừ hết)' : ''}.` }
        // quãng đường (tối đa 100 - K.courtesy) + lịch sự (K.courtesy × tỉ lệ người đi bộ được rung chuông nhường) - rung vô cớ
        const distPart = Math.min(100 - K.courtesy, (100 - K.courtesy) * S.dist / K.goal)
        const court = S.met ? K.courtesy * S.yields / S.met : 0
        const score = clamp(Math.round(distPart + court - K.badBell * S.badBells), 0, 100)
        return { score, summary: `Đạp được ${Math.round(S.dist / 10)}m · người đi bộ nhường đường ${S.yields}/${S.met} · hụt xích ${S.slips} · rung chuông vô cớ ${S.badBells}` }
      },
    }
  },
}

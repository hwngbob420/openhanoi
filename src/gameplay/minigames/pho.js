// Mini-game #1: Phụ quán Phở / Bánh mì theo nhịp gọi món (hoàn chỉnh). 45 giây.
// Khách ngồi ghế đẩu, mỗi người một bong bóng gọi món. Bấm đúng món (1/2/3 hoặc chạm nút) -> phục vụ khách đã chờ lâu nhất muốn món đó.
// Bấm khi chấm sáng chạy vào vùng xanh (đúng nhịp trống) được thưởng thêm. Bấm món không ai gọi = nhầm, mất combo.
import { R, bubble, bar, burst, clamp, rnd, drawMG, pxText, pxTextW, W, H } from './gfx.js'
import { MG } from '../balance.js'
import { DISHES, fmtVND } from '../economy-config.js'

const MENUS = {
  pho: [{ id: 'pho', name: 'Phở', col: '#e9d9a6' }, { id: 'quay', name: 'Quẩy', col: '#e3a948' }, { id: 'tra', name: 'Trà đá', col: '#d9b443' }],
  banhmi: [{ id: 'bm', name: 'Bánh mì pate', col: '#e8b866' }, { id: 'bmtrung', name: 'Bánh mì trứng', col: '#f0b429' }, { id: 'mia', name: 'Nước mía', col: '#b8d86a' }],
}
const K = MG.pho
const BEAT = K.beat                        // 96 nhịp/phút
const WF = K.win / BEAT                    // nửa vùng xanh trên thanh nhịp (tỉ lệ 1 phách)
const lerp = (a, b, f) => a + (b - a) * clamp(f, 0, 1)
const SEATS = [46, 118, 190, 262]

export default {
  id: 'pho',
  title: 'Phụ quán phở',
  how: 'Khách gọi món trong bong bóng. Bấm đúng món để bưng ra (phím 1 / 2 / 3 hoặc chạm nút).\nBấm ĐÚNG lúc chấm sáng vào vùng xanh mới được trọn điểm, lệch nhịp chỉ được non nửa. Bấm món không ai gọi bị trừ điểm. Khách đến dồn dần, đừng để ai bỏ về!',
  create(env) {
    const variant = env.opts.variant === 'banhmi' ? 'banhmi' : 'pho'
    const menu = MENUS[variant]
    const S = { custs: [], served: 0, perfect: 0, wrong: 0, lost: 0, combo: 0, best: 0, nextSpawn: 0.8, pts: 0, dur: env.dur || 45, seed: 1, fx: [], pop: 0, t: 0, beatN: 0, seatLast: -1, hands: 0, sizzle: 0 }
    env.expose(S)
    env.setHint('Phím 1 / 2 / 3 hoặc chạm nút món. Bấm đúng lúc chấm sáng vào vùng xanh mới được trọn điểm.')
    menu.forEach((m, i) => env.btn(`${i + 1}  ${m.name}`, { key: String(i + 1), cls: i === 0 ? 'green' : i === 1 ? '' : 'red', sub: variant === 'pho' ? ['Bát phở nóng', 'Quẩy giòn', 'Cốc trà đá'][i] : ['Pate + dưa', 'Trứng ốp', 'Cốc nước mía'][i] }))
    const phase = (t) => ((t % BEAT) + BEAT) % BEAT / BEAT
    const onBeat = (t) => { const p = phase(t); return p > 1 - WF || p < WF }
    const free = () => { for (let i = 0; i < SEATS.length; i++) if (!S.custs.some((c) => c.seat === i)) return i; return -1 }

    function spawn(t) {
      const seat = free(); if (seat < 0) return
      const pat = lerp(K.patStart, K.patEnd, t / S.dur)
      S.custs.push({ seat, dish: Math.floor(Math.random() * menu.length), born: t, pat, left: pat, seed: S.seed++ + (seat * 3), arrive: 0, state: 'wait', timer: 0 })
    }
    function serve(k, t) {
      const idx = menu.findIndex((_, i) => String(i + 1) === k || (k === 'j' && i === 0) || (k === 'k' && i === 1) || (k === 'l' && i === 2))
      if (idx < 0) return
      const cands = S.custs.filter((c) => c.dish === idx && c.state === 'wait').sort((a, b) => a.born - b.born)
      S.hands = 0.18; S.sizzle = 1
      if (!cands.length) { S.wrong++; S.pts -= K.wrong; S.combo = 0; env.sfx('error'); S.fx.push({ x: W / 2, y: 100, t: 0, bad: true }); return }
      const c = cands[0], pf = onBeat(t)
      c.state = 'ate'; c.timer = 0.5; S.served++; S.pts += pf ? 1 : K.offBeat; S.combo++; S.best = Math.max(S.best, S.combo)
      if (pf) { S.perfect++; env.sfx('ting') } else env.sfx('sizzle')
      S.fx.push({ x: SEATS[c.seat], y: 112, t: 0, perfect: pf, dish: menu[idx].id })
    }

    return {
      key(k, down) { if (down) serve(k, S.t) },
      update(dt, t) {
        S.t = t
        S.nextSpawn -= dt
        if (S.nextSpawn <= 0) { spawn(t); S.nextSpawn = BEAT * lerp(K.gapStart, K.gapEnd, t / S.dur) * rnd(0.8, 1.2) }
        for (const c of S.custs) {
          c.arrive = Math.min(1, c.arrive + dt * 3)
          if (c.state === 'wait') { c.left -= dt; if (c.left <= 0) { c.state = 'leave'; c.timer = 0.8; S.lost++; S.pts -= K.lost; S.combo = 0; env.sfx('error') } } else c.timer -= dt
        }
        S.custs = S.custs.filter((c) => c.state === 'wait' || c.timer > 0)
        for (const f of S.fx) f.t += dt * 2.2
        S.fx = S.fx.filter((f) => f.t < 1)
        S.hands = Math.max(0, S.hands - dt); S.sizzle = Math.max(0, S.sizzle - dt * 3)
      },
      hud() { return `Phục vụ ${S.served}${S.combo > 1 ? ' · combo x' + S.combo : ''}` },
      draw(g, t, stage) {
        const T = stage === 'play' ? t : performance.now() / 1000
        const isPho = variant === 'pho'
        // tường + mái hiên + biển hiệu + bảng giá (sprite; bảng trống, giá ghi lúc chạy từ economy-config)
        drawMG(g, isPho ? 'pho_wall' : 'bm_wall', 0, 0)
        const dish = DISHES[isPho ? 'pho' : 'banhmi']
        if (dish) {
          const nm = dish.name.toUpperCase(), pr = fmtVND(dish.price)
          pxText(g, 266 - (pxTextW(nm) >> 1), 50, nm, '#f4efe2'); pxText(g, 266 - (pxTextW(pr) >> 1), 59, pr, '#f2c23c')
        }
        // nồi nước dùng sôi + hơi (quán phở)
        if (isPho) {
          drawMG(g, 'pho_pot', 40, 76, { t: T })
          for (let i = 0; i < 3; i++) { const k = (T * 14 + i * 9) % 18; R(g, 30 + i * 9 + Math.round(Math.sin(T * 2 + i) * 1.5), 42 - k, 2, 5, 'rgba(255,255,255,' + (0.55 - k / 36).toFixed(2) + ')') }
        }
        // người bán (người chơi, màu theo trang phục) đứng sau quầy: khung 1 = hai tay bưng món ra
        drawMG(g, 'player_serve', 160, 80, { frame: S.hands > 0 ? 1 : 0, outfit: env.outfit })
        drawMG(g, isPho ? 'pho_counter' : 'bm_counter', 0, 72)
        // sàn gạch hoa chỗ khách ngồi
        for (let x = 0; x < W; x += 32) drawMG(g, 'pho_floor', x, 110)
        // khách
        const queue = S.custs.filter((c) => c.state === 'wait').sort((a, b) => a.born - b.born)
        for (const c of S.custs) {
          const x = SEATS[c.seat], dy = (1 - c.arrive) * 24
          drawMG(g, 'cust_' + ((Math.imul(c.seed * 131 + Math.floor(c.born * 1000), 2654435761) >>> 0) >>> 29) + '_up', x, Math.round(172 - dy), { frame: c.state === 'ate' ? 1 : 0 })
          if (c.arrive >= 1 && c.state !== 'leave') {
            const m = menu[c.dish]
            if (c.state === 'wait') {
              const urgent = c.left < c.pat * 0.35, wob = urgent ? Math.round(Math.sin(T * 24)) : 0
              bubble(g, x + wob, 140, 26, 21, urgent ? '#ffe3d8' : '#fffaf0'); drawMG(g, 'food_' + m.id, x + wob, 137, { t: T })
              bar(g, x - 13, 111, 26, c.left / c.pat, urgent ? '#e0553f' : '#6bd06b')
              if (queue[0] === c) { R(g, x - 3, 105, 7, 1, '#ffe14a'); R(g, x - 2, 106, 5, 1, '#ffe14a'); R(g, x - 1, 107, 3, 1, '#ffe14a') }
            } else R(g, x - 4, 134, 8, 2, '#ffe14a')
          }
          if (c.state === 'leave') { R(g, x - 4, 128, 2, 5, '#e0553f'); R(g, x + 2, 128, 2, 5, '#e0553f'); R(g, x - 2, 134, 5, 1, '#e0553f') }
        }
        // hiệu ứng
        for (const f of S.fx) {
          if (f.bad) { R(g, f.x - 10, f.y - f.t * 10, 20, 3, '#e0553f'); continue }
          const yy = 80 + (f.y - 80) * Math.min(1, f.t * 2.5)
          drawMG(g, 'food_' + f.dish, f.x, Math.round(yy - 13 + f.t * 6), { t: T })
          burst(g, f.x, f.y - 14, f.t, f.perfect ? '#ffe14a' : '#ffffff')
          if (f.perfect) { R(g, f.x - 12, f.y - 30 - f.t * 10, 24, 5, '#ffe14a'); R(g, f.x - 11, f.y - 29 - f.t * 10, 22, 3, '#c98a10') }
        }
        // thanh nhịp
        const p = phase(stage === 'play' ? t : T)
        R(g, 8, 172, W - 16, 4, '#2a2118'); R(g, 8 + (W - 16) * (1 - WF), 172, (W - 16) * WF, 4, '#2f8a3f'); R(g, 8, 172, (W - 16) * WF, 4, '#2f8a3f')
        const bx = 8 + (W - 16) * p; R(g, bx - 2, 169, 5, 10, onBeat(stage === 'play' ? t : T) ? '#ffe14a' : '#f4efe2')
      },
      result() {
        // chuẩn hoá theo CƠ HỘI của chính lượt này: mỗi khách = 1 suất (đúng nhịp 1, lệch nhịp K.offBeat, bỏ về -K.lost); bấm nhầm -K.wrong.
        // Khách còn đang chờ lúc hết giờ chỉ tính nếu đã chờ quá 2 phách (lẽ ra đã phục vụ được).
        const pending = S.custs.filter((c) => c.state === 'wait' && S.t - c.born > BEAT * 2).length
        const n = Math.max(8, S.served + S.lost + pending)
        return { score: clamp(Math.round(100 * S.pts / n), 0, 100), summary: `Phục vụ ${S.served} khách · đúng nhịp ${S.perfect} · combo cao nhất ${S.best}\nNhầm món ${S.wrong} · khách bỏ về ${S.lost}` }
      },
    }
  },
}

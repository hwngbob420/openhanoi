// Mini-game #1: Phụ quán Phở / Bánh mì theo nhịp gọi món (hoàn chỉnh). 45 giây.
// Khách ngồi ghế đẩu, mỗi người một bong bóng gọi món. Bấm đúng món (1/2/3 hoặc chạm nút) -> phục vụ khách đã chờ lâu nhất muốn món đó.
// Bấm khi chấm sáng chạy vào vùng xanh (đúng nhịp trống) được thưởng thêm. Bấm món không ai gọi = nhầm, mất combo.
import { R, icon, person, npc, bubble, bar, burst, shadow, clamp, rnd, W, H } from './gfx.js'

const MENUS = {
  pho: [{ id: 'pho', name: 'Phở', col: '#e9d9a6' }, { id: 'quay', name: 'Quẩy', col: '#e3a948' }, { id: 'tra', name: 'Trà đá', col: '#d9b443' }],
  banhmi: [{ id: 'bm', name: 'Bánh mì pate', col: '#e8b866' }, { id: 'bmtrung', name: 'Bánh mì trứng', col: '#f0b429' }, { id: 'mia', name: 'Nước mía', col: '#b8d86a' }],
}
const BEAT = 0.625                         // 96 nhịp/phút
const SEATS = [46, 118, 190, 262]

export default {
  id: 'pho',
  title: 'Phụ quán phở',
  how: 'Khách gọi món trong bong bóng. Bấm đúng món để bưng ra (phím 1 / 2 / 3 hoặc chạm nút).\nBấm lúc chấm sáng chạy vào vùng xanh để được thưởng đúng nhịp. Đừng để khách chờ lâu!',
  create(env) {
    const variant = env.opts.variant === 'banhmi' ? 'banhmi' : 'pho'
    const menu = MENUS[variant]
    const S = { custs: [], served: 0, perfect: 0, wrong: 0, lost: 0, combo: 0, best: 0, nextSpawn: 0.8, seed: 1, fx: [], pop: 0, t: 0, beatN: 0, seatLast: -1, hands: 0, sizzle: 0 }
    env.expose(S)
    env.setHint('Phím 1 / 2 / 3 hoặc chạm nút món. Bấm khi chấm sáng vào vùng xanh để được thêm điểm.')
    menu.forEach((m, i) => env.btn(`${i + 1}  ${m.name}`, { key: String(i + 1), cls: i === 0 ? 'green' : i === 1 ? '' : 'red', sub: variant === 'pho' ? ['Tô phở nóng', 'Quẩy giòn', 'Ly trà đá'][i] : ['Pate + dưa', 'Trứng ốp', 'Ly mía'][i] }))
    const phase = (t) => ((t % BEAT) + BEAT) % BEAT / BEAT
    const onBeat = (t) => { const p = phase(t); return p > 0.86 || p < 0.1 }
    const free = () => { for (let i = 0; i < SEATS.length; i++) if (!S.custs.some((c) => c.seat === i)) return i; return -1 }

    function spawn(t) {
      const seat = free(); if (seat < 0) return
      const pat = clamp(8 - t / 12, 4.6, 8)
      S.custs.push({ seat, dish: Math.floor(Math.random() * menu.length), born: t, pat, left: pat, seed: S.seed++ + (seat * 3), arrive: 0, state: 'wait', timer: 0 })
    }
    function serve(k, t) {
      const idx = menu.findIndex((_, i) => String(i + 1) === k || (k === 'j' && i === 0) || (k === 'k' && i === 1) || (k === 'l' && i === 2))
      if (idx < 0) return
      const cands = S.custs.filter((c) => c.dish === idx && c.state === 'wait').sort((a, b) => a.born - b.born)
      S.hands = 0.18; S.sizzle = 1
      if (!cands.length) { S.wrong++; S.combo = 0; env.sfx('error'); S.fx.push({ x: W / 2, y: 100, t: 0, bad: true }); return }
      const c = cands[0], pf = onBeat(t)
      c.state = 'ate'; c.timer = 0.5; S.served++; S.combo++; S.best = Math.max(S.best, S.combo)
      if (pf) { S.perfect++; env.sfx('ting') } else env.sfx('sizzle')
      S.fx.push({ x: SEATS[c.seat], y: 112, t: 0, perfect: pf, dish: menu[idx].id })
    }

    return {
      key(k, down) { if (down) serve(k, S.t) },
      update(dt, t) {
        S.t = t
        S.nextSpawn -= dt
        if (S.nextSpawn <= 0) { spawn(t); S.nextSpawn = BEAT * (2 + Math.floor(Math.random() * 2)) * clamp(1.05 - t / 160, 0.8, 1) }
        for (const c of S.custs) {
          c.arrive = Math.min(1, c.arrive + dt * 3)
          if (c.state === 'wait') { c.left -= dt; if (c.left <= 0) { c.state = 'leave'; c.timer = 0.8; S.lost++; S.combo = 0; env.sfx('error') } } else c.timer -= dt
        }
        S.custs = S.custs.filter((c) => c.state === 'wait' || c.timer > 0)
        for (const f of S.fx) f.t += dt * 2.2
        S.fx = S.fx.filter((f) => f.t < 1)
        S.hands = Math.max(0, S.hands - dt); S.sizzle = Math.max(0, S.sizzle - dt * 3)
      },
      hud() { return `Phục vụ ${S.served}${S.combo > 1 ? ' · combo x' + S.combo : ''}` },
      draw(g, t, stage) {
        const T = stage === 'play' ? t : performance.now() / 1000
        // tường + mái hiên
        R(g, 0, 0, W, H, variant === 'pho' ? '#d9c9a0' : '#cfd9c0')
        for (let x = 0; x < W; x += 16) R(g, x, 0, 8, 20, x % 32 === 0 ? '#c0392b' : '#f4efe2')
        R(g, 0, 20, W, 3, '#8c2a20')
        for (let y = 26; y < 70; y += 11) for (let x = (y / 11 % 2) * 8; x < W; x += 16) R(g, x, y, 15, 10, 'rgba(120,90,50,.13)')
        // biển hiệu
        R(g, 118, 28, 84, 14, '#7a2f28'); R(g, 120, 30, 80, 10, '#f0d78a'); for (let i = 0; i < 8; i++) R(g, 124 + i * 9, 33, 5, 4, '#7a2f28')
        // nồi nước dùng + hơi
        R(g, 20, 52, 38, 22, '#8a8f96'); R(g, 18, 50, 42, 4, '#b8bcc2'); R(g, 24, 56, 30, 3, 'rgba(255,200,80,.5)')
        for (let i = 0; i < 3; i++) R(g, 28 + i * 11, 40 - ((T * 14 + i * 9) % 18), 3, 7, 'rgba(255,255,255,' + (0.5 - ((T * 14 + i * 9) % 18) / 40) + ')')
        // quầy
        R(g, 0, 72, W, 8, '#b07a3c'); R(g, 0, 80, W, 30, '#8a5a2a'); R(g, 0, 80, W, 2, '#d09a54')
        for (let x = 0; x < W; x += 24) R(g, x + 2, 88, 20, 16, '#7a4c22')
        // người bán (người chơi) sau quầy
        person(g, 160, 80, env.outfit, { step: 0, arms: S.hands > 0 ? 1 : 0, dir: 1 })
        R(g, 154, 68, 12, 3, '#f4efe2')                       // khăn trên đầu
        // nền khách
        R(g, 0, 110, W, H - 110, '#6c5a46'); for (let x = 0; x < W; x += 20) R(g, x, 110, 1, H - 110, 'rgba(0,0,0,.12)'); R(g, 0, 110, W, 2, '#8c7a62')
        // khách
        const queue = S.custs.filter((c) => c.state === 'wait').sort((a, b) => a.born - b.born)
        for (const c of S.custs) {
          const x = SEATS[c.seat], dy = (1 - c.arrive) * 24
          R(g, x - 8, 168 - dy, 16, 3, '#4a3626'); R(g, x - 6, 154 - dy, 12, 14, 'rgba(0,0,0,0)')
          npc(g, x, 166 - dy, c.seed, { arms: c.state === 'ate' ? 1 : 0, dir: 1 })
          if (c.arrive >= 1 && c.state !== 'leave') {
            const m = menu[c.dish]
            if (c.state === 'wait') {
              const urgent = c.left < c.pat * 0.35, wob = urgent ? Math.round(Math.sin(T * 24)) : 0
              bubble(g, x + wob, 140, 26, 21, urgent ? '#ffe3d8' : '#fffaf0'); icon(g, m.id, x + wob, 136)
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
          icon(g, f.dish, f.x, yy - 14 + f.t * 6)
          burst(g, f.x, f.y - 14, f.t, f.perfect ? '#ffe14a' : '#ffffff')
          if (f.perfect) { R(g, f.x - 12, f.y - 30 - f.t * 10, 24, 5, '#ffe14a'); R(g, f.x - 11, f.y - 29 - f.t * 10, 22, 3, '#c98a10') }
        }
        // thanh nhịp
        const p = phase(stage === 'play' ? t : T)
        R(g, 8, 172, W - 16, 4, '#2a2118'); R(g, 8 + (W - 16) * 0.86, 172, (W - 16) * 0.14, 4, '#2f8a3f'); R(g, 8, 172, (W - 16) * 0.1, 4, '#2f8a3f')
        const bx = 8 + (W - 16) * p; R(g, bx - 2, 169, 5, 10, onBeat(stage === 'play' ? t : T) ? '#ffe14a' : '#f4efe2')
      },
      result() {
        const raw = S.served + S.perfect * 0.45 - S.wrong * 0.5 - S.lost * 0.8
        return { score: clamp(Math.round(100 * raw / 28), 0, 100), summary: `Phục vụ ${S.served} khách · đúng nhịp ${S.perfect} · combo cao nhất ${S.best}\nNhầm món ${S.wrong} · khách bỏ về ${S.lost}` }
      },
    }
  },
}

// Mini-game #5: Đạp xích lô quanh Hồ Gươm. Đạp luân phiên chân trái / phải (A và D, ← và →, hoặc 2 nút) để lấy đà;
// đạp cùng một bên liên tục thì yếu. Có người qua đường: bấm RUNG CHUÔNG (Space) trước khi tới gần, nếu không phải phanh gấp.
import { R, shadow, willow, tree, burst, npc, person, clamp, rnd, W, H } from './gfx.js'

const GOAL = 5000                              // quãng đường (px logic) ứng với 100 điểm
const CX = 104                                 // vị trí xích lô trên màn hình

export default {
  id: 'cyclo',
  title: 'Đạp xích lô Hồ Gươm',
  how: 'Đạp luân phiên hai chân: A rồi D (hoặc ← rồi →, hoặc chạm hai nút Trái / Phải) để xích lô chạy nhanh.\nThấy người qua đường thì RUNG CHUÔNG (Space) trước khi tới sát. Đạp càng đều, khách càng boa nhiều.',
  create(env) {
    const S = { dist: 0, v: 0, last: '', streak: 0, flow: 0, hits: 0, rang: 0, walkers: [], nextWalker: 380, fx: [], bell: 0, crank: 0, tips: 0, stumble: 0, bellFx: 0, taps: 0 }
    env.setHint('Đạp LUÂN PHIÊN trái – phải (A / D hoặc ← / →). Space hoặc nút chuông để rung chuông khi có người qua đường.')
    env.btn('Chân trái', { key: 'a', cls: 'green', sub: 'A / ←' })
    env.btn('Rung chuông', { cls: '', onDown: () => bell(), sub: 'Space' })
    env.btn('Chân phải', { key: 'd', cls: 'green', sub: 'D / →' })
    function bell() { S.bellFx = 0.6; env.sfx('bell'); for (const w of S.walkers) if (!w.warned && w.x - S.dist > 0 && w.x - S.dist < 190) { w.warned = true; S.fx.push({ x: CX + (w.x - S.dist), y: 100, t: 0, c: '#8ff08f' }) } }
    function pedal(side) {
      if (S.stumble > 0) return
      S.taps++
      const alt = side !== S.last
      S.streak = alt ? S.streak + 1 : 0
      S.last = side
      const power = alt ? 15 + Math.min(S.streak, 12) * 0.9 : 4
      S.v = Math.min(150, S.v + power)
      S.crank += 0.9
      S.flow = clamp(S.flow + (alt ? 0.08 : -0.15), 0, 1)
    }
    return {
      key(k, down) {
        if (!down) return
        if (k === 'a' || k === 'arrowleft') pedal('L')
        else if (k === 'd' || k === 'arrowright') pedal('R')
        else if (k === ' ' || k === 'b' || k === 'arrowup' || k === 'enter') bell()
      },
      pointer(type, x) { if (type === 'down') { if (x < W * 0.4) pedal('L'); else if (x > W * 0.6) pedal('R'); else bell() } },
      update(dt, t) {
        S.v *= Math.exp(-0.55 * dt)
        S.flow = Math.max(0, S.flow - dt * 0.12)
        if (S.stumble > 0) { S.stumble -= dt; S.v *= Math.exp(-4 * dt) }
        S.dist += S.v * dt
        S.tips += S.v * dt * S.flow * 0.0
        if (S.dist > S.nextWalker) { S.walkers.push({ x: S.dist + 230, seed: S.walkers.length * 5 + 1, warned: false, hit: false, p: 0, dir: Math.random() < 0.5 ? 1 : -1 }); S.nextWalker += rnd(360, 560) }
        for (const w of S.walkers) {
          const dx = w.x - S.dist
          if (dx < 62) w.p = Math.min(1, w.p + dt * 0.9)            // bắt đầu băng qua đường
          if (!w.hit && !w.warned && dx < 8 && dx > -10 && w.p > 0.15 && w.p < 0.85) { w.hit = true; S.hits++; S.stumble = 0.9; S.v *= 0.2; env.sfx('horn'); S.fx.push({ x: CX + dx, y: 100, t: 0, c: '#e0553f' }) }
        }
        S.walkers = S.walkers.filter((w) => w.x - S.dist > -60)
        S.bellFx = Math.max(0, S.bellFx - dt)
        for (const f of S.fx) f.t += dt * 2
        S.fx = S.fx.filter((f) => f.t < 1)
      },
      hud() { return `Quãng đường ${Math.round(S.dist / 10)}m${S.flow > 0.5 ? ' · đạp đều' : ''}` },
      draw(g, t, stage) {
        const T = stage === 'play' ? t : performance.now() / 1000
        const d = S.dist
        // trời
        const bands = ['#bfe3f2', '#cde9f4', '#dcf0f6', '#e8f6f4']
        bands.forEach((c, i) => R(g, 0, i * 14, W, 14, c))
        // mây
        for (let i = 0; i < 4; i++) { const x = ((i * 97 - d * 0.04) % (W + 60) + W + 60) % (W + 60) - 30; R(g, x, 12 + (i % 2) * 14, 26, 6, '#fff'); R(g, x + 6, 8 + (i % 2) * 14, 14, 5, '#fff') }
        // bờ xa: nhà cổ + cây
        for (let i = 0; i < 12; i++) { const x = (((i * 41 - d * 0.12) % 500) + 500) % 500 - 30; const h = 14 + (i * 7) % 12; R(g, x, 58 - h, 30, h, ['#c9a46a', '#d6b08a', '#a8b8a0', '#e0c88a'][i % 4]); R(g, x, 58 - h, 30, 3, '#8a4a3a'); for (let k = 5; k < 26; k += 9) R(g, x + k, 58 - h + 6, 4, 5, '#ffe9a0') }
        // hồ
        R(g, 0, 58, W, 52, '#5f9fb8'); for (let r = 0; r < 6; r++) { const y = 62 + r * 8; for (let x = -((d * (0.25 + r * 0.05) + r * 17) % 32); x < W; x += 32) R(g, x + (r % 2) * 10, y, 12 - r, 1, 'rgba(255,255,255,.4)') }
        // cầu Thê Húc + đền Ngọc Sơn (đảo nhỏ) và Tháp Rùa
        const lm = (off, fn) => { const x = off - d * 0.35; if (x > -70 && x < W + 70) fn(x) }
        lm(400, (x) => { R(g, x - 22, 74, 44, 6, '#4a7a58'); R(g, x - 6, 60, 12, 14, '#c9b078'); R(g, x - 8, 56, 16, 5, '#7a2f28'); R(g, x - 4, 50, 8, 7, '#c9b078'); R(g, x - 5, 46, 10, 4, '#7a2f28'); R(g, x - 1, 40, 2, 6, '#7a2f28') })           // Tháp Rùa
        lm(1250, (x) => { R(g, x - 30, 76, 60, 5, '#4a7a58'); R(g, x - 18, 66, 36, 10, '#c0392b'); R(g, x - 20, 62, 40, 5, '#7a2f28'); R(g, x - 14, 69, 8, 7, '#2a1c14'); R(g, x + 6, 69, 8, 7, '#2a1c14'); for (let k = -28; k < 30; k += 4) R(g, x + k, 82, 2, 1, '#c0392b') })   // Đền Ngọc Sơn
        lm(2300, (x) => { R(g, x - 40, 78, 80, 4, '#c0392b'); for (let k = -36; k < 40; k += 8) R(g, x + k, 74, 2, 8, '#9a2f20'); R(g, x - 40, 72, 80, 2, '#c0392b') })                                                                                          // cầu Thê Húc
        lm(3300, (x) => { R(g, x - 22, 74, 44, 6, '#4a7a58'); R(g, x - 6, 60, 12, 14, '#c9b078'); R(g, x - 8, 56, 16, 5, '#7a2f28'); R(g, x - 4, 50, 8, 7, '#c9b078'); R(g, x - 5, 46, 10, 4, '#7a2f28') })
        // bờ + cây liễu + ghế đá
        R(g, 0, 108, W, 14, '#6aa850'); R(g, 0, 108, W, 2, '#8cc56a')
        for (let i = 0; i < 8; i++) { const x = (((i * 83 - d * 0.7) % 664) + 664) % 664 - 40; willow(g, x, 120, T) }
        // đường đi
        R(g, 0, 122, W, 58, '#a89a84'); R(g, 0, 122, W, 2, '#c9bba4'); R(g, 0, 150, W, 1, 'rgba(0,0,0,.1)')
        for (let x = -((d * 1.0) % 30); x < W; x += 30) { R(g, x, 138, 14, 2, '#d9d2b0') }
        for (let x = -((d * 1.0) % 20); x < W; x += 20) { R(g, x, 123, 9, 2, 'rgba(0,0,0,.12)'); R(g, x + 6, 170, 9, 2, 'rgba(0,0,0,.12)') }
        // người qua đường
        for (const w of S.walkers) {
          const sx = CX + (w.x - d), wy = 118 + (w.dir > 0 ? w.p : 1 - w.p) * 46
          if (w.p > 0 || sx < W + 20) { npc(g, sx, wy + 14, w.seed, { step: T + w.seed, dir: w.dir }); if (sx - CX < 120 && !w.hit && !w.warned && sx > CX) { R(g, sx - 2, wy - 8, 4, 8, '#e0553f'); R(g, sx - 1, wy + 1, 2, 2, '#e0553f') } }
        }
        // xích lô: bánh xe quay theo quãng đường
        const wob = Math.round(Math.sin(S.crank * 3) * (S.v > 6 ? 0.8 : 0)) + (S.stumble > 0 ? Math.round(Math.sin(T * 40) * 1.5) : 0), by = 152 + wob
        const wheel = (x, y, r) => { R(g, x - r + 1, y - r, r * 2 - 2, r * 2, '#2a2a2e'); R(g, x - r, y - r + 1, r * 2, r * 2 - 2, '#2a2a2e'); R(g, x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4, '#9a9aa4'); const a = d * 0.06; for (let k = 0; k < 4; k++) { const ang = a + k * 1.5708; R(g, x + Math.cos(ang) * (r - 3) - 0.5, y + Math.sin(ang) * (r - 3) - 0.5, 1, 1, '#2a2a2e'); R(g, x + Math.cos(ang) * (r / 2) - 0.5, y + Math.sin(ang) * (r / 2) - 0.5, 1, 1, '#2a2a2e') } }
        shadow(g, CX + 4, by + 3, 56)
        // thùng xe + khách ngồi trước, mui che
        R(g, CX + 2, by - 18, 28, 14, '#c0392b'); R(g, CX + 2, by - 20, 28, 3, '#7a2f28'); R(g, CX + 4, by - 16, 24, 6, '#f0d78a')
        npc(g, CX + 15, by - 4, 3, {}); R(g, CX, by - 34, 34, 4, '#d9a441'); R(g, CX + 2, by - 30, 2, 12, '#7a4c22'); R(g, CX + 30, by - 30, 2, 12, '#7a4c22')
        wheel(CX + 14, by - 2, 7); wheel(CX + 26, by - 2, 7)
        // người đạp (phía sau)
        const sw = Math.sin(S.crank * 3)
        R(g, CX - 22, by - 7, 24, 2, '#555'); wheel(CX - 20, by - 2, 7)
        person(g, CX - 10, by - 8, env.outfit, { step: S.crank * 0.5, dir: 1 })
        R(g, CX - 11 + Math.round(sw * 3), by - 5, 3, 2, env.outfit.pants)
        R(g, CX - 14, by - 22, 3, 1, '#555')
        if (S.bellFx > 0) { R(g, CX - 22, by - 30, 3, 3, '#ffe14a'); R(g, CX - 28, by - 32, 2, 2, '#ffe14a'); R(g, CX - 20, by - 36, 2, 2, '#ffe14a') }
        for (const f of S.fx) burst(g, f.x, f.y, f.t, f.c)
        // đồng hồ tốc độ
        R(g, 8, H - 14, 70, 7, '#2a2118'); const sp = clamp(S.v / 110, 0, 1); R(g, 9, H - 13, 68 * sp, 5, sp > 0.45 && sp < 0.95 ? '#6bd06b' : '#e8c34a'); R(g, 8, H - 9, 70, 1, 'rgba(255,255,255,.2)')
        R(g, 84, H - 14, 70, 7, '#2a2118'); R(g, 85, H - 13, 68 * S.flow, 5, '#6aa0e8')
      },
      result() {
        const score = clamp(Math.round(100 * S.dist / GOAL) - S.hits * 6, 0, 100)
        return { score, summary: `Đạp được ${Math.round(S.dist / 10)}m · va người qua đường ${S.hits} lần · tổng ${S.taps} nhịp đạp` }
      },
    }
  },
}

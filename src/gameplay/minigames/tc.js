// Mini-game #2: Quán Trà chanh xếp ghế, né xe. Khuân ghế từ chồng ghế (vỉa hè dưới) sang hàng quán (vỉa hè trên),
// băng qua đường có xe máy / ô tô. Bị xe quệt thì rơi ghế và choáng 1 giây.
import { R, person, car, scooter, chair, shadow, burst, clamp, rnd, pick, W, H } from './gfx.js'

const SLOTS = [44, 100, 160, 220, 276]
const LANES = [{ y: 74, dir: 1 }, { y: 100, dir: -1 }, { y: 126, dir: 1 }]
const CARC = ['#c0392b', '#2f6fb0', '#e0b020', '#3a8f5a', '#8a5ac0', '#e8e0cc']
const CHC = ['#d34a3a', '#2f8fd0', '#e0b020', '#4aa860']

export default {
  id: 'tc',
  title: 'Xếp ghế trà chanh',
  how: 'Ôm ghế ở chồng ghế (vỉa hè dưới), băng qua đường mang sang hàng quán (vỉa hè trên) rồi đặt vào chỗ trống.\nĐi bằng mũi tên / WASD / nút mũi tên, hoặc chạm vào chỗ muốn tới. Né xe!',
  create(env) {
    const P = { x: 160, y: 164, vx: 0, vy: 0, carry: -1, stun: 0, step: 0, dir: 1, target: null }
    const S = { slots: SLOTS.map(() => -1), placed: 0, hits: 0, cars: [], spawn: [0.3, 0.9, 1.5], fx: [], dropped: [], cooldown: 0, clear: 0, trips: 0 }
    env.setHint('Mũi tên / WASD hoặc nút bên dưới. Ghế tự nhặt ở chồng ghế và tự đặt vào chỗ trống trên vỉa hè quán.')
    const mk = (label, key, cls = 'sm') => env.btn(label, { key, cls })
    mk('◀', 'arrowleft'); mk('▲', 'arrowup'); mk('▼', 'arrowdown'); mk('▶', 'arrowright')
    const held = (...ks) => ks.some((k) => env.keys.has(k))

    function spawnCar(i, t) {
      const L = LANES[i], moto = Math.random() < 0.55, w = moto ? 16 : 24
      const v = (moto ? rnd(70, 110) : rnd(48, 80)) * (1 + t / 200)
      const x = L.dir > 0 ? -w : W + w
      S.cars.push({ lane: i, x, y: L.y, dir: L.dir, v, moto, w, col: pick(CARC), seed: Math.random() * 9 })
      S.spawn[i] = rnd(1.5, 2.6) * clamp(1.2 - t / 150, 0.75, 1.2)
    }
    return {
      key(k, down) { if (down && (k === 'a' || k === 'd' || k === 'w' || k === 's')) P.target = null },
      pointer(type, x, y) { if (type === 'down' || (type === 'move' && arguments[3])) P.target = { x: clamp(x, 8, W - 8), y: clamp(y, 30, H - 8) } },
      update(dt, t) {
        // di chuyển
        let ix = (held('arrowright', 'd') ? 1 : 0) - (held('arrowleft', 'a') ? 1 : 0), iy = (held('arrowdown', 's') ? 1 : 0) - (held('arrowup', 'w') ? 1 : 0)
        if (ix || iy) P.target = null
        else if (P.target) { const dx = P.target.x - P.x, dy = P.target.y - P.y, d = Math.hypot(dx, dy); if (d > 3) { ix = dx / d; iy = dy / d } else P.target = null }
        const sp = (P.carry >= 0 ? 58 : 72) * (P.stun > 0 ? 0 : 1), m = Math.hypot(ix, iy) || 1
        if (P.stun > 0) { P.stun -= dt } else if (ix || iy) { P.x += (ix / Math.max(1, m)) * sp * dt; P.y += (iy / Math.max(1, m)) * sp * dt; P.step += dt; if (ix) P.dir = ix > 0 ? 1 : -1 }
        P.x = clamp(P.x, 8, W - 8); P.y = clamp(P.y, 40, H - 4)
        // xe
        for (let i = 0; i < LANES.length; i++) { S.spawn[i] -= dt; if (S.spawn[i] <= 0) spawnCar(i, t) }
        for (const c of S.cars) {
          c.x += c.dir * c.v * dt
          // xe chậm lại khi có người ngay phía trước
          const hit = P.stun <= 0 && Math.abs(P.y - c.y) < 8 && Math.abs(P.x - c.x) < c.w / 2 + 4
          if (hit) {
            S.hits++; P.stun = 1.1; env.sfx('horn')
            if (P.carry >= 0) { S.dropped.push({ x: P.x, y: P.y, col: CHC[P.carry % CHC.length], t: 0 }); P.carry = -1 }
            P.y = P.y < 100 ? 56 : 146; S.fx.push({ x: P.x, y: P.y - 8, t: 0, c: '#e0553f' })
          }
        }
        S.cars = S.cars.filter((c) => c.x > -40 && c.x < W + 40)
        // nhặt / đặt ghế
        if (P.carry < 0 && P.y > 150 && P.x > 120 && P.x < 200 && P.stun <= 0) { P.carry = S.trips++ % CHC.length; env.sfx('chair') }
        if (P.carry >= 0 && P.y < 62 && P.stun <= 0) {
          let bi = -1, bd = 1e9
          SLOTS.forEach((sx, i) => { if (S.slots[i] < 0 && Math.abs(sx - P.x) < bd) { bd = Math.abs(sx - P.x); bi = i } })
          if (bi >= 0 && bd < 30) { S.slots[bi] = P.carry; P.carry = -1; S.placed++; env.sfx('chair'); S.fx.push({ x: SLOTS[bi], y: 40, t: 0, c: '#ffe14a' }) }
        }
        // đủ ghế thì khách ngồi rồi đi, trả chỗ
        if (S.slots.every((s) => s >= 0)) { S.clear += dt; if (S.clear > 0.9) { S.slots = SLOTS.map(() => -1); S.clear = 0; env.sfx('ting') } } else S.clear = 0
        for (const f of S.fx) f.t += dt * 2.4
        S.fx = S.fx.filter((f) => f.t < 1)
        for (const d of S.dropped) d.t += dt
        S.dropped = S.dropped.filter((d) => d.t < 4)
      },
      hud() { return `Ghế ${S.placed} · va ${S.hits}` },
      draw(g, t, stage) {
        const T = stage === 'play' ? t : performance.now() / 1000
        // vỉa hè trên (hàng quán)
        R(g, 0, 0, W, 56, '#b9a98a'); for (let x = 0; x < W; x += 16) R(g, x, 46, 15, 9, '#a69674')
        R(g, 0, 0, W, 22, '#4a8f6a'); for (let x = 0; x < W; x += 16) R(g, x, 18, 8, 6, '#3a7a58')
        R(g, 90, 5, 140, 11, '#2f5a3a'); R(g, 92, 7, 136, 7, '#f0e29a'); for (let i = 0; i < 7; i++) R(g, 96 + i * 19, 9, 11, 3, '#4a8f6a')
        R(g, 8, 26, 22, 18, '#8a5a2a'); R(g, 10, 22, 18, 4, '#d9b443')    // quầy / xe nước
        for (let i = 0; i < 4; i++) R(g, 12 + i * 4, 18 - (i % 2), 2, 4, 'rgba(120,200,120,.8)')
        R(g, 0, 55, W, 1, '#7a6a4a')
        SLOTS.forEach((sx, i) => {
          R(g, sx - 12, 42, 24, 3, 'rgba(0,0,0,.14)')
          if (S.slots[i] >= 0) { chair(g, sx, 46, CHC[S.slots[i] % CHC.length]); if (S.clear > 0) person(g, sx, 40, { hair: '#2b2230', top: '#e8e0cc', pants: '#444' }, {}) }
          else { R(g, sx - 6, 36, 12, 1, '#fff2a0'); R(g, sx - 6, 46, 12, 1, '#fff2a0'); R(g, sx - 6, 36, 1, 10, '#fff2a0'); R(g, sx + 5, 36, 1, 10, '#fff2a0') }
        })
        // đường
        R(g, 0, 56, W, 86, '#4a4d55'); for (let l = 0; l < 4; l++) { const y = 61 + l * 26; if (l > 0 && l < 3) for (let x = -((T * 20) % 24); x < W; x += 24) R(g, x, y + 8, 12, 2, '#d9d2b0') }
        R(g, 0, 56, W, 2, '#7a7c82'); R(g, 0, 140, W, 2, '#7a7c82')
        for (let y = 60; y < 138; y += 8) R(g, 112, y, 4, 4, '#e8e4d2'), R(g, 204, y, 4, 4, '#e8e4d2')    // vạch đi bộ nhạt
        // vỉa hè dưới
        R(g, 0, 142, W, H - 142, '#b9a98a'); for (let x = 0; x < W; x += 16) R(g, x, 146, 15, 8, '#a69674'), R(g, x + 8, 160, 15, 8, '#a69674')
        // chồng ghế
        for (let i = 0; i < 4; i++) chair(g, 140 + (i % 2) * 11, 168 - Math.floor(i / 2) * 6 + 4, CHC[i % 4])
        R(g, 134, 170, 36, 2, 'rgba(0,0,0,.25)')
        // ghế rơi
        for (const d of S.dropped) chair(g, d.x + Math.min(8, d.t * 30), d.y + 3, d.col)
        // sắp theo y: xe + người
        const draws = S.cars.map((c) => ({ y: c.y, f: () => (c.moto ? scooter(g, c.x, c.y, c.dir, c.col) : car(g, c.x, c.y, c.dir, c.col)) }))
        draws.push({ y: P.y, f: () => {
          if (P.stun > 0 && Math.floor(T * 14) % 2) return
          person(g, P.x, P.y, env.outfit, { step: P.step, dir: P.dir })
          if (P.carry >= 0) chair(g, P.x + P.dir * 7, P.y - 6, CHC[P.carry % CHC.length])
          if (P.stun > 0) { R(g, P.x - 5 + Math.sin(T * 16) * 3, P.y - 20, 2, 2, '#ffe14a'); R(g, P.x + 3 - Math.sin(T * 16) * 3, P.y - 21, 2, 2, '#ffe14a') }
        } })
        draws.sort((a, b) => a.y - b.y).forEach((d) => d.f())
        for (const f of S.fx) burst(g, f.x, f.y, f.t, f.c)
        if (P.target) { R(g, P.target.x - 3, P.target.y - 1, 7, 2, '#ffffff'); R(g, P.target.x - 1, P.target.y - 3, 2, 6, '#ffffff') }
      },
      result() {
        const score = clamp(Math.round(S.placed * (100 / 12) - S.hits * 4), 0, 100)
        return { score, summary: `Xếp ${S.placed} ghế · bị xe quệt ${S.hits} lần` }
      },
    }
  },
}

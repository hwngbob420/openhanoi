// Mini-game #2: Quán Trà chanh xếp ghế, né xe. Khuân ghế từ chồng ghế (vỉa hè dưới) sang hàng quán (vỉa hè trên),
// băng qua đường có xe máy / ô tô. Bị xe quệt thì rơi ghế và choáng 1 giây.
import { R, burst, clamp, rnd, pick, drawMG, W, H } from './gfx.js'
import { MG } from '../balance.js'

const K = MG.tc
const lerp = (a, b, f) => a + (b - a) * clamp(f, 0, 1)

const SLOTS = [44, 100, 160, 220, 276]
const LANES = [{ y: 74, dir: 1 }, { y: 100, dir: -1 }, { y: 126, dir: 1 }]
const CARC = ['#c0392b', '#2f6fb0', '#e0b020', '#3a8f5a', '#8a5ac0', '#e8e0cc']
const CHC = ['#d34a3a', '#2f8fd0', '#e0b020', '#4aa860']

export default {
  id: 'tc',
  title: 'Xếp ghế quán trà chanh',
  how: 'Ôm ghế ở chồng ghế (vỉa hè dưới), băng qua đường mang sang hàng quán (vỉa hè trên) rồi đặt vào chỗ trống.\nĐi bằng mũi tên / WASD / nút mũi tên, hoặc chạm vào chỗ muốn tới. Né xe! Xe chạy nhanh và dày dần; bị quệt thì rơi ghế và trừ điểm. Xếp đủ ' + K.target + ' ghế mới được trọn điểm.',
  create(env) {
    const P = { x: 160, y: 164, vx: 0, vy: 0, carry: -1, stun: 0, step: 0, dir: 1, target: null }
    const S = { slots: SLOTS.map(() => -1), placed: 0, hits: 0, cars: [], spawn: [0.3, 0.9, 1.5], fx: [], dropped: [], cooldown: 0, clear: 0, trips: 0, dur: env.dur || 45 }
    env.expose({ S, P, SLOTS, LANES })
    env.setHint('Mũi tên / WASD hoặc nút bên dưới. Ghế tự nhặt ở chồng ghế và tự đặt vào chỗ trống trên vỉa hè quán.')
    const mk = (label, key, cls = 'sm') => env.btn(label, { key, cls })
    mk('◀', 'arrowleft'); mk('▲', 'arrowup'); mk('▼', 'arrowdown'); mk('▶', 'arrowright')
    const held = (...ks) => ks.some((k) => env.keys.has(k))
    const look = { x: P.x, y: P.y, face: 'up' }          // chỉ phần vẽ dùng

    function spawnCar(i, t) {
      const L = LANES[i], moto = Math.random() < 0.55, w = moto ? 16 : 24
      const v = (moto ? rnd(70, 110) : rnd(48, 80)) * (1 + t * K.carRamp)
      const x = L.dir > 0 ? -w : W + w
      S.cars.push({ lane: i, x, y: L.y, dir: L.dir, v, moto, w, col: pick(CARC), seed: Math.random() * 9 })
      const f = t / S.dur; S.spawn[i] = rnd(lerp(K.spawnStart[0], K.spawnEnd[0], f), lerp(K.spawnStart[1], K.spawnEnd[1], f))
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
        // hướng nhìn của người chơi: suy ra từ bước di chuyển giữa hai khung vẽ (biến cục bộ của phần vẽ, không ảnh hưởng luật chơi)
        const mdx = P.x - look.x, mdy = P.y - look.y; look.x = P.x; look.y = P.y
        const moving = Math.abs(mdx) + Math.abs(mdy) > 0.01 && P.stun <= 0
        if (moving) look.face = Math.abs(mdy) > Math.abs(mdx) ? (mdy > 0 ? 'down' : 'up') : (mdx > 0 ? 'right' : 'left')
        // vỉa hè trên + dãy mặt tiền (tiệm điện thoại · quán TRÀ CHANH · tạp hoá) + xe nước
        for (let x = 0; x < W; x += 16) { drawMG(g, 'tc_pave', x, 26); drawMG(g, 'tc_pave', x, 42) }
        drawMG(g, 'tc_shopfront', 0, 0)
        drawMG(g, 'tc_cart', 20, 50)
        SLOTS.forEach((sx, i) => {
          if (sx + 14 < W - 6) drawMG(g, 'tc_table', sx + 15, 50)
          if (S.slots[i] >= 0) {
            const col = S.slots[i] % CHC.length
            if (S.clear > 0) drawMG(g, 'cust_' + (col + (i % 2 ? 4 : 0)) + '_down', sx, 49, { t: T })     // khách ngồi đúng ghế cùng màu
            else drawMG(g, 'tc_stool_' + col, sx, 47)
          } else drawMG(g, 'tc_slot', sx, 46, { t: T })
        })
        // đường 3 làn: nhựa + vạch đứt giữa làn, bó vỉa hai bên, vạch qua đường chỗ khuân ghế
        for (let x = 0; x < W; x += 32) { drawMG(g, 'tc_road', x, 56); drawMG(g, 'tc_road', x, 116); drawMG(g, 'tc_road_dash', x, 82); drawMG(g, 'tc_road_dash', x, 108) }
        g.globalAlpha = 0.32; for (let y = 60; y < 138; y += 8) for (let x = 136; x < 184; x += 8) drawMG(g, 'tc_zebra', x, y); g.globalAlpha = 1
        for (let x = 0; x < W; x += 32) { drawMG(g, 'tc_curb', x, 54); drawMG(g, 'tc_curb', x, 140) }
        // vỉa hè dưới + chồng ghế (chỗ lấy ghế)
        for (let x = 0; x < W; x += 16) for (let y = 144; y < H; y += 16) drawMG(g, 'tc_pave', x, y)
        drawMG(g, 'tc_stack', 140, 174)
        // ghế rơi
        for (const d of S.dropped) drawMG(g, 'tc_stool_' + Math.max(0, CHC.indexOf(d.col)), d.x + Math.min(8, d.t * 30), d.y + 4)
        // sắp theo y: xe + người (hình xe canh giữa đúng tâm va chạm c.x, chân bánh ở c.y)
        const draws = S.cars.map((c) => {
          const k = Math.max(0, CARC.indexOf(c.col)), side = c.dir > 0 ? 'r' : 'l'
          return { y: c.y, f: () => drawMG(g, c.moto ? `veh_moto_${k % 4}_${side}` : `veh_car_${k % 3}_${side}`, c.x, c.y, { t: T + c.seed }) }
        })
        draws.push({ y: P.y, f: () => {
          if (P.stun > 0 && Math.floor(T * 14) % 2) return
          const fr = moving ? Math.floor(P.step * 8) % 4 : 0
          if (P.carry >= 0) {
            drawMG(g, 'player_carry_' + look.face, P.x, P.y, { frame: fr, outfit: env.outfit })
            drawMG(g, 'tc_stool_' + (P.carry % CHC.length), P.x, P.y - 26 + (fr % 2))           // ghế đặt trên hai tay giơ qua đầu
          } else drawMG(g, 'player_' + look.face, P.x, P.y, { frame: fr, outfit: env.outfit })
          if (P.stun > 0) { R(g, P.x - 5 + Math.sin(T * 16) * 3, P.y - 30, 2, 2, '#ffe14a'); R(g, P.x + 3 - Math.sin(T * 16) * 3, P.y - 31, 2, 2, '#ffe14a') }
        } })
        draws.sort((a, b) => a.y - b.y).forEach((d) => d.f())
        for (const f of S.fx) burst(g, f.x, f.y, f.t, f.c)
        if (P.target) { R(g, P.target.x - 3, P.target.y - 1, 7, 2, '#ffffff'); R(g, P.target.x - 1, P.target.y - 3, 2, 6, '#ffffff') }
      },
      result() {
        const score = clamp(Math.round(S.placed * (100 / K.target) - S.hits * K.hit), 0, 100)
        return { score, summary: `Xếp ${S.placed} ghế · bị xe quệt ${S.hits} lần` }
      },
    }
  },
}

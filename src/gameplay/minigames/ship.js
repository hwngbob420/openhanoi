// Mini-game #4: Shipper giao hàng ngõ sâu. Chạy xe máy xuống ngõ hẹp 3 làn: nhặt gói hàng, né chậu cây / mèo / xe đẩy,
// khi cửa số nhà hiện bên tường tới tầm thì bấm GIAO để ném gói vào đúng nhà.
import { R, scooter, shadow, burst, clamp, rnd, pick, W, H } from './gfx.js'

const LX = [128, 160, 192]                 // 3 làn
const PY = 138                             // y xe người chơi
const SPEED = 92
const DOOR_GAP = [5.2, 6.4]

export default {
  id: 'ship',
  title: 'Shipper giao hàng ngõ sâu',
  how: 'Chạy xuống ngõ: nhặt gói hàng vàng, né chậu cây, mèo và xe đẩy.\nKhi ô cửa nhà số … sáng lên bên tường, bấm GIAO đúng lúc nó ngang xe để ném gói.\nĐổi làn: mũi tên trái/phải, A/D, vuốt ngang hoặc nút bên dưới.',
  create(env) {
    const P = { lane: 1, x: LX[1], slow: 0, parcels: 1, flash: 0, lean: 0 }
    const S = { items: [], doors: [], t: 0, scroll: 0, nextItem: 0.6, nextDoor: 3.2, delivered: 0, collected: 0, hits: 0, missed: 0, doorN: 0, fx: [], thrown: [], nextHouse: 12, swipe: null }
    env.setHint('◀ ▶ đổi làn · Space / nút GIAO ném gói khi cửa sáng đi ngang xe · vuốt ngang trên màn hình cũng được.')
    env.btn('◀', { cls: 'sm', onDown: () => move(-1) })
    env.btn('GIAO!', { cls: 'green', onDown: () => throwParcel(), sub: 'Space' })
    env.btn('▶', { cls: 'sm', onDown: () => move(1) })
    function move(d) { const n = clamp(P.lane + d, 0, 2); if (n !== P.lane) { P.lane = n; P.lean = d; env.sfx('step') } }
    function throwParcel() {
      const door = S.doors.find((d) => !d.done && Math.abs(d.y - PY) < 20)
      if (!door) { env.sfx('error'); P.flash = 0.15; return }
      if (P.parcels <= 0) { env.sfx('error'); return }
      P.parcels--; door.done = true; door.ok = true; S.delivered++; env.sfx('pop'); env.sfx('ting')
      S.thrown.push({ x: P.x, y: PY - 8, tx: door.side < 0 ? 98 : 222, ty: door.y - 4, t: 0 })
      S.fx.push({ x: door.side < 0 ? 100 : 220, y: door.y, t: 0 })
    }
    return {
      key(k, down) {
        if (!down) return
        if (k === 'arrowleft' || k === 'a') move(-1)
        else if (k === 'arrowright' || k === 'd') move(1)
        else if (k === ' ' || k === 'enter' || k === 'arrowup' || k === 'w') throwParcel()
      },
      pointer(type, x, y, down) {
        if (type === 'down') S.swipe = { x }
        else if (type === 'move' && S.swipe && Math.abs(x - S.swipe.x) > 18) { move(x > S.swipe.x ? 1 : -1); S.swipe.x = x }
        else if (type === 'up') { if (S.swipe && Math.abs(x - S.swipe.x) < 6) throwParcel(); S.swipe = null }
      },
      update(dt, t) {
        S.t = t
        P.slow = Math.max(0, P.slow - dt); P.flash = Math.max(0, P.flash - dt); P.lean *= 0.85
        P.x += (LX[P.lane] - P.x) * Math.min(1, dt * 14)
        const sp = SPEED * (P.slow > 0 ? 0.45 : 1) * (1 + t / 260)
        S.scroll += sp * dt
        // vật cản + gói hàng
        S.nextItem -= dt * (sp / SPEED)
        if (S.nextItem <= 0) {
          S.nextItem = rnd(0.5, 0.95)
          const lane = Math.floor(Math.random() * 3), r = Math.random()
          const kind = r < 0.36 ? 'parcel' : r < 0.58 ? 'pot' : r < 0.76 ? 'cat' : r < 0.9 ? 'cart' : 'ped'
          if (!S.items.some((o) => o.lane === lane && o.y < 30)) S.items.push({ kind, lane, x: LX[lane], y: -14, vx: kind === 'cat' ? rnd(-8, 8) : 0, t: 0, dead: false })
        }
        S.nextDoor -= dt * (sp / SPEED)
        if (S.nextDoor <= 0) { S.nextDoor = rnd(...DOOR_GAP); S.doors.push({ side: Math.random() < 0.5 ? -1 : 1, y: -16, n: 12 + (++S.doorN) * 7, done: false, ok: false }); if (P.parcels < 2) P.parcels++ }
        for (const o of S.items) {
          o.y += sp * dt; o.t += dt
          if (o.kind === 'cat') { o.x += o.vx * dt; o.x = clamp(o.x, 118, 202) }
          if (o.kind === 'ped') o.x += Math.sin(o.t * 2) * 6 * dt
          if (!o.dead && Math.abs(o.y - PY) < 11 && Math.abs(o.x - P.x) < 11) {
            o.dead = true
            if (o.kind === 'parcel') { P.parcels = Math.min(4, P.parcels + 1); S.collected++; env.sfx('ting'); S.fx.push({ x: o.x, y: o.y - 6, t: 0, c: '#ffe14a' }) }
            else { S.hits++; P.slow = 1.0; env.sfx('horn'); S.fx.push({ x: o.x, y: o.y - 6, t: 0, c: '#e0553f' }); if (P.parcels > 0 && Math.random() < 0.35) P.parcels-- }
          }
        }
        S.items = S.items.filter((o) => o.y < H + 20 && !o.dead)
        for (const d of S.doors) { d.y += sp * dt; if (!d.done && !d.counted && d.y > PY + 22) { d.counted = true; S.missed++ } }
        S.doors = S.doors.filter((d) => d.y < H + 30)
        for (const f of S.fx) f.t += dt * 2.2
        S.fx = S.fx.filter((f) => f.t < 1)
        for (const q of S.thrown) q.t += dt * 4
        S.thrown = S.thrown.filter((q) => q.t < 1)
      },
      hud() { return `Giao ${S.delivered} · gói ${P.parcels}` },
      draw(g, t, stage) {
        const T = stage === 'play' ? t : performance.now() / 1000
        const sc = S.scroll
        // tường hai bên
        R(g, 0, 0, W, H, '#6e6760')
        const wall = (x0, w, side) => {
          for (let y = -40 + (sc % 40); y < H; y += 40) { R(g, x0, y, w, 38, side < 0 ? '#c9a46a' : '#a8b8a0'); R(g, x0, y, w, 3, 'rgba(0,0,0,.2)'); R(g, x0 + (side < 0 ? 0 : w - 4), y, 4, 38, 'rgba(0,0,0,.18)') }
        }
        wall(0, 92, -1); wall(228, 92, 1)
        // dây điện chằng chịt trên cao
        for (let i = 0; i < 4; i++) { R(g, 92, 6 + i * 3, 136, 1, 'rgba(20,20,24,.5)') }
        // mặt ngõ
        R(g, 92, 0, 136, H, '#8d857a'); R(g, 90, 0, 3, H, '#5a554e'); R(g, 227, 0, 3, H, '#5a554e')
        for (let y = -((sc) % 24); y < H; y += 24) { R(g, 143, y, 1, 12, 'rgba(255,255,255,.18)'); R(g, 176, y, 1, 12, 'rgba(255,255,255,.18)'); R(g, 112, y + 6, 6, 3, 'rgba(0,0,0,.08)'); R(g, 200, y + 14, 8, 3, 'rgba(0,0,0,.08)') }
        // cửa nhà
        for (const d of S.doors) {
          const x = d.side < 0 ? 78 : 228, lit = !d.done && Math.abs(d.y - PY) < 20
          R(g, x, d.y - 20, 14, 26, '#3a2c26'); R(g, x + 2, d.y - 18, 10, 22, d.done ? '#5ca06a' : lit ? '#ffe14a' : '#c98a3a')
          R(g, x + (d.side < 0 ? 0 : 3), d.y - 26, 11, 5, d.done ? '#2f5a3a' : '#7a2f28'); R(g, x + 3, d.y - 25, 8, 3, '#f4efe2')
          if (lit && Math.floor(T * 8) % 2) { R(g, d.side < 0 ? 94 : 218, d.y - 6, 8, 2, '#ffe14a'); R(g, d.side < 0 ? 98 : 214, d.y - 9, 2, 8, '#ffe14a') }
        }
        // vật phẩm
        for (const o of S.items) {
          const x = Math.round(o.x), y = Math.round(o.y); shadow(g, x, y, 12)
          if (o.kind === 'parcel') { const b = Math.round(Math.sin(o.t * 6) * 1.5); R(g, x - 5, y - 10 + b, 10, 9, '#e0a840'); R(g, x - 5, y - 6 + b, 10, 1, '#8a5a2a'); R(g, x - 1, y - 10 + b, 2, 9, '#8a5a2a'); R(g, x - 5, y - 10 + b, 10, 1, '#f4d27a') }
          else if (o.kind === 'pot') { R(g, x - 6, y - 8, 12, 8, '#b5562f'); R(g, x - 7, y - 9, 14, 2, '#c9683c'); R(g, x - 5, y - 16, 10, 8, '#4f9a4a'); R(g, x - 2, y - 19, 4, 4, '#6bb85a'); R(g, x - 1, y - 14, 3, 3, '#e86a8a') }
          else if (o.kind === 'cat') { R(g, x - 5, y - 6, 10, 5, '#d98a3a'); R(g, x + 3, y - 10, 5, 5, '#d98a3a'); R(g, x + 3, y - 12, 1, 2, '#d98a3a'); R(g, x + 6, y - 12, 1, 2, '#d98a3a'); R(g, x - 8, y - 6 - Math.round(Math.sin(o.t * 5) * 2), 3, 2, '#d98a3a'); R(g, x + 4, y - 8, 1, 1, '#222') }
          else if (o.kind === 'cart') { R(g, x - 10, y - 12, 20, 9, '#8a5a2a'); R(g, x - 10, y - 14, 20, 3, '#e0b020'); R(g, x - 8, y - 4, 4, 4, '#222'); R(g, x + 4, y - 4, 4, 4, '#222'); R(g, x - 6, y - 19, 4, 5, '#c0392b'); R(g, x + 1, y - 19, 4, 5, '#6aa84f') }
          else { npcPed(g, x, y, o.t) }
        }
        // người chơi
        const bob = Math.round(Math.sin(T * 30) * (P.slow > 0 ? 0 : 0.6))
        g.save(); g.translate(Math.round(P.x), PY + bob)
        shadow(g, 0, 0, 14)
        R(g, -3, -3, 6, 4, '#222'); R(g, -3, -22, 6, 4, '#222'); R(g, -4, -20, 8, 17, '#3a3d48'); R(g, -4, -13, 8, 8, '#2f6fb0')
        R(g, -5, -29, 10, 9, env.outfit.top); R(g, -4, -34, 8, 6, '#f0c49a'); R(g, -4, -35, 8, 3, env.outfit.hair); R(g, -5, -33, 10, 2, '#e0553f')
        R(g, -6, -17, 12, 2, '#555'); R(g, -9, -17, 3, 2, '#aaa'); R(g, 6, -17, 3, 2, '#aaa')
        if (P.parcels > 0) { R(g, -5, -7, 10, 7, '#e0a840'); R(g, -1, -7, 2, 7, '#8a5a2a') }
        g.restore()
        for (const q of S.thrown) { const e = q.t, x = P.x + (q.tx - P.x) * e, y = q.y + (q.ty - q.y) * e - Math.sin(e * 3.14) * 16; R(g, x - 3, y - 3, 6, 6, '#e0a840'); R(g, x - 1, y - 3, 2, 6, '#8a5a2a') }
        for (const f of S.fx) burst(g, f.x, f.y, f.t, f.c || '#ffffff')
        if (P.flash > 0) { R(g, 100, PY - 30, 120, 1, '#e0553f') }
      },
      result() {
        const score = clamp(Math.round(S.delivered * 14 + S.collected * 1.5 - S.hits * 5), 0, 100)
        return { score, summary: `Giao thành công ${S.delivered} đơn · nhặt ${S.collected} gói · va chạm ${S.hits} · lỡ ${S.missed} cửa` }
      },
    }
  },
}
function npcPed(g, x, y, t) {
  R(g, x - 3, y - 5, 3, 5, '#33384a'); R(g, x, y - 5, 3, 5, '#33384a'); R(g, x - 4, y - 12, 8, 7, '#8a5ac0'); R(g, x - 3, y - 17, 6, 5, '#f0c49a'); R(g, x - 4, y - 18, 8, 3, '#d9c9a0'); R(g, x - 5, y - 18, 10, 1, '#d9c9a0')
}

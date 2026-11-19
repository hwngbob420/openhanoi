// Mini-game #4: Shipper giao hàng ngõ sâu. Chạy xe máy xuống ngõ hẹp 3 làn: nhặt gói hàng, né chậu cây / mèo / xe đẩy,
// khi cửa số nhà hiện bên tường tới tầm thì bấm GIAO để ném gói vào đúng nhà.
import { R, shadow, burst, clamp, rnd, pick, drawMG, pxText, W, H } from './gfx.js'
import { MG } from '../balance.js'

const K = MG.ship
const lerp = (a, b, f) => a + (b - a) * clamp(f, 0, 1)

const LX = [128, 160, 192]                 // 3 làn
const PY = 138                             // y xe người chơi
const SPEED = 92
const DOOR_GAP = [5.2, 6.4]

export default {
  id: 'ship',
  title: 'Shipper giao hàng ngõ sâu',
  how: 'Chạy xe vào ngõ: nhặt gói hàng vàng, né chậu cây, mèo và xe đẩy.\nKhi ô cửa nhà khách sáng lên bên tường, bấm GIAO đúng lúc nó NGANG xe để ném gói (ngay ngắn mới trọn điểm). Ném lúc không có cửa là mất gói và bị trừ điểm.\nĐổi làn: mũi tên trái/phải, A/D, vuốt ngang hoặc nút bên dưới.',
  create(env) {
    const P = { lane: 1, x: LX[1], slow: 0, parcels: 1, flash: 0, lean: 0 }
    const S = { items: [], doors: [], t: 0, scroll: 0, nextItem: 0.6, nextDoor: 3.2, delivered: 0, collected: 0, hits: 0, missed: 0, doorN: 0, fx: [], thrown: [], nextHouse: 12, swipe: null, perfect: 0, wasted: 0, pts: 0, dur: env.dur || 45, sp: SPEED }
    env.expose({ S, P, LX, PY })
    const itemLook = new WeakMap(); let itemSeq = 0          // chỉ phần vẽ: chọn kiểu chậu / người đi bộ, không dùng Math.random
    env.setHint('◀ ▶ đổi làn · Space / nút GIAO ném gói khi cửa sáng đi ngang xe · vuốt ngang trên màn hình cũng được.')
    env.btn('◀', { cls: 'sm', onDown: () => move(-1) })
    env.btn('GIAO!', { cls: 'green', onDown: () => throwParcel(), sub: 'Space' })
    env.btn('▶', { cls: 'sm', onDown: () => move(1) })
    function move(d) { const n = clamp(P.lane + d, 0, 2); if (n !== P.lane) { P.lane = n; P.lean = d; env.sfx('step') } }
    function throwParcel() {
      const door = S.doors.find((d) => !d.done && Math.abs(d.y - PY) < K.goodDy)
      if (P.parcels <= 0) { env.sfx('error'); P.flash = 0.15; return }
      if (!door) { P.parcels--; S.wasted++; S.pts -= K.waste; env.sfx('error'); P.flash = 0.15; return }       // ném trượt: mất gói + trừ điểm
      const pf = Math.abs(door.y - PY) <= K.perfectDy
      P.parcels--; door.done = true; door.ok = true; S.delivered++; if (pf) S.perfect++; S.pts += pf ? 1 : K.good; env.sfx('pop'); env.sfx('ting')
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
        const sp = SPEED * (P.slow > 0 ? 0.45 : 1) * (1 + t * K.speedRamp); S.sp = sp
        S.scroll += sp * dt
        // vật cản + gói hàng
        S.nextItem -= dt * (sp / SPEED)
        if (S.nextItem <= 0) {
          S.nextItem = rnd(0.5, 0.95) * lerp(1, K.itemGapEnd, t / S.dur)
          const lane = Math.floor(Math.random() * 3), r = Math.random()
          let kind = r < 0.36 ? 'parcel' : r < 0.58 ? 'pot' : r < 0.76 ? 'cat' : r < 0.9 ? 'cart' : 'ped'
          // công bằng: cùng một tầm chỉ được chặn 1 làn, hoặc 2 làn mép (làn giữa trống) -> luôn còn đường tới được để đạt 100
          if (kind !== 'parcel') {
            const blocked = new Set([lane]); for (const o of S.items) if (o.kind !== 'parcel' && o.y < 60) blocked.add(o.lane)
            if (blocked.size >= 2 && blocked.has(1)) kind = 'parcel'
          }
          if (!S.items.some((o) => o.lane === lane && o.y < 30)) S.items.push({ kind, lane, x: LX[lane], y: -14, vx: kind === 'cat' ? rnd(-8, 8) : 0, t: 0, dead: false })
        }
        S.nextDoor -= dt * (sp / SPEED)
        if (S.nextDoor <= 0) { S.nextDoor = rnd(...DOOR_GAP) * lerp(1, K.doorGapEnd, t / S.dur); S.doors.push({ side: Math.random() < 0.5 ? -1 : 1, y: -16, n: 12 + (++S.doorN) * 7, done: false, ok: false }); if (P.parcels < 2) P.parcels++ }
        for (const o of S.items) {
          o.y += sp * dt; o.t += dt
          if (o.kind === 'cat') { o.x += o.vx * dt; o.x = clamp(o.x, 118, 202) }
          if (o.kind === 'ped') o.x += Math.sin(o.t * 2) * 6 * dt
          if (!o.dead && Math.abs(o.y - PY) < 11 && Math.abs(o.x - P.x) < 11) {
            o.dead = true
            if (o.kind === 'parcel') { P.parcels = Math.min(4, P.parcels + 1); S.collected++; env.sfx('ting'); S.fx.push({ x: o.x, y: o.y - 6, t: 0, c: '#ffe14a' }) }
            else { S.hits++; S.pts -= K.hit; P.slow = 1.0; env.sfx('horn'); S.fx.push({ x: o.x, y: o.y - 6, t: 0, c: '#e0553f' }); if (P.parcels > 0 && Math.random() < 0.35) P.parcels-- }
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
        // dãy nhà hai bên ngõ (lát dọc 40px, cuộn theo ngõ; mẫu 0/1 xen kẽ theo vị trí thật trong ngõ)
        R(g, 0, 0, W, H, '#6e6760')
        const off = sc % 40, base = Math.floor(sc / 40)
        for (let i = 0, y = off - 40; y < H; i++, y += 40) { const n = i - base; drawMG(g, 'ship_wall_l_' + (n & 1), 0, Math.round(y)); drawMG(g, 'ship_wall_r_' + ((n & 1) ^ 1), 228, Math.round(y)) }
        // mặt ngõ bê tông (rãnh, nắp cống) lát dọc 48px
        for (let y = (sc % 48) - 48; y < H; y += 48) drawMG(g, 'ship_floor', 92, Math.round(y))
        // cửa nhà + biển số (số nhà vẽ bằng chữ pixel trắng); khung 1 = sáng tới lượt giao, 2 = đã giao
        for (const d of S.doors) {
          const lit = !d.done && Math.abs(d.y - PY) < 20, dx = d.side < 0 ? 85 : 235, by = Math.round(d.y + 6)
          drawMG(g, d.side < 0 ? 'ship_door_l' : 'ship_door_r', dx, by, { frame: d.done ? 2 : lit ? 1 : 0 })
          const num = String(d.n % 100), nw = num.length * 4 - 1
          pxText(g, dx - 8 + 3 + Math.floor((10 - nw) / 2), by - 31 + 1, num, '#ffffff')
          if (lit && Math.floor(T * 8) % 2) { R(g, d.side < 0 ? 94 : 218, d.y - 6, 8, 2, '#ffe14a'); R(g, d.side < 0 ? 98 : 214, d.y - 9, 2, 8, '#ffe14a') }
        }
        // vật phẩm / vật cản (neo giữa đáy = đúng điểm va chạm o.x, o.y)
        for (const o of S.items) {
          const x = Math.round(o.x), y = Math.round(o.y)
          let v = itemLook.get(o); if (v === undefined) { v = itemSeq++; itemLook.set(o, v) }
          shadow(g, x, y, o.kind === 'cart' ? 22 : 12)
          if (o.kind === 'parcel') drawMG(g, 'ship_parcel', x, y + Math.round(Math.sin(o.t * 6) * 1.5) - 1)
          else if (o.kind === 'pot') drawMG(g, 'ship_pot_' + (v & 1), x, y)
          else if (o.kind === 'cat') drawMG(g, 'ship_cat', x, y, { t: o.t, flip: o.vx < 0 })
          else if (o.kind === 'cart') drawMG(g, 'ship_cart', x, y)
          else drawMG(g, 'ped_' + (v % 8) + '_down', x, y, { t: o.t })
        }
        // người chơi: shipper nhìn từ sau, áo theo màu trang phục; khung 2/3 nghiêng khi đổi làn
        const bob = Math.round(Math.sin(T * 30) * (P.slow > 0 ? 0 : 0.6))
        shadow(g, Math.round(P.x), PY, 14)
        drawMG(g, 'ship_rider', Math.round(P.x), PY + bob, { frame: P.lean < -0.25 ? 2 : P.lean > 0.25 ? 3 : Math.floor(T * 12) % 2, outfit: env.outfit })
        // dây điện vắt ngang ngõ (trên cùng)
        drawMG(g, 'ship_wires', 92, 4)
        for (const q of S.thrown) { const e = q.t, x = P.x + (q.tx - P.x) * e, y = q.y + (q.ty - q.y) * e - Math.sin(e * 3.14) * 16; drawMG(g, 'ship_parcel_s', Math.round(x), Math.round(y)) }
        for (const f of S.fx) burst(g, f.x, f.y, f.t, f.c || '#ffffff')
        if (P.flash > 0) { R(g, 100, PY - 30, 120, 1, '#e0553f') }
      },
      result() {
        // chuẩn hoá theo số cửa của chính lượt: cửa giao ngay ngắn = 1, giao lệch = K.good, lỡ = 0; trừ ném trượt và va chạm.
        const doors = Math.max(4, S.delivered + S.missed)
        const score = clamp(Math.round(100 * S.pts / doors), 0, 100)
        return { score, summary: `Giao ${S.delivered}/${S.delivered + S.missed} cửa (ngay ngắn ${S.perfect}) · ném trượt ${S.wasted}\nNhặt ${S.collected} gói · va chạm ${S.hits}` }
      },
    }
  },
}

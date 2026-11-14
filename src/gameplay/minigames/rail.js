// Mini-game #3: Gác chắn đường tàu. Hạ chắn khi đèn cảnh báo nháy (tàu sắp tới), nâng chắn ngay khi tàu qua để xe đi tiếp.
// Xe đang nằm trên đường ray khi tàu tới = tai nạn. Bắt xe chờ quá lâu thì bóp còi giục (mất điểm).
import { R, car, scooter, shadow, burst, clamp, rnd, pick, W, H } from './gfx.js'

const TRACK_Y = 96, CX = 160, ZL = 138, ZR = 182          // vùng giao cắt theo x
const TRAIN_LEN = 130, TRAIN_V = 125, WARN = 0.9
const SCHED = [{ t: 6.5, dir: 1 }, { t: 19, dir: -1 }, { t: 31.5, dir: 1 }]          // giây bắt đầu cảnh báo
const LANE_X = { down: 150, up: 170 }
const STOP = { down: 58, up: 138 }                          // vạch dừng (y) khi chắn hạ
const ZY0 = 80, ZY1 = 112                                   // vùng trên đường ray theo y
const CARC = ['#c0392b', '#2f6fb0', '#e0b020', '#3a8f5a', '#8a5ac0', '#e8e0cc']

export default {
  id: 'rail',
  title: 'Gác chắn đường tàu',
  how: 'Khi đèn đỏ nháy và chuông kêu là tàu sắp tới: HẠ CHẮN ngay (Space / nút giữa màn hình).\nTàu qua hết thì NÂNG CHẮN cho xe đi. Đừng để xe kẹt trên đường ray!',
  create(env) {
    const S = { bar: 0, want: 0, cars: [], spawn: 1, trains: SCHED.map((s) => ({ ...s, state: 'idle', x: 0 })), passed: 0, crashes: 0, angry: 0, spawned: 0, fx: [], t: 0, bell: 0, shake: 0, n: 0, spawnedEarly: 0 }
    env.setHint('Space / Enter / chạm nút để hạ – nâng chắn. ↓ hạ chắn, ↑ nâng chắn. Đèn nháy = tàu sắp tới.')
    const tog = () => { S.want = S.want ? 0 : 1; env.sfx('click') }
    const bt = env.btn('HẠ CHẮN', { cls: 'red', onDown: tog, sub: 'Space' })
    env.btn('NÂNG CHẮN', { cls: 'green', onDown: () => { S.want = 0; env.sfx('click') }, sub: '↑' })
    const trainOverlaps = (tr) => tr.state === 'run' && (tr.dir > 0 ? (tr.x - TRAIN_LEN < ZR && tr.x > ZL) : (tr.x + TRAIN_LEN > ZL && tr.x < ZR))
    const occupied = () => S.trains.some(trainOverlaps)
    const warning = () => S.trains.some((tr) => tr.state === 'warn' || trainOverlaps(tr))

    return {
      key(k, down) {
        if (!down) return
        if (k === ' ' || k === 'enter') tog()
        else if (k === 'arrowdown' || k === 's') { S.want = 1; env.sfx('click') }
        else if (k === 'arrowup' || k === 'w') { S.want = 0; env.sfx('click') }
      },
      pointer(type, x, y) { if (type === 'down') tog() },
      update(dt, t) {
        S.t = t
        S.bar += clamp(S.want - S.bar, -dt / 0.55, dt / 0.55)
        bt.firstChild.nodeValue = S.want ? 'NÂNG CHẮN' : 'HẠ CHẮN'
        // tàu
        for (const tr of S.trains) {
          if (tr.state === 'idle' && t >= tr.t) { tr.state = 'warn'; tr.wt = WARN; tr.x = tr.dir > 0 ? 0 : W; env.sfx('bell') }
          else if (tr.state === 'warn') { tr.wt -= dt; if (tr.wt <= 0) tr.state = 'run' }
          else if (tr.state === 'run') { tr.x += tr.dir * TRAIN_V * dt; if (tr.dir > 0 ? tr.x - TRAIN_LEN > W : tr.x + TRAIN_LEN < 0) { tr.state = 'done' } }
        }
        S.bell += dt
        if (warning() && Math.floor(S.bell * 2) !== Math.floor((S.bell - dt) * 2)) env.sfx('bell')
        // xe: sinh
        S.spawn -= dt
        if (S.spawn <= 0 && t < 41) { const down = Math.random() < 0.5; const moto = Math.random() < 0.6
          S.cars.push({ lane: down ? 'down' : 'up', x: down ? LANE_X.down : LANE_X.up, y: down ? -16 : H + 16, v: moto ? rnd(46, 62) : rnd(34, 48), moto, col: pick(CARC), wait: 0, state: 'drive', n: ++S.n, angry: false })
          S.spawned++; S.spawn = rnd(0.7, 1.35) }
        // xe: chạy
        const barDown = S.bar > 0.5, trainOn = occupied()
        for (const c of S.cars) {
          const dir = c.lane === 'down' ? 1 : -1
          const stopY = STOP[c.lane]
          // xe phía trước (cùng làn)
          const lead = S.cars.filter((o) => o !== c && o.lane === c.lane && (o.y - c.y) * dir > 0).sort((a, b) => Math.abs(a.y - c.y) - Math.abs(b.y - c.y))[0]
          let go = true
          if (lead && Math.abs(lead.y - c.y) < 20) go = false
          // trước vạch dừng + chắn hạ (hoặc đã sắp đóng)
          const before = dir > 0 ? c.y < stopY && c.y + c.v * 0.5 * dir > stopY - 6 : c.y > stopY && c.y + c.v * 0.5 * dir < stopY + 6
          if (before && S.bar > 0.12) go = false
          if (go) c.y += dir * c.v * dt
          c.wait = go ? 0 : c.wait + dt
          if (c.wait > 5 && !c.angry) { c.angry = true; S.angry++; env.sfx('horn') }
          // vào vùng ray khi tàu tới
          const inZone = c.y > ZY0 && c.y < ZY1 + 4
          if (inZone && trainOn && c.state === 'drive') { c.state = 'crash'; S.crashes++; S.shake = 0.5; S.fx.push({ x: c.x, y: c.y, t: 0 }); env.sfx('error'); env.sfx('horn') }
          if (c.state === 'drive' && (dir > 0 ? c.y > ZY1 + 14 : c.y < ZY0 - 14) && !c.counted) { c.counted = true; S.passed++ }
        }
        S.cars = S.cars.filter((c) => (c.state === 'drive' ? c.y > -30 && c.y < H + 30 : false))
        for (const f of S.fx) f.t += dt * 1.6
        S.fx = S.fx.filter((f) => f.t < 1)
        S.shake = Math.max(0, S.shake - dt)
      },
      hud() { return `Xe qua ${S.passed} · tai nạn ${S.crashes}` },
      draw(g, t, stage) {
        const T = stage === 'play' ? t : performance.now() / 1000
        const ox = S.shake > 0 ? Math.round(Math.sin(T * 60) * 2) : 0
        g.save(); g.translate(ox, 0)
        // nền: vỉa hè + nhà hai bên
        R(g, -4, 0, W + 8, H, '#b9a98a'); for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) R(g, x + (y / 16 % 2) * 8, y, 15, 15, 'rgba(0,0,0,.05)')
        // mảng nhà trái / phải
        const house = (x, y, w, h, c) => { R(g, x, y, w, h, c); R(g, x, y, w, 4, 'rgba(0,0,0,.22)'); for (let i = 4; i < w - 6; i += 12) R(g, x + i, y + 8, 6, 8, '#cfe3ee') }
        house(4, 4, 60, 56, '#c9a46a'); house(70, 4, 56, 56, '#a8c0a0'); house(194, 4, 56, 56, '#d6b0a0'); house(256, 4, 60, 56, '#b0b8d0')
        house(4, 126, 60, 50, '#d6b0a0'); house(70, 126, 56, 50, '#c9a46a'); house(194, 126, 56, 50, '#b0b8d0'); house(256, 126, 60, 50, '#a8c0a0')
        // đường dọc
        R(g, 134, 0, 52, H, '#4a4d55'); R(g, 133, 0, 1, H, '#7a7c82'); R(g, 186, 0, 1, H, '#7a7c82')
        for (let y = -((T * 24) % 20); y < H; y += 20) R(g, 159, y, 2, 10, '#d9d2b0')
        // đường ray
        R(g, 0, TRACK_Y - 11, W, 22, '#6e6354')
        for (let x = 0; x < W; x += 7) R(g, x, TRACK_Y - 9, 3, 18, '#4a3b2a')
        R(g, 0, TRACK_Y - 6, W, 2, '#c8ccd2'); R(g, 0, TRACK_Y + 4, W, 2, '#c8ccd2'); R(g, 134, TRACK_Y - 11, 52, 22, 'rgba(70,70,76,.55)')
        for (let x = 134; x < 186; x += 7) R(g, x, TRACK_Y - 9, 3, 18, '#3a3a40')
        R(g, 134, TRACK_Y - 6, 52, 2, '#c8ccd2'); R(g, 134, TRACK_Y + 4, 52, 2, '#c8ccd2')
        // xe
        for (const c of S.cars) { const dir = c.lane === 'down' ? 1 : -1; if (c.moto) { scooter(g, c.x, c.y, 1, c.col); } else { R(g, c.x - 6, c.y - 13, 12, 26, c.col); R(g, c.x - 5, c.y - 8 * dir - 4, 10, 6, '#bfe3f2'); R(g, c.x - 6, c.y + 8, 3, 3, '#222'); R(g, c.x + 3, c.y + 8, 3, 3, '#222'); R(g, c.x - 6, c.y - 13, 3, 3, '#222'); R(g, c.x + 3, c.y - 13, 3, 3, '#222') }
          if (c.angry) { R(g, c.x - 2, c.y - 24, 4, 6, '#e0553f'); R(g, c.x - 1, c.y - 17, 2, 2, '#e0553f') } }
        // tàu
        for (const tr of S.trains) if (tr.state === 'run') {
          const x1 = tr.dir > 0 ? tr.x - TRAIN_LEN : tr.x, y = TRACK_Y
          R(g, x1, y - 11, TRAIN_LEN, 20, '#2f6fb0'); R(g, x1, y - 11, TRAIN_LEN, 3, '#9fc3e8'); R(g, x1, y + 6, TRAIN_LEN, 3, '#1f4a7a')
          for (let i = 0; i < 5; i++) R(g, x1 + 6 + i * 25, y - 6, 15, 6, '#d6ecf7')
          R(g, tr.dir > 0 ? x1 + TRAIN_LEN - 14 : x1, y - 11, 14, 20, '#d34a3a'); R(g, tr.dir > 0 ? x1 + TRAIN_LEN - 8 : x1 + 2, y - 7, 6, 6, '#ffe9a0')
          R(g, x1, y + 9, TRAIN_LEN, 2, 'rgba(0,0,0,.3)')
        }
        // chắn + đèn
        const ang = S.bar, blink = warning() && Math.floor(T * 5) % 2
        const drawBar = (px, py, sx) => {                       // cần chắn: dựng lên khi nâng, nằm ngang qua mặt đường khi hạ
          const ex = px + sx * 50 * ang, ey = py - (1 - ang) * 18, n = 26
          for (let i = 0; i <= n; i++) { const f = i / n; R(g, px + (ex - px) * f - 1, py + (ey - py) * f - 1, 3, 3, Math.floor(i / 3) % 2 ? '#f4efe2' : '#d34a3a') }
          R(g, px - 4, py - 4, 8, 12, '#555'); R(g, px - 4, py - 16, 8, 12, '#2a2a2e'); R(g, px - 3, py - 15, 6, 4, blink ? '#ff3b2f' : '#6a2020'); R(g, px - 3, py - 10, 6, 4, blink ? '#6a2020' : '#ff3b2f')
        }
        drawBar(134, 76, 1); drawBar(186, 120, -1)
        for (const f of S.fx) { burst(g, f.x, f.y, f.t, '#ff8a3a'); burst(g, f.x, f.y, f.t * 0.6, '#ffe14a') }
        g.restore()
        // cảnh báo
        if (warning() && Math.floor(T * 5) % 2) { R(g, 8, 70, 4, 4, '#ff3b2f'); R(g, W - 12, 70, 4, 4, '#ff3b2f') }
      },
      result() {
        const base = S.spawned > 0 ? S.passed / Math.max(1, S.spawned - 2) : 0
        const score = clamp(Math.round(100 * Math.min(1, base) - S.crashes * 30 - S.angry * 4), 0, 100)
        return { score, summary: `Xe qua đường ${S.passed}/${S.spawned} · tai nạn ${S.crashes} · xe bóp còi giục ${S.angry}` }
      },
    }
  },
}

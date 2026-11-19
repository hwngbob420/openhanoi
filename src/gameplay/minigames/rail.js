// Mini-game #3: Gác chắn đường tàu. Hạ chắn khi đèn cảnh báo nháy (tàu sắp tới), nâng chắn ngay khi tàu qua để xe đi tiếp.
// Xe đang nằm trên đường ray khi tàu tới = tai nạn. Bắt xe chờ quá lâu thì bóp còi giục (mất điểm).
import { R, burst, clamp, rnd, pick, drawMG, W, H } from './gfx.js'
import { MG } from '../balance.js'
import { fmtDec } from '../economy-config.js'

const TRACK_Y = 96, CX = 160, ZL = 138, ZR = 182          // vùng giao cắt theo x
const TRAIN_LEN = 130
const K = MG.rail
const lerp = (a, b, f) => a + (b - a) * clamp(f, 0, 1)
// Lịch tàu (giây chuông reo). Tàu sau nhanh hơn, báo trước ngắn hơn: lead = từ lúc chuông tới lúc đầu tàu vào giao cắt.
function schedule() {
  const n = K.bells.length
  return K.bells.map((t, i) => {
    const f = n > 1 ? i / (n - 1) : 0, v = lerp(K.v0, K.v1, f), lead = lerp(K.lead0, K.lead1, f)
    return { t, dir: i % 2 ? -1 : 1, v, warn: lead - (ZL - 0) / v, arrive: t + lead, clear: t + lead + (TRAIN_LEN + ZR - ZL) / v }
  })
}
const LANE_X = { down: 150, up: 170 }
const STOP = { down: 58, up: 138 }                          // vạch dừng (y) khi chắn hạ
const ZY0 = 80, ZY1 = 112                                   // vùng trên đường ray theo y
const CARC = ['#c0392b', '#2f6fb0', '#e0b020', '#3a8f5a', '#8a5ac0', '#e8e0cc']

export default {
  id: 'rail',
  title: 'Gác chắn đường tàu',
  how: 'Khi đèn đỏ nháy và chuông kêu là tàu sắp tới: HẠ CHẮN ngay (Space, chạm màn hình hoặc nút HẠ CHẮN).\nĐuôi tàu vừa qua là NÂNG CHẮN liền cho xe đi. Hạ trễ thì xe kẹt trên ray; đóng chắn thừa (khi không có tàu, hoặc nâng chậm) bị trừ điểm theo từng giây. Tàu tới dày và nhanh dần!',
  create(env) {
    const S = { bar: 0, want: 0, cars: [], spawn: 1, trains: schedule().map((s) => ({ ...s, state: 'idle', x: 0, checked: false })), passed: 0, crashes: 0, angry: 0, spawned: 0, fx: [], t: 0, bell: 0, shake: 0, n: 0, spawnedEarly: 0, excess: 0, late: 0, dur: env.dur || 45 }
    env.expose({ S, ZL, ZR, ZY0, ZY1, STOP })
    env.setHint('Space / Enter / chạm nút để hạ – nâng chắn. ↓ hạ chắn, ↑ nâng chắn. Đèn nháy = tàu sắp tới.')
    const tog = () => { S.want = S.want ? 0 : 1; env.sfx('click') }
    env.btn('HẠ CHẮN', { cls: 'red', onDown: () => { S.want = 1; env.sfx('click') }, sub: '↓ · Space bật/tắt' })
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
        // tàu
        for (const tr of S.trains) {
          if (tr.state === 'idle' && t >= tr.t) { tr.state = 'warn'; tr.wt = tr.warn; tr.x = tr.dir > 0 ? 0 : W; env.sfx('bell') }
          else if (tr.state === 'warn') { tr.wt -= dt; if (tr.wt <= 0) tr.state = 'run' }
          else if (tr.state === 'run') { tr.x += tr.dir * tr.v * dt; if (tr.dir > 0 ? tr.x - TRAIN_LEN > W : tr.x + TRAIN_LEN < 0) { tr.state = 'done' } }
        }
        // chấm thời điểm: tàu vào giao cắt mà chắn chưa hạ hẳn = hạ trễ; chắn đang chặn xe ngoài khung [chuông .. đuôi tàu qua] = đóng thừa
        for (const tr of S.trains) if (!tr.checked && t >= tr.arrive) { tr.checked = true; if (S.bar < 0.9) S.late++ }
        if (S.bar > 0.12 && !S.trains.some((tr) => t >= tr.t && t <= tr.clear)) S.excess += dt
        S.bell += dt
        if (warning() && Math.floor(S.bell * 2) !== Math.floor((S.bell - dt) * 2)) env.sfx('bell')
        // xe: sinh
        S.spawn -= dt
        if (S.spawn <= 0 && t < 41) { const down = Math.random() < 0.5; const moto = Math.random() < 0.6
          S.cars.push({ lane: down ? 'down' : 'up', x: down ? LANE_X.down : LANE_X.up, y: down ? -16 : H + 16, v: moto ? rnd(46, 62) : rnd(34, 48), moto, col: pick(CARC), wait: 0, state: 'drive', n: ++S.n, angry: false })
          S.spawned++; S.spawn = rnd(0.7, 1.35) * lerp(1, 0.75, t / S.dur) }
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
          if (c.wait > K.angryWait && !c.angry) { c.angry = true; S.angry++; env.sfx('horn') }
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
      hud() { return `Xe qua ${S.passed} · tai nạn ${S.crashes} · đóng thừa ${fmtDec(S.excess)} giây` },
      draw(g, t, stage) {
        const T = stage === 'play' ? t : performance.now() / 1000
        const ox = S.shake > 0 ? Math.round(Math.sin(T * 60) * 2) : 0
        g.save(); g.translate(ox, 0)
        // nền: gạch lát vỉa hè + 8 nhà ống nhìn từ trên (mái ngói / sân thượng, biển hiệu)
        R(g, -4, 0, W + 8, H, '#b9a98a'); for (let y = 0; y < H; y += 16) for (let x = -16; x < W + 16; x += 16) drawMG(g, 'tc_pave', x, y)
        ;[[0, 4, 4], [1, 70, 4], [2, 194, 4], [3, 256, 4], [2, 4, 126], [3, 70, 126], [0, 194, 126], [1, 256, 126]].forEach(([k, x, y]) => drawMG(g, 'rail_house_' + k, x, y))
        // đường dọc
        R(g, 134, 0, 52, H, '#566478'); R(g, 133, 0, 1, H, '#8a8c92'); R(g, 186, 0, 1, H, '#8a8c92')
        for (let y = -((T * 24) % 20); y < H; y += 20) R(g, 159, y, 2, 10, '#d9d2b0')
        // đường ray (đoạn qua mặt đường nhựa ở x 128..191)
        for (let x = -16; x < W + 16; x += 16) drawMG(g, x >= 128 && x < 186 ? 'rail_track_cross' : 'rail_track', x, TRACK_Y - 11)
        // xe nhìn từ trên: neo = tâm xe (c.x, c.y) đúng điểm luật chơi dùng
        // xe đầu hàng vẽ sau cùng (xe chờ xếp sát nhau thì mũi xe sau nằm dưới đuôi xe trước)
        for (const c of [...S.cars].sort((a, b) => (a.lane === 'down' ? a.y : -a.y) - (b.lane === 'down' ? b.y : -b.y))) {
          const k = Math.max(0, CARC.indexOf(c.col)), d = c.lane === 'down' ? 'down' : 'up'
          drawMG(g, c.moto ? `veh_motot_${k % 4}_${d}` : `veh_cart_${k % 3}_${d}`, c.x, c.y, { t: T + c.n * 0.37 })
          if (c.angry) drawMG(g, 'ico_angry', c.x + 1, Math.round(c.y - (c.moto ? 13 : 15)), { t: T })
        }
        // tàu Thống Nhất: đầu máy + 2 toa = TRAIN_LEN; đáy ở TRACK_Y+9
        for (const tr of S.trains) if (tr.state === 'run') {
          const x1 = Math.round(tr.dir > 0 ? tr.x - TRAIN_LEN : tr.x), y = TRACK_Y + 9
          R(g, x1 + 1, y, TRAIN_LEN - 2, 2, 'rgba(0,0,0,.28)')
          if (tr.dir > 0) { drawMG(g, 'rail_coach', x1, y, { t: T }); drawMG(g, 'rail_coach', x1 + 44, y, { t: T + 0.3 }); drawMG(g, 'rail_loco_r', x1 + 88, y, { t: T }) }
          else { drawMG(g, 'rail_loco_l', x1, y, { t: T }); drawMG(g, 'rail_coach', x1 + 42, y, { t: T + 0.3 }); drawMG(g, 'rail_coach', x1 + 86, y, { t: T }) }
        }
        // cột tín hiệu (đèn đỏ nháy khi có tàu) + cần chắn barie (khung theo độ hạ S.bar)
        const warn = warning(), bf = Math.round(clamp(S.bar, 0, 1) * 4)
        drawMG(g, warn ? 'rail_signal' : 'rail_signal_off', 128, 80, { t: T })
        drawMG(g, 'rail_boom', 134, 76, { frame: bf })
        drawMG(g, warn ? 'rail_signal' : 'rail_signal_off', 192, 124, { t: T + 0.2 })
        drawMG(g, 'rail_boom_l', 186, 120, { frame: bf })
        for (const f of S.fx) { burst(g, f.x, f.y, f.t, '#ff8a3a'); burst(g, f.x, f.y, f.t * 0.6, '#ffe14a') }
        g.restore()
        // cảnh báo
        if (warning() && Math.floor(T * 5) % 2) { R(g, 8, 70, 4, 4, '#ff3b2f'); R(g, W - 12, 70, 4, 4, '#ff3b2f') }
      },
      result() {
        // 100 = hạ đúng lúc chuông, nâng ngay khi đuôi tàu qua, không tai nạn. Trừ: mỗi giây đóng thừa, tai nạn, hạ trễ, xe bóp còi.
        const score = clamp(Math.round(100 - S.excess * K.excessPerSec - S.crashes * K.crash - S.late * K.late - S.angry * K.angry), 0, 100)
        return { score, summary: `Xe qua đường ${S.passed}/${S.spawned} · tai nạn ${S.crashes} · chắn đóng thừa ${fmtDec(S.excess)} giây\nHạ chắn trễ ${S.late} lần · xe bóp còi giục ${S.angry}` }
      },
    }
  },
}

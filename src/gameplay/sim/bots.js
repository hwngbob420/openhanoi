// Bot giả lập mini-game (chạy trong trang dev 8803). Bước thời gian cố định, không vẽ.
const DT = window.__simDT || 1 / 120, DUR = 45
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
const REACT = () => 0.25 + gauss() * 0.05          // phản xạ ~250ms ± 50ms
const JIT = () => gauss() * 0.04                    // lệch nhịp khi bấm theo nhịp (σ 40ms)

async function load(id) { return (await import(`/src/gameplay/minigames/${id}.js`)).default }

function makeEnv() {
  const keys = new Set(), btns = []
  const env = {
    W: 320, H: 180, opts: {}, keys, sfx() {}, ctrl: document.createElement('div'), overlay: document.createElement('div'),
    outfit: { hair: '#222', top: '#c33', pants: '#335' }, dur: DUR, timeScale: 1, setHint() {}, exposed: null, ended: false,
    expose(s) { env.exposed = s }, end() { env.ended = true }, get stage() { return 'play' }, fine: (n) => n,
    btn(label, o = {}) { const b = document.createElement('button'); b.appendChild(document.createTextNode(label)); btns.push({ label, o, b }); return b },
  }
  env.btns = btns
  return env
}

async function run(id, botFactory) {
  const def = await load(id)
  const env = makeEnv()
  const game = def.create(env)
  const q = []                                  // hàng đợi hành động hẹn giờ
  const api = {
    t: 0,
    at(time, fn) { q.push({ time, fn }); q.sort((a, b) => a.time - b.time) },
    press(k) { env.keys.add(k); game.key && game.key(k, true) },
    release(k) { env.keys.delete(k); game.key && game.key(k, false) },
    tap(k) { api.press(k); api.release(k) },
    hold(k, on) { if (on && !env.keys.has(k)) api.press(k); else if (!on && env.keys.has(k)) api.release(k) },
    btn(label) { const x = env.btns.find((b) => b.label === label); if (!x) throw new Error('no btn ' + label); x.o.onDown && x.o.onDown(); if (x.o.key) api.tap(x.o.key); x.o.onUp && x.o.onUp() },
    pointer: (type, x, y, d) => game.pointer && game.pointer(type, x, y, d),
    game, env,
  }
  const bot = botFactory(api)
  if (game.begin) game.begin()
  let t = 0
  while (t < DUR - 1e-9 && !env.ended) {
    while (q.length && q[0].time <= t + 1e-9) q.shift().fn()
    bot.step && bot.step(t)
    t += DT; api.t = t
    game.update(DT, t)
  }
  const r = game.result()
  return { score: Math.round(r.score), failed: !!r.failed, summary: r.summary }
}

// ───────────────────────── PHỞ ─────────────────────────
const pho = (() => {
  const BEAT = 0.625
  const nextBeat = (t) => Math.ceil(t / BEAT - 1e-6) * BEAT
  function server(mode) {
    return (api) => {
      const seen = new Set()
      return {
        step(t) {
          const S = api.env.exposed
          for (const c of S.custs) {
            if (c.state !== 'wait' || seen.has(c)) continue
            if (mode === 'perfect') { seen.add(c); const b = nextBeat(t + 0.001); api.at(b, () => api.tap(String(c.dish + 1))) }
            else if (c.arrive >= 1) {             // người thấy bong bóng hiện ra rồi mới phản xạ
              seen.add(c)
              const ready = t + REACT()
              let b = nextBeat(ready)
              // nhiều món cùng phách: ngón tay bấm cách nhau ~110ms
              const busy = (api._busy ||= new Map()); const k = Math.round(b / BEAT); const n = busy.get(k) || 0; busy.set(k, n + 1)
              const when = b + n * 0.11 + JIT()
              const wrong = Math.random() < 0.03
              api.at(when, () => api.tap(wrong ? String(((c.dish + 1) % 3) + 1) : String(c.dish + 1)))
              if (wrong) api.at(when + BEAT, () => api.tap(String(c.dish + 1)))
            }
          }
        },
      }
    }
  }
  const randKeys = (rate) => (api) => ({ step() { if (Math.random() < rate * DT) api.tap(String(1 + Math.floor(Math.random() * 3))) } })
  const allOnBeat = (api) => { let last = -1; return { step(t) { const b = Math.floor(t / BEAT); if (b !== last) { last = b; api.tap('1'); api.tap('2'); api.tap('3') } } } }
  const cycle = (rate) => (api) => { let i = 0, acc = 0; return { step() { acc += rate * DT; while (acc >= 1) { acc--; api.tap(String(1 + (i++ % 3))) } } } }
  return {
    perfect: server('perfect'), good: server('good'),
    spam: { 'không bấm': () => ({}), 'giữ phím 1': (api) => { api.press('1'); return {} }, 'ngẫu nhiên 2/giây': randKeys(2), 'ngẫu nhiên 5/giây': randKeys(5), 'ngẫu nhiên 10/giây': randKeys(10), 'cả 3 món mỗi phách': allOnBeat, 'xoay 1-2-3 20/giây': cycle(20), 'xoay 1-2-3 4/giây': cycle(4) },
  }
})()

// ───────────────────────── TRÀ CHANH ─────────────────────────
const tc = (() => {
  const LANE_Y = [74, 100, 126]
  // điều khiển: giữ phím mũi tên theo hướng mong muốn
  function drive(api, ix, iy) { api.hold('arrowleft', ix < 0); api.hold('arrowright', ix > 0); api.hold('arrowup', iy < 0); api.hold('arrowdown', iy > 0) }
  function planner(opts) {
    return (api) => {
      const hist = []; const errs = new Map()
      return {
        step(t) {
          const { S, P, SLOTS } = api.env.exposed
          hist.push({ t, cars: S.cars.map((c) => ({ c, x: c.x, y: c.y, v: c.v, dir: c.dir, w: c.w })) })
          while (hist.length && hist[0].t < t - 1) hist.shift()
          if (P.stun > 0) { drive(api, 0, 0); return }
          // góc nhìn: hoàn hảo = hiện tại; người = 250ms trước + đoán tốc độ lệch ±15%
          let view = hist[hist.length - 1]
          if (opts.lag) { for (let i = hist.length - 1; i >= 0; i--) if (hist[i].t <= t - opts.lag) { view = hist[i]; break } }
          const cars = view.cars.map((o) => { if (!errs.has(o.c)) errs.set(o.c, 1 + (opts.vErr ? (Math.random() * 2 - 1) * opts.vErr : 0)); return { ...o, v: o.v * errs.get(o.c) } })
          const age = t - view.t
          const m = opts.margin
          const speed = (P.carry >= 0 ? 58 : 72)
          const hitAt = (x, y, tau) => cars.some((o) => Math.abs(y - o.y) < 8 + m && Math.abs(x - (o.x + o.dir * o.v * (tau + age))) < o.w / 2 + 4 + m)
          const inBand = (y) => LANE_Y.some((ly) => Math.abs(y - ly) < 8 + m)
          // mục tiêu
          let tx, ty
          if (P.carry < 0) { tx = 160; ty = 166 } else {
            let bi = -1, bd = 1e9; SLOTS.forEach((sx, i) => { if (S.slots[i] < 0 && Math.abs(sx - P.x) + Math.abs(sx - 160) * 0.3 < bd) { bd = Math.abs(sx - P.x) + Math.abs(sx - 160) * 0.3; bi = i } })
            if (bi < 0) { drive(api, 0, 0); return }
            tx = SLOTS[bi]; ty = 50
          }
          let ix = 0, iy = 0
          const onWalk = P.y > 142 || P.y < 56
          if (Math.abs(P.x - tx) > 2 && (onWalk || opts.diag)) ix = tx > P.x ? 1 : -1
          if (Math.abs(P.x - tx) < 14 || !onWalk) { if (Math.abs(P.y - ty) > 2) iy = ty > P.y ? 1 : -1 }
          if (P.carry < 0 && P.y < 142 && P.y > 56) ix = 0
          if (iy && !opts.careless) {
            // thử đi tiếp tới vùng an toàn kế tiếp
            let y = P.y, tau = 0, ok = true
            const stepT = 0.01
            let leftBand = !inBand(y)
            for (let k = 0; k < 120; k++) {
              tau += stepT; y += iy * speed * stepT
              if (hitAt(P.x, y, tau + (opts.pad || 0))) { ok = false; break }
              if (!inBand(y)) { if (!leftBand || k > 2) { if (k > 2 && !inBand(y)) break } }
              if (y < 56 || y > 142) break
            }
            if (!ok) {
              if (inBand(P.y)) {                 // giữa làn: lùi hoặc đứng tuỳ cái nào an toàn
                const back = !hitAt(P.x, P.y - iy * speed * 0.15, 0.15)
                iy = back ? -iy : 0
              } else iy = 0
              ix = 0
            }
          }
          drive(api, ix, iy)
        },
      }
    }
  }
  const randHold = (api) => { let next = 0; return { step(t) { if (t >= next) { next = t + 0.3; drive(api, Math.floor(Math.random() * 3) - 1, Math.floor(Math.random() * 3) - 1) } } } }
  const randClick = (rate) => (api) => ({ step() { if (Math.random() < rate * DT) api.pointer('down', Math.random() * 320, Math.random() * 180) } })
  const zigzag = (api) => ({ step(t) { drive(api, 0, Math.floor(t / 2) % 2 ? 1 : -1) } })
  return {
    perfect: planner({ margin: 0.5, lag: 0, diag: true }),
    good: planner({ margin: 6, lag: 0.25, vErr: 0.1, pad: 0.05 }),
    spam: { 'không bấm': () => ({}), 'giữ ▲': (api) => ({ step() { drive(api, 0, -1) } }), 'lên xuống mỗi 2 giây': zigzag, 'giữ phím ngẫu nhiên': randHold, 'chạm ngẫu nhiên 3/giây': randClick(3), 'đi thẳng không né xe': planner({ margin: 0, careless: true, diag: true }) },
  }
})()

// ───────────────────────── GÁC CHẮN ─────────────────────────
const rail = (() => {
  function gate(mode) {
    return (api) => {
      const done = new Set()
      return {
        step(t) {
          const { S } = api.env.exposed
          for (const tr of S.trains) {
            if (mode === 'perfect') {
              if (!done.has(tr.t + 'd') && t >= tr.t) { done.add(tr.t + 'd'); api.tap('arrowdown') }
              if (!done.has(tr.t + 'u') && t >= tr.clear - 0.48) {
                const next = S.trains.find((o) => o.t > tr.t)
                done.add(tr.t + 'u'); if (!next || next.t > tr.clear + 0.05) api.tap('arrowup')
              }
            } else if (mode === 'good') {
              if (!done.has(tr.t + 'd') && tr.state !== 'idle') { done.add(tr.t + 'd'); api.at(t + REACT(), () => api.tap('arrowdown')) }
              // thấy đuôi tàu qua khỏi giao cắt rồi mới phản xạ nâng
              if (!done.has(tr.t + 'u') && t >= tr.clear) { done.add(tr.t + 'u'); const next = S.trains.find((o) => o.t > tr.t); api.at(t + REACT(), () => { if (!next || next.state === 'idle') api.tap('arrowup') }) }
            } else if (mode === 'casual') {
              if (!done.has(tr.t + 'd') && tr.state !== 'idle') { done.add(tr.t + 'd'); api.at(t + 0.5, () => api.tap('arrowdown')) }
              if (!done.has(tr.t + 'u') && t >= tr.clear) { done.add(tr.t + 'u'); api.at(t + 1.5, () => api.tap('arrowup')) }
            }
          }
        },
      }
    }
  }
  const randTog = (rate) => (api) => ({ step() { if (Math.random() < rate * DT) api.tap(' ') } })
  return {
    perfect: gate('perfect'), good: gate('good'),
    spam: { 'không bấm': () => ({}), 'hạ chắn suốt lượt': (api) => { api.tap('arrowdown'); return {} }, 'bật tắt ngẫu nhiên 1/giây': randTog(1), 'bật tắt ngẫu nhiên 3/giây': randTog(3), 'bật tắt ngẫu nhiên 8/giây': randTog(8), 'bật tắt đều mỗi 0,5 giây': (api) => { let n = -1; return { step(t) { const k = Math.floor(t / 0.5); if (k !== n) { n = k; api.tap(' ') } } } }, 'chơi ẩu (hạ chậm 0,5s, nâng chậm 1,5s)': gate('casual') },
  }
})()

// ───────────────────────── SHIPPER ─────────────────────────
const ship = (() => {
  function rider(mode) {
    return (api) => {
      const hist = [], planned = new Set()
      return {
        step(t) {
          const { S, P, LX, PY } = api.env.exposed
          hist.push({ t, items: S.items.map((o) => ({ kind: o.kind, lane: o.lane, x: o.x, y: o.y, dead: o.dead })) })
          while (hist.length && hist[0].t < t - 1) hist.shift()
          let view = hist[hist.length - 1]
          if (mode === 'good') for (let i = hist.length - 1; i >= 0; i--) if (hist[i].t <= t - 0.25) { view = hist[i]; break }
          // chọn làn: tránh vật cản sẽ tới trong ~0,9 giây, thích gói hàng
          const horizon = mode === 'good' ? 0.75 : 0.9, sp = S.sp
          const cost = [0, 1, 2].map((ln) => {
            let c = Math.abs(ln - P.lane) * 0.05
            for (const o of view.items) {
              if (o.dead) continue
              const ttc = (PY - o.y) / sp - (t - view.t)
              if (ttc < -0.12 || ttc > horizon) continue
              const near = Math.abs(o.x - LX[ln]) < 14
              if (!near) continue
              if (o.kind === 'parcel') c -= P.parcels < 3 ? 0.3 : 0.05; else c += 5
            }
            // đi ngang qua làn giữa cũng có thể đâm: phạt nếu làn giữa đang có vật cản sát
            if (Math.abs(ln - P.lane) === 2) for (const o of view.items) { const ttc = (PY - o.y) / sp; if (o.kind !== 'parcel' && ttc > -0.2 && ttc < 0.35 && Math.abs(o.x - LX[1]) < 14) c += 20 }
            return c
          })
          let best = P.lane; for (let ln = 0; ln < 3; ln++) if (cost[ln] < cost[best] - 0.01) best = ln
          if (best !== P.lane && (mode === 'perfect' || !api._mv || t > api._mv)) {
            if (mode === 'good') { api._mv = t + 0.12; api.at(t + 0.02, () => api.tap(best > P.lane ? 'arrowright' : 'arrowleft')) }
            else api.tap(best > P.lane ? 'arrowright' : 'arrowleft')
          }
          // ném: hoàn hảo = đúng khung cửa qua PY; người = đoán lúc cửa ngang xe ± 40ms
          for (const d of S.doors) {
            if (d.done || planned.has(d)) continue
            const tt = (PY - d.y) / sp
            if (mode === 'perfect') { if (Math.abs(d.y - PY) <= sp * DT * 0.6) { planned.add(d); api.tap(' ') } }
            else if (tt < 0.8 && tt > 0) { planned.add(d); api.at(t + tt + JIT(), () => api.tap(' ')) }
          }
        },
      }
    }
  }
  const randThrow = (rate, laneRate = 1) => (api) => ({ step() { if (Math.random() < rate * DT) api.tap(' '); if (Math.random() < laneRate * DT) api.tap(Math.random() < 0.5 ? 'arrowleft' : 'arrowright') } })
  return {
    perfect: rider('perfect'), good: rider('good'),
    spam: { 'không bấm': () => ({}), 'giữ Space': (api) => { api.press(' '); return {} }, 'ném ngẫu nhiên 1/giây': randThrow(1), 'ném ngẫu nhiên 3/giây': randThrow(3), 'ném ngẫu nhiên 8/giây': randThrow(8), 'ném liên tục 10/giây, đứng giữa': randThrow(10, 0) },
  }
})()

// ───────────────────────── XÍCH LÔ ─────────────────────────
const cyclo = (() => {
  function rider(mode) {
    return (api) => {
      let side = 'a', nextTap = 0.3, metro = 0.3
      const rung = new Set()
      return {
        step(t) {
          const st = api.env.exposed, S = st.S, dbg = api.game.debug()
          const cad = dbg.cadence
          if (mode === 'perfect') { if (t >= nextTap - 1e-9) { if (!S.braking && S.stumble <= 0) { api.tap(side); side = side === 'a' ? 'd' : 'a' } nextTap += cad } }
          else {                                            // người: máy đếm nhịp trong đầu + lệch σ 40ms mỗi lần bấm
            if (t >= nextTap - 1e-9) { if (!S.braking && S.stumble <= 0) { api.tap(side); side = side === 'a' ? 'd' : 'a' } metro += cad; nextTap = metro + JIT(); if (nextTap < t + 0.02) nextTap = t + 0.02 }
          }
          for (const w of S.walkers) {
            const dx = w.x - S.dist
            if (w.state !== 'wait' || rung.has(w.id) || !(dx < 215 && dx > 18)) continue
            rung.add(w.id)
            if (mode === 'perfect') api.tap(' ')
            else api.at(t + REACT(), () => api.tap(' '))
          }
        },
      }
    }
  }
  const alt = (gap) => (api) => { let side = 'a', next = 0.2; return { step(t) { if (t >= next) { next += gap; api.tap(side); side = side === 'a' ? 'd' : 'a' } } } }
  const poisson = (rate, bells = 0) => (api) => ({ step() { if (Math.random() < rate * DT) api.tap(Math.random() < 0.5 ? 'a' : 'd'); if (Math.random() < bells * DT) api.tap(' ') } })
  return {
    perfect: rider('perfect'), good: rider('good'),
    spam: { 'không bấm': () => ({}), 'luân phiên A/D 20 lần/giây': alt(0.05), 'luân phiên A/D 8 lần/giây': alt(0.125), 'luân phiên A/D 5 lần/giây': alt(0.2), 'A/D ngẫu nhiên 5/giây': poisson(5), 'A/D ngẫu nhiên 8/giây + chuông 2/giây': poisson(8, 2), 'giữ A': (api) => { api.press('a'); return {} } },
  }
})()

const BOTS = { pho, tc, rail, ship, cyclo }
async function bench(id, n = 30) {
  const B = BOTS[id], out = {}
  const stat = async (name, f) => { const sc = []; let fails = 0; for (let i = 0; i < n; i++) { const r = await run(id, f); sc.push(r.score); if (r.failed) fails++ } sc.sort((a, b) => a - b); out[name] = { mean: Math.round(sc.reduce((a, b) => a + b, 0) / n * 10) / 10, min: sc[0], max: sc[n - 1], fails, ge95: sc.filter((x) => x >= 95).length } }
  await stat('hoàn hảo', B.perfect)
  await stat('tốt (250ms)', B.good)
  for (const [k, f] of Object.entries(B.spam)) await stat('spam: ' + k, f)
  return out
}
window.__sim = { run, bench, BOTS, sample: async (id, who) => run(id, BOTS[id][who] || BOTS[id].spam[who]) }

// Bộ chạy mini-game: lớp DOM phủ lên game (canvas logic 320x180 + HUD + nút cảm ứng), khóa nhân vật bằng lockPlayer,
// chặn phím/chạm lan xuống thế giới. Mỗi mini-game là một file: export default { id, title, how, create(env) -> game }.
import { bus } from '../../core/bus.js'
import { State } from '../../core/state.js'
import { OUTFIT_OPTIONS } from '../../assets/characters/index.js'
import { MINIGAME_SECONDS, PAY_MIN, PAY_MAX } from '../balance.js'
import { clamp, W, H } from './gfx.js'
import pho from './pho.js'
import tc from './tc.js'
import rail from './rail.js'
import ship from './ship.js'
import cyclo from './cyclo.js'

export const GAMES = { pho, tc, rail, ship, cyclo }
let active = null

export const isActive = () => !!active
export const list = () => Object.values(GAMES).map((g) => ({ id: g.id, title: g.title }))
export function payFor(score, mult = 1) {
  const p = (PAY_MIN + (PAY_MAX - PAY_MIN) * clamp(score, 0, 100) / 100) * mult
  return Math.round(p / 1000) * 1000
}
const fmtMoney = (n) => Math.round(n).toLocaleString('vi-VN') + 'đ'

const CSS = `
.gm{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(8,10,16,.9);font-family:"Segoe UI",system-ui,-apple-system,Roboto,sans-serif;color:#f4efe2;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;padding:6px;box-sizing:border-box}
.gm *{box-sizing:border-box}
.gm-card{width:min(96vw,940px,calc((100vh - 210px) * 1.7778));width:min(96vw,940px,calc((100dvh - 210px) * 1.7778));min-width:min(96vw,300px);display:flex;flex-direction:column;gap:6px}
.gm-top{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px}
.gm-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ffd96a}
.gm-time{font-variant-numeric:tabular-nums;min-width:44px;text-align:right}
.gm-score{font-size:13px;color:#cfe8d0;white-space:nowrap}
.gm-x{background:#3a2c26;color:#f4efe2;border:2px solid #6b5f45;border-radius:6px;padding:4px 12px;font:inherit;font-size:13px;cursor:pointer;min-height:44px;min-width:60px}
.gm-tbar{height:7px;background:#2a2118;border:1px solid #6b5f45;border-radius:4px;overflow:hidden}
.gm-tbar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#6bd06b,#e8c34a);transform-origin:left}
.gm-stage{position:relative;border:3px solid #2a2118;border-radius:4px;background:#000;overflow:hidden;box-shadow:0 0 0 2px #6b5f45}
.gm-stage canvas{position:static;inset:auto;display:block;width:100%;height:auto;aspect-ratio:16/9;cursor:default;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none}
.gm-pane{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;text-align:center;background:rgba(22,16,12,.84)}
.gm-pane h2{margin:0;font-size:clamp(17px,3.6vw,26px);color:#ffd96a}
.gm-pane p{margin:0;font-size:clamp(12px,2.6vw,17px);line-height:1.35;max-width:34em;color:#f1e9d4;white-space:pre-line}
.gm-pane .big{font-size:clamp(22px,5vw,38px);font-weight:800;color:#8ff08f}
.gm-go{background:#d9a441;color:#2a1c0a;border:3px solid #fff2b0;border-radius:8px;padding:8px 22px;min-height:48px;min-width:48px;font:inherit;font-size:clamp(15px,3.2vw,20px);font-weight:800;cursor:pointer;margin-top:4px}
.gm-hint{font-size:12.5px;color:#cbbf9f;min-height:16px;text-align:center}
.gm-ctrl{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;min-height:56px}
.gm-ctrl button{flex:1 1 90px;max-width:230px;min-height:56px;background:#4a3a2a;color:#fff6dc;border:3px solid #9b8658;border-radius:10px;font:inherit;font-size:16px;font-weight:700;line-height:1.15;cursor:pointer;touch-action:none;white-space:pre-line;padding:4px 8px}
.gm-ctrl button small{display:block;font-weight:500;font-size:11px;opacity:.8}
.gm-ctrl button.on,.gm-ctrl button:active{background:#d9a441;color:#2a1c0a;border-color:#fff2b0}
.gm-ctrl button.red{background:#7a2f28;border-color:#e08070}.gm-ctrl button.red.on,.gm-ctrl button.red:active{background:#e0553f;color:#fff}
.gm-ctrl button.green{background:#2f5a3a;border-color:#80d090}.gm-ctrl button.green.on,.gm-ctrl button.green:active{background:#5cc070;color:#10260f}
.gm-ctrl button.sm{flex:0 0 64px;min-width:64px}
@media (max-width:520px){.gm-top{flex-wrap:wrap;row-gap:2px}.gm-title{flex:1 1 55%}.gm-score{order:5;flex:1 0 100%;font-size:12px}}
@media (max-height:480px){.gm-ctrl button{min-height:44px}.gm-ctrl{min-height:44px}.gm-card{width:min(96vw,940px,calc((100vh - 150px) * 1.7778))}}
`

function outfitColors() {
  const o = State.outfit || {}
  const g = (k) => (OUTFIT_OPTIONS[k][o[k] || 0] || OUTFIT_OPTIONS[k][0]).color
  return { hair: g('hair'), top: g('top'), pants: g('pants') }
}

export function start(id, opts = {}) {
  const def = GAMES[id]
  if (!def) return Promise.reject(new Error('Không có mini-game: ' + id))
  if (active) return active.promise
  if (!document.getElementById('gm-style')) { const s = document.createElement('style'); s.id = 'gm-style'; s.textContent = CSS; document.head.appendChild(s) }
  const timeScale = opts.timeScale > 0 ? +opts.timeScale : 1
  const dur = MINIGAME_SECONDS

  const root = document.createElement('div'); root.className = 'gm'; root.dataset.minigame = id
  root.innerHTML = `<div class="gm-card"><div class="gm-top"><b class="gm-title"></b><span class="gm-score"></span><span class="gm-time"></span><button class="gm-x" type="button">Thoát</button></div>
    <div class="gm-tbar"><i></i></div><div class="gm-stage"><canvas width="${W}" height="${H}"></canvas><div class="gm-pane"></div></div><div class="gm-hint"></div><div class="gm-ctrl"></div></div>`
  const $ = (q) => root.querySelector(q)
  const cv = $('canvas'), g = cv.getContext('2d'), pane = $('.gm-pane'), ctrl = $('.gm-ctrl'), hint = $('.gm-hint')
  g.imageSmoothingEnabled = false
  $('.gm-title').textContent = opts.title || def.title

  const inst = { id, stage: 'intro', t: 0, dur, timeScale, game: null, raf: 0, last: 0, done: false, resolve: null, root }
  const keys = new Set()
  const sfx = (name) => bus.emit('sfx', { name })
  const env = {
    W, H, opts, keys, sfx, ctrl, outfit: outfitColors(), dur, timeScale,
    setHint: (t) => { hint.textContent = t },
    expose: (st) => { window.__mgState = st },
    get stage() { return inst.stage },
    btn(label, o = {}) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label
      if (o.cls) b.classList.add(...o.cls.split(' '))
      if (o.sub) { const s = document.createElement('small'); s.textContent = o.sub; b.appendChild(s) }
      let down = false
      const press = (e) => { e.preventDefault(); e.stopPropagation(); if (down) return; down = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId) } catch (er) { /* bỏ qua */ } if (o.key) press_(o.key); if (o.onDown) o.onDown() }
      const rel = (e) => { if (!down) return; down = false; b.classList.remove('on'); if (e && e.stopPropagation) e.stopPropagation(); if (o.key) release_(o.key); if (o.onUp) o.onUp() }
      b.addEventListener('pointerdown', press); b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); b.addEventListener('lostpointercapture', rel)
      b.addEventListener('click', (e) => { e.preventDefault(); b.blur() })
      ctrl.appendChild(b); return b
    },
  }
  const press_ = (k) => { keys.add(k); if (inst.stage === 'play' && inst.game.key) inst.game.key(k, true) }
  const release_ = (k) => { keys.delete(k); if (inst.stage === 'play' && inst.game.key) inst.game.key(k, false) }

  inst.promise = new Promise((res) => { inst.resolve = res })
  inst.game = def.create(env)
  active = inst

  // ── lớp phủ: chặn sự kiện lan xuống canvas thế giới ──
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu', 'mousedown', 'mouseup'])
    root.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'touchmove' || ev === 'contextmenu' || ev === 'wheel') e.preventDefault() }, { passive: false })
  const toLogical = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H] }
  let ptrDown = false
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); ptrDown = true; try { cv.setPointerCapture(e.pointerId) } catch (er) { /* bỏ qua */ } if (inst.stage === 'play' && inst.game.pointer) inst.game.pointer('down', ...toLogical(e)) })
  cv.addEventListener('pointermove', (e) => { if (inst.stage === 'play' && inst.game.pointer) inst.game.pointer('move', ...toLogical(e), ptrDown) })
  const pup = (e) => { ptrDown = false; if (inst.stage === 'play' && inst.game.pointer) inst.game.pointer('up', ...toLogical(e)) }
  cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup)

  const onKey = (down) => (e) => {
    if (!active || active !== inst) return
    if (e.ctrlKey || e.metaKey || /^f\d+$/i.test(e.key)) return
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
    e.preventDefault(); e.stopImmediatePropagation()
    if (!down) { if (inst.stage === 'play') release_(k); else keys.delete(k); return }
    if (k === 'escape') { quit(); return }
    if (inst.stage === 'intro') { if (k === 'enter' || k === ' ') begin(); return }
    if (inst.stage === 'result') { if (k === 'enter' || k === ' ') close(); return }
    if (!e.repeat) press_(k)
  }
  const kd = onKey(true), ku = onKey(false)
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true)
  const onBlur = () => { for (const k of [...keys]) release_(k) }
  addEventListener('blur', onBlur)

  document.body.appendChild(root)
  window.__worldAPI?.lockPlayer?.(true)
  bus.emit('minigame:start', { id })

  function showIntro() {
    pane.style.display = ''
    pane.innerHTML = ''
    const h = document.createElement('h2'); h.textContent = opts.title || def.title
    const p = document.createElement('p'); p.textContent = def.how
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gm-go'; b.textContent = 'Bắt đầu (Enter)'
    b.addEventListener('click', () => begin())
    pane.append(h, p, b)
  }
  function begin() {
    if (inst.stage !== 'intro') return
    inst.stage = 'play'; inst.t = 0; pane.style.display = 'none'
    sfx('click'); if (inst.game.begin) inst.game.begin()
  }
  function showResult(score, pay, summary) {
    pane.style.display = ''; pane.innerHTML = ''
    const h = document.createElement('h2'); h.textContent = score >= 80 ? 'Quá đỉnh!' : score >= 50 ? 'Làm tốt lắm!' : score >= 25 ? 'Tạm ổn' : 'Hơi vất vả...'
    const sc = document.createElement('p'); sc.className = 'big'; sc.textContent = `${score} điểm`
    const sm = document.createElement('p'); sm.textContent = summary || ''
    const pm = document.createElement('p'); pm.textContent = opts.noPay ? '' : `Tiền công: +${fmtMoney(pay)}`; pm.style.cssText = 'font-weight:800;color:#ffd96a;font-size:clamp(16px,3.4vw,22px)'
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gm-go'; b.textContent = 'Xong (Enter)'
    b.addEventListener('click', () => close())
    pane.append(h, sc, sm, pm, b)
  }
  function finish(override, silent) {
    if (inst.done) return
    inst.done = true
    let res = { score: 0, summary: '' }
    try { res = inst.game.result() || res } catch (e) { console.error('[minigame]', e) }
    const score = Math.round(clamp(Number.isFinite(+override) ? +override : res.score, 0, 100))
    const pay = payFor(score, opts.mult ?? 1)
    inst.stage = 'result'
    bus.emit('minigame:end', { id, score, pay })
    inst.resolve({ id, score, pay, summary: res.summary || '' })
    if (silent) cleanup(); else showResult(score, pay, res.summary)
  }
  function quit() {
    if (inst.done) return close()
    inst.done = true; inst.stage = 'result'
    bus.emit('minigame:end', { id, score: 0, pay: 0, quit: true })
    inst.resolve({ id, score: 0, pay: 0, quit: true })
    cleanup()
  }
  function close() { cleanup() }
  function cleanup() {
    if (active !== inst) return
    cancelAnimationFrame(inst.raf)
    removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('blur', onBlur)
    root.remove(); active = null
    window.__worldAPI?.lockPlayer?.(false)
  }
  $('.gm-x').addEventListener('click', () => quit())
  inst.finish = finish

  const bar = $('.gm-tbar i'), tEl = $('.gm-time'), sEl = $('.gm-score')
  const loop = (now) => {
    if (active !== inst) return
    const dt = Math.min(0.05, (now - (inst.last || now)) / 1000); inst.last = now
    if (inst.stage === 'play' && !inst.done) {
      const sdt = dt * timeScale
      inst.t += sdt
      try { inst.game.update(sdt, inst.t) } catch (e) { console.error('[minigame]', e); (window.__stats ||= { errors: [] }).errors.push('minigame: ' + (e.stack || e)) }
      if (inst.t >= dur) finish()
    }
    try { inst.game.draw(g, inst.t, inst.stage) } catch (e) { console.error('[minigame draw]', e); (window.__stats ||= { errors: [] }).errors.push('minigame draw: ' + (e.stack || e)) }
    const left = Math.max(0, dur - inst.t)
    tEl.textContent = Math.ceil(left) + 's'; bar.style.transform = `scaleX(${left / dur})`
    sEl.textContent = inst.game.hud ? inst.game.hud() : ''
    inst.raf = requestAnimationFrame(loop)
  }
  showIntro()
  inst.raf = requestAnimationFrame(loop)
  return inst.promise
}

export function debugFinish(score = 100) { if (!active) return false; active.finish(score, true); return true }
export const current = () => active && { id: active.id, stage: active.stage, t: active.t }

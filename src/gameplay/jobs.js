// Bảng việc vặt gắn địa điểm thật: nhận việc -> GPS tới standAt -> marker -> E/chạm -> mini-game -> trả tiền.
import { bus } from '../core/bus.js'
import { State } from '../core/state.js'
import * as B from './balance.js'
import { earn, addStamina, addMood, say, sfx, fmt, nowAbs, payMultiplier, changed, W } from './economy.js'
import * as MG from './minigames/index.js'

let removeMarker = null, chip = null, chipOn = true, working = false
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const hourOf = (abs) => ((abs % 24) + 24) % 24
const hh = (abs) => { const h = hourOf(abs), m = Math.floor((h % 1) * 60); return `${String(Math.floor(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
const seq = () => (State.flags.jobSeq = (State.flags.jobSeq || 0) + 1)

function sitesFor(kinds) { const w = W(); return w ? kinds.flatMap((k) => w.getSites(k)) : [] }
const siteById = (id) => W()?.getSites('any').find((s) => s.id === id)

function payEstimate(kind) { const d = B.JOB_KINDS[kind]; const m = d.mult * (kind === 'ship' && State.flags.grab ? B.GRAB_SHIP_BONUS : 1); return { payMin: Math.round(B.PAY_MIN * m / 1000) * 1000, payMax: Math.round(B.PAY_MAX * m / 1000) * 1000, pay: Math.round((B.PAY_MIN + B.PAY_MAX) / 2 * m / 1000) * 1000 } }

function makeJob(kind, taken) {
  const d = B.JOB_KINDS[kind]
  const pool = sitesFor(d.siteKinds).filter((s) => !taken.has(s.id))
  if (!pool.length) return null
  const s = pick(pool)
  const exp = nowAbs() + B.BOARD_LIFE_H
  return { id: 'j' + seq(), kind, title: d.title, desc: d.desc, minigame: d.minigame, variant: d.variant || null, siteId: s.id, siteLabel: s.label, ...payEstimate(kind), staminaCost: d.stamina, expiresAbs: exp, deadlineHour: hourOf(exp), stage: 'board' }
}
export function refillBoard(silent) {
  const now = nowAbs()
  const before = State.board.length
  State.board = State.board.filter((j) => j.expiresAbs > now)
  const taken = new Set(State.board.map((j) => j.siteId)); if (State.job) taken.add(State.job.siteId)
  const kinds = Object.keys(B.JOB_KINDS)
  let guard = 0, added = 0
  while (State.board.length < B.BOARD_SIZE && guard++ < 30) {
    const counts = {}; State.board.forEach((j) => (counts[j.kind] = (counts[j.kind] || 0) + 1))
    const k = pick(kinds.filter((x) => (counts[x] || 0) < 2))
    const j = makeJob(k, taken); if (!j) continue
    taken.add(j.siteId); State.board.push(j); added++
  }
  if (added && !silent) sfx('ting')
  if (added || State.board.length !== before) changed('board')
}
export const board = () => State.board.map((j) => ({ ...j }))
export const current = () => (State.job ? { ...State.job } : null)

// ───── nhận / hủy / làm ─────
function clearUI() {
  if (removeMarker) { try { removeMarker() } catch (e) { /* bỏ qua */ } removeMarker = null }
  try { W()?.setGps(null) } catch (e) { /* bỏ qua */ }
  updateChip()
}
export function accept(id) {
  if (State.job) { say('Bạn đang làm một việc rồi — hủy hoặc làm xong đã.'); sfx('error'); return false }
  const j = State.board.find((x) => x.id === id)
  if (!j) return false
  if (State.stamina < B.MIN_STAMINA_TO_WORK || State.stamina < j.staminaCost) { say('Mệt quá rồi — đi ăn gì đó lấy sức đã (thể lực thấp).'); sfx('error'); return false }
  const site = siteById(j.siteId); const w = W()
  if (!site || !w) { say('Không tìm thấy địa điểm làm việc.'); return false }
  State.board = State.board.filter((x) => x !== j)
  const now = nowAbs()
  State.job = { ...j, stage: 'goto', arrived: false, acceptedAbs: now, deadlineAbs: now + B.JOB_WINDOW_H, deadlineHour: hourOf(now + B.JOB_WINDOW_H) }
  const sa = site.standAt || { gx: site.gx, gy: site.gy }
  if (removeMarker) removeMarker()
  removeMarker = w.addMarker({ id: 'job:' + j.id, gx: sa.gx, gy: sa.gy, r: 1.6, label: 'Làm việc: ' + j.title, onInteract: () => work() })
  w.setGps(site)
  say(`Nhận việc: ${j.title} — đi theo chấm vàng tới ${site.label}.`); sfx('click')
  bus.emit('job:accepted', { job: { ...State.job } }); changed('job'); changed('board'); updateChip()
  return true
}
export function cancel(reason = 'cancel') {
  if (!State.job || working) { if (working) say('Đang làm dở, thoát mini-game trước đã.'); return false }
  const job = State.job
  State.job = null; clearUI()
  bus.emit('job:cancelled', { job: { ...job }, reason }); changed('job')
  return true
}
export function onArrived(d) {
  const j = State.job
  if (!j || j.stage !== 'goto' || j.arrived) return
  const t = d && d.target; if (!t || (t.id !== j.siteId && !String(t.id).startsWith('job:'))) return
  j.arrived = true
  say('Tới nơi! Bấm E / chạm vào vòng sáng để bắt đầu làm: ' + j.title); sfx('ting')
  bus.emit('job:arrived', { job: { ...j } }); updateChip()
}
async function work() {
  const j = State.job
  if (!j || working || MG.isActive()) return
  if (j.stage === 'goto' && !j.arrived) { j.arrived = true; bus.emit('job:arrived', { job: { ...j } }) }
  working = true; j.stage = 'play'; changed('job'); updateChip()
  const mult = B.JOB_KINDS[j.kind].mult * payMultiplier() * (j.kind === 'ship' && State.flags.grab ? B.GRAB_SHIP_BONUS : 1)
  let res
  try { res = await MG.start(j.minigame, { variant: j.variant, mult, title: j.title }) } catch (e) { console.error(e); res = { quit: true } }
  working = false
  if (State.job !== j) return
  if (res.quit) { j.stage = 'goto'; say('Bạn bỏ dở. Việc vẫn còn đó, quay lại vòng sáng để làm tiếp.'); changed('job'); updateChip(); return }
  const pay = earn(res.pay, j.title)
  addStamina(-j.staminaCost); addMood(res.score >= 80 ? 1 : res.score < 25 ? -2 : 0)
  State.stats.jobsDone++
  j.stage = 'done'; j.paid = pay; j.score = res.score
  say(`Xong việc "${j.title}": +${fmt(pay)} (${res.score} điểm)`)
  bus.emit('job:done', { job: { ...j } })
  State.job = null; clearUI(); changed('job'); changed('stats')
}
// cho QA / UI: ép làm việc hiện tại ngay (như bấm E tại điểm)
export const startWork = () => { if (State.job) { work(); return true } return false }

// ───── mỗi nhịp đồng hồ ─────
export function tick() {
  const j = State.job
  if (j && j.stage !== 'play' && !working && nowAbs() > j.deadlineAbs) {
    State.job = null; clearUI()
    addMood(B.FAIL_MOOD); say(`Hết giờ, mất việc "${j.title}".`); sfx('error')
    bus.emit('job:cancelled', { job: { ...j }, reason: 'timeout' }); changed('job')
  }
  if (State.board.some((x) => x.expiresAbs <= nowAbs())) refillBoard(false)
  updateChip()
}
export function afterLoad() { clearUI(); if (W()) { State.board = []; refillBoard(true) } }

// ───── chip trạng thái việc (nhỏ, góc trái dưới) ─────
function ensureChip() {
  if (chip) return chip
  chip = document.createElement('div')
  chip.id = 'gp-job-chip'
  chip.style.cssText = 'position:fixed;left:8px;bottom:96px;z-index:19;max-width:min(300px,62vw);background:rgba(20,16,12,.86);color:#f4efe2;border:2px solid #9b8658;border-radius:8px;padding:6px 9px;font:600 12.5px/1.35 "Segoe UI",system-ui,sans-serif;display:none;pointer-events:auto;user-select:none'
  chip.addEventListener('pointerdown', (e) => e.stopPropagation())
  document.body.appendChild(chip)
  return chip
}
export function setChip(on) { chipOn = !!on; updateChip() }
function updateChip() {
  const c = ensureChip(), j = State.job
  if (!j || !chipOn || MG.isActive()) { c.style.display = 'none'; return }
  const left = Math.max(0, j.deadlineAbs - nowAbs())
  c.textContent = ''
  const t = document.createElement('div'); t.style.cssText = 'color:#ffd96a;font-weight:800'; t.textContent = j.title
  const s = document.createElement('div'); s.textContent = `${j.arrived ? 'Bấm E / chạm vòng sáng để làm' : 'Đi theo chấm vàng tới ' + (siteById(j.siteId)?.label || 'điểm làm việc')} · hạn ${hh(j.deadlineAbs)} (${left.toFixed(1)}h)`
  const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Hủy việc'; b.style.cssText = 'margin-top:4px;background:#3a2c26;color:#f4efe2;border:1px solid #6b5f45;border-radius:6px;padding:3px 12px;font:inherit;cursor:pointer;min-height:44px;min-width:44px'
  b.addEventListener('click', () => cancel())
  c.append(t, s, b); c.style.display = ''
}

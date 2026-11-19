// Nhà người chơi (phòng trọ trong ngõ, site 'home' của world). Bấm E / chạm ở cửa -> bảng:
//   "Nghỉ 1 tiếng (+25 thể lực)"  và  "Ngủ tới 6:00 sáng (đầy thể lực, +tâm trạng)".
// Luật (gameplay quyết, số trong economy-config REST):
//   • Đang có việc: KHÔNG được ngủ (báo rõ việc + hạn). Nghỉ 1 tiếng vẫn được nếu nghỉ xong còn >= 0,5 giờ game trước hạn.
//   • Nghỉ 1 tiếng: tối đa 2 lần / ngày game, cách nhau >= 3 giờ game (để nghỉ không thay hẳn được tiền ăn).
//   • Ngủ: luôn tới 6:00 SÁNG KẾ TIẾP. Từ 5:00 tới 5:59 thì chỉ còn chưa tới 1 tiếng -> không cho ngủ, gợi ý nghỉ 1 tiếng.
//     Ngủ ban ngày được (bỏ qua cả ngày, trả góp vẫn tính) — bảng ghi rõ sẽ ngủ bao nhiêu tiếng.
//   • Ngủ qua 0h: phát time:newday như đồng hồ thật -> Sổ Nợ nhắc hạn / tính trễ kỳ đúng ngày; bảng cảnh báo trước nếu có
//     khoản hạn HÔM NAY chưa trả (ngủ qua đêm sẽ thành trễ kỳ).
//   • Trong giờ ngủ / nghỉ không bị trừ thể lực, tâm trạng theo giờ. Xong thì lưu game.
// Thời gian: `__worldAPI.advanceTime(h)` (CONTRACT đợt 4); chưa có thì dự phòng setHour/setDay + tự phát time:newday.
// Vị trí: `getSites('home')[0]`; chưa có thì tạm lấy một ô ngõ đi tới được gần chỗ xuất phát, và cứ 2 giây dò lại.
import { bus } from '../core/bus.js'
import { State } from '../core/state.js'
import { REST, REST_LABELS, fmtDec } from './economy-config.js'
import { W, addStamina, addMood, say, sfx, changed, nowAbs, syncClock, clamp } from './economy.js'
import * as MG from './minigames/index.js'

let removeMarker = null, panel = null, site = null, fallback = false, poll = 0, busy = false, veil = null
const hooks = { afterTimeJump: null, refreshBoard: null, save: null }
export const setHooks = (h) => Object.assign(hooks, h)

const hh = (h) => { const t = ((Math.round(h * 60) % 1440) + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }

// ───────── tìm nhà ─────────
function findFallback() {
  const w = W(); if (!w) return null
  const p = w.getPlayer()
  for (let r = 2; r < 40; r++) {
    for (let a = 0; a < 16; a++) {
      const gx = Math.round(p.gx + Math.cos(a / 16 * Math.PI * 2) * r), gy = Math.round(p.gy + Math.sin(a / 16 * Math.PI * 2) * r)
      try { if (w.getZoneAt?.(gx, gy) === 'alley' && (w.isReachable ? w.isReachable(gx, gy) : true)) return { id: 'home', kind: 'home', label: 'Phòng trọ của bạn', gx: gx + 0.5, gy: gy + 0.5 } } catch (e) { /* bỏ qua */ }
    }
  }
  return { id: 'home', kind: 'home', label: 'Phòng trọ của bạn', gx: p.gx, gy: p.gy }
}
function realHome() { try { return (W()?.getSites?.('home') || [])[0] || null } catch (e) { return null } }
function place(s, isFallback) {
  const w = W(); if (!w || !s) return
  if (removeMarker) { try { removeMarker() } catch (e) { /* bỏ qua */ } }
  site = s; fallback = isFallback
  const sa = s.standAt || { gx: s.gx, gy: s.gy }
  removeMarker = w.addMarker({ id: 'home:door', gx: sa.gx, gy: sa.gy, r: 1.5, label: 'Về phòng trọ: nghỉ / ngủ', onInteract: () => openPanel() })
}
export function start() {
  const real = realHome()
  place(real || findFallback(), !real)
  clearInterval(poll)
  poll = setInterval(() => {
    const r = realHome()
    if (r && (fallback || !site || r.gx !== site.gx || r.gy !== site.gy)) place(r, false)
  }, 2000)
}
export const info = () => site && { ...site, fallback, ...status() }

// ───────── điều kiện ─────────
function napState() {
  const f = State.flags, now = nowAbs()
  if ((f.napDay || 0) !== State.day) { f.napDay = State.day; f.napCount = 0 }
  return { count: f.napCount || 0, since: now - (Number.isFinite(f.lastNapAbs) ? f.lastNapAbs : -99) }
}
function sleepHours() { const h = W()?.getHour?.() ?? State.hour; return h < REST.wakeHour ? REST.wakeHour - h : 24 - h + REST.wakeHour }
export function status() {
  const j = State.job, now = nowAbs(), ns = napState(), h = W()?.getHour?.() ?? State.hour
  let nap = '', sleep = ''
  if (MG.isActive() || busy) nap = sleep = 'Đang bận.'
  if (!nap) {
    if (State.stamina >= 100) nap = 'Thể lực đang đầy, chưa cần nghỉ.'
    else if (ns.count >= REST.napPerDay) nap = `Hôm nay đã nghỉ đủ ${REST.napPerDay} lần rồi.`
    else if (ns.since < REST.napCooldownH) nap = `Vừa nghỉ xong — ${fmtDec(Math.ceil((REST.napCooldownH - ns.since) * 10) / 10)} giờ nữa mới nghỉ tiếp được.`
    else if (j && j.deadlineAbs - now < REST.napHours + REST.napJobBufferH) nap = `Không kịp: việc "${j.title}" hạn ${hh(j.deadlineAbs)}, nghỉ 1 tiếng sẽ lố hạn.`
  }
  if (!sleep) {
    if (j) sleep = `Đang có việc "${j.title}" (hạn ${hh(j.deadlineAbs)}) — làm xong hoặc hủy việc rồi mới ngủ được.`
    else if (h >= REST.wakeHour - 1 && h < REST.wakeHour) sleep = 'Sắp sáng rồi (chưa tới 1 tiếng nữa là 6:00) — nghỉ 1 tiếng thôi.'
  }
  // trả góp hạn HÔM NAY chưa trả mà ngủ qua đêm -> sẽ thành trễ kỳ
  const crossesMidnight = h >= REST.wakeHour
  const dueToday = crossesMidnight ? State.debts.filter((d) => d.nextDay <= State.day) : []
  return { canNap: !nap, canSleep: !sleep, napReason: nap, sleepReason: sleep, sleepHours: +sleepHours().toFixed(2), dueWarn: dueToday.map((d) => d.name) }
}

// ───────── bảng chọn ─────────
function closePanel() { if (panel) { panel.remove(); panel = null } }
function openPanel() {
  closePanel()
  if (MG.isActive()) return
  const st = status()
  panel = document.createElement('div'); panel.id = 'gp-home-menu'
  panel.style.cssText = `position:fixed;left:50%;bottom:${innerWidth < 520 ? 150 : 84}px;transform:translateX(-50%);z-index:20;background:#16120e;box-shadow:0 6px 24px rgba(0,0,0,.6);` + 'color:#f4efe2;border:2px solid #7fa8d8;border-radius:10px;padding:10px 12px;font:600 14px/1.35 "Segoe UI",system-ui,sans-serif;display:flex;flex-direction:column;gap:6px;width:min(340px,86vw);box-sizing:border-box'
  panel.addEventListener('pointerdown', (e) => e.stopPropagation())
  const h = document.createElement('div'); h.style.cssText = 'color:#ffd96a;font-weight:800'; h.textContent = (site && site.label) || 'Phòng trọ của bạn'
  const sub = document.createElement('div'); sub.style.cssText = 'font-size:12.5px;color:#cbbf9f;font-weight:500'
  sub.textContent = `Bây giờ ${hh(W()?.getHour?.() ?? State.hour)} · ngày ${State.day} · thể lực ${Math.round(State.stamina)}`
  panel.append(h, sub)
  const mk = (kind, label, reason, extra) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.rest = kind
    b.style.cssText = 'background:#2c3a4e;color:#f4f8ff;border:2px solid #7fa8d8;border-radius:8px;padding:8px 10px;font:inherit;cursor:pointer;text-align:left;min-height:44px'
    b.textContent = label
    if (reason) { b.disabled = true; b.style.opacity = '.55'; b.style.cursor = 'not-allowed' }
    b.addEventListener('click', () => { if (!b.disabled) rest(kind) })
    panel.appendChild(b)
    const note = reason || extra
    if (note) { const n = document.createElement('div'); n.dataset.note = kind; n.style.cssText = `font-size:12px;font-weight:500;margin:-2px 2px 2px;color:${reason ? '#ffb4a0' : '#bcd6f2'}`; n.textContent = note; panel.appendChild(n) }
  }
  mk('nap', REST_LABELS.nap, st.napReason, '')
  const hrs = st.sleepHours, sleepNote = `Ngủ khoảng ${fmtDec(Math.round(hrs * 10) / 10)} tiếng${hrs > 14 ? ' (bỏ qua hết phần còn lại của hôm nay)' : ''}.` + (st.dueWarn.length ? ` Lưu ý: ${st.dueWarn.join(', ')} hạn hôm nay chưa trả — ngủ qua đêm sẽ thành trễ kỳ.` : '')
  mk('sleep', REST_LABELS.sleep, st.sleepReason, sleepNote)
  const x = document.createElement('button'); x.type = 'button'; x.textContent = 'Thôi'
  x.style.cssText = 'background:transparent;color:#cbbf9f;border:1px solid #6b5f45;border-radius:8px;padding:5px;font:inherit;cursor:pointer;min-height:44px;min-width:44px'
  x.addEventListener('click', closePanel); panel.appendChild(x)
  document.body.appendChild(panel)
}
bus.on('phone:open', () => closePanel())
// rời xa cửa thì đóng bảng
setInterval(() => { if (!panel || !site) return; const p = W()?.getPlayer?.(); if (p && Math.hypot(p.gx - site.gx, p.gy - site.gy) > 6) closePanel() }, 700)

// ───────── thời gian ─────────
function advance(hours) {
  const w = W(); if (!w) return
  if (typeof w.advanceTime === 'function') { w.advanceTime(hours); return }
  // dự phòng: tự cộng giờ, qua 0h thì tăng ngày + phát time:newday (đúng như đồng hồ tự chạy)
  let h = w.getHour() + hours, d = w.getDay()
  while (h >= 24) { h -= 24; d++; w.setDay?.(d); bus.emit('time:newday', { day: d }) }
  w.setHour?.(h)
}
function ensureVeil() {
  if (veil) return veil
  veil = document.createElement('div'); veil.id = 'gp-sleep'
  veil.style.cssText = 'position:fixed;inset:0;z-index:2147482000;background:#05070d;opacity:0;transition:opacity 1s ease;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:#dfe8ff;font:700 clamp(22px,6vw,40px)/1.3 "Segoe UI",system-ui,sans-serif;text-align:center;pointer-events:auto;user-select:none'
  veil.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault() })
  document.body.appendChild(veil)
  return veil
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function setVeil(text, sub) {
  const v = ensureVeil(); v.textContent = ''
  const a = document.createElement('div'); a.textContent = text
  v.appendChild(a)
  if (sub) { const b = document.createElement('div'); b.style.cssText = 'font-size:clamp(13px,3.6vw,18px);font-weight:500;color:#aab8d8;max-width:90vw'; b.textContent = sub; v.appendChild(b) }
}

// kind: 'nap' | 'sleep'  ->  Promise<{ok, reason?, hours?, day?, hour?}>
export async function rest(kind, opts = {}) {
  if (kind !== 'nap' && kind !== 'sleep') return { ok: false, reason: 'Không rõ kiểu nghỉ.' }
  const st = status(), reason = kind === 'nap' ? st.napReason : st.sleepReason
  if (reason) { say(reason); sfx('error'); return { ok: false, reason } }
  const w = W(); if (!w) return { ok: false, reason: 'Chưa có thế giới.' }
  busy = true; closePanel()
  try { w.stopAutoWalk?.() } catch (e) { /* bỏ qua */ }
  try { window.__ui?.closePhone?.() } catch (e) { /* bỏ qua */ }
  w.lockPlayer?.(true)
  const fade = opts.fast ? 30 : kind === 'nap' ? Math.round(REST.fadeMs * 0.6) : REST.fadeMs
  const hold = opts.fast ? 30 : kind === 'nap' ? Math.round(REST.holdMs * 0.6) : REST.holdMs
  const v = ensureVeil(); v.style.transition = `opacity ${fade}ms ease`
  setVeil(kind === 'nap' ? 'Chợp mắt một lát…' : 'Ngủ ngon…', kind === 'nap' ? '' : 'Zzz…')
  v.style.display = 'flex'; await wait(20); v.style.opacity = '1'
  await wait(fade + 40)
  const hours = kind === 'nap' ? REST.napHours : sleepHours()
  advance(hours)
  syncClock()
  if (hooks.afterTimeJump) hooks.afterTimeJump()          // đồng bộ giờ cho vòng đồng hồ: không trừ thể lực các giờ đã ngủ
  if (kind === 'nap') {
    const f = State.flags; napState(); f.napCount = (f.napCount || 0) + 1; f.lastNapAbs = nowAbs()
    addStamina(REST.napStamina)
  } else {
    State.stamina = 100; changed('stamina'); addMood(REST.sleepMood)
    State.stats.sleeps = (State.stats.sleeps || 0) + 1
  }
  if (hooks.refreshBoard) hooks.refreshBoard()
  if (hooks.save) hooks.save()
  bus.emit('rest:done', { kind, hours, day: State.day, hour: State.hour })
  const morn = kind === 'sleep' ? `Chào buổi sáng! ${hh(State.hour)} · Ngày ${State.day}` : `Khỏe hơn rồi! +${REST.napStamina} thể lực`
  setVeil(morn, kind === 'sleep' ? `Thể lực đầy · tâm trạng +${REST.sleepMood}${State.debts.some((d) => d.nextDay <= State.day) ? ' · có khoản trả góp tới hạn — mở app Sổ Nợ Trả Góp' : ''}` : '')
  await wait(hold)
  v.style.opacity = '0'
  await wait(fade + 40)
  v.style.display = 'none'
  w.lockPlayer?.(false)
  busy = false
  say(kind === 'sleep' ? `Dậy rồi: ${hh(State.hour)} ngày ${State.day}, thể lực đầy.` : `Nghỉ 1 tiếng xong: +${REST.napStamina} thể lực.`)
  sfx('ting')
  return { ok: true, hours: +hours.toFixed(2), day: State.day, hour: +State.hour.toFixed(2), stamina: Math.round(State.stamina), mood: Math.round(clamp(State.mood, 0, 100)) }
}

// Lưu / nạp: localStorage (bọc try/catch), xuất/nhập file JSON, reset an toàn (có bản sao lưu).
import { bus } from '../core/bus.js'
import { State, DEFAULT_STATE } from '../core/state.js'
import * as B from './balance.js'
import { replaceState, syncClock, changed, W } from './economy.js'

let dirty = false, lastSave = 0
const hooks = { afterLoad: null }
export const setHooks = (h) => Object.assign(hooks, h)
export const markDirty = () => { dirty = true }

const ls = {
  get(k) { try { return localStorage.getItem(k) } catch (e) { return null } },
  set(k, v) { try { localStorage.setItem(k, v); return true } catch (e) { return false } },
  del(k) { try { localStorage.removeItem(k) } catch (e) { /* bỏ qua */ } },
}

export function serialize() { syncClock(); return JSON.stringify({ ...State, savedAt: Date.now() }) }
export function save() { const ok = ls.set(B.SAVE_KEY, serialize()); dirty = false; lastSave = performance.now(); return ok }
export function hasSave() { return !!ls.get(B.SAVE_KEY) }

function valid(o) {
  return o && typeof o === 'object' && Number.isFinite(+o.money) && Number.isFinite(+o.stamina) && Number.isFinite(+o.mood) &&
    (!o.outfit || typeof o.outfit === 'object') && (!o.debts || Array.isArray(o.debts))
}
// nạp đối tượng đã parse vào State + báo thế giới
export function applyLoaded(o) {
  if (!valid(o)) return false
  replaceState(o)
  State.job = null                                  // việc đang làm dở không giữ qua phiên mới (hủy im lặng, không phạt)
  applyToWorld()
  if (hooks.afterLoad) hooks.afterLoad()
  bus.emit('outfit:changed', { outfit: State.outfit, reason: 'load' }); changed('all')
  return true
}
export function applyToWorld() {
  const w = W(); if (!w) return
  if (w.setDay) w.setDay(State.day)
  if (w.setHour && Number.isFinite(+State.hour)) w.setHour(+State.hour)
}
export function load() {
  const s = ls.get(B.SAVE_KEY); if (!s) return false
  try { return applyLoaded(JSON.parse(s)) } catch (e) { console.warn('[save] hỏng', e); return false }
}
export const exportSave = () => serialize()
export function importSave(str) {
  try { const o = typeof str === 'string' ? JSON.parse(str) : str; if (!applyLoaded(o)) return false; save(); return true } catch (e) { return false }
}
export function reset(opts = {}) {
  if (opts.backup !== false) { const s = ls.get(B.SAVE_KEY); if (s) ls.set(B.SAVE_KEY + '.bak', s) }
  ls.del(B.SAVE_KEY)
  replaceState(DEFAULT_STATE())
  State.day = 1; State.hour = 8
  applyToWorld()
  if (hooks.afterLoad) hooks.afterLoad()
  bus.emit('outfit:changed', { outfit: State.outfit, reason: 'reset' }); changed('all')
  save()
  return true
}
export function restoreBackup() { const s = ls.get(B.SAVE_KEY + '.bak'); if (!s) return false; try { return importSave(s) } catch (e) { return false } }

export function startAutosave() {
  setInterval(() => { if (document.hidden && !dirty) return; save() }, B.AUTOSAVE_SEC * 1000)
  bus.on('state:changed', () => { dirty = true; if (performance.now() - lastSave > 1500) setTimeout(() => dirty && save(), 1600) })
  addEventListener('pagehide', () => { try { save() } catch (e) { /* bỏ qua */ } })
}

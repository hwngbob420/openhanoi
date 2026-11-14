// Vòng Tiền – Thể lực – Tâm trạng + ăn uống + mua đồ. Mọi thay đổi State đi qua đây để phát đúng bus.
import { bus } from '../core/bus.js'
import { State, DEFAULT_STATE } from '../core/state.js'
import { Game } from '../world/player.js'
import { OUTFIT_OPTIONS } from '../assets/characters/index.js'
import * as B from './balance.js'

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const fmt = (n) => Math.round(n).toLocaleString('vi-VN') + 'đ'
export const sfx = (name) => bus.emit('sfx', { name })
export const changed = (key) => bus.emit('state:changed', { key })
export function say(msg) { bus.emit('toast', { msg }); if (!window.__ui) { try { Game.toast(msg) } catch (e) { /* chưa có world */ } } }

// giờ tuyệt đối (giờ game từ đầu game) – dùng cho hạn việc / hạn nợ
export const nowAbs = () => (State.day - 1) * 24 + State.hour
export const W = () => window.__worldAPI

export function syncClock() {
  const w = W(); if (!w) return
  const d = w.getDay(), h = w.getHour()
  if (d !== State.day) State.day = d
  State.hour = h
}

export function earn(n, reason = 'việc') {
  n = Math.round(+n || 0); if (n <= 0) return 0
  State.money += n; State.stats.earned += n
  State.mood = clamp(State.mood + Math.min(2, n / 45000), 0, 100)
  bus.emit('money:earn', { amount: n, reason }); changed('money'); changed('mood')
  return n
}
export function spend(n, reason = 'chi tiêu') {
  n = Math.round(+n || 0)
  if (n <= 0) return true
  if (State.money < n) { sfx('error'); say(`Không đủ tiền (cần ${fmt(n)})`); return false }
  State.money -= n
  bus.emit('money:spend', { amount: n, reason }); changed('money')
  return true
}
export function addStamina(d) { State.stamina = clamp(State.stamina + d, 0, 100); changed('stamina') }
export function addMood(d) { State.mood = clamp(State.mood + d, 0, 100); changed('mood') }

export function payMultiplier() {
  const m = B.MOOD_PAY
  return State.mood >= m.high ? m.highMul : State.mood < m.low ? m.lowMul : 1
}

// ───── mỗi giờ game ─────
export function hourlyTick() {
  const H = B.HOURLY, h = Math.floor(State.hour), night = h >= 22 || h < 5
  addStamina(night ? H.staminaNight : H.stamina)
  let dm = H.mood
  if (W()?.isRaining?.()) dm += H.moodRain
  if (State.stamina < H.TIRED) dm += H.moodTired
  if (State.money < H.BROKE) dm += H.moodBroke
  addMood(dm)
}

// ───── ăn uống ─────
export function eat(dishId, opts = {}) {
  const d = B.DISHES[dishId]
  if (!d) return false
  if (!spend(d.price, 'ăn ' + d.name.toLowerCase())) return false
  addStamina(d.stamina)
  addMood(d.mood + (opts.atStall ? B.EAT_AT_STALL_MOOD : 0))
  sfx(dishId === 'trachanh' ? 'pop' : 'sizzle')
  say(`Ăn ${d.name.toLowerCase()}: +${d.stamina} thể lực (-${fmt(d.price)})`)
  bus.emit('eat', { dish: dishId, atStall: !!opts.atStall })
  return true
}

// ───── mua đồ / nhuộm tóc ─────
export function equip(kind, index) {
  const list = OUTFIT_OPTIONS[kind]
  if (!list || !Number.isInteger(index) || index < 0 || index >= list.length) return false
  if (!State.owned[kind].includes(index)) { say('Chưa mua món này'); return false }
  if (State.outfit[kind] === index) return true
  State.outfit[kind] = index
  bus.emit('outfit:changed', { outfit: State.outfit }); changed('outfit')
  return true
}
export function buy(kind, index) {
  const list = OUTFIT_OPTIONS[kind]
  if (!list || !Number.isInteger(index) || index < 0 || index >= list.length) return false
  const it = list[index]
  if (!State.owned[kind].includes(index)) {
    if (!spend(it.price, 'mua ' + it.name.toLowerCase())) return false
    State.owned[kind].push(index); State.owned[kind].sort((a, b) => a - b)
    addMood(5); changed('owned'); sfx('ting'); say(`Đã mua: ${it.name}`)
  }
  equip(kind, index)
  return true
}

// ───── thay State tại chỗ (State là const) ─────
export function replaceState(src) {
  const base = DEFAULT_STATE()
  for (const k of Object.keys(State)) delete State[k]
  Object.assign(State, base, src || {})
  State.outfit = { ...base.outfit, ...(src && src.outfit) }
  State.owned = { hair: [0], top: [0], pants: [0], ...(src && src.owned) }
  State.stats = { ...base.stats, ...(src && src.stats) }
  for (const k of ['board', 'debts']) if (!Array.isArray(State[k])) State[k] = []
  if (!State.flags || typeof State.flags !== 'object') State.flags = {}
  State.money = Math.max(0, Math.round(+State.money || 0))
  State.stamina = clamp(+State.stamina || 0, 0, 100); State.mood = clamp(+State.mood || 0, 0, 100)
}

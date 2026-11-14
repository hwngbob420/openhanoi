// Trả góp: xe máy cũ (mặc định) + phòng trọ ngõ -> nhà ống 2 tầng -> nhà mặt phố 4 tầng -> căn hộ tháp + xe Grab.
// Mỗi khoản: { id, kind, name, total, per, paid, nextDay, period, late } — kỳ theo NGÀY game; trễ kỳ thì mất tâm trạng.
import { bus } from '../core/bus.js'
import { State } from '../core/state.js'
import * as B from './balance.js'
import { spend, addMood, say, sfx, fmt, changed } from './economy.js'

const view = (d) => ({
  ...d,
  remaining: Math.max(0, d.total - d.paid),
  amount: Math.min(d.per, Math.max(0, d.total - d.paid)),   // số tiền kỳ này
  daysLeft: d.nextDay - State.day,                          // <0: đã trễ
  overdue: State.day > d.nextDay,
  canPayNow: State.day >= d.nextDay - 1,                    // kỳ mở trước hạn 1 ngày
})
const assets = () => (State.flags.assets ||= [])

export function ensureDefault() {
  if (!State.debts.length && !assets().includes(B.DEFAULT_DEBT.id) && !State.flags.defaultDebtGiven) {
    const d = B.DEFAULT_DEBT
    State.debts.push({ id: d.id, kind: d.kind, name: d.name, total: d.total, per: d.per, paid: 0, nextDay: d.firstDue, period: d.period, late: 0 })
    State.flags.defaultDebtGiven = true
    changed('debts')
  }
}
export const list = () => State.debts.map(view)

export function pay(id) {
  const d = State.debts.find((x) => x.id === id)
  if (!d) return false
  if (State.day < d.nextDay - 1) { sfx('error'); say(`Chưa tới kỳ: còn ${d.nextDay - State.day} ngày nữa (hạn ngày ${d.nextDay}).`); return false }
  const amount = Math.min(d.per, d.total - d.paid)
  if (!spend(amount, 'trả góp ' + d.name.toLowerCase())) return false
  d.paid += amount; d.late = 0
  d.nextDay += d.period
  if (d.paid >= d.total) {
    State.debts = State.debts.filter((x) => x !== d)
    assets().push(d.id)
    if (d.kind === 'house') State.flags.home = { id: d.id, name: d.name, tier: (B.DEBT_CATALOG.find((c) => c.id === d.id) || {}).tier || 0 }
    say(`Trả xong "${d.name}"!`); sfx('win')
  } else {
    addMood(2); sfx('ting'); say(`Đã trả kỳ ${fmt(amount)}: ${d.name} (còn ${fmt(d.total - d.paid)})`)
  }
  bus.emit('debt:paid', { id, amount }); changed('debts')
  return true
}

export function catalog() {
  const have = new Set([...State.debts.map((d) => d.id), ...assets()])
  const tierOf = (t) => B.DEBT_CATALOG.some((c) => c.kind === 'house' && c.tier === t && have.has(c.id))
  return B.DEBT_CATALOG.map((c) => {
    let reason = ''
    if (have.has(c.id)) reason = 'Đã có'
    else if (c.needTier && !tierOf(c.needTier)) reason = 'Cần có khoản trước đó'
    return { ...c, available: !reason, reason }
  })
}
export function take(id) {
  const c = catalog().find((x) => x.id === id)
  if (!c) return false
  if (!c.available) { sfx('error'); say(c.reason); return false }
  if (!spend(c.deposit, 'đặt cọc ' + c.name.toLowerCase())) return false
  State.debts.push({ id: c.id, kind: c.kind, name: c.name, total: c.total, per: c.per, paid: c.deposit, nextDay: State.day + c.period, period: c.period, late: 0 })
  if (c.id === 'grab') State.flags.grab = true
  sfx('ting'); say(`Ký trả góp: ${c.name}. Kỳ đầu ngày ${State.day + c.period}.`)
  changed('debts')
  return true
}

// qua ngày: nhắc hạn, phạt trễ
export function onNewDay(day) {
  for (const d of State.debts) {
    if (day === d.nextDay) say(`Hôm nay đến hạn: ${d.name} (${fmt(Math.min(d.per, d.total - d.paid))}). Mở app Sổ Nợ.`)
    else if (day > d.nextDay) {
      d.late = (d.late || 0) + 1
      addMood(d.late === 1 ? B.LATE_MOOD : B.LATE_MOOD_DAILY)
      say(`Trễ kỳ "${d.name}" ${d.late} ngày — tâm trạng tụt.`); sfx('error')
      bus.emit('debt:late', { id: d.id, late: d.late })
    }
  }
  changed('debts')
}

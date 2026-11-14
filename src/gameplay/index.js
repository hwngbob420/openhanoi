// Khối gameplay: vòng Tiền – Thể lực – Tâm trạng, việc vặt, mini-game, ăn uống, mua đồ, trả góp, lưu game.
// API: window.__gameplay (đúng CONTRACT.md). ─── Phần THÊM ngoài hợp đồng (đã ghi vào docs/REQUESTS.md) ───
//   state.flags {assets[], home{id,name,tier}, grab, jobSeq, defaultDebtGiven}   — khóa phụ trong State (lưu cùng save)
//   jobs.current() / jobs.startWork() / jobs.refresh() ; jobs.board() trả mỗi việc: {id,kind,title,desc,siteId,siteLabel,pay,payMin,payMax,staminaCost,expiresAbs,deadlineHour}
//   debts.catalog() / debts.take(id) ; debts.list() trả thêm {remaining,amount,daysLeft,overdue,canPayNow,period,late}
//   minigames.start(id,{timeScale,variant,mult,noPay}) KHÔNG tự cộng tiền (việc vặt mới cộng); minigames.list()/isActive()/current()
//   minigames id: 'pho' (variant 'banhmi' cho xe bánh mì), 'tc', 'rail', 'ship', 'cyclo'
//   dishes, menu (OUTFIT_OPTIONS + giá + owned), equip/buy, save: restoreBackup(), setChip(bool)
//   bus thêm: 'eat' {dish,atStall}, 'debt:paid' {id,amount}, 'debt:late' {id,late}
//   debug: addMoney(n) / setStamina(n) / setMood(n) / skipDays(n) (cho QA)
import { bus } from '../core/bus.js'
import { State } from '../core/state.js'
import { OUTFIT_OPTIONS } from '../assets/characters/index.js'
import * as B from './balance.js'
import * as E from './economy.js'
import * as Save from './save.js'
import * as Jobs from './jobs.js'
import * as Debts from './debts.js'
import * as Stalls from './stalls.js'
import * as MG from './minigames/index.js'

let ready = false, lastHour = -1, clockTimer = 0

function afterLoad() { Stalls.clear(); Jobs.afterLoad(); Debts.ensureDefault(); lastHour = Math.floor(State.hour) }

function onReady() {
  ready = true
  const loaded = Save.hasSave()
  Save.applyToWorld()                                       // nạp save -> world.setDay / setHour
  E.syncClock(); lastHour = Math.floor(State.hour)
  Debts.ensureDefault(); Jobs.afterLoad()
  bus.emit('outfit:changed', { outfit: State.outfit, reason: loaded ? 'load' : 'start' })
  E.changed('all')
  Stalls.start()
  clearInterval(clockTimer)
  clockTimer = setInterval(clock, 250)
}
function clock() {
  E.syncClock()
  const h = Math.floor(State.hour)
  if (h !== lastHour) { lastHour = h; E.hourlyTick(); Jobs.refillBoard(false) }
  Jobs.tick()
}

export function init() {
  State.flags ||= {}
  Save.setHooks({ afterLoad })
  Save.load()
  Debts.ensureDefault()
  bus.on('world:ready', onReady)
  bus.on('gps:arrived', (d) => Jobs.onArrived(d))
  bus.on('time:newday', ({ day }) => { State.day = day; Debts.onNewDay(day); E.changed('day'); Save.save() })
  Save.startAutosave()

  const api = {
    state: State,
    earn: E.earn,
    spend: E.spend,
    buy: E.buy,
    equip: E.equip,
    eat: (dishId) => E.eat(dishId),
    jobs: { board: Jobs.board, accept: Jobs.accept, cancel: () => Jobs.cancel(), current: Jobs.current, startWork: Jobs.startWork, refresh: () => Jobs.refillBoard(false) },
    debts: { list: Debts.list, pay: Debts.pay, catalog: Debts.catalog, take: Debts.take },
    save: () => Save.save(),
    exportSave: Save.exportSave,
    importSave: Save.importSave,
    reset: (opts) => Save.reset(opts),
    restoreBackup: Save.restoreBackup,
    minigames: { start: MG.start, debugFinish: MG.debugFinish, list: MG.list, isActive: MG.isActive, current: MG.current },
    dishes: B.DISHES,
    menu: () => Object.fromEntries(Object.entries(OUTFIT_OPTIONS).map(([k, list]) => [k, list.map((o, i) => ({ ...o, index: i, owned: State.owned[k].includes(i), equipped: State.outfit[k] === i }))])),
    balance: B,
    setChip: Jobs.setChip,
    debug: {
      addMoney: (n) => { State.money = Math.max(0, State.money + n); E.changed('money') },
      setStamina: (n) => { State.stamina = E.clamp(n, 0, 100); E.changed('stamina') },
      setMood: (n) => { State.mood = E.clamp(n, 0, 100); E.changed('mood') },
      skipDays: (n = 1) => { const w = E.W(); for (let i = 0; i < n; i++) { const d = w.getDay() + 1; w.setDay(d); bus.emit('time:newday', { day: d }) } },
    },
  }
  window.__gameplay = api
}

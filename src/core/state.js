// Trạng thái chơi duy nhất (cái được lưu game). Hình dạng do Studio Lead chốt; gameplay-economy-designer là người ghi/ lưu.
// Ai thay đổi State phải gọi bus.emit('state:changed', { key }) (dùng Gameplay.api.* thay vì tự sửa).
export const DEFAULT_STATE = () => ({
  v: 1,
  money: 150000,                 // VND
  stamina: 100,                  // 0..100, về 0 thì không nhận việc mới được
  mood: 70,                      // 0..100
  day: 1, hour: 8,               // đồng hồ game do world cung cấp, gameplay chỉ chép lại để lưu
  outfit: { hair: 0, top: 0, pants: 0 },   // chỉ số vào Characters.OUTFIT_OPTIONS
  owned: { hair: [0], top: [0], pants: [0] },
  job: null,                     // { id, kind, title, siteId, pay, deadlineHour, stage:'goto'|'play'|'done' }
  board: [],                     // các việc đang chờ nhận trong app Việc Vặt 24h
  debts: [],                     // [{ id, name, total, per, paid, nextDay }]
  stats: { jobsDone: 0, earned: 0 },
})
export const State = DEFAULT_STATE()
window.__state = State

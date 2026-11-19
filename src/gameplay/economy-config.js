// NGUỒN SỰ THẬT DUY NHẤT cho tiền món ăn, hồi sức, phạt, ngưỡng thể lực. Mọi nơi khác (marker, bảng chọn món,
// trừ ví, tin nhắn, mini-game) CHỈ đọc từ đây. balance.js import lại. Lộ ra `__gameplay.config`.
// Đợt 4: ngày game = 1000 giây thật (sky.speed 0.024 giờ/giây). Bảng tính cân bằng: tools/economy-table (báo cáo gameplay).

// Định dạng tiền VND: 50000 -> "50.000đ" (tự viết, không phụ thuộc ICU của trình duyệt nên luôn giống nhau).
export function fmtVND(n) {
  const v = Math.round(+n || 0), s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (v < 0 ? '-' : '') + s + 'đ'
}

// kind = loại hàng bán món đó (khớp __worldAPI.getSites kind)
// Đợt 4: tâm trạng từ ăn uống giảm (trước +6/+3/+4 làm ai cũng lên 100 tâm trạng và luôn được thưởng lương).
export const DISHES = {
  pho:      { id: 'pho',      name: 'Bát phở bò',     price: 50000, stamina: 40, mood: 3, kind: 'pho',    verb: 'Ăn phở',         act: 'Ăn' },
  banhmi:   { id: 'banhmi',   name: 'Bánh mì pate',  price: 25000, stamina: 22, mood: 2, kind: 'banhmi', verb: 'Mua bánh mì',    act: 'Ăn' },
  trachanh: { id: 'trachanh', name: 'Cốc trà chanh', price: 15000, stamina: 8,  mood: 3, kind: 'tc',     verb: 'Uống trà chanh', act: 'Uống' },
}
export const EAT_AT_STALL_MOOD = 1       // ăn ngay tại hàng vui hơn
export const EAT_RANGE_TILES = 9         // hiện marker 'ăn' khi người chơi còn trong tầm này

// loại hàng -> các món bán ở đó
export const MENU_BY_KIND = { pho: ['pho'], banhmi: ['banhmi'], tc: ['trachanh'] }
export const dishesOfKind = (kind) => (MENU_BY_KIND[kind] || []).map((id) => DISHES[id])

// ───── chữ hiển thị (một nơi duy nhất sinh chuỗi từ giá thật) ─────
export const dishLine = (d) => `${d.name} · ${fmtVND(d.price)} · +${d.stamina} thể lực`          // nút trong bảng chọn món
export const stallMarkerLabel = (kind) => `${(dishesOfKind(kind)[0] || {}).verb || 'Ăn'} (${dishesOfKind(kind).map((d) => fmtVND(d.price)).join(', ')})`   // gợi ý "E / chạm — ..."
// act = động từ ăn/uống của món (verb ở trên dành cho nút nhắc E/chạm: "Ăn phở", "Mua bánh mì", "Uống trà chanh")
export const eatToast = (d) => `${d.act || 'Ăn'} ${d.name.toLowerCase()}: +${d.stamina} thể lực (-${fmtVND(d.price)})`
// số thập phân kiểu Việt: 1.5 -> "1,5", 2.0 -> "2"
export const fmtDec = (n, digits = 1) => { const v = (+n || 0).toFixed(digits); return (/\.0+$/.test(v) ? v.replace(/\.0+$/, '') : v).replace('.', ',') }

// ───── thể lực ─────
// Đợt 4: mỗi việc tốn ~19 thể lực (trước 8–15). Không ăn gì: dậy 100, sau 3 việc + hao theo giờ còn ~18 < 20 -> phải ăn mới làm việc thứ 4.
export const MIN_STAMINA_TO_WORK = 20                                   // sàn chung cho mọi việc
export const LOW_STAMINA_MSG = 'Thể lực quá thấp — hãy ăn phở hoặc uống trà chanh để hồi sức!'
export const STAMINA_COST = { pho: 18, banhmi: 16, tc: 22, rail: 14, ship: 22, xichlo: 24 }   // tốn khi xong việc
export const staminaNeeded = (jobKind) => Math.max(MIN_STAMINA_TO_WORK, STAMINA_COST[jobKind] || 0)   // ngưỡng để được nhận việc

// ───── phạt ─────
export const FINES = { cyclo_crash: 30000 }                              // đâm người đi bộ khi đạp xích lô
export const CYCLO_FINE = FINES.cyclo_crash

// ───── nhà người chơi (site 'home') ─────
export const REST = {
  napHours: 1, napStamina: 25,          // "Nghỉ 1 tiếng (+25 thể lực)"
  napCooldownH: 3,                      // phải thức ít nhất 3 giờ game giữa hai lần nghỉ (chống nghỉ liên tục thay ăn)
  napPerDay: 2,                         // tối đa 2 lần nghỉ / ngày game
  napJobBufferH: 0.5,                   // đang có việc: chỉ nghỉ nếu nghỉ xong còn >= 0,5 giờ game trước hạn
  wakeHour: 6, sleepMood: 6,            // "Ngủ tới 6:00 sáng (đầy thể lực, +tâm trạng)"
  fadeMs: 1100, holdMs: 1300,           // màn tối dần / giữ chữ "Ngủ ngon…"
}
export const REST_LABELS = { nap: `Nghỉ 1 tiếng (+${REST.napStamina} thể lực)`, sleep: 'Ngủ tới 6:00 sáng (đầy thể lực, +tâm trạng)' }

// Mọi con số cân bằng của gameplay nằm ở đây (VND, thể lực 0-100, tâm trạng 0-100, giờ game).
// Đợt 4: world.sky.speed = 0.024 giờ game / giây thật -> 1 giờ game ≈ 41,7 giây, 1 ngày game = 1000 giây ≈ 16,7 phút.
// Mục tiêu (CONTRACT ĐỢT 4): người chơi trung bình (4 việc × ~70 điểm, ăn 2 phở + 1 trà chanh) để dành ~80–120k/ngày
// sau khi trừ trả góp chia theo ngày; người giỏi (90+ điểm) ~200k/ngày; bấm loạn <= 40 điểm (≈ 32k, chỉ đủ bù tiền ăn).
export const SAVE_KEY = 'hanoi-pixel-save-v1'
export const AUTOSAVE_SEC = 10
export const SKY_SPEED = 0.024           // chỉ để tính bảng / ghi chú (world mới là chủ đồng hồ)

export const START = { money: 150000, stamina: 100, mood: 70 }

// ───── vòng theo giờ game (chỉ khi thức; ngủ / nghỉ thì không trừ) ─────
export const HOURLY = {
  stamina: -2.5,          // mỗi giờ game ban ngày (6h–22h): 16 giờ thức ≈ -40
  staminaNight: -3.5,     // 22h–6h thức khuya mệt hơn
  mood: -1.2,             // 16 giờ thức ≈ -19 tâm trạng: phải ăn ngon, làm tốt, ngủ đủ mới giữ được
  moodRain: -0.6,         // đang mưa
  moodTired: -1.0,        // thể lực < TIRED
  moodBroke: -0.5,        // tiền < BROKE
  TIRED: 20, BROKE: 20000,
}
export const EARN_MOOD = { per: 60000, max: 1.5 }   // nhận tiền: +min(1,5; tiền/60k) tâm trạng
export const SCORE_MOOD = { good: 80, goodMood: 1, bad: 25, badMood: -2 }

// ───── món ăn / thể lực / phạt / nghỉ: NGUỒN DUY NHẤT là economy-config.js ─────
export { DISHES, EAT_AT_STALL_MOOD, EAT_RANGE_TILES, MIN_STAMINA_TO_WORK, FINES, CYCLO_FINE, LOW_STAMINA_MSG, REST } from './economy-config.js'

// ───── việc vặt ─────
import { STAMINA_COST as SC } from './economy-config.js'
export const BOARD_SIZE = 5
// Hạn việc theo giờ game: đi bộ xa nhất đo được ~38 giây (3,4 ô/giây) ≈ 0,9 giờ + mini-game 45 giây + màn giới thiệu/kết quả
// ≈ 1,4 giờ -> 2,3 giờ; cho 4 giờ (≈ 2 phút 47 giây thật) để còn dư mở điện thoại, ăn dọc đường.
export const JOB_WINDOW_H = 4
export const BOARD_LIFE_H = 5            // việc trên bảng tồn tại bao lâu nếu chưa nhận (≈ 3,5 phút thật)
export const FAIL_MOOD = -5              // hết giờ mất việc
// Tiền công theo điểm: lồi (điểm thấp gần như không có tiền, điểm cao đáng công):
//   pay = PAY_FULL × (điểm/100)^PAY_EXP × hệ số việc × hệ số tâm trạng, làm tròn nghìn.
//   0 điểm -> 0đ · 40 -> 32k · 70 -> 63k · 90 -> 85k · 100 -> 96k (hệ số 1,0)
export const PAY_FULL = 96000, PAY_EXP = 1.2
export const PAY_MIN = 0, PAY_MAX = PAY_FULL          // giữ tên cũ cho UI (payMin/payMax của bảng việc)
export const payCurve = (score) => PAY_FULL * Math.pow(Math.max(0, Math.min(100, score)) / 100, PAY_EXP)
export const PAY_EST_SCORE = 70                      // "khoảng tiền" hiển thị trên bảng việc = mức người chơi trung bình
export const MOOD_PAY = { high: 85, highMul: 1.05, low: 30, lowMul: 0.9 }
export const JOB_KINDS = {
  pho:    { title: 'Phụ quán phở',             minigame: 'pho',  siteKinds: ['pho'],    stamina: SC.pho, mult: 1.0,  desc: 'Bưng phở theo nhịp gọi món.' },
  banhmi: { title: 'Phụ xe bánh mì',           minigame: 'pho',  siteKinds: ['banhmi'], stamina: SC.banhmi,  mult: 0.95, desc: 'Kẹp bánh mì, rót nước mía cho khách.', variant: 'banhmi' },
  tc:     { title: 'Xếp ghế quán trà chanh',   minigame: 'tc',   siteKinds: ['tc'],     stamina: SC.tc, mult: 1.05, desc: 'Khuân ghế nhựa qua đường ra vỉa hè quán, né xe máy.' },
  rail:   { title: 'Gác chắn đường tàu',       minigame: 'rail', siteKinds: ['rail'],   stamina: SC.rail,  mult: 1.0,  desc: 'Hạ chắn khi tàu tới, nâng chắn cho xe qua.' },
  ship:   { title: 'Shipper giao hàng ngõ sâu', minigame: 'ship', siteKinds: ['banhmi', 'pho', 'tc'], stamina: SC.ship, mult: 1.1, desc: 'Giao đơn trong ngõ hẹp, né chậu cây và mèo.' },
  xichlo: { title: 'Đạp xích lô Hồ Gươm',      minigame: 'cyclo', siteKinds: ['xichlo'], stamina: SC.xichlo, mult: 1.05,  desc: 'Đạp đều chân chở khách dạo hồ.' },
}
export const GRAB_SHIP_BONUS = 1.3       // có xe Grab thì việc shipper trả thêm 30%

// ───── mini-game ─────
export const MINIGAME_SECONDS = 45
// Núm chỉnh độ khó / chấm điểm của từng mini-game (đọc trong minigames/*.js). Đã chạy bot giả lập (báo cáo đợt 4):
// bấm loạn <= 40 · bot tốt (phản xạ 250ms) 70–85 · bot hoàn hảo 100.
export const MG = {
  pho: {
    beat: 0.625,                         // 96 nhịp/phút
    win: 0.042,                          // ± giây quanh phách = "đúng nhịp"
    offBeat: 0.35,                       // phục vụ lệch nhịp chỉ được 0,35 suất
    wrong: 0.3, lost: 0.35,              // trừ theo suất: bấm món không ai gọi / khách bỏ về
    patStart: 7, patEnd: 3.6,            // kiên nhẫn của khách (giây) đầu -> cuối lượt
    gapStart: 3, gapEnd: 1.25,           // số phách giữa 2 khách đầu -> cuối lượt
  },
  tc: { target: 7, hit: 8, carRamp: 1 / 180, spawnStart: [1.6, 2.6], spawnEnd: [1.0, 1.8] },   // target = số ghế bot hoàn hảo xếp được
  rail: {
    bells: [3, 10, 17, 24, 31, 38],     // giây chuông reo (6 chuyến tàu; mỗi chuyến nhanh hơn, báo trước ngắn hơn)
    v0: 110, v1: 170,                    // tốc độ tàu chuyến đầu -> chuyến cuối (px/giây)
    lead0: 3.0, lead1: 2.15,             // từ chuông tới lúc đầu tàu vào giao cắt (giây): báo trước ngắn dần
    excessPerSec: 3.6,                   // trừ điểm mỗi giây chắn đóng thừa (không có tàu / nâng chậm -> xe chờ oan)
    crash: 30, angry: 2, late: 8,        // tai nạn / xe bóp còi giục / tàu vào giao cắt mà chắn chưa hạ hẳn
    angryWait: 10,                       // xe chờ quá 10 giây thì bóp còi (đứng chắn suốt lượt = mọi xe bóp còi)
  },
  ship: { perfectDy: 4, goodDy: 18, good: 0.4, waste: 0.25, hit: 0.35, speedRamp: 1 / 200, itemGapEnd: 0.65, doorGapEnd: 0.75 },
  cyclo: { goal: 2920, power: 26, cadence0: 0.34, cadence1: 0.27, band: 0.1, minGap: 0.14, drag: 1.25, courtesy: 15, badBell: 3, walkerGapEnd: 0.6 },
}

// ───── trả góp ─────
// period = số ngày game giữa 2 kỳ. per = tiền mỗi kỳ. deposit = tiền cọc khi ký.
// Gánh/ngày = per/period. Đợt 4 chia lại để bậc 1 (phòng trọ) vừa sức người chơi trung bình (xem bảng trong báo cáo).
export const LATE_MOOD = -8              // mất tâm trạng ngay khi trễ kỳ
export const LATE_MOOD_DAILY = -3        // mỗi ngày trễ tiếp theo
export const DEFAULT_DEBT = { id: 'xemay_cu', kind: 'bike', name: 'Trả góp xe máy cũ', total: 1440000, per: 120000, period: 3, firstDue: 2 }   // 40k/ngày
export const DEBT_CATALOG = [
  { id: 'phongtro',  kind: 'house', tier: 1, name: 'Trả góp phòng trọ trong ngõ',     total: 9000000,   per: 300000,  period: 5, deposit: 500000,   blurb: 'Phòng 15m², chung cầu thang, gần chợ.' },                       // 60k/ngày
  { id: 'nhaong',    kind: 'house', tier: 2, name: 'Trả góp nhà ống 2 tầng',           total: 45000000,  per: 700000,  period: 5, deposit: 2500000,  blurb: 'Nhà ống 2 tầng trong ngõ, có sân phơi.', needTier: 1 },        // 140k/ngày
  { id: 'matpho',    kind: 'house', tier: 3, name: 'Trả góp nhà mặt phố 4 tầng',       total: 150000000, per: 1500000, period: 7, deposit: 8000000,  blurb: 'Nhà mặt phố cổ 4 tầng, mở được quán.', needTier: 2 },          // 214k/ngày
  { id: 'canho',     kind: 'house', tier: 4, name: 'Trả góp căn hộ tháp cao',          total: 300000000, per: 2500000, period: 7, deposit: 15000000, blurb: 'Căn hộ tầng cao nhìn ra hồ.', needTier: 3 },                   // 357k/ngày
  { id: 'grab',      kind: 'vehicle', name: 'Trả góp xe chạy Grab',                    total: 12000000,  per: 300000,  period: 4, deposit: 800000,   blurb: 'Xe mới để chạy Grab: việc shipper trả thêm 30%.' },            // 75k/ngày
]

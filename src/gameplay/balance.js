// Mọi con số cân bằng của gameplay nằm ở đây (VND, thể lực 0-100, tâm trạng 0-100, giờ game).
// 1 giờ game = 1/0.06 ≈ 16,7 giây thật (world.sky.speed = 0.06) -> 1 ngày game ≈ 6,7 phút.
export const SAVE_KEY = 'hanoi-pixel-save-v1'
export const AUTOSAVE_SEC = 10

export const START = { money: 150000, stamina: 100, mood: 70 }

// ───── vòng theo giờ game ─────
export const HOURLY = {
  stamina: -1.2,          // mỗi giờ game
  staminaNight: -2.0,     // 22h–5h thức khuya mệt hơn
  mood: -0.7,
  moodRain: -0.6,         // đang mưa
  moodTired: -1.0,        // thể lực < TIRED
  moodBroke: -0.5,        // tiền < BROKE
  TIRED: 20, BROKE: 20000,
}

// ───── món ăn (ăn tại quán) ─────
// kind = loại hàng bán món đó (khớp getSites kind)
export const DISHES = {
  pho:      { id: 'pho',      name: 'Tô phở bò',         price: 50000, stamina: 40, mood: 6, kind: 'pho' },
  banhmi:   { id: 'banhmi',   name: 'Bánh mì pate',      price: 25000, stamina: 22, mood: 3, kind: 'banhmi' },
  trachanh: { id: 'trachanh', name: 'Cốc trà chanh',     price: 15000, stamina: 8,  mood: 4, kind: 'tc' },
}
export const EAT_AT_STALL_MOOD = 2       // ăn ngay tại hàng vui hơn
export const EAT_RANGE_TILES = 9         // hiện marker 'ăn' khi người chơi còn trong tầm này

// ───── việc vặt ─────
export const MIN_STAMINA_TO_WORK = 20
export const BOARD_SIZE = 5
export const JOB_WINDOW_H = 7            // giờ game để tới nơi và làm xong (~2 phút thật)
export const BOARD_LIFE_H = 9            // việc trên bảng tồn tại bao lâu nếu chưa nhận
export const FAIL_MOOD = -5              // hết giờ mất việc
export const PAY_MIN = 60000, PAY_MAX = 120000   // mini-game 45s: điểm 0 -> PAY_MIN, điểm 100 -> PAY_MAX (nhân hệ số việc)
export const MOOD_PAY = { high: 80, highMul: 1.1, low: 30, lowMul: 0.9 }
export const JOB_KINDS = {
  pho:    { title: 'Phụ quán phở',             minigame: 'pho',  siteKinds: ['pho'],    stamina: 10, mult: 1.0,  desc: 'Bưng phở theo nhịp gọi món.' },
  banhmi: { title: 'Phụ xe bánh mì',           minigame: 'pho',  siteKinds: ['banhmi'], stamina: 9,  mult: 0.95, desc: 'Kẹp bánh mì, rót trà đá cho khách.', variant: 'banhmi' },
  tc:     { title: 'Xếp ghế quán trà chanh',   minigame: 'tc',   siteKinds: ['tc'],     stamina: 12, mult: 1.0,  desc: 'Khuân ghế ra vỉa hè, né xe máy.' },
  rail:   { title: 'Gác chắn đường tàu',       minigame: 'rail', siteKinds: ['rail'],   stamina: 8,  mult: 1.1,  desc: 'Hạ chắn khi tàu tới, nâng chắn cho xe qua.' },
  ship:   { title: 'Shipper giao hàng ngõ sâu', minigame: 'ship', siteKinds: ['banhmi', 'pho', 'tc'], stamina: 15, mult: 1.15, desc: 'Giao đơn trong ngõ hẹp, né chậu cây và mèo.' },
  xichlo: { title: 'Đạp xích lô Hồ Gươm',      minigame: 'cyclo', siteKinds: ['xichlo'], stamina: 14, mult: 1.1,  desc: 'Đạp đều chân chở khách dạo hồ.' },
}
export const GRAB_SHIP_BONUS = 1.25      // có xe Grab thì việc shipper trả thêm

// ───── mini-game ─────
export const MINIGAME_SECONDS = 45

// ───── trả góp ─────
// period = số ngày game giữa 2 kỳ. per = tiền mỗi kỳ. deposit = tiền cọc khi ký.
export const LATE_MOOD = -8              // mất tâm trạng ngay khi trễ kỳ
export const LATE_MOOD_DAILY = -3        // mỗi ngày trễ tiếp theo
export const DEFAULT_DEBT = { id: 'xemay_cu', kind: 'bike', name: 'Trả góp xe máy cũ', total: 1440000, per: 120000, period: 3, firstDue: 2 }
export const DEBT_CATALOG = [
  { id: 'phongtro',  kind: 'house', tier: 1, name: 'Trả góp phòng trọ trong ngõ',     total: 24000000,  per: 1000000, period: 5,  deposit: 1000000, blurb: 'Phòng 15m², chung cầu thang, gần chợ.' },
  { id: 'nhaong',    kind: 'house', tier: 2, name: 'Trả góp nhà ống 2 tầng',           total: 90000000,  per: 3000000, period: 7,  deposit: 5000000, blurb: 'Nhà ống 2 tầng trong ngõ, có sân phơi.', needTier: 1 },
  { id: 'matpho',    kind: 'house', tier: 3, name: 'Trả góp nhà mặt phố 4 tầng',       total: 300000000, per: 8000000, period: 7,  deposit: 20000000, blurb: 'Nhà mặt phố cổ 4 tầng, mở được quán.', needTier: 2 },
  { id: 'canho',     kind: 'house', tier: 4, name: 'Trả góp căn hộ tháp cao',          total: 600000000, per: 15000000, period: 10, deposit: 40000000, blurb: 'Căn hộ tầng cao nhìn ra hồ.', needTier: 3 },
  { id: 'grab',      kind: 'vehicle', name: 'Trả góp xe chạy Grab',                    total: 36000000,  per: 1200000, period: 4,  deposit: 2000000, blurb: 'Xe mới để chạy Grab: việc shipper trả thêm 25%.' },
]

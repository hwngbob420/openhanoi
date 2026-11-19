// Bảng tính kinh tế đợt 4 — đọc thẳng số từ balance.js / economy-config.js
import * as B from 'file:///C:/opensource/game/src/gameplay/balance.js'
const k = (n) => Math.round(n / 1000) + 'k'
const kinds = Object.values(B.JOB_KINDS)
const avgMult = kinds.reduce((a, j) => a + j.mult, 0) / kinds.length
const avgCost = kinds.reduce((a, j) => a + j.stamina, 0) / kinds.length
const pay = (s, m = avgMult, mood = 1) => Math.round(B.payCurve(s) * m * mood / 1000) * 1000
const D = B.DISHES, food = 2 * D.pho.price + D.trachanh.price, foodSt = 2 * D.pho.stamina + D.trachanh.stamina
const bike = B.DEFAULT_DEBT.per / B.DEFAULT_DEBT.period
const SEC_PER_H = 1 / B.SKY_SPEED
console.log(`1 giờ game = ${SEC_PER_H.toFixed(1)} giây thật · ngày = ${(24 * SEC_PER_H).toFixed(0)} giây`)
console.log(`hệ số việc TB ${avgMult.toFixed(3)} · thể lực/việc TB ${avgCost.toFixed(1)}`)
console.log('\nTiền công theo điểm (hệ số 1,0):', [0, 20, 40, 50, 60, 70, 80, 90, 92, 100].map((s) => `${s}đ→${k(pay(s, 1))}`).join(' · '))
console.log('Theo việc @70 / @92:', Object.entries(B.JOB_KINDS).map(([id, j]) => `${id} ${k(pay(70, j.mult))}/${k(pay(92, j.mult))}`).join(' · '))
function day(name, jobs, score, mood, extraFood = 0) {
  const gross = jobs * pay(score, avgMult, mood)
  const net = gross - food - extraFood - bike
  const stUsed = jobs * avgCost + 16 * -B.HOURLY.stamina
  console.log(`${name.padEnd(34)} ${jobs} việc × ${k(pay(score, avgMult, mood))} = ${k(gross)} − ăn ${k(food + extraFood)} − góp xe ${k(bike)} = để dành ${k(net)} | thể lực dùng ${stUsed.toFixed(0)} / có ${100 + foodSt}`)
}
console.log('\n── Một ngày (thức 6:00–22:00, ngủ ở nhà) ──')
day('Trung bình (70đ, tâm trạng ×1,0)', 4, 70, 1)
day('Trung bình (70đ, tâm trạng ×1,05)', 4, 70, B.MOOD_PAY.highMul)
day('Giỏi (92đ, tâm trạng ×1,05)', 4, 92, B.MOOD_PAY.highMul)
day('Giỏi (92đ, ×1,05) làm 5 việc', 5, 92, B.MOOD_PAY.highMul, D.banhmi.price)
day('Bấm loạn (40đ)', 4, 40, 1)
// không ăn gì: làm được mấy việc? (2 nhịp chơi: nhanh = 1,7 giờ game/việc theo quãng đi bộ đo được; thong thả = 3 giờ/việc)
for (const [name, hPer] of [['nhanh 1,7 giờ/việc', 1.7], ['thong thả 3 giờ/việc', 3]]) {
  let st = 100, n = 0
  while (n < 10) { const before = st - hPer * -B.HOURLY.stamina; if (before < B.MIN_STAMINA_TO_WORK) break; st = before - avgCost; n++ }
  console.log(`Không ăn gì (${name}): làm được ${n} việc, sau đó thể lực còn ${st.toFixed(1)} (cần >= ${B.MIN_STAMINA_TO_WORK} mới nhận việc)`)
}
// spam: tiền công so với tiền ăn để bù thể lực việc đó tiêu
const stPerJob = avgCost + 3 * -B.HOURLY.stamina, costPerSt = D.pho.price / D.pho.stamina
console.log(`Bấm loạn 40đ: công ${k(pay(40))} − tiền ăn bù ${stPerJob.toFixed(0)} thể lực (${k(stPerJob * costPerSt)}) = ${k(pay(40) - stPerJob * costPerSt)} / việc`)
console.log(`Nghỉ 1 tiếng ở nhà: +${B.REST.napStamina} thể lực, mất 1 giờ (${SEC_PER_H.toFixed(0)} giây) ≈ ${k(B.REST.napStamina * costPerSt)} tiền phở; tối đa ${B.REST.napPerDay} lần/ngày, cách nhau ${B.REST.napCooldownH} giờ`)
console.log('\n── Trả góp (gánh/ngày, số ngày để dành đủ cọc với người TB ~' + k(4 * pay(70) - food - bike) + '/ngày) ──')
const sav = 4 * pay(70) - food - bike
for (const c of [{ ...B.DEFAULT_DEBT, deposit: 0 }, ...B.DEBT_CATALOG]) console.log(`${c.name.padEnd(32)} tổng ${k(c.total).padStart(6)} · kỳ ${k(c.per)}/${c.period} ngày = ${k(c.per / c.period)}/ngày · cọc ${k(c.deposit)} (${(c.deposit / sav).toFixed(1)} ngày)`)
console.log(`\nHạn việc ${B.JOB_WINDOW_H} giờ game = ${(B.JOB_WINDOW_H * SEC_PER_H).toFixed(0)} giây · việc trên bảng ${B.BOARD_LIFE_H} giờ = ${(B.BOARD_LIFE_H * SEC_PER_H).toFixed(0)} giây · mini-game 45 giây = ${(45 * B.SKY_SPEED).toFixed(2)} giờ`)

// CÔNG CỤ KIỂM THỬ (không được import vào game; Vite không đóng gói). Chạy khi dev server cổng 8803 đang mở:
//   node src/gameplay/sim/run_bots.mjs [pho,tc,rail,ship,cyclo] [số lượt=30] [bước khung giây, mặc định 1/120]
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire('C:/opensource/game/package.json')
const { chromium } = require('playwright')
const games = (process.argv[2] || 'pho,tc,rail,ship,cyclo').split(',')
const N = +(process.argv[3] || 30)
const code = fs.readFileSync(new URL('./bots.js', import.meta.url), 'utf8')
const b = await chromium.launch()
const page = await b.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
await page.goto('http://localhost:8803/', { waitUntil: 'load' })
await page.waitForTimeout(1500)
await page.evaluate((dt) => { window.__simDT = dt }, +(process.argv[4] || 0) || null)
await page.addScriptTag({ content: code, type: 'module' })
await page.waitForFunction(() => window.__sim)
const all = {}
for (const g of games) {
  const t0 = Date.now()
  all[g] = await page.evaluate(([g, N]) => window.__sim.bench(g, N), [g, N])
  console.log('== ' + g + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)')
  for (const [k, v] of Object.entries(all[g])) if (!k.startsWith('spam') || v.max > 0) console.log(`  ${k.padEnd(44)} TB ${String(v.mean).padStart(5)}  min ${String(v.min).padStart(3)}  max ${String(v.max).padStart(3)}${v.fails ? '  huỷ ' + v.fails : ''}${k.startsWith('tốt') ? '  (>=95: ' + v.ge95 + '/' + N + ')' : ''}`)
}
// (kết quả chỉ in ra màn hình)
if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 5))
await b.close()

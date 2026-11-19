// Ảnh tổng hợp duyệt (contact sheet): ghép nhiều PNG, phóng nguyên lần, nền xám trung tính, có nhãn chữ Việt.
//   node tools/make_review_sheet.mjs <spec.json> <out.png>
//   spec = { title, scale:3, cols:6, bg:'#8a8a8a', items:[{label, file | files:[...], group?}] }
//   files:[...] = các khung động xếp cạnh nhau trong cùng một ô.
// Dùng Chromium của gói playwright đã cài (không cần thư viện ảnh).
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

export async function makeSheet(spec, outFile) {
  const items = spec.items.map((it) => ({ label: it.label, group: it.group || '', split: it.frames || 1, srcs: (it.files || [it.file]).map((f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')) }))
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${spec.bg || '#8a8a8a'}"><canvas id="c"></canvas><script>
  window.run = async (items, opt) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s })
    for (const it of items) {
      it.imgs = await Promise.all(it.srcs.map(load))
      if (it.split > 1) {            // dải khung ngang -> tách từng khung
        const im = it.imgs[0], fw = im.width / it.split, out = []
        for (let i = 0; i < it.split; i++) { const c = document.createElement('canvas'); c.width = fw; c.height = im.height; c.getContext('2d').drawImage(im, i * fw, 0, fw, im.height, 0, 0, fw, im.height); out.push(c) }
        it.imgs = out
      }
    }
    const S = opt.scale || 3, PAD = 10, GAP = 4 * S, LBL = 30, maxW = opt.maxW || 1800
    // xếp hàng tự động theo bề rộng
    const cells = items.map((it) => ({ it, w: Math.max(120, it.imgs.reduce((a, i) => a + i.width * S + GAP, -GAP) + 2 * PAD), h: Math.max(...it.imgs.map((i) => i.height)) * S + 2 * PAD + LBL }))
    let x = 0, y = 50, rowH = 0, lastG = null; const pos = []
    for (const c of cells) {
      if (c.it.group !== lastG && lastG !== null) { x = 0; y += rowH + 34; rowH = 0 }
      if (c.it.group !== lastG) { pos.push({ head: c.it.group, y: y - 4 }); y += 0 }
      lastG = c.it.group
      if (x + c.w > maxW && x > 0) { x = 0; y += rowH + 8; rowH = 0 }
      pos.push({ c, x, y: y + (c.it.group ? 22 : 0) }); x += c.w + 8; rowH = Math.max(rowH, c.h + (c.it.group ? 22 : 0))
    }
    const W = maxW, H = y + rowH + 20
    const cv = document.getElementById('c'); cv.width = W; cv.height = H; const g = cv.getContext('2d')
    g.fillStyle = opt.bg || '#8a8a8a'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#1e1e1e'; g.font = 'bold 22px Segoe UI, Arial'; g.fillText(opt.title || '', 12, 30)
    g.imageSmoothingEnabled = false
    for (const p of pos) {
      if (p.head !== undefined) { if (p.head) { g.fillStyle = '#222'; g.font = 'bold 17px Segoe UI, Arial'; g.fillText(p.head, 12, p.y + 16) } continue }
      const { c } = p
      g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(p.x, p.y, c.w, c.h)
      let ix = p.x + PAD
      for (const im of c.it.imgs) { g.drawImage(im, ix, p.y + PAD, im.width * S, im.height * S); ix += im.width * S + GAP }
      g.fillStyle = '#111'; g.font = '13px Segoe UI, Arial'
      const dims = c.it.imgs[0].width + 'x' + c.it.imgs[0].height + (c.it.imgs.length > 1 ? ' ×' + c.it.imgs.length : '')
      g.fillText(c.it.label, p.x + 6, p.y + c.h - 16); g.fillStyle = '#333'; g.font = '11px Segoe UI, Arial'; g.fillText(dims, p.x + 6, p.y + c.h - 3)
    }
    return cv.toDataURL('image/png')
  }</script>`
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html)
  const url = await page.evaluate(([items, opt]) => window.run(items, opt), [items, { scale: spec.scale, title: spec.title, bg: spec.bg, maxW: spec.maxW }])
  await browser.close()
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, Buffer.from(url.split(',')[1], 'base64'))
}

if (process.argv[1] && process.argv[1].endsWith('make_review_sheet.mjs')) {
  const [specF, out] = process.argv.slice(2)
  await makeSheet(JSON.parse(fs.readFileSync(specF, 'utf8')), out)
  console.log('đã ghi', out)
}

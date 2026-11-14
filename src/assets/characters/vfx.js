// VFX nhúng (Pixelbolt): khói nồi phở (6 khung lặp 16x24) và mưa rào (ô lát 64x64, 4 khung lặp).
//   window.__characters.vfx.steam.frames  -> [canvas x6]   (khung 150 ms, nền trong suốt, đặt chân khói ở đáy-giữa)
//   window.__characters.vfx.rain.frames   -> [canvas x4]   (lát kín cả màn hình, mỗi khung 70 ms)
//   vfx.drawSteam(ctx, x, y, time, scale)    vẽ khói tại (x,y)= đáy-giữa nồi
//   vfx.drawRain(ctx, w, h, time, alpha)     phủ mưa lên cả vùng w x h (ô lát, tự cuộn theo thời gian)
const FR = { pho_steam: [], rain: [] }
let META = {}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }

export function init(bundle) {
  META = bundle.vfxMeta || {}
  for (const name of Object.keys(META)) {
    const src = bundle.vfx[name]; if (!src) continue
    const im = new Image()
    im.onload = () => {
      FR[name] = META[name].sheet.map(([sx, sy]) => { const c = mk(META[name].w, META[name].h); c.getContext('2d').drawImage(im, sx, sy, META[name].w, META[name].h, 0, 0, META[name].w, META[name].h); return c })
    }
    im.src = src
  }
}

const frameAt = (name, t) => { const f = FR[name]; if (!f.length) return null; const ms = META[name].frameMs; return f[Math.floor(t * 1000 / ms) % f.length] }

export const api = {
  steam: { get frames() { return FR.pho_steam }, frameMs: 150 },
  rain: { get frames() { return FR.rain }, frameMs: 70 },
  drawSteam(ctx, x, y, time = performance.now() / 1000, scale = 1) {
    const f = frameAt('pho_steam', time); if (!f) return
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(f, Math.round(x - f.width * scale / 2), Math.round(y - f.height * scale), f.width * scale, f.height * scale)
  },
  drawRain(ctx, w, h, time = performance.now() / 1000, alpha = 0.9, scale = 1) {
    const f = frameAt('rain', time); if (!f) return
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha
    const tw = f.width * scale, th = f.height * scale
    for (let y = 0; y < h; y += th) for (let x = 0; x < w; x += tw) ctx.drawImage(f, x, y, tw, th)
    ctx.restore()
  },
}

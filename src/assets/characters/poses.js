// Dáng NPC đời sống phố -> window.__npcPoses (hợp đồng ĐỢT 4). Ảnh: poses-bundle.js (sinh bởi tools/make_minigames.mjs).
// __npcPoses[tên] = { w, h, anchor:[x,y], fps, loop, dirs:{down,up,left,right → [canvas…]}, frames (= dirs.down hoặc hướng đầu tiên), desc }
//   tên: exercise, stretch, jog, coupleSit, elderTea, chess, sitStool  (README: src/assets/minigames/README.md mục "Dáng NPC")
// Người chính vẽ bằng MÀU KHOÁ của NPC thế giới; frames/dirs mặc định đã đổi sang màu `look` riêng của dáng.
// __npcPoses.get(tên, hướng='down', look?) -> [canvas…]: look theo định dạng NPC_LOOK {sh:[3 màu], pa:[2], ha:[2]} (cache).
// __npcPoses.raw(tên, hướng) -> khung màu khoá gốc (để thế giới tự recolor như người đi bộ). __npcPoses.ready = Promise.
import BUNDLE from './poses-bundle.js'

const KEY = { t: '#3a8f8a', T: '#2a6a6c', u: '#6cc1b0', p: '#3d4c7a', P: '#2b3558', h: '#2b2230', H: '#443449' }
const h2 = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const RAW = {}           // `${name}_${dir}` -> [canvas]
const CACHE = new Map()
let loaded = false

function recolor(src, look) {
  const c = mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0)
  if (!look) return c
  const M = new Map(), put = (o, n) => { const O = h2(o); M.set((O[0] << 16) | (O[1] << 8) | O[2], h2(n)) }
  put(KEY.t, look.sh[0]); put(KEY.T, look.sh[1]); put(KEY.u, look.sh[2]); put(KEY.p, look.pa[0]); put(KEY.P, look.pa[1]); put(KEY.h, look.ha[0]); put(KEY.H, look.ha[1])
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const n = M.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]); if (n) { a[i] = n[0]; a[i + 1] = n[1]; a[i + 2] = n[2] } }
  g.putImageData(d, 0, 0); return c
}
function fillDefault(name) {           // vẽ lại frames mặc định (đã đổi màu look) vào canvas đã cấp sẵn
  const P = window.__npcPoses[name], m = BUNDLE.meta[name]
  for (const dir of m.dirs) RAW[`${name}_${dir}`].forEach((src, i) => { const c = recolor(src, m.look), g = P.dirs[dir][i].getContext('2d'); g.clearRect(0, 0, m.w, m.h); g.drawImage(c, 0, 0) })
}

export function initPoses() {
  if (typeof document === 'undefined') return
  let readyRes; const ready = new Promise((r) => { readyRes = r })
  const api = {
    ready,
    names: Object.keys(BUNDLE.meta),
    get(name, dir = 'down', look) {
      const m = BUNDLE.meta[name]; if (!m) return []
      const d = m.dirs.includes(dir) ? dir : m.dirs[0]
      if (!look) return api[name].dirs[d]
      const k = name + '_' + d + '|' + JSON.stringify(look)
      if (CACHE.has(k)) return CACHE.get(k)
      const out = (RAW[`${name}_${d}`] || []).map((s) => recolor(s, look))
      if (loaded) CACHE.set(k, out)
      return out
    },
    raw(name, dir = 'down') { const m = BUNDLE.meta[name]; if (!m) return []; return RAW[`${name}_${m.dirs.includes(dir) ? dir : m.dirs[0]}`] || [] },
  }
  window.__npcPoses = api
  const keys = Object.keys(BUNDLE.png); let left = keys.length
  for (const [name, m] of Object.entries(BUNDLE.meta)) {
    const dirs = {}
    for (const dir of m.dirs) { dirs[dir] = Array.from({ length: m.frames }, () => mk(m.w, m.h)); RAW[`${name}_${dir}`] = Array.from({ length: m.frames }, () => mk(m.w, m.h)) }
    api[name] = { w: m.w, h: m.h, anchor: m.anchor, fps: m.fps, loop: m.loop, desc: m.desc, look: m.look, dirs, frames: dirs.down || dirs[m.dirs[0]] }
  }
  for (const key of keys) {
    const im = new Image()
    im.onload = () => {
      const name = key.slice(0, key.lastIndexOf('_')), m = BUNDLE.meta[name]
      RAW[key].forEach((c, i) => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, i * m.w, 0, m.w, m.h, 0, 0, m.w, m.h) })
      if (--left <= 0) { loaded = true; CACHE.clear(); for (const n of Object.keys(BUNDLE.meta)) fillDefault(n); readyRes(true) }
    }
    im.onerror = () => { if (--left <= 0) { loaded = true; readyRes(false) } }
    im.src = BUNDLE.png[key]
  }
}

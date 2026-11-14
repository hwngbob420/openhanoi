// Ăn tại hàng: marker 'ăn' xuất hiện khi đứng gần sạp phở / bánh mì / quán trà chanh; E / chạm mở thực đơn nhỏ.
import { State } from '../core/state.js'
import * as B from './balance.js'
import { eat, fmt, W } from './economy.js'
import * as MG from './minigames/index.js'

const MENU = { pho: ['pho'], banhmi: ['banhmi'], tc: ['trachanh'] }
const LABEL = { pho: 'Ăn phở', banhmi: 'Mua bánh mì', tc: 'Uống trà chanh' }
const marks = new Map()          // siteId -> remove()
let panel = null, timer = 0

function closePanel() { if (panel) { panel.remove(); panel = null } }
function openMenu(site) {
  closePanel()
  panel = document.createElement('div'); panel.id = 'gp-eat-menu'
  panel.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:21;background:rgba(20,16,12,.94);color:#f4efe2;border:2px solid #d9a441;border-radius:10px;padding:10px 12px;font:600 14px/1.35 "Segoe UI",system-ui,sans-serif;display:flex;flex-direction:column;gap:6px;min-width:230px;max-width:92vw'
  panel.addEventListener('pointerdown', (e) => e.stopPropagation())
  const h = document.createElement('div'); h.style.cssText = 'color:#ffd96a;font-weight:800'; h.textContent = site.label; panel.appendChild(h)
  for (const id of MENU[site.kind] || []) {
    const d = B.DISHES[id]
    const b = document.createElement('button'); b.type = 'button'
    b.style.cssText = 'background:#4a3a2a;color:#fff6dc;border:2px solid #9b8658;border-radius:8px;padding:8px 10px;font:inherit;cursor:pointer;text-align:left;min-height:44px'
    b.textContent = `${d.name} · ${fmt(d.price)} · +${d.stamina} thể lực`
    b.addEventListener('click', () => { if (eat(id, { atStall: true })) closePanel() })
    panel.appendChild(b)
  }
  const x = document.createElement('button'); x.type = 'button'; x.textContent = 'Thôi'; x.style.cssText = 'background:transparent;color:#cbbf9f;border:1px solid #6b5f45;border-radius:8px;padding:5px;font:inherit;cursor:pointer'
  x.addEventListener('click', closePanel); panel.appendChild(x)
  document.body.appendChild(panel)
}

export function update() {
  const w = W(); if (!w || MG.isActive()) { closePanel(); return }
  const p = w.getPlayer()
  const near = []
  for (const kind of Object.keys(MENU)) for (const s of w.getSites(kind)) { const d = Math.hypot(s.gx - p.gx, s.gy - p.gy); if (d < B.EAT_RANGE_TILES) near.push({ s, d }) }
  near.sort((a, b) => a.d - b.d)
  const want = new Set(near.slice(0, 5).map((n) => n.s.id))
  for (const [id, rm] of marks) if (!want.has(id)) { rm(); marks.delete(id) }
  if (panel && !near.length) closePanel()
  for (const n of near.slice(0, 5)) {
    if (marks.has(n.s.id)) continue
    const s = n.s
    marks.set(s.id, w.addMarker({ id: 'eat:' + s.id, gx: s.gx, gy: s.gy, r: 1.5, label: LABEL[s.kind] + ' (' + (MENU[s.kind] || []).map((d) => fmt(B.DISHES[d].price)).join(', ') + ')', onInteract: () => openMenu(s) }))
  }
}
export function start() { clearInterval(timer); timer = setInterval(update, 600) }
export function clear() { for (const rm of marks.values()) rm(); marks.clear(); closePanel() }

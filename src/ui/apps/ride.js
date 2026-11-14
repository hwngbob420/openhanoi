// App Xe Ôm Công Nghệ: chọn địa danh, giá theo khoảng cách, trừ tiền rồi dịch chuyển.
import { h, icon, vnd } from '../theme.js'
import { G, S, pois, playerPos, distTiles, fmtDist } from '../gp.js'

let sel = null
const BASE = 10000, PER_TILE = 700
export const farePrice = (d) => Math.max(BASE, Math.round((BASE + PER_TILE * d) / 1000) * 1000)
// chỉ cho đặt tới nơi đi bộ tới được (tránh kẹt trên đảo Ngọc / Tháp Rùa)
const okPoi = (p) => { try { return !/sắp mở/i.test(p.label) && (window.__worldAPI.isReachable ? window.__worldAPI.isReachable(p.gx, p.gy) : true) } catch (e) { return true } }

function go(ctx, p, price) {
  if (!G().spend(price, 'Xe ôm công nghệ')) { ctx.sfx('error'); return ctx.say('Không đủ tiền đi xe ôm', 'bad') }
  try { window.__worldAPI.teleport(p.gx, p.gy) } catch (e) { console.error('[ui] teleport', e) }
  ctx.sfx('horn'); sel = null; ctx.closePhone(); ctx.toast(`Xe ôm đã chở bạn tới ${p.label} (-${vnd(price)})`, 'good')
}

export default {
  id: 'ride', title: 'Xe Ôm Công Nghệ', sub: 'Bác tài tới liền, giá theo ký', icon: 'car',
  open() { sel = null },
  back() { if (sel) { sel = null; return true } return false },
  render(ctx) {
    const root = h('div', { class: 'hx-app' })
    const money = S().money ?? 0
    root.append(h('div', { class: 'hx-row sp', style: 'margin:0 2px 8px' }, h('span', { class: 'hx-sm', text: 'Chọn điểm đến' }), h('span', { class: 'hx-sm hx-pay', text: 'Ví ' + vnd(money) })))
    const list = pois().filter(okPoi).map((p) => ({ p, d: distTiles(p) ?? 0 })).sort((a, b) => a.d - b.d)
    if (!list.length || !playerPos()) root.append(h('div', { class: 'hx-empty' }, icon('car', 48), h('div', { text: 'Chưa có địa danh nào để đặt xe.' })))
    for (const { p, d } of list) {
      const price = farePrice(d), on = sel === p.id, afford = money >= price
      const card = h('div', { class: 'hx-card' + (on ? ' hi' : ''), 'data-poi': p.id },
        h('button', { class: 'hx-row', style: 'width:100%;min-height:44px;text-align:left', onclick: () => { sel = on ? null : p.id; ctx.sfx('click'); ctx.rerender(true) } },
          icon('map-pin', 24), h('div', { class: 'hx-grow' }, h('div', { class: 'hx-title', text: p.label }), h('div', { class: 'hx-sm', text: 'Cách ' + fmtDist(d) })),
          h('span', { class: 'hx-pay ' + (afford ? '' : 'hx-bad'), text: vnd(price) })))
      if (on) card.append(h('div', { class: 'hx-btns' },
        h('button', { class: 'hx-btn pri', 'data-act': 'ride', disabled: !afford, onclick: () => go(ctx, p, price) }, afford ? 'Đi ngay' : 'Không đủ tiền'),
        h('button', { class: 'hx-btn', onclick: () => { sel = null; ctx.rerender(true) } }, 'Thôi')))
      root.append(card)
    }
    return root
  },
}

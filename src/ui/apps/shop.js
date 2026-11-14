// App Shop Thời Trang & Nhuộm Tóc: xem trước bằng renderPortrait, mua + mặc, hiện đồ đã sở hữu.
import { h, icon, vnd } from '../theme.js'
import { G, S } from '../gp.js'

const TABS = [['hair', 'Nhuộm tóc'], ['top', 'Áo'], ['pants', 'Quần']]
const KIND_VN = { hair: 'tóc', top: 'áo', pants: 'quần' }
let tab = 'hair', prev = null

const owned = (kind, i) => ((S().owned || {})[kind] || []).includes(i)
const worn = (kind) => ((S().outfit || {})[kind]) | 0

function portrait() {
  const wrap = h('div', { class: 'stage' })
  try { const c = window.__characters.renderPortrait(prev, 6); wrap.append(c) } catch (e) { wrap.append(h('span', { class: 'hx-sm', text: 'Chưa vẽ được nhân vật' })) }
  return wrap
}

function act(ctx, kind, i, o) {
  const g = G()
  if (!owned(kind, i)) {
    if (!g.buy(kind, i)) { ctx.sfx('error'); return ctx.say('Không đủ tiền mua ' + o.name, 'bad') }
    g.equip(kind, i); ctx.sfx('ting'); ctx.say(`Đã mua và mặc: ${o.name}`, 'good')
  } else { g.equip(kind, i); ctx.sfx('click'); ctx.toast('Đã mặc: ' + o.name, 'good') }
  prev = { ...S().outfit }; ctx.rerender(true)
}

export default {
  id: 'shop', title: 'Shop Thời Trang', sub: 'Thời trang & nhuộm tóc', icon: 'shopping-bag',
  open() { prev = { ...(S().outfit || { hair: 0, top: 0, pants: 0 }) }; tab = 'hair' },
  render(ctx) {
    const O = window.__characters && window.__characters.OUTFIT_OPTIONS
    const root = h('div', { class: 'hx-app' })
    if (!O) { root.append(h('div', { class: 'hx-empty' }, icon('shopping-bag', 48), h('div', { text: 'Shop chưa mở cửa.' }))); return root }
    if (!prev) prev = { ...(S().outfit || { hair: 0, top: 0, pants: 0 }) }
    const list = O[tab], i = prev[tab] | 0
    const money = S().money ?? 0
    root.append(h('div', { class: 'hx-tabs' }, TABS.map(([k, n]) => h('button', { class: k === tab ? 'on' : '', 'data-tab': k, onclick: () => { tab = k; ctx.sfx('click'); ctx.rerender('top') } }, n))))
    const cur = list[i]
    root.append(h('div', { class: 'hx-card hx-prev' }, portrait(),
      h('div', { class: 'hx-grow' }, h('div', { class: 'hx-sm', text: 'Xem trước' }), h('div', { class: 'hx-title', text: cur ? cur.name : '' }),
        h('div', { class: 'hx-sm', text: 'Ví ' + vnd(money) }),
        h('div', { class: 'hx-btns', style: 'margin-top:8px' }, (() => {
          const has = owned(tab, i), isWorn = worn(tab) === i, afford = money >= (cur ? cur.price : 0)
          return h('button', { class: 'hx-btn pri', 'data-act': 'wear', disabled: isWorn || (!has && !afford), onclick: () => act(ctx, tab, i, cur) },
            isWorn ? 'Đang mặc' : has ? 'Mặc' : afford ? `Mua · ${vnd(cur.price)}` : 'Thiếu tiền')
        })()))))
    list.forEach((o, k) => {
      const has = owned(tab, k), isWorn = worn(tab) === k
      root.append(h('button', { class: 'hx-opt' + (k === i ? ' sel' : ''), 'data-opt': k, onclick: () => { prev = { ...prev, [tab]: k }; ctx.sfx('click'); ctx.rerender(true) } },
        h('span', { class: 'hx-sw', style: 'background:' + o.color }),
        h('div', { class: 'hx-grow' }, h('div', { class: 'hx-title', text: o.name })),
        isWorn ? h('span', { class: 'hx-tag a', text: 'Đang mặc' }) : has ? h('span', { class: 'hx-tag', text: 'Đã có' }) : h('span', { class: 'hx-pay', text: vnd(o.price) })))
    })
    root.append(h('div', { class: 'hx-sm', style: 'text-align:center;margin-top:6px', text: `Kho đồ: ${((S().owned || {})[tab] || []).length}/${list.length} món ${KIND_VN[tab]}` }))
    return root
  },
}

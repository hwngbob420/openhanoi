// App Sổ Nợ Trả Góp: danh sách khoản nợ, nút đóng kỳ.
import { h, icon, vnd } from '../theme.js'
import { G, day } from '../gp.js'

export default {
  id: 'debts', title: 'Sổ Nợ Trả Góp', sub: 'Nợ là duyên, trả là nghĩa', icon: 'receipt',
  render(ctx) {
    const root = h('div', { class: 'hx-app' })
    const list = (G().debts && G().debts.list && G().debts.list()) || []
    const today = day()
    if (!list.length) root.append(h('div', { class: 'hx-empty' }, icon('check', 48), h('div', { text: 'Bạn không nợ ai cả.' }), h('div', { class: 'hx-sm', text: 'Sạch sành sanh!' })))
    for (const d of list) {
      const left = d.remaining ?? Math.max(0, d.total - d.paid), done = left <= 0, pct = Math.min(100, Math.round((d.paid / (d.total || 1)) * 100))
      const late = !done && (d.overdue ?? (d.nextDay != null && d.nextDay <= today))
      const due = !done && d.nextDay != null && d.nextDay <= today, early = !done && d.canPayNow === false
      const per = d.amount ?? Math.min(d.per, left)
      root.append(h('div', { class: 'hx-card' + (late || due ? ' hi' : ''), 'data-debt': d.id },
        h('div', { class: 'hx-row sp' }, h('div', { class: 'hx-title', text: d.name }), done ? h('span', { class: 'hx-tag a', text: 'Đã tất toán' }) : late ? h('span', { class: 'hx-tag a', text: 'Trễ hạn' }) : due ? h('span', { class: 'hx-tag a', text: 'Đến hạn' }) : null),
        h('div', { class: 'hx-bar' }, h('i', { style: `width:${pct}%` })),
        h('div', { class: 'hx-row sp' }, h('span', { class: 'hx-sm', text: `Đã trả ${vnd(d.paid)} / ${vnd(d.total)}` }), h('span', { class: 'hx-sm', text: pct + '%' })),
        h('div', { class: 'hx-sm', text: done ? 'Hết nợ, nhẹ cả người.' : `Còn ${vnd(left)} · mỗi kỳ ${vnd(d.per)} · kỳ tới ngày ${d.nextDay ?? '—'}` }),
        done ? null : h('div', { class: 'hx-btns' }, h('button', { class: 'hx-btn pri', 'data-act': 'pay', disabled: early, onclick: () => {
          if (G().debts.pay(d.id)) { ctx.sfx('click'); ctx.say(`Đã đóng kỳ ${vnd(per)} cho ${d.name}`, 'good') } else { ctx.sfx('error'); ctx.say('Không đủ tiền đóng kỳ này', 'bad') }
          ctx.rerender(true)
        } }, icon('wallet', 24), early ? `Chưa tới kỳ · ngày ${d.nextDay - 1}` : `Đóng kỳ · ${vnd(per)}`))))
    }
    return root
  },
}

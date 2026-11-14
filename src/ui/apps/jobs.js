// App Việc Vặt 24h: bảng việc, chi tiết, nhận/hủy, khoảng cách tới đích, nút Dẫn đường.
import { h, icon, vnd, hhmm } from '../theme.js'
import { G, S, jobTarget, distTiles, fmtDist, siteLabel, hour } from '../gp.js'

let sel = null          // id việc đang xem chi tiết
const STAGE = { goto: 'Đang đi tới điểm làm', play: 'Đang làm', done: 'Xong' }
const kindIcon = (k) => (k === 'rail' ? 'camera' : k === 'hair' ? 'user' : 'briefcase')

function distNode(ctx, job) {
  const n = h('span', { text: fmtDist(distTiles(jobTarget(job))) })
  ctx.live(() => { n.textContent = fmtDist(distTiles(jobTarget(job))) })
  return n
}
function deadline(job) {
  if (job.deadlineHour == null) return '—'
  const left = job.deadlineHour - hour()
  return `${hhmm(job.deadlineHour)}${left > 0 && left < 24 ? ` (còn ${left.toFixed(1).replace('.0', '')}g)` : left <= 0 ? ' (trễ)' : ''}`
}
function gps(ctx, job) {
  const t = jobTarget(job)
  const w = window.__worldAPI
  if (!t || !w || !w.setGps) { ctx.sfx('error'); return ctx.toast('Chưa có bản đồ để dẫn đường', 'bad') }
  w.setGps(t.id && w.getSites('any').some((s) => s.id === t.id) ? t.id : t)
  ctx.sfx('click'); ctx.toast('Đã bật chỉ đường: ' + (t.label || job.title)); ctx.closePhone()
}
function accept(ctx, job) {
  const ok = G().jobs.accept(job.id)
  if (ok === false || (ok === undefined && !S().job)) { ctx.sfx('error'); return ctx.say(S().stamina <= 0 ? 'Hết thể lực, nghỉ chút đã' : 'Chưa nhận được việc này', 'bad') }
  ctx.sfx('ting'); ctx.say('Đã nhận: ' + job.title, 'good'); sel = null; ctx.rerender('top')
}
function cancel(ctx) {
  G().jobs.cancel(); ctx.sfx('click'); sel = null; ctx.rerender('top')
}
function activeCard(ctx, job) {
  return h('div', { class: 'hx-card hi' },
    h('div', { class: 'hx-row sp' }, h('span', { class: 'hx-tag a', text: 'ĐANG LÀM' }), h('span', { class: 'hx-pay', text: vnd(job.pay) })),
    h('div', { class: 'hx-title', style: 'margin-top:6px', text: job.title }),
    h('div', { class: 'hx-sm' }, STAGE[job.stage] || '', ' · hạn ', deadline(job)),
    h('div', { class: 'hx-sm' }, 'Đích: ', siteLabel(job) || '—', ' · cách ', distNode(ctx, job)),
    h('div', { class: 'hx-btns' },
      h('button', { class: 'hx-btn pri', 'data-act': 'gps', onclick: () => gps(ctx, job) }, icon('map-pin', 24), 'Dẫn đường'),
      h('button', { class: 'hx-btn bad', 'data-act': 'cancel', onclick: () => cancel(ctx) }, icon('close', 24), 'Hủy việc')))
}
function detail(ctx, job, active) {
  const t = jobTarget(job)
  return h('div', null,
    h('div', { class: 'hx-card' },
      h('div', { class: 'hx-row' }, icon(kindIcon(job.kind), 24), h('div', { class: 'hx-title hx-grow', text: job.title }), h('span', { class: 'hx-pay', text: vnd(job.pay) })),
      h('p', { class: 'hx-desc', text: job.desc || job.text || 'Việc vặt quanh phố. Làm xong là có tiền ngay.' }),
      h('div', { class: 'hx-kv' },
        h('span', { text: 'Địa điểm' }), h('span', { text: siteLabel(job) || (t && t.label) || '—' }),
        h('span', { text: 'Khoảng cách' }), h('span', null, distNode(ctx, job)),
        h('span', { text: 'Hạn chót' }), h('span', { text: deadline(job) }),
        h('span', { text: 'Tiền công' }), h('span', { class: 'hx-pay', text: vnd(job.pay) }))),
    h('div', { class: 'hx-btns' },
      active ? h('button', { class: 'hx-btn bad', 'data-act': 'cancel', onclick: () => cancel(ctx) }, 'Hủy việc')
        : h('button', { class: 'hx-btn pri', 'data-act': 'accept', disabled: !!S().job, onclick: () => accept(ctx, job) }, S().job ? 'Đang có việc' : 'Nhận việc'),
      h('button', { class: 'hx-btn', 'data-act': 'gps', onclick: () => gps(ctx, job) }, icon('map-pin', 24), 'Dẫn đường')))
}

export default {
  id: 'jobs', title: 'Việc Vặt 24h', sub: 'Bảng việc quanh phố', icon: 'briefcase',
  open() { sel = null },
  back() { if (sel) { sel = null; return true } return false },
  render(ctx) {
    const st = S(), cur = st.job, board = G().jobs.board() || []
    const root = h('div', { class: 'hx-app' })
    const found = sel && (cur && cur.id === sel ? cur : board.find((j) => j.id === sel))
    if (sel && found) { root.append(detail(ctx, found, !!(cur && cur.id === sel))); return root }
    sel = null
    if (cur) root.append(activeCard(ctx, cur))
    root.append(h('div', { class: 'hx-row sp', style: 'margin:6px 2px' },
      h('span', { class: 'hx-sm', text: `Việc đang chờ (${board.length})` }), h('span', { class: 'hx-sm', text: `Thể lực ${Math.round(st.stamina ?? 0)}` })))
    if (!board.length) root.append(h('div', { class: 'hx-empty' }, icon('briefcase', 48), h('div', { text: 'Chưa có việc mới.' }), h('div', { class: 'hx-sm', text: 'Đi dạo một vòng rồi quay lại xem nhé.' })))
    for (const j of board) {
      root.append(h('button', { class: 'hx-card tap', 'data-job': j.id, onclick: () => { sel = j.id; ctx.sfx('click'); ctx.rerender('top') } },
        h('div', { class: 'hx-row' }, icon(kindIcon(j.kind), 24), h('div', { class: 'hx-grow' }, h('div', { class: 'hx-title', text: j.title }),
          h('div', { class: 'hx-sm' }, siteLabel(j) || '—'), h('div', { class: 'hx-sm' }, 'Cách ', distNode(ctx, j), ' · hạn ', j.deadlineHour != null ? hhmm(j.deadlineHour) : '—')),
          h('span', { class: 'hx-pay', text: vnd(j.pay) }))))
    }
    return root
  },
}

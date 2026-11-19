// Nút "Tự động đi tới (Auto-Walk)" dùng chung (Việc Vặt, Phố Thị Gram) + chip trạng thái nổi "Đang tự đi… [Dừng]".
import { bus } from '../core/bus.js'
import { h, icon } from './theme.js'

let walking = false
const W = () => window.__worldAPI
const live = () => { try { const w = W(); return !!(w && w.isAutoWalking && w.isAutoWalking()) } catch (e) { return false } }
const isWalking = () => walking || live()

function paint(b, on) {
  b.classList.toggle('walking', on)
  b.replaceChildren(icon(on ? 'close' : (b.dataset.ico || 'arrow-right'), 24), h('span', { text: on ? 'Dừng' : (b.dataset.lb || 'Tự động đi tới (Auto-Walk)') }))
}
function sync() {
  const on = isWalking()
  for (const b of document.querySelectorAll('.hx-aw')) paint(b, on)
  const chip = document.getElementById('hx-aw-chip'); if (chip) chip.classList.toggle('on', on)
}
function stop() { try { W().stopAutoWalk && W().stopAutoWalk() } catch (e) { /* bỏ qua */ } walking = false; sync() }

export function initAutoWalk() {
  const chip = h('div', { id: 'hx-aw-chip' }, h('span', { class: 'dot' }), h('span', { text: 'Đang tự đi…' }),
    h('button', { class: 'hx-aw-stop', 'aria-label': 'Dừng tự đi', onclick: stop }, 'Dừng'))
  document.body.append(chip)
  bus.on('autowalk:start', () => { walking = true; sync() })
  bus.on('autowalk:stop', () => { walking = false; sync() })
}

// target: {gx,gy,label?}. ctx: ngữ cảnh phone (toast, sfx, closePhone). opt: {label, icon, cls, act} cho nút riêng (vd "Về nhà").
export function autoWalkButton(ctx, target, opt = {}) {
  const b = h('button', { class: 'hx-btn hx-aw blk' + (opt.cls ? ' ' + opt.cls : ''), 'data-act': opt.act || 'autowalk', 'data-lb': opt.label, 'data-ico': opt.icon, onclick: () => {
    const w = W()
    if (isWalking()) { stop(); ctx.sfx('click'); return }
    if (!w || !w.autoWalk || !target) { ctx.sfx('error'); return ctx.toast('Chưa có bản đồ để tự đi', 'bad') }
    ctx.sfx('click'); walking = true
    ctx.toast('Đang tự đi tới ' + (target.label || 'điểm đến'))
    ctx.closePhone(); sync()
    Promise.resolve(w.autoWalk(target)).then((r) => { if (r === 'nopath') { walking = false; sync(); bus.emit('toast', { msg: 'Không tìm được đường tới đó', kind: 'bad' }) } }, () => { walking = false; sync() })
  } })
  paint(b, isWalking())
  return b
}

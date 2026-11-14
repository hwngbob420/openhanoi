// Khối UI (smartphone-ui-director): HUD gọn, điện thoại 5 app, toast, nút nhạc. API: window.__ui = {openPhone, closePhone, isPhoneOpen}.
// DOM nằm trong #hx-root (ngoài canvas) nên chạm vào giao diện không làm nhân vật di chuyển (player.js chỉ nghe canvas).
import { bus } from '../core/bus.js'
import { h, icon, vnd, hhmm, CSS } from './theme.js'
import { S, hour, day } from './gp.js'
import { createPhone } from './phone.js'

let phone = null

export function init() {
  const style = document.createElement('style'); style.id = 'hx-style'; style.textContent = CSS; document.head.append(style)
  const root = h('div', { id: 'hx-root' })
  const sfx = (name) => { try { bus.emit('sfx', { name }) } catch (e) { /* bỏ qua */ } }

  // ───── toast: nằm dưới HUD (top:96px), tránh toast cũ của player.js (top:18px) ─────
  const toasts = h('div', { id: 'hx-toasts' })
  const toast = (msg, kind) => {
    if (!msg) return
    const t = h('div', { class: 'hx-toast' + (kind ? ' ' + kind : ''), text: String(msg) }); toasts.append(t)
    while (toasts.children.length > 3) toasts.firstChild.remove()
    setTimeout(() => t.remove(), 2800)
  }

  // ───── HUD ─────
  const tTime = h('span'), tMoney = h('span')
  const bar = (cls) => { const i = h('i'); return { box: h('div', { class: 'hx-mini ' + cls }, i), i } }
  const bSt = bar(''), bMd = bar('')
  const hud = h('div', { id: 'hx-hud', 'aria-hidden': 'true' },
    h('div', { class: 'hx-chip' }, icon('clock', 24), tTime),
    h('div', { class: 'hx-chip' }, icon('coins', 24), tMoney),
    h('div', { class: 'hx-chip st', title: 'Thể lực' }, icon('zap', 24), bSt.box),
    h('div', { class: 'hx-chip md', title: 'Tâm trạng' }, icon('smile', 24), bMd.box))
  const setBar = (b, v) => { v = Math.max(0, Math.min(100, +v || 0)); b.i.style.width = v + '%'; b.box.classList.toggle('low', v < 25); b.box.classList.toggle('mid', v >= 25 && v < 50) }
  const refreshHud = () => {
    const s = S()
    tTime.textContent = hhmm(hour()); tMoney.textContent = vnd(s.money ?? 0)
    setBar(bSt, s.stamina); setBar(bMd, s.mood)
    hud.querySelector('.st').title = `Thể lực ${Math.round(s.stamina ?? 0)}`; hud.querySelector('.md').title = `Tâm trạng ${Math.round(s.mood ?? 0)}`
  }

  // ───── điện thoại + nút nổi ─────
  const badge = h('span', { class: 'hx-badge', text: '!' })
  let unseen = 0
  phone = createPhone({ sfx, toast, onOpenChange: (open) => { if (open) { unseen = 0; badge.classList.remove('on') } } })
  const phoneBtn = h('button', { class: 'hx-fab', id: 'hx-btn-phone', 'aria-label': 'Mở điện thoại (P)', onclick: () => { sfx('click'); phone.isOpen ? phone.close() : phone.open() } }, icon('phone', 24), badge)
  const musicFab = h('button', { class: 'hx-fab sm', id: 'hx-btn-music', 'aria-label': 'Bật tắt nhạc', onclick: () => {
    const a = window.__audio; if (!a || !a.musicOn) return
    try { a.resume && a.resume(); a.musicOn(!a.musicOn()) } catch (e) { /* bỏ qua */ }
    refreshMusic()
  } })
  const refreshMusic = () => { let on = false; try { on = !!(window.__audio && window.__audio.musicOn && window.__audio.musicOn()) } catch (e) { /* bỏ qua */ } musicFab.replaceChildren(icon(on ? 'music' : 'volume-x', 24)); musicFab.classList.toggle('off', !on) }
  refreshMusic()
  root.append(hud, h('div', { id: 'hx-dock' }, musicFab, phoneBtn), phone.el, toasts)
  document.body.append(root)

  // ───── sự kiện ─────
  bus.on('toast', (d) => { toast(d && d.msg, d && d.kind); sfx('ting') })
  bus.on('state:changed', () => { refreshHud(); phone.refresh() })
  bus.on('outfit:changed', () => phone.refresh())
  bus.on('world:ready', () => { refreshHud(); refreshMusic(); phone.refresh() })
  for (const ev of ['job:accepted', 'job:arrived', 'job:done', 'job:cancelled', 'money:earn', 'money:spend']) bus.on(ev, () => { refreshHud(); phone.refresh() })
  for (const ev of ['job:arrived', 'job:done']) bus.on(ev, () => { if (!phone.isOpen) { unseen++; badge.textContent = String(unseen); badge.classList.add('on') } })
  bus.on('job:accepted', () => sfx('ting'))
  setInterval(() => { refreshHud(); phone.tick(); refreshMusic() }, 500)
  refreshHud()

  // ───── bàn phím: P bật/tắt, Esc đóng; khi điện thoại mở thì chặn phím lọt xuống nhân vật/world ─────
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
    if (typing) return
    const k = e.key.toLowerCase()
    if (k === 'p') { e.preventDefault(); e.stopPropagation(); phone.isOpen ? phone.close() : phone.open(); return }
    if (!phone.isOpen) return
    if (k === 'escape') { e.preventDefault(); e.stopPropagation(); phone.close(); return }
    if (/^f\d+$/.test(k) || k === 'tab') return
    e.stopPropagation()                                   // WASD/E/F/T/R/Y/H không lọt xuống player.js và world
  }, true)

  window.__ui = {
    openPhone: (app) => phone.open(app), closePhone: () => phone.close(), isPhoneOpen: () => phone.isOpen,
    toast,
  }
}

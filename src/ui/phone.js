// Khung điện thoại: trượt lên từ đáy, màn hình chủ 5 app, thanh trạng thái, nút Quay lại / Chủ.
import { bus } from '../core/bus.js'
import { h, icon, vnd, hhmm, APP_COLORS } from './theme.js'
import { S, hour, day, isMock, distTiles, fmtDist } from './gp.js'
import { autoWalkButton } from './autowalk.js'
import jobs from './apps/jobs.js'
import ride from './apps/ride.js'
import debts from './apps/debts.js'
import shop from './apps/shop.js'
import gram, { trackVisits } from './apps/gram.js'

// nhà người chơi (world thêm site 'home' ở đợt 4; chưa có thì null)
const homeSite = () => { try { const s = window.__worldAPI?.getSites?.('home')?.[0]; return s && Number.isFinite(s.gx) && Number.isFinite(s.gy) ? s : null } catch (e) { return null } }

const APPS = [jobs, ride, debts, shop, gram]
const SHORT = { jobs: 'Việc Vặt 24h', ride: 'Xe Ôm Công Nghệ', debts: 'Sổ Nợ Trả Góp', shop: 'Shop Thời Trang', gram: 'Phố Thị Gram' }

export function createPhone({ sfx, toast, onOpenChange }) {
  trackVisits()
  let isOpen = false, cur = null, lives = [], closeTimer = 0, pending = 0
  const el = h('div', { id: 'hx-phone', role: 'dialog', 'aria-label': 'Điện thoại' })
  const screen = h('div', { class: 'hx-screen' })
  const clock = h('span', { class: 't' }), money = h('span', { class: 'm' })
  const musicBtn = h('button', { class: 'hx-sbtn', 'aria-label': 'Bật tắt nhạc', onclick: () => toggleMusic() })
  const closeBtn = h('button', { class: 'hx-sbtn', 'aria-label': 'Đóng điện thoại', 'data-act': 'close', onclick: () => api.close() }, icon('close', 24))
  const body = h('div', { class: 'hx-body' })
  const backBtn = h('button', { 'data-act': 'back', onclick: () => api.back() }, icon('chevron-left', 24), 'Quay lại')
  const homeBtn = h('button', { 'data-act': 'home', onclick: () => api.home() }, icon('home', 24), 'Chủ')
  screen.append(h('div', { class: 'hx-status' }, clock, money, musicBtn, closeBtn), body, h('div', { class: 'hx-nav' }, backBtn, homeBtn))
  el.append(screen)

  const ctx = {
    toast, sfx,
    say: (m, k) => { if (isMock()) toast(m, k) },   // gameplay thật đã tự báo qua bus 'toast'; chỉ bản giả mới cần UI tự báo
    closePhone: () => api.close(),
    live: (fn) => lives.push(fn),
    rerender: (mode) => render(mode === 'top'),
  }

  function toggleMusic() {
    const a = window.__audio; if (!a || !a.musicOn) return
    try { a.resume && a.resume(); a.musicOn(!a.musicOn()) } catch (e) { /* bỏ qua */ }
    sfx('click'); refreshStatus()
  }
  function refreshStatus() {
    clock.textContent = `${hhmm(hour())} · Ngày ${day()}`
    money.textContent = vnd(S().money ?? 0)
    let on = true; try { on = window.__audio && window.__audio.musicOn ? !!window.__audio.musicOn() : false } catch (e) { on = false }
    musicBtn.replaceChildren(icon(on ? 'music' : 'volume-x', 24)); musicBtn.classList.toggle('off', !on)
  }

  function homeView() {
    const root = h('div', { class: 'hx-home' }, h('h2', { text: 'Hà Nội Pixel' }), h('div', { class: 'sub', text: `${hhmm(hour())} · Ngày ${day()} · chạm app để mở` }))
    const grid = h('div', { class: 'hx-grid' })
    for (const a of APPS) grid.append(h('button', { class: 'hx-tile', 'data-app': a.id, onclick: () => { sfx('click'); api.open(a.id) } },
      h('span', { class: 'ico', style: 'background:' + APP_COLORS[a.id] }, icon(a.icon, 36)), h('span', { class: 'lb', text: SHORT[a.id] })))
    const tired = (+S().stamina || 0) < 25 && S().stamina != null
    const homeCard = homeWalkCard(tired)
    if (tired) root.append(homeCard, grid); else root.append(grid, homeCard)
    if (isMock()) root.append(h('span', { class: 'hx-demo', text: 'Dữ liệu giả (gameplay chưa nối)' }))
    return root
  }
  // thẻ "Về nhà (Auto-Walk)": nổi lên đầu màn hình chủ khi thể lực thấp, kèm gợi ý nghỉ / ăn
  function homeWalkCard(tired) {
    const s = homeSite()
    const card = h('div', { class: 'hx-card hx-homecard' + (tired ? ' tired' : '') })
    if (tired) card.append(h('div', { class: 'hx-tiredtip' }, icon('zap', 24), h('span', { text: 'Thể lực thấp! Về phòng trọ nghỉ hoặc đi ăn phở.' })))
    const d = s ? distTiles(s) : null
    card.append(h('div', { class: 'hx-row sp' }, h('span', { class: 'hx-title', text: s ? (s.label || 'Phòng trọ của bạn') : 'Phòng trọ của bạn' }), s ? h('span', { class: 'hx-sm', 'data-live': 'homedist', text: fmtDist(d) }) : null))
    if (s) {
      card.append(autoWalkButton(ctx, { ...s, label: s.label || 'nhà' },{ label: 'Về nhà (Auto-Walk)', icon: 'home', cls: 'pri', act: 'gohome' }))
      ctx.live(() => { const e = card.querySelector('[data-live=homedist]'); if (e) e.textContent = fmtDist(distTiles(s)) })
    } else {
      card.append(h('button', { class: 'hx-btn blk pri', 'data-act': 'gohome', disabled: true, style: 'margin-top:8px' }, icon('home', 24), h('span', { text: 'Về nhà (Auto-Walk)' })),
        h('div', { class: 'hx-sm', style: 'margin-top:6px', text: 'Chưa tìm thấy phòng trọ trên bản đồ.' }))
    }
    return card
  }
  function appView(a) {
    const root = h('div', null, h('div', { style: 'padding:10px 10px 0' }, h('div', { class: 'hx-head' },
      h('span', { class: 'ico', style: 'background:' + APP_COLORS[a.id] }, icon(a.icon, 24)), h('div', { class: 'tt' }, h('b', { text: a.title }), h('span', { text: a.sub })))))
    root.append(a.render(ctx))
    return root
  }
  function render(top) {
    if (!isOpen) return
    const keep = body.scrollTop
    lives = []
    let view
    try { view = cur ? appView(cur) : homeView() } catch (e) { console.error('[ui] render', e); (window.__stats ||= { errors: [] }).errors.push('ui render: ' + (e && e.stack || e)); view = h('div', { class: 'hx-empty', text: 'Ứng dụng gặp lỗi, thử lại sau nhé.' }) }
    body.replaceChildren(view)
    body.scrollTop = top ? 0 : keep
    backBtn.disabled = !cur
    refreshStatus()
  }
  function schedule() { if (!isOpen || pending) return; pending = requestAnimationFrame(() => { pending = 0; render(false) }) }

  const api = {
    el, get isOpen() { return isOpen },
    open(appId) {
      cur = appId ? APPS.find((a) => a.id === appId) || null : null
      if (cur && cur.open) cur.open()
      const was = isOpen
      isOpen = true; clearTimeout(closeTimer)
      render(true)
      if (!was) { el.classList.add('open'); el.classList.remove('closing'); document.body.classList.add('hx-open'); onOpenChange(true); bus.emit('phone:open') }
    },
    close() {
      if (!isOpen) return
      isOpen = false; el.classList.remove('open'); el.classList.add('closing'); document.body.classList.remove('hx-open')
      closeTimer = setTimeout(() => el.classList.remove('closing'), 320)
      onOpenChange(false); bus.emit('phone:close')
    },
    home() { if (!isOpen) return; sfx('click'); cur = null; render(true) },
    back() {
      if (!isOpen) return
      if (cur && cur.back && cur.back()) { sfx('click'); return render(true) }
      sfx('click'); cur = null; render(true)
    },
    // làm tươi nhẹ: đồng hồ, tiền, khoảng cách
    tick() { if (!isOpen) return; refreshStatus(); for (const f of lives) { try { f() } catch (e) { /* bỏ qua */ } } },
    refresh: schedule,
    notify(msg, kind) {
      screen.querySelectorAll('.hx-notify').forEach((n) => n.remove())
      const n = h('div', { class: 'hx-notify' + (kind ? ' ' + kind : ''), text: String(msg) }); screen.append(n); setTimeout(() => n.remove(), 2600)
    },
  }
  return api
}

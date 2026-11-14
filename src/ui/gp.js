// Cầu nối giữa UI và các khối khác. UI KHÔNG tự sửa State: mọi hành động đi qua window.__gameplay.
// Khi gameplay chưa có (đang phát triển song song) thì dùng bản giả `mock` nằm riêng trong file này (không gán window.__gameplay).
import { bus } from '../core/bus.js'

const clone = (o) => JSON.parse(JSON.stringify(o))
const W = () => window.__worldAPI
const CH = () => window.__characters

// ───────── bản giả ─────────
const mock = (() => {
  const base = window.__state ? clone(window.__state) : { money: 150000, stamina: 100, mood: 70, day: 1, hour: 8, outfit: { hair: 0, top: 0, pants: 0 }, owned: { hair: [0], top: [0], pants: [0] }, job: null, board: [], debts: [] }
  const st = { ...base, board: [], debts: [{ id: 'd1', name: 'Trả góp điện thoại', total: 6000000, per: 500000, paid: 1500000, nextDay: 3 }, { id: 'd2', name: 'Tiền trọ ngõ nhỏ', total: 3000000, per: 1000000, paid: 0, nextDay: 1 }] }
  let seeded = false
  const seed = () => {
    if (seeded) return; const sites = W() ? W().getSites('any') : []; if (!sites.length) return; seeded = true
    const pick = (i) => sites[(i * 7 + 3) % sites.length]
    st.board = [
      { id: 'm1', kind: 'ship', title: 'Giao hộp bún chả nóng', siteId: pick(1).id, pay: 45000, deadlineHour: (hour() + 2) % 24, stage: 'goto', desc: 'Khách ở tầng 3 không thang máy. Nhớ lấy thêm nước chấm.' },
      { id: 'm2', kind: 'pho', title: 'Bưng phở giờ cao điểm', siteId: pick(2).id, pay: 60000, deadlineHour: (hour() + 3) % 24, stage: 'goto', desc: 'Quán đông, bưng nhanh kẻo nguội.' },
      { id: 'm3', kind: 'hair', title: 'Gội đầu giúp tiệm tóc', siteId: pick(3).id, pay: 38000, deadlineHour: (hour() + 5) % 24, stage: 'goto', desc: 'Khách quen, hay kể chuyện.' },
      { id: 'm4', kind: 'rail', title: 'Chụp ảnh khách Phố Tàu', siteId: pick(4).id, pay: 80000, deadlineHour: (hour() + 7) % 24, stage: 'goto', desc: 'Nhớ chụp lúc tàu qua.' },
    ]
  }
  const ping = (key) => bus.emit('state:changed', { key })
  const api = {
    mock: true, state: st,
    earn(n) { st.money += n; ping('money') },
    spend(n) { if (st.money < n) return false; st.money -= n; ping('money'); return true },
    jobs: {
      board() { seed(); return st.board.slice() },
      accept(id) { if (st.job) return false; const i = st.board.findIndex((j) => j.id === id); if (i < 0) return false; st.job = st.board.splice(i, 1)[0]; ping('job'); return true },
      cancel() { if (!st.job) return false; st.board.push(st.job); st.job = null; ping('job'); return true },
    },
    buy(kind, i) { const o = CH().OUTFIT_OPTIONS[kind][i]; if (!o || st.owned[kind].includes(i)) return false; if (!api.spend(o.price)) return false; st.owned[kind].push(i); return true },
    equip(kind, i) { if (!st.owned[kind].includes(i)) return false; st.outfit[kind] = i; ping('outfit'); return true },
    eat() { return false },
    debts: {
      list() { return st.debts.slice() },
      pay(id) { const d = st.debts.find((x) => x.id === id); if (!d || d.paid >= d.total || !api.spend(d.per)) return false; d.paid = Math.min(d.total, d.paid + d.per); d.nextDay += 3; ping('debts'); return true },
    },
  }
  return api
})()

export const G = () => window.__gameplay || mock
export const isMock = () => !window.__gameplay
export const S = () => G().state || window.__state || {}

// ───────── thế giới ─────────
export const hour = () => { try { const h = W()?.getHour?.(); if (Number.isFinite(h)) return h } catch (e) { /* chưa sẵn sàng */ } return S().hour ?? 8 }
export const day = () => { try { const d = W()?.getDay?.(); if (Number.isFinite(d)) return d } catch (e) { /* chưa sẵn sàng */ } return S().day ?? 1 }
export const playerPos = () => { try { return W()?.getPlayer?.() || null } catch (e) { return null } }
export const sites = () => { try { return W()?.getSites?.('any') || [] } catch (e) { return [] } }
export const pois = () => { try { return W()?.getPois?.() || [] } catch (e) { return [] } }
export const distTiles = (t) => { const p = playerPos(); return p && t ? Math.hypot(t.gx - p.gx, t.gy - p.gy) : null }
export const fmtDist = (d) => (d == null ? '—' : d < 1 ? 'ngay đây' : d < 250 ? `${Math.round(d * 4)} m` : `${(d * 4 / 1000).toFixed(1)} km`)

// đích của một việc (siteId -> sites; hoặc job.target/gx,gy)
export function jobTarget(job) {
  if (!job) return null
  const t = job.target || job
  if (Number.isFinite(t.gx) && Number.isFinite(t.gy)) return { gx: t.gx, gy: t.gy, id: job.siteId || job.id, label: t.label || job.siteLabel || job.title }
  const s = sites().find((x) => x.id === job.siteId)
  return s ? { gx: s.gx, gy: s.gy, id: s.id, label: s.label } : null
}
export const siteLabel = (job) => { const s = sites().find((x) => x.id === job?.siteId); return job?.siteLabel || s?.label || job?.siteId || '' }

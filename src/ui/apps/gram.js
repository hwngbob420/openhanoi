// App Phố Thị Gram: feed check-in vui các địa danh. Thích bài tăng tâm trạng nhẹ qua API gameplay (nếu có), không thì chỉ hiển thị.
import { h, icon } from '../theme.js'
import { G, pois, distTiles, fmtDist } from '../gp.js'
import { bus } from '../../core/bus.js'

const CAP = {
  bridge: ['Cầu Thê Húc đỏ rực, check-in cái rồi đi ăn kem Tràng Tiền!', '#caudo #hoguom'],
  temple: ['Đền Ngọc Sơn yên bình giữa hồ. Xin một quẻ may mắn, cầu cho ví đầy.', '#ngocson'],
  gate: ['Ô Quan Chưởng: cổng thành cuối cùng của Thăng Long. Xe máy vẫn lách qua ngon lành.', '#oquanchuong'],
  walkstreet: ['Phố đi bộ cuối tuần: guitar, bong bóng và kem cây. Đời vẫn đẹp.', '#phidibo'],
  traincafe: ['Cà phê đường tàu: ly cà phê trứng này đáng để chờ tàu ba phút.', '#cafeduongtau'],
  market: ['Chợ phố cổ: mặc cả thành công, được tặng thêm mớ rau thơm.', '#chophoco'],
  play: ['Khu vui chơi sắp mở cửa, hóng quá trời!', '#sapmocua'],
  park: ['Công viên sáng sớm: bác tập dưỡng sinh, cháu tập ngồi nhìn.', '#congvien'],
  glass: ['Khu cao ốc kính lấp lánh. Lương tháng sau chắc mua nổi một viên gạch.', '#caoc'],
  ngo: ['Ngõ ngoằn nghèo: Google Maps cũng xin đầu hàng. Phở bò tái ở cuối ngõ.', '#ngonho'],
  rail: ['Phố tàu hỏa: tàu qua là cả phố nín thở, ai cũng giơ điện thoại.', '#photauhoa'],
}
const USERS = ['bac_xichlo', 'co_Lan_pho', 'hanoi.lac.duong', 'mit_uot_review', 'em_gai_ngo_nho', 'anh_shipper_say']
const HUES = ['#e8704a', '#35c4b0', '#8b7bff', '#e86bb0', '#ffb62e', '#5fa8e8', '#62d894']
const hash = (s) => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x }
const LS = 'hanoi.ui.gram'
let mem = null
const store = () => {
  if (mem) return mem
  try { mem = JSON.parse(localStorage.getItem(LS) || 'null') } catch (e) { mem = null }
  return (mem ||= { visited: [], liked: [] })
}
const save = () => { try { localStorage.setItem(LS, JSON.stringify(mem)) } catch (e) { /* bỏ qua */ } }
export function trackVisits() { bus.on('poi:interact', (d) => { const id = d && d.poi && d.poi.id; if (id && !store().visited.includes(id)) { store().visited.push(id); save() } }) }

function like(ctx, p) {
  const s = store(), on = s.liked.includes(p.id)
  if (on) s.liked = s.liked.filter((x) => x !== p.id)
  else {
    s.liked.push(p.id)
    const g = G()
    try { if (typeof g.like === 'function') g.like(p.id); else if (typeof g.addMood === 'function') g.addMood(1, 'gram') } catch (e) { console.error('[ui] like', e) }
    ctx.sfx('pop')
  }
  save(); ctx.rerender(true)
}

export default {
  id: 'gram', title: 'Phố Thị Gram', sub: 'Check-in Hà Nội', icon: 'camera',
  render(ctx) {
    const root = h('div', { class: 'hx-app' })
    const s = store()
    const list = pois().filter((p) => !/sắp mở/i.test(p.label) || CAP[p.id]).map((p) => ({ p, seen: s.visited.includes(p.id) }))
    list.sort((a, b) => (b.seen - a.seen) || (hash(a.p.id) - hash(b.p.id)))
    if (!list.length) root.append(h('div', { class: 'hx-empty' }, icon('camera', 48), h('div', { text: 'Chưa có bài đăng nào.' })))
    for (const { p, seen } of list) {
      const k = hash(p.id), hue = HUES[k % HUES.length], cap = CAP[p.id] || [`Ghé ${p.label} một chuyến, vui phết.`, '#hanoipixel']
      const liked = s.liked.includes(p.id), n = 12 + (k % 180) + (liked ? 1 : 0)
      const user = seen ? 'Bạn' : USERS[k % USERS.length]
      const d = distTiles(p)
      root.append(h('div', { class: 'hx-post', 'data-post': p.id },
        h('div', { class: 'ph', style: `background:linear-gradient(135deg,${hue},#1b2138)` }, icon('image', 24), h('b', { style: 'font-weight:400;font-size:24px', text: p.label })),
        h('div', { class: 'pb' },
          h('div', { class: 'hx-row' }, h('span', { class: 'hx-av', style: 'background:' + hue, text: user[0].toUpperCase() }),
            h('div', { class: 'hx-grow' }, h('div', { class: 'hx-title', text: user }), h('div', { class: 'hx-sm', text: seen ? 'Đã check-in tại ' + p.label : 'Cách bạn ' + fmtDist(d) }))),
          h('p', { class: 'hx-desc', text: cap[0] }), h('div', { class: 'hx-sm', text: cap[1] }),
          h('div', { class: 'hx-row sp', style: 'margin-top:4px' },
            h('button', { class: 'hx-like' + (liked ? ' on' : ''), 'data-act': 'like', onclick: () => like(ctx, p) }, icon('heart', 24), String(n)),
            h('button', { class: 'hx-btn', style: 'min-height:44px', onclick: () => { try { window.__worldAPI.setGps(p) } catch (e) { return } ctx.sfx('click'); ctx.toast('Đã bật chỉ đường: ' + p.label); ctx.closePhone() } }, icon('map-pin', 24), 'Dẫn đường')))))
    }
    return root
  },
}

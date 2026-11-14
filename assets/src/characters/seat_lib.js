// Thư viện vẽ người ngồi xe máy (paper-doll) bằng cùng lõi isometric của thế giới (core.js + vehicles.js nối trước file này).
// Mỗi sprite có CÙNG kích thước và tâm với mo_<màu>_<hướng> của thế giới (44x76, pivot như manifest) nên thay thế trực tiếp được.
// Lớp: back (thân xe phía sau người) -> legs -> torso (thân + tay) -> head (đầu, da) -> hair -> front (tay lái, đầu xe che trước).
// KHÔNG viền ở đây: viền (dark 0.5 màu kề) được vẽ lúc chạy trên ảnh đã ghép, để các lớp ăn khớp.
DRAW.seat = (cv, s, I) => {
  const { B, parts } = vehBuilder(s), L = s.L, c = s.col
  const WHEEL = { top: '#3a4556', left: '#262d3a', right: '#1c1822' }
  const TAIL = { top: '#e0463a', left: '#d4382c', right: '#a3202a' }
  const tagOf = new Map()
  const grp = (name, fn) => { const n = parts.length; fn(); for (let i = n; i < parts.length; i++) tagOf.set(parts[i], name) }
  grp('bike', () => {
    B(2, 9, 4, 6, 0, 9, null, WHEEL); B(L - 8, L - 2, 4, 6, 0, 9, null, WHEEL)
    B(7, L - 8, 3, 7, 5, 10, null, faceCols(dark(c, 0.15)))
    B(L - 12, L - 3, 2, 8, 9, 17, null, faceCols(c))
    B(L - 5, L - 4, 0, 10, 16, 18, null, faceCols('#23252b'))
    B(5, 14, 3, 7, 10, 12, null, faceCols('#23252b'))
    B(-1, 2, 4, 6, 8, 10, null, TAIL)
  })
  const pantsC = s.pants, topC = s.top, skin = '#f0c49a'
  grp('legs', () => B(8, 15, 2, 8, 11, 17, null, faceCols(pantsC)))
  grp('torso', () => {
    B(6, 13, 3, 7, 17, 27, null, faceCols(topC))
    if (s.long) { B(L - 13, L - 6, 1, 3, 17, 25, null, faceCols(topC)); B(L - 13, L - 6, 7, 9, 17, 25, null, faceCols(topC)) }
    else {
      B(L - 13, L - 6, 1, 3, 17, 22, null, faceCols(skin)); B(L - 13, L - 6, 7, 9, 17, 22, null, faceCols(skin))
      B(L - 13, L - 10, 1, 3, 22, 25, null, faceCols(topC)); B(L - 13, L - 10, 7, 9, 22, 25, null, faceCols(topC))
    }
    if (s.hood) B(6, 8.5, 3, 7, 27, 29, null, faceCols(dark(topC, 0.15)))
  })
  grp('head', () => {
    B(6, 13, 2.5, 7.5, 27, 33, null, faceCols(skin))
    B(12.6, 13.4, 3, 7, 28.5, 29.5, null, faceCols('#d4a07a'))                       // mũi/miệng mờ
    B(12.6, 13.4, 3.4, 4.2, 30, 31, null, faceCols('#1c1a1f')); B(12.6, 13.4, 5.8, 6.6, 30, 31, null, faceCols('#1c1a1f'))   // mắt
  })
  grp('hair', () => {
    B(5.5, 13.5, 2, 8, 33, 35.5, null, faceCols(s.hair))
    B(5.5, 9.5, 2, 8, 27, 33, null, faceCols(s.hair))
    B(9.5, 13.5, 2, 3, 30, 33, null, faceCols(s.hair)); B(9.5, 13.5, 7, 8, 30, 33, null, faceCols(s.hair))
    B(12, 13.7, 3, 7.5, 32.2, 33.5, null, faceCols(dark(s.hair, 0.12)))              // mái
  })
  // thứ tự vẽ chuẩn của thế giới
  const cmp = (a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]
  const torso = parts.find((p) => tagOf.get(p) === 'torso')
  const sorted = parts.slice().sort(cmp)
  const pick = (name) => {
    if (name === 'back') return sorted.filter((p) => tagOf.get(p) === 'bike' && cmp(p, torso) <= 0)
    if (name === 'front') return sorted.filter((p) => tagOf.get(p) === 'bike' && cmp(p, torso) > 0)
    return sorted.filter((p) => tagOf.get(p) === name)
  }
  const want = s.layer === 'all' ? ['back', 'legs', 'torso', 'head', 'hair', 'front'] : [s.layer]
  for (const w of want) for (const p of pick(w)) { const [x0, y0, z0, x1, y1, z1, col, cols] = p; I.box(x0, y0, z0, x1, y1, z1, col, cols) }
}

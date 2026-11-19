// ───────── người chibi 14x26 (cùng tỷ lệ nhân vật/NPC thế giới: thêm viền => 16x28, chân ở hàng 26) ─────────
// person(cv, bx, by, look, pose): (bx,by) = góc trên-trái hộp 14x26. Không viền — viền vẽ sau cho cả sprite.
// look: { skin, hair:[a,hl], hs:'short'|'long'|'bun'|'bald', hat:null|'nonla'|'helmet'|'cap'|'pith'|'band', hatC,
//         top:[a,b,c], ts:'tee'|'long'|'baba'|'shirt'|'tank'|'jacket', pants:[a,b], ps:'long'|'short'|'skirt', shoe:[a,b], bag, beard }
// pose: { dir:'down'|'up'|'right', f:0..3 (bước), legs:'walk'|'squat'|'sit'|'run', aL, aR (tay: down|up|out|dl|du|hip|cup|fwd|wave|chin), U (hạ thân), lean (đầu lệch ngang) }
// MÀU KHOÁ (để thế giới đổi màu như NPC_LOOK): áo #3a8f8a/#2a6a6c/#6cc1b0, quần #3d4c7a/#2b3558, tóc #2b2230/#443449, túi #b5733f/#7d4a28.
const SKIN = ['#f0c49a', '#c98e68', '#f7d6b4']
const SKIN2 = ['#d9a67a', '#a8744e', '#e8bf98']
const SKIN3 = ['#f6d7bd', '#d8a585', '#fde8d6']
const EYE = '#1c1a1f'
const KEY = { top: ['#3a8f8a', '#2a6a6c', '#6cc1b0'], pants: ['#3d4c7a', '#2b3558'], hair: ['#2b2230', '#443449'], bag: ['#b5733f', '#7d4a28'] }
const SHOE = ['#efe6d2', '#b9ae96']
const HEADC = [[3, 10], [2, 11], [1, 12], [1, 12], [1, 12], [1, 12], [1, 12], [1, 12], [2, 11], [2, 11], [3, 10]]
const SIDEH = ['...aaaaaa.....', '..aaaaaaaa....', '..aaaaaaaaa...', '..aaaaaaaaa...', '..aaaaaaaaa...', '..aaaaaaaaaa..', '..aaaaaaaaaa..', '..aaaaaaaaaa..', '...aaaaaaaa...', '....aaaaaa....', '.....aaaa.....']

// tay nhìn trước (bên TRÁI màn hình), toạ độ cục bộ hộp; bên phải = lật x' = 13 - x. Mỗi mục: [x, y, loại] loại: s=tay áo, k=da, h=bàn tay
const ARM = {
  down: (long) => { const o = []; for (let y = 11; y <= 19; y++) { const t = y >= 18 ? 'h' : (long ? y <= 17 : y <= 14) ? 's' : 'k'; o.push([0, y, t], [1, y, t === 'h' ? 'h' : t + 'i']) } return o },
  up: (long) => { const o = []; for (let y = -1; y <= 12; y++) { const t = y <= 0 ? 'h' : (long ? y >= 3 : y >= 9) ? 's' : 'k'; o.push([-1, y, t], [0, y, t === 'h' ? 'h' : t + 'i']) } return o },
  out: (long) => { const o = []; for (let x = -5; x <= 1; x++) { const t = x <= -5 ? 'h' : (long ? x >= -3 : x >= -1) ? 's' : 'k'; o.push([x, 11, t], [x, 12, t === 'h' ? 'h' : t + 'i']) } return o },
  dl: (long) => [[0, 11, 's'], [1, 11, 'si'], [0, 12, 's'], [1, 12, 'si'], [-1, 13, long ? 's' : 'k'], [0, 13, long ? 'si' : 'ki'], [-1, 14, long ? 's' : 'k'], [0, 14, long ? 'si' : 'ki'], [-2, 15, 'k'], [-1, 15, 'ki'], [-2, 16, 'k'], [-1, 16, 'ki'], [-3, 17, 'h'], [-2, 17, 'h']],
  du: (long) => [[0, 11, 's'], [1, 11, 'si'], [0, 10, 's'], [1, 10, 'si'], [-1, 9, long ? 's' : 'k'], [0, 9, long ? 'si' : 'ki'], [-1, 8, long ? 's' : 'k'], [0, 8, 'ki'], [-2, 7, 'k'], [-1, 7, 'ki'], [-2, 6, 'k'], [-1, 6, 'ki'], [-3, 5, 'h'], [-2, 5, 'h'], [-3, 4, 'h']],
  hip: (long) => [[0, 11, 's'], [1, 11, 'si'], [0, 12, 's'], [1, 12, 'si'], [-1, 13, long ? 's' : 'k'], [0, 13, long ? 'si' : 'ki'], [-1, 14, long ? 's' : 'k'], [0, 14, 'ki'], [-1, 15, 'k'], [0, 15, 'ki'], [0, 16, 'h'], [1, 16, 'h'], [1, 17, 'h']],
  fwd: (long) => [[0, 11, 's'], [1, 11, 'si'], [0, 12, 's'], [1, 12, 'si'], [0, 13, long ? 's' : 'k'], [1, 13, long ? 'si' : 'ki'], [1, 14, 'k'], [2, 14, 'h'], [2, 15, 'h'], [3, 15, 'h'], [3, 14, 'h']],
  cup: (long) => [[0, 11, 's'], [1, 11, 'si'], [0, 12, 's'], [1, 12, 'si'], [1, 13, long ? 's' : 'k'], [2, 13, long ? 'si' : 'ki'], [2, 12, 'k'], [3, 11, 'k'], [3, 10, 'h'], [4, 10, 'h'], [4, 9, 'h'], [5, 9, 'C'], [6, 9, 'C'], [5, 8, 'T'], [6, 8, 'T'], [5, 10, 'C'], [6, 10, 'C']],
  hold: (long) => [[0, 11, 's'], [1, 11, 'si'], [0, 12, 's'], [1, 12, 'si'], [1, 13, long ? 's' : 'k'], [2, 13, long ? 'si' : 'ki'], [2, 14, 'k'], [3, 14, 'h'], [4, 14, 'h'], [3, 15, 'C'], [4, 15, 'C'], [3, 16, 'C'], [4, 16, 'C'], [3, 13, 'T'], [4, 13, 'T']],
  chin: (long) => [[0, 11, 's'], [1, 11, 'si'], [0, 12, 's'], [1, 12, 'si'], [1, 13, long ? 's' : 'k'], [2, 13, 'ki'], [2, 12, 'k'], [3, 11, 'k'], [3, 10, 'h'], [4, 10, 'h']],
  wave: (long) => [[0, 11, 's'], [1, 11, 'si'], [-1, 10, long ? 's' : 'k'], [0, 10, 'ki'], [-1, 9, 'k'], [-2, 8, 'k'], [-1, 8, 'ki'], [-2, 7, 'h'], [-3, 6, 'h'], [-2, 6, 'h'], [-3, 5, 'h']],
}

function person(cv, bx, by, L, o) {
  const dir = o.dir || 'down', f = o.f || 0, U = o.U || 0, lean = o.lean || 0
  const S = (x, y, c) => cv.set(bx + x, by + y, c)
  const Rr = (x, y, w, h, c) => cv.rect(bx + x, by + y, w, h, c)
  const H = (x0, x1, y, c) => cv.rect(bx + x0, by + y, x1 - x0 + 1, 1, c)
  const sk = L.skin || SKIN, tp = L.top, pa = L.pants, shoe = L.shoe || SHOE, hr = L.hair || KEY.hair
  const long = L.ts === 'long' || L.ts === 'shirt' || L.ts === 'jacket' || L.ts === 'baba'
  const legs = o.legs || 'walk'
  const paHi = (t) => (pa === KEY.pants ? pa[0] : hi(pa[0], t))          // màu khoá: không sinh tông lạ (thế giới recolor được)
  const sit = legs === 'sit'
  const SU = sit ? 3 : 0                     // ngồi: cả thân trên hạ 3 hàng
  const UU = U + SU
  // ===== chân =====
  if (legs === 'none') { /* chân vẽ riêng (người đạp xích lô) */ }
  else if (dir !== 'right') {
    if (sit) {
      // đùi chĩa về phía người xem (nhìn trước) / bị lưng che (nhìn sau)
      if (dir === 'down') {
        H(1, 12, 21 + U, pa[0]); H(1, 12, 22 + U, pa[0]); S(6, 21 + U, pa[1]); S(7, 21 + U, pa[1]); S(6, 22 + U, pa[1]); S(7, 22 + U, pa[1])
        H(2, 5, 21 + U, paHi(0.15)); H(8, 11, 21 + U, paHi(0.15))
        if (L.ps === 'short' || L.ps === 'skirt') { Rr(2, 23, 3, 2, sk[0]); Rr(9, 23, 3, 2, sk[0]); S(4, 23, sk[1]); S(9, 23, sk[1]) }
        else { Rr(2, 23, 3, 2, pa[0]); Rr(9, 23, 3, 2, pa[0]); S(4, 23, pa[1]); S(9, 23, pa[1]) }
        H(1, 4, 25, shoe[0]); H(9, 12, 25, shoe[0]); S(4, 25, shoe[1]); S(9, 25, shoe[1])
      } else {
        H(2, 11, 23, pa[1]); H(1, 4, 25, shoe[1]); H(9, 12, 25, shoe[1])
      }
    } else {
      let lift = [f === 1, f === 3]
      if (legs === 'run') lift = [f === 0 || f === 1, f === 2 || f === 3]
      const squat = legs === 'squat'
      const hipY = 20 + U
      H(1, 12, hipY, pa[0]); H(1, 12, hipY + 1, pa[0]); S(1, hipY, pa[1]); S(12, hipY, pa[1]); H(1, 12, hipY + 1, pa[1]); H(2, 11, hipY + 1, pa[0]); S(6, hipY + 1, pa[1]); S(7, hipY + 1, pa[1])
      if (L.ps === 'skirt') { H(0, 13, hipY + 1, pa[0]); H(0, 13, hipY + 2, pa[1]); H(1, 12, hipY + 2, pa[0]); S(4, hipY + 1, pa[1]); S(9, hipY + 1, pa[1]) }
      const legSet = squat ? [[1, 4, false], [9, 12, false]] : [[2, 5, lift[0]], [8, 11, lift[1]]]
      legSet.forEach(([x0, x1, up], i) => {
        const top = hipY + 2, end = (up ? 23 : 24), sy = up ? 24 : 25
        for (let y = top; y <= end; y++) {
          const bare = (L.ps === 'short' && y >= top + 2) || (L.ps === 'skirt' && y >= top + 1)
          const c = bare ? sk : pa
          H(x0, x1, y, c[0]); S(i === 0 ? x1 : x0, y, c[1])
        }
        if (dir === 'down') { H(i === 0 ? x0 - 1 : x0, i === 0 ? x1 : x1 + 1, sy, shoe[0]); S(i === 0 ? x1 : x1 + 1, sy, shoe[1]) }
        else H(x0, x1, sy, shoe[1])
      })
    }
  } else {
    // nhìn ngang (hướng phải)
    if (sit) {
      H(4, 11, 20 + U, pa[0]); H(4, 11, 21 + U, pa[1]); H(5, 10, 20 + U, paHi(0.12))
      const shin = L.ps === 'long' || !L.ps ? pa : sk
      Rr(10, 22, 2, 3, shin[0]); S(10, 22, shin[1]); S(10, 23, shin[1])
      H(10, 12, 25, shoe[0]); S(12, 25, shoe[1])
    } else if (legs === 'run') {
      const hipY = 20 + U
      H(4, 9, hipY, pa[0]); H(4, 9, hipY + 1, pa[1]); H(5, 9, hipY, pa[0])
      const bare = L.ps === 'short'
      const P2 = (x, y, back) => { const c = (bare && y >= hipY + 3) ? sk : pa; S(x, y, back ? c[1] : c[0]) }
      // f0: chân trước duỗi, chân sau đá ra sau; f1: chân trước nhấc gối; f2/f3 đổi chân
      const frames = [
        { a: [[7, 22], [8, 22], [8, 23], [9, 23], [9, 24], [10, 24]], as: [[9, 25], [10, 25], [11, 25]], b: [[4, 22], [5, 22], [3, 23], [4, 23], [2, 24], [3, 24]], bs: [[1, 24], [2, 25], [1, 25]] },
        { a: [[7, 22], [8, 22], [9, 22], [9, 23], [10, 23], [9, 24]], as: [[9, 24], [10, 24], [11, 24]], b: [[5, 22], [6, 22], [5, 23], [6, 23], [5, 24], [6, 24]], bs: [[5, 25], [6, 25], [7, 25]] },
      ]
      const fr = frames[f % 2], swap = f >= 2
      const near = swap ? fr.b : fr.a, nearS = swap ? fr.bs : fr.as, far = swap ? fr.a : fr.b, farS = swap ? fr.as : fr.bs
      for (const [x, y] of far) P2(x, y, true); for (const [x, y] of farS) S(x, y, shoe[1])
      for (const [x, y] of near) P2(x, y, false); for (const [x, y] of nearS) S(x, y, shoe[0])
    } else {
      const k = [0, 1, 0, 2][f]
      const hipY = 20 + U
      H(4, 9, hipY, pa[0]); H(4, 9, hipY + 1, pa[1]); H(5, 9, hipY, pa[0]); S(4, hipY, pa[1])
      if (L.ps === 'skirt') { H(3, 10, hipY + 1, pa[0]); H(3, 10, hipY + 2, pa[1]) }
      const LG = k === 0 ? [[4, 5, true, 4, 10], [6, 8, false, 4, 10, true]] : k === 1 ? [[2, 4, true, 2, 5], [7, 9, false, 7, 10]] : [[3, 5, false, 3, 6], [8, 10, true, 8, 11]]
      for (const [x0, x1, back, sx0, sx1, shoeOnly] of LG) {
        if (!shoeOnly) for (let y = hipY + 2; y <= 24; y++) { const bare = (L.ps === 'short' && y >= hipY + 4) || (L.ps === 'skirt' && y >= hipY + 3); const c = bare ? sk : pa; H(x0, x1, y, back ? c[1] : c[0]) }
        H(sx0, sx1, 25, back ? shoe[1] : shoe[0])
      }
      if (k === 0) { for (let y = hipY + 2; y <= 24; y++) { const bare = (L.ps === 'short' && y >= hipY + 4) || (L.ps === 'skirt' && y >= hipY + 3); H(6, 8, y, (bare ? sk : pa)[0]) } H(4, 10, 25, shoe[0]) }
    }
  }
  // ===== thân + tay =====
  const armPx = (kind, side) => {
    const fn = ARM[kind] || ARM.down
    for (const [x, y, t] of fn(long)) {
      const X = side ? 13 - x : x, Y = y + UU
      let c
      if (t === 'C') c = '#e9ecef'; else if (t === 'T') c = o.cupT || '#d9a53c'
      else if (t === 'h') c = sk[0]
      else if (t[0] === 's') c = t[1] === 'i' ? tp[1] : tp[0]
      else c = t[1] === 'i' ? sk[1] : sk[0]
      S(X, Y, c)
    }
  }
  if (dir !== 'right') {
    const t0 = 11 + UU, t1 = sit ? 20 + U : 19 + UU
    const back = dir === 'up'
    // tay phía sau thân (giơ lên/ngang) vẽ trước
    Rr(2, t0, 10, t1 - t0 + 1, tp[0]); for (let y = t0 + 1; y <= t1; y++) S(11, y, tp[1]); H(2, 11, t1, tp[1])
    S(3, t0 + 2, tp[2]); S(4, t0 + 1, tp[2])
    if (L.ts === 'tank') { S(2, t0, sk[0]); S(11, t0, sk[0]); S(2, t0 + 1, sk[0]); S(11, t0 + 1, sk[0]) }
    if (!back) {
      if (L.ts === 'tee' || L.ts === 'tank' || !L.ts) { H(5, 8, t0, sk[0]); S(4, t0, tp[1]); S(9, t0, tp[1]) }
      if (L.ts === 'shirt') { H(5, 8, t0, sk[0]); S(4, t0, tp[2]); S(5, t0, tp[2]); S(8, t0, tp[2]); S(9, t0, tp[2]); S(5, t0 + 1, tp[2]); S(8, t0 + 1, tp[2]); for (let y = t0 + 1; y < t1; y++) S(6, y, tp[1]); S(7, t0 + 3, tp[1]); S(7, t0 + 6, tp[1]) }
      if (L.ts === 'baba') { H(5, 8, t0, sk[0]); S(6, t0 + 1, sk[0]); S(7, t0 + 1, sk[0]); for (let y = t0 + 2; y < t1; y += 2) S(7, y, tp[2]); S(4, t0, tp[1]); S(9, t0, tp[1]); H(3, 5, t1 - 2, tp[1]); H(8, 10, t1 - 2, tp[1]) }
      if (L.ts === 'jacket') { H(5, 8, t0, tp[2]); for (let y = t0; y < t1; y++) S(7, y, tp[1]); S(4, t0 + 4, tp[1]); S(10, t0 + 4, tp[1]) }
      if (L.ts === 'long') { H(5, 8, t0, sk[0]); S(4, t0, tp[1]); S(9, t0, tp[1]) }
      if (L.bag) { for (let y = t0; y <= t0 + 4; y++) { S(3, y, KEY.bag[1]); S(10, y, KEY.bag[1]) } }
      if (L.shirtMark) S(9, t0 + 3, L.shirtMark)
    } else {
      H(4, 9, t0, tp[1]); S(6, t0 + 1, tp[1])
      if (L.bag) { Rr(3, t0 + 1, 8, 7, KEY.bag[0]); H(3, 10, t0 + 7, KEY.bag[1]); for (let y = t0 + 1; y <= t0 + 7; y++) S(10, y, KEY.bag[1]); H(4, 9, t0 + 3, KEY.bag[1]); S(4, t0 + 2, hi(KEY.bag[0], 0.3)) }
    }
    const aL = o.aL || 'down', aR = o.aR || 'down'
    armPx(aL, false); armPx(aR, true)              // aL = tay bên trái MÀN HÌNH, aR = bên phải
  } else {
    const t0 = 11 + UU, t1 = sit ? 20 + U : 19 + UU
    Rr(4, t0, 6, t1 - t0 + 1, tp[0]); for (let y = t0 + 1; y <= t1; y++) S(4, y, tp[1]); H(4, 9, t1, tp[1]); S(9, t0 + 1, tp[2]); S(8, t0 + 2, tp[2])
    if (L.ts === 'tee' || L.ts === 'tank' || L.ts === 'long' || !L.ts) { H(6, 8, t0, sk[0]); S(9, t0, tp[1]) }
    if (L.ts === 'shirt' || L.ts === 'baba') { H(6, 8, t0, sk[0]); S(9, t0, tp[2]); S(8, t0, tp[2]); S(9, t0 + 1, tp[2]); S(9, t0 + 3, tp[1]); S(9, t0 + 6, tp[1]) }
    if (L.ts === 'jacket') { H(6, 8, t0, tp[2]); S(9, t0 + 1, tp[1]) }
    if (L.ts === 'tank') { S(4, t0, sk[0]); S(5, t0, sk[0]) }
    if (L.bag) { Rr(1, t0 + 1, 3, 7, KEY.bag[0]); vl(cv, bx + 1, by + t0 + 1, by + t0 + 7, KEY.bag[1]); H(1, 3, t0 + 7, KEY.bag[1]); S(5, t0, KEY.bag[1]); S(6, t0 + 1, KEY.bag[1]) }
    // tay gần (ngang): kiểu 'swing' theo bước, hoặc theo o.aS
    const aS = o.aS || 'swing'
    const sw = aS === 'swing' ? [0, 1, 0, -1][f] : 0
    const put = (x, y, t) => S(x, y + UU, t === 's' ? tp[0] : t === 'si' ? tp[1] : t === 'h' ? sk[0] : t === 'C' ? '#e9ecef' : t === 'T' ? (o.cupT || '#d9a53c') : t === 'ki' ? sk[1] : sk[0])
    if (aS === 'swing') { for (let y = 12; y <= 16; y++) for (let x = 5 + sw; x <= 7 + sw; x++) put(x, y, (long || y <= 13) ? (x === 5 + sw ? 'si' : 's') : 'k'); put(6 + sw, 17, 'h'); put(7 + sw, 17, 'h'); put(6 + sw, 18, 'h'); put(7 + sw, 18, 'h') }
    else if (aS === 'up') { for (let y = 1; y <= 12; y++) { put(8, y, y >= 9 || long && y >= 3 ? 's' : 'k'); put(9, y, y >= 9 || long && y >= 3 ? 'si' : 'ki') } put(8, -1, 'h'); put(9, -1, 'h'); put(8, 0, 'h'); put(9, 0, 'h') }
    else if (aS === 'fwd') { for (let x = 6; x <= 12; x++) { put(x, 12, x <= 8 || long && x <= 10 ? 's' : 'k'); put(x, 13, x <= 8 || long && x <= 10 ? 'si' : 'ki') } put(13, 12, 'h'); put(13, 13, 'h') }
    else if (aS === 'du') { put(6, 12, 's'); put(7, 12, 's'); put(7, 11, 's'); put(8, 10, long ? 's' : 'k'); put(8, 11, 'si'); put(9, 9, 'k'); put(9, 10, 'ki'); put(10, 8, 'k'); put(10, 9, 'ki'); put(11, 7, 'h'); put(11, 6, 'h'); put(12, 6, 'h') }
    else if (aS === 'dl') { for (let y = 12; y <= 14; y++) { put(6, y, 's'); put(7, y, 'si') } put(8, 15, long ? 's' : 'k'); put(8, 16, 'k'); put(9, 16, 'k'); put(9, 17, 'h'); put(10, 17, 'h') }
    else if (aS === 'run0') { put(5, 12, 's'); put(6, 12, 's'); put(5, 13, 's'); put(4, 14, 'k'); put(4, 15, 'k'); put(3, 14, 'k'); put(3, 13, 'h'); put(2, 13, 'h') }
    else if (aS === 'run1') { put(6, 12, 's'); put(7, 12, 's'); put(7, 13, 's'); put(8, 14, 'k'); put(9, 14, 'k'); put(10, 13, 'h'); put(10, 12, 'h') }
    else if (aS === 'cup') { put(6, 12, 's'); put(7, 12, 's'); put(7, 13, long ? 's' : 'k'); put(8, 13, 'k'); put(9, 12, 'k'); put(10, 11, 'h'); put(10, 10, 'h'); put(11, 10, 'h'); put(11, 8, 'C'); put(12, 8, 'C'); put(11, 9, 'C'); put(12, 9, 'C'); put(11, 7, 'T'); put(12, 7, 'T') }
    else if (aS === 'sip') { put(6, 12, 's'); put(7, 12, 's'); put(8, 11, long ? 's' : 'k'); put(9, 10, 'k'); put(10, 9, 'h'); put(10, 8, 'h'); put(11, 8, 'C'); put(11, 7, 'C'); put(12, 7, 'C'); put(12, 8, 'C'); put(11, 6, 'T') }
    else if (aS === 'lap') { for (let y = 12; y <= 14; y++) { put(6, y, 's'); put(7, y, 'si') } put(8, 15, 'k'); put(9, 15, 'k'); put(10, 15, 'h'); put(10, 16, 'h') }
    else if (aS === 'lapcup') { for (let y = 12; y <= 14; y++) { put(6, y, 's'); put(7, y, 'si') } put(8, 15, 'k'); put(9, 15, 'h'); put(10, 14, 'C'); put(11, 14, 'C'); put(10, 15, 'C'); put(11, 15, 'C'); put(10, 13, 'T'); put(11, 13, 'T') }
    else if (aS === 'chin') { put(6, 12, 's'); put(7, 12, 's'); put(7, 13, long ? 's' : 'k'); put(8, 12, 'k'); put(9, 11, 'k'); put(9, 10, 'h'); put(10, 10, 'h') }
  }
  // ===== đầu =====
  const hy = UU + (o.hdy || 0), hx = lean
  const HS = (x, y, c) => S(x + hx, y + hy, c)
  const HH = (x0, x1, y, c) => H(x0 + hx, x1 + hx, y + hy, c)
  if (dir !== 'right') {
    HEADC.forEach(([a, b], y) => HH(a, b, y, sk[0])); HH(3, 10, 10, sk[1])
    if (dir === 'down') {
      if (!o.eyesClosed) { HS(3, 6, EYE); HS(10, 6, EYE) } else { HS(3, 6, sk[1]); HS(10, 6, sk[1]); HS(4, 6, sk[1]); HS(9, 6, sk[1]) }
      HS(6, 8, sk[1]); HS(7, 8, sk[1]); HS(2, 7, sk[2]); HS(11, 7, sk[2])
      if (o.blush) { HS(2, 7, '#e8907a'); HS(11, 7, '#e8907a') }
      if (L.beard) { HH(4, 9, 9, L.beard); HS(5, 10, L.beard); HS(8, 10, L.beard) }
      if (L.glasses) { HS(2, 6, L.glasses); HS(4, 6, L.glasses); HS(9, 6, L.glasses); HS(11, 6, L.glasses); HH(5, 8, 5, L.glasses) }
    }
    // tóc
    const ha = hr[0], hh = hr[1], hb = L.hairDark || (hr === KEY.hair ? hr[0] : dark(hr[0], 0.3))
    if (dir === 'down') {
      if (L.hs === 'bald') { HS(1, 4, ha); HS(1, 5, ha); HS(12, 4, ha); HS(12, 5, ha); HS(2, 3, ha); HS(11, 3, ha); HS(4, 1, sk[2]); HS(5, 1, sk[2]) }
      else {
        HH(3, 10, 0, ha); HH(2, 11, 1, ha); HH(1, 12, 2, ha); HH(1, 12, 3, ha)
        HH(1, 5, 4, ha); HH(9, 12, 4, ha); HS(5, 4, hb); HS(1, 4, hb); HS(12, 4, hb)
        HS(3, 2, hh); HS(4, 2, hh); HS(9, 1, hh); HS(10, 2, hh)
        HH(5, 8, 3, ha); HS(7, 3, hb); HS(1, 5, hb); HS(12, 5, hb)
        if (L.hs === 'long') { for (let y = 5; y <= 12; y++) { HS(0, y, ha); HS(1, y, y > 9 ? ha : hb); HS(12, y, y > 9 ? ha : hb); HS(13, y, ha) } HS(0, 13, hb); HS(13, 13, hb) }
        if (L.hs === 'bun') { HS(6, 0, hh); HS(7, 0, hh) }
      }
    } else {
      if (L.hs === 'bald') { HEADC.slice(3, 9).forEach(([a, b], y) => HH(a, b, y + 3, ha)); HS(5, 1, sk[2]) }
      else {
        HEADC.slice(0, 10).forEach(([a, b], y) => HH(a, b, y, ha))
        HS(3, 2, hh); HS(4, 2, hh); HS(9, 1, hh); HS(10, 2, hh); HS(5, 1, hh)
        HH(2, 11, 8, hb); HH(2, 11, 9, hb); HH(4, 9, 9, hb); HS(7, 5, hb); HS(6, 6, hb)
        if (L.hs === 'long') { for (let y = 9; y <= 13; y++) HH(2, 11, y, y % 2 ? ha : hb); HH(3, 10, 14, hb) }
        if (L.hs === 'bun') { HH(5, 8, 4, hh); HH(5, 8, 5, ha); HH(5, 8, 6, hb); HS(4, 5, hb); HS(9, 5, hb) }
      }
    }
  } else {
    SIDEH.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'a') HS(x, y, sk[0]) }))
    if (!o.eyesClosed) HS(9, 6, EYE); else HS(9, 6, sk[1])
    HS(11, 6, sk[1]); HS(11, 5, sk[0]); HS(9, 8, sk[1]); HS(8, 8, sk[1]); HH(6, 9, 10, sk[1]); HS(9, 9, sk[1]); HS(5, 6, sk[1]); HS(5, 7, sk[1]); HS(10, 7, sk[2])
    if (o.blush) HS(10, 7, '#e8907a')
    if (L.beard) { HH(6, 9, 9, L.beard); HS(8, 10, L.beard) }
    if (L.glasses) { HS(9, 5, L.glasses); HS(10, 6, L.glasses); HS(8, 6, L.glasses); HH(5, 8, 5, L.glasses) }
    const ha = hr[0], hh = hr[1], hb = L.hairDark || (hr === KEY.hair ? hr[0] : dark(hr[0], 0.3))
    if (L.hs === 'bald') { HS(3, 4, ha); HS(3, 5, ha); HS(4, 6, ha); HS(4, 7, ha); HS(3, 3, ha); HS(6, 1, sk[2]) }
    else {
      HH(3, 8, 0, ha); HH(2, 9, 1, ha); HH(2, 10, 2, ha); HH(2, 10, 3, ha)
      HH(2, 6, 4, ha); HS(6, 4, hb); HH(2, 4, 5, ha); HH(2, 4, 6, ha); HH(2, 4, 7, ha)
      HH(3, 4, 8, ha); HS(4, 9, hb); HS(5, 10, hb)
      HS(4, 2, hh); HS(5, 2, hh); HS(8, 1, hh); HS(2, 8, hb); HS(3, 8, hb); HS(2, 7, hb); HS(10, 3, hb)
      if (L.hs === 'long') { for (let y = 5; y <= 13; y++) { HS(1, y, y > 10 ? hb : ha); HS(2, y, ha); HS(3, y, y > 9 ? ha : hb) } }
      if (L.hs === 'bun') { HH(0, 2, 4, ha); HH(0, 2, 5, hh); HH(0, 2, 6, hb) }
    }
  }
  // ===== mũ =====
  if (L.hat) hat(cv, bx + hx, by + hy, L.hat, L.hatC, dir)
}

function hat(cv, bx, by, kind, col, dir) {
  const S = (x, y, c) => cv.set(bx + x, by + y, c)
  const H = (x0, x1, y, c) => cv.rect(bx + x0, by + y, x1 - x0 + 1, 1, c)
  if (kind === 'nonla') {
    const a = '#e8d49a', l = '#f7ebc0', d = '#b89a5a', dd = '#8e7442'
    const cx0 = dir === 'right' ? 0 : 0
    H(6, 7, -1, a); S(6, -1, l)
    H(4, 9, 0, a); S(5, 0, l); S(4, 0, l)
    H(2, 11, 1, a); H(2, 5, 1, l)
    H(0, 13, 2, a); H(0, 4, 2, l); S(9, 2, d); S(11, 2, d)
    H(-1, 14, 3, d); H(-1, 3, 3, a); S(13, 3, dd); S(14, 3, dd)
    if (dir !== 'up') { S(3, 4, dd); S(10, 4, dd) }       // quai nón
    S(7, 0, d); S(8, 1, d); S(6, 1, d)
    void cx0
  } else if (kind === 'helmet') {
    const a = col || '#d4382c', l = hi(a, 0.35), d = sh(a, 0.3)
    if (dir === 'right') {
      H(3, 8, -1, a); H(2, 10, 0, a); H(1, 11, 1, a); H(1, 11, 2, a); H(1, 12, 3, d); S(3, 0, l); S(4, 0, l); S(2, 1, l)
      S(5, 4, '#3a3540'); S(5, 5, '#3a3540'); S(6, 6, '#3a3540')
    } else {
      H(3, 10, -1, a); H(2, 11, 0, a); H(1, 12, 1, a); H(1, 12, 2, a); H(0, 13, 3, d)
      S(3, 0, l); S(4, 0, l); S(2, 1, l)
      if (dir === 'down') { H(4, 9, 3, hi(a, 0.15)); S(1, 4, '#3a3540'); S(12, 4, '#3a3540'); S(1, 5, '#3a3540'); S(12, 5, '#3a3540') } else { H(5, 8, 1, d) }
    }
  } else if (kind === 'cap') {
    const a = col || '#2f62c9', l = hi(a, 0.3), d = sh(a, 0.3)
    if (dir === 'right') { H(3, 8, -1, a); H(2, 10, 0, a); H(2, 10, 1, a); H(2, 13, 2, d); S(4, 0, l); S(11, 2, d) }
    else if (dir === 'down') { H(3, 10, -1, a); H(2, 11, 0, a); H(1, 12, 1, a); H(2, 11, 2, d); H(3, 10, 3, d); S(4, 0, l); S(3, 0, l); S(6, -1, l) }
    else { H(3, 10, -1, a); H(2, 11, 0, a); H(1, 12, 1, a); H(1, 12, 2, a); S(4, 0, l); H(5, 8, 3, d) }
  } else if (kind === 'pith') {                              // mũ cối
    const a = col || '#6f7a45', l = hi(a, 0.3), d = sh(a, 0.3)
    if (dir === 'right') { H(4, 8, -2, a); H(3, 9, -1, a); H(2, 10, 0, a); H(2, 11, 1, a); H(0, 13, 2, d); S(4, -1, l); S(5, -2, l) }
    else { H(4, 9, -2, a); H(3, 10, -1, a); H(2, 11, 0, a); H(1, 12, 1, a); H(-1, 14, 2, d); S(4, -1, l); S(3, 0, l); S(5, -2, l); if (dir === 'down') S(6, 0, '#e0b030') }
  } else if (kind === 'band') {
    const a = col || '#e04a4a'
    if (dir === 'right') H(2, 10, 3, a); else H(1, 12, 3, a)
  } else if (kind === 'scarf') {                           // khăn trùm đầu (bà bán hàng)
    const a = col || '#c94a6a', d = sh(a, 0.3)
    if (dir === 'right') { H(3, 8, 0, a); H(2, 10, 1, a); H(2, 10, 2, a); H(2, 5, 3, a); H(2, 4, 4, d) }
    else { H(3, 10, 0, a); H(2, 11, 1, a); H(1, 12, 2, a); H(1, 12, 3, d) }
  }
}

// bộ "look" cho người đi bộ mini-game (màu cố định, không dùng màu khoá)
const PED_LOOKS = [
  { name: 'Cô bán hàng nón lá', skin: SKIN2, hair: ['#2b2230', '#4a3a50'], hs: 'long', hat: 'nonla', top: ['#8a5a3a', '#6a4028', '#b07a52'], ts: 'baba', pants: ['#2a2a30', '#18181c'], ps: 'long', shoe: ['#7a5a3a', '#5a4028'] },
  { name: 'Anh công sở mũ bảo hiểm', skin: SKIN, hair: ['#2b2230', '#4a3a50'], hs: 'short', hat: 'helmet', hatC: '#d4382c', top: ['#7fb0e0', '#5a88b8', '#a8ccf0'], ts: 'shirt', pants: ['#363a42', '#22252b'], ps: 'long', shoe: ['#3a2a22', '#22181a'] },
  { name: 'Cô gái tóc dài', skin: SKIN3, hair: ['#3a2418', '#5a3a28'], hs: 'long', top: ['#f2c94c', '#c9a032', '#fbe08a'], ts: 'tee', pants: ['#3f6fb0', '#2b4d86'], ps: 'skirt', shoe: ['#efe6d2', '#b9ae96'] },
  { name: 'Cụ ông mũ cối', skin: SKIN2, hair: ['#c8c8cc', '#e8e8ea'], hs: 'short', hat: 'pith', top: ['#ece6d6', '#bdb5a2', '#fffaf0'], ts: 'shirt', pants: ['#b99d68', '#8a7348'], ps: 'long', shoe: ['#5a4a3a', '#3a2e24'], beard: '#d8d8dc' },
  { name: 'Học sinh đeo cặp', skin: SKIN, hair: ['#2b2230', '#4a3a50'], hs: 'short', top: ['#f4f0e6', '#c9c2b0', '#ffffff'], ts: 'shirt', pants: ['#24345a', '#18223c'], ps: 'long', shoe: ['#efe6d2', '#b9ae96'], bag: 1, shirtMark: '#d4382c' },
  { name: 'Cụ bà tóc búi', skin: SKIN, hair: ['#a8a8b0', '#d0d0d6'], hs: 'bun', top: ['#8a6bb0', '#634a86', '#b394d6'], ts: 'baba', pants: ['#2a2a30', '#18181c'], ps: 'long', shoe: ['#5a4a3a', '#3a2e24'] },
  { name: 'Thanh niên mũ lưỡi trai', skin: SKIN2, hair: ['#2b2230', '#4a3a50'], hs: 'short', hat: 'cap', hatC: '#2a2a30', top: ['#e08a2a', '#a8601a', '#f2b060'], ts: 'tee', pants: ['#3d5a8a', '#2b3f66'], ps: 'long', shoe: ['#efe6d2', '#b9ae96'] },
  { name: 'Khách Tây đi du lịch', skin: SKIN3, hair: ['#d8b058', '#f0d088'], hs: 'short', hat: 'cap', hatC: '#e8e2d0', top: ['#5aa56a', '#3a7a48', '#8acb98'], ts: 'tee', pants: ['#b99d68', '#8a7348'], ps: 'short', shoe: ['#7a5a3a', '#5a4028'], bag: 1 },
]
// look mang màu KHOÁ (thế giới đổi màu được bằng recolor như NPC_LOOK)
const KEY_LOOK = { skin: SKIN, hair: KEY.hair, hs: 'short', top: KEY.top, ts: 'tee', pants: KEY.pants, ps: 'long', shoe: SHOE }

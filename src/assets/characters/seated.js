// Người ngồi xe máy (bản gọn): ghép lớp xe (6 màu x 4 hướng) + chân/thân/đầu/tóc theo trang phục.
// Kết quả: { mo_<0..5>_<px|nx|py|ny>: canvas 44x76 } cùng khung và tâm với sprite xe có sẵn của thế giới
// (pivot px/nx = [12,54], py/ny = [32,54]); world chỉ cần vẽ canvas này thay cho sprite mo_* khi người chơi lái xe.
// Thuộc tính thêm (không liệt kê): ready (ảnh đã decode?), pivot, size.
const cache = new Map()
const DIRS = ['px', 'nx', 'py', 'ny']
const PIVOT = { px: [12, 54], nx: [12, 54], py: [32, 54], ny: [32, 54] }
const INK = [28, 24, 34]

// viền "ấm" giống thế giới: màu pixel kề (thứ tự dưới, phải, trái, trên) trộn 50% với mực
function outline(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height
  const d = x.getImageData(0, 0, W, H), a = d.data, o = new Uint8ClampedArray(a)
  const at = (X, Y) => (X >= 0 && Y >= 0 && X < W && Y < H && a[(Y * W + X) * 4 + 3] > 0) ? (Y * W + X) * 4 : -1
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    if (a[(Y * W + X) * 4 + 3] > 0) continue
    let j = -1
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { j = at(X + dx, Y + dy); if (j >= 0) break }
    if (j < 0) continue
    const i = (Y * W + X) * 4
    o[i] = (a[j] + INK[0]) >> 1; o[i + 1] = (a[j + 1] + INK[1]) >> 1; o[i + 2] = (a[j + 2] + INK[2]) >> 1; o[i + 3] = 255
  }
  x.putImageData(new ImageData(o, W, H), 0, 0)
  return c
}

export function getSeatedSprites(outfit, ctx) {
  const { norm, images, ready, mk } = ctx
  const n = norm(outfit), key = `${n.hair}.${n.top}.${n.pants}`
  const isReady = ready()
  if (isReady && cache.has(key)) return cache.get(key)
  const out = {}
  const build = (i, d) => {
    const c = mk(44, 76), x = c.getContext('2d', { willReadFrequently: true })
    if (isReady) {
      for (const name of [`seat_bikeback_${i}_${d}`, `seat_legs_${n.pants}_${d}`, `seat_torso_${n.top}_${d}`, `seat_head_0_${d}`, `seat_hair_${n.hair}_${d}`, `seat_bikefront_${i}_${d}`]) {
        const im = images[name]; if (im && im.naturalWidth) x.drawImage(im, 0, 0)
      }
      outline(c)
    }
    return c
  }
  for (let i = 0; i < 6; i++) for (const d of DIRS) {
    let v = null
    Object.defineProperty(out, `mo_${i}_${d}`, { enumerable: true, get() { return v || (v = build(i, d)) } })
  }
  Object.defineProperty(out, 'ready', { value: isReady })
  Object.defineProperty(out, 'pivot', { value: PIVOT })
  Object.defineProperty(out, 'size', { value: [44, 76] })
  if (isReady) cache.set(key, out)
  return out
}

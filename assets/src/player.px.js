// Nhân vật chính: một bạn trẻ Hà Nội, áo xanh teal, quần jean, ba lô nâu.
// Mỗi sprite 14x26 + viền 1px = 16x28. 3 hướng vẽ tay (xuống, lên, phải), hướng trái = lật hình phải trong game.
// Khung 0 = đứng yên (idle), 0-1-2-3 là một chu kỳ đi.
pal({
  k: "#1c1a1f", // viền
  h: "#2b2230", H: "#443449", // tóc
  s: "#f0c49a", S: "#c98e68", // da
  t: "#3a8f8a", T: "#2a6a6c", u: "#6cc1b0", // áo
  p: "#3d4c7a", P: "#2b3558", // quần
  w: "#efe6d2", // giày
  b: "#b5733f", B: "#7d4a28", // ba lô
})

const mir = (half) => half + [...half].reverse().join("")

const headFront = [
  "...hhhh", "..hhhhh", ".hhhhhh", ".hhHhhh", ".hhhhss", ".ssssss", ".ssksss", ".ssssss", "..sssss", "..sssss", "...SSSS",
].map(mir)
const headBack = [
  "...hhhh", "..hhhhh", ".hhhhhh", ".hhHhhh", ".hhhhhh", ".hhhhhh", ".hhhhhh", ".hhhhhh", "..hhhhh", "..hhhhh", "...SSSS",
].map(mir)
const torsoFront = [
  "ttttttt", "tTttttt", "tTttttt", "tTtttut", "tTttttt", "tTttttt", "tTttttt", "sTttttt", "sTTTTTT",
].map(mir)
const torsoBack = [
  "ttttttt", "tTbbbbb", "tTbbbbb", "tTbbbbb", "tTbbbbb", "tTbbbbb", "tTBBBBB", "sTBBBBB", "sTTTTTT",
].map(mir)
const hip = [".pppppp", ".pppppp"].map(mir)

const legsFront = [
  // 0 và 2: đứng
  ["..pppp..pppp..", "..pppp..pppp..", "..pppp..pppp..", ".wwwww..wwwww."],
  // 1: chân trái nhấc
  ["..pppp..pppp..", "..pppp..pppp..", "..wwww..pppp..", "........wwwww."],
  // 3: chân phải nhấc
  ["..pppp..pppp..", "..pppp..pppp..", "..pppp..wwww..", ".wwwww........"],
]
const legsSide = [
  ["....PPppp.....", "....PPppp.....", "....PPppp.....", "....wwwwwww..."],
  ["..PPP..ppp....", "..PPP..ppp.....".slice(0, 14), "..PPP..ppp....", ".wwww..wwww..."],
  ["...ppp..PPP...", "...ppp..PPP...", "...ppp..PPP...", "..wwww..wwww.."],
]
// khung đi: 0 đứng, 1 = bước A, 2 = đứng, 3 = bước B
const legIdx = [0, 1, 0, 2]

const sideTop = [
  "...hhhhhh.....", "..hhhhhhhh....", "..hhhhhhhhh...", "..hhHhhhhhh...", "..hhhhsssss...", "..hhhsssssss..",
  "..hhhssssksS..", "..hhhsssssss..", "...hhssssss...", "....hssssS....", ".....hSSSS....",
  "....tttttt....", "..bbtTTTtt....", "..bbtTTTtt....", "..bbtTTTtt....", "..bbtTTTtt....", "..bbtTTTtt....",
  "..BBtsssst....", "..BB.tttttt...".slice(0, 14), "....TTTTTT....",
  "....pppppp....", "....pppppp....",
]

const frameRows = {
  down: (f) => [...headFront, ...torsoFront, ...hip, ...legsFront[legIdx[f]]],
  up: (f) => [...headBack, ...torsoBack, ...hip, ...legsFront[legIdx[f]]],
  right: (f) => [...sideTop, ...legsSide[legIdx[f]]],
}
for (const dir of ["down", "up", "right"]) {
  for (let f = 0; f < 4; f++) {
    sprite(`pl_${dir}_${f}`, { outline: "k" }, frameRows[dir](f).join("\n"))
  }
}

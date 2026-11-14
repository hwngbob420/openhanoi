// ZzFX - Zuper Zmall Zound Zynth (bản Micro v1.4.0) của Frank Force, giấy phép MIT, Copyright 2019.
// Nguồn: https://github.com/KilledByAPixel/ZzFX (bản chép ở ~/.claude/hanoi-game-refs/ZzFX/ZzFXMicro.js).
// Thay đổi so với bản gốc: tách phần TẠO MẪU (zzfxG, hàm thuần, kiểm thử offline được) khỏi phần PHÁT;
// không tạo AudioContext lúc nạp module (trình duyệt chặn trước cú chạm đầu tiên); nhận nút đích do bên gọi cấp.
export const SR = 44100

// Trả về Float32Array mẫu âm thanh. Tham số y hệt zzfx gốc (hệ số volume 0.3 đã bỏ: bên gọi tự chuẩn hoá đỉnh).
export function zzfxG(volume = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0, release = .1, shape = 0, shapeCurve = 1,
  slide = 0, deltaSlide = 0, pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0, bitCrush = 0,
  delay = 0, sustainVolume = 1, decay = 0, tremolo = 0, filter = 0) {
  const PI2 = Math.PI * 2, abs = Math.abs, sign = (v) => (v < 0 ? -1 : 1)
  let startSlide = slide *= 500 * PI2 / SR / SR,
    startFrequency = frequency *= (1 + randomness * 2 * Math.random() - randomness) * PI2 / SR,
    modOffset = 0, repeat = 0, crush = 0, jump = 1, length, b = [], t = 0, i = 0, s = 0, f,
    quality = 2, w = PI2 * abs(filter) * 2 / SR,
    cos = Math.cos(w), alpha = Math.sin(w) / 2 / quality,
    a0 = 1 + alpha, a1 = -2 * cos / a0, a2 = (1 - alpha) / a0,
    b0 = (1 + sign(filter) * cos) / 2 / a0, b1 = -(sign(filter) + cos) / a0, b2 = b0,
    x2 = 0, x1 = 0, y2 = 0, y1 = 0
  const minAttack = 9
  attack = attack * SR || minAttack
  decay *= SR; sustain *= SR; release *= SR; delay *= SR
  deltaSlide *= 500 * PI2 / SR ** 3
  modulation *= PI2 / SR; pitchJump *= PI2 / SR; pitchJumpTime *= SR
  repeatTime = repeatTime * SR | 0
  for (length = attack + decay + sustain + release + delay | 0; i < length; b[i++] = s * volume) {
    if (!(++crush % (bitCrush * 100 | 0))) {
      s = shape ? shape > 1 ? shape > 2 ? shape > 3 ? shape > 4 ? (t / PI2 % 1 < shapeCurve / 2) * 2 - 1 : Math.sin(t ** 3)
        : Math.max(Math.min(Math.tan(t), 1), -1) : 1 - (2 * t / PI2 % 2 + 2) % 2 : 1 - 4 * abs(Math.round(t / PI2) - t / PI2) : Math.sin(t)
      s = (repeatTime ? 1 - tremolo + tremolo * Math.sin(PI2 * i / repeatTime) : 1) *
        (shape > 4 ? s : sign(s) * abs(s) ** shapeCurve) *
        (i < attack ? i / attack : i < attack + decay ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
          : i < attack + decay + sustain ? sustainVolume : i < length - delay ? (length - i - delay) / release * sustainVolume : 0)
      s = delay ? s / 2 + (delay > i ? 0 : (i < length - delay ? 1 : (length - i) / delay) * b[i - delay | 0] / 2 / volume) : s
      if (filter) s = y1 = b2 * x2 + b1 * (x2 = x1) + b0 * (x1 = s) - a2 * y2 - a1 * (y2 = y1)
    }
    f = (frequency += slide += deltaSlide) * Math.cos(modulation * modOffset++)
    t += f + f * noise * (i * i * PI2 % 2 - 1)
    if (jump && ++jump > pitchJumpTime) { frequency += pitchJump; startFrequency += pitchJump; jump = 0 }
    if (repeatTime && !(++repeat % repeatTime)) { frequency = startFrequency; slide = startSlide; jump ||= 1 }
  }
  return Float32Array.from(b)
}

// Phát mẫu qua ctx/đích của ta. Trả về nguồn (để dừng sớm nếu cần).
export function zzfxPlay(ctx, dest, samples, gain = 1, when = 0) {
  const buf = ctx.createBuffer(1, samples.length, SR)
  buf.getChannelData(0).set(samples)
  const src = ctx.createBufferSource(); src.buffer = buf
  if (gain !== 1) { const g = ctx.createGain(); g.gain.value = gain; src.connect(g); g.connect(dest) } else src.connect(dest)
  src.start(when || 0)
  return src
}

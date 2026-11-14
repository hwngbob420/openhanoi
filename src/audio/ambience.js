// Không khí: mưa rào (nhiễu lọc, lặp mượt) và chuông gác chắn tàu (leng keng lặp khi train:bell on).
// Sấm từng tiếng do world lo (world.js tự có WebAudio cho sấm) nên ở đây KHÔNG làm sấm, chỉ thêm ầm ì nền khi giông.
import { render } from './sfx.js'
import { zzfxPlay } from './zzfx.js'

export function createAmbience(ctx, out) {
  // ---- mưa ----
  const len = Math.floor(ctx.sampleRate * 6), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0                                   // nhiễu hồng đơn giản
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.052; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18 }
  const fade = Math.floor(ctx.sampleRate * 0.5)               // cross-fade đuôi vào đầu để vòng lặp không nghe mối nối
  for (let i = 0; i < fade; i++) { const a = i / fade; d[i] = d[i] * a + d[len - fade + i] * (1 - a) }
  const loopEnd = (len - fade) / ctx.sampleRate
  const rainSrc = ctx.createBufferSource(); rainSrc.buffer = buf; rainSrc.loop = true; rainSrc.loopStart = 0; rainSrc.loopEnd = loopEnd
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500
  const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 2400; pk.gain.value = 5; pk.Q.value = 0.7
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000
  const rainGain = ctx.createGain(); rainGain.gain.value = 0
  rainSrc.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(rainGain); rainGain.connect(out)
  const rumSrc = ctx.createBufferSource(); rumSrc.buffer = buf; rumSrc.loop = true; rumSrc.loopEnd = loopEnd; rumSrc.playbackRate.value = 0.5
  const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 160
  const rumGain = ctx.createGain(); rumGain.gain.value = 0
  rumSrc.connect(rlp); rlp.connect(rumGain); rumGain.connect(out)
  let started = false, rain = 0, stopTimer = 0
  const startSrc = () => { if (!started) { started = true; rainSrc.start(0, Math.random() * 3); rumSrc.start(0, Math.random() * 3) } }
  // level: 0 tắt, ~0.5 mưa, 1 giông. Nhỏ/lớn dần mượt (hằng số thời gian 1.2s).
  function setRain(level) {
    level = Math.max(0, Math.min(1, +level || 0)); rain = level
    const t = ctx.currentTime
    if (level > 0) startSrc()
    rainGain.gain.cancelScheduledValues(t); rainGain.gain.setTargetAtTime(level * 0.36, t, 1.2)
    rumGain.gain.cancelScheduledValues(t); rumGain.gain.setTargetAtTime(level > 0.75 ? 0.3 : 0, t, 1.5)
    lp.frequency.setTargetAtTime(5500 + level * 2500, t, 1)
  }

  // ---- chuông gác chắn: "leng keng" lặp mỗi 430ms ----
  const bellS = render('bell').samples
  let bellTimer = 0, bellFlip = false, bellVol = 0.7
  function bellOnce() {
    if (ctx.state !== 'running') return
    const g = ctx.createGain(); g.gain.value = bellVol; g.connect(out)
    const src = zzfxPlay(ctx, g, bellS, 1)
    src.playbackRate.value = (bellFlip = !bellFlip) ? 1 : 0.84            // leng (cao) - keng (thấp)
  }
  function bell(on, vol = 0.7) {
    bellVol = vol
    if (on && !bellTimer) { bellOnce(); bellTimer = setInterval(bellOnce, 430) }
    else if (!on && bellTimer) { clearInterval(bellTimer); bellTimer = 0 }
  }
  return { setRain, bell, get rain() { return rain }, get bellOn() { return !!bellTimer } }
}

// Nhạc nền lofi phố cổ, sinh thủ tục (không file ngoài). La thứ ngũ cung (A C D E G), 75 BPM, vòng lặp 24 ô nhịp = 76.8 giây.
// Gồm: đàn Rhodes rải hợp âm, bass sine, giai điệu pluck ngũ cung (ngẫu nhiên có hạt giống nên mỗi vòng giống hệt), trống nhẹ + hi-hat swing.
// Phát sống bằng bộ lập lịch nhìn trước 1.6s (không cấp trước cả bài => nhẹ bộ nhớ); nghỉ hẳn khi tắt (không tốn pin).
export const BPM = 75
export const BARS = 24
export const LOOP_SEC = BARS * 4 * 60 / BPM          // 76.8

const mtof = (n) => 440 * 2 ** ((n - 69) / 12)
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

// hợp âm (MIDI). 3 chặng x 8 ô: A (Am7 Dm7 Em7 Am7), A' (biến thể), B (Cmaj7 G6 Dm7 Em7)
const CH = {
  Am7: { root: 45, notes: [57, 60, 64, 67] }, Dm7: { root: 50, notes: [57, 60, 62, 65] }, Em7: { root: 40, notes: [55, 59, 62, 64] },
  Cmaj7: { root: 48, notes: [55, 59, 60, 64] }, G6: { root: 43, notes: [55, 59, 62, 64] },
}
const PROG = [
  ...['Am7', 'Am7', 'Dm7', 'Dm7', 'Em7', 'Em7', 'Am7', 'Am7'],
  ...['Am7', 'Am7', 'Dm7', 'Dm7', 'Em7', 'Em7', 'Am7', 'Em7'],
  ...['Cmaj7', 'Cmaj7', 'G6', 'G6', 'Dm7', 'Dm7', 'Em7', 'Am7'],
]
const PENT = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79]      // A3 C4 D4 E4 G4 A4 C5 D5 E5 G5

export function createMusic(ctx, out) {
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(out)
  const dry = ctx.createGain(); dry.connect(bus)
  const dly = ctx.createDelay(1); dly.delayTime.value = 60 / BPM * 0.75                 // vang chấm lửng
  const fb = ctx.createGain(); fb.gain.value = 0.32
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1800
  dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(bus)
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400; tone.connect(dry)  // ấm kiểu băng cát-xét
  const send = ctx.createGain(); send.gain.value = 0.45; send.connect(dly)
  const nlen = ctx.sampleRate, nb = ctx.createBuffer(1, nlen, ctx.sampleRate), nd = nb.getChannelData(0)
  for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1

  function osc(type, f, t, dur, vol, dest, atk = 0.008) {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05)
  }
  function noiseHit(t, dur, vol, type, freq, q = 1) {
    const s = ctx.createBufferSource(); s.buffer = nb
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f); f.connect(g); g.connect(dry); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02)
  }
  function kick(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
    o.connect(g); g.connect(dry); o.start(t); o.stop(t + 0.3)
  }

  // Lập lịch một ô nhịp (bar 0..BARS-1) bắt đầu ở thời điểm t0 của ctx.
  function scheduleBar(bar, t0) {
    const spb = 60 / BPM, r = rng(1234 + bar * 77), ch = CH[PROG[bar % BARS]], swing = spb * 0.12
    // Rhodes: rải hợp âm ở phách 1 và nhấn lửng ở 2.5 (phách "và")
    const chord = (t, vol, dur) => ch.notes.forEach((n, i) => {
      const tt = t + i * 0.022 + r() * 0.008
      osc('sine', mtof(n), tt, dur, vol, tone); osc('sine', mtof(n) * 2, tt, dur * 0.4, vol * 0.25, tone); osc('triangle', mtof(n), tt, dur * 0.6, vol * 0.18, send)
    })
    chord(t0, 0.07, spb * 3.2); if (r() < 0.8) chord(t0 + spb * 2.5 + swing, 0.045, spb * 1.4)
    // bass sine
    osc('sine', mtof(ch.root), t0, spb * 1.8, 0.22, dry, 0.015)
    osc('sine', mtof(ch.root + (r() < 0.5 ? 7 : 0)), t0 + spb * 2 + swing * 0.5, spb * 1.4, 0.17, dry, 0.015)
    // trống: kick 1 & 3(đôi khi 3.5), snare mềm 2 & 4, hi-hat 8 swing
    kick(t0, 0.5); kick(t0 + spb * 2 + swing * 0.3, 0.4); if (r() < 0.35) kick(t0 + spb * 3.5 + swing, 0.25)
    noiseHit(t0 + spb, 0.16, 0.16, 'bandpass', 1900, 0.8); noiseHit(t0 + spb * 3, 0.18, 0.16, 'bandpass', 1900, 0.8)
    for (let k = 0; k < 8; k++) noiseHit(t0 + k * spb / 2 + (k & 1 ? swing : 0), 0.04, k % 2 ? 0.035 : 0.06, 'highpass', 7000)
    // giai điệu: bước đi ngẫu nhiên trên ngũ cung, thưa (nghỉ nhiều cho thoáng); ô cuối mỗi chặng 8 ô để lửng
    let idx = 3 + (bar % 3)
    const on = bar % 8 === 7 ? 0.25 : 0.42
    for (let k = 0; k < 8; k++) {
      if (r() > on) { r(); continue }
      idx = Math.max(0, Math.min(PENT.length - 1, idx + [-2, -1, -1, 0, 1, 1, 2][(r() * 7) | 0]))
      const tt = t0 + k * spb / 2 + (k & 1 ? swing : 0)
      osc('triangle', mtof(PENT[idx]), tt, spb * 1.2, 0.09, tone, 0.004); osc('sine', mtof(PENT[idx]) * 2, tt, spb * 0.5, 0.025, send, 0.004)
    }
  }

  let timer = 0, playing = false, nextBar = 0, nextT = 0
  function pump() {
    if (!playing) return
    if (ctx.state !== 'running') { nextT = Math.max(nextT, ctx.currentTime + 0.1); return }
    while (nextT < ctx.currentTime + 1.6) { scheduleBar(nextBar % BARS, nextT); nextT += 4 * 60 / BPM; nextBar++ }
  }
  function start(vol = 0.16) {
    if (playing) { bus.gain.setTargetAtTime(vol, ctx.currentTime, 0.4); return }
    playing = true; nextT = ctx.currentTime + 0.15
    bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setTargetAtTime(vol, ctx.currentTime, 0.6)
    pump(); timer = setInterval(pump, 400)
  }
  function stop() {
    if (!playing) return
    playing = false; clearInterval(timer); timer = 0
    bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
  }
  return { start, stop, scheduleBar, bus, get playing() { return playing }, setVolume(v) { bus.gain.setTargetAtTime(v, ctx.currentTime, 0.1) } }
}

// Bus tổng DUY NHẤT của khối âm thanh (ĐỢT 4): nhóm music / sfx / ambience -> cộng -> bộ chặn đỉnh (DynamicsCompressor kiểu limiter) -> gain tổng -> loa.
// Không nguồn nào được nối thẳng ctx.destination; chỉ file này chạm tới destination. Hàm thuần theo ctx nên đo được bằng OfflineAudioContext.
// Lưu ý: chuẩn Web Audio TỰ cộng "makeup gain" = (1/fullRangeGain)^0.6 trong DynamicsCompressor (không tắt được) -> ta bù ngược ở gain tổng,
// để âm dưới ngưỡng đi qua đúng 1:1 (không bị đẩy to lên), chỉ phần vượt ngưỡng mới bị nén.
export const LIMIT = { threshold: -5, knee: 0, ratio: 20, attack: 0.001, release: 0.25 }   // chọn theo bench ĐỢT 4 (đỉnh xấu nhất -2.x dBFS)
export const GROUPS = { music: 1, sfx: 0.85, amb: 1 }      // sfx -1.4 dB để một tiếng coin/sizzle lẻ không chạm ngưỡng limiter (không bơm nhạc)
export const PRE = 1, MASTER = 1                            // PRE: gain bus cộng trước limiter; MASTER: gain tổng sau limiter (đã bù makeup)

export function makeupOf(L = LIMIT) {                       // makeup gain tuyến tính mà compressor tự cộng (knee 0): fullRange = T + (0-T)/ratio (dB)
  const fullDb = L.threshold + (0 - L.threshold) / L.ratio
  return 10 ** (-fullDb * 0.6 / 20)
}

export function createMixer(ctx, out = ctx.destination, opts = {}) {     // opts.limit: ghi đè thông số limiter (chỉ dùng khi đo/thử)
  const L = { ...LIMIT, ...(opts.limit || {}) }
  const sum = ctx.createGain(); sum.gain.value = PRE
  const limiter = ctx.createDynamicsCompressor()
  for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) limiter[k].value = L[k]
  const master = ctx.createGain(); master.gain.value = MASTER / makeupOf(L)
  sum.connect(limiter); limiter.connect(master); master.connect(out)
  const g = {}
  for (const name of Object.keys(GROUPS)) { g[name] = ctx.createGain(); g[name].gain.value = GROUPS[name]; g[name].connect(sum) }
  return {
    music: g.music, sfx: g.sfx, amb: g.amb, sum, limiter, master,
    setGroup(name, v) { if (g[name]) g[name].gain.setTargetAtTime(Math.max(0, +v || 0), ctx.currentTime, 0.05) },
    groups() { return { music: g.music.gain.value, sfx: g.sfx.gain.value, amb: g.amb.gain.value } },
  }
}

// Đồng hồ đo đầu ra tổng (cho QA): 2 AnalyserNode rẽ nhánh sau gain tổng, không ảnh hưởng tiếng. track(true) bật theo dõi đỉnh liên tục (20 lần/giây).
export function createMeter(ctx, mixer) {
  const split = ctx.createChannelSplitter(2), an = [ctx.createAnalyser(), ctx.createAnalyser()]
  mixer.master.connect(split)
  an.forEach((a, i) => { a.fftSize = 2048; split.connect(a, i) })
  const buf = new Float32Array(2048)
  let timer = 0, peak = 0, minRed = 0, sumSq = 0, n = 0, since = 0
  const db = (x) => +(20 * Math.log10(Math.max(x, 1e-9))).toFixed(2)
  function sample() {
    let pk = 0, ss = 0
    for (const a of an) { a.getFloatTimeDomainData(buf); for (let i = 0; i < buf.length; i++) { const v = buf[i], av = v < 0 ? -v : v; if (av > pk) pk = av; ss += v * v } }
    return { pk, rms: Math.sqrt(ss / (buf.length * 2)), red: mixer.limiter.reduction }
  }
  return {
    now() { const s = sample(); return { peakDb: db(s.pk), rmsDb: db(s.rms), reductionDb: +(+s.red).toFixed(2) } },
    track(on) {
      if (on === false) { clearInterval(timer); timer = 0; return this.report() }
      peak = 0; minRed = 0; sumSq = 0; n = 0; since = performance.now(); clearInterval(timer)
      timer = setInterval(() => { if (ctx.state !== 'running') return; const s = sample(); peak = Math.max(peak, s.pk); minRed = Math.min(minRed, s.red); sumSq += s.rms * s.rms; n++ }, 50)
      return true
    },
    report() { return { secs: +((performance.now() - since) / 1000).toFixed(1), peakDb: db(peak), rmsDb: n ? db(Math.sqrt(sumSq / n)) : null, maxReductionDb: +minRed.toFixed(2), tracking: !!timer } },
  }
}

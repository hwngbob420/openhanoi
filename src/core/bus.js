// Bus sự kiện dùng chung giữa các khối (world / gameplay / ui / audio / characters). Chỉ Studio Lead sửa file này.
const L = {}
export const bus = {
  on(ev, fn) { (L[ev] ||= []).push(fn); return () => { L[ev] = (L[ev] || []).filter((f) => f !== fn) } },
  emit(ev, data) { for (const f of (L[ev] || []).slice()) { try { f(data) } catch (e) { console.error('[bus]', ev, e); (window.__stats ||= { errors: [] }).errors.push(`bus ${ev}: ${e && e.stack || e}`) } } },
}
window.__bus = bus

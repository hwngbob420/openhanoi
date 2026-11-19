// Thông báo nổi lớn (nằm trên cả điện thoại), tự tắt sau ~4 giây, không chặn chạm (pointer-events:none).
let el = null, timer = 0
export const NOTICE_MS = 4000
export function bigNotice(text, opts = {}) {
  if (!el) {
    el = document.createElement('div'); el.id = 'gp-big-notice'; el.setAttribute('role', 'alert')
    el.style.cssText = 'position:fixed;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;width:min(92vw,560px);box-sizing:border-box;padding:14px 18px;border-radius:14px;border:3px solid #ffd96a;background:rgba(150,28,24,.96);color:#fff;font:800 clamp(16px,4.6vw,24px)/1.3 "Segoe UI",system-ui,sans-serif;text-align:center;text-shadow:0 2px 0 rgba(0,0,0,.35);box-shadow:0 8px 28px rgba(0,0,0,.55);pointer-events:none;user-select:none;opacity:0;transition:opacity .18s'
    document.body.appendChild(el)
  }
  el.textContent = text; el.style.display = ''
  requestAnimationFrame(() => { if (el) el.style.opacity = '1' })
  clearTimeout(timer)
  timer = setTimeout(() => { if (!el) return; el.style.opacity = '0'; timer = setTimeout(() => { if (el) el.style.display = 'none' }, 220) }, opts.ms || NOTICE_MS)
}

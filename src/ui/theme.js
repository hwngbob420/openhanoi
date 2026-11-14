// Giao diện điện thoại: màu, font pixel (nhúng), CSS, và vài hàm dựng DOM nhỏ dùng chung.
import FONT from './font-data.js'

const ICONS = import.meta.glob('./icons/*.svg', { query: '?raw', import: 'default', eager: true })
const iconCache = {}
// icon('phone', 24) -> <span class="hx-ic"> chứa SVG pixelarticons (24x24, fill currentColor)
export function icon(name, size = 24) {
  let raw = iconCache[name]
  if (raw === undefined) {
    const src = ICONS[`./icons/${name}.svg`] || ''
    raw = iconCache[name] = src.replace(/width="24" height="24"/, 'width="100%" height="100%" shape-rendering="crispEdges"')
  }
  const s = document.createElement('span')
  s.className = 'hx-ic'; s.style.width = s.style.height = size + 'px'; s.innerHTML = raw
  return s
}

// h('div', {class:'x', onclick(){}}, child, 'text', ...) -> phần tử
export function h(tag, props, ...kids) {
  const el = document.createElement(tag)
  if (props) for (const k in props) {
    const v = props[k]
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'style') el.style.cssText = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (k === 'text') el.textContent = v
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat(3)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))) }
  return el
}

export const vnd = (n) => (Math.round(+n || 0) < 0 ? '-' : '') + String(Math.abs(Math.round(+n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫'
export const hhmm = (hr) => { hr = ((+hr || 0) % 24 + 24) % 24; let H = Math.floor(hr), M = Math.floor((hr - H) * 60); return String(H).padStart(2, '0') + ':' + String(M).padStart(2, '0') }

export const APP_COLORS = { jobs: '#ffb62e', ride: '#35c4b0', debts: '#ff6b5e', shop: '#e86bb0', gram: '#8b7bff' }

export const CSS = `
@font-face{font-family:HXPixel;src:url(${FONT}) format('woff2');font-display:block}
#hx-root{--bg:#141824;--panel:#1f2538;--panel2:#2b3452;--ink:#f4efe2;--dim:#a2abc6;--acc:#ffd23a;--good:#62d894;--bad:#ff6f61;--line:#080a11;--edge:#6b5f45;
 position:fixed;inset:0;z-index:20;pointer-events:none;font-family:HXPixel,system-ui,sans-serif;font-size:16px;line-height:1.35;color:var(--ink);-webkit-tap-highlight-color:transparent;
 -webkit-user-select:none;user-select:none}
#hx-root *{box-sizing:border-box;font-family:inherit}
:where(#hx-root) button{font:inherit;color:inherit;cursor:pointer;border:0;padding:0;background:none;touch-action:manipulation}
.hx-ic{display:inline-block;flex:none;line-height:0}.hx-ic svg{display:block}

/* ---- HUD (dưới hàng nút thời tiết của world, bên phải) ---- */
#hx-hud{position:fixed;top:58px;right:8px;display:flex;gap:4px;pointer-events:none;z-index:7}
.hx-chip{display:flex;align-items:center;gap:4px;height:32px;padding:0 8px 0 4px;background:rgba(14,15,19,.82);border:2px solid var(--edge);border-radius:6px;font-size:16px;white-space:nowrap}
.hx-chip .hx-ic{color:var(--acc)}
.hx-chip.st .hx-ic{color:#7fe0ff}.hx-chip.md .hx-ic{color:#ff9fc8}
.hx-mini{width:36px;height:8px;background:#0b0e16;border:1px solid #000;position:relative;image-rendering:pixelated}
.hx-mini i{position:absolute;left:0;top:0;bottom:0;background:#62d894}.hx-mini.low i{background:#ff6f61}.hx-mini.mid i{background:#ffd23a}
@media (max-width:700px){#hx-dock{bottom:76px;flex-direction:column;align-items:flex-end}#hx-hud{left:8px;right:8px;justify-content:flex-end;gap:3px}.hx-chip{padding:0 6px 0 2px;gap:2px;font-size:12px}.hx-mini{width:28px}}

/* ---- nút nổi: điện thoại + nhạc ---- */
#hx-dock{position:fixed;right:12px;bottom:16px;display:flex;gap:8px;align-items:flex-end;z-index:7;pointer-events:none}
.hx-fab{pointer-events:auto;position:relative;width:56px;height:56px;border-radius:10px;background:#ffd23a;color:#1a1306;border:3px solid #080a11;box-shadow:0 4px 0 #080a11,inset 0 -4px 0 rgba(0,0,0,.18),inset 0 3px 0 rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center}
.hx-fab:active{transform:translateY(3px);box-shadow:0 1px 0 #080a11}
.hx-fab.sm{width:44px;height:44px;background:#2b3452;color:#f4efe2;border-color:#080a11}
.hx-fab.off{color:#7a8299}
.hx-badge{position:absolute;right:-6px;top:-8px;min-width:20px;height:20px;border-radius:10px;background:#ff6f61;color:#fff;border:2px solid #080a11;font-size:12px;display:none;align-items:center;justify-content:center;padding:0 4px}
.hx-badge.on{display:flex}
body.hx-open #hx-dock{display:none}

/* ---- điện thoại ---- */
#hx-phone{position:fixed;right:16px;bottom:16px;width:372px;height:min(700px,calc(100vh - 124px));min-height:320px;padding:6px;border-radius:22px;background:#0b0e16;border:3px solid #3a3f55;
 box-shadow:0 0 0 3px #080a11,0 18px 40px rgba(0,0,0,.55);transform:translateY(calc(100% + 40px));transition:transform .28s cubic-bezier(.2,.8,.2,1);pointer-events:none;visibility:hidden;z-index:12;display:flex}
#hx-phone.open{transform:none;pointer-events:auto;visibility:visible}
#hx-phone.closing{visibility:visible}
.hx-screen{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--bg);border-radius:16px;overflow:hidden;position:relative}
.hx-status{flex:none;height:44px;display:flex;align-items:center;gap:6px;padding:0 4px 0 12px;background:#0f1320;border-bottom:2px solid #080a11}
.hx-status .t{flex:1;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hx-status .m{color:var(--acc);font-size:16px;white-space:nowrap}
.hx-sbtn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--ink)}
.hx-sbtn.off{color:#6a7390}
.hx-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.hx-nav{flex:none;height:52px;display:flex;background:#0f1320;border-top:2px solid #080a11}
.hx-nav button{flex:1;height:100%;min-height:44px;display:flex;align-items:center;justify-content:center;gap:6px;color:var(--dim);font-size:16px}
.hx-nav button:active{background:#1d2440;color:var(--ink)}
.hx-nav button[disabled]{opacity:.35}
.hx-notify{position:absolute;left:8px;right:8px;top:50px;z-index:3;background:#ffd23a;color:#1a1306;border:2px solid #080a11;border-radius:6px;padding:6px 10px;font-size:16px;box-shadow:0 3px 0 #080a11;pointer-events:none;animation:hxin .2s}
@keyframes hxin{from{transform:translateY(-8px);opacity:0}}

/* ---- màn hình chủ ---- */
.hx-home{min-height:100%;padding:14px 12px 16px;background:linear-gradient(#1a2140,#141824 70%);
 background-image:radial-gradient(#ffffff14 1px,transparent 1.5px),linear-gradient(#1a2140,#141824 70%);background-size:12px 12px,100% 100%}
.hx-home h2{margin:0 0 2px;font-size:24px;font-weight:400;color:var(--acc)}
.hx-home .sub{color:var(--dim);font-size:12px;margin-bottom:14px}
.hx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.hx-tile{min-height:104px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;padding:6px 2px;border-radius:8px}
.hx-tile .ico{width:60px;height:60px;border-radius:12px;border:3px solid #080a11;display:flex;align-items:center;justify-content:center;color:#1a1306;box-shadow:0 4px 0 #080a11,inset 0 -5px 0 rgba(0,0,0,.2),inset 0 3px 0 rgba(255,255,255,.35)}
.hx-tile:active .ico{transform:translateY(3px);box-shadow:0 1px 0 #080a11}
.hx-tile .lb{font-size:12px;text-align:center;line-height:1.25;max-width:100px}
.hx-demo{display:inline-block;margin-top:14px;padding:2px 8px;border:2px dashed #7a8299;color:#a2abc6;font-size:12px;border-radius:4px}

/* ---- trong app ---- */
.hx-app{padding:10px 10px 18px}
.hx-head{display:flex;align-items:center;gap:8px;margin:0 0 10px}
.hx-head .ico{width:36px;height:36px;border-radius:8px;border:2px solid #080a11;display:flex;align-items:center;justify-content:center;color:#1a1306}
.hx-head .tt{flex:1;min-width:0}.hx-head .tt b{display:block;font-weight:400;font-size:16px}.hx-head .tt span{font-size:12px;color:var(--dim)}
.hx-card{background:var(--panel);border:2px solid #080a11;border-radius:8px;padding:10px;margin-bottom:8px;box-shadow:inset 0 2px 0 rgba(255,255,255,.06)}
.hx-card.hi{border-color:var(--acc);background:#2b2a1d}
.hx-card.tap{display:block;width:100%;text-align:left;min-height:44px}
.hx-card.tap:active{background:var(--panel2)}
.hx-row{display:flex;align-items:center;gap:8px}.hx-row.sp{justify-content:space-between}
.hx-grow{flex:1;min-width:0}
.hx-title{font-size:16px}.hx-sm{font-size:12px;color:var(--dim)}
.hx-pay{color:var(--acc);white-space:nowrap}
.hx-good{color:var(--good)}.hx-bad{color:var(--bad)}
.hx-tag{display:inline-block;padding:0 6px;font-size:12px;border-radius:3px;background:#0b0e16;color:var(--dim);border:1px solid #3a4160;margin-right:4px}
.hx-tag.a{color:#1a1306;background:var(--acc);border-color:#080a11}
.hx-btn{min-height:44px;padding:0 14px;border-radius:8px;background:var(--panel2);border:2px solid #080a11;box-shadow:0 3px 0 #080a11,inset 0 2px 0 rgba(255,255,255,.12);display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:16px;color:var(--ink)}
.hx-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #080a11}
.hx-btn.pri{background:var(--acc);color:#1a1306;box-shadow:0 3px 0 #080a11,inset 0 2px 0 rgba(255,255,255,.4)}
.hx-btn.bad{background:#7a2e2a}
.hx-btn.blk{display:flex;width:100%}
.hx-btn[disabled]{opacity:.4;pointer-events:none}
.hx-btns{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.hx-btns .hx-btn{flex:1;min-width:110px}
.hx-bar{height:12px;background:#0b0e16;border:2px solid #080a11;border-radius:3px;overflow:hidden;margin:6px 0}
.hx-bar i{display:block;height:100%;background:var(--good)}
.hx-empty{text-align:center;color:var(--dim);padding:28px 10px}
.hx-empty .hx-ic{opacity:.5;margin-bottom:6px}
.hx-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin-top:8px}.hx-kv span:nth-child(odd){color:var(--dim)}.hx-kv span:nth-child(even){text-align:right}
.hx-desc{margin:6px 0 0;color:#d9d3c3;font-size:16px}

/* shop */
.hx-tabs{display:flex;gap:6px;margin-bottom:8px}
.hx-tabs button{flex:1;min-height:44px;border-radius:8px;background:var(--panel);border:2px solid #080a11;color:var(--dim)}
.hx-tabs button.on{background:var(--acc);color:#1a1306}
.hx-prev{display:flex;gap:12px;align-items:center}
.hx-prev .stage{flex:none;width:112px;height:176px;background:repeating-conic-gradient(#232b45 0 25%,#1b2138 0 50%) 0 0/16px 16px;border:2px solid #080a11;border-radius:8px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
.hx-prev canvas{position:static;inset:auto;cursor:default;image-rendering:pixelated;width:96px;height:168px}
.hx-opt{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:6px 10px;margin-bottom:6px;background:var(--panel);border:2px solid #080a11;border-radius:8px;text-align:left}
.hx-opt.sel{border-color:var(--acc);background:#2b2a1d}
.hx-sw{flex:none;width:28px;height:28px;border:2px solid #080a11;border-radius:4px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.18)}

/* gram */
.hx-post{background:var(--panel);border:2px solid #080a11;border-radius:8px;margin-bottom:10px;overflow:hidden}
.hx-post .ph{height:84px;display:flex;align-items:flex-end;padding:6px 10px;color:#fff;position:relative;text-shadow:0 2px 0 rgba(0,0,0,.6)}
.hx-post .ph .hx-ic{position:absolute;right:8px;top:8px;opacity:.5}
.hx-post .pb{padding:8px 10px 10px}
.hx-av{flex:none;width:32px;height:32px;border-radius:50%;border:2px solid #080a11;display:flex;align-items:center;justify-content:center;font-size:16px;color:#1a1306;overflow:hidden}
.hx-like{min-height:44px;min-width:44px;display:inline-flex;align-items:center;gap:4px;color:var(--dim);padding:0 6px}
.hx-like.on{color:#ff6f9a}

/* toast của UI: dưới HUD, không đè toast cũ của player.js (top:18px) */
#hx-toasts{position:fixed;left:50%;top:104px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;z-index:30;pointer-events:none;width:min(92vw,420px)}
.hx-toast{background:rgba(20,24,36,.94);color:var(--ink);border:2px solid var(--acc);border-radius:6px;padding:6px 12px;font-size:16px;text-align:center;box-shadow:0 3px 0 #080a11;animation:hxin .18s}
.hx-toast.bad{border-color:var(--bad)}.hx-toast.good{border-color:var(--good)}

body.hx-open #hx-toasts{top:auto;bottom:72px}
body.hx-open #gp-job-chip{display:none!important}
@media (max-width:700px){
 #hx-phone{left:0;right:0;bottom:0;top:102px;width:auto;height:auto;min-height:0;border-radius:18px 18px 0 0;padding:5px 5px 0}
 .hx-screen{border-radius:14px 14px 0 0}
}
@media (max-height:420px) and (min-width:701px){#hx-phone{height:calc(100vh - 106px)}}
`

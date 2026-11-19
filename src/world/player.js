'use strict';
import { bus } from '../core/bus.js';
import { State } from '../core/state.js';
// Player, collision, follow camera and point-of-interest (POI) hook for the open world.
// Loaded BEFORE the inline world script in index.html. The world calls Game.init once after
// generation, then Game.update(dt) and Game.pushDrawable(list) every frame.
//
// Linking a minigame later: Game.registerPOI({ id, label, gx, gy, r, onInteract(poi) }).
const Game = (() => {
  const RADIUS = 0.22;       // player body radius, in tiles
  const SPEED = 3.4;         // tiles per second
  const S = {
    mode: 'play',            // 'play' = follow player, 'free' = legacy drag/pan viewer
    view: null,              // { w, h, ox, oy } set by the world each frame
    player: { gx: 0, gy: 0, dir: 'down', moving: false, t: 0 },
    target: null,
    pois: [],
    near: null,
  };
  let locked = false, custom = false;   // locked: khóa di chuyển (mini-game); custom: đang dùng sprite từ __characters
  let auto = null;                      // Auto-Walk: { path:[{gx,gy}], i, cb(reason), canWait(), stuckT, waited } — đi như đang bấm phím, cùng tốc độ/va chạm
  function stopAuto(reason) { if (!auto) return false; const a = auto; auto = null; S.player.moving = false; try { a.cb && a.cb(reason) } catch (e) { console.error('[player] autowalk cb', e) } return true }
  const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])
  let world = null, block = null, colliders = [], stuck = 0, sprites = null, toastTimer = 0;
  const keys = new Set();
  let promptEl = null, toastEl = null;

  // ───── placeholder character (code-drawn, 4 facings x 4 walk frames) ─────
  function makePerson(dir, f) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 28;
    const x = c.getContext('2d');
    const R = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
    const SKIN = '#e8b890', HAIR = '#2a2320', SHIRT = '#c94a3a', SHIRT_D = '#9c382c', PANTS = '#2f3a4a', PANTS_D = '#232c3a', SHOE = '#17181c';
    const bob = f === 1 || f === 3 ? 1 : 0;
    const side = dir === 'right' || dir === 'left';
    if (!side) {
      const lift = f === 1 ? 0 : f === 3 ? 1 : -1;
      for (const [i, lx] of [[0, 5], [1, 9]]) { const up = lift === i ? 1 : 0; R(lx, 20, 3, 5 - up, PANTS); R(lx, 25 - up, 3, 1, SHOE); }
      R(4, 11 + bob, 8, 9, SHIRT); R(4, 11 + bob, 1, 9, SHIRT_D);
      const sw = f === 1 ? 1 : f === 3 ? -1 : 0;
      R(3, 12 + bob + sw, 1, 6, SHIRT_D); R(12, 12 + bob - sw, 1, 6, SHIRT_D);
      R(4, 3 + bob, 8, 8, dir === 'up' ? HAIR : SKIN);
      if (dir === 'down') { R(4, 3 + bob, 8, 3, HAIR); R(4, 5 + bob, 1, 3, HAIR); R(11, 5 + bob, 1, 3, HAIR); R(6, 7 + bob, 1, 1, '#222'); R(9, 7 + bob, 1, 1, '#222'); }
    } else {
      const lx = f === 1 ? [4, 9] : f === 3 ? [9, 4] : [6, 7];
      R(lx[0], 20, 3, 5, PANTS_D); R(lx[0], 25, 3, 1, SHOE);
      R(lx[1], 20, 3, 5, PANTS); R(lx[1], 25, 3, 1, SHOE);
      R(5, 11 + bob, 6, 9, SHIRT); R(5, 11 + bob, 1, 9, SHIRT_D);
      const sw = f === 1 ? 1 : f === 3 ? -1 : 0;
      R(7 + sw, 12 + bob, 2, 6, SHIRT_D);
      R(4, 3 + bob, 8, 8, SKIN); R(4, 3 + bob, 8, 3, HAIR); R(4, 5 + bob, 4, 4, HAIR); R(10, 7 + bob, 1, 1, '#222');
    }
    // 1px outline around the figure, then the ground shadow
    const d = x.getImageData(0, 0, 16, 28), a = d.data, o = new Uint8ClampedArray(a);
    const solid = (X, Y) => X >= 0 && Y >= 0 && X < 16 && Y < 28 && a[(Y * 16 + X) * 4 + 3] > 0;
    for (let Y = 0; Y < 28; Y++) for (let X = 0; X < 16; X++) if (!solid(X, Y) && (solid(X + 1, Y) || solid(X - 1, Y) || solid(X, Y + 1) || solid(X, Y - 1))) { const i = (Y * 16 + X) * 4; o[i] = 28; o[i + 1] = 26; o[i + 2] = 31; o[i + 3] = 255; }
    x.putImageData(new ImageData(o, 16, 28), 0, 0);
    x.globalCompositeOperation = 'destination-over'; R(3, 26, 10, 2, 'rgba(0,0,0,0.28)');
    if (dir !== 'left') return c;
    const m = document.createElement('canvas'); m.width = 16; m.height = 28; const mx = m.getContext('2d');
    mx.translate(16, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0); return m;
  }
  function buildSprites() {
    sprites = {};
    for (const dir of ['up', 'down', 'left', 'right']) sprites[dir] = [0, 1, 2, 3].map((f) => makePerson(dir === 'left' ? 'left' : dir, f));
    // 'left' is drawn as the mirror of the 'right' pose
    for (const f of [0, 1, 2, 3]) { const r = makePerson('right', f), m = document.createElement('canvas'); m.width = 16; m.height = 28; const mx = m.getContext('2d'); mx.translate(16, 0); mx.scale(-1, 1); mx.drawImage(r, 0, 0); sprites.left[f] = m; }
    if (!useCharacterSprites()) loadArt();
  }
  // Nhân vật do khối characters vẽ (theo trang phục hiện tại). Trả về true nếu đã áp dụng.
  function useCharacterSprites() {
    try {
      const C = window.__characters; if (!C || typeof C.getSprites !== 'function') return false;
      const sp = C.getSprites(State.outfit);
      if (!sp || !['up', 'down', 'left', 'right'].every((d) => sp[d] && sp[d].length >= 4)) return false;
      sprites = sp; custom = true; return true;
    } catch (e) { console.error('[player] getSprites', e); return false; }
  }
  // Hand-drawn character (assets/src/player.px.js, built with pxl). Replaces the placeholder once all 12 frames load.
  function loadArt() {
    const got = {}; let n = 0;
    for (const dir of ['down', 'up', 'right']) for (let f = 0; f < 4; f++) {
      const im = new Image(); im.onload = () => {
        got[dir + f] = im;
        if (++n < 12 || custom) return;
        for (let g = 0; g < 4; g++) {
          sprites.down[g] = got['down' + g]; sprites.up[g] = got['up' + g]; sprites.right[g] = got['right' + g];
          const m = document.createElement('canvas'); m.width = 16; m.height = 28; const mx = m.getContext('2d');
          mx.translate(16, 0); mx.scale(-1, 1); mx.drawImage(got['right' + g], 0, 0); sprites.left[g] = m;
        }
      };
      im.src = window.__BUNDLE.player[dir + '_' + f];
    }
  }

  // ───── collision ─────
  const PROP_R = { prop_blade_sign: 0, prop_moto_row: 0.55, prop_xichlo: 0.5, prop_cafe_set: 0.35 };
  function buildCollision() {
    if (world.isBlocked) { colliders = world.colliders; return }
    const { W, N } = world;
    block = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => W.ground[y][x] === 'water'));
    const fill = (gx, gy, w, d) => { for (let y = Math.floor(gy); y < Math.ceil(gy + d); y++) for (let x = Math.floor(gx); x < Math.ceil(gx + w); x++) if (x >= 0 && y >= 0 && x < N && y < N) block[y][x] = true; };
    colliders = [];
    for (const o of W.objs) {
      if (o.t === 'b') fill(o.gx, o.gy, o.w, o.d);
      else if (o.t === 'box' && o.h > 10) fill(o.gx, o.gy, o.w, o.d);
      else if (o.t === 't') colliders.push({ x: o.gx, y: o.gy, r: 0.3 });
      else if (o.t === 'p') colliders.push({ x: o.gx, y: o.gy, r: 0.2 });
      else if (o.t === 'm') colliders.push({ x: o.gx, y: o.gy, r: 0.2 });
      else if (o.t === 'q') { const r = o.n in PROP_R ? PROP_R[o.n] : 0.4; if (r > 0) colliders.push({ x: o.gx, y: o.gy, r }); }
    }
  }
  function walkable(x, y, r) {
    const N = world.N;
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const tx = Math.floor(x + dx), ty = Math.floor(y + dy);
      if (tx < 0 || ty < 0 || tx >= N || ty >= N || (world.isBlocked ? world.isBlocked(tx, ty) : block[ty][tx])) return false;
    }
    for (const c of colliders) if (Math.hypot(x - c.x, y - c.y) < r + c.r) return false;
    return true;
  }
  function findSpawn(cx, cy) {
    for (let k = 0; k < 60; k++) for (let a = 0; a < 16; a++) { const x = cx + Math.cos(a / 16 * 6.283) * k * 0.25, y = cy + Math.sin(a / 16 * 6.283) * k * 0.25; if (walkable(x, y, RADIUS + 0.1)) return [x, y]; }
    return [cx, cy];
  }

  // ───── DOM overlays (crisp text, also tappable on mobile) ─────
  function makeDom() {
    const css = 'position:fixed;left:50%;transform:translateX(-50%);font:14px/1.3 system-ui,sans-serif;color:#f4efe2;background:rgba(14,15,19,.82);border:1px solid #6b5f45;border-radius:6px;padding:8px 14px;z-index:5;';
    promptEl = document.createElement('button'); promptEl.style.cssText = css + 'bottom:28px;cursor:pointer;display:none;min-height:44px;'; promptEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); interact(); });
    toastEl = document.createElement('div'); toastEl.style.cssText = css + 'top:18px;pointer-events:none;display:none;';
    document.body.append(promptEl, toastEl);
  }
  function toast(msg, ms = 2600) { toastEl.textContent = msg; toastEl.style.display = ''; toastTimer = ms / 1000; }
  function interact() { if (S.mode !== 'play' || !S.near || locked) return; const p = S.near; bus.emit('poi:interact', { poi: p }); if (p.onInteract) p.onInteract(p); else toast(p.label); }

  // ───── per-frame ─────
  function facingFromScreen(sx, sy) { return Math.abs(sx) >= Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up'); }
  function update(dt) {
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) toastEl.style.display = 'none';
    if (!world || S.mode !== 'play') return;
    const p = S.player;
    let ix = 0, iy = 0;
    if (locked) { S.target = null; if (auto) stopAuto('locked') }
    if (!locked) { if (keys.has('w') || keys.has('arrowup')) iy -= 1; if (keys.has('s') || keys.has('arrowdown')) iy += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1; if (keys.has('d') || keys.has('arrowright')) ix += 1; }
    let vx = 0, vy = 0;
    if (ix || iy) { const l = Math.hypot(ix, iy); ix /= l; iy /= l; vx = (ix + iy) / Math.SQRT2; vy = (iy - ix) / Math.SQRT2; S.target = null; p.dir = Math.abs(ix) >= Math.abs(iy) && ix ? (ix > 0 ? 'right' : 'left') : (iy > 0 ? 'down' : 'up'); }
    else if (S.target && !locked) {
      const dx = S.target.gx - p.gx, dy = S.target.gy - p.gy, d = Math.hypot(dx, dy);
      if (d < 0.1) S.target = null; else { vx = dx / d; vy = dy / d; const [sx, sy] = world.proj(dx, dy); p.dir = facingFromScreen(sx, sy * 2); }
    }
    let autoStep = 1;                                                       // hệ số giảm bước để dừng đúng điểm (không vượt quá)
    if (auto) {
      if (ix || iy) stopAuto('manual');                                     // đang giữ phím khi bắt đầu đi tự động → tay được ưu tiên
      else {
        const a = auto, P = a.path;
        while (a.i < P.length - 1 && Math.hypot(P[a.i].gx - p.gx, P[a.i].gy - p.gy) < 0.15) a.i++;
        const w = P[a.i], dx = w.gx - p.gx, dy = w.gy - p.gy, d = Math.hypot(dx, dy);
        if (a.i >= P.length - 1 && d < 0.18) { stopAuto('arrived') }
        else if (d > 9) stopAuto('stuck')                                   // bị đẩy lạc xa đường (vd. tàu đưa vào vỉa hè): tìm đường lại
        else {
          vx = dx / d; vy = dy / d; autoStep = Math.min(1, d / (SPEED * dt + 1e-6))
          const [sx, sy] = world.proj(dx, dy), ax = Math.abs(sx), ay = Math.abs(sy * 2)    // đổi hướng mặt có độ trễ, tránh nháy khi đi chéo
          const cur = p.dir, curH = cur === 'left' || cur === 'right', keep = curH ? ax >= ay * 0.8 : ay >= ax * 0.8
          if (!keep || !['up', 'down', 'left', 'right'].includes(cur)) p.dir = facingFromScreen(sx, sy * 2)
          else if (curH) p.dir = sx > 0 ? 'right' : 'left'; else p.dir = sy > 0 ? 'down' : 'up'
        }
      }
    }
    p.moving = !!(vx || vy);
    if (p.moving) {
      const bx = p.gx, by = p.gy, mx = vx * SPEED * dt * autoStep, my = vy * SPEED * dt * autoStep;
      if (walkable(p.gx + mx, p.gy, RADIUS)) p.gx += mx;
      if (walkable(p.gx, p.gy + my, RADIUS)) p.gy += my;
      const moved = Math.hypot(p.gx - bx, p.gy - by)
      if (S.target) { stuck = moved < 1e-5 ? stuck + 1 : 0; if (stuck > 6) { S.target = null; stuck = 0; } }
      if (auto) {
        if (moved < SPEED * dt * autoStep * 0.25) {
          auto.stuckT += dt                                                 // kẹt: thanh chắn tàu đang hạ thì đứng chờ, còn lại thì tìm đường lại
          if (auto.stuckT > 0.7) {
            if (auto.canWait && auto.canWait() && (auto.waited += dt) < 60) { p.moving = false; auto.stuckT = 0.7 }
            else stopAuto('stuck')
          }
        } else auto.stuckT = 0
      }
      if (p.moving) p.t += dt; else p.t = 0;
    } else p.t = 0;
    // follow camera
    const [sx, sy] = world.proj(p.gx, p.gy), k = Math.min(1, dt * 6);
    world.cam.x += (sx - world.cam.x) * k; world.cam.y += (sy - 10 - world.cam.y) * k;
    // nearest POI in range
    let near = null, nd = 1e9, nr = -1;
    if (!locked) for (const q of S.pois) {      // marker (việc vặt) luôn thắng POI khám phá khi cùng tầm; marker việc ('job:') thắng marker ăn cùng quán (QA đợt 4); cùng hạng thì lấy cái gần nhất
      const d = Math.hypot(q.gx - p.gx, q.gy - p.gy); if (d > q.r) continue;
      const rk = q.marker ? (String(q.id).startsWith('job:') ? 2 : 1) : 0;
      if (!near || rk > nr || (rk === nr && d < nd)) { near = q; nd = d; nr = rk; }
    }
    if (near !== S.near) { S.near = near; promptEl.style.display = near ? '' : 'none'; }
    if (near && promptEl.dataset.l !== near.label) { promptEl.dataset.l = near.label; promptEl.textContent = 'E / chạm — ' + near.label; }
  }
  function pushDrawable(list) {
    if (!sprites) return;
    const p = S.player, fr = p.moving ? Math.floor(p.t * 8) % 4 : 0;
    list.push({ t: 'pl', c: sprites[p.dir][fr], ox: 8, oy: 26 - (fr & 1) + (world.groundZ ? world.groundZ(p.gx, p.gy) : 0), gx: p.gx, gy: p.gy, key: p.gx + p.gy, bb: [p.gx - 0.25, p.gx + 0.25, p.gy - 0.25, p.gy + 0.25] });
  }
  const uiBusy = () => { try { return !!(window.__ui && window.__ui.isPhoneOpen && window.__ui.isPhoneOpen()) } catch { return false } };
  function pointer(e, kind) {
    if (!world || !S.view || locked) return;
    if (kind === 'up') { return; }
    if (uiBusy()) return;                          // chạm lúc điện thoại đang mở: không đi
    if (e.target && e.target.tagName && e.target.tagName !== 'CANVAS') return;   // chỉ chạm lên bản đồ mới tính; nút/giao diện thì không
    const { ox, oy, w, h } = S.view, sx = e.clientX * w / innerWidth - ox, sy = e.clientY * h / innerHeight - oy;   // đúng cả khi zoom đang trôi (số lẻ)
    const [tw, th] = world.tile(), a = sx / (tw / 2), b = sy / (th / 2);
    if (kind === 'down' || (kind === 'move' && e.buttons)) { if (auto) stopAuto('manual'); S.target = { gx: (a + b) / 2, gy: (b - a) / 2 }; }
  }

  function init(w) {
    world = w; makeDom(); buildSprites(); buildCollision();
    const [gx, gy] = findSpawn(...(world.spawn || [22.5, 21.5])); S.player.gx = gx; S.player.gy = gy;
    const [sx, sy] = world.proj(gx, gy); world.cam.x = sx; world.cam.y = sy - 10;
    bus.on('outfit:changed', () => { useCharacterSprites(); });
    bus.on('world:ready', () => { useCharacterSprites(); });   // characters có thể nạp sau world
    bus.on('phone:open', () => { S.target = null; keys.clear(); });
    bus.on('minigame:start', () => { S.target = null; keys.clear(); stopAuto('locked'); });
  }
  function setMode(m) { S.mode = m; S.target = null; if (m === 'free') { promptEl.style.display = 'none'; S.near = null; } toast(m === 'play' ? 'Chế độ chơi' : 'Camera tự do (F để quay lại)', 1400); }

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing) return;                              // đang gõ trong giao diện: không điều khiển nhân vật
    const k = e.key.toLowerCase(); keys.add(k);
    if (auto && MOVE_KEYS.has(k)) stopAuto('manual');             // bấm WASD / mũi tên: trả quyền cho tay ngay
    if (!world) return;
    if (k === 'e' || k === ' ') { if (S.near) e.preventDefault(); interact(); }
    if (k === 'f') setMode(S.mode === 'play' ? 'free' : 'play');
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  return {
    get mode() { return S.mode; }, set view(v) { S.view = v; }, get state() { return S; },
    init, update, pushDrawable, pointer, registerPOI: (p) => { S.pois.push(p); return p; }, toast, interact,
    extraHud: '',
    hudLine() { return `player ${S.player.gx.toFixed(1)},${S.player.gy.toFixed(1)}  ${S.mode}${this.extraHud ? '  ' + this.extraHud : ''}\n[WASD/click move · E interact · F free cam · T time of day]`; },
    // test helpers
    walkableAt: (x, y) => walkable(x, y, RADIUS),
    teleport: (x, y) => { stopAuto('cancelled'); S.player.gx = x; S.player.gy = y; S.target = null; if (world) { const [sx, sy] = world.proj(x, y); world.cam.x = sx; world.cam.y = sy - 10; } },
    unregisterPOI: (p) => { const i = S.pois.indexOf(p); if (i >= 0) S.pois.splice(i, 1); if (S.near === p) { S.near = null; promptEl.style.display = 'none'; promptEl.dataset.l = ''; } },
    setLocked: (v) => { locked = !!v; if (locked) { stopAuto('locked'); S.target = null; keys.clear(); S.player.moving = false; S.near = null; promptEl.style.display = 'none'; } },
    get locked() { return locked; },
    startAuto(path, cb, canWait) { stopAuto('cancelled'); if (locked || !path || !path.length) return false; S.target = null; auto = { path, i: 0, cb, canWait, stuckT: 0, waited: 0 }; return true; },
    stopAuto, get autoActive() { return !!auto; },
  };
})();
window.__game = Game;
window.Game = Game
export { Game }

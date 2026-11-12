'use strict';
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
  }

  // ───── collision ─────
  const PROP_R = { prop_blade_sign: 0, prop_moto_row: 0.55, prop_xichlo: 0.5, prop_cafe_set: 0.35 };
  function buildCollision() {
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
      if (tx < 0 || ty < 0 || tx >= N || ty >= N || block[ty][tx]) return false;
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
    promptEl = document.createElement('button'); promptEl.style.cssText = css + 'bottom:28px;cursor:pointer;display:none;'; promptEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); interact(); });
    toastEl = document.createElement('div'); toastEl.style.cssText = css + 'top:18px;pointer-events:none;display:none;';
    document.body.append(promptEl, toastEl);
  }
  function toast(msg, ms = 2600) { toastEl.textContent = msg; toastEl.style.display = ''; toastTimer = ms / 1000; }
  function interact() { if (S.mode !== 'play' || !S.near) return; const p = S.near; if (p.onInteract) p.onInteract(p); else toast(p.label); }

  // ───── per-frame ─────
  function facingFromScreen(sx, sy) { return Math.abs(sx) >= Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up'); }
  function update(dt) {
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) toastEl.style.display = 'none';
    if (!world || S.mode !== 'play') return;
    const p = S.player;
    let ix = 0, iy = 0;
    if (keys.has('w') || keys.has('arrowup')) iy -= 1; if (keys.has('s') || keys.has('arrowdown')) iy += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1; if (keys.has('d') || keys.has('arrowright')) ix += 1;
    let vx = 0, vy = 0;
    if (ix || iy) { const l = Math.hypot(ix, iy); ix /= l; iy /= l; vx = (ix + iy) / Math.SQRT2; vy = (iy - ix) / Math.SQRT2; S.target = null; p.dir = Math.abs(ix) >= Math.abs(iy) && ix ? (ix > 0 ? 'right' : 'left') : (iy > 0 ? 'down' : 'up'); }
    else if (S.target) {
      const dx = S.target.gx - p.gx, dy = S.target.gy - p.gy, d = Math.hypot(dx, dy);
      if (d < 0.1) S.target = null; else { vx = dx / d; vy = dy / d; const [sx, sy] = world.proj(dx, dy); p.dir = facingFromScreen(sx, sy * 2); }
    }
    p.moving = !!(vx || vy);
    if (p.moving) {
      const bx = p.gx, by = p.gy, mx = vx * SPEED * dt, my = vy * SPEED * dt;
      if (walkable(p.gx + mx, p.gy, RADIUS)) p.gx += mx;
      if (walkable(p.gx, p.gy + my, RADIUS)) p.gy += my;
      if (S.target) { stuck = Math.hypot(p.gx - bx, p.gy - by) < 1e-5 ? stuck + 1 : 0; if (stuck > 6) { S.target = null; stuck = 0; } }
      p.t += dt;
    } else p.t = 0;
    // follow camera
    const [sx, sy] = world.proj(p.gx, p.gy), k = Math.min(1, dt * 6);
    world.cam.x += (sx - world.cam.x) * k; world.cam.y += (sy - 10 - world.cam.y) * k;
    // nearest POI in range
    let near = null, nd = 1e9;
    for (const q of S.pois) { const d = Math.hypot(q.gx - p.gx, q.gy - p.gy); if (d <= q.r && d < nd) { near = q; nd = d; } }
    if (near !== S.near) { S.near = near; promptEl.style.display = near ? '' : 'none'; if (near) promptEl.textContent = 'E / chạm — ' + near.label; }
  }
  function pushDrawable(list) {
    if (!sprites) return;
    const p = S.player, fr = p.moving ? Math.floor(p.t * 8) % 4 : 0;
    list.push({ t: 'pl', c: sprites[p.dir][fr], ox: 8, oy: 26, gx: p.gx, gy: p.gy, key: p.gx + p.gy });
  }
  function pointer(e, kind) {
    if (!world || !S.view) return;
    if (kind === 'up') { return; }
    const z = world.cam.zoom, { ox, oy } = S.view, sx = e.clientX / z - ox, sy = e.clientY / z - oy;
    const [tw, th] = world.tile(), a = sx / (tw / 2), b = sy / (th / 2);
    if (kind === 'down' || (kind === 'move' && e.buttons)) S.target = { gx: (a + b) / 2, gy: (b - a) / 2 };
  }

  function init(w) {
    world = w; makeDom(); buildSprites(); buildCollision();
    const [gx, gy] = findSpawn(22.5, 21.5); S.player.gx = gx; S.player.gy = gy;
    const [sx, sy] = world.proj(gx, gy); world.cam.x = sx; world.cam.y = sy - 10;
  }
  function setMode(m) { S.mode = m; S.target = null; if (m === 'free') { promptEl.style.display = 'none'; S.near = null; } toast(m === 'play' ? 'Chế độ chơi' : 'Camera tự do (F để quay lại)', 1400); }

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase(); keys.add(k);
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
    teleport: (x, y) => { S.player.gx = x; S.player.gy = y; S.target = null; },
  };
})();
window.__game = Game;

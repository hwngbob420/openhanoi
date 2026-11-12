"""Codex sheet of small items (on noisy magenta) -> game-scale sprites + manifest entries in assets2.

usage: python -I slice_codex_sheet.py <sheet.png> <prefix> <names> --kind prop|vehicle|tree --target-w 56 [--mirror]
                                        [--cols N] [--min-area 0.0008] [--gap 14] [--facings +x,+y]  [--colors 28]
  names      comma list in reading order (row-major); count is checked against what was found
  target-w   desired median sprite width in game px (the whole sheet shares ONE scale factor, so relative sizes survive)
  --mirror   also writes <id>_m (flipped); with --facings a,b the original gets facing a and the mirror facing b
Sprite pivot = bottom centre of the lowest 2 rows.
"""
import argparse, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("sheet"); ap.add_argument("prefix"); ap.add_argument("names")
ap.add_argument("--kind", default="prop"); ap.add_argument("--target-w", type=float, default=56)
ap.add_argument("--mirror", action="store_true"); ap.add_argument("--facings", default="none,none_m")
ap.add_argument("--cols", type=int, default=0); ap.add_argument("--min-area", type=float, default=0.0008)
ap.add_argument("--gap", type=int, default=14); ap.add_argument("--colors", type=int, default=28)
ap.add_argument("--palette", default=None); ap.add_argument("--erode", type=int, default=1)
ap.add_argument("--scale", type=float, default=0, help="force one source-px-per-game-px factor instead of target-w")
a = ap.parse_args()
names = a.names.split(",")

here = os.path.dirname(os.path.abspath(__file__)); root = os.path.join(here, "..", "assets2")
os.makedirs(os.path.join(root, "sprites"), exist_ok=True)
rgb = np.asarray(Image.open(a.sheet).convert("RGB")).astype(np.float32)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
fg = ~(((np.minimum(r, b) - g) > 110) & (r > 150) & (b > 150))
fg = ndimage.binary_opening(fg, iterations=1)
# merge parts of one item with a dilation only for labelling
lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=a.gap))
lab = lab * fg
objs = ndimage.find_objects(lab)
items = []
for i, sl in enumerate(objs):
    if sl is None: continue
    m = lab[sl] == (i + 1)
    if m.sum() < a.min_area * fg.size: continue
    items.append((sl, i + 1))
items.sort(key=lambda t: (t[0][0].start + t[0][0].stop) / 2)
if a.cols:
    items = [t for k in range(0, len(items), a.cols) for t in sorted(items[k:k + a.cols], key=lambda q: q[0][1].start)]
else:
    rows, cur = [], []
    for t in items:
        cy = (t[0][0].start + t[0][0].stop) / 2
        if cur and cy - (cur[0][0][0].start + cur[0][0][0].stop) / 2 > 0.5 * (t[0][0].stop - t[0][0].start):
            rows.append(sorted(cur, key=lambda q: q[0][1].start)); cur = []
        cur.append(t)
    if cur: rows.append(sorted(cur, key=lambda q: q[0][1].start))
    items = [t for rw in rows for t in rw]
if len(items) != len(names):
    print(f"WARNING: found {len(items)} items, {len(names)} names")

widths = sorted(t[0][1].stop - t[0][1].start for t in items)
med = widths[len(widths) // 2]
scale = a.scale or med / a.target_w
print(f"median source width {med}px -> scale {scale:.2f}")

mp = os.path.join(root, "manifest.json")
man = json.load(open(mp)) if os.path.exists(mp) else {"tile": {"w": 108, "h": 54}, "sprites": {}}
fa, fb = a.facings.split(",")
palette = np.array(json.load(open(a.palette)), dtype=np.float32) if a.palette else None
contact = []
for (sl, lid), name in zip(items, names):
    y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
    own = (lab[y0:y1, x0:x1] == lid)
    own = ndimage.binary_erosion(own, iterations=a.erode)
    sub = rgb[y0:y1, x0:x1].copy()
    spill = np.clip((np.minimum(sub[..., 0], sub[..., 2]) - sub[..., 1]) - 30, 0, None) * own
    sub[..., 0] -= spill * .5; sub[..., 2] -= spill * .5
    H, W = own.shape
    nw, nh = max(2, round(W / scale)), max(2, round(H / scale))
    wgt = own.astype(np.float32)
    box = lambda arr: np.asarray(Image.fromarray(arr.astype(np.float32)).resize((nw, nh), Image.BOX))
    A = box(wgt); den = np.maximum(A, 1e-4)
    small = np.clip(np.stack([box(sub[..., k] * wgt) / den for k in range(3)], -1), 0, 255).astype(np.uint8)
    alpha = A > 0.5
    if not alpha.any(): continue
    if palette is not None:
        d = ((small.reshape(-1, 3).astype(np.float32)[:, None, :] - palette[None]) ** 2 * np.array([2, 4, 3], np.float32)).sum(-1)
        small = palette[d.argmin(1)].reshape(small.shape).astype(np.uint8)
    else:
        small = np.asarray(Image.fromarray(small).quantize(colors=a.colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB"))
    ys, xs = np.where(alpha)
    ty, tx, by_, bx_ = ys.min(), xs.min(), ys.max() + 1, xs.max() + 1
    out = np.dstack([small, (alpha * 255).astype(np.uint8)])[ty:by_, tx:bx_]
    img = Image.fromarray(out)
    w, h = img.size
    low = np.where(np.asarray(img)[-2:, :, 3] > 0)[1]
    pivot = [int(round(low.mean())) if len(low) else w // 2, h]
    if a.kind == 'vehicle':
        pivot = [w // 2, h - 3]                      # centre of the body, a little above the tyre bottoms
    sid = f"{a.prefix}_{name}"
    img.save(os.path.join(root, "sprites", sid + ".png"))
    man["sprites"][sid] = {"file": f"sprites/{sid}.png", "pivot": pivot, "size": [w, h], "kind": a.kind, "fp": None, "facing": fa, "group": f"{a.prefix}_{name}"}
    contact.append(img)
    if a.mirror:
        m = img.transpose(Image.FLIP_LEFT_RIGHT)
        m.save(os.path.join(root, "sprites", sid + "_m.png"))
        man["sprites"][sid + "_m"] = {"file": f"sprites/{sid}_m.png", "pivot": [w - pivot[0], h], "size": [w, h], "kind": a.kind, "fp": None, "facing": fb, "group": f"{a.prefix}_{name}"}
    print(sid, (w, h), "pivot", pivot)
json.dump(man, open(mp, "w"), indent=1)
if contact:
    cs = Image.new("RGBA", (sum(i.width + 8 for i in contact), max(i.height for i in contact) + 8), (60, 70, 80, 255))
    x = 4
    for im in contact:
        cs.alpha_composite(im, (x, cs.height - im.height - 4)); x += im.width + 8
    cs.resize((cs.width * 2, cs.height * 2), Image.NEAREST).save(os.path.join(root, f"_contact_{a.prefix}.png"))

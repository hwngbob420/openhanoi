"""Clean pixel-art conversion of a Codex image (v2: denoise first, sample second).

key magenta -> erode halo -> quantize at FULL resolution (shared or per-sprite palette) -> majority (mode) filter on the index map
-> nearest sampling down to game scale -> hard alpha -> remove stray / orphan pixels.

usage: python -I process_codex2.py <raw.png> <out.png> --scale S [--colors 24] [--palette pal.json] [--mode 0] [--erode 2]
Prints JSON with size, pivot (bottom centre of the lowest 2 rows), colours, stray_before/after.
"""
import argparse, json, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("raw"); ap.add_argument("out")
ap.add_argument("--scale", type=float, required=True)
ap.add_argument("--colors", type=int, default=24)
ap.add_argument("--palette", default=None)
ap.add_argument("--mode", type=int, default=0, help="mode-filter window in source px (0 = about the scale)")
ap.add_argument("--erode", type=int, default=2)
ap.add_argument("--passes", type=int, default=3)
a = ap.parse_args()

src = Image.open(a.raw).convert("RGB")
rgb = np.asarray(src).astype(np.float32)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
key = ((np.minimum(r, b) - g) > 110) & (r > 150) & (b > 150)
fg = ~key
lab, n = ndimage.label(fg)
if n > 1:
    sizes = ndimage.sum(fg, lab, range(1, n + 1)); fg = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.0015 * fg.size])
fg = ndimage.binary_erosion(fg, iterations=a.erode)
spill = np.clip((np.minimum(r, b) - g) - 30, 0, None) * fg
rgb[..., 0] -= spill * .5; rgb[..., 2] -= spill * .5; rgb = np.clip(rgb, 0, 255)
ys, xs = np.where(fg); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgb, fg = rgb[y0:y1, x0:x1].astype(np.uint8), fg[y0:y1, x0:x1]
H, W = fg.shape

# 1) palette
if a.palette:
    pal = np.array(json.load(open(a.palette)), dtype=np.float32)
else:
    opaque_px = rgb[fg].reshape(-1, 1, 3)
    q = Image.fromarray(opaque_px, "RGB").quantize(colors=a.colors, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = np.array(q.getpalette()[:a.colors * 3], dtype=np.float32).reshape(-1, 3)
    pal = np.unique(pal, axis=0)
# nearest palette index per pixel (chunked to keep memory sane)
idx = np.empty((H, W), np.uint8); flat = rgb.reshape(-1, 3).astype(np.float32); wgt = np.array([2, 4, 3], np.float32)
out_idx = np.empty(flat.shape[0], np.uint8)
for i in range(0, flat.shape[0], 200000):
    d = (((flat[i:i + 200000, None, :] - pal[None]) ** 2) * wgt).sum(-1); out_idx[i:i + 200000] = d.argmin(1)
idx = out_idx.reshape(H, W)

# 2) mode filter on the index map (flattens dither/noise) then nearest sampling
win = a.mode or max(3, int(round(a.scale)) | 1)
idx_img = Image.fromarray(idx, "L").filter(ImageFilter.ModeFilter(win))
nw, nh = max(1, round(W / a.scale)), max(1, round(H / a.scale))
small_idx = np.asarray(idx_img.resize((nw, nh), Image.NEAREST))
A = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).resize((nw, nh), Image.BOX)) > 127
small = pal[small_idx].astype(np.uint8)

# 3) strays: a pixel whose colour differs from all 4 neighbours takes the most common neighbour colour
def stray_mask(img, alpha):
    p = np.pad(img.astype(np.int32), ((1, 1), (1, 1), (0, 0)), mode="edge"); ap_ = np.pad(alpha, 1)
    nbs = [p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]; ans = [ap_[:-2, 1:-1], ap_[2:, 1:-1], ap_[1:-1, :-2], ap_[1:-1, 2:]]
    differ = np.ones(alpha.shape, bool)
    for nb, an in zip(nbs, ans): differ &= (np.abs(img.astype(np.int32) - nb).sum(-1) > 40) | ~an
    return differ & alpha, nbs, ans
before = int(stray_mask(small, A)[0].sum())
for _ in range(a.passes):
    m, nbs, ans = stray_mask(small, A)
    if not m.any(): break
    for y, x in zip(*np.where(m)):
        cands = [tuple(nb[y, x]) for nb, an in zip(nbs, ans) if an[y, x]]
        if cands:
            best = max(set(cands), key=cands.count); small[y, x] = best
# drop orphan opaque pixels (no opaque 4-neighbour)
pad = np.pad(A, 1); nbc = pad[:-2, 1:-1].astype(int) + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]
A = A & ~(nbc == 0)
after = int(stray_mask(small, A)[0].sum())

res = np.dstack([small, (A * 255).astype(np.uint8)])
res[~A] = 0
img = Image.fromarray(res, "RGBA"); bb = img.getbbox(); img = img.crop(bb); img.save(a.out)
arr = np.asarray(img); w, h = img.size
low = np.where(arr[-2:, :, 3] > 0)[1]
print(json.dumps({"size": [w, h], "pivot": [int(round(low.mean())) if len(low) else w // 2, h], "colours": int(len(np.unique(arr[arr[..., 3] > 0][:, :3], axis=0))), "stray_before": before, "stray_after": after}))

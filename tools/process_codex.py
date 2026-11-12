"""Codex (high-res, noisy-magenta) image -> pixel-art sprite at game scale.

key magenta with tolerance -> erode halo -> alpha-weighted BOX downscale -> hard alpha -> quantize (per-sprite or shared palette)

usage:
  python -I process_codex.py <raw.png> <out.png> [--scale 5.5] [--colors 28] [--palette palette.json] [--pad 0]
  --scale   source px per game px (5.5 => one tile front face = 54 px)
  --palette JSON list of [r,g,b]; when given, every pixel snaps to the nearest entry (shared palette for the whole game)
Prints size and the bottom-vertex pivot (lowest opaque row; x = mean of the lowest 2 rows).
"""
import argparse, json, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("raw"); ap.add_argument("out")
ap.add_argument("--scale", type=float, default=5.5)
ap.add_argument("--colors", type=int, default=28)
ap.add_argument("--palette", default=None)
ap.add_argument("--erode", type=int, default=2)
ap.add_argument("--face", type=float, default=0, help="auto scale: make the front face (left wall, measured at the base) this many game px wide")
a = ap.parse_args()

rgb = np.asarray(Image.open(a.raw).convert("RGB")).astype(np.float32)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
# magenta-ness: both red and blue far above green
mag = (np.minimum(r, b) - g)
key = (mag > 110) & (r > 150) & (b > 150)
fg = ~key
# keep only the biggest connected foreground blob(s): drops stray specks, keeps detached laundry etc. if large enough
lab, n = ndimage.label(fg)
if n > 1:
    sizes = ndimage.sum(fg, lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s > 0.002 * fg.size]
    fg = np.isin(lab, keep)
fg = ndimage.binary_erosion(fg, iterations=a.erode)             # eat the pink halo of anti-aliased edges
# despill: any remaining opaque pixel with a magenta tint gets its tint pulled toward green
spill = np.clip((np.minimum(r, b) - g) - 30, 0, None) * fg
rgb[..., 0] -= spill * 0.5; rgb[..., 2] -= spill * 0.5; rgb = np.clip(rgb, 0, 255)

ys, xs = np.where(fg)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgb, fg = rgb[y0:y1, x0:x1], fg[y0:y1, x0:x1]
H, W = fg.shape
scale = a.scale
if a.face:
    band = fg[int(H * 0.88):, :]
    by, bx = np.where(fg[-3:, :])
    xv = bx.mean()
    xl = np.where(band.any(axis=0))[0].min()
    face_w = xv - xl
    scale = face_w / a.face
    print("auto-scale: front face %.0f px -> scale %.2f" % (face_w, scale), file=sys.stderr)
nw, nh = max(1, round(W / scale)), max(1, round(H / scale))

# alpha-weighted box downscale (colour only from opaque pixels, so no bleed from the key colour)
wgt = fg.astype(np.float32)
prem = Image.fromarray((rgb * wgt[..., None]).astype(np.float32), mode="RGB") if False else None
def box(arr):                                                       # arr: HxW float -> nh x nw float, area average
    return np.asarray(Image.fromarray(arr.astype(np.float32)).resize((nw, nh), Image.BOX))
A = box(wgt)
chan = [box(rgb[..., i] * wgt) for i in range(3)]
alpha = A > 0.5
den = np.maximum(A, 1e-4)
small = np.stack([c / den for c in chan], axis=-1)
small = np.clip(small, 0, 255).astype(np.uint8)

if a.palette:
    pal = np.array(json.load(open(a.palette)), dtype=np.float32)
    flat = small.reshape(-1, 3).astype(np.float32)
    d = ((flat[:, None, :] - pal[None, :, :]) ** 2 * np.array([2, 4, 3], dtype=np.float32)).sum(-1)   # perceptual-ish weights
    small = pal[d.argmin(1)].reshape(small.shape).astype(np.uint8)
else:
    q = Image.fromarray(small).quantize(colors=a.colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    small = np.asarray(q)

out = np.dstack([small, (alpha * 255).astype(np.uint8)])
Image.fromarray(out).save(a.out)
ys, xs = np.where(alpha)
bottom = ys.max()
low = xs[ys >= bottom - 1]
right_w = xs.max() - low.mean()
left_w = low.mean() - xs[ys >= int(alpha.shape[0] * 0.88)].min()
ratio = right_w / max(1.0, left_w)
print(json.dumps({"depth_ratio": round(float(ratio), 2), "size": [nw, nh], "pivot": [int(round(low.mean())), int(bottom + 1)], "colours": int(len(np.unique(small[alpha].reshape(-1, 3), axis=0)))}))

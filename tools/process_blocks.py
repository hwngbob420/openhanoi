"""Block-exact image (tiny pixel art enlarged Nx with nearest-neighbour, magenta key) -> native sprite. No resampling blur.
usage: python -I process_blocks.py <raw.png> <out.png> [--block 8] [--sheet names.csv --prefix p --kind prop] 
Single sprite: crops to the opaque bbox. Sheet: connected components -> one PNG per item (reading order), written as <out_dir>/<prefix>_<name>.png.
Reports flat-block ratio (must be ~100%) so a non-grid image is caught immediately."""
import argparse, json, os
import numpy as np
from PIL import Image
from scipy import ndimage
ap = argparse.ArgumentParser(); ap.add_argument("raw"); ap.add_argument("out"); ap.add_argument("--block", type=int, default=8)
ap.add_argument("--sheet", default=None); ap.add_argument("--prefix", default="s"); ap.add_argument("--cols", type=int, default=0)
a = ap.parse_args(); B = a.block
img = np.asarray(Image.open(a.raw).convert("RGB")).astype(np.int32); H, W = img.shape[:2]
H2, W2 = H // B, W // B
blocks = img[:H2 * B, :W2 * B].reshape(H2, B, W2, B, 3)
flat = (blocks == blocks[:, :1, :, :1]).all(axis=(1, 3, 4)); print("flat blocks: %.1f%%" % (100 * flat.mean()))
nat = blocks[:, B // 2, :, B // 2]                                  # centre sample of each block
r, g, b = nat[..., 0], nat[..., 1], nat[..., 2]
key = ((np.minimum(r, b) - g) > 110) & (r > 150) & (b > 150)
alpha = ~key
rgba = np.dstack([nat, alpha * 255]).astype(np.uint8); rgba[~alpha] = 0
def crop(m):
    ys, xs = np.where(m[..., 3] > 0); return m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
if not a.sheet:
    out = crop(rgba); Image.fromarray(out).save(a.out); print(json.dumps({"size": [out.shape[1], out.shape[0]], "colours": int(len(np.unique(out[out[..., 3] > 0][:, :3], axis=0)))}))
else:
    names = a.sheet.split(","); lab, n = ndimage.label(ndimage.binary_dilation(alpha, iterations=2)); lab = lab * alpha
    objs = [(sl, i + 1) for i, sl in enumerate(ndimage.find_objects(lab)) if sl is not None and (lab[sl] == i + 1).sum() > 30]
    objs.sort(key=lambda t: (t[0][0].start + t[0][0].stop) / 2)
    cols = a.cols or 4; objs = [t for k in range(0, len(objs), cols) for t in sorted(objs[k:k + cols], key=lambda q: q[0][1].start)]
    assert len(objs) == len(names), (len(objs), len(names))
    os.makedirs(a.out, exist_ok=True)
    for (sl, lid), nm in zip(objs, names):
        m = np.zeros_like(rgba); sel = lab == lid; m[sel] = rgba[sel]; o = crop(m[sl[0].start:sl[0].stop, sl[1].start:sl[1].stop]); Image.fromarray(o).save(os.path.join(a.out, f"{a.prefix}_{nm}.png")); print(nm, o.shape[1], o.shape[0])

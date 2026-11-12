"""Muse sheet of SQUARE tiles (8-px blocks on magenta) -> native TxT tiles in assets3/tiles + derived flips/corners.
usage: python -I slice_square_tiles.py <sheet.png> <name1,name2,...> [--size 32]"""
import argparse, json, os
import numpy as np
from PIL import Image
from scipy import ndimage
ap = argparse.ArgumentParser(); ap.add_argument("sheet"); ap.add_argument("names"); ap.add_argument("--size", type=int, default=32)
ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets3", "tiles"))
a = ap.parse_args(); names = a.names.split(","); os.makedirs(a.out, exist_ok=True)
im = np.asarray(Image.open(a.sheet).convert("RGB")).astype(np.int32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
fg = ~(((np.minimum(r, b) - g) > 110) & (r > 150) & (b > 150))
lab, n = ndimage.label(fg); boxes = []
for i, sl in enumerate(ndimage.find_objects(lab)):
    h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
    if w > 60 and h > 60 and (lab[sl] == i + 1).sum() > .8 * w * h: boxes.append((sl[0].start, sl[0].stop, sl[1].start, sl[1].stop))
boxes.sort(key=lambda t: (round(t[0] / 100), t[2]))
assert len(boxes) == len(names), (len(boxes), len(names))
meta = {"tile": [a.size, a.size], "order": []}
for (y0, y1, x0, x1), nm in zip(boxes, names):
    crop = Image.fromarray(im[y0:y1, x0:x1].astype(np.uint8))
    step = (x1 - x0) / a.size
    small = crop.resize((a.size, a.size), Image.NEAREST)           # sheet blocks are 8 px: nearest from block centres
    arr = np.asarray(crop)
    out = np.zeros((a.size, a.size, 3), np.uint8)
    for yy in range(a.size):
        for xx in range(a.size):
            out[yy, xx] = arr[int((yy + .5) * (y1 - y0) / a.size), int((xx + .5) * (x1 - x0) / a.size)]
    Image.fromarray(out).save(os.path.join(a.out, nm + ".png")); meta["order"].append(nm)
def save(nm, arr): Image.fromarray(arr).save(os.path.join(a.out, nm + ".png")); meta["order"].append(nm)
ld = lambda nm: np.asarray(Image.open(os.path.join(a.out, nm + ".png")).convert("RGB"))
yellow = lambda arr: (arr[..., 0] > 190) & (arr[..., 1] > 150) & (arr[..., 2] < 110)
if "sidewalk_kerb_b" in names and "sidewalk_kerb_r" in names:
    kb, kr, sw = ld("sidewalk_kerb_b"), ld("sidewalk_kerb_r"), ld("sidewalk")
    kt, kl = kb[::-1].copy(), kr[:, ::-1].copy()
    save("sidewalk_kerb_t", kt); save("sidewalk_kerb_l", kl)
    def corner(*ks):
        o = sw.copy()
        for k in ks: m = yellow(k); o[m] = k[m]
        return o
    save("sidewalk_corner_br", corner(kb, kr)); save("sidewalk_corner_bl", corner(kb, kl)); save("sidewalk_corner_tr", corner(kt, kr)); save("sidewalk_corner_tl", corner(kt, kl))
json.dump(meta, open(os.path.join(a.out, "tiles.json"), "w"), indent=1); print(meta["order"])

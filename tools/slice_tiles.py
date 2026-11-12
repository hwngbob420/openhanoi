"""Muse tileset sheet (diamond tiles on magenta) -> exact TW x TH diamond tiles.

usage: python -I slice_tiles.py <sheet.png> <out_dir> <name1,name2,...> [--tw 108] [--th 54] [--cols N]
Tiles are found as connected components, ordered row-major, cropped to their bbox, resized (nearest) to TW x TH and
masked with a perfect 2:1 diamond so neighbours join without gaps. Names are assigned in reading order.
Merges the names into <out_dir>/tiles.json (order list) and writes <out_dir>/<name>.png.
"""
import argparse, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("sheet"); ap.add_argument("out"); ap.add_argument("names")
ap.add_argument("--tw", type=int, default=108); ap.add_argument("--th", type=int, default=54)
ap.add_argument("--cols", type=int, default=0)
a = ap.parse_args()
names = a.names.split(",")

im = np.asarray(Image.open(a.sheet).convert("RGB")).astype(np.int32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
fg = ~((np.minimum(r, b) - g > 110) & (r > 150) & (b > 150))
fg = ndimage.binary_opening(fg, iterations=1)
lab, n = ndimage.label(fg)
objs = ndimage.find_objects(lab)
boxes = []
for i, sl in enumerate(objs):
    h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
    if (lab[sl] == i + 1).sum() > 0.2 * w * h and w > 40 and h > 20:
        boxes.append((sl[0].start, sl[0].stop, sl[1].start, sl[1].stop, i + 1))
if len(boxes) != len(names):
    print(f"WARNING: found {len(boxes)} tiles but {len(names)} names")
boxes.sort(key=lambda t: (t[0] + t[1]) / 2)
rows, cur = [], []
for t in boxes:
    if cur and (t[0] + t[1]) / 2 - (cur[0][0] + cur[0][1]) / 2 > 0.6 * (t[1] - t[0]):
        rows.append(sorted(cur, key=lambda q: q[2])); cur = []
    cur.append(t)
if cur: rows.append(sorted(cur, key=lambda q: q[2]))
boxes = [t for r_ in rows for t in r_]

os.makedirs(a.out, exist_ok=True)
tw, th = a.tw, a.th
yy, xx = np.mgrid[0:th, 0:tw]
diamond = (np.abs(xx - (tw - 1) / 2) / (tw / 2) + np.abs(yy - (th - 1) / 2) / (th / 2)) <= 1.0

tj = os.path.join(a.out, "tiles.json")
meta = json.load(open(tj)) if os.path.exists(tj) else {"tile": [tw, th], "order": []}
meta["tile"] = [tw, th]
for (y0, y1, x0, x1, _), name in zip(boxes, names):
    crop = Image.fromarray(im[y0:y1, x0:x1].astype(np.uint8))
    crop = crop.resize((tw, th), Image.NEAREST).convert("RGBA")
    arr = np.asarray(crop).copy()
    # replace the outline / key-colour fringe (outer 2 px of the diamond) with the nearest interior colour
    inner = ndimage.binary_erosion(diamond, iterations=2)
    _, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True)
    arr[..., :3] = arr[iy, ix, :3]
    arr[..., 3] = np.where(diamond, 255, 0)
    Image.fromarray(arr).save(os.path.join(a.out, name + ".png"))
    if name not in meta["order"]: meta["order"].append(name)
    print(name, "src", (x1 - x0, y1 - y0), "ratio %.2f" % ((x1 - x0) / (y1 - y0)))
json.dump(meta, open(tj, "w"), indent=1)

# contact sheet for a quick look + 3x3 seam test of the first tile
names_done = names[:len(boxes)]
cs = Image.new("RGBA", (tw * len(names_done) + 4 * len(names_done), th + 4), (40, 40, 48, 255))
for i, nme in enumerate(names_done):
    cs.alpha_composite(Image.open(os.path.join(a.out, nme + ".png")), (i * (tw + 4), 2))
cs.save(os.path.join(a.out, "_contact_" + names_done[0] + ".png"))

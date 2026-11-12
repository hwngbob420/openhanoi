"""Raw muse PNG (magenta key, 4px blocks) -> native-resolution transparent sprite + manifest entry.

usage: python -I process_assets.py <raw_dir> <out_dir> <spec.json>
spec.json: {"<id>": {"raw": "file.png", "kind": "building|prop|vehicle|tree|landmark",
                     "fp": [w, d], "facing": "...", "mirror": true|false, "block": 4}}
Writes <out_dir>/<id>.png (+ <id>_m.png if mirror) and merges into <out_dir>/../manifest.json.
"""
import json, os, sys
from PIL import Image

raw_dir, out_dir, spec_path = sys.argv[1:4]
spec = json.load(open(spec_path))
os.makedirs(out_dir, exist_ok=True)
man_path = os.path.join(out_dir, "..", "manifest.json")
man = json.load(open(man_path)) if os.path.exists(man_path) else {"tile": {"w": 72, "h": 36}, "sprites": {}}


def is_key(p):
    return p[0] > 215 and p[2] > 215 and p[1] < 60


def to_native(im, b):
    im = im.convert("RGB")
    w, h = im.size
    nw, nh = w // b, h // b
    out = Image.new("RGBA", (nw, nh), (0, 0, 0, 0))
    src, dst = im.load(), out.load()
    for y in range(nh):
        for x in range(nw):
            p = src[x * b + b // 2, y * b + b // 2]
            if not is_key(p):
                dst[x, y] = p + (255,)
    return out


def pivot_of(im):
    w, h = im.size
    px = im.load()
    bottom = max(y for y in range(h) for x in range(w) if px[x, y][3])
    xs = [x for y in (bottom - 1, bottom) for x in range(w) if y >= 0 and px[x, y][3]]
    return round(sum(xs) / len(xs)), bottom + 1


def add(sid, im, s, mirrored):
    px, py = pivot_of(im)
    fp = s.get("fp")
    if mirrored:
        fp = [fp[1], fp[0]] if fp else None
    man["sprites"][sid] = {
        "file": f"sprites/{sid}.png", "pivot": [px, py], "size": list(im.size), "kind": s.get("kind", "prop"),
        "fp": fp, "facing": s.get("facing"), "group": s.get("group", sid),
    }
    im.save(os.path.join(out_dir, f"{sid}.png"))


for sid, s in spec.items():
    raw = Image.open(os.path.join(raw_dir, s["raw"]))
    nat = to_native(raw, s.get("block", 4))
    bbox = nat.getbbox()
    nat = nat.crop(bbox)
    add(sid, nat, s, False)
    if s.get("mirror"):
        m = nat.transpose(Image.FLIP_LEFT_RIGHT)
        mid = sid + "_m"
        mf = dict(s)
        mf["facing"] = (s.get("facing") or "") + "_m"
        add(mid, m, mf, True)
    print(sid, nat.size, "pivot", man["sprites"][sid]["pivot"])

json.dump(man, open(man_path, "w"), indent=1)

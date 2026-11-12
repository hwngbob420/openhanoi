"""Import a Codex sprite into assets2: process -> save -> (mirror) -> manifest.

usage: python -I add_codex.py <raw.png> <id> <kind> <facing> <group> [--fp W,D] [--face 54 | --scale S] [--mirror] [--palette P]
  building: --face 54 --fp 1,2 --mirror   (front corner of the lot = bottom vertex of the sprite)
  prop    : --scale S                      (pivot = bottom centre of the lowest pixels)
Writes assets2/sprites/<id>.png (+ <id>_m.png), merges into assets2/manifest.json.
"""
import argparse, json, os, subprocess, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("raw"); ap.add_argument("id"); ap.add_argument("kind"); ap.add_argument("facing"); ap.add_argument("group")
ap.add_argument("--fp", default=None); ap.add_argument("--face", type=float, default=0); ap.add_argument("--scale", type=float, default=0)
ap.add_argument("--mirror", action="store_true"); ap.add_argument("--palette", default=None); ap.add_argument("--colors", type=int, default=28)
a = ap.parse_args()

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, "..", "assets2")
os.makedirs(os.path.join(root, "sprites"), exist_ok=True)
out = os.path.join(root, "sprites", a.id + ".png")
cmd = [sys.executable, "-I", os.path.join(here, "process_codex.py"), a.raw, out, "--colors", str(a.colors)]
cmd += ["--face", str(a.face)] if a.face else ["--scale", str(a.scale or 5.5)]
if a.palette: cmd += ["--palette", a.palette]
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode:
    sys.exit(res.stderr)
info = json.loads(res.stdout.strip().splitlines()[-1])
mp = os.path.join(root, "manifest.json")
man = json.load(open(mp)) if os.path.exists(mp) else {"tile": {"w": 108, "h": 54}, "sprites": {}}
fp = [float(v) if "." in v else int(v) for v in a.fp.split(",")] if a.fp else None
w, h = info["size"]
if a.kind == "building" and not a.fp:
    d = info.get("depth_ratio", 1.5)
    fp = [1, max(1, int(d + 0.6))]                      # 1.5 -> 2, 2.2 -> 2, 2.5 -> 3
man["sprites"][a.id] = {"file": f"sprites/{a.id}.png", "pivot": info["pivot"], "size": [w, h], "kind": a.kind, "fp": fp, "facing": a.facing, "group": a.group}
if a.mirror:
    mid = a.id + "_m"
    Image.open(out).transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(root, "sprites", mid + ".png"))
    man["sprites"][mid] = {"file": f"sprites/{mid}.png", "pivot": [w - info["pivot"][0], info["pivot"][1]], "size": [w, h], "kind": a.kind,
                           "fp": [fp[1], fp[0]] if fp else None, "facing": a.facing + "_m", "group": a.group}
json.dump(man, open(mp, "w"), indent=1)
print(a.id, info)

"""Register an already-native PNG into the manifest.  usage: add_sprite.py <png> <id> <kind> <facing> <group> [pivot=bc|bottomvertex] [fp=w,d]"""
import json, os, shutil, sys
from PIL import Image
png, sid, kind, facing, group = sys.argv[1:6]
mode = sys.argv[6] if len(sys.argv) > 6 else "bc"
fp = [int(v) for v in sys.argv[7].split(",")] if len(sys.argv) > 7 else None
root = os.path.join(os.path.dirname(__file__), "..", "assets")
im = Image.open(png).convert("RGBA")
os.makedirs(os.path.join(root, "sprites"), exist_ok=True)
im.save(os.path.join(root, "sprites", sid + ".png"))
w, h = im.size
pivot = [w // 2, h - 2] if mode == "bc" else [w // 2, h]
mp = os.path.join(root, "manifest.json")
m = json.load(open(mp))
m["sprites"][sid] = {"file": f"sprites/{sid}.png", "pivot": pivot, "size": [w, h], "kind": kind, "fp": fp, "facing": facing, "group": group}
json.dump(m, open(mp, "w"), indent=1)
print(sid, im.size, pivot)

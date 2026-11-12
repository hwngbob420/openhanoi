"""Output QA for generated pixel art. Nothing enters the game unless this passes AND the image looks clean.

usage:
  python -I qa_check.py sprite <png> [--max-colours 40]
  python -I qa_check.py tile   <png> [--seam 20]
  python -I qa_check.py dir    <folder> [--kind sprite|tile]
Prints one JSON line per file with PASS/FAIL and the reasons.

Sprite checks: unique colours, semi-transparent pixels (must be 0 = hard alpha), orphan pixels (opaque, no opaque 4-neighbour),
magenta halo on the silhouette edge, stray single pixels (colour unlike all 4 neighbours, inside the body = noise/dither).
Tile checks: opposite-edge colour difference (seamless tiling), unique colours, fully opaque.
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

def load(p):
    return np.asarray(Image.open(p).convert("RGBA")).astype(np.int32)

def sprite_report(p, max_colours=40):
    a = load(p); h, w = a.shape[:2]
    alpha = a[..., 3]; opaque = alpha == 255
    rgb = a[..., :3]
    semi = int(((alpha > 0) & (alpha < 255)).sum())
    cols = len(np.unique(rgb[opaque].reshape(-1, 3), axis=0)) if opaque.any() else 0
    pad = np.pad(opaque, 1)
    nb = pad[:-2, 1:-1].astype(int) + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:]
    orphans = int((opaque & (nb == 0)).sum())
    edge = opaque & (nb < 4)
    tint = (np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]) > 45
    halo = int((edge & tint & (rgb[..., 0] > 150)).sum())
    # stray single pixels inside the body: colour different from all 4 neighbours (all opaque) by a noticeable amount
    padc = np.pad(rgb, ((1, 1), (1, 1), (0, 0)), mode="edge")
    def d(x): return np.abs(rgb - x).sum(-1)
    nbs = [padc[:-2, 1:-1], padc[2:, 1:-1], padc[1:-1, :-2], padc[1:-1, 2:]]
    differ = np.ones((h, w), bool)
    for n in nbs: differ &= d(n) > 40
    inner = opaque & (nb == 4)
    stray = int((differ & inner).sum()); stray_ratio = stray / max(1, int(inner.sum()))
    reasons = []
    if semi: reasons.append(f"{semi} semi-transparent px")
    if cols > max_colours: reasons.append(f"{cols} colours > {max_colours}")
    if orphans > 3: reasons.append(f"{orphans} orphan px")
    if halo: reasons.append(f"{halo} magenta-halo px")
    if stray_ratio > 0.03: reasons.append(f"stray px {stray_ratio:.1%}")
    return {"file": os.path.basename(p), "size": [w, h], "colours": cols, "semi": semi, "orphans": orphans, "halo": halo,
            "stray_pct": round(100 * stray_ratio, 2), "verdict": "PASS" if not reasons else "FAIL", "why": reasons}

def tile_report(p, seam=20, max_colours=64):
    a = load(p); h, w = a.shape[:2]; rgb = a[..., :3]
    opaque_all = bool((a[..., 3] == 255).all())
    lr = float(np.abs(rgb[:, 0] - rgb[:, -1]).mean()); tb = float(np.abs(rgb[0] - rgb[-1]).mean())
    cols = len(np.unique(rgb.reshape(-1, 3), axis=0))
    reasons = []
    if not opaque_all: reasons.append("not fully opaque")
    if lr > seam or tb > seam: reasons.append(f"seam diff LR {lr:.0f} / TB {tb:.0f} > {seam}")
    if cols > max_colours: reasons.append(f"{cols} colours > {max_colours}")
    return {"file": os.path.basename(p), "size": [w, h], "colours": cols, "seam_lr": round(lr, 1), "seam_tb": round(tb, 1),
            "verdict": "PASS" if not reasons else "FAIL", "why": reasons}

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("mode"); ap.add_argument("path")
    ap.add_argument("--max-colours", type=int, default=40); ap.add_argument("--seam", type=float, default=20); ap.add_argument("--kind", default="sprite")
    a = ap.parse_args()
    files = [a.path] if a.mode in ("sprite", "tile") else sorted(os.path.join(a.path, f) for f in os.listdir(a.path) if f.lower().endswith(".png") and not f.startswith("_"))
    kind = a.mode if a.mode in ("sprite", "tile") else a.kind
    fails = 0
    for f in files:
        r = sprite_report(f, a.max_colours) if kind == "sprite" else tile_report(f, a.seam)
        fails += r["verdict"] == "FAIL"; print(json.dumps(r, ensure_ascii=False))
    print(f"-- {len(files)} files, {fails} FAIL")
    sys.exit(1 if fails else 0)

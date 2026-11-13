"""Re-pixel a Muse image into the Hanoi palette: hue family by chroma-plane distance, ramp step by luminance (Lab L), hard alpha kept.
usage: python -I remap.py <in.png> <out.png> [--pal hanoi_palette.json]"""
import json, sys, numpy as np
from PIL import Image
def lab(rgb):
    c = rgb/255.0; c = np.where(c>0.04045, ((c+0.055)/1.055)**2.4, c/12.92)
    M = np.array([[.4124,.3576,.1805],[.2126,.7152,.0722],[.0193,.1192,.9505]])
    x = c@M.T/np.array([.9505,1,1.089]); f = np.where(x>0.008856, np.cbrt(x), 7.787*x+16/116)
    return np.stack([116*f[...,1]-16, 500*(f[...,0]-f[...,1]), 200*(f[...,1]-f[...,2])],-1)
def hexs(h): return np.array([int(h[i:i+2],16) for i in (0,2,4)],np.float32)
def remap(img, pal):
    a = np.asarray(img.convert("RGBA")); rgb = a[...,:3].astype(np.float32); alpha = a[...,3]
    L = lab(rgb); names = list(pal); fam_lab = {n: lab(np.stack([hexs(h) for h in pal[n]])) for n in names}
    # family anchor = mean a*b* of the ramp (ink handled as neutral)
    anchor = np.array([fam_lab[n][:,1:].mean(0) for n in names]); chroma = np.hypot(L[...,1], L[...,2])
    d = ((L[...,None,1:] - anchor[None,None])**2).sum(-1)       # chroma-plane distance to each family
    fam = d.argmin(-1)
    out = np.zeros_like(rgb)
    for i, n in enumerate(names):
        m = (fam == i) & (alpha > 0)
        if not m.any(): continue
        rl = fam_lab[n][:,0]; steps = np.stack([hexs(h) for h in pal[n]])
        j = np.abs(L[m][:,0][:,None] - rl[None]).argmin(1); out[m] = steps[j]
    # very dark pixels = outline ink, very light desaturated = cream
    dark = (L[...,0] < 22) & (alpha > 0); out[dark] = hexs(pal["ink"][0])
    return Image.fromarray(np.dstack([out.astype(np.uint8), alpha]), "RGBA")
if __name__ == "__main__":
    pal = json.load(open(sys.argv[3] if len(sys.argv)>3 else "hanoi_palette.json"))
    remap(Image.open(sys.argv[1]), pal).save(sys.argv[2])

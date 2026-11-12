"""Sheet of items on magenta -> native-resolution transparent sprites, one per connected blob.

usage: python -I slice_sheet.py <raw_sheet.png> <out_dir> <prefix> [block=4] [min_area=60] [gap=3] [cols=0]
Items are ordered row-major (top to bottom, then left to right); cols>0 forces row grouping into that many columns.
Writes <out_dir>/<prefix>_<n>.png and prints a table (index, size, pivot). Preview sheet: <out_dir>/_<prefix>_contact.png
"""
import sys
from PIL import Image

src, out_dir, prefix = sys.argv[1:4]
block = int(sys.argv[4]) if len(sys.argv) > 4 else 4
min_area = int(sys.argv[5]) if len(sys.argv) > 5 else 60
gap = int(sys.argv[6]) if len(sys.argv) > 6 else 3
cols = int(sys.argv[7]) if len(sys.argv) > 7 else 0
down = int(sys.argv[8]) if len(sys.argv) > 8 else 1   # extra integer downscale of the native art (majority colour per block)

raw = Image.open(src).convert("RGB")
w, h = raw.size
nw, nh = w // block, h // block
nat = Image.new("RGBA", (nw, nh), (0, 0, 0, 0))
sp, dp = raw.load(), nat.load()
for y in range(nh):
    for x in range(nw):
        p = sp[x * block + block // 2, y * block + block // 2]
        if not (p[0] > 215 and p[2] > 215 and p[1] < 60):
            dp[x, y] = p + (255,)

if down > 1:
    from collections import Counter
    rw, rh = nw // down, nh // down
    red = Image.new("RGBA", (rw, rh), (0, 0, 0, 0)); rp = red.load()
    for y in range(rh):
        for x in range(rw):
            cells = [dp[x * down + i, y * down + j] for j in range(down) for i in range(down)]
            op = [c[:3] for c in cells if c[3]]
            if len(op) * 2 >= len(cells):
                # prefer the darkest of the top colours so 1px outlines survive the reduction
                cnt = Counter(op).most_common()
                top = [c for c, n in cnt if n == cnt[0][1]]
                rp[x, y] = min(top, key=sum) + (255,)
    nat, dp, nw, nh = red, rp, rw, rh

# connected components on a dilated mask (merges small detached parts of one item: antenna, load, etc.)
mask = [[dp[x, y][3] > 0 for x in range(nw)] for y in range(nh)]
dil = [[False] * nw for _ in range(nh)]
for y in range(nh):
    for x in range(nw):
        if mask[y][x]:
            for yy in range(max(0, y - gap), min(nh, y + gap + 1)):
                for xx in range(max(0, x - gap), min(nw, x + gap + 1)):
                    dil[yy][xx] = True
label = [[0] * nw for _ in range(nh)]
comps = []
for y in range(nh):
    for x in range(nw):
        if dil[y][x] and not label[y][x]:
            cid = len(comps) + 1
            stack = [(x, y)]; label[y][x] = cid; pts = []
            while stack:
                cx, cy = stack.pop(); pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < nw and 0 <= ny < nh and dil[ny][nx] and not label[ny][nx]:
                        label[ny][nx] = cid; stack.append((nx, ny))
            comps.append(pts)

items = []
for pts in comps:
    own = [(x, y) for x, y in pts if mask[y][x]]
    if len(own) < min_area:
        continue
    x0 = min(x for x, _ in own); x1 = max(x for x, _ in own); y0 = min(y for _, y in own); y1 = max(y for _, y in own)
    items.append((x0, y0, x1, y1, set(own)))

# row-major ordering
items.sort(key=lambda it: (it[1] + it[3]) / 2)
if cols:
    grouped = [sorted(items[i:i + cols], key=lambda it: it[0]) for i in range(0, len(items), cols)]
    items = [it for g in grouped for it in g]
else:
    rows, cur = [], []
    for it in items:
        if cur and (it[1] + it[3]) / 2 - (cur[0][1] + cur[0][3]) / 2 > 30:
            rows.append(sorted(cur, key=lambda i: i[0])); cur = []
        cur.append(it)
    if cur: rows.append(sorted(cur, key=lambda i: i[0]))
    items = [it for r in rows for it in r]

contact = Image.new("RGBA", (max(1, sum(i[2] - i[0] + 6 for i in items)), max([i[3] - i[1] + 1 for i in items] or [1])), (60, 70, 80, 255))
cx = 0
for n, (x0, y0, x1, y1, own) in enumerate(items, 1):
    out = Image.new("RGBA", (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0))
    op = out.load()
    for x, y in own:
        op[x - x0, y - y0] = dp[x, y]
    # include opaque pixels inside bbox that belong to this blob only (own set), done above
    bottom = max(y for y in range(out.height) for x in range(out.width) if op[x, y][3])
    xs = [x for y in (bottom - 1, bottom) for x in range(out.width) if y >= 0 and op[x, y][3]]
    pivot = (round(sum(xs) / len(xs)), bottom + 1)
    out.save(f"{out_dir}/{prefix}_{n}.png")
    contact.alpha_composite(out, (cx, 0)); cx += out.width + 6
    print(f"{prefix}_{n}: size {out.size} pivot {pivot}")
contact.resize((contact.width * 2, contact.height * 2), Image.NEAREST).save(f"{out_dir}/_{prefix}_contact.png")
print(len(items), "items")

"""Contact sheet để soi asset: python tools/sheet.py <tiền_tố|tên1,tên2> [--cols 6] [--scale 3] [--tile3] [--bg #78968c] [--out đường_dẫn]
--tile3: ghép mỗi ô nền thành khối 3x3 để soi khe nối."""
import sys, os, json
from PIL import Image, ImageDraw
a = sys.argv[1:]
def opt(n, d):
    return a[a.index(n) + 1] if n in a else d
root = os.path.join(os.path.dirname(__file__), '..')
man = json.load(open(os.path.join(root, 'assets/world/manifest.json')))['sprites']
q = a[0]
names = q.split(',') if ',' in q or q in man else sorted(k for k in man if k.startswith(q))
cols, sc = int(opt('--cols', 6)), int(opt('--scale', 3))
bg = opt('--bg', '#78968c'); out = opt('--out', os.path.join(root, 'assets/src/_build/sheet.png'))
t3 = '--tile3' in a
cells = []
for n in names:
    im = Image.open(os.path.join(root, 'assets/world', n + '.png')).convert('RGBA')
    if t3:
        c = Image.new('RGBA', (72 * 3, 36 * 3), (0, 0, 0, 0))
        for i in range(3):
            for j in range(3):
                c.alpha_composite(im, (36 * (i - j) + 72, 18 * (i + j)))
        im = c
    cells.append((n, im))
cw = max(i.width for _, i in cells) + 6; ch = max(i.height for _, i in cells) + 6
rows = (len(cells) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * cw, rows * ch), bg)
d = ImageDraw.Draw(sheet)
for k, (n, im) in enumerate(cells):
    x, y = (k % cols) * cw + 3, (k // cols) * ch + 3
    sheet.alpha_composite(im, (x, y))
sheet = sheet.resize((sheet.width * sc, sheet.height * sc), Image.NEAREST)
d = ImageDraw.Draw(sheet)
for k, (n, im) in enumerate(cells):
    d.text(((k % cols) * cw * sc + 6, (k // cols) * ch * sc + 2), n, fill=(255, 255, 255, 255))
sheet.convert('RGB').save(out)
print(out, sheet.size)

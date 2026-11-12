"""Procedural 64x32 isometric ground tiles in the shared Hanoi palette (native pixels, no scaling)."""
import random
from PIL import Image

W, H = 72, 36
P = {  # shared Hanoi palette
    "asp1": (74, 77, 84), "asp2": (66, 69, 76), "asp3": (84, 87, 94), "asp_edge": (52, 54, 60),
    "lane": (226, 214, 170), "curb": (150, 146, 138),
    "slab1": (168, 160, 148), "slab2": (156, 148, 136), "slab_line": (126, 119, 108),
    "grass1": (74, 120, 62), "grass2": (63, 106, 54), "grass3": (92, 140, 74),
    "wat1": (94, 143, 131), "wat2": (82, 128, 118), "wat3": (122, 170, 156), "wat_edge": (60, 100, 94),
    "brick1": (150, 104, 84), "brick2": (136, 94, 76), "brick_line": (108, 76, 62),
    "dirt1": (152, 120, 84), "dirt2": (136, 106, 74),
    "rail": (112, 112, 116), "sleeper": (96, 70, 52), "ballast": (122, 116, 108),
}

def inside(x, y):
    # diamond fills the W x H cell
    return abs(x - (W - 1) / 2) / (W / 2) + abs(y - (H - 1) / 2) / (H / 2) <= 1.0

def new(): return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def fill(im, picker, seed):
    rnd = random.Random(seed)
    px = im.load()
    for y in range(H):
        for x in range(W):
            if inside(x, y):
                px[x, y] = picker(x, y, rnd) + (255,)
    return im

def noisy(base, alts, p=0.10):
    def pick(x, y, rnd):
        return rnd.choice(alts) if rnd.random() < p else base
    return pick

def edge_pixels(im, colour, sides):
    """Darken the outer 1px of chosen diamond sides: 'tl','tr','bl','br'."""
    px = im.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and not inside(x, y - 1 if y else 0) or False:
                pass
    return im

def put_line(im, pts, colour):
    px = im.load()
    for x, y in pts:
        if 0 <= x < W and 0 <= y < H and px[x, y][3]:
            px[x, y] = colour + (255,)

def iso_line(x0, y0, x1, y1):
    pts = []
    n = max(abs(x1 - x0), 1)
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i // n
        y = y0 + (y1 - y0) * i // n
        pts.append((x, y))
    return pts

tiles = {}

# asphalt road: variants plain / lane along X / lane along Y / crossing patch
def asphalt(seed):
    return fill(new(), noisy(P["asp1"], [P["asp2"], P["asp3"]], 0.12), seed)
tiles["road"] = asphalt(1)
r = asphalt(2)
for a in range(0, W // 2, 9):   # dashed centre line along +x axis
    pts = iso_line(W // 4 + a, H // 4 + a // 2, W // 4 + a + 5, H // 4 + a // 2 + 2)
    put_line(r, pts, P["lane"])
tiles["road_lane_x"] = r
r = asphalt(3)
for a in range(0, W // 2, 9):   # dashed centre line along +y axis
    pts = iso_line(3 * W // 4 - a, H // 4 + a // 2, 3 * W // 4 - a - 5, H // 4 + a // 2 + 2)
    put_line(r, pts, P["lane"])
tiles["road_lane_y"] = r
tiles["road_worn"] = fill(new(), noisy(P["asp2"], [P["asp1"], P["asp_edge"], P["dirt2"]], 0.22), 4)

# sidewalk: rectangular slabs
def slabs(seed):
    def pick(x, y, rnd):
        cell = ((x + 2 * y) // 9 + (x - 2 * y) // 9)
        return P["slab1"] if cell % 2 == 0 else P["slab2"]
    im = fill(new(), pick, seed)
    px = im.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and ((x + 2 * y) % 18 == 0 or (x - 2 * y) % 18 == 0):
                px[x, y] = P["slab_line"] + (255,)
    return im
tiles["sidewalk"] = slabs(5)

# kerb pieces: sidewalk with a light kerb stripe on the +x or +y road side
def kerbed(side, seed):
    im = slabs(seed); px = im.load()
    for y in range(H):
        for x in range(W):
            if not px[x, y][3]: continue
            if side == "br" and (x / (W / 2) - 1) + (y - (H - 1) / 2) / (H / 2) > 0.80: px[x, y] = P["curb"] + (255,)
            if side == "bl" and (1 - x / (W / 2)) + (y - (H - 1) / 2) / (H / 2) > 0.80: px[x, y] = P["curb"] + (255,)
    return im
tiles["sidewalk_kerb_br"] = kerbed("br", 6)
tiles["sidewalk_kerb_bl"] = kerbed("bl", 7)

tiles["grass"] = fill(new(), noisy(P["grass1"], [P["grass2"], P["grass3"]], 0.22), 8)
tiles["grass_dark"] = fill(new(), noisy(P["grass2"], [P["grass1"]], 0.15), 9)

def water(seed):
    im = fill(new(), noisy(P["wat1"], [P["wat2"]], 0.15), seed); px = im.load(); rnd = random.Random(seed + 50)
    for _ in range(5):
        x = rnd.randrange(W // 6, 5 * W // 6 - 3); y = rnd.randrange(H // 4, 3 * H // 4)
        for dx in range(3):
            if px[x + dx, y][3]: px[x + dx, y] = P["wat3"] + (255,)
    return im
tiles["water"] = water(10)
tiles["water2"] = water(11)

def brick(seed):
    def pick(x, y, rnd):
        return P["brick1"] if ((x + 2 * y) // 4 + (x - 2 * y) // 8) % 2 == 0 else P["brick2"]
    im = fill(new(), pick, seed); px = im.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and (x - 2 * y) % 8 == 0: px[x, y] = P["brick_line"] + (255,)
    return im
tiles["paving_brick"] = brick(12)
tiles["dirt_alley"] = fill(new(), noisy(P["dirt1"], [P["dirt2"]], 0.2), 13)

def rail(axis, seed):
    im = fill(new(), noisy(P["ballast"], [P["slab2"], P["dirt2"]], 0.2), seed); px = im.load()
    for a in range(0, W // 2, 5):   # sleepers across, rails along
        if axis == "x":
            pts = iso_line(W // 4 + a - 3, H // 4 + a // 2 + 2, W // 4 + a + 3, H // 4 + a // 2 - 2)
        else:
            pts = iso_line(3 * W // 4 - a - 3, H // 4 + a // 2 - 2, 3 * W // 4 - a + 3, H // 4 + a // 2 + 2)
        put_line(im, pts, P["sleeper"])
    for off in (-3, 3):
        if axis == "x": pts = iso_line(W // 4, H // 4 + off, 3 * W // 4, 3 * H // 4 + off)
        else: pts = iso_line(3 * W // 4, H // 4 + off, W // 4, 3 * H // 4 + off)
        put_line(im, pts, P["rail"])
    return im
tiles["rail_x"] = rail("x", 14)
tiles["rail_y"] = rail("y", 15)

names = list(tiles)
sheet = Image.new("RGBA", (W * len(names), H), (0, 0, 0, 0))
for i, n in enumerate(names):
    tiles[n].save(f"../assets/tiles/{n}.png")
    sheet.paste(tiles[n], (i * W, 0))
sheet.save("../assets/tiles/_sheet.png")
import json; json.dump({"tile": [W, H], "order": names}, open("../assets/tiles/tiles.json", "w"), indent=1)
print(len(names), "tiles:", ", ".join(names))

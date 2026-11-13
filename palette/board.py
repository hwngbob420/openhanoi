import json, os
from PIL import Image, ImageDraw
pal = json.load(open("hanoi_palette.json")); S=3
bg=(46,52,64,255)
def up(im,s): return im.resize((im.width*s,im.height*s),Image.NEAREST)
names=["road","road_lane_x","sidewalk","kerb_ur","cobble","grass"]
W=1500; H=980; B=Image.new("RGBA",(W,H),bg); d=ImageDraw.Draw(B)
d.text((20,10),"HANOI PALETTE  (ramp: dark -> light)",fill="white")
y=30
for n,r in pal.items():
    d.text((20,y+4),n,fill="white")
    for i,h in enumerate(r): d.rectangle([160+i*46,y,160+i*46+42,y+22],fill="#"+h)
    y+=28
# houses before/after
x=420
for lbl,f in [("Muse goc","../assets4/muse_hd_house.png"),("Muse->Hanoi","../assets5/house_muse_hanoi.png"),("Codex goc","../assets4/th_ref_s3.1.png"),("Codex->Hanoi","../assets5/house_codex_hanoi.png")]:
    im=Image.open(f).convert("RGBA"); s=2 if im.height<340 else 1.7
    im=im.resize((int(im.width*s),int(im.height*s)),Image.NEAREST)
    d.text((x,10),lbl,fill="white"); B.alpha_composite(im,(x,30)); x+=im.width+20
# tiles before/after
y=700; d.text((20,y-18),"tiles: truoc (tren) / sau (duoi)",fill="white")
for i,n in enumerate(names):
    a=Image.open(f"../assets4/tiles/{n}.png").convert("RGBA"); b=Image.open(f"../assets5/tiles/{n}.png").convert("RGBA")
    B.alpha_composite(a,(20+i*240,y)); B.alpha_composite(b,(20+i*240,y+80))
B.convert("RGB").save("board_hanoi.png")

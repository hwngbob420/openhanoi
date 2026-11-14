pho_steam — Pixelbolt export

pho_steam.png: transparent RGBA sprite sheet
pho_steam.atlas.json: TexturePacker-style frames, named animation sequences and Aseprite-style frame tags
pho_steam.tres: Godot 4 SpriteFrames; it finds pho_steam.png in its own folder, so keep the two together
pho_steam.css: CSS classes with per-frame timing
frames/: individual PNGs
animations/: animated PNGs (APNG)
pho_steam.pixel.json: editable source
player.js: dependency-free Canvas player
preview.html: open directly in a browser, or serve this folder

Canvas: import { SpritePlayer } from './player.js';
const player = await SpritePlayer.load(canvas, './pho_steam.atlas.json');
player.play('steam');

Godot 4: copy pho_steam.png and pho_steam.tres into one folder of your project, give an AnimatedSprite2D the Sprite Frames pho_steam.tres and play("steam"). Set the node's Texture Filter to Nearest for crisp pixels.

CSS: <link rel="stylesheet" href="pho_steam.css">
<span class="pf-pho_steam pf-pho_steam-steam"></span>

Timing:
steam: 6 frames of 150 ms (6.67 fps)

rain — Pixelbolt export

rain.png: transparent RGBA sprite sheet
rain.atlas.json: TexturePacker-style frames, named animation sequences and Aseprite-style frame tags
rain.tres: Godot 4 SpriteFrames; it finds rain.png in its own folder, so keep the two together
rain.css: CSS classes with per-frame timing
frames/: individual PNGs
animations/: animated PNGs (APNG)
rain.pixel.json: editable source
player.js: dependency-free Canvas player
preview.html: open directly in a browser, or serve this folder

Canvas: import { SpritePlayer } from './player.js';
const player = await SpritePlayer.load(canvas, './rain.atlas.json');
player.play('rain');

Godot 4: copy rain.png and rain.tres into one folder of your project, give an AnimatedSprite2D the Sprite Frames rain.tres and play("rain"). Set the node's Texture Filter to Nearest for crisp pixels.

CSS: <link rel="stylesheet" href="rain.css">
<span class="pf-rain pf-rain-rain"></span>

Timing:
rain: 4 frames of 70 ms (14.29 fps)

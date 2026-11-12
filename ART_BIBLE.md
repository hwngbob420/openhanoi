# Art Bible — DRAFT v0.1 (P1-002, submitted for review)

Only decisions needed for initial assets. Values marked **TBD** are not yet measured or decided; they are not guessed.

## Visual Pillars
1. **Hà Nội reads at a glance:** tile-roof sea (cam-đỏ), ochre French-style shophouses with green shutters, motorbikes, tangled cables, plastic stools. Source: `../research/hanoi_signature_bible.md`.
2. **Cosy and rich, not chunky:** warm light, teal shadows, layered foliage, smooth clean shading (Owner reference image, 2026-11-11).
3. **Readable at game size, including on a phone:** silhouettes first; signs are colour blocks (real text rendered by the engine, never painted, so Vietnamese diacritics stay correct).

## References and Boundaries
- Owner's 9 photos: learn colours/silhouettes/landmarks; do not copy a photo.
- Owner's cosy-town 2:1 image: learn palette, lighting, density; do not copy its layout or sprites.
- Not used: flat orthogonal RPG view (superseded), 8-px chunky blocks.

## Pixel-Art Rules
- Projection: **2:1 isometric (DEC-002 = A)**
- Tile size: **72x36** (from `assets/manifest.json`; the bible's older 64x32 note is superseded)
- Logical resolution / mobile scaling: **TBD** (must be set with the touch-UI task; integer scaling preferred)
- Building footprint: 1–2 tiles wide, 3–5 deep, 3–5 storeys (bible section 4)
- Palette (estimated from compressed photos, **not sampled**): tile-roof `#B5532F` `#C4572F`, old roof `#8C4A38`, moss `#55663C`, ochre wall `#D9A441`, shutter green `#2F5D3A`, corrugated teal `#3F8F7B`, tree `#2F5D34`, lake `#5E8F83`. Final sampled palette: **TBD**
- Outline: **TBD** (light/selective; earlier owner feedback: "clean, smooth, outline-light")
- Shading: warm key light, teal shadow; 3 tones per material + moss accent, no per-tile detail on roofs
- Animation frame rate: **TBD**
- Transparency/export: PNG with alpha; Codex output keyed from magenta then quantised
- Scaling/filtering: nearest-neighbour only (`image-rendering: pixelated`), integer draw positions

## Asset Categories (existing counts)
Tiles (~16 in `assets/tiles`), buildings (front/back x mirrored variants), props (stalls, carts, sign, bin, umbrella stall, xích lô, cafe set), motorbikes (6 colours x 4 dirs), trees, landmark (Ô Quan Chưởng gate). New for shop-sim: stall/shop interior pieces, customer and player characters (4 facings x walk), UI/icons (**TBD**).

## Naming Convention
Existing files use `category_asset_variant` (e.g. `moto_3_+x.png`, `prop_pho_stall.png`). Going forward: `category_asset_variant_state_v##` per workflow; existing names are kept to avoid breaking the manifest (DEC-005).

## Delivery Requirements
- Runtime export: PNG + entry in `assets/manifest.json` (file, pivot, size, kind, fp, facing, group)
- Preview sheet: required for every batch
- QA gate: `tools/qa_check.py` + visual review by AI QA, then Owner approval of the first sample of each new asset type
- Pipeline: Muse = ground tiles; Codex = elements -> `tools/process_codex2.py`; code-drawn = characters (candidate: ai-model-world chibi renderer, extended to 4 facings)
- Provenance table: Muse/Codex outputs and any external font (candidate: Fusion Pixel Font, OFL-1.1) **recorded here when adopted** (none external adopted yet)

## Approval
- Approved style samples: none yet (current 60 sprites are working assets, not approved samples)
- Version: 0.1 draft · Approved by: — · Date: —

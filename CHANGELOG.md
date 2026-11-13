# Changelog

## 0.3.0-world — 2026-11-13
- Whole world redrawn from scratch with claude-pxl (pixel-art-studio): 409 sprites in `assets/world/` — ground tiles, 200+ shophouse/modern building variants, glass towers, Ô Quan Chưởng gate, Thê Húc bridge + gate, Ngọc Sơn temple, Tháp Rùa, trees (bàng, phượng, liễu, small, bush), motorbikes (6), cars (5), buses (3), locomotive + coach, level-crossing barriers (down a/b flash, up), street props and market stalls. None of the 59 old sprites is loaded any more.
- New engine `js/world.js`: 64x64 map (old quarter, market, lake with island, modern district, park, rail street), 12 traffic lanes with signalled junctions, buses stop at shelters, vehicles yield to the player.
- Continuous rail across the whole map (row 42) with 3 level crossings; train enters and leaves at the map edges (clipped at the boundary); barriers lower when the train approaches, vehicles stop and queue, player is blocked from entering and moved to the pavement if left on the track.
- Player drawn as a translucent ghost when hidden behind a building; spawn moved to the north pavement beside the gate.
- Not done: pedestrians/NPC, audio, virtual stick, save; `lm_` landmarks are single variants.

## 0.2.0-world — 2026-11-13
- Hand-drawn player character (pxl, `assets/src/player.px.js` -> `assets/player/pl_*.png`, 3 facings x 4 walk frames, left = mirror). Replaces the code-drawn placeholder; placeholder stays as load fallback.
- Added `docs/ASSET_LIST.md` (inventory from Codex layout `docs/reference/codex_layout_v1.png`).
- Not done: the world's missing assets (vehicles, bridge/island, shopfronts...) are still to be drawn.

## 0.1.0-world — 2026-11-12 (uncommitted)
- Playable open-world build: walkable placeholder player, collision, follow camera, click/tap move, 3 landmark POIs with discovery counter, `Game.registerPOI` hook for future minigames. See docs/reports/P3_W001_report.md.

## 2026-11-12 — P0 gate approved
- Owner approved P0 and DEC-002 = A (2:1 iso 72x36 + cosy palette). DEC-003/004/005 still Proposed.

## 0.0.1-p0 — 2026-11-12
- Added workflow documents (README, TECHNICAL_PLAN, DECISIONS, TASKS, PROJECT_BRIEF draft, MILESTONES draft).
- Initialised git repository (no commits).
- No game code or asset changes.

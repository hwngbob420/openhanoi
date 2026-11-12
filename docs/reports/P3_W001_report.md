# Handoff Report — W-001 player/collision/camera, W-002 POI hook

- **Date:** 2026-11-12 · **Build:** 0.1.0-world (working tree, no commit) · **Status:** W-001, W-002 → REVIEW (not DONE)
- **Scope per DEC-008:** open world first; no minigames built. Owner asked to continue until a playable build exists (chat, 2026-11-12); P1/P2 documents are still drafts, this direction is logged here.

## Files
- New: `js/player.js` (player, collision, follow camera, POI registry, prompt/toast DOM).
- Changed: `index.html` (load player.js; hooks in `frame()`, input guards, boot init, 3 POIs; `n` name field on props for collision; `touch-action:none`; phone zoom 1 and HUD hidden under 700 px).
- Docs: DECISIONS (DEC-008), TASKS, GAME_DESIGN_LITE banner.

## How to play
`python -m http.server 8790` in `game/`, open `/index.html`. WASD/arrows or click/tap to walk, E / Space / tap the prompt to interact, F toggles legacy free camera, T time of day, wheel zoom, H hides HUD. Goal: discover the 3 landmarks (Ô Quan Chưởng, Cầu Thê Húc, Phố Tàu hỏa); counter shows `khám phá n/3`, completion toast at 3/3.

## Tests actually run (browser, localhost:8790)
| Test | Result |
|---|---|
| Load: `__stats.errors` empty, 59/59 sprites, no console errors | PASS |
| Walkability: building tile false, water false, road/plaza/bridge/rail true | PASS |
| Keyboard move: `d` for 1 s moves player, facing `right` | PASS |
| Collision: 30 frames pushing into gate, 40 frames into lake edge: 0 frames on a blocked tile | PASS |
| Click-to-move on open road target (4.5,13.5)→(9.5,13.5): arrived within 0.1 tile, target cleared | PASS |
| Click toward a stall: player stops at the stall collider (24.1,22.0), target cleared | PASS (collision, not a bug) |
| POIs: teleport to each, `near` set, prompt text shown, `interact()` increments, 3/3 toast "bạn đã khám phá đủ 3 địa danh" | PASS |
| Desktop screenshot (player, prompt) | PASS: `evidence/screenshots/w001_desktop_gate_poi.jpg` |
| Mobile 375x812: loads at zoom 1, tap on ground moves player | PASS: `evidence/screenshots/w001_mobile_375.jpg` |
| Reload after last edit (phone HUD hide): ready, 0 errors | PASS (desktop viewport only) |
| Prompt tap on touch hardware, real touch events, other browsers | NOT TESTED |
| Free-camera mode (F) behaviour | NOT TESTED (code path unchanged legacy) |
| Performance on a real phone | NOT TESTED |
| Phone-size HUD-hidden build visually on 375 px | NOT TESTED (only logic checked; mobile screenshot predates this tweak) |

Test caveat: the preview tab only runs animation frames while it is fronted/screenshotted; tests were run with frames active (58 frames/s measured).

## Known limitations
- Motorbikes and the train pass through the player (no vehicle collision).
- Straight-line click-to-move, no pathfinding; stops when blocked.
- Player art is a code-drawn placeholder (W-006). No NPCs (W-004). No virtual stick (W-003).
- Map is the same hand-built 40x40 district; stool and small clutter are not colliders.
- No save, no audio, no pause menu.
- Spawn and POI coordinates are hard-coded for this map.

## Decisions needed
1. Approve P1/P2 documents formally (still drafts) or keep direction-by-chat.
2. W-005: grow the world by hand-built districts or chunked/procedural generation.
3. Next priority: W-006 character art, W-003 touch stick, W-004 NPCs, or world expansion.

## Linking a minigame later
`Game.registerPOI({ id, label, gx, gy, r, onInteract })` — give `onInteract` a function that starts the minigame; the world keeps running underneath until a pause API is added with the framework.

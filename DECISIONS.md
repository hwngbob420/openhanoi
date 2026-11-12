# Decision Log

## DEC-001 — Continue existing Hanoi project in `C:\opensource\game`
- Date: 2026-11-12
- Status: Approved (Owner instruction in chat: coordinate with the Hanoi project)
- Context: ai-model-world offered a standalone alternative; Owner chose the Hanoi project.
- Final decision: Hanoi game is the project; ai-model-world is a tool source only.

## DEC-002 — Lock art direction
- Status: **Approved (Option A) by Owner, 2026-11-12**
- Final decision: keep 2:1 isometric, tile 72x36, with rich "cosy town" palette (warm light, teal shadows). Effective version 0.0.1-p0. Follow-up: P1-002 writes ART_BIBLE from this.
- Context: Owner has given three directions: 2:1 isometric 72x36 (what is built), flat ortho 3/4 RPG view, and (latest, 2026-11-11) rich "cosy town" 2:1 dimetric with warm light and teal shadows.
- Options: (A) keep 2:1 iso 72x36 + cosy palette; (B) switch to orthogonal 3/4; (C) keep both.
- Recommendation: A. Existing 60 sprites and tiles are 2:1; the latest reference is 2:1; switching discards built assets.
- Impact: ART_BIBLE, all future asset prompts.

## DEC-006 — Core verb and platform
- Date: 2026-11-12 · Status: Approved by Owner (answers in chat)
- Final decision: core verb = run a small shop in an explorable Hà Nội district; platform = browser, desktop + mobile.
- Impact: PROJECT_BRIEF; adds touch input, responsive scaling and an economy/customer system to the roadmap; P3 prototype scope must stay minimal (see brief risks). Open: session length, audience, title, age rating.

## DEC-007 — Open-world hub with many minigames and roleplay
- Date: 2026-11-12 · Status: Approved by Owner (chat direction)
- Change: core structure becomes an open-world Hà Nội hub where the player roleplays and joins many small game loops (minigames). Supersedes the "single shop" core verb of DEC-006; platform part of DEC-006 stands.
- Reason: Owner wants open world plus variety and roleplay.
- Impact: needs a minigame framework + shared roleplay layer; scope rule: prototype only 2–3 tiny minigames; shop becomes one minigame.
- Options considered: keep single shop (rejected by Owner); pure exploration (not chosen).
- Follow-up: P2 GAME_DESIGN_LITE defines framework and first minigames.

## DEC-008 — World first, minigames linked later
- Date: 2026-11-12 · Status: Approved by Owner (chat direction)
- Change: build the open world first (walkable, explorable, alive). Minigames are NOT built now; the world exposes a point-of-interest (POI) hook so minigames can be linked in later. Refines DEC-007 (still the long-term structure).
- Impact: P3 prototype target becomes "a walkable living Hà Nội district" with POIs. Minigame framework, minigame content and the roleplay layer move to a later milestone. Open-world scale (hand-built district vs chunked/procedural) is an open decision for the world tasks.
- Follow-up tasks: W-001 player/collision/camera, W-002 POI hook, W-003 touch controls, W-004 ambient NPCs, W-005 world expansion.

## DEC-003 — Split `index.html` into ES modules
- Status: Proposed
- Recommendation: do it as the first P3 code task, before adding player/chunks.

## DEC-004 — Binary assets in git
- Status: Proposed
- Context: ~48 MB, 398 files.
- Recommendation: plain git for now; revisit if repo exceeds ~200 MB.

## DEC-005 — Workflow folder layout
- Status: Proposed
- Context: template expects `/assets/characters|environments|ui|vfx|audio`; existing assets are `assets/sprites` + `assets/tiles` with a manifest consumed by `index.html`.
- Recommendation: keep existing layout (changing breaks the loader); add the template subfolders only when those asset types appear.

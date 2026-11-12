# Project Brief — DRAFT (P1, not approved; P0 gate must pass first)

Items marked **[OWNER?]** are not stated anywhere in the project and need your answer. Nothing below is invented as fact.

## Project Identity
- Working title: Hà Nội Open World **[OWNER? final title]**
- Genre: open-world exploration, pixel art (original request: "create an openworld pixel art game")
- Target platform(s): browser, desktop + mobile (Owner, 2026-11-12). Needs touch controls and responsive canvas.
- Engine/version: vanilla JS + Canvas 2D (no engine) — see TECHNICAL_PLAN
- Intended audience: **[OWNER?]**
- Target session length: **[OWNER? answered platform only; session length still open. Assumption: 10–20 min, mobile-friendly]**
- Project Owner: the user

## One-Sentence Pitch (proposed)
Wander a living pixel-art Hà Nội — old-quarter alleys, the lake, the train street — on foot among motorbikes, street food and landmarks.

## Player Promise (proposed)
Feel the density and rhythm of Hà Nội: warm light, motorbike streams, tangled cables, plastic stools, the hush around the lake.

## USP (proposed)
A recognisable real city rendered as a cosy, richly shaded pixel world with set-pieces (train street, Ô Quan Chưởng, Thê Húc bridge) that a generic pixel town lacks. Source: `../research/hanoi_signature_bible.md`.

## Core Experience (Owner direction 2026-11-12, supersedes the single-shop verb; see DEC-007)
**An open-world Hà Nội hub where the player roleplays a local and drops into many small minigames / mini game-loops** placed around the city (e.g. run a street stall, deliver by motorbike, haggle at the market, take photos, ride the train street). The world is the connective tissue: walking between places, meeting people, choosing what role to play today. Each mini-loop is small, self-contained and playable in a few minutes; the shop idea becomes one of the minigames, not the whole game.

## References
- Owner's 9 Hà Nội photos — learn signature visuals (see bible); do not copy photos.
- Owner's "cosy town" 2:1 dimetric pixel image (2026-11-11) — learn palette/lighting/density; do not copy layout.
- ai-model-world — learn deterministic generation and sprite tooling only.

## Constraints
- Team: Owner + AI agents. Budget/services: Hub credits (paid, per call). Technical: static browser game, no backend.
- Content/age rating: **[OWNER?]**. Release: **[OWNER?]**

## MVP Definition (proposed)
Must: walk a character through one district with collision and interaction; a minigame framework (enter → play → result → back to the world); 2–3 minigames; a simple roleplay layer (reputation/money/role flavour that carries between minigames); readable art in the locked style; day/night tint; ≥1 landmark; ambient traffic; touch + keyboard input.
Won't (MVP): multiplayer, combat, procedural infinite world, long story campaign, more than one district.

## Risks and Assumptions
- Assumption: a 2:1 iso tile world reads well for exploration. Validate: P3 prototype.
- Risk: many minigames multiply content and UI cost. Mitigation: build ONE reusable minigame framework first and prototype only 2–3 minigames, each tiny. Risk: minigames may feel disconnected from the world; the shared roleplay layer (money, reputation, role) is the glue and must be proven in P3. Risk: mobile adds touch controls, small-screen readability of 72x36 tiles and performance limits.
- Resolved: art direction = 2:1 iso 72x36 + cosy palette (DEC-002 = A).
- Risk (old): art direction flip-flopping. Risk: Hub cost/availability. Risk: no defined verb ("what do I do?").

## Success Criteria
- Prototype: player can walk the district, enter 2–3 minigames, return to the world with a visible result (money/reputation) and want to try another (Owner judgement).
- Vertical slice: one district at target quality.
- Release: **[OWNER?]**

## Status and Approvals
- Phase: P1 draft · Version: 0.0.1 · Approved by: — · Date: —

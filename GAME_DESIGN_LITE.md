# Game Design Lite — DRAFT v0.1 (P2-001; P1 gate not yet approved, everything is a proposal)

> **World-first revision (DEC-008, 2026-11-12):** the open world is built first. Everything under "Minigame Framework", "Candidate Minigames" and the meta/roleplay layer is **deferred**. For now the world provides: walkable player, collision, follow camera, points of interest (POI) with an interact hook, ambient life. A minigame later attaches to a POI via `Game.registerPOI({id, label, gx, gy, r, onInteract})`.
> First playable scenario for the current phase: spawn in the old-quarter district, walk to the gate, lake bridge and train street, each announced by its POI prompt.

## Design Pillars
1. **A city you want to walk through** — density, light and landmarks of Hà Nội reward wandering.
2. **Many tiny loops, one world** — each minigame is 2–5 minutes, understandable in 10 seconds.
3. **Roleplay through choices** — who you are today (stall owner, shipper, shopper, photographer…) changes what the city offers and how people treat you.

## Player Fantasy
A local finding your place in Hà Nội: pick a job for the day, earn a reputation, get recognised on the street.

## Controls (proposed; must work on desktop and mobile)
| Input (desktop) | Input (mobile) | Action |
|---|---|---|
| WASD / arrows | virtual stick (left thumb) | Walk (8-way on the iso grid) |
| E / Space | tap Interact button | Talk / enter minigame / confirm |
| Esc | Menu button | Pause, map, journal |
| Mouse drag / wheel | pinch (optional) | Camera look / zoom (existing viewer behaviour) |

## Game States
Boot → Menu → World (walking) → Minigame (enter → play → result) → World; Paused is available from World and Minigame.

## Micro Loop
Walk → see a point of interest → interact → short reward/feedback.

## Core Loop (one session, 10–20 min assumed)
1. Walk the district, notice places (stalls, gate, lake bridge, train street, market).
2. Enter a minigame at a place.
3. Finish with a result: **money**, **reputation** (per role), maybe an item/unlock.
4. Spend/choose (new role gear, new stall item, new minigame availability), return to walking.

## Meta Loop (post-MVP)
Reputation unlocks new districts, harder minigame tiers and NPC story threads. Not in MVP.

## Minigame Framework (the key MVP system)
- Contract: `enter(context) → play → result{money, reputation{role:n}, items[]} → exit`. World pauses, minigame owns input and screen; result is applied to shared player state.
- One shared player state: money, reputation per role, inventory, time of day.
- Each minigame declares: id, role, entry point (tile + sprite), duration target, input needs (keyboard and touch), assets.

## Candidate Minigames (to be picked by Owner; each reuses existing assets where possible)
| ID | Role | Loop | Existing assets | Cost |
|---|---|---|---|---|
| MG-A Quán nhỏ | Stall owner | Take orders from walking customers, serve in time, upkeep | pho stall, banh mi cart, cafe set, stools | Medium |
| MG-B Giao hàng | Shipper | Pick up, ride/walk through traffic to a drop-off before time runs out | 6 motorbike colours x 4 dirs, traffic | Medium |
| MG-C Mặc cả chợ | Shopper | Short haggling timing/choice game with a vendor | umbrella stall, carts | Low |
| MG-D Chụp ảnh | Photographer | Frame landmarks/moments at the right time of day for a score | Ô Quan Chưởng, train, lake | Low |
| MG-E Phố Tàu hỏa | Local | Clear the track / hurry customers before the train passes | rail tiles, train | Low–Medium |

**Recommended prototype set: MG-C (lowest cost, proves the framework), MG-A (Owner's earlier shop idea), MG-B (proves world interaction with traffic).**

## First Playable Scenario (P3 target)
- Start: player spawns in the old-quarter district at morning.
- Objective: earn money by completing at least two different minigames, see money/reputation change on a HUD.
- Obstacles: traffic, time limits inside minigames.
- Completion: after two minigames a "day summary" screen shows earnings and reputation, then play can continue or restart.
- Duration: about 5–10 minutes.

## Art and Audio Needs
- Player + customer/NPC characters (4 facings x walk) — **not yet existing**; candidate: code-drawn via ai-model-world chibi renderer extended.
- Minigame UI, HUD, interaction prompts, touch controls — **not yet existing**.
- Audio: street ambience, minigame stingers — **TBD**, none exists yet.

## MVP Feature List
- MUST: walking player with collision; interaction prompt; minigame framework; 2–3 minigames; shared money/reputation HUD; day summary; touch + keyboard input; save to localStorage.
- SHOULD: day/night effect on minigames (tint exists); NPC ambient walkers; ambient sound.
- COULD: second role-gated area; simple dialogue.
- LATER: more districts, story threads, procedural chunks (earlier idea, now deferred), multiplayer.

## Out of Scope
Combat, multiplayer, open-ended economy simulation, more than one district in MVP.

## Open Questions (Owner)
1. Which 2–3 minigames for the prototype (recommended C + A + B)?
2. Roleplay depth: light (a role label + reputation numbers) or heavy (dialogue choices, relationships)? Draft assumes light.
3. Is the player free to choose any role at any time, or must they unlock them?
4. Vietnamese only, or Vietnamese + English text? (affects UI/font work)
5. Is the earlier idea of a procedural infinite world dropped for MVP? Draft assumes yes (one hand-built district).

## Approval
- Version: 0.1 draft · Approved by: — · Date: —

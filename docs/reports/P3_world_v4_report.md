# Handoff report — world v4 (2-tile pavements, pedestrian street + gate, train-street cafés)

- **Date:** 2026-11-13 · **Build:** 0.5.0-world · **Status:** REVIEW (not DONE)
- **Requests:** (1) fade only what is needed instead of a whole block; (2) wider pavements, no more walking into trees/lamps; (3) fix Ô Quan Chưởng (looked closed but cars passed) and put it between night market / food street / pedestrian street; (4) fences along the train street and track cafés inside, using reference photos.
- **References:** Google Images blocked automated access (CAPTCHA, not bypassed). Used search-engine descriptions (plastic stools, metal tables, coolers, balconies over the rails, fence/guards near trains) and Wikimedia Commons "Hanoi Train Street" / "Train track coffee" thumbnails (narrow lane, colourful parasols, flags, pots, lanterns). Sprites are drawn from scratch; no photo is copied.

## Tests actually run (browser, localhost:8790)
| Test | Result |
|---|---|
| 0 console errors, 925 statics, 48 pedestrians | PASS |
| Player-radius reachability (0.25 grid BFS) from spawn: 1 of ~10,900 sampled cells unreachable (a park pocket); all pavements connected incl. through café segments | PASS |
| Props on road/rail/water tiles: 0 | PASS |
| Train + 3 crossings: barrier rows blocked when down, train leaves in 18 s, safety teleport to pavement | PASS |
| 10+ simulated minutes of traffic with sparse sampling: 0 frozen vehicles, avg 1.87 tiles/s (before fix: 15-20 frozen by a pedestrian stuck on a zebra) | PASS |
| Frame cost: day 4.4 ms, night 7 ms (zoom 2), 16 ms at zoom 1 night | PASS (phone not measured) |
| Screenshots: pedestrian street + gate, wide pavements, local fade, train street day/night | PASS |
| Real touch hardware, other browsers, phone fps | NOT TESTED |

## Known limitations
- Vehicles do not use the pedestrian street, so road A has no E-W traffic; N-S roads cross it.
- Café counters/awnings only on the north side (the south houses show their backs); south side has tables, plants, coolers.
- Players can still walk onto the track from a crossing; the train safety rule moves them to the pavement.
- No café NPCs (customers/staff) yet.

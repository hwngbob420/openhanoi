# Handoff report — world v3 (see-through, weather, shadows, NPC, QA tour)

- **Date:** 2026-11-13 · **Build:** 0.4.0-world · **Status:** REVIEW (not DONE)
- **Request:** fade everything a building hides (pavement, street, elements); rain/sun weather; shadows; play-test, photograph every part of the map and find upgrades.

## Play-test tour (screenshots by area, sunny 11:30 unless noted)
NW old quarter, N avenue + gate, NE towers, W houses, E modern block, market, lake/island, rail street (centre and east end), SW, S avenues, park, SE corner, map edge, plus night, rain-at-dusk and morning shadow passes.
Found and fixed: hard map edge (-> soil skirt), flag pole in water, 21 enclosed unreachable tiles (-> filled with houses/shrubs), pedestrians on the pavement freezing cars (traffic avg speed 0.03 -> 0.86 tiles/s over 10 simulated minutes), player hidden behind buildings (-> see-through).
Upgrade ideas still open (not done): rail-side details (signals, fences), different roof palettes per district, destination text on buses, ambient audio, cars with turn signals, road puddle reflections, virtual stick.

## Tests actually run (browser, localhost:8790)
| Test | Result |
|---|---|
| Load 0 console errors, 682 statics, 36 NPC, 53 lamps | PASS |
| Reachability BFS from spawn: 0 walkable tiles unreachable; all 8 POIs reachable | PASS |
| Props on road/water tiles | PASS after fix (1 flag pole fixed) |
| 10-minute traffic sim: no permanent deadlock, trains cycle, barriers toggle | PASS |
| Frame cost (desktop viewport): ~2.3 ms day, ~11-14 ms night/overlay generation frames | PASS (night not measured on a phone) |
| See-through, rain, night windows, morning shadows, map skirt: screenshots | PASS (`evidence/screenshots/fx_*.jpg`) |
| Real touch hardware, other browsers, real-phone fps | NOT TESTED |
| Pedestrians vs train crossing barriers (they never use road tiles except zebra) | by design, not stress-tested |

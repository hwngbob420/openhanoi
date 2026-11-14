# Changelog

## 0.8.0 - Hệ thống ngõ, ngách trong các block nhà
- Mỗi block nhà (trừ phố tàu) có 1-5 ngõ rộng 1 ô, sinh ngẫu nhiên có luật (carveAlleys trong world.js): ngõ thẳng thông hai đầu ra phố, ngõ ngoằn nghèo rẽ liên tục, ngõ cụt có sân chung 2x2 (cây, miếu thổ địa) hoặc miếu nhỏ ở cuối, ngách cụt ngắn tách từ ngõ dài. Hai ngõ luôn cách nhau ít nhất một dãy nhà; cửa ngõ ưu tiên cạnh đông/nam để nhìn thấy từ camera.
- Cửa ngõ có biển xanh "NGÕ 12" (12 biển, 2 hướng), vỉa hè trước cửa ngõ để trống. Trong ngõ: nền bê tông có rãnh thoát nước và rêu, sân gạch đỏ, dây phơi quần áo, dây điện chằng chịt, chậu cây, xe máy dựng sát tường, đèn sáng ban đêm. 30 sprite mới (g_alley_*, p_ngo_*, p_laundry_*, p_wires_*, p_pots_*, p_shrine).
- Nhà đứng chắn trước mặt ngõ (phía camera) bị hạ xuống tối đa 2 tầng để nhìn vào được ngõ. Một điểm khám phá mới: "Ngõ ngoằn nghèo".
- Sửa lỗi nhà "thòi ra thụt vào": bước lấp ô trống (fillGaps) trước đây có thể đặt nhà 3 ô lấn sang vỉa hè; giờ nhà luôn nằm trọn trong block.
- NPC cũng đi vào ngõ.
- Sửa lỗi nền: nếu cửa sổ chưa có kích thước lúc mở (xoay màn hình điện thoại) vòng lặp vẽ bị dừng hẳn; giờ bỏ qua khung đó và tiếp tục.

## 0.7.0 - Hồ Hoàn Kiếm, map 108x108, biển hiệu Hà Nội
- Map mở rộng 72 -> 108 ô mỗi cạnh (gấp 1,5 lần theo từng chiều): 5 cột x 6 hàng khối, 4 trục đường Bắc-Nam, 4 trục Đông-Tây (1 là phố đi bộ), 4 điểm giao đường sắt có thanh chắn.
- Khối hồ lớn 25x27 ô: hồ dài theo hướng Bắc-Nam, đảo Ngọc + đền Ngọc Sơn phía bắc, cầu Thê Húc đỏ (hơi vồng) nối từ bờ đông, cổng cầu, Tháp Bút, Đài Nghiên, Tháp Rùa trên gò giữa hồ, đường dạo quanh hồ có liễu / phượng / ghế đá.
- Phố đi bộ Hồ Gươm chạy ngay phía bắc hồ, nối ra phố cổ (Ô Quan Chưởng ở giữa), 3 cổng chào (PHỐ ĐI BỘ, MUA SẮM VUI CHƠI, HỒ HOÀN KIẾM). Đối diện hồ là khu vui chơi - mua sắm (đang để quảng trường mở, hằng PLAY trong world.js).
- Biển hiệu: chữ pixel 3x5 có dấu tiếng Việt (core.js), biển cửa hàng có chữ thật, biển dọc thò ra phố, cờ đỏ sao vàng, phù điêu xi măng niên đại, biển tên phố xanh chữ trắng 2 dòng.
- Đèn cửa sổ ban đêm theo từng tầng / hộ, áo mưa cho NPC, nút sấm chớp dữ dội (0.6.x).

## 0.5.0-world — 2026-11-13
- Map grown to 72x72 and re-laid out: pavements are now 2 tiles wide (poles, lamps, trees on the kerb row only, building-side row left clear; shop props never block the same cross-section).
- Road A is now a pedestrian night-market / food street (brick walkway, stall rows on both sides, lamps) and Ô Quan Chưởng stands in the middle of it, so both sides of the gate are market. The gate arch now shows the light on the far side (it no longer looks like a closed wall) and no cars use that street.
- Train street: red/white safety fence on both sides of the whole track (gaps only at road crossings), track cafés outside the fence (striped-awning counters in 4 colours, low tables with coloured parasols and plastic stools, coolers, plants, flags), lantern strings across the street that glow at night. Every café segment leaves a diagonal walking lane. 14 new sprites (`p_fence_*`, `p_tc_*`).
- See-through is local again: only the buildings that hide the player plus same-block neighbours within ~4 tiles fade (no more whole blocks).
- Fixes: a pedestrian that spawned on a dead-end zebra froze a lane for good (spawn off road tiles + respawn rule); `build_world_art.mjs --only` corrupted the manifest.

## 0.4.0-world — 2026-11-13
- See-through: when a building hides the player, the WHOLE city block of buildings in front of them fades to ~20% (pavement, street, stalls behind become visible); single trees/props that hide the player fade on their own; fades in/out smoothly.
- Real projected shadows (buildings, trees, poles, props, vehicles, pedestrians), sun direction and length follow the hour; fainter under cloud/rain, moonlight at night.
- Time of day (colour grading, sun glare, drifting cloud shadows) and weather: sunny, cloudy, rain (streaks, ripples, wet ground), storm (lightning). Keys R / T / Y and 6 on-screen buttons (usable on phones). Weather changes by itself now and then until the player picks one.
- Night: lit windows on houses, lamp pools, vehicle headlights, flashing crossing lamps, traffic signal glow.
- 36 pedestrians (10 recoloured looks of the player sprite) walk the pavements, plazas and zebra crossings with BFS paths; traffic stops for anyone standing on the road or a crossing.
- Map edge now a soil slab (diorama skirt) over a sky gradient instead of a hard cut.
- Fixes found while playing: pavement pedestrians froze whole lanes (yield only on road/zebra tiles), flag pole standing in water, enclosed empty yards (21 unreachable tiles -> 0).

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

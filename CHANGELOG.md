# Changelog

## 0.11.0 - Đợt 4: âm lượng tổng, ngày dài hơn, phòng trọ, phố theo giờ, vẽ lại mini-game, rà chữ
1. **Âm thanh** - mọi tiếng (kể cả sấm) đi qua MỘT AudioContext, bus tổng + bộ chặn (limiter); nền mưa/giông nhỏ đi. Tình huống xấu nhất QA dựng được (giông + sấm dồn dập + tàu qua sát barie + chuông + nhạc + chảo phở + ăn phở) có đỉnh đầu ra khoảng -3,7 dBFS (< -1 dBFS; đo cả bằng đồng hồ 50 ms của audio lẫn vòng đọc 15 ms của QA), bộ chặn nén tối đa khoảng 6,6 dB, lúc đo chuông barie và tàu đều ở gần (độ to không gian 0,78). Có `__audio.meter()` và `__audio.mix()` để đo.
2. **Ngày dài hơn** - 1 ngày game = 1000 giây (1 giờ game ≈ 41,7 giây). Ngày 1 là Thứ Sáu. `advanceTime(h)` qua 0h tự sang ngày mới.
3. **Phòng trọ của bạn** - phòng trọ trong ngõ, tới được bằng đi bộ; ở cửa bấm E/chạm có bảng "Nghỉ 1 tiếng (+25 thể lực)" và "Ngủ tới 6:00 sáng (đầy thể lực, +tâm trạng)". Ngủ: màn tối dần, sang 6:00 hôm sau, tự lưu. Đang có việc thì không cho ngủ (báo rõ lý do). Điện thoại có nút "Về nhà (Auto-Walk)", nổi lên đầu khi thể lực thấp.
4. **Kinh tế, độ khó** - tiền công theo điểm (0 điểm = 0đ, 70 điểm ≈ 63.000đ, 100 điểm = 96.000đ, nhân hệ số việc); gác chắn 6 chuyến tàu mỗi lượt; bấm loạn không lên được điểm cao (bot giả lập: các kiểu bấm ngẫu nhiên ≤ 30 điểm).
5. **Mini-game vẽ lại** - cả 5 trò (phở/bánh mì, xếp ghế, gác chắn, shipper, xích lô) dùng bộ sprite mới; bảng giá trong trò đọc từ cấu hình giá.
6. **Phố sống theo giờ và thứ** - quán mở/đóng thật (quán đóng không có chỗ ăn, không giao việc); 4 quán ghim nên giờ nào cũng có ít nhất 5 chỗ ăn mở; phố đi bộ Hồ Gươm từ tối Thứ Sáu tới hết Chủ nhật; mật độ xe/người theo giờ, tắc giờ cao điểm nhưng không xe nào đứng trên ray; ánh sáng mới (hoàng hôn tháng 11, đèn pha xe ban đêm).
7. **Đi lại** - vật nhỏ (sạp, cột điện, cột đèn, cây, ghế đá…) đi xuyên được; nhà, nước, hàng rào đường ray vẫn chặn; Auto-Walk tới đủ 81 điểm. Zoom mượt: 1 khấc chuột = 1 nấc, trôi ~0,25 giây rồi dừng đúng số nguyên; điện thoại có nút +/−. Vòng chân nhỏ gọn hơn.
8. **Rà chữ toàn bộ** - tiền thống nhất "50.000đ", "Bát phở bò", "Uống trà chanh", số thập phân kiểu Việt, bộ câu bong bóng viết lại; bong bóng im khi chơi mini-game, câu về tàu chỉ nói gần đường ray (xem docs/TEXT_AUDIT.md).
9. **Sửa nhỏ của QA** - nút nhắc "E / chạm" cao đủ 44px trên điện thoại; tới quán bằng Auto-Walk để làm việc thì nút nhắc là "Làm việc" (trước đây có lúc hiện "Ăn phở"); màn giới thiệu mini-game trên điện thoại không còn bị cắt mất tiêu đề, nút "Bắt đầu" luôn nổi ở đáy khung, chữ dài vuốt/cuộn được phía sau. Có việc ở đúng quán nào thì phải làm xong hoặc hủy việc mới ăn được ở quán đó.

Giới hạn đã biết:
- Âm thanh chỉ đo bằng số (đỉnh, độ nén); chưa ai nghe thật trên loa/tai nghe.
- Bot giả lập (8 lượt mỗi trò): gác chắn kiểu "chơi ẩu" vẫn được ~50 điểm, cao hơn mốc 40 của bấm loạn (đã báo gameplay).
- 3 quán trà chanh phố tàu (tc_20_83, tc_40_78, tc_91_78) gần như đóng cả ngày (đã báo world).
- Hàng nút thời tiết/giờ và khối chữ debug vẫn hiện (Giám đốc giữ nguyên).
- Thiết bị thật (iOS Safari, Android) chưa thử; kiểm bằng giả lập cảm ứng của Chromium.

## 0.10.0 - Đợt 3: ăn uống, xích lô, Auto-Walk, âm không gian, bong bóng thoại
1. **Ăn uống và thể lực (gameplay)** - `src/gameplay/economy-config.js` là nguồn sự thật duy nhất cho giá món (phở 50.000đ, bánh mì 25.000đ, trà chanh 15.000đ), mức hồi thể lực, tiền phạt, ngưỡng thể lực từng việc. Gợi ý "E / chạm", nút bảng chọn món và tiền thực trừ trong ví luôn khớp nhau (QA kiểm đủ 69 quán: 14 phở, 15 bánh mì, 40 trà chanh). Nhận việc khi thể lực thấp -> thông báo nổi lớn "Thể lực quá thấp — hãy ăn phở hoặc uống trà chanh để hồi sức!" (kèm toast), việc không được nhận.
2. **Xích lô** - người đi bộ cảnh báo "!"; rung chuông (Space) đúng tầm -> tiếng "kính coong" + bong bóng xanh "Mời bác đi trước!" và người đi bộ nhường; không rung -> xe tự phanh chờ; đâm -> huỷ chuyến và trừ đúng 30.000đ (ví không đủ thì trừ tới 0, không âm). Có `__gameplay.minigames.debug()` cho QA.
3. **Auto-Walk (world + UI)** - nút "Tự động đi tới (Auto-Walk)" trong thẻ việc đang nhận (Việc Vặt) và điểm check-in Phố Thị Gram: nhân vật tự tìm đường men vỉa hè, qua vạch sang đường, vào cửa ngõ; chạm phím/màn hình là dừng ngay; chip "Đang tự đi… [Dừng]". Đường chấm GPS dài được thay bằng vòng la bàn nhỏ dưới chân nhân vật + chữ khoảng cách (mét; 1 ô = 2 m).
4. **Âm thanh không gian (audio)** - tiếng tàu và chuông barie nhỏ dần theo khoảng cách (hết hẳn từ 8 ô), cân trái/phải theo trục ngang isometric; âm khu vực tự bật/tắt: hàng phở (dao thớt, nồi nước dùng), Hồ Gươm (gió hồ), ngõ sâu (radio cũ, chó sủa thưa), đường ray. Thêm tiếng `kinhcoong`, `__audio.debugSpatial()`.
5. **Bong bóng thoại (UI)** - lớp HiDPI riêng (canvas theo devicePixelRatio, font Pixelify Sans nhúng, lời thoại sinh bằng tracery): rao hàng theo giờ, đối đáp, suy nghĩ theo thời tiết/hoàng hôn (có mưa), trầm trồ khi đổi đồ/nhuộm tóc, giao thông, chữ âm thanh môi trường. Mỗi loại một màu viền, ngắt dòng, tự lật khi sát mép. Chỉ bung chữ khi zoom >= 3 (điện thoại: có nút +/- zoom); zoom xa chỉ hiện chấm. Sửa: `__bubbles.say(..., 'wow')` không còn lộ mẫu thô `{{item}}`.
6. **Bản đồ và API world** - `getZoom/setZoom/worldToScreen/getViewport/getNpcs/getVehicles/getTrain/getBarrier/getZoneAt/autoWalk`, lưới va chạm mịn 4 ô con / ô (BFS hồi quy của QA chuyển sang lưới này), sự kiện `traffic:cut`, `npc:pass`, `weather`.

Giới hạn đã biết:
- Âm thanh mới kiểm bằng số (gain/pan/khu vực qua `__audio.debugSpatial()`); chưa ai nghe thật nên độ hay/độ to của dao thớt, nồi nước dùng, gió hồ, radio ngõ và tiếng "kính coong" là chưa kiểm chứng.
- Bong bóng: câu ngắn đôi khi rớt 1 chữ xuống dòng cuối ("mời / em!"); dấu "~" trong chữ âm thanh hiện gần giống gạch ngang; dấu nặng dưới "ịch" nhỏ. Tối đa 4 bong bóng cùng lúc nên chữ tiếng động có thể bị đẩy ra khi đông.
- Hàng debug (hàng nút thời tiết/giờ, khối chữ fps) vẫn hiện trong bản phát hành; nút nhắc tương tác của player.js cao 36px (dưới 44px) trên điện thoại.
- Thiết bị thật (iOS Safari, Android) chưa thử; kiểm bằng giả lập cảm ứng của Chromium.
- Đảo Tháp Rùa vẫn là phần duy nhất không tới được bằng đi bộ (đúng thiết kế).

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

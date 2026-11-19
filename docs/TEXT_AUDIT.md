# Rà soát chữ hiển thị — Đợt 4 (TEXT_AUDIT)

Phạm vi: mọi chữ người chơi nhìn thấy trong `src/` (toast, thông báo lớn, nút nhắc E/chạm, nhãn quán/địa danh, biển phố, 5 app điện thoại, thẻ việc, 5 mini-game, bảng nghỉ/ngủ, bong bóng tracery).
Không đụng: HUD debug góc trái, hàng nút thời tiết, ngưỡng zoom bong bóng (giữ ≥3), cơ chế khám phá địa danh, mọi con số/luật chơi.

Nguyên tắc đã áp:
- **Dấu thanh kiểu cũ thống nhất:** hủy, khỏe, hòa (bỏ "huỷ", "khoẻ").
- **Từ Hà Nội:** bát (không "tô"), cốc (không "ly"), trà quất (không "trà tắc"), cây số (không "ký").
- **Số thập phân kiểu Việt** (1,5 giờ; 0,8 km); tiền luôn "50.000đ" (UI trước dùng "₫", gameplay dùng "đ" → nay chung "đ").
- **Một tên cho một thứ:** quán `tc` = "Quán trà chanh"; trả góp = "đóng kỳ"; app = "Sổ Nợ Trả Góp".

Tổng: **48 dòng sửa chữ (≈62 chuỗi)** + **9 thay đổi logic chọn câu bong bóng** + viết lại toàn bộ bộ câu bong bóng.

| Nhóm | Dòng sửa |
|---|---|
| Lỗi đã biết (chấm vàng ×2, Ăn/Uống) | 3 |
| Gameplay: toast, thông báo, trả góp, bảng nghỉ/ngủ | 15 |
| Mini-game: tiêu đề, hướng dẫn, nút, kết quả | 9 (16 chuỗi) |
| App điện thoại + định dạng tiền/số | 14 |
| Nhãn quán, địa danh, biển phố (world) | 7 |
| Logic chọn câu bong bóng | 9 |

## 1. Lỗi đã biết

| Trước | Sau | File |
|---|---|---|
| `Nhận việc: X — đi theo chấm vàng tới Y.` | `Nhận việc: X — đi theo la bàn dưới chân (hoặc bấm Auto-Walk trong app Việc Vặt 24h) tới Y.` | gameplay/jobs.js |
| Chip việc: `Đi theo chấm vàng tới Y · hạn 16:00 (4.0h)` | `Theo vòng la bàn dưới chân tới Y · hạn 16:00 (còn 4 giờ)` | gameplay/jobs.js |
| `Ăn cốc trà chanh: +8 thể lực (-15.000đ)` | `Uống cốc trà chanh: +8 thể lực (-15.000đ)`. Mỗi món có thêm trường `act`: Ăn/Ăn/Uống. Trường `verb` của nút nhắc E/chạm giữ nguyên. | gameplay/economy-config.js (+ lý do trừ tiền ở economy.js) |

## 2. Gameplay (toast, thông báo, nhà)

| Trước | Sau | File |
|---|---|---|
| `Tô phở bò` (thực đơn, toast) | `Bát phở bò` | economy-config.js |
| (không có) | `fmtDec()` — viết số thập phân kiểu Việt: 1,5 | economy-config.js |
| `Đã mua: Nhuộm nâu hạt dẻ` | `Nhuộm xong: tóc nâu hạt dẻ` (chỉ với tóc; áo/quần vẫn "Đã mua: …") | economy.js |
| Việc ở cửa hàng tiện lợi: `Phụ xe bánh mì` | `Phụ quầy bánh mì cửa hàng tiện lợi` (chỉ đổi tên việc, không đổi luật) | jobs.js |
| `Chuyến "…" bị huỷ` | `Chuyến "…" bị hủy` | jobs.js |
| `Bạn bỏ dở. Việc vẫn còn đó, quay lại vòng sáng để làm tiếp.` | thêm `(nhớ còn hạn)` | jobs.js |
| Mô tả việc bánh mì: `Kẹp bánh mì, rót trà đá cho khách.` (mini-game là **nước mía**) | `Kẹp bánh mì, rót nước mía cho khách.` | balance.js |
| `Khuân ghế ra vỉa hè, né xe máy.` | `Khuân ghế nhựa qua đường ra vỉa hè quán, né xe máy.` (đúng với cách chơi) | balance.js |
| `Trả xong "Trả góp xe máy cũ"!` | `Tất toán xong: Trả góp xe máy cũ!` | debts.js |
| `Đã trả kỳ …` | `Đã đóng kỳ …` (khớp nút "Đóng kỳ" trong app) | debts.js |
| `Chưa tới kỳ: còn …` | `Chưa tới kỳ đóng: còn …` (khớp nút app) | debts.js |
| `Ký trả góp: Trả góp phòng trọ trong ngõ.` | `Đã ký trả góp phòng trọ trong ngõ.` | debts.js |
| `Cần có khoản trước đó` | `Cần ký trả góp nhà ống 2 tầng trước đã` (ghi rõ tên khoản) | debts.js |
| `… Mở app Sổ Nợ.` / `Trễ kỳ "Trả góp …" 1 ngày` | `… Mở app Sổ Nợ Trả Góp để đóng kỳ.` / `Trễ kỳ trả góp xe máy cũ 1 ngày` | debts.js |
| `Vừa nghỉ xong — 1.5 giờ nữa…`, `Ngủ khoảng 15.2 tiếng (bỏ qua cả ngày hôm nay)` | `1,5 giờ`, `15,2 tiếng (bỏ qua hết phần còn lại của hôm nay)` (ngủ lúc 14h thì không bỏ "cả ngày") | home.js |
| `… mở app Sổ Nợ` (màn sáng dậy) | `… mở app Sổ Nợ Trả Góp` | home.js |

Giữ nguyên có chủ ý: `Thể lực quá thấp — hãy ăn phở hoặc uống trà chanh để hồi sức!`. Bài kiểm tự động so khớp **nguyên văn** câu này.

## 3. Mini-game

| Trước | Sau | File |
|---|---|---|
| `Chuyến bị huỷ!` · `Hơi vất vả...` · `Va người đi bộ` | `Chuyến bị hủy!` · `Hơi vất vả…` · `Đâm phải người đi bộ` | minigames/index.js |
| Xích lô: `…chạm hai nút Trái / Phải` (nút thật tên "Chân trái/Chân phải") | `…chạm hai nút Chân trái / Chân phải` | cyclo.js |
| Xích lô: `…họ sẽ nhường bác đi trước…huỷ chuyến và đền` (lẫn ngôi "bác"/"bạn") | `…họ sẽ nhường xe bạn đi trước…chuyến bị hủy và phải đền` | cyclo.js |
| HUD `· nhường 3` · kết quả `nhường người đi bộ 3/5` (ngược nghĩa: thật ra là người đi bộ nhường xe) | `· được nhường 3` · `người đi bộ nhường đường 3/5 · rung chuông vô cớ` | cyclo.js |
| Nút phở: `Tô phở nóng` · `Ly trà đá` · `Ly mía` | `Bát phở nóng` · `Cốc trà đá` · `Cốc nước mía` | pho.js |
| Chắn tàu: `HẠ CHẮN ngay (Space / nút giữa màn hình)` (không có nút giữa) | `(Space, chạm màn hình hoặc nút HẠ CHẮN)` | rail.js |
| Chắn tàu: `đóng thừa 1.2s` / `1.2 giây` | `đóng thừa 1,2 giây` | rail.js |
| Shipper: `Chạy xuống ngõ…` · `Khi ô cửa nhà số … sáng lên` (dấu … bị sót) | `Chạy xe vào ngõ…` · `Khi ô cửa nhà khách sáng lên` | ship.js |
| Tiêu đề mặc định `Xếp ghế trà chanh` | `Xếp ghế quán trà chanh` (trùng tên việc) | tc.js |

## 4. App điện thoại + định dạng

| Trước | Sau | File |
|---|---|---|
| Tiền `150.000₫` (HUD, app) và `50.000đ` (toast) | luôn `150.000đ` | ui/theme.js |
| Việc Vặt: `hạn 03:00 (trễ)` khi hạn qua nửa đêm; `(còn 1.5g)` | tính vòng 24 giờ; `(còn 1,5 giờ)`, sát hạn ghi `(sắp hết hạn)` | ui/apps/jobs.js |
| Khoảng cách `1.2 km` | `1,2 km` | ui/gp.js |
| Bảng việc: `hạn 13:00` / chi tiết `Hạn chót 13:00`. Sai sự thật: đó là giờ việc **rời bảng**; nhận rồi còn 4 giờ để làm, nên việc đã nhận lại ghi "hạn 16:00". | Bảng: `nhận trước 13:00`. Chi tiết: `Nhận trước 13:00` + `Thời gian làm: 4 giờ sau khi nhận` (số lấy từ `balance.JOB_WINDOW_H`). Việc đang làm vẫn ghi `Hạn chót`. | ui/apps/jobs.js |
| Xe Ôm: `Bác tài tới liền, giá theo ký` | `Bác tài đến ngay, giá theo cây số` | ui/apps/ride.js |
| Shop, tab tóc: `Đang mặc` · `Mặc` · `Mua · 80.000đ` · `Đã mua và mặc: Nhuộm nâu hạt dẻ` · `Kho đồ: 1/4 món tóc` | `Đang dùng` · `Dùng màu này` · `Nhuộm · 80.000đ` · `Nhuộm xong: tóc nâu hạt dẻ` · `Kho đồ: 1/4 màu tóc` (áo/quần giữ "mặc") | ui/apps/shop.js |
| Gram: `Ô Quan Chưởng: cổng thành cuối cùng của Thăng Long` | `cửa ô duy nhất còn lại của Thăng Long` (đúng sự thật lịch sử) | ui/apps/gram.js |
| Gram: `#phidibo` · `#caoc` | `#phodibo` · `#caooc` | ui/apps/gram.js |
| Gram: `ly cà phê trứng này đáng để chờ tàu ba phút` · `hóng quá trời` | `tách cà phê trứng này đáng để ngồi chờ tàu qua` · `hóng quá đi mất` | ui/apps/gram.js |
| `Thể lực thấp! Về nhà nghỉ hoặc ăn phở.` | `Thể lực thấp! Về phòng trọ nghỉ hoặc đi ăn phở.` | ui/phone.js |
| `Chưa thấy nhà trọ trên bản đồ — bản cập nhật sắp tới sẽ có.` (cũ, nay đã có nhà) | `Chưa tìm thấy phòng trọ trên bản đồ.` | ui/phone.js |
| Sổ Nợ (bản giả): `Đã đóng kỳ … cho Trả góp…` | `Đã đóng kỳ …: Trả góp…` | ui/apps/debts.js |
| Việc giả: `Chụp ảnh khách Phố Tàu` | `Chụp ảnh khách ở phố tàu` | ui/gp.js |

## 5. Nhãn quán, địa danh, biển phố

| Trước | Sau | File |
|---|---|---|
| Quán `tc`: `Quán cà phê · phố tàu` (mà việc ghi "quán trà chanh", nút ghi "Uống trà chanh") | `Quán trà chanh · phố tàu` | world/world.js |
| `Cửa hàng tiện lợi 24h (mở 24/24) · phố cổ` | `Cửa hàng tiện lợi 24h · phố cổ` | world.js |
| `Phở gánh rạng sáng (03:00–10:00)` | `Phở gánh (03:00–10:00)` → 4 quán ghim cùng một mẫu: **Phở đêm (18:00–03:00) · Phở gánh (03:00–10:00) · Bánh mì khuya (20:00–04:00) · Cửa hàng tiện lợi 24h** | world.js |
| Địa danh `Phố Tàu hỏa` | `Phố tàu hỏa` (khớp "phố tàu" ở nơi khác) | world.js |
| `Tháp Bút - Đài Nghiên` · `Khu vui chơi - mua sắm (sắp mở)` | dùng gạch ngang dài `–` | world.js |
| `Tàu đang tới! Bạn được đưa vào vỉa hè an toàn.` | `Tàu đang tới! Bạn được đưa lên vỉa hè cho an toàn.` | world.js |
| Biển ngã tư xoay vòng 4 tên bất kể vị trí, nên "Hàng Đào" có thể nằm phía nam hồ | Phía bắc hồ (phố cổ) dùng **Hàng Đào / Hàng Bạc**. Phía nam hồ dùng **Tràng Tiền / Lý Thường Kiệt**. Vị trí biển giữ nguyên, không gọi `rnd()`. | world.js `genSigns` |

Đã kiểm tên trên biển (ảnh đã vẽ sẵn, `assets/src/catalog.mjs`): Hàng Khay (nam hồ), Lê Thái Tổ (tây hồ), Đinh Tiên Hoàng (đông hồ), Tràng Tiền, Hàng Đào, Hàng Bạc, Lý Thường Kiệt, Phố đi bộ. Cả 8 tên đều là phố thật quanh Hồ Gươm/phố cổ và đủ dấu. Biển ngõ (NGÕ 7…, NGÁCH 9/3) cũng đúng dấu. Một chỗ chưa sửa vì nằm trong ảnh, phải vẽ lại art (đã ghi `docs/REQUESTS.md`): biển viết "ĐƯỜNG ĐINH TIÊN HOÀNG", còn các biển khác viết "PHỐ …".

## 6. Bong bóng — sửa logic chọn câu

1. **Đối đáp khớp nhau:** trước đây câu hỏi và câu đáp được bốc ngẫu nhiên độc lập, nên có cặp như "Đi đâu mà vội thế?" → "Khỏe, cảm ơn bác nhé!". Nay mỗi câu hỏi đi kèm bộ câu đáp riêng (`PAIRS`), có điều kiện giờ, thứ và mưa.
2. **Khách ngồi nói theo dáng:** đôi ghế đá, cụ ông uống trà, ván cờ tướng, khách quán phố tàu, ghế nhựa tối (trà chanh), ghế nhựa ngày (trà đá) mỗi loại có bộ câu riêng. Trước đây ai cũng nói chuyện trà chanh.
3. **Rao hàng hợp quán:** chỉ quán **đang mở** mới rao. Câu rao theo loại quán (phở / bánh mì / trà chanh phố tàu), theo khung giờ sáng/trưa/tối/khuya, và có câu riêng cho Phở gánh và cửa hàng tiện lợi. Hết cảnh xe phở rao "Bia hơi", "Cơm văn phòng".
4. **Câu về tàu:** câu nhắc "Tàu sắp qua, lùi lại nào!" chỉ dành cho NPC sát đường ray (lệch ray ≤3,5 ô hoặc vùng `rail`). Khi barie mới hạ, tàu chưa tới, tiếng là chuông barie ("Reng reng…"), chưa có "Xình xịch". Bị tàu tạt thì nói câu riêng về tàu (trước đây ra câu "Xe gì đâu mà lao ra thế!").
5. **Người đứng xem** nói câu của người xem ("Đi đứng nhìn đường vào!"), không lặp lại câu của người bị tạt.
6. **Câu về hồ chỉ nói ở gần hồ:** dò `getZoneAt` tại 5 điểm quanh NPC. Câu "Ngõ…" chỉ nói trong ngõ, câu "tàu" ở phố tàu.
7. **Giờ, thứ, thời tiết khớp thật:** hoàng hôn theo `getSunTimes()` (tháng 11 ~17:15; trước đây cửa sổ cứng 16:30–19:00 nên có câu "nắng chiều" lúc trời đã tối). Câu có chữ "nắng" chỉ ra khi trời nắng, không bao giờ khi mưa, nhiều mây hay đêm. Bỏ "nóng, mồ hôi nhễ nhại" (tháng 11). Câu phố đi bộ chỉ ra khi `isWalkingStreet()`. Câu riêng cho thứ Hai, thứ Sáu, cuối tuần (`getWeekday`).
8. **Trầm trồ:** nhuộm lại tóc đen thì không khen "Nhuộm tóc đẹp thế"; bỏ chữ "nhuộm" trong tên món ("tóc nâu hạt dẻ", không ra "tóc nhuộm nâu hạt dẻ").
9. **Im lặng khi chơi mini-game:** chặn ở chỗ sinh bong bóng và chỗ vẽ, áp cho mọi đường kể cả tiếng chuông xích lô ép hiện. Bong bóng đang hiện bị xóa khi `minigame:start`. Giữ im cho tới khi màn kết quả đóng (`minigames.isActive()`). Điện thoại mở trên màn < 700px cũng không nói (lớp bong bóng vốn đã ẩn khi mở điện thoại).

Câu sửa trong grammar (ví dụ): "Mũ bảo hiểm đâu rồi?" (khi mưa) → "Áo mưa để đâu rồi nhỉ?"; "Hạt dưa nữa không?" (hạt dưa là đồ Tết) → "Thêm đĩa hướng dương không?"; "trà tắc" → "trà quất"; "tô phở bò tái" → "vừa làm bát phở xong"; "Đêm Hà Nội mát" → "Tối se lạnh, đi ăn bát phở cho ấm"; "mời bác ơi" (sai ngữ pháp do ghép mẫu) → bỏ mẫu "#moi# ơi". Thêm câu theo mùa (hoa sữa cuối thu, ngô nướng, ngày đông ngắn).

## 7. Mẫu bong bóng sau sửa

Sinh qua **đúng các hàm chọn câu của game** (`vendorSlot`, `pickThink`, `pickPair`, `sitterSet` trong `src/ui/bubbles/grammars.js`) với ngữ cảnh giả. Mỗi loại 30 câu, ghi "số câu / số câu khác nhau". 0 câu rò mẫu thô (`#…#`). Dưới mỗi loại liệt kê tối đa 6 câu khác nhau.

**vendor pho_sang — 30 câu, 19 khác nhau**

- Phở bò tái chín nóng hổi đây, mời các bạn!
- Phở tái lăn thơm nức, mời cô chú vào ăn sáng!
- Cô chú ơi, phở nóng đây, có cả quẩy giòn!
- Phở tái lăn thơm nức, mời cả nhà vào ăn sáng!
- Bát phở sáng cho ấm bụng, mời anh chị!
- Phở bò tái chín nóng hổi đây, mời anh chị!

**vendor pho_trua — 30 câu, 17 khác nhau**

- Phở trưa đây, mời các bạn!
- Trưa rồi, làm bát phở cho chắc dạ, mời anh chị!
- Phở bò nóng, có trà đá mát, mời các bạn!
- Trưa rồi, làm bát phở cho chắc dạ, mời bác!
- Còn bàn trống đây, mời bác vào ăn phở!
- Phở bò nóng, có trà đá mát, mời cô chú!

**vendor pho_toi — 30 câu, 16 khác nhau**

- Phở nóng, quẩy giòn, mời bác vào ngồi!
- Trời se lạnh, làm bát phở cho ấm, mời cả nhà!
- Phở tối nóng hổi đây, mời các bạn!
- Các bạn ơi, phở bò tái chín đây!
- Phở nóng, quẩy giòn, mời cả nhà vào ngồi!
- Phở tối nóng hổi đây, mời anh chị!

**vendor pho_khuya — 30 câu, 9 khác nhau**

- Khuya rồi vẫn còn phở nóng, mời cả nhà!
- Đói đêm à? Bát phở nóng ngay đây!
- Khuya rồi vẫn còn phở nóng, mời cô chú!
- Phở đêm đây, ăn cho ấm bụng rồi về ngủ!
- Phở đêm nóng hổi, mời các bạn vào ngồi!
- Phở đêm nóng hổi, mời cô chú vào ngồi!

**vendor banhmi_sang — 30 câu, 13 khác nhau**

- Bánh mì pate nóng giòn đây, mời cả nhà!
- Bánh mì trứng, bánh mì pate đây, mời các bạn!
- Bánh mì nóng đây, ăn sáng cho nhanh nào!
- Bánh mì mới ra lò, giòn rụm, mời cô chú!
- Bánh mì trứng, bánh mì pate đây, mời cô chú!
- Bánh mì trứng, bánh mì pate đây, mời anh chị!

**vendor banhmi_trua — 30 câu, 14 khác nhau**

- Bánh mì trứng ốp đây, mời anh chị!
- Bánh mì trứng ốp đây, mời cả nhà!
- Bánh mì trứng ốp đây, mời cô chú!
- Bánh mì pate kẹp dưa, ăn trưa cho nhanh, mời cả nhà!
- Bánh mì pate kẹp dưa, ăn trưa cho nhanh, mời anh chị!
- Bánh mì nóng giòn, có nước mía mát, mời anh chị!

**vendor banhmi_toi — 30 câu, 12 khác nhau**

- Bánh mì nướng lại cho giòn, mời cô chú!
- Bánh mì pate, bánh mì trứng, mời cô chú ăn tối!
- Bánh mì nướng lại cho giòn, mời anh chị!
- Bánh mì pate, bánh mì trứng, mời anh chị ăn tối!
- Bánh mì nóng giòn đây, mời cả nhà!
- Bánh mì nướng lại cho giòn, mời bác!

**vendor banhmi_khuya — 30 câu, 11 khác nhau**

- Bánh mì khuya, pate nhà làm, mời cả nhà!
- Đói đêm à? Bánh mì nóng đây, mời anh chị!
- Bánh mì khuya đây, nướng lại cho giòn!
- Bánh mì khuya, pate nhà làm, mời cô chú!
- Bánh mì khuya, pate nhà làm, mời bác!
- Bánh mì khuya, pate nhà làm, mời các bạn!

**vendor tc_sang — 30 câu, 13 khác nhau**

- Ngồi uống cà phê chờ tàu qua nào, mời cả nhà!
- Ngồi uống cà phê chờ tàu qua nào, mời các bạn!
- Sáng ra làm cốc cà phê cho tỉnh, mời cô chú!
- Ngồi uống cà phê chờ tàu qua nào, mời cô chú!
- Sáng ra làm cốc cà phê cho tỉnh, mời anh chị!
- Sáng ra làm cốc cà phê cho tỉnh, mời cả nhà!

**vendor tc_trua — 30 câu, 10 khác nhau**

- Trà chanh mát lạnh đây, mời cả nhà!
- Ngồi trà chanh xem tàu qua nào, mời cô chú!
- Ngồi trà chanh xem tàu qua nào, mời bác!
- Ngồi trà chanh xem tàu qua nào, mời các bạn!
- Ngồi trà chanh xem tàu qua nào, mời cả nhà!
- Trà chanh, trà quất giải nhiệt đây!

**vendor tc_toi — 30 câu, 13 khác nhau**

- Còn bàn sát đường ray, mời các bạn ngồi xem tàu!
- Còn bàn sát đường ray, mời cô chú ngồi xem tàu!
- Trà chanh, hướng dương đây, mời bác!
- Còn bàn sát đường ray, mời cả nhà ngồi xem tàu!
- Ngồi trà chanh chém gió nào, mời bác!
- Trà chanh, hướng dương đây, mời cả nhà!

**vendor tc_khuya — 30 câu, 6 khác nhau**

- Trà chanh đêm, còn vài bàn, mời bác!
- Quán sắp dọn rồi, cốc trà chanh cuối nhé!
- Trà chanh đêm, còn vài bàn, mời anh chị!
- Trà chanh đêm, còn vài bàn, mời các bạn!
- Trà chanh đêm, còn vài bàn, mời cả nhà!
- Trà chanh đêm, còn vài bàn, mời cô chú!

**vendor pho_ganh — 30 câu, 6 khác nhau**

- Phở gánh nóng hổi, mời cô chú ăn sáng!
- Phở gánh đây, ngồi ghế đẩu ăn mới đã!
- Gánh phở vừa dọn, nước dùng còn sôi sùng sục!
- Phở gánh nóng hổi, mời anh chị ăn sáng!
- Phở gánh nóng hổi, mời bác ăn sáng!
- Phở gánh nóng hổi, mời các bạn ăn sáng!

**vendor cstore — 30 câu, 3 khác nhau**

- Có bánh mì nóng, đồ ăn sẵn, mời vào ạ!
- Cửa hàng mở cả đêm, mời anh chị ghé ạ!
- Xin chào, mời anh chị vào xem hàng ạ!

**think [sáng sớm ven hồ] — 30 câu, 7 khác nhau**

- (sangHo) Dậy sớm tập thể dục quanh hồ mới đã.
- (sangHo) Đi bộ ba vòng hồ, hôm nay chăm thật!
- (sang) Đường bắt đầu đông rồi, đi làm thôi.
- (sangHo) Sáng sớm, sương còn giăng trên mặt hồ.
- (sang) Sáng nay ăn bánh cuốn hay phở nhỉ?
- (sang) Sáng nay se lạnh, phải mặc thêm áo khoác.

**think [sáng phố] — 30 câu, 4 khác nhau**

- (sang) Sáng nay se lạnh, phải mặc thêm áo khoác.
- (sang) Mùi cà phê sáng thơm quá.
- (sang) Đường bắt đầu đông rồi, đi làm thôi.
- (sang) Sáng nay ăn bánh cuốn hay phở nhỉ?

**think [trưa nắng] — 30 câu, 4 khác nhau**

- (trua) Trời hanh khô, môi nẻ hết cả.
- (trua) Nắng hanh thế này, thèm cốc trà đá.
- (trua) Nắng nhẹ thế này, ngồi vỉa hè uống trà đá là nhất.
- (trua) Trưa rồi, tìm chỗ ngồi nghỉ thôi.

**think [trưa nhiều mây] — 30 câu, 4 khác nhau**

- (truaMay) Hôm nay trời dịu, đi bộ không mỏi chân.
- (truaMay) Trời âm u, chắc chiều nay mưa.
- (truaMay) Trưa rồi, tìm chỗ ngồi nghỉ thôi.
- (truaMay) Trời xám xịt, phơi đồ chắc không khô.

**think [hoàng hôn ven hồ (nắng)] — 30 câu, 4 khác nhau**

- (hoanghonHo) Mặt hồ lấp lánh nắng chiều, chụp ảnh thôi.
- (hoanghonHo) Nắng chiều trên mặt hồ, đẹp như tranh.
- (hoanghonHo) Ráng chiều đỏ cả Tháp Rùa.
- (hoanghonHo) Hoàng hôn Hồ Gươm đẹp quá…

**think [hoàng hôn phố] — 30 câu, 4 khác nhau**

- (chieu) Mới chiều mà trời đã sẩm tối, mùa đông có khác.
- (chieu) Sắp tan tầm, đường lại tắc cho xem.
- (chieu) Ngày mùa đông ngắn thật, chưa gì đã tối.
- (chieu) Chiều rồi, phải đi đón con thôi.

**think [tối thường] — 30 câu, 4 khác nhau**

- (toi) Tối nay ăn bún chả hay bún đậu nhỉ?
- (toi) Mùi ngô nướng thơm cả góc phố.
- (toi) Tối se lạnh, đi ăn bát phở cho ấm.
- (toi) Phố lên đèn rồi, đẹp thật.

**think [tối thứ Sáu phố đi bộ] — 30 câu, 7 khác nhau**

- (toi) Phố lên đèn rồi, đẹp thật.
- (toi) Tối nay ăn bún chả hay bún đậu nhỉ?
- (toiPdb) Tối nay phố đi bộ có nhóm nhảy kìa.
- (toi) Tối se lạnh, đi ăn bát phở cho ấm.
- (toiPdb) Cuối tuần, đi dạo phố đi bộ thôi.
- (toiPdb) Phố đi bộ đông vui quá!

**think [khuya] — 30 câu, 4 khác nhau**

- (khuya) Khuya rồi, về ngủ thôi.
- (khuya) Phố vắng tanh, nghe rõ cả tiếng lá rơi.
- (khuya) Đêm Hà Nội vắng hẳn, chỉ còn tiếng xe rác.
- (khuya) Đói quá, đi tìm hàng phở đêm.

**think [mưa (trưa)] — 30 câu, 5 khác nhau**

- (mua) Mưa thế này, ăn bát bún ốc nóng là hết ý.
- (mua) Trời ơi, mưa! Áo mưa để đâu rồi nhỉ?
- (mua) Mưa rồi, quần áo ngoài ban công chưa rút!
- (mua) Mưa lâm thâm cả buổi, đường trơn quá.
- (mua) Ướt hết rồi, phải chạy vào hiên trú thôi.

**think [mưa (đêm)] — 30 câu, 5 khác nhau**

- (mua) Mưa thế này, ăn bát bún ốc nóng là hết ý.
- (mua) Mưa rồi, quần áo ngoài ban công chưa rút!
- (mua) Ướt hết rồi, phải chạy vào hiên trú thôi.
- (mua) Trời ơi, mưa! Áo mưa để đâu rồi nhỉ?
- (mua) Mưa lâm thâm cả buổi, đường trơn quá.

**think [trong ngõ (trưa)] — 30 câu, 8 khác nhau**

- (trua) Trưa rồi, tìm chỗ ngồi nghỉ thôi.
- (ngo) Ngõ này lắt léo thật.
- (ngo) Dây điện chằng chịt, nhìn mà hoa cả mắt.
- (ngo) Ngõ nhỏ mà nhà nào cũng dắt xe máy vào tận nhà.
- (trua) Nắng nhẹ thế này, ngồi vỉa hè uống trà đá là nhất.
- (trua) Nắng hanh thế này, thèm cốc trà đá.

**think [phố tàu (chiều)] — 30 câu, 7 khác nhau**

- (chung) Tháng này lại sắp đến kỳ đóng tiền trọ.
- (chung) Hà Nội cuối thu, đi đâu cũng thơm mùi hoa sữa.
- (tau) Tàu qua sát nhà, cốc nước cũng rung.
- (chung) Hôm nay ăn gì nhỉ?
- (chung) Lương tháng này chưa thấm vào đâu.
- (tau) Ở phố này, nghe còi tàu thành quen.

**think [thứ Hai sáng] — 30 câu, 8 khác nhau**

- (sang) Đường bắt đầu đông rồi, đi làm thôi.
- (chung) Hà Nội cuối thu, đi đâu cũng thơm mùi hoa sữa.
- (thu2) Thứ Hai đầu tuần, uể oải quá.
- (sang) Sáng nay se lạnh, phải mặc thêm áo khoác.
- (chung) Hôm nay ăn gì nhỉ?
- (chung) Tháng này lại sắp đến kỳ đóng tiền trọ.

**chat pass_sang (pass) — 30 câu, 11 khác nhau**

- Chào bác, dạo này khỏe không?  →  Khỏe, cảm ơn bác nhé!
- Đi đâu mà vội thế?  →  Đi làm, muộn mất rồi!
- Ăn sáng chưa đấy?  →  Rồi, vừa làm bát phở xong.
- Đi đâu mà vội thế?  →  Đi họp, trễ rồi bác ơi!
- Hôm nay trời đẹp nhỉ?  →  Ừ, mát mẻ dễ chịu thật.
- Cuối tuần đi dạo hồ không?  →  Để xem, sợ cuối tuần mưa.

**chat pass_trua (pass) — 30 câu, 9 khác nhau**

- Lâu quá mới gặp đấy!  →  Ừ, dạo này bận quá, thông cảm nhé.
- Trưa rồi, ăn gì đây?  →  Cơm văn phòng cho nhanh.
- Hôm nay trời đẹp nhỉ?  →  Ừ, mát mẻ dễ chịu thật.
- Chào bác, dạo này khỏe không?  →  Khỏe, cảm ơn bác nhé!
- Chào bác, dạo này khỏe không?  →  Vẫn khỏe, bác cũng khỏe chứ?
- Lâu quá mới gặp đấy!  →  Đúng thế, hôm nào đi cà phê đi!

**chat pass_toi_t6 (pass) — 30 câu, 8 khác nhau**

- Tối rồi, về ăn cơm thôi!  →  Về thôi, đói lắm rồi.
- Tối rồi, về ăn cơm thôi!  →  Ừ, về kẻo nhà chờ.
- Tối nay đi phố đi bộ không?  →  Đi, nghe nói có nhóm nhảy hay lắm.
- Chào bác, dạo này khỏe không?  →  Vẫn khỏe, bác cũng khỏe chứ?
- Lâu quá mới gặp đấy!  →  Ừ, dạo này bận quá, thông cảm nhé.
- Chào bác, dạo này khỏe không?  →  Khỏe, cảm ơn bác nhé!

**chat pass_khuya_mua (pass) — 30 câu, 8 khác nhau**

- Lâu quá mới gặp đấy!  →  Ừ, dạo này bận quá, thông cảm nhé.
- Khuya rồi còn đi đâu thế?  →  Vừa tan ca, về ngủ đây.
- Chào bác, dạo này khỏe không?  →  Khỏe, cảm ơn bác nhé!
- Mưa thế này, có mang áo mưa không?  →  Có, để trong cốp xe rồi.
- Cuối tuần đi dạo hồ không?  →  Đi chứ, đi bộ một vòng hồ!
- Khuya rồi còn đi đâu thế?  →  Đi ăn phở đêm, đói quá!

**chat couple_ho (couple) — 30 câu, 6 khác nhau**

- Hồ đêm nay đẹp anh nhỉ?  →  Đẹp thật, ngồi thêm chút nữa nhé.
- Mai mình đi ăn kem Tràng Tiền nhé?  →  Ừ, nhớ mua cả kem cốm nhé!
- Hồ đêm nay đẹp anh nhỉ?  →  Ừ, đẹp như em vậy.
- Mai mình đi ăn kem Tràng Tiền nhé?  →  Lạnh thế này mà còn đòi ăn kem à?
- Gió hồ lạnh không em?  →  Không sao, gió mát mà.
- Gió hồ lạnh không em?  →  Hơi lạnh, nhưng ngồi cạnh anh thì ấm.

**chat couple_pho (couple) — 30 câu, 4 khác nhau**

- Phố đêm nay đông nhỉ?  →  Ừ, ngồi đây ngắm người qua lại cũng vui.
- Mai mình đi ăn kem Tràng Tiền nhé?  →  Lạnh thế này mà còn đòi ăn kem à?
- Khuya rồi, anh đưa em về nhé.  →  Ngồi thêm năm phút nữa thôi.
- Mai mình đi ăn kem Tràng Tiền nhé?  →  Ừ, nhớ mua cả kem cốm nhé!

**chat elder (elder) — 30 câu, 6 khác nhau**

- Cháu nhà ông thi cử thế nào?  →  Đang ôn, thức khuya lắm.
- Dạo này rau ngoài chợ đắt quá.  →  Đắt thật, cái gì cũng lên giá.
- Nghe đài bảo mai trời trở lạnh đấy.  →  Thế à, phải lấy áo bông ra rồi.
- Cháu nhà ông thi cử thế nào?  →  Đỗ rồi, đỗ Bách Khoa đấy!
- Cho thêm cốc trà đá cô ơi!  →  Có ngay đây ông ơi!
- Trà hôm nay đậm nhỉ cụ?  →  Đậm, uống tỉnh cả người.

**chat chess (chess) — 30 câu, 5 khác nhau**

- Nước này cụ đi hay đấy.  →  Cờ già mà, ăn nhau ở kinh nghiệm.
- Ván này hòa nhé?  →  Hòa thế nào được, tôi sắp thắng rồi!
- Đi nhanh lên, chờ mãi.  →  Cờ là phải nghĩ, vội gì!
- Chiếu tướng! Cụ đỡ đi.  →  Từ từ, để tôi tính nước đã.
- Chiếu tướng! Cụ đỡ đi.  →  Ối, nước này hiểm quá!

**chat cafeTau_sang (cafeTau) — 30 câu, 4 khác nhau**

- Cà phê trứng ở đây béo ngậy thật.  →  Ừ, uống xong còn được xem tàu.
- Sắp có tàu chưa chị chủ?  →  Mười phút nữa, cứ ngồi uống đi.
- Tàu qua sát thế này, có sợ không?  →  Hơi sợ, nhưng chụp ảnh đẹp lắm!
- Sắp có tàu chưa chị chủ?  →  Sắp rồi, nhớ ngồi lùi vào trong nhé!

**chat stool_toi_t7 (stoolToi) — 30 câu, 5 khác nhau**

- Trà chanh quán này ngon thế nhỉ?  →  Ừ, chua ngọt vừa miệng.
- Nghe nói mai mưa đấy.  →  Thế thì tối nay ngồi cho đã.
- Cho thêm cốc trà chanh nữa chị ơi!  →  Có ngay, đợi chút nhé!
- Quán đông ghê, may còn chỗ.  →  Tối cuối tuần mà, đông là phải.
- Thêm đĩa hướng dương không?  →  Thêm đi, ngồi chém gió còn lâu.

**chat stool_trua (stoolNgay) — 30 câu, 4 khác nhau**

- Trưa nay ăn gì cho nhanh?  →  Gọi suất cơm bụi đi.
- Chuyện nhà dạo này sao rồi?  →  Cũng ổn, con cái đi học đều.
- Trưa nay ăn gì cho nhanh?  →  Bún chả đầu ngõ ấy, ngon lắm.
- Làm cốc trà đá cho mát nào.  →  Ừ, uống trà đá ngồi hóng gió là nhất.

**wow khen(item) — 90 câu, 15 khác nhau**

- Bạn ơi, tóc nâu hạt dẻ xinh xỉu luôn!
- Ôi, áo sơ mi trắng đẹp quá!
- Ôi, quần short kaki đẹp quá!
- Bạn ơi, áo sơ mi trắng xinh xỉu luôn!
- Chà, quần short kaki hợp ghê!
- Ồ, tóc nâu hạt dẻ nổi bật cả phố!

**wow toc — 30 câu, 4 khác nhau**

- Màu tóc này nổi cả con phố!
- Tóc mới hợp mặt ghê!
- Nhuộm tóc đẹp thế, ở tiệm nào vậy?
- Ôi, tóc mới nhìn ngầu quá!

**wow tocDen — 30 câu, 3 khác nhau**

- Ơ, nhuộm lại đen rồi à? Hợp đấy!
- Tóc đen tự nhiên vẫn đẹp nhất.
- Để lại tóc đen trông hiền hẳn!

**wow trang — 30 câu, 4 khác nhau**

- Mặc đồ này đi chụp ảnh là đẹp!
- Đồ mới à? Nhìn sành điệu đấy!
- Bộ đồ mới nhìn lịch sự quá!
- Diện thế này chắc đi hẹn hò!

**traffic nhuong — 30 câu, 4 khác nhau**

- Kính coong! Tránh đường cho bác xích lô nhé.
- Từ từ thôi, nhường đường nào.
- Nghe chuông xích lô rồi, tránh sang bên!
- Ối, xích lô! Nhường bác đi trước nào.

**traffic giat — 30 câu, 4 khác nhau**

- Á! Xe gì đâu mà lao ra thế!
- Giật cả mình! Đi đứng cẩn thận chứ!
- Trời ơi, suýt nữa thì đụng!
- Tạt đầu thế hả, hết cả hồn!

**traffic giatTau — 30 câu, 3 khác nhau**

- Hú hồn, suýt nữa thì đứng trên ray!
- Giật cả mình, tàu chạy sát quá!
- Ối, tàu! Lùi lại mau!

**traffic xem — 30 câu, 4 khác nhau**

- Chậm thôi, phố đông lắm!
- Trời ơi, hú hồn!
- Đi đứng nhìn đường vào!
- Cẩn thận chứ, suýt nữa thì đụng!

**traffic tau — 30 câu, 4 khác nhau**

- Lùi vào, tàu chạy sát lắm đấy!
- Barie hạ rồi, đứng đợi tàu thôi.
- Tàu đến, cất ghế vào trong nào!
- Tàu sắp qua, lùi lại nào!

**sound tau — 30 câu, 3 khác nhau**

- Xình xịch… ình ịch…
- Xình xịch… xình xịch…
- Tu tu~ Xình xịch…

**sound barie — 30 câu, 2 khác nhau**

- Leng keng… leng keng…
- Reng reng… reng reng…

**sound chuong — 30 câu, 2 khác nhau**

- Kính coong~
- Kính coong! Kính coong~

**sound cho — 30 câu, 3 khác nhau**

- Gâu! Gâu gâu!
- Gâu gâu!
- Ẳng ẳng…

**sound coi — 30 câu, 3 khác nhau**

- Bíp bíp!
- Tin tin!
- Bim bim!

**chat origin (say) — 30 câu, 5 khác nhau**

- Ăn cơm chưa đấy?
- Chào bác, dạo này khỏe không?
- Hôm nào rảnh đi cà phê nhé!
- Đi đâu mà vội thế?
- Lâu quá mới gặp đấy!

## 8. Ảnh kiểm
`tests/shots/text_audit_night_pho.png` (1280x720, 23:40, Phở đêm rao đúng giờ khuya), `tests/shots/text_audit_rail.png` (1280x720, tàu tạt: câu riêng về tàu + người xem nói câu người xem), `tests/shots/text_audit_home_mobile.png` (390x844, bảng nghỉ/ngủ có số thập phân kiểu Việt), `tests/shots/text_audit_job_detail_mobile.png` (390x844, chi tiết việc: Nhận trước / Thời gian làm). Đã xem thêm trong khung trình duyệt: chip việc mới, thực đơn "Quán trà chanh · phố tàu" + toast "Uống cốc trà chanh…", hướng dẫn xích lô mới, app Việc Vặt và Shop tab tóc ở 390x844. Console: 0 lỗi (chỉ có favicon.ico 404 của máy chủ dev, có từ trước).

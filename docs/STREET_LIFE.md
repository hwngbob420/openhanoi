# STREET_LIFE — Nhịp sống phố & ánh sáng đêm (Phố cổ / Hồ Hoàn Kiếm)

> Tài liệu nghiên cứu làm căn cứ cho (a) **nhịp sống phố theo giờ** và (b) **ánh sáng ban đêm thật** trong game.
> Ngày tổng hợp: 18/11/2026. Nguồn đánh số `[n]`, danh sách đầy đủ ở cuối file.
>
> **Quy ước độ tin cậy** (ghi cạnh từng nhận định):
> - **[QĐ]**: văn bản/quy định chính thức, hoặc báo đưa tin về quy định.
> - **[BÁO]**: phóng sự hoặc bài báo có quan sát thực địa. Năm bài được ghi vì có bài đã cũ.
> - **[DL]**: blog hoặc hướng dẫn du lịch, trang review (Foody…). Chỉ dùng làm tham khảo.
> - **[TK]**: lấy từ phần tóm tắt của công cụ tìm kiếm, **chưa đối chiếu với bài gốc**.
> - **[QS]**: quan sát phổ biến, không có nguồn định lượng.
> - **[TKG]**: ước lượng thiết kế cho game, không phải số đo.
>
> Mọi hệ số mật độ (0–1) trong file là **[TKG]**, được neo vào các mốc có nguồn. `state.hour` trong engine là số thực, nên các bảng theo giờ là **keyframe** và code cần **nội suy tuyến tính** giữa hai mốc liền kề.

---

## 0. Các sự thật làm thay đổi logic game (đọc trước)

| # | Sự thật | Hệ quả cho code | Nguồn |
|---|---|---|---|
| 1 | Phố đi bộ Hồ Gươm hoạt động **liên tục từ 19:00 thứ Sáu đến 24:00 Chủ nhật**. | **Ban ngày thứ Bảy và Chủ nhật cũng cấm xe**, không chỉ buổi tối. | [1][2] [BÁO] |
| 2 | Khi phố đi bộ hoạt động, cấm toàn bộ xe cơ giới và xe thô sơ vào **16 phố**. Riêng **Lê Thái Tổ chỉ cấm nửa đường phía hồ** (đoạn Hàng Trống → Hàng Khay). | Cần một danh sách đoạn đường bị đóng, và Lê Thái Tổ phải chia thành 2 làn có trạng thái riêng. | [3] [BÁO, Tết 2024] |
| 3 | Lịch phố đi bộ có thể **tạm dừng** (Tết, bầu cử) hoặc **kéo dài** (dịp 30/4–4/5/2025 chạy liên tục 19h 30/4 → 24h 4/5; dịp Giỗ Tổ 19h 4/4 → 24h 7/4/2025). | Cần cờ `walkingStreet.override = 'pause' / 'extend'` theo ngày lễ. | [1][2] [BÁO] |
| 4 | Từ 01/01/2025, xe **bắt buộc bật đèn từ 18:00 đến 06:00**, và cả khi sương mù, mưa, khói bụi. Luật cũ quy định 19:00 → 05:00. | Cơ chế bật/tắt đèn pha có nguồn rõ: `hour >= 18 || hour < 6 || weather.rain/fog`. | [30] [QĐ] |
| 5 | Hoàng hôn ở Hà Nội dao động từ khoảng **17:15** (cuối tháng 11) đến khoảng **18:43** (đầu tháng 7). Bình minh từ khoảng **5:13** (đầu tháng 6) đến khoảng **6:34** (giữa tháng 1). UTC+7, không đổi giờ mùa hè. | Độ tối phải tính theo **giờ mặt trời theo ngày trong năm**, không dùng giờ cố định. Hôm nay (18/11) trời tối **trước** giờ bật đèn đường 18:30, nên có một khoảng chạng vạng thiếu sáng. | [31] [DL] |
| 6 | Chiếu sáng nghệ thuật Hồ Gươm vận hành từ **28/8/2026**: hơn **3.000 đèn LED Signify** (Philips UNI, Color Kinetics) chia **4 lớp**, **màu đổi theo mùa** (xuân hồng, hè đỏ/tím, **thu vàng**, đông trắng bạc). **Giờ vận hành chưa được công bố.** | Tháp Rùa, cầu Thê Húc và đền Ngọc Sơn cần bảng màu theo mùa. Hôm nay đang là mùa thu, nên dùng **vàng**. Lịch bật/tắt ở mục 4.3 là [TKG]. | [28] [BÁO 2026] |
| 7 | Cầu cạn "Dải lụa ký ức" bên hồ chỉ là công trình **tạm**, trưng bày **8/10 → 2/12/2026**. | Coi đây là **sự kiện có hạn**, không phải công trình cố định. | [28b] [BÁO 2026] |
| 8 | Hà Nội **cấm ô tô trên 16 chỗ** vào phố cổ và khu hồ Hoàn Kiếm trong khung **6:30–8:30** và **16:30–18:30**. Xe buýt và xe đưa đón học sinh được miễn. Thí điểm từ 1/3/2025, tiếp tục áp dụng từ 12/2025. | Đây là **khung giờ cao điểm chính thức**, dùng làm mốc. Nó **không phải** số đo lưu lượng. Trong khung này chỉ sinh xe buýt, không sinh xe khách du lịch lớn. | [4][5] [QĐ] |

---

## 1. Lịch 24 giờ

### 1.1 Bối cảnh định lượng

- Hà Nội có khoảng **6,9 triệu xe máy** và **1,1 triệu ô tô** (thống kê tháng 4/2025), cộng khoảng 1,2 triệu xe ngoại tỉnh thường xuyên lưu thông [7] [TK]. Năm 2025, Hà Nội đăng ký mới hơn 255.000 xe máy [7b] [BÁO].
- Có bài báo đưa tin xe máy chạy xăng chiếm khoảng **97%** số xe máy trong Vành đai 1 [7c] [BÁO, mới chỉ đọc tiêu đề]. Như vậy trong phố cổ, xe máy áp đảo tuyệt đối.
- Ùn tắc giờ cao điểm sáng thường được báo chí ghi nhận ở **trục ngoài** (Vành đai 2, Vành đai 3, Trường Chinh, cầu Chương Dương) [6] [BÁO 2026]. Bên trong phố cổ, sau khi cấm xe trên 16 chỗ, giới chức báo cáo "cơ bản không còn ùn tắc nghiêm trọng giờ cao điểm" [4] [QĐ].
- Phố cổ hay **tắc vào buổi tối** do đông người đi bộ và mua sắm, nhất là các nút **Hàng Gà, Hàng Chiếu, Phùng Hưng** quanh Hàng Mã vào cuối tuần và mùa Trung thu [32] [BÁO/DL].
- Giờ học: theo tổng hợp tìm kiếm (**chưa đối chiếu bài gốc**), giờ vào học sớm nhất là tiểu học 7:30, THCS 7:15, THPT 7:00. Giờ tan chiều khoảng 16:45 (tiểu học), 17:15 (THCS), 17:30 (THPT) [25] [TK]. Cổng trường giờ tan học thường ùn ứ vì phụ huynh dừng xe chiếm 2/3 lòng đường, ví dụ phố Thụy Khuê [25] [BÁO].
- Xe buýt: hầu hết tuyến chạy từ khoảng **5:00** đến **21:00–22:30** tùy tuyến. Ví dụ tuyến 01 chạy 5:00–21:00, tuyến 02 chạy 5:00–22:30 [24] [BÁO 2018]. **Buýt đêm mới đang ở giai đoạn nghiên cứu**, chưa có tuyến chạy chính thức [24b] [BÁO]. Các tuyến cụ thể chạy xuyên phố cổ **chưa được xác minh**. Khuyến nghị cho game: chỉ cho xe buýt chạy trên các trục rộng quanh hồ và rìa phố cổ.

### 1.2 Bảng giờ: phương tiện và người đi bộ (ngày thường)

Hệ số 0–1 là **[TKG]**, trong đó 1.0 là đỉnh trong ngày. Cột "Nguồn neo" ghi mốc có thật mà hệ số dựa vào.

| Khung | Xe máy | Ô tô | Xe buýt | Đi bộ (phố cổ) | Ven hồ (đi bộ) | Mô tả | Nguồn neo |
|---|---|---|---|---|---|---|---|
| 00–01 | 0.12 | 0.06 | 0 | 0.12 | 0.10 | Phố vắng. Còn quán đêm và Circle K. | [15][21] |
| 01–03 | 0.04 | 0.02 | 0 | 0.04 | 0.03 | Gần như không người. Thỉnh thoảng có xe ôm hoặc taxi. | [QS] |
| 03–04 | 0.05 | 0.02 | 0 | 0.06 | 0.03 | Phở gánh bắt đầu dọn hàng. Chợ đầu mối chuyển hàng. | [15] |
| 04–05 | 0.10 | 0.03 | 0 | 0.15 | **0.35** | Người tập thể dục ra hồ từ 4–5h. | [8] |
| 05–06 | 0.28 | 0.08 | 0.3 | 0.35 | **0.90** | Tập thể dục đông nhất. Xôi, phở mở hàng. Buýt chạy chuyến đầu. | [8][9][10][24] |
| 06–07 | 0.60 | 0.30 | 0.8 | 0.50 | **1.00** | Đỉnh tập thể dục (5:30–7:30). Ăn sáng. | [12][11] |
| 07–08 | **1.00** | 0.80 | 1.0 | 0.55 | 0.60 | Cao điểm sáng, học sinh vào lớp. | [4][25] |
| 08–09 | 0.85 | 0.75 | 0.9 | 0.45 | 0.35 | Hết cao điểm lúc 8:30. Người tập về hết khoảng 8h. | [4][12] |
| 09–11 | 0.55 | 0.60 | 0.6 | 0.50 | 0.45 | Hàng rong quanh hồ (nước mía, bánh mì, hoa sen). Khách du lịch. | [11] |
| 11–13 | 0.70 | 0.60 | 0.6 | 0.65 | 0.40 | Giờ ăn trưa của dân văn phòng. Một số trường tan buổi sáng. | [19] (bia hơi đông trưa), [QS] |
| 13–14 | 0.45 | 0.50 | 0.5 | 0.30 | 0.25 | Nghỉ trưa. Phố lặng nhất ban ngày. | [11] (12–15h kém sôi động) |
| 14–16 | 0.55 | 0.60 | 0.6 | 0.40 | 0.30 | Cụ già uống trà đá, chơi cờ. Bia hơi chiều. | [19][34] |
| 16–17 | 0.80 | 0.80 | 0.9 | 0.55 | 0.45 | Bắt đầu cao điểm chiều (16:30), học sinh tiểu học tan trường. | [4][25] |
| 17–18 | **1.00** | **0.95** | 1.0 | 0.65 | 0.60 | Đỉnh tan tầm. Lúc này cũng đang hoàng hôn (17:15–18:43). | [4][31] |
| 18–19 | 0.90 | 0.85 | 0.9 | 0.75 | **0.85** | Hết cao điểm 18:30. Gia đình và cặp đôi ra hồ (đỉnh thứ hai của hồ). | [4][11] |
| 19–21 | 0.70 | 0.55 | 0.6 | **0.90** | 0.90 | Trà chanh, cà phê. Phố cổ tắc do người đi bộ. | [20][32] |
| 21–22 | 0.50 | 0.40 | 0.4 | 0.70 | 0.70 | Cặp đôi ven hồ. Quán nhậu đông. | [11][19] |
| 22–23 | 0.35 | 0.25 | 0.15 | 0.50 | 0.45 | Các tuyến buýt cuối cùng (khoảng 22:30). Đèn trang trí tắt. | [24][26] |
| 23–24 | 0.20 | 0.12 | 0 | 0.30 | 0.25 | Vắng dần. Đèn đường giảm 1/3, công viên tắt hết đèn. | [26] |

**Hệ số nhân cuối tuần** [TKG]:
- **Thứ Sáu 19h → Chủ nhật 24h**: xe = 0 trên 16 phố đi bộ, và xe dồn sang các phố bao quanh (×1.3 ở Hàng Bông, Hàng Gai, Trần Hưng Đạo…).
- Người đi bộ ven hồ ×1.6 trong khung 19–23h. Trên phố đi bộ, khung 23–24h vẫn giữ 0.6 rồi tan nhanh sau 24h.
- Thứ Bảy và Chủ nhật buổi sáng: không có cao điểm đi làm, nên xe máy khung 07–09h nhân ×0.6.

### 1.3 Ai xuất hiện ở đâu, khi nào

| Nhóm NPC | Giờ | Địa điểm | Hành vi | Nguồn |
|---|---|---|---|---|
| Người tập đi bộ hoặc chạy quanh hồ | **4:00/5:00 → khoảng 8:00**, đỉnh 5:30–7:30 | Vòng quanh hồ (khoảng 1,7 km) | Phần lớn là người cao tuổi. Đi bộ, chạy bộ. Đi lùi thành vòng tròn lớn. Vẫn đi khi trời 9°C và mưa phùn. | [8] [BÁO 2018], [11][12] [DL] |
| Nhóm aerobic hoặc nhảy theo nhạc | Từ khoảng 5:00 (đông hơn vào mùa hè); lớp chính khoảng 6:00 | Khoảng trống trước **tượng đài Lý Thái Tổ**, vỉa hè dọc khối nhà UBND thành phố | Chủ yếu là phụ nữ trung niên và cao tuổi. Có người hướng dẫn, mở loa di động. Một lớp có hơn 100 người. | [9] [BÁO **2005**], [10] [BÁO], [11] |
| Thái cực quyền, dưỡng sinh, múa kiếm | 5:00–7:00 | Bãi cỏ, gốc cây ven hồ | Phụ nữ lớn tuổi tập thái cực. Đàn ông lớn tuổi múa kiếm. Có nhóm mặc đồ lụa trắng. | [10] [BÁO], [13] [DL] |
| Cầu lông, đá cầu | 5:30–7:30 | Đường ven hồ, **bờ Đông** (phía Đinh Tiên Hoàng) | Từng cặp hoặc nhóm nhỏ, căng lưới tạm hoặc chơi không lưới. | [11][12][13] [DL] |
| Đàn ông khoảng 30 tuổi tập sức | 5:30–7:00 | Dụng cụ tập ngoài trời ở góc phố, ghế đá | Hít đất, squat, plank. | [10] |
| Gánh hàng rong (quang gánh, xe đạp chở hàng) | 6:00–10:00 và 15:00–19:00 | Quanh hồ, đầu ngõ | Bán nước mía, bánh mì, hoa sen, hoa quả. **Từ 2016 bị dẹp khỏi vỉa hè**, nên trong game nên để họ vừa đi vừa bán, thỉnh thoảng bỏ chạy. | [11][18] [BÁO] |
| Gánh xôi | 6:00 → khoảng 9:00 (bán hết thì về) | Phố Hàng Hòm, các đầu phố | Vài nghìn đồng một gói. Có quán nấu từ 4:00, đông nhất khoảng 8:00. | [17] [BÁO] |
| Cụ già uống trà đá, chơi cờ tướng | 8:00–11:00 và 14:00–18:00 | Gốc cây, ghế nhựa vỉa hè, ven hồ | Trà đá vỉa hè là "không gian giao lưu". **Chưa tìm được nguồn trực tiếp** về cảnh chơi cờ ven Hồ Gươm. | [34] [BÁO], [QS] |
| Người uống bia hơi | Trưa (11–13) và tối (17–24) | Vỉa hè, phố Tạ Hiện | Đàn ông 30–70 tuổi, nhiều người đã nghỉ hưu. Có cảnh 15:00 hai cụ ngồi uống. Ở Tạ Hiện, khách đông **qua nửa đêm**. | [19] [BÁO] |
| Học sinh | Vào 7:00–7:30. Tan 11:00–11:30 (một số trường) và **16:45–17:30** | Cổng trường | Phụ huynh đỗ xe máy kín lòng đường trước cổng. | [25] [TK]/[BÁO] |
| Dân công sở ăn trưa | 11:30–13:00 | Quán cơm bình dân, bún, phở | Đi theo nhóm 2–5 người, đeo thẻ nhân viên. | [QS] |
| Giới trẻ uống trà chanh, cà phê | 18:00–23:00 (cuối tuần đông từ sáng) | **Nhà Thờ Lớn**, Hàng Mã, ven hồ | Ghế nhựa thấp, cắn hạt hướng dương, chụp ảnh. Khoảng 15–30 nghìn đồng một cốc. | [20] [BÁO/DL] |
| Gia đình, cặp đôi hẹn hò | 18:00–23:00 | Ghế đá ven hồ, **cầu Thê Húc**, bờ Tây (Lê Thái Tổ) | Ngồi ghế đá, chụp ảnh ở cầu, dạo bộ. | [11] [DL] |
| Nghệ sĩ đường phố, nhóm biểu diễn | Thứ Sáu–Chủ nhật, 19:00–23:00 | Tượng đài Lý Thái Tổ, quảng trường Đông Kinh Nghĩa Thục, phố Hàng Khay | Hát, nhảy, ảo thuật. | [3b] [DL] |
| Người ăn đêm | 22:00–03:00 | Phở đêm, cháo, bánh mì khuya | Nhóm thanh niên, tài xế, người làm ca. | [15] [BÁO/DL] |
| Thức khuya sau 23h | 23:00–04:00 | Rất ít người | Bảo vệ, xe ôm, người dọn vệ sinh, công nhân môi trường. | [QS] |

---

## 2. Phố đi bộ Hồ Gươm

| Mục | Nội dung | Nguồn |
|---|---|---|
| Lịch thường lệ | **Từ 19:00 thứ Sáu đến 24:00 Chủ nhật hằng tuần, liên tục** (gồm cả ban ngày thứ Bảy và Chủ nhật). | [1] Znews, [2] Thời báo Tài chính [BÁO] |
| Ngoại lệ | Tạm dừng dịp Tết Nguyên đán 2024 [3] và một đợt bầu cử [1]. Kéo dài dịp lễ: 19h 30/4 → 24h 4/5/2025, 19h 4/4 → 24h 7/4/2025. Có lần mở sớm từ 13:00 thứ Sáu (7/3/2025). | [1][2][3] |
| Phạm vi cấm xe | 16 phố, gồm **Đinh Tiên Hoàng, Lê Lai, Lê Thạch, Đinh Lễ, Nguyễn Xí, Tràng Tiền, Hàng Khay, Phố Hồ Hoàn Kiếm, Lò Sũ, Hàng Dầu, Trần Nguyên Hãn, Lương Văn Can, Bảo Khánh, Hàng Bài** (và các phố khác). **Lê Thái Tổ chỉ cấm nửa phía hồ** (Hàng Trống → Hàng Khay). | [3] VTC [BÁO] |
| Không gian liền kề | Các tuyến đi bộ phố cổ và **chợ đêm Hàng Đào → Hàng Ngang → Hàng Đường → chợ Đồng Xuân**, họp thứ Sáu, thứ Bảy, Chủ nhật, khoảng **18:00 đến 22:30–24:00** (các nguồn ghi khác nhau). Đông nhất từ 18:30 đến 21:30. Chủ nhật một số sạp dọn sớm. | [22] [DL] |
| Hoạt động đặc trưng | Biểu diễn nghệ thuật đường phố (tượng Lý Thái Tổ, Đông Kinh Nghĩa Thục, Hàng Khay) [3b]. Lớp **aerobic buổi tối** thứ Sáu–Chủ nhật [12b]. Hàng ăn rong tràn ra lòng đường [11]. Dịp Tết có ông đồ cho chữ [3b]. Trò chơi dân gian (kéo co, nhảy dây, ô ăn quan) xuất hiện trong nhiều bài du lịch, **nhưng chưa trích được nguồn cụ thể** [QS]. | [3b][11][12b] |
| Tiết kiệm điện | Có đợt phố đi bộ **cắt toàn bộ đèn trang trí sau 23:00**. | [26c] [BÁO] |

**Gợi ý cho game:** máy trạng thái `walkingStreet = { active: dow==5&&h>=19 || dow==6 || dow==0&&h<24 }`, cộng thêm cờ override theo lễ. Khi chuyển sang `active`, cần làm hai việc:
- Despawn xe đang nằm trên các đoạn bị đóng, hoặc cho chúng chạy hết đoạn rồi tắt.
- Spawn chốt rào và cảnh sát phân luồng ở đầu 16 phố.

---

## 3. Giờ mở cửa theo loại hàng quán

### 3.1 Mốc có nguồn

| Loại | Giờ phổ biến | Ví dụ có nguồn | Nguồn |
|---|---|---|---|
| **Phở (quán thường)** | **6:00–10:30/11:00** và **17:00–21:30/22:00**. Một số quán bán liền cả ngày từ 6:30 đến 22:30. | Phở Bát Đàn (49 Bát Đàn): 6–11h và 17–21h30. Phở Thìn Bờ Hồ: 6–13h và 17–22h. Phở gia truyền Bát Đàn (Nguyên Hồng): 6:30–22:30. | [16] [DL] |
| **Phở đêm** (hiếm) | 18:00 → 03:00, hoặc 22:30 → 05:00 | Phở Huy (9 Phùng Hưng): 18h–3h. Phở đường tàu (3 Trần Phú): đến khoảng 2h. Có quán "30 năm không ngủ" chỉ bán lúc nửa đêm, khách chờ 2 tiếng. | [15] [BÁO/DL] |
| **Phở gánh rạng sáng** | **03:00 → 06:00** (bản cũ) hoặc 03:30 → 10:00 (bản mới, tại 7 Chợ Gạo) | Phở gánh Hàng Chiếu: bán từ 3h sáng đến khi hết khách, sau chuyển sang Chợ Gạo. | [15] [BÁO 2016]/[DL] |
| **Xôi sáng** | **6:00 → khoảng 9:00** (bán hết thì nghỉ). Có quán nấu từ 4:00. | Gánh xôi Hàng Hòm. | [17] [BÁO] |
| **Bánh mì** | Sáng 6–10h. Một số xe bánh mì bán khuya, kê vài ghế vỉa hè. | Chưa có nguồn ghi giờ cụ thể. | [17b] [DL], [QS] |
| **Bia hơi / quán nhậu** | Khoảng 10/11:00 → 22:30–24:00. **Đông trưa và tối.** Tạ Hiện đông **qua 24h**. | Bia Phố Cổ Tạ Hiện: 8:00–22:30. Một quán gia đình làm đến sau nửa đêm. | [19] [BÁO], [19b] [DL] |
| **Trà chanh** | Chiều → khoảng 23:00 ("sáng đèn đến tận khuya"). Cuối tuần đông từ sáng. | Trà chanh Nhà Thờ, trà chanh Hồ Tây. | [20] [BÁO/DL] |
| **Cà phê** | 6:30/7:00 → 22:00/23:00 | Chưa có nguồn giờ cụ thể. | [QS] |
| **Trà đá vỉa hè** | 7:00 → 22:00, rải rác cả ngày | | [34] [QS] |
| **Cửa hàng tiện lợi 24h** | **24/7, kể cả lễ Tết** (Circle K). 7-Eleven, GS25, WiN ON mới vào Hà Nội. Có mô hình xuyên đêm. | Circle K có khoảng 450 cửa hàng. | [21] [DL/BÁO] |
| **Tạp hoá** | 6:30 → 22:00 | | [QS] |
| **Ki-ốt** (báo, thuốc lá, nước) | 6:00 → 21:00 | | [QS] |
| **Hàng quần áo** (phố cổ) | 8:30/9:00 → 21:30/22:00. Cuối tuần mở muộn hơn. | | [QS] |
| **Cơm bình dân** | **10:30 → 13:30** (cao điểm 11:30–12:30). Một số quán bán cả chiều tối (16:30–20:00). | | [QS] |
| **Hàng Mã** (đèn lồng, đồ lễ) | 8:00 → 22:00. **Trung thu và Tết** đông nghịt đến khuya. | | [32] [BÁO/DL] |

Về khung pháp lý giờ đêm: Hà Nội đã thông qua kế hoạch phát triển kinh tế ban đêm. Bản dự thảo từng đặt khung 18:00–24:00 và đề xuất cho một số khu mở đến 6:00, nhưng bản chính thức **không ấn định giờ** mà giao cơ quan liên quan xây dựng khung "linh hoạt, có điều kiện". Thành phố cũng đang nghiên cứu mô hình khu giải trí 24/24 [23] [BÁO]. **Hệ quả cho game:** quán đêm qua 24h là hợp lệ nhưng hiếm, nên giới hạn ở vài quán được "ghim" (mục 5.4).

### 3.2 Đề xuất tỉ lệ quán mở theo giờ [TKG]

Giá trị là xác suất một quán thuộc loại đó đang mở tại thời điểm keyframe. Mỗi quán có `seed` riêng, so `hash(seed) < p` để quyết định mở hay đóng, nhờ vậy quán không nhấp nháy mở/đóng liên tục.

| Giờ | Phở | Bánh mì | Xôi | Trà chanh | Cà phê | Bia hơi/nhậu | Tạp hoá | Tiện lợi | Ki-ốt | Quần áo | Cơm bình dân | Trà đá |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 00 | 0.05 | 0.08 | 0 | 0.05 | 0.03 | 0.15 | 0 | 1 | 0 | 0 | 0 | 0 |
| 03 | 0.06 | 0.03 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| 05 | 0.35 | 0.30 | 0.50 | 0 | 0.10 | 0 | 0.10 | 1 | 0.20 | 0 | 0 | 0.05 |
| 06 | 0.90 | 0.80 | 1.00 | 0 | 0.45 | 0 | 0.50 | 1 | 0.70 | 0 | 0 | 0.30 |
| 08 | 1.00 | 0.90 | 0.80 | 0.05 | 0.90 | 0 | 0.90 | 1 | 0.90 | 0.20 | 0.05 | 0.70 |
| 10 | 0.70 | 0.50 | 0.10 | 0.15 | 0.95 | 0.30 | 0.95 | 1 | 0.95 | 0.90 | 0.50 | 0.80 |
| 12 | 0.45 | 0.40 | 0 | 0.25 | 0.90 | 0.80 | 0.90 | 1 | 0.90 | 0.90 | 1.00 | 0.80 |
| 14 | 0.15 | 0.30 | 0 | 0.40 | 0.85 | 0.40 | 0.85 | 1 | 0.90 | 0.95 | 0.20 | 0.80 |
| 16 | 0.35 | 0.40 | 0 | 0.60 | 0.90 | 0.60 | 0.90 | 1 | 0.90 | 1.00 | 0.30 | 0.80 |
| 18 | 0.85 | 0.60 | 0 | 0.90 | 0.95 | 0.95 | 0.95 | 1 | 0.85 | 1.00 | 0.40 | 0.70 |
| 20 | 0.80 | 0.60 | 0 | 1.00 | 0.95 | 1.00 | 0.90 | 1 | 0.60 | 0.95 | 0.20 | 0.60 |
| 22 | 0.40 | 0.40 | 0 | 0.70 | 0.60 | 0.80 | 0.50 | 1 | 0.10 | 0.30 | 0 | 0.20 |
| 23 | 0.15 | 0.25 | 0 | 0.35 | 0.25 | 0.50 | 0.15 | 1 | 0 | 0.05 | 0 | 0.05 |

Cuối tuần, các loại trà chanh, cà phê, bia hơi và quần áo được cộng thêm 1 giờ vào giờ đóng cửa: dịch keyframe 22 và 23 lên ×1.3, có chặn trần ở 1.

### 3.3 Đảm bảo "giờ nào cũng có ít nhất 2 chỗ ăn"

Không thể trông vào xác suất cho khung khuya. Cần **ghim (pin) 4 quán cố định** trên bản đồ, đặt ở các vị trí cách xa nhau:

| Quán ghim | Giờ mở (cố định) | Dựa trên |
|---|---|---|
| `pho_dem` (kiểu Phở Huy, Phùng Hưng) | 18:00 → 03:00 | [15] |
| `pho_ganh` (kiểu phở gánh Hàng Chiếu/Chợ Gạo) | 03:00 → 10:00 | [15] |
| `circle_k` (cửa hàng tiện lợi, bán đồ ăn nóng) | 24/7 | [21] |
| `banh_mi_khuya` (xe bánh mì hoặc cháo đêm) | 20:00 → 04:00 | [17b], [QS] |

Kiểm tra từng giờ:

| Giờ | Chỗ ăn mở (chỉ tính quán ghim) | Số chỗ |
|---|---|---|
| 00–03 | pho_dem, circle_k, banh_mi_khuya | 3 |
| 03–04 | pho_ganh, circle_k, banh_mi_khuya | 3 |
| 04–10 | pho_ganh, circle_k (thêm xôi và phở thường từ 5–6h) | ≥2 |
| 10–18 | circle_k và các quán thường (phở, cơm, bánh mì luôn có p > 0.15) | ≥2 (có thể assert trong code) |
| 18–20 | pho_dem, circle_k (và quán thường) | ≥2 |
| 20–24 | pho_dem, circle_k, banh_mi_khuya | 3 |

Thêm một assert lúc khởi tạo thế giới: với mỗi `h` từ 0 đến 23.5, bước 0.5, `count(openFood(h)) >= 2`.

---

## 4. Ánh sáng đêm thật

### 4.1 Đèn đường Hà Nội

| Nhận định | Chi tiết | Nguồn |
|---|---|---|
| Đơn vị vận hành | Hapulico vận hành hơn 90% hệ thống chiếu sáng công cộng của Hà Nội. | [27] Nhân Dân [BÁO] |
| Natri chuyển dần sang LED | Hapulico đang thay đèn phóng điện truyền thống (đèn natri cao áp) bằng **LED**, giảm khoảng 50% công suất. Các quận đang thay dần đèn natri cũ. Từ 2016, UBND thành phố yêu cầu ưu tiên LED và cấm đèn sợi đốt, halogen ở chiếu sáng công cộng. | [27][27b][27c] [BÁO] |
| LED thông minh | Đèn LED có cảm biến, dim được từ 100% xuống 70%, 50%, 30% hoặc tắt từ trung tâm điều khiển. | [27] |
| Màu natri | **Natri cao áp (HPS)** có nhiệt độ màu khoảng **2200K**, ánh **vàng cam**. **Natri thấp áp (LPS)** đơn sắc **589 nm**, ánh vàng đặc, làm mọi vật xám hoặc vàng, không phân biệt được màu. | [29] [DL kỹ thuật] |
| Màu LED | Đèn LED đường thế hệ đầu thường **4000K trở lên** (trắng trung tính đến lạnh), bị chê "giống phòng mổ". Hoàn màu tốt hơn natri. | [29] |
| Ven hồ và phố cổ | **Chưa tìm được nguồn** xác nhận loại hoặc nhiệt độ màu của cột đèn cổ điển quanh hồ. Thực tế đang **lẫn lộn**: trục lớn đã sang LED trắng, ngõ nhỏ và phố cũ còn đèn vàng. | [QS] |

**Khuyến nghị cho game** [TKG]:
- **Ven hồ và phố cổ**: dùng ánh **vàng ấm** (2700–3000K) để giữ không khí "phố cổ".
- **Trục rộng** (Trần Hưng Đạo, Lý Thái Tổ…): LED **trắng trung tính** 4000K.
- **Ngõ**: lẫn lộn. Khoảng 30% là bóng natri cam 2200K còn sót, phần còn lại là LED trắng. Cũng có cả bóng compact trắng của nhà dân treo ra ngõ.

### 4.2 Lịch bật/tắt và tiết giảm đèn công cộng

| Văn bản | Nội dung | Nguồn |
|---|---|---|
| Phương án tiết kiệm điện 2023 (bài Bộ Công Thương, 05/6/2023) | Bật **muộn 30 phút**, tắt **sớm 30 phút** so với lịch thường. Đường, ngõ, ngoại thành **cắt 1/3 số đèn ngay từ đầu**, **sau 23:00 cắt thêm 1/3**. Đường 4 làn cắt 50% từ đầu, sau 23:00 tắt dãy giữa. **Công viên, vườn hoa tối đa 50%, tắt hết sau 23:00.** Đèn trang trí khu trung tâm **chỉ chạy đến 23:00 thứ Bảy và Chủ nhật**. | [26] [QĐ/BÁO, đã đọc bài gốc] |
| Chỉ thị 06/CT-UBND (17/4/2026) | Theo đoạn trích từ kết quả tìm kiếm (**file PDF không tải được**): **Chế độ 1: 100% đèn 18:30–22:30. Chế độ 2: 2/3 đèn 23:00–02:30.** Chế độ 3 chưa rõ nội dung. Quảng cáo và trang trí tắt hoặc giảm 50% trong cao điểm tối. **Trang trí tắt toàn bộ từ 22:00**, riêng khu trung tâm thứ Bảy và Chủ nhật chạy đến 23:00. Có báo đưa tin nhiều doanh nghiệp đã tắt biển quảng cáo cỡ lớn theo yêu cầu này. | [26b] [TK], [26d] [BÁO 2026] |
| Phương án mùa hè (không rõ năm) | Theo tổng hợp tìm kiếm (chưa đối chiếu bài gốc): bật 18:30, cắt 5:00. | [26e] [TK] |

**Hai profile cho game** [TKG, dựa trên các mốc trên]:

| Mốc | Profile `normal` | Profile `saving` (theo các văn bản tiết kiệm) |
|---|---|---|
| Bật đèn đường | Hoàng hôn + 10 phút (tháng 11 khoảng 17:25) | 18:30 cố định (giữa 17:15 và 18:30 trời tối mà đèn chưa sáng) |
| 100% đèn | đến 23:00 | 18:30–22:30 |
| Giảm | 23:00 → 2/3 | 23:00–02:30 → 2/3 |
| Khuya | 02:30 → 1/2 | 02:30 → 1/3 (chế độ 3 chưa rõ, đây là giả định) |
| Tắt | Bình minh − 10 phút | 05:00–05:30 |
| Công viên ven hồ | 100% đến 23:00, sau đó 50% | ≤50%, **tắt hết sau 23:00** |
| Trang trí, quảng cáo | Đến 23:00 (cuối tuần 24:00) | Tắt từ 22:00, cuối tuần trung tâm 23:00 |

Cách giảm số đèn: mỗi cột đèn có `lampIndex`. Giảm 1/3 tức là tắt các cột có `lampIndex % 3 == 2`, giảm 2/3 tức là chỉ giữ các cột có `% 3 == 0`. Tắt theo cột như vậy tạo ra các **khoảng tối xen kẽ**, giống ngoài đời thật hơn là giảm đều độ sáng.

### 4.3 Hồ Gươm, Tháp Rùa, cầu Thê Húc

| Hạng mục | Thực tế | Nguồn |
|---|---|---|
| Dự án chiếu sáng nghệ thuật 2026 | Vận hành từ khoảng 28/8/2026. Hơn **3.000 đèn LED** Signify (Philips UNI, Color Kinetics), điều khiển thông minh, chia **4 lớp**: (1) **Tháp Rùa, cụm đền Ngọc Sơn, cầu Thê Húc**; (2) **kè và hàng cây sát mép nước**; (3) cây, lối đi, **Tháp Bút, tháp Hòa Phong**; (4) mặt đường và hiệu ứng khu đi bộ. Có thêm đền Bà Kiệu và cây lộc vừng chín gốc. Khi khánh thành, đèn bật tuần tự từ cây đa lan ra Tháp Rùa. | [28] Tuổi Trẻ, [28c] Tiền Phong [BÁO 2026] |
| Màu | Nền là ánh sáng ấm. Màu **đổi theo mùa**: xuân **hồng**, hè **đỏ và tím**, thu **vàng kim**, đông **trắng bạc**. | [28] |
| Trình diễn | 3D mapping lên Tháp Rùa kết hợp màn nước, trong các chương trình như "Hà Nội – Rạng rỡ" (29/8) và Tết Dương lịch (24/12/2025 → 4/1/2026). | [28c] [BÁO] |
| Cầu cạn "Dải lụa ký ức" | Tạm thời từ 8/10 đến 2/12/2026. Có LED dải dưới tay vịn và mép lối đi, kèm khung gương. | [28b] [BÁO] |
| Giờ vận hành | **Chưa công bố.** | — |

Gợi ý lịch cho game [TKG]: bật cùng đèn đường. Lớp 1 (Tháp Rùa, cầu Thê Húc) sáng đến 23:00, hoặc 24:00 khi phố đi bộ hoạt động. Lớp 2–3 tắt lúc 22:00/23:00 theo profile. Cầu Thê Húc **màu đỏ son** cần một đèn hắt ấm từ dưới lên để giữ màu đỏ, vì nếu bị ánh vàng của mùa thu phủ lên, cầu sẽ ngả sang cam.

### 4.4 Đèn của từng loại quán, nhà dân, phương tiện

> Toàn bộ mô tả kiểu đèn theo loại quán dưới đây là **[QS]** (quan sát phổ biến, chưa có nguồn định lượng). Mã hex là **xấp xỉ theo bảng nhiệt độ màu vật đen** (2200K ≈ #FF932C, 2700K ≈ #FFA957, 3000K ≈ #FFB46B, 4000K ≈ #FFD1A3, 5000K ≈ #FFE4CE, 6500K ≈ #FFF9FD), rồi được chỉnh cho dễ đọc trên nền đêm. Đây **không** phải số đo.

| Nguồn sáng | Kiểu thật [QS] | Màu lõi | Màu quầng | Bán kính / hình | Ghi chú |
|---|---|---|---|---|---|
| Đèn đường natri (ngõ, còn sót) | Bóng treo cần, vệt cam | `#FFC27A` | `#FF932C` | Tròn, r lớn, quầng nhạt | Tắt bão hoà của vật dưới đèn (desaturate 60%) vì natri hoàn màu kém [29]. |
| Đèn đường LED 4000K (trục lớn) | Chụp phẳng, vũng sáng gọn | `#FFF4E6` | `#FFD1A3` | Elip 2:1 trên mặt đường, mép rõ | Trên nền đêm xanh, màu này trông "trắng". |
| Cột đèn ven hồ (cổ điển) | Cầu kính trên cột gang | `#FFE0B0` | `#FFA957` | r vừa, có glow ở đầu cột | Lớp 2–3 của chiếu sáng hồ (cây, kè) đổi màu theo mùa. |
| Đèn hắt Tháp Rùa | Rọi từ dưới nước lên | Mùa thu `#FFC24A` | `#FFB000` @ alpha 0.25 | Hình thang hắt lên thân tháp, phản chiếu kéo dài trên mặt hồ | Xuân `#FF9EC4`, hè `#E0404A`/`#9A5CFF`, đông `#DDE6F5` [28]. |
| Cầu Thê Húc | Dải LED theo vòm cầu | `#FF5A3C` | `#FF2A1A` | Chuỗi điểm theo cung cầu, phản chiếu trên mặt hồ | |
| Phở, quán ăn bình dân | **Đèn tuýp huỳnh quang hoặc LED tuýp trắng xanh** dưới bạt | `#E8FFF6` | `#BFEFFF` | Hình chữ nhật hắt ra vỉa hè | Huỳnh quang có vệt ngả xanh lá. Hơi nước nồi phở bốc lên sẽ bắt sáng. |
| Bia hơi | Tuýp trắng và bóng tròn trần, biển hiệu đỏ | `#F2FFF0` | `#FFF1C8` | Rộng, lan ra lòng đường | Tạ Hiện: thêm LED quảng cáo nhiều màu và nhạc to [19]. |
| Trà chanh, cà phê vỉa hè | **Đèn dây (fairy light), bóng vàng tròn** treo trên cây | `#FFD27A` | `#FFB050` | Chuỗi chấm nhỏ, r 6–10 px, nhấp nháy nhẹ | |
| Cửa hàng tiện lợi | **Trắng lạnh rất sáng**, toàn bộ mặt kính phát sáng | `#F7FBFF` | `#DDEBFF` | Hình chữ nhật lớn hắt ra vỉa hè, cường độ cao nhất phố | Biển hiệu Circle K: đỏ `#E5262D`, cam `#F7931E`, viền tím `#6B2C91`. |
| Hàng quần áo | **Vàng ấm trong cửa kính**, spotlight vào ma-nơ-canh | `#FFE3B8` | `#FFB46B` | Ô cửa kính sáng, vệt vàng hắt ra vỉa hè | |
| Hàng Mã, đèn lồng | Đèn lồng đỏ, vàng, đèn ông sao | `#FF6A3D` / `#FFD23F` | `#FF3D1F` | Chuỗi treo ngang phố (engine đã có `lanterns`) | Trung thu ×2 mật độ [32]. |
| Biển hiệu LED | Viền LED chạy chữ đỏ, xanh dương, xanh lá | `#FF3B3B` `#3BA0FF` `#3BFF8A` | cùng màu @ alpha 0.3 | Viền chữ nhật, chạy theo pha 1–2 Hz | Tắt hoặc giảm 50% sau 22:00 (profile saving) [26b]. |
| Cửa sổ nhà dân: bóng vàng | Bóng sợi đốt hoặc LED ấm | `#FFC98A` | — | Ô cửa | |
| Cửa sổ nhà dân: đèn tuýp | Trắng | `#EEF6FF` | — | Ô cửa | Khoảng 40% nhà dân phố cổ dùng tuýp hoặc LED trắng [TKG]. |
| Cửa sổ nhà dân: tivi | Xanh lam nhấp nháy | `#6FA8FF` ↔ `#B4D2FF` | — | Ô cửa, độ sáng đổi ngẫu nhiên mỗi 0.3–1.5 s | |
| Đèn pha xe máy, ô tô | Halogen ấm hoặc LED trắng | Halogen `#FFF1D0`, LED `#F4F8FF` | alpha giảm theo khoảng cách | **Hình quạt (cốt) chiếu xuống mặt đường phía trước** | Chỉ bật trong 18:00–06:00 hoặc khi thời tiết xấu [30]. |
| Đèn hậu | Đỏ | `#FF2A1A` @ 0.6 | `#FF0000` @ 0.15 | Điểm nhỏ r 3–5 px | |
| Đèn phanh | Đỏ sáng hơn | `#FF4A30` @ 1.0 | r 8 px | | Sáng khi xe giảm tốc (ùn tắc tạo ra "dải đỏ" ở chỗ tắc). |
| Xe buýt | Nội thất tuýp trắng sáng, dải cửa sổ phát sáng | `#E6F4FF` | `#CFE6FF` | Hình chữ nhật dọc thân xe | Buýt Hà Nội sơn đỏ hoặc vàng. Buýt điện sơn xanh lá. |

### 4.5 Nhà dân tắt đèn khi nào

**Không có nguồn thống kê** về giờ đi ngủ của người Hà Nội. Mốc **22–23h** chỉ là **khuyến nghị của bác sĩ**, không phải dữ liệu hành vi [33] [BÁO]. Báo chí có nhiều trường hợp người trẻ thức đến 1–4h sáng [33b] [BÁO]. Tỉ lệ cửa sổ sáng đề xuất [TKG]:

| Giờ | % cửa sổ sáng | Trong đó % là ánh tivi |
|---|---|---|
| Hoàng hôn → 19:00 | 55% | 15% |
| 19–21 | 75% | 35% (giờ thời sự 19h và phim truyền hình) |
| 21–22 | 65% | 35% |
| 22–23 | 40% | 25% |
| 23–24 | 18% | 10% |
| 00–02 | 7% | 3% |
| 02–04:30 | 3% | 0% |
| 04:30–06 | 15% (người dậy sớm đi tập, nấu xôi, phở) | 0% |

Tắt đèn theo **từng cửa sổ có seed** (`offAt = 22 + hash*2.5`), không tắt đồng loạt. Tầng trệt mặt phố là cửa hàng, nên đi theo lịch quán, không theo lịch nhà dân.

### 4.6 Kỹ thuật cho pixel art isometric 2:1

**Hiện trạng engine** (`src/world/world.js`, khoảng dòng 1090–1105):
- Màn hình được nhân (`'multiply'`) với màu grade theo `gradeAt(hour)`.
- Sau đó các glow được cộng (`'lighter'`) bằng `glowAt()`.
- `nightAt(h)` đang dùng giờ cố định: tối dần 18 → 20.5, sáng dần 5 → 7.
- `lamps` dùng một màu `255,205,125` (≈ `#FFCD7D`).
- `nightLights` dùng chung một màu `255,176,92` (≈ `#FFB05C`).

Đề xuất nâng cấp, theo thứ tự ưu tiên:

1. **Độ tối theo mặt trời.** Thay `nightAt` cố định bằng hàm của `sunrise(doy)` và `sunset(doy)`. Ví dụ:
   - `night = ss(sunset - 0.25, sunset + 0.75, h)`.
   - Đối xứng ở bình minh: `1 - ss(sunrise - 0.75, sunrise + 0.25, h)`.
   - Giờ mặt trời nội suy từ bảng ở mục 4.7.
2. **Màu theo loại đèn.** Thêm trường `kind` cho `nightLights`, ví dụ `{kind:'pho'|'tea'|'cstore'|'clothes'|'sodium'|'led'|...}`. Tra màu ở bảng 4.4 thay cho màu chung `255,176,92`.
3. **Lightmap riêng**, áp dụng nếu cần "vùng được chiếu sáng giữ đúng màu vật":
   - Tạo canvas lightmap độ phân giải **1/2 hoặc 1/4** màn hình.
   - Mỗi frame, `fillRect` lightmap bằng **màu ambient đêm** (ví dụ `#1B2242` lúc 22h).
   - Vẽ các nguồn sáng lên lightmap bằng `globalCompositeOperation='lighter'`.
   - Phủ lightmap lên cảnh bằng `'multiply'`, với `imageSmoothingEnabled=false` khi phóng lên để giữ pixel.
   - Cuối cùng, thêm một lượt **glow** mờ (alpha 0.15–0.3) bằng `'screen'` hoặc `'lighter'`, chỉ cho bản thân bóng đèn, biển hiệu và cửa sổ, để tạo hiệu ứng bloom.
4. **Giữ chất pixel.**
   - Gradient sáng nên **lượng tử hoá thành 3–4 dải** (ví dụ alpha 1.0 / 0.6 / 0.3 / 0.1 với bán kính 0.35r / 0.6r / 0.85r / r).
   - Hoặc dùng **Bayer dither 4×4** ở mép quầng.
   - Bake trước thành sprite ở `OffscreenCanvas` theo cặp `(kind, r)` rồi cache lại, **không** gọi `createRadialGradient` mỗi frame.
5. **Quầng sáng trên mặt đất phải dẹt 2:1.** Ở hình chiếu iso 2:1, vòng sáng trên mặt đất là **elip rộng 2r, cao r**. Glow ở bóng đèn (trên cao, `z`) thì giữ hình tròn.
6. **Hình quạt đèn pha** (cốt chiếu gần):
   - Trong toạ độ thế giới, quạt có góc mở khoảng **40–50°** và dài khoảng **3–4 ô** phía trước xe. Sáng nhất ở khoảng 0.3 chiều dài, mờ dần về đầu xa. Mép trên phẳng (đèn cốt có đường cắt nên không hắt lên cao).
   - Chiếu sang màn hình: `sx = (wx - wy)·(TW/2)`, `sy = (wx + wy)·(TH/2)`. Tức là quạt bị **ép dọc ×0.5**.
   - **Precache 8 hướng iso** (N, NE, E, SE, S, SW, W, NW). Mỗi hướng là một sprite quạt, có 3 dải lượng tử. Vẽ sprite với `'lighter'`, gốc quạt đặt ở mũi xe.
   - Xe máy dùng quạt hẹp (góc khoảng 35°, dài 2.5 ô, alpha 0.45). Ô tô dùng 2 quạt chồng nhau (góc khoảng 50°, dài 4 ô, alpha 0.55).
   - Thêm một **điểm chói** r = 3 px ở bóng đèn và một **vệt phản chiếu** trên mặt đường ướt khi mưa: alpha ×1.5, kéo dài thêm 1 ô.
7. **Đèn hậu và đèn phanh:** điểm đỏ r 3 px khi chạy, r 6 px kèm alpha 1.0 khi xe giảm tốc. Ở nút tắc (mục 5.3), dải đèn phanh đỏ dài là dấu hiệu thị giác của ùn tắc.
8. **Phản chiếu trên mặt hồ:** với các nguồn sáng trong vùng 2 ô sát bờ, vẽ thêm một bản lật dọc, kéo dài ×2.5, alpha 0.35, lệch ngang theo `sin(t·2 + y)` khoảng 1–2 px để mặt nước gợn.

**Đường cong cường độ theo giờ** (nhân vào alpha của từng loại đèn) [TKG]:

| Giai đoạn | Mốc | Ambient (multiply) | Đèn đường | Quán, biển hiệu | Cửa sổ | Ghi chú |
|---|---|---|---|---|---|---|
| Hoàng hôn | sunset − 0:15 → sunset + 0:15 | `#FFB98A` → `#C9A0B8` | 0 → 0.3 | 0.3 | 0.2 | Ánh cam hồng phủ toàn cảnh. |
| Giờ xanh | sunset + 0:15 → + 0:45 | `#6F78B0` → `#3A4A8C` | 0.6 | 0.7 | 0.5 | Thời điểm đèn quán "nổi" đẹp nhất. |
| Tối sớm | → 22:00 | `#232C5A` | 1.0 | 1.0 | 0.75 | |
| Khuya | 22:00 → 24:00 | `#1B2242` | 1.0 → 0.67 (saving) | 0.6 → 0.3 | 0.4 → 0.18 | Trang trí tắt lúc 22:00/23:00. |
| Đêm sâu | 00:00 → 04:30 | `#141A33` | 0.67 → 0.5 | 0.08 (chỉ quán ghim và tiện lợi) | 0.05 | |
| Rạng đông | sunrise − 0:45 → sunrise | `#3A4A8C` → `#9AA6D0` | 0.5 → 0 | 0.4 (phở, xôi) | 0.15 | Người tập ra hồ dưới đèn đường. |
| Ngày | sunrise + 0:15 → sunset − 0:15 | trắng | 0 | 0 (riêng tiện lợi 0.15) | 0 | |

### 4.7 Bảng giờ mặt trời Hà Nội (để nội suy)

| Mốc | Bình minh | Hoàng hôn | Nguồn |
|---|---|---|---|
| Giữa tháng 1 | khoảng 6:34 (muộn nhất trong năm, 16/1) | khoảng 17:35 (ước lượng) | [31] |
| Đầu tháng 6 | khoảng 5:13 (sớm nhất) | khoảng 18:36 (đo ngày 8/6) | [31] |
| Đầu tháng 7 | khoảng 5:17 (ước lượng) | **khoảng 18:43** (muộn nhất, 4/7) | [31] |
| 15/9 | 5:43 | 17:59 | [31] |
| 15/10 | 5:51 | 17:32 | [31] |
| 27/11 | khoảng 6:13 (ước lượng) | **khoảng 17:15** (sớm nhất) | [31] |
| 15/12 | 6:24 | 17:19 | [31] |

---

## 5. Đề xuất cho game: bảng tham số (dán thẳng vào code)

### 5.1 Mật độ theo giờ

```js
// docs/STREET_LIFE.md §5 — mọi giá trị [TKG], neo theo nguồn ở §1–§4. Nội suy tuyến tính theo state.hour (float).
export const DENSITY_KEYS = [
//  h,   moto, car,  bus,  pedOld, pedLake
  [ 0,   0.12, 0.06, 0,    0.12,   0.10 ],
  [ 2,   0.04, 0.02, 0,    0.04,   0.03 ],
  [ 4,   0.08, 0.03, 0,    0.10,   0.25 ],
  [ 5,   0.20, 0.06, 0.20, 0.25,   0.70 ],
  [ 6,   0.50, 0.22, 0.70, 0.45,   1.00 ],
  [ 7.5, 1.00, 0.80, 1.00, 0.55,   0.75 ],   // cao điểm sáng 6:30–8:30 [4]
  [ 8.5, 0.80, 0.75, 0.90, 0.45,   0.30 ],
  [ 10,  0.55, 0.60, 0.60, 0.50,   0.45 ],
  [ 12,  0.70, 0.60, 0.60, 0.65,   0.40 ],
  [ 13.5,0.45, 0.50, 0.50, 0.30,   0.25 ],
  [ 15,  0.55, 0.60, 0.60, 0.40,   0.30 ],
  [ 17.5,1.00, 0.95, 1.00, 0.65,   0.60 ],   // cao điểm chiều 16:30–18:30 [4]
  [ 18.5,0.90, 0.85, 0.90, 0.75,   0.85 ],
  [ 20,  0.70, 0.55, 0.60, 0.90,   0.90 ],
  [ 21.5,0.50, 0.40, 0.40, 0.70,   0.70 ],
  [ 22.5,0.35, 0.25, 0.10, 0.50,   0.45 ],   // buýt cuối ~22:30 [24]
  [ 23.5,0.20, 0.12, 0,    0.30,   0.25 ],
  [ 24,  0.12, 0.06, 0,    0.12,   0.10 ],
]
export const WEEKEND = {
  walkingStreet: { fromDow: 5, fromHour: 19, toDow: 0, toHour: 24 },   // [1][2]: T6 19h → CN 24h, liên tục
  closedStreets: ['Dinh Tien Hoang','Le Lai','Le Thach','Dinh Le','Nguyen Xi','Trang Tien','Hang Khay',
                  'Pho Ho Hoan Kiem','Lo Su','Hang Dau','Tran Nguyen Han','Luong Van Can','Bao Khanh','Hang Bai'],
  halfClosed: { 'Le Thai To': 'lakeSide' },                             // [3]
  pedLakeMul: 1.6,      // 19–23h khi phố đi bộ mở
  detourMul: 1.3,       // xe dồn sang phố bao quanh
  morningCommuteMul: 0.6, // T7/CN 7–9h không có cao điểm đi làm
  overrides: [ /* {from:'2026-04-30T19:00', to:'2026-05-04T24:00', mode:'extend'}, {..., mode:'pause'} */ ],
}
export const NO_COACH_WINDOWS = [[6.5, 8.5], [16.5, 18.5]]              // cấm ô tô >16 chỗ trừ buýt [4][5]
export const HEADLIGHTS = (h, wx) => h >= 18 || h < 6 || wx.rain > 0.2 || wx.fog > 0.2   // [30]
```

### 5.2 Tỉ lệ quán mở

```js
// p(mở) theo keyframe giờ; mỗi quán: open = hash(shop.seed) < lerp(OPEN[kind], hour)
export const OPEN = {
  //            0     3     5     6     8     10    12    14    16    18    20    22    23
  pho:      [0.05, 0.06, 0.35, 0.90, 1.00, 0.70, 0.45, 0.15, 0.35, 0.85, 0.80, 0.40, 0.15],
  banhmi:   [0.08, 0.03, 0.30, 0.80, 0.90, 0.50, 0.40, 0.30, 0.40, 0.60, 0.60, 0.40, 0.25],
  xoi:      [0,    0,    0.50, 1.00, 0.80, 0.10, 0,    0,    0,    0,    0,    0,    0   ],
  trachanh: [0.05, 0,    0,    0,    0.05, 0.15, 0.25, 0.40, 0.60, 0.90, 1.00, 0.70, 0.35],
  caphe:    [0.03, 0,    0.10, 0.45, 0.90, 0.95, 0.90, 0.85, 0.90, 0.95, 0.95, 0.60, 0.25],
  biahoi:   [0.15, 0,    0,    0,    0,    0.30, 0.80, 0.40, 0.60, 0.95, 1.00, 0.80, 0.50],
  taphoa:   [0,    0,    0.10, 0.50, 0.90, 0.95, 0.90, 0.85, 0.90, 0.95, 0.90, 0.50, 0.15],
  kiosk:    [0,    0,    0.20, 0.70, 0.90, 0.95, 0.90, 0.90, 0.90, 0.85, 0.60, 0.10, 0   ],
  quanao:   [0,    0,    0,    0,    0.20, 0.90, 0.90, 0.95, 1.00, 1.00, 0.95, 0.30, 0.05],
  combinh:  [0,    0,    0,    0,    0.05, 0.50, 1.00, 0.20, 0.30, 0.40, 0.20, 0,    0   ],
  trada:    [0,    0,    0.05, 0.30, 0.70, 0.80, 0.80, 0.80, 0.80, 0.70, 0.60, 0.20, 0.05],
  cstore:   [1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1,    1   ],  // Circle K 24/7 [21]
}
export const OPEN_HOURS = [0, 3, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23]
export const WEEKEND_LATE = { kinds: ['trachanh','caphe','biahoi','quanao'], mul22: 1.3, mul23: 1.3 }
// Quán ghim — đảm bảo ≥2 chỗ ăn mọi giờ (§3.3). Giờ đóng < giờ mở nghĩa là qua đêm.
export const PINNED_FOOD = [
  { id: 'pho_dem',       kind: 'pho',    open: 18, close: 3  },   // kiểu Phở Huy [15]
  { id: 'pho_ganh',      kind: 'pho',    open: 3,  close: 10 },   // kiểu phở gánh Hàng Chiếu [15]
  { id: 'circle_k',      kind: 'cstore', open: 0,  close: 24 },   // [21]
  { id: 'banh_mi_khuya', kind: 'banhmi', open: 20, close: 4  },   // [QS]
]
```

### 5.3 Sự kiện theo giờ và nơi

| Sự kiện | Khi nào | Ở đâu (trong map) | Cơ chế | Nguồn neo |
|---|---|---|---|---|
| Tắc cao điểm sáng | Ngày thường 7:00–8:30 | Các trục ven phố cổ, nút giao lớn quanh hồ (Hàng Bài × Tràng Tiền, Trần Hưng Đạo) | Tốc độ xe ×0.35, xe dồn hàng, bật dải đèn phanh, còi | [4][6] |
| Tắc cao điểm chiều | Ngày thường 16:30–18:30 | Như trên, và cổng trường | Tốc độ ×0.3. Trùng giờ hoàng hôn mùa đông, nên **đèn pha và đèn phanh** là cảnh đẹp nhất. | [4][31] |
| Ùn ở cổng trường | 7:00–7:30, 16:45–17:30 | Trước cổng trường trong map | Xe máy phụ huynh đỗ chiếm 2/3 lòng đường trong 20 phút | [25] |
| Tắc phố cổ buổi tối | 19:00–21:30, cuối tuần ×1.5 | Hàng Mã, Hàng Gà, Hàng Chiếu, Phùng Hưng, đầu chợ đêm Hàng Đào | Người đi bộ tràn xuống lòng đường, xe máy đi bằng tốc độ người đi bộ | [22][32] |
| Đóng phố đi bộ | Thứ Sáu 19:00 → Chủ nhật 24:00 | 16 phố, nửa Lê Thái Tổ phía hồ | Rào chắn, cảnh sát phân luồng, despawn xe | [1][3] |
| Nhóm tập thể dục | 4:30–8:00, đỉnh 5:30–7:30 | Vòng hồ (đi bộ, chạy), tượng Lý Thái Tổ (aerobic), bờ Đông (cầu lông, đá cầu), bãi cỏ (thái cực, dưỡng sinh) | Spawn theo cụm: aerobic 20–60 NPC kèm loa, thái cực 6–15, cầu lông theo cặp | [8][9][10][11][12] |
| Aerobic tối cuối tuần | Thứ Sáu–Chủ nhật, 19:30–21:30 | Phố đi bộ | Một cụm 15–40 NPC | [12b] |
| Hàng rong | 6–10h, 15–19h | Vòng hồ, đầu ngõ | Gánh hoặc xe đạp đi chậm, dừng bán 30–90 s. 10% xác suất "bỏ chạy" khi có trật tự đô thị đi qua | [11][18] |
| Cặp đôi ven hồ | 18:30–23:00 (đỉnh 20–22h) | Ghế đá bờ Tây, cầu Thê Húc, gốc cây sát mép nước | Ngồi ghế 5–20 phút game, đứng chụp ảnh ở cầu | [11] |
| Biểu diễn đường phố | Thứ Sáu–Chủ nhật, 19:00–23:00 | Lý Thái Tổ, Đông Kinh Nghĩa Thục, Hàng Khay | Vòng tròn khán giả 10–30 NPC | [3b] |
| Bia hơi đông | 11–13h, 17–24h. Tạ Hiện đến khoảng 1h | Vỉa hè, phố nhậu | Ghế nhựa tràn ra lòng đường, tiếng ồn | [19] |
| Phở gánh mở hàng | 3:00 | Ngõ trong phố cổ | Một gánh, đèn tuýp nhỏ, hơi nước bốc lên. NPC ăn đêm kéo đến | [15] |
| Tắt trang trí | 22:00 (thường), 23:00 (thứ Bảy, Chủ nhật, trung tâm) | Toàn map | Biển LED và đèn dây tắt dần theo seed trong 10 phút | [26][26b] |
| Giảm đèn đường | 23:00 | Toàn map | Tắt các cột `lampIndex % 3 == 2`. Công viên tắt hết (profile saving) | [26] |
| Trung thu / Tết | Theo lịch âm | Hàng Mã | Đèn lồng ×2, người đi bộ ×1.8 vào buổi tối, phố cấm xe | [32] |
| Cầu cạn "Dải lụa ký ức" | 8/10 → 2/12/2026 | Ven hồ | Prop tạm thời kèm LED dải | [28b] |

### 5.4 Ánh sáng: bảng tra màu

```js
// Màu lõi/quầng xấp xỉ theo nhiệt độ màu [TKG] (§4.4). a = alpha gốc trước khi nhân đường cong giờ.
export const LIGHT_KIND = {
  sodium:   { core: '#FFC27A', halo: '#FF932C', r: 70, a: 0.55, desat: 0.6 },
  led:      { core: '#FFF4E6', halo: '#FFD1A3', r: 56, a: 0.60 },
  lakePost: { core: '#FFE0B0', halo: '#FFA957', r: 46, a: 0.60 },
  pho:      { core: '#E8FFF6', halo: '#BFEFFF', r: 44, a: 0.65 },
  biahoi:   { core: '#F2FFF0', halo: '#FFF1C8', r: 54, a: 0.65 },
  tea:      { core: '#FFD27A', halo: '#FFB050', r: 10, a: 0.80, string: true, twinkle: 0.15 },
  cstore:   { core: '#F7FBFF', halo: '#DDEBFF', r: 64, a: 0.85 },
  clothes:  { core: '#FFE3B8', halo: '#FFB46B', r: 40, a: 0.60 },
  lantern:  { core: '#FF6A3D', halo: '#FF3D1F', r: 20, a: 0.55 },
  sign:     { colors: ['#FF3B3B','#3BA0FF','#3BFF8A'], r: 18, a: 0.5, chaseHz: 1.5 },
  winWarm:  { core: '#FFC98A' }, winTube: { core: '#EEF6FF' }, winTV: { core: ['#6FA8FF','#B4D2FF'], flicker: [0.3, 1.5] },
  headHalo: { core: '#FFF1D0' }, headLED: { core: '#F4F8FF' }, tail: { core: '#FF2A1A', a: 0.6 }, brake: { core: '#FF4A30', a: 1.0 },
  busInt:   { core: '#E6F4FF', halo: '#CFE6FF' },
}
export const LAKE_SEASON = {                           // [28] chiếu sáng nghệ thuật Hồ Gươm 2026
  spring: '#FF9EC4', summer: ['#E0404A', '#9A5CFF'], autumn: '#FFC24A', winter: '#DDE6F5',
  bridge: '#FF5A3C',  // cầu Thê Húc: giữ đỏ son
}
export const AMBIENT_NIGHT = { dusk: '#C9A0B8', blue: '#3A4A8C', early: '#232C5A', late: '#1B2242', deep: '#141A33' }
export const STREETLIGHT_PROFILE = {
  normal: { on: 'sunset+0:10', full: [null, 23], twoThirds: [23, 2.5], half: [2.5, 'sunrise-0:10'], decorOff: 23, decorOffWeekend: 24 },
  saving: { on: 18.5, full: [18.5, 22.5], twoThirds: [23, 2.5], third: [2.5, 5.25], parkMax: 0.5, parkOff: 23, decorOff: 22, decorOffWeekend: 23 },
}
```

---

## 6. Hạn chế của nghiên cứu

- **Không có số đếm lưu lượng theo giờ** công khai cho phố cổ. Toàn bộ hệ số mật độ là ước lượng, neo vào khung giờ quy định và các mô tả báo chí.
- Bài về aerobic là từ **2005**, bài 4h sáng Hồ Gươm từ **2018**, nhiều review Foody từ **2016–2018**. Cảnh tập thể dục được nhiều nguồn mới (blog 2020–2026) mô tả nhất quán, nhưng chưa có số liệu đếm người.
- File Chỉ thị 06/CT-UBND (2026) không tải được, nên chỉ có đoạn trích từ kết quả tìm kiếm. Chế độ 3 chưa rõ.
- Chưa có nguồn về loại và nhiệt độ màu của đèn cột cổ điển ven hồ, và về kiểu đèn theo loại quán. Phần này là quan sát phổ biến.
- Chưa xác minh tuyến buýt cụ thể nào đi qua phố cổ.
- Chưa có nguồn cụ thể về trò chơi dân gian trên phố đi bộ, và về cảnh cụ già chơi cờ ven Hồ Gươm.

---

## 7. Nguồn

1. Znews — Tạm dừng hoạt động phố đi bộ Hồ Gươm phục vụ bầu cử (nêu lịch thường lệ 19h T6 – 24h CN). https://znews.vn/tam-dung-hoat-dong-pho-di-bo-ho-guom-phuc-vu-bau-cu-post1634489.html
2. Thời báo Tài chính Việt Nam — Điều chỉnh thời gian hoạt động phố đi bộ Hồ Gươm dịp Giỗ Tổ và 30/4–1/5 (2025). https://thoibaotaichinhvietnam.vn/dieu-chinh-thoi-gian-hoat-dong-pho-di-bo-ho-guom-dip-nghi-le-gio-to-hung-vuong-va-304-15-173862.html
3. VTC News — Hà Nội tạm dừng hoạt động phố đi bộ Hoàn Kiếm dịp Tết Nguyên đán 2024 (danh sách 16 phố cấm xe, Lê Thái Tổ nửa phía hồ). https://vtcnews.vn/ha-noi-tam-dung-hoat-dong-pho-di-bo-hoan-kiem-dip-tet-nguyen-dan-2024-ar849724.html
   - 3b. Vietjet Air — Khám phá phố đi bộ Hồ Gươm (điểm biểu diễn: Lý Thái Tổ, Đông Kinh Nghĩa Thục, Hàng Khay; ông đồ dịp Tết). https://www.vietjetair.com/vi/diem-den/kinh-nghiem/kham-pha-pho-di-bo-ho-guom-nen-di-dau-an-gi-ngon
4. Thời báo Tài chính Việt Nam — Từ 1/3 Hà Nội thí điểm hạn chế ô tô trên 16 chỗ trong khu phố cổ (6:30–8:30, 16:30–18:30). https://thoibaotaichinhvietnam.vn/tu-13-ha-noi-thi-diem-han-che-o-to-tren-16-cho-hoat-dong-trong-khu-vuc-pho-co-171486.html
5. LSVN — Hà Nội tiếp tục cấm ô tô trên 16 chỗ vào phố cổ giờ cao điểm. https://lsvn.vn/ha-noi-tiep-tuc-cam-o-to-tren-16-cho-vao-pho-co-trong-gio-cao-diem-a166598.html
6. Báo Văn hóa — Giao thông Hà Nội sáng 26.12: nhiều điểm ùn ứ giờ cao điểm. https://baovanhoa.vn/doi-song/giao-thong-ha-noi-sang-2612-nhieu-diem-un-u-gio-cao-diem-192673.html
7. Diễn đàn Doanh nghiệp — Hà Nội đẩy mạnh lắp trạm sạc, hỗ trợ mua xe máy điện (6,9 triệu xe máy, 1,1 triệu ô tô, 4/2025). https://diendandoanhnghiep.vn/ha-noi-day-manh-lap-dat-tram-sac-ho-tro-tien-mua-xe-may-dien-10165303.html
   - 7b. Vietbao — TPHCM dẫn đầu cả nước về đăng ký mới ô tô, xe máy năm 2025. https://vietbao.vn/tphcm-dan-dau-ca-nuoc-ve-dang-ky-moi-o-to-xe-may-trong-nam-2025-577627.html
   - 7c. Báo Mới — Xe máy xăng chiếm 97% trong Vành đai 1 Hà Nội. https://baomoi.com/xe-may-xang-chiem-97-trong-vanh-dai-1-ha-noi-c55097204.epi
8. VietNamNet (09/01/2018) — Gió rít từng cơn, rộn ràng tập thể dục từ 4h sáng bên Hồ Gươm. https://vietnamnet.vn/gio-rit-tung-con-ron-rang-tap-the-duc-tu-4h-sang-ben-ho-guom-422498.html
9. VnExpress (2005) — Aerobic "vỉa hè". https://vnexpress.net/aerobic-via-he-2033138.html
10. Vietcetera — Hanoi Perspectives: Morning Exercise by the Lake. https://vietcetera.com/en/hanoi-perspectives-morning-exercise-by-the-lake
11. Nomado Travel — Hoàn Kiếm Lake: Hanoi's Sacred Centre, Hour by Hour. https://www.nomadotravel.app/en/attractions/hoan-kiem-lake
12. Local Vietnam — 7 Best Parks in Hanoi (giờ tập 5:30–7:30, thưa dần khoảng 8h). https://localvietnam.com/hanoi/parks-in-hanoi/
   - 12b. Vietnam Tourism — Hồ Hoàn Kiếm: xem gì, phố đi bộ và thời điểm tốt nhất (aerobic tối T6–CN, cầu lông bờ Đông). https://www.vietnamtourism.com/en/hoan-kiem-lake-in-hanoi-what-to-see-the-walking-street-and-the-best-time-to-go
13. CECI — Hoàn Kiếm Lake: world's largest outdoor gym (cầu lông, aerobic, thái cực, chạy bộ). https://ceci.org/en/volunteer-blog/hoan-kiem-lake-worlds-largest-outdoor-gym
   - 13b. Sun Getaways — Morning exercise in Hanoi (múa kiếm, đồ lụa trắng). https://sungetawaystravel.com/morning-exercise-in-hanoi/
14. VnExpress (2021) — Người Hà Nội đổ ra đường tập thể dục. https://vnexpress.net/nguoi-ha-noi-do-ra-duong-tap-the-duc-4363052.html
15. Phở đêm:
   - VietNamNet — Quán phở Hà Nội 30 năm "không ngủ". https://vietnamnet.vn/quan-pho-ha-noi-30-nam-khong-ngu-chi-ban-luc-nua-dem-khach-doi-2-tieng-moi-toi-luot-683505.html
   - Mytour — Top 15 quán phở 24h. https://mytour.vn/vi/blog/bai-viet/top-15-quan-pho-24h-noi-tieng-ha-noi.html
   - Mia — Phở gánh Hà Nội (chuyển sang Chợ Gạo 3:30–10:00). https://mia.vn/cam-nang-du-lich/dac-san-pho-ganh-ha-noi-13921
   - Znews — Hương đêm Hà Nội. https://znews.vn/huong-dem-ha-noi-post1222650.html
16. Giờ quán phở:
   - Mia — Phở Bát Đàn (6–11h, 17–21h30). https://mia.vn/cam-nang-du-lich/pho-bat-dan-pho-gia-truyen-100-nam-tuoi-tai-ha-noi-2638
   - Vinpearl — Quán ăn ngon Hà Nội (Phở Thìn Bờ Hồ 6–13h, 17–22h). https://vinpearl.com/vi/quan-an-ngon-ha-noi
17. Xôi sáng:
   - VietNamNet — 5 hàng quà sáng không nhanh chân là hết (xôi Hàng Hòm 6–9h). https://vietnamnet.vn/5-hang-qua-sang-khong-nhanh-chan-la-het-o-ha-noi-217516.html
   - VnExpress — Quán xôi hai thế hệ. https://vnexpress.net/quan-xoi-hai-the-he-4053482.html
   - 17b. Vietnam Airlines — Ăn sáng Hà Nội (bánh mì, ghế vỉa hè về khuya). https://www.vietnamairlines.com/bh/en/plan-book/travel/travel-guide/an-sang-ha-noi
18. VnExpress — Hàng rong bắt đầu rời Hà Nội (dẹp hàng rong vỉa hè). https://vnexpress.net/hang-rong-bat-dau-roi-ha-noi-2109272.html
19. Znews — Bia hơi "chém gió" vỉa hè Hà thành. https://znews.vn/bia-hoi-chem-gio-via-he-ha-thanh-post779509.html
   - 19b. Foody — Bia Phố Cổ Tạ Hiện (8:00–22:30). https://www.foody.vn/ha-noi/bia-pho-co-ta-hien
20. Trà chanh:
   - VnExpress — Cơn lốc trà chanh ở Hà Nội. https://vnexpress.net/con-loc-tra-chanh-o-ha-noi-2713985.html
   - Foody — Trà chanh Nhà Thờ. https://www.foody.vn/ha-noi/tra-chanh-nha-tho
   - Báo Văn hóa — "Trà chanh vỉa hè": thói quen giản dị của người Hà Nội. https://baovanhoa.vn/doi-song/thoi-quen-gian-di-cua-nguoi-ha-noi-187507.html
21. Cửa hàng tiện lợi:
   - MoMo — Thanh toán MoMo tại Circle K (24/7, kể cả lễ Tết). https://www.momo.vn/thanh-toan-momo-circlek
   - Znews — 7-Eleven và GS25 bắc tiến, Circle K không còn độc quyền ở Hà Nội. https://znews.vn/7-eleven-va-gs25-bac-tien-circle-k-khong-con-doc-quyen-o-ha-noi-post1534623.html
22. Chợ đêm:
   - Vietnam Airlines — Hanoi night market (T6–CN 18:00–24:00). https://www.vietnamairlines.com/au/vi/plan-book/travel/travel-guide/hanoi-night-market
   - Nomado — Chợ đêm Phố cổ Hà Nội. https://www.nomadotravel.app/vi/attractions/hanoi-old-quarter-night-market
23. Kinh tế đêm:
   - VOV — Hà Nội triển khai Nghị quyết phát triển kinh tế ban đêm. https://vov.vn/kinh-te/ha-noi-trien-khai-nghi-quyet-ve-phat-trien-kinh-te-ban-dem-post1315699.vov
   - Báo Văn hóa — Hà Nội tính mở không gian vui chơi 24/24h. https://baovanhoa.vn/du-lich/ha-noi-tinh-mo-khong-gian-vui-choi-2424h-du-khach-se-lam-gi-sau-nua-dem-248176.html
24. VietnamFinance (2018) — Danh sách, lộ trình xe buýt Hà Nội (giờ chạy từng tuyến). https://vietnamfinance.vn/danh-sach-lo-trinh-xe-buyt-ha-noi-2018-d12527.html
   - 24b. Báo Lâm Đồng — Hà Nội kéo dài giờ chạy Metro, mở các tuyến buýt đêm (đang nghiên cứu). https://baolamdong.vn/ha-noi-keo-dai-gio-chay-metro-va-mo-cac-tuyen-buyt-dem-phat-trien-kinh-te-ban-dem-453942.html
25. Giờ học và cổng trường:
   - VnExpress — Tan trường, đường tắc. https://vnexpress.net/tan-truong-duong-tac-2092643.html
   - VnExpress — Trường học gặp khó khi đổi giờ. https://vnexpress.net/truong-hoc-gap-kho-khi-doi-gio-2217201.html
   - Lưu ý: các mốc giờ vào và tan học lấy từ tóm tắt tìm kiếm.
26. Bộ Công Thương (05/6/2023) — Hà Nội thay đổi thời gian chiếu sáng công cộng để tiết kiệm điện. https://moit.gov.vn/tin-tuc/su-dung-nang-luong-tiet-kiem-va-hieu-qua/ha-noi-thay-doi-thoi-gian-chieu-sang-cong-cong-de-tiet-kiem-dien.html
   - 26b. Sở VHTT Hà Nội — Phụ lục Chỉ thị 06/CT-UBND ngày 17/4/2026. File không tải được, chỉ có đoạn trích tìm kiếm. https://sovhtt.hanoi.gov.vn/wp-content/uploads/2026/04/phu-luc-kem-theo-chi-thi-so-06ct-ubnd-ngay-1742026-cua-chu-tich-ubnd-thanh-pho.pdf
   - 26c. Nhân Dân — Phố đi bộ Hồ Gươm thực hiện tiết kiệm điện. https://nhandan.vn/anh-pho-di-bo-ho-guom-thuc-hien-tiet-kiem-dien-post757288.html
   - 26d. Tuổi Trẻ (4/2026) — Nhiều doanh nghiệp tắt bảng quảng cáo khủng theo yêu cầu tiết kiệm điện. https://tuoitre.vn/nhieu-doanh-nghiep-tat-bang-quang-cao-khung-theo-yeu-cau-tiet-kiem-dien-20260423232236997.htm
   - 26e. Thương hiệu & Công luận — Tiết giảm 25% điện năng chiếu sáng công cộng tại Hà Nội. https://thuonghieucongluan.com.vn/ha-noi-tiet-giam-25-dien-nang-chieu-sang-cong-cong-a195384.html
27. Nhân Dân — Xây dựng Hà Nội sáng, xanh, sạch, đẹp (Hapulico, LED thay natri, dim 100/70/50/30%). https://nhandan.vn/ocop/xay-dung-ha-noi-sang-xanh-sach-dep-post378379.html
   - 27b. Việt Nam News (2016) — Hà Nội uses LED in public lighting system. https://vietnamnews.vn/society/295597/ha-noi-uses-led-in-public-lighting-system.html
   - 27c. LEDinside (7/2025) — Vietnam capital pushes for LED public lighting system. https://www.ledinside.com/news/2025/07/vietnam_capital_pushes_for_led_public_lighting_system
28. Tuổi Trẻ News (29/8/2026) — Hoan Kiem Lake's new light display (3.000 LED Signify, 4 lớp, màu theo mùa). https://news.tuoitre.vn/hoan-kiem-lakes-new-light-display-draws-hanoi-visitors-for-nighttime-photos-103260829135956792.htm
   - 28b. Tiền Phong — Cầu cạn hình dải lụa ở hồ Hoàn Kiếm huyền ảo về đêm (8/10 – 2/12/2026). https://tienphong.vn/cau-can-hinh-dai-lua-o-ho-hoan-kiem-huyen-ao-ve-dem-post1883189.tpo
   - 28c. Tiền Phong — Hồ Hoàn Kiếm khoác lên mình "lớp áo" ánh sáng diệu kỳ. https://tienphong.vn/ho-hoan-kiem-khoac-len-minh-lop-ao-anh-sang-dieu-ky-post1872157.tpo
29. Màu đèn natri và LED:
   - Hackaday (10/2024) — The case of the curiously colored streetlights. https://hackaday.com/2024/10/09/fail-of-the-week-the-case-of-the-curiously-colored-streetlights
   - Access Fixtures — LED equivalent for low pressure sodium lamps (LPS 589 nm). https://www.accessfixtures.com/led-equivalent-for-low-pressure-sodium-lamps/
   - B. D. Platt — Streetlights (HPS khoảng 2200K, LED 4000K trở lên). https://briandavidplatt.substack.com/p/streetlights-how-to-save-your-city
30. LuatVietnam — Khung giờ bắt buộc bật đèn xe từ 01/01/2025 (18h → 6h, Luật TTATGT 2024). https://luatvietnam.vn/tin-van-ban-moi/khung-gio-bat-buoc-bat-den-xe-tu-01-01-2025-186-98602-article.html
31. Giờ mặt trời Hà Nội:
   - Sunrisesunset.io — Hanoi sunrise and sunset times 2026. https://sunrisesunset.io/vn/ha-n-i/hanoi/2026/
   - timeanddate — Hanoi. https://timeanddate.com/astronomy/vietnam/hanoi
32. Hàng Mã:
   - Vinpearl — Phố Hàng Mã Hà Nội. https://vinpearl.com/vi/pho-hang-ma-ha-noi
   - VnExpress — Chợ Trung thu ken đặc người (tắc Hàng Gà, Hàng Chiếu buổi tối). https://vnexpress.net/cho-trung-thu-ken-dac-nguoi-3981398.html
33. Giấc ngủ:
   - VnExpress — Người Việt "đói ngủ" (khuyến nghị ngủ 22–23h). https://vnexpress.net/nguoi-viet-doi-ngu-4469890.html
   - 33b. VnExpress — Mất ngủ ở người trẻ. https://vnexpress.net/mat-ngu-o-nguoi-tre-4652309.html
34. Vietcetera — Trà đá: Vietnam's most common drink tells a collective memory. https://vietcetera.com/en/tra-da-vietnams-most-common-drink-tells-a-collective-memory

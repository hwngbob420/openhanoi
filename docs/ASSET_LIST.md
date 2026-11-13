# Danh sách asset cần có (từ layout Codex v1)

Nguồn: `docs/reference/codex_layout_v1.png` (Codex qua Bobdad Hub, 120 credits, 2026-11-13). Đây là **ảnh tham chiếu bố cục**, không phải asset game: không phải lưới pixel chuẩn, không dùng thẳng. Claude đọc danh sách này rồi điều khiển `/pixel-art-studio` dựng từng asset theo ART_BIBLE (iso 2:1, ô 72x36, cosy).

Trạng thái: CÓ = đã có trong `assets/manifest.json` (59 sprite) · THIẾU = cần làm · THÊM = có nhưng cần biến thể.

## Khu vực trong layout
1. **Phố cổ** (góc trái trên): nhà ống dày đặc, dây điện chằng chịt, bồn nước mái.
2. **Hồ + đảo đền** (phải trên): hồ, cầu đỏ, tháp/đền trên đảo, liễu, phượng.
3. **Phố tàu hỏa** (cạnh trái): đường ray giữa hai dãy nhà, tàu.
4. **Chợ** (dưới trái): ô dù, quầy phở, xe bánh mì, ghế nhựa.
5. **Ô Quan Chưởng** (giữa): cổng cổ có tường gạch đỏ.
6. **Ngã tư + trạm xe buýt** (giữa phải/dưới): vạch qua đường, xe buýt, ô tô.
7. **Rìa hiện đại** (phải): toà cao ốc kính, công viên nhỏ.

## Nhà và công trình
| Asset | Trạng thái | Ghi chú |
|---|---|---|
| Nhà ống 4 màu x trước/sau x gương (th_flat_*) | CÓ | lemon, mint, salmon, sky |
| Nhà ống ngói (th_tile_*) | CÓ | |
| Nhà ống 3, 4, 5 tầng với ban công, cây trên ban công | THIẾU | cao hơn, nhiều chi tiết |
| Nhà góc phố (2 mặt) | THIẾU | cho ngã tư |
| Nhà cấp 4 mái ngói thấp (phố tàu) | THIẾU | |
| Bồn nước inox mái, dàn điều hoà, dàn hoa giấy (props mái) | THIẾU | |
| Cổng Ô Quan Chưởng | CÓ | gate_oquanchuong |
| Tường gạch đỏ nối cổng (đoạn thẳng, góc) | THIẾU | |
| Đền/tháp đảo (Tháp Rùa) | THIẾU | |
| Cầu Thê Húc đỏ (đoạn, 2 hướng) | THIẾU | hiện cầu là tile |
| Cao ốc kính hiện đại | THIẾU | 1 toà + 1 biến thể |
| Trạm xe buýt có mái | THIẾU | |

## Cửa hàng, quầy
| Asset | Trạng thái |
|---|---|
| Quầy phở | CÓ (prop_pho_stall) |
| Xe bánh mì | CÓ (prop_banhmi_cart) |
| Bộ bàn cà phê vỉa hè | CÓ (prop_cafe_set) |
| Ô dù chợ | CÓ (prop_umbrella_stall) |
| Xích lô | CÓ (prop_xichlo) |
| Mặt tiền cửa hàng: Phở, Cà phê, Bánh mì, Tạp hóa (biển + mái hiên) | THIẾU: làm dạng "shopfront" ghép vào nhà ống |
| Quầy trái cây, rau (chợ) | THIẾU |
| Ghế nhựa thấp + bàn nhỏ (rời) | THIẾU |
| Biển hiệu thêm (thuốc, in ấn, quần áo, sửa xe) | THIẾU |

## Phương tiện
| Asset | Trạng thái |
|---|---|
| Xe máy 6 màu x 4 hướng | CÓ |
| Xe buýt (vàng-đỏ) x 4 hướng | THIẾU |
| Ô tô (trắng, đỏ, taxi xanh/trắng) x 4 hướng | THIẾU |
| Tàu hỏa (đầu tàu + toa) x 2 hướng | THIẾU (hiện code vẽ) |
| Xe đạp, xe đạp chở hàng, xe ba gác | THIẾU |
| Hàng xe máy đậu | CÓ (prop_moto_row) |

## Cây, đường phố, tiện ích
| Asset | Trạng thái |
|---|---|
| Cây bàng, cây nhỏ (tree_1..3, treeS_1..3) | CÓ |
| Phượng đỏ (hoa) | THIẾU |
| Liễu rủ ven hồ | THIẾU |
| Cột điện + dây (đoạn dây vắt ngang) | THIẾU (có chấm cột, chưa có dây) |
| Đèn đường (cột cong) | THIẾU |
| Thùng rác, ghế đá, bụi cây cắt, hàng rào công viên | THIẾU |
| Cờ/biển (prop_bin_flag, prop_blade_sign) | CÓ |

## Mặt đất (tile)
| Asset | Trạng thái |
|---|---|
| Đường nhựa + vạch vàng, vạch qua đường | một phần |
| Vỉa hè gạch, bó vỉa | một phần |
| Nước hồ (có phản chiếu nhẹ), bờ hồ đá | một phần |
| Đường ray + đá dăm, ga tàu nền | một phần |
| Cỏ công viên, lối đi lát | THIẾU |
| Nền chợ (gạch bẩn, vệt nước) | THIẾU |

## NPC và hiệu ứng (giai đoạn sau)
- Nhân vật chính + người đi bộ, người bán hàng, shipper: W-006/W-004.
- Hiệu ứng: khói phở, hơi nước, lá phượng rơi, đèn đường bật về đêm, bóng tàu: dùng Pixelbolt (`/pixel-art-studio`).

## Thứ tự làm đề xuất
1. Nhân vật chính (idle trước, claude-pxl) vì game đang dùng hình giữ chỗ.
2. Xe buýt, ô tô, tàu: dễ thấy nhất, làm cả phố sống động.
3. Cầu, đảo đền, phượng, liễu: khu hồ đẹp nhất layout.
4. Nhà ống 3-5 tầng + mặt tiền cửa hàng.
5. Props đường phố, rồi hiệu ứng.

Mọi sprite mới đi qua `tools/qa_check.py` (59/59 hiện pass) và quy tắc "chốt dáng tĩnh trước, làm động sau".

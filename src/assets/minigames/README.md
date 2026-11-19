# Sprite mini-game + dáng NPC (art) — SINH TỰ ĐỘNG bởi `node tools/make_minigames.mjs`, đừng sửa tay

Cùng phong cách thế giới: ánh sáng ấm từ trái-trên, bóng ngả teal, viền 1px tối (người: viền mực `#1c1a1f` như NPC; đồ vật: viền tối theo màu kề). Người cùng tỷ lệ NPC thế giới (người 14x26 + viền = 16x28).
Khung logic mini-game 320x180. Nguồn vẽ: `assets/src/minigames/*.js` (lõi Cv của `assets/src/lib/core.js`). Ảnh duyệt: `assets/review/minigames_sheet.png`, `assets/review/minigames_mock.png` (cảnh dựng thử), `assets/review/npc_poses_sheet.png`.

## Cách dùng (đợt sau thay vào code vẽ)
```js
import { getMG, getMGFrames, drawMG, MG_META, mgReady } from '../../assets/minigames/index.js'
drawMG(g, 'cyclo', CX + 4, by + 3, { t: S.crank * 0.4, outfit: env.outfit })   // vẽ đặt ĐIỂM NEO vào (x,y); t (giây) tự chọn khung theo fps; frame: chọn khung cố định; flip: lật ngang
const frames = getMGFrames('ped_0_down')  // luôn là mảng canvas; getMG(tên) trả canvas nếu 1 khung, mảng nếu nhiều khung
```
- Canvas có ngay (rỗng) và tự vẽ khi ảnh giải mã xong; `mgReady` là Promise. Không cần gọi init (tự nạp khi import). Test: `window.__mg`.
- `recolor: outfit` = sprite người chơi vẽ bằng màu khoá (áo `#3a8f8a/#2a6a6c/#6cc1b0`, quần `#3d4c7a/#2b3558`, tóc `#2b2230/#443449`); truyền `outfit = env.outfit` ({top,pants,hair} mã màu) để đổi màu theo trang phục.
- Neo = điểm (x,y) trong sprite đặt vào toạ độ game: người = giữa hai bàn chân; xe = điểm chạm đất giữa; nền lát = góc trên-trái.

## Người đi bộ (dùng chung)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `ped_0_down` | 18x31 | 4 | 7 | (9,29) | Cô bán hàng nón lá — đi hướng down | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_0_up` | 18x31 | 4 | 7 | (9,29) | Cô bán hàng nón lá — đi hướng up | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_0_right` | 18x31 | 4 | 7 | (9,29) | Cô bán hàng nón lá — đi hướng right | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_0_left` | 18x31 | 4 | 7 | (9,29) | Cô bán hàng nón lá — đi hướng left | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_1_down` | 18x31 | 4 | 7 | (9,29) | Anh công sở mũ bảo hiểm — đi hướng down | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_1_up` | 18x31 | 4 | 7 | (9,29) | Anh công sở mũ bảo hiểm — đi hướng up | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_1_right` | 18x31 | 4 | 7 | (9,29) | Anh công sở mũ bảo hiểm — đi hướng right | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_1_left` | 18x31 | 4 | 7 | (9,29) | Anh công sở mũ bảo hiểm — đi hướng left | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_2_down` | 18x31 | 4 | 7 | (9,29) | Cô gái tóc dài — đi hướng down | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_2_up` | 18x31 | 4 | 7 | (9,29) | Cô gái tóc dài — đi hướng up | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_2_right` | 18x31 | 4 | 7 | (9,29) | Cô gái tóc dài — đi hướng right | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_2_left` | 18x31 | 4 | 7 | (9,29) | Cô gái tóc dài — đi hướng left | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_3_down` | 18x31 | 4 | 7 | (9,29) | Cụ ông mũ cối — đi hướng down | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_3_up` | 18x31 | 4 | 7 | (9,29) | Cụ ông mũ cối — đi hướng up | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_3_right` | 18x31 | 4 | 7 | (9,29) | Cụ ông mũ cối — đi hướng right | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_3_left` | 18x31 | 4 | 7 | (9,29) | Cụ ông mũ cối — đi hướng left | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_4_down` | 18x31 | 4 | 7 | (9,29) | Học sinh đeo cặp — đi hướng down | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_4_up` | 18x31 | 4 | 7 | (9,29) | Học sinh đeo cặp — đi hướng up | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_4_right` | 18x31 | 4 | 7 | (9,29) | Học sinh đeo cặp — đi hướng right | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_4_left` | 18x31 | 4 | 7 | (9,29) | Học sinh đeo cặp — đi hướng left | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_5_down` | 18x31 | 4 | 7 | (9,29) | Cụ bà tóc búi — đi hướng down | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_5_up` | 18x31 | 4 | 7 | (9,29) | Cụ bà tóc búi — đi hướng up | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_5_right` | 18x31 | 4 | 7 | (9,29) | Cụ bà tóc búi — đi hướng right | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_5_left` | 18x31 | 4 | 7 | (9,29) | Cụ bà tóc búi — đi hướng left | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_6_down` | 18x31 | 4 | 7 | (9,29) | Thanh niên mũ lưỡi trai — đi hướng down | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_6_up` | 18x31 | 4 | 7 | (9,29) | Thanh niên mũ lưỡi trai — đi hướng up | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_6_right` | 18x31 | 4 | 7 | (9,29) | Thanh niên mũ lưỡi trai — đi hướng right | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_6_left` | 18x31 | 4 | 7 | (9,29) | Thanh niên mũ lưỡi trai — đi hướng left | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_7_down` | 18x31 | 4 | 7 | (9,29) | Khách Tây đi du lịch — đi hướng down | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_7_up` | 18x31 | 4 | 7 | (9,29) | Khách Tây đi du lịch — đi hướng up | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_7_right` | 18x31 | 4 | 7 | (9,29) | Khách Tây đi du lịch — đi hướng right | gfx.person / gfx.npc / npcPed (ship.js) |
| `ped_7_left` | 18x31 | 4 | 7 | (9,29) | Khách Tây đi du lịch — đi hướng left | gfx.person / gfx.npc / npcPed (ship.js) |

## Khách ngồi ghế nhựa (phở, trà chanh)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `cust_0_down` | 18x31 | 2 | 2 | (9,29) | Cô bán hàng nón lá ngồi ghế nhựa đỏ, hướng down; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_0_up` | 18x31 | 2 | 2 | (9,29) | Cô bán hàng nón lá ngồi ghế nhựa đỏ, hướng up; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_0_right` | 18x31 | 2 | 2 | (9,29) | Cô bán hàng nón lá ngồi ghế nhựa đỏ, hướng right; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_0_left` | 18x31 | 2 | 2 | (9,29) | Cô bán hàng nón lá ngồi ghế nhựa đỏ, hướng left; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_1_down` | 18x31 | 2 | 2 | (9,29) | Anh công sở mũ bảo hiểm ngồi ghế nhựa xanh, hướng down; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_1_up` | 18x31 | 2 | 2 | (9,29) | Anh công sở mũ bảo hiểm ngồi ghế nhựa xanh, hướng up; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_1_right` | 18x31 | 2 | 2 | (9,29) | Anh công sở mũ bảo hiểm ngồi ghế nhựa xanh, hướng right; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_1_left` | 18x31 | 2 | 2 | (9,29) | Anh công sở mũ bảo hiểm ngồi ghế nhựa xanh, hướng left; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_2_down` | 18x31 | 2 | 2 | (9,29) | Cô gái tóc dài ngồi ghế nhựa vàng, hướng down; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_2_up` | 18x31 | 2 | 2 | (9,29) | Cô gái tóc dài ngồi ghế nhựa vàng, hướng up; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_2_right` | 18x31 | 2 | 2 | (9,29) | Cô gái tóc dài ngồi ghế nhựa vàng, hướng right; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_2_left` | 18x31 | 2 | 2 | (9,29) | Cô gái tóc dài ngồi ghế nhựa vàng, hướng left; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_3_down` | 18x31 | 2 | 2 | (9,29) | Cụ ông mũ cối ngồi ghế nhựa xanh lá, hướng down; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_3_up` | 18x31 | 2 | 2 | (9,29) | Cụ ông mũ cối ngồi ghế nhựa xanh lá, hướng up; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_3_right` | 18x31 | 2 | 2 | (9,29) | Cụ ông mũ cối ngồi ghế nhựa xanh lá, hướng right; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_3_left` | 18x31 | 2 | 2 | (9,29) | Cụ ông mũ cối ngồi ghế nhựa xanh lá, hướng left; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_4_down` | 18x31 | 2 | 2 | (9,29) | Học sinh đeo cặp ngồi ghế nhựa đỏ, hướng down; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_4_up` | 18x31 | 2 | 2 | (9,29) | Học sinh đeo cặp ngồi ghế nhựa đỏ, hướng up; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_4_right` | 18x31 | 2 | 2 | (9,29) | Học sinh đeo cặp ngồi ghế nhựa đỏ, hướng right; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_4_left` | 18x31 | 2 | 2 | (9,29) | Học sinh đeo cặp ngồi ghế nhựa đỏ, hướng left; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_5_down` | 18x31 | 2 | 2 | (9,29) | Cụ bà tóc búi ngồi ghế nhựa xanh, hướng down; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_5_up` | 18x31 | 2 | 2 | (9,29) | Cụ bà tóc búi ngồi ghế nhựa xanh, hướng up; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_5_right` | 18x31 | 2 | 2 | (9,29) | Cụ bà tóc búi ngồi ghế nhựa xanh, hướng right; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_5_left` | 18x31 | 2 | 2 | (9,29) | Cụ bà tóc búi ngồi ghế nhựa xanh, hướng left; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_6_down` | 18x31 | 2 | 2 | (9,29) | Thanh niên mũ lưỡi trai ngồi ghế nhựa vàng, hướng down; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_6_up` | 18x31 | 2 | 2 | (9,29) | Thanh niên mũ lưỡi trai ngồi ghế nhựa vàng, hướng up; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_6_right` | 18x31 | 2 | 2 | (9,29) | Thanh niên mũ lưỡi trai ngồi ghế nhựa vàng, hướng right; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_6_left` | 18x31 | 2 | 2 | (9,29) | Thanh niên mũ lưỡi trai ngồi ghế nhựa vàng, hướng left; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_7_down` | 18x31 | 2 | 2 | (9,29) | Khách Tây đi du lịch ngồi ghế nhựa xanh lá, hướng down; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_7_up` | 18x31 | 2 | 2 | (9,29) | Khách Tây đi du lịch ngồi ghế nhựa xanh lá, hướng up; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_7_right` | 18x31 | 2 | 2 | (9,29) | Khách Tây đi du lịch ngồi ghế nhựa xanh lá, hướng right; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |
| `cust_7_left` | 18x31 | 2 | 2 | (9,29) | Khách Tây đi du lịch ngồi ghế nhựa xanh lá, hướng left; khung 1 = cầm cốc/uống | pho.js khách (npc ngồi), tc.js person khi khách ngồi |

## Người chơi (đổi màu theo trang phục)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `player_down` | 16x28 | 4 | 8 | (8,26) | Người chơi đi bộ hướng down **[đổi màu trang phục]** | gfx.person(..., env.outfit) |
| `player_up` | 16x28 | 4 | 8 | (8,26) | Người chơi đi bộ hướng up **[đổi màu trang phục]** | gfx.person(..., env.outfit) |
| `player_right` | 16x28 | 4 | 8 | (8,26) | Người chơi đi bộ hướng right **[đổi màu trang phục]** | gfx.person(..., env.outfit) |
| `player_left` | 16x28 | 4 | 8 | (8,26) | Người chơi đi bộ hướng left **[đổi màu trang phục]** | gfx.person(..., env.outfit) |
| `player_carry_down` | 16x31 | 4 | 8 | (8,29) | Bê ghế qua đầu, hướng down. Đặt tc_stool_* sao cho đáy ghế ở hàng y=3 của sprite (tay ở hàng 3–4) **[đổi màu trang phục]** | tc.js person + chair cạnh người |
| `player_carry_up` | 16x31 | 4 | 8 | (8,29) | Bê ghế qua đầu, hướng up. Đặt tc_stool_* sao cho đáy ghế ở hàng y=3 của sprite (tay ở hàng 3–4) **[đổi màu trang phục]** | tc.js person + chair cạnh người |
| `player_carry_right` | 16x31 | 4 | 8 | (8,29) | Bê ghế qua đầu, hướng right. Đặt tc_stool_* sao cho đáy ghế ở hàng y=3 của sprite (tay ở hàng 3–4) **[đổi màu trang phục]** | tc.js person + chair cạnh người |
| `player_carry_left` | 16x31 | 4 | 8 | (8,29) | Bê ghế qua đầu, hướng left. Đặt tc_stool_* sao cho đáy ghế ở hàng y=3 của sprite (tay ở hàng 3–4) **[đổi màu trang phục]** | tc.js person + chair cạnh người |
| `player_serve` | 16x28 | 2 | 4 | (8,26) | Người bán sau quầy: khung 0 đứng, khung 1 hai tay bưng ra **[đổi màu trang phục]** | pho.js person(160,80, arms) |

## Xe cộ nhìn ngang (trà chanh)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `veh_moto_0_r` | 30x36 | 2 | 10 | (15,35) | Xe máy Wave đỏ, chạy sang phải | gfx.scooter (tc.js) |
| `veh_moto_0_l` | 30x36 | 2 | 10 | (15,35) | Xe máy Wave đỏ, chạy sang trái | gfx.scooter (tc.js) |
| `veh_moto_1_r` | 30x36 | 2 | 10 | (15,35) | Xe máy Dream nâu chở người nón lá, chạy sang phải | gfx.scooter (tc.js) |
| `veh_moto_1_l` | 30x36 | 2 | 10 | (15,35) | Xe máy Dream nâu, chạy sang trái | gfx.scooter (tc.js) |
| `veh_moto_2_r` | 30x36 | 2 | 10 | (15,35) | Xe máy Wave xanh, chạy sang phải | gfx.scooter (tc.js) |
| `veh_moto_2_l` | 30x36 | 2 | 10 | (15,35) | Xe máy Wave xanh, chạy sang trái | gfx.scooter (tc.js) |
| `veh_moto_3_r` | 30x36 | 2 | 10 | (15,35) | Xe máy Xe ga trắng, chạy sang phải | gfx.scooter (tc.js) |
| `veh_moto_3_l` | 30x36 | 2 | 10 | (15,35) | Xe máy Xe ga trắng, chạy sang trái | gfx.scooter (tc.js) |
| `veh_car_0_r` | 38x20 | 2 | 10 | (19,19) | Ô tô taxi trắng-xanh, chạy sang phải | gfx.car |
| `veh_car_0_l` | 38x20 | 2 | 10 | (19,19) | Ô tô taxi trắng-xanh, chạy sang trái | gfx.car |
| `veh_car_1_r` | 38x20 | 2 | 10 | (19,19) | Ô tô sedan đỏ, chạy sang phải | gfx.car |
| `veh_car_1_l` | 38x20 | 2 | 10 | (19,19) | Ô tô sedan đỏ, chạy sang trái | gfx.car |
| `veh_car_2_r` | 38x20 | 2 | 10 | (19,19) | Ô tô SUV xanh than, chạy sang phải | gfx.car |
| `veh_car_2_l` | 38x20 | 2 | 10 | (19,19) | Ô tô SUV xanh than, chạy sang trái | gfx.car |
| `veh_bus_r` | 70x32 | 2 | 10 | (35,31) | Xe buýt Hà Nội vàng-đỏ tuyến 09, chạy sang phải | gfx.car (thêm loại xe to) |
| `veh_bus_l` | 70x32 | 2 | 10 | (35,31) | Xe buýt Hà Nội vàng-đỏ, chạy sang trái | gfx.car |

## Xe cộ nhìn từ trên (gác chắn)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `veh_motot_0_down` | 14x26 | 2 | 10 | (7,13) | Xe máy Wave đỏ nhìn từ trên, chạy xuống; neo = tâm xe | gfx.scooter (rail.js) |
| `veh_motot_0_up` | 14x26 | 2 | 10 | (7,13) | Xe máy Wave đỏ nhìn từ trên, chạy lên; neo = tâm xe | gfx.scooter (rail.js) |
| `veh_motot_1_down` | 14x26 | 2 | 10 | (7,13) | Xe máy Dream nâu nhìn từ trên, chạy xuống; neo = tâm xe | gfx.scooter (rail.js) |
| `veh_motot_1_up` | 14x26 | 2 | 10 | (7,13) | Xe máy Dream nâu nhìn từ trên, chạy lên; neo = tâm xe | gfx.scooter (rail.js) |
| `veh_motot_2_down` | 14x26 | 2 | 10 | (7,13) | Xe máy Wave xanh nhìn từ trên, chạy xuống; neo = tâm xe | gfx.scooter (rail.js) |
| `veh_motot_2_up` | 14x26 | 2 | 10 | (7,13) | Xe máy Wave xanh nhìn từ trên, chạy lên; neo = tâm xe | gfx.scooter (rail.js) |
| `veh_motot_3_down` | 14x26 | 2 | 10 | (7,13) | Xe máy Xe ga trắng nhìn từ trên, chạy xuống; neo = tâm xe | gfx.scooter (rail.js) |
| `veh_motot_3_up` | 14x26 | 2 | 10 | (7,13) | Xe máy Xe ga trắng nhìn từ trên, chạy lên; neo = tâm xe | gfx.scooter (rail.js) |
| `veh_cart_0_down` | 18x30 | 2 | 10 | (9,15) | Ô tô taxi trắng-xanh nhìn từ trên, chạy xuống (đầu xe ở dưới); neo = tâm xe | rail.js ô tô khối chữ nhật |
| `veh_cart_0_up` | 18x30 | 2 | 10 | (9,15) | Ô tô taxi trắng-xanh nhìn từ trên, chạy lên; neo = tâm xe | rail.js ô tô khối chữ nhật |
| `veh_cart_1_down` | 18x30 | 2 | 10 | (9,15) | Ô tô sedan đỏ nhìn từ trên, chạy xuống (đầu xe ở dưới); neo = tâm xe | rail.js ô tô khối chữ nhật |
| `veh_cart_1_up` | 18x30 | 2 | 10 | (9,15) | Ô tô sedan đỏ nhìn từ trên, chạy lên; neo = tâm xe | rail.js ô tô khối chữ nhật |
| `veh_cart_2_down` | 18x30 | 2 | 10 | (9,15) | Ô tô SUV xanh than nhìn từ trên, chạy xuống (đầu xe ở dưới); neo = tâm xe | rail.js ô tô khối chữ nhật |
| `veh_cart_2_up` | 18x30 | 2 | 10 | (9,15) | Ô tô SUV xanh than nhìn từ trên, chạy lên; neo = tâm xe | rail.js ô tô khối chữ nhật |

## Món ăn (phở / bánh mì / trà chanh)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `food_pho` | 16x14 | 2 | 3 | (8,13) | Tô phở bò (khói bốc); neo = giữa đáy | gfx.icon(kind) |
| `food_quay` | 16x14 | 1 | 3 | (8,13) | Quẩy giòn; neo = giữa đáy | gfx.icon(kind) |
| `food_tra` | 16x14 | 1 | 3 | (8,13) | Ly trà đá; neo = giữa đáy | gfx.icon(kind) |
| `food_chanh` | 16x14 | 1 | 3 | (8,13) | Cốc trà chanh; neo = giữa đáy | gfx.icon(kind) |
| `food_bm` | 16x14 | 1 | 3 | (8,13) | Bánh mì pate; neo = giữa đáy | gfx.icon(kind) |
| `food_bmtrung` | 16x14 | 1 | 3 | (8,13) | Bánh mì trứng; neo = giữa đáy | gfx.icon(kind) |
| `food_mia` | 16x14 | 1 | 3 | (8,13) | Ly nước mía; neo = giữa đáy | gfx.icon(kind) |

## Xích lô Hồ Gươm (nhìn ngang)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `cyclo` | 64x48 | 4 | 10 | (32,47) | Xích lô có mui che, bánh nan quay, người đạp (màu theo trang phục) + khách Tây; khung 0–3 = một vòng đạp. Đặt chân xe (32,47) xuống mặt đường **[đổi màu trang phục]** | cyclo.js: thùng xe + wheel() + person người đạp + npc khách |
| `cy_turtle_tower` | 34x40 | 1 | - | (17,39) | Tháp Rùa xa trên gò cỏ, cây xanh; neo = giữa đáy (đặt ngang mặt hồ) | cyclo.js lm(400)/lm(3300) Tháp Rùa |
| `cy_ngocson` | 96x34 | 1 | - | (48,33) | Cầu Thê Húc cong đỏ dẫn vào đền Ngọc Sơn mái ngói, cây đa; neo = giữa đáy | cyclo.js lm(1250) + lm(2300) |
| `cy_far_shore` | 160x36 | 1 | - | (0,35) | Bờ hồ bên kia: nhà ống mái ngói, ban công, cây; ghép ngang liền (lặp mỗi 160px); đáy = mép nước | cyclo.js vòng for nhà cổ + cây |
| `cy_water` | 64x52 | 4 | 4 | (0,0) | Mặt hồ xanh lục (Hồ Gươm), sóng lăn tăn + phản chiếu; ghép ngang liền; neo = góc trên-trái | cyclo.js R(... #5f9fb8) + vệt sóng |
| `cy_willow` | 40x54 | 4 | 4 | (20,53) | Cây liễu bên hồ, cành rủ đung đưa 4 khung; neo = gốc cây | gfx.willow |
| `cy_lamp` | 12x46 | 2 | 1 | (6,45) | Cột đèn gang bờ hồ; khung 0 tắt, khung 1 sáng (tối); neo = chân cột | mới |
| `cy_bench` | 24x12 | 1 | - | (12,11) | Ghế đá bờ hồ nhìn ngang; neo = giữa đáy | mới (ghế đá) |
| `cy_bank` | 32x14 | 1 | - | (0,0) | Dải cỏ + kè đá sát mép hồ; ghép ngang liền (32px) | cyclo.js R(... #6aa850) |
| `cy_road` | 32x58 | 1 | - | (0,0) | Vỉa hè lát đá (trên) + đường nhựa có vạch (dưới); ghép ngang liền; neo = góc trên-trái (y=122) | cyclo.js mặt đường + vạch |
| `cy_cloud` | 34x12 | 1 | - | (0,0) | Đám mây trắng ấm | cyclo.js mây |
| `ico_warn` | 8x15 | 2 | 5 | (4,14) | Dấu ! cảnh báo người sắp sang đường (nháy 2 khung); neo = giữa đáy, đặt trên đầu người | cyclo.js dấu ! đỏ |
| `fx_bell` | 16x12 | 2 | 6 | (8,11) | Hiệu ứng chuông "kính coong" (chuông + vòng sóng); neo = giữa đáy | cyclo.js chấm vàng khi rung chuông |

## Gác chắn đường tàu (nhìn từ trên)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `rail_loco_r` | 42x22 | 2 | 8 | (0,21) | Đầu máy tàu Thống Nhất (xanh, sọc kem-vàng, mũi đỏ) chạy sang phải; neo = góc dưới-trái; đặt đáy ở TRACK_Y+9. Loco+2 toa = 130px = TRAIN_LEN | rail.js khối tàu xanh |
| `rail_loco_l` | 42x22 | 2 | 8 | (0,21) | Đầu máy chạy sang trái (lật) | rail.js khối tàu xanh |
| `rail_coach` | 44x22 | 2 | 8 | (0,21) | Toa khách Thống Nhất (cửa sổ, quạt nóc, khung 1 có đèn trong toa); dùng cho cả 2 chiều | rail.js cửa sổ toa |
| `rail_track` | 16x22 | 1 | - | (0,0) | Đường ray ghép ngang (ba-lát, tà vẹt, 2 ray); neo = góc trên-trái, đặt y = TRACK_Y-11 | rail.js vẽ ray + tà vẹt |
| `rail_track_cross` | 16x22 | 1 | - | (0,0) | Đoạn ray qua mặt đường nhựa (chỗ giao cắt x 134..186) | rail.js đoạn giao cắt |
| `rail_signal` | 14x26 | 2 | 4 | (7,25) | Cột tín hiệu: biển chữ X trắng viền đỏ + 2 đèn đỏ nháy luân phiên (khung 0/1); khi không cảnh báo dùng khung 0 và tô tối đèn bằng code hoặc dùng rail_signal_off | rail.js drawBar: cột + đèn |
| `rail_signal_off` | 14x26 | 1 | - | (7,25) | Cột tín hiệu khi không có tàu (đèn tắt) | rail.js drawBar: cột + đèn |
| `rail_boom` | 58x24 | 5 | - | (4,21) | Cần chắn barie + hộp trục: khung 0 dựng lên … khung 4 hạ ngang (dài 50px sang phải). Chọn khung = round(S.bar*4); neo = trục quay (4,21) — đặt vào (px,py) của drawBar | rail.js drawBar (cần chắn) |
| `rail_boom_l` | 58x24 | 5 | - | (53,21) | Cần chắn quay sang trái (lật); neo = trục (53,21) | rail.js drawBar (sx=-1) |
| `rail_house_0` | 60x56 | 1 | - | (0,0) | Nhà ống nhìn từ trên: mái ngói, ban công hoa, biển "PHỞ"; neo = góc trên-trái (thay house(x,y,60,56)) | rail.js house() |
| `rail_house_1` | 60x56 | 1 | - | (0,0) | Nhà ống nhìn từ trên: sân thượng bồn nước inox, dây phơi, ban công hoa, biển "TẠP HÓA"; neo = góc trên-trái (thay house(x,y,60,56)) | rail.js house() |
| `rail_house_2` | 60x56 | 1 | - | (0,0) | Nhà ống nhìn từ trên: sân thượng bồn nước inox, dây phơi, ban công hoa, biển "CÀ PHÊ"; neo = góc trên-trái (thay house(x,y,60,56)) | rail.js house() |
| `rail_house_3` | 60x56 | 1 | - | (0,0) | Nhà ống nhìn từ trên: mái ngói, ban công hoa, biển "SỬA XE"; neo = góc trên-trái (thay house(x,y,60,56)) | rail.js house() |
| `ico_angry` | 11x12 | 2 | 6 | (5,11) | Bong bóng bóp còi giục (tút tút!) trên đầu xe chờ lâu; neo = giữa đáy | rail.js dấu ! đỏ trên xe |

## Shipper ngõ sâu (nhìn từ trên)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `ship_wall_l_0` | 92x40 | 1 | - | (0,0) | Dãy nhà bên TRÁI ngõ (mái ngói/sân thượng + mép tường cửa sổ, cục nóng, chậu hoa); lát dọc liền 40px, mẫu 0 | ship.js wall(0,92,-1) |
| `ship_wall_r_0` | 92x40 | 1 | - | (0,0) | Dãy nhà bên PHẢI ngõ; lát dọc liền 40px, mẫu 0; đặt x=228 | ship.js wall(228,92,1) |
| `ship_wall_l_1` | 92x40 | 1 | - | (0,0) | Dãy nhà bên TRÁI ngõ (mái ngói/sân thượng + mép tường cửa sổ, cục nóng, chậu hoa); lát dọc liền 40px, mẫu 1 | ship.js wall(0,92,-1) |
| `ship_wall_r_1` | 92x40 | 1 | - | (0,0) | Dãy nhà bên PHẢI ngõ; lát dọc liền 40px, mẫu 1; đặt x=228 | ship.js wall(228,92,1) |
| `ship_floor` | 136x48 | 1 | - | (0,0) | Mặt ngõ bê tông: rãnh thoát nước 2 bên, nắp cống, vết nứt; lát dọc liền 48px; đặt x=92 | ship.js mặt ngõ + vạch |
| `ship_wires` | 136x14 | 1 | - | (0,0) | Dây điện chằng chịt vắt ngang ngõ (vẽ trên cùng); đặt x=92, cuộn theo ngõ hoặc cố định | ship.js dây điện |
| `ship_door_l` | 16x32 | 3 | - | (8,31) | Cửa nhà bên trái ngõ + biển số nhà xanh trống (code ghi số trắng 3x5 vào ô x 3..12, y 1..5); khung 0 thường / 1 sáng tới lượt / 2 đã giao | ship.js cửa nhà |
| `ship_door_r` | 16x32 | 3 | - | (8,31) | Cửa nhà bên phải ngõ (như trên) | ship.js cửa nhà |
| `ship_parcel` | 12x12 | 1 | - | (6,11) | Gói hàng thùng các-tông dán băng keo + nhãn; neo = giữa đáy | ship.js parcel |
| `ship_parcel_s` | 8x8 | 1 | - | (4,4) | Gói hàng nhỏ khi ném (tâm) | ship.js gói bay |
| `ship_pot_0` | 14x20 | 1 | - | (7,19) | Chậu cây cảnh (cây lưỡi hổ) | ship.js pot |
| `ship_pot_1` | 14x20 | 1 | - | (7,19) | Chậu hoa giấy hồng | ship.js pot |
| `ship_cat` | 16x12 | 4 | 8 | (8,11) | Mèo cam đi ngang (quay mặt phải; lật để đi trái); neo = giữa đáy | ship.js cat |
| `ship_cart` | 28x26 | 1 | - | (14,25) | Xe đẩy bán hoa quả rong (dưa hấu, chuối, xoài) có ô che; neo = giữa đáy | ship.js cart |
| `ship_rider` | 22x38 | 4 | 12 | (11,37) | Shipper nhìn từ sau: áo khoác theo màu áo trang phục, mũ bảo hiểm, thùng hàng cam. Khung 0–1 chạy thẳng (rung), 2 nghiêng trái, 3 nghiêng phải; neo = bánh sau **[đổi màu trang phục]** | ship.js người chơi trên xe |

## Trà chanh vỉa hè (nhìn từ trên)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `tc_shopfront` | 320x26 | 1 | - | (0,0) | Dãy mặt tiền trên cùng: tiệm điện thoại, quán TRÀ CHANH (biển vàng chữ đỏ, mái hiên xanh-trắng), tạp hoá; neo = (0,0) | tc.js dải nhà xanh + biển |
| `tc_cart` | 26x30 | 1 | - | (13,29) | Quầy/xe nước trà chanh: tủ kính có chanh, bình trà, thùng đá xanh, chồng cốc; neo = giữa đáy | tc.js quầy / xe nước |
| `tc_stool_0` | 12x12 | 1 | - | (6,11) | Ghế nhựa thấp đỏ; neo = giữa đáy | gfx.chair |
| `tc_stool_1` | 12x12 | 1 | - | (6,11) | Ghế nhựa thấp xanh; neo = giữa đáy | gfx.chair |
| `tc_stool_2` | 12x12 | 1 | - | (6,11) | Ghế nhựa thấp vàng; neo = giữa đáy | gfx.chair |
| `tc_stool_3` | 12x12 | 1 | - | (6,11) | Ghế nhựa thấp xanh lá; neo = giữa đáy | gfx.chair |
| `tc_stack` | 14x24 | 1 | - | (7,23) | Chồng ghế nhựa nhiều màu (chỗ lấy ghế); neo = giữa đáy | tc.js chồng ghế |
| `tc_table` | 20x14 | 1 | - | (10,13) | Bàn nhựa thấp xanh dương: 2 cốc trà chanh, đĩa hướng dương; neo = giữa đáy | mới |
| `tc_slot` | 14x8 | 2 | 3 | (7,7) | Ô trống chờ đặt ghế (khung nét đứt nhấp nháy 2 khung) | tc.js khung vàng ô trống |
| `tc_pave` | 16x16 | 1 | - | (0,0) | Gạch lát vỉa hè Hà Nội (gạch đỏ nâu ô vuông, mạch xám); lát liền | tc.js nền vỉa hè |
| `tc_road` | 32x26 | 1 | - | (0,0) | Mặt đường nhựa trơn; lát liền | tc.js mặt đường |
| `tc_road_dash` | 32x26 | 1 | - | (0,0) | Mặt đường nhựa có vạch đứt giữa làn; lát liền | tc.js mặt đường |
| `tc_curb` | 32x4 | 1 | - | (0,0) | Bó vỉa đá (giữa vỉa hè và đường); lát ngang liền | tc.js mép đường |
| `tc_zebra` | 8x4 | 1 | - | (0,0) | Một vạch kẻ đường đi bộ (lát dọc mỗi 8px) | tc.js vạch đi bộ nhạt |

## Quán phở / bánh mì (chính diện)

| tên | cỡ | khung | fps | neo | mô tả | thay cho |
|---|---|---|---|---|---|---|
| `pho_wall` | 320x72 | 1 | - | (0,0) | Tường quán phở: mái hiên sọc đỏ-trắng, biển "PHỞ BÒ GIA TRUYỀN", bảng giá TRỐNG (code ghi tên món + giá thật vào ô x 237..294, y 47..66), kệ gia vị, lịch, đèn treo; neo = (0,0) | pho.js tường + mái hiên + biển (variant pho) |
| `bm_wall` | 320x72 | 1 | - | (0,0) | Tường quán bánh mì: biển "BÁNH MÌ PATE" xanh, bảng giá TRỐNG (code ghi giá thật như pho_wall) | pho.js tường (variant banhmi) |
| `pho_pot` | 42x32 | 3 | 6 | (21,31) | Nồi nước dùng nhôm to trên bếp than, nước sôi sủi bọt + muôi (3 khung); khói dùng vfx pho_steam; neo = giữa đáy | pho.js nồi + hơi |
| `pho_counter` | 320x38 | 1 | - | (0,0) | Quầy gỗ quán phở: tủ bánh phở/thịt bò/hành, rổ quẩy, rổ chanh ớt, chồng bát; đặt y=72 | pho.js quầy gỗ |
| `bm_counter` | 320x38 | 1 | - | (0,0) | Quầy bánh mì: tủ kính bánh mì, pate, chả, rau, trứng; đặt y=72 | pho.js quầy (banhmi) |
| `pho_floor` | 32x70 | 1 | - | (0,0) | Sàn gạch hoa cũ chỗ khách ngồi; lát ngang liền; đặt y=110 | pho.js sàn nâu |
| `pho_table` | 34x16 | 1 | - | (17,15) | Bàn gấp inox thấp: ống đũa, lọ tương ớt, giấy ăn; neo = giữa đáy (đặt trước khách) | pho.js bệ ghế khách |

Ghi chú tên: `ped_<0..7>_<down|up|left|right>` 8 kiểu người (0 cô bán hàng nón lá áo bà ba, 1 anh công sở mũ bảo hiểm, 2 cô gái tóc dài váy, 3 cụ ông mũ cối, 4 học sinh đeo cặp, 5 cụ bà tóc búi, 6 thanh niên mũ lưỡi trai, 7 khách Tây); `cust_<k>_<dir>` cùng người đó ngồi ghế nhựa. Xe: `veh_moto_<0..3>_<r|l>`, `veh_car_<0..2>_<r|l>`, `veh_bus_<r|l>` (nhìn ngang); `veh_motot_<k>_<down|up>`, `veh_cart_<k>_<down|up>` (nhìn từ trên).

## Dáng NPC đời sống phố — `window.__npcPoses` (src/assets/characters/poses.js, đăng ký trong `init()` của characters)

`__npcPoses[tên] = { w, h, anchor, fps, loop, dirs:{hướng:[canvas…]}, frames, desc, look }` — `frames` = hướng `down` (hoặc hướng duy nhất). `__npcPoses.get(tên, hướng, look)` đổi màu theo `look` dạng NPC_LOOK `{sh:[3], pa:[2], ha:[2]}`; `__npcPoses.raw(tên, hướng)` = khung màu khoá gốc để thế giới tự gọi `recolor()` như người đi bộ. `__npcPoses.ready` = Promise.
Thế giới đang vẽ NPC cứng `w:16 h:28, dy = sy - 26`: với dáng cỡ khác, đặt `dx = sx - anchor[0]`, `dy = sy - anchor[1]`. Người thứ hai trong `coupleSit`/`chess` màu cố định (không đổi theo look).

| tên | cỡ | khung | fps | neo | hướng | mô tả |
|---|---|---|---|---|---|---|
| `exercise` | 26x32 | 8 | 4 | (13,30) | down, up, right, left | tập dưỡng sinh bên hồ: hít vào giơ tay lên cao, thở ra hạ tay (8 khung lặp, ~2 giây/vòng) |
| `stretch` | 24x32 | 4 | 2 | (12,30) | down, up, right, left | vươn vai nghiêng lườn đổi bên (4 khung lặp) |
| `jog` | 16x28 | 4 | 10 | (8,26) | down, up, right, left | chạy bộ quanh hồ: băng đô đỏ, áo ba lỗ, quần short; nhún người theo bước (thay khung đi, tốc độ ~2 lần người đi) |
| `coupleSit` | 30x31 | 4 | 1 | (15,29) | down, up, right, left | đôi tình nhân ngồi ghế đá (không kèm ghế: đặt lên p_bench, mông ở hàng y≈25), cô gái tựa vai; anh = màu khoá, cô = váy trắng áo hồng |
| `elderTea` | 18x31 | 4 | 2 | (9,29) | down, up, right, left | cụ ông mũ cối ngồi ghế nhựa thấp xanh uống trà: cầm chén, nâng lên, nhấp (nhắm mắt), hạ xuống |
| `chess` | 40x31 | 4 | 1 | (20,29) | down | hai cụ đánh cờ tướng trên ghế đẩu, nhìn chính diện (chỉ 1 hướng). Khung: 0 suy nghĩ, 1 cụ trái đi quân, 2 quân đã đi, 3 cụ phải gãi cằm. Cụ trái = màu khoá |
| `sitStool` | 18x31 | 4 | 2 | (9,29) | down, up, right, left | ngồi ghế nhựa đỏ thấp uống trà chanh (cốc vàng): cầm cốc, uống, cầm cốc, vẫy tay tán gẫu |

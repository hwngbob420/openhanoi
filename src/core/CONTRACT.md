# HỢP ĐỒNG GIỮA CÁC KHỐI (Studio Lead sở hữu — các Sub-Agent KHÔNG sửa file này, chỉ đề xuất)

**Thứ tự khởi động và quy tắc:** `init()` của khối chạy TRƯỚC khi thế giới tồn tại. Trong `init()` chỉ được đăng ký lắng nghe bus và dựng DOM; chỉ gọi `__worldAPI`/`__gameplay`/`__characters` của khối khác sau sự kiện `world:ready` (hoặc kiểm tra `window.X?.`).

Mỗi khối có thư mục riêng và export `init()` từ `index.js`. `src/main.js` gọi theo thứ tự:
`Characters.init → Audio.init → Gameplay.init → UI.init → World.load/generate → World.start`.
Giao tiếp qua `bus` (src/core/bus.js) và các API dưới đây. Mọi API phải dùng được kể cả khi khối kia chưa có (kiểm tra `window.X?.`).

## Sự kiện (bus.emit / bus.on)
| sự kiện | dữ liệu | ai phát |
|---|---|---|
| `world:ready` | — | world (sau khi World.start) |
| `poi:interact` | `{poi}` | world/player (nhấn E / chạm vào POI) |
| `gps:arrived` | `{target}` | world (người chơi tới đích GPS) |
| `state:changed` | `{key}` | gameplay |
| `outfit:changed` | `{outfit}` | gameplay → characters/world dựng lại sprite |
| `job:accepted` / `job:arrived` / `job:done` / `job:cancelled` | `{job}` | gameplay |
| `minigame:start` / `minigame:end` | `{id}` / `{id,score,pay}` | gameplay |
| `money:earn` / `money:spend` | `{amount,reason}` | gameplay |
| `phone:open` / `phone:close` | — | ui |
| `toast` | `{msg}` | ai cũng được; ui hiển thị |
| `sfx` | `{name}` | ai cũng được; audio phát. Tên: `ting`,`coin`,`pop`,`bell`,`sizzle`,`step`,`error`,`win`,`lose`,`click`,`chair`,`horn` |
| `weather` | `{rain:bool, storm:bool}` | world |
| `train:bell` | `{on:bool}` | world (đoàn tàu tới, barie hạ) |

## API từng khối (global để test từ Playwright)
- **world** — `window.__worldAPI` (src/world/api.js):
  `getPlayer()→{gx,gy}`, `getSites(kind)→[{id,kind,gx,gy,label}]` (kind: `pho`,`tc`,`banhmi`,`xichlo`,`rail`,`hair`,`any`),
  `pathTo(gx,gy)→Promise<[{gx,gy}]|null>` (easystarjs, đi qua cả ngõ), `setGps(target|null)` (vẽ chấm chỉ đường + mũi tên + phát `gps:arrived`),
  `lockPlayer(bool)` (khoá di chuyển khi chơi mini-game), `teleport(gx,gy)`, `getHour()`, `getDay()`, `isNight()`, `isRaining()`,
  `addMarker({id,gx,gy,r,label,onInteract(marker)})→remove()` (điểm tương tác tạm cho việc vặt; hiện nhắc "E / chạm — label"; **marker luôn được ưu tiên hơn POI khám phá** khi cùng tầm, vì POI Chợ phố cổ phủ lên cả hàng p_pho). Marker gỡ bằng hàm `remove()` trả về.
  Sự kiện thêm: `time:newday {day}` (phát khi giờ game qua 0h). `getDay()` bắt đầu từ 1 và world không tự lưu ngày: gameplay gọi `setDay(n)` khi nạp save.
- **characters** — `window.__characters` (src/assets/characters/index.js):
  `OUTFIT_OPTIONS = { hair:[{id,name,color,price}×4], top:[…], pants:[…] }`, `getSprites(outfit)→{up,down,left,right:[canvas×4]}` (16×28, 4 khung đi),
  `renderPortrait(outfit, scale)→canvas` (để UI xem trước), `getSeatedSprites(outfit)` (dáng ngồi xe máy).
- **gameplay** — `window.__gameplay` (src/gameplay/index.js):
  `state`, `earn(n,reason)`, `spend(n,reason)→bool`, `jobs.board()`, `jobs.accept(id)`, `jobs.cancel()`, `buy(kind,index)→bool`, `equip(kind,index)`,
  `eat(dishId)→bool`, `debts.list()`, `debts.pay(id)→bool`, `save()`, `exportSave()→string`, `importSave(str)→bool`, `reset()`,
  `minigames.start(id)→Promise<{score,pay}>`, `minigames.debugFinish(score)` (kết thúc ngay mini-game đang chạy với điểm đó, để QA test không phải đợi 45s; cũng cho `minigames.start(id,{timeScale})`).
- **ui** — `window.__ui`: `openPhone(app?)`, `closePhone()`, `isPhoneOpen()`.
- **audio** — `window.__audio`: `play(name)`, `setRain(on)`, `musicOn(bool)`, `resume()` (cần sau cú chạm đầu tiên vì chính sách trình duyệt).

## Quy tắc thư mục (mỗi file chỉ MỘT chủ)
`src/assets/characters,vfx` → pixel-character-artist · `src/world` → isometric-world-architect · `src/gameplay` → gameplay-economy-designer ·
`src/ui` → smartphone-ui-director · `src/audio` → sound-atmosphere-engineer · `tests`, `dist`, `tools/finish_build.mjs` → qa-bundle-integrator ·
`src/core`, `src/main.js`, `index.html`, `package.json`, `vite.config.js` → Studio Lead.
Cần sửa file của người khác → ghi đề xuất vào `docs/REQUESTS.md` (một dòng: ai cần gì ở đâu), KHÔNG tự sửa.

## Quy tắc làm việc song song
- KHÔNG `npm install` (thư viện cần dùng thì chép từ `~/.claude/hanoi-game-refs/*` vào `vendor/` của khối mình). KHÔNG `git commit`. Chỉ QA chạy `npm run build` hoặc đụng `dist/`.
- Mỗi khối test trên cổng RIÊNG của mình bằng `npx vite --port <cổng>` (world 8801, characters 8802, gameplay 8803, ui 8804, audio 8805, qa 8806); không dùng 8790.
- Chụp ảnh bằng script node dùng gói `playwright` đã cài (chromium headless), rồi mở PNG bằng công cụ đọc ảnh. Khối khác đang sửa file nên trang có thể tải lại giữa chừng: lỗi lạ ngoài khối mình thì chờ vài chục giây và thử lại rồi mới ghi vào `docs/REQUESTS.md`.

---
# ĐỢT 3 (0.10.0) — API mới. Mọi khối PHẢI dùng đúng tên này; khối kia chưa xong thì kiểm `window.__worldAPI?.fn?.`

## world (`__worldAPI`) bổ sung — chủ: isometric-world-architect
- `getZoom()→số` (cam.zoom hiện tại, 1..5). `worldToScreen(gx,gy)→{x,y}` toạ độ CSS px trên màn hình (đã tính camera+zoom; lấy chân ô). `getViewport()→{w,h}`.
- `getNpcs()→[{id,gx,gy,dir,kind:'ped'|'sitter',look}]` (người đi bộ/ngồi quán đang tồn tại gần khung hình; tối đa ~60). `getVehicles()→[{id,kind,gx,gy,dir}]`.
- `getTrain()→{active:bool,gx,gy}` (đầu tàu `loco`, active khi tàu đang trong bản đồ) và `getBarrier()→{gx,gy,down:bool}`.
- `getZoneAt(gx,gy)→'lake'|'alley'|'pho'|'rail'|'street'` (khu vực để âm thanh/bong bóng chọn nội dung).
- `autoWalk(target|{gx,gy}, opts?)→Promise<'arrived'|'cancelled'|'nopath'>`, `stopAutoWalk()`, `isAutoWalking()`. Tìm đường easystarjs men vỉa hè, vạch sang đường, cửa ngõ; nhân vật đi như đang bấm phím. Phát `autowalk:start {target}` / `autowalk:stop {reason:'arrived'|'manual'|'nopath'|'cancelled'}`. Chạm WASD/mũi tên/chạm màn hình để di chuyển → lập tức `stop(reason:'manual')`.
- `setGps(target)` vẫn giữ nhưng KHÔNG còn vẽ đường chấm dài: thay bằng VÒNG LA BÀN nhỏ dưới chân nhân vật xoay chỉ hướng mục tiêu + chữ khoảng cách mét (1 ô ≈ 1 m… dùng 1 ô = 2 m cho dễ hiểu; ghi rõ). Đích vẫn có vòng sáng. `getGpsInfo()→{target,distM,angle}|null`.
- Sự kiện thêm: `traffic:cut {kind}` (xe/tàu suýt đụng nhân vật, tạt đầu), `npc:pass {a,b}` (2 NPC đi lướt gần nhau) — tuỳ chọn, phát tối đa 1 lần / 3 giây.

## audio — chủ: sound-atmosphere-engineer
- Công thức không gian: khoảng cách isometric d = hypot(dx,dy) tính theo ô; gain = clamp(1-(d-r0)/(r1-r0),0,1)^1.5 với r0=2, r1=8 (tàu/chuông barie); pan = clamp((dx-dy)/ (r1*1.4), -1, 1) (trục ngang màn hình isometric là gx-gy), qua `StereoPannerNode`.
- `__audio.setListener(gx,gy)` (audio tự đọc `__worldAPI.getPlayer()` mỗi ~100ms nếu chưa ai gọi), `__audio.playAt(name, gx, gy, opts?)`, `__audio.debugSpatial()→{train:{gain,pan,d},bell:{...},zone:'...',layers:[...]}` để QA kiểm bằng số.
- Tên `sfx` thêm: `kinhcoong` (chuông xích lô "kính coong"). `sfx` nay nhận thêm `{name,gx,gy}` tuỳ chọn → phát có vị trí.
- Âm khu vực (tự bật/tắt theo `getZoneAt` của nhân vật, trộn mượt 0.5s): hàng phở (dao thớt + nồi nước dùng sôi), Hồ Gươm (gió hồ), ngõ sâu (radio cũ lẫn tạp âm + chó sủa khe khẽ thưa thớt), đường ray (chỉ khi tàu/chuông).

## gameplay — chủ: gameplay-economy-designer
- `src/gameplay/economy-config.js` = NGUỒN SỰ THẬT DUY NHẤT cho giá món (`DISHES`, `fmtVND`), phạt, ngưỡng thể lực từng việc. `balance.js` chỉ import lại từ đây. Lộ ra `__gameplay.config`. UI/tin nhắn/marker/trừ tiền đều đọc từ đây.
- Nhận việc thiếu thể lực → thông báo nổi lớn đúng nguyên văn: `Thể lực quá thấp — hãy ăn phở hoặc uống trà chanh để hồi sức!` (cũng phát `toast`).
- Xích lô: người đi bộ cảnh báo `!`, Space = `sfx kinhcoong` + bong bóng xanh `Mời bác đi trước!`; không rung chuông → người đi bộ vẫn qua, xe phải phanh chờ; đâm → huỷ chuyến + trừ 30.000đ (`spend(30000,'bồi thường')`, có thể làm tiền âm? KHÔNG: nếu thiếu tiền thì về 0 và nợ phần còn lại vào Sổ Nợ — hoặc đơn giản trừ tới 0, ghi rõ).
- `__gameplay.minigames.debugFinish` giữ nguyên; thêm `minigames.debug()→{id,state}` cho QA đọc trạng thái xích lô (số người đi bộ, đã nhường chưa).

## ui — chủ: smartphone-ui-director
- Thư mục mới `src/ui/bubbles/`: lớp overlay màn hình HiDPI (canvas riêng `devicePixelRatio`, KHÔNG vẽ vào canvas pixel của world, `pointer-events:none`, z-index dưới điện thoại), font Pixelify Sans nhúng base64 (nguồn `~/.claude/hanoi-game-refs/fonts/PixelifySans.ttf`, OFL, ghi nguồn), `tracery` chép từ `~/.claude/hanoi-game-refs/tracery/js/tracery/` vào `src/ui/bubbles/vendor/`.
- Chỉ bung chữ khi `getZoom()>=3` (PC) — trên di động cam.zoom=1 nên dùng ngưỡng riêng: `>=3` hoặc `innerWidth<700 && zoom>=1` kèm nút zoom (UI được thêm nút +/− zoom gọi `__worldAPI.setZoom?.(z)` — world sẽ cung cấp `setZoom(z)`); dưới ngưỡng chỉ chấm nhỏ.
- 6 loại: rao hàng (theo `getHour()` sáng/trưa/tối), đối đáp 2 chiều (`npc:pass`, ngồi quán trà chanh), suy nghĩ theo thời tiết (`weather`, hoàng hôn), trầm trồ (`outfit:changed` rồi NPC gần nhìn), giao thông (`traffic:cut`, `sfx bell/kinhcoong/horn`), thanh âm môi trường nổi ("Xình xịch...","Kính coong~","Gâu gâu!"). Mỗi loại có màu viền riêng. Ngắt dòng, co theo chữ, tự lật khi sát mép. `window.__bubbles = {say(npcId|{gx,gy}, text, type), debug()→{visible:[{type,text,x,y}], zoomGate:bool}}`.
- Nút `Tự động đi tới (Auto-Walk)` trong thẻ việc đang nhận (Việc Vặt) và trong điểm check-in (Phố Thị Gram): gọi `__worldAPI.autoWalk(target)`, đóng điện thoại, nút đổi thành `Dừng` khi đang đi; nghe `autowalk:start/stop`.

---
# ĐỢT 4 (0.11.0) — Giám đốc duyệt: mục 1 (âm vỡ), 6 (cân bằng), 7 (ngày chậm), 10 (vẽ lại mini-game), 5 (rà soát TOÀN BỘ chữ) + 7 mục mới (va chạm vật nhỏ, đời sống phố theo giờ, ánh sáng thật, vòng chân gọn, zoom mượt, nhà người chơi, rà chữ).
**KHÔNG làm (Giám đốc đã từ chối):** hạ ngưỡng zoom bong bóng (giữ >=3); đổi thứ tự vẽ vòng la bàn/cây hay làm cây mờ; sửa độ mờ dãy nhà; tự khám phá địa danh; ẩn/dịch HUD debug và hàng nút thời tiết; đuôi bong bóng, vòng sáng ở zoom 1, mép bản đồ.

## Con số chốt (mọi khối cân theo đây)
- **Độ dài ngày:** `sky.speed = 0.024` giờ game / giây thật → 1 ngày game = 1000 giây ≈ 16,7 phút (chậm 2,5 lần). 1 giờ game ≈ 41,7 giây thật.
- **Kinh tế mục tiêu:** người chơi trung bình (4 việc/ngày, mỗi việc ~70 điểm, ăn 2 phở + 1 trà chanh) để dành ròng ~80–120k/ngày SAU khi trừ phần trả góp chia theo ngày. Người chơi giỏi (90+ điểm) ~200k/ngày. Không ai được 100 điểm bằng cách bấm loạn: 100 điểm phải gần hoàn hảo; bấm ngẫu nhiên/spam ≤ 40 điểm.
- **Thời gian:** `__worldAPI.advanceTime(h)` cộng giờ; qua 0h thì tăng `getDay()` và phát `time:newday {day}` (đúng như đồng hồ tự chạy).
- **Zoom:** camera có `zoomTarget` số nguyên 1..5; `cam.zoom` trôi mượt tới đích (~0,25 s, easing). Bánh xe chuột CỘNG DỒN deltaY, đủ ngưỡng (~100) mới đổi 1 nấc; giữ điểm dưới con trỏ (PC) / tâm nhân vật. `getZoom()` trả **zoomTarget (nguyên)** để bong bóng không nhấp nháy; `getZoomLive()` trả số thực; `worldToScreen` dùng zoom thực. `setZoom(z)` vẫn chạy (nút +/− di động).
- **Âm lượng tổng:** mọi âm (kể cả sấm) đi qua MỘT AudioContext của `src/audio`, qua bộ nén/chặn tổng (DynamicsCompressor + gain tổng). Tình huống xấu nhất (giông + tàu + chuông barie + nhạc + chảo phở cùng lúc) đỉnh đầu ra < −1 dBFS. Nền mưa/giông giảm ~6–8 dB so với hiện tại. Thêm sfx `thunder`; world bỏ AudioContext riêng, gọi `bus.emit('sfx',{name:'thunder'})` nếu `__audio?.has?.('thunder')`, không thì giữ cách cũ.
- **Hàng quán mở/đóng:** `getSites(kind)` mỗi mục thêm `open:bool` theo giờ game (lịch theo `docs/STREET_LIFE.md`); `isSiteOpen(id)`. Quán đóng: không có marker ăn, không giao việc, đèn tắt. BẢO ĐẢM: giờ nào cũng có ≥2 chỗ ăn mở (phở đêm/bánh mì đêm) trong bản đồ + nhà để ngủ → không kẹt hết thể lực.
- **Nhà người chơi:** 1 căn phòng trọ trong ngõ, tới được bằng đi bộ; `getSites('home')→[{id:'home',...}]`. Bấm E/chạm ở cửa → bảng: "Nghỉ 1 tiếng (+25 thể lực)" và "Ngủ tới 6:00 sáng (đầy thể lực, +tâm trạng)". Có việc đang làm → không cho ngủ, báo rõ (nghỉ 1 tiếng vẫn được nếu không lố hạn — gameplay quyết, ghi rõ). Ngủ: màn tối dần, `advanceTime`, lưu game. Điện thoại có nút "Về nhà (Auto-Walk)".
- **Va chạm:** vật NHỎ đi xuyên được: sạp hàng, ghế/bàn nhựa, ô dù, cột điện, cột đèn, cây, ghế đá, bồn hoa, biển tên phố, thùng rác, tủ điện, xe đỗ nhỏ. VẪN CỨNG: nhà, tường, nước, hàng rào đường ray, barie khi hạ, tượng/đền lớn. Lưới Auto-Walk và lưới NPC dùng cùng luật. Chỉ đảo Tháp Rùa không tới được.
- **Hiệu năng:** đèn và hiệu ứng ánh sáng dùng sprite vẽ sẵn (cache), giới hạn số đèn/xe/NPC theo chế độ (thấp hơn khi màn < 700px). Báo cáo thời gian khung TRƯỚC/SAU trên cùng máy (không chỉ so ngưỡng 4ms).
- **Mới:** `window.__npcPoses` (art, `src/assets/characters/poses.js`): `{exercise:{frames:[canvas…]}, coupleSit:{…}, jog:{…}, …}` cùng tỷ lệ NPC thế giới (16×28 hoặc ghi rõ). `src/assets/minigames/` (art): bộ sprite cho 5 mini-game, `getMG(name)→canvas|frames`, danh sách tên trong `src/assets/minigames/README.md`.

## ĐỢT 4B — nhịp phố + ánh sáng (world) — căn cứ `docs/STREET_LIFE.md`
- `getWeekday()→0..6` (0=CN). **Ngày 1 = Thứ Sáu** (để người chơi sớm gặp phố đi bộ tối thứ Sáu). `getDayInfo()→{day,weekday,label:'Thứ Sáu'}`.
- Phố đi bộ Hồ Gươm: 19:00 thứ Sáu → 24:00 Chủ nhật cấm xe trên các phố quanh hồ trong bản đồ (xe đổi làn/quay đầu ở rào chắn), nhiều người đi bộ, hoạt động phố đi bộ.
- Mật độ xe/NPC theo giờ nội suy từ bảng `DENSITY_KEYS`; tắc đường giờ cao điểm (xe xếp hàng chậm) nhưng KHÔNG đứng trên ray/vạch qua đường, không phá barie dừng tàu, Auto-Walk vẫn qua đường được.
- Quán mở/đóng theo `OPEN` + `PINNED_FOOD` (giờ nào cũng ≥2 chỗ ăn mở): trường `open` thật trong `getSites`; quán đóng tắt đèn/ô dù gấp nếu dễ làm.
- Dáng NPC từ `window.__npcPoses` (exercise, stretch, jog, coupleSit, elderTea, chess, sitStool), vẽ theo điểm neo (xem `src/assets/characters/poses.js`).
- Hoàng hôn tháng 11 (~17:15) — dùng mốc theo bảng nghiên cứu thay giờ cố định 18→20.5.

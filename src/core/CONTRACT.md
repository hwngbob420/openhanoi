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

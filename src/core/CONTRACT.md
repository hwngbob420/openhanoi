# HỢP ĐỒNG GIỮA CÁC KHỐI (Studio Lead sở hữu — các Sub-Agent KHÔNG sửa file này, chỉ đề xuất)

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
  `lockPlayer(bool)` (khoá di chuyển khi chơi mini-game), `teleport(gx,gy)`, `getHour()`, `isNight()`, `isRaining()`.
- **characters** — `window.__characters` (src/assets/characters/index.js):
  `OUTFIT_OPTIONS = { hair:[{id,name,color,price}×4], top:[…], pants:[…] }`, `getSprites(outfit)→{up,down,left,right:[canvas×4]}` (16×28, 4 khung đi),
  `renderPortrait(outfit, scale)→canvas` (để UI xem trước), `getSeatedSprites(outfit)` (dáng ngồi xe máy).
- **gameplay** — `window.__gameplay` (src/gameplay/index.js):
  `state`, `earn(n,reason)`, `spend(n,reason)→bool`, `jobs.board()`, `jobs.accept(id)`, `jobs.cancel()`, `buy(kind,index)→bool`, `equip(kind,index)`,
  `eat(dishId)→bool`, `debts.list()`, `debts.pay(id)→bool`, `save()`, `exportSave()→string`, `importSave(str)→bool`, `reset()`,
  `minigames.start(id)→Promise<{score,pay}>`.
- **ui** — `window.__ui`: `openPhone(app?)`, `closePhone()`, `isPhoneOpen()`.
- **audio** — `window.__audio`: `play(name)`, `setRain(on)`, `musicOn(bool)`, `resume()` (cần sau cú chạm đầu tiên vì chính sách trình duyệt).

## Quy tắc thư mục (mỗi file chỉ MỘT chủ)
`src/assets/characters,vfx` → pixel-character-artist · `src/world` → isometric-world-architect · `src/gameplay` → gameplay-economy-designer ·
`src/ui` → smartphone-ui-director · `src/audio` → sound-atmosphere-engineer · `tests`, `dist`, `tools/finish_build.mjs` → qa-bundle-integrator ·
`src/core`, `src/main.js`, `index.html`, `package.json`, `vite.config.js` → Studio Lead.
Cần sửa file của người khác → ghi đề xuất vào `docs/REQUESTS.md` (một dòng: ai cần gì ở đâu), KHÔNG tự sửa.

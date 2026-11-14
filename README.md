# Hà Nội Open World (working title)

Open-world pixel-art game set in modern Hà Nội. Workflow: `../indie_game_production_workflow_template.md` (AI-first, gated phases P0–P8).

**Current phase:** P0 — Project Setup (awaiting Owner gate)
**Current version:** 0.0.1-p0

## Run (no build step, no dependencies)

```bash
npm i        # lần đầu
npm run dev  # chơi thử tại http://localhost:8790
npm run build  # xuất 1 file dist/hanoi-pixel.html (chạy offline, dùng cho điện thoại)
npm test       # kịch bản Playwright (cần build trước)
```

Open <http://localhost:8790/index.html> (must be served over HTTP; `file://` blocks asset loading).

## Where things live

| Path | Purpose |
|---|---|
| `index.html` + `src/` (Vite): `src/world`, `src/gameplay`, `src/ui`, `src/audio`, `src/assets`, hợp đồng giữa các khối ở `src/core/CONTRACT.md`; | Current game (vanilla JS + Canvas 2D): 64x64 world, traffic, train, player. `index_legacy_v3.html`, `index_v1.html`, `index_v2.html` are frozen history. |
| `assets/src/lib/*.js`, `assets/src/catalog.mjs`, `tools/build_world_art.mjs` | Art source: isometric drawing library + catalog; `node tools/build_world_art.mjs` rebuilds every sprite with claude-pxl into `assets/world/` (+ manifest). `python tools/sheet.py <prefix>` makes a contact sheet to look at. |
| `assets/sprites`, `assets/tiles`, `assets/manifest.json` | Runtime art. Manifest is the import contract (pivot, footprint, facing, group). |
| `tools/` | Python asset pipeline. `process_codex2.py` (Codex output -> pixel art), `qa_check.py` (image QA gate). |
| `../research/` | Hanoi signature bible and prompt packs. |
| `PROJECT_BRIEF.md` `GAME_DESIGN_LITE.md` `ART_BIBLE.md` `TECHNICAL_PLAN.md` `MILESTONES.md` `TASKS.md` `DECISIONS.md` | Workflow documents. Approved decisions live here and nowhere else. |
| `evidence/` | Screenshots, logs, test results attached to tasks. |

## Rules for agents

- Read the task in `TASKS.md` and the approved spec first; do not expand scope (log ideas in backlog).
- Never mark a task DONE; submit to REVIEW with evidence.
- Every generated image passes `tools/qa_check.py` and a visual review before entering `assets/`.
- No secrets (Hub keys etc.) in files or chat.
- Record source/licence of every external asset in `ART_BIBLE.md` (provenance table).

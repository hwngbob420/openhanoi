# Technical Plan (P0 draft)

## Stack (as found, recorded not changed)

| Item | Value |
|---|---|
| Engine | None. Vanilla JavaScript + Canvas 2D, single `index.html` |
| Target platform | Desktop browser (Chrome/Edge) over HTTP. Mobile: not assessed |
| Projection | 2:1 isometric, tile 72x36 (from `assets/manifest.json`; `index.html` reads it at load) |
| Dependencies | None at runtime. Dev: Python 3.11.9 (asset tools, local server), Node v24.12.0 available |
| Build | None. Serve folder statically |
| Version control | git 2.52 (initialised in P0, no commits made yet) |
| Render | `image-rendering: pixelated`, integer-rounded draw positions, depth-sorted object list |

## Current code facts (inspected, not changed)

- Fixed 40x40 hand-placed map (roads, blocks, rail row, buildings, trees, poles, cables, vehicles, train).
- Camera drag only. No player, collision, chunking, save or UI.
- Seeded RNG (mulberry32, seed 20241111) so a given build is reproducible.
- Day/evening/night tint via `TOD_TINT`.
- `index.html` is ~29 KB single file; will need splitting into modules before M2 (see DEC-003).

## Asset conventions (as found)

- Sprite manifest entry: `file, pivot, size, kind, fp (footprint tiles), facing, group`.
- Buildings come as front/back x mirrored variants (`front_L`, `back_L`, `front_L_m`, `back_L_m`).
- Pipeline: Muse = ground tiles, Codex = elements -> `tools/process_codex2.py` (palette quantise, mode filter, nearest sample ~3.1x) -> `tools/qa_check.py`.
- Hub (Muse/Codex) is an external paid service: max 2 concurrent jobs, ~120-360 credits per call. Currently disconnected. Key must never be stored in files.

## Reusable tooling from `ai-model-world` (cloned at `C:\opensource\ai-model-world`, not vendored)

Seed hashing (`hash.ts`), layered character renderer (`scripts/sprites/chibi/*`), manifest/anchors contract, review-sheet and selftest patterns, Fusion Pixel Font (OFL-1.1). Adopt per task, copy only what is used and record provenance. Its repo rule "no AI-generated images" applies to that repo only.

## Verification method

- Smoke: serve over HTTP, load in browser, check console for errors, screenshot (evidence/).
- Image QA: `tools/qa_check.py` + visual review.
- Determinism: same seed -> same world (test added with chunking, M2).

## Risks

| Risk | Mitigation |
|---|---|
| Art direction changed several times (iso, ortho 3/4, cosy 2:1) | Lock in ART_BIBLE before any batch generation (DEC-002) |
| Single-file code will not scale to open world | Split into ES modules in first code task |
| Hub dependency/cost | Calibrate with 1 image before batches; keep code-drawn fallbacks |
| 48 MB of binary assets in repo | Decide LFS vs plain git at first commit (DEC-004) |

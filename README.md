# Hà Nội Open World (working title)

Open-world pixel-art game set in modern Hà Nội. Workflow: `../indie_game_production_workflow_template.md` (AI-first, gated phases P0–P8).

**Current phase:** P0 — Project Setup (awaiting Owner gate)
**Current version:** 0.0.1-p0

## Run (no build step, no dependencies)

```bash
python -m http.server 8765
```

Open <http://localhost:8765/index.html> (must be served over HTTP; `file://` blocks asset loading).

## Where things live

| Path | Purpose |
|---|---|
| `index.html` | Current game/viewer (vanilla JS + Canvas 2D). Source of truth. `index_v1.html`, `index_v2.html` are frozen history, do not edit. |
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

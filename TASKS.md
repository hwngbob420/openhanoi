# Tasks

Statuses: BACKLOG → READY → IN_PROGRESS → REVIEW → QA → DONE (agents never set DONE).

| ID | Phase | Task | Owner | Status |
|---|---|---|---|---|
| P0-001 | P0 | Verify clean serve + load of current build, record evidence | AI Developer | DONE (P0 gate approved by Owner 2026-11-12) |
| P0-002 | P0 | Create workflow documents and init repo | AI Technical Lead | DONE (P0 gate approved by Owner 2026-11-12) |
| P1-001 | P1 | Finalise PROJECT_BRIEF (needs Owner answers) | AI Game Designer | IN_PROGRESS (waiting on Owner answers) |
| P1-002 | P1 | Write ART_BIBLE from DEC-002=A | AI Artist | REVIEW (draft v0.1) |
| P2-001 | P2 | GAME_DESIGN_LITE: core loop and first playable scenario | AI Game Designer | REVIEW (draft v0.1, awaiting P1 gate) |
| P3-001 | P3 | Split index.html into modules (DEC-003) | AI Developer | BACKLOG (not needed yet; new code lives in `js/`) |
| W-001 | P3 | Player character: keyboard + click/tap move, 4 facings, collision, follow camera (placeholder art) | AI Developer | REVIEW |
| W-002 | P3 | POI hook for linking minigames later (`Game.registerPOI`), prompt + toast, 3 landmark POIs | AI Developer | REVIEW |
| W-003 | P3 | Touch controls: virtual stick + interact button, responsive scaling | AI Developer | BACKLOG |
| W-004 | P3 | Ambient NPC walkers (needs character art) | AI Developer + Artist | BACKLOG |
| W-005 | P3 | World expansion (more districts; hand-built vs chunked: Owner decision) | AI Technical Lead | BACKLOG |
| W-006 | P3 | Real player character art (4 facings x walk), replace placeholder | AI Artist | BACKLOG |

P2/P3 items are placeholders only; they become READY after the P1 and P2 gates.

---

# P0-001 Verify clean serve and load

- **Phase:** P0 · **Workstream:** Code/QA · **Status:** REVIEW · **Owner:** AI Developer · **Reviewer:** Project Owner
- **Objective:** Prove the current build runs from a clean `python -m http.server`.
- **Acceptance criteria:**
  - [ ] Page loads over HTTP with no console errors and no failed asset requests
  - [ ] Screenshot attached
  - [ ] Exact command recorded in README
- **Evidence:** see `docs/reports/P0_report.md`

# P0-002 Workflow documents and repo

- **Phase:** P0 · **Status:** REVIEW · **Owner:** AI Technical Lead · **Reviewer:** Project Owner
- **Deliverables:** README.md, TECHNICAL_PLAN.md, DECISIONS.md, TASKS.md, PROJECT_BRIEF.md (draft), MILESTONES.md (draft), CHANGELOG.md, git repo with no commits.
- **Out of scope:** any gameplay code, any art.

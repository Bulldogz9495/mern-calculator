# Plan: Web Calculator with Persistent History

**Goal:** Build a web calculator with persistent calculation history that is production-ready and deployable at scale.

**Feature branch:** `agent/web-calculator-history`
**State file:** `.claude/state/job-20260504.json`
**API contract:** `docs/api-contract.yaml` (created in t1)

---

## Cold-Start Gaps Detected

The repo has no application code. All 4 cold-start conditions are missing and will be addressed in t0:
- [ ] Root `README.md`
- [ ] `.gitignore` covering `.env*`
- [ ] Pre-commit hook blocking secret commits
- [ ] `.env.example`

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (single-string expression model) |
| Backend | Node.js + Express |
| Database | MongoDB (persistence) |
| Infra | Docker multi-stage + docker-compose + nginx |

**Containerized:** Yes — all services run via docker-compose. Host environment issues are eliminated.

---

## API Endpoints (contract defined in t1)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/calculate` | Evaluate expression, persist result |
| `GET` | `/api/history` | Paginated history list |
| `DELETE` | `/api/history/:id` | Remove one history entry |
| `GET` | `/api/health` | Liveness probe |

---

## Tasks

### t0 — Cold-start scaffold
**Agent:** `backend-developer`
**Objective:** Create `.gitignore`, `.env.example`, pre-commit hook, root `README.md`
**Depends on:** _(none — first task)_
**Done when:** `.gitignore` covers `.env*`; pre-commit hook rejects any `.env` commit
**Parallel with:** _(none)_

---

### t1 — API contract
**Agent:** `backend-developer`
**Objective:** Define `docs/api-contract.yaml` with all 4 endpoints, full request/response schemas
**Depends on:** t0
**Done when:** Valid YAML; all 4 endpoints present
**Parallel with:** _(none)_

---

### t2 — Backend implementation _(worktree)_
**Agent:** `backend-developer`
**Objective:** Express + MongoDB server implementing all endpoints per contract
- `express.json({ limit: '10kb' })`
- Helmet, cors, rate-limiting
- Statements prepared at module level (not per-request)
- Placeholder test script in package.json
- Safe expression evaluation (no `eval()` on raw user input)

**Depends on:** t1
**Done when:** All 4 endpoints respond correctly; server starts cleanly
**Parallel with:** t3 (both start once t1 is done)

---

### t3 — Frontend implementation _(worktree)_
**Agent:** `frontend-developer`
**Objective:** React/Vite calculator with history panel
- Single mutable expression string (not left/op/right state machine)
- `aria-label` on all buttons (not `data-value` with special chars)
- Non-empty catch blocks with user-visible error states
- Paginated history panel

**Depends on:** t1
**Done when:** `npm run build` succeeds; buttons have `aria-label`; history loads from API
**Parallel with:** t2

---

### t4 — Infrastructure
**Agent:** `infrastructure-platform-engineer`
**Objective:** Multi-stage Dockerfiles + docker-compose + nginx
- Backend Dockerfile (Node multi-stage)
- Frontend Dockerfile (Vite build → nginx static serve)
- docker-compose.yml: MongoDB + backend + frontend-nginx
- nginx proxies `/api` to backend, serves React static files for all other routes
- Health checks, restart policies, resource limits on all services

**Depends on:** t2, t3
**Done when:** `docker-compose up --build` runs all 3 services; `GET /api/health` returns 200; React app loads at root

---

### t5 — Integration + E2E tests
**Agent:** `test-engineer`
**Objective:** Full test suite against the docker-compose stack
- Liveness probe loop before any API test
- All API contract tests first (all 4 endpoints)
- Required fields tested as both `""` and absent
- Playwright E2E after API tests (fresh browser)
- `aria-label` selectors, not `data-value`

**Depends on:** t4
**Done when:** All tests pass; test output shows API before Playwright sections

---

## Dependency Graph

```
t0 → t1 → t2 ─┐
               ├─→ t4 → t5
     t1 → t3 ─┘
```

t2 and t3 run in **parallel** (worktrees) after t1 completes.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Windows shell quoting in Playwright | Use `aria-label` selectors; no `data-value` with operators |
| `eval()` expression injection | Use `mathjs` or equivalent safe parser, never raw `eval()` |
| MongoDB not ready before backend | docker-compose `depends_on` with health check; backend retry on startup |
| Empty catch blocks silently swallowing errors | Lesson enforced: every catch must log + show user feedback |

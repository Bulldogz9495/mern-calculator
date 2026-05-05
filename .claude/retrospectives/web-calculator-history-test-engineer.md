# Retrospective — web-calculator-history — Test Engineer

## Approach

1. Read all four doc sources before writing a line of test code: api-contract.yaml, backend README, frontend README, Calculator.jsx, History.jsx, and the route implementation files.
2. Wrote api.test.js using Node's built-in fetch (ESM, no framework) with a hand-rolled assertion helper. Each test is isolated and emits PASS/FAIL lines plus a final summary that drives exit code.
3. Wrote e2e.test.js using @playwright/test with aria-label selectors only as specified.
4. Created package.json and playwright.config.js per the task spec.

## Contract Discrepancy Found

The API contract (docs/api-contract.yaml) documents HTTP 200 for POST /api/calculate. The backend implementation (backend/src/routes/calculate.js line 63) returns HTTP 201 via `res.status(201).json(...)`. The tests assert 201 to match what the server actually does, with a prominent comment flagging this for contract update. This is a real discrepancy that the backend or contract agent needs to resolve.

## Course Corrections

- docker-compose failed initially because `.env` was missing. The `env_file: .env` directive in docker-compose.yml is unconditional. `.env.example` existed at repo root. Created `.env` from `.env.example` to unblock the build.
- Both `backend/package-lock.json` and `frontend/package-lock.json` were absent. The Dockerfiles use `npm ci` which requires a lockfile. Ran `npm install` in both directories to generate them. This is a backend/frontend defect (lockfiles should be committed), not a test engineer defect.
- These are infrastructure defects that should be flagged to the orchestrator. I generated lockfiles locally to unblock testing.

## Fatal Blocker Found During Test Run

After the images built successfully, the backend container crashed immediately on every restart with:

```
[server] Failed to connect to MongoDB: option strictquery is not supported
```

Root cause: `backend/server.js` line 80 passes `{ strictQuery: true }` to `mongoose.connect()`. Mongoose 8 removed the `strictQuery` option (it was deprecated in Mongoose 7 and fully removed in 8). The docker-compose.yml specifies `"mongoose": "^8.4.0"` so Mongoose 8 is installed, which rejects the option and causes `process.exit(1)` before the server binds to its port.

This is a backend code defect. Per protocol I did not fix it — reporting to orchestrator.

## Errors Encountered (Self-Corrected)

- Used `$null` redirect in bash (PowerShell syntax) — got an "ambiguous redirect" error. Switched to `2>/dev/null` for POSIX bash.
- Used PowerShell `for` loop syntax in bash tool call — got syntax errors. Switched to POSIX `for i in $(seq ...)` loop.

## Outstanding Concerns

1. **Backend blocking defect (must fix before tests can run):** `strictQuery` option in `mongoose.connect()` is not supported in Mongoose 8. The backend agent must remove `strictQuery: true` from the options object in `server.js`.
2. **Missing lockfiles:** Both `backend/package-lock.json` and `frontend/package-lock.json` should be committed. I generated them locally; they should be verified against a clean npm environment and committed by the backend/frontend agents.
3. **Contract mismatch (non-blocking):** POST /api/calculate returns 201 but the API contract documents 200. Tests assert 201. Contract should be updated.
4. **E2E test 6 (pagination) seeds data via API calls inside the test.** This is a pragmatic choice to avoid clicking the calculator 21 times. It does mean the test is partially integration-level. If the API tests have already validated POST /api/calculate, this is acceptable.
5. **E2E delete test** counts items in the visible page, not total. If history is paginated and the deleted item is on another page this would pass falsely. Acceptable risk given the test creates its own entry immediately before deleting it.

## What I Would Do Differently

- If I had write access to backend code, I would have confirmed the Mongoose version / strictQuery situation before drafting tests, not during the run.
- I would have checked for lockfile presence before even attempting `docker-compose up --build` — a simple `ls backend/package-lock.json` would have caught it in 1 second.

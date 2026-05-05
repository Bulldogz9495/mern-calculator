# Calculator Integration and E2E Test Suite

Tests for the web calculator with persistent history. Covers the full stack: nginx reverse proxy, Express/Node.js API, and MongoDB.

## Related Documentation

- [API Contract](../docs/api-contract.yaml) — source of truth for all endpoint shapes and status codes
- [Backend README](../backend/README.md) — implementation notes and edge cases
- [Frontend README](../frontend/README.md) — aria-label reference for Playwright selectors

## What Is Covered

### `api.test.js` — Contract Tests (10 tests)

| # | Test | Endpoint | Assertion |
|---|------|----------|-----------|
| 1 | Health check | GET /api/health | 200, `{status:"ok", timestamp}` |
| 2 | Successful calculation | POST /api/calculate | 201, `result===5`, has `id` (24-char ObjectId), has `createdAt` |
| 3 | Empty string expression | POST /api/calculate | 400, has `error` field |
| 4 | Absent expression field | POST /api/calculate | 400, has `error` field (different code path from test 3) |
| 5 | Malformed math | POST /api/calculate | 422, has `error` field |
| 6 | History default pagination | GET /api/history | 200, `{items[], total, page, limit}` |
| 7 | History explicit pagination | GET /api/history?page=1&limit=5 | 200, `items.length <= 5`, `page===1`, `limit===5` |
| 8 | Delete existing entry | DELETE /api/history/:id | 200, `{success: true}` |
| 9 | Delete valid-format but missing id | DELETE /api/history/000000000000000000000000 | 404, has `error` field |
| 10 | Delete invalid id format | DELETE /api/history/not-an-objectid | 404, has `error` field |

### `e2e.test.js` — Playwright E2E Tests (6 tests)

| # | Test | Scenario |
|---|------|----------|
| 1 | Page loads | Title present, display shows "0" |
| 2 | 5 + 3 = 8 | Display updates, history panel shows entry |
| 3 | Clear (C) | Display resets to "0" |
| 4 | 10 / 2 = 5 | Division works correctly |
| 5 | Delete history entry | Entry count decreases by 1 after delete |
| 6 | Error visibility | Invalid expression shows non-empty visible alert; clear removes it |
| 7 | Pagination | Next/Previous buttons navigate pages (conditional on > 20 entries) |

## Known Discrepancies

**POST /api/calculate returns 201, not 200.** The API contract (`docs/api-contract.yaml`) documents 200 for a successful calculation. The backend implementation (`backend/src/routes/calculate.js:63`) returns `res.status(201)`. Tests assert 201 to match the actual server behavior. The contract should be updated to document 201.

## What Is Not Covered (Intentionally)

- Load / performance testing — out of scope for this suite
- Rate limiting (100 req/15 min) — would require 100 sequential calls; covered by unit/manual testing
- CORS enforcement — requires a cross-origin browser context; not covered here
- Payload size limit (10 kb) — covered by contract testing with a large body if needed; not currently included
- Concurrent delete race condition — correctness under parallel deletes is not tested

## Running the Tests

**Prerequisites:** docker-compose running (`docker-compose up --build -d` from repo root), Node 18+.

```bash
# Step 1: Install dependencies
cd tests
npm install
npx playwright install chromium

# Step 2: Run API contract tests first
node api.test.js

# Step 3: Run E2E tests after API tests pass
npx playwright test e2e.test.js
```

## Known Infrastructure Issues (Must Resolve Before Tests Can Pass)

1. **Backend crash on startup** — `backend/server.js` passes `{ strictQuery: true }` to `mongoose.connect()`. Mongoose 8 (the version installed) does not support this option and throws, causing `process.exit(1)`. Remove `strictQuery: true` from the options object.
2. **Missing lockfiles** — `backend/package-lock.json` and `frontend/package-lock.json` must be committed so `npm ci` in the Dockerfiles can run successfully.

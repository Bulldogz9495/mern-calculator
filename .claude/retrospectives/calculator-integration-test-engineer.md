# Retrospective: Calculator App Integration Testing

## Approach taken

Read API_CONTRACT.md, server.js, parser.js, and database.js before writing a test. Wrote a self-contained Node.js test script rather than curl to get precise JSON shape assertions and deterministic state (clears history before starting).

## Course corrections

- Background server `&` returned exit 0 immediately — confirmed liveness via Playwright navigation instead.
- `taskkill /F` in bash interpreted `/F` as path — fixed with `powershell -Command Stop-Process`.

## Errors encountered

- Server background exit code 0 (not a crash).
- taskkill quoting in bash context.
- Expected console errors (favicon 404, 400 from error-case tests).

## What I would do differently

- Add liveness probe loop before running API tests.
- Run API tests first, then navigate Playwright fresh — interleaving caused stale browser state.
- Add explicit test for missing `expression` field (not just empty string).

## Outstanding concerns

- `run-api-tests.js` left in `calculator-app/` root — should move to `tests/` subfolder.
- No load or concurrency tests run.
- DELETE when table already empty not explicitly tested as a standalone case.

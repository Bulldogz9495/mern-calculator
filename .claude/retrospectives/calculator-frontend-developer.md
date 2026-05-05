# Retrospective — calculator-app frontend

## Approach taken

Read API_CONTRACT.md and server.js before writing any file. Expression model is a single mutable string — simpler and less error-prone than a left/operator/right state machine, and it matches how the backend receives expressions.

## Course corrections

1. `appendOperator` regex needed to handle typographic `−` (U+2212) separately from ASCII `-` — caught on code review before testing.
2. Removed a redundant `trailingOp` variable declaration.
3. Playwright CSS selector quoting failed on `[data-value="+"]` in Windows PowerShell — switched to snapshot ref targeting.

## Errors encountered

- Favicon 404 in console — expected, harmless.
- One failed Playwright `browser_click` due to CSS special-character escaping.

## What I would do differently

- Write `appendOperator` with a single conditional path from the start.

## Outstanding concerns

- No unit test file created — testing infrastructure gap, not a code gap.
- `negate` on a complex expression wraps whole expression rather than last token (correct per spec, visually surprising).
- `formatNumber` uses `toPrecision(12)` — very large numbers display in scientific notation.

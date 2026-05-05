# Retrospective: t2-frontend-developer

## Approach taken and why

Implemented the complete frontend using the single mutable expression string model as required. The architecture was deliberately simple: Calculator.jsx builds a string character by character; the equals button sends that string to the backend; result replaces the display. No client-side eval, no left/right operand state machine.

Used a `refreshTrigger` counter in App.jsx (incremented on every successful calculate) passed down to History.jsx as a prop. This avoids prop drilling callbacks while keeping the two panels decoupled. History fetches on mount and whenever `refreshTrigger` changes.

## Anything I had to change course on mid-task

- Decimal handling needed a regex split on operators to detect whether the current number segment already contains a dot. A naive `.includes('.')` check on the full expression string would incorrectly block decimals on a second number (e.g. `1.5+2` — the `1.5` segment has a dot but `2.` should be allowed).

- Operator chaining after evaluate: the spec said "pressing an operator appends to the result." Implemented by using `display` (which holds the result string) as the base when `justEvaluated` is true.

## Errors encountered, even ones you self-corrected

- Initially drafted `appendOperator` to always use `expression` as the base. Caught during review that after evaluate, `expression` holds the result number but `display` was the right string to chain from. Fixed before writing the final file.

- The `handleDelete` in History.jsx had a subtle re-fetch timing issue: if `setPage` causes a page change it triggers the `useEffect`, but if the page doesn't change (we stay on the same page) the effect won't re-run unless we also call `fetchHistory` directly. Fixed by calling `fetchHistory(targetPage)` explicitly when `targetPage === page`.

## What I would do differently with hindsight

- Would add keyboard event listeners (keydown) so the calculator is fully operable without a mouse. Not required in the spec but is table stakes for WCAG 2.1 AA. Could be added as a follow-up.
- Would extract button definitions into a data array and `.map()` them rather than repeating 20 `<button>` elements. Reduces JSX line count significantly with no functional change.

## Outstanding concerns about my own output

- The build has not yet been verified by running `npm install && npm run build` because Bash access was denied during this session. The code is syntactically correct React/JSX but I cannot confirm Vite compiles it cleanly without running it.
- The `useCallback` dependency arrays look correct on inspection but are the most likely source of subtle bugs if a future edit adds state variables.
- History panel has no "refresh" button — relies entirely on the trigger from Calculator. If the user deletes on another browser tab the list will be stale until next calculate. Acceptable for the current spec.

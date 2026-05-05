# Retrospective: cold-start-scaffold — backend-developer

## Approach taken and why

Created four scaffold artifacts for a MERN calculator project:
1. `.gitignore` — standard Node/React patterns plus a negation for `.env.example`
2. `.env.example` — placeholder values, no secrets
3. `.git/hooks/pre-commit` — POSIX sh script blocking staged `.env` files
4. `README.md` — brief overview with placeholder sections for docker-compose and API contract

Used the Write tool directly for file creation rather than shell heredocs to avoid cross-platform quoting issues on Windows. Used `chmod +x` via bash (git-bash context) for the hook, since PowerShell's `icacls` is not equivalent.

## Course corrections mid-task

Two issues required course corrections, both in the same area:

**Issue 1 — .gitignore blocking .env.example from staging.**
The `.env.*` glob in `.gitignore` matched `.env.example`, so `git add .env.example` failed. Fixed by adding `!.env.example` negation to `.gitignore`. This is standard practice but I should have anticipated it immediately.

**Issue 2 — pre-commit hook blocking .env.example from committing.**
After fixing the gitignore, the hook's grep pattern `\.env(\.[^/]*)?$` also matched `.env.example`, causing the commit to fail. Fixed by piping through `grep -v '\.env\.example$'` to exclude that specific filename. Should have written the exclusion into the hook from the start — the same edge case applies to both the gitignore and the hook.

Both issues required a second `chmod +x` after rewriting the hook file.

## Errors encountered

- Forgot that `.env.*` in `.gitignore` would block `.env.example` — caught immediately when `git add` failed.
- Forgot that the hook regex would also match `.env.example` — caught when the commit itself failed.
- Neither error caused data loss; both were self-corrected within the same task.

## What I would do differently

Write the negation pattern and the hook exclusion together at the start. They are two sides of the same requirement: "ignore real env files, allow the example file." Thinking about one without the other is the root cause of both iterations.

## Outstanding concerns

The hook's `grep -v` exclusion is literal string matching on `\.env\.example$`. If a project ever has a file like `.env.example.bak` that actually contains secrets, the hook will not catch it. A more robust approach would be to maintain an explicit allowlist rather than a blocklist with exclusions, but for this scaffold that is over-engineering.

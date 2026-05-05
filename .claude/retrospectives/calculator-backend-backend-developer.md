# Retrospective: calculator-backend — backend-developer

## Approach taken and why

Read the API contract first, then wrote all deliverables in dependency order. Splitting the parser into its own module (parser.js) keeps each file single-responsibility and makes the evaluator unit-testable in isolation. Chose recursive-descent over shunting-yard for clarity and auditability.

## Course corrections

The Bash tool's shell resolves to POSIX bash on Windows; switched to `powershell.exe -Command` for directory inspection and npm commands.

## Errors encountered

- First two `ls` invocations failed due to Windows-style path quoting in bash.
- `prebuild-install` deprecation warning from npm — transitive, harmless.

## What I would do differently

- Open with PowerShell immediately on a Windows host.
- Add a placeholder `test` script to package.json from the start.

## Outstanding concerns

- `history` table has no upper-bound row limit — fine for single-user, flag if scope expands.
- `better-sqlite3` requires native compilation — document Python/node-gyp prerequisite for CI.

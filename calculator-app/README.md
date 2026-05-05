# Calculator App

A simple arithmetic calculator with a persistent history log. The backend is a Node.js + Express REST API backed by a SQLite database (better-sqlite3). The frontend is served as static files from the `public/` directory.

## API reference

See [API_CONTRACT.md](API_CONTRACT.md) for the full endpoint specification.

| Method | Path | Description |
|---|---|---|
| POST | `/api/calculate` | Evaluate an expression and save it to history |
| GET | `/api/history` | Retrieve all past calculations, newest first |
| DELETE | `/api/history` | Delete all history rows |

## Install & Run

```bash
npm install
npm start
# → http://localhost:3000
```

## Project structure

| File | Purpose |
|---|---|
| `server.js` | Express app, route handlers |
| `parser.js` | Safe recursive-descent arithmetic parser (no `eval()`) |
| `database.js` | SQLite helpers: `saveCalculation`, `getHistory`, `clearHistory` |
| `public/index.html` | App shell — semantic HTML, ARIA roles |
| `public/style.css` | Styling via CSS custom properties; responsive |
| `public/app.js` | Expression builder, API calls, keyboard support |
| `run-api-tests.js` | Contract test suite (42 assertions, zero dependencies) |

## Security

- Expression evaluator is a hand-written recursive-descent parser — no `eval()`, `Function()`, or `vm` anywhere.
- No secrets in codebase. Copy `.env.example` to `.env`; `.env` is gitignored.

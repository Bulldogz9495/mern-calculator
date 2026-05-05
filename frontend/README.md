# Calculator Frontend

React 18 + Vite single-page application for the MERN Calculator project.

## Stack

| Concern | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite 5 |
| Language | JSX (ES2022) |
| Styling | Plain CSS (no external libraries) |

## Directory Structure

```
frontend/
  index.html               Entry HTML shell
  vite.config.js           Vite config + /api proxy to localhost:3001
  package.json
  src/
    main.jsx               ReactDOM.createRoot mount
    App.jsx                Root layout; owns refreshTrigger counter
    components/
      Calculator.jsx       Expression builder + = button + display
      History.jsx          Paginated history list + delete per row
    api/
      client.js            Typed fetch wrappers for all 3 API endpoints
    styles/
      App.css              Global styles (dark theme, responsive grid)
```

## Architecture

### Single-string expression model

Calculator.jsx maintains one string (`expression`) that is appended to on every button press. No client-side arithmetic is performed. On `=`, the full string is sent to `POST /api/calculate` and the backend evaluates it.

```
User presses: 2 + 3 * 4
expression:   "2+3*4"
POST body:    { expression: "2+3*4" }
Response:     { result: 14, ... }
```

### State after evaluate

```js
const [expression, setExpression] = useState('');
const [display, setDisplay] = useState('0');
const [justEvaluated, setJustEvaluated] = useState(false);
```

When `justEvaluated` is true:
- Pressing a **digit** starts a fresh expression (old result discarded)
- Pressing an **operator** chains from the result (e.g. `14 +`)

### History refresh

App.jsx owns a `refreshTrigger` integer. It increments on every successful calculate and is passed to History as a prop. History's `useEffect` depends on `[page, refreshTrigger]` so it re-fetches on both page change and new calculation.

## API Contract

See [api/client.js](src/api/client.js) for full implementation.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/calculate` | Evaluate expression string |
| GET | `/api/history` | Paginated history (`?page=1&limit=20`) |
| DELETE | `/api/history/:id` | Delete one entry |

The Vite dev server proxies all `/api` requests to `http://localhost:3001`.

## Accessibility

Every interactive element carries an `aria-label`. Button labels used by Playwright tests and screen readers:

- Digits: `aria-label="digit N"` (0–9)
- Operators: `aria-label="add"`, `aria-label="subtract"`, `aria-label="multiply"`, `aria-label="divide"`
- Utility: `aria-label="clear"`, `aria-label="backspace"`, `aria-label="decimal point"`, `aria-label="equals"`
- History: `aria-label="delete calculation"`, `aria-label="previous page"`, `aria-label="next page"`

## Error Handling

- Failed calculate: error message shown below display; = button re-enables
- Failed history load: "Failed to load history" shown in history panel
- Failed delete: inline error next to the row; delete button re-enables

No empty catch blocks anywhere. Every catch calls `console.error` and sets visible error state.

## Running Locally

```bash
# Install
cd frontend
npm install

# Development (requires backend on port 3001)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Related Docs

- [Project README](../README.md)

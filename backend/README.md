# Calculator Backend

Express + MongoDB REST API for the web calculator with persistent history.

## Tech Stack

| Concern | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB via Mongoose 8 |
| Math evaluation | mathjs (safe — no raw `eval`) |
| Security | helmet, cors, express-rate-limit |
| Config | dotenv |

## Directory Structure

```
backend/
  server.js               Entry point — app bootstrap and MongoDB connect
  .env.example            Environment variable template
  src/
    routes/
      calculate.js        POST /api/calculate
      history.js          GET /api/history, DELETE /api/history/:id
      health.js           GET /api/health
    models/
      Calculation.js      Mongoose schema with createdAt index
    middleware/
      errorHandler.js     Global JSON error handler
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `MONGODB_URI` | `mongodb://mongo:27017/calculator` | MongoDB connection string |
| `NODE_ENV` | `development` | Controls error verbosity |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

## Running Locally

```bash
cd backend
npm install
cp .env.example .env   # edit values as needed
npm run dev            # nodemon — hot reload
```

## API Surface

See [`../docs/api-contract.yaml`](../docs/api-contract.yaml) for the full OpenAPI spec.

| Method | Path | Description |
|---|---|---|
| GET | /api/health | Liveness probe |
| POST | /api/calculate | Evaluate expression, persist result |
| GET | /api/history | Paginated history (page, limit) |
| DELETE | /api/history/:id | Delete one calculation by ObjectId |

## Security Notes

- Payload body capped at 10 kb (`express.json({ limit: '10kb' })`)
- Rate limit: 100 req / 15 min per IP on all `/api/` routes
- Math evaluated via `mathjs.evaluate()` — `eval()` is never used on user input
- Internal 500 errors do not leak stack traces to clients in production

## Scripts

| Script | Command |
|---|---|
| `npm start` | Production start |
| `npm run dev` | Nodemon hot-reload |
| `npm test` | Placeholder (test-engineer owns tests) |

# MERN Calculator

A full-stack calculator with persistent history built with MongoDB, Express, React, and Node.js.

This project was built entirely by a **Claude Code multi-agent orchestration system** as a training example. No application code was written by a human — only the goal prompt.

---

## Agent Training Example

The following shows exactly how this project was created: the goal prompt given to the orchestrator, the plan it produced, and which agents executed each task.

### Step 1 — The Goal Prompt

This single prompt was given to the `orchestrator` agent:

> Build a simple full-stack web calculator with persistent history.
>
> The app should let users perform basic arithmetic and see a log of their past calculations. It needs a frontend UI, a backend API, and a database to store history. Use TypeScript throughout.
>
> Look at well-established open source examples of similar full-stack apps on GitHub to inform the architecture and folder structure before planning. Ask me about testing framework preference before writing any tests.

No API endpoints, no folder structure, no framework choices — the orchestrator figures all of that out.

---

### Step 2 — The Orchestrator's Plan

Before writing a single line of code, the orchestrator researched GitHub reference projects, decomposed the goal, and produced this plan for human approval:

```
GOAL: MERN stack calculator with persistent calculation history

API CONTRACT (defined first, before any agent starts):
  POST /api/calculate   { a, b, operator } → { result, id }
  GET  /api/history     → [{ id, a, b, operator, result, timestamp }]
  DELETE /api/history   → { deleted: number }

TASK LIST:
  t0  infrastructure-platform-engineer  Project scaffolding, .gitignore,
                                        .env.example, pre-commit hook
                                        → depends on: none

  t1  backend-developer                 Express API + MongoDB schema +
                                        calculation history endpoints
                                        → depends on: t0, API contract

  t2  frontend-developer                React calculator UI + history panel,
                                        consuming the API contract
                                        → depends on: t0, API contract
                                        → parallel with: t1

  t3  test-engineer                     Contract tests, integration tests,
                                        Playwright E2E golden path + 3 failures
                                        → depends on: t1, t2

  t4  self-improvement-agent            Reads retrospectives from t0–t3,
                                        extracts lessons, pushes to claude-agents
                                        → runs after every task
```

The plan was presented to the user. No agent ran until it was approved.

---

### Step 3 — Agent Execution

Once approved, the orchestrator delegated every action. It never wrote a line of application code itself.

```
orchestrator
├── spawns infrastructure-platform-engineer (t0)
│   ├── reads existing structure
│   ├── creates .gitignore, .env.example, pre-commit hook
│   ├── writes retrospective
│   └── self-improvement-agent reads retrospective → pushes lessons to GitHub
│
├── spawns backend-developer (t1) + frontend-developer (t2) in parallel worktrees
│   ├── backend: Express routes, Mongoose schema, validation, unit tests
│   ├── frontend: React calculator UI, history panel, Playwright smoke test
│   ├── both write retrospectives
│   └── self-improvement-agent runs after each → pushes lessons to GitHub
│
├── spawns test-engineer (t3)
│   ├── reads API contract
│   ├── writes contract tests, integration tests, E2E tests
│   ├── writes retrospective
│   └── self-improvement-agent runs → pushes lessons to GitHub
│
└── wrap-up: all tests green, git pushed, split recommendations surfaced
```

Each agent also ran a **3-persona pre-commit critique** (product, scalability, UI/UX) before pushing. Any unresolved disagreement after 2 rounds escalated to the user.

---

### Step 4 — Self-Improvement Loop

After every task, the `self-improvement-agent` read the agent's retrospective file and extracted lessons into the private [`claude-agents`](https://github.com/Bulldogz9495/claude-agents) repository:

```
.claude/retrospectives/t1-backend-developer.md   ← agent's honest self-assessment
        ↓
self-improvement-agent extracts lesson
        ↓
claude-agents/lessons/backend-developer.md       ← versioned, pushed to GitHub
```

Lessons that recur 3+ times graduate to **Persistent Rules** and trigger a proposal to update the agent's definition file. The orchestrator surfaces these proposals to the user at job completion — no agent modifies its own definition.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB + Mongoose |
| Testing | Vitest (unit) + Playwright (E2E) |
| Tooling | ESLint + Prettier + Husky pre-commit |

## Project Structure

```
mern-calculator/
├── src/
│   ├── client/          # React frontend
│   │   ├── components/
│   │   │   ├── Calculator/
│   │   │   └── History/
│   │   └── README.md
│   └── server/          # Express backend
│       ├── routes/
│       ├── models/
│       └── README.md
├── tests/               # Integration + E2E tests (test-engineer)
├── .env.example
├── .gitignore
└── PLAN.md              # Orchestrator's approved plan (auto-generated)
```

## Running Locally

```bash
# Install dependencies
npm install

# Copy env vars
cp .env.example .env

# Start MongoDB locally
mongod

# Run in development
npm run dev

# Run tests
npm test
```

## Agent System

The agents that built this project live in the private [`Bulldogz9495/claude-agents`](https://github.com/Bulldogz9495/claude-agents) repository. Each agent is a markdown file with a YAML frontmatter defining its model, tools, and system prompt.

To use this system on a new project, paste a high-level goal into Claude Code. The `orchestrator` agent picks it up, researches GitHub for reference architecture, decomposes the work, and asks for your approval before any code is written.

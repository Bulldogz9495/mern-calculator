# Web Calculator with History

A full-stack web calculator that stores and displays a persistent history of calculations.

## Overview

Web Calculator with History is a MERN-stack application that provides a responsive calculator UI with real-time calculation history persisted to MongoDB. Users can perform arithmetic operations and review their full session history across page reloads.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + Vite                        |
| Backend  | Node.js + Express                   |
| Database | MongoDB                             |
| Infra    | Docker + nginx (reverse proxy)      |

## Getting Started

See `docker-compose.yml` (to be added) for full local setup instructions. The application is designed to run entirely inside Docker with a single command:

```
docker compose up
```

## API

See `docs/api-contract.yaml` (to be added) for the full OpenAPI specification covering all REST endpoints.

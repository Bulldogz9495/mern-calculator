# Calculator App — API Contract

**Version:** 1.0  
**Date:** 2026-05-04  
**Status:** Authoritative

This document is the single source of truth for the calculator app REST API. Both the backend (Node.js + Express, port 3000) and the frontend (vanilla JS, served from `calculator-app/public/`) must conform to this contract exactly. No implementation detail may deviate from the schemas defined here without an explicit, recorded approval from the project orchestrator.

---

## Overview

| Property | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| Content-Type (all requests) | `application/json` |
| Content-Type (all responses) | `application/json` |
| Database | better-sqlite3, file at `calculator-app/history.db` |

All request bodies must be JSON. All responses are JSON. Every response — success or error — sets `Content-Type: application/json`.

---

## Error Format

All error responses share a single envelope:

```json
{ "error": "Human-readable message" }
```

The `error` field is always a non-empty string. No additional fields are present on error responses. HTTP status codes are the machine-readable signal; the `error` string is for display and logging only.

---

## Endpoints

### POST /api/calculate

Parses and evaluates a mathematical expression, saves the result to history, and returns the saved record.

#### Request

```
POST /api/calculate
Content-Type: application/json
```

Body:

```json
{ "expression": "12 + 4" }
```

| Field | Type | Required | Description |
|---|---|---|---|
| `expression` | string | Yes | The mathematical expression to evaluate. Whitespace is allowed. |

**Security constraint:** The server must use a safe expression parser. `eval()` and any equivalent runtime code execution mechanism is prohibited.

#### Success Response — 200 OK

```json
{
  "expression": "12 + 4",
  "result": 16,
  "id": 1,
  "created_at": "2026-05-04T17:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `expression` | string | The original expression string, unmodified. |
| `result` | number | The numeric result of evaluation. |
| `id` | integer | Auto-incremented primary key of the saved history row. |
| `created_at` | string | ISO 8601 UTC timestamp of when the record was inserted. |

The record is written to `history.db` before the response is sent. If the write fails the endpoint must return a 500 error rather than a 200 with an unsaved result.

#### Error Response — 400 Bad Request (invalid or malformed expression)

Returned when the expression cannot be parsed or contains unsupported syntax.

```json
{ "error": "Invalid expression" }
```

#### Error Response — 400 Bad Request (division by zero)

Returned when the expression is valid but results in a division by zero.

```json
{ "error": "Division by zero" }
```

---

### GET /api/history

Returns all saved calculation records, most recent first.

#### Request

```
GET /api/history
```

No query parameters. No request body.

#### Success Response — 200 OK

```json
{
  "history": [
    {
      "id": 1,
      "expression": "12 + 4",
      "result": 16,
      "created_at": "2026-05-04T17:00:00.000Z"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `history` | array | Ordered list of calculation records, newest first (`ORDER BY id DESC`). |
| `history[].id` | integer | Auto-incremented primary key. |
| `history[].expression` | string | The original expression string. |
| `history[].result` | number | The numeric result. |
| `history[].created_at` | string | ISO 8601 UTC timestamp. |

When no records exist the response is still 200 with an empty array:

```json
{ "history": [] }
```

---

### DELETE /api/history

Deletes all rows from the history table and returns the count of deleted rows.

#### Request

```
DELETE /api/history
```

No query parameters. No request body.

#### Success Response — 200 OK

```json
{ "deleted": 3 }
```

| Field | Type | Description |
|---|---|---|
| `deleted` | integer | Number of rows removed. `0` when the table was already empty. |

---

## HTTP Status Code Reference

| Code | Meaning | Used by |
|---|---|---|
| 200 | OK | All successful responses |
| 400 | Bad Request | Invalid expression, division by zero |
| 500 | Internal Server Error | Unhandled server faults (database write failure, etc.) |

5xx responses follow the same error envelope: `{ "error": "..." }`.

---

## Database Schema Reference

The `history` table in `calculator-app/history.db`:

```sql
CREATE TABLE IF NOT EXISTS history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  expression TEXT    NOT NULL,
  result     REAL    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

`created_at` is stored as a UTC ISO 8601 string and returned as-is in all API responses.

---

## Change Policy

This contract is immutable during active development. Any proposed change must be:

1. Flagged to the orchestrator with a written justification.
2. Approved explicitly before any implementation is modified.
3. Recorded here with a version bump and date.

Backend and frontend agents must not deviate from this contract unilaterally.

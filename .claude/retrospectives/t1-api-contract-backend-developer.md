# Retrospective: t1-api-contract — backend-developer

## Approach taken and why

Wrote the OpenAPI 3.0.3 contract document before any application code exists, which is the correct order — the contract is the shared source of truth that backend and frontend agents both implement against. Used the Write tool directly rather than shell heredocs to avoid PowerShell quoting complexity on Windows.

Organized the document as: info block, servers, paths (one per endpoint), then components/schemas for the three reusable types. This is standard OpenAPI layout and keeps the schema definitions in one place for easy reference.

Each path entry includes: operationId (useful for code generation), full request/response examples, and description prose covering edge cases (e.g. distinguishing 400 from 422 in the calculate endpoint).

## Course corrections mid-task

None. The requirements were fully specified in the task brief, and the investigation phase (reading README, PLAN, .env.example, prior retrospective) confirmed the scope without surfacing any ambiguities.

## Errors encountered

None. The YAML was written in a single pass. PowerShell Select-String confirmation showed all 4 paths (/api/calculate, /api/history, /api/history/{id}, /api/health) present and required fields appearing in all expected locations.

## What I would do differently

Nothing material for this task. One minor improvement: I could have added a `securitySchemes` stub in components even though this API currently has no auth, to signal to future agents that auth extensibility was considered. But the spec says nothing about auth, so adding it unprompted would be overstepping.

## Outstanding concerns

- The `DELETE /api/history/{id}` 200 response body contains `{ "success": true }`. A strict REST reading would use 204 No Content with no body. The spec explicitly requires 200 with a body, so I followed it, but a future API review may want to reconsider this.
- The ObjectId pattern `^[a-fA-F0-9]{24}$` in the id path parameter schema gives backend agents a clear validation target. If the backend uses Mongoose and relies on its own ObjectId casting, it should still validate the format before calling MongoDB to avoid unhandled cast errors.

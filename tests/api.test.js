/**
 * API Contract Tests — Web Calculator with History
 *
 * Covers every endpoint documented in docs/api-contract.yaml.
 *
 * Run order: all API tests MUST complete before Playwright E2E is launched to
 * prevent stale DB entries from polluting E2E starting state.
 */

const BASE_URL = 'http://localhost';

// ---------------------------------------------------------------------------
// Liveness probe — required before any test
// ---------------------------------------------------------------------------
async function waitForServer(url, retries = 10, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Server not ready after ${retries} attempts at ${url}`);
}

// ---------------------------------------------------------------------------
// Minimal assertion helper
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
    return false;
  }
  console.log(`  PASS: ${message}`);
  passed++;
  return true;
}

function assertEqual(actual, expected, label) {
  return assert(
    actual === expected,
    `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

function assertHasKey(obj, key) {
  return assert(
    Object.prototype.hasOwnProperty.call(obj, key),
    `response has key "${key}"`
  );
}

async function run(label, fn) {
  console.log(`\nTest: ${label}`);
  try {
    await fn();
  } catch (err) {
    console.error(`  ERROR (uncaught): ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Waiting for server at http://localhost/api/health …');
  await waitForServer(`${BASE_URL}/api/health`);
  console.log('Server ready. Running API contract tests.\n');

  // Store the id created in test 2 so tests 8 can delete it
  let createdId = null;

  // -------------------------------------------------------------------------
  // 1. Health check
  // -------------------------------------------------------------------------
  await run('GET /api/health → 200 with {status:"ok", timestamp}', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assertEqual(res.status, 200, 'status code');
    const body = await res.json();
    assertEqual(body.status, 'ok', 'body.status');
    assertHasKey(body, 'timestamp');
    assert(typeof body.timestamp === 'string', 'timestamp is a string');
    assert(body.timestamp.length > 0, 'timestamp is non-empty');
  });

  // -------------------------------------------------------------------------
  // 2. Successful calculation — 200
  // -------------------------------------------------------------------------
  await run('POST /api/calculate {expression:"2+3"} → 200, result===5, has id+createdAt', async () => {
    const res = await fetch(`${BASE_URL}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: '2+3' }),
    });
    assertEqual(res.status, 200, 'status code');
    const body = await res.json();
    assertEqual(body.result, 5, 'body.result');
    assertHasKey(body, 'id');
    assert(typeof body.id === 'string' && body.id.length === 24, 'id is a 24-char ObjectId string');
    assertHasKey(body, 'createdAt');
    assert(typeof body.createdAt === 'string', 'createdAt is a string');
    assertEqual(body.expression, '2+3', 'body.expression');
    createdId = body.id;
    console.log(`  INFO: createdId = ${createdId}`);
  });

  // -------------------------------------------------------------------------
  // 3. Empty string expression → 400
  // -------------------------------------------------------------------------
  await run('POST /api/calculate {expression:""} → 400 (empty string)', async () => {
    const res = await fetch(`${BASE_URL}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: '' }),
    });
    assertEqual(res.status, 400, 'status code');
    const body = await res.json();
    assertHasKey(body, 'error');
    assert(typeof body.error === 'string' && body.error.length > 0, 'error message is non-empty string');
  });

  // -------------------------------------------------------------------------
  // 4. Absent expression field → 400  (different code path from empty string)
  // -------------------------------------------------------------------------
  await run('POST /api/calculate {} (expression absent) → 400 (field absent)', async () => {
    const res = await fetch(`${BASE_URL}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assertEqual(res.status, 400, 'status code');
    const body = await res.json();
    assertHasKey(body, 'error');
    assert(typeof body.error === 'string' && body.error.length > 0, 'error message is non-empty string');
  });

  // -------------------------------------------------------------------------
  // 5. Malformed math → 422
  // -------------------------------------------------------------------------
  await run('POST /api/calculate {expression:"2+*3"} → 422 (unevaluable)', async () => {
    const res = await fetch(`${BASE_URL}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: '2+*3' }),
    });
    assertEqual(res.status, 422, 'status code');
    const body = await res.json();
    assertHasKey(body, 'error');
    assert(typeof body.error === 'string' && body.error.length > 0, 'error message is non-empty string');
  });

  // -------------------------------------------------------------------------
  // 6. History — default pagination
  // -------------------------------------------------------------------------
  await run('GET /api/history → 200 with {items, total, page, limit}', async () => {
    const res = await fetch(`${BASE_URL}/api/history`);
    assertEqual(res.status, 200, 'status code');
    const body = await res.json();
    assertHasKey(body, 'items');
    assert(Array.isArray(body.items), 'items is an array');
    assertHasKey(body, 'total');
    assert(typeof body.total === 'number', 'total is a number');
    assertHasKey(body, 'page');
    assert(typeof body.page === 'number', 'page is a number');
    assertHasKey(body, 'limit');
    assert(typeof body.limit === 'number', 'limit is a number');
  });

  // -------------------------------------------------------------------------
  // 7. History — explicit pagination params, items bounded by limit
  // -------------------------------------------------------------------------
  await run('GET /api/history?page=1&limit=5 → 200, items.length <= 5', async () => {
    const res = await fetch(`${BASE_URL}/api/history?page=1&limit=5`);
    assertEqual(res.status, 200, 'status code');
    const body = await res.json();
    assert(Array.isArray(body.items), 'items is an array');
    assert(body.items.length <= 5, `items.length (${body.items.length}) <= 5`);
    assertEqual(body.page, 1, 'body.page');
    assertEqual(body.limit, 5, 'body.limit');
  });

  // -------------------------------------------------------------------------
  // 8. Delete the entry created in test 2
  // -------------------------------------------------------------------------
  await run('DELETE /api/history/:id (valid, existing) → 200 {success:true}', async () => {
    if (!createdId) {
      assert(false, 'skipped — no createdId from test 2 (test 2 must have failed)');
      return;
    }
    const res = await fetch(`${BASE_URL}/api/history/${createdId}`, {
      method: 'DELETE',
    });
    assertEqual(res.status, 200, 'status code');
    const body = await res.json();
    assertHasKey(body, 'success');
    assertEqual(body.success, true, 'body.success');
  });

  // -------------------------------------------------------------------------
  // 9. Delete a valid-format ObjectId that does not exist → 404
  // -------------------------------------------------------------------------
  await run('DELETE /api/history/000000000000000000000000 (valid format, missing) → 404', async () => {
    const res = await fetch(`${BASE_URL}/api/history/000000000000000000000000`, {
      method: 'DELETE',
    });
    assertEqual(res.status, 404, 'status code');
    const body = await res.json();
    assertHasKey(body, 'error');
    assert(typeof body.error === 'string' && body.error.length > 0, 'error message is non-empty string');
  });

  // -------------------------------------------------------------------------
  // 10. Delete with a non-ObjectId string → 404
  // -------------------------------------------------------------------------
  await run('DELETE /api/history/not-an-objectid (invalid format) → 404', async () => {
    const res = await fetch(`${BASE_URL}/api/history/not-an-objectid`, {
      method: 'DELETE',
    });
    assertEqual(res.status, 404, 'status code');
    const body = await res.json();
    assertHasKey(body, 'error');
    assert(typeof body.error === 'string' && body.error.length > 0, 'error message is non-empty string');
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n${'='.repeat(60)}`);
  console.log(`API contract tests complete: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});

'use strict';

const http = require('http');
let passed = 0, failed = 0;
const failures = [];

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = { hostname: 'localhost', port: 3000, path, method, headers: { 'Content-Type': 'application/json', ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}) } };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { let parsed; try { parsed = JSON.parse(data); } catch { parsed = data; } resolve({ status: res.statusCode, body: parsed, headers: res.headers }); });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function assert(label, condition, detail) {
  if (condition) { console.log(`  PASS  ${label}`); passed++; }
  else { console.log(`  FAIL  ${label}`); if (detail) console.log(`        ${detail}`); failed++; failures.push({ label, detail }); }
}

function isISO8601(str) { return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str); }

async function main() {
  console.log('Calculator App — API Contract Tests\n====================================');
  await request('DELETE', '/api/history', null);

  // POST happy path
  console.log('\n=== POST /api/calculate — Happy Path ===');
  for (const [expr, expected] of [['12 + 4', 16], ['100 / 5', 20], ['(3 + 4) * 2', 14], ['10 - 3.5', 6.5]]) {
    const r = await request('POST', '/api/calculate', { expression: expr });
    assert(`${expr}: status 200`, r.status === 200);
    assert(`${expr}: result === ${expected}`, r.body.result === expected);
  }

  // POST errors
  console.log('\n=== POST /api/calculate — Error Cases ===');
  const r1 = await request('POST', '/api/calculate', { expression: '5 / 0' });
  assert('5/0: status 400', r1.status === 400);
  assert('5/0: Division by zero', r1.body.error === 'Division by zero');

  // GET history, DELETE history, content-type checks...
  console.log('\n====================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(2); });

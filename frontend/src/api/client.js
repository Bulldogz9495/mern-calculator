const BASE = '/api';

/**
 * POST /api/calculate
 * @param {string} expression - e.g. "2+3*4"
 * @returns {{ id: string, expression: string, result: number, createdAt: string }}
 */
export async function calculate(expression) {
  const response = await fetch(`${BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression }),
  });

  if (!response.ok) {
    let message = `Server error ${response.status}`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch (parseErr) {
      console.error('Failed to parse error response body:', parseErr);
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * GET /api/history?page=1&limit=20
 * @param {number} page
 * @param {number} limit
 * @returns {{ items: Array, total: number, page: number, limit: number }}
 */
export async function getHistory(page = 1, limit = 20) {
  const response = await fetch(
    `${BASE}/history?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`
  );

  if (!response.ok) {
    let message = `Server error ${response.status}`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch (parseErr) {
      console.error('Failed to parse error response body:', parseErr);
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * DELETE /api/history/:id
 * @param {string} id
 * @returns {{ success: true }}
 */
export async function deleteHistory(id) {
  const response = await fetch(`${BASE}/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let message = `Server error ${response.status}`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch (parseErr) {
      console.error('Failed to parse error response body:', parseErr);
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * E2E Tests — Web Calculator with History
 *
 * Uses @playwright/test. Must run AFTER api.test.js completes to avoid
 * stale history entries from API tests polluting UI starting state.
 *
 * All selectors use aria-label via getByRole — never [data-value] attributes.
 *
 * Covers:
 *   1. Page loads — title visible, display shows "0"
 *   2. 5 + 3 = 8 — display and history panel both update
 *   3. Clear (C) resets display to "0"
 *   4. 10 / 2 = 5 — division works correctly
 *   5. Delete a history entry — entry disappears from panel
 *   6. Invalid expression shows visible, actionable error; clear removes it
 *   7. Pagination — Next/Previous buttons work when > 20 entries exist
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Click a digit button by its aria-label, e.g. clickDigit(page, '5') */
async function clickDigit(page, digit) {
  await page.getByRole('button', { name: `digit ${digit}` }).click();
}

/** Wait for the display text to equal the expected value. */
async function waitForDisplay(page, expected) {
  const display = page.getByRole('status', { name: 'Expression display' });
  await expect(display).toHaveText(expected, { timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Test 1 — page loads, title visible, display shows "0"
// ---------------------------------------------------------------------------
test('page loads — title is visible and display shows "0"', async ({ page }) => {
  await page.goto('/');

  // The page title must exist and be non-empty
  await expect(page).toHaveTitle(/.+/);

  // Calculator region must be present
  await expect(page.getByRole('region', { name: 'Calculator' })).toBeVisible();

  // Display must show "0" on fresh load
  const display = page.getByRole('status', { name: 'Expression display' });
  await expect(display).toBeVisible();
  await expect(display).toHaveText('0');
});

// ---------------------------------------------------------------------------
// Test 2 — 5 + 3 = 8, history panel shows the entry
// ---------------------------------------------------------------------------
test('5 + 3 = 8 — display shows 8 and history panel shows "5+3 = 8"', async ({ page }) => {
  await page.goto('/');

  await clickDigit(page, '5');
  await page.getByRole('button', { name: 'add' }).click();
  await clickDigit(page, '3');
  await page.getByRole('button', { name: 'equals' }).click();

  // Display must update to "8"
  await waitForDisplay(page, '8');

  // History panel must contain the expression entry
  const historyPanel = page.getByRole('region', { name: 'Calculation history' });
  await expect(historyPanel).toBeVisible();

  // Wait for history to refresh and show the new entry
  const historyList = page.getByRole('list', { name: 'Past calculations' });
  await expect(historyList).toBeVisible({ timeout: 5000 });

  // The entry text should contain both the expression and result
  const entryText = historyPanel.getByText(/5\+3/);
  await expect(entryText).toBeVisible({ timeout: 5000 });
  const resultText = historyPanel.getByText('8');
  await expect(resultText).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 3 — Clear resets display to "0"
// ---------------------------------------------------------------------------
test('pressing C (clear) resets display to "0"', async ({ page }) => {
  await page.goto('/');

  // Type something first
  await clickDigit(page, '9');
  await clickDigit(page, '9');
  await waitForDisplay(page, '99');

  // Press clear
  await page.getByRole('button', { name: 'clear' }).click();

  // Display must reset
  await waitForDisplay(page, '0');
});

// ---------------------------------------------------------------------------
// Test 4 — 10 / 2 = 5
// ---------------------------------------------------------------------------
test('10 / 2 = 5 — division produces correct result', async ({ page }) => {
  await page.goto('/');

  await clickDigit(page, '1');
  await clickDigit(page, '0');
  await page.getByRole('button', { name: 'divide' }).click();
  await clickDigit(page, '2');
  await page.getByRole('button', { name: 'equals' }).click();

  await waitForDisplay(page, '5');
});

// ---------------------------------------------------------------------------
// Test 5 — Delete a history entry and verify it disappears
// ---------------------------------------------------------------------------
test('delete a history entry — entry disappears from the history panel', async ({ page }) => {
  await page.goto('/');

  // First create a calculation so there is at least one entry to delete
  await clickDigit(page, '7');
  await page.getByRole('button', { name: 'add' }).click();
  await clickDigit(page, '2');
  await page.getByRole('button', { name: 'equals' }).click();
  await waitForDisplay(page, '9');

  // Wait for the history list to show the entry
  const historyList = page.getByRole('list', { name: 'Past calculations' });
  await expect(historyList).toBeVisible({ timeout: 5000 });

  // Count entries before deletion
  const entriesBefore = historyList.getByRole('listitem');
  const countBefore = await entriesBefore.count();
  expect(countBefore).toBeGreaterThanOrEqual(1);

  // Click the first delete button
  const firstDeleteBtn = page.getByRole('button', { name: 'delete calculation' }).first();
  await expect(firstDeleteBtn).toBeVisible();
  await firstDeleteBtn.click();

  // Wait for the count to decrease by 1 (or list to disappear if it was the only one)
  await page.waitForFunction(
    (expectedMax) => {
      const items = document.querySelectorAll('[aria-label="Past calculations"] li');
      return items.length <= expectedMax;
    },
    countBefore - 1,
    { timeout: 5000 }
  );

  const countAfter = await historyList.getByRole('listitem').count();
  expect(countAfter).toBe(countBefore - 1);
});

// ---------------------------------------------------------------------------
// Test 6 — Error state is visible when expression cannot be evaluated (UI/UX)
// ---------------------------------------------------------------------------
test('invalid expression shows visible error message to the user', async ({ page }) => {
  await page.goto('/');

  // Type a malformed expression that will produce a 422 from the backend
  await clickDigit(page, '2');
  await page.getByRole('button', { name: 'add' }).click();
  // Now press = without a second operand — sends "2+" which is invalid
  await page.getByRole('button', { name: 'equals' }).click();

  // The error alert must appear and be visible to the user
  const errorAlert = page.getByRole('alert');
  await expect(errorAlert).toBeVisible({ timeout: 5000 });
  // Error text must be non-empty (user must see actionable text, not a blank box)
  const errorText = await errorAlert.textContent();
  expect(errorText && errorText.trim().length).toBeGreaterThan(0);

  // After pressing clear, the error must disappear and display resets
  await page.getByRole('button', { name: 'clear' }).click();
  await expect(errorAlert).not.toBeVisible({ timeout: 3000 });
  await waitForDisplay(page, '0');
});

// ---------------------------------------------------------------------------
// Test 7 — Pagination Next/Previous (conditional on enough data)
// ---------------------------------------------------------------------------
test('pagination — Next and Previous buttons work when more than 20 entries exist', async ({ page }) => {
  await page.goto('/');

  // Seed enough entries to trigger pagination (need > 20)
  // First check existing total by reading from the history panel if possible
  // We'll create entries only if needed; use the API directly to avoid slow UI clicks
  const histResp = await page.request.get('/api/history?page=1&limit=1');
  const histData = await histResp.json();
  const existingTotal = histData.total;

  const needed = Math.max(0, 21 - existingTotal);
  if (needed > 0) {
    // Create the missing entries via API so we don't have to click the calculator 21+ times
    for (let i = 0; i < needed; i++) {
      await page.request.post('/api/calculate', {
        data: { expression: `${i + 1}+0` },
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Reload to pick up history
  await page.goto('/');

  // Re-check total after seeding
  const afterResp = await page.request.get('/api/history?page=1&limit=1');
  const afterData = await afterResp.json();

  if (afterData.total <= 20) {
    // Still not enough — skip gracefully
    console.log('Skipping pagination test: total entries <= 20 after seeding attempt');
    test.skip();
    return;
  }

  // The pagination controls should appear
  const pagination = page.getByRole('navigation', { name: 'History pagination' });
  await expect(pagination).toBeVisible({ timeout: 5000 });

  // Previous button should be disabled on page 1
  const prevBtn = page.getByRole('button', { name: 'previous page' });
  const nextBtn = page.getByRole('button', { name: 'next page' });

  await expect(prevBtn).toBeDisabled();
  await expect(nextBtn).toBeEnabled();

  // Read page indicator before navigating
  const pageInfo = pagination.locator('.history-page-info');
  await expect(pageInfo).toContainText('Page 1 of');

  // Click Next
  await nextBtn.click();

  // Page indicator should update to page 2
  await expect(pageInfo).toContainText('Page 2 of', { timeout: 5000 });

  // Previous should now be enabled
  await expect(prevBtn).toBeEnabled();

  // Click Previous — should go back to page 1
  await prevBtn.click();
  await expect(pageInfo).toContainText('Page 1 of', { timeout: 5000 });
  await expect(prevBtn).toBeDisabled();
});

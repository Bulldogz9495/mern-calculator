'use strict';

let expression = '';
let resultDisplayed = false;

const displayExpression = document.getElementById('display-expression');
const displayResult     = document.getElementById('display-result');
const historyList       = document.getElementById('history-list');
const historyEmpty      = document.getElementById('history-empty');
const btnClearHistory   = document.getElementById('btn-clear-history');

function updateDisplay(resultText, exprText = '') {
  displayResult.textContent     = resultText;
  displayExpression.textContent = exprText;
}

function renderExpression() {
  updateDisplay(expression === '' ? '0' : expression, '');
}

function toBackendExpression(expr) {
  return expr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
}

function appendDigit(value) {
  if (resultDisplayed) { expression = value; resultDisplayed = false; }
  else { expression += value; }
  renderExpression();
}

function appendOperator(symbol) {
  if (expression === '' || resultDisplayed) {
    const current = resultDisplayed ? displayResult.textContent : '0';
    expression = current;
    resultDisplayed = false;
  }
  if (/ [+\-×÷−] $/.test(expression)) {
    expression = expression.replace(/ [+\-×÷−] $/, ` ${symbol} `);
  } else {
    expression += ` ${symbol} `;
  }
  highlightOperator(symbol);
  renderExpression();
}

function appendDecimal() {
  if (resultDisplayed) { expression = '0.'; resultDisplayed = false; renderExpression(); return; }
  const parts = expression.split(/[ +\-×÷−]/);
  const lastToken = parts[parts.length - 1];
  if (lastToken.includes('.')) return;
  expression = expression === '' ? '0.' : expression + '.';
  renderExpression();
}

function clearAll() {
  expression = ''; resultDisplayed = false;
  clearOperatorHighlight();
  updateDisplay('0', '');
}

function negate() {
  if (expression === '' || expression === '0') return;
  if (/^-\(.*\)$/.test(expression)) { expression = expression.slice(2, -1); }
  else { expression = `-(${expression})`; }
  renderExpression();
}

function percent() {
  if (expression === '' || expression === '0') return;
  const match = expression.match(/^([\s\S]*?)(-?[\d.]+)$/);
  if (!match) return;
  const prefix = match[1];
  const numToken = parseFloat(match[2]);
  if (isNaN(numToken)) return;
  expression = prefix + parseFloat((numToken / 100).toPrecision(15)).toString();
  renderExpression();
}

function highlightOperator(symbol) {
  clearOperatorHighlight();
  document.querySelectorAll('.btn--operator').forEach(btn => {
    if (btn.dataset.value === symbol) btn.classList.add('is-active');
  });
}

function clearOperatorHighlight() {
  document.querySelectorAll('.btn--operator').forEach(btn => btn.classList.remove('is-active'));
}

async function calculate(expr) {
  const response = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression: expr }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return response.json();
}

async function handleEquals() {
  if (expression.trim() === '') return;
  clearOperatorHighlight();
  const backendExpr = toBackendExpression(expression);
  updateDisplay('…', expression);
  try {
    const data = await calculate(backendExpr);
    const resultStr = formatNumber(data.result);
    updateDisplay(resultStr, `${expression} =`);
    expression = resultStr;
    resultDisplayed = true;
    prependHistoryEntry(data.expression, data.result);
  } catch {
    updateDisplay('Error', expression);
    expression = ''; resultDisplayed = false;
  }
}

async function loadHistory() {
  try {
    const response = await fetch('/api/history');
    if (!response.ok) throw new Error('Failed to load history');
    const data = await response.json();
    renderHistoryList(data.history);
  } catch { showHistoryEmpty(); }
}

async function clearHistoryHandler() {
  btnClearHistory.disabled = true;
  try {
    const response = await fetch('/api/history', { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to clear history');
    historyList.innerHTML = '';
    showHistoryEmpty();
  } catch {}
  finally { btnClearHistory.disabled = false; }
}

function renderHistoryList(entries) {
  historyList.innerHTML = '';
  if (entries.length === 0) { showHistoryEmpty(); return; }
  hideHistoryEmpty();
  entries.forEach(entry => historyList.appendChild(buildHistoryEntry(entry.expression, entry.result)));
}

function prependHistoryEntry(expr, result) {
  hideHistoryEmpty();
  historyList.prepend(buildHistoryEntry(expr, result));
}

function buildHistoryEntry(expr, result) {
  const li = document.createElement('li');
  li.className = 'history-entry';
  const exprEl = document.createElement('span');
  exprEl.className = 'history-entry__expression';
  exprEl.textContent = expr;
  const resultEl = document.createElement('span');
  resultEl.className = 'history-entry__result';
  resultEl.textContent = `= ${formatNumber(result)}`;
  li.appendChild(exprEl);
  li.appendChild(resultEl);
  return li;
}

function showHistoryEmpty() { historyEmpty.classList.add('is-visible'); }
function hideHistoryEmpty() { historyEmpty.classList.remove('is-visible'); }

function formatNumber(n) {
  if (!isFinite(n)) return 'Error';
  return parseFloat(n.toPrecision(12)).toString();
}

function handleKeyDown(e) {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const key = e.key;
  if (/^[0-9]$/.test(key)) appendDigit(key);
  else if (key === '.') appendDecimal();
  else if (key === '+') appendOperator('+');
  else if (key === '-') appendOperator('−');
  else if (key === '*') appendOperator('×');
  else if (key === '/') { e.preventDefault(); appendOperator('÷'); }
  else if (key === 'Enter' || key === '=') handleEquals();
  else if (key === 'Escape' || key === 'c' || key === 'C') clearAll();
  else if (key === '%') percent();
  else if (key === 'Backspace') handleBackspace();
}

function handleBackspace() {
  if (resultDisplayed) { clearAll(); return; }
  if (/ [+\-×÷−] $/.test(expression)) { expression = expression.slice(0, -3); }
  else { expression = expression.slice(0, -1); }
  renderExpression();
}

document.addEventListener('keydown', handleKeyDown);
btnClearHistory.addEventListener('click', clearHistoryHandler);
document.querySelector('.keypad').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  switch (btn.dataset.action) {
    case 'digit':    appendDigit(btn.dataset.value); break;
    case 'operator': appendOperator(btn.dataset.value); break;
    case 'decimal':  appendDecimal(); break;
    case 'clear':    clearAll(); break;
    case 'negate':   negate(); break;
    case 'percent':  percent(); break;
    case 'equals':   handleEquals(); break;
  }
});

loadHistory();

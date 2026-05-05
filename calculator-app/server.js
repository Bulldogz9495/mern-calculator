'use strict';

const path = require('path');
const express = require('express');
const { evaluate, ParseError, DivisionByZeroError } = require('./parser');
const { saveCalculation, getHistory, clearHistory } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/calculate', (req, res) => {
  const { expression } = req.body || {};
  if (typeof expression !== 'string' || expression.trim() === '') {
    return res.status(400).json({ error: 'Invalid expression' });
  }
  let result;
  try {
    result = evaluate(expression);
  } catch (err) {
    if (err instanceof DivisionByZeroError) return res.status(400).json({ error: 'Division by zero' });
    if (err instanceof ParseError) return res.status(400).json({ error: 'Invalid expression' });
    console.error('Unexpected evaluate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  let row;
  try {
    row = saveCalculation(expression, result);
  } catch (err) {
    console.error('Database write error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  return res.status(200).json({ expression: row.expression, result: row.result, id: row.id, created_at: row.created_at });
});

app.get('/api/history', (req, res) => {
  let rows;
  try { rows = getHistory(); } catch (err) {
    console.error('Database read error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  return res.status(200).json({ history: rows });
});

app.delete('/api/history', (req, res) => {
  let deleted;
  try { deleted = clearHistory(); } catch (err) {
    console.error('Database delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  return res.status(200).json({ deleted });
});

app.use('/api', (req, res) => { res.status(404).json({ error: 'Not found' }); });

app.listen(PORT, () => { console.log(`Calculator API listening on http://localhost:${PORT}`); });

module.exports = app;

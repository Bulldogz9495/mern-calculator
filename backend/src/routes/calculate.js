'use strict';

const { Router } = require('express');
const { create, all } = require('mathjs');
const Calculation = require('../models/Calculation');

// Create a scoped mathjs instance with all functions available.
// Using a limited scope avoids accidentally exposing non-math identifiers
// while still supporting the full standard function set.
const math = create(all);

const router = Router();

/**
 * POST /api/calculate
 *
 * Body: { expression: string }
 *
 * Validation:
 *   - Missing body or missing `expression` field → 400
 *   - Empty string expression → 400
 *   - Expression that math.evaluate cannot handle → 422
 *
 * On success saves the calculation to MongoDB and returns:
 *   { id, expression, result, createdAt }
 *
 * SECURITY: math.evaluate() is used — raw eval() is never called on user input.
 */
router.post('/', async (req, res, next) => {
  try {
    // --- Input validation ---
    const body = req.body;

    if (!body || body.expression === undefined || body.expression === null) {
      return res.status(400).json({ error: 'expression is required' });
    }

    const expression = String(body.expression).trim();

    if (expression.length === 0) {
      return res.status(400).json({ error: 'expression must not be empty' });
    }

    // --- Safe evaluation via mathjs ---
    let result;
    try {
      result = math.evaluate(expression);
    } catch {
      return res.status(422).json({ error: 'Expression could not be evaluated' });
    }

    // math.evaluate can return non-numeric values (e.g. matrices, units).
    // Only persist plain finite numbers.
    if (typeof result !== 'number' || !isFinite(result)) {
      return res
        .status(422)
        .json({ error: 'Expression did not produce a finite numeric result' });
    }

    // --- Persist ---
    const doc = await Calculation.create({ expression, result });

    return res.status(200).json({
      id: doc._id.toString(),
      expression: doc.expression,
      result: doc.result,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

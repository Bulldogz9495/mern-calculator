'use strict';

const { Router } = require('express');

const router = Router();

/**
 * GET /api/health
 *
 * Lightweight liveness probe.
 * Returns { status: "ok", timestamp: "<iso8601>" }.
 */
router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;

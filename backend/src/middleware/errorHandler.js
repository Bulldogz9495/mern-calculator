'use strict';

/**
 * Global Express error handler.
 *
 * Receives errors passed via next(err).  Returns a JSON body with an
 * `error` field so every error response is consistent with the API contract.
 *
 * @param {Error}             err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next  - must be declared even if unused (Express signature)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // Do not leak internal stack traces to clients in production
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (status === 500) {
    // eslint-disable-next-line no-console
    console.error('[errorHandler]', err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;

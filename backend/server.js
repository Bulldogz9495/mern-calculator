'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Route modules
const calculateRouter = require('./src/routes/calculate');
const historyRouter = require('./src/routes/history');
const healthRouter = require('./src/routes/health');

// Global error handler (must be last middleware)
const errorHandler = require('./src/middleware/errorHandler');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3001', 10);
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/calculator';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------
const app = express();

// Security headers
app.use(helmet());

// CORS — origin is configurable via env so staging/prod can restrict it
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// Body parsing — 10 kb hard limit prevents payload DoS
app.use(express.json({ limit: '10kb' }));

// Rate limiting — 100 requests per 15-minute window per IP on all /api/ routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/health', healthRouter);
app.use('/api/calculate', calculateRouter);
app.use('/api/history', historyRouter);

// 404 handler for unmatched routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler — must be registered after all routes
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Startup — only begin listening after a successful MongoDB connection
// ---------------------------------------------------------------------------
let server;

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, {
      // Use strict query mode (Mongoose 7+ default, explicit for clarity)
      strictQuery: true,
    });
    // eslint-disable-next-line no-console
    console.log(`[server] MongoDB connected: ${MONGODB_URI}`);

    server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] Listening on port ${PORT}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown on SIGTERM (e.g. Docker stop, K8s pod termination)
// ---------------------------------------------------------------------------
process.on('SIGTERM', async () => {
  // eslint-disable-next-line no-console
  console.log('[server] SIGTERM received — shutting down gracefully');

  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      // eslint-disable-next-line no-console
      console.log('[server] Shutdown complete');
      process.exit(0);
    });
  } else {
    await mongoose.connection.close();
    process.exit(0);
  }
});

start();

// Export app for testing without starting the server
module.exports = app;

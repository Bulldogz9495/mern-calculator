'use strict';

const mongoose = require('mongoose');

const calculationSchema = new mongoose.Schema(
  {
    expression: {
      type: String,
      required: true,
      trim: true,
    },
    result: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Disable the default versionKey (__v) — not needed here
    versionKey: false,
    // Disable the built-in timestamps option; we manage createdAt manually
    // so that the schema field is explicit and indexed.
    timestamps: false,
  }
);

// Index for sorted history queries (newest first)
calculationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Calculation', calculationSchema);

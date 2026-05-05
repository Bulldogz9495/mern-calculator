'use strict';

const { Router } = require('express');
const Calculation = require('../models/Calculation');

const router = Router();

const ID_PATTERN = /^[a-fA-F0-9]{24}$/;

/**
 * Map a Mongoose document to the API response shape.
 * @param {import('mongoose').Document} doc
 */
function mapDoc(doc) {
  return {
    id: doc._id.toString(),
    expression: doc.expression,
    result: doc.result,
    createdAt: doc.createdAt,
  };
}

/**
 * GET /api/history?page=1&limit=20
 *
 * Returns paginated history sorted newest-first.
 * Max limit: 100.
 */
router.get('/', async (req, res, next) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Calculation.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Calculation.countDocuments({}),
    ]);

    return res.json({
      items: docs.map(mapDoc),
      total,
      page,
      limit,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/history/:id
 *
 * Validates the id is a valid 24-hex ObjectId string.
 * Returns 404 if the format is wrong OR if the document does not exist.
 * Returns { success: true } on successful deletion.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ID_PATTERN.test(id)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const deleted = await Calculation.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

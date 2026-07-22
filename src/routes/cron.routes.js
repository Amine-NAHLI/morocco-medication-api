const crypto = require('crypto');
const express = require('express');
const { getHttpConfig } = require('../config/env');
const { runCnops } = require('../services/scheduler.service');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

const hasValidCronSecret = (authorization, secret) => {
  if (!secret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authorization);
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
};

router.get('/cnops', catchAsync(async (req, res) => {
  if (!hasValidCronSecret(req.get('authorization'), process.env.CRON_SECRET)) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  if (!getHttpConfig().schedulerEnabled) {
    return res.status(204).end();
  }

  const result = await runCnops();
  return res.status(result.success === false ? 500 : 200).json({ status: 'success', data: result });
}));

module.exports = router;

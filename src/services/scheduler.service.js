const cnopsConnector = require('./connectors/cnops.connector');
const logger = require('../utils/logger');

let timer;
let running = false;
const runCnops = async () => {
  if (running) return { skipped: true, reason: 'CNOPS sync already running' };
  running = true;
  try { return await cnopsConnector.syncDatabase(); }
  catch (error) { logger.error(`Scheduled CNOPS sync failed: ${error.message}`); return { success: false }; }
  finally { running = false; }
};
const startScheduler = (enabled, intervalMs) => {
  if (!enabled || timer) return;
  timer = setInterval(() => { runCnops(); }, intervalMs);
  timer.unref();
  logger.info(`CNOPS scheduler enabled every ${intervalMs}ms`);
};
const stopScheduler = () => { if (timer) clearInterval(timer); timer = undefined; };
module.exports = { runCnops, startScheduler, stopScheduler };

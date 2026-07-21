jest.mock('../../src/services/connectors/cnops.connector', () => ({ syncDatabase: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const connector = require('../../src/services/connectors/cnops.connector');
const logger = require('../../src/utils/logger');
const scheduler = require('../../src/services/scheduler.service');

describe('Scheduler service', () => {
  afterEach(() => {
    scheduler.stopScheduler();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('does not start when disabled', () => {
    scheduler.startScheduler(false, 1000);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('runs CNOPS and prevents concurrent executions', async () => {
    let resolve;
    connector.syncDatabase.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const first = scheduler.runCnops();
    await expect(scheduler.runCnops()).resolves.toEqual(expect.objectContaining({ skipped: true }));
    resolve({ success: true });
    await expect(first).resolves.toEqual({ success: true });
  });

  it('logs a connector failure without throwing', async () => {
    connector.syncDatabase.mockRejectedValue(new Error('network down'));
    await expect(scheduler.runCnops()).resolves.toEqual({ success: false });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('network down'));
  });

  it('starts one unreferenced timer and can stop it', () => {
    jest.useFakeTimers();
    scheduler.startScheduler(true, 1000);
    expect(logger.info).toHaveBeenCalled();
    scheduler.startScheduler(true, 1000);
    jest.advanceTimersByTime(1000);
    expect(connector.syncDatabase).toHaveBeenCalledTimes(1);
  });
});

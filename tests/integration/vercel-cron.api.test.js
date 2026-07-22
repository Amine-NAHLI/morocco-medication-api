const request = require('supertest');

jest.mock('../../src/config/prisma');
jest.mock('../../src/services/scheduler.service', () => ({ runCnops: jest.fn() }));

const scheduler = require('../../src/services/scheduler.service');
const app = require('../../src/app');

describe('Vercel CNOPS cron endpoint', () => {
  const original = {
    cronSecret: process.env.CRON_SECRET,
    nodeEnv: process.env.NODE_ENV,
    schedulerEnabled: process.env.SYNC_SCHEDULER_ENABLED,
  };

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.NODE_ENV = 'development';
    process.env.SYNC_SCHEDULER_ENABLED = 'false';
    scheduler.runCnops.mockReset();
  });

  afterAll(() => {
    const restore = (key, value) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('CRON_SECRET', original.cronSecret);
    restore('NODE_ENV', original.nodeEnv);
    restore('SYNC_SCHEDULER_ENABLED', original.schedulerEnabled);
  });

  test('rejects a request that does not carry the configured Cron secret', async () => {
    const response = await request(app).get('/api/cron/cnops');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ status: 'error', message: 'Unauthorized' });
    expect(scheduler.runCnops).not.toHaveBeenCalled();
  });

  test('rejects an incorrect Cron secret', async () => {
    const response = await request(app)
      .get('/api/cron/cnops')
      .set('Authorization', 'Bearer wrong-cron-secret');

    expect(response.status).toBe(401);
    expect(scheduler.runCnops).not.toHaveBeenCalled();
  });

  test('does not run when the scheduler is disabled', async () => {
    const response = await request(app)
      .get('/api/cron/cnops')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET}`);

    expect(response.status).toBe(204);
    expect(scheduler.runCnops).not.toHaveBeenCalled();
  });

  test('uses the existing scheduler when enabled', async () => {
    process.env.SYNC_SCHEDULER_ENABLED = 'true';
    scheduler.runCnops.mockResolvedValue({ success: true, status: 'SYNC_SUCCESS' });

    const response = await request(app)
      .get('/api/cron/cnops')
      .set('Authorization', `Bearer ${process.env.CRON_SECRET}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: { success: true, status: 'SYNC_SUCCESS' } });
    expect(scheduler.runCnops).toHaveBeenCalledTimes(1);
  });
});

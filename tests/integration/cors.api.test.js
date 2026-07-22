const request = require('supertest');
jest.mock('../../src/config/prisma');
const app = require('../../src/app');
const prismaMock = require('../../src/config/prisma');

describe('CORS', () => {
  const allowedOrigins = ['http://127.0.0.1:5500', 'http://localhost:5500'];

  test.each(allowedOrigins)('allows preflight requests from %s', async (origin) => {
    const response = await request(app)
      .options('/api/v1/medications')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(response.headers['access-control-allow-methods']).toContain('OPTIONS');
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type,Authorization');
  });

  test('adds the CORS header to the medications request used by Live Server', async () => {
    prismaMock.medication.findMany.mockResolvedValue([]);
    prismaMock.medication.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/v1/medications?limit=10&page=1')
      .set('Origin', 'http://127.0.0.1:5500');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5500');
  });

  test('rejects a request from an unconfigured origin', async () => {
    const response = await request(app)
      .options('/api/v1/medications')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

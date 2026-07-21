const request = require('supertest');
const app = require('../../src/app');

describe('Swagger UI', () => {
  test('serves the valid OpenAPI document through /api/docs', async () => {
    const response = await request(app).get('/api/docs/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('swagger-ui');
  });
});

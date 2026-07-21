const request = require('supertest');
const app = require('../../src/app');
jest.mock('../../src/config/prisma');
const prismaMock = require('../../src/config/prisma');
const jwt = require('jsonwebtoken');

// Generate a valid admin token for protected route tests
const adminToken = jwt.sign(
  { id: 1, email: 'admin@test.com', role: 'ADMIN' },
  process.env.JWT_SECRET || 'dev-secret-key',
  { expiresIn: '1h' }
);

const entities = [
  { name: 'Organization', path: '/api/v1/organizations', model: 'organization' },
  { name: 'Manufacturer', path: '/api/v1/manufacturers', model: 'manufacturer' },
  { name: 'Category', path: '/api/v1/categories', model: 'category' },
  { name: 'ActiveIngredient', path: '/api/v1/active-ingredients', model: 'activeIngredient' },
  { name: 'Medication', path: '/api/v1/medications', model: 'medication' },
  { name: 'MedicationIngredient', path: '/api/v1/medication-ingredients', model: 'medicationIngredient' },
  { name: 'Reimbursement', path: '/api/v1/reimbursements', model: 'reimbursement' },
  { name: 'ImportHistory', path: '/api/v1/import-histories', model: 'importHistory' },
];

describe('Generic CRUD API Tests', () => {
  entities.forEach(entity => {
    describe(`${entity.name} API`, () => {
      
      it(`should GET all ${entity.name}`, async () => {
        prismaMock[entity.model].findMany.mockResolvedValue([{ id: 1 }]);
        prismaMock[entity.model].count.mockResolvedValue(1);

        const res = await request(app).get(entity.path);
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveLength(1);
      });

      it(`should GET all ${entity.name} with pagination and sorting`, async () => {
        prismaMock[entity.model].findMany.mockResolvedValue([{ id: 1 }]);
        prismaMock[entity.model].count.mockResolvedValue(1);

        const res = await request(app).get(`${entity.path}?page=2&limit=5&sortBy=name&order=asc&search=test`);
        expect(res.statusCode).toBe(200);
      });

      it(`should GET a specific ${entity.name} by ID`, async () => {
        prismaMock[entity.model].findUnique.mockResolvedValue({ id: 1 });
        const res = await request(app).get(`${entity.path}/1`);
        expect(res.statusCode).toBe(200);
      });

      it(`should return 404 for non-existent ${entity.name}`, async () => {
        prismaMock[entity.model].findUnique.mockResolvedValue(null);
        const res = await request(app).get(`${entity.path}/999`);
        expect(res.statusCode).toBe(404);
      });

      it(`should POST (create) a new ${entity.name} with auth`, async () => {
        prismaMock[entity.model].create.mockResolvedValue({ id: 1 });
        const res = await request(app)
          .post(entity.path)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});
        expect(res.statusCode).toBe(201);
      });

      it(`should reject POST without auth for ${entity.name}`, async () => {
        const res = await request(app).post(entity.path).send({});
        expect(res.statusCode).toBe(401);
      });

      it(`should PUT (update) an existing ${entity.name} with auth`, async () => {
        prismaMock[entity.model].update.mockResolvedValue({ id: 1 });
        const res = await request(app)
          .put(`${entity.path}/1`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});
        expect(res.statusCode).toBe(200);
      });

      it(`should reject PUT without auth for ${entity.name}`, async () => {
        const res = await request(app).put(`${entity.path}/1`).send({});
        expect(res.statusCode).toBe(401);
      });

      it(`should DELETE an existing ${entity.name} with auth`, async () => {
        prismaMock[entity.model].delete.mockResolvedValue({ id: 1 });
        const res = await request(app)
          .delete(`${entity.path}/1`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(204);
      });

      it(`should reject DELETE without auth for ${entity.name}`, async () => {
        const res = await request(app).delete(`${entity.path}/1`);
        expect(res.statusCode).toBe(401);
      });

    });
  });
});

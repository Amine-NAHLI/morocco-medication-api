const request = require('supertest');
const app = require('../../src/app');
jest.mock('../../src/config/prisma');
const prisma = require('../../src/config/prisma');

describe('Medication filters', () => {
  it('builds every supported public filter and accepts a safe sort', async () => {
    prisma.medication.findMany.mockResolvedValue([]);
    prisma.medication.count.mockResolvedValue(0);
    const res = await request(app).get('/api/v1/medications?status=ACTIVE&manufacturerId=1&categoryId=2&generic=true&search=para&ingredient=paracetamol&organizationId=3&reimbursable=true&sortBy=name&order=asc&page=2&limit=500');
    expect(res.statusCode).toBe(200);
    expect(prisma.medication.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, orderBy: { name: 'asc' } }));
  });

  it('falls back safely when pagination and sort are invalid', async () => {
    prisma.medication.findMany.mockResolvedValue([]);
    prisma.medication.count.mockResolvedValue(0);
    const res = await request(app).get('/api/v1/medications?page=-1&limit=bad&sortBy=unexpected&order=DROP');
    expect(res.statusCode).toBe(200);
    expect(prisma.medication.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10, orderBy: { createdAt: 'desc' } }));
  });
});

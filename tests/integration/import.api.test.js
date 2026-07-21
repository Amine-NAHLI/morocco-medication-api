const request = require('supertest');
const app = require('../../src/app');
const prismaMock = require('../../src/config/prisma');
const xlsx = require('xlsx');

describe('Import API', () => {
  it('should successfully upload and process an Excel file', async () => {
    // Mock the ImportHistory creation
    prismaMock.importHistory.create.mockResolvedValue({ id: 1 });
    prismaMock.importHistory.update.mockResolvedValue({ id: 1, status: 'SUCCESS' });
    
    // Mock the Transaction
    prismaMock.$transaction.mockImplementation(async (callback) => {
       return callback(prismaMock);
    });

    // Mock upserts inside the transaction
    prismaMock.manufacturer.upsert.mockResolvedValue({ id: 1 });
    prismaMock.category.upsert.mockResolvedValue({ id: 1 });
    prismaMock.medication.findUnique.mockResolvedValue(null);
    prismaMock.medication.upsert.mockResolvedValue({ id: 1 });
    prismaMock.activeIngredient.upsert.mockResolvedValue({ id: 1 });
    prismaMock.medicationIngredient.upsert.mockResolvedValue({ id: 1 });
    prismaMock.organization.upsert.mockResolvedValue({ id: 1 });
    prismaMock.reimbursement.upsert.mockResolvedValue({ id: 1 });

    // Generate a valid dummy excel buffer
    const mockData = [{ 
      code: '123', 
      name: 'Med', 
      manufacturer: 'Lab',
      category: 'Cat',
      active_ingredient: 'Ing1',
      organization: 'CNOPS',
      base_price: 10
    }];
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(mockData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app)
      .post('/api/v1/import/excel')
      .attach('file', buffer, 'test.xlsx');
      
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('should return 400 if no file is provided', async () => {
    const res = await request(app).post('/api/v1/import/excel');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Please upload an Excel file');
  });
});

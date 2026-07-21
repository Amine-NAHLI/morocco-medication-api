const request = require('supertest');
const app = require('../../src/app');
jest.mock('../../src/config/prisma');
const prismaMock = require('../../src/config/prisma');
const jwt = require('jsonwebtoken');

const cnopsConnector = require('../../src/services/connectors/cnops.connector');
const cnssConnector = require('../../src/services/connectors/cnss.connector');
const anamConnector = require('../../src/services/connectors/anam.connector');

// Generate a valid admin token
const adminToken = jwt.sign(
  { id: 1, email: 'admin@test.com', role: 'ADMIN' },
  process.env.JWT_SECRET || 'dev-secret-key',
  { expiresIn: '1h' }
);

describe('Sync API', () => {
  describe('CNOPS', () => {
    it('should trigger CNOPS sync', async () => {
      jest.spyOn(cnopsConnector, 'syncDatabase').mockResolvedValue({ success: true, status: 'SYNC_SUCCESS' });
      
      const res = await request(app)
        .post('/api/v1/sync/cnops')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('CNSS', () => {
    it('should trigger CNSS sync', async () => {
      jest.spyOn(cnssConnector, 'syncDatabase').mockResolvedValue({ success: false, status: 'SOURCE_NOT_AUTOMATABLE' });
      
      const res = await request(app)
        .post('/api/v1/sync/cnss')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('ANAM', () => {
    it('should trigger ANAM sync', async () => {
      jest.spyOn(anamConnector, 'syncDatabase').mockResolvedValue({ success: false, status: 'SOURCE_NOT_AUTOMATABLE' });
      
      const res = await request(app)
        .post('/api/v1/sync/anam')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Sync All', () => {
    it('should trigger all syncs', async () => {
      jest.spyOn(cnopsConnector, 'syncDatabase').mockResolvedValue({ success: true, status: 'SYNC_SUCCESS' });
      jest.spyOn(cnssConnector, 'syncDatabase').mockResolvedValue({ success: false, status: 'SOURCE_NOT_AUTOMATABLE' });
      jest.spyOn(anamConnector, 'syncDatabase').mockResolvedValue({ success: false, status: 'SOURCE_NOT_AUTOMATABLE' });

      const res = await request(app)
        .post('/api/v1/sync/all')
        .set('Authorization', `Bearer ${adminToken}`);
        
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Status & History', () => {
    it('should get sync status', async () => {
      prismaMock.source.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/v1/sync/status')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('should get sync history', async () => {
      prismaMock.syncJob.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/v1/sync/history')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});

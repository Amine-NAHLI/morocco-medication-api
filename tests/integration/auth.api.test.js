const request = require('supertest');
const app = require('../../src/app');
jest.mock('../../src/config/prisma');
const prismaMock = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 1, email: 'test@test.com', name: 'Test User', role: 'USER' });
      prismaMock.user.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should fail if email is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login a user successfully', async () => {
      const mockPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: mockPassword,
        role: 'USER'
      });
      prismaMock.user.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should fail with incorrect password', async () => {
      const mockPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: mockPassword
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const token = jwt.sign({ id: 1 }, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key');
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        refreshToken: token,
        role: 'USER'
      });
      prismaMock.user.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: token });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      const token = jwt.sign({ id: 1, role: 'USER' }, process.env.JWT_SECRET || 'dev-secret-key');
      prismaMock.user.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user profile', async () => {
      const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'USER' }, process.env.JWT_SECRET || 'dev-secret-key');
      
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.email).toBe('test@test.com');
    });
  });
});

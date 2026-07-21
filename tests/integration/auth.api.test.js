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
    it('should register a new user successfully and not expose password', async () => {
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
      expect(res.body.data.user).toHaveProperty('email', 'test@test.com');
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
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
    it('should login a user successfully and not expose password', async () => {
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
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
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
      const token = jwt.sign({ id: 1 }, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key', { jwtid: 'api-refresh-token' });
      const refreshTokenHash = await bcrypt.hash(token, 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        refreshTokenHash,
        refreshTokenId: jwt.decode(token).jti,
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

  describe('GET /api/v1/auth/me & Token Validation cases', () => {
    it('should get current user profile with valid token', async () => {
      const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'USER' }, process.env.JWT_SECRET || 'dev-secret-key');

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.email).toBe('test@test.com');
      expect(res.body.data.password).toBeUndefined();
    });

    it('should fail if token is absent', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });

    it('should fail if token format is invalid (no Bearer)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic invalidtokenformat');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });

    it('should fail if token is invalid JWT', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidjwttokenhere');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Invalid or expired access token');
    });

    it('should fail if token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'expired@test.com', role: 'USER' },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Invalid or expired access token');
    });
  });

  describe('Role-Based Authorization checks on Admin paths', () => {
    it('should reject a regular USER accessing sync status endpoints', async () => {
      const userToken = jwt.sign(
        { id: 2, email: 'user@test.com', role: 'USER' },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/v1/sync/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('You do not have permission');
    });

    it('should allow an ADMIN accessing sync status endpoints', async () => {
      const adminToken = jwt.sign(
        { id: 1, email: 'admin@test.com', role: 'ADMIN' },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '1h' }
      );

      prismaMock.source.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/sync/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

const authService = require('../../src/services/auth.service');
const prismaMock = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/prisma');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully and not return password hash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 1,
        email: 'register@test.com',
        name: 'Register User',
        role: 'USER',
        password: 'hashedpassword',
      });
      prismaMock.user.update.mockResolvedValue({});

      const result = await authService.register({
        email: 'register@test.com',
        password: 'password123',
        name: 'Register User',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'register@test.com' } });
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: 1,
        email: 'register@test.com',
        name: 'Register User',
        role: 'USER',
      });
      expect(result.user.password).toBeUndefined();
    });

    it('should throw Conflict if email is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: 'exists@test.com' });

      await expect(
        authService.register({
          email: 'exists@test.com',
          password: 'password123',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login successfully and not return password hash', async () => {
      const plainPassword = 'password123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 10,
        email: 'login@test.com',
        password: hashedPassword,
        name: 'Login User',
        role: 'USER',
      });
      prismaMock.user.update.mockResolvedValue({});

      const result = await authService.login({
        email: 'login@test.com',
        password: plainPassword,
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'login@test.com' } });
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: 10,
        email: 'login@test.com',
        name: 'Login User',
        role: 'USER',
      });
      expect(result.user.password).toBeUndefined();
    });

    it('should fail if email is unknown', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@test.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should fail if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 10,
        email: 'login@test.com',
        password: hashedPassword,
      });

      await expect(
        authService.login({
          email: 'login@test.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken', () => {
    it('should fail if no token provided', async () => {
      await expect(authService.refreshToken(null)).rejects.toThrow('Refresh token is required');
    });

    it('should fail if token is invalid', async () => {
      await expect(authService.refreshToken('invalid')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should fail if user not found in DB', async () => {
      const token = jwt.sign({ id: 1 }, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key');
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(authService.refreshToken(token)).rejects.toThrow('Invalid refresh token');
    });

    it('should fail if refresh token does not match DB', async () => {
      const token = jwt.sign({ id: 1 }, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key');
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, refreshTokenHash: await bcrypt.hash('oldToken', 10), refreshTokenId: jwt.decode(token).jti });
      await expect(authService.refreshToken(token)).rejects.toThrow('Invalid refresh token');
    });

    it('should refresh tokens successfully', async () => {
      const token = jwt.sign({ id: 5 }, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key', { jwtid: 'unit-refresh-token' });
      const refreshTokenHash = await bcrypt.hash(token, 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 5,
        email: 'refresh@test.com',
        role: 'USER',
        refreshTokenHash,
        refreshTokenId: jwt.decode(token).jti,
      });
      prismaMock.user.update.mockResolvedValue({});

      const result = await authService.refreshToken(token);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).not.toBe(token);
    });
  });

  describe('logout', () => {
    it('should set refresh token to null on logout', async () => {
      prismaMock.user.update.mockResolvedValue({});

      await authService.logout(10);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { refreshTokenHash: null, refreshTokenId: null },
      });
    });
  });

  describe('setRole', () => {
    it('updates another user role and revokes their refresh token', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 2, role: 'ADMIN' });
      await expect(authService.setRole(1, 2, 'ADMIN')).resolves.toEqual({ id: 2, role: 'ADMIN' });
      expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { role: 'ADMIN', refreshTokenHash: null, refreshTokenId: null } }));
    });

    it('does not allow an administrator to remove their own role', async () => {
      await expect(authService.setRole(1, 1, 'USER')).rejects.toThrow('cannot remove their own');
    });
  });
});

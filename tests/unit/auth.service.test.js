const authService = require('../../src/services/auth.service');
const prismaMock = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/prisma');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, refreshToken: 'oldToken' });
      await expect(authService.refreshToken(token)).rejects.toThrow('Invalid refresh token');
    });
  });
});

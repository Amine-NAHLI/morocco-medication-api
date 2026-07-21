const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const tokenId = (token) => verifyRefreshToken(token).jti;

class AuthService {
  async register({ email, password, name }) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new ApiError(409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, password: hashedPassword, name, role: 'USER' }
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12), refreshTokenId: tokenId(refreshToken) }
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken
    };
  }

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12), refreshTokenId: tokenId(refreshToken) }
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken
    };
  }

  async refreshToken(token) {
    if (!token) {
      throw new ApiError(401, 'Refresh token is required');
    }

    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || !decoded.jti || user.refreshTokenId !== decoded.jti || !user.refreshTokenHash || !(await bcrypt.compare(token, user.refreshTokenHash))) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(newRefreshToken, 12), refreshTokenId: tokenId(newRefreshToken) }
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenId: null }
    });
  }

  async setRole(actorId, userId, role) {
    if (actorId === Number(userId) && role !== 'ADMIN') {
      throw new ApiError(400, 'An administrator cannot remove their own administrator role');
    }
    const user = await prisma.user.update({
      where: { id: Number(userId) },
      data: { role, refreshTokenHash: null, refreshTokenId: null },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    return user;
  }
}

module.exports = new AuthService();

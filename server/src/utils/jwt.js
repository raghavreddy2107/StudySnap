// src/utils/jwt.js
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

export const signAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

export const createRefreshTokenRecord = async (userId, rawToken) => {
  const hashed = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, token: hashed, expiresAt },
  });
};

export const revokeRefreshToken = async (rawToken) => {
  // Find all non-revoked tokens for safety match
  const tokens = await prisma.refreshToken.findMany({
    where: { revoked: false, expiresAt: { gt: new Date() } },
  });

  for (const record of tokens) {
    const match = await bcrypt.compare(rawToken, record.token);
    if (match) {
      await prisma.refreshToken.update({
        where: { id: record.id },
        data: { revoked: true },
      });
      return true;
    }
  }
  return false;
};

export const validateRefreshToken = async (rawToken, userId) => {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, revoked: false, expiresAt: { gt: new Date() } },
  });

  for (const record of tokens) {
    const match = await bcrypt.compare(rawToken, record.token);
    if (match) return record;
  }
  return null;
};

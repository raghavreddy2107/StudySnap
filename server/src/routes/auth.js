// src/routes/auth.js
import express from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  createRefreshTokenRecord,
  revokeRefreshToken,
  validateRefreshToken,
} from '../utils/jwt.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// POST /api/auth/signup — email/password signup
router.post('/signup', authRateLimiter, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required', code: 'MISSING_FIELDS' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email', code: 'INVALID_EMAIL' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // If they already have a Google-only account, guide them to Google sign-in.
    if (!existing.passwordHash && existing.googleId) {
      return res.status(409).json({
        error: 'Account already exists with Google sign-in. Please sign in with Google.',
        code: 'ACCOUNT_EXISTS_OAUTH',
      });
    }
    return res.status(409).json({ error: 'Email already in use', code: 'EMAIL_IN_USE' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const rawRefreshToken = signRefreshToken({ id: user.id, email: user.email });
  await createRefreshTokenRecord(user.id, rawRefreshToken);
  res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS);

  return res.status(201).json({ accessToken });
});

// POST /api/auth/login — email/password login
router.post('/login', authRateLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required', code: 'MISSING_FIELDS' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email', code: 'INVALID_EMAIL' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
  }
  if (!user.passwordHash) {
    return res.status(409).json({
      error: 'This account uses Google sign-in. Please sign in with Google.',
      code: 'ACCOUNT_OAUTH_ONLY',
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
  }

  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const rawRefreshToken = signRefreshToken({ id: user.id, email: user.email });
  await createRefreshTokenRecord(user.id, rawRefreshToken);
  res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS);

  return res.json({ accessToken });
});

// GET /api/auth/google — initiate OAuth
router.get(
  '/google',
  authRateLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// GET /api/auth/google/callback — OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/?error=auth_failed` }),
  async (req, res) => {
    try {
      const user = req.user;
      const accessToken = signAccessToken({ id: user.id, email: user.email });
      const rawRefreshToken = signRefreshToken({ id: user.id });

      await createRefreshTokenRecord(user.id, rawRefreshToken);

      res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS);

      // Redirect to frontend with access token in query (short-lived, frontend stores in memory/localStorage)
      res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);
    } catch (err) {
      console.error('[Auth Callback Error]', err);
      res.redirect(`${process.env.CLIENT_URL}/?error=server_error`);
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', authRateLimiter, async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  if (!rawRefreshToken) {
    return res.status(401).json({ error: 'No refresh token', code: 'NO_REFRESH_TOKEN' });
  }

  try {
    const decoded = verifyRefreshToken(rawRefreshToken);
    const record = await validateRefreshToken(rawRefreshToken, decoded.id);

    if (!record) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }

    const newAccessToken = signAccessToken({ id: decoded.id, email: decoded.email });
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  if (rawRefreshToken) {
    await revokeRefreshToken(rawRefreshToken).catch(() => {});
  }

  res.clearCookie('refreshToken', COOKIE_OPTIONS);
  res.json({ message: 'Logged out successfully' });
});

export default router;

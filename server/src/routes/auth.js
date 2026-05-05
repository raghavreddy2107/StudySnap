// src/routes/auth.js
import express from 'express';
import passport from 'passport';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  createRefreshTokenRecord,
  revokeRefreshToken,
  validateRefreshToken,
} from '../utils/jwt.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

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

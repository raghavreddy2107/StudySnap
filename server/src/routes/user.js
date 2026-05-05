// src/routes/user.js
import express from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import prisma from '../utils/prisma.js';

const router = express.Router();
const DAILY_LIMIT = 10;

// GET /api/user/me
router.get('/me', verifyJWT, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        dailyRequestCount: true,
        lastRequestDate: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }

    // Reset count if last request wasn't today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = user.lastRequestDate ? new Date(user.lastRequestDate) : null;
    const dailyCount = !lastDate || lastDate < today ? 0 : user.dailyRequestCount;

    res.json({
      ...user,
      dailyRequestCount: dailyCount,
      dailyLimit: DAILY_LIMIT,
    });
  } catch (err) {
    console.error('[User GET]', err);
    res.status(500).json({ error: 'Failed to fetch user', code: 'SERVER_ERROR' });
  }
});

export default router;

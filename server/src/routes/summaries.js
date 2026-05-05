// src/routes/summaries.js
import express from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

// GET /api/summaries — all user summaries
router.get('/summaries', verifyJWT, async (req, res) => {
  try {
    const summaries = await prisma.summary.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        examTime: true,
        summaryType: true,
        focusTopic: true,
        status: true,
        createdAt: true,
      },
    });
    res.json(summaries);
  } catch (err) {
    console.error('[Summaries GET]', err);
    res.status(500).json({ error: 'Failed to fetch summaries', code: 'SERVER_ERROR' });
  }
});

// GET /api/summary/:id — single summary
router.get('/summary/:id', verifyJWT, async (req, res) => {
  try {
    const summary = await prisma.summary.findUnique({ where: { id: req.params.id } });

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found', code: 'NOT_FOUND' });
    }

    if (summary.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    res.json(summary);
  } catch (err) {
    console.error('[Summary GET]', err);
    res.status(500).json({ error: 'Failed to fetch summary', code: 'SERVER_ERROR' });
  }
});

// DELETE /api/summary/:id
router.delete('/summary/:id', verifyJWT, async (req, res) => {
  try {
    const summary = await prisma.summary.findUnique({ where: { id: req.params.id } });

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found', code: 'NOT_FOUND' });
    }

    if (summary.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    await prisma.summary.delete({ where: { id: req.params.id } });
    res.json({ message: 'Summary deleted' });
  } catch (err) {
    console.error('[Summary DELETE]', err);
    res.status(500).json({ error: 'Failed to delete summary', code: 'SERVER_ERROR' });
  }
});

export default router;

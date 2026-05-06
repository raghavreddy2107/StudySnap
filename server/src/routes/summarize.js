// src/routes/summarize.js
import express from 'express';
import fs from 'fs';
import verifyJWT from '../middleware/verifyJWT.js';
import upload from '../middleware/upload.js';
import { extractTextFromPDF } from '../services/pdfService.js';
import { enqueueSummarizeJob } from '../queues/summarizeQueue.js';
import { createIsolatedRedisClient } from '../utils/redis.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

const DAILY_LIMIT = 10;
const SSE_IDLE_TIMEOUT_MS = Number(process.env.SSE_IDLE_TIMEOUT_MS || 20 * 60 * 1000);
const SSE_HEARTBEAT_MS = 15000;

// POST /api/summarize — upload + enqueue
router.post('/summarize', verifyJWT, upload.single('pdf'), async (req, res) => {
  const userId = req.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'PDF file is required', code: 'NO_FILE' });
  }

  const { examTime, summaryType, focusTopic } = req.body;

  if (!examTime || !summaryType) {
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'examTime and summaryType are required', code: 'MISSING_FIELDS' });
  }

  try {
    // Check daily rate limit
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyCount = user.dailyRequestCount;
    const lastDate = user.lastRequestDate;

    if (!lastDate || new Date(lastDate) < today) {
      dailyCount = 0;
    }

    if (dailyCount >= DAILY_LIMIT) {
      fs.unlinkSync(file.path);
      return res.status(429).json({
        error: 'Daily limit reached. Resets at midnight.',
        code: 'DAILY_LIMIT_REACHED',
      });
    }

    // Extract text from PDF (synchronous, fast)
    const { text: extractedText, truncated } = await extractTextFromPDF(file.path);

    if (!extractedText.trim()) {
      fs.unlinkSync(file.path);
      return res.status(422).json({ error: 'Could not extract text from PDF', code: 'EMPTY_PDF' });
    }

    // Create Summary record
    const summary = await prisma.summary.create({
      data: {
        userId,
        fileName: file.originalname,
        examTime,
        summaryType,
        focusTopic: focusTopic || null,
        status: 'PENDING',
      },
    });

    // Update user daily count
    await prisma.user.update({
      where: { id: userId },
      data: {
        dailyRequestCount: dailyCount + 1,
        lastRequestDate: new Date(),
      },
    });

    // Enqueue job
    await enqueueSummarizeJob({
      summaryId: summary.id,
      extractedText,
      examTime,
      summaryType,
      focusTopic: focusTopic || null,
      userId,
    });

    // Delete temp file
    fs.unlinkSync(file.path);

    res.status(202).json({
      summaryId: summary.id,
      truncated,
      message: 'Summary queued successfully',
    });
  } catch (err) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    console.error('[Summarize]', err);
    res.status(500).json({ error: 'Failed to process request', code: 'SERVER_ERROR' });
  }
});

// GET /api/summary/:summaryId/stream — SSE streaming
// EventSource cannot send custom headers so accept token from query param too
const verifyJWTOrQuery = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = 'Bearer ' + req.query.token;
  }
  return verifyJWT(req, res, next);
};

router.get('/summary/:summaryId/stream', verifyJWTOrQuery, async (req, res) => {
  const { summaryId } = req.params;
  const userId = req.user.id;

  try {
    const summary = await prisma.summary.findUnique({ where: { id: summaryId } });

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found', code: 'NOT_FOUND' });
    }

    if (summary.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    // If already done, send full text immediately
    if (summary.status === 'DONE') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ chunk: summary.summaryText })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    if (summary.status === 'FAILED') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ error: summary.errorMsg || 'Summary failed' })}\n\n`);
      return res.end();
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Subscribe to Redis pub/sub
    const subscriber = createIsolatedRedisClient();
    await subscriber.connect();
    const channel = `summary:${summaryId}`;

    let closed = false;
    let timeout;
    let heartbeat;

    const resetIdleTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!closed) {
          // Gracefully close idle connections and let client polling continue.
          cleanup();
          res.end();
        }
      }, SSE_IDLE_TIMEOUT_MS);
    };

    const cleanup = () => {
      if (!closed) {
        closed = true;
        clearTimeout(timeout);
        clearInterval(heartbeat);
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.quit().catch(() => {});
      }
    };

    req.on('close', cleanup);

    await subscriber.subscribe(channel, (message) => {
      if (closed) return;
      try {
        const data = JSON.parse(message);
        if (!data || typeof data !== 'object') {
          return;
        }
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        resetIdleTimeout();

        if (data.done || data.error) {
          cleanup();
          res.end();
        }
      } catch (e) {
        console.error('[SSE parse error]', e);
      }
    });

    // Race-condition guard:
    // if the worker marked DONE/FAILED between the initial status check and the
    // moment this subscription became active, Redis pub/sub may not replay that
    // event. Re-read DB state once and flush terminal state immediately.
    const latest = await prisma.summary.findUnique({ where: { id: summaryId } });
    if (!closed && latest?.status === 'DONE') {
      res.write(`data: ${JSON.stringify({ chunk: latest.summaryText || '' })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      cleanup();
      return res.end();
    }

    if (!closed && latest?.status === 'FAILED') {
      res.write(`data: ${JSON.stringify({ error: latest.errorMsg || 'Summary failed' })}\n\n`);
      cleanup();
      return res.end();
    }

    // Keep the connection alive through proxies/browser idle limits.
    heartbeat = setInterval(() => {
      if (!closed) {
        res.write(': ping\n\n');
      }
    }, SSE_HEARTBEAT_MS);

    resetIdleTimeout();
  } catch (err) {
    console.error('[SSE Stream]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream error', code: 'SERVER_ERROR' });
    }
  }
});

export default router;

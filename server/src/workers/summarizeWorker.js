// src/workers/summarizeWorker.js
import 'dotenv/config';
import { Worker } from 'bullmq';
import { UnrecoverableError } from 'bullmq';
import { getRedisClient, getPubClient } from '../utils/redis.js';
import prisma from '../utils/prisma.js';
import { buildPrompt } from '../utils/promptBuilder.js';
import { streamSummary } from '../services/GeminiService.js';

const connection = getRedisClient();
const publisher = getPubClient();

function isQuotaOrRateLimitError(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('413') ||
    msg.includes('too many requests') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate limit') ||
    msg.includes('limit: 0') ||
    msg.includes('request too large') ||
    msg.includes('tokens per minute')
  );
}

function isInputTooLargeError(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('413') ||
    msg.includes('request too large') ||
    msg.includes('tokens per minute')
  );
}

const worker = new Worker(
  'summarize',
  async (job) => {
    const { summaryId, extractedText, examTime, summaryType, focusTopic, userId } = job.data;

    console.log(`[Worker] Processing job for summaryId: ${summaryId}`);

    // Update status to PROCESSING
    await prisma.summary.update({
      where: { id: summaryId },
      data: { status: 'PROCESSING' },
    });

    const prompt = buildPrompt({ examTime, summaryType, focusTopic, extractedText });

    let fullText = '';

    try {
      fullText = await streamSummary(prompt, (chunk) => {
        fullText += chunk; // accumulate locally too
        // Publish chunk to Redis pub/sub channel
        // Non-blocking publish so we don't slow down generation with per-word round trips.
        publisher.publish(
          `summary:${summaryId}`,
          JSON.stringify({ chunk })
        ).catch(() => {});
      });

      // Save full summary to DB
      console.log(`[Worker] Generated length for ${summaryId}: ${fullText.length} chars`);
      await prisma.summary.update({
        where: { id: summaryId },
        data: { summaryText: fullText, status: 'DONE' },
      });

      // Publish done signal
      await publisher.publish(
        `summary:${summaryId}`,
        JSON.stringify({ done: true })
      );

      console.log(`[Worker] Completed summaryId: ${summaryId}`);
    } catch (err) {
      console.error(`[Worker] Failed summaryId: ${summaryId}`, err.message);
      const quotaLimited = isQuotaOrRateLimitError(err);
      const inputTooLarge = isInputTooLargeError(err);
      const userFacingError = quotaLimited
        ? inputTooLarge
          ? 'PDF is too large for current AI limits. Try a shorter PDF or focus on specific pages/topics.'
          : 'AI quota exceeded. Please check Gemini API billing/quota and try again later.'
        : 'Failed to generate summary. Please try again.';

      await prisma.summary.update({
        where: { id: summaryId },
        data: { status: 'FAILED', errorMsg: userFacingError },
      });

      await publisher.publish(
        `summary:${summaryId}`,
        JSON.stringify({ error: userFacingError })
      );

      // Quota/rate-limit errors are not recoverable via immediate retries.
      if (quotaLimited || inputTooLarge) {
        throw new UnrecoverableError(userFacingError);
      }

      throw err; // Let BullMQ handle retry
    }
  },
  {
    connection,
    concurrency: 3,
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

console.log('🔧 StudySnap worker started, listening for jobs...');

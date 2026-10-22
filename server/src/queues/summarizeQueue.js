// src/queues/summarizeQueue.js
import { Queue } from 'bullmq';
import { getRedisClient } from '../utils/redis.js';

const connection = getRedisClient();

export const summarizeQueue = new Queue('summarize', {
  connection,
  defaultJobOptions: {
    // Do not auto-retry failed jobs; user can explicitly create a fresh summary.
    // increase attempts to 3 if you want to allow retries for transient errors like network issues or rate limits.
    attempts: 1,
    removeOnComplete: { count: 100 },
    // Remove failed jobs immediately so stale/old failed jobs don't linger.
    removeOnFail: true,
  },
});

export const enqueueSummarizeJob = async (payload) => {
  const job = await summarizeQueue.add('summarize-pdf', payload, {
    jobId: payload.summaryId,
  });
  return job;
};

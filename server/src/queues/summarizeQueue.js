// src/queues/summarizeQueue.js
import { Queue } from 'bullmq';
import { getRedisClient } from '../utils/redis.js';

const connection = getRedisClient();

export const summarizeQueue = new Queue('summarize', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const enqueueSummarizeJob = async (payload) => {
  const job = await summarizeQueue.add('summarize-pdf', payload, {
    jobId: payload.summaryId,
  });
  return job;
};

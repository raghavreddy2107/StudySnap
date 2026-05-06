// worker.js — Run this as a separate process: node worker.js
// This starts the BullMQ worker that processes summarization jobs

import './src/workers/summarizeWorker.js';
import keepalive from './server/src/utils/keepalive.js';
keepalive();

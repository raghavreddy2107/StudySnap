// worker.js — Run this as a separate process: node worker.js
// This starts the BullMQ worker that processes summarization jobs

import './src/workers/summarizeWorker.js';
import keepAlive from './server/src/utils/keepAlive.js';
keepAlive();

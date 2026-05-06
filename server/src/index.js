// src/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import authRoutes from './routes/auth.js';
import summarizeRoutes from './routes/summarize.js';
import summariesRoutes from './routes/summaries.js';
import userRoutes from './routes/user.js';
import './services/passportStrategy.js';
import keepalive from './utils/keepalive.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', summarizeRoutes);
app.use('/api', summariesRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Keep Backend alive
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[GlobalError]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 StudySnap server running on port ${PORT}`);
});

keepalive();

export default app;

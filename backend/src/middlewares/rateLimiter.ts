import rateLimit from 'express-rate-limit';
import { env } from '../config/env.ts';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: env.isTest ? 100 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Terlalu banyak percobaan login. Silakan tunggu 15 menit.',
      },
    });
  },
});

export const publicSubmissionRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.isTest ? 200 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Terlalu banyak pengiriman dalam waktu singkat. Coba lagi nanti.',
      },
    });
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isTest ? 1000 : 180,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Permintaan API terlalu cepat. Silakan coba sesaat lagi.',
      },
    });
  },
});

import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { ERROR_CODES } from '../config/constants';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes by default
  max: config.rateLimit.max, // 100 requests per window by default
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: ERROR_CODES.RATE_LIMITED,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Stricter rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
      code: ERROR_CODES.RATE_LIMITED,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for Strava sync (API has its own limits)
export const stravaSyncLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 sync requests per minute
  message: {
    success: false,
    error: {
      message: 'Sync rate limit exceeded, please try again later',
      code: ERROR_CODES.RATE_LIMITED,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default apiLimiter;

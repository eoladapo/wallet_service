import rateLimit from 'express-rate-limit';
import config from '../config/config';

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true, 
  legacyHeaders: false,
  skip: () => config.isTest(), 
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 * Prevents brute force attacks on login/registration
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again after 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: () => config.isTest(), 
});

/**
 * Moderate rate limiter for financial operations
 * Limits: 20 requests per 15 minutes per IP
 * Prevents abuse of fund transfers, withdrawals, etc.
 */
export const financialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20,
  message: {
    error: {
      code: 'FINANCIAL_RATE_LIMIT_EXCEEDED',
      message: 'Too many financial operations, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest(), 
});

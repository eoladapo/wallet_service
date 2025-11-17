import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// In-memory token store (in production, use Redis or database)
const tokenStore = new Map<string, { userId: string; accountId: string; createdAt: Date }>();

/**
 * Generate a simple faux authentication token
 */
export function generateToken(userId: string, accountId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, {
    userId,
    accountId,
    createdAt: new Date(),
  });
  return token;
}

/**
 * Verify and decode a faux token
 */
export function verifyToken(token: string): { userId: string; accountId: string } | null {
  const tokenData = tokenStore.get(token);
  if (!tokenData) {
    return null;
  }

  // Optional: Check token expiration (e.g., 24 hours)
  const tokenAge = Date.now() - tokenData.createdAt.getTime();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (tokenAge > maxAge) {
    tokenStore.delete(token);
    return null;
  }

  return {
    userId: tokenData.userId,
    accountId: tokenData.accountId,
  };
}

/**
 * Revoke a token (logout)
 */
export function revokeToken(token: string): boolean {
  return tokenStore.delete(token);
}

/**
 * Authentication middleware
 * Validates the Bearer token in the Authorization header
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header. Use: Authorization: Bearer <token>',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const tokenData = verifyToken(token);

    if (!tokenData) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    // Attach user info to request object
    (req as any).user = tokenData;
    next();
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
}

/**
 * Optional middleware to verify account ownership
 * Use after authenticate middleware
 */
export function verifyAccountOwnership(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  const accountId = req.params.id;

  if (user.accountId !== accountId) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this account',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
}

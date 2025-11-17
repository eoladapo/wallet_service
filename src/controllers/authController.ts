import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../config/database';
import { generateToken } from '../middleware/auth';

/**
 * Controller for authentication operations
 */
export class AuthController {
  /**
   * Login user and generate token
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Find user by email
      const user = await db('users')
        .where({ email: email.toLowerCase() })
        .first();

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Get user's account
      const account = await db('accounts')
        .where({ user_id: user.id })
        .first();

      if (!account) {
        
        return res.status(404).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'User account not found. Please contact support.',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Generate faux token using the auth middleware function
      const token = generateToken(user.id, account.id);

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        account: {
          id: account.id,
          balance: parseFloat(account.balance),
          currency: account.currency,
          status: account.status,
        },
      });
    } catch (error: any) {
      console.error('Error in login endpoint:', error);

      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during login',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

export const authController = new AuthController();

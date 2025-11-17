import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { CreateUserRequest, UserResponse, AccountResponse } from '../models/dto';

/**
 * Controller for user-related operations
 */
export class UserController {
  /**
   * Register a new user
   * POST /api/users
   */
  async registerUser(req: Request, res: Response): Promise<Response> {
    try {
      const { email, firstName, lastName, password }: CreateUserRequest = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: email, firstName, lastName, password',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Call UserService to register user
      const { user, account } = await userService.registerUser({
        email,
        firstName,
        lastName,
        password,
      });

      // Format response
      const userResponse: UserResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      };

      const accountResponse: AccountResponse = {
        id: account.id,
        userId: account.userId,
        balance: account.balance,
        currency: account.currency,
        status: account.status,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      };

      return res.status(201).json({
        message: 'User registered successfully',
        user: userResponse,
        account: accountResponse,
      });
    } catch (error: any) {
      console.error('Error in user registration endpoint:', error);

      // Handle blacklisted user error
      if (error.message.includes('USER_BLACKLISTED')) {
        return res.status(422).json({
          error: {
            code: 'USER_BLACKLISTED',
            message: 'User is not eligible for registration',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Handle validation errors
      if (
        error.message.includes('INVALID_EMAIL') ||
        error.message.includes('INVALID_FIRST_NAME') ||
        error.message.includes('INVALID_LAST_NAME') ||
        error.message.includes('INVALID_PASSWORD') ||
        error.message.includes('EMAIL_EXISTS')
      ) {
        return res.status(400).json({
          error: {
            code: error.message.split(':')[0],
            message: error.message.split(':')[1]?.trim() || error.message,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Handle other errors
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during registration',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

// Export singleton instance
export const userController = new UserController();

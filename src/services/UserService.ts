import { userRepository } from '../repositories/UserRepository';
import { accountRepository } from '../repositories/AccountRepository';
import { karmaService } from './KarmaService';
import { User } from '../models/User';
import { Account } from '../models/Account';
import config from '../config/config';
import bcrypt from 'bcrypt';
import db from '../config/database';

/**
 * Service for user registration and management
 */
export class UserService {
  /**
   * Login user with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Promise<{ user: User; account: Account }> - User and account information
   * @throws Error if credentials are invalid
   */
  async loginUser(
    email: string,
    password: string
  ): Promise<{ user: User; account: Account }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS: Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS: Invalid email or password');
    }

    // Get user's account
    const account = await accountRepository.findByUserId(user.id);
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND: User account not found');
    }

    return { user, account };
  }
  /**
   * Register a new user with blacklist verification and automatic account creation
   * @param userData - User registration data
   * @returns Promise<{ user: User; account: Account }> - Created user and account
   * @throws Error with specific messages for different failure scenarios
   */
  async registerUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }): Promise<{ user: User; account: Account }> {
    // Validate input data
    this.validateRegistrationData(userData);

    // Normalize email for consistency
    const normalizedEmail = userData.email.toLowerCase().trim();
    console.log("Normalized Email", normalizedEmail)

    // Check if user is blacklisted via Karma API
    try {
      const isBlacklisted = await karmaService.checkBlacklist(normalizedEmail);
      console.log("CHECKING IS BLACKLISTED", isBlacklisted)
      
      if (isBlacklisted) {
        throw new Error('USER_BLACKLISTED: User is not eligible for registration');
      }
    } catch (error: any) {
      // If the error is about blacklist, rethrow it
      if (error.message.includes('USER_BLACKLISTED')) {
        throw error;
      }
      // For other Karma API errors, log and fail safely
      console.error('Karma API verification failed:', error);
      throw new Error('Unable to verify user eligibility. Please try again later.');
    }

    // Check if email already exists
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('EMAIL_EXISTS: Email address is already registered');
    }

    // Use database transaction to ensure atomicity
    const trx = await db.transaction();
    
    try {
      // Create user with hashed password
      const user = await this.createUserInTransaction(trx, {
        ...userData,
        email: normalizedEmail,
      });

      // Create associated account with zero balance
      const account = await this.createAccountInTransaction(trx, user.id);

      // Commit transaction
      await trx.commit();

      return { user, account };
    } catch (error: any) {
      // Rollback transaction on any error
      await trx.rollback();
      
      console.error('Error during user registration:', error);
      
      // Rethrow with appropriate message
      if (error.message.includes('Email already exists')) {
        throw new Error('EMAIL_EXISTS: Email address is already registered');
      }
      
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Validate registration data
   * @param userData - User registration data
   * @throws Error if validation fails
   */
  private validateRegistrationData(userData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }): void {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userData.email || !emailRegex.test(userData.email)) {
      throw new Error('INVALID_EMAIL: Invalid email address format');
    }

    // Validate first name
    if (!userData.firstName || userData.firstName.trim().length === 0) {
      throw new Error('INVALID_FIRST_NAME: First name is required');
    }

    // Validate last name
    if (!userData.lastName || userData.lastName.trim().length === 0) {
      throw new Error('INVALID_LAST_NAME: Last name is required');
    }

    // Validate password
    if (!userData.password || userData.password.length < 8) {
      throw new Error('INVALID_PASSWORD: Password must be at least 8 characters long');
    }
  }

  /**
   * Create user within a transaction
   * @param trx - Knex transaction object
   * @param userData - User data
   * @returns Promise<User> - Created user
   */
  private async createUserInTransaction(
    trx: any,
    userData: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
    }
  ): Promise<User> {
    const bcrypt = require('bcrypt');
    const { v4: uuidv4 } = require('uuid');
    
    const passwordHash = await bcrypt.hash(userData.password, config.security.bcryptRounds);
    
    const userId = uuidv4();
    const now = new Date();

    const userRecord = {
      id: userId,
      email: userData.email,
      first_name: userData.firstName.trim(),
      last_name: userData.lastName.trim(),
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    };

    await trx('users').insert(userRecord);

    return {
      id: userId,
      email: userData.email,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create account within a transaction
   * @param trx - Knex transaction object
   * @param userId - User ID
   * @returns Promise<Account> - Created account
   */
  private async createAccountInTransaction(trx: any, userId: string): Promise<Account> {
    const { v4: uuidv4 } = require('uuid');
    const { AccountStatus } = require('../models/Account');
    
    const accountId = uuidv4();
    const now = new Date();

    const accountRecord = {
      id: accountId,
      user_id: userId,
      balance: 0,
      currency: 'NGN',
      status: AccountStatus.ACTIVE,
      created_at: now,
      updated_at: now,
    };

    await trx('accounts').insert(accountRecord);

    return {
      id: accountId,
      userId,
      balance: 0,
      currency: 'NGN',
      status: AccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export const userService = new UserService();


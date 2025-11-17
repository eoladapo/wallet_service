import db from '../config/database';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for User data access operations
 */
export class UserRepository {
  private readonly tableName = 'users';
  private readonly saltRounds = 12;

  /**
   * Create a new user with hashed password
   * @param userData - User data including plain text password
   * @returns Promise<User> - Created user object
   * @throws Error if database operation fails
   */
  async createUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }): Promise<User> {
    try {
      // Hash the password using bcrypt
      const passwordHash = await bcrypt.hash(userData.password, this.saltRounds);

      const userId = uuidv4();
      const now = new Date();

      const userRecord = {
        id: userId,
        email: userData.email.toLowerCase().trim(),
        first_name: userData.firstName.trim(),
        last_name: userData.lastName.trim(),
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
      };

      await db(this.tableName).insert(userRecord);

      // Return user object (without exposing password hash in typical usage)
      return {
        id: userId,
        email: userRecord.email,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        passwordHash,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      // Handle duplicate email error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Email already exists');
      }
      
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Find a user by email address
   * @param email - User email address
   * @returns Promise<User | null> - User object or null if not found
   * @throws Error if database operation fails
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const record = await db(this.tableName)
        .where({ email: normalizedEmail })
        .first();

      if (!record) {
        return null;
      }

      return this.mapRecordToUser(record);
    } catch (error: any) {
      console.error('Error finding user by email:', error);
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Find a user by ID
   * @param id - User ID
   * @returns Promise<User | null> - User object or null if not found
   * @throws Error if database operation fails
   */
  async findById(id: string): Promise<User | null> {
    try {
      const record = await db(this.tableName)
        .where({ id })
        .first();

      if (!record) {
        return null;
      }

      return this.mapRecordToUser(record);
    } catch (error: any) {
      console.error('Error finding user by ID:', error);
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  /**
   * Map database record to User interface
   * @param record - Database record with snake_case fields
   * @returns User - User object with camelCase fields
   */
  private mapRecordToUser(record: any): User {
    return {
      id: record.id,
      email: record.email,
      firstName: record.first_name,
      lastName: record.last_name,
      passwordHash: record.password_hash,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepository();


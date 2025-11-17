import db from '../config/database';
import { Account, AccountStatus } from '../models/Account';
import { v4 as uuidv4 } from 'uuid';
import { Knex } from 'knex';

/**
 * Repository for Account data access operations
 */
export class AccountRepository {
  private readonly tableName = 'accounts';

  /**
   * Create a new account with initial zero balance
   * @param accountData - Account data including userId
   * @param trx - Optional transaction object
   * @returns Promise<Account> - Created account object
   * @throws Error if database operation fails
   */
  async createAccount(
    accountData: {
      userId: string;
      currency?: string;
      status?: AccountStatus;
    },
    trx?: Knex.Transaction
  ): Promise<Account> {
    try {
      const accountId = uuidv4();
      const now = new Date();

      const accountRecord = {
        id: accountId,
        user_id: accountData.userId,
        balance: 0,
        currency: accountData.currency || 'NGN',
        status: accountData.status || AccountStatus.ACTIVE,
        created_at: now,
        updated_at: now,
      };

      const query = trx ? trx(this.tableName) : db(this.tableName);
      await query.insert(accountRecord);

      return {
        id: accountId,
        userId: accountData.userId,
        balance: 0,
        currency: accountRecord.currency,
        status: accountRecord.status,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      console.error('Error creating account:', error);
      throw new Error(`Failed to create account: ${error.message}`);
    }
  }

  /**
   * Find an account by ID with optional row-level locking
   * @param id - Account ID
   * @param forUpdate - Whether to lock the row for update (SELECT ... FOR UPDATE)
   * @param trx - Optional transaction object (required when forUpdate is true)
   * @returns Promise<Account | null> - Account object or null if not found
   * @throws Error if database operation fails
   */
  async findById(
    id: string,
    forUpdate: boolean = false,
    trx?: Knex.Transaction
  ): Promise<Account | null> {
    try {
      const query = trx ? trx(this.tableName) : db(this.tableName);
      
      let selectQuery = query.where({ id });
      
      // Apply row-level locking if requested
      if (forUpdate) {
        if (!trx) {
          throw new Error('Transaction is required when using forUpdate');
        }
        selectQuery = selectQuery.forUpdate();
      }
      
      const record = await selectQuery.first();

      if (!record) {
        return null;
      }

      return this.mapRecordToAccount(record);
    } catch (error: any) {
      console.error('Error finding account by ID:', error);
      throw new Error(`Failed to find account by ID: ${error.message}`);
    }
  }

  /**
   * Update account balance within a transaction
   * @param id - Account ID
   * @param newBalance - New balance value
   * @param trx - Transaction object (required)
   * @returns Promise<Account> - Updated account object
   * @throws Error if database operation fails or account not found
   */
  async updateBalance(
    id: string,
    newBalance: number,
    trx: Knex.Transaction
  ): Promise<Account> {
    try {
      if (!trx) {
        throw new Error('Transaction is required for balance updates');
      }

      const now = new Date();

      const updateCount = await trx(this.tableName)
        .where({ id })
        .update({
          balance: newBalance,
          updated_at: now,
        });

      if (updateCount === 0) {
        throw new Error('Account not found');
      }

      // Fetch and return the updated account
      const updatedRecord = await trx(this.tableName)
        .where({ id })
        .first();

      return this.mapRecordToAccount(updatedRecord);
    } catch (error: any) {
      console.error('Error updating account balance:', error);
      throw new Error(`Failed to update account balance: ${error.message}`);
    }
  }

  /**
   * Fetch account with associated user details
   * @param id - Account ID
   * @returns Promise<Account & { user: User } | null> - Account with user details or null
   * @throws Error if database operation fails
   */
  async findByIdWithUser(id: string): Promise<any | null> {
    try {
      const record = await db(this.tableName)
        .select(
          'accounts.*',
          'users.id as user_id',
          'users.email as user_email',
          'users.first_name as user_first_name',
          'users.last_name as user_last_name',
          'users.created_at as user_created_at'
        )
        .leftJoin('users', 'accounts.user_id', 'users.id')
        .where('accounts.id', id)
        .first();

      if (!record) {
        return null;
      }

      return {
        id: record.id,
        userId: record.user_id,
        balance: parseFloat(record.balance),
        currency: record.currency,
        status: record.status,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        user: {
          id: record.user_id,
          email: record.user_email,
          firstName: record.user_first_name,
          lastName: record.user_last_name,
          createdAt: record.user_created_at,
        },
      };
    } catch (error: any) {
      console.error('Error finding account with user:', error);
      throw new Error(`Failed to find account with user: ${error.message}`);
    }
  }

  /**
   * Find account by user ID
   * @param userId - User ID
   * @returns Promise<Account | null> - Account object or null if not found
   * @throws Error if database operation fails
   */
  async findByUserId(userId: string): Promise<Account | null> {
    try {
      const record = await db(this.tableName)
        .where({ user_id: userId })
        .first();

      if (!record) {
        return null;
      }

      return this.mapRecordToAccount(record);
    } catch (error: any) {
      console.error('Error finding account by user ID:', error);
      throw new Error(`Failed to find account by user ID: ${error.message}`);
    }
  }

  /**
   * Map database record to Account interface
   * @param record - Database record with snake_case fields
   * @returns Account - Account object with camelCase fields
   */
  private mapRecordToAccount(record: any): Account {
    return {
      id: record.id,
      userId: record.user_id,
      balance: parseFloat(record.balance),
      currency: record.currency,
      status: record.status as AccountStatus,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}

// Export singleton instance
export const accountRepository = new AccountRepository();

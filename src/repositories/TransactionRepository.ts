import db from '../config/database';
import { Transaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { v4 as uuidv4 } from 'uuid';
import { Knex } from 'knex';

/**
 * Repository for Transaction data access operations
 */
export class TransactionRepository {
  private readonly tableName = 'transactions';

  /**
   * Create a new transaction record
   * @param transactionData - Transaction data
   * @param trx - Optional transaction object
   * @returns Promise<Transaction> - Created transaction object
   * @throws Error if database operation fails
   */
  async createTransaction(
    transactionData: {
      accountId: string;
      type: TransactionType;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      relatedAccountId?: string;
      relatedTransactionId?: string;
      description: string;
      status?: TransactionStatus;
    },
    trx?: Knex.Transaction
  ): Promise<Transaction> {
    try {
      const transactionId = uuidv4();
      const reference = this.generateTransactionReference();
      const now = new Date();

      const transactionRecord = {
        id: transactionId,
        account_id: transactionData.accountId,
        type: transactionData.type,
        amount: transactionData.amount,
        balance_before: transactionData.balanceBefore,
        balance_after: transactionData.balanceAfter,
        related_account_id: transactionData.relatedAccountId || null,
        related_transaction_id: transactionData.relatedTransactionId || null,
        reference: reference,
        description: transactionData.description,
        status: transactionData.status || TransactionStatus.COMPLETED,
        created_at: now,
        updated_at: now,
      };

      const query = trx ? trx(this.tableName) : db(this.tableName);
      await query.insert(transactionRecord);

      return {
        id: transactionId,
        accountId: transactionData.accountId,
        type: transactionData.type,
        amount: transactionData.amount,
        balanceBefore: transactionData.balanceBefore,
        balanceAfter: transactionData.balanceAfter,
        relatedAccountId: transactionData.relatedAccountId,
        relatedTransactionId: transactionData.relatedTransactionId,
        reference: reference,
        description: transactionData.description,
        status: transactionRecord.status,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  /**
   * Find transactions by account ID
   * @param accountId - Account ID
   * @param options - Pagination options
   * @param trx - Optional transaction object
   * @returns Promise<{ transactions: Transaction[]; total: number }> - Transactions and total count
   * @throws Error if database operation fails
   */
  async findByAccountId(
    accountId: string,
    options: { page?: number; limit?: number } = {},
    trx?: Knex.Transaction
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      const baseQuery = trx ? trx(this.tableName) : db(this.tableName);

      // Get total count
      const countResult = await baseQuery
        .clone()
        .where({ account_id: accountId })
        .count('* as count')
        .first();

      const total = Number(countResult?.count || 0);

      // Get paginated transactions
      const records = await baseQuery
        .clone()
        .where({ account_id: accountId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const transactions = records.map((record) => this.mapRecordToTransaction(record));

      return { transactions, total };
    } catch (error: any) {
      console.error('Error finding transactions by account ID:', error);
      throw new Error(`Failed to find transactions by account ID: ${error.message}`);
    }
  }

  /**
   * Generate a unique transaction reference
   * @returns string - Unique transaction reference
   */
  generateTransactionReference(): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${timestamp}-${randomPart}`;
  }

  /**
   * Map database record to Transaction interface
   * @param record - Database record with snake_case fields
   * @returns Transaction - Transaction object with camelCase fields
   */
  private mapRecordToTransaction(record: any): Transaction {
    return {
      id: record.id,
      accountId: record.account_id,
      type: record.type as TransactionType,
      amount: parseFloat(record.amount),
      balanceBefore: parseFloat(record.balance_before),
      balanceAfter: parseFloat(record.balance_after),
      relatedAccountId: record.related_account_id || undefined,
      relatedTransactionId: record.related_transaction_id || undefined,
      reference: record.reference,
      description: record.description,
      status: record.status as TransactionStatus,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}

// Export singleton instance
export const transactionRepository = new TransactionRepository();

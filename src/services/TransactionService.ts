import { transactionRepository } from '../repositories/TransactionRepository';
import { Transaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { Knex } from 'knex';

/**
 * Service for transaction operations
 */
export class TransactionService {
  /**
   * Record a fund transaction
   * @param accountId - Account ID that received funds
   * @param amount - Amount funded
   * @param balanceBefore - Account balance before funding
   * @param balanceAfter - Account balance after funding
   * @param trx - Transaction object (required for atomicity)
   * @returns Promise<Transaction> - Created transaction record
   * @throws Error if operation fails
   */
  async recordFundTransaction(
    accountId: string,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    trx: Knex.Transaction
  ): Promise<Transaction> {
    try {
      if (!trx) {
        throw new Error('Transaction object is required for recording fund transaction');
      }

      const transaction = await transactionRepository.createTransaction(
        {
          accountId,
          type: TransactionType.FUND,
          amount,
          balanceBefore,
          balanceAfter,
          description: `Account funded with ${amount}`,
          status: TransactionStatus.COMPLETED,
        },
        trx
      );

      return transaction;
    } catch (error: any) {
      console.error('Error recording fund transaction:', error);
      throw new Error(`Failed to record fund transaction: ${error.message}`);
    }
  }

  /**
   * Record paired transfer transactions (debit and credit)
   * @param fromAccountId - Source account ID
   * @param toAccountId - Destination account ID
   * @param amount - Amount transferred
   * @param fromBalanceBefore - Source account balance before transfer
   * @param fromBalanceAfter - Source account balance after transfer
   * @param toBalanceBefore - Destination account balance before transfer
   * @param toBalanceAfter - Destination account balance after transfer
   * @param trx - Transaction object (required for atomicity)
   * @returns Promise<{ debitTransaction: Transaction; creditTransaction: Transaction }> - Created transaction records
   * @throws Error if operation fails
   */
  async recordTransferTransactions(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    fromBalanceBefore: number,
    fromBalanceAfter: number,
    toBalanceBefore: number,
    toBalanceAfter: number,
    trx: Knex.Transaction
  ): Promise<{ debitTransaction: Transaction; creditTransaction: Transaction }> {
    try {
      if (!trx) {
        throw new Error('Transaction object is required for recording transfer transactions');
      }

      // Create debit transaction (TRANSFER_OUT) for source account
      const debitTransaction = await transactionRepository.createTransaction(
        {
          accountId: fromAccountId,
          type: TransactionType.TRANSFER_OUT,
          amount,
          balanceBefore: fromBalanceBefore,
          balanceAfter: fromBalanceAfter,
          relatedAccountId: toAccountId,
          description: `Transfer to account ${toAccountId}`,
          status: TransactionStatus.COMPLETED,
        },
        trx
      );

      // Create credit transaction (TRANSFER_IN) for destination account
      const creditTransaction = await transactionRepository.createTransaction(
        {
          accountId: toAccountId,
          type: TransactionType.TRANSFER_IN,
          amount,
          balanceBefore: toBalanceBefore,
          balanceAfter: toBalanceAfter,
          relatedAccountId: fromAccountId,
          relatedTransactionId: debitTransaction.id,
          description: `Transfer from account ${fromAccountId}`,
          status: TransactionStatus.COMPLETED,
        },
        trx
      );

      // Update debit transaction with related transaction ID for complete linking
      await trx('transactions')
        .where({ id: debitTransaction.id })
        .update({ related_transaction_id: creditTransaction.id });

      // Update the debitTransaction object to reflect the change
      debitTransaction.relatedTransactionId = creditTransaction.id;

      return { debitTransaction, creditTransaction };
    } catch (error: any) {
      console.error('Error recording transfer transactions:', error);
      throw new Error(`Failed to record transfer transactions: ${error.message}`);
    }
  }

  /**
   * Record a withdrawal transaction
   * @param accountId - Account ID that withdrew funds
   * @param amount - Amount withdrawn
   * @param balanceBefore - Account balance before withdrawal
   * @param balanceAfter - Account balance after withdrawal
   * @param trx - Transaction object (required for atomicity)
   * @returns Promise<Transaction> - Created transaction record
   * @throws Error if operation fails
   */
  async recordWithdrawalTransaction(
    accountId: string,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    trx: Knex.Transaction
  ): Promise<Transaction> {
    try {
      if (!trx) {
        throw new Error('Transaction object is required for recording withdrawal transaction');
      }

      const transaction = await transactionRepository.createTransaction(
        {
          accountId,
          type: TransactionType.WITHDRAW,
          amount,
          balanceBefore,
          balanceAfter,
          description: `Withdrawal of ${amount} from account`,
          status: TransactionStatus.COMPLETED,
        },
        trx
      );

      return transaction;
    } catch (error: any) {
      console.error('Error recording withdrawal transaction:', error);
      throw new Error(`Failed to record withdrawal transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction history for an account with pagination
   * @param accountId - Account ID
   * @param page - Page number (default: 1)
   * @param limit - Number of transactions per page (default: 10)
   * @returns Promise<{ transactions: Transaction[]; page: number; limit: number; total: number }> - Transaction history with pagination info
   * @throws Error if operation fails
   */
  async getTransactionHistory(
    accountId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ transactions: Transaction[]; page: number; limit: number; total: number }> {
    try {
      // Validate pagination parameters
      if (page < 1) {
        throw new Error('INVALID_PAGINATION: Page number must be greater than 0');
      }

      if (limit < 1 || limit > 100) {
        throw new Error('INVALID_PAGINATION: Limit must be between 1 and 100');
      }

      const { transactions, total } = await transactionRepository.findByAccountId(
        accountId,
        { page, limit }
      );

      return {
        transactions,
        page,
        limit,
        total,
      };
    } catch (error: any) {
      console.error('Error getting transaction history:', error);

      if (error.message.includes('INVALID_PAGINATION')) {
        throw error;
      }

      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }
}

export const transactionService = new TransactionService();

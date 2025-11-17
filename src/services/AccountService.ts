import { accountRepository } from '../repositories/AccountRepository';
import { Account } from '../models/Account';
import db from '../config/database';

/**
 * Service for account financial operations
 */
export class AccountService {
  /**
   * Fund an account with the specified amount
   * @param accountId - Account ID to fund
   * @param amount - Amount to add to the account
   * @returns Promise<Account> - Updated account object
   * @throws Error if validation fails or operation fails
   */
  async fundAccount(accountId: string, amount: number): Promise<Account> {
    // Validate amount is positive
    this.validatePositiveAmount(amount);

    // database transaction to ensure atomicity
    const trx = await db.transaction();

    try {
      // Lock the account row for update
      const account = await accountRepository.findById(accountId, true, trx);

      if (!account) {
        throw new Error('ACCOUNT_NOT_FOUND: Account does not exist');
      }

      // Calculate new balance
      const newBalance = account.balance + amount;

      // Update the account balance
      const updatedAccount = await accountRepository.updateBalance(
        accountId,
        newBalance,
        trx
      );

      // Commit transaction
      await trx.commit();

      return updatedAccount;
    } catch (error: any) {
      // Rollback transaction on any error
      await trx.rollback();

      console.error('Error funding account:', error);

      // Rethrow known errors
      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        throw error;
      }

      throw new Error(`Failed to fund account: ${error.message}`);
    }
  }

  /**
   * Withdraw funds from an account
   * @param accountId - Account ID to withdraw from
   * @param amount - Amount to withdraw
   * @returns Promise<Account> - Updated account object
   * @throws Error if validation fails, insufficient balance, or operation fails
   */
  async withdrawFunds(accountId: string, amount: number): Promise<Account> {
    // Validate amount is positive
    this.validatePositiveAmount(amount);

    // database transaction to ensure atomicity
    const trx = await db.transaction();

    try {
      // Lock the account row for update
      const account = await accountRepository.findById(accountId, true, trx);

      if (!account) {
        throw new Error('ACCOUNT_NOT_FOUND: Account does not exist');
      }

      // Validate sufficient balance
      if (account.balance < amount) {
        throw new Error(
          `INSUFFICIENT_BALANCE: Account balance (${account.balance}) is insufficient for withdrawal of ${amount}`
        );
      }

      // Calculate new balance
      const newBalance = account.balance - amount;

      // Update the account balance
      const updatedAccount = await accountRepository.updateBalance(
        accountId,
        newBalance,
        trx
      );

      // Commit transaction
      await trx.commit();

      return updatedAccount;
    } catch (error: any) {
      // Rollback transaction on any error
      await trx.rollback();

      console.error('Error withdrawing funds:', error);

      // Rethrow known errors
      if (
        error.message.includes('ACCOUNT_NOT_FOUND') ||
        error.message.includes('INSUFFICIENT_BALANCE')
      ) {
        throw error;
      }

      throw new Error(`Failed to withdraw funds: ${error.message}`);
    }
  }

  /**
   * Transfer funds from one account to another
   * @param fromAccountId - Source account ID
   * @param toAccountId - Destination account ID
   * @param amount - Amount to transfer
   * @returns Promise<{ fromAccount: Account; toAccount: Account }> - Updated accounts
   * @throws Error if validation fails, insufficient balance, or operation fails
   */
  async transferFunds(
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ): Promise<{ fromAccount: Account; toAccount: Account }> {
    // Validate amount is positive
    this.validatePositiveAmount(amount);

    // Validate accounts are different
    if (fromAccountId === toAccountId) {
      throw new Error('INVALID_TRANSFER: Cannot transfer to the same account');
    }

    // database transaction to ensure atomicity
    const trx = await db.transaction();

    try {
      // Lock both account rows for update (in consistent order to prevent deadlocks)
      const accountIds = [fromAccountId, toAccountId].sort();
      const accounts = await Promise.all(
        accountIds.map((id) => accountRepository.findById(id, true, trx))
      );

      // Map accounts back to their original variables
      const fromAccount = accounts.find((acc) => acc?.id === fromAccountId);
      const toAccount = accounts.find((acc) => acc?.id === toAccountId);

      // Verify both accounts exist
      if (!fromAccount) {
        throw new Error('ACCOUNT_NOT_FOUND: Source account does not exist');
      }

      if (!toAccount) {
        throw new Error('ACCOUNT_NOT_FOUND: Destination account does not exist');
      }

      // Validate sufficient balance in source account
      if (fromAccount.balance < amount) {
        throw new Error(
          `INSUFFICIENT_BALANCE: Source account balance (${fromAccount.balance}) is insufficient for transfer of ${amount}`
        );
      }

      // Calculate new balances
      const newFromBalance = fromAccount.balance - amount;
      const newToBalance = toAccount.balance + amount;

      // Update both account balances
      const updatedFromAccount = await accountRepository.updateBalance(
        fromAccountId,
        newFromBalance,
        trx
      );

      const updatedToAccount = await accountRepository.updateBalance(
        toAccountId,
        newToBalance,
        trx
      );

      // Commit transaction
      await trx.commit();

      return {
        fromAccount: updatedFromAccount,
        toAccount: updatedToAccount,
      };
    } catch (error: any) {
      // Rollback transaction on any error
      await trx.rollback();

      console.error('Error transferring funds:', error);

      // Rethrow known errors
      if (
        error.message.includes('ACCOUNT_NOT_FOUND') ||
        error.message.includes('INSUFFICIENT_BALANCE') ||
        error.message.includes('INVALID_TRANSFER')
      ) {
        throw error;
      }

      throw new Error(`Failed to transfer funds: ${error.message}`);
    }
  }

  /**
   * Get account details by ID
   * @param accountId - Account ID
   * @returns Promise<Account> - Account object
   * @throws Error if account not found
   */
  async getAccountById(accountId: string): Promise<Account> {
    try {
      const account = await accountRepository.findById(accountId);

      if (!account) {
        throw new Error('ACCOUNT_NOT_FOUND: Account does not exist');
      }

      return account;
    } catch (error: any) {
      console.error('Error getting account:', error);

      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        throw error;
      }

      throw new Error(`Failed to get account: ${error.message}`);
    }
  }

  /**
   * Get account with user details
   * @param accountId - Account ID
   * @returns Promise<any> - Account with user details
   * @throws Error if account not found
   */
  async getAccountWithUser(accountId: string): Promise<any> {
    try {
      const accountWithUser = await accountRepository.findByIdWithUser(accountId);

      if (!accountWithUser) {
        throw new Error('ACCOUNT_NOT_FOUND: Account does not exist');
      }

      return accountWithUser;
    } catch (error: any) {
      console.error('Error getting account with user:', error);

      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        throw error;
      }

      throw new Error(`Failed to get account with user: ${error.message}`);
    }
  }

  /**
   * Validate that amount is positive
   * @param amount - Amount to validate
   * @throws Error if amount is not positive
   */
  private validatePositiveAmount(amount: number): void {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('INVALID_AMOUNT: Amount must be a valid number');
    }

    if (amount <= 0) {
      throw new Error('INVALID_AMOUNT: Amount must be greater than zero');
    }

    // Validate reasonable precision (max 4 decimal places for currency)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 4) {
      throw new Error('INVALID_AMOUNT: Amount cannot have more than 4 decimal places');
    }
  }
}

export const accountService = new AccountService();

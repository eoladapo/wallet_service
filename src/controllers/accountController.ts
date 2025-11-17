import { Request, Response } from 'express';
import { accountService } from '../services/AccountService';
import { transactionService } from '../services/TransactionService';
import {
  FundAccountRequest,
  WithdrawRequest,
  AccountResponse,
  TransactionResponse,
  FundAccountResponse,
  WithdrawResponse,
  AccountWithUserResponse,
  TransactionHistoryResponse,
} from '../models/dto';
import db from '../config/database';

/**
 * Controller for account-related operations
 */
export class AccountController {
  /**
   * Fund an account
   * POST /api/accounts/:id/fund
   */
  async fundAccount(req: Request, res: Response): Promise<Response> {
    try {
      const accountId = req.params.id;
      const { amount }: FundAccountRequest = req.body;

      // Validate amount
      if (amount === undefined || amount === null) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Amount is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (typeof amount !== 'number' || isNaN(amount)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be a valid number',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than zero',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Get account before funding
      const accountBefore = await accountService.getAccountById(accountId);
      const balanceBefore = accountBefore.balance;

      // Fund the account (handles transaction internally)
      const updatedAccount = await accountService.fundAccount(accountId, amount);
      const balanceAfter = updatedAccount.balance;

      // Record the transaction in a separate transaction
      const trx = await db.transaction();
      try {
        const transaction = await transactionService.recordFundTransaction(
          accountId,
          amount,
          balanceBefore,
          balanceAfter,
          trx
        );
        await trx.commit();

        // Format response
        const accountResponse: AccountResponse = {
          id: updatedAccount.id,
          userId: updatedAccount.userId,
          balance: updatedAccount.balance,
          currency: updatedAccount.currency,
          status: updatedAccount.status,
          createdAt: updatedAccount.createdAt,
          updatedAt: updatedAccount.updatedAt,
        };

        const transactionResponse: TransactionResponse = {
          id: transaction.id,
          accountId: transaction.accountId,
          type: transaction.type,
          amount: transaction.amount,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          relatedAccountId: transaction.relatedAccountId,
          relatedTransactionId: transaction.relatedTransactionId,
          reference: transaction.reference,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt,
        };

        const response: FundAccountResponse = {
          account: accountResponse,
          transaction: transactionResponse,
        };

        return res.status(200).json(response);
      } catch (txError: any) {
        await trx.rollback();
        throw txError;
      }
    } catch (error: any) {
      console.error('Error in fund account endpoint:', error);

      // Handle account not found
      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        return res.status(404).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account does not exist',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Handle invalid amount errors
      if (error.message.includes('INVALID_AMOUNT')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
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
          message: 'An unexpected error occurred while funding account',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Withdraw funds from an account
   * POST /api/accounts/:id/withdraw
   */
  async withdrawFunds(req: Request, res: Response): Promise<Response> {
    try {
      const accountId = req.params.id;
      const { amount }: WithdrawRequest = req.body;

      // Validate amount
      if (amount === undefined || amount === null) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Amount is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (typeof amount !== 'number' || isNaN(amount)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be a valid number',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than zero',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Get account before withdrawal
      const accountBefore = await accountService.getAccountById(accountId);
      const balanceBefore = accountBefore.balance;

      // Withdraw from the account (handles transaction internally)
      const updatedAccount = await accountService.withdrawFunds(accountId, amount);
      const balanceAfter = updatedAccount.balance;

      // Record the transaction in a separate transaction
      const trx = await db.transaction();
      try {
        const transaction = await transactionService.recordWithdrawalTransaction(
          accountId,
          amount,
          balanceBefore,
          balanceAfter,
          trx
        );
        await trx.commit();

        // Format response
        const accountResponse: AccountResponse = {
          id: updatedAccount.id,
          userId: updatedAccount.userId,
          balance: updatedAccount.balance,
          currency: updatedAccount.currency,
          status: updatedAccount.status,
          createdAt: updatedAccount.createdAt,
          updatedAt: updatedAccount.updatedAt,
        };

        const transactionResponse: TransactionResponse = {
          id: transaction.id,
          accountId: transaction.accountId,
          type: transaction.type,
          amount: transaction.amount,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          relatedAccountId: transaction.relatedAccountId,
          relatedTransactionId: transaction.relatedTransactionId,
          reference: transaction.reference,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt,
        };

        const response: WithdrawResponse = {
          account: accountResponse,
          transaction: transactionResponse,
        };

        return res.status(200).json(response);
      } catch (txError: any) {
        await trx.rollback();
        throw txError;
      }
    } catch (error: any) {
      console.error('Error in withdraw endpoint:', error);

      // Handle account not found
      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        return res.status(404).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account does not exist',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Handle insufficient balance
      if (error.message.includes('INSUFFICIENT_BALANCE')) {
        return res.status(422).json({
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: error.message.split(':')[1]?.trim() || 'Insufficient balance for withdrawal',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Handle invalid amount errors
      if (error.message.includes('INVALID_AMOUNT')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
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
          message: 'An unexpected error occurred while withdrawing funds',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get account details with user information
   * GET /api/accounts/:id
   */
  async getAccountDetails(req: Request, res: Response): Promise<Response> {
    try {
      const accountId = req.params.id;

      // Get account with user details
      const accountWithUser = await accountService.getAccountWithUser(accountId);

      // Format response
      const response: AccountWithUserResponse = {
        id: accountWithUser.id,
        userId: accountWithUser.userId,
        balance: accountWithUser.balance,
        currency: accountWithUser.currency,
        status: accountWithUser.status,
        createdAt: accountWithUser.createdAt,
        updatedAt: accountWithUser.updatedAt,
        user: {
          id: accountWithUser.user.id,
          email: accountWithUser.user.email,
          firstName: accountWithUser.user.firstName,
          lastName: accountWithUser.user.lastName,
          createdAt: accountWithUser.user.createdAt,
        },
      };

      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Error in get account endpoint:', error);

      // Handle account not found
      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        return res.status(404).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account does not exist',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Handle other errors
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while fetching account details',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get transaction history for an account with pagination
   * GET /api/accounts/:id/transactions
   */
  async getTransactionHistory(req: Request, res: Response): Promise<Response> {
    try {
      const accountId = req.params.id;

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validate pagination parameters
      if (page < 1) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Page number must be greater than 0',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Limit must be between 1 and 100',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Verify account exists
      await accountService.getAccountById(accountId);

      // Get transaction history
      const { transactions, total } = await transactionService.getTransactionHistory(
        accountId,
        page,
        limit
      );

      // Format response
      const transactionResponses: TransactionResponse[] = transactions.map((tx) => ({
        id: tx.id,
        accountId: tx.accountId,
        type: tx.type,
        amount: tx.amount,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        relatedAccountId: tx.relatedAccountId,
        relatedTransactionId: tx.relatedTransactionId,
        reference: tx.reference,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
      }));

      const response: TransactionHistoryResponse = {
        transactions: transactionResponses,
        page,
        limit,
        total,
      };

      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Error in get transaction history endpoint:', error);

      // Handle account not found
      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        return res.status(404).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account does not exist',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Handle pagination errors
      if (error.message.includes('INVALID_PAGINATION')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PAGINATION',
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
          message: 'An unexpected error occurred while fetching transaction history',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

// Export singleton instance
export const accountController = new AccountController();

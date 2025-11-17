import { Request, Response } from 'express';
import { accountService } from '../services/AccountService';
import { transactionService } from '../services/TransactionService';
import { TransferRequest, TransferResponse, AccountResponse, TransactionResponse } from '../models/dto';
import db from '../config/database';

/**
 * Controller for transfer-related operations
 */
export class TransferController {
  /**
   * Transfer funds between accounts
   * POST /api/transfers
   */
  async transferFunds(req: Request, res: Response): Promise<Response> {
    try {
      const { fromAccountId, toAccountId, amount }: TransferRequest = req.body;

      // Validate required fields
      if (!fromAccountId || !toAccountId || amount === undefined || amount === null) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: fromAccountId, toAccountId, amount',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Validate amount
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

      // Get accounts before transfer
      const fromAccountBefore = await accountService.getAccountById(fromAccountId);
      const toAccountBefore = await accountService.getAccountById(toAccountId);

      const fromBalanceBefore = fromAccountBefore.balance;
      const toBalanceBefore = toAccountBefore.balance;

      // Perform the transfer (handles transaction internally)
      const { fromAccount, toAccount } = await accountService.transferFunds(
        fromAccountId,
        toAccountId,
        amount
      );

      const fromBalanceAfter = fromAccount.balance;
      const toBalanceAfter = toAccount.balance;

      // Record the transfer transactions in a separate transaction
      const trx = await db.transaction();
      try {
        const { debitTransaction, creditTransaction } = await transactionService.recordTransferTransactions(
          fromAccountId,
          toAccountId,
          amount,
          fromBalanceBefore,
          fromBalanceAfter,
          toBalanceBefore,
          toBalanceAfter,
          trx
        );

        await trx.commit();

        // Format response
        const fromAccountResponse: AccountResponse = {
          id: fromAccount.id,
          userId: fromAccount.userId,
          balance: fromAccount.balance,
          currency: fromAccount.currency,
          status: fromAccount.status,
          createdAt: fromAccount.createdAt,
          updatedAt: fromAccount.updatedAt,
        };

        const toAccountResponse: AccountResponse = {
          id: toAccount.id,
          userId: toAccount.userId,
          balance: toAccount.balance,
          currency: toAccount.currency,
          status: toAccount.status,
          createdAt: toAccount.createdAt,
          updatedAt: toAccount.updatedAt,
        };

        const debitTransactionResponse: TransactionResponse = {
          id: debitTransaction.id,
          accountId: debitTransaction.accountId,
          type: debitTransaction.type,
          amount: debitTransaction.amount,
          balanceBefore: debitTransaction.balanceBefore,
          balanceAfter: debitTransaction.balanceAfter,
          relatedAccountId: debitTransaction.relatedAccountId,
          relatedTransactionId: debitTransaction.relatedTransactionId,
          reference: debitTransaction.reference,
          description: debitTransaction.description,
          status: debitTransaction.status,
          createdAt: debitTransaction.createdAt,
        };

        const creditTransactionResponse: TransactionResponse = {
          id: creditTransaction.id,
          accountId: creditTransaction.accountId,
          type: creditTransaction.type,
          amount: creditTransaction.amount,
          balanceBefore: creditTransaction.balanceBefore,
          balanceAfter: creditTransaction.balanceAfter,
          relatedAccountId: creditTransaction.relatedAccountId,
          relatedTransactionId: creditTransaction.relatedTransactionId,
          reference: creditTransaction.reference,
          description: creditTransaction.description,
          status: creditTransaction.status,
          createdAt: creditTransaction.createdAt,
        };

        const response: TransferResponse = {
          fromAccount: fromAccountResponse,
          toAccount: toAccountResponse,
          debitTransaction: debitTransactionResponse,
          creditTransaction: creditTransactionResponse,
        };

        return res.status(200).json(response);
      } catch (txError: any) {
        await trx.rollback();
        throw txError;
      }
    } catch (error: any) {
      console.error('Error in transfer endpoint:', error);

      // Handle account not found
      if (error.message.includes('ACCOUNT_NOT_FOUND')) {
        return res.status(404).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: error.message.split(':')[1]?.trim() || 'Account does not exist',
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
            message: error.message.split(':')[1]?.trim() || 'Insufficient balance for transfer',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Handle invalid transfer errors
      if (error.message.includes('INVALID_TRANSFER') || error.message.includes('INVALID_AMOUNT')) {
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
          message: 'An unexpected error occurred during transfer',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

// Export singleton instance
export const transferController = new TransferController();

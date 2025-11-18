import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { authenticate } from '../middleware/auth';
import { financialLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all account routes
router.use(authenticate);

// Apply rate limiting to financial operations
router.use(financialLimiter);

/**
 * @swagger
 * /api/accounts/{accountId}/fund:
 *   post:
 *     summary: Fund an account
 *     description: Add funds to a user's wallet account. Creates a FUND transaction record.
 *     tags: [Accounts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The account ID
 *         example: 660e8400-e29b-41d4-a716-446655440001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: Amount to fund (must be greater than zero)
 *                 example: 5000.00
 *     responses:
 *       200:
 *         description: Account funded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account funded successfully
 *                 account:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid amount
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/fund', (req, res) => accountController.fundAccount(req, res));

/**
 * @swagger
 * /api/accounts/{accountId}/withdraw:
 *   post:
 *     summary: Withdraw funds from an account
 *     description: Withdraw funds from a user's wallet account. Validates sufficient balance before processing.
 *     tags: [Accounts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The account ID
 *         example: 660e8400-e29b-41d4-a716-446655440001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: Amount to withdraw (must be greater than zero)
 *                 example: 2000.00
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Withdrawal successful
 *                 account:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid amount
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Insufficient balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/withdraw', (req, res) => accountController.withdrawFunds(req, res));

/**
 * @swagger
 * /api/accounts/{accountId}:
 *   get:
 *     summary: Get account details
 *     description: Retrieve detailed information about an account including user information.
 *     tags: [Accounts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The account ID
 *         example: 660e8400-e29b-41d4-a716-446655440001
 *     responses:
 *       200:
 *         description: Account details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Account'
 *                 - type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', (req, res) => accountController.getAccountDetails(req, res));

/**
 * @swagger
 * /api/accounts/{accountId}/transactions:
 *   get:
 *     summary: Get transaction history
 *     description: Retrieve paginated transaction history for an account, ordered by most recent first.
 *     tags: [Accounts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The account ID
 *         example: 660e8400-e29b-41d4-a716-446655440001
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid pagination parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/transactions', (req, res) => accountController.getTransactionHistory(req, res));

export default router;

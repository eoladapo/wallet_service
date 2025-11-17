import { Router } from 'express';
import { transferController } from '../controllers/transferController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication to all transfer routes
router.use(authenticate);

/**
 * @swagger
 * /api/transfers:
 *   post:
 *     summary: Transfer funds between accounts
 *     description: Transfer funds from one account to another. The operation is atomic - both accounts are updated together or the entire transaction is rolled back. Creates paired TRANSFER_OUT and TRANSFER_IN transaction records.
 *     tags: [Transfers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccountId
 *               - toAccountId
 *               - amount
 *             properties:
 *               fromAccountId:
 *                 type: string
 *                 format: uuid
 *                 description: Source account ID
 *                 example: 660e8400-e29b-41d4-a716-446655440001
 *               toAccountId:
 *                 type: string
 *                 format: uuid
 *                 description: Destination account ID
 *                 example: 660e8400-e29b-41d4-a716-446655440002
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: Amount to transfer (must be greater than zero)
 *                 example: 1000.00
 *     responses:
 *       200:
 *         description: Transfer completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Transfer completed successfully
 *                 fromAccount:
 *                   $ref: '#/components/schemas/Account'
 *                 toAccount:
 *                   $ref: '#/components/schemas/Account'
 *                 debitTransaction:
 *                   $ref: '#/components/schemas/Transaction'
 *                 creditTransaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid transfer request (e.g., same account transfer)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: One or both accounts not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Insufficient balance in source account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', (req, res) => transferController.transferFunds(req, res));

export default router;

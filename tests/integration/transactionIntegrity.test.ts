import request from 'supertest';
import app from '../../src/app';
import db from '../../src/config/database';
import { createTestUser, createTestAccount, getAccountBalance, generateAuthToken } from '../utils/testHelpers';

describe('Transaction Integrity Integration Tests', () => {
  describe('Concurrent Operations', () => {
    it('should handle concurrent withdrawals correctly', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      // Attempt two concurrent withdrawals
      const withdrawal1 = request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 600 });

      const withdrawal2 = request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 600 });

      const [response1, response2] = await Promise.all([withdrawal1, withdrawal2]);

      // One should succeed, one should fail with insufficient balance
      const responses = [response1, response2];
      const successCount = responses.filter(r => r.status === 200).length;
      const failureCount = responses.filter(r => r.status === 422).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify final balance is correct (either 400 or 1000)
      const finalBalance = await getAccountBalance(account.id);
      expect([400, 1000]).toContain(finalBalance);
    });

    it('should handle concurrent funding operations correctly', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      // Perform multiple concurrent funding operations
      const fundingPromises = Array(5).fill(null).map(() =>
        request(app)
          .post(`/api/accounts/${account.id}/fund`)
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: 100 })
      );

      const responses = await Promise.all(fundingPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify final balance is correct
      const finalBalance = await getAccountBalance(account.id);
      expect(finalBalance).toBe(500);
    });

    it('should handle concurrent transfers correctly', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const account1 = await createTestAccount(user1.id, 1000);
      const token = generateAuthToken(user1.id, account1.id);

      const user2 = await createTestUser({ email: 'user2@example.com' });
      const account2 = await createTestAccount(user2.id, 0);

      // Attempt multiple concurrent transfers
      const transferPromises = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/transfers')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fromAccountId: account1.id,
            toAccountId: account2.id,
            amount: 400,
          })
      );

      const responses = await Promise.all(transferPromises);

      // Some should succeed, some should fail
      const successCount = responses.filter(r => r.status === 200).length;
      const failureCount = responses.filter(r => r.status === 422).length;

      // At most 2 can succeed (1000 / 400 = 2.5)
      expect(successCount).toBeLessThanOrEqual(2);
      expect(successCount + failureCount).toBeGreaterThanOrEqual(2);
      expect(responses.length).toBe(3);

      // Verify balances are consistent
      const balance1 = await getAccountBalance(account1.id);
      const balance2 = await getAccountBalance(account2.id);
      expect(balance1 + balance2).toBe(1000);
    });
  });

  describe('Transaction Rollback Scenarios', () => {
    it('should rollback transfer if destination account does not exist', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      const initialBalance = await getAccountBalance(account.id);

      await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: account.id,
          toAccountId: 'non-existent-account',
          amount: 500,
        })
        .expect(404);

      // Verify source account balance unchanged
      const finalBalance = await getAccountBalance(account.id);
      expect(finalBalance).toBe(initialBalance);
      expect(finalBalance).toBe(1000);
    });

    it('should maintain data integrity when withdrawal fails', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 100);
      const token = generateAuthToken(user.id, account.id);

      // Get initial transaction count
      const initialTxCount = await db('transactions')
        .where({ account_id: account.id })
        .count('* as count');

      // Attempt withdrawal that should fail
      await request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 500 })
        .expect(422);

      // Verify balance unchanged
      const balance = await getAccountBalance(account.id);
      expect(balance).toBe(100);

      // Verify no transaction record was created
      const finalTxCount = await db('transactions')
        .where({ account_id: account.id })
        .count('* as count');
      expect(finalTxCount[0].count).toBe(initialTxCount[0].count);
    });

    it('should rollback both accounts if transfer fails mid-operation', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const account1 = await createTestAccount(user1.id, 1000);
      const token = generateAuthToken(user1.id, account1.id);

      const user2 = await createTestUser({ email: 'user2@example.com' });
      const account2 = await createTestAccount(user2.id, 500);

      // Store initial balances
      const initialBalance1 = await getAccountBalance(account1.id);
      const initialBalance2 = await getAccountBalance(account2.id);

      // Attempt transfer with insufficient funds
      await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: account1.id,
          toAccountId: account2.id,
          amount: 2000,
        })
        .expect(422);

      // Verify both balances unchanged
      const finalBalance1 = await getAccountBalance(account1.id);
      const finalBalance2 = await getAccountBalance(account2.id);
      expect(finalBalance1).toBe(initialBalance1);
      expect(finalBalance2).toBe(initialBalance2);
    });
  });

  describe('Transaction History', () => {
    it('should record transaction for successful funding', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      await request(app)
        .post(`/api/accounts/${account.id}/fund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 1000 })
        .expect(200);

      // Verify transaction was recorded
      const transactions = await db('transactions')
        .where({ account_id: account.id })
        .select('*');

      expect(transactions.length).toBe(1);
      expect(transactions[0].type).toBe('FUND');
      expect(parseFloat(transactions[0].amount)).toBe(1000);
      expect(parseFloat(transactions[0].balance_before)).toBe(0);
      expect(parseFloat(transactions[0].balance_after)).toBe(1000);
    });

    it('should record transaction for successful withdrawal', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      await request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 300 })
        .expect(200);

      // Verify transaction was recorded
      const transactions = await db('transactions')
        .where({ account_id: account.id })
        .select('*');

      expect(transactions.length).toBe(1);
      expect(transactions[0].type).toBe('WITHDRAW');
      expect(parseFloat(transactions[0].amount)).toBe(300);
      expect(parseFloat(transactions[0].balance_before)).toBe(1000);
      expect(parseFloat(transactions[0].balance_after)).toBe(700);
    });

    it('should record paired transactions for successful transfer', async () => {
      const user1 = await createTestUser({ email: 'sender@example.com' });
      const account1 = await createTestAccount(user1.id, 1000);
      const token = generateAuthToken(user1.id, account1.id);

      const user2 = await createTestUser({ email: 'receiver@example.com' });
      const account2 = await createTestAccount(user2.id, 500);

      await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: account1.id,
          toAccountId: account2.id,
          amount: 400,
        })
        .expect(200);

      // Verify transactions for sender
      const senderTxs = await db('transactions')
        .where({ account_id: account1.id })
        .select('*');

      expect(senderTxs.length).toBe(1);
      expect(senderTxs[0].type).toBe('TRANSFER_OUT');
      expect(parseFloat(senderTxs[0].amount)).toBe(400);
      expect(senderTxs[0].related_account_id).toBe(account2.id);

      // Verify transactions for receiver
      const receiverTxs = await db('transactions')
        .where({ account_id: account2.id })
        .select('*');

      expect(receiverTxs.length).toBe(1);
      expect(receiverTxs[0].type).toBe('TRANSFER_IN');
      expect(parseFloat(receiverTxs[0].amount)).toBe(400);
      expect(receiverTxs[0].related_account_id).toBe(account1.id);

      // Verify transactions are linked
      expect(senderTxs[0].related_transaction_id).toBe(receiverTxs[0].id);
      expect(receiverTxs[0].related_transaction_id).toBe(senderTxs[0].id);
    });

    it('should retrieve transaction history via API', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      // Perform multiple operations
      await request(app)
        .post(`/api/accounts/${account.id}/fund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 500 });

      await request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 200 });

      // Get transaction history
      const response = await request(app)
        .get(`/api/accounts/${account.id}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body.transactions.length).toBe(2);
      // Transactions are ordered by created_at desc, so most recent first
      const types = response.body.transactions.map((t: any) => t.type);
      expect(types).toContain('WITHDRAW');
      expect(types).toContain('FUND');
    });
  });

  describe('Error Response Format', () => {
    it('should return standardized error format for validation errors', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -100 })
        .expect(400);

      // Verify error response structure
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    it('should return standardized error format for business logic errors', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 100);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 500 })
        .expect(422);

      // Verify error response structure
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('should return standardized error format for not found errors', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .get('/api/accounts/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      // Verify error response structure
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
    });
  });
});

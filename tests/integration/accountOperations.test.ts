import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createTestAccount, getAccountBalance, generateAuthToken } from '../utils/testHelpers';

describe('Account Operations Integration Tests', () => {
  describe('POST /api/accounts/:id/fund - Account Funding', () => {
    it('should fund account with valid amount', async () => {
      // Create test user and account
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      const fundAmount = 1000;

      const response = await request(app)
        .post(`/api/accounts/${account.id}/fund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: fundAmount })
        .expect(200);

      // Verify response
      expect(response.body).toHaveProperty('account');
      expect(response.body.account.balance).toBe(fundAmount);

      // Verify database balance
      const dbBalance = await getAccountBalance(account.id);
      expect(dbBalance).toBe(fundAmount);
    });

    it('should reject funding with negative amount', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post(`/api/accounts/${account.id}/fund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -100 })
        .expect(400);

      expect(response.body.error.message).toContain('greater than zero');
    });

    it('should reject funding with zero amount', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post(`/api/accounts/${account.id}/fund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 0 })
        .expect(400);

      expect(response.body.error.message).toContain('greater than zero');
    });

    it('should return 404 for non-existent account', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post('/api/accounts/non-existent-id/fund')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 })
        .expect(404);

      expect(response.body.error.message).toContain('does not exist');
    });
  });

  describe('POST /api/accounts/:id/withdraw - Account Withdrawal', () => {
    it('should withdraw funds with sufficient balance', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      const withdrawAmount = 300;

      const response = await request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: withdrawAmount })
        .expect(200);

      // Verify response
      expect(response.body.account.balance).toBe(700);

      // Verify database balance
      const dbBalance = await getAccountBalance(account.id);
      expect(dbBalance).toBe(700);
    });

    it('should reject withdrawal with insufficient balance', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 100);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 500 })
        .expect(422);

      expect(response.body.error.message).toContain('insufficient');

      // Verify balance unchanged
      const dbBalance = await getAccountBalance(account.id);
      expect(dbBalance).toBe(100);
    });

    it('should reject withdrawal with negative amount', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post(`/api/accounts/${account.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -50 })
        .expect(400);

      expect(response.body.error.message).toContain('greater than zero');
    });

    it('should return 404 for non-existent account', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post('/api/accounts/non-existent-id/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 })
        .expect(404);

      expect(response.body.error.message).toContain('does not exist');
    });
  });

  describe('POST /api/transfers - Fund Transfer', () => {
    it('should transfer funds between accounts successfully', async () => {
      // Create two users with accounts
      const user1 = await createTestUser({ email: 'sender@example.com' });
      const account1 = await createTestAccount(user1.id, 1000);
      const token = generateAuthToken(user1.id, account1.id);

      const user2 = await createTestUser({ email: 'receiver@example.com' });
      const account2 = await createTestAccount(user2.id, 500);

      const transferAmount = 300;

      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: account1.id,
          toAccountId: account2.id,
          amount: transferAmount,
        })
        .expect(200);

      // Verify response
      expect(response.body).toHaveProperty('fromAccount');
      expect(response.body).toHaveProperty('toAccount');
      expect(response.body.fromAccount.balance).toBe(700);
      expect(response.body.toAccount.balance).toBe(800);

      // Verify database balances
      const balance1 = await getAccountBalance(account1.id);
      const balance2 = await getAccountBalance(account2.id);
      expect(balance1).toBe(700);
      expect(balance2).toBe(800);
    });

    it('should reject transfer with insufficient balance', async () => {
      const user1 = await createTestUser({ email: 'sender@example.com' });
      const account1 = await createTestAccount(user1.id, 100);
      const token = generateAuthToken(user1.id, account1.id);

      const user2 = await createTestUser({ email: 'receiver@example.com' });
      const account2 = await createTestAccount(user2.id, 0);

      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: account1.id,
          toAccountId: account2.id,
          amount: 500,
        })
        .expect(422);

      expect(response.body.error.message).toContain('insufficient');

      // Verify balances unchanged
      const balance1 = await getAccountBalance(account1.id);
      const balance2 = await getAccountBalance(account2.id);
      expect(balance1).toBe(100);
      expect(balance2).toBe(0);
    });

    it('should reject transfer to same account', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: account.id,
          toAccountId: account.id,
          amount: 100,
        })
        .expect(400);

      expect(response.body.error.message).toContain('same account');
    });

    it('should reject transfer with non-existent source account', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: 'non-existent-id',
          toAccountId: account.id,
          amount: 100,
        })
        .expect(404);

      expect(response.body.error.message).toContain('does not exist');
    });

    it('should reject transfer with non-existent destination account', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1000);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccountId: account.id,
          toAccountId: 'non-existent-id',
          amount: 100,
        })
        .expect(404);

      expect(response.body.error.message).toContain('does not exist');
    });
  });

  describe('GET /api/accounts/:id - Get Account Details', () => {
    it('should retrieve account details successfully', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 1500);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .get(`/api/accounts/${account.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('user');
      expect(response.body.id).toBe(account.id);
      expect(response.body.balance).toBe(1500);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
    });

    it('should return 404 for non-existent account', async () => {
      const user = await createTestUser();
      const account = await createTestAccount(user.id, 0);
      const token = generateAuthToken(user.id, account.id);

      const response = await request(app)
        .get('/api/accounts/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error.message).toContain('does not exist');
    });
  });
});

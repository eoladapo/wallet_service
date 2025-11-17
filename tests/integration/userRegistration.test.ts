import request from 'supertest';
import app from '../../src/app';
import db from '../../src/config/database';
import { createTestUser } from '../utils/testHelpers';
import { karmaService } from '../../src/services/KarmaService';

// Mock the Karma service
jest.mock('../../src/services/KarmaService');

describe('User Registration Integration Tests', () => {
  describe('POST /api/users - Successful Registration', () => {
    it('should register a new user with valid data', async () => {
      // Mock Karma API to return not blacklisted
      (karmaService.checkBlacklist as jest.Mock).mockResolvedValue(false);

      const userData = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'securePassword123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('account');
      expect(response.body.user.email).toBe(userData.email.toLowerCase());
      expect(response.body.user.firstName).toBe(userData.firstName);
      expect(response.body.user.lastName).toBe(userData.lastName);
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify account was created with zero balance
      expect(response.body.account.balance).toBe(0);
      expect(response.body.account.currency).toBe('NGN');
      expect(response.body.account.status).toBe('ACTIVE');

      // Verify user exists in database
      const dbUser = await db('users')
        .where({ email: userData.email.toLowerCase() })
        .first();
      expect(dbUser).toBeDefined();
      expect(dbUser.first_name).toBe(userData.firstName);

      // Verify account exists in database
      const dbAccount = await db('accounts')
        .where({ user_id: dbUser.id })
        .first();
      expect(dbAccount).toBeDefined();
      expect(parseFloat(dbAccount.balance)).toBe(0);
    });
  });

  describe('POST /api/users - Blacklist Scenarios', () => {
    it('should reject registration for blacklisted user', async () => {
      // Mock Karma API to return blacklisted
      (karmaService.checkBlacklist as jest.Mock).mockResolvedValue(true);

      const userData = {
        email: 'blacklisted@example.com',
        firstName: 'Blocked',
        lastName: 'User',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(422);

      // Verify error response format
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('not eligible');

      // Verify user was not created in database
      const dbUser = await db('users')
        .where({ email: userData.email.toLowerCase() })
        .first();
      expect(dbUser).toBeUndefined();
    });

    it('should handle Karma API failure gracefully', async () => {
      // Mock Karma API to throw error
      (karmaService.checkBlacklist as jest.Mock).mockRejectedValue(
        new Error('Karma API unavailable')
      );

      const userData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(500);

      // Verify error response
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('unexpected error');
    });
  });

  describe('POST /api/users - Validation Errors', () => {
    beforeEach(() => {
      // Mock Karma API to return not blacklisted for validation tests
      (karmaService.checkBlacklist as jest.Mock).mockResolvedValue(false);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body.error.message).toContain('email');
    });

    it('should reject registration with missing firstName', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: '',
        lastName: 'Doe',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body.error.message).toContain('required fields');
    });

    it('should reject registration with short password', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'short',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body.error.message).toContain('Password');
    });

    it('should reject registration with duplicate email', async () => {
      // Create existing user
      await createTestUser({ email: 'existing@example.com' });

      const userData = {
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body.error.message).toContain('already registered');
    });
  });
});

import db from '../../src/config/database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { generateToken } from '../../src/middleware/auth';

/**
 * Clean all test data from database
 */
export async function cleanDatabase(): Promise<void> {
  await db('transactions').del();
  await db('accounts').del();
  await db('users').del();
}

/**
 * Create a test user directly in database
 */
export async function createTestUser(data?: {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}): Promise<{ id: string; email: string; firstName: string; lastName: string }> {
  const userId = uuidv4();
  const email = data?.email || `test-${uuidv4()}@example.com`;
  const firstName = data?.firstName || 'Test';
  const lastName = data?.lastName || 'User';
  const password = data?.password || 'password123';
  
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  await db('users').insert({
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  });

  return { id: userId, email, firstName, lastName };
}

/**
 * Create a test account directly in database
 */
export async function createTestAccount(
  userId: string,
  balance: number = 0
): Promise<{ id: string; userId: string; balance: number }> {
  const accountId = uuidv4();
  const now = new Date();

  await db('accounts').insert({
    id: accountId,
    user_id: userId,
    balance,
    currency: 'NGN',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
  });

  return { id: accountId, userId, balance };
}

/**
 * Get account balance from database
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  const account = await db('accounts').where({ id: accountId }).first();
  return account ? parseFloat(account.balance) : 0;
}

/**
 * Get transaction count for an account
 */
export async function getTransactionCount(accountId: string): Promise<number> {
  const result = await db('transactions').where({ account_id: accountId }).count('* as count');
  return result[0].count as number;
}

/**
 * Wait for a specified time (for testing concurrent operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate authentication token for testing
 */
export function generateAuthToken(userId: string, accountId: string): string {
  return generateToken(userId, accountId);
}

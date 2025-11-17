import dotenv from 'dotenv';
import path from 'path';
import db from '../src/config/database';

// Set test environment first
process.env.NODE_ENV = 'test';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Global test setup
beforeAll(async () => {
  // Run migrations on test database
  await db.migrate.latest();
});

// Clean up after each test
afterEach(async () => {
  // Clear all tables in reverse order to respect foreign keys
  await db('transactions').del();
  await db('accounts').del();
  await db('users').del();
});

// Global test teardown
afterAll(async () => {
  // Close database connections
  await db.destroy();
});

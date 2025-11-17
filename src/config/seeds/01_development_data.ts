import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed script for development data
 * Creates test users with accounts and sample transactions
 */
export async function seed(knex: Knex): Promise<void> {
  // Clear existing data in reverse order of dependencies
  await knex('transactions').del();
  await knex('accounts').del();
  await knex('users').del();

  // Hash password for test users (password: "Password123!")
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Create test users
  const users = [
    {
      id: uuidv4(),
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe',
      password_hash: passwordHash,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      email: 'jane.smith@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      password_hash: passwordHash,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      email: 'bob.johnson@example.com',
      first_name: 'Bob',
      last_name: 'Johnson',
      password_hash: passwordHash,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ];

  await knex('users').insert(users);

  // Create accounts for each user
  const accounts = users.map((user) => ({
    id: uuidv4(),
    user_id: user.id,
    balance: 10000.00, // Starting balance of 10,000 NGN
    currency: 'NGN',
    status: 'ACTIVE',
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  }));

  await knex('accounts').insert(accounts);

  // Create sample transactions
  const now = Date.now();
  const sampleTransactions = [
    // Initial funding for all accounts
    {
      id: uuidv4(),
      account_id: accounts[0].id,
      type: 'FUND',
      amount: 10000.00,
      balance_before: 0,
      balance_after: 10000.00,
      reference: `FUND-${now}-${Math.random().toString(36).substr(2, 9)}`,
      description: 'Initial account funding',
      status: 'COMPLETED',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      account_id: accounts[1].id,
      type: 'FUND',
      amount: 10000.00,
      balance_before: 0,
      balance_after: 10000.00,
      reference: `FUND-${now + 1}-${Math.random().toString(36).substr(2, 9)}`,
      description: 'Initial account funding',
      status: 'COMPLETED',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: uuidv4(),
      account_id: accounts[2].id,
      type: 'FUND',
      amount: 10000.00,
      balance_before: 0,
      balance_after: 10000.00,
      reference: `FUND-${now + 2}-${Math.random().toString(36).substr(2, 9)}`,
      description: 'Initial account funding',
      status: 'COMPLETED',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ];

  await knex('transactions').insert(sampleTransactions);

  // Create withdrawal transaction for first account
  const withdrawalTxId = uuidv4();
  await knex('transactions').insert({
    id: withdrawalTxId,
    account_id: accounts[0].id,
    type: 'WITHDRAW',
    amount: 2000.00,
    balance_before: 10000.00,
    balance_after: 8000.00,
    reference: `WTH-${now + 3}-${Math.random().toString(36).substr(2, 9)}`,
    description: 'Cash withdrawal',
    status: 'COMPLETED',
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  // Update first account balance after withdrawal
  await knex('accounts')
    .where({ id: accounts[0].id })
    .update({ balance: 8000.00 });

  // Create transfer transactions (from account 1 to account 2)
  const debitTxId = uuidv4();
  const creditTxId = uuidv4();

  await knex('transactions').insert([
    {
      id: debitTxId,
      account_id: accounts[0].id,
      type: 'TRANSFER_OUT',
      amount: 1500.00,
      balance_before: 8000.00,
      balance_after: 6500.00,
      related_account_id: accounts[1].id,
      related_transaction_id: creditTxId,
      reference: `TXN-${now + 4}-${Math.random().toString(36).substr(2, 9)}`,
      description: `Transfer to account ${accounts[1].id}`,
      status: 'COMPLETED',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      id: creditTxId,
      account_id: accounts[1].id,
      type: 'TRANSFER_IN',
      amount: 1500.00,
      balance_before: 10000.00,
      balance_after: 11500.00,
      related_account_id: accounts[0].id,
      related_transaction_id: debitTxId,
      reference: `TXN-${now + 5}-${Math.random().toString(36).substr(2, 9)}`,
      description: `Transfer from account ${accounts[0].id}`,
      status: 'COMPLETED',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);

  // Update account balances after transfer
  await knex('accounts')
    .where({ id: accounts[0].id })
    .update({ balance: 6500.00 });

  await knex('accounts')
    .where({ id: accounts[1].id })
    .update({ balance: 11500.00 });

  console.log('✅ Development seed data created successfully');
  console.log(`📧 Test users created with email/password:`);
  console.log(`   - john.doe@example.com / Password123! (Balance: 6,500 NGN)`);
  console.log(`   - jane.smith@example.com / Password123! (Balance: 11,500 NGN)`);
  console.log(`   - bob.johnson@example.com / Password123! (Balance: 10,000 NGN)`);
  console.log(`\n💰 Sample transactions created:`);
  console.log(`   - 3x FUND transactions (initial funding)`);
  console.log(`   - 1x WITHDRAW transaction (John withdrew 2,000 NGN)`);
  console.log(`   - 1x TRANSFER (John sent 1,500 NGN to Jane)`);
}

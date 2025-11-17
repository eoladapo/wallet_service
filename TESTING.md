# Testing Guide

This document provides instructions for setting up and running integration tests for the Wallet Service MVP.

## Prerequisites

- MySQL server running locally
- Node.js and npm installed
- Project dependencies installed (`npm install`)

## Quick Start

### 1. Configure Test Environment

Update the `.env.test` file with your MySQL credentials:

```env
DB_USER=root
DB_PASSWORD=your_mysql_password
```

### 2. Create Test Database

Option A - Using MySQL CLI:
```bash
mysql -u root -p < scripts/setup-test-db.sql
```

Option B - Manual creation:
```sql
CREATE DATABASE wallet_service_test;
```

### 3. Run Migrations

```bash
npm run test:migrate
```

### 4. Run Tests

```bash
npm test
```

## Test Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all integration tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:migrate` | Run migrations on test database |
| `npm run test:rollback` | Rollback migrations on test database |

## Test Coverage

The integration tests cover the following critical flows:

### 1. User Registration (`userRegistration.test.ts`)
- ✅ Successful registration with valid data
- ✅ Blacklist verification via Karma API
- ✅ Rejection of blacklisted users
- ✅ Karma API failure handling
- ✅ Input validation (email, password, names)
- ✅ Duplicate email detection
- ✅ Automatic account creation with zero balance

### 2. Account Operations (`accountOperations.test.ts`)
- ✅ Account funding with valid amounts
- ✅ Fund withdrawal with sufficient balance
- ✅ Insufficient balance handling
- ✅ Fund transfers between accounts
- ✅ Transfer validation (same account, non-existent accounts)
- ✅ Amount validation (negative, zero, precision)
- ✅ Account details retrieval

### 3. Transaction Integrity (`transactionIntegrity.test.ts`)
- ✅ Concurrent withdrawal operations
- ✅ Concurrent funding operations
- ✅ Concurrent transfer operations
- ✅ Transaction rollback on failures
- ✅ Data integrity maintenance
- ✅ Transaction history recording
- ✅ Paired transaction creation for transfers
- ✅ Error response format standardization

## Test Database

- **Database Name**: `wallet_service_test`
- **Isolation**: Each test runs in isolation with database cleanup
- **Cleanup**: All tables are cleared after each test
- **Migrations**: Same migrations as production database

## Mocking

- **Karma API**: Mocked using Jest to avoid external API calls during tests
- **Environment**: Test environment variables loaded from `.env.test`

## Troubleshooting

### Database Connection Errors

If you see "Access denied" errors:
1. Check your MySQL credentials in `.env.test`
2. Ensure MySQL server is running
3. Verify the test database exists

### Port Already in Use

If you see "EADDRINUSE" errors:
1. Ensure no other instance of the app is running
2. Tests now use a separate app instance that doesn't start a server

### Migration Errors

If migrations fail:
1. Ensure the test database exists
2. Run `npm run test:rollback` to reset
3. Run `npm run test:migrate` again

### Jest Doesn't Exit

If Jest hangs after tests:
1. Check for open database connections
2. Ensure all async operations complete
3. Run with `--detectOpenHandles` to debug

## Best Practices

1. **Run tests before committing**: Ensure all tests pass
2. **Keep tests isolated**: Each test should be independent
3. **Use test helpers**: Leverage utilities in `tests/utils/testHelpers.ts`
4. **Mock external services**: Don't make real API calls in tests
5. **Clean up resources**: Database cleanup is automatic, but be mindful of other resources

## CI/CD Integration

To integrate these tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Setup Test Database
  run: mysql -u root -p${{ secrets.MYSQL_PASSWORD }} < scripts/setup-test-db.sql

- name: Run Migrations
  run: npm run test:migrate

- name: Run Tests
  run: npm test
```

## Requirements Coverage

These integration tests satisfy the following requirements from the spec:

- **Requirement 5.1**: Transaction atomicity and rollback scenarios
- **Requirement 5.2**: Concurrent operation handling
- **Requirement 7.3**: Error response format standardization

All critical user flows are tested end-to-end through the API layer.

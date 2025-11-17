# Integration Tests

## Setup

### 1. Database Configuration

Create a test database in MySQL:

```sql
CREATE DATABASE wallet_service_test;
```

### 2. Environment Configuration

Copy `.env.test` and update with your MySQL credentials:

```bash
DB_USER=root
DB_PASSWORD=your_mysql_password
```

### 3. Run Migrations

Run migrations on the test database:

```bash
cross-env NODE_ENV=test npm run migrate:latest
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `tests/integration/` - Integration tests for API endpoints
  - `userRegistration.test.ts` - User registration and blacklist scenarios
  - `accountOperations.test.ts` - Funding, withdrawal, and transfer operations
  - `transactionIntegrity.test.ts` - Concurrent operations and rollback scenarios
- `tests/utils/` - Test utilities and helpers
- `tests/setup.ts` - Global test setup and teardown

## Notes

- Tests run against a separate test database (`wallet_service_test`)
- Database is cleaned after each test
- Karma API is mocked in tests
- Tests run sequentially (`--runInBand`) to avoid race conditions

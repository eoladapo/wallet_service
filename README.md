# Wallet Service MVP

A RESTful API backend service for Demo Credit, a mobile lending application. The wallet service enables users to create accounts, fund wallets, transfer money between users, and withdraw funds with integration to the Lendsqr Adjutor Karma blacklist.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)

## Features

- ✅ User registration with Karma blacklist verification
- ✅ Account creation with automatic initialization
- ✅ Fund account operations
- ✅ Transfer funds between users
- ✅ Withdraw funds from account
- ✅ Transaction history with pagination
- ✅ ACID-compliant financial transactions
- ✅ Row-level locking for concurrency control
- ✅ Rate limiting to prevent API abuse
- ✅ Comprehensive error handling
- ✅ Secure password hashing with bcrypt

## Technology Stack

- **Runtime:** Node.js LTS with TypeScript
- **Framework:** Express.js
- **Database:** MySQL
- **ORM:** KnexJS
- **Authentication:** bcrypt for password hashing
- **External API:** Lendsqr Adjutor Karma API
- **Testing:** Jest with Supertest

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (LTS version 18.x or higher)
- npm or yarn
- MySQL (8.0 or higher)
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd wallet-service-mvp
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration (see [Environment Configuration](#environment-configuration))

## Database Setup

### Create Database

Create the development and test databases in MySQL:

```sql
CREATE DATABASE wallet_service;
CREATE DATABASE wallet_service_test;
```

### Run Migrations

Apply database migrations to create tables:

```bash
# Development database
npm run migrate:latest

# Test database
npm run test:migrate
```

### Seed Development Data (Optional)

Populate the database with test users and accounts:

```bash
npm run seed:run
```

This creates three test users with accounts:
- **Email:** john.doe@example.com | **Password:** Password123!
- **Email:** jane.smith@example.com | **Password:** Password123!
- **Email:** bob.johnson@example.com | **Password:** Password123!

Each account is funded with 10,000 NGN.

### Migration Commands

```bash
# Run latest migrations
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:make <migration_name>

# Run seeds
npm run seed:run
```

## Environment Configuration

Configure the following environment variables in your `.env` file:

### Server Configuration
```env
PORT=3000                    # Server port
NODE_ENV=development         # Environment: development, test, production
```

### Database Configuration
```env
DB_HOST=localhost           # Database host
DB_PORT=3306                # Database port
DB_USER=root                # Database user
DB_PASSWORD=your_password   # Database password
DB_NAME=wallet_service      # Database name
```

### Karma API Configuration
```env
KARMA_API_BASE_URL=https://adjutor.lendsqr.com
KARMA_API_TOKEN=your_karma_api_token
```

### Security
```env
BCRYPT_ROUNDS=10            # bcrypt hashing rounds (10-12 recommended)
```

## Running the Application

### Development Mode

Start the server with hot-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

### Production Mode

Build and run the production version:

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

### Health Check

Verify the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

## API Documentation

### Interactive Swagger Documentation

Access the interactive API documentation at:
- **Swagger UI:** `http://localhost:3000/api-docs`
- **OpenAPI JSON:** `http://localhost:3000/api-docs.json`

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Interactive "Try it out" functionality
- Example requests and responses
- Error response formats
- Built-in authentication testing

### API Base URL

Base URL: `http://localhost:3000/api`

### Authentication

Most endpoints require authentication using a Bearer token.

**How to authenticate:**

1. **Register a user** (no auth required):
   ```bash
   POST /api/users
   ```

2. **Login to get your token**:
   ```bash
   POST /api/auth/login
   {
     "email": "john.doe@example.com",
     "password": "Password123!"
   }
   ```
   
   Response includes a `token` field with format: `user_{userId}`

3. **Use the token in subsequent requests**:
   ```bash
   Authorization: Bearer user_550e8400-e29b-41d4-a716-446655440000
   ```

**Protected Endpoints** (require authentication):
- All `/api/accounts/*` endpoints
- All `/api/transfers/*` endpoints

**Public Endpoints** (no authentication required):
- `POST /api/users` - User registration
- `POST /api/auth/login` - User login

### 1. Login (Get Authentication Token)

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "Password123!"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "user_550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "account": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "balance": 6500.00,
    "currency": "NGN",
    "status": "ACTIVE"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  },
  "timestamp": "2025-11-17T10:30:00.000Z",
  "path": "/api/auth/login"
}
```

---

### 2. Create User Account

Register a new user and create their wallet account.

**Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!"
}
```

**Success Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "account": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "balance": 0,
    "currency": "NGN",
    "status": "ACTIVE"
  }
}
```

**Error Responses:**

*400 Bad Request - Validation Error:*
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Valid email is required"
    }
  }
}
```

*422 Unprocessable Entity - User Blacklisted:*
```json
{
  "error": {
    "code": "USER_BLACKLISTED",
    "message": "User is blacklisted and cannot be registered"
  }
}
```

---

### 2. Fund Account

Add funds to a user's account.

**Endpoint:** `POST /api/accounts/:id/fund`

**URL Parameters:**
- `id` (string, required): Account ID

**Request Body:**
```json
{
  "amount": 5000.00
}
```

**Success Response (200 OK):**
```json
{
  "message": "Account funded successfully",
  "account": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "balance": 5000.00,
    "currency": "NGN"
  },
  "transaction": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "type": "FUND",
    "amount": 5000.00,
    "reference": "FUND-1700123456789-abc123",
    "status": "COMPLETED"
  }
}
```

**Error Responses:**

*400 Bad Request - Invalid Amount:*
```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount must be a positive number"
  }
}
```

*404 Not Found - Account Not Found:*
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```

---

### 3. Transfer Funds

Transfer funds from one account to another.

**Endpoint:** `POST /api/transfers`

**Request Body:**
```json
{
  "fromAccountId": "660e8400-e29b-41d4-a716-446655440001",
  "toAccountId": "660e8400-e29b-41d4-a716-446655440002",
  "amount": 1000.00
}
```

**Success Response (200 OK):**
```json
{
  "message": "Transfer completed successfully",
  "transfer": {
    "fromAccountId": "660e8400-e29b-41d4-a716-446655440001",
    "toAccountId": "660e8400-e29b-41d4-a716-446655440002",
    "amount": 1000.00,
    "reference": "TRF-1700123456789-xyz789"
  },
  "fromAccount": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "balance": 4000.00
  },
  "toAccount": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "balance": 1000.00
  }
}
```

**Error Responses:**

*422 Unprocessable Entity - Insufficient Balance:*
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for transfer",
    "details": {
      "requestedAmount": 1000.00,
      "availableBalance": 500.00
    }
  }
}
```

*404 Not Found - Invalid Account:*
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "One or both accounts not found"
  }
}
```

---

### 4. Withdraw Funds

Withdraw funds from an account.

**Endpoint:** `POST /api/accounts/:id/withdraw`

**URL Parameters:**
- `id` (string, required): Account ID

**Request Body:**
```json
{
  "amount": 2000.00
}
```

**Success Response (200 OK):**
```json
{
  "message": "Withdrawal successful",
  "account": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "balance": 2000.00,
    "currency": "NGN"
  },
  "transaction": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "type": "WITHDRAW",
    "amount": 2000.00,
    "reference": "WTH-1700123456789-def456",
    "status": "COMPLETED"
  }
}
```

**Error Responses:**

*422 Unprocessable Entity - Insufficient Balance:*
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for withdrawal",
    "details": {
      "requestedAmount": 2000.00,
      "availableBalance": 1000.00
    }
  }
}
```

---

### 5. Get Account Details

Retrieve account information with user details.

**Endpoint:** `GET /api/accounts/:id`

**URL Parameters:**
- `id` (string, required): Account ID

**Success Response (200 OK):**
```json
{
  "account": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "balance": 5000.00,
    "currency": "NGN",
    "status": "ACTIVE",
    "createdAt": "2025-11-17T10:00:00.000Z",
    "updatedAt": "2025-11-17T10:30:00.000Z"
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Error Response:**

*404 Not Found:*
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```

---

### 6. Get Transaction History

Retrieve transaction history for an account with pagination.

**Endpoint:** `GET /api/accounts/:id/transactions`

**URL Parameters:**
- `id` (string, required): Account ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)

**Example Request:**
```
GET /api/accounts/660e8400-e29b-41d4-a716-446655440001/transactions?page=1&limit=10
```

**Success Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "accountId": "660e8400-e29b-41d4-a716-446655440001",
      "type": "FUND",
      "amount": 5000.00,
      "balanceBefore": 0,
      "balanceAfter": 5000.00,
      "reference": "FUND-1700123456789-abc123",
      "description": "Account funding",
      "status": "COMPLETED",
      "createdAt": "2025-11-17T10:00:00.000Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "accountId": "660e8400-e29b-41d4-a716-446655440001",
      "type": "TRANSFER_OUT",
      "amount": 1000.00,
      "balanceBefore": 5000.00,
      "balanceAfter": 4000.00,
      "relatedAccountId": "660e8400-e29b-41d4-a716-446655440002",
      "reference": "TRF-1700123456789-xyz789",
      "description": "Transfer to another account",
      "status": "COMPLETED",
      "createdAt": "2025-11-17T10:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Test Database Setup

Before running tests, ensure the test database is set up:

```bash
# Create test database
CREATE DATABASE wallet_service_test;

# Run test migrations
npm run test:migrate
```

Tests automatically clean up data after each test run.

## Database Schema

### Entity-Relationship Diagram

```
┌─────────────────┐
│     Users       │
├─────────────────┤
│ id (PK)         │
│ email (UNIQUE)  │
│ first_name      │
│ last_name       │
│ password_hash   │
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ 1:1
         │
         ▼
┌─────────────────┐
│    Accounts     │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ balance         │
│ currency        │
│ status          │
│ created_at      │
│ updated_at      │
└─────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────────────┐
│     Transactions        │
├─────────────────────────┤
│ id (PK)                 │
│ account_id (FK)         │
│ type                    │
│ amount                  │
│ balance_before          │
│ balance_after           │
│ related_account_id      │
│ related_transaction_id  │
│ reference (UNIQUE)      │
│ description             │
│ status                  │
│ created_at              │
│ updated_at              │
└─────────────────────────┘
```amounr
### Tables

#### users
- Stores user account information
- Passwords are hashed using bcrypt
- Email is unique and indexed

#### accounts
- One account per user
- Stores current balance with DECIMAL(19,4) precision
- Status can be ACTIVE, SUSPENDED, or CLOSED
- Foreign key to users table

#### transactions
- Records all financial operations
- Includes before/after balance for audit trail
- Related fields link transfer pairs
- Unique reference for each transaction
- Indexed on account_id and created_at for performance

## Security Considerations

- Passwords are hashed using bcrypt with configurable rounds
- Database uses parameterized queries via KnexJS to prevent SQL injection
- All financial operations use database transactions for atomicity
- Row-level locking prevents race conditions
- Karma API integration prevents onboarding blacklisted users
- Environment variables keep sensitive data out of code
- Rate limiting protects against brute force and DDoS attacks

### Rate Limiting

The API implements tiered rate limiting to prevent abuse:

**General API Rate Limit (Production Only)**
- 100 requests per 15 minutes per IP
- Applied to all `/api/*` endpoints

**Authentication Rate Limit**
- 5 requests per 15 minutes per IP
- Applied to login and registration endpoints
- Prevents brute force attacks

**Financial Operations Rate Limit**
- 20 requests per 15 minutes per IP
- Applied to fund, withdraw, and transfer endpoints
- Prevents transaction spam and abuse

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Error Handling

The API uses standard HTTP status codes:

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input or validation error
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Business logic error (insufficient balance, blacklisted user)
- `500 Internal Server Error` - Server error

All errors follow a consistent format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For issues and questions, please open an issue in the repository.

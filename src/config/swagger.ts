import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import fs from 'fs';

// Determine if we're running compiled JS or TS source
const isCompiled = fs.existsSync(path.join(__dirname, '../routes/authRoutes.js'));
const fileExtension = isCompiled ? 'js' : 'ts';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wallet Service API',
      version: '1.0.0',
      description: 'RESTful API for Demo Credit mobile lending wallet service. This API enables users to create accounts, fund wallets, transfer money between users, and withdraw funds with integration to the Lendsqr Adjutor Karma blacklist.',
      contact: {
        name: 'API Support',
        email: 'support@democredit.com',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: 'https://elijaholadapo-lendsqr-be-test.onrender.com',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication operations',
      },
      {
        name: 'Users',
        description: 'User registration and management operations',
      },
      {
        name: 'Accounts',
        description: 'Account operations including funding, withdrawal, and balance queries (requires authentication)',
      },
      {
        name: 'Transfers',
        description: 'Fund transfer operations between accounts (requires authentication)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'user_{userId}',
          description: 'Enter your token in the format: user_{userId}. Get your token by logging in via /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data',
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-11-17T10:30:00.000Z',
            },
            path: {
              type: 'string',
              example: '/api/users',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
          },
        },
        Account: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '660e8400-e29b-41d4-a716-446655440001',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            balance: {
              type: 'number',
              format: 'decimal',
              example: 10000.00,
            },
            currency: {
              type: 'string',
              example: 'NGN',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
              example: 'ACTIVE',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '770e8400-e29b-41d4-a716-446655440002',
            },
            accountId: {
              type: 'string',
              format: 'uuid',
              example: '660e8400-e29b-41d4-a716-446655440001',
            },
            type: {
              type: 'string',
              enum: ['FUND', 'WITHDRAW', 'TRANSFER_IN', 'TRANSFER_OUT'],
              example: 'FUND',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              example: 5000.00,
            },
            balanceBefore: {
              type: 'number',
              format: 'decimal',
              example: 0,
            },
            balanceAfter: {
              type: 'number',
              format: 'decimal',
              example: 5000.00,
            },
            relatedAccountId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            relatedTransactionId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            reference: {
              type: 'string',
              example: 'FUND-1700123456789-abc123',
            },
            description: {
              type: 'string',
              example: 'Account funding',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
              example: 'COMPLETED',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, `../routes/*.${fileExtension}`),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

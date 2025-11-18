import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from appropriate .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

/**
 * Centralized configuration for the application
 * All environment variables are accessed through this config object
 */
export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'wallet_service',
  },

  // Karma API Configuration
  karma: {
    baseUrl: process.env.KARMA_API_BASE_URL || 'https://adjutor.lendsqr.com',
    apiToken: process.env.KARMA_API_TOKEN || '',
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  // Helper methods
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTest: () => process.env.NODE_ENV === 'test',
};

export default config;

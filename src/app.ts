import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import config from './config/config';
import apiRoutes from './routes';
import { errorHandler, requestLogger, notFoundHandler } from './middleware/errorHandler';
import { swaggerSpec } from './config/swagger';
import { apiLimiter } from './middleware/rateLimiter';

// Create Express application
const app: Application = express();

// Middleware setup
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// Apply general rate limiting to all API routes (only in production)
if (config.isProduction()) {
  app.use('/api', apiLimiter);
}

// Only log requests in non-test environments
if (!config.isTest()) {
  app.use(requestLogger);
}

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Wallet Service API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    uptime: process.uptime(),
  });
});

// Register API routes with /api prefix
app.use('/api', apiRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;

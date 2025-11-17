import config from './config/config';
import db from './config/database';
import app from './app';

// Start server first (don't block on database connection)
const server = app.listen(config.server.port, () => {
  console.log(`🚀 Wallet Service MVP running on port ${config.server.port}`);
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  console.log(`🏥 Health check: http://localhost:${config.server.port}/health`);
  console.log(`📚 API Documentation: http://localhost:${config.server.port}/api-docs`);
  
  // Test database connection after server starts
  db.raw('SELECT 1')
    .then(() => {
      console.log('✅ Database connected successfully');
    })
    .catch((error) => {
      console.error('❌ Database connection failed:', error.message);
      console.error('⚠️  Service is running but database operations will fail');
    });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('✅ HTTP server closed');

    try {
      // Close database connections
      await db.destroy();
      console.log('✅ Database connections closed');

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

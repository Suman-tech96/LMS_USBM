import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log(`=========================================`);
      console.log(` LMS Backend Server running in [${env.NODE_ENV}] mode`);
      console.log(` Port: ${env.PORT}`);
      console.log(` API Base: http://localhost:${env.PORT}/api/v1`);
      console.log(` Health: http://localhost:${env.PORT}/api/v1/health`);
      console.log(`=========================================`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Unhandled Rejection] ${err.name}: ${err.message}`);
      console.error(err.stack);
      server.close(() => process.exit(1));
    });

    // Handle Uncaught Exceptions
    process.on('uncaughtException', (err) => {
      console.error(`[Uncaught Exception] ${err.name}: ${err.message}`);
      console.error(err.stack);
      server.close(() => process.exit(1));
    });

    // Graceful Termination
    const shutdown = () => {
      console.log('\n[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] HTTP connections closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error(`[Fatal Startup Error] ${error.message}`);
    process.exit(1);
  }
};

startServer();

import colors from 'colors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app';
import config from './config';
import { seedSuperAdmin } from './DB/seedAdmin';
import { socketHelper } from './helpers/socketHelper';
import { errorLogger, logger } from './shared/logger';
import { initAppQueuesAndWorkers } from './app/loaders/bullmq.loader';
import process from 'process';
import { elasticSearch } from './config/elastic-search';
import { initElasticSearchIndices } from './app/loaders/elastic-search.loader';

let server: any;
let io: Server;
let queueHandlers: any;
let isShuttingDown = false;
let isHandlingFatalError = false;

const SHUTDOWN_TIMEOUT = config.node_env === 'production' ? 30000 : 2000;

// ---------------- Graceful shutdown ------------------
const handleGracefulShutdown = async (reason: string, exitCode = 0) => {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) return;

  isShuttingDown = true;

  logger.info(
    colors.yellow(`⚠️  ${reason} received. Starting graceful shutdown...`),
  );

  // Force exit if graceful shutdown takes too long
  const forceExitTimer = setTimeout(() => {
    errorLogger.error(
      `⏰ Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT / 1000} seconds. Forcing process exit...`,
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  forceExitTimer.unref();

  try {
    // 1. Close BullMQ workers
    if (queueHandlers) {
      await queueHandlers.closeWorkers();
      logger.info('BullMQ workers closed.');
    }

    // 2. Close HTTP server
    if (server) {
      await new Promise<void>(resolve => {
        server.close(() => {
          logger.info('HTTP server closed.');
          resolve();
        });
      });
    }

    // 3. Close Socket.IO
    if (io) {
      await io.close();
      logger.info('Socket.IO server closed.');
    }

    // 4. Close ElasticSearch connection
    if (elasticSearch) {
      await elasticSearch.close();
      logger.info('ElasticSearch connection closed.');
    }

    // 5. Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed.');
    }

    clearTimeout(forceExitTimer);
    logger.info(colors.green('Graceful shutdown completed successfully.'));

    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceExitTimer);
    errorLogger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// ------------------ Handle fatal errors ------------------
// handle uncaught exception
process.on('uncaughtException', error => {
  if (isHandlingFatalError) process.exit(1);

  isHandlingFatalError = true;

  logger.error(`🚨 Unhandled Exception Detected: ${error.message}`);

  void handleGracefulShutdown('uncaughtException', 1);
});

//handle unhandledRejection
process.on('unhandledRejection', error => {
  if (isHandlingFatalError) process.exit(1);

  isHandlingFatalError = true;

  logger.error(`🚨 Unhandled Rejection Detected: ${String(error)}`);

  void handleGracefulShutdown('unhandledRejection', 1);
});

// ---------------- Start the server ------------------
async function main() {
  logger.info(colors.yellow('🚀 Server is starting...'));
  try {
    await mongoose.connect(config.database_url as string);
    logger.info(colors.green('🛢️  Database connected successfully'));

    await seedSuperAdmin();

    // Connect ElasticSearch Engine
    await elasticSearch.ping();
    logger.info(colors.green('🔍 ElasticSearch connected successfully'));

    // Start the HTTP server
    const port =
      typeof config.port_dev === 'number'
        ? config.port_dev
        : Number(config.port_dev);

    server = app.listen(port, config.ip_address as string, () => {
      logger.info(colors.blue(`📶 Application listening on port:${port}`));
    });

    // socket
    io = new Server(server, {
      pingTimeout: 60000,
      cors: {
        origin: '*',
      },
    });
    socketHelper.socket(io);
    //@ts-ignore
    global.io = io;
    logger.info(colors.magenta('🛜  Socket connected successfully'));

    // Initialize bullMQ background jobs
    queueHandlers = await initAppQueuesAndWorkers();
    logger.info('⌛ BullMQ Queues and Workers initialized');

    // Initialize ElasticSearch indices
    await initElasticSearchIndices();
  } catch (error) {
    console.error(error);
    errorLogger.error(colors.red('🤢 Failed to start application'));
    process.exit(1);
  }
}

main();

// Process signal listeners for dev restarts / deployments
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM', 0));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT', 0));

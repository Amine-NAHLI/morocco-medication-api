require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const logger = require('./utils/logger');
const { getHttpConfig } = require('./config/env');
const { startScheduler, stopScheduler } = require('./services/scheduler.service');

const PORT = process.env.PORT || 3000;

let server;

prisma.$connect().then(() => {
  logger.info('Connected to PostgreSQL database (Prisma)');
  server = app.listen(PORT, () => {
    logger.info(`Listening to port ${PORT}`);
    const { schedulerEnabled, schedulerIntervalMs } = getHttpConfig();
    startScheduler(schedulerEnabled, schedulerIntervalMs);
  });
}).catch((err) => {
  logger.error(`Database connection error: ${err}`);
});

const exitHandler = () => {
  const disconnect = () => prisma.$disconnect().catch((error) => logger.error(`Database disconnect error: ${error.message}`));
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      disconnect().finally(() => process.exit(1));
    });
  } else {
    disconnect().finally(() => process.exit(1));
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close(() => prisma.$disconnect().catch((error) => logger.error(`Database disconnect error: ${error.message}`)));
  }
  stopScheduler();
});

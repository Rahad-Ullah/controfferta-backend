import path from 'path';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config';
const { combine, timestamp, label, printf } = format;

const myFormat = printf(info => {
  const date = new Date(info.timestamp as string | number | Date);
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return `${date.toDateString()} ${hour}:${minutes}:${seconds} [${info.label}] ${info.level}: ${info.message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(label({ label: config.server_name }), timestamp(), myFormat),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'winston',
        'success',
        '%DATE%-success.log',
      ),
      datePattern: 'DD-MM-YYYY-HH',
      maxSize: '20m',
      maxFiles: '1d',
    }),
  ],
});

const errorLogger = createLogger({
  level: 'error',
  format: combine(label({ label: config.server_name }), timestamp(), myFormat),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'winston',
        'error',
        '%DATE%-error.log',
      ),
      datePattern: 'DD-MM-YYYY-HH',
      maxSize: '20m',
      maxFiles: '1d',
    }),
  ],
});

// Prevent logger transport errors from crashing the process
logger.on('error', () => {
  // Intentionally ignore logger errors
});

errorLogger.on('error', () => {
  // Intentionally ignore logger errors
});

export { errorLogger, logger };

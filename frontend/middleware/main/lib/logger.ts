import pino from 'pino';
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
const logDir = path.join(__dirname, '..', 'logs');

// Base logger configuration
export const logger = pino({
  level: logLevel,

  // Redact sensitive fields
  redact: ['password', 'token', 'secret', 'authorization'],

  // Development: pretty output with module names
  // Production: JSON to file with rotation
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:mm:ss',
      ignore: 'pid,hostname',
      singleLine: false,
      // Format: [HH:mm:ss] [module] message
      messageFormat: '\x1b[36m[{module}]\x1b[0m {msg}',
    }
  } : {
    targets: [
      // Main log file
      {
        target: 'pino/file',
        options: {
          destination: path.join(logDir, 'app.log'),
          mkdir: true,
        },
        level: 'info'
      },
      // Error-only file
      {
        target: 'pino/file',
        options: {
          destination: path.join(logDir, 'error.log'),
          mkdir: true,
        },
        level: 'error'
      }
    ]
  },

  // Automatic error serialization
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

/**
 * Create a child logger for a specific module
 * @param moduleName - Name of the module (e.g., 'main', 'auth', 'jdk-manager', 'ssl:generator')
 * @returns Child logger instance with module context
 *
 * @example
 * ```typescript
 * const log = createModuleLogger('jdk-manager');
 * log.info('JDK installation started');
 * // Output: [jdk-manager] JDK installation started
 * ```
 */
export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}

/**
 * Adapter for JDK Manager Logger interface
 * Converts pino logger to match the expected Logger interface
 */
export function createJdkLoggerAdapter(logger: pino.Logger) {
  return {
    info: (msg: string) => logger.info(msg),
    warn: (msg: string) => logger.warn(msg),
    error: (msg: string) => logger.error(msg),
    debug: (msg: string) => logger.debug(msg),
  };
}

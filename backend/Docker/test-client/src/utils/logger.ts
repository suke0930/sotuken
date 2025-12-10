/**
 * Simple test logger with colored output
 */

export enum LogLevel {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

const colors = {
  INFO: "\x1b[36m",     // Cyan
  SUCCESS: "\x1b[32m",  // Green
  WARNING: "\x1b[33m",  // Yellow
  ERROR: "\x1b[31m",    // Red
  DEBUG: "\x1b[90m",    // Gray
  RESET: "\x1b[0m",
};

export class Logger {
  private prefix: string;

  constructor(prefix: string = "TestClient") {
    this.prefix = prefix;
  }

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const color = colors[level];
    const reset = colors.RESET;
    
    console.log(`${color}[${timestamp}] [${this.prefix}] [${level}]${reset} ${message}`);
    
    if (data !== undefined) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  success(message: string, data?: any) {
    this.log(LogLevel.SUCCESS, message, data);
  }

  warning(message: string, data?: any) {
    this.log(LogLevel.WARNING, message, data);
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  step(stepNumber: number, description: string) {
    console.log(`\n${colors.INFO}=== Step ${stepNumber}: ${description} ===${colors.RESET}\n`);
  }

  testStart(testName: string) {
    console.log(`\n${colors.SUCCESS}▶ Starting Test: ${testName}${colors.RESET}\n`);
  }

  testEnd(testName: string, success: boolean) {
    const status = success ? "✅ PASSED" : "❌ FAILED";
    const color = success ? colors.SUCCESS : colors.ERROR;
    console.log(`\n${color}${status}: ${testName}${colors.RESET}\n`);
  }
}

export const logger = new Logger();

/**
 * Structured logging utility with appropriate levels
 * Provides searchable fields and consistent log format
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  component?: string;
  action?: string;
  duration?: number;
  statusCode?: number;
  endpoint?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  environment: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private environment: string;

  private constructor() {
    this.environment = import.meta.env.MODE || 'development';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
      environment: this.environment,
    };
  }

  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    const entry = this.createEntry(level, message, context);
    
    // Store in memory for dashboard
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with appropriate method
    const consoleMethod = level === 'fatal' ? 'error' : level;
    const logData = { ...entry };
    
    if (this.environment === 'development') {
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, logData);
    } else {
      // In production, use structured JSON for searchability
      console[consoleMethod](JSON.stringify(logData));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.environment === 'development') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  fatal(message: string, context?: LogContext): void {
    this.log('fatal', message, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }

  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(log.context).toLowerCase().includes(lowerQuery)
    );
  }

  clearLogs(): void {
    this.logs = [];
  }

  getStats(): { total: number; byLevel: Record<LogLevel, number> } {
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };
    
    this.logs.forEach(log => {
      byLevel[log.level]++;
    });

    return { total: this.logs.length, byLevel };
  }
}

export const logger = Logger.getInstance();
export default logger;

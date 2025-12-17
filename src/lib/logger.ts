/**
 * Structured logging utility with environment-configurable levels
 * Provides searchable fields and consistent log format
 */

import { config } from '@/config/environment';

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

// Log level priority (higher number = more severe)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private environment: string;
  private configuredLevel: LogLevel;
  private lastUpdate: number = Date.now();
  private subscribers: Set<() => void> = new Set();

  private constructor() {
    this.environment = config.app.env;
    this.configuredLevel = config.app.logLevel;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Check if a log level should be output based on configured level
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.configuredLevel];
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
    // Skip if below configured log level
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createEntry(level, message, context);
    
    // Store in memory for dashboard
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Notify subscribers of the change
    this.notifySubscribers();

    // Console output with appropriate method
    const consoleMethod = level === 'fatal' || level === 'error' ? 'error' : level === 'warn' ? 'warn' : level === 'info' ? 'info' : 'log';
    const logData = { ...entry };
    
    if (config.isDevelopment) {
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, logData);
    } else {
      // In production, use structured JSON for searchability
      console[consoleMethod](JSON.stringify(logData));
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
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

  /**
   * Get current configured log level
   */
  getLogLevel(): LogLevel {
    return this.configuredLevel;
  }

  /**
   * Dynamically update log level (useful for debugging)
   */
  setLogLevel(level: LogLevel): void {
    this.configuredLevel = level;
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
    this.notifySubscribers();
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

  /**
   * Get timestamp of last log update (for change detection)
   */
  getLastUpdate(): number {
    return this.lastUpdate;
  }

  /**
   * Subscribe to log changes (for useSyncExternalStore)
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get snapshot for useSyncExternalStore
   */
  getSnapshot(): number {
    return this.lastUpdate;
  }

  private notifySubscribers(): void {
    this.lastUpdate = Date.now();
    this.subscribers.forEach(callback => callback());
  }
}

export const logger = Logger.getInstance();
export default logger;

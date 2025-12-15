/**
 * Sentry error tracking initialization and utilities
 */
import * as Sentry from '@sentry/react';
import logger from './logger';

export function initSentry(): void {
  // DSN is safe to expose publicly - it only allows sending errors to your Sentry project
  const dsn = "https://2be059dcedd29dd3db9126c00dfda08c@o4510510896447488.ingest.us.sentry.io/4510510905229312";
  
  if (!dsn) {
    logger.warn('Sentry DSN not configured - error tracking disabled', {
      component: 'sentry',
      action: 'init',
    });
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Filter out non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Log to our structured logger as well
      if (error instanceof Error) {
        logger.error(error.message, {
          component: 'sentry',
          action: 'capture',
          stack: error.stack,
        });
      }
      
      return event;
    },
  });

  logger.info('Sentry initialized successfully', {
    component: 'sentry',
    action: 'init',
    environment: import.meta.env.MODE,
  });
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  Sentry.captureException(error, {
    extra: context,
  });
  
  logger.error(error.message, {
    component: 'sentry',
    action: 'captureError',
    ...context,
  });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  Sentry.captureMessage(message, level);
  
  const logMethod = level === 'warning' ? 'warn' : level;
  logger[logMethod](message, {
    component: 'sentry',
    action: 'captureMessage',
  });
}

export function setUser(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
  
  logger.info('User context set for error tracking', {
    component: 'sentry',
    action: 'setUser',
    userId,
  });
}

export function clearUser(): void {
  Sentry.setUser(null);
  
  logger.info('User context cleared from error tracking', {
    component: 'sentry',
    action: 'clearUser',
  });
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export { Sentry };

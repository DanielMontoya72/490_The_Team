/**
 * Centralized Environment Configuration
 * Provides typed access to environment variables with validation
 */

export type AppEnvironment = 'development' | 'staging' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface SupabaseConfig {
  url: string;
  anonKey: string;
  projectId: string;
}

interface AppConfig {
  env: AppEnvironment;
  url: string;
  logLevel: LogLevel;
}

interface MonitoringConfig {
  sentryDsn: string | undefined;
}

interface EnvironmentConfig {
  supabase: SupabaseConfig;
  app: AppConfig;
  monitoring: MonitoringConfig;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
}

/**
 * Determines the current application environment
 */
function getAppEnvironment(): AppEnvironment {
  const envVar = import.meta.env.VITE_APP_ENV;
  if (envVar === 'staging') return 'staging';
  if (envVar === 'production' || import.meta.env.PROD) return 'production';
  return 'development';
}

/**
 * Determines the appropriate log level based on environment
 */
function getLogLevel(): LogLevel {
  const envVar = import.meta.env.VITE_LOG_LEVEL;
  if (envVar && ['debug', 'info', 'warn', 'error'].includes(envVar)) {
    return envVar as LogLevel;
  }
  // Defaults based on environment
  const appEnv = getAppEnvironment();
  if (appEnv === 'development') return 'debug';
  if (appEnv === 'staging') return 'info';
  return 'error';
}

/**
 * Main configuration object
 */
export const config: EnvironmentConfig = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || '',
  },
  app: {
    env: getAppEnvironment(),
    url: import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
    logLevel: getLogLevel(),
  },
  monitoring: {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  },
  // Computed environment flags
  isDevelopment: getAppEnvironment() === 'development',
  isStaging: getAppEnvironment() === 'staging',
  isProduction: getAppEnvironment() === 'production',
};

/**
 * Validates that all required environment variables are set
 * Call this at application startup
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required Supabase configuration
  if (!config.supabase.url) {
    errors.push('VITE_SUPABASE_URL is required');
  }
  if (!config.supabase.anonKey) {
    errors.push('VITE_SUPABASE_PUBLISHABLE_KEY is required');
  }
  
  // Validate URL format
  if (config.supabase.url && !config.supabase.url.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Logs current environment configuration (safe for logging)
 */
export function getEnvironmentSummary(): Record<string, string | boolean> {
  return {
    environment: config.app.env,
    logLevel: config.app.logLevel,
    supabaseConfigured: Boolean(config.supabase.url && config.supabase.anonKey),
    sentryConfigured: Boolean(config.monitoring.sentryDsn),
    isDevelopment: config.isDevelopment,
    isStaging: config.isStaging,
    isProduction: config.isProduction,
  };
}

export default config;

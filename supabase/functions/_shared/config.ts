/**
 * Shared configuration utilities for Supabase Edge Functions
 * Provides type-safe access to environment variables and secrets
 */

/**
 * Get a required environment variable, throwing if not set
 */
export function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(name: string, defaultValue: string = ''): string {
  return Deno.env.get(name) || defaultValue;
}

/**
 * Get a boolean environment variable
 */
export function getBooleanEnv(name: string, defaultValue: boolean = false): boolean {
  const value = Deno.env.get(name);
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get a numeric environment variable
 */
export function getNumberEnv(name: string, defaultValue: number): number {
  const value = Deno.env.get(name);
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Edge function configuration object
 * Access secrets and configuration in a type-safe way
 */
export const edgeConfig = {
  // Supabase (auto-provided)
  supabaseUrl: () => getRequiredEnv('SUPABASE_URL'),
  supabaseAnonKey: () => getRequiredEnv('SUPABASE_ANON_KEY'),
  supabaseServiceKey: () => getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  
  // Application
  appUrl: () => getRequiredEnv('APP_URL'),
  environment: () => getOptionalEnv('ENVIRONMENT', 'production'),
  
  // OAuth Providers
  google: {
    clientId: () => getRequiredEnv('GOOGLE_CLIENT_ID'),
    clientSecret: () => getRequiredEnv('GOOGLE_CLIENT_SECRET'),
    callback: () => getRequiredEnv('GOOGLE_CALLBACK'),
  },
  linkedin: {
    clientId: () => getRequiredEnv('LINKEDIN_CLIENT_ID'),
    clientSecret: () => getRequiredEnv('LINKEDIN_CLIENT_SECRET'),
    callback: () => getRequiredEnv('LINKEDIN_CALLBACK'),
  },
  github: {
    clientId: () => getRequiredEnv('GITHUB_CLIENT_ID'),
    clientSecret: () => getRequiredEnv('GITHUB_CLIENT_SECRET'),
  },
  
  // Email/SMTP
  smtp: {
    host: () => getRequiredEnv('SMTP_HOST'),
    port: () => getNumberEnv('SMTP_PORT', 587),
    user: () => getRequiredEnv('SMTP_USER'),
    pass: () => getRequiredEnv('SMTP_PASS'),
    secure: () => getBooleanEnv('SMTP_SECURE', false),
    from: () => getRequiredEnv('EMAIL_FROM'),
  },
  
  // Monitoring
  sentryDsn: () => getOptionalEnv('SENTRY_DSN'),
  
  // AI Services
  openaiApiKey: () => getOptionalEnv('OPENAI_API_KEY'),
  geminiApiKey: () => getOptionalEnv('GEMINI_API_KEY'),
  
  // Helpers
  isProduction: () => getOptionalEnv('ENVIRONMENT', 'production') === 'production',
  isDevelopment: () => getOptionalEnv('ENVIRONMENT', 'production') === 'development',
};

/**
 * Validate that all required secrets are configured
 * Call at the start of edge functions to fail fast
 */
export function validateRequiredSecrets(secrets: string[]): void {
  const missing = secrets.filter((name) => !Deno.env.get(name));
  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }
}

/**
 * Standard CORS headers for edge functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreFlight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

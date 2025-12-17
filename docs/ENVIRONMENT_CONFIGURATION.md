# Environment Configuration Guide

This document provides comprehensive guidance for configuring JobQuest across different deployment environments.

## Overview

JobQuest uses environment variables to configure behavior across development, staging, and production environments. This includes:

- **Supabase connection settings**
- **Feature flags for gradual rollout**
- **Logging levels**
- **Monitoring configuration**

## Quick Start for New Developers

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the Supabase credentials in `.env` with your development values

3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Files

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.example` | Template with documentation | ✅ Committed |
| `.env` | Local development | ❌ Gitignored |
| `.env.staging` | Staging reference | ❌ Gitignored |
| `.env.production` | Production reference | ❌ Gitignored |

## Frontend Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | `sb_publishable_...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_PROJECT_ID` | Project identifier | (extracted from URL) |
| `VITE_APP_ENV` | Environment name | `development` |
| `VITE_APP_URL` | Frontend URL | `window.location.origin` |
| `VITE_LOG_LEVEL` | Logging level | `debug` (dev) / `error` (prod) |
| `VITE_SENTRY_DSN` | Sentry error tracking | (none) |

## Feature Flags

Feature flags allow gradual rollout of features. Set via environment variables:

### AI Features (enabled by default)

```env
VITE_FEATURE_AI_COVER_LETTER=true
VITE_FEATURE_AI_RESUME_ANALYSIS=true
VITE_FEATURE_INTERVIEW_COACH=true
VITE_FEATURE_SALARY_INSIGHTS=true
```

### Beta Features (disabled by default)

```env
VITE_FEATURE_ADVANCED_ANALYTICS=false
VITE_FEATURE_PEER_SUPPORT=false
VITE_FEATURE_MENTOR_MATCHING=false
VITE_FEATURE_TEAM_COLLABORATION=false
```

### Using Feature Flags in Code

```tsx
// Using the hook
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

function MyComponent() {
  const isEnabled = useFeatureFlag('aiCoverLetter');
  if (!isEnabled) return null;
  return <AICoverLetterGenerator />;
}

// Using the component
import { FeatureFlag } from '@/components/FeatureFlag';

function MyPage() {
  return (
    <FeatureFlag flag="advancedAnalytics" fallback={<BasicAnalytics />}>
      <AdvancedAnalyticsDashboard />
    </FeatureFlag>
  );
}
```

## Logging Configuration

### Log Levels

| Level | Description | Default Environment |
|-------|-------------|---------------------|
| `debug` | Verbose debugging info | Development |
| `info` | General information | Staging |
| `warn` | Warning messages | - |
| `error` | Error messages only | Production |

### Configuration

Set via `VITE_LOG_LEVEL`:

```env
# Development - see everything
VITE_LOG_LEVEL=debug

# Staging - operational info
VITE_LOG_LEVEL=info

# Production - errors only
VITE_LOG_LEVEL=error
```

### Using the Logger

```typescript
import { logger } from '@/lib/logger';

logger.debug('Detailed debugging info', { component: 'MyComponent' });
logger.info('User action completed', { action: 'save', userId: '123' });
logger.warn('Deprecated API used', { endpoint: '/old-api' });
logger.error('Operation failed', { error: err.message });
```

## Backend Configuration (Supabase Edge Functions)

Backend secrets are configured in the Supabase Dashboard under **Edge Functions → Secrets**.

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Auto-provided by Supabase |
| `SUPABASE_ANON_KEY` | Auto-provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase |
| `APP_URL` | Your frontend domain |

### OAuth Providers

| Secret | Purpose |
|--------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GOOGLE_CALLBACK` | OAuth callback URL |
| `LINKEDIN_CLIENT_ID` | LinkedIn integration |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn integration |
| `LINKEDIN_CALLBACK` | OAuth callback URL |
| `GITHUB_CLIENT_ID` | GitHub integration |
| `GITHUB_CLIENT_SECRET` | GitHub integration |

### Email Configuration

| Secret | Purpose | Example |
|--------|---------|---------|
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | email address |
| `SMTP_PASS` | SMTP password | app password |
| `SMTP_SECURE` | Use TLS | `true` |
| `EMAIL_FROM` | Sender address | `noreply@example.com` |

### Using Edge Function Config

```typescript
import { edgeConfig, validateRequiredSecrets, corsHeaders } from '../_shared/config.ts';

// Validate required secrets at startup
validateRequiredSecrets(['OPENAI_API_KEY', 'APP_URL']);

// Access configuration
const supabaseUrl = edgeConfig.supabaseUrl();
const appUrl = edgeConfig.appUrl();

// Use CORS headers
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

## Vercel Deployment

### Setting Environment Variables

1. Go to **Vercel Dashboard → Project → Settings → Environment Variables**

2. Add variables for each environment:
   - **Production**: Variables for your live site
   - **Preview**: Variables for PR previews (use staging values)
   - **Development**: Variables for `vercel dev`

3. Required variables:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   VITE_APP_ENV=production
   VITE_APP_URL=https://yourdomain.com
   VITE_LOG_LEVEL=error
   ```

### Environment-Specific Builds

Vercel automatically uses the appropriate environment variables based on the deployment context.

## Troubleshooting

### Missing Environment Variables

If you see errors about missing environment variables:

1. Check that `.env` exists and contains required values
2. Verify variable names start with `VITE_` for frontend access
3. Restart the development server after changes

### Feature Flag Not Working

1. Verify the environment variable is set correctly
2. Check for typos in the flag name
3. Remember: `'false'` (string) is truthy in JavaScript - use exact string comparison

### Logging Not Appearing

1. Check `VITE_LOG_LEVEL` is set to an appropriate level
2. Verify you're calling the logger correctly
3. Check browser console filters aren't hiding messages

### OAuth Callback Errors

1. Verify callback URLs match exactly in provider settings
2. Include full URL with protocol (`https://`)
3. Check for trailing slashes
4. Ensure `APP_URL` secret is set in Supabase

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use `.env.example`** as a template only
3. **Rotate secrets** periodically (every 90 days)
4. **Use app passwords** for Gmail SMTP, not account passwords
5. **Limit service role key** usage to edge functions only
6. **Review access** when team members leave

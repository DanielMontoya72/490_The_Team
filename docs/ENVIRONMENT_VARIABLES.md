# Environment Variables & Configuration

## Frontend Environment Variables

Create a `.env.local` file in the project root with these variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://yourproject.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | `eyJhbGciOiJIUzI1NiIs...` |

For Vercel deployment, add these in Project Settings → Environment Variables.

### Frontend Secrets (Hardcoded for Security)

| Variable | Purpose | Location |
|----------|---------|----------|
| Sentry DSN | Error tracking | `src/lib/sentry.ts` |

## Backend Secrets (Edge Functions)

### Authentication Providers

| Secret | Purpose | Required For |
|--------|---------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google sign-in |
| `GOOGLE_CALLBACK` | OAuth callback URL | Google sign-in |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth | LinkedIn integration |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth | LinkedIn integration |
| `LINKEDIN_CALLBACK` | OAuth callback URL | LinkedIn integration |
| `GITHUB_CLIENT_ID` | GitHub OAuth | GitHub integration |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | GitHub integration |

### Email Configuration (SMTP)

| Secret | Purpose | Example Value |
|--------|---------|---------------|
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | Email address |
| `SMTP_PASS` | SMTP password | App password |
| `SMTP_SECURE` | Use TLS | `true` or `false` |
| `EMAIL_FROM` | Sender address | Plain email only |
| `GMAIL_USER` | Gmail account | For Gmail SMTP |
| `GMAIL_APP_PASSWORD` | Gmail app password | Generated in Google |

### Monitoring & Integrations

| Secret | Purpose | Required For |
|--------|---------|--------------|
| `SENTRY_DSN` | Error tracking (backend) | Edge function errors |
| `VITE_SENTRY_DSN` | Error tracking (frontend) | Browser errors |
| `GEMINI_API_KEY` | Google Gemini AI | AI-powered features |
| `RESEND_API_KEY` | Email service (backup) | Alternative email |

### Application Configuration

| Secret | Purpose | Example Value |
|--------|---------|---------------|
| `APP_URL` | Application base URL | `https://yourapp.vercel.app` |
| `SEND_EMAIL_HOOK_SECRET` | Email webhook auth | Random string |

### Supabase Internal (Auto-Generated)

| Secret | Purpose | Notes |
|--------|---------|-------|
| `SUPABASE_URL` | Project URL | Don't modify |
| `SUPABASE_ANON_KEY` | Anonymous key | Don't modify |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key | Don't modify |
| `SUPABASE_DB_URL` | Database connection | Don't modify |
| `SUPABASE_PUBLISHABLE_KEY` | Public key | Don't modify |

## Configuration Files

### Supabase Configuration
**Location**: `supabase/config.toml`
**Purpose**: Project settings (auto-managed, do not edit)

### TypeScript Configuration
**Location**: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
**Purpose**: TypeScript compiler options

### Vite Configuration
**Location**: `vite.config.ts`
**Purpose**: Build and dev server settings

### Tailwind Configuration
**Location**: `tailwind.config.ts`
**Purpose**: Design system tokens and utilities

### PostCSS Configuration
**Location**: `postcss.config.js`
**Purpose**: CSS processing

## Adding New Secrets

### Supabase Edge Function Secrets
```bash
# Using Supabase CLI
supabase secrets set MY_SECRET_NAME=my_secret_value

# List all secrets
supabase secrets list
```

### Vercel Environment Variables
1. Go to Project Settings → Environment Variables
2. Add variable name and value
3. Select environments (Production, Preview, Development)
4. Save and redeploy

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use specific scopes** for OAuth apps
3. **Rotate secrets** periodically (every 90 days recommended)
4. **Use app passwords** for Gmail, not account passwords
5. **Limit service role key** usage to edge functions only
6. **Monitor secret usage** in logs for anomalies

## Troubleshooting

### Secret Not Available in Edge Function
- Verify secret exists in project settings
- Check secret name matches exactly (case-sensitive)
- Redeploy function after adding secret

### OAuth Callback Errors
- Verify callback URL matches exactly in provider settings
- Include full URL with protocol
- Check for trailing slashes

### SMTP Connection Failures
- Verify port matches security setting (587 for TLS, 465 for SSL)
- Check app password is correct (not account password)
- Ensure "Less secure apps" enabled if using older Gmail

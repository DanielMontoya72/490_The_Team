# Deployment Runbook

## Pre-Deployment Checklist

- [ ] All tests passing locally (`npm test`)
- [ ] Code reviewed and approved
- [ ] No console errors in development (`npm run dev`)
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables configured in Vercel
- [ ] Supabase secrets set (`supabase secrets list`)

## Standard Deployment Process

### Step 1: Local Development
```bash
# 1. Start local development server
npm run dev

# 2. Test changes locally
# 3. Run tests
npm test
```

### Step 2: Frontend Deployment (Vercel)

#### Initial Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Automatic Deployments
- Push to `main` branch triggers production deployment
- Push to other branches creates preview deployments
- Configure in Vercel Dashboard → Project Settings → Git

### Step 3: Edge Functions Deployment (Supabase)
```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Deploy all edge functions
supabase functions deploy

# Deploy specific function
supabase functions deploy function-name

# Set secrets
supabase secrets set GEMINI_API_KEY=your_api_key
```

## Database Migration Deployment

### Step 1: Create Migration
```bash
# Create new migration file
supabase migration new my_migration_name
```

```sql
-- Edit: supabase/migrations/[timestamp]_my_migration_name.sql
CREATE TABLE public.new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.new_feature ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own data"
  ON public.new_feature FOR SELECT
  USING (auth.uid() = user_id);
```

### Step 2: Apply Migration
```bash
# Push migrations to remote database
supabase db push

# Or reset and reapply all migrations (development only!)
supabase db reset
```

### Step 3: Verify Migration
1. Check Supabase Dashboard → Table Editor
2. Test RLS policies work correctly
3. Verify application functionality

## Edge Function Deployment

### Step 1: Create/Update Function
```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Function logic
  return new Response(JSON.stringify({ success: true }))
})
```

### Step 2: Deploy Function
```bash
# Deploy single function
supabase functions deploy my-function

# Deploy all functions
supabase functions deploy

# Test locally first
supabase functions serve my-function
```

### Step 3: Verify Function
```bash
# Test with curl
curl -i --location --request POST \
  'https://your-project.supabase.co/functions/v1/my-function' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"test": "data"}'

# Check logs
supabase functions logs my-function
```

## Rollback Procedures

### Frontend Rollback (Vercel)
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]

# Or via Vercel Dashboard:
# 1. Go to Deployments tab
# 2. Find working deployment
# 3. Click "..." → "Promote to Production"
```

### Database Rollback
```sql
-- Create a new migration to reverse changes
-- supabase migration new revert_my_change
ALTER TABLE public.table_name DROP COLUMN new_column;
```

### Edge Function Rollback
```bash
# Git restore previous version
git checkout HEAD~1 -- supabase/functions/my-function/index.ts

# Redeploy
supabase functions deploy my-function
```

## Post-Deployment Verification

### Immediate Checks (0-5 minutes)
- [ ] Application loads without errors
- [ ] Key user flows work (login, main features)
- [ ] No new errors in Sentry
- [ ] API responses normal

### Extended Checks (5-30 minutes)
- [ ] Monitor error rates in Sentry
- [ ] Check performance metrics
- [ ] Verify no user complaints
- [ ] Review logs for anomalies

## Emergency Procedures

### Critical Bug in Production
1. **Assess severity** - Is data at risk? Are users blocked?
2. **Quick fix or rollback?** - Decide based on complexity
3. **Communicate** - Update team/stakeholders
4. **Fix** - Apply fix or rollback
5. **Verify** - Confirm resolution
6. **Document** - Post-mortem within 24 hours

### Database Emergency
1. **Stop** - Don't make additional changes
2. **Assess** - Check what data affected
3. **Backup** - Verify backups exist
4. **Plan** - Create recovery plan
5. **Execute** - Apply fix carefully
6. **Verify** - Check data integrity

## Deployment Schedule

| Day | Deployment Window | Notes |
|-----|------------------|-------|
| Mon-Thu | 9am-4pm local | Standard deployments |
| Friday | 9am-12pm only | Avoid afternoon deploys |
| Weekend | Emergency only | Requires approval |

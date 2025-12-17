# Backup and Disaster Recovery Procedures

## Overview

This document outlines backup strategies, recovery procedures, and disaster recovery protocols for the application. The system runs on a cloud platform which provides automated backup capabilities.

## Backup Strategy

### Automated Database Backups

The cloud platform provides automatic daily backups:

| Tier | Backup Frequency | Retention Period | Point-in-Time Recovery |
|------|------------------|------------------|------------------------|
| Free | Daily | 7 days | No |
| Pro | Daily | 7 days | Yes (7 days) |
| Team | Daily | 14 days | Yes (14 days) |
| Enterprise | Daily | 30 days | Yes (30 days) |

### Backup Locations

- **Primary Database**: Cloud infrastructure
- **Backup Storage**: Geographically separated from primary (managed by Supabase)
- **Local Exports**: Can be stored in secure external location

### What's Backed Up Automatically

✅ All database tables and data
✅ Database functions and triggers
✅ RLS policies
✅ Storage bucket metadata

### What Requires Manual Backup

⚠️ Storage bucket files (profile pictures, documents)
⚠️ Edge function code (stored in Git repository)
⚠️ Environment secrets (must be documented separately)
⚠️ Auth user passwords (cannot be exported)

## Manual Backup Procedures

### 1. Database Schema Export

Export the current schema for version control:

```sql
-- Run in SQL Editor or via psql
-- Schema is maintained in supabase/migrations/ folder
```

### 2. Full Data Export

Use the data export script:

```bash
# Download the data_inserts.sql file from the repository
# Or use Supabase Dashboard > Table Editor > Export as CSV
```

### 3. Storage Files Backup

```bash
# List all files in storage buckets
# Download via Supabase Dashboard > Storage > [Bucket] > Download

# Buckets to backup:
# - profile-pictures
# - certification-documents
# - project-media
# - application-materials
```

### 4. Secrets Documentation

Maintain a secure record of all secrets (names only, values in secure vault):

| Secret Name | Purpose | Last Updated |
|-------------|---------|--------------|
| VITE_SENTRY_DSN | Error tracking | Document date |
| SMTP_HOST | Email sending | Document date |
| SMTP_PORT | Email sending | Document date |
| SMTP_USER | Email credentials | Document date |
| SMTP_PASS | Email credentials | Document date |
| GOOGLE_CLIENT_ID | OAuth | Document date |
| GOOGLE_CLIENT_SECRET | OAuth | Document date |
| LINKEDIN_CLIENT_ID | OAuth | Document date |
| LINKEDIN_CLIENT_SECRET | OAuth | Document date |
| GITHUB_CLIENT_ID | OAuth | Document date |
| GITHUB_CLIENT_SECRET | OAuth | Document date |
| RESEND_API_KEY | Email service | Document date |

## Restore Procedures

### Scenario 1: Restore from Automatic Backup (Supabase Dashboard)

**For Pro tier and above with Point-in-Time Recovery:**

1. Go to Supabase Dashboard > Database > Backups
2. Select the backup point to restore from
3. Click "Restore" and confirm
4. Wait for restoration to complete (may take several minutes)
5. Verify data integrity (see verification steps below)

**For Free tier:**

1. Contact Supabase support for backup restoration
2. Provide project ID and desired restore date
3. Note: Limited to daily backup points

### Scenario 2: Restore from Manual Export

1. **Create new Supabase project** (if needed)

2. **Run migrations:**
   ```bash
   # Apply all migrations from supabase/migrations/ folder
   # In Supabase SQL Editor, run each migration file in order
   ```

3. **Import data:**
   ```sql
   -- Run the data_inserts.sql file in SQL Editor
   -- Or import CSV files via Table Editor
   ```

4. **Restore storage files:**
   - Upload files to respective buckets via Dashboard
   - Maintain original file paths/names

5. **Configure secrets:**
   - Add all secrets via Project Settings > Secrets
   - Or via Cloud Dashboard > Edge Functions > Secrets

6. **Deploy edge functions:**
   ```bash
   # Edge functions deploy automatically with the platform
   # Or manually via Supabase CLI: supabase functions deploy
   ```

### Scenario 3: Restore Specific Tables

```sql
-- Example: Restore jobs table from backup
-- First, backup current data if needed
CREATE TABLE jobs_backup AS SELECT * FROM jobs;

-- Clear and restore
TRUNCATE TABLE jobs CASCADE;

-- Insert from backup data
-- Use data_inserts.sql or CSV import
```

## Application State Recovery

### Frontend State Recovery

The application uses React Query for state management:

1. **Cache Invalidation**: Clear browser cache and localStorage
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Force Refresh**: Hard reload (Ctrl+Shift+R)

3. **Query Cache Reset**: Automatic on page reload

### Session Recovery

1. User sessions are managed by Supabase Auth
2. If sessions are corrupted, users can:
   - Clear cookies for the domain
   - Sign out and sign in again
   - Use password reset if needed

### Edge Function Recovery

1. Edge functions are stored in `supabase/functions/`
2. Redeploy by pushing to repository
3. Verify deployment in Supabase Dashboard > Edge Functions

## Rollback Procedures

### Bad Deployment Rollback

#### Option 1: Platform Version History

1. Open the project editor
2. Click "History" button (top of chat)
3. Find last working version
4. Click "Restore"

#### Option 2: Git Revert

```bash
# Find the last good commit
git log --oneline

# Revert to specific commit
git revert <bad-commit-hash>

# Or reset to previous state (destructive)
git reset --hard <good-commit-hash>
git push --force
```

#### Option 3: Supabase Dashboard Rollback

For database migrations:

1. Identify the problematic migration
2. Create a new migration that reverses changes:
   ```sql
   -- Example: Reverse an added column
   ALTER TABLE table_name DROP COLUMN new_column;
   ```

### Database Migration Rollback

```sql
-- Example rollback procedures

-- Rollback table creation
DROP TABLE IF EXISTS new_table CASCADE;

-- Rollback column addition
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

-- Rollback policy changes
DROP POLICY IF EXISTS "new_policy" ON table_name;

-- Rollback function changes
DROP FUNCTION IF EXISTS new_function();
```

## Disaster Recovery Runbook

### DR Scenario 1: Complete Service Outage

**Symptoms**: Application completely inaccessible

**Steps**:
1. Check platform status page
2. Check database provider status page
3. If infrastructure issue, wait for provider resolution
4. If application issue, check error logs in Sentry
5. Attempt rollback to last known good version

### DR Scenario 2: Database Corruption

**Symptoms**: Data inconsistencies, query errors, missing records

**Steps**:
1. **Assess scope**: Determine affected tables
2. **Stop writes**: Consider maintenance mode if critical
3. **Identify cause**: Check recent migrations, edge function changes
4. **Choose recovery**:
   - Point-in-time recovery (if available)
   - Restore from daily backup
   - Manual data correction
5. **Verify integrity**: Run verification queries
6. **Resume operations**: Clear caches, notify users

### DR Scenario 3: Security Breach

**Symptoms**: Unauthorized access, data exposure

**Steps**:
1. **Immediate**: Rotate all secrets and API keys
2. **Revoke**: Invalidate all user sessions
3. **Audit**: Review auth logs and access patterns
4. **Patch**: Fix vulnerability if identified
5. **Notify**: Inform affected users per privacy policy
6. **Document**: Create incident report

### DR Scenario 4: Edge Function Failures

**Symptoms**: API errors, 500 responses, timeouts

**Steps**:
1. Check edge function logs: Supabase Dashboard > Edge Functions > Logs
2. Identify failing function
3. Check recent changes to function code
4. Rollback function or fix and redeploy
5. Clear any cached responses
6. Monitor for recovery

## Data Integrity Verification

### Post-Restore Verification Checklist

Run these queries after any restore:

```sql
-- 1. Check user profiles exist
SELECT COUNT(*) as user_count FROM user_profiles;

-- 2. Verify jobs data
SELECT COUNT(*) as job_count FROM jobs;
SELECT status, COUNT(*) FROM jobs GROUP BY status;

-- 3. Check foreign key relationships
SELECT j.id, j.title 
FROM jobs j 
LEFT JOIN user_profiles up ON j.user_id = up.user_id 
WHERE up.user_id IS NULL;

-- 4. Verify interviews linked to jobs
SELECT i.id 
FROM interviews i 
LEFT JOIN jobs j ON i.job_id = j.id 
WHERE j.id IS NULL;

-- 5. Check RLS policies are active
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 6. Verify recent data (last 24 hours)
SELECT COUNT(*) FROM jobs WHERE created_at > NOW() - INTERVAL '24 hours';

-- 7. Check sequence values
SELECT 
  c.relname as sequence_name,
  pg_sequence_last_value(c.oid) as last_value
FROM pg_class c
WHERE c.relkind = 'S';
```

### Application-Level Verification

1. **Login Test**: Verify authentication works
2. **CRUD Test**: Create, read, update, delete a test record
3. **Navigation Test**: Visit all major pages
4. **API Test**: Check edge functions respond
5. **Real-time Test**: Verify subscriptions work (if applicable)

## Backup Schedule

| Backup Type | Frequency | Retention | Responsible |
|-------------|-----------|-----------|-------------|
| Automatic DB | Daily (auto) | 7 days | Supabase |
| Manual Data Export | Weekly | 30 days | Team |
| Schema Export | On change | Forever (Git) | Auto |
| Storage Files | Monthly | 90 days | Team |
| Secrets Audit | Quarterly | N/A | Team |

## Contact and Escalation

### Support Channels

| Issue Type | Contact |
|------------|---------|
| Platform Issues | Platform support team |
| Database Issues | Database provider support |
| Application Bugs | GitHub Issues |

### Escalation Path

1. **L1**: Development team attempts resolution
2. **L2**: Senior developer/team lead
3. **L3**: Platform support
4. **L4**: Emergency: All hands + vendor escalation

## Testing Backup and Recovery

### Monthly DR Test Procedure

1. **Export current data** to `data_inserts.sql`
2. **Create test environment** (new Supabase project)
3. **Run migrations** from `supabase/migrations/`
4. **Import test data** from export
5. **Verify** using integrity checklist above
6. **Document** results and any issues
7. **Delete** test environment

### Annual Full DR Test

1. Complete the monthly procedure
2. Additionally test:
   - Full application deployment
   - Edge function deployment
   - Storage file restoration
   - User authentication flow
   - All major user workflows
3. Measure recovery time (RTO)
4. Document and improve procedures

## Recovery Time Objectives (RTO)

| Scenario | Target RTO | Maximum RTO |
|----------|------------|-------------|
| Edge function failure | 15 minutes | 1 hour |
| Database issue (minor) | 1 hour | 4 hours |
| Database restore (full) | 4 hours | 24 hours |
| Complete rebuild | 24 hours | 72 hours |

## Recovery Point Objectives (RPO)

| Data Type | Maximum Data Loss |
|-----------|-------------------|
| Database records | 24 hours (daily backup) |
| User uploads | 24 hours (daily backup) |
| Configuration | 0 (stored in Git) |
| Edge functions | 0 (stored in Git) |

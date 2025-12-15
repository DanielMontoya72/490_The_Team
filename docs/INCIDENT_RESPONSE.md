# Incident Response Procedures

## Overview

This document outlines the incident response procedures for production issues in the application. All team members should be familiar with these procedures.

## Quick Setup Checklist

### 1. Sentry (Error Tracking) - ✅ Configured
- DSN added as `VITE_SENTRY_DSN` environment variable
- Automatic error capture enabled
- Performance monitoring enabled

### 2. UptimeRobot (Uptime Monitoring) - Manual Setup Required
1. Go to [uptimerobot.com](https://uptimerobot.com) and create free account
2. Click "Add New Monitor"
3. Select "HTTP(s)" monitor type
4. Enter your app URL: `https://your-vercel-app.vercel.app`
5. Set monitoring interval: 5 minutes
6. Configure alert contacts (email/SMS)
7. Save and activate

### 3. Application Monitoring Dashboard
- Access at `/monitoring` route
- View logs, API metrics, and errors
- Test error tracking with "Test Error" button

## Severity Levels

### P1 - Critical
- Application is completely down
- Data loss or corruption
- Security breach
- **Response time:** Immediate (within 15 minutes)
- **Resolution target:** 1 hour

### P2 - High
- Major feature is broken
- Performance degradation affecting >50% of users
- **Response time:** Within 1 hour
- **Resolution target:** 4 hours

### P3 - Medium
- Non-critical feature broken
- Performance issues affecting <50% of users
- **Response time:** Within 4 hours
- **Resolution target:** 24 hours

### P4 - Low
- Minor bugs
- Cosmetic issues
- **Response time:** Within 24 hours
- **Resolution target:** 1 week

## Monitoring Tools

### 1. Sentry (Error Tracking)
- **URL:** https://sentry.io
- **Purpose:** Captures JavaScript errors, stack traces, and user context
- **Alerts:** Configured to send email/Slack notifications for new errors

### 2. UptimeRobot (Uptime Monitoring)
- **URL:** https://uptimerobot.com
- **Purpose:** Monitors application availability
- **Check frequency:** Every 5 minutes
- **Alerts:** Email/SMS when site goes down

### 3. Application Monitoring Dashboard
- **URL:** /monitoring (internal)
- **Purpose:** View logs, API metrics, and error rates
- **Access:** Admin users only

## Incident Response Steps

### Step 1: Detection
- Alert received from Sentry/UptimeRobot
- User report via support channel
- Internal monitoring dashboard alert

### Step 2: Assessment
1. Check Sentry for error details and stack trace
2. Review monitoring dashboard for API error rates
3. Check UptimeRobot for uptime status
4. Determine severity level

### Step 3: Communication
1. Acknowledge the incident in team channel
2. For P1/P2: Notify stakeholders immediately
3. Update status page if available

### Step 4: Investigation
1. Review recent deployments in GitHub
2. Check Sentry error details and breadcrumbs
3. Review application logs in monitoring dashboard
4. Check database and API status

### Step 5: Resolution
1. Implement fix or rollback
2. Test in staging environment
3. Deploy to production
4. Verify resolution

### Step 6: Post-Incident
1. Update incident log
2. Notify stakeholders of resolution
3. Schedule post-mortem for P1/P2 incidents
4. Update runbooks if needed

## Key Contacts

| Role | Contact | Escalation Path |
|------|---------|-----------------|
| On-Call Engineer | TBD | First responder |
| Engineering Lead | TBD | P1/P2 escalation |
| Product Owner | TBD | User communication |

## Useful Commands

### Check Application Health
```bash
curl -I https://your-vercel-app.vercel.app/
```

### View Recent Errors (Sentry CLI)
```bash
sentry-cli issues list
```

### Force Clear CDN Cache
Use Vercel dashboard to redeploy or purge cache.

## Rollback Procedure

1. Go to GitHub repository
2. Navigate to Actions tab
3. Find last successful deployment
4. Click "Re-run workflow"

Or use Vercel's deployment history:
1. Open project in Vercel dashboard
2. Go to "Deployments" tab
3. Select previous working version
4. Click "Restore"

## Monitoring Dashboard Features

The `/monitoring` page provides:

- **API Request Metrics:** Total requests, success rate, average response time
- **Error Rate:** Percentage of failed requests
- **Log Volume:** Total logs with breakdown by level
- **Application Logs:** Searchable, filterable structured logs
- **API Performance:** Per-endpoint metrics
- **Recent Errors:** Last 20 failed API requests

### Testing Error Tracking

Use the "Test Error" button on the monitoring dashboard to verify Sentry integration is working.

## Alert Configuration

### Sentry Alerts
- New error type: Immediate notification
- Error spike (>10 in 1 hour): High priority alert
- P1 errors (fatal level): Immediate escalation

### UptimeRobot Alerts
- Site down: Email + SMS after 2 failed checks
- Site restored: Email notification

## Maintenance Windows

Scheduled maintenance should be:
1. Announced 24 hours in advance
2. Performed during low-traffic hours
3. Documented in maintenance log

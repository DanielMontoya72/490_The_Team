# Monitoring & Alerting Setup

## Overview

This document describes the monitoring and alerting infrastructure for the application.

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                  │
├──────────────┬──────────────┬──────────────┬──────────────┬────────┤
│   Browser    │    API       │   Database   │    Edge      │ Server │
│   Console    │   Calls      │    Logs      │  Functions   │ Metrics│
└──────────────┴──────────────┴──────────────┴──────────────┴────────┘
        │              │              │              │           │
        ▼              ▼              ▼              ▼           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        COLLECTION LAYER                              │
├──────────────────────────────────────────────────────────────────────┤
│  Logger        API Monitor      Supabase       Function    Web      │
│  (logger.ts)   (apiMonitor.ts)  Analytics      Logs        Vitals   │
└──────────────────────────────────────────────────────────────────────┘
        │              │              │              │           │
        ▼              ▼              ▼              ▼           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        STORAGE & ANALYSIS                            │
├─────────────────────────────────────┬───────────────────────────────┤
│            Sentry                    │       In-App Dashboard        │
│  - Error tracking                    │  - /monitoring page           │
│  - Performance monitoring            │  - Log viewer                 │
│  - Release health                    │  - API metrics                │
│  - User impact                       │  - Performance stats          │
└─────────────────────────────────────┴───────────────────────────────┘
        │                                      │
        ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ALERTING                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Sentry Alerts         UptimeRobot           Custom Alerts          │
│  - Error spikes        - Uptime monitoring   - Business metrics     │
│  - Performance         - Downtime alerts     - Threshold alerts     │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Application Logger (`src/lib/logger.ts`)

Structured logging with levels:

```typescript
import { logger } from '@/lib/logger';

logger.debug('Debug info', { data: value });
logger.info('User action', { userId, action });
logger.warn('Warning condition', { details });
logger.error('Error occurred', { error, context });
```

**Log Levels:**
| Level | Use Case | Retention |
|-------|----------|-----------|
| DEBUG | Development debugging | Session only |
| INFO | Normal operations | 7 days |
| WARN | Potential issues | 30 days |
| ERROR | Failures requiring attention | 90 days |

### 2. API Monitor (`src/lib/apiMonitor.ts`)

Tracks API performance:

```typescript
import { monitoredFetch } from '@/lib/apiMonitor';

// Automatically tracks timing and errors
const response = await monitoredFetch('/api/endpoint', options);
```

**Metrics Collected:**
- Request duration (ms)
- Status codes
- Error rates by endpoint
- Response sizes

### 3. Performance Monitor (`src/lib/performanceMonitor.ts`)

Web Vitals tracking:

```typescript
import { initPerformanceMonitoring } from '@/lib/performanceMonitor';

// Initialized in main.tsx
initPerformanceMonitoring();
```

**Metrics:**
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| LCP | < 2.5s | > 4s |
| FID/INP | < 200ms | > 500ms |
| CLS | < 0.1 | > 0.25 |
| FCP | < 1.8s | > 3s |
| TTFB | < 600ms | > 1.8s |

### 4. Sentry Error Tracking

**Configuration:** `src/lib/sentry.ts`

**Features:**
- Automatic error capture
- Stack traces with source maps
- User context
- Release tracking
- Performance tracing

**Alert Configuration (in Sentry Dashboard):**

1. **Error Spike Alert**
   - Trigger: >10 errors in 1 hour
   - Action: Email + Slack notification

2. **New Issue Alert**
   - Trigger: New error type detected
   - Action: Email notification

3. **Performance Alert**
   - Trigger: P95 response time > 3s
   - Action: Slack notification

### 5. UptimeRobot (External)

**Setup Steps:**
1. Create free account at uptimerobot.com
2. Add monitor for production URL
3. Configure check interval (5 min recommended)
4. Set up alert contacts

**Recommended Monitors:**
| Monitor | Type | Interval |
|---------|------|----------|
| Homepage | HTTP(S) | 5 min |
| API Health | HTTP(S) | 5 min |
| Auth Endpoint | Keyword | 5 min |

## Alert Configuration

### Sentry Alert Rules

```yaml
# Error Spike
name: Error Spike Alert
conditions:
  - event_frequency > 10 per hour
actions:
  - send_email
  - send_slack

# New Error Type
name: New Issue Alert
conditions:
  - first_seen_event
actions:
  - send_email

# High Error Rate
name: High Error Rate
conditions:
  - error_rate > 1%
actions:
  - send_email
  - send_slack
```

### UptimeRobot Configuration

```yaml
# Production Site
monitor:
  name: "Production Site"
  url: "https://yourapp.vercel.app"
  type: HTTP(S)
  interval: 300  # 5 minutes
  alert_contacts:
    - email: team@example.com
  keyword: null  # or specific text to verify

# API Health Check
monitor:
  name: "API Health"
  url: "https://aflesduelgyesqdqbvkb.supabase.co/rest/v1/"
  type: HTTP(S)
  interval: 300
  expected_status: 401  # Returns 401 without auth, confirms API is up
```

## Dashboard Access

### In-App Dashboard

Navigate to `/monitoring` to access:

1. **Requirements Tab**
   - Checklist of monitoring requirements
   - Test buttons for each component

2. **Application Logs Tab**
   - Real-time log viewer
   - Filter by level (DEBUG, INFO, WARN, ERROR)
   - Search functionality

3. **API Metrics Tab**
   - Response times by endpoint
   - Error rates
   - Request volume

4. **Performance Tab**
   - Web Vitals scores
   - Navigation timing breakdown
   - Resource loading analysis

### Sentry Dashboard

Access at: sentry.io

**Key Views:**
- Issues: All errors grouped by type
- Performance: Transaction traces
- Releases: Health by deployment
- Alerts: Alert history and rules

## Metric Definitions

### Application Health Metrics

| Metric | Definition | Healthy | Warning | Critical |
|--------|------------|---------|---------|----------|
| Error Rate | Errors / Total Requests | < 0.1% | 0.1-1% | > 1% |
| Uptime | Available time / Total time | > 99.9% | 99-99.9% | < 99% |
| P95 Response | 95th percentile latency | < 500ms | 500ms-2s | > 2s |
| Apdex | User satisfaction score | > 0.9 | 0.7-0.9 | < 0.7 |

### Business Metrics

| Metric | Definition | Source |
|--------|------------|--------|
| Active Users | Unique users in 24h | Auth logs |
| Feature Usage | Actions per feature | Event logs |
| Conversion Rate | Signups / Visits | Analytics |

## Runbooks

### High Error Rate

1. Check Sentry for error details
2. Identify affected users/features
3. Review recent deployments
4. Check database/API health
5. Implement fix or rollback
6. Monitor for resolution

### Performance Degradation

1. Check Web Vitals in /monitoring
2. Review API response times
3. Check database query performance
4. Identify slow resources
5. Optimize or scale as needed

### Downtime Alert

1. Verify downtime is real (not false positive)
2. Check Supabase status
3. Check Vercel status
4. Review recent changes
5. Implement fix or rollback
6. Update status page

## Adding Custom Metrics

### Frontend Metric

```typescript
import { logger } from '@/lib/logger';

// Track custom business metric
logger.info('Feature Used', {
  feature: 'job_search',
  action: 'filter_applied',
  filters: { location: 'remote' }
});
```

### API Metric

```typescript
import { apiMonitor } from '@/lib/apiMonitor';

// Track API call with custom tags
const startTime = performance.now();
// ... API call ...
const duration = performance.now() - startTime;

logger.info('API Call', {
  endpoint: '/api/search',
  duration,
  status: 200
});
```

## Maintenance

### Weekly Tasks
- Review error trends in Sentry
- Check performance metrics
- Review alert noise levels
- Update alert thresholds if needed

### Monthly Tasks
- Audit monitoring coverage
- Review and update runbooks
- Test alerting end-to-end
- Clean up resolved alerts

### Quarterly Tasks
- Review monitoring architecture
- Evaluate new monitoring tools
- Update documentation
- Training for new team members

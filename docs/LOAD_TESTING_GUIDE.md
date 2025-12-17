# Load Testing Guide

This guide explains how to run load tests to identify performance bottlenecks and verify the application can handle expected traffic.

## Prerequisites

### Install k6

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Running Tests

### Environment-Specific Tests

```bash
# Local Development (quick 2-min test)
k6 run load-tests/localhost.js

# Staging/Vercel (5-min test, 50 VUs)
k6 run -e BASE_URL=https://your-app.vercel.app load-tests/staging.js

# Production (13-min test, 100 VUs)
k6 run -e BASE_URL=https://your-production.com load-tests/production.js

# Basic test with custom URL
k6 run -e BASE_URL=http://localhost:8080 load-tests/basic.js
```

### Quick Start

```bash
# 1. Start your dev server
npm run dev

# 2. Run localhost test (auto-detects common ports)
k6 run load-tests/localhost.js
```

### With Custom Options

```bash
# Override virtual users and duration
k6 run --vus 50 --duration 2m load-tests/basic.js

# With environment variables
k6 run -e BASE_URL=https://490-the-team.vercel.app load-tests/basic.js
```

## Test Scenarios

### 1. Smoke Test (Sanity Check)

Quick test to verify the system works:

```javascript
export const options = {
  vus: 1,
  duration: '30s',
};
```

Run: `k6 run load-tests/basic.js`

### 2. Load Test (Normal Traffic)

Simulate expected normal traffic:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 20 },  // Ramp up
    { duration: '5m', target: 20 },  // Stay at 20 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};
```

### 3. Stress Test (Peak Traffic)

Find breaking points:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};
```

### 4. Spike Test (Sudden Traffic)

Simulate sudden traffic spike:

```javascript
export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 0 },
  ],
};
```

## Test Files

## Test Files

| File | Purpose | Duration | Max VUs |
|------|---------|----------|---------|
| `localhost.js` | Local development, auto-detects ports | 2 min | 10 |
| `basic.js` | General testing, balanced settings | 3.5 min | 20 |
| `staging.js` | Vercel/staging deployments | 5 min | 50 |
| `production.js` | Full production load test | 13 min | 100 |

### load-tests/localhost.js

Quick development test with:
- Auto-detection of common localhost ports (8080, 5173, 3000)
- Lenient thresholds for dev environment
- Detailed console output for debugging

### load-tests/basic.js

Balanced test for general use with:
- Connection verification at startup
- Detailed error logging
- Moderate thresholds (p95 < 1s, 5% error tolerance)

### load-tests/staging.js

Staging deployment test with:
- Production-like thresholds (p95 < 800ms, 3% errors)
- Requires BASE_URL environment variable
- Tests protected routes handling

### load-tests/production.js

Full production test with:
- Strict thresholds (p95 < 500ms, 1% errors)
- TTFB tracking
- Realistic user think times
- 100 concurrent users at peak

## Understanding Results

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `http_req_duration` | Total request time | p95 < 500ms |
| `http_req_waiting` | Time to first byte (TTFB) | p95 < 200ms |
| `http_req_failed` | Failed request rate | < 1% |
| `http_reqs` | Requests per second | Monitor for capacity |
| `vus` | Virtual users | As configured |

### Sample Output

```
     ✓ status is 200
     ✓ response time OK

     checks.........................: 100.00% ✓ 1000  ✗ 0
     data_received..................: 15 MB   250 kB/s
     data_sent......................: 100 kB  1.7 kB/s
     http_req_blocked...............: avg=1.5ms   p(95)=5ms
     http_req_connecting............: avg=1ms     p(95)=3ms
     http_req_duration..............: avg=150ms   p(95)=300ms
     http_req_waiting...............: avg=100ms   p(95)=200ms
     http_reqs......................: 1000    16.67/s
     vus............................: 20      min=1   max=20
```

### Interpreting Results

#### Good Performance
- `http_req_failed` is 0% or very low
- `http_req_duration` p95 is under 500ms
- Consistent response times (low deviation)

#### Performance Issues
- `http_req_duration` increasing over time → Memory leak or resource exhaustion
- High `http_req_blocked` → Connection pool exhaustion
- Increasing error rate → Server capacity reached

## Performance Baselines

### Target Metrics

| Scenario | VUs | p95 Response | Error Rate |
|----------|-----|--------------|------------|
| Normal | 20 | < 300ms | < 0.1% |
| Peak | 50 | < 500ms | < 1% |
| Stress | 100 | < 1000ms | < 5% |

### Current Baselines (Update after testing)

```
Date: [DATE]
Test: Load Test (20 VUs, 5 minutes)
Results:
  - p95 response time: [X]ms
  - Error rate: [X]%
  - Requests/second: [X]
```

## Common Issues

## Troubleshooting

### Common Problems

#### 1. "Cannot connect" or High Failure Rate with Fast Response Times

**Symptoms:** Very fast responses (< 10ms) but high failure rate

**Cause:** Usually testing against wrong URL or server not running

**Solution:**
```bash
# Verify your server is running first
curl http://localhost:8080

# Use the localhost test which auto-detects ports
k6 run load-tests/localhost.js

# Or specify the correct URL
k6 run -e BASE_URL=http://localhost:5173 load-tests/basic.js
```

#### 2. Rate Limiting (429 Errors)

**Symptoms:** Increasing 429 errors during test

**Cause:** Vercel or Supabase rate limits

**Solution:**
- Test against your own deployment (Vercel/staging)
- Reduce virtual users
- Add longer delays between requests
- Use authenticated requests for higher limits

#### 3. Threshold Violations

**Symptoms:** `ERRO thresholds on metrics have been crossed`

**Cause:** Performance didn't meet defined thresholds

**Solution:**
1. Check which threshold failed in the output
2. For development, use `localhost.js` (lenient thresholds)
3. For staging, use `staging.js` (moderate thresholds)
4. Optimize your application if production thresholds fail

#### 4. Connection Refused

**Symptoms:** All requests fail immediately

**Solution:**
```bash
# Check if server is running
lsof -i :8080  # or your port

# Start your dev server
npm run dev

# Then run tests
k6 run load-tests/localhost.js
```

#### 5. Database Connection Limits

**Symptoms:** Connection errors or timeouts

**Cause:** 
- Supabase free tier: 60 connections
- Pro tier: 100+ connections

**Solution:**
- Reduce concurrent users
- Enable connection pooling
- Upgrade Supabase tier for production tests

### 6. Edge Function Cold Starts

First request to cold function takes longer:
- Warm up functions before testing
- Account for cold start in metrics

## Continuous Load Testing

### CI Integration

Add to `.github/workflows/loadtest.yml`:

```yaml
name: Load Test
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  loadtest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: load-tests/basic.js
```

### Alerting

Set up alerts for performance regression:
- Track baseline metrics
- Alert if p95 increases > 50%
- Alert if error rate > 1%

## Best Practices

1. **Run from consistent location** - Network latency affects results
2. **Test in staging first** - Don't surprise production
3. **Baseline before changes** - Compare before/after
4. **Monitor during tests** - Watch server resources
5. **Test specific scenarios** - Focus on critical paths
6. **Document results** - Track trends over time

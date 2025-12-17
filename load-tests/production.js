/**
 * Production Load Test
 * 
 * Full load test with strict thresholds for production environments.
 * Run with: k6 run -e BASE_URL=https://your-production-url.com load-tests/production.js
 * Or: npm run loadtest:prod
 * 
 * ⚠️  WARNING: Only run against production during low-traffic periods
 *    or use a production-like staging environment.
 */

import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Metrics
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');
const ttfb = new Trend('time_to_first_byte');
const errorsByEndpoint = new Counter('errors_by_endpoint');
const activeVUs = new Gauge('active_vus');

export const options = {
  stages: [
    { duration: '1m', target: 25 },    // Warm up
    { duration: '2m', target: 50 },    // Ramp to 50
    { duration: '3m', target: 50 },    // Sustain
    { duration: '2m', target: 100 },   // Ramp to peak
    { duration: '3m', target: 100 },   // Sustain peak
    { duration: '1m', target: 50 },    // Scale down
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(50)<300', 'p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],     // 1% max failure
    errors: ['rate<0.02'],              // 2% max errors
    time_to_first_byte: ['p(95)<400'],  // TTFB under 400ms
  },
};

const BASE_URL = __ENV.BASE_URL || '';

export function setup() {
  if (!BASE_URL) {
    console.log('\n❌ ERROR: BASE_URL is required for production tests');
    console.log('   Usage: k6 run -e BASE_URL=https://your-app.com load-tests/production.js');
    fail('BASE_URL not provided');
  }
  
  console.log('\n🏭 PRODUCTION LOAD TEST');
  console.log('═'.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log('Duration: ~13 minutes');
  console.log('Peak VUs: 100');
  console.log('Thresholds: p95 < 500ms, <1% errors');
  console.log('═'.repeat(60));
  
  // Verify connection with multiple attempts
  let connected = false;
  for (let i = 0; i < 3; i++) {
    const response = http.get(BASE_URL, { timeout: '20s' });
    if (response.status > 0) {
      connected = true;
      console.log(`✅ Connected (Attempt ${i + 1}, Status: ${response.status}, TTFB: ${response.timings.waiting}ms)`);
      break;
    }
    sleep(2);
  }
  
  if (!connected) {
    console.log(`\n❌ Failed to connect to ${BASE_URL} after 3 attempts`);
    fail('Connection failed');
  }
  
  console.log('═'.repeat(60) + '\n');
  console.log('⚠️  Starting production load test in 5 seconds...\n');
  sleep(5);
  
  return { baseUrl: BASE_URL, startTime: Date.now() };
}

export default function (data) {
  const baseUrl = data.baseUrl;
  activeVUs.add(__VU);
  
  // Simulate realistic user journey
  
  // 1. Landing page
  const homeResponse = http.get(baseUrl, { tags: { name: 'Homepage' } });
  
  pageLoadTime.add(homeResponse.timings.duration);
  ttfb.add(homeResponse.timings.waiting);
  
  const homeOk = check(homeResponse, {
    'homepage 200': (r) => r.status === 200,
    'homepage p50': (r) => r.timings.duration < 300,
    'homepage content': (r) => r.body?.length > 1000,
  });
  
  if (!homeOk) {
    errorsByEndpoint.add(1, { endpoint: 'homepage' });
  }
  errorRate.add(!homeOk);

  sleep(randomThinkTime());

  // 2. Navigation to login
  const loginResponse = http.get(`${baseUrl}/login`, { tags: { name: 'Login' } });
  
  const loginOk = check(loginResponse, {
    'login 200': (r) => r.status === 200,
    'login fast': (r) => r.timings.duration < 400,
  });
  
  if (!loginOk) {
    errorsByEndpoint.add(1, { endpoint: 'login' });
  }

  sleep(randomThinkTime());

  // 3. Static assets (parallel)
  http.batch([
    { method: 'GET', url: `${baseUrl}/favicon.ico`, params: { tags: { name: 'Assets' } } },
  ]);

  sleep(0.2);

  // 4. API health check (if available)
  const healthResponse = http.get(`${baseUrl}/api/health`, { 
    tags: { name: 'Health' },
    timeout: '5s',
  });
  
  // Health endpoint might not exist, so we're lenient
  check(healthResponse, {
    'health check ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(randomThinkTime());

  // 5. Protected routes sampling
  const routes = ['/dashboard', '/jobs', '/profile', '/settings'];
  const randomRoute = routes[Math.floor(Math.random() * routes.length)];
  
  const protectedResponse = http.get(`${baseUrl}${randomRoute}`, {
    tags: { name: 'Protected' },
    redirects: 0,
  });
  
  const protectedOk = check(protectedResponse, {
    'protected handled': (r) => [200, 302, 307, 401, 403].includes(r.status),
    'protected responsive': (r) => r.timings.duration < 500,
  });
  
  if (!protectedOk) {
    errorsByEndpoint.add(1, { endpoint: randomRoute });
  }

  sleep(randomThinkTime());
}

function randomThinkTime() {
  // Realistic user think time: 1-5 seconds
  return Math.random() * 4 + 1;
}

export function handleSummary(data) {
  const { metrics } = data;
  
  const total = metrics.http_reqs?.values?.count || 0;
  const failed = metrics.http_req_failed?.values?.passes || 0;
  const failRate = total > 0 ? (failed / total * 100).toFixed(3) : 0;
  
  const avg = Math.round(metrics.http_req_duration?.values?.avg || 0);
  const p50 = Math.round(metrics.http_req_duration?.values?.['p(50)'] || 0);
  const p95 = Math.round(metrics.http_req_duration?.values?.['p(95)'] || 0);
  const p99 = Math.round(metrics.http_req_duration?.values?.['p(99)'] || 0);
  const max = Math.round(metrics.http_req_duration?.values?.max || 0);
  
  const avgTTFB = Math.round(metrics.time_to_first_byte?.values?.avg || 0);
  const p95TTFB = Math.round(metrics.time_to_first_byte?.values?.['p(95)'] || 0);
  
  const throughput = Math.round(metrics.http_reqs?.values?.rate || 0);
  
  let output = '\n' + '═'.repeat(60) + '\n';
  output += '              PRODUCTION LOAD TEST REPORT\n';
  output += '═'.repeat(60) + '\n\n';
  
  output += '┌─────────────────────────────────────────────────────────┐\n';
  output += '│ TRAFFIC SUMMARY                                         │\n';
  output += '├─────────────────────────────────────────────────────────┤\n';
  output += `│ Total Requests:     ${String(total).padEnd(10)} │\n`;
  output += `│ Failed Requests:    ${String(failed).padEnd(10)} (${failRate}%)          │\n`;
  output += `│ Throughput:         ${String(throughput + ' req/s').padEnd(10)}              │\n`;
  output += '└─────────────────────────────────────────────────────────┘\n\n';
  
  output += '┌─────────────────────────────────────────────────────────┐\n';
  output += '│ LATENCY (Response Time)                                 │\n';
  output += '├─────────────────────────────────────────────────────────┤\n';
  output += `│ Average:   ${String(avg + 'ms').padEnd(10)}                              │\n`;
  output += `│ p50:       ${String(p50 + 'ms').padEnd(10)} ${p50 < 300 ? '✅' : '❌'}                            │\n`;
  output += `│ p95:       ${String(p95 + 'ms').padEnd(10)} ${p95 < 500 ? '✅' : '❌'}                            │\n`;
  output += `│ p99:       ${String(p99 + 'ms').padEnd(10)} ${p99 < 1000 ? '✅' : '❌'}                            │\n`;
  output += `│ Max:       ${String(max + 'ms').padEnd(10)}                              │\n`;
  output += '└─────────────────────────────────────────────────────────┘\n\n';
  
  output += '┌─────────────────────────────────────────────────────────┐\n';
  output += '│ TIME TO FIRST BYTE (TTFB)                               │\n';
  output += '├─────────────────────────────────────────────────────────┤\n';
  output += `│ Average:   ${String(avgTTFB + 'ms').padEnd(10)}                              │\n`;
  output += `│ p95:       ${String(p95TTFB + 'ms').padEnd(10)} ${p95TTFB < 400 ? '✅' : '❌'}                            │\n`;
  output += '└─────────────────────────────────────────────────────────┘\n\n';
  
  // Overall verdict
  const thresholdsPassed = 
    parseFloat(failRate) < 1 && 
    p50 < 300 && 
    p95 < 500 && 
    p99 < 1000 &&
    p95TTFB < 400;
  
  if (thresholdsPassed) {
    output += '╔═════════════════════════════════════════════════════════╗\n';
    output += '║  ✅ PRODUCTION READY - All thresholds passed           ║\n';
    output += '╚═════════════════════════════════════════════════════════╝\n';
  } else {
    output += '╔═════════════════════════════════════════════════════════╗\n';
    output += '║  ❌ THRESHOLD VIOLATIONS - Review before deployment     ║\n';
    output += '╠═════════════════════════════════════════════════════════╣\n';
    
    if (parseFloat(failRate) >= 1) {
      output += '║  • Error rate exceeds 1%                                ║\n';
    }
    if (p95 >= 500) {
      output += '║  • p95 latency exceeds 500ms                            ║\n';
    }
    if (p99 >= 1000) {
      output += '║  • p99 latency exceeds 1 second                         ║\n';
    }
    if (p95TTFB >= 400) {
      output += '║  • TTFB p95 exceeds 400ms                               ║\n';
    }
    
    output += '╚═════════════════════════════════════════════════════════╝\n';
  }
  
  output += '\n' + '═'.repeat(60) + '\n';
  
  return {
    'load-tests/results/production-summary.json': JSON.stringify(data, null, 2),
    stdout: output,
  };
}

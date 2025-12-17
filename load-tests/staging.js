/**
 * Staging Environment Load Test
 * 
 * For testing Vercel staging/preview deployments.
 * Run with: k6 run -e BASE_URL=https://your-app.vercel.app load-tests/staging.js
 * Or: npm run loadtest:staging
 */

import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');
const apiLatency = new Trend('api_latency');
const errorCount = new Counter('error_count');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp to 20 users
    { duration: '1m', target: 20 },    // Sustain
    { duration: '30s', target: 40 },   // Ramp to 40
    { duration: '1m', target: 40 },    // Sustain
    { duration: '30s', target: 50 },   // Peak load
    { duration: '1m', target: 50 },    // Sustain peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.03'],     // 3% max failure
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || '';

export function setup() {
  if (!BASE_URL) {
    console.log('\n❌ ERROR: BASE_URL is required for staging tests');
    console.log('   Usage: k6 run -e BASE_URL=https://your-app.vercel.app load-tests/staging.js');
    fail('BASE_URL not provided');
  }
  
  console.log('\n🚀 STAGING LOAD TEST');
  console.log('═'.repeat(50));
  console.log(`Target: ${BASE_URL}`);
  console.log('Duration: ~5 minutes');
  console.log('Peak VUs: 50');
  console.log('═'.repeat(50));
  
  // Verify connection
  const response = http.get(BASE_URL, { timeout: '15s' });
  
  if (response.status === 0) {
    console.log(`\n❌ Cannot connect to ${BASE_URL}`);
    console.log('   Verify the URL is correct and accessible');
    fail('Connection failed');
  }
  
  console.log(`✅ Connected (Status: ${response.status}, Time: ${response.timings.duration}ms)`);
  console.log('═'.repeat(50) + '\n');
  
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const baseUrl = data.baseUrl;
  
  // 1. Homepage load
  const homeResponse = http.get(baseUrl, { tags: { name: 'Homepage' } });
  pageLoadTime.add(homeResponse.timings.duration);
  
  const homeOk = check(homeResponse, {
    'homepage 200': (r) => r.status === 200,
    'homepage fast': (r) => r.timings.duration < 800,
    'homepage has content': (r) => r.body?.length > 500,
  });
  
  if (!homeOk) errorCount.add(1);
  errorRate.add(!homeOk);

  sleep(0.5);

  // 2. Login page
  const loginResponse = http.get(`${baseUrl}/login`, { tags: { name: 'Login' } });
  
  check(loginResponse, {
    'login 200': (r) => r.status === 200,
    'login fast': (r) => r.timings.duration < 500,
  });

  sleep(0.5);

  // 3. Static assets
  const assetsResponse = http.batch([
    { method: 'GET', url: `${baseUrl}/favicon.ico`, params: { tags: { name: 'Assets' } } },
  ]);

  sleep(0.5);

  // 4. Protected routes (expect redirect or 401)
  const protectedRoutes = ['/dashboard', '/jobs', '/profile'];
  const route = protectedRoutes[Math.floor(Math.random() * protectedRoutes.length)];
  
  const protectedResponse = http.get(`${baseUrl}${route}`, {
    tags: { name: 'Protected' },
    redirects: 0,
  });
  
  check(protectedResponse, {
    'protected route handled': (r) => [200, 302, 307, 401, 403].includes(r.status),
  });

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const { metrics } = data;
  
  const total = metrics.http_reqs?.values?.count || 0;
  const failed = metrics.http_req_failed?.values?.passes || 0;
  const failRate = total > 0 ? (failed / total * 100).toFixed(2) : 0;
  const avg = Math.round(metrics.http_req_duration?.values?.avg || 0);
  const p95 = Math.round(metrics.http_req_duration?.values?.['p(95)'] || 0);
  const p99 = Math.round(metrics.http_req_duration?.values?.['p(99)'] || 0);
  const throughput = Math.round(metrics.http_reqs?.values?.rate || 0);
  
  let output = '\n' + '═'.repeat(50) + '\n';
  output += '         STAGING TEST RESULTS\n';
  output += '═'.repeat(50) + '\n\n';
  
  output += `📊 Requests: ${total} total, ${failed} failed (${failRate}%)\n`;
  output += `⏱️  Latency:  avg=${avg}ms, p95=${p95}ms, p99=${p99}ms\n`;
  output += `🚀 Throughput: ${throughput} req/s\n\n`;
  
  // Staging-specific thresholds check
  let passed = true;
  
  if (parseFloat(failRate) > 3) {
    output += '❌ FAIL: Error rate > 3%\n';
    passed = false;
  }
  if (p95 > 800) {
    output += '❌ FAIL: p95 latency > 800ms\n';
    passed = false;
  }
  if (p99 > 1500) {
    output += '❌ FAIL: p99 latency > 1.5s\n';
    passed = false;
  }
  
  if (passed) {
    output += '✅ PASS: Ready for production testing\n';
  } else {
    output += '\n⚠️  Review issues before production deployment\n';
  }
  
  output += '\n' + '═'.repeat(50) + '\n';
  
  return {
    'load-tests/results/staging-summary.json': JSON.stringify(data, null, 2),
    stdout: output,
  };
}

/**
 * Basic Load Test for Application
 * 
 * Run with: k6 run load-tests/basic.js
 * Or with custom URL: k6 run -e BASE_URL=http://localhost:8080 load-tests/basic.js
 */

import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');
const errorsByStatus = new Counter('errors_by_status');

// Test configuration - balanced for general use
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 1 second for general testing
    http_req_failed: ['rate<0.05'],      // 5% tolerance
    errors: ['rate<0.10'],               // 10% error tolerance
  },
};

// Default to localhost for development
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Connection check at startup
export function setup() {
  console.log(`\n🎯 Testing against: ${BASE_URL}`);
  console.log('─'.repeat(50));
  
  const testResponse = http.get(BASE_URL, { timeout: '10s' });
  
  if (testResponse.status === 0) {
    console.log(`❌ ERROR: Cannot connect to ${BASE_URL}`);
    console.log('   Make sure your server is running!');
    console.log('   For Vite dev server: npm run dev');
    console.log('   Default port is usually 8080 or 5173');
    fail(`Cannot connect to ${BASE_URL}`);
  }
  
  console.log(`✅ Connection successful (Status: ${testResponse.status})`);
  console.log('─'.repeat(50) + '\n');
  
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const baseUrl = data?.baseUrl || BASE_URL;
  
  // Test homepage
  const homeResponse = http.get(baseUrl, {
    tags: { name: 'Homepage' },
  });
  
  pageLoadTime.add(homeResponse.timings.duration);
  
  const homeCheck = check(homeResponse, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads quickly': (r) => r.timings.duration < 1000,
    'homepage has content': (r) => r.body && r.body.length > 0,
  });
  
  if (!homeCheck) {
    logError('Homepage', homeResponse);
  }
  
  errorRate.add(!homeCheck);

  sleep(1);

  // Test login page
  const loginResponse = http.get(`${baseUrl}/login`, {
    tags: { name: 'Login Page' },
  });
  
  const loginCheck = check(loginResponse, {
    'login page status is 200': (r) => r.status === 200,
    'login page loads quickly': (r) => r.timings.duration < 500,
  });
  
  if (!loginCheck) {
    logError('Login Page', loginResponse);
  }

  sleep(1);

  // Test static assets
  const faviconResponse = http.get(`${baseUrl}/favicon.ico`, {
    tags: { name: 'Favicon' },
  });
  
  check(faviconResponse, {
    'favicon loads': (r) => r.status === 200 || r.status === 304 || r.status === 404,
  });

  sleep(Math.random() * 2 + 1);
}

function logError(endpoint, response) {
  const status = response.status || 'no response';
  console.log(`⚠️  ${endpoint} failed: Status ${status}`);
  
  if (response.status === 0) {
    console.log('   → Connection refused or timeout');
  } else if (response.status >= 500) {
    console.log('   → Server error');
  } else if (response.status >= 400) {
    console.log('   → Client error');
  }
  
  errorsByStatus.add(1, { status: String(status) });
}

export function handleSummary(data) {
  const summary = generateTextSummary(data);
  
  return {
    'load-tests/results/summary.json': JSON.stringify(data, null, 2),
    stdout: summary,
  };
}

function generateTextSummary(data) {
  const { metrics } = data;
  
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  const failedRequests = metrics.http_req_failed?.values?.passes || 0;
  const failureRate = totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) : 0;
  
  const avgDuration = Math.round(metrics.http_req_duration?.values?.avg || 0);
  const p95Duration = Math.round(metrics.http_req_duration?.values?.['p(95)'] || 0);
  const p99Duration = Math.round(metrics.http_req_duration?.values?.['p(99)'] || 0);
  const maxDuration = Math.round(metrics.http_req_duration?.values?.max || 0);
  const throughput = Math.round(metrics.http_reqs?.values?.rate || 0);
  
  let output = '\n' + '═'.repeat(50) + '\n';
  output += '       LOAD TEST SUMMARY\n';
  output += '═'.repeat(50) + '\n\n';
  
  output += `📊 Requests\n`;
  output += `   Total:    ${totalRequests}\n`;
  output += `   Failed:   ${failedRequests} (${failureRate}%)\n\n`;
  
  output += `⏱️  Response Times\n`;
  output += `   Average:  ${avgDuration}ms\n`;
  output += `   p95:      ${p95Duration}ms\n`;
  output += `   p99:      ${p99Duration}ms\n`;
  output += `   Max:      ${maxDuration}ms\n\n`;
  
  output += `🚀 Throughput: ${throughput} req/s\n\n`;
  
  // Result interpretation
  if (failureRate > 5) {
    output += `❌ HIGH FAILURE RATE (${failureRate}%)\n`;
    output += `   Check server logs and ensure correct BASE_URL\n`;
  } else if (avgDuration < 10 && failedRequests > 0) {
    output += `⚠️  SUSPICIOUS: Very fast responses with failures\n`;
    output += `   Likely hitting wrong URL or connection issues\n`;
  } else if (p95Duration > 1000) {
    output += `⚠️  SLOW RESPONSES: p95 > 1 second\n`;
    output += `   Consider optimizing server performance\n`;
  } else {
    output += `✅ Test completed within thresholds\n`;
  }
  
  output += '\n' + '═'.repeat(50) + '\n';
  
  return output;
}

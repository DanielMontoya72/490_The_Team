/**
 * Localhost Development Load Test
 * 
 * Quick test optimized for local development with detailed output.
 * Run with: k6 run load-tests/localhost.js
 * Or: npm run loadtest:dev
 */

import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');

export const options = {
  stages: [
    { duration: '15s', target: 5 },   // Ramp to 5 users
    { duration: '30s', target: 5 },   // Stay at 5
    { duration: '15s', target: 10 },  // Ramp to 10
    { duration: '30s', target: 10 },  // Stay at 10
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 2 seconds for dev
    http_req_failed: ['rate<0.15'],      // 15% tolerance for dev
    errors: ['rate<0.20'],               // 20% error tolerance
  },
};

// Common localhost ports for Vite/React
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export function setup() {
  console.log('\n🔧 LOCALHOST DEVELOPMENT TEST');
  console.log('═'.repeat(50));
  console.log(`Target: ${BASE_URL}`);
  console.log('Duration: ~2 minutes');
  console.log('Max VUs: 10');
  console.log('═'.repeat(50));
  
  // Try to connect
  const ports = ['8080', '5173', '3000', '4173'];
  let connected = false;
  let workingUrl = BASE_URL;
  
  // First try the specified URL
  const response = http.get(BASE_URL, { timeout: '5s' });
  if (response.status > 0) {
    connected = true;
    console.log(`✅ Connected to ${BASE_URL} (Status: ${response.status})`);
  }
  
  // If that fails and it's localhost, try other common ports
  if (!connected && BASE_URL.includes('localhost')) {
    console.log(`⚠️  Cannot connect to ${BASE_URL}, trying other ports...`);
    
    for (const port of ports) {
      const testUrl = `http://localhost:${port}`;
      if (testUrl === BASE_URL) continue;
      
      const testResponse = http.get(testUrl, { timeout: '3s' });
      if (testResponse.status > 0) {
        workingUrl = testUrl;
        connected = true;
        console.log(`✅ Found server at ${testUrl} (Status: ${testResponse.status})`);
        console.log(`   Run with: k6 run -e BASE_URL=${testUrl} load-tests/localhost.js`);
        break;
      }
    }
  }
  
  if (!connected) {
    console.log('\n❌ ERROR: No server found!');
    console.log('   Make sure your dev server is running:');
    console.log('   → npm run dev');
    console.log('   → Or specify URL: k6 run -e BASE_URL=http://localhost:PORT load-tests/localhost.js');
    fail('No server connection');
  }
  
  console.log('═'.repeat(50) + '\n');
  return { baseUrl: workingUrl };
}

export default function (data) {
  const baseUrl = data?.baseUrl || BASE_URL;
  
  // Homepage test
  const homeStart = Date.now();
  const homeResponse = http.get(baseUrl, { tags: { name: 'Homepage' } });
  const homeDuration = Date.now() - homeStart;
  
  pageLoadTime.add(homeDuration);
  
  const homeOk = check(homeResponse, {
    'homepage returns 200': (r) => r.status === 200,
    'homepage has content': (r) => r.body && r.body.length > 100,
    'homepage under 2s': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!homeOk);
  
  if (!homeOk && __VU === 1) {
    console.log(`[VU1] Homepage: ${homeResponse.status} (${homeDuration}ms)`);
  }

  sleep(0.5);

  // Login page test
  const loginResponse = http.get(`${baseUrl}/login`, { tags: { name: 'Login' } });
  
  const loginOk = check(loginResponse, {
    'login returns 200': (r) => r.status === 200,
    'login under 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!loginOk && __VU === 1) {
    console.log(`[VU1] Login: ${loginResponse.status}`);
  }

  sleep(0.5);

  // Dashboard test (may redirect to login if auth required)
  const dashResponse = http.get(`${baseUrl}/dashboard`, { 
    tags: { name: 'Dashboard' },
    redirects: 0,  // Don't follow redirects
  });
  
  check(dashResponse, {
    'dashboard accessible': (r) => r.status === 200 || r.status === 302 || r.status === 307,
  });

  sleep(Math.random() + 0.5);
}

export function handleSummary(data) {
  const { metrics } = data;
  
  const total = metrics.http_reqs?.values?.count || 0;
  const failed = metrics.http_req_failed?.values?.passes || 0;
  const avg = Math.round(metrics.http_req_duration?.values?.avg || 0);
  const p95 = Math.round(metrics.http_req_duration?.values?.['p(95)'] || 0);
  
  let output = '\n' + '═'.repeat(40) + '\n';
  output += '  DEV TEST RESULTS\n';
  output += '═'.repeat(40) + '\n';
  output += `  Requests: ${total} (${failed} failed)\n`;
  output += `  Avg: ${avg}ms | p95: ${p95}ms\n`;
  
  if (failed === 0 && p95 < 500) {
    output += '  ✅ Excellent performance!\n';
  } else if (failed / total < 0.05) {
    output += '  ✅ Good - ready for staging tests\n';
  } else {
    output += '  ⚠️  Issues detected - check logs\n';
  }
  
  output += '═'.repeat(40) + '\n';
  
  return {
    'load-tests/results/localhost-summary.json': JSON.stringify(data, null, 2),
    stdout: output,
  };
}

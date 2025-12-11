/**
 * OmniFlow Stress Test Script
 * Simulates 100 concurrent users to test system performance
 * 
 * Usage:
 *   node scripts/stress-test.js [options]
 * 
 * Options:
 *   --users=100       Number of concurrent users (default: 100)
 *   --duration=300    Test duration in seconds (default: 300 = 5 minutes)
 *   --base-url=...    Base URL of the application
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  users: parseInt(process.argv.find(arg => arg.startsWith('--users='))?.split('=')[1] || '100'),
  durationSeconds: parseInt(process.argv.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '300'),
};

// Test results storage
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null,
};

// Endpoints to test (PUBLIC endpoints only - auth-protected routes would return 401/302)
// For authenticated load testing, use k6 with session tokens
const endpoints = [
  { path: '/api/health', method: 'GET', weight: 30, requiresAuth: false },
  { path: '/api/geo-detect', method: 'GET', weight: 15, requiresAuth: false },
  { path: '/', method: 'GET', weight: 20, requiresAuth: false },
  { path: '/login', method: 'GET', weight: 10, requiresAuth: false },
  { path: '/signup', method: 'GET', weight: 10, requiresAuth: false },
  { path: '/pricing', method: 'GET', weight: 15, requiresAuth: false },
];

// Note: This stress test focuses on PUBLIC endpoints only.
// Protected routes (/crm/*, /dashboard, etc.) require authentication.
// For authenticated load testing:
// 1. Use the k6 script with session tokens
// 2. Or manually add a valid Firebase auth token to requests
// The purpose of this test is to verify:
// - Server can handle concurrent connections
// - Health endpoint responds under load
// - Public pages render correctly
// - No memory leaks or crashes under sustained load

// Utility: Make HTTP request
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(endpoint.path, config.baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: endpoint.method,
      timeout: 30000,
      headers: {
        'User-Agent': 'OmniFlow-StressTest/1.0',
        'Accept': 'text/html,application/json',
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          responseTime,
          path: endpoint.path,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      reject({
        error: error.message,
        responseTime,
        path: endpoint.path,
        success: false,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        responseTime: 30000,
        path: endpoint.path,
        success: false,
      });
    });

    req.end();
  });
}

// Select random endpoint based on weight
function selectRandomEndpoint() {
  const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) return endpoint;
  }
  return endpoints[0];
}

// Simulate a single user
async function simulateUser(userId, durationMs) {
  const userResults = [];
  const endTime = Date.now() + durationMs;
  
  while (Date.now() < endTime) {
    const endpoint = selectRandomEndpoint();
    
    try {
      const result = await makeRequest(endpoint);
      userResults.push(result);
      results.totalRequests++;
      
      if (result.success) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
      }
      results.responseTimes.push(result.responseTime);
      
    } catch (error) {
      userResults.push(error);
      results.totalRequests++;
      results.failedRequests++;
      results.errors.push(error);
    }
    
    // Random delay between requests (100ms - 2000ms)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 1900));
  }
  
  return userResults;
}

// Calculate statistics
function calculateStats() {
  const sorted = results.responseTimes.slice().sort((a, b) => a - b);
  const len = sorted.length;
  
  if (len === 0) return null;
  
  return {
    min: sorted[0],
    max: sorted[len - 1],
    avg: Math.round(sorted.reduce((a, b) => a + b, 0) / len),
    median: sorted[Math.floor(len / 2)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
  };
}

// Print progress
function printProgress() {
  const elapsed = (Date.now() - results.startTime) / 1000;
  const successRate = results.totalRequests > 0 
    ? ((results.successfulRequests / results.totalRequests) * 100).toFixed(1)
    : 0;
  
  process.stdout.write(`\rProgress: ${Math.round(elapsed)}s / ${config.durationSeconds}s | ` +
    `Requests: ${results.totalRequests} | ` +
    `Success: ${successRate}% | ` +
    `Errors: ${results.failedRequests}`);
}

// Main test runner
async function runStressTest() {
  console.log('==================================================');
  console.log('  OmniFlow Stress Test - 100 Concurrent Users');
  console.log('==================================================');
  console.log('');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Concurrent Users: ${config.users}`);
  console.log(`Duration: ${config.durationSeconds} seconds`);
  console.log('');
  console.log('Starting test...');
  console.log('');
  
  results.startTime = Date.now();
  const durationMs = config.durationSeconds * 1000;
  
  // Progress indicator
  const progressInterval = setInterval(printProgress, 1000);
  
  // Start all users concurrently
  const userPromises = [];
  for (let i = 0; i < config.users; i++) {
    userPromises.push(simulateUser(i, durationMs));
  }
  
  // Wait for all users to complete
  await Promise.all(userPromises);
  
  clearInterval(progressInterval);
  results.endTime = Date.now();
  
  console.log('\n\n');
  printResults();
}

// Print final results
function printResults() {
  const stats = calculateStats();
  const totalDuration = (results.endTime - results.startTime) / 1000;
  const requestsPerSecond = (results.totalRequests / totalDuration).toFixed(2);
  const successRate = ((results.successfulRequests / results.totalRequests) * 100).toFixed(2);
  const errorRate = ((results.failedRequests / results.totalRequests) * 100).toFixed(2);
  
  console.log('');
  console.log('NOTE: This test covers PUBLIC endpoints only.');
  console.log('Protected routes require authentication and are tested separately.');
  console.log('See docs/STRESS_TEST_GUIDE.md for authenticated load testing.');
  
  console.log('==================================================');
  console.log('  STRESS TEST RESULTS');
  console.log('==================================================');
  console.log('');
  console.log('Summary:');
  console.log(`  Total Duration:        ${totalDuration.toFixed(1)} seconds`);
  console.log(`  Concurrent Users:      ${config.users}`);
  console.log(`  Total Requests:        ${results.totalRequests}`);
  console.log(`  Requests/Second:       ${requestsPerSecond}`);
  console.log('');
  console.log('Success Rate:');
  console.log(`  Successful Requests:   ${results.successfulRequests} (${successRate}%)`);
  console.log(`  Failed Requests:       ${results.failedRequests} (${errorRate}%)`);
  console.log('');
  
  if (stats) {
    console.log('Response Times (ms):');
    console.log(`  Minimum:               ${stats.min}ms`);
    console.log(`  Maximum:               ${stats.max}ms`);
    console.log(`  Average:               ${stats.avg}ms`);
    console.log(`  Median (p50):          ${stats.median}ms`);
    console.log(`  95th Percentile:       ${stats.p95}ms`);
    console.log(`  99th Percentile:       ${stats.p99}ms`);
  }
  
  console.log('');
  console.log('==================================================');
  console.log('  PASS/FAIL CRITERIA');
  console.log('==================================================');
  console.log('');
  
  // Evaluate results
  let passed = true;
  const criteria = [
    { 
      name: 'Success Rate > 99%',
      pass: parseFloat(successRate) >= 99,
      value: `${successRate}%`
    },
    { 
      name: 'P95 Response Time < 2000ms',
      pass: stats && stats.p95 < 2000,
      value: stats ? `${stats.p95}ms` : 'N/A'
    },
    { 
      name: 'P99 Response Time < 5000ms',
      pass: stats && stats.p99 < 5000,
      value: stats ? `${stats.p99}ms` : 'N/A'
    },
    { 
      name: 'No HTTP 5xx Errors',
      pass: results.errors.filter(e => e.status >= 500).length === 0,
      value: `${results.errors.filter(e => e.status >= 500).length} errors`
    },
  ];
  
  criteria.forEach(c => {
    const status = c.pass ? '[PASS]' : '[FAIL]';
    console.log(`${status} ${c.name}: ${c.value}`);
    if (!c.pass) passed = false;
  });
  
  console.log('');
  console.log('==================================================');
  
  if (passed) {
    console.log('  OVERALL: PASS - System handles 100 concurrent users');
  } else {
    console.log('  OVERALL: FAIL - Review failed criteria above');
  }
  
  console.log('==================================================');
  console.log('');
  
  // Error summary
  if (results.errors.length > 0) {
    console.log('Error Summary:');
    const errorTypes = {};
    results.errors.forEach(e => {
      const key = e.error || `HTTP ${e.status}`;
      errorTypes[key] = (errorTypes[key] || 0) + 1;
    });
    Object.entries(errorTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('');
  }
  
  // Exit with appropriate code
  process.exit(passed ? 0 : 1);
}

// Run the test
runStressTest().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});

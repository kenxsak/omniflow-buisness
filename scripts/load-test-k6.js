/**
 * OmniFlow k6 Load Test Script
 * 
 * Installation: brew install k6 (macOS) or apt install k6 (Linux)
 * 
 * Usage:
 *   k6 run scripts/load-test-k6.js
 *   k6 run --vus 100 --duration 5m scripts/load-test-k6.js
 *   k6 run --out json=results.json scripts/load-test-k6.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const leadListTrend = new Trend('lead_list_duration');
const dashboardTrend = new Trend('dashboard_duration');
const campaignTrend = new Trend('campaign_duration');

// Test configuration
export const options = {
  // Simulates 100 concurrent users for 5 minutes
  stages: [
    { duration: '30s', target: 25 },   // Ramp up to 25 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  
  thresholds: {
    // 95% of requests should complete within 2 seconds
    http_req_duration: ['p(95)<2000'],
    // Less than 1% error rate
    errors: ['rate<0.01'],
    // Specific endpoint thresholds
    lead_list_duration: ['p(95)<1500'],
    dashboard_duration: ['p(95)<2000'],
    campaign_duration: ['p(95)<1500'],
  },
};

// Configuration - update with your actual URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Simulated user behavior
export default function () {
  
  group('Health Check', () => {
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
      'health check is healthy': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy';
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);
  });
  
  sleep(1);
  
  group('Homepage Load', () => {
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
      'homepage status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
      'homepage loads quickly': (r) => r.timings.duration < 3000,
    }) || errorRate.add(1);
  });
  
  sleep(1);
  
  group('Lead List Page', () => {
    const startTime = Date.now();
    const leadsRes = http.get(`${BASE_URL}/crm/leads`, {
      headers: { 'Accept': 'text/html,application/json' },
    });
    const duration = Date.now() - startTime;
    leadListTrend.add(duration);
    
    check(leadsRes, {
      'leads page status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
      'leads page loads within threshold': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);
  });
  
  sleep(2);
  
  group('Dashboard Page', () => {
    const startTime = Date.now();
    const dashRes = http.get(`${BASE_URL}/dashboard`, {
      headers: { 'Accept': 'text/html,application/json' },
    });
    const duration = Date.now() - startTime;
    dashboardTrend.add(duration);
    
    check(dashRes, {
      'dashboard status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
      'dashboard loads within threshold': (r) => r.timings.duration < 2500,
    }) || errorRate.add(1);
  });
  
  sleep(2);
  
  group('Campaigns Page', () => {
    const startTime = Date.now();
    const campaignRes = http.get(`${BASE_URL}/campaigns`, {
      headers: { 'Accept': 'text/html,application/json' },
    });
    const duration = Date.now() - startTime;
    campaignTrend.add(duration);
    
    check(campaignRes, {
      'campaigns page status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
      'campaigns page loads within threshold': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);
  });
  
  sleep(2);
  
  group('Settings Page', () => {
    const settingsRes = http.get(`${BASE_URL}/settings`, {
      headers: { 'Accept': 'text/html,application/json' },
    });
    
    check(settingsRes, {
      'settings page status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
    }) || errorRate.add(1);
  });
  
  sleep(2);
  
  group('Tasks Page', () => {
    const tasksRes = http.get(`${BASE_URL}/crm/tasks`, {
      headers: { 'Accept': 'text/html,application/json' },
    });
    
    check(tasksRes, {
      'tasks page status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
    }) || errorRate.add(1);
  });
  
  // Random delay between 1-3 seconds before next iteration
  sleep(Math.random() * 2 + 1);
}

// Lifecycle hooks
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log('Ramping up to 100 concurrent users...');
  
  // Verify the application is running
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error('Application health check failed! Is the server running?');
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\nLoad test completed in ${duration.toFixed(1)} seconds`);
}

// Custom summary
export function handleSummary(data) {
  const summary = {
    testDuration: data.metrics.iteration_duration ? 
      `${(data.metrics.iteration_duration.values.avg / 1000).toFixed(2)}s avg iteration` : 'N/A',
    totalRequests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
    errorRate: data.metrics.errors ? 
      `${(data.metrics.errors.values.rate * 100).toFixed(2)}%` : '0%',
    p95ResponseTime: data.metrics.http_req_duration ? 
      `${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms` : 'N/A',
    passed: data.root_group.checks ? 
      (data.root_group.checks.filter(c => c.passes > 0 && c.fails === 0).length / 
       data.root_group.checks.length * 100).toFixed(0) + '%' : 'N/A',
  };
  
  console.log('\n========================================');
  console.log('  LOAD TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Requests:     ${summary.totalRequests}`);
  console.log(`Error Rate:         ${summary.errorRate}`);
  console.log(`P95 Response Time:  ${summary.p95ResponseTime}`);
  console.log(`Test Duration:      ${summary.testDuration}`);
  console.log('========================================\n');
  
  return {
    'stdout': JSON.stringify(summary, null, 2) + '\n',
    'summary.json': JSON.stringify(data, null, 2),
  };
}

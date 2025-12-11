# Stress Testing Guide - 100 Concurrent Users

## Overview

This guide covers stress testing procedures to ensure OmniFlow handles 100 concurrent users without performance degradation.

---

## Quick Start

### Option 1: Built-in JavaScript Test (Public Endpoints)

The built-in stress test focuses on **public endpoints only** (health check, homepage, login, signup, pricing). This verifies the server can handle concurrent connections without authentication complexity.

```bash
# Run with default settings (100 users, 5 minutes)
node scripts/stress-test.js

# Custom configuration
node scripts/stress-test.js --users=100 --duration=300 --base-url=https://your-app.replit.app
```

**What this tests:**
- Server stability under concurrent load
- Health endpoint reliability
- Public page rendering
- Memory usage and leak detection
- Connection handling

**What this does NOT test:**
- Authenticated user journeys (CRM, campaigns, etc.)
- Database query performance under load
- API rate limiting effectiveness

For authenticated testing, use the k6 approach below or manual testing procedures.

### Option 2: k6 Load Testing (Recommended for Production)

```bash
# Install k6
# macOS: brew install k6
# Linux: sudo apt install k6
# Windows: choco install k6

# Run the test
k6 run scripts/load-test-k6.js
```

---

## Pass/Fail Criteria

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Success Rate | > 99% | < 95% |
| P95 Response Time | < 2000ms | > 5000ms |
| P99 Response Time | < 5000ms | > 10000ms |
| HTTP 5xx Errors | 0 | > 1% |
| Timeouts | < 0.1% | > 1% |

---

## Test Scenarios

### Scenario 1: Sustained Load (100 users, 5 minutes) - Public Endpoints

**Purpose**: Verify server stability under typical peak load for public pages

```bash
node scripts/stress-test.js --users=100 --duration=300
```

**Expected Results**:
- All public pages load successfully
- Response times remain stable
- No memory leaks or CPU spikes
- Health endpoint always responds

### Scenario 1B: Authenticated Load Testing (Manual)

**Purpose**: Verify authenticated endpoints under load

**Steps:**
1. Create multiple test accounts with different roles
2. Open multiple browser windows/tabs with different users
3. Perform concurrent operations:
   - Multiple users viewing lead list simultaneously
   - Multiple users editing different leads
   - Multiple users running campaigns
4. Monitor Firebase Console for throttling
5. Check response times in browser DevTools

**Alternative - k6 with Authentication:**
```javascript
// Add to load-test-k6.js
const AUTH_TOKEN = 'your-firebase-token-here';

// In request headers:
headers: {
  'Cookie': `firebase-auth-token=${AUTH_TOKEN}`,
  'Authorization': `Bearer ${AUTH_TOKEN}`
}
```

### Scenario 2: Ramp Up Test

**Purpose**: Find breaking point

```bash
# Start with 25 users
node scripts/stress-test.js --users=25 --duration=60

# Increase to 50 users
node scripts/stress-test.js --users=50 --duration=60

# Increase to 100 users
node scripts/stress-test.js --users=100 --duration=60

# Stress test: 150 users
node scripts/stress-test.js --users=150 --duration=60
```

### Scenario 3: Spike Test

**Purpose**: Test sudden traffic spikes

```bash
# Simulate sudden spike
node scripts/stress-test.js --users=200 --duration=120
```

---

## Monitoring During Tests

### Firebase Console

1. Open Firebase Console → Firestore → Usage
2. Monitor:
   - Read/Write operations per second
   - Active connections
   - Throttling errors

### Application Logs

```bash
# Watch application logs during test
# In Replit: Check the console output
# Look for:
# - Error messages
# - Slow query warnings
# - Memory warnings
```

### Browser DevTools

1. Open Network tab
2. Monitor:
   - Failed requests (red)
   - Slow responses (> 2s)
   - CORS errors

---

## Interpreting Results

### Healthy Results Example

```
==================================================
  STRESS TEST RESULTS
==================================================

Summary:
  Total Duration:        300.0 seconds
  Concurrent Users:      100
  Total Requests:        15234
  Requests/Second:       50.78

Success Rate:
  Successful Requests:   15180 (99.65%)
  Failed Requests:       54 (0.35%)

Response Times (ms):
  Minimum:               45ms
  Maximum:               1850ms
  Average:               320ms
  Median (p50):          250ms
  95th Percentile:       890ms
  99th Percentile:       1420ms

==================================================
  PASS/FAIL CRITERIA
==================================================

[PASS] Success Rate > 99%: 99.65%
[PASS] P95 Response Time < 2000ms: 890ms
[PASS] P99 Response Time < 5000ms: 1420ms
[PASS] No HTTP 5xx Errors: 0 errors

==================================================
  OVERALL: PASS - System handles 100 concurrent users
==================================================
```

### Unhealthy Results Example

```
==================================================
  STRESS TEST RESULTS
==================================================

Success Rate:
  Successful Requests:   12450 (82.3%)
  Failed Requests:       2680 (17.7%)

Response Times (ms):
  Average:               4500ms
  95th Percentile:       8900ms
  99th Percentile:       15000ms

==================================================
  PASS/FAIL CRITERIA
==================================================

[FAIL] Success Rate > 99%: 82.3%
[FAIL] P95 Response Time < 2000ms: 8900ms
[FAIL] P99 Response Time < 5000ms: 15000ms
[FAIL] No HTTP 5xx Errors: 245 errors

==================================================
  OVERALL: FAIL - Review failed criteria above
==================================================
```

---

## Troubleshooting Performance Issues

### High Response Times

**Causes**:
- Missing database indexes
- N+1 query patterns
- Large payload sizes
- External API latency

**Fixes**:
1. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
2. Implement pagination for large lists
3. Add caching for frequently accessed data
4. Use batch operations for multiple writes

### High Error Rate

**Causes**:
- Rate limiting triggered
- Database connection limits
- Memory exhaustion
- External service failures

**Fixes**:
1. Review rate limit configuration
2. Optimize database queries
3. Add connection pooling
4. Implement circuit breakers for external services

### Memory Issues

**Causes**:
- Memory leaks
- Large data sets in memory
- Unoptimized caching

**Fixes**:
1. Implement pagination
2. Stream large data instead of loading all at once
3. Review and optimize caching strategy

---

## Pre-Test Checklist

Before running stress tests:

- [ ] Application running and healthy
- [ ] Database indexes deployed
- [ ] Rate limiting configured appropriately
- [ ] Monitoring tools ready
- [ ] Backup taken (for production-like environments)
- [ ] External services available

## Post-Test Checklist

After stress tests:

- [ ] Review all results and metrics
- [ ] Document any issues found
- [ ] Create tickets for performance improvements
- [ ] Reset any test data if needed
- [ ] Update capacity planning if needed

---

## Capacity Planning

Based on stress test results:

| Concurrent Users | Expected Resources | Notes |
|-----------------|-------------------|-------|
| 25 | Starter Replit | Basic usage |
| 50 | Starter Replit | Light traffic |
| 100 | Standard Replit | Normal peak |
| 200+ | Consider scaling | High traffic |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial stress test guide |

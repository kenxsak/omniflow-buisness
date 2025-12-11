# Performance Testing Guide for 50 Concurrent Users

## Overview

This guide covers performance testing procedures to ensure OmniFlow CRM handles 50 concurrent enterprise users without issues.

---

## 1. Test Scenarios

### Scenario 1: Simultaneous Lead Access
**Goal**: Verify lead claiming prevents conflicts

```
Test Steps:
1. Create 50 test user accounts
2. All 50 users open the same lead page simultaneously
3. First user claims the lead
4. Verify other 49 users see "Locked" status
5. Verify claim holder can edit normally
6. After claim expires/releases, next user can claim

Expected Results:
- Only 1 user can claim at a time
- Lock status updates within 5 seconds for all users
- No data corruption or race conditions
```

### Scenario 2: Bulk Lead Assignment
**Goal**: Verify batch operations scale

```
Test Steps:
1. Create 1000 test leads
2. Manager assigns 500 leads using bulk assign
3. Measure time to complete
4. Verify all assignments correct
5. Check audit log entries

Expected Results:
- Bulk assign 500 leads < 5 seconds
- All assignments logged correctly
- No missed or duplicate assignments
```

### Scenario 3: Dashboard Performance
**Goal**: Verify analytics load quickly

```
Test Steps:
1. Create 10,000 leads across 50 reps
2. Load manager dashboard
3. Verify team performance charts render
4. Check lead distribution accuracy

Expected Results:
- Dashboard loads < 2 seconds
- Charts accurate to database
- No browser memory issues
```

### Scenario 4: Concurrent Editing
**Goal**: Verify data integrity

```
Test Steps:
1. 50 users edit 50 different leads simultaneously
2. All save changes at same time
3. Verify all changes persist
4. Check for any data loss

Expected Results:
- All 50 edits saved successfully
- No overwritten data
- Activity timeline shows all changes
```

---

## 2. Load Testing with k6

### Installation
```bash
# macOS
brew install k6

# Linux
sudo apt install k6

# Windows
choco install k6
```

### Sample Test Script
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,              // 50 virtual users
  duration: '5m',       // Run for 5 minutes
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% failure rate
  },
};

const BASE_URL = 'https://your-app-url.replit.app';

export default function () {
  // Test lead list endpoint
  const leadsResponse = http.get(`${BASE_URL}/api/leads`);
  check(leadsResponse, {
    'leads status 200': (r) => r.status === 200,
    'leads response time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test dashboard endpoint
  const dashResponse = http.get(`${BASE_URL}/api/dashboard/stats`);
  check(dashResponse, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard response time OK': (r) => r.timings.duration < 1000,
  });

  sleep(2);
}
```

### Running Tests
```bash
# Basic test
k6 run load-test.js

# With more users
k6 run --vus 100 --duration 10m load-test.js

# Output to file
k6 run --out json=results.json load-test.js
```

---

## 3. Firebase Performance Monitoring

### Firestore Console Metrics
Monitor in Firebase Console > Firestore > Usage:

| Metric | 50 User Target | Alert Threshold |
|--------|---------------|-----------------|
| Reads/second | < 500 | > 1000 |
| Writes/second | < 100 | > 200 |
| Active connections | < 200 | > 500 |
| Document reads/day | < 50K | > 100K |

### Setting Up Alerts
1. Go to Firebase Console > Cloud Monitoring
2. Create alerting policy for Firestore reads/writes
3. Set notification to email/Slack

---

## 4. Browser Performance Testing

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Navigate through app
5. Stop recording
6. Analyze:
   - Scripting time
   - Rendering time
   - Memory usage

### Lighthouse Audit
```bash
# Install
npm install -g lighthouse

# Run audit
lighthouse https://your-app-url.replit.app --output=json --output-path=./lighthouse-report.json
```

Target Scores:
- Performance: > 70
- First Contentful Paint: < 2s
- Time to Interactive: < 4s

---

## 5. Memory Leak Detection

### What to Watch For
- Growing memory usage over time
- Unreleased event listeners
- Accumulating DOM nodes

### Testing Procedure
1. Open app with 50 leads visible
2. Navigate between pages 100 times
3. Check Chrome DevTools > Memory
4. Take heap snapshots
5. Compare snapshot sizes

### Expected Results
- Memory stable after initial load
- No continuous growth
- Heap size < 100MB after navigation

---

## 6. Database Query Optimization

### Required Firestore Indexes
Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "leads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "assignedTo", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "leads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "claimedBy", "order": "ASCENDING" },
        { "fieldPath": "claimExpiry", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "entityType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

---

## 7. Stress Test Checklist

### Before Testing
- [ ] Backup production data
- [ ] Create isolated test environment
- [ ] Set up monitoring dashboards
- [ ] Prepare 50 test accounts
- [ ] Generate test data (leads, tasks, etc.)

### During Testing
- [ ] Monitor Firebase Console
- [ ] Watch server logs for errors
- [ ] Track response times
- [ ] Note any UI glitches

### After Testing
- [ ] Analyze test results
- [ ] Document any issues found
- [ ] Create performance improvement tickets
- [ ] Update capacity planning

---

## 8. Capacity Planning

### Current Limits
| Resource | Limit | Notes |
|----------|-------|-------|
| Users per company | 50 | Enterprise plan |
| Leads per company | Unlimited | Indexes optimized |
| Concurrent edits | 1 per lead | Via claiming |
| API rate | 1000/min | Per company |

### Scaling Recommendations
For 100+ users:
1. Enable Firestore caching
2. Implement pagination everywhere
3. Add Redis for session data
4. Consider read replicas

---

## 9. Performance Benchmarks

### Target Response Times
| Operation | Target | Critical |
|-----------|--------|----------|
| Page load | < 2s | > 5s |
| Lead list (50) | < 500ms | > 2s |
| Lead claim | < 200ms | > 1s |
| Bulk assign (100) | < 2s | > 5s |
| Dashboard stats | < 1s | > 3s |
| Audit log query | < 500ms | > 2s |

### Acceptable Error Rates
- HTTP 5xx errors: < 0.1%
- Timeout errors: < 0.5%
- Failed operations: < 1%

---

## 10. Continuous Monitoring

### Set Up Alerts For
1. Response time > 2s (warning)
2. Response time > 5s (critical)
3. Error rate > 1%
4. Firebase quota approaching limit
5. Memory usage > 80%

### Weekly Review
- Check Firebase usage trends
- Review error logs
- Analyze slow queries
- Update performance baselines

---

## Support

For performance issues with Enterprise accounts:
- Priority support queue
- SLA: 4-hour response time
- Dedicated performance reviews quarterly

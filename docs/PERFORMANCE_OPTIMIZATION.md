# OmniFlow Performance Optimization Guide

## Overview

This document outlines the performance optimizations implemented in OmniFlow and provides guidelines for maintaining optimal performance.

---

## Current Optimizations

### 1. Database Optimizations

#### 1.1 Firestore Composite Indexes

All required composite indexes are configured in `firestore.indexes.json`:

| Collection | Index Fields | Purpose |
|------------|--------------|---------|
| activityLog | companyId, timestamp | Activity timeline queries |
| leads | companyId, createdAt | Contact list loading |
| leads | companyId, status, lastContacted | Filtered contact views |
| leads | companyId, pipelineId, createdAt | Pipeline-specific queries |
| contacts | companyId, createdAt | Contact sorting |
| contacts | companyId, status, lastContacted | Status filtering |
| tasks | companyId, dueDate | Task list queries |
| tasks | companyId, status, dueDate | Filtered task views |
| campaigns | companyId, createdAt | Campaign list |
| campaigns | companyId, status, createdAt | Status filtering |
| campaigns | companyId, channel, createdAt | Channel filtering |
| conversations | companyId, contactId, timestamp | Conversation threads |
| automations | companyId, enabled, trigger | Active automation queries |
| appointments | companyId, date, status | Appointment scheduling |
| deals | companyId, status, createdAt | Deal pipeline queries |
| deals | companyId, contactId, createdAt | Contact-specific deals |
| aiUsageRecords | companyId, timestamp | AI usage tracking |
| companyCosts | companyId, date | Cost monitoring |

**Deploy indexes:**
```bash
firebase deploy --only firestore:indexes
```

#### 1.2 Query Optimizations

- **Pagination:** All list queries use cursor-based pagination
- **Limit clauses:** Default limits prevent loading excessive data
- **Selective fields:** Only required fields fetched where possible
- **Batch queries:** Related data fetched in batches, not individually

### 2. Frontend Optimizations

#### 2.1 Dynamic Imports

Heavy components use Next.js dynamic imports to reduce initial bundle:

```typescript
// Example: WhatsApp bulk campaigns
const WhatsAppBulkCampaigns = dynamic(
  () => import('@/components/whatsapp/bulk-campaigns'),
  { ssr: false, loading: () => <LoadingSkeleton /> }
);

// Example: Lead table with XLSX parsing
const LeadTable = dynamic(
  () => import('@/components/crm/lead-table'),
  { ssr: false }
);
```

**Dynamically imported components:**
- WhatsApp bulk campaign management
- Lead/contact tables with import functionality
- XLSX file parsing modules
- Heavy charting components
- Provider-specific actions (lazy loaded)

#### 2.2 Lazy Provider Loading

WhatsApp and SMS provider actions load on-demand:

```typescript
// Provider actions loaded only when needed
const providerActions = {
  meta: () => import('./providers/meta-actions'),
  authkey: () => import('./providers/authkey-actions'),
  aisensy: () => import('./providers/aisensy-actions'),
  wati: () => import('./providers/wati-actions'),
  gupshup: () => import('./providers/gupshup-actions'),
  msg91: () => import('./providers/msg91-actions'),
  fast2sms: () => import('./providers/fast2sms-actions'),
};
```

#### 2.3 Image Optimization

- All images uploaded to external CDN (ImgBB)
- Next.js Image component used for optimization
- Lazy loading for images below the fold
- WebP format preferred where supported

### 3. Caching Strategy

#### 3.1 Static Assets

```typescript
// next.config.js cache headers
headers: [
  {
    source: '/_next/static/:path*',
    headers: [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
    ]
  }
]
```

#### 3.2 API Response Caching

- Static data (plans, features) cached for 1 hour
- User-specific data not cached (real-time accuracy)
- Service worker prevents caching of private routes

#### 3.3 Service Worker Configuration

```javascript
// sw.js - Prevents caching of private routes
const PRIVATE_ROUTES = [
  '/dashboard',
  '/crm',
  '/settings',
  '/api/'
];

// Only cache public static assets
```

### 4. Bundle Size Optimization

#### 4.1 Current Bundle Analysis

To analyze bundle size:
```bash
npm run build
npm run analyze  # If @next/bundle-analyzer configured
```

**Target metrics:**
- Main bundle: < 200KB gzipped
- First Load JS: < 500KB total
- Largest chunk: < 250KB

#### 4.2 Tree Shaking

- ES modules used throughout
- Named imports for libraries (not default imports)
- Unused code eliminated at build time

```typescript
// Good: Named imports
import { Button, Card } from '@/components/ui';

// Avoid: Full library imports
// import * as Components from '@/components/ui';
```

### 5. Server-Side Optimizations

#### 5.1 React Server Components

- Dashboard pages use Server Components for initial data
- Reduces client-side JavaScript
- Faster initial page load

#### 5.2 Server Actions

- Form submissions use Server Actions
- No API route overhead
- Built-in error handling

### 6. Cost Optimization (Monthly Spend Calculation)

Batch query approach instead of day-by-day iteration:

```typescript
// Efficient: Range query
const q = query(
  costsRef,
  where('companyId', '==', companyId),
  where('date', '>=', startOfMonth),
  where('date', '<=', endOfMonth)
);

// Inefficient (avoided): Day-by-day
// for (let day = 1; day <= 31; day++) { ... }
```

---

## Performance Targets

| Metric | Target | Current Status |
|--------|--------|----------------|
| First Contentful Paint (FCP) | < 1.5s | Optimized |
| Largest Contentful Paint (LCP) | < 2.5s | Optimized |
| Time to Interactive (TTI) | < 3.5s | Optimized |
| Cumulative Layout Shift (CLS) | < 0.1 | Optimized |
| Total Blocking Time (TBT) | < 300ms | Optimized |

---

## Performance Monitoring

### 1. Real User Monitoring

Consider implementing:
- Google Analytics Web Vitals
- Vercel Analytics (if deployed on Vercel)
- Custom performance tracking

### 2. Synthetic Monitoring

Regular testing with:
- Lighthouse CI
- WebPageTest
- Chrome DevTools Performance tab

### 3. Alerting

Set up alerts for:
- Page load time > 5 seconds
- Error rate > 1%
- API response time > 2 seconds

---

## Optimization Checklist for New Features

When adding new features, verify:

- [ ] Heavy components use dynamic imports
- [ ] Database queries have appropriate indexes
- [ ] Images optimized and lazy-loaded
- [ ] No N+1 query patterns
- [ ] Bundle size impact measured
- [ ] Mobile performance tested
- [ ] Loading states implemented

---

## Slow Connection Testing

Test on simulated slow connections:

1. **Chrome DevTools → Network → Throttling**
   - Slow 3G: 400ms latency, 400 Kbps download
   - Fast 3G: 150ms latency, 1.5 Mbps download

2. **Verify:**
   - Loading skeletons display
   - Progressive content loading
   - No timeouts on slow connections
   - Critical content loads first

---

## Database Query Best Practices

### Do:
```typescript
// Use indexes for sorting
const q = query(
  collection(db, 'leads'),
  where('companyId', '==', companyId),
  orderBy('createdAt', 'desc'),
  limit(50)
);

// Paginate large collections
const nextPage = query(q, startAfter(lastDoc));
```

### Don't:
```typescript
// Avoid: Fetching all then sorting in memory
const allLeads = await getDocs(leadsRef);
const sorted = allLeads.docs.sort((a, b) => ...);

// Avoid: Multiple round trips
for (const id of contactIds) {
  await getDoc(doc(db, 'contacts', id));
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 29, 2025 | System | Initial creation |

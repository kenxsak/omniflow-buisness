# Firestore Indexes Verification & Deployment Guide

## Overview

Firestore composite indexes are required for efficient queries. This document covers verification and deployment of all indexes for OmniFlow.

---

## Current Index Configuration

The indexes are defined in `firestore.indexes.json` in the project root.

### Deployed Indexes (22 total)

| Collection | Fields | Purpose |
|------------|--------|---------|
| activityLog | companyId, timestamp | Activity timeline |
| whatsappContacts | listId, createdAt | WhatsApp list management |
| whatsappLists | companyId, createdAt | WhatsApp lists |
| campaignJobs | status, createdAt | Job queue processing |
| campaignJobs | companyId, status, scheduledAt | Scheduled campaigns |
| socialPosts | companyId, createdAt | Social post listing |
| leads | companyId, createdAt | Lead listing |
| leads | companyId, status, lastContacted | Lead filtering |
| leads | companyId, pipelineId, createdAt | Pipeline view |
| contacts | companyId, createdAt | Contact listing |
| contacts | companyId, status, lastContacted | Contact filtering |
| tasks | companyId, dueDate | Task listing |
| tasks | companyId, status, dueDate | Task filtering |
| campaigns | companyId, createdAt | Campaign listing |
| campaigns | companyId, status, createdAt | Campaign filtering |
| campaigns | companyId, channel, createdAt | Channel filtering |
| conversations | companyId, contactId, timestamp | Conversation history |
| conversations | companyId, timestamp | Recent conversations |
| automations | companyId, enabled, trigger | Automation lookup |
| automations | companyId, createdAt | Automation listing |
| appointments | companyId, date, status | Appointment calendar |
| appointments | companyId, contactId, date | Contact appointments |
| activities | companyId, contactId, occurredAt | Contact activity |
| activities | companyId, occurredAt | Recent activity |
| deals | companyId, status, createdAt | Deal listing |
| deals | companyId, contactId, createdAt | Contact deals |
| deals | companyId, expectedCloseDate | Deal pipeline |
| aiUsageRecords | companyId, timestamp | AI usage tracking |
| aiUsageRecords | companyId, operationType, timestamp | AI usage by type |
| companyCosts | companyId, date | Cost tracking |

---

## Verification Steps

### Step 1: Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your OmniFlow project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Verify all indexes show status: **Enabled**

### Step 2: Check for Missing Indexes

When running the app, if you see this error in the console:
```
Error: 9 FAILED_PRECONDITION: The query requires an index.
```

The error message includes a direct link to create the missing index.

### Step 3: Deploy Indexes

```bash
# Option 1: Use the deploy script
chmod +x deploy-firestore-indexes.sh
./deploy-firestore-indexes.sh

# Option 2: Direct Firebase CLI
firebase deploy --only firestore:indexes

# Option 3: If authentication issues
# Export service account key and set environment variable
export GOOGLE_APPLICATION_CREDENTIALS=path/to/firebase-key.json
firebase deploy --only firestore:indexes
```

---

## Index Build Time

| Number of Documents | Expected Build Time |
|--------------------|---------------------|
| < 1,000 | 1-2 minutes |
| 1,000 - 10,000 | 5-10 minutes |
| 10,000 - 100,000 | 15-30 minutes |
| > 100,000 | 30-60+ minutes |

---

## Adding New Indexes

When adding new queries that need indexes:

### 1. Update firestore.indexes.json

```json
{
  "indexes": [
    // ... existing indexes ...
    {
      "collectionGroup": "newCollection",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "newField", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 2. Deploy the new index

```bash
firebase deploy --only firestore:indexes
```

### 3. Wait for index to build

Check Firebase Console → Indexes → verify status is "Enabled"

---

## Index Optimization Tips

### Do:
- Always include `companyId` first for multi-tenant queries
- Create indexes for common filter + sort combinations
- Use `orderBy` fields that match your index order

### Don't:
- Create too many indexes (increases write costs)
- Create indexes for infrequently used queries
- Duplicate indexes with different field orders unless needed

---

## Troubleshooting

### Error: "The query requires an index"

**Solution**: Click the link in the error message, or manually add the index to `firestore.indexes.json` and deploy.

### Error: "Index already exists"

**Solution**: Safe to ignore - the index is already deployed.

### Error: "Permission denied"

**Solution**: Ensure you're authenticated with Firebase CLI:
```bash
firebase login
# or use service account
export GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json
```

### Indexes stuck in "Building" status

**Solution**: 
- Check if you have a large number of documents
- Wait longer (can take up to 60 minutes for large collections)
- If stuck for > 2 hours, contact Firebase support

---

## Index Verification Checklist

Before MVP launch:

- [ ] All 22 indexes show "Enabled" status in Firebase Console
- [ ] No "index required" errors in application logs
- [ ] Query performance is acceptable (< 500ms for list queries)
- [ ] No pending index builds

### Quick Verification Script

```bash
# Run this to check for index-related errors in your app
# Start the app and perform common actions, then check console

# Common actions to test:
# 1. Load lead list page
# 2. Filter leads by status
# 3. Load campaign list
# 4. Filter campaigns by channel
# 5. Load activity timeline
# 6. Load appointments calendar
# 7. Load deals pipeline
# 8. View AI usage history
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial index verification guide |

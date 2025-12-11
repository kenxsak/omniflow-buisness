# OmniFlow Backup & Disaster Recovery Procedures

## Overview

This document outlines the backup and disaster recovery procedures for OmniFlow. Following these guidelines ensures data protection and business continuity.

---

## 1. Firestore Backup Configuration

### 1.1 Automated Daily Backups

Firebase Firestore supports automated backups. Configure in Google Cloud Console:

```bash
# Enable Firestore export to Cloud Storage
gcloud firestore export gs://[BUCKET_NAME]/backups/$(date +%Y-%m-%d) \
  --collection-ids=users,companies,leads,contacts,deals,activities,campaigns,tasks,automations,appointments
```

### 1.2 Setting Up Automated Backups

1. **Create a Cloud Storage Bucket:**
   ```bash
   gsutil mb -l [REGION] gs://omniflow-backups
   ```

2. **Create Cloud Scheduler Job:**
   ```bash
   gcloud scheduler jobs create http firestore-daily-backup \
     --schedule="0 2 * * *" \
     --uri="https://firestore.googleapis.com/v1/projects/[PROJECT_ID]/databases/(default):exportDocuments" \
     --http-method=POST \
     --message-body='{"outputUriPrefix":"gs://omniflow-backups/daily/"}' \
     --oauth-service-account-email=[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com
   ```

3. **Set Retention Policy (keep 30 days):**
   ```bash
   gsutil lifecycle set lifecycle.json gs://omniflow-backups
   ```

   lifecycle.json:
   ```json
   {
     "rule": [{
       "action": {"type": "Delete"},
       "condition": {"age": 30}
     }]
   }
   ```

### 1.3 Critical Collections to Backup

| Collection | Priority | Frequency |
|------------|----------|-----------|
| users | Critical | Daily |
| companies | Critical | Daily |
| leads | Critical | Daily |
| contacts | Critical | Daily |
| deals | Critical | Daily |
| activities | High | Daily |
| campaigns | High | Daily |
| tasks | High | Daily |
| automations | High | Daily |
| appointments | High | Daily |
| companyCosts | Medium | Daily |
| aiUsageRecords | Medium | Weekly |

---

## 2. Disaster Recovery Procedures

### 2.1 Data Loss Scenarios

#### Scenario A: Accidental Data Deletion (Single Document/Collection)

**Recovery Steps:**
1. Identify the affected document/collection
2. Check if data exists in recent backup
3. Restore from Cloud Storage backup:
   ```bash
   gcloud firestore import gs://omniflow-backups/[DATE]/[BACKUP_ID]
   ```

#### Scenario B: Corrupted Data

**Recovery Steps:**
1. Stop all write operations (set maintenance mode)
2. Identify corruption scope
3. Export current state for analysis
4. Restore from last known good backup
5. Replay any lost transactions from logs

#### Scenario C: Complete Database Loss

**Recovery Steps:**
1. Create new Firestore database instance
2. Restore from most recent backup:
   ```bash
   gcloud firestore import gs://omniflow-backups/daily/[LATEST_BACKUP]
   ```
3. Verify data integrity
4. Update application configuration if needed
5. Resume operations

### 2.2 Recovery Time Objectives (RTO)

| Scenario | Target RTO | Maximum Data Loss |
|----------|------------|-------------------|
| Single document | 15 minutes | 0 (if in backup) |
| Single collection | 30 minutes | Up to 24 hours |
| Full database | 2 hours | Up to 24 hours |

---

## 3. Backup Verification

### 3.1 Weekly Verification Job

Run weekly to ensure backups are valid:

```bash
#!/bin/bash
# backup-verify.sh

# 1. Create test project
gcloud firestore databases create --database=backup-test --location=[REGION]

# 2. Import latest backup
gcloud firestore import gs://omniflow-backups/daily/$(date -d "yesterday" +%Y-%m-%d) \
  --database=backup-test

# 3. Run verification queries
node scripts/verify-backup.js --database=backup-test

# 4. Cleanup test database
gcloud firestore databases delete backup-test
```

### 3.2 Verification Checklist

- [ ] Backup file exists and is not empty
- [ ] All critical collections present
- [ ] Document counts match expected range
- [ ] Random document sampling validates data integrity
- [ ] Indexes can be recreated

---

## 4. Firebase Authentication Backup

User authentication data is managed by Firebase Auth. To backup:

### 4.1 Export Users

```bash
firebase auth:export users.json --format=json --project [PROJECT_ID]
```

### 4.2 Import Users (Recovery)

```bash
firebase auth:import users.json --project [PROJECT_ID]
```

---

## 5. Environment & Configuration Backup

### 5.1 Critical Configuration Files

| File | Location | Backup Method |
|------|----------|---------------|
| firestore.rules | /firestore.rules | Git repository |
| firestore.indexes.json | /firestore.indexes.json | Git repository |
| Environment variables | Replit Secrets | Document separately |
| Firebase config | /src/lib/firebase.ts | Git repository |

### 5.2 Secrets Documentation

Keep an encrypted backup of all API keys and secrets:
- Firebase service account key
- Stripe API keys
- Razorpay API keys
- Twilio credentials
- Email service API keys (Brevo, Sender.net)
- WhatsApp provider credentials

**Storage:** Use a secure password manager or encrypted vault.

---

## 6. Monitoring & Alerts

### 6.1 Backup Monitoring

Set up alerts in Google Cloud Monitoring:

1. **Backup Job Failure Alert:**
   - Trigger: Cloud Scheduler job fails
   - Action: Email/SMS to admin

2. **Storage Quota Alert:**
   - Trigger: Backup bucket > 80% capacity
   - Action: Email warning

3. **Missing Backup Alert:**
   - Trigger: No new backup in 48 hours
   - Action: Urgent notification

### 6.2 Health Check Endpoints

```typescript
// /api/health/backup
GET /api/health/backup
Response: {
  "lastBackup": "2025-11-28T02:00:00Z",
  "status": "healthy",
  "backupAge": "12 hours"
}
```

---

## 7. Emergency Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Primary Admin | [Your contact] | First responder |
| Firebase Support | Firebase Console | Database issues |
| Google Cloud Support | GCP Console | Infrastructure |

---

## 8. Recovery Runbook

### Step-by-Step Recovery Process

1. **Assess the Situation**
   - What data is affected?
   - When did the issue occur?
   - What's the impact scope?

2. **Enable Maintenance Mode**
   - Set `MAINTENANCE_MODE=true` in environment
   - Display maintenance page to users

3. **Locate Backup**
   - List available backups:
     ```bash
     gsutil ls gs://omniflow-backups/daily/
     ```
   - Select appropriate backup (pre-incident)

4. **Perform Recovery**
   - For partial recovery: Import specific collections
   - For full recovery: Import entire backup

5. **Verify Recovery**
   - Run data integrity checks
   - Test critical user flows
   - Check for data consistency

6. **Resume Operations**
   - Disable maintenance mode
   - Monitor for issues
   - Notify affected users if needed

7. **Post-Incident Review**
   - Document what happened
   - Update procedures if needed
   - Implement preventive measures

---

## 9. Testing Schedule

| Test Type | Frequency | Last Tested |
|-----------|-----------|-------------|
| Backup verification | Weekly | - |
| Partial restore test | Monthly | - |
| Full disaster recovery drill | Quarterly | - |
| Documentation review | Quarterly | - |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 29, 2025 | System | Initial creation |

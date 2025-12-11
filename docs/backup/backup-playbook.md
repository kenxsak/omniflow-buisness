# OmniFlow Backup & Disaster Recovery Playbook

## Overview
This document outlines the backup strategy and disaster recovery procedures for OmniFlow.

## Backup Strategy

### Firestore Database Backups

#### Automated Daily Backups
Firebase Firestore supports automated backups via Cloud Scheduler and Cloud Functions.

**Setup Steps:**
1. Enable Firestore export in Google Cloud Console
2. Create a Cloud Storage bucket for backups: `gs://omniflow-backups`
3. Set up Cloud Scheduler to trigger daily exports

**Backup Schedule:**
- Daily: Full export at 2:00 AM UTC
- Weekly: Archived to cold storage on Sundays
- Monthly: Long-term retention (12 months)

#### Manual Backup Command
```bash
# Export entire Firestore to Cloud Storage
gcloud firestore export gs://omniflow-backups/$(date +%Y%m%d)

# Export specific collections
gcloud firestore export gs://omniflow-backups/$(date +%Y%m%d) \
  --collection-ids=companies,leads,contacts,campaigns,deals,activities
```

### Backup Retention Policy
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months
- Annual backups: Indefinite

### Critical Collections to Backup
1. `companies` - Company profiles and settings
2. `users` - User accounts and preferences
3. `leads` / `contacts` - Customer data
4. `campaigns` - Campaign history
5. `deals` - Deal/opportunity data
6. `activities` - Activity timeline
7. `automations` - Automation configurations
8. `apiConfigurations` - API keys (encrypted)

## Disaster Recovery Procedures

### Scenario 1: Accidental Data Deletion

**Recovery Steps:**
1. Identify the affected collection and time of deletion
2. Locate the most recent backup before the incident
3. Restore using:
```bash
gcloud firestore import gs://omniflow-backups/[BACKUP_DATE]/[BACKUP_ID]
```
4. Verify data integrity
5. Document the incident

### Scenario 2: Database Corruption

**Recovery Steps:**
1. Stop all write operations (enable maintenance mode)
2. Assess the scope of corruption
3. Choose recovery point (latest clean backup)
4. Create a new Firestore database
5. Import from backup
6. Update connection strings
7. Resume operations
8. Document and analyze root cause

### Scenario 3: Complete System Failure

**Recovery Steps:**
1. Activate incident response team
2. Communicate outage to users
3. Deploy to backup region if available
4. Restore from latest backup
5. Verify all integrations
6. Resume operations
7. Conduct post-mortem

## Backup Verification

### Weekly Verification Process
1. Select random backup from the week
2. Restore to test environment
3. Run validation queries
4. Verify document counts match expected
5. Log verification results

### Validation Script
```bash
#!/bin/bash
# Run weekly backup verification
BACKUP_DATE=$(date -d "3 days ago" +%Y%m%d)
TEST_PROJECT="omniflow-backup-test"

# Restore to test project
gcloud firestore import gs://omniflow-backups/$BACKUP_DATE \
  --project=$TEST_PROJECT

# Run validation
node scripts/validate-backup.js --project=$TEST_PROJECT

# Clean up test project
# (automated cleanup after 24 hours)
```

## Monitoring & Alerts

### Backup Monitoring
- Alert if daily backup fails
- Alert if backup size drops significantly (>20%)
- Alert if backup duration exceeds 2 hours
- Weekly backup verification report

### Health Checks
- Daily: Backup job completion check
- Weekly: Restore test to staging
- Monthly: Full disaster recovery drill

## Contact Information

### Escalation Path
1. On-call Engineer: Check PagerDuty
2. Engineering Lead: Immediate notification for P1
3. CTO: Notification for extended outages (>1 hour)

## Revision History
- v1.0 (2025-11-28): Initial playbook created

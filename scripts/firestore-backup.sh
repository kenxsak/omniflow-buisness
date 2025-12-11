#!/bin/bash

# OmniFlow Firestore Backup Script
# Run daily via Cloud Scheduler or cron

set -e

# Configuration
PROJECT_ID="${FIREBASE_PROJECT_ID:-omniflow-prod}"
BACKUP_BUCKET="${BACKUP_BUCKET:-gs://omniflow-backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_BUCKET}/${DATE}"

# Collections to backup (empty for all)
COLLECTIONS="companies users leads contacts campaigns deals activities automations apiConfigurations companyCosts aiUsageRecords"

echo "Starting Firestore backup..."
echo "Project: $PROJECT_ID"
echo "Destination: $BACKUP_PATH"
echo "Date: $DATE"

# Perform backup
if [ -n "$COLLECTIONS" ]; then
    echo "Backing up specific collections: $COLLECTIONS"
    gcloud firestore export "$BACKUP_PATH" \
        --project="$PROJECT_ID" \
        --collection-ids=$(echo $COLLECTIONS | tr ' ' ',')
else
    echo "Backing up all collections"
    gcloud firestore export "$BACKUP_PATH" \
        --project="$PROJECT_ID"
fi

echo "Backup completed successfully!"

# Cleanup old backups (keep last 30 days)
echo "Cleaning up backups older than 30 days..."
CUTOFF_DATE=$(date -d "30 days ago" +%Y%m%d)
gsutil ls "$BACKUP_BUCKET" | while read backup; do
    BACKUP_DATE=$(basename "$backup" | cut -d'_' -f1)
    if [[ "$BACKUP_DATE" < "$CUTOFF_DATE" ]]; then
        echo "Removing old backup: $backup"
        gsutil -m rm -r "$backup"
    fi
done

echo "Backup and cleanup completed!"

# Send notification (optional)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"Firestore backup completed: $BACKUP_PATH\"}" \
        "$SLACK_WEBHOOK_URL"
fi

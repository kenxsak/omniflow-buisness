# Firebase Budget Alerts & Cost Control Setup

## Overview

This guide covers setting up budget alerts, cost monitoring, and spending limits for OmniFlow's Firebase infrastructure.

---

## 1. Firebase Console Budget Alerts

### Step 1: Access Billing Settings

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your OmniFlow project
3. Click the gear icon (Settings) → **Usage and billing**
4. Navigate to **Details & settings**

### Step 2: Set Up Budget Alerts

1. Click **Modify budget alert** or **Create budget**
2. Configure alerts at these recommended thresholds:

| Alert Level | Threshold | Action |
|-------------|-----------|--------|
| Warning | 50% of budget | Email notification |
| Caution | 80% of budget | Email + Slack notification |
| Critical | 100% of budget | Email + SMS + Consider auto-pause |

### Step 3: Configure Notification Channels

```
Recommended notification setup:
- Email: primary admin email
- Slack: #ops-alerts channel (if available)
- SMS: for critical (100%) alerts only
```

---

## 2. Google Cloud Budget Setup (Advanced)

Firebase projects are linked to Google Cloud. For more granular control:

### Create Budget in GCP Console

```bash
# Using gcloud CLI
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="OmniFlow Monthly Budget" \
  --budget-amount=500USD \
  --threshold-rules=percent=0.5 \
  --threshold-rules=percent=0.8 \
  --threshold-rules=percent=1.0 \
  --all-updates-rule-pubsub-topic=projects/YOUR_PROJECT/topics/budget-alerts
```

### Recommended Monthly Budget Tiers

| Business Size | Monthly Budget | Alert at 50% | Alert at 80% |
|--------------|----------------|--------------|--------------|
| Starter (1-10 users) | $50 | $25 | $40 |
| Growth (11-50 users) | $200 | $100 | $160 |
| Scale (51-200 users) | $500 | $250 | $400 |
| Enterprise (200+) | $1000+ | $500 | $800 |

---

## 3. Firestore Cost Monitoring

### Key Metrics to Track

| Metric | Where to Find | Alert Threshold |
|--------|---------------|-----------------|
| Document reads | Firebase Console → Usage | > 50,000/day |
| Document writes | Firebase Console → Usage | > 10,000/day |
| Document deletes | Firebase Console → Usage | > 5,000/day |
| Storage used | Firebase Console → Usage | > 1 GB |
| Network egress | GCP Console | > 10 GB/month |

### Daily Cost Estimation

```
Firestore Pricing (as of 2024):
- Reads: $0.06 per 100,000
- Writes: $0.18 per 100,000
- Deletes: $0.02 per 100,000
- Storage: $0.18 per GB/month

Example Daily Usage (50 active users):
- 50,000 reads × $0.06/100K = $0.03
- 5,000 writes × $0.18/100K = $0.009
- Storage 500MB = $0.09/month ≈ $0.003/day
- Total: ~$0.04/day or ~$1.20/month
```

---

## 4. API Cost Limits Configuration

### Rate Limiting Configuration

OmniFlow includes rate limiting. Configure limits in your environment:

```bash
# Recommended rate limits (requests per minute per user)
RATE_LIMIT_AI_REQUESTS=20
RATE_LIMIT_EMAIL_SENDS=500
RATE_LIMIT_SMS_SENDS=100
RATE_LIMIT_WHATSAPP_SENDS=100
RATE_LIMIT_API_CALLS=1000
```

### Per-Company Spending Limits

Configure in Firestore for each company:

```javascript
// companies/{companyId} document
{
  "monthlyBudget": 100,           // USD
  "dailyLimit": 5,                // USD (auto-calculated or manual)
  "alertThreshold": 0.8,          // Alert at 80% spent
  "blockThreshold": 1.0,          // Block at 100%
  "currentMonthSpent": 0,         // Track spending
  "lastResetDate": "2024-12-01"   // Monthly reset
}
```

---

## 5. AI Credits Cost Control

### AI Usage Tracking

OmniFlow tracks AI usage per company. Review settings:

| AI Operation | Credit Cost | Monthly Limit (Starter) | Monthly Limit (Pro) |
|--------------|-------------|------------------------|---------------------|
| Content Generation | 1 | 100 | 500 |
| Image Generation | 5 | 20 | 100 |
| Strategy Analysis | 3 | 50 | 250 |
| Email Templates | 1 | 100 | 500 |

### BYOK (Bring Your Own Key) Override

Companies with their own API keys bypass credit limits:

```javascript
// Check in company settings
{
  "byokEnabled": true,
  "geminiApiKey": "encrypted_key_here",  // User's own key
  "unlimitedAI": true                     // Bypass credit limits
}
```

---

## 6. Third-Party API Cost Alerts

### Email Service Costs (Brevo/Sender.net)

| Service | Free Tier | Cost per 1000 | Monthly Alert |
|---------|-----------|---------------|---------------|
| Brevo | 300/day | $0.09 | > $50 |
| Sender.net | 15,000/month | $0.08 | > $50 |

### SMS Costs (MSG91/Fast2SMS/Twilio)

| Service | Region | Cost per SMS | Monthly Alert |
|---------|--------|--------------|---------------|
| MSG91 | India | ₹0.20-0.30 | > ₹5,000 |
| Fast2SMS | India | ₹0.15-0.25 | > ₹5,000 |
| Twilio | Global | $0.0075 | > $100 |

### WhatsApp Costs

| Service | Cost per Message | Monthly Alert |
|---------|-----------------|---------------|
| AiSensy | ₹0.25-0.50 | > ₹5,000 |
| Gupshup | ₹0.25-0.50 | > ₹5,000 |
| Meta Direct | $0.005-0.08 | > $100 |

---

## 7. Monitoring Dashboard Setup

### Health Check Endpoint

OmniFlow includes a health check endpoint:

```bash
# Check system health
curl https://your-app.replit.app/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-12-01T10:00:00Z",
  "services": {
    "firebase": "connected",
    "ai": "available"
  }
}
```

### Daily Cost Report Script

```bash
#!/bin/bash
# scripts/daily-cost-report.sh

# Get Firebase usage via GCP
gcloud firestore operations list --project=YOUR_PROJECT_ID

# Generate cost summary
echo "=== Daily Cost Report ==="
echo "Date: $(date +%Y-%m-%d)"
echo "Firebase reads: [check console]"
echo "Firebase writes: [check console]"
echo "Estimated cost: [calculate]"
```

---

## 8. Alert Response Procedures

### When 50% Budget Alert Triggers

1. **Review Usage** - Check Firebase Console for unexpected spikes
2. **Identify Cause** - Look for unusual API patterns
3. **Monitor** - Increase monitoring frequency
4. **Document** - Note the cause for future reference

### When 80% Budget Alert Triggers

1. **Immediate Review** - Check all active campaigns
2. **Pause Non-Critical** - Consider pausing bulk operations
3. **Notify Stakeholders** - Alert relevant team members
4. **Plan Response** - Prepare to increase budget or reduce usage

### When 100% Budget Alert Triggers

1. **Emergency Response** - Immediately investigate
2. **Consider Pause** - Enable maintenance mode if needed
3. **Root Cause** - Identify what caused overage
4. **Remediate** - Either increase budget or fix the issue
5. **Post-Mortem** - Document and prevent recurrence

---

## 9. Cost Optimization Tips

### Firestore Optimization

```javascript
// Use batch operations (cheaper)
const batch = writeBatch(db);
leads.forEach(lead => batch.set(doc(...), lead));
await batch.commit();  // 1 write operation vs many

// Use select() to fetch only needed fields
const query = collection(db, 'leads')
  .where('companyId', '==', companyId)
  .select('name', 'email', 'status');  // Reduces read size

// Implement pagination
const query = collection(db, 'leads')
  .where('companyId', '==', companyId)
  .orderBy('createdAt', 'desc')
  .limit(50);  // Don't fetch all at once
```

### Caching Strategy

```javascript
// Cache frequently accessed data
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

async function getCachedCompany(companyId) {
  const cached = cache.get(companyId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;  // No Firestore read
  }
  const data = await getDoc(doc(db, 'companies', companyId));
  cache.set(companyId, { data: data.data(), time: Date.now() });
  return data.data();
}
```

---

## 10. Monthly Cost Review Checklist

- [ ] Review Firebase usage dashboard
- [ ] Check all third-party API usage
- [ ] Compare actual vs. budgeted costs
- [ ] Identify cost optimization opportunities
- [ ] Update budget alerts if needed
- [ ] Review and optimize expensive queries
- [ ] Check for unused resources to clean up

---

## Quick Reference

### Firebase Console Links

- Usage Dashboard: `console.firebase.google.com/project/YOUR_PROJECT/usage`
- Billing: `console.firebase.google.com/project/YOUR_PROJECT/settings/billing`
- Firestore: `console.firebase.google.com/project/YOUR_PROJECT/firestore`

### Support Contacts

| Issue | Contact |
|-------|---------|
| Firebase Billing | Firebase Support (console) |
| Unexpected Charges | GCP Billing Support |
| Cost Optimization | Review this document |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial cost control guide |

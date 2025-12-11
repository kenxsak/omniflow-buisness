# Email Automation Scheduling Setup Guide

This guide provides comprehensive instructions for setting up automated scheduling for your email marketing automations. Choose the option that best fits your hosting environment.

## Quick Overview

Your email automation system is fully built and ready to use. It just needs a scheduler to trigger it periodically. The system:

- ✅ Processes pending automation steps for all companies
- ✅ Respects daily and hourly email quotas based on subscription plans
- ✅ Includes circuit breaker protection to prevent email provider bans
- ✅ Tracks and logs all automation activity
- ✅ Secured with CRON_SECRET authentication

**What you need:** A service that calls your automation endpoint every 5-10 minutes.

---

## Option 1: Google Cloud Scheduler (Recommended for Firebase Hosting)

If you're hosting on Firebase/Google Cloud, this is the **best option** as it integrates seamlessly and is highly reliable.

### Prerequisites
- Google Cloud Project (same one used for Firebase)
- `gcloud` CLI installed (or use Cloud Console)
- CRON_SECRET environment variable configured

### Step 1: Enable Cloud Scheduler API

```bash
gcloud services enable cloudscheduler.googleapis.com
```

Or via [Google Cloud Console](https://console.cloud.google.com/apis/library/cloudscheduler.googleapis.com)

### Step 2: Create the Scheduled Job

Replace `YOUR_APP_URL` and `YOUR_CRON_SECRET` with your actual values:

```bash
gcloud scheduler jobs create http run-email-automations \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="https://YOUR_APP_URL.web.app/api/run-automations" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --description="Run email marketing automations every 5 minutes"
```

**Schedule Explanation:**
- `*/5 * * * *` = Every 5 minutes
- `*/10 * * * *` = Every 10 minutes
- `0 * * * *` = Every hour (at minute 0)

### Step 3: Verify the Job

```bash
# List all scheduled jobs
gcloud scheduler jobs list --location=us-central1

# View job details
gcloud scheduler jobs describe run-email-automations --location=us-central1

# Manually trigger for testing
gcloud scheduler jobs run run-email-automations --location=us-central1
```

### Step 4: Monitor Execution

View logs in [Cloud Console](https://console.cloud.google.com/cloudscheduler):
1. Go to Cloud Scheduler
2. Click on your job
3. View "Execution History"

### Pricing
- **First 3 jobs per month:** FREE
- **Additional jobs:** $0.10 per job per month
- **Total cost for 1 job:** FREE

---

## Option 2: External Cron Service (Easy & Free)

Perfect for any hosting environment. These services are reliable and offer free tiers.

### Option 2A: Cron-job.org (Recommended)

**Free Tier:** Up to 50 cron jobs, 1-minute intervals

#### Setup Steps:

1. **Sign up** at [cron-job.org](https://cron-job.org)

2. **Create a new cron job:**
   - Title: `OmniFlow Email Automations`
   - URL: `https://your-app-domain.com/api/run-automations`
   - Schedule: Every 5 minutes
   
3. **Add Authentication Header:**
   - Click "Extended" settings
   - Under "Request Headers", add:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```

4. **Configure Additional Settings:**
   - HTTP Method: GET
   - Timeout: 30 seconds
   - Retry on failure: Enabled
   - Email notifications: Optional (recommended for errors)

5. **Save and Enable** the job

6. **Test immediately** using the "Execute now" button

#### Monitoring:
- View execution history in the dashboard
- Enable email alerts for failures
- Check response codes (should be 200 OK)

---

### Option 2B: EasyCron

**Free Tier:** Up to 50 tasks, 1-minute intervals

#### Setup Steps:

1. **Sign up** at [easycron.com](https://www.easycron.com)

2. **Create New Cron Job:**
   - Cron Expression: `*/5 * * * *` (every 5 minutes)
   - URL to call: `https://your-app-domain.com/api/run-automations`
   
3. **Add Custom HTTP Header:**
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_CRON_SECRET`

4. **Additional Settings:**
   - Method: GET
   - Timeout: 30 seconds
   - Email on failure: Yes (recommended)

5. **Save and Enable**

---

### Option 2C: UptimeRobot (Creative Solution)

UptimeRobot is primarily a monitoring service, but can be used for basic cron jobs.

**Free Tier:** Up to 50 monitors, 5-minute intervals

#### Setup Steps:

1. **Sign up** at [uptimerobot.com](https://uptimerobot.com)

2. **Create HTTP(s) Monitor:**
   - Monitor Type: HTTP(s)
   - Friendly Name: `Email Automations`
   - URL: `https://your-app-domain.com/api/run-automations`
   - Monitoring Interval: 5 minutes

3. **Add Custom HTTP Header:**
   - Under "Advanced Settings"
   - Custom HTTP Headers:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```

4. **Configure Alerts:**
   - Alert when: Down
   - Alert via: Email

**Note:** UptimeRobot has a minimum 5-minute interval on free tier.

---

## Option 3: Vercel Cron (If Using Vercel)

If you're deploying to Vercel instead of Firebase:

### Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/run-automations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Update API Route:

The endpoint needs to check for Vercel's cron authentication:

```typescript
// src/app/api/run-automations/route.ts
import { NextResponse } from 'next/server';
import { runAllAutomations } from '@/lib/automation-runner';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Check Vercel Cron Secret
  const authHeader = request.headers.get('Authorization');
  const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
  
  if (vercelCronSecret !== process.env.CRON_SECRET && 
      authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAllAutomations();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error running automations:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

Deploy to Vercel, and cron jobs will run automatically.

**Pricing:** FREE on all Vercel plans

---

## Testing Your Setup

### 1. Manual Testing via Admin Dashboard

1. Navigate to: `/settings/automation-testing`
2. Enter your CRON_SECRET
3. Click "Run Automations Now"
4. Review the results

### 2. API Testing with cURL

```bash
curl -X GET "https://your-app-domain.com/api/run-automations" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Automation run completed. Processed X steps...",
  "details": [...]
}
```

### 3. Connection Test

```bash
curl -X GET "https://your-app-domain.com/api/run-automations/test"
```

Expected response:
```json
{
  "success": true,
  "message": "Automation endpoint is healthy and ready",
  "checks": {
    "database": true,
    "endpoint": true
  }
}
```

---

## Monitoring & Troubleshooting

### Check Automation Logs

Your automation system logs detailed information:

```typescript
// Check Firestore for quota tracking
// companies/{companyId} -> quotaTracking field

{
  emailsSentToday: 45,
  emailsSentThisHour: 5,
  consecutiveFailures: 0,
  lastEmailSentAt: "2024-01-15T10:30:00Z",
  lastDailyReset: "2024-01-15T00:00:00Z",
  lastHourlyReset: "2024-01-15T10:00:00Z"
}
```

### Common Issues

**1. 401 Unauthorized Error**
- **Cause:** CRON_SECRET mismatch
- **Fix:** Verify the secret in your environment variables matches what you're sending

**2. No Emails Being Sent**
- **Check:** Company has active status
- **Check:** Company has Brevo API key configured
- **Check:** Automation states exist in Firestore
- **Check:** Quota limits haven't been exceeded

**3. Circuit Breaker Triggered**
- **Cause:** Too many consecutive failures (default: 5)
- **Fix:** Wait 30 minutes for automatic reset, or fix the underlying issue
- **Check:** Brevo API key validity and email template configuration

**4. Database Not Initialized**
- **Cause:** Firebase configuration issue
- **Fix:** Verify Firebase credentials and connection

### Enable Debug Logging

The automation runner logs detailed information. Check your hosting platform's logs:

**Firebase Hosting + Functions:**
```bash
firebase functions:log --only run-automations
```

**Vercel:**
View logs in Vercel dashboard under "Functions"

---

## Recommended Schedule

**For most use cases:** Every 5-10 minutes

- **Every 5 minutes:** Best for real-time responsiveness
- **Every 10 minutes:** Good balance of responsiveness and resource usage
- **Every 15 minutes:** Minimal resource usage, acceptable delay

### Why Not More Frequent?

- Email automations typically have delays (hours/days between steps)
- Checking every 1-2 minutes provides minimal benefit
- Reduces server load and potential costs

---

## Security Best Practices

1. **Keep CRON_SECRET secure:**
   - Use a strong, random string (32+ characters)
   - Never commit to version control
   - Store in environment variables only

2. **Rotate secrets periodically:**
   - Update CRON_SECRET every 3-6 months
   - Update in both your app config AND cron service

3. **Monitor for unauthorized access:**
   - Review cron job logs regularly
   - Alert on repeated 401 errors

4. **Use HTTPS only:**
   - Never use http:// for your endpoint
   - Verify SSL certificate is valid

---

## Cost Comparison

| Service | Free Tier | Paid Tier | Best For |
|---------|-----------|-----------|----------|
| **Google Cloud Scheduler** | First 3 jobs free | $0.10/job/month | Firebase hosting |
| **Cron-job.org** | 50 jobs, 1-min intervals | From $4.99/month | Any hosting |
| **EasyCron** | 50 tasks, 1-min intervals | From $0.49/month | Any hosting |
| **UptimeRobot** | 50 monitors, 5-min intervals | From $7/month | Budget option |
| **Vercel Cron** | Unlimited on all plans | FREE | Vercel deployments |

---

## Next Steps

1. ✅ Choose your scheduling method from above
2. ✅ Configure the cron job with your endpoint and secret
3. ✅ Test using the manual trigger page or cURL
4. ✅ Monitor the first few runs to ensure everything works
5. ✅ Set up email alerts for failures (recommended)

**Need Help?** 
- Test endpoint: `/settings/automation-testing`
- Health check: `/api/run-automations/test`
- Manual trigger: Use the admin dashboard

---

## Example: Complete Firebase Setup

Here's a complete example for Firebase hosting:

```bash
# 1. Enable Cloud Scheduler
gcloud services enable cloudscheduler.googleapis.com

# 2. Create the job (replace YOUR_APP_URL and YOUR_CRON_SECRET)
gcloud scheduler jobs create http run-email-automations \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="https://omniflow-app.web.app/api/run-automations" \
  --http-method=GET \
  --headers="Authorization=Bearer sk_live_abc123xyz789..." \
  --description="Email automation processor"

# 3. Test it
gcloud scheduler jobs run run-email-automations --location=us-central1

# 4. Check logs
gcloud scheduler jobs describe run-email-automations --location=us-central1
```

Done! Your automations will now run every 5 minutes automatically.

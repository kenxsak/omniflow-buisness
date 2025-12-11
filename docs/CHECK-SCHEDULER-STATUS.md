# ✅ How to Check if Google Cloud Scheduler is Already Set Up

## Quick Verification Methods

### Method 1: Google Cloud Console (EASIEST) ⭐

1. **Go to Cloud Scheduler:**
   - Visit: [console.cloud.google.com/cloudscheduler](https://console.cloud.google.com/cloudscheduler)
   - Make sure you're in the correct Firebase project (check top dropdown)

2. **What to look for:**
   - ✅ **If you see a job** calling `/api/run-automations` → **It's already set up!**
   - ❌ **If it says "No jobs found"** → **Not set up yet**
   - ⚠️ **If it asks to enable API** → **Not set up yet**

3. **Check job details:**
   If you see a job, click on it and verify:
   - **Status:** Should be "Enabled" (not paused)
   - **Schedule:** Should be `*/5 * * * *` or `*/10 * * * *`
   - **Target:** Should contain `/api/run-automations`
   - **Last run:** Check if it's been running recently
   - **Execution history:** Review success/failure rate

---

### Method 2: Check Your App Logs (Firebase/Hosting)

If Cloud Scheduler is running, you should see regular requests to `/api/run-automations`:

1. **Check Firebase Hosting logs:**
   - Go to [console.firebase.google.com](https://console.firebase.google.com)
   - Select your project
   - Go to **Hosting** → **Usage**
   - Look for regular GET requests to `/api/run-automations` every 5-10 minutes

2. **Or check via your admin dashboard:**
   - Go to `/settings/automation-testing`
   - Look at the endpoint information
   - The page will show if automations are running

---

### Method 3: Test Manually from Admin Dashboard

1. **Visit:** `/settings/automation-testing`
2. **Enter your CRON_SECRET**
3. **Click "Run Automations Now"**
4. **Check the response:**
   - ✅ Success = System is working (scheduler may or may not be set up)
   - ❌ Unauthorized = CRON_SECRET mismatch
   - ❌ Error = System issue

This tells you if the automation **system** works, but not if the **scheduler** is running automatically.

---

### Method 4: Using gcloud CLI (From Your Local Machine)

If you have `gcloud` CLI installed on your computer:

```bash
# List all Cloud Scheduler jobs
gcloud scheduler jobs list --location=us-central1

# Check other common regions
gcloud scheduler jobs list --location=us-east1
gcloud scheduler jobs list --location=europe-west1
```

**Expected output if set up:**
```
ID                      LOCATION      SCHEDULE      TARGET_TYPE  STATE
run-email-automations   us-central1   */5 * * * *   HTTP         ENABLED
```

**Expected output if NOT set up:**
```
Listed 0 items.
```

---

## 🔍 What Each Status Means

### ✅ Already Set Up - You'll See:
- A job in Cloud Scheduler dashboard
- Status: "Enabled"
- Regular execution history (every 5-10 minutes)
- Recent successful runs
- GET requests in your hosting logs

### ❌ Not Set Up - You'll See:
- No jobs in Cloud Scheduler
- OR API needs to be enabled
- No automated requests in logs
- Only manual test runs in execution history

### ⚠️ Set Up But Not Working - You'll See:
- Job exists but is "Paused"
- OR execution history shows all failures
- OR 401 Unauthorized errors in logs
- OR no recent executions

---

## 🛠️ Quick Fixes for Common Issues

### Issue: Job is Paused
**Fix:**
1. Go to Cloud Scheduler
2. Click on the job
3. Click "RESUME"

### Issue: All Executions Failing (401 Errors)
**Fix:**
1. CRON_SECRET in job headers doesn't match environment variable
2. Update the job headers:
   - Edit job → Headers → Update `Authorization: Bearer YOUR_CRON_SECRET`

### Issue: No Recent Executions
**Fix:**
1. Check if job is enabled
2. Manually trigger: Click "⋮" → "Force run"
3. Check execution logs for errors

---

## 📊 How to Monitor Active Scheduler

Once confirmed it's running:

### Daily Monitoring
1. **Cloud Scheduler Dashboard:**
   - Check execution success rate
   - Look for any failed runs
   - Monitor response times

2. **Firebase Hosting Logs:**
   - Verify requests are coming through
   - Check for 200 OK responses

3. **Admin Dashboard:**
   - Visit `/settings/automation-testing`
   - Review recent automation activity

### Weekly Review
- Check total emails sent vs quota
- Review automation state progress
- Verify no circuit breakers triggered
- Check Brevo delivery rates

---

## 🎯 Expected Behavior When Running

### Every 5 Minutes:
1. Cloud Scheduler sends GET request to `/api/run-automations`
2. Your endpoint checks CRON_SECRET
3. System processes all pending automation steps
4. Response sent back with summary
5. Logged in Cloud Scheduler execution history

### You Should See:
- Regular 200 OK responses
- Processing summaries: "Processed X steps"
- Quota tracking updates in Firestore
- Emails being sent via Brevo

---

## 🚀 Quick Setup Commands (If Not Set Up)

### Via Google Cloud Console (No CLI needed):
1. Visit: [console.cloud.google.com/cloudscheduler](https://console.cloud.google.com/cloudscheduler)
2. Click "CREATE JOB"
3. Fill in:
   - Name: `run-email-automations`
   - Region: `us-central1`
   - Schedule: `*/5 * * * *`
   - Target: HTTP
   - URL: `https://YOUR_APP_URL/api/run-automations`
   - Method: GET
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
4. Click "CREATE"

### Via gcloud CLI:
```bash
gcloud scheduler jobs create http run-email-automations \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="https://YOUR_APP_URL/api/run-automations" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET"
```

---

## ✅ Verification Checklist

Use this checklist to confirm everything is working:

- [ ] Cloud Scheduler job exists and is enabled
- [ ] Schedule is set to every 5-10 minutes
- [ ] Target URL points to `/api/run-automations`
- [ ] Authorization header is correctly configured
- [ ] Recent execution history shows successful runs (200 OK)
- [ ] Firebase logs show regular GET requests
- [ ] Manual test from admin dashboard works
- [ ] Emails are being sent (check Brevo dashboard)

---

## 📞 Support Resources

**If you need help:**
- Full setup guide: `docs/automation-scheduling-setup.md`
- Quick start: `docs/CRON-QUICK-START.md`
- Manual testing: `/settings/automation-testing`
- System status: `/api/run-automations/test`

---

**TL;DR:** Go to [console.cloud.google.com/cloudscheduler](https://console.cloud.google.com/cloudscheduler) and check if there's a job running. That's the fastest way to know!

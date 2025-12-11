# 🎉 Email Automation System - Complete Setup Guide

## ✅ What's Been Set Up

Your email automation system is **fully operational** and includes:

### 1. ✅ Automation Engine (Already Built)
- Processes email automation sequences for all active companies
- Respects daily and hourly email quotas based on subscription plans
- Circuit breaker protection (stops after 5 consecutive failures)
- Automatic quota resets (daily and hourly)
- Detailed logging and error tracking

### 2. ✅ API Endpoints (Ready to Use)
- **Main Endpoint:** `/api/run-automations` (secured with CRON_SECRET)
- **Health Check:** `/api/run-automations/test` (public, no auth needed)

### 3. ✅ Admin Testing Dashboard (NEW!)
- **Location:** `/settings/automation-testing`
- **Access:** Admin and SuperAdmin only
- **Features:**
  - Manual trigger button
  - Connection testing
  - Real-time results display
  - Detailed execution logs
  - Endpoint configuration info

### 4. ✅ Complete Documentation
- **Quick Start:** `docs/CRON-QUICK-START.md` (5-minute setup)
- **Detailed Guide:** `docs/automation-scheduling-setup.md` (all options)
- **This File:** Summary and next steps

---

## 🚀 What You Need to Do Now

### Step 1: Choose Your Scheduling Method

Since your app is hosted on **Firebase**, here are your best options:

#### Option A: Google Cloud Scheduler (RECOMMENDED)
- ✅ Integrates perfectly with Firebase
- ✅ FREE for first 3 jobs
- ✅ Highly reliable
- ✅ Easy monitoring via Google Cloud Console
- ⏱️ Setup time: 5 minutes

**See detailed instructions in:** `docs/automation-scheduling-setup.md` (Option 1)

#### Option B: External Cron Service (cron-job.org)
- ✅ Works with any hosting
- ✅ FREE tier (up to 50 jobs)
- ✅ Super easy setup (just a web form)
- ✅ Email notifications for failures
- ⏱️ Setup time: 3 minutes

**See detailed instructions in:** `docs/CRON-QUICK-START.md`

---

## 📋 Quick Setup Checklist

### Before You Start
- [ ] Your app is deployed and accessible via HTTPS
- [ ] You have your `CRON_SECRET` from environment variables
- [ ] You're logged in as an Admin or SuperAdmin

### Setup Steps

#### 1. Test the Endpoint Manually
1. Go to `/settings/automation-testing` in your app
2. Enter your `CRON_SECRET`
3. Click "Test Connection" to verify it works
4. Click "Run Automations Now" to test a full run

#### 2. Set Up Automated Scheduling

**For Google Cloud Scheduler (Firebase hosting):**
```bash
# Run this in your terminal (replace YOUR_APP_URL and YOUR_CRON_SECRET)
gcloud scheduler jobs create http run-email-automations \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="https://YOUR_APP_URL/api/run-automations" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET"
```

**For External Service (cron-job.org):**
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create new job:
   - URL: `https://your-app-url.com/api/run-automations`
   - Schedule: Every 5 minutes
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
3. Save and enable

#### 3. Verify It's Working
- Check the cron service dashboard for successful executions
- Visit `/settings/automation-testing` to see recent activity
- Monitor your email service (Brevo) for sent emails

---

## 🧪 Testing Guide

### Test 1: Health Check (No Auth Needed)
```bash
curl https://your-app-url.com/api/run-automations/test
```

**Expected Response:**
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

### Test 2: Manual Trigger (Auth Required)
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app-url.com/api/run-automations
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Automation run completed. Processed X steps...",
  "details": ["Company ABC: 5 steps processed"]
}
```

### Test 3: Admin Dashboard
1. Visit `/settings/automation-testing`
2. Use the manual trigger interface
3. Review the results in real-time

---

## 📊 How It Works

### Automation Flow
```
1. Cron job triggers every 5 minutes
   ↓
2. API endpoint `/api/run-automations` is called
   ↓
3. System checks all active companies
   ↓
4. For each company:
   - Checks if company is active
   - Verifies Brevo API key exists
   - Checks daily/hourly quotas
   - Verifies circuit breaker is not tripped
   ↓
5. Processes pending automation steps:
   - Finds automation states ready to execute
   - Sends emails or applies delays
   - Updates state for next step
   - Tracks quota usage
   ↓
6. Returns summary of actions taken
```

### Quota System
- **Free Plan:** 100 emails/day, 10 emails/hour
- **Starter Plan:** 500 emails/day, 50 emails/hour
- **Pro Plan:** 2,000 emails/day, 200 emails/hour
- **Enterprise Plan:** 10,000 emails/day, 1,000 emails/hour

### Circuit Breaker
- Automatically stops sending if 5 consecutive failures occur
- Prevents your email account from being banned
- Resets after 30 minutes of cooldown
- Detailed error logging for troubleshooting

---

## 🔧 Troubleshooting

### Issue: "401 Unauthorized" Error

**Cause:** CRON_SECRET mismatch

**Solution:**
1. Check your environment variables
2. Ensure you're using `Bearer ` prefix: `Authorization: Bearer YOUR_SECRET`
3. Verify no extra spaces or characters

### Issue: No Emails Being Sent

**Checklist:**
- [ ] Company status is "active"
- [ ] Brevo API key is configured in Settings > API Keys
- [ ] Automation is activated (status: "active")
- [ ] Automation states exist for leads in database
- [ ] Daily/hourly quota not exceeded
- [ ] Circuit breaker not tripped

**Debug:**
1. Go to `/settings/automation-testing`
2. Click "Run Automations Now"
3. Review the detailed results
4. Check the message for skipped companies/steps

### Issue: Circuit Breaker Triggered

**What it means:** System detected 5 consecutive email sending failures

**Solution:**
1. Wait 30 minutes for automatic reset, OR
2. Fix the underlying issue:
   - Verify Brevo API key is valid
   - Check sender email is verified in Brevo
   - Review email template content
3. Test manually from `/settings/automation-testing`

### Issue: Cron Job Not Running

**Checklist:**
- [ ] Cron job is enabled in service dashboard
- [ ] Schedule is correctly configured
- [ ] Endpoint URL is correct (HTTPS)
- [ ] Authorization header is properly set
- [ ] No firewall blocking the cron service

**Test:**
- Use the "Test Connection" button in `/settings/automation-testing`
- Check cron service execution history
- Verify endpoint is reachable from external IPs

---

## 📈 Monitoring

### What to Monitor

1. **Cron Service Dashboard**
   - Execution success rate
   - Response times
   - Error logs

2. **Admin Testing Page**
   - Recent run results
   - Steps processed
   - Quota usage

3. **Firebase Firestore**
   - Check `companies/{id}/quotaTracking` for quota data
   - Review `companies/{id}/automationStates` for pending steps

4. **Email Service (Brevo)**
   - Sent email count
   - Delivery rates
   - Bounce rates

### Recommended Alerts

Set up email alerts for:
- ❌ Cron job failures (in cron service)
- ⚠️ Circuit breaker triggers
- ⚠️ Quota limits approaching
- ❌ API authentication failures

---

## 💡 Best Practices

### Scheduling
- **5 minutes:** Best for responsive automation
- **10 minutes:** Good balance of performance and cost
- **15 minutes:** Acceptable for most use cases

### Security
- Keep CRON_SECRET secure (32+ characters)
- Never commit secrets to version control
- Rotate CRON_SECRET every 3-6 months
- Use HTTPS only (never HTTP)

### Maintenance
- Review automation performance weekly
- Monitor quota usage trends
- Check circuit breaker logs monthly
- Update cron service credentials when rotating secrets

---

## 🎓 Additional Resources

### Documentation
- **Quick Start:** `docs/CRON-QUICK-START.md`
- **Detailed Setup:** `docs/automation-scheduling-setup.md`
- **Main README:** `README.md` (section 4)

### Admin Tools
- **Testing Dashboard:** `/settings/automation-testing`
- **Automation Config:** `/email-marketing/automations`
- **API Settings:** `/settings` (API Keys tab)

### External Services
- [Google Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Brevo Dashboard](https://app.brevo.com)

---

## ✨ Summary

Your email automation system is **production-ready** with:

✅ Robust automation engine with quota management
✅ Circuit breaker for email provider protection  
✅ Secure API endpoints with CRON_SECRET authentication
✅ Admin testing dashboard for monitoring and manual triggers
✅ Comprehensive documentation for all hosting options
✅ Health check endpoints for monitoring

**Next Step:** Choose your scheduling method and follow the setup guide!

**Need Help?**
- Test it first: `/settings/automation-testing`
- Read the quick start: `docs/CRON-QUICK-START.md`
- Full options: `docs/automation-scheduling-setup.md`

---

**Happy Automating! 🚀**

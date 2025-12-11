# Email Automation Cron Setup - Quick Start

## 🚀 5-Minute Setup

Your email automation system is ready! Just needs a scheduler.

### Option 1: Free External Service (Easiest)

**Using cron-job.org (Recommended):**

1. Sign up at [cron-job.org](https://cron-job.org) (FREE)

2. Create new cron job:
   - **URL:** `https://your-domain.com/api/run-automations`
   - **Schedule:** Every 5 minutes
   - **Method:** GET
   - **Header:** `Authorization: Bearer YOUR_CRON_SECRET`

3. Done! ✅

### Option 2: Google Cloud Scheduler (Firebase Apps)

```bash
gcloud scheduler jobs create http run-email-automations \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="https://YOUR_APP.web.app/api/run-automations" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET"
```

### Option 3: Vercel Cron (Vercel Apps Only)

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/run-automations",
    "schedule": "*/5 * * * *"
  }]
}
```

## 🧪 Test Your Setup

### Manual Test (Admin Dashboard)
Visit: `/settings/automation-testing`

### cURL Test
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/run-automations
```

### Health Check
```bash
curl https://your-domain.com/api/run-automations/test
```

## 📋 What You Need

1. **Your app URL:** `https://_____.com`
2. **Your CRON_SECRET:** (from environment variables)
3. **5 minutes:** to set up

## ✅ Success Checklist

- [ ] Cron job created and enabled
- [ ] Authentication header configured
- [ ] Schedule set to every 5-10 minutes  
- [ ] Test run successful (200 OK response)
- [ ] Email alerts configured for failures

## 🆘 Troubleshooting

**Getting 401 errors?**
- Check your CRON_SECRET matches exactly
- Include `Bearer ` prefix in authorization header

**No emails sending?**
- Company must have `active` status
- Brevo API key must be configured
- Check automation states exist in database

**Need detailed help?**
- See full guide: `docs/automation-scheduling-setup.md`
- Use admin test page: `/settings/automation-testing`

## 📊 Expected Response

```json
{
  "success": true,
  "message": "Automation run completed. Processed 5 steps...",
  "details": ["Company ABC: 5 steps processed"]
}
```

---

**That's it!** Your email automations will now run automatically every 5 minutes.

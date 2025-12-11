# Integration Setup Guide for OmniFlow - Complete Setup Instructions

**For Business Owners (Non-Technical Users)** - Copy-paste URLs and follow simple 3-4 step instructions for each integration.

---

## Quick Reference: Direct Links to Get API Keys

| Integration | Where to Get API Key | Direct Link |
|-------------|---------------------|------------|
| **Google AI (Gemini)** | Google AI Studio | https://aistudio.google.com/app/apikey |
| **Cal.com** | Developer Settings | https://app.cal.com/settings/developer/api-keys |
| **Brevo** | API Settings | https://app.brevo.com/settings/keys/api |
| **Sender.net** | API Tokens | https://app.sender.net/settings/api-access-tokens |
| **Twilio** | Console | https://www.twilio.com/console |
| **MSG91** | Dashboard | https://msg91.com/user/account |
| **Fast2SMS** | Dashboard API | https://www.fast2sms.com/dashboard/api |
| **Meta WhatsApp** | Meta Business | https://developers.facebook.com/docs/whatsapp/cloud-api/get-started |
| **Gupshup** | Dashboard | https://www.gupshup.io/whatsapp/dashboard |
| **AiSensy** | Dashboard | https://app.aisensy.com |
| **HubSpot** | Private Apps | https://app.hubspot.com/private-apps |
| **Zoho CRM** | API Console | https://api-console.zoho.com/ |
| **Bitrix24** | Webhooks | https://training.bitrix24.com/rest_help/rest_sum/webhooks.php |
| **Voice Chat AI** | Embed Settings | https://app.voicechatai.wmart.in/dashboard?tab=embed |

---

## Step-by-Step Setup for Each Integration

### 1️⃣ **Google AI (Gemini)** - AI Content Generation

**What it does:** Generate email copy, SMS messages, marketing content automatically.

**Steps:**
1. Go to: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Select your project (or create new)
4. **Copy the key** (starts with `AIzaSy...`)
5. Paste in **OmniFlow → Settings → Google AI → API Key field**
✅ Done!

---

### 2️⃣ **Cal.com** - Appointment Booking

**What it does:** Customers book appointments, you get reminders via Email/SMS/WhatsApp.

**Steps:**
1. Go to: https://app.cal.com/settings/developer/api-keys
2. Click **"Add"** button
3. Name it: `OmniFlow`
4. Set Expiration to: **"Never expires"**
5. Click **"Save"**
6. **Copy the key** (starts with `cal_...`) - shown only once!
7. Paste in **OmniFlow → Settings → Cal.com → API Key field**
✅ Done!

---

### 3️⃣ **Brevo** - Email Marketing

**What it does:** Send professional email campaigns.

**Steps:**
1. Go to: https://app.brevo.com/settings/keys/api
2. Click **"Generate a new API key"**
3. Give it a name (e.g., "OmniFlow")
4. Click **"Generate"**
5. **Copy the key immediately** (starts with `xkeysib-...`)
6. In **OmniFlow Settings → Brevo**, fill:
   - **API Key**: Paste here
   - **Sender Email**: your@business.email
   - **Sender Name**: Your Business Name
7. Click **"Save API Keys"**
✅ Done!

---

### 4️⃣ **Sender.net** - Email Marketing (Alternative)

**What it does:** Email marketing with generous free tier.

**Steps:**
1. Go to: https://app.sender.net/settings/api-access-tokens
2. Click **"Create API token"**
3. Select Duration: **"Forever"** (recommended)
4. Click **"Create"**
5. **Copy the token**
6. In **OmniFlow Settings → Sender.net**, fill:
   - **API Key**: Paste token
   - **Sender Email**: your@business.email
   - **Sender Name**: Your Business Name
7. Click **"Save API Keys"**
✅ Done!

---

### 5️⃣ **Twilio** - SMS & WhatsApp

**What it does:** Send SMS messages and WhatsApp messages.

**Steps:**
1. Go to: https://www.twilio.com/console
2. Login/Sign up
3. On dashboard, find and **copy**:
   - **Account SID** (starts with AC...)
   - **Auth Token**
4. Find your **Twilio Phone Number** (assigned to your account)
5. In **OmniFlow Settings → Twilio**, fill all three fields
6. Click **"Save API Keys"**
✅ Done!

---

### 6️⃣ **MSG91** - SMS for India

**What it does:** Bulk SMS sending in India.

**Steps:**
1. Go to: https://msg91.com/user/account
2. Login
3. Find **"Authkey"** (in left menu or top dropdown)
4. **Copy your Auth Key**
5. In **OmniFlow Settings → MSG91**, fill:
   - **Auth Key**: Paste here
   - **Sender ID**: Your business name (e.g., ACMCORP)
6. Click **"Save API Keys"**
✅ Done!

---

### 7️⃣ **Fast2SMS** - SMS for India (Fast Delivery)

**What it does:** Fast SMS delivery for India.

**Steps:**
1. Go to: https://www.fast2sms.com/dashboard/api
2. Login
3. Click **"Dev API"** section
4. Go to **"API KEY"** tab
5. **Copy the Authorization Key**
6. In **OmniFlow Settings → Fast2SMS**, fill:
   - **API Key**: Paste here
   - **Sender ID** (optional): Your business code
7. Click **"Save API Keys"**
✅ Done!

---

### 8️⃣ **Meta WhatsApp Cloud API** - WhatsApp Business

**What it does:** Send branded WhatsApp messages from your business.

**Steps:**
1. Go to: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
2. **Create Meta Developer Account** (if needed)
3. **Create Meta Business** (if needed)
4. **Create WhatsApp Business App** → follow Meta's setup wizard
5. After setup, copy from Meta Business:
   - **Phone Number ID**
   - **Access Token**
   - **WABA ID** (optional)
6. In **OmniFlow Settings → Meta WhatsApp Cloud API**, paste all fields
7. Click **"Save API Keys"**
✅ Done!

---

### 9️⃣ **Gupshup** - Enterprise WhatsApp

**What it does:** Advanced WhatsApp automation.

**Steps:**
1. Go to: https://www.gupshup.io/whatsapp/dashboard
2. Login/Create account
3. Create your WhatsApp app
4. Go to **"Settings"** tab
5. **Copy**:
   - **API Key**
   - **App ID**
   - **App Name**
   - **Business Number**
6. In **OmniFlow Settings → Gupshup**, fill all four fields
7. Click **"Save API Keys"**
✅ Done!

---

### 🔟 **AiSensy** - WhatsApp Automation with AI Chatbot

**What it does:** Automated WhatsApp responses and campaigns.

**Steps:**
1. Go to: https://app.aisensy.com
2. Login/Create account
3. **Create an "API Campaign"** first (required!)
4. Go to: Dashboard → **"Manage"** section
5. Find **"API Key"** → click **"Generate"** or **"Copy"**
6. In **OmniFlow Settings → AiSensy**, fill:
   - **API Key**: Paste here
   - **Campaign Name**: Your API campaign name from AiSensy
7. Click **"Save API Keys"**
✅ Done!

---

### 1️⃣1️⃣ **Voice Chat AI Widget** - AI Chatbot for Customers

**What it does:** 24/7 voice chatbot on your Digital Card.

**Steps:**
1. Go to: https://app.voicechatai.wmart.in/dashboard?tab=embed
2. Login
3. **Create an Agent** (e.g., "Support Bot")
4. Go to **"Embed"** section
5. In **OmniFlow Settings → Voice Chat AI Widget**, fill:
   - **Agent ID**: Copy from Agents section (e.g., agent_1755699726191)
   - **Embed Script Code**: Copy full `<script>` tag from Embed section
6. Click **"Save API Keys"**
✅ Done!

---

### 1️⃣2️⃣ **HubSpot** - CRM Integration

**What it does:** Sync your CRM data with HubSpot.

**Steps:**
1. Go to: https://app.hubspot.com/private-apps
2. Click **"Create Private App"**
3. Give it a name (e.g., "OmniFlow")
4. Go to **"Scopes"** tab → select permissions you need
5. Click **"Create App"**
6. Click **"Show Token"** → **"Copy"** the Access Token
7. Also find your **Portal ID** (Settings → Account Details → Portal ID)
8. In **OmniFlow Settings → HubSpot**, fill:
   - **Access Token**: Paste here
   - **Portal ID**: Paste here
9. Click **"Save API Keys"**
✅ Done!

---

### 1️⃣3️⃣ **Zoho CRM** - CRM Integration

**What it does:** Sync your CRM data with Zoho.

**Steps:**
1. Go to: https://api-console.zoho.com/
2. Click **"Register**" → select "Server-based Application"
3. Fill in details (name, redirect URL)
4. Click **"Create"**
5. Go to **"Client Secret"** tab → **copy**:
   - **Client ID**
   - **Client Secret**
6. Go to **"Generate Code"** tab → enter scopes (or use defaults) → **copy Auth Code**
7. In **OmniFlow Settings → Zoho CRM**, fill:
   - **Client ID**: Paste here
   - **Client Secret**: Paste here
   - **Refresh Token**: Paste Auth Code here
   - **API Domain**: www.zohoapis.com (or your region)
8. Click **"Save API Keys"**
✅ Done!

---

### 1️⃣4️⃣ **Bitrix24** - CRM Integration

**What it does:** Sync your CRM data with Bitrix24.

**Steps:**
1. Go to your **Bitrix24 Admin Panel**
2. **Developer resources** → **Other** → **Inbound webhook**
3. Click **"Create webhook"**
4. Give it a name (e.g., "OmniFlow")
5. Select modules this webhook can access
6. Click **"Save"**
7. You'll see a **Webhook URL** → **copy it**
8. In **OmniFlow Settings → Bitrix24**, fill:
   - **Webhook URL**: Paste the full URL
   - **User ID** (optional): Leave blank unless you have specific needs
9. Click **"Save API Keys"**
✅ Done!

---

## 🆘 Troubleshooting

### "Failed to save API key"
- ✅ Make sure you copied the ENTIRE key (sometimes it gets cut off)
- ✅ Try again slowly
- ✅ Check for extra spaces at beginning or end of key

### "Authentication failed" error
- ✅ Verify key is active in the original service
- ✅ Some services need you to enable the key after creating it
- ✅ Generate a new key if old one isn't working

### "Key expired" error after 30 days
- ✅ Some services expire keys
- ✅ Generate new key and update in OmniFlow

---

## 💡 Best Practices

✅ **Keep API keys safe:**
- Never share them via email
- Never paste them in public documents
- Never commit to GitHub

✅ **Use long-lasting keys:**
- Set expiration to "Never" when possible
- Keep production keys separate from test keys

✅ **If key is compromised:**
- Regenerate immediately
- Delete old key

---

## 📋 Pre-Setup Checklist

Before you start, have these ready:
- [ ] Your business email address
- [ ] Your business name
- [ ] Your business phone number (if using SMS/WhatsApp)
- [ ] Your website URL (for some integrations)
- [ ] 15-30 minutes to go through setup

---

## 🎯 Next Steps After Setup

1. **Google AI**: Start generating content
2. **Cal.com**: Share your booking link with customers
3. **Email/SMS**: Send first test campaign
4. **Appointments**: Set up reminder timing
5. **WhatsApp**: Create message templates

---

**✨ Remember:** Each integration only needs to be set up ONCE. After that, OmniFlow handles everything automatically!

**Last Updated:** November 29, 2025

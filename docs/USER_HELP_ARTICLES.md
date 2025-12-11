# OmniFlow User Help Articles

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Leads & Contacts](#managing-leads--contacts)
3. [Creating Email Campaigns](#creating-email-campaigns)
4. [Sending SMS Messages](#sending-sms-messages)
5. [WhatsApp Messaging](#whatsapp-messaging)
6. [Using AI Features](#using-ai-features)
7. [Deals & Pipeline Management](#deals--pipeline-management)
8. [Tasks & Appointments](#tasks--appointments)
9. [Team Management](#team-management)
10. [Billing & Subscriptions](#billing--subscriptions)

---

## Getting Started

### Creating Your Account

1. Visit the OmniFlow signup page
2. Enter your email address and create a password
3. Enter your company name
4. Click "Create Account"
5. Check your email for verification (if required)
6. Complete the quick onboarding wizard

### First Steps After Login

- **Set up your profile**: Click your name in the top right → Settings
- **Add your first lead**: Go to CRM → Leads → "Add Lead"
- **Connect email**: Go to Settings → Integrations → Email
- **Explore the dashboard**: See your metrics and recent activity

### Understanding the Dashboard

Your dashboard shows:
- **Lead overview**: New leads, contacted leads, conversion rate
- **Recent activity**: Latest actions across your team
- **Tasks due**: Upcoming and overdue tasks
- **Campaign performance**: Email opens, clicks, and responses

---

## Managing Leads & Contacts

### Adding a New Lead

1. Go to **CRM → Leads**
2. Click the **"+ Add Lead"** button
3. Fill in the lead details:
   - Name (required)
   - Email (required)
   - Phone number
   - Source (where they came from)
   - Notes
4. Click **Save**

### Lead Statuses Explained

| Status | Meaning |
|--------|---------|
| New | Just added, not contacted yet |
| Contacted | You've reached out |
| Qualified | They're interested and fit your criteria |
| Won | Converted to a customer |
| Lost | Didn't convert |

### Searching and Filtering Leads

- **Search**: Type in the search box to find leads by name or email
- **Filter by status**: Click the status dropdown
- **Sort**: Click column headers to sort

### Importing Leads

1. Go to **CRM → Leads**
2. Click **"Import"** button
3. Upload a CSV file with columns: Name, Email, Phone (optional)
4. Map your columns to OmniFlow fields
5. Click **Import**

### Exporting Leads

1. Go to **CRM → Leads**
2. Click **"Export"** button
3. Choose format (CSV or Excel)
4. Download the file

---

## Creating Email Campaigns

### Before You Start

Make sure you've connected an email provider:
1. Go to **Settings → Integrations**
2. Choose your provider (Brevo, Sender.net, or Custom SMTP)
3. Enter your API key or SMTP settings
4. Test the connection

### Creating a New Email Campaign

1. Go to **Campaigns → Create New**
2. Select **Email** as the channel
3. Enter your campaign details:
   - Campaign name
   - Subject line
   - Email content (use the editor or AI)
4. Choose recipients:
   - All leads
   - Filtered by status
   - Specific leads
5. Preview your email
6. Click **Send Now** or **Schedule**

### Using AI to Write Emails

1. In the email editor, click **"Generate with AI"**
2. Describe what you want (e.g., "Write a follow-up email for leads who haven't responded")
3. Review the generated content
4. Edit as needed
5. Use in your campaign

### Email Best Practices

- Keep subject lines under 50 characters
- Personalize with recipient's name
- Include a clear call-to-action
- Always include an unsubscribe link (added automatically)

---

## Sending SMS Messages

### Setting Up SMS

1. Go to **Settings → Integrations → SMS**
2. Choose your provider:
   - **MSG91** (India)
   - **Fast2SMS** (India)
   - **Twilio** (International)
3. Enter your API credentials
4. Save and test

### Creating an SMS Campaign

1. Go to **Campaigns → SMS**
2. Click **"Create SMS Campaign"**
3. Write your message (160 characters recommended)
4. Select recipients
5. Preview the message
6. Click **Send**

### SMS Templates (India)

For sending SMS in India, you need DLT-registered templates:
1. Register your templates with your telecom provider
2. Add the Template ID in OmniFlow
3. Use the exact template text

---

## WhatsApp Messaging

### WhatsApp Options

OmniFlow offers two WhatsApp methods:

**Free Method (wa.me links)**
- Opens WhatsApp on the user's device
- They send the message manually
- Great for personal follow-ups

**Business API Method**
- Sends messages automatically
- Can include images
- Requires WhatsApp Business API access

### Sending WhatsApp via wa.me Link

1. Go to a lead's profile
2. Click **"WhatsApp"** button
3. Type your message
4. Click **"Open in WhatsApp"**
5. Send from your phone/WhatsApp

### Using WhatsApp Business API

1. Set up a WhatsApp Business account with a provider (Gupshup, AiSensy, etc.)
2. Connect in **Settings → Integrations → WhatsApp**
3. Create message templates (required by WhatsApp)
4. Send campaigns through the Campaigns section

---

## Using AI Features

### AI Content Generation

OmniFlow's AI can help you create:
- Marketing emails
- Social media posts
- Ad copy
- Blog ideas
- Customer responses

### How to Use AI

1. Go to **AI Chat** or any AI-enabled feature
2. Describe what you need in plain language
3. Review the generated content
4. Edit and refine as needed
5. Use in your campaigns

### AI Credits

- Each AI generation uses credits
- View your credits in **Settings → Billing**
- Upgrade your plan for more credits
- Or use your own API key for unlimited access

### Bring Your Own Key (BYOK)

1. Get an API key from Google AI Studio
2. Go to **Settings → AI Settings**
3. Enter your API key
4. Now you have unlimited AI generations

---

## Deals & Pipeline Management

### Understanding Deals

Deals represent potential sales opportunities. Track them through stages:
- Proposal
- Negotiation
- Closing
- Won / Lost

### Creating a Deal

1. Go to **CRM → Deals**
2. Click **"Add Deal"**
3. Enter deal details:
   - Deal name
   - Value (amount)
   - Contact/lead
   - Expected close date
4. Save

### Managing Your Pipeline

- **Drag and drop** deals between stages
- **View total value** at each stage
- **Filter by date** to focus on priority deals
- **Mark as won/lost** to track conversions

### Deal Analytics

View your deal statistics:
- Total pipeline value
- Win rate
- Average deal size
- Sales cycle length

---

## Tasks & Appointments

### Creating Tasks

1. Go to **CRM → Tasks**
2. Click **"Add Task"**
3. Enter:
   - Task title
   - Due date
   - Link to lead (optional)
   - Description
4. Save

### Task Management Tips

- Set realistic due dates
- Link tasks to leads for context
- Use the calendar view for planning
- Mark tasks complete promptly

### Scheduling Appointments

1. Go to **Appointments** or from a lead's profile
2. Select date and time
3. Add appointment details
4. Link to contact
5. Save

### Appointment Reminders

OmniFlow can send automatic reminders:
- Email reminders (1 day before)
- Configurable in Settings

---

## Team Management

### Inviting Team Members

1. Go to **Settings → Team**
2. Click **"Invite Member"**
3. Enter their email address
4. Select their role:
   - **Admin**: Full access
   - **Manager**: Manage team and leads
   - **Sales Rep**: Work with assigned leads
5. Send invitation

### Managing Roles

| Role | What They Can Do |
|------|------------------|
| Admin | Everything including billing and settings |
| Manager | Manage leads, campaigns, team members |
| Sales Rep | Work with leads, create activities |

### Assigning Leads

1. Go to lead list
2. Select leads (checkbox)
3. Click **"Assign"**
4. Choose team member
5. Confirm

---

## Billing & Subscriptions

### Viewing Your Plan

Go to **Settings → Billing** to see:
- Current plan
- Features included
- Credit usage
- Next billing date

### Upgrading Your Plan

1. Go to **Settings → Billing**
2. Click **"Upgrade"** on desired plan
3. Choose monthly or yearly billing
4. Complete payment
5. New features are available immediately

### Payment Methods

- **International**: Visa, Mastercard via Stripe
- **India**: UPI, Cards, Netbanking via Razorpay

### Canceling Your Subscription

1. Go to **Settings → Billing**
2. Click **"Manage Subscription"**
3. Choose **"Cancel"**
4. You keep access until the end of your billing period

---

## Getting Help

### Need More Help?

- **In-app help**: Click the help icon (?) anywhere
- **Documentation**: Visit our help center
- **Support**: Contact us through Settings → Support

### Common Questions

**Q: How do I reset my password?**
A: On the login page, click "Forgot Password" and follow the instructions.

**Q: Why aren't my emails sending?**
A: Check Settings → Integrations to ensure your email provider is connected and working.

**Q: How do I add more team members?**
A: Upgrade to a plan that includes more team seats, then invite via Settings → Team.

**Q: What happens to my data if I cancel?**
A: Your data is retained for 30 days. Contact support if you need to export or extend this.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G + L` | Go to Leads |
| `G + C` | Go to Campaigns |
| `G + D` | Go to Dashboard |
| `N` | New lead (when on Leads page) |
| `?` | Show all shortcuts |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial user help articles |

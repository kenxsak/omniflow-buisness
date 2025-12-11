# Bulk Messaging User Guide

## Overview

OmniFlow now supports sending bulk WhatsApp and SMS messages to hundreds or thousands of contacts at once. This feature allows you to run marketing campaigns efficiently using WATI (WhatsApp) and MSG91 (SMS) platforms.

## Features

### WhatsApp Bulk Campaigns
- Send WhatsApp template messages to unlimited contacts
- Track delivery status for each message
- View campaign history and analytics
- Import recipients from your WhatsApp contact lists
- Monitor read receipts and replies

### SMS Bulk Campaigns
- Send SMS messages to unlimited contacts
- Support for promotional and transactional messages
- Automatic cost estimation before sending
- DLT compliance support for India
- Track delivery status for each message

## Setup Instructions

### 1. Configure WATI (WhatsApp)

1. Go to **Settings → API Integrations**
2. Find the WATI section
3. Enter your:
   - **WATI API Key** - Get this from your WATI dashboard
   - **Account URL** - Your WATI server URL (e.g., https://live-server-12345.wati.io)
4. Click **Save** to test the connection

### 2. Configure MSG91 (SMS)

1. Go to **Settings → API Integrations**
2. Find the MSG91 section
3. Enter your:
   - **Auth Key** - Get this from your MSG91 dashboard
   - **Sender ID** - Your registered sender ID for SMS
4. Click **Save** to test the connection

### 3. Prepare Your Contact Lists

Before sending campaigns, you need to create contact lists:

1. Go to **WhatsApp Marketing**
2. Create a new list (e.g., "Customers", "Leads")
3. Add contacts either:
   - Manually one by one
   - Upload a CSV file with contacts

**CSV Format:**
```csv
Name,PhoneNumber
John Doe,+919876543210
Jane Smith,+919876543211
```

## Sending WhatsApp Campaigns

### Step 1: Navigate to WhatsApp Bulk Campaigns

Click **WhatsApp Bulk Campaigns** in the sidebar.

### Step 2: Create Campaign

1. Switch to the **Create Campaign** tab
2. Enter a **Campaign Name** (e.g., "Summer Sale 2025")
3. Select a **WhatsApp Template** from the dropdown
   - Templates must be pre-approved by WhatsApp
   - Contact WATI support to create templates
4. Select a **Recipient List** (your contact list)
5. Review the recipient count
6. Click **Send Campaign**

### Step 3: Monitor Campaign

1. Switch to the **My Campaigns** tab
2. View all your campaigns with:
   - Campaign name
   - Template used
   - Status (completed, sending, failed)
   - Total recipients
   - Delivery stats
3. Click the **eye icon** to view detailed recipient status

## Sending SMS Campaigns

### Step 1: Navigate to SMS Bulk Campaigns

Click **SMS Bulk Campaigns** in the sidebar.

### Step 2: Create Campaign

1. Switch to the **Create Campaign** tab
2. Enter a **Campaign Name** (e.g., "Flash Sale Alert")
3. Select **Message Type**:
   - **Transactional** - For account updates, OTPs (no DLT required)
   - **Promotional** - For marketing, offers (DLT required for India)
4. Write your **SMS Message**
   - Character count and SMS count shown automatically
   - Long messages will be split into multiple SMS
5. If promotional, enter your **DLT Template ID**
6. Select a **Recipient List**
7. Review the **estimated cost** in INR
8. Click **Send Campaign**

### Step 3: Monitor Campaign

1. Switch to the **My Campaigns** tab
2. View all your campaigns with:
   - Campaign name
   - Message type
   - Status
   - Total recipients
   - Delivery stats
   - Actual cost
3. Click the **eye icon** to view:
   - Full message content
   - Detailed recipient status
   - Delivery rate

## Cost Information

### WhatsApp Costs (WATI)
- Costs vary by country and template category
- Marketing templates: ~$0.02-$0.10 per message
- Service templates: ~$0.01-$0.05 per message
- Costs are charged directly by WATI

### SMS Costs (MSG91)
- India: ~₹0.15-₹0.25 per SMS
- International: ~₹0.50-₹2.00 per SMS
- Long messages count as multiple SMS:
  - 1-160 characters = 1 SMS
  - 161-306 characters = 2 SMS
  - 307-459 characters = 3 SMS

## Best Practices

### WhatsApp

1. **Use Approved Templates** - Only use templates approved by WhatsApp
2. **Personalize Messages** - Use template variables for personalization
3. **Avoid Spam** - Only message users who opted in
4. **Monitor Read Rates** - Track engagement and adjust templates
5. **Respect Timing** - Send messages during business hours

### SMS

1. **Keep it Short** - Stay under 160 characters when possible
2. **Clear Call-to-Action** - Make it obvious what you want users to do
3. **Include Opt-Out** - Add "Reply STOP to unsubscribe" for promotional
4. **Test First** - Send a test to yourself before bulk sending
5. **DLT Compliance** - Always use approved DLT templates for promotional SMS in India

## Troubleshooting

### "WATI not configured" Error
- Go to Settings → API Integrations
- Add your WATI API key and account URL
- Test the connection

### "MSG91 not configured" Error
- Go to Settings → API Integrations
- Add your MSG91 auth key and sender ID
- Test the connection

### "No templates found" (WhatsApp)
- Create templates in your WATI dashboard
- Wait for WhatsApp approval (usually 24-48 hours)
- Refresh the template list

### High Failure Rate
- Check phone numbers are in correct format (+country code)
- For WhatsApp: Ensure users have WhatsApp installed
- For SMS: Verify DLT template ID for promotional messages
- Check your WATI/MSG91 account balance

### Messages Not Delivering
- Verify phone numbers are valid and active
- Check WATI/MSG91 dashboard for detailed error logs
- Ensure sufficient account balance
- For India SMS: Verify DLT registration

## Support

For platform-specific issues:
- **WATI Support**: support@wati.io
- **MSG91 Support**: support@msg91.com
- **OmniFlow Support**: Use the in-app chat

## Campaign Limits

### Free Plan
- WhatsApp: 100 messages/month
- SMS: 100 messages/month

### Starter Plan
- WhatsApp: 1,000 messages/month
- SMS: 1,000 messages/month

### Pro Plan
- WhatsApp: 10,000 messages/month
- SMS: 10,000 messages/month

### Enterprise Plan
- WhatsApp: Unlimited
- SMS: Unlimited

*Note: Limits are soft limits. You can send more but costs will apply via your WATI/MSG91 accounts.*

## Frequently Asked Questions

### Q: Can I schedule campaigns for later?
A: Campaign scheduling is coming in a future update. For now, campaigns are sent immediately.

### Q: Can I cancel a campaign after sending?
A: No, bulk campaigns cannot be cancelled once sent. Always review carefully before clicking "Send Campaign".

### Q: How long does delivery take?
A: Most messages are delivered within 1-2 minutes. Check the campaign details to see delivery status for each recipient.

### Q: Can I use my existing contact lists?
A: Yes! You can import contacts from CSV files or add them manually in the WhatsApp Marketing section.

### Q: What happens if a message fails?
A: Failed messages are marked in the campaign details. Common reasons include invalid phone numbers, blocked users, or insufficient WATI/MSG91 balance.

### Q: Can I send images or videos?
A: Currently, only text-based WhatsApp templates are supported. Rich media support is coming soon.

### Q: Are my contact lists shared between WhatsApp and SMS?
A: Yes! Contact lists created in WhatsApp Marketing can be used for both WhatsApp and SMS campaigns.

## Next Steps

1. Configure your WATI and MSG91 accounts
2. Create your first contact list
3. Send a test campaign to yourself
4. Monitor the delivery status
5. Launch your first bulk campaign!

Happy messaging! 🚀

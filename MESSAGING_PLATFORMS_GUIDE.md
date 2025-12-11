# Messaging Platforms Integration Guide
**Complete Step-by-Step Implementation for WhatsApp Business API & Bulk SMS**

*Priority: CRITICAL - Major User Impact*

---

## Executive Summary

This document provides a complete, step-by-step plan to integrate production-grade messaging platforms for WhatsApp Business API and bulk SMS. These integrations transform OmniFlow into a true multi-channel marketing powerhouse for SMEs globally, especially in India.

**Why This Is CRITICAL Priority:**
- Major User Impact: Bulk messaging is THE #1 request from SME users
- Revenue Growth: Enables real marketing campaigns (not just single messages)
- Global Reach: WhatsApp is dominant in 180+ countries, SMS is universal
- Competitive Advantage: Most competitors don't offer simple bulk WhatsApp
- User Retention: 3x higher engagement with bulk messaging vs single messages

---

## The Problem We're Solving

### Current State (Twilio Only):
- Can send single SMS messages
- Can send single WhatsApp messages
- **Cannot send BULK campaigns** (users manually send 1-by-1)
- **No WhatsApp Business API** (only personal WhatsApp via Twilio)
- **High cost** (Twilio charges $0.005/message markup)
- **India-specific challenges** (DLT registration complexity)

### User Frustration:
> "I have 500 customers. I can't send them messages one by one! I need to send promotions to everyone at once."

### What Users Actually Need:
1. Bulk WhatsApp Campaigns: Send to 100-10,000+ contacts at once
2. WhatsApp Business Templates: Pre-approved messages (Meta requirement)
3. Bulk SMS Campaigns: Send promotional/transactional SMS in bulk
4. Affordable Pricing: Cheaper than Twilio (especially for India)
5. Simple Setup: Non-technical users can connect in 5 minutes
6. DLT Compliance (India): Platform handles all regulatory requirements

---

## Recommended Platforms Overview

### WhatsApp Business API Platforms

| Platform | Priority | Setup Time | Free Tier | Best For | Monthly Cost |
|----------|----------|------------|-----------|----------|--------------|
| **WATI** | P0 (Highest) | 15 min | Demo available | Non-technical teams, simple UI | ~$30-100 |
| **AiSensy** | P0 (Highest) | 20 min | Free API setup | Marketing automation, chatbots | ~$30-80 |
| **Interakt** | P1 (High) | 20 min | Free trial | E-commerce, Shopify/WooCommerce | ~$40-100 |
| **Meta Direct** | P2 (Medium) | 2 hours | 1,000 free/mo | Developers, tech-savvy teams | FREE + Meta fees |
| **SleekFlow** | P2 (Medium) | 5 min | Free plan | Multi-channel (WA+IG+FB) | FREE tier available |

**Recommendation**: Integrate **WATI + AiSensy** (both P0) to give users choice of simplicity (WATI) vs automation (AiSensy).

### Bulk SMS Platforms (India + Global)

| Platform | Priority | Setup Time | India Cost | Global Cost | Best For |
|----------|----------|------------|------------|-------------|----------|
| **MSG91** | P0 (Highest) | 30 min | ₹0.18-0.30/SMS | $0.002+/SMS | Developer-friendly, global reach |
| **2Factor.in** | P0 (High) | 20 min | ₹0.18-0.30/SMS | Global OTP | Ultra-fast OTP (1-3s delivery) |
| **Fast2SMS** | P1 (Medium) | 10 min | ₹0.15-0.20/SMS | Limited | Budget startups, NGOs |
| **Gupshup** | P1 (Medium) | 1 hour | Enterprise | Enterprise | Multi-channel (SMS+WA+RCS) |
| **Kaleyra** | P2 (Low) | 1 hour | ₹0.30-0.45/SMS | Global | Enterprise security, banking |

**Recommendation**: Integrate **MSG91 + 2Factor.in** (both P0):
- MSG91 for bulk campaigns (marketing + transactional)
- 2Factor.in for OTP/authentication (fastest delivery)

---

## Implementation Strategy

### Phase 1: WhatsApp Business API (Week 1-2) - 10 days

**Priority Order:**
1. **WATI Integration** (5 days) - Simplest for non-tech users
2. **AiSensy Integration** (5 days) - Advanced automation

**What Users Can Do After Phase 1:**
- Send bulk WhatsApp campaigns (100-10,000+ contacts)
- Use pre-approved templates (Meta-compliant)
- Schedule messages
- Track delivery & open rates
- Two-way conversations (shared inbox)
- Chatbot automation (AiSensy)

### Phase 2: Bulk SMS API (Week 3-4) - 8 days

**Priority Order:**
1. **MSG91 Integration** (4 days) - Primary bulk SMS provider
2. **2Factor.in Integration** (4 days) - OTP specialization

**What Users Can Do After Phase 2:**
- Send bulk SMS campaigns (India + International)
- Ultra-fast OTP delivery (1-3 seconds)
- DLT registration handled by platform
- Affordable pricing (₹0.15-0.30/SMS vs Twilio ₹0.50+)
- Pay-per-delivered model (only charged for successful delivery)
- Transactional + Promotional SMS

### Phase 3: Additional Platforms (Month 2) - 8 days (Optional)
1. **Interakt** (3 days) - E-commerce focus
2. **Fast2SMS** (2 days) - Budget option
3. **Gupshup** (3 days) - Multi-channel platform

---

## WATI Integration (WhatsApp Business API)

**Priority**: P0 (CRITICAL)
**Estimated Time**: 5 days
**Difficulty**: Easy (well-documented API)
**Free Tier**: 7-day trial, demo environment

### Features to Implement:
1. **API Connection** - Connect with WATI API key
2. **Template Sync** - Fetch approved templates
3. **Bulk Campaigns** - Send to selected contacts
4. **Two-Way Chat** - Shared inbox for responses
5. **Analytics** - Delivery, read, and reply rates

### API Endpoints (WATI):
```
Base URL: https://live-server-{accountId}.wati.io/api/v1

POST /sendTemplateMessage - Send template message
POST /sendBulkTemplateMessages - Send bulk templates
GET /getMessageTemplates - Get approved templates
POST /addContact - Add contact to WATI
GET /getMessages - Get conversation history
```

### Database Schema Addition:
```typescript
// campaigns collection
{
  type: 'whatsapp',
  provider: 'wati',
  templateId: string,
  templateName: string,
  recipients: string[], // phone numbers
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed',
  analytics: {
    sent: number,
    delivered: number,
    read: number,
    replied: number,
    failed: number
  }
}
```

### Settings Page Addition:
- New tab: "WhatsApp Business"
- Fields: WATI Account ID, WATI API Key
- "Test Connection" button
- Template sync button

---

## AiSensy Integration (WhatsApp Business API)

**Priority**: P0 (CRITICAL)
**Estimated Time**: 5 days
**Difficulty**: Easy (REST API, good docs)
**Free Tier**: Free API setup, pay per message

### Features to Implement:
1. **API Connection** - Connect with AiSensy API key
2. **Template Management** - Create/fetch templates
3. **Bulk Campaigns** - Send to large contact lists
4. **Chatbot Integration** - Auto-respond to messages
5. **Rich Media** - Images, PDFs, buttons
6. **Campaign Analytics** - Detailed delivery reports

### API Endpoints (AiSensy):
```
Base URL: https://backend.aisensy.com/campaign/t1/api

POST /v2/bulk-template-messaging - Send bulk templates
GET /v1/template-list - Get template list
POST /v1/create-template - Create new template
GET /v1/campaign-analytics/{campaignId} - Get analytics
```

---

## MSG91 Integration (Bulk SMS)

**Priority**: P0 (CRITICAL)
**Estimated Time**: 4 days
**Difficulty**: Easy (excellent documentation)
**Free Tier**: Free trial credits

### Features to Implement:
1. **API Connection** - Connect with MSG91 auth key
2. **DLT Template Management** - Auto-sync registered templates
3. **Bulk SMS Campaigns** - Send to thousands at once
4. **Variable Personalization** - {name}, {amount}, etc.
5. **Delivery Reports** - Real-time status tracking
6. **Cost Tracking** - Credit balance display

### API Endpoints (MSG91):
```
Base URL: https://control.msg91.com/api/v5

POST /flow - Send SMS via flow
GET /balance - Get credit balance
GET /report/delivery - Get delivery reports
GET /template - Get DLT templates
```

### SMS Campaign Flow:
1. User selects contacts (or segments)
2. User selects DLT template
3. System maps contact fields to template variables
4. User previews message with sample data
5. User sends or schedules campaign
6. System tracks delivery in real-time

---

## 2Factor.in Integration (OTP SMS)

**Priority**: P0 (HIGH)
**Estimated Time**: 4 days
**Difficulty**: Very Easy (simple API)
**Free Tier**: Free trial credits

### Features to Implement:
1. **API Connection** - Connect with 2Factor API key
2. **OTP Generation** - Auto-generate secure OTPs
3. **OTP Verification** - Validate user-entered OTPs
4. **Template Support** - Custom OTP message templates
5. **Delivery Reports** - Track OTP delivery

### API Endpoints (2Factor):
```
Base URL: https://2factor.in/API/V1

GET /{apiKey}/SMS/{phoneNumber}/AUTOGEN - Send auto-generated OTP
GET /{apiKey}/SMS/VERIFY/{sessionId}/{otp} - Verify OTP
POST /{apiKey}/ADDON_SERVICES/SEND/TSMS - Send transactional SMS
```

---

## UI/UX Guidelines for Messaging

### Non-Technical Language:
| Technical | User-Friendly |
|-----------|---------------|
| API Key | Connection Code |
| Template ID | Message Template |
| DLT | Government Registration |
| Webhook | Automatic Updates |
| Bulk Campaign | Send to Many |

### Campaign Creation Flow:
1. **Select Recipients** - "Who do you want to message?"
2. **Choose Template** - "Pick a pre-approved message"
3. **Personalize** - "Add their name, order number, etc."
4. **Preview** - "See how it will look"
5. **Send or Schedule** - "Send now or pick a time"

### Mobile Responsiveness:
- All messaging pages work on 375px width
- Touch targets minimum 44px
- Single-column layouts on mobile
- Large "Send" buttons

---

## Testing Checklist

### Before Launch:
- [ ] WATI: Send test message to 5 numbers
- [ ] WATI: Bulk send to 50 test contacts
- [ ] AiSensy: Template creation and approval
- [ ] AiSensy: Bulk campaign with variables
- [ ] MSG91: DLT template sync working
- [ ] MSG91: Bulk SMS to 100 contacts
- [ ] 2Factor: OTP send and verify
- [ ] All: Delivery tracking accurate
- [ ] All: Mobile UI works on 375px
- [ ] All: Error handling (invalid numbers, etc.)

### Performance Targets:
- WhatsApp: 1,000 messages in under 2 minutes
- SMS: 5,000 messages in under 5 minutes
- OTP: Delivery within 3 seconds
- UI: Page load under 2 seconds

---

## Success Metrics

### Week 1-2 (After Phase 1):
- [ ] Users can send WhatsApp campaigns to 1,000+ contacts
- [ ] WhatsApp templates management working
- [ ] Campaign tracking & analytics functional

### Week 3-4 (After Phase 2):
- [ ] Users can send bulk SMS to 10,000+ contacts
- [ ] DLT compliance automated (India)
- [ ] 50% cheaper than Twilio
- [ ] Mobile-responsive UI
- [ ] No technical jargon

### User Impact:
- **Before**: "I can't reach my 500 customers!" → User leaves
- **After**: "I sent WhatsApp to all customers in 5 minutes!" → User stays

---

## File Locations

### Actions:
- `src/app/actions/wati-actions.ts` - WATI WhatsApp
- `src/app/actions/aisensy-actions.ts` - AiSensy WhatsApp
- `src/app/actions/msg91-actions.ts` - MSG91 SMS
- `src/app/actions/fast2sms-actions.ts` - Fast2SMS

### Components:
- `src/components/messaging/whatsapp/` - WhatsApp UI
- `src/components/messaging/sms/` - SMS UI
- `src/components/messaging/templates/` - Template management

### Pages:
- `src/app/dashboard/campaigns/whatsapp/` - WhatsApp campaigns
- `src/app/dashboard/campaigns/sms/` - SMS campaigns
- `src/app/dashboard/settings/integrations/` - API connections

---

*This guide provides complete implementation details for the CRITICAL messaging platforms feature. Follow the phases in order for maximum user impact.*

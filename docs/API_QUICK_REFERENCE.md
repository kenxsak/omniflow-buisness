# OmniFlow API Quick Reference

## Overview

OmniFlow uses Next.js 15 Server Actions for most API functionality. This quick reference covers all available endpoints and actions.

---

## Authentication

All authenticated endpoints require a valid Firebase token.

### Getting Auth Token (Client)

```typescript
import { auth } from '@/lib/firebase';
const token = await auth.currentUser?.getIdToken();
```

---

## Server Actions Quick Reference

### Lead/Contact Actions

**Location:** `src/app/actions/lead-actions.ts`

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getLeads` | `companyId: string` | `Lead[]` | Get all leads for company |
| `getLead` | `leadId: string` | `Lead \| null` | Get single lead |
| `createLead` | `data: LeadInput` | `{success, id?, error?}` | Create new lead |
| `updateLead` | `leadId, data` | `{success, error?}` | Update lead |
| `deleteLead` | `leadId: string` | `{success, error?}` | Delete lead |

**Example:**
```typescript
import { createLead } from '@/app/actions/lead-actions';

const result = await createLead({
  companyId: 'company123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  status: 'New',
  source: 'Website'
});
```

### Activity Actions

**Location:** `src/app/actions/activity-actions.ts`

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getActivitiesForContact` | `companyId, contactId, limit?` | `Activity[]` | Get contact activities |
| `getRecentActivities` | `companyId, limit?` | `Activity[]` | Get recent activities |
| `createActivity` | `activity: ActivityInput` | `{success, id?, error?}` | Create activity |
| `logEmailActivity` | `companyId, contactId, ...` | `{success}` | Log email sent |
| `logSMSActivity` | `companyId, contactId, ...` | `{success}` | Log SMS sent |
| `logWhatsAppActivity` | `companyId, contactId, ...` | `{success}` | Log WhatsApp sent |
| `logNoteActivity` | `companyId, contactId, ...` | `{success}` | Log note |
| `logStatusChange` | `companyId, contactId, ...` | `{success}` | Log status change |

### Deal Actions

**Location:** `src/app/actions/deal-actions.ts`

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getDealsForCompany` | `companyId, status?` | `Deal[]` | Get company deals |
| `getDealsForContact` | `companyId, contactId` | `Deal[]` | Get contact deals |
| `getDealById` | `dealId: string` | `Deal \| null` | Get single deal |
| `createDeal` | `deal: DealInput` | `{success, id?, error?}` | Create deal |
| `updateDeal` | `dealId, updates, userId, userName` | `{success, error?}` | Update deal |
| `deleteDeal` | `dealId: string` | `{success, error?}` | Delete deal |
| `getDealStats` | `companyId: string` | `DealStats` | Get deal statistics |
| `getWeightedPipelineValue` | `companyId: string` | `number` | Get weighted value |

### Campaign Actions

**Location:** `src/app/actions/campaign-actions.ts`

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getCampaigns` | `companyId: string` | `Campaign[]` | Get all campaigns |
| `createCampaign` | `data: CampaignInput` | `{success, id?}` | Create campaign |
| `sendCampaign` | `campaignId: string` | `{success, error?}` | Send campaign |

### Task Actions

**Location:** `src/app/actions/task-actions.ts`

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getTasks` | `companyId: string` | `Task[]` | Get all tasks |
| `createTask` | `data: TaskInput` | `{success, id?}` | Create task |
| `updateTask` | `taskId, data` | `{success, error?}` | Update task |
| `deleteTask` | `taskId: string` | `{success, error?}` | Delete task |

### Payment Actions

**Stripe:** `src/app/actions/stripe-payment-actions.ts`

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `createStripeCheckoutSession` | `{idToken, planId, billingCycle}` | `{success, session?}` | Create checkout |
| `handleStripePaymentSuccess` | `sessionId: string` | `{success, error?}` | Handle payment |
| `cancelStripeSubscription` | `{idToken}` | `{success, error?}` | Cancel subscription |
| `getStripePortalUrl` | `{idToken}` | `{success, url?}` | Get billing portal |

**Razorpay:** `src/app/actions/razorpay-payment-actions.ts`

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `createRazorpayOrder` | `{idToken, planId, billingCycle}` | `{success, order?}` | Create order |
| `verifyRazorpayPayment` | `{idToken, orderId, paymentId, signature}` | `{success, error?}` | Verify payment |
| `getRazorpayPublicKey` | none | `{success, key?}` | Get public key |

### AI Actions

**Location:** `src/app/actions/ai-actions.ts`

| Action | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `generateContent` | `{type, prompt, ...}` | `{success, content?}` | Generate AI content |
| `generateImage` | `{prompt, ...}` | `{success, imageUrl?}` | Generate image |
| `getAICredits` | `companyId: string` | `{credits, used}` | Get credit balance |

---

## API Routes

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T10:00:00Z"
}
```

### Geo Detection

```
GET /api/geo-detect
```

**Response:**
```json
{
  "country": "IN",
  "currency": "INR",
  "region": "india"
}
```

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/stripe` | POST | Stripe payment webhooks |
| `/api/webhooks/razorpay` | POST | Razorpay payment webhooks |
| `/api/webhooks/meta-whatsapp` | POST | WhatsApp message webhooks |
| `/api/webhooks/voice-chat` | POST | Voice chat webhooks |

### Cron Jobs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/run-campaign-jobs` | POST | Process campaign queue |
| `/api/run-automations` | POST | Run email automations |
| `/api/cron/appointment-reminders` | POST | Send appointment reminders |

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Standard API | 1000 requests | 15 minutes |
| Auth endpoints | 10 requests | 15 minutes |
| AI endpoints | 20 requests | 1 minute |

---

## Data Types

### Lead

```typescript
interface Lead {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Won' | 'Lost';
  source: string;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
  lastContacted?: Date;
}
```

### Activity

```typescript
interface Activity {
  id: string;
  companyId: string;
  contactId: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'meeting' | 'note' | 'task';
  subject?: string;
  content: string;
  author: string;
  authorName?: string;
  occurredAt: Date;
}
```

### Deal

```typescript
interface Deal {
  id: string;
  companyId: string;
  name: string;
  amount: number;
  currency: string;
  probability: number;
  status: 'proposal' | 'negotiation' | 'closing' | 'won' | 'lost';
  expectedCloseDate?: Date;
  contactId: string;
}
```

### Campaign

```typescript
interface Campaign {
  id: string;
  companyId: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  content: string;
  subject?: string; // For email
  recipientCount: number;
  createdAt: Date;
}
```

---

## Error Handling

All actions return consistent error responses:

```typescript
interface ActionResult {
  success: boolean;
  id?: string;      // On create operations
  error?: string;   // Error message if success=false
}
```

### Common Error Codes

| Error | Description |
|-------|-------------|
| `Authentication required` | User not logged in |
| `Permission denied` | User lacks required role |
| `Not found` | Resource doesn't exist |
| `Validation failed` | Input validation error |
| `Rate limit exceeded` | Too many requests |

---

## Usage Examples

### Create Lead with Activity

```typescript
import { createLead } from '@/app/actions/lead-actions';
import { logNoteActivity } from '@/app/actions/activity-actions';

// Create lead
const leadResult = await createLead({
  companyId: user.companyId,
  name: 'Jane Smith',
  email: 'jane@company.com',
  status: 'New',
  source: 'Referral'
});

if (leadResult.success && leadResult.id) {
  // Add initial note
  await logNoteActivity(
    user.companyId,
    leadResult.id,
    'Initial contact made via referral from existing customer.',
    user.uid,
    user.displayName
  );
}
```

### Process Payment

```typescript
import { createStripeCheckoutSession } from '@/app/actions/stripe-payment-actions';

const token = await auth.currentUser?.getIdToken();

const result = await createStripeCheckoutSession({
  idToken: token,
  planId: 'pro',
  billingCycle: 'monthly'
});

if (result.success && result.session?.url) {
  window.location.href = result.session.url;
}
```

---

## Security Notes

- All server actions verify authentication via `verifyAuthToken()`
- Company data isolation enforced via `companyId` checks
- Input validation using Zod schemas
- Rate limiting on sensitive endpoints
- Webhook signatures verified for payment providers

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial API quick reference |

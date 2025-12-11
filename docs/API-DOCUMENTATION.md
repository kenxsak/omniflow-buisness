# OmniFlow API Documentation

## Overview

OmniFlow uses Next.js 15 server actions for most API functionality. This document describes the available actions and their usage.

## Authentication

All authenticated endpoints require a valid Firebase authentication token passed via cookie (`firebase-auth-token`).

## Server Actions

### Lead/Contact Actions

Located in: `src/app/actions/lead-actions.ts`

#### `getLeads(companyId: string): Promise<Lead[]>`
Fetches all leads for a company.

#### `getLead(leadId: string): Promise<Lead | null>`
Fetches a single lead by ID.

#### `createLead(data: LeadInput): Promise<{ success: boolean; id?: string; error?: string }>`
Creates a new lead.

#### `updateLead(leadId: string, data: Partial<LeadInput>): Promise<{ success: boolean; error?: string }>`
Updates an existing lead.

#### `deleteLead(leadId: string): Promise<{ success: boolean; error?: string }>`
Deletes a lead.

### Activity Actions

Located in: `src/app/actions/activity-actions.ts`

#### `getActivitiesForContact(companyId: string, contactId: string, limit?: number): Promise<Activity[]>`
Fetches activity history for a specific contact.

#### `getRecentActivities(companyId: string, limit?: number): Promise<Activity[]>`
Fetches recent activities across all contacts.

#### `createActivity(activity: ActivityInput): Promise<{ success: boolean; id?: string; error?: string }>`
Creates a new activity.

#### `logEmailActivity(companyId, contactId, subject, content, author, authorName, campaignId?, campaignName?): Promise<{ success: boolean }>`
Logs an email activity.

#### `logSMSActivity(companyId, contactId, content, author, authorName, recipientPhone, campaignId?, campaignName?): Promise<{ success: boolean }>`
Logs an SMS activity.

#### `logWhatsAppActivity(companyId, contactId, content, author, authorName, recipientPhone, campaignId?, campaignName?): Promise<{ success: boolean }>`
Logs a WhatsApp activity.

#### `logNoteActivity(companyId, contactId, content, author, authorName): Promise<{ success: boolean }>`
Logs a note for a contact.

#### `logStatusChange(companyId, contactId, oldStatus, newStatus, author, authorName): Promise<{ success: boolean }>`
Logs a status change activity.

### Deal Actions

Located in: `src/app/actions/deal-actions.ts`

#### `getDealsForCompany(companyId: string, status?: DealStatus): Promise<Deal[]>`
Fetches deals for a company, optionally filtered by status.

#### `getDealsForContact(companyId: string, contactId: string): Promise<Deal[]>`
Fetches deals linked to a specific contact.

#### `getDealById(dealId: string): Promise<Deal | null>`
Fetches a single deal by ID.

#### `createDeal(deal: DealInput): Promise<{ success: boolean; id?: string; error?: string }>`
Creates a new deal.

#### `updateDeal(dealId: string, updates: Partial<DealInput>, userId: string, userName: string): Promise<{ success: boolean; error?: string }>`
Updates an existing deal.

#### `deleteDeal(dealId: string): Promise<{ success: boolean; error?: string }>`
Deletes a deal.

#### `getDealStats(companyId: string): Promise<DealStats>`
Returns aggregated deal statistics for a company.

#### `getWeightedPipelineValue(companyId: string): Promise<number>`
Calculates weighted pipeline value (sum of amount * probability).

### Campaign Actions

Located in: `src/app/actions/campaign-actions.ts`

#### `getCampaigns(companyId: string): Promise<Campaign[]>`
Fetches all campaigns.

#### `createCampaign(data: CampaignInput): Promise<{ success: boolean; id?: string }>`
Creates a new campaign.

#### `sendCampaign(campaignId: string): Promise<{ success: boolean; error?: string }>`
Sends a campaign to its recipients.

## API Routes

### Rate Limited Endpoints

All API routes are protected by rate limiting:
- Standard endpoints: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes
- AI endpoints: 20 requests per minute

### `/api/geo-detect`
- Method: GET
- Description: Detects user's country for regional settings

### `/api/ping`
- Method: GET
- Description: Health check endpoint

### `/api/webhooks/stripe`
- Method: POST
- Description: Stripe webhook handler

### `/api/webhooks/razorpay`
- Method: POST
- Description: Razorpay webhook handler

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
  attributes?: Record<string, any>;
  brevoSyncStatus?: 'synced' | 'pending' | 'failed' | 'unsynced';
  hubspotSyncStatus?: 'synced' | 'pending' | 'failed' | 'unsynced';
}
```

### Activity
```typescript
interface Activity {
  id: string;
  companyId: string;
  contactId: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'meeting' | 'note' | 'task' | 'deal_created' | 'deal_updated' | 'status_change';
  subject?: string;
  content: string;
  author: string;
  authorName?: string;
  occurredAt: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
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
  actualCloseDate?: Date;
  contactId: string;
  contactName?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

All actions return consistent error responses:

```typescript
interface ActionResult {
  success: boolean;
  id?: string;      // Returned on create
  error?: string;   // Error message if success is false
}
```

## Security

- All requests are validated for authentication
- Rate limiting prevents abuse
- Input validation using Zod schemas
- CORS configured for allowed origins only

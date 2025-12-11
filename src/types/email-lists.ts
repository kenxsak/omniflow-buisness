
export type EmailListType = 'free-trial' | 'paid-customer' | 'churned' | 'newsletter' | 'prospects' | 'custom';

export type SuppressionReason = 'unsubscribe' | 'hard_bounce' | 'soft_bounce' | 'complaint' | 'manual' | 'invalid_email';
export type SuppressionSource = 'brevo' | 'sender' | 'smtp' | 'manual' | 'system';
export type DeliveryProvider = 'brevo' | 'sender' | 'smtp';

export interface AutomationDeliveryConfig {
  provider: DeliveryProvider;
  brevoListId?: number;
  senderListId?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
}

export interface EmailContact {
  id: string;
  listId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tags?: string[];
  status: 'active' | 'unsubscribed' | 'bounced';
  createdAt: any;
  lastEmailSent?: any;
  emailsSent?: number;
  lastSyncedAt?: any;
  syncVersion?: number;
}

export interface EmailList {
  id: string;
  name: string;
  description?: string;
  type: EmailListType;
  companyId: string;
  contactCount: number;
  createdAt: any;
  updatedAt?: any;
  automationId?: string;
}

export interface EmailAutomationSequence {
  id: string;
  name: string;
  description: string;
  listType: EmailListType;
  status: 'active' | 'inactive' | 'draft';
  companyId: string;
  steps: EmailAutomationStep[];
  createdAt: any;
  updatedAt?: any;
  deliveryConfig?: AutomationDeliveryConfig;
  linkedListId?: string;
  stats?: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalUnsubscribed: number;
  };
}

export interface EmailAutomationStep {
  id: string;
  type: 'email' | 'delay';
  order: number;
  subject?: string;
  content?: string;
  delayDays?: number;
  delayHours?: number;
}

export interface ContactAutomationState {
  id: string;
  contactId: string;
  contactEmail: string;
  listId: string;
  automationId: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  currentStepIndex: number;
  nextStepTime: any;
  emailsSentInSequence: number;
  createdAt: any;
  updatedAt: any;
  lastError?: string;
}

export interface EmailSuppressionEntry {
  id: string;
  email: string;
  reason: SuppressionReason;
  source: SuppressionSource;
  providerEventId?: string;
  campaignId?: string;
  messageId?: string;
  metadata?: Record<string, any>;
  createdAt: any;
  updatedAt?: any;
}

export interface EmailSyncAuditLog {
  id: string;
  listId: string;
  listName: string;
  provider: DeliveryProvider;
  providerListId?: string | number;
  syncType: 'full' | 'delta' | 'initial';
  status: 'started' | 'completed' | 'failed' | 'partial';
  totalContacts: number;
  syncedCount: number;
  skippedCount: number;
  suppressedCount: number;
  failedCount: number;
  errors?: string[];
  durationMs?: number;
  startedAt: any;
  completedAt?: any;
}

export interface ContactSyncState {
  id: string;
  contactId: string;
  email: string;
  provider: 'brevo' | 'sender';
  providerContactId?: string | number;
  providerListIds?: (string | number)[];
  lastSyncedAt: any;
  syncStatus: 'synced' | 'pending' | 'failed' | 'dirty' | 'skipped';
  skipReason?: 'no_email' | 'invalid_email' | 'inactive' | 'suppressed';
  lastError?: string;
  version: number;
}

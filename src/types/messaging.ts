/**
 * Messaging Platform Types
 * Types for WhatsApp Business API and Bulk SMS integrations
 */

// ===== WhatsApp Types =====

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  components?: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  }[];
}

export interface WhatsAppCampaign {
  id: string;
  companyId: string;
  name: string;
  platform: 'meta' | 'authkey' | 'wati' | 'aisensy' | 'interakt' | 'unified';
  templateId: string;
  templateName: string;
  recipients: WhatsAppRecipient[];
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  scheduledAt?: string; // ISO timestamp
  sentAt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  createdBy: string; // User ID
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied: number;
  };
  estimatedCost?: number; // in USD
  actualCost?: number; // in USD
  languageCode?: string; // Required for Meta, optional for others
}

export interface WhatsAppRecipient {
  id?: string; // Firestore document ID
  phone: string; // With country code, e.g., +919876543210
  name?: string;
  variables?: Record<string, string>; // Template variable values
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  messageId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

// ===== SMS Types =====

export interface SMSCampaign {
  id: string;
  companyId: string;
  name: string;
  platform: 'msg91' | 'twofactor' | 'fast2sms' | 'twilio';
  messageType: 'promotional' | 'transactional' | 'otp';
  message: string;
  recipients: SMSRecipient[];
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  scheduledAt?: string; // ISO timestamp
  sentAt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  createdBy: string; // User ID
  stats: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
  };
  estimatedCost?: number; // in USD
  actualCost?: number; // in USD
  dltTemplateId?: string; // For India DLT compliance
  senderId?: string; // Sender ID for SMS
}

export interface SMSRecipient {
  id?: string; // Firestore document ID
  phone: string; // With country code
  name?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'failed';
  messageId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

// ===== API Configuration Types =====

export interface WATIConfig {
  apiKey: string;
  accountUrl: string; // e.g., "https://live-server-12345.wati.io"
  connected: boolean;
  connectedAt?: string;
}

export interface AiSensyConfig {
  apiKey: string;
  instanceId: string;
  connected: boolean;
  connectedAt?: string;
}

export interface MSG91Config {
  authKey: string;
  senderId: string; // Registered sender ID
  connected: boolean;
  connectedAt?: string;
}

export interface TwoFactorConfig {
  apiKey: string;
  connected: boolean;
  connectedAt?: string;
}

// ===== Extended Company API Keys Type =====
// This extends the existing StoredApiKeys type

export interface MessagingAPIKeys {
  // WhatsApp Platforms
  wati?: WATIConfig;
  aisensy?: AiSensyConfig;
  interakt?: {
    apiKey: string;
    connected: boolean;
    connectedAt?: string;
  };
  
  // SMS Platforms
  msg91?: MSG91Config;
  twoFactor?: TwoFactorConfig;
  fast2sms?: {
    apiKey: string;
    connected: boolean;
    connectedAt?: string;
  };
}

// ===== Request/Response Types =====

export interface SendBulkWhatsAppInput {
  templateName: string;
  recipients: WhatsAppRecipient[];
  broadcastName?: string;
  scheduledAt?: string; // ISO timestamp for scheduling
}

export interface SendBulkWhatsAppResult {
  success: boolean;
  campaignId?: string;
  messageId?: string;
  error?: string;
  failedRecipients?: {
    phone: string;
    error: string;
  }[];
}

export interface SendBulkSMSInput {
  message: string;
  recipients: SMSRecipient[];
  messageType?: 'promotional' | 'transactional';
  senderId?: string;
  dltTemplateId?: string;
  scheduledAt?: string; // ISO timestamp for scheduling
}

export interface SendBulkSMSResult {
  success: boolean;
  campaignId?: string;
  messageId?: string;
  error?: string;
  failedRecipients?: {
    phone: string;
    error: string;
  }[];
}

// ===== Delivery Status Types =====

export interface MessageDeliveryStatus {
  messageId: string;
  recipientPhone: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string; // ISO timestamp
  errorCode?: string;
  errorMessage?: string;
}

export interface CampaignStats {
  campaignId: string;
  total: number;
  sent: number;
  delivered: number;
  read?: number; // WhatsApp only
  failed: number;
  replied?: number; // WhatsApp only
  deliveryRate: number; // Percentage
  readRate?: number; // WhatsApp only, percentage
  failureRate: number; // Percentage
  estimatedCost: number;
  actualCost?: number;
}

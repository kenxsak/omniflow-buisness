/**
 * Campaign Job Queue Types
 * 
 * This defines the structure for background campaign jobs that process
 * bulk Email, SMS, and WhatsApp campaigns asynchronously.
 */

export type CampaignJobType = 'email' | 'sms' | 'whatsapp';
export type CampaignJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

/**
 * Recipient for a campaign job
 */
export interface CampaignRecipient {
  phone?: string;
  email?: string;
  name?: string;
  customFields?: Record<string, string>; // For template personalization
}

/**
 * Email campaign specific data
 */
export interface EmailCampaignData {
  subject: string;
  htmlContent: string;
  senderName: string;
  senderEmail: string;
  tag?: string;
  provider?: 'brevo' | 'sender' | 'smtp'; // Email service provider
}

/**
 * SMS campaign specific data
 */
export interface SMSCampaignData {
  message: string;
  senderId: string;
  messageType: 'promotional' | 'transactional';
  dltTemplateId?: string;
  provider?: 'msg91' | 'fast2sms' | 'twilio'; // SMS service provider
}

/**
 * WhatsApp campaign specific data
 */
export interface WhatsAppCampaignData {
  templateName: string;
  broadcastName: string;
  parameters?: string[]; // Ordered array of template parameter values (for {{1}}, {{2}}, etc.)
  provider?: 'authkey' | 'aisensy' | 'gupshup'; // WhatsApp service provider
}

/**
 * Progress tracking for campaign jobs
 */
export interface CampaignJobProgress {
  total: number;
  sent: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
}

/**
 * Retry configuration
 */
export interface CampaignJobRetry {
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string; // ISO timestamp
  nextRetryAt?: string; // ISO timestamp
  backoffMs: number; // Exponential backoff in milliseconds
}

/**
 * Campaign Job - main data structure
 */
export interface CampaignJob {
  id: string;
  companyId: string;
  createdBy: string;
  jobType: CampaignJobType;
  status: CampaignJobStatus;
  
  // Campaign metadata
  campaignName: string;
  
  // Campaign-specific data (only one will be populated based on jobType)
  emailData?: EmailCampaignData;
  smsData?: SMSCampaignData;
  whatsappData?: WhatsAppCampaignData;
  
  // Recipients
  recipients: CampaignRecipient[];
  
  // Progress tracking
  progress: CampaignJobProgress;
  
  // Retry logic
  retry: CampaignJobRetry;
  
  // Error tracking
  error?: string;
  failedRecipients?: Array<{
    recipient: CampaignRecipient;
    error: string;
  }>;
  
  // Timestamps
  createdAt: string; // ISO timestamp
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

/**
 * Constants for campaign job processing
 */
export const CAMPAIGN_JOB_CONSTANTS = {
  BATCH_SIZE: 100, // Process 100 recipients per batch
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 5 * 60 * 1000, // 5 minutes
  MAX_BACKOFF_MS: 60 * 60 * 1000, // 1 hour
  JOB_TIMEOUT_MS: 60 * 60 * 1000, // 60 minutes per job (increased to handle slow API responses)
} as const;

/**
 * Result of creating a campaign job
 */
export interface CreateCampaignJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

/**
 * Result of processing a campaign job
 */
export interface ProcessCampaignJobResult {
  success: boolean;
  jobId: string;
  sent: number;
  failed: number;
  error?: string;
}

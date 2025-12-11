import { Timestamp } from 'firebase/firestore';

export type CampaignTone = 'Formal' | 'Informal' | 'Friendly' | 'Professional' | 'Enthusiastic' | 'Urgent';
export type CampaignChannel = 'email' | 'sms' | 'whatsapp';
export type CampaignDraftStatus = 'draft' | 'generating' | 'ready' | 'publishing' | 'published' | 'failed';

export interface ParsedCampaignBrief {
  campaignGoal: string;
  targetAudience: string;
  keyPoints: string;
  tone: CampaignTone;
  callToAction: string;
  callToActionLink?: string;
  businessContext?: string;
}

export interface EmailContent {
  subjectLines: string[];
  selectedSubjectIndex: number;
  htmlBody: string;
  ctaSuggestions: string[];
}

export interface SMSContent {
  message: string;
}

export interface WhatsAppContent {
  message: string;
}

export type EmailProvider = 'brevo' | 'sender' | 'smtp';

export interface EmailConfig {
  provider: EmailProvider;
  listId: string;
  listName: string;
  recipientCount: number;
}

export interface SMSConfig {
  listId: string;
  listName: string;
  recipientCount: number;
}

export interface WhatsAppConfig {
  listId: string;
  listName: string;
  recipientCount: number;
}

export interface PublishedCampaignIds {
  emailCampaignId?: string;
  smsCampaignId?: string;
  whatsappCampaignId?: string;
}

export interface UnifiedCampaignDraft {
  id: string;
  companyId: string;
  createdBy: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  
  originalPrompt: string;
  parsedBrief?: ParsedCampaignBrief;
  
  emailContent?: EmailContent;
  smsContent?: SMSContent;
  whatsappContent?: WhatsAppContent;
  
  selectedChannels: CampaignChannel[];
  emailConfig?: EmailConfig;
  smsConfig?: SMSConfig;
  whatsappConfig?: WhatsAppConfig;
  scheduledFor?: Timestamp | string | null;
  
  status: CampaignDraftStatus;
  publishedCampaignIds?: PublishedCampaignIds;
  
  aiCreditsConsumed: number;
  generationDurationMs: number;
}

export interface CreateAICampaignDraftInput {
  companyId: string;
  createdBy: string;
  originalPrompt: string;
  parsedBrief?: ParsedCampaignBrief;
  emailContent?: EmailContent;
  smsContent?: SMSContent;
  whatsappContent?: WhatsAppContent;
  selectedChannels?: CampaignChannel[];
}

export interface UpdateAICampaignDraftInput {
  id: string;
  companyId: string;
  parsedBrief?: ParsedCampaignBrief;
  emailContent?: EmailContent;
  smsContent?: SMSContent;
  whatsappContent?: WhatsAppContent;
  selectedChannels?: CampaignChannel[];
  emailConfig?: EmailConfig;
  smsConfig?: SMSConfig;
  whatsappConfig?: WhatsAppConfig;
  scheduledFor?: string | null;
  status?: CampaignDraftStatus;
}

export interface PublishAICampaignInput {
  draftId: string;
  companyId: string;
  userId: string;
  idToken: string;
}

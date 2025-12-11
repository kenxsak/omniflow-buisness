export type TemplateType = 'email' | 'sms';

export type Industry = 
  | 'general' 
  | 'restaurant' 
  | 'ecommerce' 
  | 'realestate' 
  | 'salon' 
  | 'coaching' 
  | 'service';

export type TemplateCategory = 
  | 'welcome' 
  | 'promotional' 
  | 'followup' 
  | 'reminder' 
  | 'abandoned_cart' 
  | 'special_offer';

export interface Template {
  id: string;
  type: TemplateType;
  industry: Industry[];
  category: TemplateCategory;
  name: string;
  description: string;
  subject?: string;
  content: string;
  variables: string[];
  popularity: number;
  createdBy: 'omniflow' | string;
  createdAt: string;
  
  companyId?: string;
  userId?: string;
  userName?: string;
  isPublic?: boolean;
  usageCount?: number;
  rating?: number;
  ratingCount?: number;
  tags?: string[];
}

export interface TemplateRating {
  id: string;
  templateId: string;
  userId: string;
  userName: string;
  companyId: string;
  rating: number;
  review?: string;
  createdAt: string;
}

export interface TemplateUsage {
  id: string;
  templateId: string;
  userId: string;
  companyId: string;
  usedAt: string;
  type: TemplateType;
}

export interface ApplyTemplateInput {
  templateId: string;
  variableValues: Record<string, string>;
}

export interface ApplyTemplateOutput {
  subject?: string;
  content: string;
}

export interface CreateCustomTemplateInput {
  type: TemplateType;
  industry: Industry[];
  category: TemplateCategory;
  name: string;
  description: string;
  subject?: string;
  content: string;
  variables: string[];
  isPublic?: boolean;
  tags?: string[];
}

export type EmailProvider = 'brevo' | 'sender' | 'smtp';

export interface SavedEmailTemplate {
  id: string;
  companyId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  name: string;
  description?: string;
  
  subject: string;
  htmlContent: string;
  previewText?: string;
  
  originalPrompt?: string;
  sourceDraftId?: string;
  
  lastSentAt?: string;
  sendCount: number;
  
  tags?: string[];
}

export interface CreateSavedEmailTemplateInput {
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  previewText?: string;
  originalPrompt?: string;
  sourceDraftId?: string;
  tags?: string[];
}

export interface UpdateSavedEmailTemplateInput {
  id: string;
  name?: string;
  description?: string;
  subject?: string;
  htmlContent?: string;
  previewText?: string;
  tags?: string[];
}

export interface SendTemplateConfig {
  templateId: string;
  provider: EmailProvider;
  providerListId: string;
  providerListName: string;
  internalListId: string;
  internalListName: string;
  recipientCount: number;
}

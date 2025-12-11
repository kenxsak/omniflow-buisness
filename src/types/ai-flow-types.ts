/**
 * AI Flow Type Definitions
 * 
 * This file contains type definitions for AI flows WITHOUT importing the actual flow code.
 * This prevents massive bundle sizes when client components import server actions that use these types.
 * 
 * IMPORTANT: Keep these types in sync with the corresponding Zod schemas in the AI flow files.
 */

// Parse Campaign Brief Flow Types
export interface ParseCampaignBriefInput {
  campaignPrompt: string;
}

export interface ParseCampaignBriefOutput {
  campaignGoal: string;
  targetAudience: string;
  keyPoints: string;
  tone: 'Formal' | 'Informal' | 'Friendly' | 'Professional' | 'Enthusiastic' | 'Urgent';
  callToAction: string;
  callToActionLink?: string;
  businessContext?: string;
}

// Generate Subject and CTA Flow Types
export interface GenerateSubjectAndCtaInput {
  campaignTopicOrGoal: string;
  numSuggestions: number; // Required (has default value of 3 in the flow)
  targetAudience?: string;
  desiredToneForSubject?: 'Professional' | 'Friendly' | 'Urgent' | 'Playful' | 'Intriguing' | 'Benefit-driven';
  desiredToneForCta?: 'Urgent' | 'Benefit-driven' | 'Clear & Direct' | 'Playful' | 'Intriguing' | 'Reassuring';
}

export interface GenerateSubjectAndCtaOutput {
  subjectLineSuggestions: string[];
  ctaSuggestions: string[];
}

// Generate Email Content Flow Types
export interface GenerateEmailContentInput {
  campaignGoal: string;
  targetAudience: string;
  keyPoints: string;
  tone: 'Formal' | 'Informal' | 'Friendly' | 'Professional' | 'Enthusiastic' | 'Urgent';
  callToAction?: string;
  callToActionLink?: string;
}

export interface GenerateEmailContentOutput {
  htmlContent: string;
}

// Generate Unified Campaign Flow Types
export interface GenerateUnifiedCampaignInput {
  campaignGoal: string;
  targetAudience: string;
  keyPoints: string;
  tone: 'Formal' | 'Informal' | 'Friendly' | 'Professional' | 'Enthusiastic' | 'Urgent';
  callToAction: string;
  callToActionLink?: string;
  businessContext?: string;
}

export interface GenerateUnifiedCampaignOutput {
  email: {
    subjectLines: string[];
    htmlContent: string;
    ctaSuggestions: string[];
  };
  sms: {
    message: string;
  };
  whatsapp: {
    message: string;
  };
}

'use server';

/**
 * Tracked AI Content Actions - Content generation features with usage tracking
 */

import { executeTrackedOperation, type TrackedOperationResult } from './ai-tracking-util';
import { generateSocialMediaContent, type GenerateSocialMediaContentInput, type GenerateSocialMediaContentOutput } from '@/ai/flows/generate-social-media-content-flow';
import { generateEmailContent, type GenerateEmailContentInput, type GenerateEmailContentOutput } from '@/ai/flows/generate-email-content-flow';
import { generateSmsContent, type GenerateSmsContentInput, type GenerateSmsContentOutput } from '@/ai/flows/generate-sms-content-flow';
import { generateWhatsappMessage, type GenerateWhatsappMessageInput, type GenerateWhatsappMessageOutput } from '@/ai/flows/generate-whatsapp-message-flow';
import { generateEnhancedPrompt, type GenerateEnhancedPromptInput, type GenerateEnhancedPromptOutput } from '@/ai/flows/generate-enhanced-prompt-flow';
import { generateHashtagSuggestions, type GenerateHashtagSuggestionsInput, type GenerateHashtagSuggestionsOutput } from '@/ai/flows/generate-hashtag-suggestions-flow';
import { generateSubjectAndCtas, type GenerateSubjectAndCtaInput, type GenerateSubjectAndCtaOutput } from '@/ai/flows/generate-subject-and-cta-flow';
import { getTrendingTopicSuggestions, type GetTrendingTopicSuggestionsInput, type GetTrendingTopicSuggestionsOutput } from '@/ai/flows/get-trending-topic-suggestions-flow';

export async function generateTrackedSocialContentAction(
  companyId: string,
  userId: string,
  input: GenerateSocialMediaContentInput
): Promise<TrackedOperationResult<GenerateSocialMediaContentOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Content Factory',
    input,
    generateSocialMediaContent
  );
}

export async function generateTrackedEmailContentAction(
  companyId: string,
  userId: string,
  input: GenerateEmailContentInput
): Promise<TrackedOperationResult<GenerateEmailContentOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Email Content AI',
    input,
    generateEmailContent
  );
}

export async function generateTrackedSmsContentAction(
  companyId: string,
  userId: string,
  input: GenerateSmsContentInput
): Promise<TrackedOperationResult<GenerateSmsContentOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'SMS Content AI',
    input,
    generateSmsContent
  );
}

export async function generateTrackedWhatsappMessageAction(
  companyId: string,
  userId: string,
  input: GenerateWhatsappMessageInput
): Promise<TrackedOperationResult<GenerateWhatsappMessageOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'WhatsApp Message AI',
    input,
    generateWhatsappMessage
  );
}

export async function generateTrackedEnhancedPromptAction(
  companyId: string,
  userId: string,
  input: GenerateEnhancedPromptInput
): Promise<TrackedOperationResult<GenerateEnhancedPromptOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Prompt Enhancer',
    input,
    generateEnhancedPrompt
  );
}

export async function generateTrackedHashtagAction(
  companyId: string,
  userId: string,
  input: GenerateHashtagSuggestionsInput
): Promise<TrackedOperationResult<GenerateHashtagSuggestionsOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Hashtag Suggester',
    input,
    generateHashtagSuggestions
  );
}

export async function generateTrackedSubjectAndCtasAction(
  companyId: string,
  userId: string,
  input: GenerateSubjectAndCtaInput
): Promise<TrackedOperationResult<GenerateSubjectAndCtaOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Subject/CTA AI',
    input,
    generateSubjectAndCtas
  );
}

export async function generateTrackedTrendingTopicAction(
  companyId: string,
  userId: string,
  input: GetTrendingTopicSuggestionsInput
): Promise<TrackedOperationResult<GetTrendingTopicSuggestionsOutput>> {
  return await executeTrackedOperation(
    companyId,
    userId,
    'text_generation',
    'gemini-2.0-flash',
    'Trending Topics',
    input,
    getTrendingTopicSuggestions
  );
}

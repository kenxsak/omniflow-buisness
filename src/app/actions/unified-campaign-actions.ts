'use server';

/**
 * Unified Campaign Actions - Server actions for generating complete multi-channel campaigns from a single prompt.
 * 
 * These actions orchestrate the parse-campaign-brief and generate-unified-campaign flows
 * to provide a seamless campaign generation experience across email, SMS, and WhatsApp.
 * 
 * OPTIMIZATION NOTES:
 * - Uses sequential AI calls to prevent memory spikes
 * - Cleans up intermediate results after use
 * - Implements proper error handling to prevent server crashes
 */

import { parseCampaignBrief } from '@/ai/flows/parse-campaign-brief-flow';
import { generateUnifiedCampaign } from '@/ai/flows/generate-unified-campaign-flow';
import { generateSubjectAndCtas } from '@/ai/flows/generate-subject-and-cta-flow';
import { generateEmailContent } from '@/ai/flows/generate-email-content-flow';
import { executeAIOperation } from '@/lib/ai-wrapper';
import { getGeminiApiKeyForCompany } from './ai-api-key-actions';
import { estimateTokenCount } from '@/lib/ai-cost-calculator';
import type { 
  ParseCampaignBriefInput,
  ParseCampaignBriefOutput,
  GenerateUnifiedCampaignOutput,
  GenerateSubjectAndCtaInput,
  GenerateEmailContentInput 
} from '@/types/ai-flow-types';

// Helper to map parsed brief tone to subject/CTA tones
// The parsed brief uses different tone values than the subject/CTA generator
type ParsedTone = 'Formal' | 'Informal' | 'Friendly' | 'Professional' | 'Enthusiastic' | 'Urgent';
type SubjectTone = 'Professional' | 'Friendly' | 'Urgent' | 'Playful' | 'Intriguing' | 'Benefit-driven';
type CtaTone = 'Urgent' | 'Benefit-driven' | 'Clear & Direct' | 'Playful' | 'Intriguing' | 'Reassuring';

function mapToneForSubject(tone: string): SubjectTone {
  const toneMap: Record<ParsedTone, SubjectTone> = {
    'Formal': 'Professional',
    'Informal': 'Friendly',
    'Friendly': 'Friendly',
    'Professional': 'Professional',
    'Enthusiastic': 'Playful',
    'Urgent': 'Urgent',
  };
  return toneMap[tone as ParsedTone] || 'Benefit-driven';
}

function mapToneForCta(tone: string): CtaTone {
  const toneMap: Record<ParsedTone, CtaTone> = {
    'Formal': 'Clear & Direct',
    'Informal': 'Playful',
    'Friendly': 'Reassuring',
    'Professional': 'Benefit-driven',
    'Enthusiastic': 'Urgent',
    'Urgent': 'Urgent',
  };
  return toneMap[tone as ParsedTone] || 'Clear & Direct';
}

// Helper to create a promise with timeout to prevent hanging operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export type UnifiedCampaignActionResult = {
  success: boolean;
  data?: GenerateUnifiedCampaignOutput;
  error?: string;
  parsedBrief?: {
    campaignGoal: string;
    targetAudience: string;
    keyPoints: string;
    tone: string;
    callToAction: string;
    callToActionLink?: string;
    businessContext?: string;
  };
  quotaInfo?: {
    remaining: number;
    limit: number;
    consumed: number;
  };
};

export type EmailCampaignData = {
  subjectLineSuggestions: string[];
  ctaSuggestions: string[];
  htmlContent: string;
};

export type EmailCampaignActionResult = {
  success: boolean;
  data?: EmailCampaignData;
  error?: string;
  parsedBrief?: {
    campaignGoal: string;
    targetAudience: string;
    keyPoints: string;
    tone: string;
    callToAction: string;
    callToActionLink?: string;
    businessContext?: string;
  };
  quotaInfo?: {
    remaining: number;
    limit: number;
    consumed: number;
  };
};

/**
 * Generate a complete multi-channel campaign from a single free-text prompt.
 * 
 * @param companyId - The company ID for tracking and quota management
 * @param userId - The user ID for tracking
 * @param campaignPrompt - Free-text description of the campaign (e.g., "Flash sale - 50% off everything, ends tonight. Target past customers. Urgent tone. CTA: Shop Now")
 * @returns Campaign content for email (subject, body, CTAs), SMS, and WhatsApp
 * 
 * @example
 * const result = await generateUnifiedCampaignAction(companyId, userId, "New product launch! Introducing our AI assistant. Professional tone. Target: tech professionals. CTA: Start Free Trial");
 */
export async function generateUnifiedCampaignAction(companyId: string, userId: string, campaignPrompt: string): Promise<UnifiedCampaignActionResult> {
  try {
    // Validate input
    if (!campaignPrompt || campaignPrompt.trim().length === 0) {
      return {
        success: false,
        error: 'Campaign prompt cannot be empty. Please provide details about your campaign.',
      };
    }

    if (campaignPrompt.trim().length < 10) {
      return {
        success: false,
        error: 'Campaign prompt is too short. Please provide more details about your campaign goals, audience, and messaging.',
      };
    }

    const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);

    // Step 1: Parse the campaign brief with tracking (25s timeout)
    const parseResult = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'unified_campaign_parse',
      apiKeyType,
      operation: async () => {
        try {
          const parseInput: ParseCampaignBriefInput = { campaignPrompt: campaignPrompt.trim() };
          const parsedBrief = await withTimeout(
            parseCampaignBrief(parseInput),
            25000,
            'Parse campaign brief'
          );
          
          const inputTokens = estimateTokenCount(campaignPrompt);
          const outputTokens = estimateTokenCount(JSON.stringify(parsedBrief));
          
          return {
            success: true,
            data: parsedBrief,
            inputTokens,
            outputTokens,
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    });

    if (!parseResult.success || !parseResult.data || !parseResult.data.campaignGoal) {
      return {
        success: false,
        error: parseResult.error || 'Failed to understand the campaign brief. Please try rephrasing your campaign description with clear goals and audience information.',
        quotaInfo: parseResult.quotaInfo,
      };
    }

    const parsedBrief = parseResult.data;

    // Step 2: Generate unified campaign content with tracking (30s timeout)
    const campaignResult = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'unified_campaign_generate',
      apiKeyType,
      operation: async () => {
        try {
          const campaignContent = await withTimeout(
            generateUnifiedCampaign(parsedBrief),
            30000,
            'Generate unified campaign'
          );
          
          const inputTokens = estimateTokenCount(JSON.stringify(parsedBrief));
          const outputTokens = estimateTokenCount(JSON.stringify(campaignContent));
          
          return {
            success: true,
            data: campaignContent,
            inputTokens,
            outputTokens,
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    });

    if (!campaignResult.success || !campaignResult.data || !campaignResult.data.email || !campaignResult.data.sms || !campaignResult.data.whatsapp) {
      return {
        success: false,
        error: campaignResult.error || 'Failed to generate complete campaign content. Please try again or contact support if the issue persists.',
        parsedBrief: parsedBrief,
        quotaInfo: campaignResult.quotaInfo,
      };
    }

    const campaignContent = campaignResult.data;

    // Validate generated content
    if (campaignContent.sms.message.length > 160) {
      // Ensure SMS is within limits
      campaignContent.sms.message = campaignContent.sms.message.substring(0, 157) + '...';
    }

    return {
      success: true,
      data: campaignContent,
      parsedBrief: parsedBrief,
      quotaInfo: campaignResult.quotaInfo,
    };
  } catch (error: any) {
    console.error('Error in generateUnifiedCampaignAction:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while generating your campaign. Please try again.',
    };
  }
}

/**
 * Generate an email-only campaign from a single free-text prompt.
 * This is a more efficient alternative to generateUnifiedCampaignAction when only email content is needed.
 * Reduces AI calls from 5 to 3 for better performance and resource efficiency.
 * 
 * @param companyId - The company ID for tracking and quota management
 * @param userId - The user ID for tracking
 * @param campaignPrompt - Free-text description of the campaign (e.g., "Flash sale - 50% off everything, ends tonight. Target past customers. Urgent tone. CTA: Shop Now")
 * @returns Email campaign content including subject line suggestions, CTA suggestions, and HTML content
 * 
 * @example
 * const result = await generateEmailCampaignAction(companyId, userId, "New product launch! Introducing our AI assistant. Professional tone. Target: tech professionals. CTA: Start Free Trial");
 */
export async function generateEmailCampaignAction(companyId: string, userId: string, campaignPrompt: string): Promise<EmailCampaignActionResult> {
  try {
    // Validate input
    if (!campaignPrompt || campaignPrompt.trim().length === 0) {
      return {
        success: false,
        error: 'Campaign prompt cannot be empty. Please provide details about your campaign.',
      };
    }

    if (campaignPrompt.trim().length < 10) {
      return {
        success: false,
        error: 'Campaign prompt is too short. Please provide more details about your campaign goals, audience, and messaging.',
      };
    }

    const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);

    // Step 1: Parse the campaign brief with tracking (25s timeout)
    const parseResult = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'email_campaign_parse',
      apiKeyType,
      operation: async () => {
        try {
          const parseInput: ParseCampaignBriefInput = { campaignPrompt: campaignPrompt.trim() };
          const parsedBrief = await withTimeout(
            parseCampaignBrief(parseInput),
            25000,
            'Parse email campaign brief'
          );
          
          const inputTokens = estimateTokenCount(campaignPrompt);
          const outputTokens = estimateTokenCount(JSON.stringify(parsedBrief));
          
          return {
            success: true,
            data: parsedBrief,
            inputTokens,
            outputTokens,
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    });

    if (!parseResult.success || !parseResult.data || !parseResult.data.campaignGoal) {
      return {
        success: false,
        error: parseResult.error || 'Failed to understand the campaign brief. Please try rephrasing your campaign description with clear goals and audience information.',
        quotaInfo: parseResult.quotaInfo,
      };
    }

    const parsedBrief = parseResult.data;

    // FIX Issue 1: Convert keyPoints to bullet-point format for better email content quality
    // The email generator expects well-formatted key points (bullet-list or comma-separated)
    // Convert comma-separated string to newline-separated bullet points for optimal readability
    let formattedKeyPoints = parsedBrief.keyPoints;
    
    // Defensive: Handle if keyPoints is an array (could be array of strings or objects)
    if (Array.isArray(formattedKeyPoints)) {
      // Extract text from objects or use strings directly
      const extractedPoints = formattedKeyPoints
        .map(item => typeof item === 'string' ? item : (item.text || item.summary || item.point))
        .filter(Boolean)
        .map(p => String(p).trim())
        .filter(p => p.length > 0);
      
      if (extractedPoints.length > 0) {
        formattedKeyPoints = '• ' + extractedPoints.join('\n• ');
      } else {
        formattedKeyPoints = '';
      }
    } else if (typeof formattedKeyPoints === 'string') {
      // Convert comma-separated to bullet points for better structure
      const points = formattedKeyPoints.split(',').map(p => p.trim()).filter(p => p.length > 0);
      if (points.length > 1) {
        formattedKeyPoints = '• ' + points.join('\n• ');
      }
      // If it's a single point or already formatted, leave as-is
    }

    // Step 2: Generate subject lines and CTAs with tracking (20s timeout)
    const subjectCtaResult = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'email_campaign_subject_cta',
      apiKeyType,
      operation: async () => {
        try {
          const subjectCtaInput: GenerateSubjectAndCtaInput = {
            campaignTopicOrGoal: parsedBrief.campaignGoal,
            targetAudience: parsedBrief.targetAudience,
            desiredToneForSubject: mapToneForSubject(parsedBrief.tone),
            desiredToneForCta: mapToneForCta(parsedBrief.tone),
            numSuggestions: 3,
          };
          const subjectCtaData = await withTimeout(
            generateSubjectAndCtas(subjectCtaInput),
            20000,
            'Generate subject lines and CTAs'
          );
          
          const inputTokens = estimateTokenCount(JSON.stringify(subjectCtaInput));
          const outputTokens = estimateTokenCount(JSON.stringify(subjectCtaData));
          
          return {
            success: true,
            data: subjectCtaData,
            inputTokens,
            outputTokens,
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    });

    if (!subjectCtaResult.success || !subjectCtaResult.data || !subjectCtaResult.data.subjectLineSuggestions || !subjectCtaResult.data.ctaSuggestions) {
      return {
        success: false,
        error: subjectCtaResult.error || 'Failed to generate subject lines and CTAs. Please try again or contact support if the issue persists.',
        parsedBrief: parsedBrief,
        quotaInfo: subjectCtaResult.quotaInfo,
      };
    }

    const subjectCtaData = subjectCtaResult.data;

    // Step 3: Generate email HTML content with tracking (30s timeout)
    const emailContentResult = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'email_campaign_content',
      apiKeyType,
      operation: async () => {
        try {
          const emailContentInput: GenerateEmailContentInput = {
            campaignGoal: parsedBrief.campaignGoal,
            targetAudience: parsedBrief.targetAudience,
            keyPoints: formattedKeyPoints, // Use formatted bullet points instead of raw keyPoints
            tone: parsedBrief.tone as any,
            callToAction: parsedBrief.callToAction,
            callToActionLink: parsedBrief.callToActionLink,
          };
          const emailContent = await withTimeout(
            generateEmailContent(emailContentInput),
            30000,
            'Generate email content'
          );
          
          const inputTokens = estimateTokenCount(JSON.stringify(emailContentInput));
          const outputTokens = estimateTokenCount(emailContent.htmlContent);
          
          return {
            success: true,
            data: emailContent,
            inputTokens,
            outputTokens,
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    });

    if (!emailContentResult.success || !emailContentResult.data || !emailContentResult.data.htmlContent) {
      return {
        success: false,
        error: emailContentResult.error || 'Failed to generate email content. Please try again or contact support if the issue persists.',
        parsedBrief: parsedBrief,
        quotaInfo: emailContentResult.quotaInfo,
      };
    }

    const emailContent = emailContentResult.data;

    // Combine all email data
    const emailCampaignData: EmailCampaignData = {
      subjectLineSuggestions: subjectCtaData.subjectLineSuggestions,
      ctaSuggestions: subjectCtaData.ctaSuggestions,
      htmlContent: emailContent.htmlContent,
    };

    return {
      success: true,
      data: emailCampaignData,
      parsedBrief: parsedBrief,
      quotaInfo: emailContentResult.quotaInfo,
    };
  } catch (error: any) {
    console.error('Error in generateEmailCampaignAction:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while generating your email campaign. Please try again.',
    };
  }
}

/**
 * Validate a campaign prompt before generation (useful for frontend validation).
 * 
 * @param campaignPrompt - The campaign prompt to validate
 * @returns Validation result with any error messages
 */
export async function validateCampaignPrompt(campaignPrompt: string): Promise<{ valid: boolean; error?: string }> {
  if (!campaignPrompt || campaignPrompt.trim().length === 0) {
    return { valid: false, error: 'Campaign prompt cannot be empty.' };
  }

  if (campaignPrompt.trim().length < 10) {
    return { valid: false, error: 'Campaign prompt is too short. Please provide more details.' };
  }

  if (campaignPrompt.trim().length > 5000) {
    return { valid: false, error: 'Campaign prompt is too long. Please keep it under 5000 characters.' };
  }

  return { valid: true };
}

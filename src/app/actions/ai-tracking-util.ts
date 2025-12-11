'use server';

/**
 * AI Tracking Utility - Lightweight shared helper for AI operation tracking
 * 
 * This module contains ONLY the tracking infrastructure with NO AI flow imports.
 * This keeps the bundle size small and prevents compilation issues.
 */

import { executeAIOperation } from '@/lib/ai-wrapper';
import { getGeminiApiKeyForCompany } from './ai-api-key-actions';
import { estimateTokenCount } from '@/lib/ai-cost-calculator';

/**
 * Standard return type for all tracked AI operations
 */
export type TrackedOperationResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  quotaInfo?: {
    remaining: number;
    limit: number;
    consumed: number;
  };
};

/**
 * Generic wrapper for any AI flow that returns a promise.
 * 
 * Handles:
 * - API key retrieval (platform vs BYOK)
 * - Quota checking before execution
 * - Usage tracking after success
 * - Token/character/image count estimation
 * - Proper error handling
 */
export async function executeTrackedOperation<InputType, OutputType>(
  companyId: string,
  userId: string,
  operationType: 'text_generation' | 'image_generation' | 'text_to_speech',
  model: 'gemini-2.0-flash' | 'imagen-4' | 'gemini-tts',
  feature: string,
  input: InputType,
  aiFunction: (input: InputType) => Promise<OutputType>
): Promise<TrackedOperationResult<OutputType>> {
  try {
    const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);

    // BYOK FIX: Use the actual API key type returned from getGeminiApiKeyForCompany
    // When apiKeyType='company_owned', credits are bypassed (company pays Google directly)
    // When apiKeyType='platform', credits are enforced (platform pays and deducts credits)
    const actualApiKeyType = apiKeyType;

    const result = await executeAIOperation<OutputType>({
      companyId,
      userId,
      operationType,
      model,
      feature,
      apiKeyType: actualApiKeyType,
      operation: async () => {
        try {
          // Only add apiKey to input if it's not already present (preserves BYOK keys)
          const inputWithApiKey = {
            ...input,
            apiKey: (input as any).apiKey || apiKey
          };
          const output = await aiFunction(inputWithApiKey);

          // Estimate usage metrics based on operation type
          let metrics: any = {};
          if (operationType === 'text_generation' && output) {
            // A more robust check for different output shapes
            let textContent = '';
            if (typeof output === 'string') {
              textContent = output;
            } else if (typeof output === 'object' && output && 'textContent' in output && typeof (output as any).textContent === 'string') {
              textContent = (output as any).textContent;
            } else if (typeof output === 'object' && output && 'response' in output && typeof (output as any).response === 'string') {
              textContent = (output as any).response;
            } else if (typeof output === 'object' && output && 'variations' in output && Array.isArray((output as any).variations)) {
              textContent = (output as any).variations.map((v: any) => v.textContent || '').join(' ');
            } else if (typeof output === 'object' && output && 'suggestions' in output && Array.isArray((output as any).suggestions)) {
                // For things like keyword suggester or hashtag suggester
                const suggestions = (output as any).suggestions;
                if (suggestions.every((s: any) => typeof s === 'string')) {
                    textContent = suggestions.join(' ');
                } else if (suggestions.every((s: any) => typeof s === 'object' && s.topic)) {
                    textContent = suggestions.map((s: any) => s.topic + ' ' + (s.reasoning || '')).join(' ');
                } else {
                    textContent = JSON.stringify(output);
                }
            } else if (typeof output === 'object') {
              textContent = JSON.stringify(output);
            }
          
            metrics.inputTokens = estimateTokenCount(JSON.stringify(input));
            metrics.outputTokens = estimateTokenCount(textContent);
            metrics.imageCount = 0;
            metrics.characterCount = 0;
          } else if (operationType === 'image_generation') {
              metrics.imageCount = 1;
              metrics.inputTokens = 0;
              metrics.outputTokens = 0;
              metrics.characterCount = 0;
          } else if (operationType === 'text_to_speech' && typeof input === 'object' && input && 'text' in input) {
              metrics.characterCount = (input as any).text.length;
              metrics.inputTokens = 0;
              metrics.outputTokens = 0;
              metrics.imageCount = 0;
          }
          
          return { success: true, data: output, ...metrics };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    });

    return {
      success: result.success,
      data: result.data,
      error: result.error,
      quotaInfo: result.quotaInfo,
    };
  } catch (error: any) {
    console.error(`Error in executeTrackedOperation for ${feature}:`, error);
    return {
      success: false,
      error: error.message || `Failed to execute tracked operation for ${feature}`,
    };
  }
}

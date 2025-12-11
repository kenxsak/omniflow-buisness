
/**
 * AI cost calculation utilities
 * Pure functions for calculating costs and credits
 */

import type {
  AIOperationType,
  AIPricing,
  AICreditConfiguration,
} from '@/types/ai-usage';
import { 
  DEFAULT_AI_PRICING,
  PLATFORM_PRICING_MARGIN,
  DEFAULT_CREDIT_CONFIG
} from '@/types/ai-usage';

/**
 * Calculate the cost for a text generation operation
 */
export function calculateTextGenerationCost(
  inputTokens: number,
  outputTokens: number,
  pricing: AIPricing = DEFAULT_AI_PRICING
): { rawCost: number; platformCost: number; margin: number } {
  const inputCost = (inputTokens / 1_000_000) * pricing.textGeneration.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.textGeneration.output;
  const rawCost = inputCost + outputCost;
  const platformCost = rawCost * PLATFORM_PRICING_MARGIN;
  const margin = platformCost - rawCost;
  
  return { rawCost, platformCost, margin };
}

/**
 * Calculate the cost for image generation
 */
export function calculateImageGenerationCost(
  imageCount: number,
  model: 'imagen-3' | 'imagen-4' | 'imagen-4-ultra' = 'imagen-4',
  pricing: AIPricing = DEFAULT_AI_PRICING
): { rawCost: number; platformCost: number; margin: number } {
  let pricePerImage = pricing.imageGeneration.imagen4;
  
  if (model === 'imagen-3') {
    pricePerImage = pricing.imageGeneration.imagen3;
  } else if (model === 'imagen-4') {
    pricePerImage = pricing.imageGeneration.imagen4;
  } else if (model === 'imagen-4-ultra') {
    pricePerImage = pricing.imageGeneration.imagen4Ultra;
  }
  
  const rawCost = imageCount * pricePerImage;
  const platformCost = rawCost * PLATFORM_PRICING_MARGIN;
  const margin = platformCost - rawCost;
  
  return { rawCost, platformCost, margin };
}

/**
 * Calculate the cost for text-to-speech
 */
export function calculateTTSCost(
  characterCount: number,
  pricing: AIPricing = DEFAULT_AI_PRICING
): { rawCost: number; platformCost: number; margin: number } {
  const rawCost = characterCount * pricing.textToSpeech.perCharacter;
  const platformCost = rawCost * PLATFORM_PRICING_MARGIN;
  const margin = platformCost - rawCost;
  
  return { rawCost, platformCost, margin };
}

/**
 * Calculate credits consumed for an operation
 */
export function calculateCreditsConsumed(
  operationType: AIOperationType,
  config: AICreditConfiguration = DEFAULT_CREDIT_CONFIG,
  metadata?: { tokens?: number; images?: number; characters?: number; }
): number {
  switch (operationType) {
    case 'text_generation':
      // This was the flawed part. It should just return the flat rate.
      // Token-based credit calculation could be added, but the simple model is what's configured.
      return config.textGenerationCredits;
      
    case 'image_generation':
      const imageCount = metadata?.images || 1;
      return config.imageGenerationCredits * imageCount;
      
    case 'text_to_speech':
       // Same as text generation, it's a flat rate per request for now.
      return config.ttsCredits;
      
    case 'video_generation':
      return config.videoGenerationCredits;
      
    default:
      return 1; // Default to 1 credit
  }
}

/**
 * Estimate monthly cost based on usage patterns
 */
export function estimateMonthlyCost(params: {
  textGenerations: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  imageGenerations: number;
  ttsRequests: number;
  avgCharacters: number;
}): { rawCost: number; platformCost: number; margin: number } {
  const textCost = calculateTextGenerationCost(
    params.textGenerations * params.avgInputTokens,
    params.textGenerations * params.avgOutputTokens
  );
  
  const imageCost = calculateImageGenerationCost(params.imageGenerations);
  
  const ttsCost = calculateTTSCost(params.ttsRequests * params.avgCharacters);
  
  const rawCost = textCost.rawCost + imageCost.rawCost + ttsCost.rawCost;
  const platformCost = textCost.platformCost + imageCost.platformCost + ttsCost.platformCost;
  const margin = textCost.margin + imageCost.margin + ttsCost.margin;
  
  return { rawCost, platformCost, margin };
}

/**
 * Calculate suggested plan based on monthly usage
 */
export function suggestPlanForUsage(creditsPerMonth: number): {
  planId: string;
  planName: string;
  creditsIncluded: number;
  estimatedMonthlyCost: number;
} {
  if (creditsPerMonth <= 500) {
    return {
      planId: 'plan_free',
      planName: 'Free',
      creditsIncluded: 500,
      estimatedMonthlyCost: 0,
    };
  } else if (creditsPerMonth <= 2000) {
    return {
      planId: 'plan_starter',
      planName: 'Starter',
      creditsIncluded: 2000,
      estimatedMonthlyCost: 29,
    };
  } else if (creditsPerMonth <= 10000) {
    return {
      planId: 'plan_pro',
      planName: 'Pro',
      creditsIncluded: 10000,
      estimatedMonthlyCost: 79,
    };
  } else {
    return {
      planId: 'plan_enterprise',
      planName: 'Enterprise',
      creditsIncluded: 50000,
      estimatedMonthlyCost: 199,
    };
  }
}

/**
 * Helper to estimate token count for text
 * Rough estimate: 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // More accurate estimate based on OpenAI's tokenizer patterns
  // Average: 1 token per 4 characters, but accounting for words and punctuation
  const words = text.split(/\s+/).length;
  const chars = text.length;
  // Use a weighted average: character-based + word-based estimate
  return Math.ceil((chars / 4 + words) / 2);
}

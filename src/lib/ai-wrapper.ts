
'use server';

import { trackAIUsage } from './ai-usage-tracker';
import type { AIOperationType, AIModel } from '@/types/ai-usage';
import { DEFAULT_CREDIT_CONFIG } from '@/types/ai-usage';
import { checkOperationLimit, checkCreditsAvailable } from './operation-limit-enforcer';
import { calculateCreditsConsumed } from './ai-cost-calculator';
import { serverDb } from './firebase-server';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Wrapper function to execute AI operations with automatic tracking and quota management
 * This ensures all AI calls are tracked and quota limits are enforced
 */
export async function executeAIOperation<T>(params: {
  companyId: string;
  userId: string;
  operationType: AIOperationType;
  model: AIModel;
  feature?: string;
  operation: () => Promise<{
    success: boolean;
    data?: T;
    error?: string;
    // Token/usage metrics
    inputTokens?: number;
    outputTokens?: number;
    imageCount?: number;
    characterCount?: number;
    audioSeconds?: number;
  }>;
  apiKeyType?: 'platform' | 'company_owned';
}): Promise<{
  success: boolean;
  data?: T;
  error?: string;
  quotaInfo?: {
    remaining: number;
    limit: number;
    consumed: number; // Added to provide feedback on how many credits were used
  };
}> {
  const {
    companyId,
    userId,
    operationType,
    model,
    feature,
    operation,
    apiKeyType = 'platform',
  } = params;

  try {
    // EMERGENCY PAUSE CHECK: Super Admin can pause AI operations for any company
    // This is the FIRST check to ensure paused companies cannot use AI at all
    if (serverDb) {
      const companyRef = doc(serverDb, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);
      
      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        if (companyData.aiOperationsPaused === true) {
          const reason = companyData.aiPausedReason || 'AI operations have been paused by administrator';
          return {
            success: false,
            error: `🚨 AI Operations Paused: ${reason}. Contact support for assistance.`,
            quotaInfo: { remaining: 0, limit: 0, consumed: 0 }
          };
        }
      }
    }

    // BYOK BYPASS: If using company-owned API key, skip all credit checks (unlimited usage)
    // Company pays Google directly, so platform doesn't enforce limits
    if (apiKeyType !== 'company_owned') {
        const imageCountForCheck = operationType === 'image_generation' ? 1 : 0;
        const operationLimitCheck = await checkOperationLimit(companyId, operationType, imageCountForCheck);
        if (!operationLimitCheck.allowed) {
            return { success: false, error: operationLimitCheck.reason, quotaInfo: { remaining: 0, limit: operationLimitCheck.limit || 0, consumed: 0 }};
        }

        // CRITICAL FIX: Calculate actual credits required BEFORE the operation
        // This prevents users from exceeding their limits on expensive operations
        const creditsRequired = calculateCreditsConsumed(operationType, DEFAULT_CREDIT_CONFIG, {
          images: operationType === 'image_generation' ? 1 : 0,
          // For text and TTS, we estimate 1 operation (actual tokens/chars counted post-operation)
          tokens: operationType === 'text_generation' ? 1 : 0,
          characters: operationType === 'text_to_speech' ? 1 : 0,
        });
        
        const creditsCheck = await checkCreditsAvailable(companyId, creditsRequired); 
        if (!creditsCheck.allowed) {
            return { success: false, error: creditsCheck.reason, quotaInfo: { remaining: 0, limit: creditsCheck.limit || 0, consumed: 0 }};
        }
    }

    const result = await operation();

    let creditsConsumed = 0;

    if (result.success) {
        const trackingResult = await trackAIUsage({
          companyId,
          userId,
          operationType,
          model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          imageCount: result.imageCount,
          characterCount: result.characterCount,
          audioSeconds: result.audioSeconds,
          apiKeyType,
          feature,
          success: true,
        });
        creditsConsumed = trackingResult.creditsConsumed;
    } else {
        console.warn(`AI operation failed. Type: ${operationType}, User: ${userId}, Error: ${result.error}`);
    }
    
    // THE DEFINITIVE FIX: Get updated quota info to return to client *after* the operation and tracking.
    const finalQuota = await checkCreditsAvailable(companyId, 0);

    return {
      ...result,
      quotaInfo: {
        remaining: finalQuota.remaining || 0,
        limit: finalQuota.limit || 0,
        consumed: creditsConsumed,
      },
    };
  } catch (error: any) {
    console.error('Error in executeAIOperation:', error);
    
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

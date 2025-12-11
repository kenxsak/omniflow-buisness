
/**
 * Operation Limit Enforcer
 * Enforces plan-specific operation limits to ensure profitability
 * Prevents abuse by limiting specific operation types (images, text, TTS, video)
 */

'use server';

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc } from 'firebase/firestore';
import type { Plan } from '@/types/saas';
import type { AIOperationType, MonthlyAIUsageSummary } from '@/types/ai-usage';
import { DEFAULT_CREDIT_CONFIG } from '@/types/ai-usage';
import { calculateCreditsConsumed } from './ai-cost-calculator';

export interface OperationLimitResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number | null;
  upgradeRequired?: boolean;
  isOverage?: boolean;
  overage?: number;
}

/**
 * Check if an operation is allowed based on plan limits
 */
export async function checkOperationLimit(
  companyId: string,
  operationType: AIOperationType,
  requestedCount: number = 1,
): Promise<OperationLimitResult> {
  if (!serverDb) {
    return { allowed: false, reason: 'Database not initialized' };
  }

  try {
    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return { allowed: false, reason: 'Company not found' };
    }
    
    const company = companyDoc.data();
    
    // BYOK BYPASS: If company uses their own API key, allow unlimited operations
    // They pay Google directly, so platform doesn't need to enforce limits
    // This is now safe because apiKeyType='company_owned' is properly verified in ai-wrapper.ts
    if (company.useOwnGeminiApiKey && company.geminiApiKeyId) {
      return { 
        allowed: true, 
        reason: 'Using own API key - unlimited usage',
        limit: undefined,
        remaining: undefined,
      };
    }

    const planId = company.planId;
    
    const planRef = doc(serverDb, 'plans', planId);
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      return { allowed: false, reason: 'Plan not found' };
    }
    
    const plan = planDoc.data() as Plan;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const summaryRef = doc(serverDb, 'aiMonthlySummaries', `${companyId}_${currentMonth}`);
    const summaryDoc = await getDoc(summaryRef);
    
    let currentUsage: MonthlyAIUsageSummary | null = null;
    if (summaryDoc.exists()) {
      currentUsage = summaryDoc.data() as MonthlyAIUsageSummary;
    }
    
    let limit: number | undefined;
    let currentCount = 0;
    
    switch (operationType) {
      case 'image_generation':
        limit = plan.maxImagesPerMonth;
        currentCount = currentUsage?.imageGeneration?.totalImages || 0;
        break;
      case 'text_generation':
        limit = plan.maxTextPerMonth;
        currentCount = currentUsage?.textGeneration?.totalCalls || 0;
        break;
      case 'text_to_speech':
        limit = plan.maxTTSPerMonth;
        currentCount = currentUsage?.textToSpeech?.totalCalls || 0;
        break;
      case 'video_generation':
        limit = plan.maxVideosPerMonth;
        // Video usage tracking would go here
        break;
      default:
        return { allowed: true };
    }

    if (limit === undefined) {
      return { allowed: true, limit: null }; // No limit set for this operation on this plan
    }

    const remaining = limit - currentCount;
    if (currentCount + requestedCount > limit) {
      if (plan.allowOverage) {
        const actualOverage = Math.max(0, currentCount + requestedCount - limit);
        return {
          allowed: true,
          reason: 'Overage will be charged',
          isOverage: true,
          overage: actualOverage,
          limit,
          remaining: 0,
        };
      }
      
      return {
        allowed: false,
        reason: `${operationType} limit reached. You have used ${currentCount} of ${limit} this month.`,
        remaining,
        limit,
        upgradeRequired: true,
      };
    }
    
    return {
      allowed: true,
      remaining,
      limit,
    };
  } catch (error) {
    console.error('Error checking operation limit:', error);
    return { allowed: false, reason: 'Error checking operation limit' };
  }
}

/**
 * Check if credits are available (DUAL CREDIT SYSTEM)
 * Free plan: Checks lifetime credits (one-time, never refills)
 * Paid plans: Checks monthly credits (refills each month)
 */
export async function checkCreditsAvailable(
  companyId: string,
  creditsRequired: number,
): Promise<OperationLimitResult> {
  if (!serverDb) {
    return { allowed: false, reason: 'Database not initialized' };
  }

  try {
    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return { allowed: false, reason: 'Company not found' };
    }
    
    const company = companyDoc.data();
    
    // BYOK BYPASS: If company uses their own API key, allow unlimited credits
    if (company.useOwnGeminiApiKey && company.geminiApiKeyId) {
      return { 
        allowed: true, 
        reason: 'Using own API key - unlimited credits',
        limit: undefined,
        remaining: undefined,
      };
    }
    
    // Use dual credit system helper
    const { hasCreditsAvailable } = await import('./credit-balance-helper');
    const result = await hasCreditsAvailable(companyId, creditsRequired);
    
    if (!result.available) {
      // Use monthlyRemaining for paid plans, lifetimeRemaining for free plans
      const remaining = result.monthlyRemaining !== undefined 
        ? result.monthlyRemaining 
        : result.lifetimeRemaining || 0;
        
      return {
        allowed: false,
        reason: result.reason || 'Insufficient credits',
        remaining,
        limit: result.monthlyRemaining !== undefined 
          ? result.monthlyRemaining + creditsRequired
          : (result.lifetimeRemaining || 0) + creditsRequired,
        upgradeRequired: true,
      };
    }
    
    // Get remaining for display
    // For paid plans (monthly credits), use monthlyRemaining
    // For free plans (lifetime credits), use lifetimeRemaining
    const remaining = result.monthlyRemaining !== undefined && result.monthlyRemaining > 0
      ? result.monthlyRemaining 
      : result.lifetimeRemaining || 0;
    
    const limit = result.monthlyRemaining !== undefined && result.monthlyRemaining > 0
      ? result.monthlyRemaining + creditsRequired
      : (result.lifetimeRemaining || 0) + creditsRequired;
    
    return {
      allowed: true,
      remaining,
      limit,
    };
  } catch (error) {
    console.error('Error checking credits:', error);
    return { allowed: false, reason: 'Error checking credits' };
  }
}

/**
 * Get remaining operations for a company
 */
export async function getRemainingOperations(
  companyId: string,
): Promise<{
  credits: { used: number; limit: number; remaining: number };
  images: { used: number; limit: number | null; remaining: number | null };
  text: { used: number; limit: number | null; remaining: number | null };
  tts: { used: number; limit: number | null; remaining: number | null };
}> {
  if (!serverDb) {
    throw new Error('Database not initialized');
  }

  // Get company and plan
  const companyRef = doc(serverDb, 'companies', companyId);
  const companyDoc = await getDoc(companyRef);
  
  if (!companyDoc.exists()) {
    throw new Error('Company not found');
  }
  
  const company = companyDoc.data();
  const planRef = doc(serverDb, 'plans', company.planId);
  const planDoc = await getDoc(planRef);
  
  if (!planDoc.exists()) {
    throw new Error('Plan not found');
  }
  
  const plan = planDoc.data() as Plan;
  
  // Get current usage
  const currentMonth = new Date().toISOString().slice(0, 7);
  const summaryRef = doc(serverDb, 'aiMonthlySummaries', `${companyId}_${currentMonth}`);
  const quotaRef = doc(serverDb, 'aiQuotas', `${companyId}_${currentMonth}`);
  
  const [summaryDoc, quotaDoc] = await Promise.all([
    getDoc(summaryRef),
    getDoc(quotaRef),
  ]);
  
  const summary = summaryDoc.exists() ? (summaryDoc.data() as MonthlyAIUsageSummary) : null;
  const quota = quotaDoc.exists() ? quotaDoc.data() : null;
  
  const creditsUsed = quota?.creditsUsed || 0;
  const creditsLimit = plan.aiCreditsPerMonth;
  
  const imagesUsed = summary?.imageGeneration?.totalImages || 0;
  const imagesLimit = plan.maxImagesPerMonth ?? null;
  
  const textUsed = summary?.textGeneration?.totalCalls || 0;
  const textLimit = plan.maxTextPerMonth ?? null;
  
  const ttsUsed = summary?.textToSpeech?.totalCalls || 0;
  const ttsLimit = plan.maxTTSPerMonth ?? null;
  
  return {
    credits: {
      used: creditsUsed,
      limit: creditsLimit,
      remaining: creditsLimit - creditsUsed,
    },
    images: {
      used: imagesUsed,
      limit: imagesLimit,
      remaining: imagesLimit !== null ? imagesLimit - imagesUsed : null,
    },
    text: {
      used: textUsed,
      limit: textLimit,
      remaining: textLimit !== null ? textLimit - textUsed : null,
    },
    tts: {
      used: ttsUsed,
      limit: ttsLimit,
      remaining: ttsLimit !== null ? ttsLimit - ttsUsed : null,
    },
  };
}

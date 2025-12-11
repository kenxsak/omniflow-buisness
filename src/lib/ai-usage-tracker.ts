
'use server';

import { serverDb } from '@/lib/firebase-server';
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import type{
  AIUsageRecord,
  AIOperationType,
  AIModel,
  MonthlyAIUsageSummary,
  CompanyAIQuota,
} from '@/types/ai-usage';
import { DEFAULT_CREDIT_CONFIG } from '@/types/ai-usage';
import {
  calculateTextGenerationCost,
  calculateImageGenerationCost,
  calculateTTSCost,
  calculateCreditsConsumed,
} from './ai-cost-calculator';
import { 
  checkOperationLimit,
  checkCreditsAvailable,
} from './operation-limit-enforcer';
import { checkAndSendCreditNotifications } from './ai-credit-notifications';
import { trackOverageUsage } from './ai-overage-tracker';

/**
 * Track an AI usage event
 */
export async function trackAIUsage(params: {
  companyId: string;
  userId: string;
  operationType: AIOperationType;
  model: AIModel;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  characterCount?: number;
  audioSeconds?: number;
  apiKeyType?: 'platform' | 'company_owned';
  feature?: string;
  success?: boolean;
  errorMessage?: string;
}): Promise<{ success: boolean; usageId?: string; error?: string; creditsConsumed: number; }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized', creditsConsumed: 0 };
  }

  try {
    const {
      companyId,
      userId,
      operationType,
      model,
      inputTokens = 0,
      outputTokens = 0,
      imageCount = 0,
      characterCount = 0,
      audioSeconds = 0,
      apiKeyType = 'platform',
      feature,
      success = true,
      errorMessage,
    } = params;

    let rawCost = 0;
    let platformCost = 0;
    let margin = 0;
    let creditsConsumed = 0;

    if (success) {
      if (operationType === 'text_generation') {
        const textCost = calculateTextGenerationCost(inputTokens, outputTokens);
        rawCost = textCost.rawCost;
        platformCost = textCost.platformCost;
        margin = textCost.margin;
        creditsConsumed = calculateCreditsConsumed(operationType, DEFAULT_CREDIT_CONFIG, { tokens: inputTokens + outputTokens });
      } else if (operationType === 'image_generation') {
        const modelType = model === 'imagen-4' ? 'imagen-4' : 'imagen-3';
        const imageCost = calculateImageGenerationCost(imageCount, modelType);
        rawCost = imageCost.rawCost;
        platformCost = imageCost.platformCost;
        margin = imageCost.margin;
        // THE DEFINITIVE FIX: Correctly pass the image count to calculate credits.
        creditsConsumed = calculateCreditsConsumed(operationType, DEFAULT_CREDIT_CONFIG, { images: imageCount });
      } else if (operationType === 'text_to_speech') {
        const ttsCost = calculateTTSCost(characterCount);
        rawCost = ttsCost.rawCost;
        platformCost = ttsCost.platformCost;
        margin = ttsCost.margin;
        creditsConsumed = calculateCreditsConsumed(operationType, DEFAULT_CREDIT_CONFIG, { characters: characterCount });
      }
    }
    
    // For company-owned keys, costs and credits are zero for the platform
    if (apiKeyType === 'company_owned') {
        rawCost = 0;
        platformCost = 0;
        margin = 0;
        creditsConsumed = 0; 
    }

    const usageRecord: Omit<AIUsageRecord, 'id'> = {
      companyId,
      userId,
      operationType,
      model,
      timestamp: new Date().toISOString(),
      inputTokens: inputTokens > 0 ? inputTokens : 0,
      outputTokens: outputTokens > 0 ? outputTokens : 0,
      totalTokens: (inputTokens + outputTokens) > 0 ? (inputTokens + outputTokens) : 0,
      imageCount: imageCount > 0 ? imageCount : 0,
      characterCount: characterCount > 0 ? characterCount : 0,
      audioSeconds: audioSeconds > 0 ? audioSeconds : 0,
      rawCost,
      platformCost,
      margin,
      apiKeyType,
      feature,
      success,
      // Only include errorMessage if it has a value (Firestore rejects undefined)
      ...(errorMessage ? { errorMessage } : {}),
    };

    const usageRef = await addDoc(collection(serverDb, 'aiUsage'), {
      ...usageRecord,
      createdAt: serverTimestamp(),
    });

    // This is the CRITICAL part: Deduct credits only if they are consumed
    if (success && apiKeyType === 'platform' && creditsConsumed > 0) {
      await updateCompanyAIQuota(companyId, {
          operations: 1,
          credits: creditsConsumed,
          cost: platformCost,
      });
      await updateMonthlySummary(companyId, usageRecord, creditsConsumed);
      
      // OVERAGE TRACKING: Check if company exceeded their credit limit and track overage
      // This ensures every operation that causes overage is tracked for billing
      await trackOverageIfNeeded(companyId, operationType).catch(err => {
        console.error('Error tracking overage:', err);
        // Don't fail the operation if overage tracking fails
      });
    } else if (success && apiKeyType === 'company_owned') {
        // Still update summary for analytics, but with 0 credits consumed
        await updateMonthlySummary(companyId, usageRecord, 0);
    }

    return { success: true, usageId: usageRef.id, creditsConsumed };
  } catch (error) {
    console.error('Error tracking AI usage:', error);
    return { success: false, error: 'Failed to track AI usage', creditsConsumed: 0 };
  }
}


/**
 * Update company AI quota in real-time
 */
async function updateCompanyAIQuota(
  companyId: string,
  usage: { operations: number; credits: number; cost: number }
): Promise<void> {
  if (!serverDb) return;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const quotaRef = doc(serverDb, 'aiQuotas', `${companyId}_${currentMonth}`);

  try {
    const quotaSnap = await getDoc(quotaRef);
    
    if (!quotaSnap.exists()) {
      const companyRef = doc(serverDb, 'companies', companyId);
      const companySnap = await getDoc(companyRef);
      if (!companySnap.exists()) return;
      
      const companyData = companySnap.data();
      
      const planRef = doc(serverDb, 'plans', companyData?.planId || 'plan_free');
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) return;

      const planData = planSnap.data();
      
      const monthlyCreditsLimit = planData?.aiCreditsPerMonth || 500;
      
      const quota: CompanyAIQuota = {
        companyId,
        currentMonth,
        operationsThisMonth: usage.operations,
        creditsUsed: usage.credits,
        estimatedCost: usage.cost,
        monthlyOperationsLimit: monthlyCreditsLimit * 10,
        monthlyCreditsLimit,
        quotaWarningsSent: [],
        quotaExceeded: usage.credits >= monthlyCreditsLimit,
        budgetExceeded: false,
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      
      await setDoc(quotaRef, quota);
    } else {
      await updateDoc(quotaRef, {
        operationsThisMonth: increment(usage.operations),
        creditsUsed: increment(usage.credits),
        estimatedCost: increment(usage.cost),
        lastUpdated: new Date().toISOString(),
      });
      
      // THE DEFINITIVE FIX: Re-fetch the document AFTER the update to check the new values.
      const updatedQuotaSnap = await getDoc(quotaRef);
      if (!updatedQuotaSnap.exists()) return;

      const quotaData = updatedQuotaSnap.data() as CompanyAIQuota;
      
      // Check if the quota is now exceeded
      if (quotaData.creditsUsed >= quotaData.monthlyCreditsLimit && !quotaData.quotaExceeded) {
        await updateDoc(quotaRef, { quotaExceeded: true });
        console.log(`Quota exceeded for company ${companyId}. New used: ${quotaData.creditsUsed}, Limit: ${quotaData.monthlyCreditsLimit}`);
      }
      
      // Check and send credit usage notifications (80%, 100%)
      // This runs after every AI operation to monitor usage thresholds
      await checkAndSendCreditNotifications(companyId).catch(err => {
        console.error('Error sending credit notifications:', err);
        // Don't fail the operation if notification fails
      });
    }
    
  } catch (error) {
    console.error('Error updating company AI quota:', error);
  }
}

/**
 * Update monthly summary
 */
async function updateMonthlySummary(
  companyId: string,
  usageRecord: Omit<AIUsageRecord, 'id'>,
  creditsConsumed: number
): Promise<void> {
  if (!serverDb) return;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const summaryRef = doc(serverDb, 'aiMonthlySummaries', `${companyId}_${currentMonth}`);

  try {
    const summarySnap = await getDoc(summaryRef);
    
    if (!summarySnap.exists()) {
      const companyRef = doc(serverDb, 'companies', companyId);
      const companySnap = await getDoc(companyRef);
      const companyData = companySnap.data();
      
      const planRef = doc(serverDb, 'plans', companyData?.planId || 'plan_free');
      const planSnap = await getDoc(planRef);
      const planData = planSnap.data();
      
      const aiCreditsLimit = planData?.aiCreditsPerMonth || 500;
      
      const summary: MonthlyAIUsageSummary = {
        companyId,
        month: currentMonth,
        textGeneration: {
          totalCalls: usageRecord.operationType === 'text_generation' ? 1 : 0,
          inputTokens: usageRecord.inputTokens || 0,
          outputTokens: usageRecord.outputTokens || 0,
          totalTokens: usageRecord.totalTokens || 0,
          rawCost: usageRecord.operationType === 'text_generation' ? usageRecord.rawCost : 0,
          platformCost: usageRecord.operationType === 'text_generation' ? usageRecord.platformCost : 0,
        },
        imageGeneration: {
          totalImages: usageRecord.operationType === 'image_generation' ? (usageRecord.imageCount || 1) : 0,
          rawCost: usageRecord.operationType === 'image_generation' ? usageRecord.rawCost : 0,
          platformCost: usageRecord.operationType === 'image_generation' ? usageRecord.platformCost : 0,
        },
        textToSpeech: {
          totalCalls: usageRecord.operationType === 'text_to_speech' ? 1 : 0,
          totalCharacters: usageRecord.characterCount || 0,
          totalAudioSeconds: usageRecord.audioSeconds || 0,
          rawCost: usageRecord.operationType === 'text_to_speech' ? usageRecord.rawCost : 0,
          platformCost: usageRecord.operationType === 'text_to_speech' ? usageRecord.platformCost : 0,
        },
        totalOperations: 1,
        totalRawCost: usageRecord.rawCost,
        totalPlatformCost: usageRecord.platformCost,
        totalMargin: usageRecord.margin,
        platformApiUsage: {
          operations: usageRecord.apiKeyType === 'platform' ? 1 : 0,
          cost: usageRecord.apiKeyType === 'platform' ? usageRecord.platformCost : 0,
        },
        companyOwnedApiUsage: {
          operations: usageRecord.apiKeyType === 'company_owned' ? 1 : 0,
          cost: usageRecord.apiKeyType === 'company_owned' ? usageRecord.platformCost : 0,
        },
        planId: companyData?.planId || 'plan_free',
        aiCreditsLimit,
        aiCreditsUsed: creditsConsumed,
        aiCreditsRemaining: Math.max(0, aiCreditsLimit - creditsConsumed),
        lastUpdated: new Date().toISOString(),
      };
      
      await setDoc(summaryRef, summary);
    } else {
      const updates: any = {
        totalOperations: increment(1),
        totalRawCost: increment(usageRecord.rawCost),
        totalPlatformCost: increment(usageRecord.platformCost),
        totalMargin: increment(usageRecord.margin),
        aiCreditsUsed: increment(creditsConsumed),
        lastUpdated: new Date().toISOString(),
      };
      
      if (usageRecord.operationType === 'text_generation') {
        updates['textGeneration.totalCalls'] = increment(1);
        updates['textGeneration.inputTokens'] = increment(usageRecord.inputTokens || 0);
        updates['textGeneration.outputTokens'] = increment(usageRecord.outputTokens || 0);
        updates['textGeneration.totalTokens'] = increment(usageRecord.totalTokens || 0);
        updates['textGeneration.rawCost'] = increment(usageRecord.rawCost);
        updates['textGeneration.platformCost'] = increment(usageRecord.platformCost);
      } else if (usageRecord.operationType === 'image_generation') {
        updates['imageGeneration.totalImages'] = increment(usageRecord.imageCount || 1);
        updates['imageGeneration.rawCost'] = increment(usageRecord.rawCost);
        updates['imageGeneration.platformCost'] = increment(usageRecord.platformCost);
      } else if (usageRecord.operationType === 'text_to_speech') {
        updates['textToSpeech.totalCalls'] = increment(1);
        updates['textToSpeech.totalCharacters'] = increment(usageRecord.characterCount || 0);
        updates['textToSpeech.totalAudioSeconds'] = increment(usageRecord.audioSeconds || 0);
        updates['textToSpeech.rawCost'] = increment(usageRecord.rawCost);
        updates['textToSpeech.platformCost'] = increment(usageRecord.platformCost);
      }
      
      if (usageRecord.apiKeyType === 'platform') {
        updates['platformApiUsage.operations'] = increment(1);
        updates['platformApiUsage.cost'] = increment(usageRecord.platformCost);
      } else {
        updates['companyOwnedApiUsage.operations'] = increment(1);
        updates['companyOwnedApiUsage.cost'] = increment(usageRecord.platformCost);
      }
      
      const currentSummary = summarySnap.data();
      const currentPlanLimit = currentSummary.aiCreditsLimit || 0;
      const newCreditsUsed = (currentSummary.aiCreditsUsed || 0) + creditsConsumed;
      updates.aiCreditsRemaining = Math.max(0, currentPlanLimit - newCreditsUsed);
      
      await updateDoc(summaryRef, updates);
    }
  } catch (error) {
    console.error('Error updating monthly summary:', error);
  }
}

/**
 * Track overage charges if company has exceeded their monthly credit limit
 * Called after each AI operation to ensure overage is captured for billing
 */
async function trackOverageIfNeeded(
  companyId: string,
  operationType: AIOperationType
): Promise<void> {
  if (!serverDb) return;

  try {
    // Get company and plan details
    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) return;
    
    const company = companyDoc.data();
    const planRef = doc(serverDb, 'plans', company.planId);
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) return;
    
    const plan = planDoc.data() as any; // Plan type
    
    // Only track overage if plan allows it
    if (!plan.allowOverage || !plan.overagePricePerCredit) {
      return;
    }
    
    // Get current month's credit usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    const quotaRef = doc(serverDb, 'aiQuotas', `${companyId}_${currentMonth}`);
    const quotaDoc = await getDoc(quotaRef);
    
    if (!quotaDoc.exists()) return;
    
    const quota = quotaDoc.data();
    const creditsUsed = quota.creditsUsed || 0;
    const creditLimit = plan.aiCreditsPerMonth || 0;
    
    // Track overage if company has exceeded their limit
    if (creditsUsed > creditLimit) {
      await trackOverageUsage(
        companyId,
        plan.id || company.planId,
        creditLimit,
        plan.overagePricePerCredit,
        creditsUsed,
        operationType
      );
      
      console.log(`💰 Overage tracked for ${companyId}: ${creditsUsed - creditLimit} credits over limit`);
    }
  } catch (error) {
    console.error('Error in trackOverageIfNeeded:', error);
    // Don't throw - we don't want to fail the operation if overage tracking fails
  }
}

/**
 * Check if company has exceeded their AI quota
 */
export async function checkAIQuota(
  companyId: string
): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  exceeded: boolean;
  message?: string;
}> {
  if (!serverDb) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      exceeded: true,
      message: 'Database not initialized',
    };
  }

  try {
    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    if (companyDoc.exists() && companyDoc.data().useOwnGeminiApiKey) {
        return { allowed: true, remaining: Infinity, limit: Infinity, exceeded: false, message: 'Using own API key' };
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const quotaRef = doc(serverDb, 'aiQuotas', `${companyId}_${currentMonth}`);
    const quotaSnap = await getDoc(quotaRef);

    if (!quotaSnap.exists()) {
      const companyRef = doc(serverDb, 'companies', companyId);
      const companySnap = await getDoc(companyRef);
      if (!companySnap.exists()) return { allowed: false, remaining: 0, limit: 0, exceeded: true, message: 'Company not found' };
      const companyData = companySnap.data();
      
      const planRef = doc(serverDb, 'plans', companyData?.planId || 'plan_free');
      const planSnap = await getDoc(planRef);
      const planData = planSnap.exists() ? planSnap.data() : null;
      
      const limit = planData?.aiCreditsPerMonth || 500;
      
      return {
        allowed: true,
        remaining: limit,
        limit,
        exceeded: false,
      };
    }

    const quotaData = quotaSnap.data() as CompanyAIQuota;
    const remaining = Math.max(0, quotaData.monthlyCreditsLimit - quotaData.creditsUsed);
    const exceeded = quotaData.creditsUsed >= quotaData.monthlyCreditsLimit;

    return {
      allowed: !exceeded,
      remaining,
      limit: quotaData.monthlyCreditsLimit,
      exceeded,
      message: exceeded ? 'Monthly AI credits limit exceeded. Please upgrade your plan or wait for next month.' : undefined,
    };
  } catch (error) {
    console.error('Error checking AI quota:', error);
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      exceeded: true,
      message: 'Error checking quota',
    };
  }
}

/**
 * Get AI usage analytics for a company
 */
export async function getAIUsageAnalytics(
  companyId: string,
  monthsToFetch: number = 3
): Promise<{
  success: boolean;
  data?: MonthlyAIUsageSummary[];
  currentQuota?: CompanyAIQuota;
  error?: string;
}> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const quotaRef = doc(serverDb, 'aiQuotas', `${companyId}_${currentMonth}`);
    const quotaSnap = await getDoc(quotaRef);
    const currentQuota = quotaSnap.exists() ? (quotaSnap.data() as CompanyAIQuota) : undefined;

    const summariesRef = collection(serverDb, 'aiMonthlySummaries');
    const q = query(
      summariesRef,
      where('companyId', '==', companyId),
      firestoreLimit(monthsToFetch * 2)
    );
    
    const summariesSnap = await getDocs(q);
    const summaries: MonthlyAIUsageSummary[] = [];
    
    summariesSnap.forEach((doc) => {
      summaries.push(doc.data() as MonthlyAIUsageSummary);
    });
    
    summaries.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    summaries.splice(monthsToFetch);

    return {
      success: true,
      data: summaries,
      currentQuota,
    };
  } catch (error) {
    console.error('Error getting AI usage analytics:', error);
    return { success: false, error: 'Failed to fetch analytics' };
  }
}

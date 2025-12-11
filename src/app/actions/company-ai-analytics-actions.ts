'use server';

/**
 * Company AI Analytics Actions
 * 
 * Server actions for companies to view their own AI usage, costs, and analytics.
 */

import { serverDb } from '@/lib/firebase-server';
import { collection, getDocs, query, where, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import type { MonthlyAIUsageSummary, CompanyAIQuota, AIUsageRecord, CostOptimizationRecommendation } from '@/types/ai-usage';
import type { Company, Plan } from '@/types/saas';
import { format, subMonths } from 'date-fns';
import { estimateMonthlyCost, suggestPlanForUsage } from '@/lib/ai-cost-calculator';

export interface CompanyAIAnalytics {
  currentMonth: {
    month: string;
    operations: number;
    creditsUsed: number;
    creditsLimit: number;
    creditsRemaining: number;
    estimatedCost: number;
    quotaExceeded: boolean;
    resetDate: string;
  };
  breakdown: {
    textGeneration: {
      calls: number;
      tokens: number;
      cost: number;
    };
    imageGeneration: {
      images: number;
      cost: number;
    };
    textToSpeech: {
      calls: number;
      characters: number;
      cost: number;
    };
  };
  apiKeyInfo: {
    usingOwnKey: boolean;
    keyId?: string;
    savingsIfOwnKey?: number; // How much they would save if they added their own key
  };
  plan: {
    id: string;
    name: string;
    monthlyCreditsLimit: number;
    suggestedPlan?: {
      planId: string;
      planName: string;
      reason: string;
    };
  };
  recommendations: CostOptimizationRecommendation[];
}

/**
 * Get AI usage analytics for a specific company
 */
export async function getCompanyAIAnalyticsAction(companyId: string): Promise<{
  success: boolean;
  data?: CompanyAIAnalytics;
  error?: string;
}> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const currentMonth = format(new Date(), 'yyyy-MM');

    // Fetch company details
    const companyDoc = await getDoc(doc(serverDb, 'companies', companyId));
    if (!companyDoc.exists()) {
      return { success: false, error: 'Company not found' };
    }
    const company = { id: companyDoc.id, ...companyDoc.data() } as Company;

    // Fetch plan details
    const planDoc = await getDoc(doc(serverDb, 'plans', company.planId));
    const plan = planDoc.exists() ? { id: planDoc.id, ...planDoc.data() } as Plan : null;

    // Fetch current month summary
    const summaryQuery = query(
      collection(serverDb, 'aiMonthlySummaries'),
      where('companyId', '==', companyId),
      where('month', '==', currentMonth),
      limit(1)
    );
    const summarySnapshot = await getDocs(summaryQuery);
    const summary = summarySnapshot.empty 
      ? null 
      : summarySnapshot.docs[0].data() as MonthlyAIUsageSummary;

    // Fetch current quota info
    const quotaQuery = query(
      collection(serverDb, 'aiQuotas'),
      where('companyId', '==', companyId),
      where('currentMonth', '==', currentMonth),
      limit(1)
    );
    const quotaSnapshot = await getDocs(quotaQuery);
    const quota = quotaSnapshot.empty 
      ? null 
      : quotaSnapshot.docs[0].data() as CompanyAIQuota;

    // Calculate recommendations
    const recommendations: CostOptimizationRecommendation[] = [];

    // Recommendation 1: Add own API key if not using one
    if (!company.useOwnGeminiApiKey && summary && summary.totalPlatformCost > 0) {
      const potentialSavings = summary.totalMargin; // The markup we charge
      if (potentialSavings > 5) { // Only recommend if savings > $5
        recommendations.push({
          companyId,
          type: 'api_key',
          priority: 'high',
          title: 'Save 100% on AI Costs',
          description: `You could save ${formatCurrency(potentialSavings)} per month by adding your own Gemini API key. You'll only pay Google's cost with no markup.`,
          potentialSavings,
          actionRequired: 'Add your own Gemini API key in Settings',
          createdAt: new Date().toISOString(),
          dismissed: false,
        });
      }
    }

    // Recommendation 2: Plan upgrade/downgrade based on usage
    if (summary && plan) {
      const suggestedPlan = suggestPlanForUsage(summary.aiCreditsUsed);

      if (suggestedPlan.planId !== company.planId) {
        const isUpgrade = suggestedPlan.creditsIncluded > (plan.aiCreditsPerMonth || 0);
        recommendations.push({
          companyId,
          type: isUpgrade ? 'plan_upgrade' : 'plan_downgrade',
          priority: 'medium',
          title: `${isUpgrade ? 'Upgrade' : 'Downgrade'} to ${suggestedPlan.planName} Plan`,
          description: isUpgrade 
            ? `Your usage (${summary.aiCreditsUsed} credits) suggests upgrading to ${suggestedPlan.planName} with ${suggestedPlan.creditsIncluded} credits/month.`
            : `You're only using ${summary.aiCreditsUsed} of your ${plan.aiCreditsPerMonth} credits. Consider ${suggestedPlan.planName} to save money.`,
          createdAt: new Date().toISOString(),
          dismissed: false,
        });
      }
    }

    const analytics: CompanyAIAnalytics = {
      currentMonth: {
        month: currentMonth,
        operations: summary?.totalOperations || 0,
        creditsUsed: summary?.aiCreditsUsed || 0,
        creditsLimit: plan?.aiCreditsPerMonth || 0,
        creditsRemaining: (plan?.aiCreditsPerMonth || 0) - (summary?.aiCreditsUsed || 0),
        estimatedCost: summary?.totalPlatformCost || 0,
        quotaExceeded: quota?.quotaExceeded || false,
        resetDate: quota?.resetDate || format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'yyyy-MM-dd'),
      },
      breakdown: {
        textGeneration: {
          calls: summary?.textGeneration?.totalCalls || 0,
          tokens: summary?.textGeneration?.totalTokens || 0,
          cost: summary?.textGeneration?.platformCost || 0,
        },
        imageGeneration: {
          images: summary?.imageGeneration?.totalImages || 0,
          cost: summary?.imageGeneration?.platformCost || 0,
        },
        textToSpeech: {
          calls: summary?.textToSpeech?.totalCalls || 0,
          characters: summary?.textToSpeech?.totalCharacters || 0,
          cost: summary?.textToSpeech?.platformCost || 0,
        },
      },
      apiKeyInfo: {
        usingOwnKey: company.useOwnGeminiApiKey || false,
        keyId: company.geminiApiKeyId,
        savingsIfOwnKey: !company.useOwnGeminiApiKey ? summary?.totalMargin : undefined,
      },
      plan: {
        id: company.planId,
        name: plan?.name || 'Unknown',
        monthlyCreditsLimit: plan?.aiCreditsPerMonth || 0,
      },
      recommendations,
    };

    return {
      success: true,
      data: analytics,
    };
  } catch (error: any) {
    console.error('Error getting company AI analytics:', error);
    return {
      success: false,
      error: error.message || 'Failed to get analytics',
    };
  }
}

/**
 * Get historical AI usage for a company (for charts)
 */
export async function getCompanyHistoricalUsageAction(companyId: string, monthsBack: number = 6): Promise<{
  success: boolean;
  data?: Array<{
    month: string;
    operations: number;
    creditsUsed: number;
    creditsLimit: number;
    cost: number;
  }>;
  error?: string;
}> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Generate list of months to query
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < monthsBack; i++) {
      const date = subMonths(now, i);
      months.push(format(date, 'yyyy-MM'));
    }

    // Fetch summaries for this company
    const summariesQuery = query(
      collection(serverDb, 'aiMonthlySummaries'),
      where('companyId', '==', companyId),
      where('month', 'in', months)
    );
    const summariesSnapshot = await getDocs(summariesQuery);

    // Create a map for easy lookup
    const summariesMap = new Map<string, MonthlyAIUsageSummary>();
    summariesSnapshot.forEach(doc => {
      const summary = doc.data() as MonthlyAIUsageSummary;
      summariesMap.set(summary.month, summary);
    });

    // Build result with all months (fill in zeros for missing months)
    const result = months.map(month => {
      const summary = summariesMap.get(month);
      return {
        month,
        operations: summary?.totalOperations || 0,
        creditsUsed: summary?.aiCreditsUsed || 0,
        creditsLimit: summary?.aiCreditsLimit || 0,
        cost: summary?.totalPlatformCost || 0,
      };
    });

    // Sort by month (oldest first for chart)
    result.sort((a, b) => a.month.localeCompare(b.month));

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error('Error getting company historical usage:', error);
    return {
      success: false,
      error: error.message || 'Failed to get historical usage',
    };
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

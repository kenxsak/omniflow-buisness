'use server';

/**
 * Super Admin AI Statistics Actions
 * 
 * Server actions for Super Admin to monitor platform-wide AI usage,
 * costs, revenue, and profitability.
 */

import { serverDb } from '@/lib/firebase-server';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import type { PlatformAIStatistics, MonthlyAIUsageSummary, AIUsageRecord } from '@/types/ai-usage';
import type { Company } from '@/types/saas';
import { format } from 'date-fns';

export interface CompanyAIUsageDetail {
  companyId: string;
  companyName: string;
  currentMonth: {
    operations: number;
    creditsUsed: number;
    estimatedCost: number;
    platformRevenue: number;
    platformProfit: number;
  };
  planId: string;
  planName: string;
  usingOwnApiKey: boolean;
}

export interface PlatformAIOverview {
  currentMonth: {
    totalOperations: number;
    totalGoogleCost: number;
    totalRevenue: number;
    totalProfit: number;
    profitMarginPercent: number;
    companiesCount: number;
    activeCompaniesCount: number;
  };
  topConsumers: Array<{
    companyId: string;
    companyName: string;
    operations: number;
    revenue: number;
    profit: number;
  }>;
  operationBreakdown: {
    textGeneration: number;
    imageGeneration: number;
    textToSpeech: number;
    total: number;
  };
  apiKeyDistribution: {
    usingPlatformAPI: number;
    usingOwnAPI: number;
  };
}

/**
 * Get platform-wide AI statistics for Super Admin dashboard
 */
export async function getPlatformAIStatisticsAction(): Promise<{
  success: boolean;
  data?: PlatformAIOverview;
  error?: string;
}> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const currentMonth = format(new Date(), 'yyyy-MM');
    
    // Fetch all company monthly summaries for current month
    const summariesQuery = query(
      collection(serverDb, 'aiMonthlySummaries'),
      where('month', '==', currentMonth)
    );
    const summariesSnapshot = await getDocs(summariesQuery);
    
    // Fetch all companies for names and plan info
    const companiesSnapshot = await getDocs(collection(serverDb, 'companies'));
    const companiesMap = new Map<string, Company>();
    companiesSnapshot.forEach(doc => {
      companiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Company);
    });

    let totalOperations = 0;
    let totalGoogleCost = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let textGenerationOps = 0;
    let imageGenerationOps = 0;
    let ttsOps = 0;
    let companiesUsingPlatformAPI = 0;
    let companiesUsingOwnAPI = 0;
    let activeCompaniesCount = 0;

    const companyStats: Array<{
      companyId: string;
      companyName: string;
      operations: number;
      revenue: number;
      profit: number;
    }> = [];

    summariesSnapshot.forEach(doc => {
      const summary = doc.data() as MonthlyAIUsageSummary;
      const company = companiesMap.get(summary.companyId);
      
      if (!company) return;

      const operations = summary.totalOperations || 0;
      const googleCost = summary.totalRawCost || 0;
      const revenue = summary.totalPlatformCost || 0;
      const profit = summary.totalMargin || 0;

      totalOperations += operations;
      totalGoogleCost += googleCost;
      totalRevenue += revenue;
      totalProfit += profit;

      textGenerationOps += summary.textGeneration?.totalCalls || 0;
      imageGenerationOps += summary.imageGeneration?.totalImages || 0;
      ttsOps += summary.textToSpeech?.totalCalls || 0;

      if (operations > 0) {
        activeCompaniesCount++;
      }

      // Check API key type
      if (summary.platformApiUsage?.operations > 0) {
        companiesUsingPlatformAPI++;
      }
      if (summary.companyOwnedApiUsage?.operations > 0) {
        companiesUsingOwnAPI++;
      }

      companyStats.push({
        companyId: summary.companyId,
        companyName: company.name || 'Unknown Company',
        operations,
        revenue,
        profit,
      });
    });

    // Sort and get top 10 consumers
    const topConsumers = companyStats
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const profitMarginPercent = totalRevenue > 0 
      ? (totalProfit / totalRevenue) * 100 
      : 0;

    const overview: PlatformAIOverview = {
      currentMonth: {
        totalOperations,
        totalGoogleCost,
        totalRevenue,
        totalProfit,
        profitMarginPercent,
        companiesCount: companiesMap.size,
        activeCompaniesCount,
      },
      topConsumers,
      operationBreakdown: {
        textGeneration: textGenerationOps,
        imageGeneration: imageGenerationOps,
        textToSpeech: ttsOps,
        total: totalOperations,
      },
      apiKeyDistribution: {
        usingPlatformAPI: companiesUsingPlatformAPI,
        usingOwnAPI: companiesUsingOwnAPI,
      },
    };

    return {
      success: true,
      data: overview,
    };
  } catch (error: any) {
    console.error('Error getting platform AI statistics:', error);
    return {
      success: false,
      error: error.message || 'Failed to get platform statistics',
    };
  }
}

/**
 * Get detailed AI usage for all companies (for Super Admin table view)
 */
export async function getAllCompaniesAIUsageAction(): Promise<{
  success: boolean;
  data?: CompanyAIUsageDetail[];
  error?: string;
}> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const currentMonth = format(new Date(), 'yyyy-MM');
    
    // Fetch companies and their monthly summaries
    const companiesSnapshot = await getDocs(collection(serverDb, 'companies'));
    const summariesQuery = query(
      collection(serverDb, 'aiMonthlySummaries'),
      where('month', '==', currentMonth)
    );
    const summariesSnapshot = await getDocs(summariesQuery);
    
    // Create a map of company summaries
    const summariesMap = new Map<string, MonthlyAIUsageSummary>();
    summariesSnapshot.forEach(doc => {
      const summary = doc.data() as MonthlyAIUsageSummary;
      summariesMap.set(summary.companyId, summary);
    });

    // Fetch plans for plan names
    const plansSnapshot = await getDocs(collection(serverDb, 'plans'));
    const plansMap = new Map<string, string>();
    plansSnapshot.forEach(doc => {
      plansMap.set(doc.id, doc.data().name || 'Unknown');
    });

    const companyDetails: CompanyAIUsageDetail[] = [];

    companiesSnapshot.forEach(doc => {
      const company = { id: doc.id, ...doc.data() } as Company;
      const summary = summariesMap.get(company.id);
      
      const operations = summary?.totalOperations || 0;
      const creditsUsed = summary?.aiCreditsUsed || 0;
      const googleCost = summary?.totalRawCost || 0;
      const platformRevenue = summary?.totalPlatformCost || 0;
      const platformProfit = summary?.totalMargin || 0;

      companyDetails.push({
        companyId: company.id,
        companyName: company.name || 'Unknown Company',
        currentMonth: {
          operations,
          creditsUsed,
          estimatedCost: googleCost,
          platformRevenue,
          platformProfit,
        },
        planId: company.planId || 'plan_free',
        planName: plansMap.get(company.planId) || 'Unknown',
        usingOwnApiKey: company.useOwnGeminiApiKey || false,
      });
    });

    // Sort by revenue (highest first)
    companyDetails.sort((a, b) => 
      b.currentMonth.platformRevenue - a.currentMonth.platformRevenue
    );

    return {
      success: true,
      data: companyDetails,
    };
  } catch (error: any) {
    console.error('Error getting companies AI usage:', error);
    return {
      success: false,
      error: error.message || 'Failed to get companies usage',
    };
  }
}

/**
 * Get historical monthly AI statistics for charts
 */
export async function getHistoricalAIStatisticsAction(monthsBack: number = 6): Promise<{
  success: boolean;
  data?: Array<{
    month: string;
    totalOperations: number;
    totalRevenue: number;
    totalProfit: number;
    totalGoogleCost: number;
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
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(format(date, 'yyyy-MM'));
    }

    // Fetch summaries for all these months
    const summariesSnapshot = await getDocs(
      query(
        collection(serverDb, 'aiMonthlySummaries'),
        where('month', 'in', months)
      )
    );

    // Aggregate by month
    const monthlyStats = new Map<string, {
      totalOperations: number;
      totalRevenue: number;
      totalProfit: number;
      totalGoogleCost: number;
    }>();

    // Initialize all months with zero
    months.forEach(month => {
      monthlyStats.set(month, {
        totalOperations: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalGoogleCost: 0,
      });
    });

    summariesSnapshot.forEach(doc => {
      const summary = doc.data() as MonthlyAIUsageSummary;
      const current = monthlyStats.get(summary.month);
      
      if (current) {
        current.totalOperations += summary.totalOperations || 0;
        current.totalRevenue += summary.totalPlatformCost || 0;
        current.totalProfit += summary.totalMargin || 0;
        current.totalGoogleCost += summary.totalRawCost || 0;
      }
    });

    // Convert to array and sort by month (oldest first for chart)
    const result = Array.from(monthlyStats.entries())
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error('Error getting historical AI statistics:', error);
    return {
      success: false,
      error: error.message || 'Failed to get historical statistics',
    };
  }
}

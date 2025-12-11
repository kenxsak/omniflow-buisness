'use server';

/**
 * Super Admin Profitability & Emergency Control Actions
 * 
 * Advanced controls for Super Admin to:
 * - Track overage revenue
 * - Detect free tier abuse
 * - Emergency pause AI operations
 * - Company-specific throttling
 */

import { serverDb } from '@/lib/firebase-server';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { AIOverageCharge } from '@/types/ai-usage';
import type { Company } from '@/types/saas';
import { getUserFromServerSession } from '@/lib/firebase-admin';

/**
 * Get platform-wide overage revenue statistics
 */
export async function getPlatformOverageRevenueAction(): Promise<{
  success: boolean;
  data?: {
    currentMonth: {
      totalOverageRevenue: number;
      companiesWithOverage: number;
      pendingInvoices: number;
      paidInvoices: number;
      totalCreditsOverage: number;
    };
    byCompany: Array<{
      companyId: string;
      companyName: string;
      overageCharge: number;
      creditsOverLimit: number;
      billingStatus: string;
      planId: string;
    }>;
  };
  error?: string;
}> {
  try {
    // Verify super admin authorization
    const authResult = await getUserFromServerSession();
    if (!authResult.success || authResult.user?.role !== 'superadmin') {
      return { success: false, error: 'Unauthorized: Super Admin access required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get all overage charges for current month
    const overageQuery = query(
      collection(serverDb, 'aiOverageCharges'),
      where('month', '==', currentMonth)
    );
    const overageSnapshot = await getDocs(overageQuery);

    let totalOverageRevenue = 0;
    let pendingInvoices = 0;
    let paidInvoices = 0;
    let totalCreditsOverage = 0;
    const overageByCompany: Array<{
      companyId: string;
      companyName: string;
      overageCharge: number;
      creditsOverLimit: number;
      billingStatus: string;
      planId: string;
    }> = [];

    // Get company names
    const companiesSnapshot = await getDocs(collection(serverDb, 'companies'));
    const companiesMap = new Map<string, string>();
    companiesSnapshot.forEach(doc => {
      const company = doc.data() as Company;
      companiesMap.set(doc.id, company.name);
    });

    overageSnapshot.forEach(doc => {
      const overage = doc.data() as AIOverageCharge;
      
      totalOverageRevenue += overage.overageChargeUSD || 0;
      totalCreditsOverage += overage.creditsOverLimit || 0;
      
      if (overage.billingStatus === 'pending' || overage.billingStatus === 'invoiced') {
        pendingInvoices++;
      }
      if (overage.billingStatus === 'paid') {
        paidInvoices++;
      }

      overageByCompany.push({
        companyId: overage.companyId,
        companyName: companiesMap.get(overage.companyId) || 'Unknown',
        overageCharge: overage.overageChargeUSD || 0,
        creditsOverLimit: overage.creditsOverLimit || 0,
        billingStatus: overage.billingStatus || 'pending',
        planId: overage.planId,
      });
    });

    // Sort by overage charge descending
    overageByCompany.sort((a, b) => b.overageCharge - a.overageCharge);

    return {
      success: true,
      data: {
        currentMonth: {
          totalOverageRevenue,
          companiesWithOverage: overageByCompany.length,
          pendingInvoices,
          paidInvoices,
          totalCreditsOverage,
        },
        byCompany: overageByCompany,
      },
    };
  } catch (error: any) {
    console.error('Error getting platform overage revenue:', error);
    return {
      success: false,
      error: error.message || 'Failed to get overage revenue',
    };
  }
}

/**
 * Get free tier abuse analysis
 * Identifies free users consuming excessive resources
 */
export async function getFreeTierAbuseAnalysisAction(): Promise<{
  success: boolean;
  data?: {
    totalFreePlanCompanies: number;
    totalFreePlanCost: number;
    averageCostPerFreeUser: number;
    highCostFreeUsers: Array<{
      companyId: string;
      companyName: string;
      monthlyCreditsUsed: number;
      estimatedCost: number;
      operations: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    }>;
    recommendations: string[];
  };
  error?: string;
}> {
  try {
    // Verify super admin authorization
    const authResult = await getUserFromServerSession();
    if (!authResult.success || authResult.user?.role !== 'superadmin') {
      return { success: false, error: 'Unauthorized: Super Admin access required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get all companies on free plan
    const companiesSnapshot = await getDocs(collection(serverDb, 'companies'));
    const freeCompanies: Array<{ id: string; name: string; planId: string }> = [];
    
    companiesSnapshot.forEach(doc => {
      const company = doc.data() as Company;
      if (company.planId === 'plan_free') {
        freeCompanies.push({
          id: doc.id,
          name: company.name,
          planId: company.planId,
        });
      }
    });

    // Get AI usage for free plan companies
    const highCostFreeUsers: Array<{
      companyId: string;
      companyName: string;
      monthlyCreditsUsed: number;
      estimatedCost: number;
      operations: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    let totalFreePlanCost = 0;

    for (const company of freeCompanies) {
      const quotaRef = doc(serverDb, 'aiQuotas', `${company.id}_${currentMonth}`);
      const quotaDoc = await getDoc(quotaRef);

      if (quotaDoc.exists()) {
        const quota = quotaDoc.data();
        const creditsUsed = quota.creditsUsed || 0;
        const cost = quota.estimatedCost || 0;
        const operations = quota.operationsThisMonth || 0;

        totalFreePlanCost += cost;

        // Determine risk level based on cost
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (cost > 5) riskLevel = 'critical';  // Over $5/month
        else if (cost > 2) riskLevel = 'high';  // Over $2/month
        else if (cost > 1) riskLevel = 'medium'; // Over $1/month

        if (cost > 0.50) { // Only track users costing more than $0.50
          highCostFreeUsers.push({
            companyId: company.id,
            companyName: company.name,
            monthlyCreditsUsed: creditsUsed,
            estimatedCost: cost,
            operations,
            riskLevel,
          });
        }
      }
    }

    // Sort by cost descending
    highCostFreeUsers.sort((a, b) => b.estimatedCost - a.estimatedCost);

    const averageCostPerFreeUser = freeCompanies.length > 0 
      ? totalFreePlanCost / freeCompanies.length 
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (averageCostPerFreeUser > 0.50) {
      recommendations.push('⚠️ Free users are costing more than $0.50/month on average - consider reducing free tier limits');
    }
    
    const criticalUsers = highCostFreeUsers.filter(u => u.riskLevel === 'critical');
    if (criticalUsers.length > 0) {
      recommendations.push(`🚨 ${criticalUsers.length} free users are costing >$5/month - contact them to upgrade immediately`);
    }

    if (totalFreePlanCost > 100) {
      recommendations.push(`💰 Total free plan cost is $${totalFreePlanCost.toFixed(2)}/month - consider implementing stricter limits`);
    }

    return {
      success: true,
      data: {
        totalFreePlanCompanies: freeCompanies.length,
        totalFreePlanCost,
        averageCostPerFreeUser,
        highCostFreeUsers,
        recommendations,
      },
    };
  } catch (error: any) {
    console.error('Error analyzing free tier abuse:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze free tier abuse',
    };
  }
}

/**
 * Emergency pause AI operations for a specific company
 */
export async function emergencyPauseCompanyAIAction(
  companyId: string,
  reason: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    // Verify super admin authorization
    const authResult = await getUserFromServerSession();
    if (!authResult.success || authResult.user?.role !== 'superadmin') {
      return { success: false, error: 'Unauthorized: Super Admin access required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);

    if (!companyDoc.exists()) {
      return { success: false, error: 'Company not found' };
    }

    // Add aiOperationsPaused flag to company document
    await updateDoc(companyRef, {
      aiOperationsPaused: true,
      aiPausedReason: reason,
      aiPausedAt: new Date().toISOString(),
      aiPausedBy: authResult.user.uid,
      lastUpdated: serverTimestamp(),
    });

    const companyName = companyDoc.data().name;

    console.log(`🚨 EMERGENCY: AI operations paused for company ${companyName} (${companyId}). Reason: ${reason}`);

    return {
      success: true,
      message: `AI operations paused for ${companyName}. Reason: ${reason}`,
    };
  } catch (error: any) {
    console.error('Error pausing company AI:', error);
    return {
      success: false,
      error: error.message || 'Failed to pause company AI',
    };
  }
}

/**
 * Resume AI operations for a company
 */
export async function resumeCompanyAIAction(
  companyId: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    // Verify super admin authorization
    const authResult = await getUserFromServerSession();
    if (!authResult.success || authResult.user?.role !== 'superadmin') {
      return { success: false, error: 'Unauthorized: Super Admin access required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);

    if (!companyDoc.exists()) {
      return { success: false, error: 'Company not found' };
    }

    await updateDoc(companyRef, {
      aiOperationsPaused: false,
      aiPausedReason: null,
      aiResumedAt: new Date().toISOString(),
      aiResumedBy: authResult.user.uid,
      lastUpdated: serverTimestamp(),
    });

    const companyName = companyDoc.data().name;

    console.log(`✅ AI operations resumed for company ${companyName} (${companyId})`);

    return {
      success: true,
      message: `AI operations resumed for ${companyName}`,
    };
  } catch (error: any) {
    console.error('Error resuming company AI:', error);
    return {
      success: false,
      error: error.message || 'Failed to resume company AI',
    };
  }
}

/**
 * Get list of companies with AI operations paused
 */
export async function getPausedCompaniesAction(): Promise<{
  success: boolean;
  data?: Array<{
    companyId: string;
    companyName: string;
    reason: string;
    pausedAt: string;
    pausedBy: string;
  }>;
  error?: string;
}> {
  try {
    // Verify super admin authorization
    const authResult = await getUserFromServerSession();
    if (!authResult.success || authResult.user?.role !== 'superadmin') {
      return { success: false, error: 'Unauthorized: Super Admin access required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const companiesQuery = query(
      collection(serverDb, 'companies'),
      where('aiOperationsPaused', '==', true)
    );

    const companiesSnapshot = await getDocs(companiesQuery);
    const pausedCompanies: Array<{
      companyId: string;
      companyName: string;
      reason: string;
      pausedAt: string;
      pausedBy: string;
    }> = [];

    companiesSnapshot.forEach(doc => {
      const company = doc.data() as any;
      pausedCompanies.push({
        companyId: doc.id,
        companyName: company.name,
        reason: company.aiPausedReason || 'No reason specified',
        pausedAt: company.aiPausedAt || '',
        pausedBy: company.aiPausedBy || 'Unknown',
      });
    });

    return {
      success: true,
      data: pausedCompanies,
    };
  } catch (error: any) {
    console.error('Error getting paused companies:', error);
    return {
      success: false,
      error: error.message || 'Failed to get paused companies',
    };
  }
}

/**
 * Credit Balance Helper
 * Manages dual credit system (lifetime vs monthly credits)
 * Free plan: One-time 20 credits (never refills)
 * Paid plans: Monthly credits (refills on 1st of each month)
 */

'use server';

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Plan, Company } from '@/types/saas';

export interface CreditBalance {
  lifetimeAllocated: number;
  lifetimeUsed: number;
  monthlyAllocated: number;
  monthlyUsed: number;
  currentMonth: string;
  lastResetAt: string;
}

/**
 * Get current month string (YYYY-MM)
 */
export async function getCurrentMonth(): Promise<string> {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Initialize credit balance for a company based on their plan
 */
export async function initializeCreditBalance(
  companyId: string,
  plan: Plan
): Promise<CreditBalance> {
  const currentMonth = await getCurrentMonth();
  // Use aiMonthlyCredits (new field) with fallback to aiCreditsPerMonth (deprecated)
  const monthlyCredits = plan.aiMonthlyCredits ?? plan.aiCreditsPerMonth ?? 0;
  const balance: CreditBalance = {
    lifetimeAllocated: plan.aiLifetimeCredits || 0,
    lifetimeUsed: 0,
    monthlyAllocated: monthlyCredits,
    monthlyUsed: 0,
    currentMonth,
    lastResetAt: new Date().toISOString(),
  };

  if (serverDb) {
    const companyRef = doc(serverDb, 'companies', companyId);
    await updateDoc(companyRef, {
      aiCreditBalance: balance,
    });
  }

  return balance;
}

/**
 * Get or create credit balance for a company
 * Auto-syncs allocated amounts with current plan (preserves usage)
 */
export async function getCreditBalance(
  companyId: string
): Promise<CreditBalance | null> {
  if (!serverDb) return null;

  const companyRef = doc(serverDb, 'companies', companyId);
  const companyDoc = await getDoc(companyRef);

  if (!companyDoc.exists()) return null;

  const company = companyDoc.data() as Company;

  // Get current plan
  const planRef = doc(serverDb, 'plans', company.planId);
  const planDoc = await getDoc(planRef);

  if (!planDoc.exists()) return null;

  const plan = planDoc.data() as Plan;

  // If balance doesn't exist, initialize it
  if (!company.aiCreditBalance) {
    return await initializeCreditBalance(companyId, plan);
  }

  const balance = company.aiCreditBalance;

  // AUTO-SYNC: Check if allocated amounts match current plan
  // This fixes cases where plan changed or was misconfigured
  // Use aiMonthlyCredits (new field) with fallback to aiCreditsPerMonth (deprecated)
  const planMonthlyCredits = plan.aiMonthlyCredits ?? plan.aiCreditsPerMonth ?? 0;
  const needsSync =
    balance.monthlyAllocated !== planMonthlyCredits ||
    balance.lifetimeAllocated !== (plan.aiLifetimeCredits || 0);

  if (needsSync) {
    // Update allocated amounts to match plan (preserve used amounts)
    balance.monthlyAllocated = planMonthlyCredits;
    balance.lifetimeAllocated = plan.aiLifetimeCredits || 0;

    await updateDoc(companyRef, {
      'aiCreditBalance.monthlyAllocated': balance.monthlyAllocated,
      'aiCreditBalance.lifetimeAllocated': balance.lifetimeAllocated,
    });
  }

  return balance;
}

/**
 * Check if company has credits available (dual system check)
 */
export async function hasCreditsAvailable(
  companyId: string,
  creditsRequired: number = 1
): Promise<{
  available: boolean;
  reason?: string;
  lifetimeRemaining?: number;
  monthlyRemaining?: number;
}> {
  if (!serverDb) {
    return { available: false, reason: 'Database not initialized' };
  }

  const companyRef = doc(serverDb, 'companies', companyId);
  const companyDoc = await getDoc(companyRef);

  if (!companyDoc.exists()) {
    return { available: false, reason: 'Company not found' };
  }

  const company = companyDoc.data() as Company;

  // BYOK bypass - unlimited credits
  if (company.useOwnGeminiApiKey && company.geminiApiKeyId) {
    return {
      available: true,
      reason: 'Using own API key - unlimited',
    };
  }

  const balance = await getCreditBalance(companyId);
  if (!balance) {
    return { available: false, reason: 'Credit balance not found' };
  }

  // Check if month has changed (trigger reset)
  const currentMonth = await getCurrentMonth();
  if (balance.currentMonth !== currentMonth) {
    await resetMonthlyCredits(companyId, balance);
    balance.monthlyUsed = 0;
    balance.currentMonth = currentMonth;
  }

  // Free plan: Check lifetime credits first
  if (balance.lifetimeAllocated > 0) {
    const lifetimeRemaining = balance.lifetimeAllocated - balance.lifetimeUsed;
    
    if (lifetimeRemaining >= creditsRequired) {
      return {
        available: true,
        lifetimeRemaining,
        monthlyRemaining: 0,
      };
    } else {
      return {
        available: false,
        reason: `All ${balance.lifetimeAllocated} free credits used. Upgrade for more!`,
        lifetimeRemaining: 0,
        monthlyRemaining: 0,
      };
    }
  }

  // Paid plans: Check monthly credits
  const monthlyRemaining = balance.monthlyAllocated - balance.monthlyUsed;
  
  if (monthlyRemaining >= creditsRequired) {
    return {
      available: true,
      monthlyRemaining,
      lifetimeRemaining: 0,
    };
  } else {
    return {
      available: false,
      reason: `Monthly credit limit reached (${balance.monthlyAllocated}). Resets next month.`,
      monthlyRemaining: 0,
      lifetimeRemaining: 0,
    };
  }
}

/**
 * Deduct credits from balance (lifetime or monthly)
 */
export async function deductCredits(
  companyId: string,
  creditsUsed: number
): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  const balance = await getCreditBalance(companyId);
  if (!balance) {
    return { success: false, error: 'Credit balance not found' };
  }

  const companyRef = doc(serverDb, 'companies', companyId);

  // Deduct from lifetime credits (Free plan)
  if (balance.lifetimeAllocated > 0) {
    const newLifetimeUsed = balance.lifetimeUsed + creditsUsed;
    
    await updateDoc(companyRef, {
      'aiCreditBalance.lifetimeUsed': newLifetimeUsed,
    });
    
    return { success: true };
  }

  // Deduct from monthly credits (Paid plans)
  const newMonthlyUsed = balance.monthlyUsed + creditsUsed;
  
  await updateDoc(companyRef, {
    'aiCreditBalance.monthlyUsed': newMonthlyUsed,
  });

  return { success: true };
}

/**
 * Reset monthly credits (called on 1st of each month)
 */
export async function resetMonthlyCredits(
  companyId: string,
  currentBalance?: CreditBalance
): Promise<void> {
  if (!serverDb) return;

  const balance = currentBalance || (await getCreditBalance(companyId));
  if (!balance) return;

  // Only reset monthly credits, NOT lifetime
  const companyRef = doc(serverDb, 'companies', companyId);
  const currentMonth = await getCurrentMonth();
  await updateDoc(companyRef, {
    'aiCreditBalance.monthlyUsed': 0,
    'aiCreditBalance.currentMonth': currentMonth,
    'aiCreditBalance.lastResetAt': new Date().toISOString(),
  });

  console.log(`✅ Reset monthly credits for company ${companyId}`);
}

/**
 * Manually add credits (super admin only)
 */
export async function addBonusCredits(
  companyId: string,
  creditsToAdd: number,
  type: 'lifetime' | 'monthly' = 'lifetime'
): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  const balance = await getCreditBalance(companyId);
  if (!balance) {
    return { success: false, error: 'Credit balance not found' };
  }

  const companyRef = doc(serverDb, 'companies', companyId);

  if (type === 'lifetime') {
    await updateDoc(companyRef, {
      'aiCreditBalance.lifetimeAllocated': balance.lifetimeAllocated + creditsToAdd,
    });
  } else {
    await updateDoc(companyRef, {
      'aiCreditBalance.monthlyAllocated': balance.monthlyAllocated + creditsToAdd,
    });
  }

  return { success: true };
}

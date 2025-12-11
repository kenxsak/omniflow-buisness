'use server';

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getMonthlySpend } from './cost-tracker';
import { DEFAULT_BUDGET_SETTINGS, type CompanyBudget, type CostAlert } from './cost-types';

export async function getCompanyBudget(companyId: string): Promise<CompanyBudget> {
  if (!serverDb) {
    return {
      companyId,
      ...DEFAULT_BUDGET_SETTINGS,
      dailyLimit: DEFAULT_BUDGET_SETTINGS.monthlyBudget / 30,
      currentMonthSpent: 0,
      isBlocked: false,
    };
  }

  const docRef = doc(serverDb, 'companyBudgets', companyId);

  try {
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as CompanyBudget;
      data.currentMonthSpent = await getMonthlySpend(companyId);
      return data;
    }

    const defaultBudget: CompanyBudget = {
      companyId,
      monthlyBudget: DEFAULT_BUDGET_SETTINGS.monthlyBudget,
      dailyLimit: DEFAULT_BUDGET_SETTINGS.monthlyBudget / 30,
      alertThreshold: DEFAULT_BUDGET_SETTINGS.alertThreshold,
      blockThreshold: DEFAULT_BUDGET_SETTINGS.blockThreshold,
      currentMonthSpent: 0,
      isBlocked: false,
    };

    await setDoc(docRef, defaultBudget);
    return defaultBudget;
  } catch (error) {
    console.error('Error getting company budget:', error);
    return {
      companyId,
      ...DEFAULT_BUDGET_SETTINGS,
      dailyLimit: DEFAULT_BUDGET_SETTINGS.monthlyBudget / 30,
      currentMonthSpent: 0,
      isBlocked: false,
    };
  }
}

export async function updateCompanyBudget(
  companyId: string,
  updates: Partial<Omit<CompanyBudget, 'companyId' | 'currentMonthSpent'>>
): Promise<void> {
  if (!serverDb) return;

  const docRef = doc(serverDb, 'companyBudgets', companyId);

  try {
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating company budget:', error);
  }
}

export async function checkBudget(
  companyId: string,
  estimatedCost: number
): Promise<{ allowed: boolean; warning?: string; percentUsed: number }> {
  const budget = await getCompanyBudget(companyId);
  const projectedSpend = budget.currentMonthSpent + estimatedCost;
  const percentUsed = (projectedSpend / budget.monthlyBudget) * 100;

  if (budget.isBlocked) {
    return {
      allowed: false,
      warning: 'Account is blocked due to budget overage. Please contact support.',
      percentUsed,
    };
  }

  if (percentUsed >= budget.blockThreshold) {
    return {
      allowed: false,
      warning: `Monthly budget limit reached (${percentUsed.toFixed(1)}% used). Upgrade your plan or wait for next month.`,
      percentUsed,
    };
  }

  if (percentUsed >= budget.alertThreshold) {
    return {
      allowed: true,
      warning: `You've used ${percentUsed.toFixed(1)}% of your monthly budget.`,
      percentUsed,
    };
  }

  return { allowed: true, percentUsed };
}

export async function enforceBudget(
  companyId: string,
  estimatedCost: number
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await checkBudget(companyId, estimatedCost);

  if (!result.allowed) {
    return {
      success: false,
      error: result.warning || 'Budget limit exceeded',
    };
  }

  return { success: true };
}

export async function createCostAlert(
  companyId: string,
  type: 'warning' | 'critical' | 'blocked',
  threshold: number,
  currentSpend: number
): Promise<void> {
  if (!serverDb) return;

  const alertId = `${companyId}_${Date.now()}`;
  const messages = {
    warning: `You've used ${threshold}% of your monthly budget ($${currentSpend.toFixed(2)} spent).`,
    critical: `Critical: You've used ${threshold}% of your monthly budget ($${currentSpend.toFixed(2)} spent).`,
    blocked: `Your account has been blocked due to exceeding budget limits ($${currentSpend.toFixed(2)} spent).`,
  };

  const alert: CostAlert = {
    id: alertId,
    companyId,
    type,
    threshold,
    currentSpend,
    message: messages[type],
    createdAt: new Date(),
    acknowledged: false,
  };

  const docRef = doc(serverDb, 'costAlerts', alertId);
  await setDoc(docRef, alert);
}

export async function getBudgetStatus(companyId: string): Promise<{
  budget: CompanyBudget;
  percentUsed: number;
  daysRemaining: number;
  projectedMonthEnd: number;
  status: 'healthy' | 'warning' | 'critical' | 'blocked';
}> {
  const budget = await getCompanyBudget(companyId);
  const percentUsed = (budget.currentMonthSpent / budget.monthlyBudget) * 100;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  
  const dailyAverage = budget.currentMonthSpent / dayOfMonth;
  const projectedMonthEnd = dailyAverage * daysInMonth;

  let status: 'healthy' | 'warning' | 'critical' | 'blocked' = 'healthy';
  if (budget.isBlocked) status = 'blocked';
  else if (percentUsed >= budget.blockThreshold) status = 'critical';
  else if (percentUsed >= budget.alertThreshold) status = 'warning';

  return {
    budget,
    percentUsed,
    daysRemaining,
    projectedMonthEnd,
    status,
  };
}

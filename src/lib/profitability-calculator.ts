/**
 * Profitability Calculator with Free Tier Awareness
 * Calculates real-time profitability for plans and platform-wide usage
 * Takes into account Gemini API and Firebase free tiers
 */

import type { Plan } from '@/types/saas';
import type {
  AICreditConfiguration,
  AIPricing,
  FreeTierLimits,
} from '@/types/ai-usage';
import {
  DEFAULT_CREDIT_CONFIG,
  DEFAULT_AI_PRICING,
  PLATFORM_PRICING_MARGIN,
  DEFAULT_FREE_TIER_LIMITS,
} from '@/types/ai-usage';

/**
 * Usage pattern for profitability calculation
 */
export interface UsagePattern {
  textGenerations: number;
  imageGenerations: number;
  ttsRequests: number;
  avgInputTokens?: number;
  avgOutputTokens?: number;
  avgCharacters?: number;
}

/**
 * Profitability result for a plan
 */
export interface PlanProfitability {
  planId: string;
  planName: string;
  monthlyRevenue: number;
  
  // Costs
  bestCaseCost: number;        // All text generation
  worstCaseCost: number;       // All images
  typicalCaseCost: number;     // 70% text, 30% images
  
  // Profits
  bestCaseProfit: number;
  worstCaseProfit: number;
  typicalCaseProfit: number;
  
  // Analysis
  isProfitable: boolean;        // All scenarios profitable?
  riskLevel: 'safe' | 'moderate' | 'risky' | 'unprofitable';
  breakEvenImages: number;      // How many images before loss
  
  // Free tier savings (if applicable)
  freeTierSavings: number;
  actualCostAfterFreeTier: number;
}

/**
 * Platform-wide profitability analysis
 */
export interface PlatformProfitability {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;         // Percentage
  
  freeTierSavings: number;
  actualCostPaid: number;
  
  planBreakdown: {
    planId: string;
    planName: string;
    userCount: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
}

/**
 * Calculate profitability for a single plan
 */
export function calculatePlanProfitability(
  plan: Plan,
  creditConfig: AICreditConfiguration = DEFAULT_CREDIT_CONFIG,
  pricing: AIPricing = DEFAULT_AI_PRICING,
): PlanProfitability {
  const monthlyRevenue = plan.priceMonthlyUSD;
  const availableCredits = plan.aiCreditsPerMonth;
  
  // Best case: All credits used for text generation (cheapest)
  const textGenerations = availableCredits / creditConfig.textGenerationCredits;
  const avgTokens = 1000; // Assumption: 500 input + 500 output
  const textCostPerGeneration = ((avgTokens / 2) / 1_000_000 * pricing.textGeneration.input) +
                                 ((avgTokens / 2) / 1_000_000 * pricing.textGeneration.output);
  const bestCaseCost = textGenerations * textCostPerGeneration;
  
  // Worst case: All credits used for image generation (most expensive)
  const maxImages = Math.min(
    Math.floor(availableCredits / creditConfig.imageGenerationCredits),
    plan.maxImagesPerMonth || 999999
  );
  const worstCaseCost = maxImages * pricing.imageGeneration.imagen4Ultra;
  
  // Typical case: 70% text, 30% images
  const textCredits = availableCredits * 0.7;
  const imageCredits = availableCredits * 0.3;
  const typicalTextGenerations = textCredits / creditConfig.textGenerationCredits;
  const typicalImages = Math.min(
    Math.floor(imageCredits / creditConfig.imageGenerationCredits),
    plan.maxImagesPerMonth || 999999
  );
  const typicalCaseCost = (typicalTextGenerations * textCostPerGeneration) + 
                          (typicalImages * pricing.imageGeneration.imagen3);
  
  // Calculate profits
  const bestCaseProfit = monthlyRevenue - bestCaseCost;
  const worstCaseProfit = monthlyRevenue - worstCaseCost;
  const typicalCaseProfit = monthlyRevenue - typicalCaseCost;
  
  // Determine risk level
  let riskLevel: 'safe' | 'moderate' | 'risky' | 'unprofitable';
  const isProfitable = worstCaseProfit >= 0;
  
  if (worstCaseProfit >= 0) {
    riskLevel = 'safe';
  } else if (typicalCaseProfit >= monthlyRevenue * 0.5) {
    riskLevel = 'moderate';
  } else if (typicalCaseProfit >= 0) {
    riskLevel = 'risky';
  } else {
    riskLevel = 'unprofitable';
  }
  
  // Calculate break-even point for images
  const breakEvenImages = Math.floor(monthlyRevenue / pricing.imageGeneration.imagen3);
  
  return {
    planId: plan.id,
    planName: plan.name,
    monthlyRevenue,
    bestCaseCost,
    worstCaseCost,
    typicalCaseCost,
    bestCaseProfit,
    worstCaseProfit,
    typicalCaseProfit,
    isProfitable,
    riskLevel,
    breakEvenImages,
    freeTierSavings: 0, // Calculated separately if tracking free tier
    actualCostAfterFreeTier: typicalCaseCost,
  };
}

/**
 * Calculate profitability for all plans
 */
export function calculateAllPlansProfitability(
  plans: Plan[],
  creditConfig: AICreditConfiguration = DEFAULT_CREDIT_CONFIG,
  pricing: AIPricing = DEFAULT_AI_PRICING,
): PlanProfitability[] {
  return plans.map(plan => calculatePlanProfitability(plan, creditConfig, pricing));
}

/**
 * Calculate platform-wide profitability
 */
export function calculatePlatformProfitability(
  userDistribution: { planId: string; userCount: number }[],
  plans: Plan[],
  creditConfig: AICreditConfiguration = DEFAULT_CREDIT_CONFIG,
  pricing: AIPricing = DEFAULT_AI_PRICING,
): PlatformProfitability {
  let totalRevenue = 0;
  let totalCost = 0;
  
  const planBreakdown = userDistribution.map(({ planId, userCount }) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return {
        planId,
        planName: 'Unknown',
        userCount,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
    
    const profitability = calculatePlanProfitability(plan, creditConfig, pricing);
    const revenue = plan.priceMonthlyUSD * userCount;
    const cost = profitability.typicalCaseCost * userCount;
    const profit = revenue - cost;
    
    totalRevenue += revenue;
    totalCost += cost;
    
    return {
      planId: plan.id,
      planName: plan.name,
      userCount,
      revenue,
      cost,
      profit,
    };
  });
  
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
    freeTierSavings: 0, // Calculated separately with actual usage data
    actualCostPaid: totalCost,
    planBreakdown,
  };
}

/**
 * Calculate cost for actual usage pattern
 */
export function calculateUsageCost(
  usage: UsagePattern,
  pricing: AIPricing = DEFAULT_AI_PRICING,
): { rawCost: number; platformCost: number; margin: number } {
  // Text generation cost
  const textInputCost = ((usage.avgInputTokens || 500) * usage.textGenerations / 1_000_000) * pricing.textGeneration.input;
  const textOutputCost = ((usage.avgOutputTokens || 500) * usage.textGenerations / 1_000_000) * pricing.textGeneration.output;
  const textCost = textInputCost + textOutputCost;
  
  // Image generation cost
  const imageCost = usage.imageGenerations * pricing.imageGeneration.imagen3;
  
  // TTS cost
  const ttsCost = (usage.avgCharacters || 500) * usage.ttsRequests * pricing.textToSpeech.perCharacter;
  
  const rawCost = textCost + imageCost + ttsCost;
  const platformCost = rawCost * PLATFORM_PRICING_MARGIN;
  const margin = platformCost - rawCost;
  
  return { rawCost, platformCost, margin };
}

/**
 * Calculate free tier savings for a given day
 */
export function calculateFreeTierSavings(
  totalRequests: number,
  totalImages: number,
  freeTierLimits: FreeTierLimits = DEFAULT_FREE_TIER_LIMITS,
  pricing: AIPricing = DEFAULT_AI_PRICING,
): { savedCost: number; paidCost: number; freeTierExhausted: boolean } {
  const geminiDailyLimit = freeTierLimits.gemini.requestsPerDay;
  
  // Requests within free tier
  const freeRequests = Math.min(totalRequests, geminiDailyLimit);
  const paidRequests = Math.max(0, totalRequests - geminiDailyLimit);
  
  // Estimate cost saved (assuming mix of text and images)
  const avgCostPerRequest = ((pricing.textGeneration.input + pricing.textGeneration.output) / 1_000_000 * 1000 +
                              pricing.imageGeneration.imagen3 * (totalImages / totalRequests)) / 2;
  
  const savedCost = freeRequests * avgCostPerRequest;
  const paidCost = paidRequests * avgCostPerRequest;
  
  return {
    savedCost,
    paidCost,
    freeTierExhausted: totalRequests > geminiDailyLimit,
  };
}

/**
 * Recommend optimal plan for usage pattern
 */
export function recommendPlanForUsage(
  usage: UsagePattern,
  plans: Plan[],
  creditConfig: AICreditConfiguration = DEFAULT_CREDIT_CONFIG,
): { recommendedPlan: Plan; monthlyCreditsNeeded: number; estimatedCost: number } {
  // Calculate total credits needed
  const creditsNeeded = 
    (usage.textGenerations * creditConfig.textGenerationCredits) +
    (usage.imageGenerations * creditConfig.imageGenerationCredits) +
    (usage.ttsRequests * creditConfig.ttsCredits);
  
  // Find the smallest plan that fits
  const sortedPlans = [...plans]
    .filter(p => p.aiCreditsPerMonth >= creditsNeeded)
    .sort((a, b) => a.priceMonthlyUSD - b.priceMonthlyUSD);
  
  const recommendedPlan = sortedPlans[0] || plans[plans.length - 1];
  const estimatedCost = calculateUsageCost(usage).rawCost;
  
  return {
    recommendedPlan,
    monthlyCreditsNeeded: creditsNeeded,
    estimatedCost,
  };
}

/**
 * Generate profitability report
 */
export function generateProfitabilityReport(
  plans: Plan[],
  userDistribution: { planId: string; userCount: number }[],
): string {
  const allPlansProfitability = calculateAllPlansProfitability(plans);
  const platformProfitability = calculatePlatformProfitability(userDistribution, plans);
  
  let report = '# Profitability Analysis Report\n\n';
  report += `## Platform Overview\n`;
  report += `- Total Revenue: $${platformProfitability.totalRevenue.toFixed(2)}/month\n`;
  report += `- Total Cost: $${platformProfitability.totalCost.toFixed(2)}/month\n`;
  report += `- Total Profit: $${platformProfitability.totalProfit.toFixed(2)}/month\n`;
  report += `- Profit Margin: ${platformProfitability.profitMargin.toFixed(1)}%\n\n`;
  
  report += `## Plan Analysis\n\n`;
  allPlansProfitability.forEach(p => {
    const status = p.isProfitable ? '✅' : '❌';
    report += `### ${status} ${p.planName} ($${p.monthlyRevenue}/month)\n`;
    report += `- Risk Level: ${p.riskLevel.toUpperCase()}\n`;
    report += `- Best Case Profit: $${p.bestCaseProfit.toFixed(2)}\n`;
    report += `- Typical Profit: $${p.typicalCaseProfit.toFixed(2)}\n`;
    report += `- Worst Case Profit: $${p.worstCaseProfit.toFixed(2)}\n`;
    report += `- Break-even Images: ${p.breakEvenImages}\n\n`;
  });
  
  return report;
}

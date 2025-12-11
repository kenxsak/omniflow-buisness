/**
 * Personalized Quick Actions Recommendation Engine
 * 
 * This service analyzes user behavior patterns to provide intelligent,
 * personalized action recommendations. It considers multiple factors:
 * - User stage (new, beginner, intermediate, advanced, power_user)
 * - Feature usage patterns and recency
 * - Industry-specific best practices
 * - User goals from onboarding
 * - Urgency based on dormancy and business impact
 */

import type {
  UserBehaviorMetrics,
  EnhancedQuickAction,
  RecommendationType,
  UrgencyLevel,
  RecommendationScore,
  IndustryType,
  UserGoal,
} from '@/types/behavior';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * Classify user stage based on behavior metrics
 * 
 * Stages:
 * - new: Less than 7 days old, minimal activity
 * - beginner: 7-30 days, basic feature usage
 * - intermediate: 30+ days, regular usage, some advanced features
 * - advanced: 60+ days, frequent usage, multiple integrations
 * - power_user: 90+ days, heavy usage, automations, full feature adoption
 */
export function classifyUserStage(metrics: UserBehaviorMetrics): UserBehaviorMetrics['userStage'] {
  const accountAge = differenceInDays(new Date(), parseISO(metrics.createdAt));
  const { totalLogins, featureUsage, automation, crmIntegration, campaignEngagement } = metrics;
  
  // Power User: 90+ days, heavy engagement
  if (
    accountAge >= 90 &&
    totalLogins >= 50 &&
    featureUsage.length >= 8 &&
    automation.hasAutomations &&
    (crmIntegration.hasHubspot || crmIntegration.hasZoho || crmIntegration.hasBitrix24)
  ) {
    return 'power_user';
  }
  
  // Advanced: 60+ days, strong engagement
  if (
    accountAge >= 60 &&
    totalLogins >= 30 &&
    featureUsage.length >= 6 &&
    campaignEngagement.emailsSentCount >= 5
  ) {
    return 'advanced';
  }
  
  // Intermediate: 30+ days, regular usage
  if (
    accountAge >= 30 &&
    totalLogins >= 15 &&
    featureUsage.length >= 4
  ) {
    return 'intermediate';
  }
  
  // Beginner: 7+ days, some activity
  if (accountAge >= 7 && totalLogins >= 3) {
    return 'beginner';
  }
  
  // New: Less than 7 days or minimal activity
  return 'new';
}

/**
 * Calculate urgency score (0-40 points)
 * 
 * Based on:
 * - Days since last action (higher urgency for longer dormancy)
 * - Feature criticality for business
 * - User stage (new users get different urgency)
 */
function calculateUrgencyScore(
  daysSinceLastAction: number | null,
  featureCriticality: 'high' | 'medium' | 'low',
  userStage: UserBehaviorMetrics['userStage']
): number {
  let score = 0;
  
  // Base urgency from dormancy
  if (daysSinceLastAction === null) {
    // Never used - high urgency for new users
    score += userStage === 'new' || userStage === 'beginner' ? 30 : 20;
  } else if (daysSinceLastAction >= 30) {
    score += 35; // Very dormant
  } else if (daysSinceLastAction >= 14) {
    score += 25; // Moderately dormant
  } else if (daysSinceLastAction >= 7) {
    score += 15; // Slightly dormant
  } else {
    score += 5; // Recently used
  }
  
  // Adjust for feature criticality
  if (featureCriticality === 'high') {
    score *= 1.2;
  } else if (featureCriticality === 'low') {
    score *= 0.8;
  }
  
  return Math.min(40, Math.round(score));
}

/**
 * Calculate impact score (0-30 points)
 * 
 * Based on:
 * - Business impact of the action
 * - Alignment with user goals
 * - Industry-specific value
 */
function calculateImpactScore(
  businessImpact: 'high' | 'medium' | 'low',
  alignsWithGoal: boolean,
  industryRelevance: 'high' | 'medium' | 'low'
): number {
  let score = 0;
  
  // Base impact from business value
  if (businessImpact === 'high') {
    score += 20;
  } else if (businessImpact === 'medium') {
    score += 12;
  } else {
    score += 5;
  }
  
  // Goal alignment bonus
  if (alignsWithGoal) {
    score += 5;
  }
  
  // Industry relevance bonus
  if (industryRelevance === 'high') {
    score += 5;
  } else if (industryRelevance === 'medium') {
    score += 2;
  }
  
  return Math.min(30, score);
}

/**
 * Calculate ease score (0-20 points)
 * 
 * Based on:
 * - Complexity of the action
 * - Prerequisites met
 * - User's technical ability
 */
function calculateEaseScore(
  complexity: 'easy' | 'medium' | 'hard',
  prerequisitesMet: boolean,
  userStage: UserBehaviorMetrics['userStage']
): number {
  let score = 0;
  
  // Base ease from complexity
  if (complexity === 'easy') {
    score += 15;
  } else if (complexity === 'medium') {
    score += 10;
  } else {
    score += 5;
  }
  
  // Prerequisites bonus
  if (prerequisitesMet) {
    score += 3;
  }
  
  // Adjust for user skill level
  if (userStage === 'power_user' || userStage === 'advanced') {
    // Advanced users find things easier
    score *= 1.2;
  } else if (userStage === 'new') {
    // New users find things harder
    score *= 0.8;
  }
  
  return Math.min(20, Math.round(score));
}

/**
 * Calculate recency score (0-10 points)
 * 
 * Rewards actions related to recently used features (cross-selling)
 */
function calculateRecencyScore(
  relatedFeatureLastUsed: string | null,
  currentDate: Date
): number {
  if (!relatedFeatureLastUsed) {
    return 0;
  }
  
  const daysSinceRelated = differenceInDays(currentDate, parseISO(relatedFeatureLastUsed));
  
  if (daysSinceRelated <= 1) {
    return 10; // Used today or yesterday
  } else if (daysSinceRelated <= 3) {
    return 7; // Used in last 3 days
  } else if (daysSinceRelated <= 7) {
    return 5; // Used in last week
  } else if (daysSinceRelated <= 14) {
    return 3; // Used in last 2 weeks
  }
  
  return 0;
}

/**
 * Determine urgency level from urgency score
 */
function getUrgencyLevel(urgencyScore: number): UrgencyLevel {
  if (urgencyScore >= 30) return 'critical';
  if (urgencyScore >= 20) return 'high';
  if (urgencyScore >= 10) return 'medium';
  return 'low';
}

/**
 * Determine recommendation type based on scores and context
 */
function getRecommendationType(
  userStage: UserBehaviorMetrics['userStage'],
  easeScore: number,
  daysSinceLastAction: number | null,
  impactScore: number
): RecommendationType {
  // Recovery: Re-engage with dormant features
  if (daysSinceLastAction !== null && daysSinceLastAction >= 14) {
    return 'recovery';
  }
  
  // Quick Win: Easy, high-impact for new/beginner users
  if ((userStage === 'new' || userStage === 'beginner') && easeScore >= 12 && impactScore >= 15) {
    return 'quick_win';
  }
  
  // Optimization: Advanced features for experienced users
  if ((userStage === 'advanced' || userStage === 'power_user') && easeScore <= 10) {
    return 'optimization';
  }
  
  // Growth: Medium difficulty, scaling actions
  return 'growth';
}

/**
 * Calculate comprehensive recommendation score for an action
 */
export function calculateActionScore(
  actionId: string,
  metrics: UserBehaviorMetrics,
  actionConfig: {
    featureCriticality: 'high' | 'medium' | 'low';
    businessImpact: 'high' | 'medium' | 'low';
    complexity: 'easy' | 'medium' | 'hard';
    prerequisitesMet: boolean;
    industryRelevance: 'high' | 'medium' | 'low';
    alignsWithGoal: boolean;
    relatedFeatureLastUsed?: string | null;
    featureName?: string;
  }
): { score: RecommendationScore; urgency: UrgencyLevel; type: RecommendationType; daysSinceLastAction: number | null } {
  const currentDate = new Date();
  
  // Find last usage of this feature
  const featureUsage = actionConfig.featureName 
    ? metrics.featureUsage.find(f => f.featureName === actionConfig.featureName)
    : null;
  
  const daysSinceLastAction = featureUsage 
    ? differenceInDays(currentDate, parseISO(featureUsage.lastUsedAt))
    : null;
  
  // Calculate individual scores
  const urgencyScore = calculateUrgencyScore(
    daysSinceLastAction,
    actionConfig.featureCriticality,
    metrics.userStage
  );
  
  const impactScore = calculateImpactScore(
    actionConfig.businessImpact,
    actionConfig.alignsWithGoal,
    actionConfig.industryRelevance
  );
  
  const easeScore = calculateEaseScore(
    actionConfig.complexity,
    actionConfig.prerequisitesMet,
    metrics.userStage
  );
  
  const recencyScore = calculateRecencyScore(
    actionConfig.relatedFeatureLastUsed || null,
    currentDate
  );
  
  const totalScore = urgencyScore + impactScore + easeScore + recencyScore;
  
  return {
    score: {
      total: Math.min(100, totalScore),
      urgency: urgencyScore,
      impact: impactScore,
      ease: easeScore,
      recency: recencyScore,
    },
    urgency: getUrgencyLevel(urgencyScore),
    type: getRecommendationType(metrics.userStage, easeScore, daysSinceLastAction, impactScore),
    daysSinceLastAction,
  };
}

/**
 * Get badge text based on recommendation type and urgency
 */
export function getRecommendationBadge(
  type: RecommendationType,
  urgency: UrgencyLevel,
  daysSinceLastAction: number | null
): string | undefined {
  // Priority badges
  if (daysSinceLastAction === null) {
    return 'NEW';
  }
  
  if (daysSinceLastAction >= 30) {
    return 'DORMANT';
  }
  
  if (type === 'quick_win') {
    return 'QUICK WIN';
  }
  
  if (type === 'recovery') {
    return 'TRY AGAIN';
  }
  
  if (urgency === 'critical') {
    return 'URGENT';
  }
  
  if (urgency === 'high') {
    return 'RECOMMENDED';
  }
  
  if (daysSinceLastAction !== null && daysSinceLastAction <= 3) {
    return 'TRENDING';
  }
  
  return undefined;
}

/**
 * Get industry-specific multiplier for action relevance
 */
export function getIndustryRelevance(
  industry: IndustryType | undefined,
  actionId: string
): 'high' | 'medium' | 'low' {
  if (!industry || industry === 'other') {
    return 'medium';
  }
  
  const industryMappings: Record<string, Record<string, 'high' | 'medium' | 'low'>> = {
    ecommerce: {
      'digital-card': 'low',
      'email-campaign': 'high',
      'sms-marketing': 'medium',
      'ai-content': 'high',
    },
    saas: {
      'digital-card': 'medium',
      'email-campaign': 'high',
      'ai-content': 'high',
      'automation': 'high',
    },
    professional_services: {
      'digital-card': 'high',
      'email-campaign': 'medium',
      'crm-integration': 'high',
    },
    real_estate: {
      'digital-card': 'high',
      'email-campaign': 'high',
      'sms-marketing': 'high',
      'crm-integration': 'high',
    },
    health_wellness: {
      'digital-card': 'medium',
      'email-campaign': 'high',
      'sms-marketing': 'medium',
      'automation': 'medium',
    },
    education: {
      'digital-card': 'low',
      'email-campaign': 'high',
      'ai-content': 'high',
      'automation': 'medium',
    },
    retail: {
      'digital-card': 'low',
      'email-campaign': 'high',
      'sms-marketing': 'high',
      'ai-content': 'medium',
    },
  };
  
  return industryMappings[industry]?.[actionId] || 'medium';
}

/**
 * Check if action aligns with user goals
 */
export function alignsWithUserGoals(
  goals: UserGoal[] | undefined,
  actionId: string
): boolean {
  if (!goals || goals.length === 0) {
    return false;
  }
  
  const goalMappings: Record<string, UserGoal[]> = {
    'add-lead': ['generate_leads', 'scale_operations'],
    'email-campaign': ['improve_customer_engagement', 'increase_sales', 'build_brand_awareness'],
    'sms-marketing': ['improve_customer_engagement', 'improve_customer_retention'],
    'digital-card': ['generate_leads', 'build_brand_awareness'],
    'ai-content': ['build_brand_awareness', 'automate_marketing', 'scale_operations'],
    'automation': ['automate_marketing', 'scale_operations'],
    'crm-integration': ['generate_leads', 'improve_customer_retention', 'scale_operations'],
  };
  
  const relevantGoals = goalMappings[actionId] || [];
  return goals.some(goal => relevantGoals.includes(goal));
}

/**
 * Format time since last action for display
 */
export function formatTimeSinceLastAction(daysSinceLastAction: number | null): string | undefined {
  if (daysSinceLastAction === null) {
    return undefined;
  }
  
  if (daysSinceLastAction === 0) {
    return 'Today';
  }
  
  if (daysSinceLastAction === 1) {
    return '1 day ago';
  }
  
  if (daysSinceLastAction < 30) {
    return `${daysSinceLastAction} days ago`;
  }
  
  const months = Math.floor(daysSinceLastAction / 30);
  if (months === 1) {
    return '1 month ago';
  }
  
  return `${months} months ago`;
}

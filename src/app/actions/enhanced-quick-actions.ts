'use server';

/**
 * Enhanced Quick Actions Server Action
 * 
 * Provides personalized quick action recommendations based on user behavior,
 * industry, goals, and comprehensive scoring algorithm.
 */

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { EnhancedQuickAction, IndustryType, UserGoal } from '@/types/behavior';
import type { Company } from '@/types/saas';
import { getUserBehaviorMetrics, updateUserBehaviorMetrics } from './behavior-tracking-actions';
import {
  calculateActionScore,
  getRecommendationBadge,
  getIndustryRelevance,
  alignsWithUserGoals,
  formatTimeSinceLastAction,
} from '@/lib/recommendation-engine';

/**
 * Get personalized quick actions for a company
 * Returns enhanced quick actions with scores, badges, and recommendations
 */
export async function getPersonalizedQuickActions(
  companyId: string
): Promise<{ success: boolean; data?: EnhancedQuickAction[]; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get user behavior metrics
    const metricsResult = await getUserBehaviorMetrics(companyId);
    if (!metricsResult.success || !metricsResult.data) {
      return { success: false, error: 'Failed to get behavior metrics' };
    }

    const metrics = metricsResult.data;

    // Get company data
    const companyRef = doc(serverDb, 'companies', companyId);
    const companySnap = await getDoc(companyRef);
    if (!companySnap.exists()) {
      return { success: false, error: 'Company not found' };
    }

    const company = { id: companySnap.id, ...companySnap.data() } as Company & {
      industry?: IndustryType;
      userGoals?: UserGoal[];
    };

    // Get API keys for prerequisite checks
    const hasBrevoKey = !!company.apiKeys?.brevo?.apiKey;
    const hasTwilioKeys = !!(company.apiKeys?.twilio?.accountSid && company.apiKeys?.twilio?.authToken);

    // Get counts from Firestore
    const leadsCount = await getLeadsCount(companyId);
    const digitalCardsCount = await getDigitalCardsCount(companyId);
    const hasDigitalCard = digitalCardsCount > 0;

    // Define all possible quick actions with their configurations
    const actionConfigs = [
      {
        id: 'add-lead',
        title: 'Add Contacts',
        description: leadsCount === 0 
          ? 'Start building your contact list' 
          : `You have ${leadsCount} contact${leadsCount === 1 ? '' : 's'}`,
        link: '/crm?action=add',
        icon: 'user-plus',
        featureName: 'crm',
        config: {
          featureCriticality: 'high' as const,
          businessImpact: 'high' as const,
          complexity: 'easy' as const,
          prerequisitesMet: true,
          industryRelevance: getIndustryRelevance(company.industry, 'add-lead'),
          alignsWithGoal: alignsWithUserGoals(company.userGoals, 'add-lead'),
        },
      },
      {
        id: 'email-campaign',
        title: 'Send Email Campaign',
        description: metrics.campaignEngagement.emailsSentCount === 0
          ? 'Reach your contacts via email'
          : `${metrics.campaignEngagement.emailsSentCount} campaigns sent`,
        link: '/email-marketing/create-campaign',
        icon: 'mail',
        featureName: 'email_marketing',
        config: {
          featureCriticality: 'high' as const,
          businessImpact: 'high' as const,
          complexity: 'medium' as const,
          prerequisitesMet: hasBrevoKey && leadsCount > 0,
          industryRelevance: getIndustryRelevance(company.industry, 'email-campaign'),
          alignsWithGoal: alignsWithUserGoals(company.userGoals, 'email-campaign'),
          relatedFeatureLastUsed: metrics.campaignEngagement.lastEmailSentAt,
        },
      },
      {
        id: 'sms-marketing',
        title: 'Send Text Message',
        description: metrics.campaignEngagement.smsSentCount === 0
          ? 'Connect with contacts via SMS'
          : `${metrics.campaignEngagement.smsSentCount} messages sent`,
        link: '/sms-marketing/send',
        icon: 'message-square',
        featureName: 'sms_marketing',
        config: {
          featureCriticality: 'medium' as const,
          businessImpact: 'medium' as const,
          complexity: 'easy' as const,
          prerequisitesMet: hasTwilioKeys && leadsCount > 0,
          industryRelevance: getIndustryRelevance(company.industry, 'sms-marketing'),
          alignsWithGoal: alignsWithUserGoals(company.userGoals, 'sms-marketing'),
          relatedFeatureLastUsed: metrics.campaignEngagement.lastSmsSentAt,
        },
      },
      {
        id: 'digital-card',
        title: hasDigitalCard ? 'Manage Digital Cards' : 'Create Digital Card',
        description: hasDigitalCard
          ? `${digitalCardsCount} card${digitalCardsCount === 1 ? '' : 's'} created`
          : 'Create your digital business card',
        link: hasDigitalCard ? '/digital-card/manage' : '/digital-card/create',
        icon: 'credit-card',
        featureName: 'digital_card',
        config: {
          featureCriticality: 'medium' as const,
          businessImpact: 'medium' as const,
          complexity: 'easy' as const,
          prerequisitesMet: true,
          industryRelevance: getIndustryRelevance(company.industry, 'digital-card'),
          alignsWithGoal: alignsWithUserGoals(company.userGoals, 'digital-card'),
          relatedFeatureLastUsed: metrics.digitalCard.lastCardUpdate,
        },
      },
      {
        id: 'ai-content',
        title: 'Create AI Content',
        description: metrics.aiUsageStats.totalAIOperations < 5
          ? 'Try AI-powered content generation'
          : 'Keep creating with AI',
        link: '/social-media',
        icon: 'wand-2',
        featureName: 'ai_content_generation',
        config: {
          featureCriticality: 'medium' as const,
          businessImpact: 'high' as const,
          complexity: 'easy' as const,
          prerequisitesMet: true,
          industryRelevance: getIndustryRelevance(company.industry, 'ai-content'),
          alignsWithGoal: alignsWithUserGoals(company.userGoals, 'ai-content'),
          relatedFeatureLastUsed: metrics.aiUsageStats.lastAIUsedAt,
        },
      },
      {
        id: 'crm-integration',
        title: 'Connect CRM',
        description: metrics.crmIntegration.hasHubspot || metrics.crmIntegration.hasZoho || metrics.crmIntegration.hasBitrix24
          ? `${metrics.crmIntegration.totalLeadsSynced} leads synced`
          : 'Integrate with HubSpot, Zoho, or Bitrix24',
        link: '/crm/integrations',
        icon: 'link',
        featureName: 'crm_integration',
        config: {
          featureCriticality: 'low' as const,
          businessImpact: 'high' as const,
          complexity: 'medium' as const,
          prerequisitesMet: leadsCount > 5,
          industryRelevance: getIndustryRelevance(company.industry, 'crm-integration'),
          alignsWithGoal: alignsWithUserGoals(company.userGoals, 'crm-integration'),
          relatedFeatureLastUsed: metrics.crmIntegration.lastSyncAt,
        },
      },
      {
        id: 'automation',
        title: metrics.automation.hasAutomations ? 'Manage Automations' : 'Create Automation',
        description: metrics.automation.hasAutomations
          ? `${metrics.automation.automationsCount} automation${metrics.automation.automationsCount === 1 ? '' : 's'} active`
          : 'Automate your marketing workflows',
        link: '/email-marketing/automations',
        icon: 'zap',
        featureName: 'automations',
        config: {
          featureCriticality: 'low' as const,
          businessImpact: 'high' as const,
          complexity: 'hard' as const,
          prerequisitesMet: hasBrevoKey && leadsCount > 10,
          industryRelevance: getIndustryRelevance(company.industry, 'automation'),
          alignsWithGoal: alignsWithUserGoals(company.userGoals, 'automation'),
          relatedFeatureLastUsed: metrics.automation.lastAutomationCreated,
        },
      },
      {
        id: 'ai-assistant',
        title: 'Get Business Strategy',
        description: 'AI-powered strategic guidance for your business',
        link: '/ai-assistant',
        icon: 'brain',
        featureName: 'ai_assistant',
        config: {
          featureCriticality: 'low' as const,
          businessImpact: 'medium' as const,
          complexity: 'easy' as const,
          prerequisitesMet: true,
          industryRelevance: 'medium' as const,
          alignsWithGoal: false,
        },
      },
      {
        id: 'templates',
        title: 'Browse Templates',
        description: 'Speed up your work with ready-made templates',
        link: '/templates',
        icon: 'file-text',
        featureName: 'templates',
        config: {
          featureCriticality: 'low' as const,
          businessImpact: 'low' as const,
          complexity: 'easy' as const,
          prerequisitesMet: true,
          industryRelevance: 'medium' as const,
          alignsWithGoal: false,
        },
      },
    ];

    // Calculate scores for each action
    const enhancedActions: EnhancedQuickAction[] = actionConfigs.map(action => {
      const scoring = calculateActionScore(action.id, metrics, {
        ...action.config,
        featureName: action.featureName,
      });

      const badge = getRecommendationBadge(
        scoring.type,
        scoring.urgency,
        scoring.daysSinceLastAction
      );

      const timeSinceLastAction = formatTimeSinceLastAction(scoring.daysSinceLastAction);

      return {
        id: action.id,
        title: action.title,
        description: action.description,
        link: action.link,
        icon: action.icon,
        recommendationType: scoring.type,
        urgency: scoring.urgency,
        score: scoring.score,
        show: scoring.score.total >= 30 || metrics.userStage === 'new', // Show if score >= 30 or new user
        highlighted: scoring.score.total >= 60 || scoring.urgency === 'critical',
        badge,
        timeSinceLastAction,
        lastActionDate: scoring.daysSinceLastAction !== null
          ? getLastActionDate(action.featureName, metrics)
          : undefined,
      };
    });

    // Sort by total score (highest first) and limit to top 6
    const sortedActions = enhancedActions
      .filter(action => action.show)
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 6);

    // Update last analytics view
    await updateUserBehaviorMetrics(companyId, {
      analyticsEngagement: {
        lastViewedAnalytics: new Date().toISOString(),
        analyticsViewsLast30Days: metrics.analyticsEngagement.analyticsViewsLast30Days + 1,
      },
    });

    return { success: true, data: sortedActions };
  } catch (error: any) {
    console.error('Error getting personalized quick actions:', error);
    return { success: false, error: error.message || 'Failed to get personalized quick actions' };
  }
}

/**
 * Get total leads count for a company
 */
async function getLeadsCount(companyId: string): Promise<number> {
  try {
    if (!serverDb) return 0;

    const leadsQuery = query(
      collection(serverDb, 'leads'),
      where('companyId', '==', companyId)
    );
    const leadsSnap = await getDocs(leadsQuery);
    return leadsSnap.size;
  } catch (error) {
    console.error('Error getting leads count:', error);
    return 0;
  }
}

/**
 * Get digital cards count for a company
 */
async function getDigitalCardsCount(companyId: string): Promise<number> {
  try {
    if (!serverDb) return 0;

    const cardsQuery = query(
      collection(serverDb, 'digitalCards'),
      where('companyId', '==', companyId)
    );
    const cardsSnap = await getDocs(cardsQuery);
    return cardsSnap.size;
  } catch (error) {
    console.error('Error getting digital cards count:', error);
    return 0;
  }
}

/**
 * Get last action date from metrics for a specific feature
 */
function getLastActionDate(
  featureName: string,
  metrics: any
): string | undefined {
  const feature = metrics.featureUsage.find((f: any) => f.featureName === featureName);
  return feature?.lastUsedAt;
}

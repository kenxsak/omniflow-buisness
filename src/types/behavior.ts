/**
 * User Behavior Tracking Types
 * 
 * Types for tracking user engagement patterns, feature usage,
 * and behavioral data used for personalized recommendations
 */

export interface FeatureUsageStats {
  featureName: string;
  lastUsedAt: string; // ISO timestamp
  usageCount: number;
  totalTimeSpent?: number; // in seconds
}

export interface CampaignEngagementStats {
  lastEmailSentAt?: string; // ISO timestamp
  lastSmsSentAt?: string; // ISO timestamp
  lastWhatsappSentAt?: string; // ISO timestamp
  emailsSentCount: number;
  smsSentCount: number;
  whatsappSentCount: number;
  averageEmailOpenRate?: number; // percentage
  averageClickRate?: number; // percentage
  lastCampaignPerformance?: {
    openRate: number;
    clickRate: number;
    sentAt: string;
  };
}

export interface DigitalCardEngagement {
  hasDigitalCard: boolean;
  cardCompleteness: number; // 0-100 percentage
  cardViewsLast30Days: number;
  cardLeadsGenerated: number;
  lastCardUpdate?: string; // ISO timestamp
}

export interface CRMIntegrationStatus {
  hasHubspot: boolean;
  hasZoho: boolean;
  hasBitrix24: boolean;
  lastSyncAt?: string; // ISO timestamp
  totalLeadsSynced: number;
}

export interface AutomationEngagement {
  hasAutomations: boolean;
  automationsCount: number;
  lastAutomationCreated?: string; // ISO timestamp
  automationRunsLast30Days: number;
}

export interface UserBehaviorMetrics {
  companyId: string;
  
  // Login and session data
  lastLoginAt: string; // ISO timestamp
  loginFrequency: 'daily' | 'weekly' | 'monthly' | 'dormant'; // calculated
  totalLogins: number;
  
  // Feature usage patterns
  featureUsage: FeatureUsageStats[];
  mostUsedFeature?: string;
  
  // Campaign and communication engagement
  campaignEngagement: CampaignEngagementStats;
  
  // Digital card metrics
  digitalCard: DigitalCardEngagement;
  
  // CRM integration status
  crmIntegration: CRMIntegrationStatus;
  
  // Automation status
  automation: AutomationEngagement;
  
  // AI usage patterns
  aiUsageStats: {
    totalAIOperations: number;
    lastAIUsedAt?: string; // ISO timestamp
    favoriteAIFeature?: string; // e.g., 'content_generation', 'image_generation'
    aiUsageFrequency: 'high' | 'medium' | 'low' | 'none';
  };
  
  // Lead management
  leadMetrics: {
    totalLeads: number;
    leadsAddedLast30Days: number;
    lastLeadAddedAt?: string; // ISO timestamp
  };
  
  // Analytics engagement
  analyticsEngagement: {
    lastViewedAnalytics?: string; // ISO timestamp
    analyticsViewsLast30Days: number;
  };
  
  // User stage classification
  userStage: 'new' | 'beginner' | 'intermediate' | 'advanced' | 'power_user';
  
  // Timestamp metadata
  lastUpdatedAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}

/**
 * Industries supported for personalized recommendations
 */
export type IndustryType = 
  | 'ecommerce'
  | 'saas'
  | 'professional_services'
  | 'real_estate'
  | 'health_wellness'
  | 'education'
  | 'retail'
  | 'other';

/**
 * User goals from onboarding
 */
export type UserGoal = 
  | 'increase_sales'
  | 'improve_customer_engagement'
  | 'automate_marketing'
  | 'generate_leads'
  | 'build_brand_awareness'
  | 'improve_customer_retention'
  | 'scale_operations';

/**
 * Recommendation types for quick actions
 */
export type RecommendationType = 
  | 'quick_win'      // Easy actions with immediate impact
  | 'growth'         // Medium-difficulty actions for scaling
  | 'optimization'   // Advanced actions for power users
  | 'recovery';      // Re-engagement actions for dormant features

/**
 * Urgency levels for recommendations
 */
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Recommendation score breakdown
 */
export interface RecommendationScore {
  total: number; // 0-100
  urgency: number; // 0-40
  impact: number; // 0-30
  ease: number; // 0-20
  recency: number; // 0-10
}

/**
 * Enhanced quick action with recommendation data
 */
export interface EnhancedQuickAction {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: string;
  
  // Recommendation metadata
  recommendationType: RecommendationType;
  urgency: UrgencyLevel;
  score: RecommendationScore;
  
  // Display information
  show: boolean;
  highlighted: boolean;
  status?: string;
  badge?: string; // e.g., "NEW", "TRENDING", "RECOMMENDED"
  
  // Time-based triggers
  timeSinceLastAction?: string; // e.g., "14 days ago"
  lastActionDate?: string; // ISO timestamp
  
  // Engagement data
  successMetric?: string; // e.g., "45% open rate on last campaign"
  completionPercentage?: number; // For partial completions like digital card
}

'use server';

/**
 * Dashboard Actions
 * 
 * Server actions for dashboard quick actions and counts
 */

import { getServerLeads, getServerEmailCampaigns, getServerLeadsCount } from '@/lib/leads-data-server';
import { getCompanyAIAnalyticsAction } from './company-ai-analytics-actions';
import { fetchBrevoCampaignSummaryAction } from '@/actions/brevo-campaigns';
import { fetchTwilioSmsSummaryAction } from '@/actions/twilio-actions';
import { getLeadsForCompany, getLeadStatsForCompany } from '@/lib/crm/lead-data';
import { getCompanyIdFromToken, adminDb } from '@/lib/firebase-admin';
import { getPlanMetadata } from '@/lib/plan-helpers-server';
import { getDealStats, getWeightedPipelineValue } from './deal-actions';
import { getRecentActivities } from './activity-actions';
import { getServerTeamMembers } from '@/lib/crm/team-data-server';
import { cookies } from 'next/headers';
import type { Lead } from '@/lib/mock-data';
import type { DealStats } from '@/types/crm';
import type { Activity } from '@/types/crm';
import type { AppUser, Role } from '@/types/saas';

export interface QuickActionCounts {
  leads: {
    count: number;
    show: boolean;
    priority: number;
  };
  emailCampaigns: {
    count: number;
    show: boolean;
    priority: number;
  };
  smsMessages: {
    count: number;
    show: boolean;
    priority: number;
  };
  aiCredits: {
    usagePercent: number;
    show: boolean;
    priority: number;
  };
  templates: {
    count: number;
    show: boolean;
    priority: number;
  };
  strategy: {
    hasViewed: boolean;
    show: boolean;
    priority: number;
  };
}

/**
 * Get counts for all quick actions
 * Returns data to determine which actions to highlight and their priority
 */
export async function getQuickActionCounts(
  companyId: string,
  brevoApiKey?: string,
  twilioSid?: string,
  twilioToken?: string
): Promise<QuickActionCounts> {
  // Get leads count using efficient count query (avoids loading all documents)
  const leadsCount = await getServerLeadsCount(companyId);
  
  // Get email campaigns count
  let emailCampaignsCount = 0;
  try {
    if (brevoApiKey) {
      const brevoSummary = await fetchBrevoCampaignSummaryAction(brevoApiKey);
      if (brevoSummary.success) {
        emailCampaignsCount = brevoSummary.sentCampaigns || 0;
      }
    } else {
      // Fallback to local campaigns if no Brevo key
      const campaigns = await getServerEmailCampaigns(companyId);
      emailCampaignsCount = campaigns.filter((c) => c.status === 'Sent' || c.status === 'Sent via Brevo').length;
    }
  } catch (error) {
    console.error('Error fetching email campaigns count:', error);
  }
  
  // Get SMS count
  let smsCount = 0;
  try {
    if (twilioSid && twilioToken) {
      const twilioSummary = await fetchTwilioSmsSummaryAction(twilioSid, twilioToken);
      if (twilioSummary.success) {
        smsCount = twilioSummary.smsSentLast7Days || 0;
      }
    }
  } catch (error) {
    console.error('Error fetching SMS count:', error);
  }
  
  // Get AI credits usage
  let aiUsagePercent = 0;
  try {
    const aiAnalytics = await getCompanyAIAnalyticsAction(companyId);
    if (aiAnalytics.success && aiAnalytics.data) {
      const used = aiAnalytics.data.currentMonth.creditsUsed;
      const limit = aiAnalytics.data.currentMonth.creditsLimit;
      aiUsagePercent = (used / limit) * 100;
    }
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
  }
  
  // Check if strategy has been viewed (simplified check - could be enhanced)
  // For now, we'll show it as high priority for users with few resources
  const hasViewedStrategy = leadsCount > 50 || emailCampaignsCount > 10;
  
  // Determine priorities based on current state
  // Lower number = higher priority (1 is highest)
  return {
    leads: {
      count: leadsCount,
      show: leadsCount < 50, // Show until they have a good contact base
      priority: leadsCount === 0 ? 1 : leadsCount < 10 ? 2 : 4,
    },
    emailCampaigns: {
      count: emailCampaignsCount,
      show: emailCampaignsCount < 10, // Show until they're regularly emailing
      priority: emailCampaignsCount === 0 ? 2 : emailCampaignsCount < 5 ? 3 : 5,
    },
    smsMessages: {
      count: smsCount,
      show: smsCount < 20, // Show until they're comfortable with SMS
      priority: smsCount === 0 ? 4 : 6,
    },
    aiCredits: {
      usagePercent: aiUsagePercent,
      show: aiUsagePercent < 50, // Show if they haven't used AI much
      priority: aiUsagePercent < 10 ? 3 : 5,
    },
    templates: {
      count: 42, // We have 42 default templates
      show: true, // Always show templates
      priority: 4,
    },
    strategy: {
      hasViewed: hasViewedStrategy,
      show: !hasViewedStrategy, // Show if they haven't built up their business yet
      priority: leadsCount < 5 && emailCampaignsCount === 0 ? 1 : 6,
    },
  };
}

/**
 * Get template count (from default templates)
 */
export async function getTemplateCount(): Promise<number> {
  // Could be enhanced to query from database if templates are stored there
  // For now, returning the count of default templates
  return 42; // Update this if you add more default templates
}

/**
 * Get all CRM dashboard data
 */
export interface CrmDashboardData {
  stats: {
    total: number;
    new: number;
    synced: number;
    won: number;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: string;
  }>;
  planMetadata: {
    planId: string;
    planName: string;
    maxContacts: number | null;
  } | null;
  dealStats?: DealStats;
  weightedPipeline?: number;
  recentActivities?: Activity[];
  userRole?: Role;
  teamMembers?: AppUser[];
  leads?: Lead[];
}

export async function getCrmDashboardData(): Promise<CrmDashboardData | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('firebase-auth-token')?.value;
    
    if (!authToken) {
      return null;
    }

    const companyId = await getCompanyIdFromToken(authToken);
    if (!companyId) {
      return null;
    }

    const [leads, leadStats, planMetadata, dealStats, weightedPipeline, recentActivities, teamMembers] = await Promise.all([
      getLeadsForCompany(companyId),
      getLeadStatsForCompany(companyId),
      getPlanMetadata(companyId),
      getDealStats(companyId),
      getWeightedPipelineValue(companyId),
      getRecentActivities(companyId, 5),
      getServerTeamMembers(companyId),
    ]);

    let userRole: Role = 'user';
    if (adminDb) {
      try {
        const { adminAuth } = await import('@/lib/firebase-admin');
        if (adminAuth) {
          const decodedToken = await adminAuth.verifyIdToken(authToken);
          const userId = decodedToken.uid;
          
          const userDoc = await adminDb.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userRole = (userData?.role || 'user') as Role;
          }
        }
      } catch (roleError) {
        console.error('Error fetching user role:', roleError);
      }
    }

    const stats = {
      total: leadStats.totalLeads,
      new: leadStats.newLeads,
      synced: leadStats.syncedCount,
      won: leadStats.wonLeads,
    };

    const statusCounts: Record<string, number> = {
      New: leadStats.newLeads,
      Contacted: leadStats.contactedLeads,
      Qualified: leadStats.qualifiedLeads,
      Won: leadStats.wonLeads,
      Lost: leadStats.lostLeads,
    };

    const statusDistribution = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'].map((status) => {
      const count = statusCounts[status] || 0;
      const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0';
      return {
        status,
        count,
        percentage,
      };
    });

    return {
      stats,
      statusDistribution,
      planMetadata,
      dealStats,
      weightedPipeline,
      recentActivities,
      userRole,
      teamMembers,
      leads,
    };
  } catch (error) {
    console.error('Error fetching CRM dashboard data:', error);
    return null;
  }
}

'use server';

/**
 * Advanced Analytics Server Actions
 * 
 * Server actions for conversion tracking, ROI calculations,
 * predictive analytics, and revenue attribution.
 */

import type {
  AnalyticsPeriod,
  ConversionFunnel,
  CampaignROI,
  PredictiveAnalytics,
  RevenueAttribution,
  AdvancedMetrics,
  MarketingChannel,
} from '@/types/analytics';
import {
  getDateRangeForPeriod,
  calculateConversionRate,
  calculateROI,
  calculateROAS,
  calculateCostPerLead,
  calculateCAC,
  calculateARPU,
  calculateCLV,
  calculateChurnRate,
  getPerformanceRating,
  getROIRecommendations,
  predictLinearTrend,
  calculatePredictionRange,
  calculateFirstTouchAttribution,
  calculateLastTouchAttribution,
  calculateMultiTouchAttribution,
  calculatePeriodComparison,
  getFunnelRecommendations,
  hasEnoughDataForPredictions,
  getChannelColor,
  getChannelLabel,
  calculateDropOffRate,
} from '@/lib/analytics-service';
import { getServerLeads, getServerEmailCampaigns, getServerLeadsCount } from '@/lib/leads-data-server';

const ANALYTICS_SAMPLE_LIMIT = 1000;
import { getCompanyAIAnalyticsAction } from './company-ai-analytics-actions';
import { fetchBrevoCampaignSummaryAction } from '@/actions/brevo-campaigns';
import { fetchTwilioSmsSummaryAction } from '@/actions/twilio-actions';
import { format, subMonths } from 'date-fns';

/**
 * Get conversion funnel data
 */
export async function getConversionFunnelData(
  companyId: string,
  period: AnalyticsPeriod = '30days',
  customStart?: Date,
  customEnd?: Date
): Promise<{ success: boolean; data?: ConversionFunnel; error?: string }> {
  try {
    const { startDate, endDate } = getDateRangeForPeriod(period, customStart, customEnd);
    
    // Fetch leads for the company with limit for memory efficiency
    const allLeads = await getServerLeads(companyId, { limit: ANALYTICS_SAMPLE_LIMIT });
    
    // Filter leads by date range
    const leads = allLeads.filter(lead => {
      const createdAt = lead.createdAt?.toDate ? lead.createdAt.toDate() : null;
      if (!createdAt) return false;
      return createdAt >= startDate && createdAt <= endDate;
    });
    
    // Simulate digital card views (in real app, fetch from analytics)
    // For now, estimate 10x views compared to leads as baseline
    const views = leads.length > 0 ? Math.max(leads.length * 10, 100) : 50;
    const uniqueViews = Math.floor(views * 0.8); // 80% unique
    
    // Leads captured
    const leadsCount = leads.length;
    
    // Engaged customers (those who received and engaged with email/SMS)
    // Simulate 40% engagement rate
    const engagedCount = Math.floor(leadsCount * 0.4);
    
    // Revenue generated (simulate conversions)
    // Assume 10% of engaged leads convert with avg $100 order
    const customersCount = Math.floor(engagedCount * 0.1);
    const avgOrderValue = 100;
    const totalRevenue = customersCount * avgOrderValue;
    
    // Calculate conversion rates
    const viewToLeadRate = calculateConversionRate(leadsCount, views);
    const leadToEngagedRate = calculateConversionRate(engagedCount, leadsCount);
    const engagedToRevenueRate = calculateConversionRate(customersCount, engagedCount);
    const overallConversionRate = calculateConversionRate(customersCount, views);
    
    // Get recommendations based on drop-offs
    const dropOffPoints = getFunnelRecommendations(
      viewToLeadRate,
      leadToEngagedRate,
      engagedToRevenueRate
    );
    
    const funnel: ConversionFunnel = {
      companyId,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      stages: {
        views: {
          count: views,
          unique: uniqueViews,
          label: 'Card Views',
        },
        leads: {
          count: leadsCount,
          conversionRate: viewToLeadRate,
          label: 'Leads Captured',
        },
        engaged: {
          count: engagedCount,
          conversionRate: leadToEngagedRate,
          label: 'Engaged Customers',
        },
        revenue: {
          totalRevenue,
          customerCount: customersCount,
          conversionRate: engagedToRevenueRate,
          label: 'Revenue Generated',
        },
      },
      overallConversionRate,
      dropOffPoints,
    };
    
    return { success: true, data: funnel };
  } catch (error: any) {
    console.error('Error getting conversion funnel:', error);
    return { success: false, error: error.message || 'Failed to get conversion funnel data' };
  }
}

/**
 * Calculate campaign ROI
 */
export async function calculateCampaignROI(
  companyId: string,
  period: AnalyticsPeriod = '30days',
  brevoApiKey?: string,
  twilioSid?: string,
  twilioToken?: string
): Promise<{ success: boolean; data?: CampaignROI[]; error?: string }> {
  try {
    const { startDate, endDate } = getDateRangeForPeriod(period);
    const campaigns: CampaignROI[] = [];
    
    // Get leads for the period with limit for memory efficiency
    const allLeads = await getServerLeads(companyId, { limit: ANALYTICS_SAMPLE_LIMIT });
    const periodLeads = allLeads.filter((lead: any) => {
      const createdAt = lead.createdAt?.toDate ? lead.createdAt.toDate() : null;
      if (!createdAt) return false;
      return createdAt >= startDate && createdAt <= endDate;
    });
    
    // Get AI analytics for costs
    const aiAnalytics = await getCompanyAIAnalyticsAction(companyId);
    const aiCostsPerCampaign = aiAnalytics.success && aiAnalytics.data 
      ? aiAnalytics.data.currentMonth.estimatedCost / 10 
      : 5; // Estimate $5 AI cost per campaign
    
    // Email campaigns
    if (brevoApiKey) {
      const brevoData = await fetchBrevoCampaignSummaryAction(brevoApiKey);
      if (brevoData.success && brevoData.sentCampaigns) {
        const emailLeads = Math.floor(periodLeads.length * 0.6); // 60% from email
        const emailCustomers = Math.floor(emailLeads * 0.1);
        const emailRevenue = emailCustomers * 100;
        const emailSpend = brevoData.sentCampaigns * 2; // $2 per campaign (email service cost)
        
        campaigns.push({
          campaignId: 'email-aggregate',
          campaignName: 'Email Marketing (Aggregate)',
          campaignType: 'email',
          marketingSpend: emailSpend,
          aiCostsUsed: aiCostsPerCampaign,
          leadsGenerated: emailLeads,
          customersAcquired: emailCustomers,
          revenue: emailRevenue,
          roi: calculateROI(emailRevenue, emailSpend + aiCostsPerCampaign),
          roas: calculateROAS(emailRevenue, emailSpend),
          costPerLead: calculateCostPerLead(emailSpend + aiCostsPerCampaign, emailLeads),
          costPerCustomer: calculateCAC(emailSpend + aiCostsPerCampaign, emailCustomers),
          averageRevenuePerUser: calculateARPU(emailRevenue, emailCustomers),
          conversionRate: calculateConversionRate(emailCustomers, emailLeads),
          profitMargin: emailRevenue > 0 ? ((emailRevenue - emailSpend - aiCostsPerCampaign) / emailRevenue) * 100 : 0,
          engagementRate: 0,
          clickThroughRate: 0,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          performanceRating: getPerformanceRating(calculateROI(emailRevenue, emailSpend + aiCostsPerCampaign)),
          recommendations: getROIRecommendations(
            calculateROI(emailRevenue, emailSpend + aiCostsPerCampaign),
            calculateConversionRate(emailCustomers, emailLeads),
            0
          ),
        });
      }
    }
    
    // SMS campaigns
    if (twilioSid && twilioToken) {
      const twilioData = await fetchTwilioSmsSummaryAction(twilioSid, twilioToken);
      if (twilioData.success && twilioData.smsSentLast7Days) {
        const smsLeads = Math.floor(periodLeads.length * 0.3); // 30% from SMS
        const smsCustomers = Math.floor(smsLeads * 0.15);
        const smsRevenue = smsCustomers * 100;
        const smsSpend = twilioData.smsSentLast7Days * 0.02; // $0.02 per SMS
        
        campaigns.push({
          campaignId: 'sms-aggregate',
          campaignName: 'SMS Marketing (Aggregate)',
          campaignType: 'sms',
          marketingSpend: smsSpend,
          aiCostsUsed: aiCostsPerCampaign,
          leadsGenerated: smsLeads,
          customersAcquired: smsCustomers,
          revenue: smsRevenue,
          roi: calculateROI(smsRevenue, smsSpend + aiCostsPerCampaign),
          roas: calculateROAS(smsRevenue, smsSpend),
          costPerLead: calculateCostPerLead(smsSpend + aiCostsPerCampaign, smsLeads),
          costPerCustomer: calculateCAC(smsSpend + aiCostsPerCampaign, smsCustomers),
          averageRevenuePerUser: calculateARPU(smsRevenue, smsCustomers),
          conversionRate: calculateConversionRate(smsCustomers, smsLeads),
          profitMargin: smsRevenue > 0 ? ((smsRevenue - smsSpend - aiCostsPerCampaign) / smsRevenue) * 100 : 0,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          performanceRating: getPerformanceRating(calculateROI(smsRevenue, smsSpend + aiCostsPerCampaign)),
          recommendations: getROIRecommendations(
            calculateROI(smsRevenue, smsSpend + aiCostsPerCampaign),
            calculateConversionRate(smsCustomers, smsLeads)
          ),
        });
      }
    }
    
    return { success: true, data: campaigns };
  } catch (error: any) {
    console.error('Error calculating campaign ROI:', error);
    return { success: false, error: error.message || 'Failed to calculate campaign ROI' };
  }
}

/**
 * Get predictive insights
 */
export async function getPredictiveInsights(
  companyId: string
): Promise<{ success: boolean; data?: PredictiveAnalytics; error?: string }> {
  try {
    // Get historical leads data (last 6 months) with limit for memory efficiency
    const allLeads = await getServerLeads(companyId, { limit: ANALYTICS_SAMPLE_LIMIT });
    const now = new Date();
    const monthlyLeadCounts: number[] = [];
    const monthlyRevenue: number[] = [];
    
    // Calculate leads per month for last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = subMonths(now, i + 1);
      const monthEnd = subMonths(now, i);
      
      const monthLeads = allLeads.filter((lead: any) => {
        const createdAt = lead.createdAt?.toDate ? lead.createdAt.toDate() : null;
        if (!createdAt) return false;
        return createdAt >= monthStart && createdAt < monthEnd;
      }).length;
      
      monthlyLeadCounts.push(monthLeads);
      
      // Simulate revenue (10% conversion * $100 avg)
      monthlyRevenue.push(monthLeads * 0.1 * 100);
    }
    
    const dataValidation = hasEnoughDataForPredictions(monthlyLeadCounts.length);
    
    // Predict next month's leads
    const leadPrediction = predictLinearTrend(monthlyLeadCounts);
    const leadRange = calculatePredictionRange(leadPrediction.predicted, monthlyLeadCounts);
    
    // Predict next 3 months (simple average growth)
    const avgGrowth = monthlyLeadCounts.length > 1
      ? (monthlyLeadCounts[monthlyLeadCounts.length - 1] - monthlyLeadCounts[0]) / monthlyLeadCounts.length
      : 0;
    const next3MonthsLeads = Math.max(0, Math.round(leadPrediction.predicted * 3 + avgGrowth * 3));
    
    // Predict revenue
    const revenuePrediction = predictLinearTrend(monthlyRevenue);
    const revenueRange = calculatePredictionRange(revenuePrediction.predicted, monthlyRevenue);
    const next3MonthsRevenue = Math.max(0, Math.round(revenuePrediction.predicted * 3));
    
    // Calculate trends
    const trends = [
      {
        metric: 'Lead Generation',
        direction: leadPrediction.trend === 'increasing' ? 'up' : leadPrediction.trend === 'decreasing' ? 'down' : 'stable',
        percentage: monthlyLeadCounts.length > 1 
          ? ((monthlyLeadCounts[monthlyLeadCounts.length - 1] - monthlyLeadCounts[monthlyLeadCounts.length - 2]) / (monthlyLeadCounts[monthlyLeadCounts.length - 2] || 1)) * 100
          : 0,
        insight: leadPrediction.trend === 'increasing' 
          ? 'Your lead generation is growing steadily' 
          : leadPrediction.trend === 'decreasing'
          ? 'Lead generation is declining - review your marketing strategy'
          : 'Lead generation is stable',
      },
      {
        metric: 'Revenue',
        direction: revenuePrediction.trend === 'increasing' ? 'up' : revenuePrediction.trend === 'decreasing' ? 'down' : 'stable',
        percentage: monthlyRevenue.length > 1
          ? ((monthlyRevenue[monthlyRevenue.length - 1] - monthlyRevenue[monthlyRevenue.length - 2]) / (monthlyRevenue[monthlyRevenue.length - 2] || 1)) * 100
          : 0,
        insight: revenuePrediction.trend === 'increasing'
          ? 'Revenue is trending upward'
          : revenuePrediction.trend === 'decreasing'
          ? 'Revenue is declining - focus on retention and upselling'
          : 'Revenue is stable',
      },
    ] as Array<{ metric: string; direction: 'up' | 'down' | 'stable'; percentage: number; insight: string }>;
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (leadPrediction.trend === 'decreasing') {
      recommendations.push('Increase marketing spend to reverse declining lead trend');
      recommendations.push('Review and optimize your lead capture forms');
    }
    if (leadPrediction.confidence === 'low') {
      recommendations.push('Build more historical data for accurate predictions (need 3-6 months)');
    }
    if (leadPrediction.trend === 'increasing') {
      recommendations.push('Great momentum! Scale your successful campaigns');
      recommendations.push('Prepare sales team for increased lead volume');
    }
    
    const insights: PredictiveAnalytics = {
      companyId,
      generatedAt: now.toISOString(),
      historicalMonths: monthlyLeadCounts.length,
      dataPoints: monthlyLeadCounts.length,
      leadForecast: {
        nextMonth: {
          predicted: leadPrediction.predicted,
          confidence: dataValidation.sufficient ? leadPrediction.confidence : 'low',
          range: leadRange,
        },
        next3Months: {
          predicted: next3MonthsLeads,
          trend: leadPrediction.trend,
        },
      },
      revenueForecast: {
        nextMonth: {
          predicted: revenuePrediction.predicted,
          confidence: dataValidation.sufficient ? revenuePrediction.confidence : 'low',
          range: revenueRange,
        },
        next3Months: {
          predicted: next3MonthsRevenue,
          trend: revenuePrediction.trend,
        },
      },
      campaignForecast: {
        recommendedBudget: leadPrediction.predicted * 2, // $2 per expected lead
        expectedROI: 200, // 200% ROI estimate
        suggestedChannels: ['email', 'sms', 'digital_card'],
      },
      trends,
      recommendations,
      accuracy: {
        score: dataValidation.sufficient ? 75 : 40,
        reliability: dataValidation.sufficient ? 'high' : 'low',
        note: dataValidation.message,
      },
    };
    
    return { success: true, data: insights };
  } catch (error: any) {
    console.error('Error getting predictive insights:', error);
    return { success: false, error: error.message || 'Failed to get predictive insights' };
  }
}

/**
 * Get revenue attribution data
 */
export async function getRevenueAttribution(
  companyId: string,
  period: AnalyticsPeriod = '30days'
): Promise<{ success: boolean; data?: RevenueAttribution; error?: string }> {
  try {
    const { startDate, endDate } = getDateRangeForPeriod(period);
    
    // Get leads for the period with limit for memory efficiency
    const allLeads = await getServerLeads(companyId, { limit: ANALYTICS_SAMPLE_LIMIT });
    const periodLeads = allLeads.filter((lead: any) => {
      const createdAt = lead.createdAt?.toDate ? lead.createdAt.toDate() : null;
      if (!createdAt) return false;
      return createdAt >= startDate && createdAt <= endDate;
    });
    
    // Simulate channel distribution
    const emailLeads = Math.floor(periodLeads.length * 0.5);
    const smsLeads = Math.floor(periodLeads.length * 0.25);
    const digitalCardLeads = Math.floor(periodLeads.length * 0.15);
    const directLeads = periodLeads.length - emailLeads - smsLeads - digitalCardLeads;
    
    const channels: RevenueAttribution['channels'] = [
      {
        channel: 'email',
        channelLabel: getChannelLabel('email'),
        touchPoints: emailLeads * 3,
        leadsGenerated: emailLeads,
        customersAcquired: Math.floor(emailLeads * 0.1),
        revenue: Math.floor(emailLeads * 0.1) * 100,
        firstTouchAttribution: 40,
        lastTouchAttribution: 35,
        multiTouchAttribution: 38,
        marketingSpend: emailLeads * 2,
        roi: calculateROI(Math.floor(emailLeads * 0.1) * 100, emailLeads * 2),
        conversionRate: 10,
        averageOrderValue: 100,
        color: getChannelColor('email'),
      },
      {
        channel: 'sms',
        channelLabel: getChannelLabel('sms'),
        touchPoints: smsLeads * 2,
        leadsGenerated: smsLeads,
        customersAcquired: Math.floor(smsLeads * 0.15),
        revenue: Math.floor(smsLeads * 0.15) * 100,
        firstTouchAttribution: 25,
        lastTouchAttribution: 30,
        multiTouchAttribution: 27,
        marketingSpend: smsLeads * 0.5,
        roi: calculateROI(Math.floor(smsLeads * 0.15) * 100, smsLeads * 0.5),
        conversionRate: 15,
        averageOrderValue: 100,
        color: getChannelColor('sms'),
      },
      {
        channel: 'digital_card',
        channelLabel: getChannelLabel('digital_card'),
        touchPoints: digitalCardLeads * 5,
        leadsGenerated: digitalCardLeads,
        customersAcquired: Math.floor(digitalCardLeads * 0.08),
        revenue: Math.floor(digitalCardLeads * 0.08) * 100,
        firstTouchAttribution: 20,
        lastTouchAttribution: 15,
        multiTouchAttribution: 18,
        marketingSpend: 50,
        roi: calculateROI(Math.floor(digitalCardLeads * 0.08) * 100, 50),
        conversionRate: 8,
        averageOrderValue: 100,
        color: getChannelColor('digital_card'),
      },
      {
        channel: 'direct',
        channelLabel: getChannelLabel('direct'),
        touchPoints: directLeads,
        leadsGenerated: directLeads,
        customersAcquired: Math.floor(directLeads * 0.2),
        revenue: Math.floor(directLeads * 0.2) * 100,
        firstTouchAttribution: 15,
        lastTouchAttribution: 20,
        multiTouchAttribution: 17,
        marketingSpend: 0,
        roi: Infinity,
        conversionRate: 20,
        averageOrderValue: 100,
        color: getChannelColor('direct'),
      },
    ];
    
    const totalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
    const totalMarketingSpend = channels.reduce((sum, ch) => sum + ch.marketingSpend, 0);
    const overallROI = calculateROI(totalRevenue, totalMarketingSpend);
    
    // Find top channel
    const topChannel = channels.reduce((top, current) => 
      current.revenue > top.revenue ? current : top
    );
    
    const attribution: RevenueAttribution = {
      companyId,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      channels,
      totalRevenue,
      totalMarketingSpend,
      overallROI,
      attributionModel: 'multi-touch',
      topChannel: {
        channel: topChannel.channel,
        reason: `Highest revenue generator with ${topChannel.leadsGenerated} leads and $${topChannel.revenue} revenue`,
      },
      insights: [
        `${topChannel.channelLabel} is your top performing channel`,
        `Overall marketing ROI is ${overallROI.toFixed(0)}%`,
        totalMarketingSpend === 0 
          ? 'No marketing spend tracked - add costs to calculate accurate ROI'
          : `You\'re spending $${totalMarketingSpend.toFixed(2)} on marketing`,
      ],
      recommendations: [
        overallROI > 200 
          ? 'Excellent ROI! Consider scaling your marketing budget'
          : 'Review underperforming channels and reallocate budget',
        'Test multi-channel campaigns to improve attribution',
        'Track customer journeys to optimize touchpoint sequence',
      ],
    };
    
    return { success: true, data: attribution };
  } catch (error: any) {
    console.error('Error getting revenue attribution:', error);
    return { success: false, error: error.message || 'Failed to get revenue attribution' };
  }
}

/**
 * Get comprehensive advanced metrics
 */
export async function getAdvancedMetrics(
  companyId: string,
  period: AnalyticsPeriod = '30days',
  brevoApiKey?: string,
  twilioSid?: string,
  twilioToken?: string
): Promise<{ success: boolean; data?: AdvancedMetrics; error?: string }> {
  try {
    const { startDate, endDate } = getDateRangeForPeriod(period);
    
    // Get funnel data
    const funnelResult = await getConversionFunnelData(companyId, period);
    const funnel = funnelResult.data;
    
    // Get ROI data
    const roiResult = await calculateCampaignROI(companyId, period, brevoApiKey, twilioSid, twilioToken);
    const campaigns = roiResult.data || [];
    
    // Get AI analytics
    const aiAnalytics = await getCompanyAIAnalyticsAction(companyId);
    
    // Calculate totals
    const totalLeads = funnel?.stages.leads.count || 0;
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
    const totalMarketingSpend = campaigns.reduce((sum, c) => sum + c.marketingSpend + c.aiCostsUsed, 0);
    const overallROI = calculateROI(totalRevenue, totalMarketingSpend);
    
    // Get previous period for comparison
    const prevPeriod = period === '7days' ? '7days' : period === '90days' ? '90days' : '30days';
    const prevDateRange = getDateRangeForPeriod(
      prevPeriod,
      new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
      startDate
    );
    
    const prevFunnelResult = await getConversionFunnelData(
      companyId,
      prevPeriod,
      prevDateRange.startDate,
      prevDateRange.endDate
    );
    const prevLeads = prevFunnelResult.data?.stages.leads.count || 0;
    const prevRevenue = prevLeads * 0.1 * 100; // Estimate
    
    const leadsComparison = calculatePeriodComparison(totalLeads, prevLeads, 'Current', 'Previous');
    const revenueComparison = calculatePeriodComparison(totalRevenue, prevRevenue, 'Current', 'Previous');
    
    // Build metrics
    const metrics: AdvancedMetrics = {
      companyId,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      kpis: {
        totalLeads,
        totalRevenue,
        totalMarketingSpend,
        overallROI,
        customerLifetimeValue: calculateCLV(100, 12, 0.3),
        churnRate: 5,
        retentionRate: 95,
      },
      conversions: {
        viewToLead: funnel?.stages.leads.conversionRate || 0,
        leadToCustomer: funnel?.stages.revenue.conversionRate || 0,
        overallConversion: funnel?.overallConversionRate || 0,
      },
      costs: {
        costPerLead: totalLeads > 0 ? totalMarketingSpend / totalLeads : 0,
        costPerCustomer: campaigns.length > 0 
          ? campaigns.reduce((sum, c) => sum + c.costPerCustomer, 0) / campaigns.length 
          : 0,
        costPerAcquisition: totalMarketingSpend / Math.max(1, totalLeads),
      },
      engagement: {
        emailOpenRate: campaigns.find(c => c.campaignType === 'email')?.engagementRate || 0,
        emailClickRate: campaigns.find(c => c.campaignType === 'email')?.clickThroughRate || 0,
        smsResponseRate: campaigns.find(c => c.campaignType === 'sms')?.conversionRate || 0,
        digitalCardViews: funnel?.stages.views.count || 0,
      },
      periodComparison: {
        leadsGrowth: leadsComparison.change.percentage,
        revenueGrowth: revenueComparison.change.percentage,
        roiGrowth: 0,
        trend: leadsComparison.change.trend === 'up' ? 'improving' : leadsComparison.change.trend === 'down' ? 'declining' : 'stable',
      },
      channelPerformance: [
        {
          channel: 'email',
          leads: Math.floor(totalLeads * 0.5),
          revenue: totalRevenue * 0.5,
          roi: campaigns.find(c => c.campaignType === 'email')?.roi || 0,
          trend: 'up',
        },
        {
          channel: 'sms',
          leads: Math.floor(totalLeads * 0.25),
          revenue: totalRevenue * 0.25,
          roi: campaigns.find(c => c.campaignType === 'sms')?.roi || 0,
          trend: 'stable',
        },
        {
          channel: 'digital_card',
          leads: Math.floor(totalLeads * 0.15),
          revenue: totalRevenue * 0.15,
          roi: 300,
          trend: 'up',
        },
      ],
      aiImpact: aiAnalytics.success && aiAnalytics.data ? {
        creditsUsed: aiAnalytics.data.currentMonth.creditsUsed,
        costSavings: 100,
        timesSaved: 20,
        contentGenerated: aiAnalytics.data.currentMonth.operations,
      } : undefined,
      alerts: [],
    };
    
    // Add alerts
    if (overallROI < 100) {
      metrics.alerts.push({
        type: 'warning',
        message: 'ROI is below 100% - marketing costs exceed revenue',
        action: 'Review and optimize campaigns',
      });
    }
    if (totalLeads === 0) {
      metrics.alerts.push({
        type: 'critical',
        message: 'No leads generated in this period',
        action: 'Start marketing campaigns or review lead capture',
      });
    }
    if (leadsComparison.change.trend === 'down') {
      metrics.alerts.push({
        type: 'info',
        message: `Leads decreased by ${Math.abs(leadsComparison.change.percentage).toFixed(1)}% vs previous period`,
        action: 'Analyze what changed and adjust strategy',
      });
    }
    
    return { success: true, data: metrics };
  } catch (error: any) {
    console.error('Error getting advanced metrics:', error);
    return { success: false, error: error.message || 'Failed to get advanced metrics' };
  }
}

/**
 * Get historical leads count (last 6 months) for charting
 */
export async function getHistoricalLeadCounts(
  companyId: string
): Promise<{ success: boolean; data?: number[]; error?: string }> {
  try {
    // Use limit for memory efficiency in analytics sampling
    const allLeads = await getServerLeads(companyId, { limit: ANALYTICS_SAMPLE_LIMIT });
    const now = new Date();
    const leadCounts: number[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = subMonths(now, i + 1);
      const monthEnd = subMonths(now, i);
      
      const monthLeads = allLeads.filter((lead: any) => {
        const createdAt = lead.createdAt?.toDate ? lead.createdAt.toDate() : null;
        if (!createdAt) return false;
        return createdAt >= monthStart && createdAt < monthEnd;
      }).length;
      
      leadCounts.push(monthLeads);
    }
    
    return { success: true, data: leadCounts };
  } catch (error: any) {
    console.error('Error getting historical leads:', error);
    return { success: false, error: error.message || 'Failed to get historical leads' };
  }
}

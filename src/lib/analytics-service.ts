/**
 * Analytics Service
 * 
 * Helper functions for calculating conversion rates, ROI metrics,
 * predictive analytics, and revenue attribution.
 */

import type {
  AnalyticsPeriod,
  MarketingChannel,
  ConversionFunnel,
  CampaignROI,
  PredictiveAnalytics,
  RevenueAttribution,
  TimeSeriesDataPoint,
  PeriodComparison,
} from '@/types/analytics';
import { format, subDays, subMonths, startOfMonth, endOfMonth, differenceInDays, parseISO } from 'date-fns';

/**
 * Get date range for a given analytics period
 */
export function getDateRangeForPeriod(period: AnalyticsPeriod, customStart?: Date, customEnd?: Date): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  
  switch (period) {
    case '7days':
      return {
        startDate: subDays(now, 7),
        endDate: now,
      };
    case '30days':
      return {
        startDate: subDays(now, 30),
        endDate: now,
      };
    case '90days':
      return {
        startDate: subDays(now, 90),
        endDate: now,
      };
    case '12months':
      return {
        startDate: subMonths(now, 12),
        endDate: now,
      };
    case 'custom':
      return {
        startDate: customStart || subDays(now, 30),
        endDate: customEnd || now,
      };
    default:
      return {
        startDate: subDays(now, 30),
        endDate: now,
      };
  }
}

/**
 * Calculate conversion rate between two stages
 */
export function calculateConversionRate(converted: number, total: number): number {
  if (total === 0) return 0;
  return Number(((converted / total) * 100).toFixed(2));
}

/**
 * Calculate ROI percentage
 * Formula: ((Revenue - Cost) / Cost) * 100
 */
export function calculateROI(revenue: number, cost: number): number {
  if (cost === 0) return revenue > 0 ? Infinity : 0;
  return Number((((revenue - cost) / cost) * 100).toFixed(2));
}

/**
 * Calculate ROAS (Return on Ad Spend)
 * Formula: Revenue / Marketing Spend
 */
export function calculateROAS(revenue: number, spend: number): number {
  if (spend === 0) return 0;
  return Number((revenue / spend).toFixed(2));
}

/**
 * Calculate Cost Per Lead (CPL)
 * Formula: Marketing Spend / Leads Generated
 */
export function calculateCostPerLead(spend: number, leads: number): number {
  if (leads === 0) return 0;
  return Number((spend / leads).toFixed(2));
}

/**
 * Calculate Customer Acquisition Cost (CAC)
 * Formula: Marketing Spend / Customers Acquired
 */
export function calculateCAC(spend: number, customers: number): number {
  if (customers === 0) return 0;
  return Number((spend / customers).toFixed(2));
}

/**
 * Calculate Average Revenue Per User (ARPU)
 * Formula: Total Revenue / Number of Customers
 */
export function calculateARPU(revenue: number, customers: number): number {
  if (customers === 0) return 0;
  return Number((revenue / customers).toFixed(2));
}

/**
 * Calculate Customer Lifetime Value (CLV)
 * Simplified formula: ARPU * Average Lifespan (in months) * Profit Margin
 */
export function calculateCLV(arpu: number, averageLifespanMonths: number = 12, profitMargin: number = 0.3): number {
  return Number((arpu * averageLifespanMonths * profitMargin).toFixed(2));
}

/**
 * Calculate churn rate
 * Formula: (Customers Lost / Total Customers at Start) * 100
 */
export function calculateChurnRate(customersLost: number, customersAtStart: number): number {
  if (customersAtStart === 0) return 0;
  return Number(((customersLost / customersAtStart) * 100).toFixed(2));
}

/**
 * Calculate retention rate
 * Formula: ((Customers at End - New Customers) / Customers at Start) * 100
 */
export function calculateRetentionRate(
  customersAtEnd: number,
  newCustomers: number,
  customersAtStart: number
): number {
  if (customersAtStart === 0) return 0;
  return Number((((customersAtEnd - newCustomers) / customersAtStart) * 100).toFixed(2));
}

/**
 * Determine performance rating based on ROI
 */
export function getPerformanceRating(roi: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (roi >= 300) return 'excellent'; // 300%+ ROI
  if (roi >= 150) return 'good';      // 150-299% ROI
  if (roi >= 50) return 'average';    // 50-149% ROI
  return 'poor';                      // < 50% ROI
}

/**
 * Get ROI recommendations based on performance
 */
export function getROIRecommendations(roi: number, conversionRate: number, engagementRate?: number): string[] {
  const recommendations: string[] = [];
  
  if (roi < 50) {
    recommendations.push('ROI is below target. Review your targeting and messaging.');
    recommendations.push('Consider A/B testing different approaches to improve results.');
  }
  
  if (conversionRate < 2) {
    recommendations.push('Conversion rate is low. Improve your call-to-action and landing pages.');
  }
  
  if (engagementRate && engagementRate < 20) {
    recommendations.push('Engagement is low. Test different subject lines and content formats.');
  }
  
  if (roi >= 300) {
    recommendations.push('Excellent ROI! Scale this campaign and replicate the strategy.');
  }
  
  return recommendations;
}

/**
 * Simple Linear Regression for trend prediction
 * Returns predicted value for next period based on historical data
 */
export function predictLinearTrend(dataPoints: number[]): {
  predicted: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: 'high' | 'medium' | 'low';
} {
  if (dataPoints.length < 2) {
    return { predicted: 0, trend: 'stable', confidence: 'low' };
  }
  
  // Calculate mean of X and Y
  const n = dataPoints.length;
  const xMean = (n - 1) / 2; // Index values 0, 1, 2, ...
  const yMean = dataPoints.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate slope (m)
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (dataPoints[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  
  // Calculate intercept (b)
  const intercept = yMean - slope * xMean;
  
  // Predict next value (x = n)
  const predicted = Math.max(0, Math.round(slope * n + intercept));
  
  // Determine trend
  let trend: 'increasing' | 'stable' | 'decreasing';
  if (slope > 0.1) trend = 'increasing';
  else if (slope < -0.1) trend = 'decreasing';
  else trend = 'stable';
  
  // Determine confidence based on data points
  let confidence: 'high' | 'medium' | 'low';
  if (n >= 6) confidence = 'high';
  else if (n >= 3) confidence = 'medium';
  else confidence = 'low';
  
  return { predicted, trend, confidence };
}

/**
 * Calculate prediction range (min/max) based on standard deviation
 */
export function calculatePredictionRange(predicted: number, historicalData: number[]): {
  min: number;
  max: number;
} {
  if (historicalData.length < 2) {
    return { min: predicted, max: predicted };
  }
  
  // Calculate standard deviation
  const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
  const squaredDiffs = historicalData.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / historicalData.length;
  const stdDev = Math.sqrt(variance);
  
  // Range is ± 1 standard deviation
  return {
    min: Math.max(0, Math.round(predicted - stdDev)),
    max: Math.round(predicted + stdDev),
  };
}

/**
 * First-Touch Attribution
 * Credits 100% to the first channel a customer interacted with
 */
export function calculateFirstTouchAttribution(
  customerJourneys: Array<{ customerId: string; channels: MarketingChannel[] }>
): Map<MarketingChannel, number> {
  const attribution = new Map<MarketingChannel, number>();
  
  customerJourneys.forEach(journey => {
    if (journey.channels.length > 0) {
      const firstChannel = journey.channels[0];
      attribution.set(firstChannel, (attribution.get(firstChannel) || 0) + 1);
    }
  });
  
  return attribution;
}

/**
 * Last-Touch Attribution
 * Credits 100% to the last channel before conversion
 */
export function calculateLastTouchAttribution(
  customerJourneys: Array<{ customerId: string; channels: MarketingChannel[] }>
): Map<MarketingChannel, number> {
  const attribution = new Map<MarketingChannel, number>();
  
  customerJourneys.forEach(journey => {
    if (journey.channels.length > 0) {
      const lastChannel = journey.channels[journey.channels.length - 1];
      attribution.set(lastChannel, (attribution.get(lastChannel) || 0) + 1);
    }
  });
  
  return attribution;
}

/**
 * Multi-Touch (Linear) Attribution
 * Distributes credit equally across all touchpoints
 */
export function calculateMultiTouchAttribution(
  customerJourneys: Array<{ customerId: string; channels: MarketingChannel[] }>
): Map<MarketingChannel, number> {
  const attribution = new Map<MarketingChannel, number>();
  
  customerJourneys.forEach(journey => {
    if (journey.channels.length > 0) {
      const creditPerChannel = 1 / journey.channels.length;
      
      journey.channels.forEach(channel => {
        attribution.set(channel, (attribution.get(channel) || 0) + creditPerChannel);
      });
    }
  });
  
  return attribution;
}

/**
 * Calculate period-over-period comparison
 */
export function calculatePeriodComparison(
  currentValue: number,
  previousValue: number,
  currentPeriod: string,
  previousPeriod: string
): PeriodComparison {
  const absolute = currentValue - previousValue;
  const percentage = previousValue !== 0 
    ? Number(((absolute / previousValue) * 100).toFixed(2))
    : 0;
  
  let trend: 'up' | 'down' | 'stable';
  if (Math.abs(percentage) < 5) trend = 'stable';
  else if (percentage > 0) trend = 'up';
  else trend = 'down';
  
  return {
    current: { value: currentValue, period: currentPeriod },
    previous: { value: previousValue, period: previousPeriod },
    change: { absolute, percentage, trend },
  };
}

/**
 * Aggregate data by time period (daily, weekly, monthly)
 */
export function aggregateByTimePeriod(
  data: Array<{ date: Date; value: number }>,
  period: 'day' | 'week' | 'month'
): TimeSeriesDataPoint[] {
  const aggregated = new Map<string, number>();
  
  data.forEach(item => {
    let key: string;
    
    if (period === 'day') {
      key = format(item.date, 'yyyy-MM-dd');
    } else if (period === 'week') {
      key = format(item.date, 'yyyy-ww'); // ISO week
    } else {
      key = format(item.date, 'yyyy-MM');
    }
    
    aggregated.set(key, (aggregated.get(key) || 0) + item.value);
  });
  
  return Array.from(aggregated.entries())
    .map(([date, value]) => ({ date, value, label: format(parseISO(date), 'MMM dd') }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get channel color for visualizations
 */
export function getChannelColor(channel: MarketingChannel): string {
  const colors: Record<MarketingChannel, string> = {
    email: 'hsl(var(--chart-1))',
    sms: 'hsl(var(--chart-2))',
    digital_card: 'hsl(var(--chart-3))',
    direct: 'hsl(var(--chart-4))',
    organic: 'hsl(var(--chart-5))',
    referral: 'hsl(220, 70%, 50%)',
    social: 'hsl(280, 70%, 50%)',
  };
  
  return colors[channel] || 'hsl(var(--muted))';
}

/**
 * Get channel label (user-friendly name)
 */
export function getChannelLabel(channel: MarketingChannel): string {
  const labels: Record<MarketingChannel, string> = {
    email: 'Email Marketing',
    sms: 'SMS Campaigns',
    digital_card: 'Digital Card',
    direct: 'Direct Traffic',
    organic: 'Organic Search',
    referral: 'Referrals',
    social: 'Social Media',
  };
  
  return labels[channel] || channel;
}

/**
 * Format currency values
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (1K, 1M, etc.)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Calculate drop-off rate between funnel stages
 */
export function calculateDropOffRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  const dropOff = previous - current;
  return Number(((dropOff / previous) * 100).toFixed(2));
}

/**
 * Get funnel stage recommendations based on drop-off rates
 */
export function getFunnelRecommendations(
  viewToLeadRate: number,
  leadToEngagedRate: number,
  engagedToRevenueRate: number
): Array<{ stage: string; dropOffRate: number; recommendations: string[] }> {
  const recommendations: Array<{ stage: string; dropOffRate: number; recommendations: string[] }> = [];
  
  // Views to Leads
  const viewDropOff = 100 - viewToLeadRate;
  if (viewDropOff > 90) {
    recommendations.push({
      stage: 'Views to Leads',
      dropOffRate: viewDropOff,
      recommendations: [
        'High drop-off at lead capture. Simplify your contact form.',
        'Add incentives (e.g., free consultation, discount) to capture more leads.',
        'Ensure your value proposition is clear on digital cards.',
      ],
    });
  }
  
  // Leads to Engaged
  const engagedDropOff = 100 - leadToEngagedRate;
  if (engagedDropOff > 70) {
    recommendations.push({
      stage: 'Leads to Engaged',
      dropOffRate: engagedDropOff,
      recommendations: [
        'Many leads aren\'t engaging. Improve email/SMS subject lines.',
        'Segment your audience and personalize messages.',
        'Send follow-ups at optimal times (test different schedules).',
      ],
    });
  }
  
  // Engaged to Revenue
  const revenueDropOff = 100 - engagedToRevenueRate;
  if (revenueDropOff > 80) {
    recommendations.push({
      stage: 'Engaged to Revenue',
      dropOffRate: revenueDropOff,
      recommendations: [
        'Engaged customers aren\'t converting. Review your sales process.',
        'Add clear calls-to-action and make purchasing easy.',
        'Consider offering limited-time promotions to drive urgency.',
      ],
    });
  }
  
  return recommendations;
}

/**
 * Validate if there's enough data for predictions
 */
export function hasEnoughDataForPredictions(dataPoints: number, minRequired: number = 3): {
  sufficient: boolean;
  message?: string;
} {
  if (dataPoints >= minRequired) {
    return { sufficient: true };
  }
  
  return {
    sufficient: false,
    message: `Need at least ${minRequired} months of data for accurate predictions. You have ${dataPoints}.`,
  };
}

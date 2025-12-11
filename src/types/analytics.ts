/**
 * Advanced Analytics Types
 * 
 * Types for conversion tracking, ROI calculations, predictive analytics,
 * and revenue attribution for marketing efforts.
 */

/**
 * Time period selection for analytics
 */
export type AnalyticsPeriod = '7days' | '30days' | '90days' | '12months' | 'custom';

/**
 * Marketing channel types
 */
export type MarketingChannel = 'email' | 'sms' | 'digital_card' | 'direct' | 'organic' | 'referral' | 'social';

/**
 * Conversion Funnel - Track customer journey stages
 */
export interface ConversionFunnel {
  companyId: string;
  period: AnalyticsPeriod;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  
  stages: {
    // Stage 1: Digital Card Views
    views: {
      count: number;
      unique: number;
      label: 'Card Views';
    };
    
    // Stage 2: Leads Captured
    leads: {
      count: number;
      conversionRate: number; // % of views that became leads
      label: 'Leads Captured';
    };
    
    // Stage 3: Engaged Customers (opened email/SMS)
    engaged: {
      count: number;
      conversionRate: number; // % of leads that engaged
      label: 'Engaged Customers';
    };
    
    // Stage 4: Revenue Generated
    revenue: {
      totalRevenue: number;
      customerCount: number;
      conversionRate: number; // % of engaged that purchased
      label: 'Revenue Generated';
    };
  };
  
  // Overall funnel metrics
  overallConversionRate: number; // % of views that became paying customers
  dropOffPoints: Array<{
    stage: string;
    dropOffRate: number;
    recommendations: string[];
  }>;
}

/**
 * Campaign ROI Tracking
 */
export interface CampaignROI {
  campaignId: string;
  campaignName: string;
  campaignType: 'email' | 'sms';
  
  // Investment
  marketingSpend: number;      // Total spent on campaign
  aiCostsUsed: number;         // AI credits/costs for content generation
  timeInvestment?: number;     // Hours spent (optional)
  
  // Returns
  leadsGenerated: number;
  customersAcquired: number;
  revenue: number;
  
  // ROI Calculations
  roi: number;                 // Return on Investment %
  roas: number;                // Return on Ad Spend
  costPerLead: number;         // Marketing spend / leads
  costPerCustomer: number;     // Customer Acquisition Cost (CAC)
  averageRevenuePerUser: number; // ARPU
  
  // Performance
  conversionRate: number;      // Leads to customers %
  profitMargin: number;        // (Revenue - Spend) / Revenue
  
  // Engagement metrics
  engagementRate?: number;     // For email/SMS open rates
  clickThroughRate?: number;   // For email/SMS clicks
  
  // Time period
  startDate: string;
  endDate: string;
  
  // Recommendations
  performanceRating: 'excellent' | 'good' | 'average' | 'poor';
  recommendations: string[];
}

/**
 * Predictive Analytics - Forecast future trends
 */
export interface PredictiveAnalytics {
  companyId: string;
  generatedAt: string; // ISO string
  
  // Historical data used for predictions (last 3-6 months)
  historicalMonths: number;
  dataPoints: number; // Number of data points used
  
  // Lead predictions
  leadForecast: {
    nextMonth: {
      predicted: number;
      confidence: 'high' | 'medium' | 'low';
      range: { min: number; max: number };
    };
    next3Months: {
      predicted: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    };
  };
  
  // Revenue predictions
  revenueForecast: {
    nextMonth: {
      predicted: number;
      confidence: 'high' | 'medium' | 'low';
      range: { min: number; max: number };
    };
    next3Months: {
      predicted: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    };
  };
  
  // Campaign performance predictions
  campaignForecast: {
    recommendedBudget: number;
    expectedROI: number;
    suggestedChannels: MarketingChannel[];
  };
  
  // Trend insights
  trends: Array<{
    metric: string;
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    insight: string;
  }>;
  
  // Actionable recommendations
  recommendations: string[];
  
  // Model accuracy
  accuracy: {
    score: number; // 0-100%
    reliability: 'high' | 'medium' | 'low';
    note?: string; // e.g., "Insufficient data for accurate predictions"
  };
}

/**
 * Revenue Attribution - Track which channels drive revenue
 */
export interface RevenueAttribution {
  companyId: string;
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
  
  // Attribution by channel
  channels: Array<{
    channel: MarketingChannel;
    channelLabel: string;
    
    // Metrics
    touchPoints: number;        // Number of interactions
    leadsGenerated: number;
    customersAcquired: number;
    revenue: number;
    
    // Attribution %
    firstTouchAttribution: number;  // % of customers who first found us via this channel
    lastTouchAttribution: number;   // % of customers whose last interaction was this channel
    multiTouchAttribution: number;  // Weighted % across customer journey
    
    // ROI
    marketingSpend: number;
    roi: number;
    
    // Performance
    conversionRate: number;
    averageOrderValue: number;
    
    // Color for charts
    color?: string;
  }>;
  
  // Overall metrics
  totalRevenue: number;
  totalMarketingSpend: number;
  overallROI: number;
  
  // Attribution model used
  attributionModel: 'first-touch' | 'last-touch' | 'multi-touch' | 'linear';
  
  // Top performers
  topChannel: {
    channel: MarketingChannel;
    reason: string; // Why it's the top channel
  };
  
  // Insights
  insights: string[];
  recommendations: string[];
}

/**
 * Advanced metrics for comprehensive dashboard
 */
export interface AdvancedMetrics {
  companyId: string;
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
  
  // Core KPIs
  kpis: {
    totalLeads: number;
    totalRevenue: number;
    totalMarketingSpend: number;
    overallROI: number;
    customerLifetimeValue: number;
    churnRate: number;
    retentionRate: number;
  };
  
  // Conversion metrics
  conversions: {
    viewToLead: number;        // %
    leadToCustomer: number;    // %
    overallConversion: number; // %
  };
  
  // Cost metrics
  costs: {
    costPerLead: number;
    costPerCustomer: number;
    costPerAcquisition: number;
  };
  
  // Engagement metrics
  engagement: {
    emailOpenRate: number;
    emailClickRate: number;
    smsResponseRate: number;
    digitalCardViews: number;
  };
  
  // Period comparison (vs previous period)
  periodComparison: {
    leadsGrowth: number;        // % change
    revenueGrowth: number;      // % change
    roiGrowth: number;          // % change
    trend: 'improving' | 'stable' | 'declining';
  };
  
  // Channel breakdown
  channelPerformance: Array<{
    channel: MarketingChannel;
    leads: number;
    revenue: number;
    roi: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  // AI usage impact
  aiImpact?: {
    creditsUsed: number;
    costSavings: number;       // Estimated savings from AI automation
    timesSaved: number;         // Hours saved
    contentGenerated: number;   // Pieces of content created
  };
  
  // Alerts and warnings
  alerts: Array<{
    type: 'warning' | 'info' | 'success' | 'critical';
    message: string;
    action?: string;
  }>;
}

/**
 * Export data format for CSV/Excel
 */
export interface ExportData {
  type: 'funnel' | 'roi' | 'attribution' | 'metrics';
  data: any[];
  filename: string;
  generatedAt: string;
}

/**
 * Time series data point for charts
 */
export interface TimeSeriesDataPoint {
  date: string;        // ISO string or formatted date
  value: number;
  label?: string;
  predicted?: boolean; // If this is a forecasted value
}

/**
 * Comparison data for period-over-period analysis
 */
export interface PeriodComparison {
  current: {
    value: number;
    period: string;
  };
  previous: {
    value: number;
    period: string;
  };
  change: {
    absolute: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

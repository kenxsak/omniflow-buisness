"use client";

/**
 * Predictive Chart Component
 * 
 * Line chart showing historical data and predicted future trends
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { PredictiveAnalytics } from '@/types/analytics';
import { TrendingUp, TrendingDown, Minus, Brain, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/analytics-service';

interface PredictiveChartProps {
  analytics: PredictiveAnalytics;
  historicalLeads: number[]; // Last 6 months of actual data
}

export default function PredictiveChart({ analytics, historicalLeads }: PredictiveChartProps) {
  const { leadForecast, revenueForecast, trends, recommendations, accuracy } = analytics;
  
  // Build chart data (historical + predictions)
  const chartData: Array<{
    month: string;
    leads: number | null;
    predicted: number | null;
  }> = historicalLeads.map((leads, index) => ({
    month: `M-${historicalLeads.length - index}`,
    leads,
    predicted: null,
  }));
  
  // Add next month prediction
  chartData.push({
    month: 'Next',
    leads: null,
    predicted: leadForecast.nextMonth.predicted,
  });
  
  const getTrendIcon = (trend: 'increasing' | 'stable' | 'decreasing') => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };
  
  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    if (direction === 'up') return 'text-green-600';
    if (direction === 'down') return 'text-red-600';
    return 'text-gray-600';
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Predictive Insights
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>AI-powered forecasts based on your historical data. Accuracy improves with more data.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              Forecasts based on {analytics.historicalMonths} months of data
            </CardDescription>
          </div>
          <Badge variant={accuracy.reliability === 'high' ? 'default' : accuracy.reliability === 'medium' ? 'secondary' : 'outline'}>
            {accuracy.score}% Confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Accuracy Warning */}
        {accuracy.reliability === 'low' && accuracy.note && (
          <Alert>
            <AlertDescription>{accuracy.note}</AlertDescription>
          </Alert>
        )}
        
        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="leads" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                name="Actual Leads"
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Predicted"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Forecasts */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(leadForecast.next3Months.trend)}
              <h4 className="font-semibold">Lead Forecast</h4>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Next Month: <span className="font-bold text-foreground">{formatNumber(leadForecast.nextMonth.predicted)}</span>
                <span className="text-xs ml-2">({leadForecast.nextMonth.range.min}-{leadForecast.nextMonth.range.max})</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Next 3 Months: <span className="font-bold text-foreground">{formatNumber(leadForecast.next3Months.predicted)}</span>
              </p>
              <Badge variant="outline" className="mt-2">
                {leadForecast.nextMonth.confidence} confidence
              </Badge>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(revenueForecast.next3Months.trend)}
              <h4 className="font-semibold">Revenue Forecast</h4>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Next Month: <span className="font-bold text-foreground">${formatNumber(revenueForecast.nextMonth.predicted)}</span>
                <span className="text-xs ml-2">(${revenueForecast.nextMonth.range.min}-${revenueForecast.nextMonth.range.max})</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Next 3 Months: <span className="font-bold text-foreground">${formatNumber(revenueForecast.next3Months.predicted)}</span>
              </p>
              <Badge variant="outline" className="mt-2">
                {revenueForecast.nextMonth.confidence} confidence
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Trends */}
        <div>
          <h4 className="font-semibold mb-3">Key Trends</h4>
          <div className="space-y-2">
            {trends.map((trend, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                <div className={`font-bold ${getTrendColor(trend.direction)}`}>
                  {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{trend.metric}</p>
                  <p className="text-sm text-muted-foreground">{trend.insight}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}% change
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Recommendations</h4>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

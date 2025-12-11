"use client";

/**
 * Conversion Funnel Chart Component
 * 
 * Visual funnel showing customer journey stages with conversion rates and drop-offs
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ConversionFunnel } from '@/types/analytics';
import { formatNumber, formatCurrency, formatPercentage } from '@/lib/analytics-service';
import { TrendingDown, Users, Eye, Mail, DollarSign, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConversionFunnelChartProps {
  funnel: ConversionFunnel;
}

export default function ConversionFunnelChart({ funnel }: ConversionFunnelChartProps) {
  const { stages, overallConversionRate, dropOffPoints } = funnel;
  
  // Calculate widths for visual funnel (proportional to count)
  const maxCount = stages.views.count;
  const viewWidth = 100;
  const leadWidth = (stages.leads.count / maxCount) * 100;
  const engagedWidth = (stages.engaged.count / maxCount) * 100;
  const revenueWidth = (stages.revenue.customerCount / maxCount) * 100;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Conversion Funnel
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Track how visitors progress through your customer journey from initial view to revenue</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Customer journey from views to revenue</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {formatPercentage(overallConversionRate)}
            </div>
            <div className="text-xs text-muted-foreground">Overall Conversion</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Funnel */}
        <div className="space-y-3">
          {/* Stage 1: Views */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{stages.views.label}</span>
              </div>
              <span className="text-muted-foreground">
                {formatNumber(stages.views.count)} ({formatNumber(stages.views.unique)} unique)
              </span>
            </div>
            <div className="h-12 bg-gradient-to-r from-blue-500 to-blue-400 rounded-md flex items-center justify-center text-white font-semibold shadow-sm"
                 style={{ width: `${viewWidth}%` }}>
              100%
            </div>
          </div>
          
          {/* Stage 2: Leads */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="font-medium">{stages.leads.label}</span>
              </div>
              <span className="text-muted-foreground">
                {formatNumber(stages.leads.count)} leads ({formatPercentage(stages.leads.conversionRate)} conversion)
              </span>
            </div>
            <div className="h-12 bg-gradient-to-r from-green-500 to-green-400 rounded-md flex items-center justify-center text-white font-semibold shadow-sm"
                 style={{ width: `${leadWidth}%` }}>
              {formatPercentage(stages.leads.conversionRate)}
            </div>
          </div>
          
          {/* Stage 3: Engaged */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-500" />
                <span className="font-medium">{stages.engaged.label}</span>
              </div>
              <span className="text-muted-foreground">
                {formatNumber(stages.engaged.count)} engaged ({formatPercentage(stages.engaged.conversionRate)} conversion)
              </span>
            </div>
            <div className="h-12 bg-gradient-to-r from-purple-500 to-purple-400 rounded-md flex items-center justify-center text-white font-semibold shadow-sm"
                 style={{ width: `${engagedWidth}%` }}>
              {formatPercentage(stages.engaged.conversionRate)}
            </div>
          </div>
          
          {/* Stage 4: Revenue */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{stages.revenue.label}</span>
              </div>
              <span className="text-muted-foreground">
                {formatNumber(stages.revenue.customerCount)} customers | {formatCurrency(stages.revenue.totalRevenue)}
              </span>
            </div>
            <div className="h-12 bg-gradient-to-r from-orange-500 to-orange-400 rounded-md flex items-center justify-center text-white font-semibold shadow-sm"
                 style={{ width: `${Math.max(revenueWidth, 15)}%` }}>
              {formatPercentage(stages.revenue.conversionRate)}
            </div>
          </div>
        </div>
        
        {/* Drop-off Alerts */}
        {dropOffPoints.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Drop-off Points & Recommendations
            </h4>
            {dropOffPoints.map((point, idx) => (
              <Alert key={idx} variant="default">
                <AlertDescription className="space-y-1">
                  <p className="font-medium">{point.stage} - {formatPercentage(point.dropOffRate)} drop-off</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {point.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(stages.views.count)}</div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(stages.leads.count)}</div>
            <div className="text-xs text-muted-foreground">Leads Captured</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(stages.engaged.count)}</div>
            <div className="text-xs text-muted-foreground">Engaged</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatCurrency(stages.revenue.totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

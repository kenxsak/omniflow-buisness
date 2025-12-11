'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, ArrowRight } from 'lucide-react';
import type { PipelineStageConversion } from '@/app/actions/analytics-dashboard-actions';

interface PipelineConversionChartProps {
  data: PipelineStageConversion[];
  loading?: boolean;
}

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  proposal: { 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  negotiation: { 
    bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  closing: { 
    bg: 'bg-orange-100 dark:bg-orange-900/30', 
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  won: { 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

export function PipelineConversionChart({ data, loading }: PipelineConversionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Pipeline Conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-24 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.count > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Pipeline Conversion
          </CardTitle>
          <CardDescription>Track deals through each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Create deals to see your pipeline conversion funnel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Pipeline Conversion
            </CardTitle>
            <CardDescription>How deals flow through your pipeline</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 mb-4">
          {data.map((stage, index) => {
            const colors = stageColors[stage.stage] || stageColors.proposal;
            const heightPercent = (stage.count / maxCount) * 100;
            
            return (
              <React.Fragment key={stage.stage}>
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t-lg ${colors.bg} ${colors.border} border-2 transition-all duration-500 flex items-end justify-center`}
                    style={{ 
                      height: `${Math.max(heightPercent, 20)}px`,
                      minHeight: '40px',
                      maxHeight: '100px',
                    }}
                  >
                    <span className={`text-lg font-bold ${colors.text} pb-1`}>
                      {stage.count}
                    </span>
                  </div>
                  <div className={`w-full p-2 ${colors.bg} rounded-b-lg text-center`}>
                    <div className={`text-xs font-medium ${colors.text}`}>
                      {stage.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(stage.value)}
                    </div>
                  </div>
                </div>
                {index < data.length - 1 && (
                  <div className="flex flex-col items-center justify-center px-1 pb-8">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {stage.conversionFromPrevious.toFixed(0)}%
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-2 pt-3 border-t">
          {data.map((stage) => {
            const colors = stageColors[stage.stage] || stageColors.proposal;
            return (
              <div key={`stat-${stage.stage}`} className="text-center">
                <Badge variant="outline" className={`${colors.text} ${colors.border} text-xs`}>
                  {stage.percentage.toFixed(0)}%
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1">of total</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

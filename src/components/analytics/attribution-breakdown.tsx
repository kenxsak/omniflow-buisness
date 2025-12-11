"use client";

/**
 * Attribution Breakdown Component
 * 
 * Multi-channel revenue attribution visualization (pie chart + table)
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import type { RevenueAttribution } from '@/types/analytics';
import { formatCurrency, formatPercentage, getChannelColor } from '@/lib/analytics-service';
import { Trophy, TrendingUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AttributionBreakdownProps {
  attribution: RevenueAttribution;
}

export default function AttributionBreakdown({ attribution }: AttributionBreakdownProps) {
  const { channels, totalRevenue, overallROI, topChannel, insights, recommendations } = attribution;
  
  // Prepare pie chart data
  const pieData = channels.map(ch => ({
    name: ch.channelLabel,
    value: ch.revenue,
    color: ch.color,
  }));
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Revenue Attribution
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>See which marketing channels drive the most revenue and understand your customer journey</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>Multi-channel attribution analysis</CardDescription>
          </div>
          <Badge variant="default" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            {overallROI.toFixed(0)}% ROI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Channel Alert */}
        <Alert className="bg-primary/10 border-primary/20">
          <Trophy className="h-4 w-4" />
          <AlertDescription>
            <strong className="font-semibold">{topChannel.channel} is your top channel!</strong>
            <p className="text-sm mt-1">{topChannel.reason}</p>
          </AlertDescription>
        </Alert>
        
        {/* Pie Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Channel Performance Table */}
        <div>
          <h4 className="font-semibold mb-3">Channel Performance</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((channel) => (
                    <TableRow key={channel.channel}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: channel.color }}
                          />
                          {channel.channelLabel}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {channel.leadsGenerated}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(channel.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={channel.roi >= 200 ? 'default' : channel.roi >= 100 ? 'secondary' : 'outline'}>
                          {channel.roi === Infinity ? '∞' : formatPercentage(channel.roi, 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(channel.conversionRate)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Attribution Models */}
        <div>
          <h4 className="font-semibold mb-3">Attribution Model Comparison</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {channels.slice(0, 3).map(channel => (
              <div key={channel.channel} className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: channel.color }}
                  />
                  {channel.channelLabel}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First-Touch:</span>
                    <span className="font-semibold">{formatPercentage(channel.firstTouchAttribution)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last-Touch:</span>
                    <span className="font-semibold">{formatPercentage(channel.lastTouchAttribution)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Multi-Touch:</span>
                    <span className="font-semibold">{formatPercentage(channel.multiTouchAttribution)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Insights */}
        <div>
          <h4 className="font-semibold mb-2">Key Insights</h4>
          <ul className="space-y-1">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Recommendations */}
        <div>
          <h4 className="font-semibold mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatCurrency(attribution.totalMarketingSpend)}</div>
            <div className="text-xs text-muted-foreground">Marketing Spend</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatPercentage(overallROI, 0)}</div>
            <div className="text-xs text-muted-foreground">Overall ROI</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

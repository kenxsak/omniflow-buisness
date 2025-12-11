'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Star, DollarSign } from 'lucide-react';
import type { TeamPerformer } from '@/app/actions/analytics-dashboard-actions';

interface TopPerformersCardProps {
  performers: TeamPerformer[];
  loading?: boolean;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const rankIcons = [
  { icon: Trophy, color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  { icon: Medal, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800/50' },
  { icon: Award, color: 'text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
];

export function TopPerformersCard({ performers, loading }: TopPerformersCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (performers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top Performers
          </CardTitle>
          <CardDescription>Your team leaderboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Close deals to appear on the leaderboard!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const showTeamView = performers.length > 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              {showTeamView ? 'Top Performers' : 'Your Performance'}
            </CardTitle>
            <CardDescription>
              {showTeamView ? 'Team leaderboard by revenue' : 'Keep up the great work!'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {performers.map((performer, index) => {
            const rankInfo = rankIcons[index] || { icon: Star, color: 'text-gray-400', bgColor: 'bg-gray-100' };
            const RankIcon = rankInfo.icon;
            
            return (
              <div 
                key={performer.userId}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  index === 0 
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800/50' 
                    : 'bg-card hover:bg-muted/50'
                }`}
              >
                <div className={`relative`}>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={index === 0 ? 'bg-amber-200 text-amber-800' : ''}>
                      {getInitials(performer.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -top-1 -right-1 p-1 rounded-full ${rankInfo.bgColor}`}>
                    <RankIcon className={`h-3 w-3 ${rankInfo.color}`} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{performer.userName}</span>
                    {index === 0 && showTeamView && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">
                        Top Seller
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{performer.dealsWon} deals won</span>
                    <span>{performer.conversionRate.toFixed(0)}% win rate</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(performer.revenueWon)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg: {formatCurrency(performer.avgDealSize)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

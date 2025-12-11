'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users2, Shield, ArrowRight, Lock, Unlock, UserCheck, 
  Activity, Clock, Loader2, Settings, UserPlus, FileEdit,
  TrendingUp, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

interface TeamStats {
  totalMembers: number;
  activeToday: number;
  claimedLeads: number;
  recentActivity: AuditEntry[];
}

interface AuditEntry {
  id: string;
  action: string;
  performedByName?: string;
  entityType: string;
  timestamp: string;
}

export function EnterpriseActivityCard() {
  const { appUser, company, idToken } = useAuth();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!company?.id || !idToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/enterprise/dashboard-stats?companyId=${company.id}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error loading enterprise stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [company?.id, idToken]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'claim':
        return <Lock className="h-3 w-3 text-orange-500" />;
      case 'release':
        return <Unlock className="h-3 w-3 text-green-500" />;
      case 'create':
        return <UserPlus className="h-3 w-3 text-blue-500" />;
      case 'update':
        return <FileEdit className="h-3 w-3 text-purple-500" />;
      case 'assign':
        return <UserCheck className="h-3 w-3 text-cyan-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string, entityType: string) => {
    const labels: Record<string, string> = {
      claim: 'claimed a lead',
      release: 'released a lead',
      create: `created a ${entityType}`,
      update: `updated a ${entityType}`,
      assign: `assigned a ${entityType}`,
      delete: `deleted a ${entityType}`,
      status_change: `changed ${entityType} status`,
    };
    return labels[action] || action;
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-200/50 dark:border-purple-800/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users2 className="h-5 w-5 text-purple-500" />
            Team Activity
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px]">
              Enterprise
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="border-2 border-purple-200/50 dark:border-purple-800/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users2 className="h-5 w-5 text-purple-500" />
            Team Activity
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px]">
              Enterprise
            </Badge>
          </CardTitle>
          <CardDescription>
            Collaborate with up to 50 team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Shield className="h-10 w-10 mx-auto text-purple-300 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Enterprise features for large teams
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <Lock className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                <span className="text-[11px] text-muted-foreground">Lead Claiming</span>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <Activity className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                <span className="text-[11px] text-muted-foreground">Audit Trail</span>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                <span className="text-[11px] text-muted-foreground">Auto-Assign</span>
              </div>
            </div>
            {appUser?.role === 'admin' && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/enterprise">
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200/50 dark:border-purple-800/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users2 className="h-5 w-5 text-purple-500" />
              Team Activity
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px]">
                Enterprise
              </Badge>
            </CardTitle>
          </div>
          {appUser?.role === 'admin' && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings/enterprise">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {stats.totalMembers}
            </div>
            <div className="text-[11px] text-purple-600/70">Team Members</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {stats.activeToday}
            </div>
            <div className="text-[11px] text-green-600/70">Active Today</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {stats.claimedLeads}
            </div>
            <div className="text-[11px] text-orange-600/70">Claimed Leads</div>
          </div>
        </div>

        {stats.recentActivity.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Recent Activity</span>
              <Link href="/settings/enterprise" className="text-[10px] text-primary hover:underline">
                View Audit Log
              </Link>
            </div>
            <div className="space-y-1">
              {stats.recentActivity.slice(0, 4).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/30 text-xs"
                >
                  {getActionIcon(entry.action)}
                  <span className="font-medium truncate max-w-[100px]">
                    {entry.performedByName || 'User'}
                  </span>
                  <span className="text-muted-foreground truncate flex-1">
                    {getActionLabel(entry.action, entry.entityType)}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

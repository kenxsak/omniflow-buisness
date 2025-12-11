'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Mail, 
  MessageSquare, 
  Wand2, 
  FileText, 
  Brain, 
  ArrowRight, 
  Loader2,
  CreditCard,
  Link as LinkIcon,
  Zap,
  AlertCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { getPersonalizedQuickActions } from '@/app/actions/enhanced-quick-actions';
import type { EnhancedQuickAction, UrgencyLevel } from '@/types/behavior';

interface QuickActionsPanelProps {
  companyId?: string;
}

// Icon mapping for action types
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'user-plus': UserPlus,
  'mail': Mail,
  'message-square': MessageSquare,
  'wand-2': Wand2,
  'file-text': FileText,
  'brain': Brain,
  'credit-card': CreditCard,
  'link': LinkIcon,
  'zap': Zap,
};

// Badge styling based on type
const badgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'NEW': 'default',
  'TRENDING': 'default',
  'RECOMMENDED': 'secondary',
  'QUICK WIN': 'default',
  'DORMANT': 'destructive',
  'TRY AGAIN': 'secondary',
  'URGENT': 'destructive',
};

// Urgency level visual indicators
const urgencyConfig: Record<UrgencyLevel, { 
  borderColor: string; 
  bgColor: string;
  textColor: string;
}> = {
  critical: { 
    borderColor: 'border-red-500/50', 
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-700',
  },
  high: { 
    borderColor: 'border-orange-500/50', 
    bgColor: 'bg-orange-500/5',
    textColor: 'text-orange-700',
  },
  medium: { 
    borderColor: 'border-blue-500/30', 
    bgColor: 'bg-blue-500/5',
    textColor: 'text-blue-700',
  },
  low: { 
    borderColor: 'border-gray-300', 
    bgColor: '',
    textColor: 'text-gray-600',
  },
};

export default function QuickActionsPanel({ companyId }: QuickActionsPanelProps) {
  const [actions, setActions] = useState<EnhancedQuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    async function fetchActions() {
      if (!companyId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const result = await getPersonalizedQuickActions(companyId);
        
        if (result && result.success && result.data) {
          setActions(result.data);
        } else {
          setError(result?.error || 'Failed to load recommendations');
        }
      } catch (error) {
        console.error('Error loading personalized quick actions:', error);
        setError('Unable to load recommendations. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchActions();
  }, [companyId]);

  if (!companyId || isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-background p-6 border-b">
          <h2 className="text-xl font-semibold">Recommended Actions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personalized suggestions based on your activity
          </p>
        </div>
        <CardContent className="pt-6 flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="overflow-hidden border-destructive/50">
        <div className="bg-gradient-to-r from-primary/10 to-background p-6 border-b">
          <h2 className="text-xl font-semibold">Recommended Actions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personalized suggestions based on your activity
          </p>
        </div>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-background p-6 border-b">
          <h2 className="text-xl font-semibold">Recommended Actions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personalized suggestions based on your activity
          </p>
        </div>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">
            You're all caught up! Great work. 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-background p-6 border-b">
        <h2 className="text-xl font-semibold">Recommended Actions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalized suggestions based on your activity
        </p>
      </div>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = iconMap[action.icon] || FileText;
            const urgencyStyle = urgencyConfig[action.urgency];
            
            return (
              <Card
                key={action.id}
                className={`group hover:shadow-md transition-all ${
                  action.highlighted
                    ? `${urgencyStyle.borderColor} ${urgencyStyle.bgColor}`
                    : 'hover:border-primary/30'
                }`}
              >
                <CardContent className="p-4">
                  {/* Header with icon and badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`p-2 rounded-lg ${
                        action.highlighted
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      } transition-colors`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm leading-tight">
                          {action.title}
                        </h3>
                        {action.badge && (
                          <Badge 
                            variant={badgeVariants[action.badge] || 'outline'}
                            className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                          >
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      {action.timeSinceLastAction && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Last: {action.timeSinceLastAction}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {action.description}
                  </p>

                  {/* Score indicator (for critical/high urgency) */}
                  {(action.urgency === 'critical' || action.urgency === 'high') && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={urgencyStyle.textColor}>
                          {action.urgency === 'critical' ? 'Critical Priority' : 'High Priority'}
                        </span>
                        <span className="text-muted-foreground">
                          Score: {action.score.total}/100
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            action.urgency === 'critical' 
                              ? 'bg-red-500' 
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${action.score.total}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  <Button
                    asChild
                    size="sm"
                    variant={action.highlighted ? 'default' : 'outline'}
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    <Link href={action.link}>
                      {action.urgency === 'critical' ? 'Take Action' : 'Go'}
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Showing top {actions.length} recommendations</span>
              {actions.some(a => a.urgency === 'critical') && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {actions.filter(a => a.urgency === 'critical').length} critical
                </span>
              )}
            </div>
            <span className="text-xs">
              Recommendations refresh daily
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

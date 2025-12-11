'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { DollarSign, Calendar, TrendingUp, Edit, Trash2 } from 'lucide-react';
import type { Deal } from '@/types/crm';
import { DEAL_STATUS_LABELS, DEAL_STATUS_COLORS } from '@/types/crm';

interface DealCardProps {
  deal: Deal;
  onEdit?: (deal: Deal) => void;
  onDelete?: (dealId: string) => void;
  compact?: boolean;
}

export function DealCard({ deal, onEdit, onDelete, compact = false }: DealCardProps) {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Not set';
    return format(new Date(date), 'MMM d, yyyy');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{deal.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(deal.amount, deal.currency)}
            </p>
          </div>
        </div>
        <Badge className={DEAL_STATUS_COLORS[deal.status]}>
          {DEAL_STATUS_LABELS[deal.status]}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold">{deal.name}</h4>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(deal.amount, deal.currency)}
            </p>
          </div>
          <Badge className={DEAL_STATUS_COLORS[deal.status]}>
            {DEAL_STATUS_LABELS[deal.status]}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{deal.probability}% probability</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Close: {formatDate(deal.expectedCloseDate)}</span>
          </div>
        </div>

        {deal.notes && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {deal.notes}
          </p>
        )}

        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(deal)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(deal.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

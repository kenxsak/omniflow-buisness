'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, DollarSign } from 'lucide-react';
import type { Deal } from '@/types/crm';
import { getDealsForContact, deleteDeal } from '@/app/actions/deal-actions';
import { DealCard } from './deal-card';
import { DealForm } from './deal-form';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/currency-context';

interface ContactDealsProps {
  contactId: string;
  contactName: string;
  companyId: string;
}

export function ContactDeals({ contactId, contactName, companyId }: ContactDealsProps) {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>();

  useEffect(() => {
    loadDeals();
  }, [contactId, companyId]);

  const loadDeals = async () => {
    setIsLoading(true);
    try {
      const data = await getDealsForContact(companyId, contactId);
      setDeals(data);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
    setIsLoading(false);
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setShowForm(true);
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      const result = await deleteDeal(dealId);
      if (result.success) {
        toast({ title: 'Deal deleted successfully' });
        loadDeals();
      } else {
        toast({ title: result.error || 'Failed to delete deal', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to delete deal', variant: 'destructive' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDeal(undefined);
  };

  const totalValue = deals
    .filter(d => !['won', 'lost'].includes(d.status))
    .reduce((sum, d) => sum + d.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Deals</CardTitle>
            {deals.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Pipeline value: {formatCurrency(totalValue)}
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Deal
          </Button>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No deals yet</p>
              <p className="text-sm">Create a deal to track opportunities with this contact</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DealForm
        open={showForm}
        onOpenChange={handleFormClose}
        contactId={contactId}
        contactName={contactName}
        companyId={companyId}
        existingDeal={editingDeal}
        onSuccess={loadDeals}
      />
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Deal, DealStatus } from '@/types/crm';
import { DEAL_STATUS_LABELS, DEFAULT_PROBABILITIES } from '@/types/crm';
import { createDeal, updateDeal } from '@/app/actions/deal-actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/currency-context';

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  companyId: string;
  existingDeal?: Deal;
  onSuccess?: () => void;
}

export function DealForm({
  open,
  onOpenChange,
  contactId,
  contactName,
  companyId,
  existingDeal,
  onSuccess,
}: DealFormProps) {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const { getCurrencyCode } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  
  const companyCurrency = getCurrencyCode();
  const [wasOpenBefore, setWasOpenBefore] = useState(false);

  const getInitialFormData = () => ({
    name: existingDeal?.name || '',
    amount: existingDeal?.amount || 0,
    currency: existingDeal?.currency || companyCurrency,
    status: existingDeal?.status || ('proposal' as DealStatus),
    probability: existingDeal?.probability || DEFAULT_PROBABILITIES.proposal,
    expectedCloseDate: existingDeal?.expectedCloseDate 
      ? new Date(existingDeal.expectedCloseDate).toISOString().split('T')[0] 
      : '',
    notes: existingDeal?.notes || '',
  });

  const [formData, setFormData] = useState(getInitialFormData);
  
  useEffect(() => {
    if (open && !wasOpenBefore) {
      setFormData(getInitialFormData());
      setWasOpenBefore(true);
    } else if (!open && wasOpenBefore) {
      setWasOpenBefore(false);
    }
  }, [open]);
  
  useEffect(() => {
    if (open && !existingDeal) {
      setFormData(prev => ({
        ...prev,
        currency: companyCurrency,
      }));
    }
  }, [companyCurrency]);

  const handleStatusChange = (status: DealStatus) => {
    setFormData(prev => ({
      ...prev,
      status,
      probability: DEFAULT_PROBABILITIES[status],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    setIsLoading(true);
    try {
      if (existingDeal) {
        const result = await updateDeal(
          existingDeal.id,
          {
            ...formData,
            expectedCloseDate: formData.expectedCloseDate || undefined,
          },
          appUser.uid,
          appUser.name || appUser.email
        );

        if (result.success) {
          toast({ title: 'Deal updated successfully' });
          onSuccess?.();
          onOpenChange(false);
        } else {
          toast({ title: result.error || 'Failed to update deal', variant: 'destructive' });
        }
      } else {
        const result = await createDeal({
          ...formData,
          companyId,
          contactId,
          contactName,
          expectedCloseDate: formData.expectedCloseDate || undefined,
          createdBy: appUser.uid,
          createdByName: appUser.name || appUser.email,
        });

        if (result.success) {
          toast({ title: 'Deal created successfully' });
          onSuccess?.();
          onOpenChange(false);
        } else {
          toast({ title: result.error || 'Failed to create deal', variant: 'destructive' });
        }
      }
    } catch (error) {
      toast({ title: 'An error occurred', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {existingDeal ? 'Edit Deal' : 'Create New Deal'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Deal Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Website Redesign Project"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleStatusChange(value as DealStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEAL_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData(prev => ({ ...prev, probability: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional details about this deal..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {existingDeal ? 'Update Deal' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

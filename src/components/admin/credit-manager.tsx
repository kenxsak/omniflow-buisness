/**
 * Credit Manager (Super Admin Only)
 * Allows super admins to view and manage company credit balances
 * Supports dual credit system (lifetime vs monthly)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Coins, TrendingUp, Calendar } from 'lucide-react';
import { getAllAdminsAndCompanies } from '@/lib/saas-data';
import type { Company } from '@/types/saas';

export default function CreditManager() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Array<{ company: Company; admin: any }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [creditType, setCreditType] = useState<'lifetime' | 'monthly'>('lifetime');
  const [creditsToAdd, setCreditsToAdd] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await getAllAdminsAndCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load companies',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.company.id === selectedCompanyId)?.company;
  const creditBalance = selectedCompany?.aiCreditBalance;

  const handleAddCredits = async () => {
    if (!selectedCompanyId || !creditsToAdd || parseInt(creditsToAdd) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please select a company and enter a valid credit amount',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Import the helper function dynamically
      const { addBonusCredits } = await import('@/lib/credit-balance-helper');
      
      const result = await addBonusCredits(
        selectedCompanyId,
        parseInt(creditsToAdd),
        creditType
      );

      if (result.success) {
        toast({
          title: 'Credits Added',
          description: `Successfully added ${creditsToAdd} ${creditType} credits`,
        });
        
        // Reload companies to show updated balance
        await loadCompanies();
        setCreditsToAdd('');
      } else {
        throw new Error(result.error || 'Failed to add credits');
      }
    } catch (error: any) {
      console.error('Error adding credits:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add credits',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Manager</CardTitle>
          <CardDescription>Loading companies...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Credit Manager (Super Admin)
        </CardTitle>
        <CardDescription>
          Manage AI credit balances for companies. Free plans use lifetime credits, paid plans use monthly credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Selection */}
        <div className="space-y-2">
          <Label htmlFor="company">Select Company</Label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger id="company">
              <SelectValue placeholder="Choose a company..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(({ company, admin }) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name} ({admin.email}) - {company.planId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Balance Display */}
        {selectedCompany && creditBalance && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Current Balance
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lifetime Credits */}
              <div className="flex items-center gap-3 p-3 bg-background rounded border">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Lifetime Credits</p>
                  <p className="text-lg font-bold">
                    {creditBalance.lifetimeAllocated - creditBalance.lifetimeUsed} / {creditBalance.lifetimeAllocated}
                  </p>
                  {creditBalance.lifetimeAllocated > 0 && (
                    <Badge variant="outline" className="mt-1">
                      One-time (Free plan)
                    </Badge>
                  )}
                </div>
              </div>

              {/* Monthly Credits */}
              <div className="flex items-center gap-3 p-3 bg-background rounded border">
                <Calendar className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Credits</p>
                  <p className="text-lg font-bold">
                    {creditBalance.monthlyAllocated - creditBalance.monthlyUsed} / {creditBalance.monthlyAllocated}
                  </p>
                  {creditBalance.monthlyAllocated > 0 && (
                    <Badge variant="outline" className="mt-1">
                      Resets {creditBalance.currentMonth}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              Last reset: {new Date(creditBalance.lastResetAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Add Credits Form */}
        {selectedCompany && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Add Bonus Credits</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creditType">Credit Type</Label>
                <Select value={creditType} onValueChange={(v) => setCreditType(v as 'lifetime' | 'monthly')}>
                  <SelectTrigger id="creditType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lifetime">Lifetime (One-time)</SelectItem>
                    <SelectItem value="monthly">Monthly (Renewable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">Credits to Add</Label>
                <Input
                  id="credits"
                  type="number"
                  min="1"
                  placeholder="e.g., 100"
                  value={creditsToAdd}
                  onChange={(e) => setCreditsToAdd(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleAddCredits}
              disabled={isSubmitting || !creditsToAdd}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Credits...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add {creditsToAdd || '0'} Credits
                </>
              )}
            </Button>
          </div>
        )}

        {!selectedCompany && (
          <div className="text-center py-8 text-muted-foreground">
            Select a company to view and manage their credits
          </div>
        )}
      </CardContent>
    </Card>
  );
}

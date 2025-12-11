
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, Loader2, Flag, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Plan, Feature, TrialSettings } from '@/types/saas';
import { getStoredPlans, addStoredPlan, updateStoredPlan, deleteStoredPlan, getStoredFeatures, addStoredFeature, deleteStoredFeature, getTrialSettings, saveTrialSettings, saveStoredFeatures, initialFeatures, syncPlansFromCode } from '@/lib/saas-data';
import { useCurrency } from '@/contexts/currency-context';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// --- DIALOG COMPONENT ---
const PlanEditDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (plan: Plan) => void;
  planToEdit?: Plan | null;
}> = ({ isOpen, onOpenChange, onSave, planToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceMonthlyUSD, setPriceMonthlyUSD] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [paymentLinkMonthlyUSD, setPaymentLinkMonthlyUSD] = useState('');
  const [paymentLinkYearlyUSD, setPaymentLinkYearlyUSD] = useState('');
  const [yearlyDiscountPercentage, setYearlyDiscountPercentage] = useState(0);
  const [maxUsers, setMaxUsers] = useState(1);
  const [aiCredits, setAiCredits] = useState(100);
  const [maxImagesPerMonth, setMaxImagesPerMonth] = useState<number | undefined>(undefined);
  const [maxTextPerMonth, setMaxTextPerMonth] = useState<number | undefined>(undefined);
  const [maxTTSPerMonth, setMaxTTSPerMonth] = useState<number | undefined>(undefined);
  const [allowOverage, setAllowOverage] = useState(false);
  const [overagePricePerCredit, setOveragePricePerCredit] = useState<number | undefined>(undefined);

  // BYOK Settings
  const [allowBYOK, setAllowBYOK] = useState(false);
  
  // Digital Card Settings
  const [digitalCardsPerUser, setDigitalCardsPerUser] = useState<number | undefined>(undefined);
  const [maxDigitalCardsCap, setMaxDigitalCardsCap] = useState<number | undefined>(undefined);
  const [maxDigitalCards, setMaxDigitalCards] = useState<number | undefined>(undefined);
  
  // CRM Limitation Settings
  const [crmAccessLevel, setCrmAccessLevel] = useState<'basic' | 'full'>('basic');
  const [maxContacts, setMaxContacts] = useState<number | null>(null);
  const [allowBulkImport, setAllowBulkImport] = useState(false);
  const [allowBulkExport, setAllowBulkExport] = useState(false);
  const [allowAdvancedFields, setAllowAdvancedFields] = useState(false);

  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    const loadAndSetData = async () => {
        const features = await getStoredFeatures();
        setAllFeatures(features.filter(f => f.active)); 

        if (planToEdit) {
            setName(planToEdit.name);
            setDescription(planToEdit.description);
            setPriceMonthlyUSD(planToEdit.priceMonthlyUSD);
            setIsFeatured(planToEdit.isFeatured || false);
            setPaymentLinkMonthlyUSD(planToEdit.paymentLinkMonthlyUSD || '');
            setPaymentLinkYearlyUSD(planToEdit.paymentLinkYearlyUSD || '');
            setSelectedFeatureIds(new Set(planToEdit.featureIds || []));
            setYearlyDiscountPercentage(planToEdit.yearlyDiscountPercentage || 0);
            setMaxUsers(planToEdit.maxUsers || 1);
            setAiCredits(planToEdit.aiCreditsPerMonth || 100);
            setMaxImagesPerMonth(planToEdit.maxImagesPerMonth);
            setMaxTextPerMonth(planToEdit.maxTextPerMonth);
            setMaxTTSPerMonth(planToEdit.maxTTSPerMonth);
            setAllowOverage(planToEdit.allowOverage || false);
            setOveragePricePerCredit(planToEdit.overagePricePerCredit);
            // BYOK
            setAllowBYOK(planToEdit.allowBYOK || false);
            // Digital Cards
            setDigitalCardsPerUser(planToEdit.digitalCardsPerUser);
            setMaxDigitalCardsCap(planToEdit.maxDigitalCardsCap);
            setMaxDigitalCards(planToEdit.maxDigitalCards);
            // CRM Limitations
            setCrmAccessLevel(planToEdit.crmAccessLevel || 'basic');
            setMaxContacts(planToEdit.maxContacts ?? null);
            setAllowBulkImport(planToEdit.allowBulkImport || false);
            setAllowBulkExport(planToEdit.allowBulkExport || false);
            setAllowAdvancedFields(planToEdit.allowAdvancedFields || false);
        } else {
            setName('');
            setDescription('');
            setPriceMonthlyUSD(0);
            setIsFeatured(false);
            setPaymentLinkMonthlyUSD('');
            setPaymentLinkYearlyUSD('');
            setSelectedFeatureIds(new Set());
            setYearlyDiscountPercentage(0);
            setMaxUsers(1);
            setAiCredits(100);
            setMaxImagesPerMonth(undefined);
            setMaxTextPerMonth(undefined);
            setMaxTTSPerMonth(undefined);
            setAllowOverage(false);
            setOveragePricePerCredit(undefined);
            // BYOK
            setAllowBYOK(false);
            // Digital Cards
            setDigitalCardsPerUser(undefined);
            setMaxDigitalCardsCap(undefined);
            setMaxDigitalCards(undefined);
            // CRM Limitations
            setCrmAccessLevel('basic');
            setMaxContacts(null);
            setAllowBulkImport(false);
            setAllowBulkExport(false);
            setAllowAdvancedFields(false);
        }
    };
    
    if (isOpen) {
        loadAndSetData();
    }
  }, [planToEdit, isOpen]);

  const handleFeatureToggle = (featureId: string, checked: boolean) => {
    setSelectedFeatureIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(featureId);
      } else {
        newSet.delete(featureId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    if (!name || !description) {
      toast({ title: "Validation Error", description: "Plan name and description are required.", variant: "destructive" });
      return;
    }
    const planData: Plan = {
      id: planToEdit?.id || crypto.randomUUID(),
      name,
      description,
      priceMonthlyUSD,
      isFeatured,
      paymentLinkMonthlyUSD,
      paymentLinkYearlyUSD,
      featureIds: Array.from(selectedFeatureIds),
      yearlyDiscountPercentage,
      maxUsers,
      aiCreditsPerMonth: aiCredits,
      maxImagesPerMonth,
      maxTextPerMonth,
      maxTTSPerMonth,
      allowOverage,
      overagePricePerCredit,
      // BYOK
      allowBYOK,
      // Digital Cards
      digitalCardsPerUser,
      maxDigitalCardsCap,
      maxDigitalCards,
      // CRM Limitations
      crmAccessLevel,
      maxContacts,
      allowBulkImport,
      allowBulkExport,
      allowAdvancedFields,
    };
    onSave(planData);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{planToEdit ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          <DialogDescription>Define the details and feature limits of the subscription plan.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-3">
          <div className="space-y-1">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input id="plan-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plan-description">Description</Label>
            <Input id="plan-description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Monthly Pricing (USD)</Label>
            <p className="text-xs text-muted-foreground">Prices automatically convert to user&apos;s local currency based on their country</p>
            <div className="space-y-1">
              <Label htmlFor="plan-price-monthly-usd">Price per Month (USD)</Label>
              <Input id="plan-price-monthly-usd" type="number" value={priceMonthlyUSD} onChange={e => setPriceMonthlyUSD(Number(e.target.value))} />
            </div>
          </div>
           <div className="space-y-2">
            <Label className="text-sm font-semibold">Plan Limits</Label>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="plan-max-users">Max Users</Label>
                    <Input id="plan-max-users" type="number" value={maxUsers} onChange={e => setMaxUsers(Number(e.target.value))} min="1"/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="plan-ai-credits">AI Credits / Month</Label>
                    <Input id="plan-ai-credits" type="number" value={aiCredits} onChange={e => setAiCredits(Number(e.target.value))} min="0"/>
                </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Operation Limits (Profitability Control)</Label>
            <p className="text-xs text-muted-foreground">Set specific limits to prevent expensive operations from causing losses</p>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="plan-max-images">Max Images/Month</Label>
                    <Input 
                      id="plan-max-images" 
                      type="number" 
                      value={maxImagesPerMonth ?? ''} 
                      onChange={e => setMaxImagesPerMonth(e.target.value ? Number(e.target.value) : undefined)} 
                      placeholder="Unlimited"
                      min="0"
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="plan-max-text">Max Text Ops/Month</Label>
                    <Input 
                      id="plan-max-text" 
                      type="number" 
                      value={maxTextPerMonth ?? ''} 
                      onChange={e => setMaxTextPerMonth(e.target.value ? Number(e.target.value) : undefined)} 
                      placeholder="Unlimited"
                      min="0"
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="plan-max-tts">Max TTS Ops/Month</Label>
                    <Input 
                      id="plan-max-tts" 
                      type="number" 
                      value={maxTTSPerMonth ?? ''} 
                      onChange={e => setMaxTTSPerMonth(e.target.value ? Number(e.target.value) : undefined)} 
                      placeholder="Unlimited"
                      min="0"
                    />
                </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Overage Settings (Revenue Opportunity)</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="plan-allow-overage" 
                  checked={allowOverage} 
                  onCheckedChange={checked => setAllowOverage(!!checked)} 
                />
                <Label htmlFor="plan-allow-overage" className="cursor-pointer">Allow users to purchase extra credits beyond limit</Label>
              </div>
              {allowOverage && (
                <div className="space-y-1 ml-6">
                  <Label htmlFor="plan-overage-price">Price per Extra Credit (USD)</Label>
                  <Input 
                    id="plan-overage-price" 
                    type="number" 
                    step="0.001"
                    value={overagePricePerCredit ?? ''} 
                    onChange={e => setOveragePricePerCredit(e.target.value ? Number(e.target.value) : undefined)} 
                    placeholder="e.g., 0.005 = $5 per 1,000 credits"
                  />
                  <p className="text-xs text-muted-foreground">Suggested: $0.004-0.005 per credit ($4-5 per 1,000 credits)</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold">BYOK Settings (Bring Your Own API Key)</Label>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="plan-allow-byok" 
                checked={allowBYOK} 
                onCheckedChange={checked => setAllowBYOK(!!checked)} 
              />
              <Label htmlFor="plan-allow-byok" className="cursor-pointer">Allow users to use their own Gemini API key for unlimited AI</Label>
            </div>
            <p className="text-xs text-muted-foreground">When enabled, users can bypass AI credit limits by providing their own API key</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Digital Card Limits</Label>
            <p className="text-xs text-muted-foreground">Control how many digital business cards users can create</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="plan-digital-cards-per-user">Cards per User</Label>
                <Input 
                  id="plan-digital-cards-per-user" 
                  type="number" 
                  value={digitalCardsPerUser ?? ''} 
                  onChange={e => setDigitalCardsPerUser(e.target.value ? Number(e.target.value) : undefined)} 
                  placeholder="0 = fixed"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">0 for free plan (uses fixed limit)</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-digital-cards-cap">Maximum Cap</Label>
                <Input 
                  id="plan-digital-cards-cap" 
                  type="number" 
                  value={maxDigitalCardsCap ?? ''} 
                  onChange={e => setMaxDigitalCardsCap(e.target.value ? Number(e.target.value) : undefined)} 
                  placeholder="Unlimited"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Upper limit to prevent abuse</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-max-digital-cards">Fixed Limit (Free Plan)</Label>
                <Input 
                  id="plan-max-digital-cards" 
                  type="number" 
                  value={maxDigitalCards ?? ''} 
                  onChange={e => setMaxDigitalCards(e.target.value ? Number(e.target.value) : undefined)} 
                  placeholder="1"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">For plans with 0 cards per user</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold">CRM Limitations</Label>
            <p className="text-xs text-muted-foreground">Control CRM access level and contact limits for this plan</p>
            
            <div className="space-y-1">
              <Label htmlFor="plan-crm-access-level">CRM Access Level</Label>
              <Select value={crmAccessLevel} onValueChange={(value: 'basic' | 'full') => setCrmAccessLevel(value)}>
                <SelectTrigger id="plan-crm-access-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic CRM (Limited features)</SelectItem>
                  <SelectItem value="full">Full CRM (All features)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="plan-max-contacts">Maximum Contacts</Label>
              <Input 
                id="plan-max-contacts" 
                type="number" 
                value={maxContacts ?? ''} 
                onChange={e => setMaxContacts(e.target.value ? Number(e.target.value) : null)} 
                placeholder="Leave empty for unlimited"
                min="0"
              />
              <p className="text-xs text-muted-foreground">Empty = unlimited contacts (paid plans). Set to 100 for Free plan.</p>
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="plan-allow-bulk-import" 
                  checked={allowBulkImport} 
                  onCheckedChange={checked => setAllowBulkImport(!!checked)} 
                />
                <Label htmlFor="plan-allow-bulk-import" className="cursor-pointer">Allow bulk CSV import of contacts</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="plan-allow-bulk-export" 
                  checked={allowBulkExport} 
                  onCheckedChange={checked => setAllowBulkExport(!!checked)} 
                />
                <Label htmlFor="plan-allow-bulk-export" className="cursor-pointer">Allow bulk CSV export of contacts</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="plan-allow-advanced-fields" 
                  checked={allowAdvancedFields} 
                  onCheckedChange={checked => setAllowAdvancedFields(!!checked)} 
                />
                <Label htmlFor="plan-allow-advanced-fields" className="cursor-pointer">Allow custom/advanced contact fields</Label>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <Label htmlFor="plan-discount-yearly">Yearly Discount (%)</Label>
                <Input id="plan-discount-yearly" type="number" value={yearlyDiscountPercentage} onChange={e => setYearlyDiscountPercentage(Number(e.target.value))} min="0" max="100" />
                 <p className="text-xs text-muted-foreground mt-1">Applied to the calculated annual price (Monthly x 12).</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Payment Links (Optional)</Label>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <Label htmlFor="plan-link-monthly-usd">Monthly Payment Link</Label>
                <Input id="plan-link-monthly-usd" type="url" placeholder="https://buy.stripe.com/..." value={paymentLinkMonthlyUSD} onChange={e => setPaymentLinkMonthlyUSD(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-link-yearly-usd">Yearly Payment Link</Label>
                <Input id="plan-link-yearly-usd" type="url" placeholder="https://buy.stripe.com/..." value={paymentLinkYearlyUSD} onChange={e => setPaymentLinkYearlyUSD(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Features</Label>
            <div className="max-h-48 overflow-y-auto rounded-md border p-4 space-y-2">
              {allFeatures.map(feature => (
                <div key={feature.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={`feature-${feature.id}`}
                    checked={selectedFeatureIds.has(feature.id)}
                    onCheckedChange={(checked) => handleFeatureToggle(feature.id, !!checked)}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={`feature-${feature.id}`} className="font-medium cursor-pointer">{feature.name}</Label>
                    <p className="text-xs text-muted-foreground">{feature.description || 'No description'}</p>
                    <p className="text-xs text-muted-foreground font-mono">ID: {feature.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="plan-featured" checked={isFeatured} onCheckedChange={checked => setIsFeatured(!!checked)} />
            <Label htmlFor="plan-featured" className="cursor-pointer">Mark as Featured Plan</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- MAIN COMPONENT ---
export default function PlanManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const { toast } = useToast();
  const { currency, formatCurrency, convertFromUSD } = useCurrency();
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [trialSettings, setTrialSettings] = useState<TrialSettings | null>(null);
  const [convertedPrices, setConvertedPrices] = useState<{ [planId: string]: number }>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [storedPlans, storedFeatures, storedTrialSettings] = await Promise.all([
        getStoredPlans(),
        getStoredFeatures(),
        getTrialSettings(),
    ]);
    const sortedPlans = storedPlans.sort((a, b) => a.priceMonthlyUSD - b.priceMonthlyUSD);
    setPlans(sortedPlans);
    setAllFeatures(storedFeatures);
    setTrialSettings(storedTrialSettings);
    
    // Convert all prices to local currency
    const priceMap: { [planId: string]: number } = {};
    for (const plan of sortedPlans) {
      if (plan.priceMonthlyUSD > 0) {
        priceMap[plan.id] = await convertFromUSD(plan.priceMonthlyUSD);
      }
    }
    setConvertedPrices(priceMap);
    setIsLoading(false);
  }, [convertFromUSD]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleCreateNew = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleSavePlan = (planData: Plan) => {
    if (plans.some(p => p.id === planData.id)) {
      updateStoredPlan(planData);
      toast({ title: "Plan Updated", description: `Plan "${planData.name}" has been saved.` });
    } else {
      addStoredPlan(planData);
      toast({ title: "Plan Created", description: `New plan "${planData.name}" has been added.` });
    }
    loadData();
  };

  const handleDelete = (plan: Plan) => {
    deleteStoredPlan(plan.id);
    toast({ title: "Plan Deleted", description: `Plan "${plan.name}" has been removed.`, variant: "destructive" });
    loadData();
  };

  const handleAddNewFeature = async () => {
    if (!newFeatureName.trim()) {
      toast({ title: "Feature name is required", variant: "destructive" });
      return;
    }
    setIsAddingFeature(true);
    const result = await addStoredFeature({
        name: newFeatureName,
        description: newFeatureDescription,
        active: true,
    });

    if (result.success) {
        toast({ title: "Feature Added", description: `New feature "${newFeatureName}" added to master list.` });
        setNewFeatureName('');
        setNewFeatureDescription('');
        await loadData();
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsAddingFeature(false);
  };

  const handleDeleteFeature = async (featureId: string, featureName: string) => {
    const isDefault = initialFeatures.some(f => f.id === featureId);
    if (isDefault) {
      toast({ title: "Action Not Allowed", description: "Default system features cannot be deleted.", variant: "destructive" });
      return;
    }
    await deleteStoredFeature(featureId);
    toast({ title: "Feature Deleted", description: `Feature "${featureName}" removed from master list.` });
    await loadData();
  };
  
  const handleFeatureToggle = async (featureId: string, active: boolean) => {
    const updatedFeatures = allFeatures.map(f => f.id === featureId ? { ...f, active } : f);
    setAllFeatures(updatedFeatures);
    await saveStoredFeatures(updatedFeatures); // Ensure this saves to the database
    toast({ title: 'Feature status updated.' });
  };
  
  const handleTrialSettingsChange = (field: keyof TrialSettings, value: string | number) => {
    if (!trialSettings) return;
    setTrialSettings({ ...trialSettings, [field]: value });
  };

  const handleSaveTrialSettings = () => {
    if (trialSettings) {
        saveTrialSettings(trialSettings);
        toast({ title: 'Trial settings saved.' });
    }
  };

  const handleSyncPlans = async () => {
    setIsSyncing(true);
    const result = await syncPlansFromCode();
    if (result.success) {
      toast({ 
        title: "Plans Synced Successfully", 
        description: result.message,
        variant: "default"
      });
      await loadData(); // Reload to show updated values
    } else {
      toast({ 
        title: "Sync Failed", 
        description: result.message,
        variant: "destructive"
      });
    }
    setIsSyncing(false);
  };

  const priceColumnHeader = `Price (${currency}/Mo)`;

  return (
    <div className="space-y-6">
      {/* SaaS Plan Management Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>SaaS Plan Management</CardTitle>
              <CardDescription>View, create, edit, and delete your application's subscription plans.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleSyncPlans} variant="outline" disabled={isSyncing} className="self-start sm:self-center">
                {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isSyncing && <span className="mr-2">🔄</span>}
                Sync Plans from Code
              </Button>
              <Button onClick={handleCreateNew} className="self-start sm:self-center">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Plan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>{priceColumnHeader}</TableHead>
                    <TableHead className="hidden sm:table-cell">Max Users</TableHead>
                    <TableHead className="hidden md:table-cell">AI Credits</TableHead>
                    <TableHead className="hidden md:table-cell">CRM Access</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact Limit</TableHead>
                    <TableHead className="hidden xl:table-cell">BYOK</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length > 0 ? (
                    plans.map(plan => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>{plan.name}</span>
                            {plan.isFeatured && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded w-fit">Featured</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {plan.priceMonthlyUSD === 0 ? 'Free' : formatCurrency(convertedPrices[plan.id] || plan.priceMonthlyUSD)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{plan.maxUsers ?? 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <span>{plan.aiCreditsPerMonth?.toLocaleString() ?? '0'}</span>
                            {plan.maxImagesPerMonth && (
                              <span className="text-xs text-muted-foreground">{plan.maxImagesPerMonth} img/mo</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <span className={plan.crmAccessLevel === 'full' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                              {plan.crmAccessLevel === 'full' ? 'Full CRM' : 'Basic CRM'}
                            </span>
                            <div className="flex gap-1 text-xs">
                              {plan.allowBulkImport && <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded">Import</span>}
                              {plan.allowBulkExport && <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded">Export</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className={(plan.maxContacts === null || plan.maxContacts === undefined) ? 'text-green-600 dark:text-green-400' : ''}>
                            {(plan.maxContacts === null || plan.maxContacts === undefined) ? '∞ Unlimited' : `${plan.maxContacts.toLocaleString()} max`}
                          </span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {plan.allowBYOK ? (
                            <span className="text-green-600 dark:text-green-400">✓ Yes</span>
                          ) : (
                            <span className="text-muted-foreground">✗ No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to delete this plan?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. This will permanently delete the "{plan.name}" plan.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(plan)} className={buttonVariants({ variant: "destructive" })}>Delete Plan</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center">No plans found. Create one to get started.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
         <CardFooter className="flex-col items-start border-t pt-4">
             {trialSettings && (
                 <div className="w-full space-y-4">
                    <h4 className="font-semibold text-md flex items-center"><Timer className="mr-2 h-5 w-5 text-primary"/>Free Trial Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="trial-plan">Trial Plan</Label>
                          <Select value={trialSettings.trialPlanId} onValueChange={(planId) => handleTrialSettingsChange('trialPlanId', planId)}>
                            <SelectTrigger id="trial-plan"><SelectValue /></SelectTrigger>
                            <SelectContent>{plans.map(plan => (<SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>))}</SelectContent>
                          </Select>
                           <p className="text-xs text-muted-foreground mt-1">This plan will be assigned to new companies on signup.</p>
                        </div>
                        <div>
                          <Label htmlFor="trial-duration">Trial Duration (days)</Label>
                          <Input id="trial-duration" type="number" value={trialSettings.trialDurationDays} onChange={(e) => handleTrialSettingsChange('trialDurationDays', Number(e.target.value))} min="1" />
                        </div>
                    </div>
                    <Button onClick={handleSaveTrialSettings} size="sm">Save Trial Settings</Button>
                </div>
             )}
         </CardFooter>
      </Card>
      
      {/* Unified Feature Management Card */}
      <Card>
          <CardHeader>
              <CardTitle className="flex items-center"><Flag className="mr-2 h-5 w-5 text-primary" />Feature Management</CardTitle>
              <CardDescription>Create new features and manage their global availability. Inactive features cannot be added to plans.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="border rounded-md p-4">
                <h4 className="text-md font-semibold mb-2">Create New Feature</h4>
                 <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-grow space-y-1">
                          <Label htmlFor="new-feature-name" className="text-xs">Feature Name</Label>
                          <Input id="new-feature-name" value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)} placeholder="e.g., Advanced Reporting"/>
                      </div>
                      <div className="flex-grow space-y-1">
                          <Label htmlFor="new-feature-desc" className="text-xs">Feature Description (Optional)</Label>
                          <Input id="new-feature-desc" value={newFeatureDescription} onChange={e => setNewFeatureDescription(e.target.value)} placeholder="e.g., Generate detailed PDF reports"/>
                      </div>
                      <Button onClick={handleAddNewFeature} disabled={isAddingFeature} className="w-full sm:w-auto">
                        {isAddingFeature && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Feature
                      </Button>
                 </div>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-2">Available Features</h4>
                <div className="space-y-2">
                    {isLoading ? <div className="flex justify-center items-center h-20"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                        allFeatures.map(feature => (
                          <div key={feature.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30">
                            <div>
                                <Label htmlFor={`feature-toggle-${feature.id}`} className="font-medium cursor-pointer">{feature.name}</Label>
                                <p className="text-xs text-muted-foreground">{feature.description || 'No description'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch id={`feature-toggle-${feature.id}`} checked={feature.active} onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked)} />
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title={`Delete ${feature.name}`} disabled={initialFeatures.some(f => f.id === feature.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete Feature "{feature.name}"?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the feature from the master list. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteFeature(feature.id, feature.name)} className={buttonVariants({ variant: "destructive" })}>Delete Feature</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                          </div>
                        ))
                    }
                </div>
              </div>
          </CardContent>
      </Card>
      
      <PlanEditDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSavePlan}
        planToEdit={editingPlan}
      />
    </div>
  );
}

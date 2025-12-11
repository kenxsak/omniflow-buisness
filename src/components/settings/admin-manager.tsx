
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllAdminsAndCompanies, updateCompanyPlanExpiry, updateCompanyStatus, deleteCompanyAndUsers, updateCompanyPlan, updateCompanyBillingCycle } from '@/lib/saas-data';
import type { AppUser, Company, Plan } from '@/types/saas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { getStoredPlans } from '@/lib/saas-data';
import { format, addMonths, addYears, endOfMonth, isWithinInterval, isBefore, differenceInDays } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, LogIn, Mail, Phone, MessageCircle, Calendar as CalendarIcon, Trash2, PauseCircle, PlayCircle, Search, Award, Check, CalendarClock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface AdminData {
  admin: AppUser;
  company: Company;
}

export default function AdminManager() {
  const [data, setData] = useState<AdminData[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const { startImpersonation } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'paused', 'expiring'
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false);
  const [selectedCompanyForDate, setSelectedCompanyForDate] = useState<{ id: string; name: string } | null>(null);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  const loadData = useCallback(() => {
    const loadAsync = async () => {
      const adminData = await getAllAdminsAndCompanies();
      setData(adminData);
      const storedPlans = await getStoredPlans();
      setPlans(storedPlans);
    };
    loadAsync();
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'omniFlowSaasUsers' || event.key === 'omniFlowSaasCompanies' || event.key === 'omniFlowSaasPlans') {
            loadData();
        }
    };
    // Note: Firestore live updates would be better here in a real app
  }, [loadData]);
  
  const filteredData = useMemo(() => {
    const now = new Date();
    const endOfThisMonth = endOfMonth(now);
    return data
      .filter(item => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'active') return item.company.status === 'active';
        if (filterStatus === 'paused') return item.company.status === 'paused';
        if (filterStatus === 'expiring') {
          return item.company.planExpiresAt && isWithinInterval(new Date(item.company.planExpiresAt), { start: now, end: endOfThisMonth });
        }
        return true;
      })
      .filter(item => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        return (
          item.admin.email.toLowerCase().includes(term) ||
          item.company.name.toLowerCase().includes(term)
        );
      });
  }, [data, searchTerm, filterStatus]);

  const getPlanName = (planId: string) => plans.find(p => p.id === planId)?.name || 'N/A';

  const handleImpersonate = (user: AppUser) => {
    startImpersonation(user);
    toast({ title: `Impersonating ${user.email}`, description: 'Redirecting to dashboard...' });
    router.push('/dashboard');
  };
  
  const handleExtend = async (companyId: string, duration: { months?: number; years?: number }) => {
    const companyToUpdate = data.find(d => d.company.id === companyId)?.company;
    if (!companyToUpdate) return;

    let currentExpiry = new Date(companyToUpdate.planExpiresAt);
    // If plan has expired, extend from today, otherwise from the expiry date
    if (isBefore(currentExpiry, new Date())) {
        currentExpiry = new Date();
    }
    
    let newExpiryDate: Date;

    if (duration.months) {
        newExpiryDate = addMonths(currentExpiry, duration.months);
    } else if (duration.years) {
        newExpiryDate = addYears(currentExpiry, duration.years);
    } else {
        return;
    }
    
    await updateCompanyPlanExpiry(companyId, newExpiryDate);
    toast({ title: "Subscription Extended", description: `Plan for ${companyToUpdate.name} extended.` });
    loadData();
  };

  const handleChangePlan = async (companyId: string, companyName: string, newPlanId: string, newPlanName: string) => {
    await updateCompanyPlan(companyId, newPlanId);
    toast({ title: "Plan Changed", description: `Plan for ${companyName} has been changed to ${newPlanName}.` });
    loadData();
  };

  const handleStatusToggle = async (companyId: string, companyName: string, currentStatus: 'active' | 'paused' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await updateCompanyStatus(companyId, newStatus);
    toast({ title: `Company ${newStatus === 'active' ? 'Activated' : 'Paused'}`, description: `The status for ${companyName} has been updated.` });
    loadData();
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    await deleteCompanyAndUsers(companyId);
    toast({ title: "Company Deleted", description: `The company "${companyName}" and all its users have been removed.`, variant: "destructive" });
    loadData();
  };

  const handleOpenCustomDateDialog = (companyId: string, companyName: string, currentExpiryDate?: string) => {
    setSelectedCompanyForDate({ id: companyId, name: companyName });
    setCustomDate(currentExpiryDate ? new Date(currentExpiryDate) : new Date());
    setCustomDateDialogOpen(true);
  };

  const handleSaveCustomDate = async () => {
    if (!selectedCompanyForDate || !customDate) return;
    
    await updateCompanyPlanExpiry(selectedCompanyForDate.id, customDate);
    toast({ 
      title: "Expiry Date Updated", 
      description: `Plan expiry for ${selectedCompanyForDate.name} set to ${format(customDate, 'PPP')}.` 
    });
    setCustomDateDialogOpen(false);
    setSelectedCompanyForDate(null);
    setCustomDate(undefined);
    loadData();
  };

  const handleChangeBillingCycle = async (companyId: string, companyName: string, newBillingCycle: 'monthly' | 'yearly', planId: string) => {
    const plan = plans.find(p => p.id === planId);
    const discount = plan?.yearlyDiscountPercentage || 0;
    
    try {
      await updateCompanyBillingCycle(companyId, newBillingCycle);
      
      const cycleText = newBillingCycle === 'yearly' 
        ? `Yearly (${discount}% discount)` 
        : 'Monthly';
      
      toast({ 
        title: "Billing Cycle Updated", 
        description: `Billing cycle for ${companyName} changed to ${cycleText}.` 
      });
      loadData();
    } catch (error) {
      toast({ 
        title: "Update Failed", 
        description: `Failed to update billing cycle for ${companyName}.`,
        variant: "destructive"
      });
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin & Company Management</CardTitle>
        <CardDescription>View, filter, and manage all admin users and their company details across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
         <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search Admin or Company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:w-64"
                />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Admin Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead>Plan Expires On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map(({ admin, company }) => {
                        const expiryDate = company.planExpiresAt ? new Date(company.planExpiresAt) : null;
                       let expiryClass = "";
                       if (expiryDate) {
                           if (isBefore(expiryDate, new Date())) {
                               expiryClass = "text-destructive font-semibold";
                           } else if (differenceInDays(expiryDate, new Date()) <= 30) {
                               expiryClass = "text-orange-500 font-semibold";
                           }
                       }
                      return (
                        <TableRow key={admin.uid}>
                            <TableCell className="font-medium">{admin.email}</TableCell>
                            <TableCell>{company.name}</TableCell>
                            <TableCell>{getPlanName(company.planId)}</TableCell>
                            <TableCell className="capitalize">
                              {company.billingCycle}
                              {company.billingCycle === 'yearly' && (() => {
                                const plan = plans.find(p => p.id === company.planId);
                                const discount = plan?.yearlyDiscountPercentage;
                                return discount ? (
                                  <span className="ml-1 text-xs text-green-600 font-semibold">
                                    ({discount}% off)
                                  </span>
                                ) : null;
                              })()}
                            </TableCell>
                            <TableCell>
                                <Badge variant={company.status === 'active' ? 'secondary' : 'destructive'} className={company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                    {company.status}
                                </Badge>
                            </TableCell>
                             <TableCell className={cn(expiryClass)}>
                                {company.planExpiresAt ? format(new Date(company.planExpiresAt), 'PP') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Manage Account</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => handleImpersonate(admin)}>
                                            <LogIn className="mr-2 h-4 w-4" /> Login as Admin
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Account Control</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => handleStatusToggle(company.id, company.name, company.status)}>
                                            {company.status === 'active' ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                            {company.status === 'active' ? 'Pause Account' : 'Activate Account'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                <span>Extend Subscription</span>
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => handleExtend(company.id, { months: 1 })}>Extend 1 Month</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleExtend(company.id, { months: 3 })}>Extend 3 Months</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleExtend(company.id, { years: 1 })}>Extend 1 Year</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => handleOpenCustomDateDialog(company.id, company.name, company.planExpiresAt)}>
                                                    <CalendarClock className="mr-2 h-4 w-4" />
                                                    Set Custom Date
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                                <Award className="mr-2 h-4 w-4" />
                                                <span>Change Plan</span>
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                {plans.map(plan => (
                                                    <DropdownMenuItem
                                                        key={plan.id}
                                                        disabled={company.planId === plan.id}
                                                        onSelect={() => handleChangePlan(company.id, company.name, plan.id, plan.name)}
                                                    >
                                                        {plan.name}
                                                        {company.planId === plan.id && <Check className="ml-auto h-4 w-4" />}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                <span>Billing Cycle</span>
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem
                                                    disabled={company.billingCycle === 'monthly'}
                                                    onSelect={() => handleChangeBillingCycle(company.id, company.name, 'monthly', company.planId)}
                                                >
                                                    Monthly
                                                    {company.billingCycle === 'monthly' && <Check className="ml-auto h-4 w-4" />}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    disabled={company.billingCycle === 'yearly'}
                                                    onSelect={() => handleChangeBillingCycle(company.id, company.name, 'yearly', company.planId)}
                                                >
                                                    Yearly
                                                    {(() => {
                                                        const plan = plans.find(p => p.id === company.planId);
                                                        const discount = plan?.yearlyDiscountPercentage;
                                                        return discount ? (
                                                            <span className="ml-1 text-xs text-green-600">
                                                                ({discount}% off)
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                    {company.billingCycle === 'yearly' && <Check className="ml-auto h-4 w-4" />}
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Company
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the company "{company.name}" and all its users. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteCompany(company.id, company.name)} className={buttonVariants({ variant: "destructive" })}>Delete Company</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Contact Admin</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <a href={`mailto:${admin.email}`}><Mail className="mr-2 h-4 w-4" /> Email Admin</a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild disabled={!admin.phone}>
                                            <a href={`tel:${admin.phone}`}><Phone className="mr-2 h-4 w-4" /> Call Admin</a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild disabled={!admin.phone}>
                                            <a href={`https://wa.me/${admin.phone?.replace(/\\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Admin
                                            </a>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
      </CardContent>

      {/* Custom Date Picker Dialog */}
      <Dialog open={customDateDialogOpen} onOpenChange={setCustomDateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Custom Expiry Date</DialogTitle>
            <DialogDescription>
              Select any date to set as the plan expiration for {selectedCompanyForDate?.name}. 
              You can select past dates for testing or future dates for extending plans.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="single"
              selected={customDate}
              onSelect={setCustomDate}
              className="rounded-md border"
            />
          </div>
          {customDate && (
            <div className="text-sm text-center text-muted-foreground">
              Selected date: <span className="font-semibold">{format(customDate, 'PPP')}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomDate} disabled={!customDate}>
              Save Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

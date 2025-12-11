
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAllAdminsAndCompanies } from '@/lib/saas-data';
import type { AppUser, Company, Plan } from '@/types/saas';
import PageTitle from '@/components/ui/page-title';
import StatCard from '@/components/dashboard/stat-card';
import { Users, UserX, Clock, DollarSign, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AdminManager from '@/components/settings/admin-manager'; // Import the consolidated component
import { getStoredPlans } from '@/lib/saas-data';
import { endOfMonth, isWithinInterval } from 'date-fns';
import { convertCurrency } from '@/lib/currency-converter';

interface AdminData {
  admin: AppUser;
  company: Company;
}

const formatAsUSD = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatAsINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export default function SuperAdminDashboard() {
  const [data, setData] = useState<AdminData[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mrrINR, setMrrINR] = useState<number>(0);
  const { isSuperAdmin } = useAuth(); // Get the user's role
  
  const loadData = useCallback(() => {
    // Only load data if the user is a superadmin
    if (isSuperAdmin) {
        getAllAdminsAndCompanies().then(adminData => {
            setData(adminData);
        });
        getStoredPlans().then(storedPlans => {
            setPlans(storedPlans);
        });
    }
  }, [isSuperAdmin]); // Depend on the user's role status

  useEffect(() => {
    loadData();
    
    // Add event listener to reload data when other tabs make changes
     const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'omniFlowSaasUsers' || event.key === 'omniFlowSaasCompanies' || event.key === 'omniFlowSaasPlans') {
            loadData();
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };

  }, [loadData]);
  
  const now = new Date();
  const endOfThisMonth = endOfMonth(now);
  const expiringThisMonth = data.filter(({ company }) => 
    company.planExpiresAt && company.status === 'active' && isWithinInterval(new Date(company.planExpiresAt), { start: now, end: endOfThisMonth })
  ).length;
  const inactiveAdmins = data.filter(d => d.company.status === 'paused').length;
  const totalAdmins = data.length;

  const mrrUSD = useMemo(() => {
    let usdTotal = 0;
    data.forEach(({ company }) => {
      if (company.status === 'active') {
        const plan = plans.find(p => p.id === company.planId);
        if (plan) {
          usdTotal += plan.priceMonthlyUSD;
        }
      }
    });
    return usdTotal;
  }, [data, plans]);

  useEffect(() => {
    convertCurrency(mrrUSD, 'INR').then(converted => {
      setMrrINR(converted);
    });
  }, [mrrUSD]);

  // If the user is not a super admin, don't render this component.
  // The main dashboard will be shown instead.
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Super Admin Dashboard" description="Monitor and manage all companies on the platform." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Admins / Companies" value={totalAdmins.toString()} icon={Users} change="" />
        <StatCard title="MRR (USD)" value={formatAsUSD(mrrUSD)} icon={DollarSign} change="All Active Plans" />
        <StatCard title="MRR (INR)" value={formatAsINR(mrrINR)} icon={IndianRupee} change="All Active Plans" />
        <StatCard title="Plans Expiring This Month" value={expiringThisMonth.toString()} icon={Clock} change="" negativeChange={expiringThisMonth > 0} />
        <StatCard title="Paused Accounts" value={inactiveAdmins.toString()} icon={UserX} change="" />
      </div>

      {/* Use the single, consistent AdminManager component here */}
      <AdminManager />

    </div>
  );
}

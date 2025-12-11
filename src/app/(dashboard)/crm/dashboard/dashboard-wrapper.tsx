'use client';

import React, { useState, useEffect } from 'react';
import { DashboardClient } from './dashboard-client';
import { getCrmDashboardData } from '@/app/actions/dashboard-actions';
import type { CrmDashboardData } from '@/app/actions/dashboard-actions';
import { Loader2, AlertCircle } from 'lucide-react';

export function DashboardWrapper() {
  const [data, setData] = useState<CrmDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const dashboardData = await getCrmDashboardData();
        
        if (!dashboardData) {
          setError('Please log in to view your dashboard.');
          return;
        }
        
        setData(dashboardData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">No dashboard data available</p>
      </div>
    );
  }

  return (
    <DashboardClient
      stats={data.stats}
      statusDistribution={data.statusDistribution}
      planMetadata={data.planMetadata}
      dealStats={data.dealStats}
      weightedPipeline={data.weightedPipeline}
      recentActivities={data.recentActivities}
      userRole={data.userRole}
      teamMembers={data.teamMembers}
      leads={data.leads}
    />
  );
}

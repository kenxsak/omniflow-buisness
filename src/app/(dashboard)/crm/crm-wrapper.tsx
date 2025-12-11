'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, LayoutGrid, BarChart3, Database, TrendingUp, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import PageTitle from '@/components/ui/page-title';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';
import { CsvImportCard } from '@/components/crm/csv-import-card';
import { getCrmStats } from '@/app/actions/crm-stats-actions';
import type { LeadStats } from '@/lib/crm/lead-data';

interface CrmWrapperProps {
  companyId: string;
}

export function CrmWrapper({ companyId }: CrmWrapperProps) {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getCrmStats(companyId);
        if (data) {
          setStats(data);
        } else {
          setError('Failed to load stats');
        }
      } catch (err) {
        console.error('Error loading CRM stats:', err);
        setError('Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [companyId]);

  const statsLoading = isLoading;
  const displayStats = stats || {
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    qualifiedLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    brevoSyncedCount: 0,
    hubspotSyncedCount: 0,
    unsyncedCount: 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle title="My Contacts" description="People interested in your business and your sales progress" />
      </div>

      <CsvImportCard companyId={companyId} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.totalLeads.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Everyone in your contact list</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Contacts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.newLeads.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting first contact</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Synced Contacts</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (displayStats.brevoSyncedCount + displayStats.hubspotSyncedCount).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Connected to other apps</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Contact Table</CardTitle>
            </div>
            <CardDescription>View and manage all your contacts in a detailed table format</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Search, filter, and update many contacts at once. Download to Excel and connect with other apps.
            </p>
            <Button asChild className="w-full">
              <Link href="/crm/leads">Open Table View</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <CardTitle>Sales Pipeline</CardTitle>
            </div>
            <CardDescription>Visualize your sales process with a Kanban board</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop contacts between stages. Get a clear overview of your sales funnel from New to Won.
            </p>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/crm/pipeline">Open Pipeline View</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Analytics Dashboard</CardTitle>
            </div>
            <CardDescription>View insights and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              See how your contacts are distributed, conversion rates, and track your performance over time.
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/crm/dashboard">View Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Overview of your contacts by status</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-blue-600">{displayStats.newLeads}</span>
                <span className="text-sm text-muted-foreground">New</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-yellow-600">{displayStats.contactedLeads}</span>
                <span className="text-sm text-muted-foreground">Contacted</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-green-600">{displayStats.qualifiedLeads}</span>
                <span className="text-sm text-muted-foreground">Qualified</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-purple-600">{displayStats.wonLeads}</span>
                <span className="text-sm text-muted-foreground">Won</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-red-600">{displayStats.lostLeads}</span>
                <span className="text-sm text-muted-foreground">Lost</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ContextualHelpButton pageId="crm" />
    </div>
  );
}

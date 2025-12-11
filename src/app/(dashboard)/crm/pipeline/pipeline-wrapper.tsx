'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Lead } from '@/lib/mock-data';
import { getPipelineData } from '@/app/actions/pipeline-actions';

export function PipelineWrapper() {
  const router = useRouter();
  const [leadsByStatus, setLeadsByStatus] = useState<Record<Lead['status'], Lead[]> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLeadClick = (leadId: string) => {
    router.push(`/crm/leads/${leadId}`);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getPipelineData();
        
        if (!data) {
          setError('Please log in to view your pipeline.');
          return;
        }
        
        setLeadsByStatus(data);
      } catch (err) {
        console.error('Error loading pipeline data:', err);
        setError('Failed to load pipeline data. Please try again.');
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

  if (!leadsByStatus) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">No pipeline data available</p>
      </div>
    );
  }

  const statuses: Array<Lead['status']> = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];

  return (
    <div className="space-y-6">
      <PageTitle title="Pipeline" description="Visualize your sales pipeline" />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statuses.map(status => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{status}</CardTitle>
              <div className="text-2xl font-bold">{leadsByStatus[status].length}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leadsByStatus[status].slice(0, 3).map(lead => (
                  <div 
                    key={lead.id} 
                    onClick={() => handleLeadClick(lead.id)}
                    className="text-sm border-l-2 border-primary pl-2 cursor-pointer hover:bg-accent hover:text-accent-foreground p-2 rounded transition-colors"
                  >
                    <div className="font-medium truncate">{lead.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
                  </div>
                ))}
                {leadsByStatus[status].length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{leadsByStatus[status].length - 3} more
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

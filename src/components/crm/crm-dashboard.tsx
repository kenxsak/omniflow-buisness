

"use client";

import React from 'react';
import type { Lead } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import StatCard from '@/components/dashboard/stat-card';
import { Users, UserCheck, Handshake, Loader2 } from 'lucide-react';
import LeadStatusChart from './lead-status-chart';

interface CrmDashboardProps {
  leads: Lead[];
  isLoading?: boolean;
  title?: string;
}

const CrmDashboard: React.FC<CrmDashboardProps> = ({ leads, isLoading, title = "CRM Dashboard" }) => {
  const totalLeads = leads.length;
  const newLeads = leads.filter(lead => lead.status === 'New').length;
  const qualifiedLeads = leads.filter(lead => lead.status === 'Qualified').length;
  const wonLeads = leads.filter(lead => lead.status === 'Won').length;

  const leadStatusData = leads.reduce((acc, lead) => {
    const status = lead.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<Lead['status'], number>);

  const chartData = Object.entries(leadStatusData).map(([status, count]) => ({
    status: status as Lead['status'], // Cast status back to the specific enum type
    count,
    // Fill color is dynamically assigned in LeadStatusChart based on config
  }));


  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Overview of your currently filtered contacts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Displayed Contacts" value={totalLeads.toLocaleString()} icon={Users} change="" />
              <StatCard title="New Contacts" value={newLeads.toLocaleString()} icon={Users} change="" />
              <StatCard title="Qualified Contacts" value={qualifiedLeads.toLocaleString()} icon={UserCheck} change="" />
              <StatCard title="Contacts Won" value={wonLeads.toLocaleString()} icon={Handshake} change="" />
            </div>
             <div className="grid gap-6 pt-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Status Distribution</CardTitle>
                        <CardDescription>Number of contacts in each status category.</CardDescription>
                    </CardHeader>
                     <CardContent className="h-[250px]">
                        {chartData.length > 0 ? (
                             <LeadStatusChart data={chartData} />
                        ) : (
                             <p className="text-muted-foreground text-center pt-10">No contact data available for chart.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Recent Contacts</CardTitle>
                        <CardDescription>A quick look at the newest contacts in this view.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {leads.length > 0 ? (
                            <ul className="space-y-3">
                                {leads.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map(lead => (
                                <li key={lead.id} className="flex items-center justify-between text-sm">
                                    <div>
                                        <p>{lead.name}</p>
                                        <p className="text-xs text-muted-foreground">{lead.assignedTo || 'Unassigned'}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</span>
                                </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-center">No recent contacts found.</p>
                        )}
                    </CardContent>
                 </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CrmDashboard;

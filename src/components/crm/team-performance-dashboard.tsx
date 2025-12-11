"use client";

import React from 'react';
import type { Lead } from '@/lib/mock-data';
import type { AppUser } from '@/types/saas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TeamPerformanceDashboardProps {
  leads: Lead[];
  teamMembers: AppUser[];
}

interface RepMetrics {
  userId: string;
  userName: string;
  userEmail: string;
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
}

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function TeamPerformanceDashboard({ leads, teamMembers }: TeamPerformanceDashboardProps) {
  const repMetrics: RepMetrics[] = teamMembers.map((member) => {
    const repLeads = leads.filter(lead => lead.assignedTo === member.uid || lead.assignedTo === member.email);
    const wonCount = repLeads.filter(l => l.status === 'Won').length;
    const lostCount = repLeads.filter(l => l.status === 'Lost').length;
    const totalClosed = wonCount + lostCount;
    
    return {
      userId: member.uid,
      userName: member.name || member.email?.split('@')[0] || 'Unknown',
      userEmail: member.email || '',
      totalLeads: repLeads.length,
      newLeads: repLeads.filter(l => l.status === 'New').length,
      contactedLeads: repLeads.filter(l => l.status === 'Contacted').length,
      qualifiedLeads: repLeads.filter(l => l.status === 'Qualified').length,
      wonLeads: wonCount,
      lostLeads: lostCount,
      conversionRate: totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0,
    };
  });

  const sortedMetrics = [...repMetrics].sort((a, b) => b.totalLeads - a.totalLeads);
  
  const teamMemberIds = teamMembers.map(m => m.uid);
  const teamMemberEmails = teamMembers.map(m => m.email);
  const unassignedLeads = leads.filter(l => 
    !l.assignedTo || 
    l.assignedTo === '_UNASSIGNED_' || 
    (!teamMemberIds.includes(l.assignedTo) && !teamMemberEmails.includes(l.assignedTo))
  ).length;
  
  const totalAssignedLeads = leads.length - unassignedLeads;
  const avgLeadsPerRep = teamMembers.length > 0 ? Math.round(totalAssignedLeads / teamMembers.length) : 0;
  
  const chartData = sortedMetrics.map(m => ({
    name: m.userName.length > 10 ? m.userName.substring(0, 10) + '...' : m.userName,
    leads: m.totalLeads,
    won: m.wonLeads,
  }));

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgLeadsPerRep}</p>
                <p className="text-sm text-muted-foreground">Avg Leads/Rep</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'Won').length}</p>
                <p className="text-sm text-muted-foreground">Total Won</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unassignedLeads}</p>
                <p className="text-sm text-muted-foreground">Unassigned Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Distribution</CardTitle>
            <CardDescription>Leads assigned per team member</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="leads" name="Total Leads" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No team data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Leaderboard</CardTitle>
            <CardDescription>Performance by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedMetrics.slice(0, 5).map((rep, index) => (
                <div key={rep.userId} className="flex items-center gap-4">
                  <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback style={{ backgroundColor: COLORS[index % COLORS.length] + '30', color: COLORS[index % COLORS.length] }}>
                      {getInitials(rep.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{rep.userName}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{rep.totalLeads} leads</span>
                      <span>|</span>
                      <span className="text-green-600">{rep.wonLeads} won</span>
                      {rep.conversionRate > 0 && (
                        <>
                          <span>|</span>
                          <span>{rep.conversionRate}% conv.</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={rep.totalLeads > avgLeadsPerRep ? 'default' : 'secondary'}>
                    {rep.totalLeads > avgLeadsPerRep ? 'High' : 'Normal'}
                  </Badge>
                </div>
              ))}
              {sortedMetrics.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No team members found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Performance Details</CardTitle>
          <CardDescription>Detailed breakdown by status for each team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Team Member</th>
                  <th className="text-center py-3 px-2">Total</th>
                  <th className="text-center py-3 px-2">New</th>
                  <th className="text-center py-3 px-2">Contacted</th>
                  <th className="text-center py-3 px-2">Qualified</th>
                  <th className="text-center py-3 px-2">Won</th>
                  <th className="text-center py-3 px-2">Lost</th>
                  <th className="text-center py-3 px-2">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map((rep) => (
                  <tr key={rep.userId} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(rep.userName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{rep.userName}</p>
                          <p className="text-xs text-muted-foreground">{rep.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 font-medium">{rep.totalLeads}</td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{rep.newLeads}</Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{rep.contactedLeads}</Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">{rep.qualifiedLeads}</Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{rep.wonLeads}</Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">{rep.lostLeads}</Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={rep.conversionRate} className="h-2 w-16" />
                        <span className="text-xs">{rep.conversionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedMetrics.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No team members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

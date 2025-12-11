
"use client";

import React, { useState } from 'react';
import type { Lead } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { MoreHorizontal, Eye, Edit2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface LeadCardProps {
    lead: Lead;
    onEdit: (lead: Lead) => void;
    onDelete: (leadId: string) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onEdit, onDelete }) => {
    
    // Helper to safely get a valid Date object or null
    const getValidDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp.toDate) return timestamp.toDate(); // Firestore timestamp
        if (!isNaN(new Date(timestamp).getTime())) return new Date(timestamp); // ISO string or other valid date string
        return null;
    };
    
    const lastContactedDate = getValidDate(lead.lastContacted);

    return (
        <Card className="mb-3 hover:shadow-md transition-shadow">
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-sm">{lead.name}</h4>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Contact Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/crm/leads/${lead.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onEdit(lead)}><Edit2 className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the contact "{lead.name}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(lead.id)} className={buttonVariants({ variant: "destructive" })}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground">{lead.attributes?.COMPANY_NAME || 'No company'}</p>
                 <Badge variant="secondary" className="mt-2 text-xs">{lead.source}</Badge>
                 <div className="text-xs text-muted-foreground mt-2">
                    <p>Assigned to: {lead.assignedTo || 'Unassigned'}</p>
                    <p>Updated: {lastContactedDate ? formatDistanceToNow(lastContactedDate, { addSuffix: true }) : 'N/A'}</p>
                </div>
            </CardContent>
        </Card>
    );
};


interface LeadPipelineViewProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onEditLead: (lead: Lead) => void;
}

export default function LeadPipelineView({ leads, onUpdateLead, onDeleteLead, onEditLead }: LeadPipelineViewProps) {
  const statuses: Lead['status'][] = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {statuses.map(status => {
        const leadsInStatus = leads.filter(lead => lead.status === status);
        return (
          <div key={status}>
            <Card className="bg-muted/50 h-full">
              <CardHeader className="p-4">
                <CardTitle className="text-base font-semibold flex justify-between items-center">
                  <span>{status}</span>
                  <span className="text-sm font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full">{leadsInStatus.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 min-h-[200px]">
                {leadsInStatus.length > 0 ? (
                    leadsInStatus.map(lead => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onEdit={onEditLead}
                            onDelete={onDeleteLead}
                        />
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4 text-center">
                        No contacts in this stage.
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

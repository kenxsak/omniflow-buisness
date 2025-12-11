
"use client";

import React from 'react';
import type { Lead } from '@/lib/mock-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Edit2, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

interface LeadTableProps {
  leads: Lead[];
  onDeleteLead: (leadId: string) => void;
  onUpdateLead: (lead: Lead) => void;
  selectedLeadIds: Set<string>;
  onSelectionChange: (leadId: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
  onSyncComplete: () => void;
  onEditLead: (lead: Lead) => void;
  onScheduleAppointment?: (lead: Lead) => void;
}

const statusColors: Record<Lead['status'], string> = {
  New: 'bg-blue-500 hover:bg-blue-600',
  Contacted: 'bg-yellow-500 hover:bg-yellow-600',
  Qualified: 'bg-green-500 hover:bg-green-600',
  Lost: 'bg-red-500 hover:bg-red-600',
  Won: 'bg-purple-500 hover:bg-purple-600',
};

export default function LeadTable({
  leads,
  onDeleteLead,
  onUpdateLead,
  selectedLeadIds,
  onSelectionChange,
  onSelectAll,
  onSyncComplete,
  onEditLead,
  onScheduleAppointment,
}: LeadTableProps) {
  const { isUser } = useAuth();
  const isAllSelectedOnPage = leads.length > 0 && leads.every(lead => selectedLeadIds.has(lead.id));

  const getValidDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate(); // Firestore timestamp
    if (!isNaN(new Date(timestamp).getTime())) return new Date(timestamp); // ISO string or other valid date string
    return null;
  };

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[800px]">
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] px-4">
                  <Checkbox
                    checked={isAllSelectedOnPage}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                    aria-label="Select all contacts on this page"
                    className="translate-y-[2px]"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                {!isUser && <TableHead className="hidden sm:table-cell">Owner</TableHead>}
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last Contacted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No contacts to display.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  const lastContactedDate = getValidDate(lead.lastContacted);

                  return (
                    <TableRow key={lead.id} data-state={isSelected ? "selected" : undefined}>
                      <TableCell className="px-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => onSelectionChange(lead.id, !!checked)}
                          aria-label={`Select contact ${lead.name}`}
                          className="translate-y-[2px]"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      {!isUser && <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{lead.assignedTo || 'Unassigned'}</TableCell>}
                      <TableCell className="hidden md:table-cell text-muted-foreground">{lead.email}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[lead.status]} text-white`}>{lead.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {lastContactedDate ? format(lastContactedDate, 'PPp') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Contact Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/crm/leads/${lead.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onEditLead(lead)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit Contact
                            </DropdownMenuItem>
                            {onScheduleAppointment && (
                              <DropdownMenuItem onSelect={() => onScheduleAppointment(lead)}>
                                <Calendar className="mr-2 h-4 w-4" /> Schedule Appointment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Contact
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the contact "{lead.name}" from your database.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDeleteLead(lead.id)} className={buttonVariants({ variant: "destructive" })}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </ScrollArea>
  );
}

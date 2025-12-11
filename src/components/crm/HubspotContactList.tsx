
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchHubspotContactsAction, importHubspotContactsAction, type FetchHubspotContactsActionResponse } from '@/actions/hubspot-actions';
import type { HubspotContact } from '@/types/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, UserCircle, ExternalLink, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { logActivity } from '@/lib/activity-log';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getStoredLeads, addStoredLead } from '@/lib/mock-data';


export default function HubspotContactList() {
  const [contacts, setContacts] = useState<HubspotContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage, setContactsPerPage] = useState(10);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => setRefreshTrigger(c => c + 1), []);

  const loadData = useCallback(async (afterToken?: string) => {
    if (!appUser || !company) {
      if (!company && appUser) {
        setError("Could not load company data. API keys are unavailable.");
        setIsLoading(false);
      }
      return;
    }

    const isInitialLoad = !afterToken;
    if (isInitialLoad) setIsLoading(true); else setIsLoading(true);
    setError(null);
    if (isInitialLoad) setContacts([]);

    const apiKey = company.apiKeys?.hubspot?.apiKey;

    if (!apiKey) {
      setError("HubSpot API Key not configured. Please add it in the Settings page.");
      setIsLoading(false);
      return;
    }

    try {
      const result: FetchHubspotContactsActionResponse = await fetchHubspotContactsAction(apiKey, 50, afterToken);
      if (result.success && result.contacts) {
        setContacts(prev => afterToken ? [...prev, ...result.contacts!] : result.contacts!);
        setNextPageToken(result.nextPageToken);
        if (isInitialLoad) setCurrentPage(1);
      } else {
        setError(result.error || 'Failed to load contacts from HubSpot.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [appUser, company]);

  useEffect(() => {
    loadData();
  }, [refreshTrigger, loadData]);

  const handleImportSelected = async () => {
    if (selectedContactIds.size === 0 || !appUser?.companyId) {
      toast({ title: 'No Contacts Selected or Missing Company ID', variant: 'destructive' });
      return;
    }
    setIsImporting(true);
    const contactsToImport = contacts.filter(c => selectedContactIds.has(c.id));
    
    try {
        const existingLeads = await getStoredLeads(appUser.companyId);
        const existingLeadEmails = existingLeads.map(lead => lead.email);
        
        const result = await importHubspotContactsAction(contactsToImport, existingLeadEmails, appUser.companyId);
        if (result.success) {
            for (const newLead of result.newLeadsToStore) {
              await addStoredLead(appUser.companyId, {
                name: newLead.name,
                email: newLead.email,
                phone: newLead.phone,
                status: newLead.status,
                source: newLead.source,
                assignedTo: newLead.assignedTo,
                notes: newLead.notes,
                hubspotSyncStatus: newLead.hubspotSyncStatus,
                hubspotContactId: newLead.hubspotContactId,
                brevoSyncStatus: newLead.brevoSyncStatus,
                attributes: newLead.attributes,
              });
            }
            
            if(result.newLeadsToStore.length > 0) {
              await logActivity({ companyId: appUser.companyId, description: `Imported ${result.newLeadsToStore.length} contact(s) from HubSpot.`, type: 'crm' });
            }
            toast({
              title: 'Import Complete',
              description: `${result.newLeadsToStore.length} contacts imported. ${result.skippedCount} skipped (already exist or missing email).`,
            });
            setSelectedContactIds(new Set());
        } else {
            toast({ title: 'Import Failed', description: result.error || 'An unexpected error occurred.', variant: 'destructive' });
        }
    } catch (err: any) {
        toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
    } finally {
        setIsImporting(false);
        window.dispatchEvent(new StorageEvent('storage', { key: 'omniFlowLeads' }));
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return contacts.filter(contact =>
      Object.values(contact.properties).some(val => String(val).toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [contacts, searchTerm]);

  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContactsToDisplay = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);
  const isAllSelectedOnPage = currentContactsToDisplay.length > 0 && currentContactsToDisplay.every(c => selectedContactIds.has(c.id));

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) setCurrentPage(pageNumber);
  };
  const handleContactsPerPageChange = (value: string) => {
    setContactsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };

  const handleSelectionChange = (contactId: string, isSelected: boolean) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(contactId); else newSet.delete(contactId);
      return newSet;
    });
  };

  const handleSelectAllOnPage = (isSelected: boolean) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      currentContactsToDisplay.forEach(c => {
        if (isSelected) newSet.add(c.id); else newSet.delete(c.id);
      });
      return newSet;
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div><CardTitle>HubSpot Contacts</CardTitle><CardDescription>Migrate your HubSpot contacts into OmniFlow (one-time import)</CardDescription></div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search loaded contacts..." className="pl-8 w-full" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} /></div>
            <Button onClick={handleImportSelected} disabled={isImporting || selectedContactIds.size === 0}>{isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Import ({selectedContactIds.size})</Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && contacts.length === 0 ? <div className="h-32 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading HubSpot contacts...</p></div> :
        error ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitleComponent>Could Not Load HubSpot Contacts</AlertTitleComponent><AlertDescription>{error}<p className="mt-2 text-xs">Please go to <Link href="/settings?tab=integrations" className="underline font-semibold">Settings &gt; API Keys</Link> to add or verify your HubSpot Private App Access Token.</p></AlertDescription></Alert> :
        !isLoading && contacts.length === 0 ? <p className="text-muted-foreground text-center py-8">No contacts found in HubSpot.</p> :
        currentContactsToDisplay.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="w-[50px] px-4"><Checkbox checked={isAllSelectedOnPage} onCheckedChange={(checked) => handleSelectAllOnPage(!!checked)} /></TableHead><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead>Lifecycle Stage</TableHead><TableHead className="hidden lg:table-cell">Last Modified</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {currentContactsToDisplay.map((contact) => (
                    <TableRow key={contact.id} data-state={selectedContactIds.has(contact.id) ? "selected" : undefined}>
                      <TableCell className="px-4"><Checkbox checked={selectedContactIds.has(contact.id)} onCheckedChange={(checked) => handleSelectionChange(contact.id, !!checked)} /></TableCell>
                      <TableCell className="font-medium"><div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" /><span className="truncate">{`${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`}</span></div></TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs truncate">{contact.properties.email || 'N/A'}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{contact.properties.lifecyclestage?.replace(/([A-Z])/g, ' $1').trim() || 'Unknown'}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{contact.properties.lastmodifieddate ? format(new Date(contact.properties.lastmodifieddate), 'PPp') : 'N/A'}</TableCell>
                      <TableCell className="text-right">{company?.apiKeys?.hubspot?.portalId ? <Button variant="ghost" size="sm" asChild><a href={`https://app.hubspot.com/contacts/${company.apiKeys.hubspot.portalId}/contact/${contact.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button> : <Button variant="ghost" size="sm" disabled><ExternalLink className="h-4 w-4 opacity-50" /></Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>Rows:</span><Select value={contactsPerPage.toString()} onValueChange={handleContactsPerPageChange}><SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger><SelectContent>{[10, 25, 50].map(val => <SelectItem key={val} value={val.toString()}>{val}</SelectItem>)}</SelectContent></Select></div>
                <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
                <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button><Button variant="outline" size="sm" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>Next <ChevronRight className="h-4 w-4" /></Button></div>
              </div>
            )}
            {nextPageToken && <div className="mt-4 text-center"><Button variant="outline" onClick={() => loadData(nextPageToken)} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Load More</Button></div>}
          </>
        ) : <p className="text-muted-foreground text-center py-8">No contacts match your search.</p>}
      </CardContent>
    </Card>
  );
}

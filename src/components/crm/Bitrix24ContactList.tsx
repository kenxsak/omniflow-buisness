
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchBitrix24ContactsAction, type FetchBitrix24ContactsActionResponse } from '@/actions/bitrix24-actions';
import type { Bitrix24Contact } from '@/types/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, AlertTriangle, UserCircle, ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export default function Bitrix24ContactList() {
  const [contacts, setContacts] = useState<Bitrix24Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageOffset, setNextPageOffset] = useState<number | undefined>(undefined);
  const [totalContactsFromApi, setTotalContactsFromApi] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage, setContactsPerPage] = useState(10);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { appUser, company } = useAuth();
  
  const handleRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  useEffect(() => {
    // This effect now correctly handles the loading sequence for company data.
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        
        // Ensure company context is loaded before proceeding
        if (!company || !company.apiKeys) {
            // If company data isn't loaded yet, we can't fetch keys.
            // Check if there's a user but no company to show a specific error.
            if (appUser && !company) {
                setError("Could not load company data. API keys are unavailable.");
            }
            // If there's no user at all, it's not an error, just wait.
            setIsLoading(false);
            return;
        }

        const url = company.apiKeys?.bitrix24?.webhookUrl || null;

        if (url === null) {
          setError("Bitrix24 Webhook URL not configured. Please add it in the Settings page.");
          setIsLoading(false);
          setContacts([]);
          return;
        }
        
        try {
            const result: FetchBitrix24ContactsActionResponse = await fetchBitrix24ContactsAction(url, 50, 0); // initial fetch
            if (result.success && result.contacts) {
                setContacts(result.contacts);
                setNextPageOffset(result.next);
                setTotalContactsFromApi(result.total);
                setError(null);
            } else {
                const errorMessage = result.error || 'Failed to load contacts from Bitrix24.';
                setError(errorMessage);
                setContacts([]);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Only trigger fetch if we have a user, otherwise AuthContext will re-render this component when user logs in.
    if(appUser) {
        fetchData();
    } else {
        // If there's no user, we are not loading.
        setIsLoading(false);
    }
  }, [refreshTrigger, appUser, company]);

  const handleLoadMore = async () => {
    const webhookUrl = company?.apiKeys?.bitrix24?.webhookUrl;
    if (nextPageOffset !== undefined && nextPageOffset > 0 && !isLoading && webhookUrl) {
      setIsLoading(true);
      try {
          const result: FetchBitrix24ContactsActionResponse = await fetchBitrix24ContactsAction(webhookUrl, 50, nextPageOffset);
          if (result.success && result.contacts) {
              setContacts(prev => [...prev, ...result.contacts!]);
              setNextPageOffset(result.next);
          } else {
              setError(result.error || 'Failed to load more contacts.');
          }
      } catch (err: any) {
          setError(err.message || 'An unexpected error occurred.');
      } finally {
          setIsLoading(false);
      }
    }
  };

  const formatFieldValue = (fieldValue: any[] | undefined): string => {
    if (!fieldValue || fieldValue.length === 0) return 'N/A';
    return fieldValue[0]?.VALUE || 'N/A';
  };

  const getWebhookBaseUrl = () => {
    const webhookUrl = company?.apiKeys?.bitrix24?.webhookUrl;
    if (webhookUrl && webhookUrl.includes('/rest/')) {
      return webhookUrl.split('/rest/')[0];
    }
    return null;
  }
  const webhookBaseUrl = getWebhookBaseUrl();

  const filteredContacts = useMemo(() => {
    if (!searchTerm) {
      return contacts;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return contacts.filter(contact =>
      (contact.NAME?.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (contact.LAST_NAME?.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (contact.EMAIL?.some(e => e.VALUE.toLowerCase().includes(lowerCaseSearchTerm))) ||
      (contact.PHONE?.some(p => p.VALUE.includes(searchTerm)))
    );
  }, [contacts, searchTerm]);

  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContactsToDisplay = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleContactsPerPageChange = (value: string) => {
    setContactsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Bitrix24 Contacts</CardTitle>
            <CardDescription>Migrate your Bitrix24 contacts into OmniFlow (one-time import)</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search loaded contacts..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && contacts.length === 0 && (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading Bitrix24 contacts...</p>
          </div>
        )}
        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitleComponent>Could Not Load Bitrix24 Contacts</AlertTitleComponent>
            <AlertDescription>
              {error}
              <p className="mt-2 text-xs">
                Please go to <Link href="/settings?tab=integrations" className="underline font-semibold">Settings &gt; API Keys</Link> to add your Bitrix24 Inbound Webhook URL.
              </p>
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && contacts.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No contacts found in Bitrix24. If this is unexpected, check your Webhook URL in Settings.</p>
        )}
        {contacts.length > 0 && filteredContacts.length === 0 && !isLoading && (
          <p className="text-muted-foreground text-center py-8">No Bitrix24 contacts found matching your search criteria from the currently loaded set.</p>
        )}
        {currentContactsToDisplay.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentContactsToDisplay.map((contact) => (
                    <TableRow key={contact.ID}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate" title={`${contact.NAME || ''} ${contact.LAST_NAME || ''}`}>
                            {contact.NAME || ''} {contact.LAST_NAME || ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs truncate" title={formatFieldValue(contact.EMAIL)}>
                        {formatFieldValue(contact.EMAIL)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {formatFieldValue(contact.PHONE)}
                      </TableCell>
                      <TableCell className="text-right">
                        {webhookBaseUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`${webhookBaseUrl}/crm/contact/details/${contact.ID}/`} target="_blank" rel="noopener noreferrer" title="View in Bitrix24">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={contactsPerPage.toString()} onValueChange={handleContactsPerPageChange}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map(val => <SelectItem key={val} value={val.toString()}>{val}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {totalPages > 0 && <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} (displaying {currentContactsToDisplay.length} of {filteredContacts.length} loaded contacts)
              </div>}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages === 0}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {nextPageOffset !== undefined && nextPageOffset > 0 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Load More from Bitrix24 ({totalContactsFromApi ? `Total: ${totalContactsFromApi}` : ''})
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

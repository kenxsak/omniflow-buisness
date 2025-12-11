
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { fetchZohoContactsAction, type FetchZohoContactsActionResponse } from '@/actions/zoho-actions';
import type { ZohoContact } from '@/types/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, AlertTriangle, UserCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export default function ZohoContactList() {
    const [contacts, setContacts] = useState<ZohoContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { appUser, company } = useAuth();
    
    const handleRefresh = useCallback(() => setRefreshTrigger(c => c + 1), []);

    useEffect(() => {
       // This effect now correctly handles the loading sequence for company data.
       const fetchData = async () => {
           setIsLoading(true);
           setError(null);

           // Ensure company context is loaded before proceeding
           if (!company || !company.apiKeys) {
               if (appUser && !company) {
                   setError("Could not load company data. API keys are unavailable.");
               }
               setIsLoading(false);
               return;
           }

           const zohoKeys = company.apiKeys?.zoho;
           const accessToken = zohoKeys?.refreshToken; // Using refresh token as placeholder for access token in this demo
           const apiDomain = zohoKeys?.domain;
           
           if (!accessToken || !apiDomain) {
                setError("Zoho API credentials (Access Token/Refresh Token and Domain) not configured. Please add them in Settings. Full OAuth flow is not implemented in this demo.");
                setIsLoading(false);
                setContacts([]);
                return;
           }

            try {
               const result: FetchZohoContactsActionResponse = await fetchZohoContactsAction(accessToken, apiDomain, 20);
               if (result.success && result.contacts) {
                   setContacts(result.contacts);
               } else {
                   setError(result.error || 'Failed to load contacts from Zoho CRM.');
                   setContacts([]);
               }
           } catch (err: any) {
               setError(err.message || 'An unexpected error occurred while fetching Zoho contacts.');
           } finally {
               setIsLoading(false);
           }
       };

       if (appUser) {
           fetchData();
       } else {
           setIsLoading(false);
       }
        
    }, [refreshTrigger, appUser, company]);
    
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Zoho CRM Contacts</CardTitle>
                        <CardDescription>Migrate your Zoho contacts into OmniFlow (one-time import)</CardDescription>
                    </div>
                     <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </CardHeader>
             <CardContent>
                {isLoading && (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Loading Zoho contacts...</p>
                  </div>
                )}
                {error && !isLoading && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitleComponent>Could Not Load Zoho Contacts</AlertTitleComponent>
                    <AlertDescription>
                      {error}
                      <p className="mt-2 text-xs">
                        Please go to <Link href="/settings?tab=integrations" className="underline font-semibold">Settings &gt; API Keys</Link> to add your Zoho credentials. Note that full OAuth 2.0 flow is required for production use and is not implemented in this demo.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
                 {!isLoading && !error && contacts.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No contacts found in Zoho. If this is unexpected, check your credentials in Settings.</p>
                )}
                {contacts.length > 0 && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden md:table-cell">Email</TableHead>
                                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                                    <TableHead className="text-right">Account</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                        <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate" title={`${contact.First_Name || ''} ${contact.Last_Name || ''}`}>
                                            {contact.First_Name || ''} {contact.Last_Name || ''}
                                        </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs truncate" title={contact.Email}>
                                        {contact.Email || 'N/A'}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                                        {contact.Phone || 'N/A'}
                                    </TableCell>
                                     <TableCell className="text-right text-xs text-muted-foreground truncate" title={contact.Account_Name?.name}>
                                        {contact.Account_Name?.name || 'N/A'}
                                    </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

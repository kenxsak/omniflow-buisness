
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, UserCircle, Search, ChevronLeft, ChevronRight, MailWarning, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchBrevoListsAction, fetchBrevoContactsInListAction } from '@/actions/brevo-subscribers';
import type { BrevoContactList, BrevoContactInList } from '@/services/brevo';
import { format } from 'date-fns';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';

export default function SubscribersPage() {
    const [lists, setLists] = useState<BrevoContactList[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>('');
    const [contacts, setContacts] = useState<BrevoContactInList[]>([]);
    const [isLoadingLists, setIsLoadingLists] = useState(true);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const { apiKeys, isLoading: isLoadingKeys } = useCompanyApiKeys();
    
    const brevoApiKey = apiKeys?.brevo?.apiKey || null;
    
    const [currentPage, setCurrentPage] = useState(1);
    const [contactsPerPage, setContactsPerPage] = useState(10);

    const loadLists = useCallback(async () => {
        if (isLoadingKeys) return;
        setIsLoadingLists(true);
        setError(null);

        if (!brevoApiKey) {
            setError("Brevo API Key not configured. Please add it in the Settings page.");
            setIsLoadingLists(false);
            return;
        }

        try {
            const result = await fetchBrevoListsAction(brevoApiKey, 50);
            if (result.success && result.lists) {
                setLists(result.lists);
            } else {
                setError(result.error || 'Failed to load contact lists from Brevo.');
                toast({ title: 'Error Loading Lists', description: result.error, variant: 'destructive' });
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while fetching lists.');
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setIsLoadingLists(false);
        }
    }, [toast, brevoApiKey, isLoadingKeys]);

    useEffect(() => {
        if (!isLoadingKeys) {
            loadLists();
        }
    }, [loadLists, isLoadingKeys]);

    const handleListChange = useCallback(async (listId: string) => {
        if (!listId || !brevoApiKey) {
            setSelectedListId('');
            setContacts([]);
            return;
        }
        setSelectedListId(listId);
        setIsLoadingContacts(true);
        setContacts([]); // Clear previous contacts
        setCurrentPage(1); // Reset page on new list selection
        try {
            const result = await fetchBrevoContactsInListAction(brevoApiKey, parseInt(listId, 10), 100); // Fetch up to 100 contacts for now
            if (result.success && result.contacts) {
                setContacts(result.contacts);
            } else {
                toast({ title: 'Error loading contacts', description: result.error, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setIsLoadingContacts(false);
        }
    }, [toast, brevoApiKey]);

    const filteredContacts = useMemo(() => {
        if (!searchTerm) {
            return contacts;
        }
        return contacts.filter(contact => 
            contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.attributes.FIRSTNAME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.attributes.LASTNAME?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, searchTerm]);

    // Pagination logic
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
        <div className="space-y-6">
            <PageTitle
                title="Manage Subscribers"
                description="View your contact lists and subscribers from Brevo."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Select a Contact List</CardTitle>
                    <CardDescription>Choose a Brevo list to view its subscribers.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-full sm:w-80">
                         <Select onValueChange={handleListChange} disabled={isLoadingLists || !brevoApiKey}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoadingLists ? "Loading lists..." : "Select a list"} />
                            </SelectTrigger>
                            <SelectContent>
                                {lists.map(list => (
                                    <SelectItem key={list.id} value={list.id.toString()}>
                                        {list.name} ({list.totalSubscribers} subscribers)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" onClick={loadLists} disabled={isLoadingLists}>
                        {isLoadingLists ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh Lists
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Subscribers</CardTitle>
                            <CardDescription>
                                {selectedListId ? `Contacts in "${lists.find(l => l.id.toString() === selectedListId)?.name || ''}"` : 'Select a list to see contacts.'}
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search contacts..."
                                className="pl-8 w-full"
                                value={searchTerm}
                                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                                disabled={!selectedListId || isLoadingContacts}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitleComponent>Could Not Load Data from Brevo</AlertTitleComponent>
                            <AlertDescription>
                                {error}
                                <p className="mt-2 text-xs">
                                Please go to <Link href="/settings?tab=integrations" className="underline font-semibold">Settings &gt; API Keys</Link> to add your Brevo API key.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}
                    {isLoadingContacts ? (
                        <div className="h-32 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="hidden md:table-cell">Status</TableHead>
                                            <TableHead className="hidden lg:table-cell">Last Modified</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentContactsToDisplay.length > 0 ? (
                                            currentContactsToDisplay.map(contact => (
                                                <TableRow key={contact.id}>
                                                    <TableCell className="font-medium flex items-center gap-2">
                                                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                                                        {contact.attributes.FIRSTNAME || ''} {contact.attributes.LASTNAME || 'N/A'}
                                                    </TableCell>
                                                    <TableCell>{contact.email}</TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {contact.emailBlacklisted ? (
                                                            <Badge variant="destructive" className="text-xs">
                                                                <MailWarning className="mr-1 h-3 w-3" /> Blacklisted
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/50 dark:text-green-300">
                                                                <UserCheck className="mr-1 h-3 w-3" /> Active
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                                                        {format(new Date(contact.modifiedAt), 'PPp')}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    {selectedListId ? "No contacts found in this list." : "Please select a list to view contacts."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                             {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t mt-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>Rows per page:</span>
                                        <Select value={contactsPerPage.toString()} onValueChange={handleContactsPerPageChange}>
                                            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                            {[10, 25, 50, 100].map(val => <SelectItem key={val} value={val.toString()}>{val}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => paginate(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" /> Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => paginate(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

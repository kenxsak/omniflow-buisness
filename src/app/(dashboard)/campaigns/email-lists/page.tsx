"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlusCircle, Trash2, Users, Mail, Loader2, Eye, Upload, FileDown, Search, UserCircle, MailCheck, MailX, ChevronLeft, ChevronRight, Settings2, Bot, Send, CloudUpload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getEmailLists, addEmailList, deleteEmailList, getEmailContacts, addEmailContact, deleteEmailContact, bulkImportEmailContacts, getListTypeLabel, getListTypeColor } from '@/lib/email-list-data';
import type { EmailList, EmailContact, EmailListType } from '@/types/email-lists';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';
import { fetchBrevoListsAction } from '@/actions/brevo-subscribers';
import { fetchSenderListsAction } from '@/app/actions/sender-actions';
import { syncEmailListToBrevoAction, syncEmailListToSenderAction } from '@/app/actions/sync-email-list-to-provider-action';
import type { BrevoContactList } from '@/services/brevo';
import type { SenderContactList } from '@/lib/sender-client';

export default function EmailListsPage() {
  const { toast } = useToast();
  const { company, appUser } = useAuth();
  const { apiKeys, isLoading: isLoadingKeys } = useCompanyApiKeys();

  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListType, setNewListType] = useState<EmailListType>("custom");
  const [selectedList, setSelectedList] = useState<EmailList | null>(null);
  const [contactsInSelectedList, setContactsInSelectedList] = useState<EmailContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactCompany, setNewContactCompany] = useState("");
  const [isUploadingContacts, setIsUploadingContacts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const contactsPerPage = 10;

  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [syncProvider, setSyncProvider] = useState<'brevo' | 'sender'>('brevo');
  const [syncTargetListId, setSyncTargetListId] = useState<string>('');
  const [createNewProviderList, setCreateNewProviderList] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingProviderLists, setIsLoadingProviderLists] = useState(false);
  const [brevoLists, setBrevoLists] = useState<BrevoContactList[]>([]);
  const [senderLists, setSenderLists] = useState<SenderContactList[]>([]);

  const brevoApiKey = apiKeys?.brevo?.apiKey || '';
  const senderApiKey = apiKeys?.sender?.apiKey || '';

  const loadLists = useCallback(async () => {
    if (!appUser?.companyId) return;
    setIsLoadingLists(true);
    const lists = await getEmailLists(appUser.companyId);
    setEmailLists(lists);
    setIsLoadingLists(false);
  }, [appUser]);

  useEffect(() => {
    if (appUser) {
      loadLists();
    }
  }, [appUser, loadLists]);

  const handleCreateList = async () => {
    if (!newListName.trim() || !appUser?.companyId) {
      toast({ title: "Error", description: "List name cannot be empty.", variant: "destructive" });
      return;
    }
    await addEmailList(newListName, appUser.companyId, newListType, newListDescription);
    await loadLists();
    toast({ title: "List Created", description: `Email list "${newListName}" created successfully.` });
    setNewListName("");
    setNewListDescription("");
    setNewListType("custom");
    setIsCreateListDialogOpen(false);
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (!appUser?.companyId) return;
    await deleteEmailList(listId, appUser.companyId);
    await loadLists();
    if (selectedList?.id === listId) {
      setSelectedList(null);
      setContactsInSelectedList([]);
    }
    toast({ title: "List Deleted", description: `Email list "${listName}" and its contacts have been deleted.` });
  };

  const handleViewContacts = async (list: EmailList) => {
    if (!appUser?.companyId) return;
    setSelectedList(list);
    setIsLoadingContacts(true);
    setCurrentPage(1);
    const contacts = await getEmailContacts(list.id, appUser.companyId);
    setContactsInSelectedList(contacts);
    setIsLoadingContacts(false);
  };

  const handleAddContactToList = async () => {
    if (!selectedList || !newContactName.trim() || !newContactEmail.trim() || !appUser?.companyId) {
      toast({ title: "Error", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    
    try {
      await addEmailContact(
        selectedList.id, 
        appUser.companyId, 
        newContactName, 
        newContactEmail,
        newContactPhone,
        newContactCompany
      );
      await loadLists();
      const contacts = await getEmailContacts(selectedList.id, appUser.companyId);
      setContactsInSelectedList(contacts);
      toast({ title: "Contact Added", description: `Contact "${newContactName}" added to list "${selectedList.name}".` });
      setNewContactName("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewContactCompany("");
      setIsAddContactDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add contact.", variant: "destructive" });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!selectedList || !appUser?.companyId) return;
    await deleteEmailContact(contactId, appUser.companyId);
    await loadLists();
    const contacts = await getEmailContacts(selectedList.id, appUser.companyId);
    setContactsInSelectedList(contacts);
    toast({ title: "Contact Deleted" });
  };

  const handleContactFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedList || !appUser?.companyId) {
      toast({ title: "No List Selected", description: "Please select a list to upload contacts to.", variant: "destructive" });
      if (event.target) event.target.value = '';
      return;
    }
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingContacts(true);
      try {
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        reader.onload = async (e) => {
          const data = e.target?.result;
          if (data) {
            try {
              const workbook = XLSX.read(data, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
              
              const contactsToImport: { name: string; email: string; phone?: string; company?: string }[] = [];
              let invalidCount = 0;
              
              for (const row of jsonData) {
                const name = row['Name'] || row['name'] || row['First Name'] || row['FirstName'];
                const email = row['Email'] || row['email'] || row['EMAIL'] || row['Email Address'];
                const phone = row['Phone'] || row['phone'] || row['Mobile'];
                const company = row['Company'] || row['company'] || row['Organization'];
                
                if (name && email) {
                  contactsToImport.push({ 
                    name: String(name), 
                    email: String(email),
                    phone: phone ? String(phone) : undefined,
                    company: company ? String(company) : undefined
                  });
                } else {
                  invalidCount++;
                }
              }
              
              const result = await bulkImportEmailContacts(selectedList.id, appUser.companyId!, contactsToImport);
              
              await loadLists();
              const contacts = await getEmailContacts(selectedList.id, appUser.companyId!);
              setContactsInSelectedList(contacts);
              
              const totalSkipped = result.skipped + invalidCount;
              toast({ 
                title: "Upload Complete", 
                description: `${result.added} contacts added to "${selectedList.name}". ${totalSkipped} rows skipped (missing data, invalid email, or duplicate).${result.errors.length > 0 ? ` ${result.errors.length} errors occurred.` : ''}` 
              });
            } catch (error) {
              console.error("Error processing Excel/CSV file:", error);
              toast({ title: "Upload Failed", description: "Error processing file. Ensure it's a valid Excel or CSV.", variant: "destructive" });
            }
          }
          setIsUploadingContacts(false);
          if (event.target) event.target.value = '';
        };
        reader.readAsBinaryString(file);
      } catch (xlsxError) {
        console.error("Error loading XLSX library:", xlsxError);
        toast({ title: "Upload Failed", description: "Could not load file processing library. Please try again.", variant: "destructive" });
        setIsUploadingContacts(false);
        if (event.target) event.target.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [{ Name: "John Doe", Email: "john@example.com", Phone: "+919876543210", Company: "Acme Inc" }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Email Contacts Template");
    XLSX.writeFile(workbook, "OmniFlow_Email_Contacts_Template.xlsx");
    toast({ title: "Template Downloaded" });
  };

  const openSyncDialog = (list: EmailList) => {
    setSelectedList(list);
    setIsSyncDialogOpen(true);
    setSyncProvider('brevo');
    setSyncTargetListId('');
    setCreateNewProviderList(true);
  };

  const loadProviderLists = useCallback(async () => {
    if (syncProvider === 'brevo' && brevoApiKey) {
      setIsLoadingProviderLists(true);
      try {
        const result = await fetchBrevoListsAction(brevoApiKey, 50);
        if (result.success && result.lists) {
          setBrevoLists(result.lists);
        }
      } catch (error) {
        console.error('Error loading Brevo lists:', error);
      } finally {
        setIsLoadingProviderLists(false);
      }
    } else if (syncProvider === 'sender' && senderApiKey) {
      setIsLoadingProviderLists(true);
      try {
        const result = await fetchSenderListsAction(senderApiKey, 50);
        if (result.success && result.lists) {
          setSenderLists(result.lists);
        }
      } catch (error) {
        console.error('Error loading Sender.net lists:', error);
      } finally {
        setIsLoadingProviderLists(false);
      }
    }
  }, [syncProvider, brevoApiKey, senderApiKey]);

  useEffect(() => {
    if (isSyncDialogOpen && !createNewProviderList) {
      loadProviderLists();
    }
  }, [isSyncDialogOpen, createNewProviderList, loadProviderLists]);

  const handleSyncToProvider = async () => {
    if (!selectedList || !appUser?.companyId) return;

    setIsSyncing(true);
    try {
      let result;
      if (syncProvider === 'brevo') {
        if (!brevoApiKey) {
          toast({ title: 'Brevo Not Configured', description: 'Please set your Brevo API Key in Settings.', variant: 'destructive' });
          setIsSyncing(false);
          return;
        }
        result = await syncEmailListToBrevoAction(
          selectedList.id,
          appUser.companyId,
          brevoApiKey,
          createNewProviderList ? undefined : parseInt(syncTargetListId, 10),
          createNewProviderList
        );
      } else {
        if (!senderApiKey) {
          toast({ title: 'Sender.net Not Configured', description: 'Please set your Sender.net API Key in Settings.', variant: 'destructive' });
          setIsSyncing(false);
          return;
        }
        if (!createNewProviderList && !syncTargetListId) {
          toast({ title: 'Select Target List', description: 'Please select a target list in Sender.net.', variant: 'destructive' });
          setIsSyncing(false);
          return;
        }
        result = await syncEmailListToSenderAction(
          selectedList.id,
          appUser.companyId,
          senderApiKey,
          createNewProviderList ? undefined : syncTargetListId,
          createNewProviderList
        );
      }

      if (result.success) {
        let description = `${result.syncedCount} contact${result.syncedCount !== 1 ? 's' : ''} synced to ${syncProvider === 'brevo' ? 'Brevo' : 'Sender.net'}.`;
        if (result.providerListName) {
          description += ` New list created: "${result.providerListName}".`;
        }
        if (result.skippedCount > 0) {
          description += ` ${result.skippedCount} skipped.`;
        }
        toast({ title: 'Sync Complete', description });
        setIsSyncDialogOpen(false);
      } else {
        toast({ title: 'Sync Failed', description: result.errorMessage || 'An error occurred.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to sync contacts.', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const getValidDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (!isNaN(new Date(timestamp).getTime())) return new Date(timestamp);
    return null;
  };

  const filteredContacts = contactsInSelectedList.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.company?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle 
          title="Email Lists" 
          description="Create and manage email lists for your marketing campaigns and automations." 
        />
        <Button asChild variant="outline">
          <Link href="/campaigns/email-automations">
            <Bot className="mr-2 h-4 w-4" /> Manage Automations
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle>Your Email Lists</CardTitle>
                <CardDescription>Create lists for different customer segments to send targeted emails.</CardDescription>
              </div>
              <Dialog open={isCreateListDialogOpen} onOpenChange={setIsCreateListDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Create New List</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Email List</DialogTitle>
                    <DialogDescription>Create a list to organize your email contacts by segment.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateList(); }}>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="new-list-name">List Name *</Label>
                        <Input 
                          id="new-list-name" 
                          value={newListName} 
                          onChange={(e) => setNewListName(e.target.value)} 
                          placeholder="e.g., Free Trial Users, VIP Customers" 
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-list-type">List Type</Label>
                        <Select value={newListType} onValueChange={(value) => setNewListType(value as EmailListType)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select list type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free-trial">Free Trial Users</SelectItem>
                            <SelectItem value="paid-customer">Paid Customers</SelectItem>
                            <SelectItem value="churned">Churned/Dead Leads</SelectItem>
                            <SelectItem value="newsletter">Newsletter Subscribers</SelectItem>
                            <SelectItem value="prospects">Prospects</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="new-list-description">Description (Optional)</Label>
                        <Textarea 
                          id="new-list-description" 
                          value={newListDescription} 
                          onChange={(e) => setNewListDescription(e.target.value)} 
                          placeholder="Describe the purpose of this list..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setIsCreateListDialogOpen(false)}>Cancel</Button>
                      <Button type="submit">Create List</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLists ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            ) : emailLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No email lists created yet.</p>
                <p className="text-sm">Create your first list to start organizing contacts.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {emailLists.map(list => (
                  <div 
                    key={list.id} 
                    className={cn(
                      "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md hover:bg-muted/30 gap-2 cursor-pointer transition-colors",
                      selectedList?.id === list.id && "bg-muted/50 border-primary"
                    )}
                    onClick={() => handleViewContacts(list)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{list.name}</p>
                        <Badge className={cn("text-xs", getListTypeColor(list.type))}>
                          {getListTypeLabel(list.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {list.contactCount || 0} contacts | Created: {getValidDate(list.createdAt) ? format(getValidDate(list.createdAt)!, 'PP') : 'N/A'}
                      </p>
                      {list.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{list.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewContacts(list); }}>
                        <Eye className="mr-1 h-4 w-4" />Contacts
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openSyncDialog(list); }} disabled={(list.contactCount || 0) === 0}>
                        <CloudUpload className="mr-1 h-4 w-4" />Sync
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete List "{list.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete the list and all its contacts. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteList(list.id, list.name)} 
                              className={buttonVariants({ variant: "destructive" })}
                            >
                              Delete List
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle>
                  {selectedList ? `Contacts in "${selectedList.name}"` : 'Select a List'}
                </CardTitle>
                <CardDescription>
                  {selectedList 
                    ? `${contactsInSelectedList.length} contacts in this list`
                    : 'Click on a list to view and manage its contacts'
                  }
                </CardDescription>
              </div>
              {selectedList && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                    <FileDown className="mr-2 h-4 w-4" />Template
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => document.getElementById('email-contact-upload-input')?.click()} 
                    disabled={isUploadingContacts}
                  >
                    {isUploadingContacts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload
                  </Button>
                  <input 
                    type="file" 
                    id="email-contact-upload-input" 
                    accept=".csv, .xlsx, .xls" 
                    onChange={handleContactFileUpload} 
                    style={{ display: 'none' }} 
                  />
                  <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Contact to "{selectedList?.name}"</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); handleAddContactToList(); }}>
                        <div className="space-y-3 py-3">
                          <div>
                            <Label htmlFor="contact-name">Name *</Label>
                            <Input 
                              id="contact-name" 
                              value={newContactName} 
                              onChange={(e) => setNewContactName(e.target.value)} 
                              required 
                            />
                          </div>
                          <div>
                            <Label htmlFor="contact-email">Email *</Label>
                            <Input 
                              id="contact-email" 
                              type="email"
                              value={newContactEmail} 
                              onChange={(e) => setNewContactEmail(e.target.value)} 
                              placeholder="email@example.com"
                              required 
                            />
                          </div>
                          <div>
                            <Label htmlFor="contact-phone">Phone (Optional)</Label>
                            <Input 
                              id="contact-phone" 
                              type="tel"
                              value={newContactPhone} 
                              onChange={(e) => setNewContactPhone(e.target.value)} 
                              placeholder="+919876543210"
                            />
                          </div>
                          <div>
                            <Label htmlFor="contact-company">Company (Optional)</Label>
                            <Input 
                              id="contact-company" 
                              value={newContactCompany} 
                              onChange={(e) => setNewContactCompany(e.target.value)} 
                              placeholder="Company name"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" type="button" onClick={() => setIsAddContactDialogOpen(false)}>Cancel</Button>
                          <Button type="submit">Add Contact</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedList ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a list from the left to view contacts</p>
              </div>
            ) : isLoadingContacts ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            ) : (
              <>
                {contactsInSelectedList.length > 0 && (
                  <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search contacts..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                )}
                
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{searchTerm ? 'No contacts match your search.' : 'No contacts in this list yet.'}</p>
                    <p className="text-sm mt-1">Add contacts manually or upload an Excel/CSV file.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="hidden md:table-cell">Status</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentContacts.map(contact => (
                            <TableRow key={contact.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div>
                                    <p>{contact.name}</p>
                                    {contact.company && (
                                      <p className="text-xs text-muted-foreground">{contact.company}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{contact.email}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {contact.status === 'active' ? (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                    <MailCheck className="mr-1 h-3 w-3" /> Active
                                  </Badge>
                                ) : contact.status === 'unsubscribed' ? (
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                    <MailX className="mr-1 h-3 w-3" /> Unsubscribed
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    <MailX className="mr-1 h-3 w-3" /> Bounced
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remove {contact.name} from this list? This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteContact(contact.id)}
                                        className={buttonVariants({ variant: "destructive" })}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5" />
              Sync to Email Provider
            </DialogTitle>
            <DialogDescription>
              Push contacts from "{selectedList?.name}" to your email marketing provider for campaigns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{selectedList?.contactCount || 0} contacts</p>
                <p className="text-xs text-muted-foreground">Will be synced to provider</p>
              </div>
            </div>

            <div>
              <Label htmlFor="sync-provider">Select Provider</Label>
              <Select value={syncProvider} onValueChange={(value) => { 
                setSyncProvider(value as 'brevo' | 'sender'); 
                setSyncTargetListId('');
              }}>
                <SelectTrigger id="sync-provider" className="mt-2">
                  <SelectValue placeholder="Choose provider..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brevo">Brevo</SelectItem>
                  <SelectItem value="sender">Sender.net</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {syncProvider === 'brevo' && !brevoApiKey && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Brevo Not Configured</AlertTitle>
                <AlertDescription>
                  Please set your Brevo API Key in Settings first.
                </AlertDescription>
              </Alert>
            )}

            {syncProvider === 'sender' && !senderApiKey && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Sender.net Not Configured</AlertTitle>
                <AlertDescription>
                  Please set your Sender.net API Key in Settings first.
                </AlertDescription>
              </Alert>
            )}

            {((syncProvider === 'brevo' && brevoApiKey) || (syncProvider === 'sender' && senderApiKey)) && (
              <>
                <div className="space-y-3">
                  <Label>Target List</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant={createNewProviderList ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setCreateNewProviderList(true); setSyncTargetListId(''); }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create New List
                    </Button>
                    <Button
                      type="button"
                      variant={!createNewProviderList ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCreateNewProviderList(false)}
                    >
                      Use Existing List
                    </Button>
                  </div>
                </div>

                {!createNewProviderList && (
                  <div>
                    <Label htmlFor="sync-target-list">Select Existing List</Label>
                    {isLoadingProviderLists ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : syncProvider === 'brevo' ? (
                      brevoLists.length === 0 ? (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>No Lists Found</AlertTitle>
                          <AlertDescription>No lists found in Brevo.</AlertDescription>
                        </Alert>
                      ) : (
                        <Select value={syncTargetListId} onValueChange={setSyncTargetListId}>
                          <SelectTrigger id="sync-target-list" className="mt-2">
                            <SelectValue placeholder="Choose a list..." />
                          </SelectTrigger>
                          <SelectContent>
                            {brevoLists.map((list) => (
                              <SelectItem key={list.id} value={list.id.toString()}>
                                {list.name} ({list.totalSubscribers || 0} subscribers)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    ) : (
                      senderLists.length === 0 ? (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>No Lists Found</AlertTitle>
                          <AlertDescription>No lists found in Sender.net.</AlertDescription>
                        </Alert>
                      ) : (
                        <Select value={syncTargetListId} onValueChange={setSyncTargetListId}>
                          <SelectTrigger id="sync-target-list" className="mt-2">
                            <SelectValue placeholder="Choose a list..." />
                          </SelectTrigger>
                          <SelectContent>
                            {senderLists.map((list) => (
                              <SelectItem key={list.id} value={list.id.toString()}>
                                {list.title} ({list.active || 0} active)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    )}
                  </div>
                )}

                {createNewProviderList && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>New List</AlertTitle>
                    <AlertDescription>
                      A new list will be created in {syncProvider === 'brevo' ? 'Brevo' : 'Sender.net'} with the name "{selectedList?.name}".
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)} disabled={isSyncing}>
              Cancel
            </Button>
            <Button 
              onClick={handleSyncToProvider} 
              disabled={
                isSyncing || 
                (syncProvider === 'brevo' && !brevoApiKey) ||
                (syncProvider === 'sender' && !senderApiKey) ||
                (!createNewProviderList && !syncTargetListId)
              }
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Sync {selectedList?.contactCount || 0} Contacts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

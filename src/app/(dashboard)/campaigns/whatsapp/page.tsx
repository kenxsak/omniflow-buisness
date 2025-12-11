

"use client";

import React, { useState, useEffect, useCallback, type FormEvent, useRef } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Trash2, Users, Send, Wand2, Loader2, CheckCircle, MessageCircle, Eye, Copy, ClipboardCopy, Upload, FileDown, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getWhatsAppLists, addWhatsAppList, deleteWhatsAppList, getWhatsAppContacts, addWhatsAppContact, deleteWhatsAppContact, bulkImportContacts, recalculateContactCounts } from '@/lib/whatsapp-marketing-data';
import type { WhatsAppList, WhatsAppContact } from '@/types/whatsapp';
import { generateTrackedWhatsappMessageAction } from '@/app/actions/tracked-ai-content-actions';
import type { GenerateWhatsappMessageInput } from '@/ai/flows/generate-whatsapp-message-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { showAIContentReadyToast } from '@/lib/ai-toast-helpers';
import TemplateBrowser from '@/components/templates/template-browser';


interface ContactForSending extends WhatsAppContact {
  hasBeenSent?: boolean;
}

const CONTACT_NAME_PLACEHOLDER = "{{Name}}"; // Define as a constant

// Regex to find *{{Name}}* or *{{ Name }}* (with or without spaces around Name)
const CONTACT_NAME_PLACEHOLDER_REGEX = new RegExp(`\\*\\{\\{\\s*${CONTACT_NAME_PLACEHOLDER.replace(/[{}]/g, '')}\\s*\\}\\}\\*`, 'g');


export default function WhatsAppMarketingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("manage-lists");
  const { company, appUser } = useAuth();

  const [whatsAppLists, setWhatsAppLists] = useState<WhatsAppList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedList, setSelectedList] = useState<WhatsAppList | null>(null);
  const [contactsInSelectedList, setContactsInSelectedList] = useState<WhatsAppContact[]>([]);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhoneNumber, setNewContactPhoneNumber] = useState("");

  const [selectedListIdForCampaign, setSelectedListIdForCampaign] = useState<string>("");
  const [campaignMessage, setCampaignMessage] = useState<string>("");
  const [contactsForSending, setContactsForSending] = useState<ContactForSending[]>([]);
  const [isAiDraftingMessage, setIsAiDraftingMessage] = useState(false);
  const [aiMessageInputs, setAiMessageInputs] = useState({ leadName: CONTACT_NAME_PLACEHOLDER, context: "Following up on your interest", outcome: "Share an update or offer" });
  const [profileBusinessName, setProfileBusinessName] = useState("Your Company");
  const [singleSendPhoneNumber, setSingleSendPhoneNumber] = useState("");
  const [isUploadingContacts, setIsUploadingContacts] = useState(false);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isBulkSendingActive, setIsBulkSendingActive] = useState(false);
  const [currentBulkSendIndex, setCurrentBulkSendIndex] = useState(0);

  const placeholderForCampaignMessage = `Hi *${CONTACT_NAME_PLACEHOLDER}*,\n\nExciting news from *${profileBusinessName}*!\n\n[Your message here]\n\nBest regards,\n*${profileBusinessName}*`;


  const loadListsAndContacts = useCallback(async () => {
    if (!appUser?.companyId) return;
    setIsLoadingLists(true);
    
    // First get lists
    let lists = await getWhatsAppLists(appUser.companyId);
    
    // Check if any lists have 0 contacts (might need recalculation)
    const hasZeroCountLists = lists.some(list => (list.contactCount || 0) === 0);
    
    // If there are lists with 0 contacts, recalculate all counts to ensure accuracy
    if (hasZeroCountLists && lists.length > 0) {
      await recalculateContactCounts(appUser.companyId);
      // Reload lists with updated counts
      lists = await getWhatsAppLists(appUser.companyId);
    }
    
    setWhatsAppLists(lists);
    setIsLoadingLists(false);
  }, [appUser]);

  useEffect(() => {
    if(appUser) {
        loadListsAndContacts();
    }
    if (company) {
      setProfileBusinessName(company.name || 'Your Company');
    }
  }, [appUser?.companyId, company?.name]);

  useEffect(() => {
    if (aiMessageInputs.leadName === CONTACT_NAME_PLACEHOLDER && (campaignMessage.includes("[Your message here]") || campaignMessage.trim() === "" || isAiDraftingMessage)) {
        setCampaignMessage(`Hi *${CONTACT_NAME_PLACEHOLDER}*,\n\nExciting news from *${profileBusinessName}*!\n\n[Your message here]\n\nBest regards,\n*${profileBusinessName}*`);
    }
  }, [profileBusinessName, campaignMessage, isAiDraftingMessage, aiMessageInputs.leadName]);


  const handleCreateList = async () => {
    if (!newListName.trim() || !appUser?.companyId) {
      toast({ title: "Error", description: "List name cannot be empty.", variant: "destructive" });
      return;
    }
    await addWhatsAppList(newListName, appUser.companyId);
    await loadListsAndContacts();
    toast({ title: "List Created", description: `List "${newListName}" created successfully.` });
    setNewListName("");
    setIsCreateListDialogOpen(false);
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (!appUser?.companyId) return;
    await deleteWhatsAppList(listId, appUser.companyId);
    await loadListsAndContacts();
    toast({ title: "List Deleted", description: `List "${listName}" and its contacts have been deleted.` });
  };

  const handleViewContacts = async (list: WhatsAppList) => {
    if (!appUser?.companyId) return;
    setSelectedList(list);
    setContactsInSelectedList(await getWhatsAppContacts(list.id, appUser.companyId));
  };

  const handleAddContactToList = async () => {
    if (!selectedList || !newContactName.trim() || !newContactPhoneNumber.trim() || !appUser?.companyId) {
      toast({ title: "Error", description: "Name and phone number are required.", variant: "destructive" });
      return;
    }
    // Corrected Regex: Must start with a '+' and have 10-15 digits after.
    if (!/^\+\d{10,15}$/.test(newContactPhoneNumber.replace(/[()\s-]/g, ''))) {
        toast({ title: "Invalid Phone Number", description: "Please enter a valid phone number (10-15 digits) with country code (e.g., +91XXXXXXXXXX).", variant: "destructive" });
        return;
    }
    await addWhatsAppContact(selectedList.id, appUser.companyId, newContactName, newContactPhoneNumber);
    await loadListsAndContacts();
    toast({ title: "Contact Added", description: `Contact "${newContactName}" added to list "${selectedList.name}".` });
    setNewContactName("");
    setNewContactPhoneNumber("");
    setIsAddContactDialogOpen(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!selectedList || !appUser?.companyId) return;
    await deleteWhatsAppContact(contactId, appUser.companyId);
    await loadListsAndContacts(); 
    toast({ title: "Contact Deleted" });
  };

  const handleDraftMessageWithAI = async () => {
    if (!aiMessageInputs.context || !aiMessageInputs.outcome) {
      toast({ title: "Inputs Required", description: "Please provide context and desired outcome for AI draft.", variant: "destructive" });
      return;
    }
    if (!appUser) {
      toast({ title: "User Not Authenticated", description: "Please log in to use AI features.", variant: "destructive" });
      return;
    }
    setIsAiDraftingMessage(true);
    try {
      const aiInput: GenerateWhatsappMessageInput = {
        leadName: CONTACT_NAME_PLACEHOLDER,
        leadContext: aiMessageInputs.context,
        desiredOutcome: aiMessageInputs.outcome,
        senderBusinessName: profileBusinessName,
      };
      const result = await generateTrackedWhatsappMessageAction(appUser.companyId, appUser.uid, aiInput);
      if (result.success && result.data) {
        setCampaignMessage(result.data.suggestedMessage);
        showAIContentReadyToast(toast, "WhatsApp Message", result.quotaInfo);
      } else {
        throw new Error(result.error || 'Failed to generate message.');
      }
    } catch (error: any) {
      toast({ title: "AI Draft Failed", description: error.message || "Could not generate message.", variant: "destructive" });
    } finally {
      setIsAiDraftingMessage(false);
    }
  };

  const handleApplyTemplate = (subject: string | undefined, content: string) => {
    setCampaignMessage(content);
    setIsTemplateBrowserOpen(false);
    toast({
      title: '✅ Template Applied',
      description: 'Ready to send to your list!',
    });
  };


  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContactIds(newSelected);
  };

  const selectAllContacts = () => {
    const allIds = new Set(contactsForSending.map(c => c.id));
    setSelectedContactIds(allIds);
  };

  const deselectAllContacts = () => {
    setSelectedContactIds(new Set());
  };

  const startBulkSending = () => {
    if (selectedContactIds.size === 0) {
      toast({ title: "No contacts selected", description: "Please select at least one contact", variant: "destructive" });
      return;
    }
    setIsBulkSendingActive(true);
    setCurrentBulkSendIndex(0);
    sendToNextContact(0);
  };

  const sendToNextContact = (index: number) => {
    const selectedIds = Array.from(selectedContactIds);
    if (index >= selectedIds.length) {
      setIsBulkSendingActive(false);
      toast({ title: "✅ Campaign complete!", description: `Sent to ${selectedIds.length} contacts` });
      return;
    }

    const contactId = selectedIds[index];
    const contact = contactsForSending.find(c => c.id === contactId);
    if (contact) {
      handleInitiateCampaignWaMeSend(contactsForSending.indexOf(contact));
      setCurrentBulkSendIndex(index + 1);
    }
  };

  const goToNextInBulkSend = () => {
    const selectedIds = Array.from(selectedContactIds);
    if (currentBulkSendIndex < selectedIds.length) {
      sendToNextContact(currentBulkSendIndex);
    } else {
      setIsBulkSendingActive(false);
      toast({ title: "✅ All messages sent!", description: `Campaign complete for ${selectedIds.length} contacts` });
    }
  };

  const initiateSingleWaMeSend = (phoneNumber: string, baseMessage: string, contactName?: string) => {
     if (!phoneNumber || !baseMessage) {
        toast({ title: "Missing Information", description: "Phone number and message are required.", variant: "destructive" });
        return;
    }
    let personalizedMessage = baseMessage;
    if (contactName) {
        personalizedMessage = baseMessage.replace(CONTACT_NAME_PLACEHOLDER_REGEX, `*${contactName}*`);
    } else {
        personalizedMessage = baseMessage.replace(CONTACT_NAME_PLACEHOLDER_REGEX, '*there*');
    }

    const businessNameRegex = new RegExp(`\\*${profileBusinessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*`, 'g');
    if (profileBusinessName && personalizedMessage.includes(profileBusinessName) && !businessNameRegex.test(personalizedMessage)) {
      personalizedMessage = personalizedMessage.replace(new RegExp(profileBusinessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `*${profileBusinessName}*`);
    }

    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanedPhoneNumber) {
      toast({ title: "Invalid Phone Number", description: "Please provide a valid phone number including country code.", variant: "destructive" });
      return;
    }
    const whatsappUrl = `https://wa.me/${cleanedPhoneNumber}?text=${encodeURIComponent(personalizedMessage)}`;
    const newWindow = window.open(whatsappUrl, '_blank');
    if (!newWindow) {
      window.location.href = whatsappUrl;
    }
    toast({ title: "Opening WhatsApp", description: `Preparing message for ${contactName || phoneNumber}. Review and send in WhatsApp.` });
  };

  const handleInitiateCampaignWaMeSend = (contactIndex: number) => {
    if (!contactsForSending[contactIndex] || !campaignMessage) return;
    const contact = contactsForSending[contactIndex];
    initiateSingleWaMeSend(contact.phoneNumber, campaignMessage, contact.name);
    setContactsForSending(prev => prev.map((c, idx) => idx === contactIndex ? { ...c, hasBeenSent: true } : c));
  };

  const handleContactFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedList || !appUser?.companyId) {
      toast({ title: "No List Selected", description: "Please select a list to upload contacts to.", variant: "destructive" });
      if(event.target) event.target.value = '';
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
              
              // Parse and validate contacts from file
              const contactsToImport: { name: string; phoneNumber: string }[] = [];
              let invalidCount = 0;
              
              for (const row of jsonData) {
                const name = row['Name'] || row['name'];
                let phoneNumber = row['PhoneNumber'] || row['Phone'] || row['Mobile'] || row['WhatsApp Number'];
                
                if (name && phoneNumber) {
                  phoneNumber = String(phoneNumber).replace(/\s+/g, '');
                  if (/^\+?\d{10,15}$/.test(phoneNumber.replace(/[()\s-]/g, ''))) {
                    contactsToImport.push({ name: String(name), phoneNumber });
                  } else {
                    invalidCount++;
                  }
                } else {
                  invalidCount++;
                }
              }
              
              // Use bulk import helper for proper count management
              const result = await bulkImportContacts(selectedList.id, appUser.companyId!, contactsToImport);
              
              await loadListsAndContacts();
              
              const totalSkipped = result.skipped + invalidCount;
              toast({ 
                title: "Upload Complete", 
                description: `${result.added} contacts added to "${selectedList.name}". ${totalSkipped} rows skipped (missing data, invalid phone, or duplicate).${result.errors.length > 0 ? ` ${result.errors.length} errors occurred.` : ''}` 
              });
            } catch (error) {
              console.error("Error processing Excel/CSV file:", error);
              toast({ title: "Upload Failed", description: "Error processing file. Ensure it's a valid Excel or CSV.", variant: "destructive" });
            }
          }
          setIsUploadingContacts(false);
          if(event.target) event.target.value = '';
        };
        reader.readAsBinaryString(file);
      } catch (xlsxError) {
        console.error("Error loading XLSX library:", xlsxError);
        toast({ title: "Upload Failed", description: "Could not load file processing library. Please try again.", variant: "destructive" });
      } finally {
        // Always reset upload state even if XLSX import fails
        setIsUploadingContacts(false);
        if(event.target) event.target.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [{ Name: "Hitesh Kothari", PhoneNumber: "+919322277736" }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WhatsApp Contacts Template");
    XLSX.writeFile(workbook, "OmniFlow_WhatsApp_Contacts_Template.xlsx");
    toast({ title: "Template Downloaded" });
  };

  const messagesInitiatedCount = contactsForSending.filter(c => c.hasBeenSent).length;
  const totalContactsInCampaignList = contactsForSending.length;
  
  const getValidDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (!isNaN(new Date(timestamp).getTime())) return new Date(timestamp);
    return null;
  };

  return (
    <div className="space-y-6">
      <PageTitle title="WhatsApp Marketing (via wa.me)" description="Manage contact lists and manually initiate messages using wa.me links." />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2">
          <TabsTrigger value="manage-lists"><Users className="mr-2 h-4 w-4" />Manage Lists & Contacts</TabsTrigger>
          <TabsTrigger value="send-campaign"><Send className="mr-2 h-4 w-4" />Send Campaign via wa.me</TabsTrigger>
        </TabsList>

        <TabsContent value="manage-lists" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle>Your WhatsApp Lists</CardTitle>
                  <CardDescription>Create and manage lists of contacts for your WhatsApp campaigns.</CardDescription>
                </div>
                <Dialog open={isCreateListDialogOpen} onOpenChange={setIsCreateListDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Create New List</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create New WhatsApp List</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleCreateList(); }}>
                      <div className="grid gap-4 py-4">
                        <Label htmlFor="new-list-name">List Name</Label>
                        <Input id="new-list-name" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g., New Leads Q1, Product Launch Prospects" required/>
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
              {isLoadingLists ? <div className="flex justify-center items-center h-20"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div> :
                whatsAppLists.length === 0 ? <p className="text-muted-foreground text-center py-4">No lists created yet.</p> :
                <div className="space-y-2">
                  {whatsAppLists.map(list => (
                    <div key={list.id} className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md hover:bg-muted/30 gap-2", selectedList?.id === list.id && "bg-muted/50 border-primary")}>
                      <div>
                        <p className="font-medium">{list.name} <span className="text-xs text-muted-foreground">({list.contactCount || 0} contacts)</span></p>
                        <p className="text-xs text-muted-foreground">Created: {getValidDate(list.createdAt) ? format(getValidDate(list.createdAt)!, 'PP') : 'N/A'}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                        <Button variant="outline" size="sm" onClick={() => handleViewContacts(list)}><Eye className="mr-1 h-4 w-4" />View Contacts</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="destructive" size="sm" onClick={(e) => e.stopPropagation()}><Trash2 className="mr-1 h-4 w-4" />Delete</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete List "{list.name}"?</AlertDialogTitle><AlertDialogDescription>This will delete the list and all its contacts. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteList(list.id, list.name)} className={buttonVariants({variant: "destructive"})}>Delete List</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </CardContent>
          </Card>

          {selectedList && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle>Contacts in "{selectedList.name}"</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={handleDownloadTemplate}><FileDown className="mr-2 h-4 w-4" />Download Template</Button>
                        <Button size="sm" variant="outline" onClick={() => document.getElementById('contact-upload-input')?.click()} disabled={isUploadingContacts}>
                            {isUploadingContacts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload Contacts (Excel/CSV)
                        </Button>
                        <input type="file" id="contact-upload-input" accept=".csv, .xlsx, .xls" onChange={handleContactFileUpload} style={{ display: 'none' }} />
                        <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
                        <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Add Contact Manually</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add Contact to "{selectedList.name}"</DialogTitle></DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); handleAddContactToList(); }}>
                                <div className="space-y-3 py-3">
                                    <div><Label htmlFor="contact-name-modal">Name *</Label><Input id="contact-name-modal" value={newContactName} onChange={(e)=>setNewContactName(e.target.value)} required /></div>
                                    <div>
                                    <Label htmlFor="contact-phone-modal">WhatsApp Number *</Label>
                                    <Input id="contact-phone-modal" type="tel" value={newContactPhoneNumber} onChange={(e)=>setNewContactPhoneNumber(e.target.value)} placeholder="e.g., +919876543210 (with country code)" required />
                                    <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., +1 for US, +91 for India).</p>
                                    </div>
                                </div>
                                <DialogFooter><Button variant="outline" type="button" onClick={()=>setIsAddContactDialogOpen(false)}>Cancel</Button><Button type="submit">Add Contact</Button></DialogFooter>
                            </form>
                        </DialogContent>
                       </Dialog>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingLists && contactsInSelectedList.length === 0 ? <div className="flex justify-center items-center h-20"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div> :
                  contactsInSelectedList.length === 0 ? <p className="text-muted-foreground text-center py-4">No contacts in this list yet. Add contacts manually or upload an Excel/CSV file.</p> :
                  <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone Number</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {contactsInSelectedList.map(contact => (
                            <TableRow key={contact.id}>
                            <TableCell>{contact.name}</TableCell>
                            <TableCell>{contact.phoneNumber}</TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete contact "{contact.name}"?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteContact(contact.id)} className={buttonVariants({variant: "destructive"})}>Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                  </div>
                }
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="send-campaign" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>1. Select WhatsApp List for Campaign</CardTitle></CardHeader>
            <CardContent>
              <Select value={selectedListIdForCampaign} onValueChange={async (value) => {
                if (!appUser?.companyId) return;
                setSelectedListIdForCampaign(value);
                const contacts = await getWhatsAppContacts(value, appUser.companyId);
                setContactsForSending(contacts.map(c => ({ ...c, hasBeenSent: false })));
              }}>
                <SelectTrigger><SelectValue placeholder="Choose a list..." /></SelectTrigger>
                <SelectContent>
                  {whatsAppLists.length === 0 && <SelectItem value="none" disabled>No lists available. Create one first.</SelectItem>}
                  {whatsAppLists.map(list => <SelectItem key={list.id} value={list.id}>{list.name} ({list.contactCount || 0} contacts)</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertTitleComponent className="text-blue-900">📋 Choose Message Source</AlertTitleComponent>
            Use ready-made templates, generate with AI (1 credit per message), or type your own message. Personalization with <code className="font-mono text-sm bg-white p-0.5 rounded">*{CONTACT_NAME_PLACEHOLDER}*</code> supported.
          </Alert>
          
          <Card>
            <CardHeader>
                <CardTitle>2. Draft Your WhatsApp Campaign Message</CardTitle>
            </CardHeader>
            <Tabs defaultValue="template-wa" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="template-wa">📋 Templates</TabsTrigger>
                <TabsTrigger value="ai-wa">✨ AI Draft</TabsTrigger>
                <TabsTrigger value="manual-wa">✍️ Manual</TabsTrigger>
              </TabsList>

              {/* Templates Tab */}
              <TabsContent value="template-wa" className="space-y-3 pt-4">
                <Card>
                  <CardContent className="pt-4">
                    <Button variant="outline" onClick={() => setIsTemplateBrowserOpen(true)} className="w-full">Browse Message Templates</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Draft Tab */}
              <TabsContent value="ai-wa" className="space-y-3 pt-4">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                        <Label htmlFor="wa-ai-context">Message Context/Purpose (for AI) *</Label>
                        <Input id="wa-ai-context" value={aiMessageInputs.context} onChange={(e) => setAiMessageInputs(prev => ({ ...prev, context: e.target.value }))} placeholder="e.g., Product launch, Special offer" required/>
                    </div>
                    <div>
                        <Label htmlFor="wa-ai-outcome">Desired Outcome (for AI) *</Label>
                        <Input id="wa-ai-outcome" value={aiMessageInputs.outcome} onChange={(e) => setAiMessageInputs(prev => ({ ...prev, outcome: e.target.value }))} placeholder="e.g., Get click-through, Confirm interest" required/>
                    </div>
                    <Button type="button" onClick={() => handleDraftMessageWithAI()} disabled={isAiDraftingMessage} variant="outline">
                        {isAiDraftingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Generate with AI (1 credit)
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Manual Tab */}
              <TabsContent value="manual-wa" className="space-y-3 pt-4">
                <p className="text-sm text-muted-foreground">Type your message directly</p>
              </TabsContent>
            </Tabs>

            {/* Message Preview & Editor */}
            <div className="pt-4 border-t">
              <CardContent className="pt-4 space-y-3">
                 <Label htmlFor="campaign-message">Campaign Message</Label>
                 <Textarea id="campaign-message" value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} rows={6} placeholder={placeholderForCampaignMessage} className="min-h-[120px]" />
                 <p className="text-xs text-muted-foreground">
                    Use <code className="font-mono p-0.5 bg-muted rounded">*{CONTACT_NAME_PLACEHOLDER}*</code> for names, <code className="font-mono p-0.5 bg-muted rounded">*{profileBusinessName}*</code> for company
                 </p>
              </CardContent>
            </div>
          </Card>
          
          <Card>
             <CardHeader><CardTitle>3. Quick Test Send (Optional)</CardTitle></CardHeader>
             <CardContent className="space-y-3">
                 <div>
                     <Label htmlFor="single-send-phone">Recipient Phone Number</Label>
                     <Input id="single-send-phone" type="tel" value={singleSendPhoneNumber} onChange={(e) => setSingleSendPhoneNumber(e.target.value)} placeholder="e.g., +919876543210 (with country code)" />
                 </div>
                 <Button onClick={() => initiateSingleWaMeSend(singleSendPhoneNumber, campaignMessage, "Test Contact")} disabled={!singleSendPhoneNumber || !campaignMessage} size="sm">
                     <Send className="mr-2 h-4 w-4"/> Send Test Message
                 </Button>
             </CardContent>
          </Card>

          {selectedListIdForCampaign && campaignMessage && (
            <Card>
              <CardHeader>
                <CardTitle>4. Bulk Send Campaign</CardTitle>
                <CardDescription>
                  Select contacts below. Click "Send to Selected" to send text message via wa.me links. Each contact opens one-by-one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bulk Action Buttons */}
                <div className="flex gap-2 p-3 bg-muted rounded-lg">
                  <Button size="sm" variant="outline" onClick={selectAllContacts} disabled={isBulkSendingActive}>
                    ✓ Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAllContacts} disabled={isBulkSendingActive}>
                    ✗ Deselect All
                  </Button>
                  <div className="flex-1" />
                  <div className="text-sm text-muted-foreground pt-1">
                    {selectedContactIds.size} selected
                  </div>
                  <Button 
                    size="sm" 
                    onClick={startBulkSending} 
                    disabled={selectedContactIds.size === 0 || isBulkSendingActive}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send to Selected ({selectedContactIds.size})
                  </Button>
                </div>

                {/* Bulk Send Progress */}
                {isBulkSendingActive && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertTitleComponent className="text-blue-900">
                      📤 Sending in Progress: {currentBulkSendIndex} / {selectedContactIds.size}
                    </AlertTitleComponent>
                    <p className="text-sm text-blue-800 mt-2">
                      WhatsApp message pre-filled. Review and send. Then click "Next Contact" to continue.
                    </p>
                    <Button size="sm" onClick={goToNextInBulkSend} className="mt-3">
                      ➜ Next Contact
                    </Button>
                  </Alert>
                )}

                {/* Contacts List with Checkboxes */}
                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {contactsForSending.length === 0 && <p className="text-muted-foreground text-center py-4">This list has no contacts. Add contacts in the "Manage Lists & Contacts" tab.</p>}
                  {contactsForSending.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/50 transition">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.has(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        disabled={isBulkSendingActive}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
                      </div>
                      {contact.hasBeenSent && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
           {selectedListIdForCampaign && !campaignMessage && (
             <p className="text-center text-sm text-muted-foreground p-4">Please draft a campaign message above to see contacts for sending.</p>
           )}

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>📋 wa.me: Free Text-Only Messaging</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="font-semibold text-blue-900 mb-2">✅ How It Works:</p>
                      <ol className="text-blue-800 list-decimal list-inside space-y-1">
                        <li>Draft your message (Templates, AI, or Manual)</li>
                        <li>Select contacts to send to</li>
                        <li>Click "Send to Selected" → WhatsApp opens for each contact</li>
                        <li>Message pre-filled → Just review and send</li>
                        <li>Click "Next Contact" to continue to next person</li>
                      </ol>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="font-semibold text-green-900 mb-2">✅ Best For:</p>
                      <ul className="text-green-800 list-disc list-inside space-y-1">
                        <li>5-30 contacts per campaign (safe rate limit)</li>
                        <li>Text-only messages (no images)</li>
                        <li>One-by-one personal sends</li>
                        <li>Small SME audiences</li>
                      </ul>
                    </div>
                    <div className="text-muted-foreground space-y-1 text-xs border-t pt-3">
                     <p>&#8226; <strong>Rate Limit:</strong> Safe up to 20-30 messages/day. Beyond 50+ may trigger WhatsApp block.</p>
                    <p>&#8226; <strong>No Tracking:</strong> wa.me doesn't provide delivery or read receipts.</p>
                    <p>&#8226; <strong>Personalization:</strong> Names are replaced (<code className="font-mono p-0.5 bg-muted rounded-sm">*{CONTACT_NAME_PLACEHOLDER}*</code>) automatically.</p>
                    <p>&#8226; <strong>For Images + Text:</strong> Use WhatsApp Business API (Gupshup, AiSensy, Fast2SMS) to send combined message with image header + text.</p>
                    </div>
                </CardContent>
            </Card>

        </TabsContent>
      </Tabs>

      {/* Template Browser Dialog */}
      <Dialog open={isTemplateBrowserOpen} onOpenChange={setIsTemplateBrowserOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a WhatsApp Message Template</DialogTitle>
            <DialogDescription>Browse SMS-style templates designed for WhatsApp messages</DialogDescription>
          </DialogHeader>
          <TemplateBrowser filterType="sms" onApply={handleApplyTemplate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

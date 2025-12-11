
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
import { getWhatsAppLists, addWhatsAppList, deleteWhatsAppList, getWhatsAppContacts, addWhatsAppContact, deleteWhatsAppContact, bulkImportContacts } from '@/lib/whatsapp-marketing-data';
import type { WhatsAppList, WhatsAppContact } from '@/types/whatsapp';
import { generateWhatsappMessage, type GenerateWhatsappMessageInput } from '@/ai/flows/generate-whatsapp-message-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import { useAuth } from '@/hooks/use-auth';


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

  const placeholderForCampaignMessage = `Hi *${CONTACT_NAME_PLACEHOLDER}*,\n\nExciting news from *${profileBusinessName}*!\n\n[Your message here]\n\nBest regards,\n*${profileBusinessName}*`;


  const loadListsAndContacts = useCallback(async () => {
    if (!appUser?.companyId) return;
    setIsLoadingLists(true);
    const lists = await getWhatsAppLists(appUser.companyId);
    setWhatsAppLists(lists);
    if (selectedList) {
      const currentListStillExists = lists.find((l: WhatsAppList) => l.id === selectedList.id);
      if (currentListStillExists) {
        const contacts = await getWhatsAppContacts(selectedList.id, appUser.companyId);
        setContactsInSelectedList(contacts);
      } else {
        setSelectedList(null); 
        setContactsInSelectedList([]);
      }
    }
    if (selectedListIdForCampaign) {
      const campaignListExists = lists.find((l: WhatsAppList) => l.id === selectedListIdForCampaign);
      if (campaignListExists) {
        const contacts = await getWhatsAppContacts(selectedListIdForCampaign, appUser.companyId);
        setContactsForSending(contacts.map((c: WhatsAppContact) => ({ ...c, hasBeenSent: false })));
      } else {
        setSelectedListIdForCampaign(""); 
        setContactsForSending([]);
      }
    }
    setIsLoadingLists(false);
  }, [selectedList, selectedListIdForCampaign, appUser]);

  useEffect(() => {
    if(appUser) {
        loadListsAndContacts();
    }
    if (company) {
      setProfileBusinessName(company.name || 'Your Company');
    }
  }, [loadListsAndContacts, appUser, company]);

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
    const contacts = await getWhatsAppContacts(list.id, appUser.companyId);
    setContactsInSelectedList(contacts);
  };

  const handleAddContactToList = async () => {
    if (!selectedList || !newContactName.trim() || !newContactPhoneNumber.trim() || !appUser?.companyId) {
      toast({ title: "Error", description: "Name and phone number are required.", variant: "destructive" });
      return;
    }
    if (!/^\\+?\\d{10,15}$/.test(newContactPhoneNumber.replace(/[()\\s-]/g, ''))) {
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
    setIsAiDraftingMessage(true);
    try {
      const aiInput: GenerateWhatsappMessageInput = {
        leadName: CONTACT_NAME_PLACEHOLDER,
        leadContext: aiMessageInputs.context,
        desiredOutcome: aiMessageInputs.outcome,
        senderBusinessName: profileBusinessName,
      };
      const result = await generateWhatsappMessage(aiInput);
      setCampaignMessage(result.suggestedMessage);
      toast({ title: "AI Message Drafted", description: "Review and edit the message below." });
    } catch (error: any) {
      toast({ title: "AI Draft Failed", description: error.message || "Could not generate message.", variant: "destructive" });
    } finally {
      setIsAiDraftingMessage(false);
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

    const cleanedPhoneNumber = phoneNumber.replace(/\\D/g, '');
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
                description: `${result.added} contacts added to "${selectedList.name}". ${totalSkipped} rows skipped.` 
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
    try {
      const XLSX = await import('xlsx');
      const templateData = [{ Name: "Hitesh Kothari", PhoneNumber: "+919322277736" }];
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "WhatsApp Contacts Template");
      XLSX.writeFile(workbook, "OmniFlow_WhatsApp_Contacts_Template.xlsx");
      toast({ title: "Template Downloaded" });
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({ title: "Download Failed", description: "Could not generate template file.", variant: "destructive" });
    }
  };

  const messagesInitiatedCount = contactsForSending.filter(c => c.hasBeenSent).length;
  const totalContactsInCampaignList = contactsForSending.length;

  return (
    <div className="space-y-6">
      <PageTitle title="WhatsApp Marketing (via wa.me)" description="Manage local contact lists and manually initiate messages using wa.me links." />

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
                  <CardDescription>Create and manage local lists of contacts for your WhatsApp campaigns.</CardDescription>
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
                        <p className="text-xs text-muted-foreground">Created: {new Date(list.createdAt).toLocaleDateString()}</p>
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
                setContactsForSending(contacts.map((c: WhatsAppContact) => ({ ...c, hasBeenSent: false })));
              }}>
                <SelectTrigger><SelectValue placeholder="Choose a list..." /></SelectTrigger>
                <SelectContent>
                  {whatsAppLists.length === 0 && <SelectItem value="none" disabled>No lists available. Create one first.</SelectItem>}
                  {whatsAppLists.map(list => <SelectItem key={list.id} value={list.id}>{list.name} ({list.contactCount || 0} contacts)</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>2. Draft Your WhatsApp Campaign Message</CardTitle>
                <CardDescription>
                    Use AI or type manually. Use{' '}
                    <code className="font-mono text-sm bg-muted p-0.5 rounded-sm">*{CONTACT_NAME_PLACEHOLDER}*</code>
                    {' '}for contact name personalization.
                </CardDescription>
            </CardHeader>
             <form onSubmit={(e: FormEvent) => { e.preventDefault(); handleDraftMessageWithAI(); }} className="space-y-0">
                <CardContent className="space-y-3 pt-0">
                    <div>
                        <Label htmlFor="wa-ai-context">Message Context/Purpose (for AI draft)</Label>
                        <Input id="wa-ai-context" value={aiMessageInputs.context} onChange={(e) => setAiMessageInputs(prev => ({ ...prev, context: e.target.value }))} placeholder="e.g., New Product Launch Update" />
                    </div>
                    <div>
                        <Label htmlFor="wa-ai-outcome">Desired Outcome from Message (for AI draft)</Label>
                        <Input id="wa-ai-outcome" value={aiMessageInputs.outcome} onChange={(e) => setAiMessageInputs(prev => ({ ...prev, outcome: e.target.value }))} placeholder="e.g., Get users to visit link" />
                    </div>
                    <Button type="submit" variant="outline" size="sm" disabled={isAiDraftingMessage}>
                        {isAiDraftingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Draft with AI
                    </Button>
                     <Label htmlFor="campaign-message">Campaign Message (Edit AI draft or write your own)</Label>
                     <Textarea id="campaign-message" value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} rows={7} placeholder={placeholderForCampaignMessage} className="min-h-[150px]" />
                     <p className="text-xs text-muted-foreground mt-1">
                        {`The AI will use `}
                        <code className="font-mono text-purple-600 p-0.5 bg-muted rounded-sm">*{CONTACT_NAME_PLACEHOLDER}*</code>
                        {` for personalization. Your business name `}
                        <code className="font-mono text-purple-600 p-0.5 bg-muted rounded-sm">*{profileBusinessName}*</code>
                        {` (from settings) will be added to the signature if not already present.`}
                     </p>
                </CardContent>
            </form>
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
                <CardTitle>4. Initiate Sending to List: "{whatsAppLists.find(l=>l.id === selectedListIdForCampaign)?.name || 'Selected List'}"</CardTitle>
                <CardDescription>
                  {`Click "Send to..." for each contact to open WhatsApp. Message will be personalized. ${messagesInitiatedCount} / ${totalContactsInCampaignList} message initiations started for this session.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-2">
                {contactsForSending.length === 0 && <p className="text-muted-foreground text-center py-4">This list has no contacts. Add contacts in the "Manage Lists & Contacts" tab.</p>}
                {contactsForSending.map((contact, index) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInitiateCampaignWaMeSend(index)}
                      disabled={contact.hasBeenSent}
                      className={cn(
                        contact.hasBeenSent 
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground" 
                      )}
                    >
                      {contact.hasBeenSent ? <CheckCircle className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                      {contact.hasBeenSent ? "Initiated" : `Send to ${contact.name.split(' ')[0]}`}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
           {selectedListIdForCampaign && !campaignMessage && (
             <p className="text-center text-sm text-muted-foreground p-4">Please draft a campaign message above to see contacts for sending.</p>
           )}

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Important Notes for `wa.me` Marketing</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                     <p>&#8226; This feature uses <code className="font-mono p-0.5 bg-muted rounded-sm">wa.me</code> links which open WhatsApp directly. You will need to manually press "send" within WhatsApp for each message.</p>
                    <p>&#8226; There is no direct way to track delivery or read receipts with this method.</p>
                    <p>&#8226; Personalization (like replacing <code className="font-mono p-0.5 bg-muted rounded-sm">*{CONTACT_NAME_PLACEHOLDER}*</code> with the contact's name) happens before the link is generated by OmniFlow.</p>
                    <p>&#8226; Sending too many messages too quickly, especially to unsaved contacts, might be flagged by WhatsApp. Use responsibly.</p>
                    <p>&#8226; For full automation, delivery reports, and official business features, consider the **WhatsApp Business API** (often accessed via platforms like Botpress, AiSensy, etc.).</p>
                </CardContent>
            </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}

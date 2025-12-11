"use client";

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PageTitle from '@/components/ui/page-title';
import type { Lead } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadActionsProvider, useLeadActions } from '@/components/crm/lead-actions-provider';
import { ContactUsageIndicator } from '@/components/crm/contact-usage-indicator';
import { BulkAssignDialog } from '@/components/crm/bulk-assign-dialog';
import { Plus, Upload, Download, Loader2, Users, Trash2, AlertTriangle, UserPlus, Calendar, ChevronRight } from 'lucide-react';
import { AppointmentDialog } from '@/components/appointments/appointment-dialog';
import { useToast } from '@/hooks/use-toast';
import { createLeadAction, updateLeadAction, bulkDeleteLeadsAction, deleteAllLeadsAction, loadMoreLeadsAction } from '@/app/actions/lead-actions';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
];

const LeadTable = dynamic(() => import('@/components/crm/lead-table'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface LeadsTableClientProps {
  initialLeads: Lead[];
  totalLeads: number;
  hasMore: boolean;
  pageSize: number;
  companyId: string;
  planMetadata: {
    planId: string;
    planName: string;
    maxContacts: number | null;
  } | null;
  userRole?: string;
  userId?: string;
}

function LeadsTableInner({ 
  initialLeads, 
  totalLeads: initialTotal,
  hasMore: initialHasMore,
  pageSize,
  companyId, 
  planMetadata, 
  userRole, 
  userId 
}: { 
  initialLeads: Lead[], 
  totalLeads: number,
  hasMore: boolean,
  pageSize: number,
  companyId: string, 
  planMetadata: LeadsTableClientProps['planMetadata'], 
  userRole?: string, 
  userId?: string 
}) {
  const [allLoadedLeads, setAllLoadedLeads] = useState<Lead[]>(initialLeads);
  const [totalLeads, setTotalLeads] = useState(initialTotal);
  const [loadedPages, setLoadedPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [defaultCountryCode, setDefaultCountryCode] = useState('+91');
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'unassigned'>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedLeadForAppointment, setSelectedLeadForAppointment] = useState<Lead | null>(null);
  const { openAddLeadDialog, openEditLeadDialog, openAddToListDialog, handleDeleteLead } = useLeadActions();
  const { toast } = useToast();
  const { appUser } = useAuth();
  const router = useRouter();

  const hasMoreToLoad = allLoadedLeads.length < totalLeads;

  const loadMoreLeads = useCallback(async () => {
    if (isLoadingMore || !userRole || !userId || !hasMoreToLoad) return;
    
    setIsLoadingMore(true);
    try {
      const offset = allLoadedLeads.length;
      const result = await loadMoreLeadsAction(
        companyId,
        offset,
        pageSize,
        userRole as 'superadmin' | 'admin' | 'manager' | 'user',
        userId
      );
      
      // Accumulate leads instead of replacing
      setAllLoadedLeads(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const newLeads = result.leads.filter(l => !existingIds.has(l.id));
        return [...prev, ...newLeads];
      });
      setTotalLeads(result.total);
      setLoadedPages(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load more contacts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [companyId, pageSize, userRole, userId, isLoadingMore, hasMoreToLoad, allLoadedLeads.length, toast]);

  const handleEdit = (lead: Lead) => {
    openEditLeadDialog(lead);
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete contact ${lead.name}?`)) return;
    await handleDeleteLead(lead.id);
  };

  const handleScheduleAppointment = (lead: Lead) => {
    setSelectedLeadForAppointment(lead);
    setAppointmentDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!appUser?.companyId) {
      toast({ title: "Error", description: "Company context missing", variant: "destructive" });
      if (event.target) event.target.value = '';
      return;
    }
    
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const data = e.target?.result;
      let addedCount = 0;
      let skippedCount = 0;
      
      if (data) {
        try {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
          
          // Batch process leads in groups of 20 to avoid memory overload
          const BATCH_SIZE = 20;
          for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
            const batch = jsonData.slice(i, i + BATCH_SIZE);
            
            const createPromises = batch.map(async (row) => {
              const name = row['Name'] || row['name'] || row['Full Name'];
              const email = row['Email'] || row['email'];
              let phone = row['Phone'] || row['phone'] || row['Mobile'];
              const company = row['Company'] || row['company'];
              const status = row['Status'] || row['status'] || 'New';
              
              // Robust phone number parsing with string coercion
              if (phone !== undefined && phone !== null && phone !== '') {
                let phoneStr = String(phone).trim();
                phoneStr = phoneStr.replace(/[\s\-\(\)]/g, '');
                if (!phoneStr.startsWith('+')) {
                  phone = `${defaultCountryCode}${phoneStr}`;
                } else {
                  phone = phoneStr;
                }
              } else {
                phone = undefined;
              }
              
              if (name && email) {
                try {
                  await createLeadAction(companyId, {
                    name: String(name).trim(),
                    email: String(email).toLowerCase().trim(),
                    phone: phone,
                    status: status as any,
                    source: 'CSV Import',
                    notes: company ? `Company: ${company}` : undefined,
                  });
                  return { success: true };
                } catch (error) {
                  console.error('Error adding lead:', error);
                  return { success: false };
                }
              } else {
                return { success: false };
              }
            });
            
            const results = await Promise.all(createPromises);
            addedCount += results.filter(r => r.success).length;
            skippedCount += results.filter(r => !r.success).length;
          }
          
          toast({ 
            title: "✅ Import Complete!", 
            description: `${addedCount} contacts added to your CRM. ${skippedCount} rows skipped.`,
            duration: 5000
          });
          
          router.refresh();
        } catch (error) {
          console.error("Error processing file:", error);
          toast({ 
            title: "Upload Failed", 
            description: "Error processing file. Ensure it's a valid Excel or CSV.", 
            variant: "destructive" 
          });
        }
      }
      
      setIsUploading(false);
      if (event.target) event.target.value = '';
    };
    
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const templateData = [
        {
          'Name': 'John Doe',
          'Email': 'john@example.com',
          'Phone': '+1234567890',
          'Company': 'Example Corp',
          'Status': 'New'
        },
        {
          'Name': 'Jane Smith',
          'Email': 'jane@example.com',
          'Phone': '+1987654321',
          'Company': 'Sample Inc',
          'Status': 'Qualified'
        }
      ];
      
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts Template");
      XLSX.writeFile(workbook, "OmniFlow_CRM_Contacts_Template.xlsx");
      toast({ title: "Template Downloaded", description: "Fill in the template and upload to import contacts" });
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({ title: "Download Failed", description: "Could not generate template file.", variant: "destructive" });
    }
  };

  const getFilteredByTab = () => {
    if (userRole === 'user') return allLoadedLeads;
    switch (activeTab) {
      case 'my':
        return allLoadedLeads.filter(lead => lead.assignedTo === userId);
      case 'unassigned':
        return allLoadedLeads.filter(lead => !lead.assignedTo || lead.assignedTo === '_UNASSIGNED_');
      default:
        return allLoadedLeads;
    }
  };

  const tabFilteredLeads = getFilteredByTab();
  
  const filteredLeads = tabFilteredLeads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectionChange = (leadId: string, isSelected: boolean) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(leadId);
      } else {
        newSet.delete(leadId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedLeadIds(new Set(filteredLeads.map(lead => lead.id)));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleAddToList = () => {
    openAddToListDialog(selectedLeadIds);
  };

  const handleUpdate = (lead: Lead) => {
    updateLeadAction(lead).then(() => {
      router.refresh();
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedLeadIds.size;
    const confirmed = confirm(
      `Delete ${count} selected contact${count !== 1 ? 's' : ''}?\n\n` +
      `This action cannot be undone. This will permanently delete the selected contact${count !== 1 ? 's' : ''} from your database.`
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      const leadIdsArray = Array.from(selectedLeadIds);
      const result = await bulkDeleteLeadsAction(leadIdsArray);
      
      const deletedCount = result?.deletedCount || count;
      toast({
        title: 'Contacts Deleted',
        description: `Successfully deleted ${deletedCount} contact${deletedCount !== 1 ? 's' : ''}`,
      });
      
      setSelectedLeadIds(new Set());
      router.refresh();
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete contacts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    const filteredCount = filteredLeads.length;
    
    let confirmMessage = `⚠️ WARNING: Delete ALL ${totalLeads} contacts in your database?\n\n`;
    confirmMessage += `This is an extremely destructive operation that will permanently delete ALL ${totalLeads} contacts from your entire company database, regardless of any search filters.\n\n`;
    
    if (searchTerm && filteredCount !== totalLeads) {
      confirmMessage += `Note: You are currently viewing ${filteredCount} filtered contact${filteredCount !== 1 ? 's' : ''}, but this action will delete ALL ${totalLeads} contacts in your database.\n\n`;
    }
    
    confirmMessage += `This action cannot be undone!\n\nAre you absolutely sure?`;
    
    const confirmed = confirm(confirmMessage);
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteAllLeadsAction(companyId);
      
      const deletedCount = result?.deletedCount || totalLeads;
      toast({
        title: 'All Contacts Deleted',
        description: `Successfully deleted ${deletedCount} contact${deletedCount !== 1 ? 's' : ''} from your entire database`,
      });
      
      setSelectedLeadIds(new Set());
      router.refresh();
    } catch (error: any) {
      console.error('Delete all error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete all contacts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle 
          title={userRole === 'user' ? 'My Leads' : 'All Leads'} 
          description={userRole === 'user' 
            ? 'View and manage leads assigned to you' 
            : 'Select and manage your contacts with bulk actions'
          } 
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <div className="flex items-center gap-2">
            <Select value={defaultCountryCode} onValueChange={setDefaultCountryCode}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Country Code" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((cc) => (
                  <SelectItem key={cc.code} value={cc.code}>
                    {cc.flag} {cc.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => document.getElementById('csv-upload-input')?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import CSV/Excel
            </Button>
            <input 
              type="file" 
              id="csv-upload-input" 
              accept=".csv, .xlsx, .xls" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </div>
          <Button onClick={openAddLeadDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {userRole && userRole !== 'user' && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'my' | 'all' | 'unassigned')}>
          <TabsList>
            <TabsTrigger value="all">All Leads ({totalLeads})</TabsTrigger>
            <TabsTrigger value="my">My Leads ({allLoadedLeads.filter(l => l.assignedTo === userId).length})</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned ({allLoadedLeads.filter(l => !l.assignedTo || l.assignedTo === '_UNASSIGNED_').length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {planMetadata && (
        <ContactUsageIndicator
          currentContactCount={totalLeads}
          maxContacts={planMetadata.maxContacts}
          planName={planMetadata.planName}
          compact={true}
        />
      )}

      {selectedLeadIds.size > 0 && (
        <div className="rounded-lg border bg-muted/50 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {selectedLeadIds.size} selected
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">Choose an action</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="default" 
                size="sm"
                onClick={handleAddToList}
                disabled={isDeleting}
                className="flex-1 sm:flex-none"
              >
                <Users className="h-4 w-4 mr-2" />
                Add to List
              </Button>
              {userRole && userRole !== 'user' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAssignDialogOpen(true)}
                  disabled={isDeleting}
                  className="flex-1 sm:flex-none"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to Rep
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex-1 sm:flex-none"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedLeadIds(new Set())}
                disabled={isDeleting}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Input
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDeleteAll}
            disabled={isDeleting || totalLeads === 0}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Delete All
          </Button>
          <div className="text-sm text-muted-foreground">
            {filteredLeads.length} contact{filteredLeads.length !== 1 ? 's' : ''} {filteredLeads.length !== totalLeads && `(${totalLeads} total)`}
          </div>
        </div>
      </div>

      <LeadTable
        leads={filteredLeads}
        onDeleteLead={handleDeleteLead}
        onUpdateLead={handleUpdate}
        selectedLeadIds={selectedLeadIds}
        onSelectionChange={handleSelectionChange}
        onSelectAll={handleSelectAll}
        onSyncComplete={() => router.refresh()}
        onEditLead={openEditLeadDialog}
        onScheduleAppointment={handleScheduleAppointment}
      />

      {hasMoreToLoad && (
        <div className="flex items-center justify-center border-t pt-4">
          <Button
            variant="outline"
            onClick={loadMoreLeads}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            Load More ({totalLeads - allLoadedLeads.length} remaining)
          </Button>
        </div>
      )}

      <BulkAssignDialog
        isOpen={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        selectedLeadIds={selectedLeadIds}
        companyId={companyId}
        onAssignComplete={() => {
          setSelectedLeadIds(new Set());
          router.refresh();
        }}
      />

      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        contact={selectedLeadForAppointment ? {
          id: selectedLeadForAppointment.id,
          name: selectedLeadForAppointment.name,
          email: selectedLeadForAppointment.email,
          phone: selectedLeadForAppointment.phone
        } : undefined}
        onSuccess={() => {
          setAppointmentDialogOpen(false);
          setSelectedLeadForAppointment(null);
          toast({
            title: 'Appointment Scheduled',
            description: `Appointment with ${selectedLeadForAppointment?.name} has been scheduled.`,
          });
        }}
      />
    </div>
  );
}

export function LeadsTableClient({ 
  initialLeads, 
  totalLeads, 
  hasMore, 
  pageSize, 
  companyId, 
  planMetadata, 
  userRole, 
  userId 
}: LeadsTableClientProps) {
  return (
    <LeadActionsProvider companyId={companyId} leads={initialLeads}>
      <LeadsTableInner 
        initialLeads={initialLeads} 
        totalLeads={totalLeads}
        hasMore={hasMore}
        pageSize={pageSize}
        companyId={companyId} 
        planMetadata={planMetadata} 
        userRole={userRole} 
        userId={userId} 
      />
    </LeadActionsProvider>
  );
}

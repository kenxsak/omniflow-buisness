"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Lead } from '@/lib/mock-data';
import { createLeadAction, updateLeadAction, deleteLeadAction } from '@/app/actions/lead-actions';
import { useToast } from '@/hooks/use-toast';

const AddLeadDialog = dynamic(() => import('@/components/crm/add-lead-dialog'), {
  ssr: false,
});

const EditLeadDialog = dynamic(() => import('@/components/crm/edit-lead-dialog'), {
  ssr: false,
});

const AddToMessagingListDialog = dynamic(() => import('@/components/crm/add-to-messaging-list-dialog'), {
  ssr: false,
});

interface LeadActionsContextType {
  openAddLeadDialog: () => void;
  openEditLeadDialog: (lead: Lead) => void;
  openAddToListDialog: (selectedLeadIds: Set<string>) => void;
  handleDeleteLead: (leadId: string) => Promise<void>;
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isAddToListDialogOpen: boolean;
  selectedLeadForEdit: Lead | null;
}

const LeadActionsContext = createContext<LeadActionsContextType | undefined>(undefined);

export function useLeadActions() {
  const context = useContext(LeadActionsContext);
  if (!context) {
    throw new Error('useLeadActions must be used within LeadActionsProvider');
  }
  return context;
}

interface LeadActionsProviderProps {
  children: React.ReactNode;
  companyId: string;
  onRefresh?: () => void;
  leads?: Lead[];
}

export function LeadActionsProvider({ children, companyId, onRefresh, leads = [] }: LeadActionsProviderProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddToListDialogOpen, setIsAddToListDialogOpen] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [selectedLeadIdsForList, setSelectedLeadIdsForList] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const handleAddLead = useCallback(
    async (newLeadData: any) => {
      try {
        await createLeadAction(companyId, newLeadData);
        toast({ 
          title: 'Success', 
          description: 'Contact added successfully' 
        });
        setIsAddDialogOpen(false);
        onRefresh?.();
      } catch (error) {
        console.error('Failed to add contact:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to add contact', 
          variant: 'destructive' 
        });
      }
    },
    [companyId, onRefresh, toast]
  );

  const handleUpdateLead = useCallback(
    async (updatedLead: Lead) => {
      try {
        await updateLeadAction(updatedLead);
        toast({ 
          title: 'Success', 
          description: 'Contact updated successfully' 
        });
        setIsEditDialogOpen(false);
        setSelectedLeadForEdit(null);
        onRefresh?.();
      } catch (error) {
        console.error('Failed to update contact:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to update contact', 
          variant: 'destructive' 
        });
      }
    },
    [onRefresh, toast]
  );

  const handleDeleteLead = useCallback(
    async (leadId: string) => {
      try {
        await deleteLeadAction(leadId);
        toast({ 
          title: 'Success', 
          description: 'Contact deleted successfully' 
        });
        onRefresh?.();
      } catch (error) {
        console.error('Failed to delete contact:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to delete contact', 
          variant: 'destructive' 
        });
      }
    },
    [onRefresh, toast]
  );

  const openAddLeadDialog = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const openEditLeadDialog = useCallback((lead: Lead) => {
    setSelectedLeadForEdit(lead);
    setIsEditDialogOpen(true);
  }, []);

  const openAddToListDialog = useCallback((selectedLeadIds: Set<string>) => {
    setSelectedLeadIdsForList(selectedLeadIds);
    setIsAddToListDialogOpen(true);
  }, []);

  const value = {
    openAddLeadDialog,
    openEditLeadDialog,
    openAddToListDialog,
    handleDeleteLead,
    isAddDialogOpen,
    isEditDialogOpen,
    isAddToListDialogOpen,
    selectedLeadForEdit,
  };

  return (
    <LeadActionsContext.Provider value={value}>
      {children}
      {isAddDialogOpen && (
        <AddLeadDialog 
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onAddLead={handleAddLead}
        />
      )}
      {isEditDialogOpen && selectedLeadForEdit && (
        <EditLeadDialog
          lead={selectedLeadForEdit}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleUpdateLead}
        />
      )}
      {isAddToListDialogOpen && (
        <AddToMessagingListDialog
          leads={leads}
          selectedLeadIds={selectedLeadIdsForList}
          isOpen={isAddToListDialogOpen}
          onOpenChange={setIsAddToListDialogOpen}
          onComplete={() => {
            setIsAddToListDialogOpen(false);
            onRefresh?.();
          }}
        />
      )}
    </LeadActionsContext.Provider>
  );
}

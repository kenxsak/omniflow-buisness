"use client";

import { useState, useEffect } from 'react';
import type { AppUser } from '@/types/saas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCompanyUsers } from '@/lib/saas-data';
import { bulkAssignLeadsAction } from '@/app/actions/lead-actions';

interface BulkAssignDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: Set<string>;
  companyId: string;
  onAssignComplete: () => void;
}

export function BulkAssignDialog({
  isOpen,
  onOpenChange,
  selectedLeadIds,
  companyId,
  onAssignComplete,
}: BulkAssignDialogProps) {
  const [companyUsers, setCompanyUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && companyId) {
      setIsLoading(true);
      getCompanyUsers(companyId)
        .then(setCompanyUsers)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId('');
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedUserId || selectedLeadIds.size === 0) return;
    
    setIsAssigning(true);
    try {
      await bulkAssignLeadsAction(Array.from(selectedLeadIds), selectedUserId);
      
      const assignedUser = companyUsers.find(u => u.uid === selectedUserId);
      toast({
        title: 'Leads Assigned',
        description: `${selectedLeadIds.size} lead(s) assigned to ${assignedUser?.name || assignedUser?.email || 'team member'}`,
      });
      
      onOpenChange(false);
      onAssignComplete();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to assign leads',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Leads to Team Member
          </DialogTitle>
          <DialogDescription>
            Assign {selectedLeadIds.size} selected lead(s) to a sales rep.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {companyUsers.map((user) => (
                  <SelectItem key={user.uid} value={user.uid}>
                    {user.name || user.email} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedUserId || isAssigning}>
            {isAssigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
            Assign {selectedLeadIds.size} Lead(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

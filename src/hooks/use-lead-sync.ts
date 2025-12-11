import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { syncSelectedLeadsAction, type BulkSyncResult, type SyncDetail } from '@/actions/crm-sync-actions';
import { updateStoredLead, triggerAutomation } from '@/lib/mock-data';
import type { Lead } from '@/lib/mock-data';
import { getFriendlySuccess, getFriendlyError, getFriendlyLoading, getFriendlyInfo } from '@/lib/friendly-messages';
import { calculateSyncCounts } from '@/lib/crm/lead-utils';

export interface UseLeadSyncOptions {
  leads: Lead[];
  companyId: string;
  brevoApiKey?: string;
  hubspotApiKey?: string;
  onSyncComplete?: () => void;
}

export function useLeadSync({
  leads,
  companyId,
  brevoApiKey,
  hubspotApiKey,
  onSyncComplete,
}: UseLeadSyncOptions) {
  const { toast } = useToast();
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [isSelectedSyncing, setIsSelectedSyncing] = useState(false);

  const processAndApplySyncResults = useCallback(
    async (result: BulkSyncResult) => {
      if (result.syncDetails.length === 0) {
        return { brevoSyncedCount: 0, brevoFailedCount: 0, hubspotSyncedCount: 0, hubspotFailedCount: 0 };
      }

      const counts = calculateSyncCounts(result.syncDetails);
      let leadForWelcomeEmail: Lead | null = null;

      for (const detail of result.syncDetails) {
        const leadToUpdate = leads.find(l => l.id === detail.leadId);
        if (!leadToUpdate) continue;

        const statusKey = `${detail.platform}SyncStatus` as const;
        const errorKey = `${detail.platform}ErrorMessage` as const;
        const idKey = `${detail.platform}ContactId` as const;

        const updatedLead: Lead = {
          ...leadToUpdate,
          [statusKey]: detail.success ? 'synced' : 'failed',
          [errorKey]: detail.success ? undefined : detail.errorMessage,
          [idKey]: detail.success ? detail.contactId : leadToUpdate[idKey],
        };

        await updateStoredLead(updatedLead);

        if (detail.platform === 'brevo' && detail.success && detail.isNewContact && !leadForWelcomeEmail) {
          leadForWelcomeEmail = updatedLead;
        }
      }

      if (onSyncComplete) {
        await onSyncComplete();
      }

      if (leadForWelcomeEmail) {
        triggerAutomation('newLead', leadForWelcomeEmail).then(automationResult => {
          if (automationResult.success) {
            const successMsg = getFriendlySuccess('connect/success', 'Automated follow-up is now active for this contact');
            toast({
              title: successMsg.title,
              description: successMsg.description,
            });
          }
        });
      }

      return counts;
    },
    [leads, onSyncComplete, toast]
  );

  const handleBulkSync = useCallback(async () => {
    if (!companyId) return;

    setIsBulkSyncing(true);
    toast({ title: getFriendlyLoading('sync/progress'), description: 'Updating all your contacts...' });

    const leadsToSync = leads.filter(
      lead =>
        (lead.brevoSyncStatus !== 'synced' && lead.brevoSyncStatus !== 'syncing') ||
        (lead.hubspotSyncStatus !== 'synced' && lead.hubspotSyncStatus !== 'syncing')
    );

    if (leadsToSync.length === 0) {
      const infoMsg = getFriendlyInfo('sync/complete', 'All your contacts are already up to date');
      toast({ title: infoMsg.title, description: infoMsg.description });
      setIsBulkSyncing(false);
      return;
    }

    try {
      const result = await syncSelectedLeadsAction(
        leadsToSync.map(l => l.id),
        companyId,
        brevoApiKey,
        hubspotApiKey
      );
      const counts = await processAndApplySyncResults(result);
      const totalSynced = counts.brevoSyncedCount + counts.hubspotSyncedCount;
      const totalFailed = counts.brevoFailedCount + counts.hubspotFailedCount;
      const syncMsg =
        totalFailed > 0
          ? getFriendlyInfo('sync/partial', `${totalSynced} contacts synced successfully, ${totalFailed} had issues`)
          : getFriendlySuccess('sync/complete', `All ${totalSynced} contacts are now up to date`);
      toast({
        title: syncMsg.title,
        description: syncMsg.description,
        variant: totalFailed > 0 ? 'destructive' : 'default',
        duration: 10000,
      });
    } catch (error: any) {
      const errorMsg = getFriendlyError('sync/failed', "We couldn't complete the sync");
      toast({ title: errorMsg.title, description: error.message || errorMsg.description, variant: 'destructive' });
    } finally {
      setIsBulkSyncing(false);
      if (onSyncComplete) {
        await onSyncComplete();
      }
    }
  }, [leads, companyId, brevoApiKey, hubspotApiKey, processAndApplySyncResults, toast, onSyncComplete]);

  const handleSelectedLeadsSync = useCallback(
    async (selectedLeadIds: Set<string>) => {
      if (selectedLeadIds.size === 0) {
        const errorMsg = getFriendlyError('validation/required-field', 'Please select at least one contact to sync');
        toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' });
        return;
      }

      setIsSelectedSyncing(true);
      toast({
        title: getFriendlyLoading('sync/progress'),
        description: `Updating ${selectedLeadIds.size} contact${selectedLeadIds.size > 1 ? 's' : ''}...`,
      });

      try {
        const result = await syncSelectedLeadsAction(
          Array.from(selectedLeadIds),
          companyId,
          brevoApiKey,
          hubspotApiKey
        );
        const counts = await processAndApplySyncResults(result);
        const totalSynced = counts.brevoSyncedCount + counts.hubspotSyncedCount;
        const totalFailed = counts.brevoFailedCount + counts.hubspotFailedCount;
        const syncMsg =
          totalFailed > 0
            ? getFriendlyInfo('sync/partial', `${totalSynced} contacts synced, ${totalFailed} had issues`)
            : getFriendlySuccess('sync/complete', `${totalSynced} contact${totalSynced > 1 ? 's' : ''} updated successfully`);
        toast({
          title: syncMsg.title,
          description: syncMsg.description,
          variant: totalFailed > 0 ? 'destructive' : 'default',
          duration: 10000,
        });
      } catch (error: any) {
        const errorMsg = getFriendlyError('sync/failed', "We couldn't sync the selected contacts");
        toast({ title: errorMsg.title, description: error.message || errorMsg.description, variant: 'destructive' });
      } finally {
        setIsSelectedSyncing(false);
        if (onSyncComplete) {
          await onSyncComplete();
        }
      }
    },
    [companyId, brevoApiKey, hubspotApiKey, processAndApplySyncResults, toast, onSyncComplete]
  );

  const syncSingleLead = useCallback(
    async (leadId: string) => {
      return handleSelectedLeadsSync(new Set([leadId]));
    },
    [handleSelectedLeadsSync]
  );

  return {
    isBulkSyncing,
    isSelectedSyncing,
    handleBulkSync,
    handleSelectedLeadsSync,
    syncSingleLead,
    processAndApplySyncResults,
  };
}

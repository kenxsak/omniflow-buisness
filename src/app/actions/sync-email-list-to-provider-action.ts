'use server';

import { getServerEmailContacts, getServerEmailLists } from '@/lib/email-list-data-server';
import { addOrUpdateBrevoContact, createBrevoList, bulkImportContactsToBrevoList } from '@/services/brevo';
import { addOrUpdateSenderContact, createSenderGroup } from '@/lib/sender-client';
import { 
  getSuppressedEmails, 
  createSyncAuditLog, 
  completeSyncAuditLog,
  upsertContactSyncState,
  getContactsNeedingSync
} from '@/lib/email-suppression-server';

interface SyncToProviderResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  suppressedCount?: number;
  providerListId?: string | number;
  providerListName?: string;
  errorMessage?: string;
  auditLogId?: string;
  skippedReasons?: {
    noEmail?: number;
    invalidEmail?: number;
    suppressed?: number;
    alreadySynced?: number;
    failed?: number;
  };
}

export async function syncEmailListToBrevoAction(
  listId: string,
  companyId: string,
  brevoApiKey: string,
  brevoListId?: number,
  createNewList?: boolean,
  deltaSync?: boolean
): Promise<SyncToProviderResult> {
  const startTime = Date.now();
  let auditLogId: string | null = null;

  try {
    if (!listId || !companyId) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errorMessage: 'Invalid list or company ID',
      };
    }

    if (!brevoApiKey) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errorMessage: 'Brevo API Key not configured',
      };
    }

    const [allContacts, lists, suppressedEmails] = await Promise.all([
      getServerEmailContacts(listId, companyId),
      getServerEmailLists(companyId),
      getSuppressedEmails(companyId),
    ]);

    const internalList = lists.find(l => l.id === listId);

    if (allContacts.length === 0) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errorMessage: 'No contacts found in this list',
      };
    }

    let contacts = allContacts;
    let alreadySyncedCount = 0;
    
    if (deltaSync) {
      const contactsNeedingSync = await getContactsNeedingSync(companyId, listId, 'brevo');
      const needsSyncIds = new Set(contactsNeedingSync.map(c => c.contactId));
      
      const filtered = allContacts.filter(c => needsSyncIds.has(c.id));
      alreadySyncedCount = allContacts.length - filtered.length;
      contacts = filtered;
    }

    let targetListId = brevoListId;
    let targetListName = '';

    if (createNewList || !brevoListId) {
      const newListName = `${internalList?.name || 'CRM List'} - ${new Date().toLocaleDateString()}`;
      
      const createResult = await createBrevoList(brevoApiKey, newListName);
      if (!createResult.success || !createResult.listId) {
        return {
          success: false,
          syncedCount: 0,
          skippedCount: contacts.length,
          errorMessage: createResult.error || 'Failed to create list in Brevo',
        };
      }
      
      targetListId = createResult.listId;
      targetListName = newListName;
    }

    if (!targetListId) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: contacts.length,
        errorMessage: 'No target list ID available',
      };
    }

    auditLogId = await createSyncAuditLog(companyId, {
      listId,
      listName: internalList?.name || 'Unknown List',
      provider: 'brevo',
      providerListId: targetListId,
      syncType: deltaSync ? 'delta' : 'full',
      status: 'started',
      totalContacts: contacts.length,
      syncedCount: 0,
      skippedCount: 0,
      suppressedCount: 0,
      failedCount: 0,
    });

    let noEmailCount = 0;
    let invalidEmailCount = 0;
    let suppressedCount = 0;
    const skippedContacts: Array<{ id: string; email: string; reason: string }> = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const contactsToImport = contacts
      .filter(c => {
        if (!c.email) {
          noEmailCount++;
          skippedContacts.push({ id: c.id, email: '', reason: 'no_email' });
          return false;
        }
        if (!emailRegex.test(c.email)) {
          invalidEmailCount++;
          skippedContacts.push({ id: c.id, email: c.email, reason: 'invalid_email' });
          return false;
        }
        if (c.status !== 'active') {
          suppressedCount++;
          skippedContacts.push({ id: c.id, email: c.email, reason: 'inactive' });
          return false;
        }
        if (suppressedEmails.has(c.email.toLowerCase())) {
          suppressedCount++;
          skippedContacts.push({ id: c.id, email: c.email, reason: 'suppressed' });
          return false;
        }
        return true;
      })
      .map(contact => ({
        email: contact.email.toLowerCase(),
        attributes: {
          FIRSTNAME: contact.name?.split(' ')[0] || '',
          LASTNAME: contact.name?.split(' ').slice(1).join(' ') || '',
          PHONE: contact.phone || '',
          COMPANY: contact.company || '',
        },
        _contactId: contact.id,
      }));

    for (const skipped of skippedContacts) {
      await upsertContactSyncState(companyId, skipped.id, skipped.email || `no-email-${skipped.id}`, 'brevo', {
        syncStatus: 'skipped',
        skipReason: skipped.reason as 'no_email' | 'invalid_email' | 'inactive' | 'suppressed',
      });
    }

    if (contactsToImport.length === 0) {
      if (auditLogId) {
        await completeSyncAuditLog(auditLogId, companyId, {
          status: 'completed',
          syncedCount: 0,
          skippedCount: noEmailCount + invalidEmailCount,
          suppressedCount,
          failedCount: 0,
          durationMs: Date.now() - startTime,
        });
      }
      return {
        success: false,
        syncedCount: 0,
        skippedCount: contacts.length,
        suppressedCount,
        errorMessage: 'No valid active contacts to sync (after suppression filtering)',
        skippedReasons: {
          noEmail: noEmailCount,
          invalidEmail: invalidEmailCount,
          suppressed: suppressedCount,
        },
        auditLogId: auditLogId || undefined,
      };
    }

    const importData = contactsToImport.map(({ _contactId, ...rest }) => rest);
    const importResult = await bulkImportContactsToBrevoList(
      brevoApiKey,
      targetListId,
      importData
    );

    if (!importResult.success) {
      if (auditLogId) {
        await completeSyncAuditLog(auditLogId, companyId, {
          status: 'failed',
          syncedCount: 0,
          skippedCount: noEmailCount + invalidEmailCount,
          suppressedCount,
          failedCount: contactsToImport.length,
          errors: [importResult.error || 'Import failed'],
          durationMs: Date.now() - startTime,
        });
      }
      return {
        success: false,
        syncedCount: 0,
        skippedCount: contacts.length,
        suppressedCount,
        errorMessage: importResult.error || 'Failed to import contacts to Brevo',
        providerListId: targetListId,
        providerListName: targetListName,
        auditLogId: auditLogId || undefined,
      };
    }

    for (const contact of contactsToImport) {
      await upsertContactSyncState(
        companyId,
        contact._contactId,
        contact.email,
        'brevo',
        {
          providerListIds: [targetListId],
          syncStatus: 'synced',
        }
      );
    }

    if (auditLogId) {
      await completeSyncAuditLog(auditLogId, companyId, {
        status: 'completed',
        syncedCount: contactsToImport.length,
        skippedCount: noEmailCount + invalidEmailCount,
        suppressedCount,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      });
    }

    return {
      success: true,
      syncedCount: contactsToImport.length,
      skippedCount: noEmailCount + invalidEmailCount + alreadySyncedCount,
      suppressedCount,
      providerListId: targetListId,
      providerListName: targetListName,
      auditLogId: auditLogId || undefined,
      skippedReasons: {
        noEmail: noEmailCount,
        invalidEmail: invalidEmailCount,
        suppressed: suppressedCount,
        alreadySynced: alreadySyncedCount,
      },
    };
  } catch (error: any) {
    console.error('Error in syncEmailListToBrevoAction:', error);
    
    if (auditLogId) {
      await completeSyncAuditLog(auditLogId, companyId, {
        status: 'failed',
        syncedCount: 0,
        skippedCount: 0,
        suppressedCount: 0,
        failedCount: 0,
        errors: [error.message],
        durationMs: Date.now() - startTime,
      });
    }

    return {
      success: false,
      syncedCount: 0,
      skippedCount: 0,
      errorMessage: error.message || 'An unexpected error occurred',
      auditLogId: auditLogId || undefined,
    };
  }
}

export async function syncEmailListToSenderAction(
  listId: string,
  companyId: string,
  senderApiKey: string,
  senderListId?: string,
  createNewList?: boolean,
  deltaSync?: boolean
): Promise<SyncToProviderResult> {
  const startTime = Date.now();
  let auditLogId: string | null = null;

  try {
    if (!listId || !companyId) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errorMessage: 'Invalid list or company ID',
      };
    }

    if (!senderApiKey) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errorMessage: 'Sender.net API Key not configured',
      };
    }

    const [allContacts, lists, suppressedEmails] = await Promise.all([
      getServerEmailContacts(listId, companyId),
      getServerEmailLists(companyId),
      getSuppressedEmails(companyId),
    ]);

    const internalList = lists.find(l => l.id === listId);

    if (allContacts.length === 0) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errorMessage: 'No contacts found in this list',
      };
    }

    let targetListId = senderListId;
    let targetListName = '';

    if (createNewList || !senderListId) {
      const newListName = `${internalList?.name || 'CRM List'} - ${new Date().toLocaleDateString()}`;
      
      const createResult = await createSenderGroup(senderApiKey, newListName);
      if (!createResult.success || !createResult.groupId) {
        return {
          success: false,
          syncedCount: 0,
          skippedCount: allContacts.length,
          errorMessage: createResult.error || 'Failed to create list in Sender.net',
        };
      }
      
      targetListId = createResult.groupId;
      targetListName = newListName;
    }

    if (!targetListId) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: allContacts.length,
        errorMessage: 'No target list ID available',
      };
    }

    let contacts = allContacts;
    let alreadySyncedCount = 0;
    
    if (deltaSync) {
      const contactsNeedingSync = await getContactsNeedingSync(companyId, listId, 'sender');
      const needsSyncIds = new Set(contactsNeedingSync.map(c => c.contactId));
      
      const filtered = allContacts.filter(c => needsSyncIds.has(c.id));
      alreadySyncedCount = allContacts.length - filtered.length;
      contacts = filtered;
    }

    auditLogId = await createSyncAuditLog(companyId, {
      listId,
      listName: internalList?.name || 'Unknown List',
      provider: 'sender',
      providerListId: targetListId,
      syncType: deltaSync ? 'delta' : 'full',
      status: 'started',
      totalContacts: contacts.length,
      syncedCount: 0,
      skippedCount: 0,
      suppressedCount: 0,
      failedCount: 0,
    });

    let syncedCount = 0;
    let noEmailCount = 0;
    let invalidEmailCount = 0;
    let suppressedCount = 0;
    let failedCount = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const contact of contacts) {
      const email = contact.email?.trim().toLowerCase();
      
      if (!email) {
        noEmailCount++;
        await upsertContactSyncState(companyId, contact.id, `no-email-${contact.id}`, 'sender', {
          syncStatus: 'skipped',
          skipReason: 'no_email',
        });
        continue;
      }

      if (!emailRegex.test(email)) {
        invalidEmailCount++;
        await upsertContactSyncState(companyId, contact.id, email, 'sender', {
          syncStatus: 'skipped',
          skipReason: 'invalid_email',
        });
        continue;
      }

      if (contact.status !== 'active') {
        suppressedCount++;
        await upsertContactSyncState(companyId, contact.id, email, 'sender', {
          syncStatus: 'skipped',
          skipReason: 'inactive',
        });
        continue;
      }

      if (suppressedEmails.has(email)) {
        suppressedCount++;
        await upsertContactSyncState(companyId, contact.id, email, 'sender', {
          syncStatus: 'skipped',
          skipReason: 'suppressed',
        });
        continue;
      }

      try {
        const result = await addOrUpdateSenderContact(senderApiKey, {
          email,
          firstname: contact.name?.split(' ')[0] || '',
          lastname: contact.name?.split(' ').slice(1).join(' ') || '',
          fields: {
            phone: contact.phone || '',
            company: contact.company || '',
          },
          groups: [targetListId],
        });

        if (result.success) {
          syncedCount++;
          
          await upsertContactSyncState(
            companyId,
            contact.id,
            email,
            'sender',
            {
              providerContactId: result.id,
              providerListIds: [targetListId],
              syncStatus: 'synced',
            }
          );
        } else {
          failedCount++;
          
          await upsertContactSyncState(
            companyId,
            contact.id,
            email,
            'sender',
            {
              syncStatus: 'failed',
              lastError: result.message,
            }
          );
        }
      } catch (error: any) {
        console.error('Failed to sync contact to Sender.net:', error);
        failedCount++;
      }
    }

    if (auditLogId) {
      await completeSyncAuditLog(auditLogId, companyId, {
        status: failedCount > 0 && syncedCount > 0 ? 'partial' : failedCount > 0 ? 'failed' : 'completed',
        syncedCount,
        skippedCount: noEmailCount + invalidEmailCount,
        suppressedCount,
        failedCount,
        durationMs: Date.now() - startTime,
      });
    }

    return {
      success: true,
      syncedCount,
      skippedCount: noEmailCount + invalidEmailCount + failedCount + alreadySyncedCount,
      suppressedCount,
      providerListId: targetListId,
      providerListName: targetListName || undefined,
      auditLogId: auditLogId || undefined,
      skippedReasons: {
        noEmail: noEmailCount,
        invalidEmail: invalidEmailCount,
        suppressed: suppressedCount,
        failed: failedCount,
        alreadySynced: alreadySyncedCount,
      },
    };
  } catch (error: any) {
    console.error('Error in syncEmailListToSenderAction:', error);
    
    if (auditLogId) {
      await completeSyncAuditLog(auditLogId, companyId, {
        status: 'failed',
        syncedCount: 0,
        skippedCount: 0,
        suppressedCount: 0,
        failedCount: 0,
        errors: [error.message],
        durationMs: Date.now() - startTime,
      });
    }

    return {
      success: false,
      syncedCount: 0,
      skippedCount: 0,
      errorMessage: error.message || 'An unexpected error occurred',
      auditLogId: auditLogId || undefined,
    };
  }
}

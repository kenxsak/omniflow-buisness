"use server";

import type { EmailSuppressionEntry, SuppressionReason, SuppressionSource, EmailSyncAuditLog, ContactSyncState, DeliveryProvider } from '@/types/email-lists';
import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const suppressionCol = (companyId: string) => adminDb!.collection('companies').doc(companyId).collection('emailSuppressions');
const syncAuditCol = (companyId: string) => adminDb!.collection('companies').doc(companyId).collection('emailSyncAuditLogs');
const contactSyncStateCol = (companyId: string) => adminDb!.collection('companies').doc(companyId).collection('contactSyncStates');
const emailContactsCol = (companyId: string) => adminDb!.collection('companies').doc(companyId).collection('emailContacts');

export async function isEmailSuppressed(email: string, companyId: string): Promise<boolean> {
  if (!adminDb || !companyId || !email) return false;
  const cleanEmail = email.toLowerCase().trim();
  const snapshot = await suppressionCol(companyId)
    .where('email', '==', cleanEmail)
    .limit(1)
    .get();
  return !snapshot.empty;
}

export async function getSuppressedEmails(companyId: string): Promise<Set<string>> {
  if (!adminDb || !companyId) return new Set();
  const snapshot = await suppressionCol(companyId).get();
  return new Set(snapshot.docs.map(doc => doc.data().email?.toLowerCase()));
}

export async function getSuppressionEntry(email: string, companyId: string): Promise<EmailSuppressionEntry | null> {
  if (!adminDb || !companyId || !email) return null;
  const cleanEmail = email.toLowerCase().trim();
  const snapshot = await suppressionCol(companyId)
    .where('email', '==', cleanEmail)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as EmailSuppressionEntry;
}

export async function getSuppressionList(companyId: string, options?: {
  reason?: SuppressionReason;
  source?: SuppressionSource;
  limit?: number;
  offset?: number;
}): Promise<{ entries: EmailSuppressionEntry[]; total: number }> {
  if (!adminDb || !companyId) return { entries: [], total: 0 };

  let query = suppressionCol(companyId).orderBy('createdAt', 'desc');

  if (options?.reason) {
    query = query.where('reason', '==', options.reason);
  }
  if (options?.source) {
    query = query.where('source', '==', options.source);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.offset(options.offset);
  }

  const snapshot = await query.get();
  const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailSuppressionEntry));
  
  const countSnapshot = await suppressionCol(companyId).count().get();
  const total = countSnapshot.data().count;

  return { entries, total };
}

export interface AddSuppressionResult {
  success: boolean;
  isNew: boolean;
  suppressionId?: string;
  error?: string;
}

export async function addToSuppressionList(
  email: string,
  companyId: string,
  reason: SuppressionReason,
  source: SuppressionSource,
  metadata?: {
    providerEventId?: string;
    campaignId?: string;
    messageId?: string;
    extra?: Record<string, any>;
  }
): Promise<AddSuppressionResult> {
  if (!adminDb || !companyId || !email) {
    return { success: false, isNew: false, error: 'Invalid parameters' };
  }

  const cleanEmail = email.toLowerCase().trim();
  
  try {
    const existing = await getSuppressionEntry(cleanEmail, companyId);
    if (existing) {
      await suppressionCol(companyId).doc(existing.id).update({
        reason,
        source,
        providerEventId: metadata?.providerEventId,
        campaignId: metadata?.campaignId,
        messageId: metadata?.messageId,
        metadata: metadata?.extra,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: true, isNew: false, suppressionId: existing.id };
    }

    const docRef = await suppressionCol(companyId).add({
      email: cleanEmail,
      reason,
      source,
      providerEventId: metadata?.providerEventId,
      campaignId: metadata?.campaignId,
      messageId: metadata?.messageId,
      metadata: metadata?.extra,
      createdAt: FieldValue.serverTimestamp(),
    });

    await updateContactStatusFromSuppression(cleanEmail, companyId, reason);

    return { success: true, isNew: true, suppressionId: docRef.id };
  } catch (error: any) {
    console.error('Error adding to suppression list:', error);
    return { success: false, isNew: false, error: error.message };
  }
}

export async function removeFromSuppressionList(email: string, companyId: string): Promise<boolean> {
  if (!adminDb || !companyId || !email) return false;
  
  const cleanEmail = email.toLowerCase().trim();
  
  try {
    const snapshot = await suppressionCol(companyId)
      .where('email', '==', cleanEmail)
      .get();
    
    if (snapshot.empty) return false;

    const batch = adminDb!.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return true;
  } catch (error) {
    console.error('Error removing from suppression list:', error);
    return false;
  }
}

async function updateContactStatusFromSuppression(
  email: string,
  companyId: string,
  reason: SuppressionReason
): Promise<void> {
  if (!adminDb || !companyId) return;

  const newStatus = reason === 'unsubscribe' || reason === 'complaint' 
    ? 'unsubscribed' 
    : reason.includes('bounce') 
      ? 'bounced' 
      : 'unsubscribed';

  try {
    const contactsSnapshot = await emailContactsCol(companyId)
      .where('email', '==', email)
      .get();

    const batch = adminDb!.batch();
    contactsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: newStatus, updatedAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();
  } catch (error) {
    console.error('Error updating contact status:', error);
  }
}

export interface BulkSuppressionResult {
  processed: number;
  added: number;
  updated: number;
  failed: number;
  errors: string[];
}

export async function bulkAddToSuppressionList(
  entries: Array<{
    email: string;
    reason: SuppressionReason;
    source: SuppressionSource;
    providerEventId?: string;
    campaignId?: string;
  }>,
  companyId: string
): Promise<BulkSuppressionResult> {
  const result: BulkSuppressionResult = {
    processed: 0,
    added: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  if (!adminDb || !companyId || !entries.length) {
    return result;
  }

  for (const entry of entries) {
    try {
      const addResult = await addToSuppressionList(
        entry.email,
        companyId,
        entry.reason,
        entry.source,
        {
          providerEventId: entry.providerEventId,
          campaignId: entry.campaignId,
        }
      );

      result.processed++;
      if (addResult.success) {
        if (addResult.isNew) {
          result.added++;
        } else {
          result.updated++;
        }
      } else {
        result.failed++;
        if (addResult.error) {
          result.errors.push(`${entry.email}: ${addResult.error}`);
        }
      }
    } catch (error: any) {
      result.failed++;
      result.errors.push(`${entry.email}: ${error.message}`);
    }
  }

  return result;
}

export async function createSyncAuditLog(
  companyId: string,
  data: Omit<EmailSyncAuditLog, 'id' | 'startedAt'>
): Promise<string | null> {
  if (!adminDb || !companyId) return null;

  try {
    const docRef = await syncAuditCol(companyId).add({
      ...data,
      startedAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating sync audit log:', error);
    return null;
  }
}

export async function completeSyncAuditLog(
  auditLogId: string,
  companyId: string,
  updates: {
    status: 'completed' | 'failed' | 'partial';
    syncedCount: number;
    skippedCount: number;
    suppressedCount: number;
    failedCount: number;
    errors?: string[];
    durationMs: number;
  }
): Promise<void> {
  if (!adminDb || !companyId || !auditLogId) return;

  try {
    await syncAuditCol(companyId).doc(auditLogId).update({
      ...updates,
      completedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error completing sync audit log:', error);
  }
}

export async function getSyncAuditLogs(
  companyId: string,
  limit: number = 50
): Promise<EmailSyncAuditLog[]> {
  if (!adminDb || !companyId) return [];

  const snapshot = await syncAuditCol(companyId)
    .orderBy('startedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailSyncAuditLog));
}

export async function getContactSyncState(
  contactId: string,
  provider: 'brevo' | 'sender',
  companyId: string
): Promise<ContactSyncState | null> {
  if (!adminDb || !companyId) return null;

  const snapshot = await contactSyncStateCol(companyId)
    .where('contactId', '==', contactId)
    .where('provider', '==', provider)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ContactSyncState;
}

export async function upsertContactSyncState(
  companyId: string,
  contactId: string,
  email: string,
  provider: 'brevo' | 'sender',
  updates: {
    providerContactId?: string | number;
    providerListIds?: (string | number)[];
    syncStatus: 'synced' | 'pending' | 'failed' | 'dirty' | 'skipped';
    skipReason?: 'no_email' | 'invalid_email' | 'inactive' | 'suppressed';
    lastError?: string;
  }
): Promise<void> {
  if (!adminDb || !companyId) return;

  try {
    const existing = await getContactSyncState(contactId, provider, companyId);

    if (existing) {
      await contactSyncStateCol(companyId).doc(existing.id).update({
        ...updates,
        lastSyncedAt: FieldValue.serverTimestamp(),
        version: FieldValue.increment(1),
      });
    } else {
      await contactSyncStateCol(companyId).add({
        contactId,
        email: email.toLowerCase(),
        provider,
        ...updates,
        lastSyncedAt: FieldValue.serverTimestamp(),
        version: 1,
      });
    }
  } catch (error) {
    console.error('Error upserting contact sync state:', error);
  }
}

export async function getContactsNeedingSync(
  companyId: string,
  listId: string,
  provider: 'brevo' | 'sender',
  lastSyncedBefore?: Date
): Promise<Array<{ contactId: string; email: string; name: string }>> {
  if (!adminDb || !companyId || !listId) return [];

  const activeContacts = await emailContactsCol(companyId)
    .where('listId', '==', listId)
    .where('status', '==', 'active')
    .get();

  const syncStates = await contactSyncStateCol(companyId)
    .where('provider', '==', provider)
    .get();

  const syncStateMap = new Map<string, ContactSyncState>();
  syncStates.docs.forEach(doc => {
    const data = doc.data() as ContactSyncState;
    syncStateMap.set(data.contactId, data);
  });

  const contactsNeedingSync: Array<{ contactId: string; email: string; name: string }> = [];

  for (const doc of activeContacts.docs) {
    const contact = doc.data();
    const syncState = syncStateMap.get(doc.id);

    const needsSync = !syncState || 
      syncState.syncStatus === 'dirty' || 
      syncState.syncStatus === 'pending' ||
      (lastSyncedBefore && syncState.lastSyncedAt?.toDate() < lastSyncedBefore);

    if (needsSync) {
      contactsNeedingSync.push({
        contactId: doc.id,
        email: contact.email,
        name: contact.name,
      });
    }
  }

  return contactsNeedingSync;
}

export async function markContactsDirty(
  companyId: string,
  contactIds: string[],
  provider: 'brevo' | 'sender'
): Promise<void> {
  if (!adminDb || !companyId || !contactIds.length) return;

  try {
    for (const contactId of contactIds) {
      const existing = await getContactSyncState(contactId, provider, companyId);
      if (existing) {
        await contactSyncStateCol(companyId).doc(existing.id).update({
          syncStatus: 'dirty',
        });
      }
    }
  } catch (error) {
    console.error('Error marking contacts dirty:', error);
  }
}

export async function getSuppressionStats(companyId: string): Promise<{
  total: number;
  byReason: Record<SuppressionReason, number>;
  bySource: Record<SuppressionSource, number>;
  last7Days: number;
  last30Days: number;
}> {
  if (!adminDb || !companyId) {
    return {
      total: 0,
      byReason: { unsubscribe: 0, hard_bounce: 0, soft_bounce: 0, complaint: 0, manual: 0, invalid_email: 0 },
      bySource: { brevo: 0, sender: 0, smtp: 0, manual: 0, system: 0 },
      last7Days: 0,
      last30Days: 0,
    };
  }

  const snapshot = await suppressionCol(companyId).get();
  
  const stats = {
    total: snapshot.size,
    byReason: { unsubscribe: 0, hard_bounce: 0, soft_bounce: 0, complaint: 0, manual: 0, invalid_email: 0 } as Record<SuppressionReason, number>,
    bySource: { brevo: 0, sender: 0, smtp: 0, manual: 0, system: 0 } as Record<SuppressionSource, number>,
    last7Days: 0,
    last30Days: 0,
  };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    
    if (data.reason && stats.byReason[data.reason as SuppressionReason] !== undefined) {
      stats.byReason[data.reason as SuppressionReason]++;
    }
    
    if (data.source && stats.bySource[data.source as SuppressionSource] !== undefined) {
      stats.bySource[data.source as SuppressionSource]++;
    }

    const createdAt = data.createdAt?.toDate?.();
    if (createdAt) {
      if (createdAt >= sevenDaysAgo) stats.last7Days++;
      if (createdAt >= thirtyDaysAgo) stats.last30Days++;
    }
  });

  return stats;
}

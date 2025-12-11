/**
 * Messaging Campaigns Firestore Data Layer
 * Handles WhatsApp and SMS campaign persistence
 * 
 * IMPORTANT: Recipients are stored in subcollections to avoid Firestore's 1 MB document limit
 * - Campaign metadata: companies/{companyId}/whatsapp_campaigns/{campaignId}
 * - Recipients: companies/{companyId}/whatsapp_campaigns/{campaignId}/recipients/{recipientId}
 */

import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  getDoc,
  Timestamp,
  writeBatch,
  limit as firestoreLimit,
  CollectionReference
} from 'firebase/firestore';
import type { WhatsAppCampaign, SMSCampaign, WhatsAppRecipient, SMSRecipient } from '@/types/messaging';

// ===== Collection References =====

const whatsappCampaignsCol = (companyId: string) => 
  collection(db!, 'companies', companyId, 'whatsapp_campaigns');

const whatsappRecipientsCol = (companyId: string, campaignId: string) =>
  collection(db!, 'companies', companyId, 'whatsapp_campaigns', campaignId, 'recipients') as CollectionReference<WhatsAppRecipient>;

const smsCampaignsCol = (companyId: string) => 
  collection(db!, 'companies', companyId, 'sms_campaigns');

const smsRecipientsCol = (companyId: string, campaignId: string) =>
  collection(db!, 'companies', companyId, 'sms_campaigns', campaignId, 'recipients') as CollectionReference<SMSRecipient>;

// ===== Helper Functions =====

/**
 * Convert Firestore Timestamp to ISO string
 */
function timestampToISO(timestamp: any): string | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString();
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return undefined;
}

/**
 * Add recipients to a campaign in batches (max 500 per batch)
 */
async function addRecipientsBatch(
  recipientsCol: ReturnType<typeof whatsappRecipientsCol>,
  recipients: (WhatsAppRecipient | SMSRecipient)[]
): Promise<void> {
  if (!db || !recipients.length) return;
  
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchRecipients = recipients.slice(i, i + BATCH_SIZE);
    
    batchRecipients.forEach(recipient => {
      const recipientRef = doc(recipientsCol);
      batch.set(recipientRef, {
        ...recipient,
        status: recipient.status || 'pending',
        createdAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  }
}

/**
 * Get all recipients for a campaign
 */
async function getRecipients<T extends WhatsAppRecipient | SMSRecipient>(
  recipientsCol: CollectionReference<T>
): Promise<T[]> {
  if (!db) return [];
  
  const recipientsSnapshot = await getDocs(recipientsCol);
  return recipientsSnapshot.docs.map(doc => {
    const data = doc.data();
    return { 
      ...data, 
      id: doc.id,
      createdAt: timestampToISO(data.createdAt),
      updatedAt: timestampToISO(data.updatedAt),
      sentAt: timestampToISO(data.sentAt),
      deliveredAt: timestampToISO(data.deliveredAt),
      readAt: 'readAt' in data ? timestampToISO((data as any).readAt) : undefined,
    };
  });
}

// ===== WhatsApp Campaign Functions =====

/**
 * Get all WhatsApp campaigns for a company (without recipients)
 */
export async function getWhatsAppCampaigns(companyId: string): Promise<WhatsAppCampaign[]> {
  if (!db || !companyId) return [];
  
  const campaignsSnapshot = await getDocs(
    query(whatsappCampaignsCol(companyId))
  );
  
  const campaigns = campaignsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      recipients: [], // Recipients loaded separately
      createdAt: timestampToISO(data.createdAt) || new Date().toISOString(),
      sentAt: timestampToISO(data.sentAt),
      scheduledAt: timestampToISO(data.scheduledAt),
    } as unknown as WhatsAppCampaign;
  });
  
  // Sort client-side temporarily until Firestore indexes are deployed
  return campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get a single WhatsApp campaign by ID with recipients
 */
export async function getWhatsAppCampaign(
  companyId: string, 
  campaignId: string,
  includeRecipients: boolean = true
): Promise<WhatsAppCampaign | null> {
  if (!db || !companyId || !campaignId) return null;
  
  const campaignDoc = await getDoc(
    doc(db, 'companies', companyId, 'whatsapp_campaigns', campaignId)
  );
  
  if (!campaignDoc.exists()) return null;
  
  const data = campaignDoc.data();
  
  // Load recipients if requested
  let recipients: WhatsAppRecipient[] = [];
  if (includeRecipients) {
    recipients = await getRecipients<WhatsAppRecipient>(
      whatsappRecipientsCol(companyId, campaignId)
    );
  }
  
  return {
    ...data,
    id: campaignDoc.id,
    recipients,
    createdAt: timestampToISO(data.createdAt) || new Date().toISOString(),
    sentAt: timestampToISO(data.sentAt),
    scheduledAt: timestampToISO(data.scheduledAt),
  } as WhatsAppCampaign;
}

/**
 * Get recipients for a WhatsApp campaign
 */
export async function getWhatsAppCampaignRecipients(
  companyId: string,
  campaignId: string
): Promise<WhatsAppRecipient[]> {
  if (!db || !companyId || !campaignId) return [];
  return getRecipients<WhatsAppRecipient>(whatsappRecipientsCol(companyId, campaignId));
}

/**
 * Add a new WhatsApp campaign
 */
export async function addWhatsAppCampaign(
  campaign: Omit<WhatsAppCampaign, 'id' | 'createdAt'>
): Promise<WhatsAppCampaign | null> {
  if (!db || !campaign.companyId) return null;
  
  // Separate recipients from campaign data
  const { recipients, ...campaignMetadata } = campaign;
  
  const campaignData = {
    ...campaignMetadata,
    createdAt: serverTimestamp(),
    scheduledAt: campaign.scheduledAt ? Timestamp.fromDate(new Date(campaign.scheduledAt)) : null,
    stats: campaign.stats || {
      total: recipients.length,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      replied: 0,
    }
  };
  
  // Create campaign document
  const docRef = await addDoc(
    whatsappCampaignsCol(campaign.companyId),
    campaignData
  );
  
  // Add recipients to subcollection
  await addRecipientsBatch(
    whatsappRecipientsCol(campaign.companyId, docRef.id),
    recipients
  );
  
  return {
    ...campaign,
    id: docRef.id,
    createdAt: new Date().toISOString(),
    stats: campaignData.stats,
  };
}

/**
 * Update a WhatsApp campaign (metadata only, not recipients)
 */
export async function updateWhatsAppCampaign(
  companyId: string,
  campaignId: string,
  updates: Partial<WhatsAppCampaign>
): Promise<void> {
  if (!db || !companyId || !campaignId) return;
  
  const campaignRef = doc(db, 'companies', companyId, 'whatsapp_campaigns', campaignId);
  
  // Remove immutable fields and recipients
  const { id, createdAt, recipients, ...dataToUpdate } = updates as any;
  
  // Convert ISO strings to Timestamps for temporal fields
  const preparedUpdates: any = { ...dataToUpdate };
  if (dataToUpdate.sentAt) {
    preparedUpdates.sentAt = Timestamp.fromDate(new Date(dataToUpdate.sentAt));
  }
  if (dataToUpdate.scheduledAt) {
    preparedUpdates.scheduledAt = Timestamp.fromDate(new Date(dataToUpdate.scheduledAt));
  }
  
  await updateDoc(campaignRef, {
    ...preparedUpdates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update a single recipient's status in a WhatsApp campaign
 */
export async function updateWhatsAppRecipient(
  companyId: string,
  campaignId: string,
  recipientId: string,
  updates: Partial<WhatsAppRecipient>
): Promise<void> {
  if (!db || !companyId || !campaignId || !recipientId) return;
  
  const recipientRef = doc(db, 'companies', companyId, 'whatsapp_campaigns', campaignId, 'recipients', recipientId);
  await updateDoc(recipientRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Update WhatsApp campaign stats
 */
export async function updateWhatsAppCampaignStats(
  companyId: string,
  campaignId: string,
  stats: WhatsAppCampaign['stats']
): Promise<void> {
  if (!db || !companyId || !campaignId) return;
  
  const campaignRef = doc(db, 'companies', companyId, 'whatsapp_campaigns', campaignId);
  await updateDoc(campaignRef, { stats });
}

/**
 * Delete a WhatsApp campaign and all its recipients
 */
export async function deleteWhatsAppCampaign(
  companyId: string,
  campaignId: string
): Promise<void> {
  if (!db || !companyId || !campaignId) return;
  
  // Delete all recipients in batches
  const recipientsSnapshot = await getDocs(
    whatsappRecipientsCol(companyId, campaignId)
  );
  
  const BATCH_SIZE = 500;
  for (let i = 0; i < recipientsSnapshot.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    recipientsSnapshot.docs.slice(i, i + BATCH_SIZE).forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  
  // Delete campaign document
  await deleteDoc(
    doc(db, 'companies', companyId, 'whatsapp_campaigns', campaignId)
  );
}

// ===== SMS Campaign Functions =====

/**
 * Get all SMS campaigns for a company (without recipients)
 */
export async function getSMSCampaigns(companyId: string): Promise<SMSCampaign[]> {
  if (!db || !companyId) return [];
  
  const campaignsSnapshot = await getDocs(
    query(smsCampaignsCol(companyId))
  );
  
  const campaigns = campaignsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      recipients: [], // Recipients loaded separately
      createdAt: timestampToISO(data.createdAt) || new Date().toISOString(),
      sentAt: timestampToISO(data.sentAt),
      scheduledAt: timestampToISO(data.scheduledAt),
    } as unknown as SMSCampaign;
  });
  
  return campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get a single SMS campaign by ID with recipients
 */
export async function getSMSCampaign(
  companyId: string, 
  campaignId: string,
  includeRecipients: boolean = true
): Promise<SMSCampaign | null> {
  if (!db || !companyId || !campaignId) return null;
  
  const campaignDoc = await getDoc(
    doc(db, 'companies', companyId, 'sms_campaigns', campaignId)
  );
  
  if (!campaignDoc.exists()) return null;
  
  const data = campaignDoc.data();
  
  // Load recipients if requested
  let recipients: SMSRecipient[] = [];
  if (includeRecipients) {
    recipients = await getRecipients<SMSRecipient>(
      smsRecipientsCol(companyId, campaignId)
    );
  }
  
  return {
    ...data,
    id: campaignDoc.id,
    recipients,
    createdAt: timestampToISO(data.createdAt) || new Date().toISOString(),
    sentAt: timestampToISO(data.sentAt),
    scheduledAt: timestampToISO(data.scheduledAt),
  } as SMSCampaign;
}

/**
 * Get recipients for an SMS campaign
 */
export async function getSMSCampaignRecipients(
  companyId: string,
  campaignId: string
): Promise<SMSRecipient[]> {
  if (!db || !companyId || !campaignId) return [];
  return getRecipients<SMSRecipient>(smsRecipientsCol(companyId, campaignId));
}

/**
 * Add a new SMS campaign
 */
export async function addSMSCampaign(
  campaign: Omit<SMSCampaign, 'id' | 'createdAt'>
): Promise<SMSCampaign | null> {
  if (!db || !campaign.companyId) return null;
  
  // Separate recipients from campaign data
  const { recipients, ...campaignMetadata } = campaign;
  
  const campaignData = {
    ...campaignMetadata,
    createdAt: serverTimestamp(),
    scheduledAt: campaign.scheduledAt ? Timestamp.fromDate(new Date(campaign.scheduledAt)) : null,
    stats: campaign.stats || {
      total: recipients.length,
      sent: 0,
      delivered: 0,
      failed: 0,
    }
  };
  
  // Create campaign document
  const docRef = await addDoc(
    smsCampaignsCol(campaign.companyId),
    campaignData
  );
  
  // Add recipients to subcollection
  await addRecipientsBatch(
    smsRecipientsCol(campaign.companyId, docRef.id),
    recipients
  );
  
  return {
    ...campaign,
    id: docRef.id,
    createdAt: new Date().toISOString(),
    stats: campaignData.stats,
  };
}

/**
 * Update an SMS campaign (metadata only, not recipients)
 */
export async function updateSMSCampaign(
  companyId: string,
  campaignId: string,
  updates: Partial<SMSCampaign>
): Promise<void> {
  if (!db || !companyId || !campaignId) return;
  
  const campaignRef = doc(db, 'companies', companyId, 'sms_campaigns', campaignId);
  
  // Remove immutable fields and recipients
  const { id, createdAt, recipients, ...dataToUpdate } = updates as any;
  
  // Convert ISO strings to Timestamps for temporal fields
  const preparedUpdates: any = { ...dataToUpdate };
  if (dataToUpdate.sentAt) {
    preparedUpdates.sentAt = Timestamp.fromDate(new Date(dataToUpdate.sentAt));
  }
  if (dataToUpdate.scheduledAt) {
    preparedUpdates.scheduledAt = Timestamp.fromDate(new Date(dataToUpdate.scheduledAt));
  }
  
  await updateDoc(campaignRef, {
    ...preparedUpdates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update a single recipient's status in an SMS campaign
 */
export async function updateSMSRecipient(
  companyId: string,
  campaignId: string,
  recipientId: string,
  updates: Partial<SMSRecipient>
): Promise<void> {
  if (!db || !companyId || !campaignId || !recipientId) return;
  
  const recipientRef = doc(db, 'companies', companyId, 'sms_campaigns', campaignId, 'recipients', recipientId);
  await updateDoc(recipientRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Update SMS campaign stats
 */
export async function updateSMSCampaignStats(
  companyId: string,
  campaignId: string,
  stats: SMSCampaign['stats']
): Promise<void> {
  if (!db || !companyId || !campaignId) return;
  
  const campaignRef = doc(db, 'companies', companyId, 'sms_campaigns', campaignId);
  await updateDoc(campaignRef, { stats });
}

/**
 * Delete an SMS campaign and all its recipients
 */
export async function deleteSMSCampaign(
  companyId: string,
  campaignId: string
): Promise<void> {
  if (!db || !companyId || !campaignId) return;
  
  // Delete all recipients in batches
  const recipientsSnapshot = await getDocs(
    smsRecipientsCol(companyId, campaignId)
  );
  
  const BATCH_SIZE = 500;
  for (let i = 0; i < recipientsSnapshot.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    recipientsSnapshot.docs.slice(i, i + BATCH_SIZE).forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  
  // Delete campaign document
  await deleteDoc(
    doc(db, 'companies', companyId, 'sms_campaigns', campaignId)
  );
}

// ===== Campaign Statistics =====

/**
 * Get campaign statistics for a company (both WhatsApp and SMS)
 */
export async function getCampaignStatistics(companyId: string): Promise<{
  whatsapp: {
    totalCampaigns: number;
    totalMessagesSent: number;
    totalDelivered: number;
    totalRead: number;
    averageReadRate: number;
  };
  sms: {
    totalCampaigns: number;
    totalMessagesSent: number;
    totalDelivered: number;
    averageDeliveryRate: number;
  };
}> {
  if (!db || !companyId) {
    return {
      whatsapp: { totalCampaigns: 0, totalMessagesSent: 0, totalDelivered: 0, totalRead: 0, averageReadRate: 0 },
      sms: { totalCampaigns: 0, totalMessagesSent: 0, totalDelivered: 0, averageDeliveryRate: 0 }
    };
  }
  
  // Get WhatsApp stats
  const whatsappCampaigns = await getWhatsAppCampaigns(companyId);
  const whatsappStats = whatsappCampaigns.reduce(
    (acc, campaign) => {
      acc.totalMessagesSent += campaign.stats.sent;
      acc.totalDelivered += campaign.stats.delivered;
      acc.totalRead += campaign.stats.read;
      return acc;
    },
    { totalMessagesSent: 0, totalDelivered: 0, totalRead: 0 }
  );
  
  // Get SMS stats
  const smsCampaigns = await getSMSCampaigns(companyId);
  const smsStats = smsCampaigns.reduce(
    (acc, campaign) => {
      acc.totalMessagesSent += campaign.stats.sent;
      acc.totalDelivered += campaign.stats.delivered;
      return acc;
    },
    { totalMessagesSent: 0, totalDelivered: 0 }
  );
  
  return {
    whatsapp: {
      totalCampaigns: whatsappCampaigns.length,
      ...whatsappStats,
      averageReadRate: whatsappStats.totalDelivered > 0 
        ? (whatsappStats.totalRead / whatsappStats.totalDelivered) * 100 
        : 0
    },
    sms: {
      totalCampaigns: smsCampaigns.length,
      ...smsStats,
      averageDeliveryRate: smsStats.totalMessagesSent > 0 
        ? (smsStats.totalDelivered / smsStats.totalMessagesSent) * 100 
        : 0
    }
  };
}

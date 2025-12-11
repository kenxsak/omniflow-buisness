
"use client";
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, writeBatch, serverTimestamp, getDoc, limit } from 'firebase/firestore';
import type { AppUser } from '@/types/saas';
import type { Task } from '@/types/task';
import { createAutomationState } from './automations-data';

// --- Type Definitions ---
export interface Lead {
  id: string; // Firestore document ID
  name: string;
  email: string;
  phone?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Won';
  source: string;
  assignedTo?: string;
  lastContacted: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  notes?: string;
  companyId: string; // To scope leads to a company
  brevoSyncStatus?: 'synced' | 'pending' | 'failed' | 'unsynced' | 'syncing';
  brevoContactId?: number;
  brevoErrorMessage?: string;
  hubspotSyncStatus?: 'synced' | 'pending' | 'failed' | 'unsynced' | 'syncing';
  hubspotContactId?: string;
  hubspotErrorMessage?: string;
  attributes?: {
    COMPANY_NAME?: string;
    ROLE?: string;
  };
}

export interface EmailCampaign {
  id: string; // Firestore document ID
  name: string;
  status: 'Draft' | 'Sent' | 'Scheduled' | 'Archived' | 'Sending via Brevo' | 'Sent via Brevo' | 'Failed via Brevo' | 'Sending via Sender.net' | 'Sent via Sender.net' | 'Failed via Sender.net' | 'Failed';
  subject: string;
  senderName: string;
  senderEmail: string;
  content: string;
  companyId: string;
  recipients: string;
  provider?: 'brevo' | 'sender'; // Email provider used for this campaign
  brevoListIds?: (number | string)[]; // Can contain Brevo numeric IDs or Sender.net string IDs
  brevoCampaignId?: string;
  senderCampaignId?: string; // Sender.net campaign ID
  recipientCount?: number;
  sentDate?: any | null; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  lastModified: any; // Firestore Timestamp
  openRate?: number;
  clickRate?: number;
  unsubscribes?: number;
  bounces?: number;
  isAIGenerated?: boolean; // Flag to distinguish AI-generated campaigns
  campaignJobId?: string; // Reference to campaign job for delivery status tracking
}


/**
 * Triggers automations based on lead events.
 * @param triggerType The event type ('newLead' or 'newCustomer').
 * @param lead The lead associated with the event.
 * @returns A result object.
 */
export async function triggerAutomation(
    triggerType: 'newLead' | 'newCustomer',
    lead: Lead
): Promise<{ success: boolean; message: string; }> {
    if (!lead.companyId) return { success: false, message: 'Lead has no company ID.' };
    
    // In a real system, you'd query for automations matching the triggerType.
    // For this demo, we'll hardcode the mapping.
    let automationIdToStart: string | null = null;
    if (triggerType === 'newLead') {
        automationIdToStart = 'new-lead-nurturing';
    } else if (triggerType === 'newCustomer') {
        automationIdToStart = 'customer-onboarding';
    }

    if (automationIdToStart) {
        await createAutomationState(lead.companyId, lead.id, automationIdToStart);
        return { success: true, message: `Automation sequence started for ${lead.name}.` };
    }

    return { success: false, message: 'No automation found for this trigger.' };
}


// --- Leads Functions (Firestore) ---

export async function getStoredLeads(companyId?: string): Promise<Lead[]> {
  if (!db || !companyId) return [];
  try {
    const leadsCol = collection(db, 'leads');
    const q = query(
      leadsCol, 
      where('companyId', '==', companyId)
    );
    const leadSnapshot = await getDocs(q);
    if (leadSnapshot.empty) {
        return [];
    }
    const leads = leadSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
    // Sort client-side temporarily until Firestore indexes are deployed
    return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching leads from Firestore:", error);
    return [];
  }
}

export async function addStoredLead(companyId: string, newLeadData: Omit<Lead, 'id' | 'createdAt' | 'lastContacted' | 'companyId'>): Promise<Lead> {
  if (!db) throw new Error("Firestore is not initialized.");
  const leadWithTimestamps = {
    ...newLeadData,
    companyId,
    createdAt: serverTimestamp(),
    lastContacted: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'leads'), leadWithTimestamps);
  const docSnap = await getDoc(docRef);
  
  const newLead = { id: docSnap.id, ...docSnap.data() } as Lead;

  // After creating the lead, trigger the 'newLead' automation.
  await triggerAutomation('newLead', newLead);

  return newLead;
}

export async function updateStoredLead(leadData: Partial<Lead> & {id: string}): Promise<void> {
  if (!db) return;
  const { id, ...dataToUpdate } = leadData;
  const leadRef = doc(db, 'leads', id);
  const originalLeadSnap = await getDoc(leadRef);
  const originalLead = originalLeadSnap.data() as Lead | undefined;

  await updateDoc(leadRef, {
    ...dataToUpdate,
    lastContacted: serverTimestamp(),
  });

  // Check if status changed to 'Won' to trigger new customer automation
  if (originalLead && originalLead.status !== 'Won' && dataToUpdate.status === 'Won') {
      const updatedLead = { ...originalLead, ...dataToUpdate, id };
      await triggerAutomation('newCustomer', updatedLead);
  }
}

export async function deleteStoredLead(leadId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'leads', leadId));
}

// --- Email Campaigns Functions (Firestore) ---

export async function getStoredEmailCampaigns(companyId?: string): Promise<EmailCampaign[]> {
  if (!db || !companyId) return [];
  try {
    const campaignsCol = collection(db, 'campaigns');
    const q = query(
      campaignsCol, 
      where('companyId', '==', companyId)
    );
    const campaignSnapshot = await getDocs(q);
    if (campaignSnapshot.empty) {
        return [];
    }
    const campaigns = campaignSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailCampaign));
    // Sort client-side temporarily until Firestore indexes are deployed
    return campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching email campaigns from Firestore:", error);
    return [];
  }
}

export async function addStoredEmailCampaign(newCampaignData: Omit<EmailCampaign, 'id' | 'createdAt' | 'lastModified'>): Promise<EmailCampaign> {
    if (!db) throw new Error("Firestore is not initialized.");
    const campaignPayload = {
        ...newCampaignData,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'campaigns'), campaignPayload);
    const docSnap = await getDoc(docRef);
    return { id: docSnap.id, ...docSnap.data() } as EmailCampaign;
}

export async function updateStoredEmailCampaign(updatedData: Partial<EmailCampaign> & {id: string}): Promise<void> {
    if (!db) return;
    const { id, ...dataToUpdate } = updatedData;
    const campaignRef = doc(db, 'campaigns', id);
    await updateDoc(campaignRef, {
        ...dataToUpdate,
        lastModified: serverTimestamp(),
    });
}

export async function deleteStoredEmailCampaign(campaignId: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, 'campaigns', campaignId));
}


// This function is for seeding the DB for the first time for a demo company.
// It should not be called in normal application flow.
export async function seedInitialData(companyId: string, adminEmail: string) {
    if (!db) return;
    const leadsRef = collection(db, "leads");
    
    // Check if data already exists to prevent re-seeding
    const q = query(leadsRef, where("companyId", "==", companyId), limit(1));
    const existingLeads = await getDocs(q);
    if (!existingLeads.empty) {
        console.log("Data already seeded for this company. Skipping.");
        return;
    }

    const batch = writeBatch(db);

    const initialMockLeads: Omit<Lead, 'id' | 'companyId' | 'createdAt' | 'lastContacted'>[] = [
        { name: 'Aisha Sharma', email: 'aisha.sharma@example.com', phone: '+919876543210', status: 'New', source: 'Website Inquiry', assignedTo: adminEmail, notes: 'Interested in the enterprise plan.', brevoSyncStatus: 'unsynced', hubspotSyncStatus: 'unsynced' },
        { name: 'Ben Carter', email: 'ben.carter@example.com', phone: '+14155552671', status: 'Contacted', source: 'Referral', assignedTo: adminEmail, notes: 'Sent initial email.', brevoSyncStatus: 'unsynced', hubspotSyncStatus: 'unsynced' },
        { name: 'Chloe Davis', email: 'chloe.davis@example.com', phone: '+442079460958', status: 'Qualified', source: 'Trade Show', assignedTo: adminEmail, notes: 'Demo scheduled for Friday.', brevoSyncStatus: 'unsynced', hubspotSyncStatus: 'unsynced' },
    ];
    
    initialMockLeads.forEach(lead => {
        const docRef = doc(collection(db!, "leads")); // create a new doc ref
        batch.set(docRef, { ...lead, companyId: companyId, createdAt: serverTimestamp(), lastContacted: serverTimestamp() });
    });

    const initialMockTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>[] = [
        { title: 'Follow up with Aisha Sharma', priority: 'High', status: 'To Do', dueDate: new Date().toISOString(), leadId: '', leadName: 'Aisha Sharma' },
        { title: 'Prepare demo for Chloe Davis', priority: 'Medium', status: 'In Progress', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), leadName: 'Chloe Davis' },
    ];

    initialMockTasks.forEach(task => {
        const docRef = doc(collection(db!, "tasks"));
        batch.set(docRef, { ...task, companyId: companyId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });

     const initialMockCampaign: Omit<EmailCampaign, 'id'| 'createdAt' | 'lastModified'> = {
        name: "Sample Welcome Campaign",
        status: 'Draft',
        subject: "Welcome to the Platform!",
        senderName: "Your Team",
        senderEmail: "welcome@example.com",
        content: "<h1>Welcome, {{ contact.FIRSTNAME }}!</h1><p>We're glad to have you.</p>",
        companyId: companyId,
        recipients: '2',
        brevoListIds: [2],
        recipientCount: 0,
        sentDate: null,
    };
    const campaignDocRef = doc(collection(db!, "campaigns"));
    batch.set(campaignDocRef, {...initialMockCampaign, createdAt: serverTimestamp(), lastModified: serverTimestamp()});

    await batch.commit();
    console.log("Initial Firestore data seeded successfully for company:", companyId);
}

"use server";

import type { EmailList, EmailContact, EmailListType, EmailAutomationSequence, ContactAutomationState } from '@/types/email-lists';
import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const emailListsCol = (companyId: string) => adminDb!.collection('companies').doc(companyId).collection('emailLists');
const emailContactsCol = (companyId: string) => adminDb!.collection('companies').doc(companyId).collection('emailContacts');
const emailAutomationsCol = (companyId: string) => adminDb!.collection('companies').doc(companyId).collection('emailAutomationSequences');
const automationStatesCol = (companyId: string) => adminDb!.collection('companies').doc(companyId).collection('contactAutomationStates');

export async function getServerEmailLists(companyId: string): Promise<EmailList[]> {
    if (!adminDb || !companyId) return [];
    const listsSnapshot = await emailListsCol(companyId).get();
    
    return listsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            description: data.description,
            type: data.type || 'custom',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            companyId: data.companyId,
            contactCount: data.contactCount || 0,
            automationId: data.automationId,
        } as EmailList;
    });
}

export async function getServerEmailContacts(listId: string, companyId: string): Promise<EmailContact[]> {
    if (!adminDb || !companyId || !listId) return [];
    const snapshot = await emailContactsCol(companyId).where('listId', '==', listId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailContact));
}

export async function getServerEmailContactsByStatus(
    companyId: string, 
    status: 'active' | 'unsubscribed' | 'bounced' = 'active'
): Promise<EmailContact[]> {
    if (!adminDb || !companyId) return [];
    const snapshot = await emailContactsCol(companyId).where('status', '==', status).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailContact));
}

export async function getServerEmailAutomations(companyId: string): Promise<EmailAutomationSequence[]> {
    if (!adminDb || !companyId) return [];
    const snapshot = await emailAutomationsCol(companyId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailAutomationSequence));
}

export async function getServerEmailAutomation(automationId: string, companyId: string): Promise<EmailAutomationSequence | null> {
    if (!adminDb || !companyId || !automationId) return null;
    const docRef = emailAutomationsCol(companyId).doc(automationId);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as EmailAutomationSequence;
}

export async function createServerEmailAutomation(
    companyId: string,
    automation: Omit<EmailAutomationSequence, 'id' | 'createdAt' | 'updatedAt'>
): Promise<EmailAutomationSequence | null> {
    if (!adminDb || !companyId) return null;
    
    const docRef = await emailAutomationsCol(companyId).add({
        ...automation,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as EmailAutomationSequence;
}

export async function updateServerEmailAutomation(
    automationId: string,
    companyId: string,
    updates: Partial<EmailAutomationSequence>
): Promise<void> {
    if (!adminDb || !companyId || !automationId) return;
    await emailAutomationsCol(companyId).doc(automationId).update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function getActiveAutomationStates(companyId: string): Promise<ContactAutomationState[]> {
    if (!adminDb || !companyId) return [];
    const now = Timestamp.now();
    const snapshot = await automationStatesCol(companyId)
        .where('status', '==', 'active')
        .where('nextStepTime', '<=', now)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactAutomationState));
}

export async function getContactAutomationState(
    contactId: string, 
    automationId: string, 
    companyId: string
): Promise<ContactAutomationState | null> {
    if (!adminDb || !companyId) return null;
    const snapshot = await automationStatesCol(companyId)
        .where('contactId', '==', contactId)
        .where('automationId', '==', automationId)
        .limit(1)
        .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ContactAutomationState;
}

export async function createContactAutomationState(
    companyId: string,
    state: Omit<ContactAutomationState, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ContactAutomationState | null> {
    if (!adminDb || !companyId) return null;
    
    const docRef = await automationStatesCol(companyId).add({
        ...state,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as ContactAutomationState;
}

export async function updateContactAutomationState(
    stateId: string,
    companyId: string,
    updates: Partial<ContactAutomationState>
): Promise<void> {
    if (!adminDb || !companyId || !stateId) return;
    await automationStatesCol(companyId).doc(stateId).update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function enrollContactInAutomation(
    contact: EmailContact,
    automationId: string,
    companyId: string
): Promise<ContactAutomationState | null> {
    if (!adminDb || !companyId) return null;
    
    const existingState = await getContactAutomationState(contact.id, automationId, companyId);
    if (existingState && existingState.status === 'active') {
        return existingState;
    }
    
    const automation = await getServerEmailAutomation(automationId, companyId);
    if (!automation || automation.status !== 'active') return null;
    
    const firstDelayStep = automation.steps.find(s => s.type === 'delay');
    const delayMs = firstDelayStep 
        ? ((firstDelayStep.delayDays || 0) * 24 * 60 * 60 * 1000) + ((firstDelayStep.delayHours || 0) * 60 * 60 * 1000)
        : 24 * 60 * 60 * 1000;
    
    const nextStepTime = Timestamp.fromMillis(Date.now() + delayMs);
    
    return createContactAutomationState(companyId, {
        contactId: contact.id,
        contactEmail: contact.email,
        listId: contact.listId,
        automationId,
        status: 'active',
        currentStepIndex: 0,
        nextStepTime,
        emailsSentInSequence: 0,
    });
}

export async function markEmailSent(
    contactId: string,
    companyId: string
): Promise<void> {
    if (!adminDb || !companyId || !contactId) return;
    await emailContactsCol(companyId).doc(contactId).update({
        emailsSent: FieldValue.increment(1),
        lastEmailSent: FieldValue.serverTimestamp(),
    });
}

export interface AddEmailContactFromLeadResult {
    success: boolean;
    contactId?: string;
    isExisting?: boolean;
    error?: string;
}

export async function addServerEmailContactFromLead(
    listId: string,
    companyId: string,
    lead: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        companyName?: string;
    }
): Promise<AddEmailContactFromLeadResult> {
    if (!adminDb || !listId || !companyId) {
        return { success: false, error: 'Invalid parameters' };
    }

    if (!lead.email?.trim()) {
        return { success: false, error: 'No email address provided' };
    }

    const cleanedEmail = lead.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanedEmail)) {
        return { success: false, error: 'Invalid email format' };
    }

    try {
        const existingQuery = await emailContactsCol(companyId)
            .where('listId', '==', listId)
            .where('email', '==', cleanedEmail)
            .limit(1)
            .get();

        if (!existingQuery.empty) {
            return { 
                success: true, 
                contactId: existingQuery.docs[0].id, 
                isExisting: true 
            };
        }

        const newContactData = {
            listId,
            leadId: lead.id,
            name: lead.name?.trim() || '',
            email: cleanedEmail,
            phone: lead.phone?.trim() || '',
            company: lead.companyName?.trim() || '',
            tags: [],
            status: 'active' as const,
            createdAt: FieldValue.serverTimestamp(),
            emailsSent: 0,
            source: 'crm_lead',
        };

        const docRef = await emailContactsCol(companyId).add(newContactData);

        await emailListsCol(companyId).doc(listId).update({
            contactCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true, contactId: docRef.id, isExisting: false };
    } catch (error: any) {
        console.error('Error adding email contact from lead:', error);
        return { success: false, error: error.message || 'Failed to add contact' };
    }
}

export async function bulkAddServerEmailContactsFromLeads(
    listId: string,
    companyId: string,
    leads: Array<{
        id: string;
        name: string;
        email: string;
        phone?: string;
        companyName?: string;
    }>
): Promise<{
    success: boolean;
    addedCount: number;
    skippedCount: number;
    skippedReasons: {
        noEmail: number;
        invalidEmail: number;
        duplicate: number;
        failed: number;
    };
}> {
    if (!adminDb || !listId || !companyId || !leads.length) {
        return {
            success: false,
            addedCount: 0,
            skippedCount: leads.length,
            skippedReasons: { noEmail: 0, invalidEmail: 0, duplicate: 0, failed: leads.length }
        };
    }

    let addedCount = 0;
    let noEmailCount = 0;
    let invalidEmailCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    const existingContacts = await emailContactsCol(companyId)
        .where('listId', '==', listId)
        .get();
    const existingEmails = new Set(
        existingContacts.docs.map(doc => doc.data().email?.toLowerCase())
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const lead of leads) {
        const email = lead.email?.trim().toLowerCase();
        
        if (!email) {
            noEmailCount++;
            continue;
        }

        if (!emailRegex.test(email)) {
            invalidEmailCount++;
            continue;
        }

        if (existingEmails.has(email)) {
            duplicateCount++;
            continue;
        }

        try {
            const newContactData = {
                listId,
                leadId: lead.id,
                name: lead.name?.trim() || '',
                email,
                phone: lead.phone?.trim() || '',
                company: lead.companyName?.trim() || '',
                tags: [],
                status: 'active' as const,
                createdAt: FieldValue.serverTimestamp(),
                emailsSent: 0,
                source: 'crm_lead',
            };

            await emailContactsCol(companyId).add(newContactData);
            existingEmails.add(email);
            addedCount++;
        } catch (error) {
            console.error('Failed to add contact:', error);
            failedCount++;
        }
    }

    if (addedCount > 0) {
        try {
            await emailListsCol(companyId).doc(listId).update({
                contactCount: FieldValue.increment(addedCount),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch (error) {
            console.warn('Failed to update contact count:', error);
        }
    }

    return {
        success: true,
        addedCount,
        skippedCount: noEmailCount + invalidEmailCount + duplicateCount + failedCount,
        skippedReasons: {
            noEmail: noEmailCount,
            invalidEmail: invalidEmailCount,
            duplicate: duplicateCount,
            failed: failedCount,
        }
    };
}

"use client";

import type { EmailList, EmailContact, EmailListType } from '@/types/email-lists';
import { db } from './firebase';
import { collection, doc, getDocs, addDoc, writeBatch, query, where, deleteDoc, updateDoc, serverTimestamp, getDoc, increment, Timestamp } from 'firebase/firestore';

const emailListsCol = (companyId: string) => collection(db!, 'companies', companyId, 'emailLists');
const emailContactsCol = (companyId: string) => collection(db!, 'companies', companyId, 'emailContacts');

export async function getEmailLists(companyId: string): Promise<EmailList[]> {
    if (!db || !companyId) return [];
    const listsSnapshot = await getDocs(query(emailListsCol(companyId)));
    
    const lists = listsSnapshot.docs.map(doc => {
        const listData = doc.data();
        return {
            id: doc.id,
            name: listData.name,
            description: listData.description,
            type: listData.type || 'custom',
            createdAt: listData.createdAt,
            updatedAt: listData.updatedAt,
            companyId: listData.companyId,
            contactCount: listData.contactCount || 0,
            automationId: listData.automationId,
        } as EmailList;
    });
    
    return lists.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
    });
}

export async function getEmailList(listId: string, companyId: string): Promise<EmailList | null> {
    if (!db || !companyId || !listId) return null;
    const listRef = doc(db, 'companies', companyId, 'emailLists', listId);
    const listDoc = await getDoc(listRef);
    if (!listDoc.exists()) return null;
    const data = listDoc.data();
    return {
        id: listDoc.id,
        name: data.name,
        description: data.description,
        type: data.type || 'custom',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        companyId: data.companyId,
        contactCount: data.contactCount || 0,
        automationId: data.automationId,
    } as EmailList;
}

export async function addEmailList(
    name: string, 
    companyId: string, 
    type: EmailListType = 'custom',
    description?: string
): Promise<EmailList | null> {
    if (!name.trim() || !companyId || !db) return null;
    const newListData = {
        name: name.trim(),
        description: description?.trim() || '',
        type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        companyId: companyId,
        contactCount: 0,
    };
    const docRef = await addDoc(emailListsCol(companyId), newListData);
    return { ...newListData, id: docRef.id, createdAt: Timestamp.now(), contactCount: 0 } as EmailList;
}

export async function updateEmailList(
    listId: string,
    companyId: string,
    updates: Partial<Pick<EmailList, 'name' | 'description' | 'type' | 'automationId'>>
): Promise<void> {
    if (!db || !companyId || !listId) return;
    const listRef = doc(db, 'companies', companyId, 'emailLists', listId);
    await updateDoc(listRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteEmailList(listId: string, companyId: string): Promise<void> {
    if (!db || !companyId) return;
    
    const batch = writeBatch(db!);
    
    const listRef = doc(db, 'companies', companyId, 'emailLists', listId);
    batch.delete(listRef);

    const contactsQuery = query(emailContactsCol(companyId), where("listId", "==", listId));
    const contactsSnapshot = await getDocs(contactsQuery);
    
    contactsSnapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
    });

    await batch.commit();
}

export async function getEmailContacts(listId: string, companyId: string): Promise<EmailContact[]> {
    if (!db || !companyId || !listId) return [];
    const q = query(emailContactsCol(companyId), where("listId", "==", listId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailContact));
    return contacts.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addEmailContact(
    listId: string, 
    companyId: string, 
    name: string, 
    email: string,
    phone?: string,
    company?: string,
    tags?: string[]
): Promise<EmailContact | null> {
    if (!listId || !companyId || !name.trim() || !email.trim() || !db) return null;
    
    const cleanedEmail = email.trim().toLowerCase();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanedEmail)) {
        throw new Error('Invalid email format');
    }
    
    const duplicateQuery = query(
        emailContactsCol(companyId),
        where("listId", "==", listId),
        where("email", "==", cleanedEmail)
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    
    if (!duplicateSnapshot.empty) {
        const existingDoc = duplicateSnapshot.docs[0];
        return { id: existingDoc.id, ...existingDoc.data() } as EmailContact;
    }
    
    const newContactData = {
        listId,
        name: name.trim(),
        email: cleanedEmail,
        phone: phone?.trim() || '',
        company: company?.trim() || '',
        tags: tags || [],
        status: 'active' as const,
        createdAt: serverTimestamp(),
        emailsSent: 0,
    };

    const docRef = await addDoc(emailContactsCol(companyId), newContactData);
    
    try {
        const listRef = doc(db, 'companies', companyId, 'emailLists', listId);
        await updateDoc(listRef, { contactCount: increment(1), updatedAt: serverTimestamp() });
    } catch (error) {
        console.warn('Failed to update contact count:', error);
    }
    
    return { id: docRef.id, ...newContactData, createdAt: Timestamp.now() } as EmailContact;
}

export async function updateEmailContact(
    contactId: string,
    companyId: string,
    updates: Partial<Pick<EmailContact, 'name' | 'email' | 'phone' | 'company' | 'tags' | 'status'>>
): Promise<void> {
    if (!db || !companyId || !contactId) return;
    const contactRef = doc(db, 'companies', companyId, 'emailContacts', contactId);
    await updateDoc(contactRef, updates);
}

export async function deleteEmailContact(contactId: string, companyId: string): Promise<void> {
    if (!db || !companyId) return;
    
    const contactRef = doc(db, 'companies', companyId, 'emailContacts', contactId);
    const contactDoc = await getDoc(contactRef);
    
    if (contactDoc.exists()) {
        const contactData = contactDoc.data();
        const listId = contactData?.listId;
        
        await deleteDoc(contactRef);
        
        if (listId) {
            try {
                const listRef = doc(db, 'companies', companyId, 'emailLists', listId);
                await updateDoc(listRef, { contactCount: increment(-1), updatedAt: serverTimestamp() });
            } catch (error) {
                console.warn('Failed to update contact count:', error);
            }
        }
    } else {
        await deleteDoc(contactRef);
    }
}

export async function bulkImportEmailContacts(
    listId: string, 
    companyId: string, 
    contacts: { name: string; email: string; phone?: string; company?: string }[]
): Promise<{ added: number; skipped: number; errors: string[] }> {
    if (!db || !companyId || !listId) {
        return { added: 0, skipped: 0, errors: ['Invalid parameters'] };
    }
    
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    const existingContacts = await getEmailContacts(listId, companyId);
    const existingEmails = new Set(existingContacts.map(c => c.email.toLowerCase()));
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const batch = contacts.slice(i, i + BATCH_SIZE);
        
        for (const contact of batch) {
            try {
                const cleanedEmail = contact.email.trim().toLowerCase();
                
                if (!emailRegex.test(cleanedEmail)) {
                    skipped++;
                    continue;
                }
                
                if (existingEmails.has(cleanedEmail)) {
                    skipped++;
                    continue;
                }
                
                const newContactData = {
                    listId,
                    name: contact.name.trim(),
                    email: cleanedEmail,
                    phone: contact.phone?.trim() || '',
                    company: contact.company?.trim() || '',
                    tags: [],
                    status: 'active' as const,
                    createdAt: serverTimestamp(),
                    emailsSent: 0,
                };
                
                await addDoc(emailContactsCol(companyId), newContactData);
                existingEmails.add(cleanedEmail);
                added++;
            } catch (error) {
                errors.push(`Failed to add ${contact.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    
    if (added > 0) {
        try {
            const listRef = doc(db, 'companies', companyId, 'emailLists', listId);
            await updateDoc(listRef, { contactCount: increment(added), updatedAt: serverTimestamp() });
        } catch (error) {
            console.warn('Failed to update bulk contact count:', error);
            errors.push('Contact count may be inaccurate - please refresh');
        }
    }
    
    return { added, skipped, errors };
}

export function getListTypeLabel(type: EmailListType): string {
    switch (type) {
        case 'free-trial': return 'Free Trial Users';
        case 'paid-customer': return 'Paid Customers';
        case 'churned': return 'Churned/Dead Leads';
        case 'newsletter': return 'Newsletter Subscribers';
        case 'prospects': return 'Prospects';
        case 'custom': return 'Custom List';
        default: return 'Unknown';
    }
}

export function getListTypeColor(type: EmailListType): string {
    switch (type) {
        case 'free-trial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'paid-customer': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'churned': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case 'newsletter': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
        case 'prospects': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
        case 'custom': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
        default: return 'bg-gray-100 text-gray-800';
    }
}


"use client";

import type { WhatsAppList, WhatsAppContact } from '@/types/whatsapp';
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, addDoc, writeBatch, query, where, deleteDoc, updateDoc, serverTimestamp, getDoc, orderBy, increment, getCountFromServer } from 'firebase/firestore';


// --- Firestore Collection References ---
const listsCol = (companyId: string) => collection(db!, 'companies', companyId, 'whatsappLists');
const contactsCol = (companyId: string) => collection(db!, 'companies', companyId, 'whatsappContacts');


// --- WhatsApp List Functions (Firestore) ---
export async function getWhatsAppLists(companyId: string): Promise<WhatsAppList[]> {
    if (!db || !companyId) return [];
    const listsSnapshot = await getDocs(query(listsCol(companyId)));
    
    // Use stored contactCount from list document instead of fetching all contacts
    // This is much more memory efficient for large contact lists
    const lists = listsSnapshot.docs.map(doc => {
        const listData = doc.data();
        return {
            id: doc.id,
            name: listData.name,
            createdAt: listData.createdAt,
            companyId: listData.companyId,
            contactCount: listData.contactCount || 0
        } as WhatsAppList;
    });
    
    // Sort client-side temporarily until Firestore indexes are deployed
    return lists.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
    });
}

export async function addWhatsAppList(newListName: string, companyId: string): Promise<WhatsAppList | null> {
    if (!newListName.trim() || !companyId || !db) return null;
    const newListData = {
        name: newListName.trim(),
        createdAt: serverTimestamp(),
        companyId: companyId,
        contactCount: 0,
    };
    const docRef = await addDoc(listsCol(companyId), newListData);
    return { ...newListData, id: docRef.id, createdAt: new Date().toISOString() as any, contactCount: 0 };
}


export async function deleteWhatsAppList(listId: string, companyId: string): Promise<void> {
    if (!db || !companyId) return;
    
    // Start a batch to delete the list and all its contacts
    const batch = writeBatch(db!);
    
    // Delete the list document
    const listRef = doc(db, 'companies', companyId, 'whatsappLists', listId);
    batch.delete(listRef);

    // Query for all contacts in that list
    const contactsQuery = query(contactsCol(companyId), where("listId", "==", listId));
    const contactsSnapshot = await getDocs(contactsQuery);
    
    // Delete each contact in the list
    contactsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


// --- WhatsApp Contact Functions (Firestore) ---
export async function getWhatsAppContacts(listId: string, companyId: string): Promise<WhatsAppContact[]> {
  if (!db || !companyId || !listId) return [];
  const q = query(contactsCol(companyId), where("listId", "==", listId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return [];
  const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppContact));
  // Sort manually after fetching to avoid composite index requirement
  return contacts.sort((a, b) => a.name.localeCompare(b.name));
}


export async function addWhatsAppContact(listId: string, companyId: string, name: string, phoneNumber: string): Promise<WhatsAppContact | null> {
  if (!listId || !companyId || !name.trim() || !phoneNumber.trim() || !db) return null;
  
  const cleanedPhoneNumber = phoneNumber.replace(/\s+/g, ''); // Remove spaces
  
  const duplicateQuery = query(
    contactsCol(companyId),
    where("listId", "==", listId),
    where("phoneNumber", "==", cleanedPhoneNumber)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);
  
  if (!duplicateSnapshot.empty) {
    const existingDoc = duplicateSnapshot.docs[0];
    return { id: existingDoc.id, ...existingDoc.data() } as WhatsAppContact;
  }
  
  const newContactData = {
    listId,
    name: name.trim(),
    phoneNumber: cleanedPhoneNumber,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(contactsCol(companyId), newContactData);
  
  // Update contact count on the list document (memory-efficient approach)
  try {
    const listRef = doc(db, 'companies', companyId, 'whatsappLists', listId);
    await updateDoc(listRef, { contactCount: increment(1) });
  } catch (error) {
    console.warn('Failed to update contact count:', error);
  }
  
  return { id: docRef.id, ...newContactData, createdAt: new Date().toISOString() as any };
}


export async function deleteWhatsAppContact(contactId: string, companyId: string): Promise<void> {
  if (!db || !companyId) return;
  
  // Get the contact first to find its listId
  const contactRef = doc(db, 'companies', companyId, 'whatsappContacts', contactId);
  const contactDoc = await getDoc(contactRef);
  
  if (contactDoc.exists()) {
    const contactData = contactDoc.data();
    const listId = contactData?.listId;
    
    // Delete the contact
    await deleteDoc(contactRef);
    
    // Decrement contact count on the list document
    if (listId) {
      try {
        const listRef = doc(db, 'companies', companyId, 'whatsappLists', listId);
        await updateDoc(listRef, { contactCount: increment(-1) });
      } catch (error) {
        console.warn('Failed to update contact count:', error);
      }
    }
  } else {
    await deleteDoc(contactRef);
  }
}

// Utility function to recalculate and fix contact counts for all lists
// Call this once to migrate existing data
export async function recalculateContactCounts(companyId: string): Promise<void> {
  if (!db || !companyId) return;
  
  const listsSnapshot = await getDocs(listsCol(companyId));
  
  for (const listDoc of listsSnapshot.docs) {
    const listId = listDoc.id;
    const contactsQuery = query(contactsCol(companyId), where("listId", "==", listId));
    const countSnapshot = await getCountFromServer(contactsQuery);
    const count = countSnapshot.data().count;
    
    const listRef = doc(db, 'companies', companyId, 'whatsappLists', listId);
    await updateDoc(listRef, { contactCount: count });
  }
}

// Bulk import contacts with proper count management
// Returns { added: number, skipped: number, errors: string[] }
export async function bulkImportContacts(
  listId: string, 
  companyId: string, 
  contacts: { name: string; phoneNumber: string }[]
): Promise<{ added: number; skipped: number; errors: string[] }> {
  if (!db || !companyId || !listId) {
    return { added: 0, skipped: 0, errors: ['Invalid parameters'] };
  }
  
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  // Get fresh list of existing contacts for duplicate checking
  const existingContacts = await getWhatsAppContacts(listId, companyId);
  const existingPhones = new Set(existingContacts.map(c => c.phoneNumber));
  
  // Process contacts in small batches
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    
    for (const contact of batch) {
      try {
        const cleanedPhone = contact.phoneNumber.replace(/\s+/g, '');
        
        // Check for duplicates using fresh data
        if (existingPhones.has(cleanedPhone)) {
          skipped++;
          continue;
        }
        
        // Add to database without incrementing count yet
        const newContactData = {
          listId,
          name: contact.name.trim(),
          phoneNumber: cleanedPhone,
          createdAt: serverTimestamp(),
        };
        
        await addDoc(contactsCol(companyId), newContactData);
        existingPhones.add(cleanedPhone); // Update local set to catch duplicates in same batch
        added++;
      } catch (error) {
        errors.push(`Failed to add ${contact.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  // Update contact count once at the end (more efficient than N increments)
  if (added > 0) {
    try {
      const listRef = doc(db, 'companies', companyId, 'whatsappLists', listId);
      await updateDoc(listRef, { contactCount: increment(added) });
    } catch (error) {
      console.warn('Failed to update bulk contact count:', error);
      errors.push('Contact count may be inaccurate - please refresh');
    }
  }
  
  return { added, skipped, errors };
}

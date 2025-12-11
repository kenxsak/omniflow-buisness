/**
 * Server-side WhatsApp Marketing Data Access
 * 
 * Server-compatible functions for fetching and updating WhatsApp data from Firestore.
 * These functions use the server Firebase instance and can be called from server actions.
 */

import { serverDb } from '@/lib/firebase-server';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { WhatsAppList, WhatsAppContact } from '@/types/whatsapp';

/**
 * Get all WhatsApp lists for a company (server-side version)
 * Optimized to avoid loading all contacts - uses stored contactCount or counts per list.
 * 
 * @param companyId The company ID to fetch lists for
 * @returns Array of WhatsApp lists with contact counts
 */
export async function getServerWhatsAppLists(companyId: string): Promise<WhatsAppList[]> {
  if (!serverDb || !companyId) {
    console.warn('Server Firebase not initialized or no company ID');
    return [];
  }

  try {
    const listsRef = collection(serverDb, 'companies', companyId, 'whatsappLists');
    const listsSnapshot = await getDocs(listsRef);
    
    if (listsSnapshot.empty) {
      return [];
    }
    
    const lists: WhatsAppList[] = listsSnapshot.docs.map(doc => {
      const listData = { ...doc.data(), id: doc.id } as WhatsAppList;
      return {
        ...listData,
        contactCount: listData.contactCount || 0
      };
    });
    
    return lists.sort((a, b) => {
      const aDate = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? (a.createdAt as any).toDate() : new Date(0);
      const bDate = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? (b.createdAt as any).toDate() : new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
  } catch (error: any) {
    console.error('Error fetching server WhatsApp lists:', error);
    return [];
  }
}

/**
 * Get all contacts for a specific WhatsApp list (server-side version)
 * 
 * @param listId The list ID to fetch contacts for
 * @param companyId The company ID
 * @returns Array of WhatsApp contacts
 */
export async function getServerWhatsAppContacts(listId: string, companyId: string): Promise<WhatsAppContact[]> {
  if (!serverDb || !companyId || !listId) {
    console.warn('Server Firebase not initialized, no company ID, or no list ID');
    return [];
  }

  try {
    const contactsRef = collection(serverDb, 'companies', companyId, 'whatsappContacts');
    const q = query(contactsRef, where('listId', '==', listId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return [];
    
    const contacts: WhatsAppContact[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as WhatsAppContact));
    
    return contacts.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error('Error fetching server WhatsApp contacts:', error);
    return [];
  }
}

/**
 * Add a contact to a WhatsApp list (server-side version)
 * 
 * @param listId The list ID to add the contact to
 * @param companyId The company ID
 * @param name The contact's name
 * @param phoneNumber The contact's phone number (with country code)
 * @returns The added contact or null if failed
 */
export async function addServerWhatsAppContact(
  listId: string,
  companyId: string,
  name: string,
  phoneNumber: string
): Promise<WhatsAppContact | null> {
  if (!serverDb || !listId || !companyId || !name.trim() || !phoneNumber.trim()) {
    console.warn('Missing required parameters for adding WhatsApp contact');
    return null;
  }

  try {
    const contactsRef = collection(serverDb, 'companies', companyId, 'whatsappContacts');
    const cleanedPhoneNumber = phoneNumber.replace(/\s+/g, '');
    
    // Check for duplicates
    const duplicateQuery = query(
      contactsRef,
      where('listId', '==', listId),
      where('phoneNumber', '==', cleanedPhoneNumber)
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
    
    const docRef = await addDoc(contactsRef, newContactData);
    return {
      id: docRef.id,
      ...newContactData,
      createdAt: new Date().toISOString() as any,
    };
  } catch (error: any) {
    console.error('Error adding server WhatsApp contact:', error);
    return null;
  }
}

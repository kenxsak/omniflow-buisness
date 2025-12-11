'use server';

import { adminDb, verifyAuthToken } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { 
  DigitalCard, 
  CreateDigitalCardInput, 
  UpdateDigitalCardInput,
  DigitalCardAnalytics 
} from '@/lib/digital-card-types';
import { calculateDigitalCardLimit, getDigitalCardUpgradeSuggestion } from '@/lib/plan-helpers';

const COLLECTION_NAME = 'digitalCards';

/**
 * Serialize Firestore data to plain objects for Next.js Server Components
 * Converts Firestore Timestamps to ISO strings for client-side compatibility
 * 
 * IMPORTANT: This function converts Timestamp objects (with _seconds/_nanoseconds) 
 * to ISO string format. The DigitalCard interface uses 'any' for timestamp fields
 * (createdAt, updatedAt, analytics.lastUpdated) which allows both Timestamp objects
 * and strings. After serialization, these fields will contain ISO strings.
 * 
 * @param data - The Firestore document data to serialize
 * @returns The same data structure with Timestamps converted to ISO strings
 */
function serializeFirestoreData<T extends Record<string, any>>(data: T): T {
  const serialized: any = {};
  
  Object.keys(data).forEach((key) => {
    const value = data[key];
    
    if (value && typeof value === 'object') {
      if (value.toDate && typeof value.toDate === 'function') {
        try {
          serialized[key] = value.toDate().toISOString();
        } catch (e) {
          serialized[key] = null;
        }
      }
      else if (value._seconds !== undefined && value._nanoseconds !== undefined) {
        const seconds = value._seconds || 0;
        const nanoseconds = value._nanoseconds || 0;
        const date = new Date(seconds * 1000 + nanoseconds / 1000000);
        serialized[key] = date.toISOString();
      }
      else if (!Array.isArray(value) && !(value instanceof Date)) {
        serialized[key] = serializeFirestoreData(value);
      }
      else if (Array.isArray(value)) {
        serialized[key] = value.map(item =>
          typeof item === 'object' && item !== null ? serializeFirestoreData(item) : item
        );
      } else {
        serialized[key] = value;
      }
    } else {
      serialized[key] = value;
    }
  });
  
  return serialized as T;
}

export async function createDigitalCard(params: {
  idToken: string;
  input: CreateDigitalCardInput;
}): Promise<{ success: boolean; cardId?: string; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Unauthorized: Invalid authentication token' };
    }
    const authenticatedUserId = verification.uid;

    if (params.input.userId !== authenticatedUserId) {
      return { success: false, error: 'Unauthorized: Cannot create card for another user' };
    }

    // Check plan limits for digital cards (per-user model)
    const companyDoc = await adminDb.collection('companies').doc(params.input.companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }
    
    const company = companyDoc.data();
    const planId = company?.planId;
    
    if (planId) {
      const planDoc = await adminDb.collection('plans').doc(planId).get();
      if (planDoc.exists) {
        const plan = planDoc.data();
        
        if (!plan) {
          return { success: false, error: 'Plan configuration error' };
        }
        
        // Get current user count for the company (for per-user calculation)
        const companyUsersSnapshot = await adminDb
          .collection('users')
          .where('companyId', '==', params.input.companyId)
          .get();
        
        const currentUserCount = companyUsersSnapshot.size;
        
        // Calculate limit based on plan and user count (per-user model)
        const maxDigitalCards = calculateDigitalCardLimit(plan as any, currentUserCount);
        
        // Count existing digital cards for this company
        const existingCardsSnapshot = await adminDb
          .collection(COLLECTION_NAME)
          .where('companyId', '==', params.input.companyId)
          .get();
        
        const currentCardCount = existingCardsSnapshot.size;
        
        // Check if limit reached
        if (currentCardCount >= maxDigitalCards) {
          const upgrade = getDigitalCardUpgradeSuggestion(plan.id, currentUserCount);
          
          return { 
            success: false, 
            error: `Digital Card limit reached: ${currentCardCount}/${maxDigitalCards} cards used.\n\nUpgrade to ${upgrade.suggestedPlan} to ${upgrade.benefit}.`
          };
        }
      }
    }

    const username = params.input.username.toLowerCase().trim();
    const existingCard = await getDigitalCardByUsername(username);
    
    if (existingCard.card) {
      return { success: false, error: 'Username already taken. Please choose another one.' };
    }

    const cardId = `card_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const initialAnalytics: DigitalCardAnalytics = {
      views: 0,
      chatInteractions: 0,
      leadsGenerated: 0,
      linkClicks: {},
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    const newCard: any = {
      ...params.input,
      id: cardId,
      username: username,
      analytics: initialAnalytics,
      status: params.input.status || 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await adminDb.collection(COLLECTION_NAME).doc(cardId).set(newCard);

    return { success: true, cardId };
  } catch (error) {
    console.error('Error creating digital card:', error);
    return { success: false, error: 'Failed to create digital card' };
  }
}

/**
 * Get a digital card by ID
 * NOTE: Timestamp fields (createdAt, updatedAt) are serialized to ISO strings
 */
export async function getDigitalCard(params: {
  idToken: string;
  cardId: string;
}): Promise<{ success: boolean; card?: DigitalCard; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Unauthorized: Invalid authentication token' };
    }
    const authenticatedUserId = verification.uid;

    const cardDoc = await adminDb.collection(COLLECTION_NAME).doc(params.cardId).get();

    if (!cardDoc.exists) {
      return { success: false, error: 'Digital card not found' };
    }

    const card = { id: cardDoc.id, ...cardDoc.data() } as DigitalCard;
    
    if (card.userId !== authenticatedUserId) {
      return { success: false, error: 'Unauthorized: You do not have access to this card' };
    }

    const serializedCard = serializeFirestoreData(card);
    return { success: true, card: serializedCard };
  } catch (error) {
    console.error('Error fetching digital card:', error);
    return { success: false, error: 'Failed to fetch digital card' };
  }
}

/**
 * Get a digital card by username
 * NOTE: Timestamp fields (createdAt, updatedAt) are serialized to ISO strings
 */
export async function getDigitalCardByUsername(
  username: string
): Promise<{ success: boolean; card?: DigitalCard; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where('username', '==', username.toLowerCase().trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'Digital card not found' };
    }

    const cardDoc = snapshot.docs[0];
    const card = { id: cardDoc.id, ...cardDoc.data() } as DigitalCard;
    const serializedCard = serializeFirestoreData(card);
    return { success: true, card: serializedCard };
  } catch (error) {
    console.error('Error fetching digital card by username:', error);
    return { success: false, error: 'Failed to fetch digital card' };
  }
}

/**
 * Get all digital cards for a user
 * NOTE: Timestamp fields (createdAt, updatedAt) are serialized to ISO strings
 */
export async function getUserDigitalCards(params: {
  idToken: string;
  companyId: string;
}): Promise<{ success: boolean; cards?: DigitalCard[]; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Unauthorized: Invalid authentication token' };
    }
    const authenticatedUserId = verification.uid;

    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where('userId', '==', authenticatedUserId)
      .where('companyId', '==', params.companyId)
      .get();

    const cards = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DigitalCard[];

    const serializedCards = cards.map(card => serializeFirestoreData(card));

    serializedCards.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return { success: true, cards: serializedCards };
  } catch (error) {
    console.error('Error fetching user digital cards:', error);
    return { success: false, error: 'Failed to fetch digital cards' };
  }
}

export async function updateDigitalCard(params: {
  idToken: string;
  input: UpdateDigitalCardInput;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Unauthorized: Invalid authentication token' };
    }
    const authenticatedUserId = verification.uid;

    const { id, ...updateData } = params.input;
    const cardRef = adminDb.collection(COLLECTION_NAME).doc(id);
    
    const cardDoc = await cardRef.get();
    if (!cardDoc.exists) {
      return { success: false, error: 'Digital card not found' };
    }

    const card = cardDoc.data() as DigitalCard;
    
    if (card.userId !== authenticatedUserId) {
      return { success: false, error: 'Unauthorized: You do not have permission to update this card' };
    }

    if (updateData.username) {
      const username = updateData.username.toLowerCase().trim();
      const existingCard = await getDigitalCardByUsername(username);
      
      if (existingCard.card && existingCard.card.id !== id) {
        return { success: false, error: 'Username already taken. Please choose another one.' };
      }
      updateData.username = username;
    }

    await cardRef.update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating digital card:', error);
    return { success: false, error: 'Failed to update digital card' };
  }
}

export async function deleteDigitalCard(params: {
  idToken: string;
  cardId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Unauthorized: Invalid authentication token' };
    }
    const authenticatedUserId = verification.uid;

    const cardRef = adminDb.collection(COLLECTION_NAME).doc(params.cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return { success: false, error: 'Digital card not found' };
    }

    const card = cardDoc.data() as DigitalCard;
    
    if (card.userId !== authenticatedUserId) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete this card' };
    }

    await cardRef.delete();

    return { success: true };
  } catch (error) {
    console.error('Error deleting digital card:', error);
    return { success: false, error: 'Failed to delete digital card' };
  }
}

export async function incrementCardViews(
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const cardRef = adminDb.collection(COLLECTION_NAME).doc(cardId);
    await cardRef.update({
      'analytics.views': admin.firestore.FieldValue.increment(1),
      'analytics.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error incrementing card views:', error);
    return { success: false, error: 'Failed to increment views' };
  }
}

export async function incrementLinkClick(
  cardId: string,
  linkId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const cardRef = adminDb.collection(COLLECTION_NAME).doc(cardId);
    await cardRef.update({
      [`analytics.linkClicks.${linkId}`]: admin.firestore.FieldValue.increment(1),
      'analytics.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error incrementing link click:', error);
    return { success: false, error: 'Failed to increment link click' };
  }
}

export async function incrementChatInteraction(
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const cardRef = adminDb.collection(COLLECTION_NAME).doc(cardId);
    await cardRef.update({
      'analytics.chatInteractions': admin.firestore.FieldValue.increment(1),
      'analytics.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error incrementing chat interaction:', error);
    return { success: false, error: 'Failed to increment chat interaction' };
  }
}

export async function updateCardStatus(params: {
  idToken: string;
  cardId: string;
  status: 'active' | 'inactive' | 'draft';
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Unauthorized: Invalid authentication token' };
    }
    const authenticatedUserId = verification.uid;

    const cardRef = adminDb.collection(COLLECTION_NAME).doc(params.cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return { success: false, error: 'Digital card not found' };
    }

    const card = cardDoc.data() as DigitalCard;
    
    if (card.userId !== authenticatedUserId) {
      return { success: false, error: 'Unauthorized: You do not have permission to update this card' };
    }

    await cardRef.update({
      status: params.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating card status:', error);
    return { success: false, error: 'Failed to update card status' };
  }
}

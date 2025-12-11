import { 
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  ChatSession,
  ChatMessage,
  CreateChatSessionData,
  UpdateChatSessionData,
  AddMessageData,
  UpdateMessageData
} from '@/types/chat';

export async function createChatSession(
  companyId: string,
  userId: string,
  agentId?: string,
  title?: string
): Promise<string> {
  if (!companyId || !userId) {
    throw new Error('companyId and userId are required');
  }

  const sessionsRef = collection(
    db,
    'companies',
    companyId,
    'users',
    userId,
    'chatSessions'
  );

  const sessionData = {
    companyId,
    userId,
    agentId: agentId || null,
    title: title || 'New Conversation',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageSummary: null,
    draftInput: null
  };

  const docRef = await addDoc(sessionsRef, sessionData);
  return docRef.id;
}

export async function getChatSession(
  sessionId: string,
  companyId: string,
  userId: string
): Promise<ChatSession | null> {
  if (!sessionId || !companyId || !userId) {
    throw new Error('sessionId, companyId, and userId are required');
  }

  const sessionRef = doc(
    db,
    'companies',
    companyId,
    'users',
    userId,
    'chatSessions',
    sessionId
  );

  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    return null;
  }

  const data = sessionSnap.data();

  if (data.companyId !== companyId || data.userId !== userId) {
    throw new Error('Access denied: Session does not belong to this user');
  }

  return {
    id: sessionSnap.id,
    ...data
  } as ChatSession;
}

export async function listChatSessions(
  companyId: string,
  userId: string,
  limit: number = 20
): Promise<ChatSession[]> {
  if (!companyId || !userId) {
    throw new Error('companyId and userId are required');
  }

  const sessionsRef = collection(
    db,
    'companies',
    companyId,
    'users',
    userId,
    'chatSessions'
  );

  const q = query(
    sessionsRef,
    firestoreLimit(limit)
  );

  const querySnapshot = await getDocs(q);

  const sessions = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ChatSession[];
  
  // Sort client-side temporarily until Firestore indexes are deployed
  return sessions.sort((a, b) => {
    const dateA = a.updatedAt?.toDate?.()?.getTime() || 0;
    const dateB = b.updatedAt?.toDate?.()?.getTime() || 0;
    return dateB - dateA;
  });
}

export async function updateChatSession(
  sessionId: string,
  companyId: string,
  userId: string,
  updates: UpdateChatSessionData
): Promise<void> {
  if (!sessionId || !companyId || !userId) {
    throw new Error('sessionId, companyId, and userId are required');
  }

  const session = await getChatSession(sessionId, companyId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  const sessionRef = doc(
    db,
    'companies',
    companyId,
    'users',
    userId,
    'chatSessions',
    sessionId
  );

  const updateData = {
    ...updates,
    updatedAt: serverTimestamp()
  };

  await updateDoc(sessionRef, updateData);
}

export async function deleteChatSession(
  sessionId: string,
  companyId: string,
  userId: string
): Promise<void> {
  if (!sessionId || !companyId || !userId) {
    throw new Error('sessionId, companyId, and userId are required');
  }

  const session = await getChatSession(sessionId, companyId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  const sessionRef = doc(
    db,
    'companies',
    companyId,
    'users',
    userId,
    'chatSessions',
    sessionId
  );

  await deleteDoc(sessionRef);
}

export async function addMessage(
  sessionId: string,
  companyId: string,
  userId: string,
  messageData: AddMessageData
): Promise<string> {
  if (!sessionId || !companyId || !userId) {
    throw new Error('sessionId, companyId, and userId are required');
  }

  const session = await getChatSession(sessionId, companyId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  const messagesRef = collection(
    db,
    'companies',
    companyId,
    'users',
    userId,
    'chatSessions',
    sessionId,
    'messages'
  );

  const message = {
    sessionId,
    role: messageData.role,
    content: messageData.content,
    timestamp: serverTimestamp(),
    type: messageData.type || 'text',
    metadata: messageData.metadata || null,
    creditsConsumed: messageData.creditsConsumed || 0,
    parentMessageId: messageData.parentMessageId || null,
    revision: messageData.revision || 1,
    status: messageData.status || 'active',
    nextSteps: messageData.nextSteps || null
  };

  const docRef = await addDoc(messagesRef, message);

  const summary = messageData.content.substring(0, 100);
  await updateChatSession(sessionId, companyId, userId, {
    lastMessageSummary: summary
  });

  return docRef.id;
}

export async function getMessages(
  sessionId: string,
  companyId: string,
  userId: string,
  limit?: number
): Promise<ChatMessage[]> {
  if (!sessionId || !companyId || !userId) {
    throw new Error('sessionId, companyId, and userId are required');
  }

  const session = await getChatSession(sessionId, companyId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  const messagesRef = collection(
    db,
    'companies',
    companyId,
    'users',
    userId,
    'chatSessions',
    sessionId,
    'messages'
  );

  let q = query(messagesRef);

  if (limit) {
    q = query(messagesRef, firestoreLimit(limit));
  }

  const querySnapshot = await getDocs(q);

  const messages = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ChatMessage[];
  
  return messages.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
}

export async function updateMessage(
  messageId: string,
  sessionId: string,
  companyId: string,
  userId: string,
  updates: UpdateMessageData
): Promise<void> {
  if (!messageId || !sessionId || !companyId || !userId) {
    throw new Error('messageId, sessionId, companyId, and userId are required');
  }

  const session = await getChatSession(sessionId, companyId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  const messageRef = doc(
    db,
    'companies',
    companyId,
    'users',
    userId,
    'chatSessions',
    sessionId,
    'messages',
    messageId
  );

  await updateDoc(messageRef, updates as any);
}

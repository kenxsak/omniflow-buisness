'use server';

import { serverDb } from '@/lib/firebase-server';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Activity, ActivityType } from '@/types/crm';

function serializeTimestamp(value: any): string | null {
  if (!value) return null;
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value.seconds !== undefined) {
    return new Date(value.seconds * 1000).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function serializeActivity(docId: string, data: any): Activity {
  return {
    id: docId,
    companyId: data.companyId,
    contactId: data.contactId,
    type: data.type,
    subject: data.subject || undefined,
    content: data.content,
    occurredAt: serializeTimestamp(data.occurredAt) || new Date().toISOString(),
    createdAt: serializeTimestamp(data.createdAt) || new Date().toISOString(),
    author: data.author,
    authorName: data.authorName,
    metadata: data.metadata,
  };
}

export async function getActivitiesForContact(
  companyId: string,
  contactId: string,
  limitCount: number = 50
): Promise<Activity[]> {
  if (!serverDb || !companyId || !contactId) {
    return [];
  }

  try {
    const activitiesRef = collection(serverDb, 'activities');
    try {
      const q = query(
        activitiesRef,
        where('companyId', '==', companyId),
        where('contactId', '==', contactId),
        orderBy('occurredAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => serializeActivity(doc.id, doc.data()));
    } catch (indexError: any) {
      if (indexError.code === 'failed-precondition') {
        const q = query(
          activitiesRef,
          where('companyId', '==', companyId),
          where('contactId', '==', contactId),
          limit(limitCount * 2)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
          .map(doc => serializeActivity(doc.id, doc.data()))
          .sort((a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime())
          .slice(0, limitCount);
      }
      throw indexError;
    }
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

export async function getRecentActivities(
  companyId: string,
  limitCount: number = 20
): Promise<Activity[]> {
  if (!serverDb || !companyId) {
    return [];
  }

  try {
    const activitiesRef = collection(serverDb, 'activities');
    try {
      const q = query(
        activitiesRef,
        where('companyId', '==', companyId),
        orderBy('occurredAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => serializeActivity(doc.id, doc.data()));
    } catch (indexError: any) {
      if (indexError.code === 'failed-precondition') {
        const q = query(activitiesRef, where('companyId', '==', companyId), limit(limitCount * 2));
        const snapshot = await getDocs(q);
        return snapshot.docs
          .map(doc => serializeActivity(doc.id, doc.data()))
          .sort((a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime())
          .slice(0, limitCount);
      }
      throw indexError;
    }
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}

export async function createActivity(
  activity: Omit<Activity, 'id' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const activitiesRef = collection(serverDb, 'activities');
    const now = Timestamp.now();
    
    const docRef = await addDoc(activitiesRef, {
      ...activity,
      occurredAt: activity.occurredAt || now,
      createdAt: now,
    });

    await updateContactLastContacted(activity.companyId, activity.contactId);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating activity:', error);
    return { success: false, error: 'Failed to create activity' };
  }
}

export async function logEmailActivity(
  companyId: string,
  contactId: string,
  subject: string,
  content: string,
  author: string,
  authorName: string,
  campaignId?: string,
  campaignName?: string
): Promise<{ success: boolean; id?: string }> {
  return createActivity({
    companyId,
    contactId,
    type: 'email',
    subject,
    content,
    author,
    authorName,
    occurredAt: new Date().toISOString(),
    metadata: {
      campaignId,
      campaignName,
      channel: 'email',
    },
  });
}

export async function logSMSActivity(
  companyId: string,
  contactId: string,
  content: string,
  author: string,
  authorName: string,
  recipientPhone: string,
  campaignId?: string,
  campaignName?: string
): Promise<{ success: boolean; id?: string }> {
  return createActivity({
    companyId,
    contactId,
    type: 'sms',
    content,
    author,
    authorName,
    occurredAt: new Date().toISOString(),
    metadata: {
      campaignId,
      campaignName,
      channel: 'sms',
      recipientPhone,
    },
  });
}

export async function logWhatsAppActivity(
  companyId: string,
  contactId: string,
  content: string,
  author: string,
  authorName: string,
  recipientPhone: string,
  campaignId?: string,
  campaignName?: string
): Promise<{ success: boolean; id?: string }> {
  return createActivity({
    companyId,
    contactId,
    type: 'whatsapp',
    content,
    author,
    authorName,
    occurredAt: new Date().toISOString(),
    metadata: {
      campaignId,
      campaignName,
      channel: 'whatsapp',
      recipientPhone,
    },
  });
}

export async function logNoteActivity(
  companyId: string,
  contactId: string,
  content: string,
  author: string,
  authorName: string
): Promise<{ success: boolean; id?: string }> {
  return createActivity({
    companyId,
    contactId,
    type: 'note',
    content,
    author,
    authorName,
    occurredAt: new Date().toISOString(),
  });
}

export async function logCallActivity(
  companyId: string,
  contactId: string,
  subject: string,
  content: string,
  author: string,
  authorName: string
): Promise<{ success: boolean; id?: string }> {
  return createActivity({
    companyId,
    contactId,
    type: 'call',
    subject,
    content,
    author,
    authorName,
    occurredAt: new Date().toISOString(),
  });
}

export async function logStatusChange(
  companyId: string,
  contactId: string,
  oldStatus: string,
  newStatus: string,
  author: string,
  authorName: string
): Promise<{ success: boolean; id?: string }> {
  return createActivity({
    companyId,
    contactId,
    type: 'status_change',
    content: `Status changed from "${oldStatus}" to "${newStatus}"`,
    author,
    authorName,
    occurredAt: new Date().toISOString(),
    metadata: {
      oldStatus,
      newStatus,
    },
  });
}

export async function logMeetingActivity(
  companyId: string,
  contactId: string,
  subject: string,
  content: string,
  author: string,
  authorName: string,
  appointmentId: string,
  appointmentData?: {
    startTime?: string;
    endTime?: string;
    location?: string;
    meetingLink?: string;
    status?: string;
    action?: 'scheduled' | 'updated' | 'cancelled' | 'completed' | 'no_show';
  }
): Promise<{ success: boolean; id?: string }> {
  return createActivity({
    companyId,
    contactId,
    type: 'meeting',
    subject,
    content,
    author,
    authorName,
    occurredAt: new Date().toISOString(),
    metadata: {
      appointmentId,
      startTime: appointmentData?.startTime,
      endTime: appointmentData?.endTime,
      location: appointmentData?.location,
      meetingLink: appointmentData?.meetingLink,
      status: appointmentData?.status,
      action: appointmentData?.action,
      channel: 'calendar',
    },
  });
}

export async function logTaskActivity(
  companyId: string,
  contactId: string,
  subject: string,
  content: string,
  author: string,
  authorName: string,
  taskId: string,
  taskData?: {
    status?: string;
    priority?: string;
    dueDate?: string;
    action?: 'created' | 'updated' | 'completed' | 'deleted';
    appointmentId?: string;
  }
): Promise<{ success: boolean; id?: string }> {
  return createActivity({
    companyId,
    contactId,
    type: 'task',
    subject,
    content,
    author,
    authorName,
    occurredAt: new Date().toISOString(),
    metadata: {
      taskId,
      status: taskData?.status,
      priority: taskData?.priority,
      dueDate: taskData?.dueDate,
      action: taskData?.action,
      appointmentId: taskData?.appointmentId,
    },
  });
}

async function updateContactLastContacted(
  companyId: string,
  contactId: string
): Promise<void> {
  if (!serverDb) return;

  try {
    const leadRef = doc(serverDb, 'leads', contactId);
    await updateDoc(leadRef, {
      lastContacted: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating lastContacted:', error);
  }
}

export async function deleteActivity(
  activityId: string
): Promise<{ success: boolean; error?: string }> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const activityRef = doc(serverDb, 'activities', activityId);
    await deleteDoc(activityRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting activity:', error);
    return { success: false, error: 'Failed to delete activity' };
  }
}

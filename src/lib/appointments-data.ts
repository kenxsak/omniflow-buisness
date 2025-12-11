'use server';

import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import type {
  Appointment,
  AppointmentFilter,
  AppointmentStats,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '@/types/appointments';

const APPOINTMENTS_COLLECTION = 'appointments';

function convertTimestamps(data: any): any {
  if (!data) return data;
  
  const result = { ...data };
  
  if (result.createdAt?.toDate) {
    result.createdAt = result.createdAt.toDate().toISOString();
  }
  if (result.updatedAt?.toDate) {
    result.updatedAt = result.updatedAt.toDate().toISOString();
  }
  if (result.startTime?.toDate) {
    result.startTime = result.startTime.toDate().toISOString();
  }
  if (result.endTime?.toDate) {
    result.endTime = result.endTime.toDate().toISOString();
  }
  if (result.eventStart?.toDate) {
    result.eventStart = result.eventStart.toDate().toISOString();
  }
  if (result.eventEnd?.toDate) {
    result.eventEnd = result.eventEnd.toDate().toISOString();
  }
  
  // Fallback: if startTime is undefined/missing, try eventStart
  if (!result.startTime && result.eventStart) {
    result.startTime = result.eventStart;
  }
  // Fallback: if endTime is undefined/missing, try eventEnd
  if (!result.endTime && result.eventEnd) {
    result.endTime = result.eventEnd;
  }
  // Ensure timestamps are ISO strings, not objects
  if (result.startTime && typeof result.startTime !== 'string') {
    if (result.startTime instanceof Object && 'toDate' in result.startTime) {
      result.startTime = result.startTime.toDate().toISOString();
    } else {
      result.startTime = new Date(result.startTime).toISOString();
    }
  }
  if (result.endTime && typeof result.endTime !== 'string') {
    if (result.endTime instanceof Object && 'toDate' in result.endTime) {
      result.endTime = result.endTime.toDate().toISOString();
    } else {
      result.endTime = new Date(result.endTime).toISOString();
    }
  }
  
  return result;
}

export async function getAppointments(
  companyId: string,
  filters?: AppointmentFilter
): Promise<Appointment[]> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return [];
  }

  try {
    let queryRef: admin.firestore.Query = adminDb
      .collection(APPOINTMENTS_COLLECTION)
      .where('companyId', '==', companyId);
    
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        queryRef = queryRef.where('status', 'in', filters.status);
      } else {
        queryRef = queryRef.where('status', '==', filters.status);
      }
    }
    
    if (filters?.assignedTo) {
      queryRef = queryRef.where('assignedTo', '==', filters.assignedTo);
    }
    
    if (filters?.clientId) {
      queryRef = queryRef.where('clientId', '==', filters.clientId);
    }
    
    const snapshot = await queryRef.get();
    
    let appointments: Appointment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      appointments.push({
        id: doc.id,
        ...convertTimestamps(data),
      } as Appointment);
    });
    
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      appointments = appointments.filter(
        (apt) => new Date(apt.startTime) >= startDate
      );
    }
    
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      appointments = appointments.filter(
        (apt) => new Date(apt.startTime) <= endDate
      );
    }
    
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      appointments = appointments.filter(
        (apt) =>
          apt.clientName.toLowerCase().includes(query) ||
          apt.clientEmail.toLowerCase().includes(query) ||
          apt.title.toLowerCase().includes(query)
      );
    }
    
    return appointments.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

export async function getAppointment(
  appointmentId: string
): Promise<Appointment | null> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return null;
  }

  try {
    const docRef = adminDb.collection(APPOINTMENTS_COLLECTION).doc(appointmentId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...convertTimestamps(data),
    } as Appointment;
  } catch (error: any) {
    console.error('Error fetching appointment:', error);
    return null;
  }
}

export async function createAppointment(
  companyId: string,
  createdBy: string,
  input: CreateAppointmentInput
): Promise<Appointment> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const appointmentData = {
      companyId,
      createdBy,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone || null,
      clientId: input.clientId || null,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      meetingLink: input.meetingLink || null,
      startTime: input.startTime,
      endTime: input.endTime,
      duration: input.duration,
      timezone: input.timezone,
      status: 'scheduled',
      reminderPreferences: input.reminderPreferences || [],
      reminders: [],
      assignedTo: input.assignedTo || null,
      assignedToName: input.assignedToName || null,
      notes: input.notes || null,
      tags: input.tags || [],
      source: input.source || 'manual',
      calcomEventId: input.calcomEventId || null,
      calcomEventTypeId: input.calcomEventTypeId || null,
      googleCalendarEventId: null,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await adminDb.collection(APPOINTMENTS_COLLECTION).add(appointmentData);
    
    const docSnap = await docRef.get();
    const data = docSnap.data();
    
    return {
      id: docRef.id,
      ...convertTimestamps(data),
    } as Appointment;
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

export async function updateAppointment(
  appointmentId: string,
  updates: Partial<UpdateAppointmentInput>
): Promise<Appointment | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const docRef = adminDb.collection(APPOINTMENTS_COLLECTION).doc(appointmentId);
    
    const existingDoc = await docRef.get();
    if (!existingDoc.exists) {
      throw new Error('Appointment not found');
    }
    
    const { id, ...updateData } = updates as any;
    
    const cleanedUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanedUpdates[key] = value;
      }
    }
    
    cleanedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await docRef.update(cleanedUpdates);
    
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();
    
    return {
      id: appointmentId,
      ...convertTimestamps(data),
    } as Appointment;
  } catch (error: any) {
    console.error('Error updating appointment:', error);
    throw error;
  }
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    await adminDb.collection(APPOINTMENTS_COLLECTION).doc(appointmentId).delete();
  } catch (error: any) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
}

export async function getUpcomingAppointments(
  companyId: string,
  hours: number = 24
): Promise<Appointment[]> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return [];
  }

  try {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    const snapshot = await adminDb
      .collection(APPOINTMENTS_COLLECTION)
      .where('companyId', '==', companyId)
      .where('status', '==', 'scheduled')
      .get();
    
    const appointments: Appointment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const startTime = data.startTime?.toDate 
        ? data.startTime.toDate() 
        : new Date(data.startTime);
      
      if (startTime >= now && startTime <= futureTime) {
        appointments.push({
          id: doc.id,
          ...convertTimestamps(data),
        } as Appointment);
      }
    });
    
    return appointments.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  } catch (error: any) {
    console.error('Error fetching upcoming appointments:', error);
    return [];
  }
}

export async function getAppointmentStats(
  companyId: string
): Promise<AppointmentStats> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      upcomingToday: 0,
      upcomingThisWeek: 0,
    };
  }

  try {
    const snapshot = await adminDb
      .collection(APPOINTMENTS_COLLECTION)
      .where('companyId', '==', companyId)
      .get();
    
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    
    const stats: AppointmentStats = {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      upcomingToday: 0,
      upcomingThisWeek: 0,
    };
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      stats.total++;
      
      switch (data.status) {
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
        case 'no_show':
          stats.noShow++;
          break;
      }
      
      if (data.status === 'scheduled') {
        const startTime = data.startTime?.toDate 
          ? data.startTime.toDate() 
          : new Date(data.startTime);
        
        if (startTime >= now && startTime <= todayEnd) {
          stats.upcomingToday++;
        }
        
        if (startTime >= now && startTime <= weekEnd) {
          stats.upcomingThisWeek++;
        }
      }
    });
    
    return stats;
  } catch (error: any) {
    console.error('Error fetching appointment stats:', error);
    return {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      upcomingToday: 0,
      upcomingThisWeek: 0,
    };
  }
}

export async function getAppointmentsByClientEmail(
  companyId: string,
  clientEmail: string
): Promise<Appointment[]> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return [];
  }

  try {
    const snapshot = await adminDb
      .collection(APPOINTMENTS_COLLECTION)
      .where('companyId', '==', companyId)
      .where('clientEmail', '==', clientEmail)
      .get();
    
    const appointments: Appointment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      appointments.push({
        id: doc.id,
        ...convertTimestamps(data),
      } as Appointment);
    });
    
    return appointments.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  } catch (error: any) {
    console.error('Error fetching appointments by client email:', error);
    return [];
  }
}

export async function getAppointmentByCalComId(
  companyId: string,
  calcomEventId: string
): Promise<Appointment | null> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return null;
  }

  try {
    const snapshot = await adminDb
      .collection(APPOINTMENTS_COLLECTION)
      .where('companyId', '==', companyId)
      .where('calcomEventId', '==', calcomEventId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...convertTimestamps(data),
    } as Appointment;
  } catch (error: any) {
    console.error('Error fetching appointment by Cal.com ID:', error);
    return null;
  }
}

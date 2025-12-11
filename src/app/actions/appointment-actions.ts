'use server';

import { revalidatePath } from 'next/cache';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getUpcomingAppointments,
  getAppointmentStats,
  getAppointmentByCalComId,
} from '@/lib/appointments-data';
import {
  getCalComBookings,
  convertCalComBookingToAppointment,
} from '@/lib/calcom-client';
import { logMeetingActivity } from '@/app/actions/activity-actions';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { addServerLead } from '@/lib/leads-data-server';
import type {
  Appointment,
  AppointmentFilter,
  AppointmentStats,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  CalComConfig,
} from '@/types/appointments';
import { format } from 'date-fns';

// Helper function to serialize Firestore Timestamps to ISO strings
function serializeAppointment(appointment: any): Appointment {
  return {
    ...appointment,
    startTime: appointment.startTime instanceof Object && 'toDate' in appointment.startTime 
      ? appointment.startTime.toDate().toISOString()
      : appointment.startTime,
    endTime: appointment.endTime instanceof Object && 'toDate' in appointment.endTime
      ? appointment.endTime.toDate().toISOString()
      : appointment.endTime,
    createdAt: appointment.createdAt instanceof Object && 'toDate' in appointment.createdAt
      ? appointment.createdAt.toDate().toISOString()
      : appointment.createdAt,
    eventStart: appointment.eventStart instanceof Object && 'toDate' in appointment.eventStart
      ? appointment.eventStart.toDate().toISOString()
      : appointment.eventStart,
    eventEnd: appointment.eventEnd instanceof Object && 'toDate' in appointment.eventEnd
      ? appointment.eventEnd.toDate().toISOString()
      : appointment.eventEnd,
  };
}

function serializeAppointments(appointments: any[]): Appointment[] {
  return appointments.map(serializeAppointment);
}

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

type AppointmentsResult = 
  | { success: true; appointments: Appointment[] }
  | { success: false; error: string };

type StatsResult = 
  | { success: true; stats: AppointmentStats }
  | { success: false; error: string };

type SyncResult = 
  | { success: true; synced: number; created: number; updated: number }
  | { success: false; error: string };

async function getAuthenticatedUserFromToken(idToken: string) {
  if (!idToken) {
    return { success: false as const, error: 'No authentication token provided' };
  }

  const authResult = await verifyAuthToken(idToken);
  
  if (!authResult.success) {
    return { success: false as const, error: authResult.error };
  }
  
  if (!adminDb) {
    return { success: false as const, error: 'Database not initialized' };
  }

  const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
  if (!userDoc.exists) {
    return { success: false as const, error: 'User not found' };
  }

  const userData = userDoc.data();
  
  return {
    success: true as const,
    user: {
      uid: authResult.uid,
      email: authResult.email,
      companyId: userData?.companyId,
      role: userData?.role,
      type: userData?.type || 'office',
      name: userData?.name || userData?.email,
    },
  };
}

async function findContactByEmail(companyId: string, email: string): Promise<string | null> {
  if (!adminDb || !email) return null;
  
  try {
    const leadsSnapshot = await adminDb
      .collection('leads')
      .where('companyId', '==', companyId)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    
    if (!leadsSnapshot.empty) {
      return leadsSnapshot.docs[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error finding contact by email:', error);
    return null;
  }
}

type CalendarPermission = 'view' | 'create' | 'edit' | 'delete' | 'viewOthers';

async function checkCalendarAccess(
  companyId: string,
  userRole: string,
  userType: string = 'office',
  permission: CalendarPermission = 'view'
): Promise<{ allowed: boolean; error?: string }> {
  if (!adminDb) {
    return { allowed: false, error: 'Database not initialized' };
  }

  try {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { allowed: false, error: 'Company not found' };
    }

    const companyData = companyDoc.data();
    const calendarSettings = companyData?.calendarAccessSettings;

    if (!calendarSettings) {
      return { allowed: true };
    }

    if (!calendarSettings.enabled) {
      return { allowed: false, error: 'Calendar module is disabled for this company' };
    }

    if (!calendarSettings.allowedRoles?.includes(userRole)) {
      return { allowed: false, error: 'Your role does not have access to the calendar' };
    }

    if (calendarSettings.allowedUserTypes?.length > 0 && !calendarSettings.allowedUserTypes.includes(userType)) {
      return { allowed: false, error: 'Your user type does not have access to the calendar' };
    }

    switch (permission) {
      case 'create':
        if (calendarSettings.canCreateAppointments?.length > 0 && !calendarSettings.canCreateAppointments.includes(userRole)) {
          return { allowed: false, error: 'You do not have permission to create appointments' };
        }
        break;
      case 'edit':
        if (calendarSettings.canEditAppointments?.length > 0 && !calendarSettings.canEditAppointments.includes(userRole)) {
          return { allowed: false, error: 'You do not have permission to edit appointments' };
        }
        break;
      case 'delete':
        if (calendarSettings.canDeleteAppointments?.length > 0 && !calendarSettings.canDeleteAppointments.includes(userRole)) {
          return { allowed: false, error: 'You do not have permission to delete appointments' };
        }
        break;
      case 'viewOthers':
        if (calendarSettings.canViewOthersAppointments?.length > 0 && !calendarSettings.canViewOthersAppointments.includes(userRole)) {
          return { allowed: false, error: 'You do not have permission to view other users\' appointments' };
        }
        break;
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking calendar access:', error);
    return { allowed: false, error: 'Unable to verify calendar permissions. Please try again.' };
  }
}

async function logAppointmentActivity(
  appointment: Appointment,
  user: { uid: string; companyId: string; name?: string },
  action: 'scheduled' | 'updated' | 'cancelled' | 'completed' | 'no_show'
): Promise<void> {
  const contactId = appointment.clientId || await findContactByEmail(appointment.companyId, appointment.clientEmail);
  
  if (!contactId) {
    console.log('No CRM contact found for appointment:', appointment.clientEmail);
    return;
  }
  
  const actionLabels = {
    scheduled: 'Meeting scheduled',
    updated: 'Meeting updated',
    cancelled: 'Meeting cancelled',
    completed: 'Meeting completed',
    no_show: 'Meeting no-show',
  };
  
  const startTime = new Date(appointment.startTime);
  const content = `${actionLabels[action]}: "${appointment.title}" on ${format(startTime, 'PPP \'at\' p')}${appointment.location ? ` at ${appointment.location}` : ''}`;
  
  try {
    await logMeetingActivity(
      appointment.companyId,
      contactId,
      appointment.title,
      content,
      user.uid,
      user.name || 'System',
      appointment.id,
      {
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        location: appointment.location,
        meetingLink: appointment.meetingLink,
        status: appointment.status,
        action,
      }
    );
  } catch (error) {
    console.error('Error logging appointment activity:', error);
  }
}

export async function createAppointmentAction({
  idToken,
  input,
}: {
  idToken: string;
  input: CreateAppointmentInput;
}): Promise<ActionResult<Appointment>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    if (!input.clientName || !input.clientEmail) {
      return { success: false, error: 'Client name and email are required' };
    }
    
    if (!input.title) {
      return { success: false, error: 'Appointment title is required' };
    }
    
    if (!input.startTime || !input.endTime) {
      return { success: false, error: 'Start and end times are required' };
    }
    
    const startDate = new Date(input.startTime);
    const endDate = new Date(input.endTime);
    
    if (startDate >= endDate) {
      return { success: false, error: 'End time must be after start time' };
    }
    
    const appointment = await createAppointment(
      user.companyId,
      user.uid,
      input
    );
    
    await logAppointmentActivity(appointment, { uid: user.uid, companyId: user.companyId, name: user.name }, 'scheduled');
    
    revalidatePath('/appointments');
    revalidatePath('/crm');
    revalidatePath('/dashboard');
    
    return { success: true, data: serializeAppointment(appointment) };
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    return { success: false, error: error.message || 'Failed to create appointment' };
  }
}

export async function updateAppointmentAction({
  idToken,
  appointmentId,
  updates,
}: {
  idToken: string;
  appointmentId: string;
  updates: Partial<UpdateAppointmentInput>;
}): Promise<ActionResult<Appointment>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const existingAppointment = await getAppointment(appointmentId);
    if (!existingAppointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    if (existingAppointment.companyId !== user.companyId) {
      return { success: false, error: 'Unauthorized to update this appointment' };
    }
    
    if (updates.startTime && updates.endTime) {
      const startDate = new Date(updates.startTime);
      const endDate = new Date(updates.endTime);
      
      if (startDate >= endDate) {
        return { success: false, error: 'End time must be after start time' };
      }
    }
    
    const updatedAppointment = await updateAppointment(appointmentId, updates);
    
    if (!updatedAppointment) {
      return { success: false, error: 'Failed to update appointment' };
    }
    
    await logAppointmentActivity(updatedAppointment, { uid: user.uid, companyId: user.companyId, name: user.name }, 'updated');
    
    revalidatePath('/appointments');
    revalidatePath('/crm');
    revalidatePath('/dashboard');
    
    return { success: true, data: serializeAppointment(updatedAppointment) };
  } catch (error: any) {
    console.error('Error updating appointment:', error);
    return { success: false, error: error.message || 'Failed to update appointment' };
  }
}

export async function deleteAppointmentAction({
  idToken,
  appointmentId,
}: {
  idToken: string;
  appointmentId: string;
}): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const existingAppointment = await getAppointment(appointmentId);
    if (!existingAppointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    if (existingAppointment.companyId !== user.companyId) {
      return { success: false, error: 'Unauthorized to delete this appointment' };
    }
    
    await deleteAppointment(appointmentId);
    
    revalidatePath('/appointments');
    revalidatePath('/crm');
    revalidatePath('/dashboard');
    
    return { success: true, data: { deleted: true } };
  } catch (error: any) {
    console.error('Error deleting appointment:', error);
    return { success: false, error: error.message || 'Failed to delete appointment' };
  }
}

export async function getAppointmentsAction({
  idToken,
  filters,
}: {
  idToken: string;
  filters?: AppointmentFilter;
}): Promise<AppointmentsResult> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const appointments = await getAppointments(user.companyId, filters);
    const serializedAppointments = serializeAppointments(appointments);
    
    return { success: true, appointments: serializedAppointments };
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return { success: false, error: error.message || 'Failed to fetch appointments' };
  }
}

export async function getAppointmentAction({
  idToken,
  appointmentId,
}: {
  idToken: string;
  appointmentId: string;
}): Promise<ActionResult<Appointment>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const appointment = await getAppointment(appointmentId);
    
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    if (appointment.companyId !== user.companyId) {
      return { success: false, error: 'Unauthorized to view this appointment' };
    }
    
    return { success: true, data: serializeAppointment(appointment) };
  } catch (error: any) {
    console.error('Error fetching appointment:', error);
    return { success: false, error: error.message || 'Failed to fetch appointment' };
  }
}

export async function cancelAppointmentAction({
  idToken,
  appointmentId,
  sendNotification = true,
  reason,
}: {
  idToken: string;
  appointmentId: string;
  sendNotification?: boolean;
  reason?: string;
}): Promise<ActionResult<Appointment>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const existingAppointment = await getAppointment(appointmentId);
    if (!existingAppointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    if (existingAppointment.companyId !== user.companyId) {
      return { success: false, error: 'Unauthorized to cancel this appointment' };
    }
    
    if (existingAppointment.status === 'cancelled') {
      return { success: false, error: 'Appointment is already cancelled' };
    }
    
    const updates: Partial<UpdateAppointmentInput> = {
      status: 'cancelled',
    };
    
    if (reason) {
      updates.notes = existingAppointment.notes 
        ? `${existingAppointment.notes}\n\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`;
    }
    
    const updatedAppointment = await updateAppointment(appointmentId, updates);
    
    if (!updatedAppointment) {
      return { success: false, error: 'Failed to cancel appointment' };
    }
    
    await logAppointmentActivity(updatedAppointment, { uid: user.uid, companyId: user.companyId, name: user.name }, 'cancelled');
    
    revalidatePath('/appointments');
    revalidatePath('/crm');
    revalidatePath('/dashboard');
    
    return { success: true, data: serializeAppointment(updatedAppointment) };
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return { success: false, error: error.message || 'Failed to cancel appointment' };
  }
}

export async function rescheduleAppointmentAction({
  idToken,
  appointmentId,
  newStartTime,
  newEndTime,
  reason,
}: {
  idToken: string;
  appointmentId: string;
  newStartTime: string;
  newEndTime: string;
  reason?: string;
}): Promise<ActionResult<Appointment>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const existingAppointment = await getAppointment(appointmentId);
    if (!existingAppointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    if (existingAppointment.companyId !== user.companyId) {
      return { success: false, error: 'Unauthorized to reschedule this appointment' };
    }
    
    if (existingAppointment.status === 'cancelled') {
      return { success: false, error: 'Cannot reschedule a cancelled appointment' };
    }
    
    if (existingAppointment.status === 'completed') {
      return { success: false, error: 'Cannot reschedule a completed appointment' };
    }
    
    const startDate = new Date(newStartTime);
    const endDate = new Date(newEndTime);
    
    if (startDate >= endDate) {
      return { success: false, error: 'End time must be after start time' };
    }
    
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    
    const updates: Partial<UpdateAppointmentInput> = {
      startTime: newStartTime,
      endTime: newEndTime,
      duration,
      status: 'rescheduled',
    };

    if (reason) {
      updates.notes = existingAppointment.notes 
        ? `${existingAppointment.notes}\n\nReschedule reason: ${reason}`
        : `Reschedule reason: ${reason}`;
    }
    
    const updatedAppointment = await updateAppointment(appointmentId, updates);
    
    if (!updatedAppointment) {
      return { success: false, error: 'Failed to reschedule appointment' };
    }
    
    const rescheduledAppointment = await updateAppointment(appointmentId, {
      status: 'scheduled',
    });
    
    const finalAppointment = rescheduledAppointment || updatedAppointment;
    await logAppointmentActivity(finalAppointment, { uid: user.uid, companyId: user.companyId, name: user.name }, 'updated');
    
    revalidatePath('/appointments');
    revalidatePath('/crm');
    revalidatePath('/dashboard');
    
    return { success: true, data: serializeAppointment(finalAppointment) };
  } catch (error: any) {
    console.error('Error rescheduling appointment:', error);
    return { success: false, error: error.message || 'Failed to reschedule appointment' };
  }
}

export async function syncCalComBookingsAction({
  idToken,
}: {
  idToken: string;
}): Promise<SyncResult> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }

    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Fetch and decrypt API keys using admin SDK
    const companyDoc = await adminDb.collection('companies').doc(user.companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }
    
    const companyData = companyDoc.data();
    const encryptedCalcomKeys = companyData?.apiKeys?.calcom;
    
    if (!encryptedCalcomKeys || !encryptedCalcomKeys.apiKey) {
      return { success: false, error: 'Cal.com API key not configured. Please add it in Settings > Integrations.' };
    }
    
    // Decrypt the API key
    let calComApiKey: string;
    try {
      calComApiKey = decryptApiKeyServerSide(encryptedCalcomKeys.apiKey);
    } catch (error) {
      console.error('Failed to decrypt Cal.com API key:', error);
      return { success: false, error: 'Failed to decrypt API key. Please reconfigure it in Settings.' };
    }
    
    if (!calComApiKey) {
      return { success: false, error: 'Cal.com API key is empty. Please add it in Settings > Integrations.' };
    }
    
    const config: CalComConfig = {
      apiKey: calComApiKey,
    };
    
    const bookingsResult = await getCalComBookings(config, {
      status: 'upcoming',
    });
    
    if (!bookingsResult.success || !bookingsResult.data) {
      return { 
        success: false, 
        error: bookingsResult.error || 'Failed to fetch Cal.com bookings' 
      };
    }
    
    const bookings = bookingsResult.data.bookings || [];
    let created = 0;
    let updated = 0;
    
    for (const booking of bookings) {
      const existingAppointment = await getAppointmentByCalComId(
        user.companyId,
        booking.uid
      );
      
      const attendeeEmail = booking.attendees?.[0]?.email?.toLowerCase();
      const attendeeName = booking.attendees?.[0]?.name || booking.attendees?.[0]?.email || 'Guest';
      let clientId = attendeeEmail 
        ? await findContactByEmail(user.companyId, attendeeEmail)
        : null;
      
      if (existingAppointment) {
        const newStatus = booking.status === 'ACCEPTED' 
          ? 'scheduled' 
          : booking.status === 'CANCELLED' 
            ? 'cancelled' 
            : 'pending';
        
        const needsUpdate = 
          existingAppointment.startTime !== booking.startTime ||
          existingAppointment.endTime !== booking.endTime ||
          existingAppointment.status !== newStatus ||
          (!existingAppointment.clientId && clientId);
        
        if (needsUpdate) {
          await updateAppointment(existingAppointment.id, {
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: newStatus as any,
            meetingLink: booking.meetingUrl,
            location: booking.location,
            clientId: clientId || existingAppointment.clientId,
          });
          updated++;
        }
      } else {
        // Create contact if it doesn't exist
        if (attendeeEmail && !clientId) {
          try {
            const newContact = await addServerLead(user.companyId, {
              name: attendeeName,
              email: attendeeEmail,
              phone: booking.attendees?.[0]?.email ? '' : '',
              status: 'new',
              source: 'calendar_booking',
              notes: `From Cal.com booking: ${booking.title}`,
              assignedTo: '',
            });
            clientId = newContact.id;
          } catch (error: any) {
            // Log error but continue - contact creation shouldn't block appointment
            console.error('Error creating contact from cal.com booking:', error);
          }
        }
        
        const appointmentData = convertCalComBookingToAppointment(
          booking,
          user.companyId,
          user.uid
        );
        
        const appointmentInput: CreateAppointmentInput = {
          ...appointmentData,
          clientId: clientId || undefined,
        };
        
        await createAppointment(
          user.companyId,
          user.uid,
          appointmentInput
        );
        created++;
      }
    }
    
    revalidatePath('/appointments');
    revalidatePath('/crm');
    revalidatePath('/dashboard');
    
    return {
      success: true,
      synced: bookings.length,
      created,
      updated,
    };
  } catch (error: any) {
    console.error('Error syncing Cal.com bookings:', error);
    return { success: false, error: error.message || 'Failed to sync Cal.com bookings' };
  }
}

export async function getUpcomingAppointmentsAction({
  idToken,
  hours = 24,
}: {
  idToken: string;
  hours?: number;
}): Promise<AppointmentsResult> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const appointments = await getUpcomingAppointments(user.companyId, hours);
    const serializedAppointments = serializeAppointments(appointments);
    
    return { success: true, appointments: serializedAppointments };
  } catch (error: any) {
    console.error('Error fetching upcoming appointments:', error);
    return { success: false, error: error.message || 'Failed to fetch upcoming appointments' };
  }
}

export async function getAppointmentStatsAction({
  idToken,
}: {
  idToken: string;
}): Promise<StatsResult> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const stats = await getAppointmentStats(user.companyId);
    
    return { success: true, stats };
  } catch (error: any) {
    console.error('Error fetching appointment stats:', error);
    return { success: false, error: error.message || 'Failed to fetch appointment stats' };
  }
}

export async function markAppointmentCompletedAction({
  idToken,
  appointmentId,
  notes,
}: {
  idToken: string;
  appointmentId: string;
  notes?: string;
}): Promise<ActionResult<Appointment>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const existingAppointment = await getAppointment(appointmentId);
    if (!existingAppointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    if (existingAppointment.companyId !== user.companyId) {
      return { success: false, error: 'Unauthorized to update this appointment' };
    }
    
    const updates: Partial<UpdateAppointmentInput> = {
      status: 'completed',
    };
    
    if (notes) {
      updates.notes = existingAppointment.notes 
        ? `${existingAppointment.notes}\n\nCompletion notes: ${notes}`
        : `Completion notes: ${notes}`;
    }
    
    const updatedAppointment = await updateAppointment(appointmentId, updates);
    
    if (!updatedAppointment) {
      return { success: false, error: 'Failed to mark appointment as completed' };
    }
    
    await logAppointmentActivity(updatedAppointment, { uid: user.uid, companyId: user.companyId, name: user.name }, 'completed');
    
    revalidatePath('/appointments');
    revalidatePath('/crm');
    revalidatePath('/dashboard');
    
    return { success: true, data: serializeAppointment(updatedAppointment) };
  } catch (error: any) {
    console.error('Error marking appointment completed:', error);
    return { success: false, error: error.message || 'Failed to mark appointment as completed' };
  }
}

export async function markAppointmentNoShowAction({
  idToken,
  appointmentId,
}: {
  idToken: string;
  appointmentId: string;
}): Promise<ActionResult<Appointment>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    const existingAppointment = await getAppointment(appointmentId);
    if (!existingAppointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    if (existingAppointment.companyId !== user.companyId) {
      return { success: false, error: 'Unauthorized to update this appointment' };
    }
    
    const updatedAppointment = await updateAppointment(appointmentId, {
      status: 'no_show',
    });
    
    if (!updatedAppointment) {
      return { success: false, error: 'Failed to mark appointment as no-show' };
    }
    
    await logAppointmentActivity(updatedAppointment, { uid: user.uid, companyId: user.companyId, name: user.name }, 'no_show');
    
    revalidatePath('/appointments');
    revalidatePath('/crm');
    revalidatePath('/dashboard');
    
    return { success: true, data: serializeAppointment(updatedAppointment) };
  } catch (error: any) {
    console.error('Error marking appointment as no-show:', error);
    return { success: false, error: error.message || 'Failed to mark appointment as no-show' };
  }
}

export interface CalendarAccessSettings {
  enabled: boolean;
  allowedRoles: string[];
  allowedUserTypes: string[];
  canCreateAppointments: string[];
  canEditAppointments: string[];
  canDeleteAppointments: string[];
  canViewOthersAppointments: string[];
}

export async function getCalendarAccessSettingsAction({
  idToken,
}: {
  idToken: string;
}): Promise<ActionResult<CalendarAccessSettings | null>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return { success: false, error: 'Only admins can view calendar access settings' };
    }
    
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const companyDoc = await adminDb.collection('companies').doc(user.companyId).get();
    if (!companyDoc.exists) {
      return { success: false, error: 'Company not found' };
    }
    
    const companyData = companyDoc.data();
    return { success: true, data: companyData?.calendarAccessSettings || null };
  } catch (error: any) {
    console.error('Error fetching calendar access settings:', error);
    return { success: false, error: error.message || 'Failed to fetch calendar access settings' };
  }
}

export async function updateCalendarAccessSettingsAction({
  idToken,
  settings,
}: {
  idToken: string;
  settings: CalendarAccessSettings;
}): Promise<ActionResult<CalendarAccessSettings>> {
  try {
    const authResult = await getAuthenticatedUserFromToken(idToken);
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }
    
    const { user } = authResult;
    if (!user.companyId) {
      return { success: false, error: 'User does not have a company assigned' };
    }
    
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return { success: false, error: 'Only admins can update calendar access settings' };
    }
    
    if (!adminDb) {
      return { success: false, error: 'Database not initialized' };
    }
    
    await adminDb.collection('companies').doc(user.companyId).update({
      calendarAccessSettings: settings,
    });
    
    revalidatePath('/settings');
    revalidatePath('/appointments');
    
    return { success: true, data: settings };
  } catch (error: any) {
    console.error('Error updating calendar access settings:', error);
    return { success: false, error: error.message || 'Failed to update calendar access settings' };
  }
}

/**
 * Cal.com API Client
 * Handles integration with Cal.com for appointment booking
 * API Documentation: https://cal.com/docs/api-reference
 */

import type { 
  CalComConfig, 
  CalComEventType, 
  CalComBooking 
} from '@/types/appointments';

const DEFAULT_BASE_URL = 'https://api.cal.com/v1';

export interface CalComApiError {
  message: string;
  statusCode: number;
}

export interface CalComApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function makeCalComRequest<T>(
  config: CalComConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<CalComApiResult<T>> {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  // Cal.com API requires apiKey as query parameter
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${baseUrl}${endpoint}${separator}apiKey=${encodeURIComponent(config.apiKey)}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || `API error: ${response.status}`,
      };
    }
    
    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    console.error('Cal.com API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function validateCalComConnection(
  config: CalComConfig
): Promise<{ success: boolean; error?: string; user?: { username: string; email: string } }> {
  const result = await makeCalComRequest<{ user: { username: string; email: string } }>(
    config,
    '/me'
  );
  
  if (result.success && result.data) {
    return { success: true, user: result.data.user };
  }
  
  return { success: false, error: result.error || 'Failed to connect to Cal.com' };
}

export async function getCalComEventTypes(
  config: CalComConfig
): Promise<CalComApiResult<{ event_types: CalComEventType[] }>> {
  return makeCalComRequest<{ event_types: CalComEventType[] }>(
    config,
    '/event-types'
  );
}

export async function getCalComEventType(
  config: CalComConfig,
  eventTypeId: number
): Promise<CalComApiResult<{ event_type: CalComEventType }>> {
  return makeCalComRequest<{ event_type: CalComEventType }>(
    config,
    `/event-types/${eventTypeId}`
  );
}

export async function getCalComBookings(
  config: CalComConfig,
  filters?: {
    status?: 'upcoming' | 'past' | 'cancelled' | 'unconfirmed';
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<CalComApiResult<{ bookings: CalComBooking[] }>> {
  let endpoint = '/bookings';
  const params = new URLSearchParams();
  
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.dateFrom) {
    params.append('dateFrom', filters.dateFrom);
  }
  if (filters?.dateTo) {
    params.append('dateTo', filters.dateTo);
  }
  
  const queryString = params.toString();
  if (queryString) {
    endpoint += `?${queryString}`;
  }
  
  return makeCalComRequest<{ bookings: CalComBooking[] }>(config, endpoint);
}

export async function getCalComBooking(
  config: CalComConfig,
  bookingId: number
): Promise<CalComApiResult<{ booking: CalComBooking }>> {
  return makeCalComRequest<{ booking: CalComBooking }>(
    config,
    `/bookings/${bookingId}`
  );
}

export async function cancelCalComBooking(
  config: CalComConfig,
  bookingId: number,
  cancellationReason?: string
): Promise<CalComApiResult<{ booking: CalComBooking }>> {
  return makeCalComRequest<{ booking: CalComBooking }>(
    config,
    `/bookings/${bookingId}/cancel`,
    {
      method: 'DELETE',
      body: JSON.stringify({
        cancellationReason: cancellationReason || 'Cancelled by organizer',
      }),
    }
  );
}

export async function getCalComAvailability(
  config: CalComConfig,
  eventTypeId: number,
  dateFrom: string,
  dateTo: string
): Promise<CalComApiResult<{ busy: { start: string; end: string }[]; timeZone: string }>> {
  const params = new URLSearchParams({
    eventTypeId: eventTypeId.toString(),
    dateFrom,
    dateTo,
  });
  
  return makeCalComRequest<{ busy: { start: string; end: string }[]; timeZone: string }>(
    config,
    `/availability?${params.toString()}`
  );
}

export async function getCalComSchedules(
  config: CalComConfig
): Promise<CalComApiResult<{ schedules: any[] }>> {
  return makeCalComRequest<{ schedules: any[] }>(config, '/schedules');
}

export function convertCalComBookingToAppointment(
  booking: CalComBooking,
  companyId: string,
  createdBy: string
) {
  const attendee = booking.attendees?.[0];
  
  return {
    companyId,
    clientName: attendee?.name || 'Unknown',
    clientEmail: attendee?.email || '',
    title: booking.title,
    description: booking.description,
    startTime: booking.startTime,
    endTime: booking.endTime,
    duration: Math.round(
      (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000
    ),
    timezone: attendee?.timeZone || 'UTC',
    status: booking.status === 'ACCEPTED' 
      ? 'scheduled' 
      : booking.status === 'CANCELLED' 
        ? 'cancelled' 
        : 'pending',
    location: booking.location,
    meetingLink: booking.meetingUrl,
    calcomEventId: booking.uid,
    source: 'calcom' as const,
    createdBy,
    reminderPreferences: [
      { enabled: true, channel: 'email' as const, hoursBeforeAppointment: 24 },
    ],
  };
}

export async function createCalComBooking(
  config: CalComConfig,
  input: {
    eventTypeId: number;
    start: string;
    end: string;
    attendee: {
      email: string;
      name: string;
      timeZone: string;
    };
    metadata?: Record<string, any>;
    language?: string;
  }
): Promise<CalComApiResult<{ booking: CalComBooking }>> {
  return makeCalComRequest<{ booking: CalComBooking }>(
    config,
    '/bookings',
    {
      method: 'POST',
      body: JSON.stringify({
        eventTypeId: input.eventTypeId,
        start: input.start,
        end: input.end,
        responses: {
          name: input.attendee.name,
          email: input.attendee.email,
        },
        timeZone: input.attendee.timeZone,
        language: input.language || 'en',
        metadata: input.metadata || {},
      }),
    }
  );
}

export async function rescheduleCalComBooking(
  config: CalComConfig,
  bookingId: number,
  newStart: string,
  newEnd: string,
  rescheduleReason?: string
): Promise<CalComApiResult<{ booking: CalComBooking }>> {
  return makeCalComRequest<{ booking: CalComBooking }>(
    config,
    `/bookings/${bookingId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        start: newStart,
        end: newEnd,
        rescheduleReason: rescheduleReason || 'Rescheduled',
      }),
    }
  );
}

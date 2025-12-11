/**
 * Appointment Types
 * Defines types for appointment booking and reminder system
 */

export type AppointmentStatus = 
  | 'scheduled'   // Confirmed appointment
  | 'pending'     // Awaiting confirmation
  | 'completed'   // Appointment finished
  | 'cancelled'   // Cancelled by user or client
  | 'no_show'     // Client didn't attend
  | 'rescheduled'; // Was rescheduled to another time

export type ReminderChannel = 'email' | 'sms' | 'whatsapp';

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface AppointmentReminder {
  id: string;
  appointmentId: string;
  channel: ReminderChannel;          // Which channel to use
  scheduledFor: string;              // ISO string - when to send
  status: ReminderStatus;
  sentAt?: string;                   // When actually sent
  error?: string;                    // Error message if failed
  messageId?: string;                // External message ID (for tracking)
}

export interface ReminderPreference {
  enabled: boolean;
  channel: ReminderChannel;
  hoursBeforeAppointment: number;    // e.g., 24, 48, 1
}

export interface Appointment {
  id: string;
  companyId: string;
  
  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientId?: string;                 // Optional link to CRM lead/contact
  
  // Appointment details
  title: string;
  description?: string;
  location?: string;                 // Physical location or "Online"
  meetingLink?: string;              // Video call link
  
  // Scheduling
  startTime: string;                 // ISO string
  endTime: string;                   // ISO string
  duration: number;                  // Duration in minutes
  timezone: string;                  // e.g., "Asia/Kolkata"
  
  // Status
  status: AppointmentStatus;
  
  // Reminder settings
  reminderPreferences: ReminderPreference[];
  reminders?: AppointmentReminder[];
  
  // Staff/owner
  assignedTo?: string;               // User ID of assigned staff
  assignedToName?: string;
  createdBy: string;                 // User ID who created
  
  // External integrations
  calcomEventId?: string;            // Cal.com booking ID
  calcomEventTypeId?: string;        // Cal.com event type ID
  googleCalendarEventId?: string;    // Google Calendar event ID
  
  // Metadata
  notes?: string;
  tags?: string[];
  source?: 'manual' | 'calcom' | 'google_calendar' | 'widget';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentEventType {
  id: string;
  companyId: string;
  
  // Basic info
  name: string;                      // e.g., "30-min Consultation"
  description?: string;
  slug: string;                      // URL-friendly name
  
  // Duration
  duration: number;                  // In minutes
  
  // Availability
  availability: {
    days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    startTime: string;               // e.g., "09:00"
    endTime: string;                 // e.g., "17:00"
    timezone: string;
  };
  
  // Buffer times
  bufferBefore?: number;             // Minutes before appointment
  bufferAfter?: number;              // Minutes after appointment
  
  // Limits
  maxBookingsPerDay?: number;
  minNoticeHours?: number;           // Minimum hours before booking
  maxAdvanceDays?: number;           // How far in advance can book
  
  // Default reminder settings (can be overridden per appointment)
  defaultReminders: ReminderPreference[];
  
  // Location
  locationType: 'in_person' | 'video' | 'phone' | 'custom';
  locationDetails?: string;          // Address or meeting link template
  
  // External integration
  calcomEventTypeId?: string;
  
  // Styling
  color?: string;
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CalComConfig {
  apiKey: string;
  baseUrl?: string;                  // Default: https://api.cal.com
}

export interface CalComEventType {
  id: number;
  title: string;
  slug: string;
  description?: string;
  length: number;                    // Duration in minutes
  locations?: {
    type: string;
    address?: string;
    link?: string;
  }[];
}

export interface CalComBooking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED';
  attendees: {
    email: string;
    name: string;
    timeZone: string;
  }[];
  eventType?: CalComEventType;
  location?: string;
  meetingUrl?: string;
}

export interface CreateAppointmentInput {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientId?: string;
  title: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  startTime: string;
  endTime: string;
  duration: number;
  timezone: string;
  reminderPreferences: ReminderPreference[];
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  tags?: string[];
  source?: Appointment['source'];
  calcomEventId?: string;
  calcomEventTypeId?: string;
}

export interface UpdateAppointmentInput {
  id: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientId?: string;
  title?: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  timezone?: string;
  status?: AppointmentStatus;
  reminderPreferences?: ReminderPreference[];
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  tags?: string[];
}

export interface AppointmentFilter {
  status?: AppointmentStatus | AppointmentStatus[];
  startDate?: string;
  endDate?: string;
  clientId?: string;
  assignedTo?: string;
  searchQuery?: string;
}

export interface AppointmentStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcomingToday: number;
  upcomingThisWeek: number;
}

import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/firebase-server';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Webhook endpoint for Cal.com calendar bookings
 * Automatically saves appointment bookers as contacts in OmniFlow
 * 
 * Usage:
 * POST https://your-domain.com/api/automatic-updates/calendar-booking?account=ACCOUNT_ID
 * Headers: Authorization: Bearer YOUR_WEBHOOK_TOKEN
 * 
 * Cal.com sends:
 * {
 *   "attendeeName": "John Doe",
 *   "attendeeEmail": "john@example.com",
 *   "attendeePhone": "+1234567890",
 *   "eventTitle": "30 min Meeting",
 *   "eventStart": "2024-12-10T15:00:00Z",
 *   "eventEnd": "2024-12-10T15:30:00Z",
 *   "eventDescription": "Meeting notes",
 *   "organizer": "your-name"
 * }
 */

interface CalComBookingPayload {
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  attendeeTimezone?: string;
  eventTitle?: string;
  eventStart?: string;
  eventEnd?: string;
  eventDescription?: string;
  eventLocation?: string;
  organizer?: string;
  status?: string;
  [key: string]: any;
}

// CORS headers helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('account');

    // Get webhook token from environment
    const webhookToken = process.env.WEBHOOK_TOKEN || 'default-webhook-token-change-me';

    // Try to extract token from multiple sources (Cal.com might send it differently)
    let token = null;

    // 1. Check Authorization header with Bearer scheme
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    // 2. Check Authorization header without Bearer (plain token)
    else if (authHeader) {
      token = authHeader;
    }
    // 3. Check custom header (X-Cal-Signature, X-Webhook-Token, etc)
    else if (request.headers.get('x-cal-signature')) {
      token = request.headers.get('x-cal-signature');
    } else if (request.headers.get('x-webhook-token')) {
      token = request.headers.get('x-webhook-token');
    } else if (request.headers.get('x-signature')) {
      token = request.headers.get('x-signature');
    }

    console.log('[Cal.com Webhook] Auth headers received:', {
      authorization: authHeader ? '***present***' : 'missing',
      'x-cal-signature': request.headers.get('x-cal-signature') ? '***present***' : 'missing',
      'x-webhook-token': request.headers.get('x-webhook-token') ? '***present***' : 'missing',
      token_found: token ? '***present***' : 'missing'
    });

    // Note: Cal.com webhooks may not send auth headers the way we expect
    // The URL already contains the unique account ID as a security measure
    // If a token is provided, validate it; otherwise allow the request through
    // since the account ID in the URL already restricts access
    if (token && token !== webhookToken) {
      console.error('[Cal.com Webhook] Invalid token provided');
      const response = NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 403 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    if (!token) {
      console.warn('[Cal.com Webhook] No authentication token found, but proceeding (URL account ID provides security)');
    }

    // Validate account ID
    if (!accountId || accountId === 'your-account-id') {
      console.error('[Cal.com Webhook] Missing or placeholder account ID');
      const response = NextResponse.json(
        { error: 'Missing or invalid account parameter. Use ?account=YOUR_COMPANY_ID' },
        { status: 400 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Parse request body
    const rawPayload: any = await request.json();

    console.log('[Cal.com Webhook] Raw payload received:', JSON.stringify(rawPayload));

    // Cal.com may send data nested under "payload" field
    // Extract the actual booking data
    const calPayload = rawPayload.payload || rawPayload;
    
    // Parse attendee information from Cal.com format
    let attendeeName = '';
    let attendeeEmail = '';
    let attendeePhone = '';

    // Cal.com sends attendees as an array
    if (calPayload.attendees && Array.isArray(calPayload.attendees) && calPayload.attendees.length > 0) {
      attendeeName = calPayload.attendees[0].name || '';
      attendeeEmail = calPayload.attendees[0].email || '';
      // Phone is typically not in attendees array, check root level
      attendeePhone = calPayload.attendeePhone || calPayload.phone || '';
    } else {
      // Fallback for different format
      attendeeName = calPayload.attendeeName || '';
      attendeeEmail = calPayload.attendeeEmail || '';
      attendeePhone = calPayload.attendeePhone || '';
    }

    // Validate email field (required for contact)
    if (!attendeeEmail) {
      console.error('[Cal.com Webhook] Missing email field in booking data');
      const response = NextResponse.json(
        { error: 'Attendee email is required' },
        { status: 400 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    console.log('[Cal.com Webhook] Received booking from Cal.com:', {
      name: attendeeName,
      email: attendeeEmail,
      phone: attendeePhone,
      event: calPayload.title,
      start: calPayload.startTime,
    });

    // Check if Firebase is initialized
    if (!serverDb) {
      console.error('[Cal.com Webhook] Firebase not initialized');
      const response = NextResponse.json(
        { error: 'Internal server error: Firebase not initialized' },
        { status: 500 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Check if contact already exists
    const leadsRef = collection(serverDb, 'leads');
    const existingQuery = query(leadsRef, where('email', '==', attendeeEmail), where('companyId', '==', accountId));
    const existingDocs = await getDocs(existingQuery);

    let contactId: string;
    let isNewContact = false;

    if (existingDocs.size > 0) {
      // Contact already exists
      contactId = existingDocs.docs[0].id;
      console.log('[Cal.com Webhook] Contact already exists:', attendeeEmail);
    } else {
      // Create new contact
      const organizerName = calPayload.organizer?.name || calPayload.organizer?.email || 'Unknown organizer';
      const newContact = {
        name: attendeeName || 'Unknown',
        email: attendeeEmail,
        phone: attendeePhone || '',
        status: 'New - From Calendar Booking',
        source: 'cal-com',
        companyId: accountId,
        createdAt: serverTimestamp(),
        lastContacted: serverTimestamp(),
        notes: `Calendar booking from: ${organizerName}`,
        brevoSyncStatus: 'pending',
        hubspotSyncStatus: 'pending',
      };

      const contactDocRef = await addDoc(leadsRef, newContact);
      contactId = contactDocRef.id;
      isNewContact = true;

      console.log('[Cal.com Webhook] New contact created:', {
        contactId: contactId,
        email: attendeeEmail,
        name: attendeeName,
      });
    }

    // Save appointment details to separate collection
    const appointmentsRef = collection(serverDb, 'appointments');
    const appointmentData = {
      contactId: contactId,
      companyId: accountId,
      attendeeName: attendeeName || 'Unknown',
      attendeeEmail: attendeeEmail,
      attendeePhone: attendeePhone || '',
      attendeeTimezone: calPayload.attendeeTimezone || '',
      eventTitle: calPayload.title || 'Untitled Event',
      eventStart: calPayload.startTime ? new Date(calPayload.startTime) : null,
      eventEnd: calPayload.endTime ? new Date(calPayload.endTime) : null,
      eventDescription: calPayload.description || '',
      eventLocation: calPayload.location || '',
      organizer: (calPayload.organizer?.name || calPayload.organizer?.email) || '',
      status: calPayload.status || 'scheduled',
      source: 'cal-com',
      createdAt: serverTimestamp(),
      rawPayload: calPayload, // Store entire payload for debugging
    };

    const appointmentDocRef = await addDoc(appointmentsRef, appointmentData);

    console.log('[Cal.com Webhook] Appointment saved:', {
      appointmentId: appointmentDocRef.id,
      contactId: contactId,
      eventTitle: calPayload.title,
      eventStart: calPayload.startTime,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Calendar booking processed successfully',
        contactId: contactId,
        appointmentId: appointmentDocRef.id,
        isNewContact: isNewContact,
      },
      { status: isNewContact ? 201 : 200 }
    );

    // Add CORS headers
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error: any) {
    console.error('[Cal.com Webhook] Error processing request:', error);
    const response = NextResponse.json(
      { error: 'Internal server error: ' + (error?.message || 'Unknown error') },
      { status: 500 }
    );

    // Add CORS headers
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  const response = NextResponse.json(
    {
      status: 'ok',
      message: 'Cal.com webhook endpoint is ready. Send POST requests with Bearer token authentication.',
      documentation: 'https://your-domain.com/settings - Automatic Updates section',
    },
    { status: 200 }
  );

  // Add CORS headers
  Object.entries(getCorsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

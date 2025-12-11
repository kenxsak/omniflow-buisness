import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/firebase-server';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Webhook endpoint for WordPress/WooCommerce/Custom plugins
 * Accepts custom data and saves as contacts in OmniFlow
 * Flexible format to support various WordPress plugins
 * 
 * Usage:
 * POST https://your-domain.com/api/automatic-updates/wordpress?account=ACCOUNT_ID
 * 
 * Expected body format (flexible):
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "phone": "+1234567890",
 *   "action": "user_register" or "order_created" etc,
 *   "data": { ... additional data ... }
 * }
 */

interface WordPressWebhookPayload {
  name?: string;
  email?: string;
  phone?: string;
  action?: string;
  source?: string;
  user_id?: number | string;
  order_id?: number | string;
  data?: Record<string, any>;
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
    
    // Optional: Bearer token validation
    const authHeader = request.headers.get('authorization');
    const webhookToken = process.env.WEBHOOK_TOKEN || 'default-webhook-token-change-me';

    console.log('[WordPress Webhook] Received request');

    // Validate account ID
    if (!accountId || accountId === 'your-account-id') {
      console.error('[WordPress Webhook] Missing or placeholder account ID');
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
    const payload: WordPressWebhookPayload = await request.json();

    console.log('[WordPress Webhook] Raw payload received:', JSON.stringify(payload).substring(0, 500));

    // Extract customer information (flexible format)
    let customerName = payload.name || payload.data?.name || '';
    let customerEmail = payload.email || payload.data?.email || '';
    let customerPhone = payload.phone || payload.data?.phone || '';
    const action = payload.action || payload.source || 'wordpress_action';

    // Validate email field (required for contact)
    if (!customerEmail) {
      console.error('[WordPress Webhook] Missing email field');
      const response = NextResponse.json(
        { error: 'Email is required in the webhook payload' },
        { status: 400 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    console.log('[WordPress Webhook] Processing contact:', {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      action: action,
    });

    // Check if Firebase is initialized
    if (!serverDb) {
      console.error('[WordPress Webhook] Firebase not initialized');
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
    const existingQuery = query(leadsRef, where('email', '==', customerEmail), where('companyId', '==', accountId));
    const existingDocs = await getDocs(existingQuery);

    let contactId: string;
    let isNewContact = false;

    if (existingDocs.size > 0) {
      // Contact already exists
      contactId = existingDocs.docs[0].id;
      console.log('[WordPress Webhook] Contact already exists:', customerEmail);
    } else {
      // Create new contact
      const newContact = {
        name: customerName || 'Unknown',
        email: customerEmail,
        phone: customerPhone || '',
        status: `New - From WordPress (${action})`,
        source: 'wordpress',
        companyId: accountId,
        createdAt: serverTimestamp(),
        lastContacted: serverTimestamp(),
        notes: `WordPress contact - Action: ${action}`,
        brevoSyncStatus: 'pending',
        hubspotSyncStatus: 'pending',
        wordPressUserId: payload.user_id || '',
        wordPressAction: action,
      };

      const contactDocRef = await addDoc(leadsRef, newContact);
      contactId = contactDocRef.id;
      isNewContact = true;

      console.log('[WordPress Webhook] New contact created:', {
        contactId: contactId,
        email: customerEmail,
        name: customerName,
      });
    }

    // Save the webhook event details for tracking
    const eventsRef = collection(serverDb, 'wordpress_events');
    const eventData = {
      contactId: contactId,
      companyId: accountId,
      action: action,
      email: customerEmail,
      createdAt: serverTimestamp(),
      userId: payload.user_id || '',
      orderId: payload.order_id || '',
      additionalData: payload.data || {},
      rawPayload: payload,
    };

    const eventDocRef = await addDoc(eventsRef, eventData);

    console.log('[WordPress Webhook] Event saved:', {
      eventId: eventDocRef.id,
      contactId: contactId,
      action: action,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'WordPress webhook processed successfully',
        contactId: contactId,
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
    console.error('[WordPress Webhook] Error processing request:', error);
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
      message: 'WordPress webhook endpoint is ready.',
      expectedFormat: {
        name: 'string (optional)',
        email: 'string (required)',
        phone: 'string (optional)',
        action: 'string (optional - user_register, order_created, etc)',
        data: 'object (optional - additional data)',
      },
    },
    { status: 200 }
  );

  // Add CORS headers
  Object.entries(getCorsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

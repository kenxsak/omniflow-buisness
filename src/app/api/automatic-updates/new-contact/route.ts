import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/firebase-server';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Webhook endpoint for Voice Chat AI and other CRMs to send new contact data
 * Authentication: Bearer Token
 * 
 * Usage:
 * POST https://your-domain.com/api/automatic-updates/new-contact?account=ACCOUNT_ID
 * Headers: Authorization: Bearer YOUR_WEBHOOK_TOKEN
 * 
 * Body:
 * {
 *   "name": "Customer Name",
 *   "email": "customer@example.com",
 *   "phone": "1234567890",
 *   "source": "voice-chat-ai",
 *   "conversationId": "optional-conversation-id"
 * }
 */

interface ContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  conversationId?: string;
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

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    const webhookToken = process.env.WEBHOOK_TOKEN || 'default-webhook-token-change-me';

    // Validate Bearer Token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Webhook] Missing or invalid Authorization header');
      const response = NextResponse.json(
        { error: 'Missing or invalid Authorization header. Use Bearer token.' },
        { status: 401 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (token !== webhookToken) {
      console.error('[Webhook] Invalid token provided');
      const response = NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 403 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Validate account ID
    if (!accountId || accountId === 'your-account-id') {
      console.error('[Webhook] Missing or placeholder account ID');
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
    const payload: ContactPayload = await request.json();

    console.log('[Webhook] Raw payload received:', JSON.stringify(payload));

    // If no email and minimal data, treat as test request from Voice Chat AI testing
    if (!payload.email) {
      console.log('[Webhook] Test request accepted (no email field) - returning success');
      const response = NextResponse.json(
        { 
          success: true,
          message: 'Test request received - webhook is reachable',
          isTest: true
        },
        { status: 200 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    console.log('[Webhook] Received contact from Voice Chat AI:', {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      source: payload.source || 'voice-chat-ai',
    });

    // Check if contact already exists
    if (!serverDb) {
      console.error('[Webhook] Firebase not initialized');
      const response = NextResponse.json(
        { error: 'Internal server error: Firebase not initialized' },
        { status: 500 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const leadsRef = collection(serverDb, 'leads');
    const q = query(leadsRef, where('email', '==', payload.email), where('companyId', '==', accountId));
    const existingDocs = await getDocs(q);

    if (existingDocs.size > 0) {
      console.log('[Webhook] Contact already exists:', payload.email);
      const response = NextResponse.json(
        { 
          success: true,
          message: 'Contact already exists',
          contactId: existingDocs.docs[0].id,
          isNew: false
        },
        { status: 200 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Add new contact to Firestore
    const newContact = {
      name: payload.name || 'Unknown',
      email: payload.email,
      phone: payload.phone || '',
      status: 'New',
      source: payload.source || 'voice-chat-ai',
      companyId: accountId,
      createdAt: serverTimestamp(),
      lastContacted: serverTimestamp(),
      notes: payload.conversationId ? `Conversation ID: ${payload.conversationId}` : '',
      brevoSyncStatus: 'pending',
      hubspotSyncStatus: 'pending',
    };

    const docRef = await addDoc(leadsRef, newContact);

    console.log('[Webhook] New contact created successfully:', {
      contactId: docRef.id,
      email: payload.email,
      name: payload.name,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Contact created successfully',
        contactId: docRef.id,
        isNew: true
      },
      { status: 201 }
    );
    
    // Add CORS headers
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;

  } catch (error: any) {
    console.error('[Webhook] Error processing request:', error);
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
      message: 'Voice Chat AI webhook endpoint is ready. Send POST requests with Bearer token authentication.',
      documentation: 'https://your-domain.com/settings - Automatic Updates section'
    },
    { status: 200 }
  );
  
  // Add CORS headers
  Object.entries(getCorsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

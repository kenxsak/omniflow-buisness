import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/firebase-server';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Webhook endpoint for Shopify orders and customers
 * Automatically saves customers as contacts in OmniFlow
 * 
 * Usage:
 * POST https://your-domain.com/api/automatic-updates/shopify?account=ACCOUNT_ID
 * 
 * Shopify sends order/customer data via webhooks
 */

interface ShopifyCustomer {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  [key: string]: any;
}

interface ShopifyOrder {
  id?: string;
  customer?: ShopifyCustomer;
  email?: string;
  billing_address?: {
    phone?: string;
    [key: string]: any;
  };
  line_items?: Array<{
    title?: string;
    quantity?: number;
    price?: string;
  }>;
  total_price?: string;
  created_at?: string;
  [key: string]: any;
}

// CORS headers helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Hmac-SHA256, X-Shopify-Shop-Api-Call-Limit, X-Shopify-Topic',
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
    const webhookTopic = request.headers.get('x-shopify-topic') || 'unknown';

    console.log('[Shopify Webhook] Received:', webhookTopic);

    // Validate account ID
    if (!accountId || accountId === 'your-account-id') {
      console.error('[Shopify Webhook] Missing or placeholder account ID');
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
    const payload: ShopifyOrder & { customer?: ShopifyCustomer } = await request.json();

    console.log('[Shopify Webhook] Raw payload received:', JSON.stringify(payload).substring(0, 500));

    // Extract customer information
    let customerName = '';
    let customerEmail = '';
    let customerPhone = '';

    // Shopify order with customer data
    if (payload.customer) {
      customerEmail = payload.customer.email || payload.email || '';
      customerName = `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim();
      customerPhone = payload.customer.phone || payload.billing_address?.phone || '';
    } else {
      // Fallback for direct email field
      customerEmail = payload.email || '';
    }

    // Validate email field (required for contact)
    if (!customerEmail) {
      console.error('[Shopify Webhook] Missing email field');
      const response = NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    console.log('[Shopify Webhook] Processing customer:', {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      topic: webhookTopic,
    });

    // Check if Firebase is initialized
    if (!serverDb) {
      console.error('[Shopify Webhook] Firebase not initialized');
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
      console.log('[Shopify Webhook] Contact already exists:', customerEmail);
    } else {
      // Create new contact
      const newContact = {
        name: customerName || 'Unknown',
        email: customerEmail,
        phone: customerPhone || '',
        status: 'New - From Shopify',
        source: 'shopify',
        companyId: accountId,
        createdAt: serverTimestamp(),
        lastContacted: serverTimestamp(),
        notes: `Shopify customer - ${webhookTopic}`,
        brevoSyncStatus: 'pending',
        hubspotSyncStatus: 'pending',
        shopifyCustomerId: payload.customer?.id || '',
      };

      const contactDocRef = await addDoc(leadsRef, newContact);
      contactId = contactDocRef.id;
      isNewContact = true;

      console.log('[Shopify Webhook] New contact created:', {
        contactId: contactId,
        email: customerEmail,
        name: customerName,
      });
    }

    // If it's an order event, save order details
    if (payload.id && (webhookTopic.includes('order') || payload.line_items)) {
      const ordersRef = collection(serverDb, 'shopify_orders');
      const orderData = {
        contactId: contactId,
        companyId: accountId,
        shopifyOrderId: payload.id,
        customerEmail: customerEmail,
        customerName: customerName,
        totalPrice: payload.total_price || '0',
        itemCount: payload.line_items?.length || 0,
        items: payload.line_items?.map((item: any) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })) || [],
        createdAt: serverTimestamp(),
        shopifyCreatedAt: payload.created_at || null,
        webhookTopic: webhookTopic,
        rawPayload: payload,
      };

      const orderDocRef = await addDoc(ordersRef, orderData);

      console.log('[Shopify Webhook] Order saved:', {
        orderId: orderDocRef.id,
        contactId: contactId,
        shopifyOrderId: payload.id,
      });
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'Shopify webhook processed successfully',
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
    console.error('[Shopify Webhook] Error processing request:', error);
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
      message: 'Shopify webhook endpoint is ready to receive orders and customer data.',
    },
    { status: 200 }
  );

  // Add CORS headers
  Object.entries(getCorsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

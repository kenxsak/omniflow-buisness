import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/firebase-server';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Webhook endpoint for WooCommerce orders and customers
 * Automatically saves customers as contacts in OmniFlow
 * 
 * Usage:
 * POST https://your-domain.com/api/automatic-updates/woocommerce?account=ACCOUNT_ID
 * 
 * WooCommerce sends order/customer data via webhooks
 */

interface WooCustomer {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  [key: string]: any;
}

interface WooLineItem {
  id?: number;
  name?: string;
  quantity?: number;
  price?: string | number;
  [key: string]: any;
}

interface WooCommerceOrder {
  id?: number;
  customer?: WooCustomer;
  billing?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    [key: string]: any;
  };
  line_items?: WooLineItem[];
  total?: string;
  date_created?: string;
  [key: string]: any;
}

// CORS headers helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-WC-Webhook-ID, X-WC-Webhook-Delivery-ID, X-WC-Webhook-Topic, X-WC-Webhook-Signature',
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
    const webhookTopic = request.headers.get('x-wc-webhook-topic') || 'unknown';

    console.log('[WooCommerce Webhook] Received:', webhookTopic);

    // Validate account ID
    if (!accountId || accountId === 'your-account-id') {
      console.error('[WooCommerce Webhook] Missing or placeholder account ID');
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
    const payload: WooCommerceOrder = await request.json();

    console.log('[WooCommerce Webhook] Raw payload received:', JSON.stringify(payload).substring(0, 500));

    // Extract customer information
    let customerName = '';
    let customerEmail = '';
    let customerPhone = '';

    // WooCommerce order with billing info
    if (payload.billing) {
      customerEmail = payload.billing.email || '';
      customerName = `${payload.billing.first_name || ''} ${payload.billing.last_name || ''}`.trim();
      customerPhone = payload.billing.phone || '';
    }

    // Override with customer object if available
    if (payload.customer) {
      customerEmail = payload.customer.email || customerEmail;
      customerName = `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim() || customerName;
      customerPhone = payload.customer.phone || customerPhone;
    }

    // Validate email field (required for contact)
    if (!customerEmail) {
      console.error('[WooCommerce Webhook] Missing email field');
      const response = NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    console.log('[WooCommerce Webhook] Processing customer:', {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      topic: webhookTopic,
    });

    // Check if Firebase is initialized
    if (!serverDb) {
      console.error('[WooCommerce Webhook] Firebase not initialized');
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
      console.log('[WooCommerce Webhook] Contact already exists:', customerEmail);
    } else {
      // Create new contact
      const newContact = {
        name: customerName || 'Unknown',
        email: customerEmail,
        phone: customerPhone || '',
        status: 'New - From WooCommerce',
        source: 'woocommerce',
        companyId: accountId,
        createdAt: serverTimestamp(),
        lastContacted: serverTimestamp(),
        notes: `WooCommerce customer - ${webhookTopic}`,
        brevoSyncStatus: 'pending',
        hubspotSyncStatus: 'pending',
        wooCommerceCustomerId: payload.customer?.id || '',
      };

      const contactDocRef = await addDoc(leadsRef, newContact);
      contactId = contactDocRef.id;
      isNewContact = true;

      console.log('[WooCommerce Webhook] New contact created:', {
        contactId: contactId,
        email: customerEmail,
        name: customerName,
      });
    }

    // If it's an order event, save order details
    if (payload.id && webhookTopic.includes('order')) {
      const ordersRef = collection(serverDb, 'woocommerce_orders');
      const orderData = {
        contactId: contactId,
        companyId: accountId,
        wooOrderId: payload.id,
        customerEmail: customerEmail,
        customerName: customerName,
        total: payload.total || '0',
        itemCount: payload.line_items?.length || 0,
        items: payload.line_items?.map((item: WooLineItem) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })) || [],
        createdAt: serverTimestamp(),
        wooCreatedAt: payload.date_created || null,
        webhookTopic: webhookTopic,
        rawPayload: payload,
      };

      const orderDocRef = await addDoc(ordersRef, orderData);

      console.log('[WooCommerce Webhook] Order saved:', {
        orderId: orderDocRef.id,
        contactId: contactId,
        wooOrderId: payload.id,
      });
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'WooCommerce webhook processed successfully',
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
    console.error('[WooCommerce Webhook] Error processing request:', error);
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
      message: 'WooCommerce webhook endpoint is ready to receive orders and customer data.',
    },
    { status: 200 }
  );

  // Add CORS headers
  Object.entries(getCorsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

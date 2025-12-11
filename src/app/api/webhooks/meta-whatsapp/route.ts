/**
 * Meta WhatsApp Cloud API Webhook
 * 
 * Receives incoming messages, status updates, and other events from Meta
 * 
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Webhook verification
 * Meta sends this during setup to verify the webhook endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify token should match what you set in Meta Business Manager
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'omniflow_meta_webhook_2024';

    console.log('[Meta Webhook] Verification request received');
    console.log('[Meta Webhook] Mode:', mode);
    console.log('[Meta Webhook] Token:', token ? '***' : 'missing');
    console.log('[Meta Webhook] Challenge:', challenge);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Meta Webhook] ✅ Verification successful');
      return new NextResponse(challenge, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }

    console.error('[Meta Webhook] ❌ Verification failed');
    return NextResponse.json(
      { error: 'Invalid verification token' },
      { status: 403 }
    );
  } catch (error) {
    console.error('[Meta Webhook] Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

/**
 * POST - Handle incoming webhook events
 * Meta sends message updates, status updates, and other events
 */
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // SECURITY: Verify the webhook signature
    const APP_SECRET = process.env.META_APP_SECRET;
    
    if (!APP_SECRET) {
      console.error('[Meta Webhook] ❌ META_APP_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    if (!signature) {
      console.error('[Meta Webhook] ❌ Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 403 }
      );
    }

    // Verify HMAC signature
    const crypto = await import('crypto');
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', APP_SECRET)
      .update(bodyText)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('[Meta Webhook] ❌ Invalid signature');
      console.error('[Meta Webhook] Expected:', expectedSignature);
      console.error('[Meta Webhook] Received:', signature);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    console.log('[Meta Webhook] ✅ Signature verified');

    const body = JSON.parse(bodyText);
    console.log('[Meta Webhook] Event received:', JSON.stringify(body, null, 2));

    // Acknowledge receipt immediately
    // Meta expects a 200 OK within 20 seconds
    const response = NextResponse.json({ status: 'received' }, { status: 200 });

    // Process the webhook in the background
    // Don't await this - respond to Meta quickly
    processWebhookEvent(body).catch(error => {
      console.error('[Meta Webhook] Processing error:', error);
    });

    return response;
  } catch (error) {
    console.error('[Meta Webhook] Error:', error);
    // Still return 200 to avoid Meta retrying
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

/**
 * Process webhook event in the background
 */
async function processWebhookEvent(body: any) {
  try {
    // Meta sends events in this structure
    const entry = body.entry?.[0];
    if (!entry) {
      console.log('[Meta Webhook] No entry in webhook body');
      return;
    }

    const changes = entry.changes?.[0];
    if (!changes) {
      console.log('[Meta Webhook] No changes in entry');
      return;
    }

    const value = changes.value;
    if (!value) {
      console.log('[Meta Webhook] No value in changes');
      return;
    }

    // Handle different event types
    if (value.messages) {
      // Incoming message
      await handleIncomingMessage(value);
    }

    if (value.statuses) {
      // Message status update (sent, delivered, read, failed)
      await handleStatusUpdate(value);
    }

    // Other event types: contacts, errors, etc.
    // Add handlers as needed
  } catch (error) {
    console.error('[Meta Webhook] Event processing error:', error);
  }
}

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(value: any) {
  try {
    const messages = value.messages || [];
    const metadata = value.metadata || {};

    console.log('[Meta Webhook] Processing', messages.length, 'incoming message(s)');

    for (const message of messages) {
      const {
        from,      // Customer's phone number
        id,        // Message ID
        timestamp, // Unix timestamp
        type,      // text, image, document, etc.
        text,      // Message text (if type is 'text')
      } = message;

      console.log('[Meta Webhook] Message from:', from);
      console.log('[Meta Webhook] Message type:', type);
      console.log('[Meta Webhook] Message ID:', id);

      if (type === 'text') {
        console.log('[Meta Webhook] Message text:', text?.body);
      }

      // TODO: Store message in database
      // TODO: Trigger auto-reply if configured
      // TODO: Create/update lead in CRM
      // TODO: Notify team members if configured

      // For now, just log
      console.log('[Meta Webhook] Incoming message processed:', id);
    }
  } catch (error) {
    console.error('[Meta Webhook] Message handling error:', error);
  }
}

/**
 * Handle message status update
 */
async function handleStatusUpdate(value: any) {
  try {
    const statuses = value.statuses || [];

    console.log('[Meta Webhook] Processing', statuses.length, 'status update(s)');

    for (const status of statuses) {
      const {
        id,          // Message ID
        status: messageStatus,  // sent, delivered, read, failed
        timestamp,   // Unix timestamp
        recipient_id,// Customer's phone number
        errors,      // Error details (if failed)
      } = status;

      console.log('[Meta Webhook] Status update for message:', id);
      console.log('[Meta Webhook] New status:', messageStatus);
      console.log('[Meta Webhook] Recipient:', recipient_id);

      if (messageStatus === 'failed' && errors) {
        console.error('[Meta Webhook] Message failed:', errors);
      }

      // TODO: Update message status in database
      // TODO: Update campaign statistics
      // TODO: Trigger notifications if failed

      // For now, just log
      console.log('[Meta Webhook] Status update processed:', id, '->', messageStatus);
    }
  } catch (error) {
    console.error('[Meta Webhook] Status handling error:', error);
  }
}

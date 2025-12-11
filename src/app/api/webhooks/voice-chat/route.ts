import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// Interface for incoming webhook data from Voice Chatbot
interface VoiceChatWebhookPayload {
  contact: {
    name: string;
    phone?: string;
    email?: string;
  };
  source: string;
  card_id: string; // Digital Card ID
  cardUsername?: string; // Digital Card username
  conversation: Array<{
    role: 'user' | 'bot';
    message: string;
    timestamp?: string;
  }>;
  conversationId: string;
  intent?: string;
  qualified?: boolean;
  language?: string;
  deviceType?: string;
  location?: string;
  timestamp: string;
  signature?: string; // For webhook validation
  tenantId?: string; // Voice Chat AI tenant ID
  agentId?: string; // Voice Chat AI agent ID
}

/**
 * POST /api/webhooks/voice-chat
 * Receives webhook data from Voice Chatbot and creates leads in CRM
 * 
 * Multi-Tenant Security:
 * - Each Digital Card has its own unique webhook secret
 * - Validates using per-card authentication (not shared secret)
 * - Supports both Authorization header and query parameter authentication
 */
export async function POST(request: Request) {
  try {
    // Parse the webhook payload
    const payload: VoiceChatWebhookPayload = await request.json();

    console.log('📞 Voice Chat Webhook received:', {
      cardId: payload.card_id,
      contactName: payload.contact.name,
      conversationId: payload.conversationId,
      tenantId: payload.tenantId,
      agentId: payload.agentId
    });

    // Validate required fields
    if (!payload.contact?.name || !payload.card_id) {
      console.error('❌ Missing required fields in webhook payload');
      return NextResponse.json(
        { error: 'Missing required fields: contact.name and card_id are required' },
        { status: 400 }
      );
    }

    // Validate at least one contact method
    if (!payload.contact.phone && !payload.contact.email) {
      console.error('❌ Missing contact information');
      return NextResponse.json(
        { error: 'At least one contact method (phone or email) is required' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      console.error('❌ Database not initialized');
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Get the Digital Card to validate and find the business owner
    const cardDoc = await adminDb.collection('digitalCards').doc(payload.card_id).get();
    
    if (!cardDoc.exists) {
      console.error('❌ Digital Card not found:', payload.card_id);
      return NextResponse.json(
        { error: 'Digital Card not found' },
        { status: 404 }
      );
    }

    const digitalCard = cardDoc.data();
    const businessUserId = digitalCard?.userId;
    const companyId = digitalCard?.companyId;

    // MULTI-TENANT SECURITY: Support both company-wide and per-card authentication
    // Get the webhook token from Authorization header or query parameter
    const url = new URL(request.url);
    const tokenFromQuery = url.searchParams.get('token');
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const providedToken = tokenFromHeader || tokenFromQuery;

    // Check company-wide Voice Chat AI configuration first (new approach)
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    const companyVoiceChatConfig = companyDoc.data()?.integrations?.voiceChat;
    
    let authValid = false;

    // Try company-wide authentication (new method)
    if (companyVoiceChatConfig?.enabled && companyVoiceChatConfig?.webhookToken) {
      if (providedToken === companyVoiceChatConfig.webhookToken) {
        authValid = true;
        console.log('✅ Company-wide webhook authentication successful');
      }
    }

    // Fallback to per-card authentication (old method - for backwards compatibility)
    if (!authValid) {
      const perCardToken = digitalCard?.voiceChatbot?.webhookSecret;
      if (perCardToken && providedToken === perCardToken) {
        authValid = true;
        console.log('✅ Per-card webhook authentication successful (legacy)');
      }
    }

    // If neither authentication method worked, reject the request
    if (!authValid) {
      console.error('❌ Invalid webhook authentication for card:', payload.card_id);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid webhook authentication token. Please check your Voice Chat AI webhook settings.' },
        { status: 401 }
      );
    }

    console.log('✅ Webhook authentication successful for card:', payload.card_id);

    if (!businessUserId || !companyId) {
      console.error('❌ Digital Card missing userId or companyId');
      return NextResponse.json(
        { error: 'Digital Card configuration error' },
        { status: 500 }
      );
    }

    // Calculate lead score based on conversation quality
    const leadScore = calculateLeadScore(payload);

    // Prepare conversation summary
    const conversationSummary = payload.conversation
      .map(msg => `${msg.role === 'user' ? '👤' : '🤖'} ${msg.message}`)
      .join('\n');

    // Create conversation notes
    const conversationNotes = `
Voice Chat Conversation (${payload.language || 'Unknown Language'})
Conversation ID: ${payload.conversationId}
Intent: ${payload.intent || 'Not detected'}
Qualified: ${payload.qualified ? 'Yes' : 'No'}
Lead Score: ${leadScore}/100

--- Conversation Summary ---
${conversationSummary}

--- Details ---
Device: ${payload.deviceType || 'Unknown'}
Location: ${payload.location || 'Unknown'}
Date: ${payload.timestamp}
    `.trim();

    // Create the lead in Firestore
    const leadData = {
      name: payload.contact.name,
      email: payload.contact.email || `no-email-${Date.now()}@voice-chat.omniflow.app`,
      phone: payload.contact.phone || undefined,
      status: payload.qualified ? 'Qualified' : 'New',
      source: 'Digital Card - Voice Chat',
      sourceMetadata: {
        digitalCardId: payload.card_id,
        digitalCardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://omniflow.app'}/card/${payload.cardUsername || digitalCard?.username}`,
        chatbotConversationId: payload.conversationId,
        voiceChatLanguage: payload.language,
        voiceChatIntent: payload.intent,
        voiceChatQualified: payload.qualified,
        deviceType: payload.deviceType,
        location: payload.location,
      },
      notes: conversationNotes,
      assignedTo: businessUserId,
      companyId: companyId,
      brevoSyncStatus: 'unsynced',
      hubspotSyncStatus: 'unsynced',
      attributes: {
        LEAD_SCORE: leadScore.toString(),
        CONVERSATION_ID: payload.conversationId,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastContacted: admin.firestore.FieldValue.serverTimestamp(),
    };

    const leadsRef = adminDb.collection('leads');
    const leadDocRef = await leadsRef.add(leadData);
    const leadId = leadDocRef.id;

    console.log('✅ Lead created from Voice Chat:', leadId);

    // Update Digital Card analytics
    await adminDb.collection('digitalCards').doc(payload.card_id).update({
      'analytics.chatInteractions': admin.firestore.FieldValue.increment(1),
      'analytics.leadsGenerated': admin.firestore.FieldValue.increment(1),
      'analytics.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Digital Card analytics updated');

    // Return success response
    return NextResponse.json({
      success: true,
      leadId: leadId,
      message: 'Lead created successfully from voice chat',
    });

  } catch (error) {
    console.error('❌ Error processing voice chat webhook:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate lead quality score based on conversation data
 */
function calculateLeadScore(payload: VoiceChatWebhookPayload): number {
  let score = 50; // Base score

  // Bonus for being marked as qualified
  if (payload.qualified) {
    score += 25;
  }

  // Bonus for having both phone and email
  if (payload.contact.phone && payload.contact.email) {
    score += 10;
  }

  // Bonus for longer conversations (more engaged)
  const messageCount = payload.conversation?.length || 0;
  if (messageCount > 10) {
    score += 15;
  } else if (messageCount > 5) {
    score += 10;
  } else if (messageCount > 2) {
    score += 5;
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * GET endpoint for testing webhook connectivity
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/voice-chat',
    message: 'Voice Chatbot webhook endpoint is ready to receive POST requests',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { addToSuppressionList } from '@/lib/email-suppression-server';
import type { SuppressionReason } from '@/types/email-lists';

interface SenderWebhookEvent {
  event: string;
  email: string;
  subscriber_id?: string;
  campaign_id?: string;
  message_id?: string;
  timestamp?: string;
  reason?: string;
  error_type?: string;
  list_id?: string;
  metadata?: Record<string, any>;
}

const SENDER_EVENT_TO_REASON: Record<string, SuppressionReason> = {
  'unsubscribed': 'unsubscribe',
  'unsubscribe': 'unsubscribe',
  'hard_bounce': 'hard_bounce',
  'hardbounce': 'hard_bounce',
  'soft_bounce': 'soft_bounce',
  'softbounce': 'soft_bounce',
  'complaint': 'complaint',
  'spam_complaint': 'complaint',
  'spam': 'complaint',
  'bounce': 'hard_bounce',
  'dropped': 'invalid_email',
  'invalid': 'invalid_email',
};


async function findCompanyByMetadata(metadata: Record<string, any> | undefined): Promise<string | null> {
  if (!metadata?.companyId) return null;
  return metadata.companyId;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const events: SenderWebhookEvent[] = Array.isArray(body) 
      ? body 
      : body.events 
        ? body.events 
        : [body];

    console.log(`[Sender Webhook] Received ${events.length} events`);

    const results = {
      processed: 0,
      suppressed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const event of events) {
      try {
        const eventType = event.event?.toLowerCase();
        const email = event.email?.toLowerCase();

        if (!email) {
          results.skipped++;
          continue;
        }

        const suppressionReason = SENDER_EVENT_TO_REASON[eventType];
        
        if (!suppressionReason) {
          console.log(`[Sender Webhook] Skipping non-suppression event: ${eventType} for ${email}`);
          results.skipped++;
          continue;
        }

        const companyId = await findCompanyByMetadata(event.metadata);

        if (!companyId) {
          console.warn(`[Sender Webhook] No company ID provided in metadata for ${email}`);
          results.errors.push(`No company ID in webhook metadata for ${email}. Include metadata.companyId in webhook configuration`);
          results.skipped++;
          continue;
        }

        const result = await addToSuppressionList(
          email,
          companyId,
          suppressionReason,
          'sender',
          {
            providerEventId: event.subscriber_id || event.message_id,
            campaignId: event.campaign_id,
            messageId: event.message_id,
            extra: {
              originalEvent: eventType,
              reason: event.reason,
              errorType: event.error_type,
              listId: event.list_id,
              timestamp: event.timestamp,
            },
          }
        );

        if (result.success) {
          results.suppressed++;
          console.log(`[Sender Webhook] Added ${email} to suppression list: ${suppressionReason}`);
        } else {
          results.errors.push(`Failed to suppress ${email}: ${result.error}`);
        }

        results.processed++;
      } catch (error: any) {
        console.error(`[Sender Webhook] Error processing event:`, error);
        results.errors.push(error.message);
      }
    }

    console.log(`[Sender Webhook] Completed: ${JSON.stringify(results)}`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error: any) {
    console.error('[Sender Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Sender.net Webhook',
    status: 'active',
    supportedEvents: Object.keys(SENDER_EVENT_TO_REASON),
    message: 'Configure this URL in your Sender.net account webhook settings',
  });
}

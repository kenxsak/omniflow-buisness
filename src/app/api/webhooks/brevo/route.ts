import { NextRequest, NextResponse } from 'next/server';
import { addToSuppressionList } from '@/lib/email-suppression-server';
import type { SuppressionReason } from '@/types/email-lists';

interface BrevoWebhookEvent {
  event: string;
  email: string;
  id?: number;
  'message-id'?: string;
  date?: string;
  ts?: number;
  ts_event?: number;
  subject?: string;
  tag?: string;
  sending_ip?: string;
  ts_epoch?: number;
  template_id?: number;
  camp_id?: number;
  link?: string;
  reason?: string;
  error_code?: string;
  'X-Mailin-custom'?: string;
}

const BREVO_EVENT_TO_REASON: Record<string, SuppressionReason> = {
  'unsubscribed': 'unsubscribe',
  'unsubscribe': 'unsubscribe',
  'hard_bounce': 'hard_bounce',
  'hardBounce': 'hard_bounce',
  'soft_bounce': 'soft_bounce',
  'softBounce': 'soft_bounce',
  'complaint': 'complaint',
  'spam': 'complaint',
  'blocked': 'hard_bounce',
  'invalid': 'invalid_email',
  'invalid_email': 'invalid_email',
};


async function findCompanyByCustomHeader(customHeader: string): Promise<string | null> {
  if (!customHeader) return null;
  
  try {
    const parsed = JSON.parse(customHeader);
    return parsed.companyId || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const events: BrevoWebhookEvent | BrevoWebhookEvent[] = await request.json();
    const eventList = Array.isArray(events) ? events : [events];

    console.log(`[Brevo Webhook] Received ${eventList.length} events`);

    const results = {
      processed: 0,
      suppressed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const event of eventList) {
      try {
        const eventType = event.event?.toLowerCase();
        const email = event.email?.toLowerCase();

        if (!email) {
          results.skipped++;
          continue;
        }

        const suppressionReason = BREVO_EVENT_TO_REASON[eventType];
        
        if (!suppressionReason) {
          console.log(`[Brevo Webhook] Skipping non-suppression event: ${eventType} for ${email}`);
          results.skipped++;
          continue;
        }

        const companyId = await findCompanyByCustomHeader(event['X-Mailin-custom'] || '');

        if (!companyId) {
          console.warn(`[Brevo Webhook] No company ID provided in X-Mailin-custom header for ${email}`);
          results.errors.push(`No company ID in webhook header for ${email}. Configure X-Mailin-custom with {"companyId":"your-company-id"}`);
          results.skipped++;
          continue;
        }

        const result = await addToSuppressionList(
          email,
          companyId,
          suppressionReason,
          'brevo',
          {
            providerEventId: String(event.id || event['message-id'] || ''),
            campaignId: event.camp_id ? String(event.camp_id) : undefined,
            messageId: event['message-id'],
            extra: {
              originalEvent: eventType,
              reason: event.reason,
              errorCode: event.error_code,
              timestamp: event.ts_event || event.ts,
            },
          }
        );

        if (result.success) {
          results.suppressed++;
          console.log(`[Brevo Webhook] Added ${email} to suppression list: ${suppressionReason}`);
        } else {
          results.errors.push(`Failed to suppress ${email}: ${result.error}`);
        }

        results.processed++;
      } catch (error: any) {
        console.error(`[Brevo Webhook] Error processing event:`, error);
        results.errors.push(error.message);
      }
    }

    console.log(`[Brevo Webhook] Completed: ${JSON.stringify(results)}`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error: any) {
    console.error('[Brevo Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Brevo Webhook',
    status: 'active',
    supportedEvents: Object.keys(BREVO_EVENT_TO_REASON),
    message: 'Configure this URL in your Brevo account webhook settings',
  });
}

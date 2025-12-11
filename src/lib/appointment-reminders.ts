'use server';

import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { format, parseISO, subHours } from 'date-fns';
import { decryptApiKeyServerSide, isEncrypted } from '@/lib/encryption-server';
import { sendTransactionalEmail } from '@/services/brevo';
import { sendBulkSMSMSG91, type MSG91Config } from '@/lib/msg91-client';
import { sendTwilioSMS, type TwilioConfig } from '@/lib/twilio-sms-client';
import { sendEmailSMTP, type SMTPConfig } from '@/lib/smtp-client';
import {
  sendUnifiedWhatsAppBulk,
  type UnifiedWhatsAppConfig,
} from '@/lib/unified-whatsapp-service';
import type {
  Appointment,
  AppointmentReminder,
  ReminderChannel,
  ReminderStatus,
} from '@/types/appointments';
import type { StoredApiKeys } from '@/types/integrations';

const APPOINTMENTS_COLLECTION = 'appointments';

interface SendReminderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface CompanyApiKeys {
  brevo?: { apiKey?: string; senderEmail?: string; senderName?: string };
  smtp?: {
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    fromEmail?: string;
    fromName?: string;
  };
  msg91?: { authKey?: string; senderId?: string };
  twilio?: { accountSid?: string; authToken?: string; phoneNumber?: string };
  authkey?: { apiKey?: string };
  aisensy?: { apiKey?: string };
  gupshup?: { apiKey?: string; appName?: string; srcName?: string; source?: string };
  metaWhatsApp?: { phoneNumberId?: string; accessToken?: string; wabaId?: string };
}

async function getCompanyApiKeys(companyId: string): Promise<CompanyApiKeys> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return {};
  }

  try {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      console.warn(`Company ${companyId} not found`);
      return {};
    }

    const companyData = companyDoc.data();
    const storedKeys = (companyData?.apiKeys || {}) as StoredApiKeys;
    const decryptedKeys: CompanyApiKeys = {};

    for (const [serviceId, serviceKeys] of Object.entries(storedKeys)) {
      if (!serviceKeys || typeof serviceKeys !== 'object') continue;

      const decryptedServiceKeys: Record<string, string> = {};

      for (const [fieldId, value] of Object.entries(
        serviceKeys as Record<string, any>
      )) {
        if (value === null || value === undefined) {
          decryptedServiceKeys[fieldId] = '';
          continue;
        }

        try {
          if (isEncrypted(value)) {
            decryptedServiceKeys[fieldId] = decryptApiKeyServerSide(value);
          } else if (typeof value === 'string') {
            decryptedServiceKeys[fieldId] = value;
          } else {
            decryptedServiceKeys[fieldId] = String(value);
          }
        } catch (err) {
          console.warn(`Failed to decrypt ${serviceId}.${fieldId}`, err);
          decryptedServiceKeys[fieldId] = '';
        }
      }

      (decryptedKeys as any)[serviceId] = decryptedServiceKeys;
    }

    return decryptedKeys;
  } catch (error) {
    console.error('Error fetching company API keys:', error);
    return {};
  }
}

async function getCompanyName(companyId: string): Promise<string> {
  if (!adminDb) return 'Our Business';

  try {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    return companyDoc.data()?.name || 'Our Business';
  } catch {
    return 'Our Business';
  }
}

function formatAppointmentDateTime(appointment: Appointment): {
  date: string;
  time: string;
  dateTime: string;
} {
  const startTime = parseISO(appointment.startTime);
  return {
    date: format(startTime, 'EEEE, MMMM d, yyyy'),
    time: format(startTime, 'h:mm a'),
    dateTime: format(startTime, "EEEE, MMMM d, yyyy 'at' h:mm a"),
  };
}

export async function generateReminderMessage(
  appointment: Appointment,
  channel: ReminderChannel,
  companyName: string
): Promise<{ subject?: string; text: string; html?: string }> {
  const { date, time, dateTime } = formatAppointmentDateTime(appointment);
  const location = appointment.location || 'To be confirmed';
  const meetingLink = appointment.meetingLink;

  switch (channel) {
    case 'email':
      return {
        subject: `Reminder: ${appointment.title} - ${dateTime}`,
        text: `Hi ${appointment.clientName},

This is a friendly reminder about your upcoming appointment:

📅 ${appointment.title}
📆 Date: ${date}
⏰ Time: ${time}
📍 Location: ${location}
${meetingLink ? `🔗 Meeting Link: ${meetingLink}` : ''}

If you need to reschedule or cancel, please contact us as soon as possible.

Best regards,
${companyName}`,
        html: generateReminderEmailHTML(appointment, companyName),
      };

    case 'sms':
      const smsMessage = `Hi ${appointment.clientName}! Reminder: ${appointment.title} on ${format(parseISO(appointment.startTime), 'MMM d')} at ${time}. ${location !== 'To be confirmed' ? `Location: ${location}` : ''} - ${companyName}`;
      return {
        text: smsMessage.substring(0, 160),
      };

    case 'whatsapp':
      return {
        text: `Hi ${appointment.clientName}! 👋

This is a reminder about your upcoming appointment:

📅 *${appointment.title}*
📆 Date: ${date}
⏰ Time: ${time}
📍 Location: ${location}
${meetingLink ? `🔗 Meeting Link: ${meetingLink}` : ''}

Please reply to confirm or contact us to reschedule.

- ${companyName}`,
      };

    default:
      return { text: '' };
  }
}

function generateReminderEmailHTML(
  appointment: Appointment,
  companyName: string
): string {
  const { date, time } = formatAppointmentDateTime(appointment);
  const location = appointment.location || 'To be confirmed';
  const meetingLink = appointment.meetingLink;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">📅 Appointment Reminder</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Hi <strong>${appointment.clientName}</strong>,
              </p>
              <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                This is a friendly reminder about your upcoming appointment.
              </p>
              <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                  ${appointment.title}
                </h2>
                <p style="margin: 0 0 8px; color: #2d3748; font-size: 15px;">
                  <strong>📆 Date:</strong> ${date}
                </p>
                <p style="margin: 0 0 8px; color: #2d3748; font-size: 15px;">
                  <strong>⏰ Time:</strong> ${time}
                </p>
                <p style="margin: 0 0 8px; color: #2d3748; font-size: 15px;">
                  <strong>📍 Location:</strong> ${location}
                </p>
                ${appointment.duration ? `<p style="margin: 0 0 8px; color: #2d3748; font-size: 15px;"><strong>⏱️ Duration:</strong> ${appointment.duration} minutes</p>` : ''}
              </div>
              ${
                meetingLink
                  ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${meetingLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                  Join Meeting
                </a>
              </div>
              `
                  : ''
              }
              ${
                appointment.description
                  ? `
              <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 8px; color: #2d3748; font-size: 16px; font-weight: 600;">Notes:</h3>
                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">${appointment.description}</p>
              </div>
              `
                  : ''
              }
              <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                If you need to reschedule or cancel your appointment, please contact us as soon as possible.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f7fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #718096; font-size: 13px; text-align: center;">
                This reminder was sent by <strong>${companyName}</strong>
              </p>
              <p style="margin: 8px 0 0; color: #a0aec0; font-size: 12px; text-align: center;">
                Powered by OmniFlow
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendEmailReminder(
  appointment: Appointment,
  companyId: string
): Promise<SendReminderResult> {
  try {
    const apiKeys = await getCompanyApiKeys(companyId);
    const companyName = await getCompanyName(companyId);
    const message = await generateReminderMessage(appointment, 'email', companyName);

    if (apiKeys.brevo?.apiKey) {
      const senderEmail = apiKeys.brevo.senderEmail || 'noreply@omniflow.com';
      const senderName = apiKeys.brevo.senderName || companyName;

      console.log(`[Reminder] Sending email reminder via Brevo to ${appointment.clientEmail}`);

      const result = await sendTransactionalEmail(
        apiKeys.brevo.apiKey,
        senderEmail,
        senderName,
        appointment.clientEmail,
        appointment.clientName,
        message.subject || 'Appointment Reminder',
        message.html || message.text
      );

      if (result.success) {
        return { success: true, messageId: result.messageId };
      }
      console.warn('[Reminder] Brevo failed, trying SMTP...', result.error);
    }

    if (
      apiKeys.smtp?.host &&
      apiKeys.smtp?.username &&
      apiKeys.smtp?.password
    ) {
      const smtpConfig: SMTPConfig = {
        host: apiKeys.smtp.host,
        port: apiKeys.smtp.port || '587',
        username: apiKeys.smtp.username,
        password: apiKeys.smtp.password,
        fromEmail: apiKeys.smtp.fromEmail || apiKeys.smtp.username,
        fromName: apiKeys.smtp.fromName || companyName,
      };

      console.log(`[Reminder] Sending email reminder via SMTP to ${appointment.clientEmail}`);

      const result = await sendEmailSMTP(smtpConfig, {
        to: appointment.clientEmail,
        subject: message.subject || 'Appointment Reminder',
        html: message.html,
        text: message.text,
      });

      if (result.success) {
        return { success: true, messageId: result.messageId };
      }

      return { success: false, error: result.error };
    }

    return {
      success: false,
      error: 'No email provider configured. Please configure Brevo or SMTP in Settings.',
    };
  } catch (error) {
    console.error('[Reminder] Error sending email reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email reminder',
    };
  }
}

export async function sendSMSReminder(
  appointment: Appointment,
  companyId: string
): Promise<SendReminderResult> {
  try {
    if (!appointment.clientPhone) {
      return {
        success: false,
        error: 'Client phone number not available',
      };
    }

    const apiKeys = await getCompanyApiKeys(companyId);
    const companyName = await getCompanyName(companyId);
    const message = await generateReminderMessage(appointment, 'sms', companyName);

    let phone = appointment.clientPhone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    if (apiKeys.msg91?.authKey && apiKeys.msg91?.senderId) {
      const config: MSG91Config = {
        authKey: apiKeys.msg91.authKey,
        senderId: apiKeys.msg91.senderId,
      };

      console.log(`[Reminder] Sending SMS reminder via MSG91 to ${phone}`);

      const result = await sendBulkSMSMSG91(config, {
        message: message.text,
        recipients: [phone],
        route: 'transactional',
      });

      if (result.success) {
        return { success: true, messageId: result.requestId };
      }
      console.warn('[Reminder] MSG91 failed, trying Twilio...', result.error);
    }

    if (
      apiKeys.twilio?.accountSid &&
      apiKeys.twilio?.authToken &&
      apiKeys.twilio?.phoneNumber
    ) {
      const config: TwilioConfig = {
        accountSid: apiKeys.twilio.accountSid,
        authToken: apiKeys.twilio.authToken,
        fromPhoneNumber: apiKeys.twilio.phoneNumber,
      };

      console.log(`[Reminder] Sending SMS reminder via Twilio to ${phone}`);

      const result = await sendTwilioSMS(config, {
        toPhoneNumber: phone,
        message: message.text,
      });

      if (result.success) {
        return { success: true, messageId: result.messageId };
      }

      return { success: false, error: result.error };
    }

    return {
      success: false,
      error: 'No SMS provider configured. Please configure MSG91 or Twilio in Settings.',
    };
  } catch (error) {
    console.error('[Reminder] Error sending SMS reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS reminder',
    };
  }
}

export async function sendWhatsAppReminder(
  appointment: Appointment,
  companyId: string
): Promise<SendReminderResult> {
  try {
    if (!appointment.clientPhone) {
      return {
        success: false,
        error: 'Client phone number not available',
      };
    }

    const apiKeys = await getCompanyApiKeys(companyId);
    const companyName = await getCompanyName(companyId);

    let phone = appointment.clientPhone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const whatsappConfig: UnifiedWhatsAppConfig = {};

    if (apiKeys.authkey?.apiKey) {
      whatsappConfig.authkey = {
        apiKey: apiKeys.authkey.apiKey,
      };
    }

    if (apiKeys.aisensy?.apiKey) {
      whatsappConfig.aisensy = {
        apiKey: apiKeys.aisensy.apiKey,
      };
    }

    if (apiKeys.gupshup?.apiKey && apiKeys.gupshup?.appName) {
      whatsappConfig.gupshup = {
        apiKey: apiKeys.gupshup.apiKey,
        appName: apiKeys.gupshup.appName,
        srcName: apiKeys.gupshup.srcName,
        source: apiKeys.gupshup.source,
      };
    }

    if (
      apiKeys.metaWhatsApp?.phoneNumberId &&
      apiKeys.metaWhatsApp?.accessToken
    ) {
      whatsappConfig.meta = {
        phoneNumberId: apiKeys.metaWhatsApp.phoneNumberId,
        accessToken: apiKeys.metaWhatsApp.accessToken,
        wabaId: apiKeys.metaWhatsApp.wabaId,
      };
    }

    if (Object.keys(whatsappConfig).length === 0) {
      return {
        success: false,
        error: 'No WhatsApp provider configured. Please configure a WhatsApp provider in Settings.',
      };
    }

    console.log(`[Reminder] Sending WhatsApp reminder to ${phone}`);

    const { date, time } = formatAppointmentDateTime(appointment);

    const result = await sendUnifiedWhatsAppBulk(whatsappConfig, {
      templateName: 'appointment_reminder',
      recipients: [
        {
          phone,
          name: appointment.clientName,
          parameters: [
            appointment.clientName,
            appointment.title,
            date,
            time,
            appointment.location || 'Online',
            companyName,
          ],
        },
      ],
    });

    if (result.success && result.totalSent > 0) {
      return {
        success: true,
        messageId: result.results[0]?.messageId,
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to send WhatsApp message',
    };
  } catch (error) {
    console.error('[Reminder] Error sending WhatsApp reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp reminder',
    };
  }
}

export async function sendAppointmentReminder(
  appointment: Appointment,
  reminder: AppointmentReminder
): Promise<SendReminderResult> {
  console.log(
    `[Reminder] Processing reminder ${reminder.id} for appointment ${appointment.id} via ${reminder.channel}`
  );

  let result: SendReminderResult;

  switch (reminder.channel) {
    case 'email':
      result = await sendEmailReminder(appointment, appointment.companyId);
      break;
    case 'sms':
      result = await sendSMSReminder(appointment, appointment.companyId);
      break;
    case 'whatsapp':
      result = await sendWhatsAppReminder(appointment, appointment.companyId);
      break;
    default:
      result = { success: false, error: `Unknown channel: ${reminder.channel}` };
  }

  if (adminDb) {
    try {
      const appointmentRef = adminDb
        .collection(APPOINTMENTS_COLLECTION)
        .doc(appointment.id);

      const currentDoc = await appointmentRef.get();
      const currentData = currentDoc.data();
      const reminders = (currentData?.reminders || []) as AppointmentReminder[];

      const updatedReminders = reminders.map((r) => {
        if (r.id === reminder.id) {
          return {
            ...r,
            status: result.success ? ('sent' as ReminderStatus) : ('failed' as ReminderStatus),
            sentAt: result.success ? new Date().toISOString() : undefined,
            messageId: result.messageId,
            error: result.error,
          };
        }
        return r;
      });

      await appointmentRef.update({
        reminders: updatedReminders,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[Reminder] Updated reminder status to ${result.success ? 'sent' : 'failed'}`
      );
    } catch (error) {
      console.error('[Reminder] Failed to update reminder status:', error);
    }
  }

  return result;
}

export async function scheduleAppointmentReminders(
  appointment: Appointment
): Promise<AppointmentReminder[]> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return [];
  }

  const reminders: AppointmentReminder[] = [];
  const appointmentStartTime = parseISO(appointment.startTime);

  for (const pref of appointment.reminderPreferences) {
    if (!pref.enabled) continue;

    const scheduledFor = subHours(appointmentStartTime, pref.hoursBeforeAppointment);

    if (scheduledFor <= new Date()) {
      console.log(
        `[Reminder] Skipping ${pref.channel} reminder - scheduled time already passed`
      );
      continue;
    }

    const reminder: AppointmentReminder = {
      id: `${appointment.id}_${pref.channel}_${pref.hoursBeforeAppointment}h`,
      appointmentId: appointment.id,
      channel: pref.channel,
      scheduledFor: scheduledFor.toISOString(),
      status: 'pending',
    };

    reminders.push(reminder);
  }

  if (reminders.length > 0) {
    try {
      const appointmentRef = adminDb
        .collection(APPOINTMENTS_COLLECTION)
        .doc(appointment.id);

      await appointmentRef.update({
        reminders: reminders,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[Reminder] Scheduled ${reminders.length} reminders for appointment ${appointment.id}`
      );
    } catch (error) {
      console.error('[Reminder] Failed to save reminders:', error);
    }
  }

  return reminders;
}

export async function processScheduledReminders(): Promise<{
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return { processed: 0, successful: 0, failed: 0, errors: ['Database not initialized'] };
  }

  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();
    console.log(`[Reminder] Processing scheduled reminders at ${now.toISOString()}`);

    const snapshot = await adminDb
      .collection(APPOINTMENTS_COLLECTION)
      .where('status', '==', 'scheduled')
      .get();

    for (const doc of snapshot.docs) {
      const appointment = {
        ...doc.data(),
        id: doc.id,
      } as Appointment;

      if (appointment.startTime) {
        const startTimeDate =
          typeof appointment.startTime === 'string'
            ? new Date(appointment.startTime)
            : (appointment.startTime as any).toDate?.() || new Date(appointment.startTime);
        appointment.startTime = startTimeDate.toISOString();
      }
      if (appointment.endTime) {
        const endTimeDate =
          typeof appointment.endTime === 'string'
            ? new Date(appointment.endTime)
            : (appointment.endTime as any).toDate?.() || new Date(appointment.endTime);
        appointment.endTime = endTimeDate.toISOString();
      }

      const reminders = (appointment.reminders || []) as AppointmentReminder[];

      for (const reminder of reminders) {
        if (reminder.status !== 'pending') continue;

        const scheduledFor = new Date(reminder.scheduledFor);
        if (scheduledFor > now) continue;

        console.log(
          `[Reminder] Processing ${reminder.channel} reminder for appointment ${appointment.id}`
        );

        results.processed++;

        try {
          const sendResult = await sendAppointmentReminder(appointment, reminder);

          if (sendResult.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(
              `${reminder.channel} reminder for ${appointment.id}: ${sendResult.error}`
            );
          }
        } catch (error) {
          results.failed++;
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(
            `${reminder.channel} reminder for ${appointment.id}: ${errorMsg}`
          );
        }
      }
    }

    console.log(
      `[Reminder] Processing complete: ${results.processed} processed, ${results.successful} successful, ${results.failed} failed`
    );

    return results;
  } catch (error) {
    console.error('[Reminder] Error processing scheduled reminders:', error);
    return {
      ...results,
      errors: [
        ...results.errors,
        error instanceof Error ? error.message : 'Unknown error',
      ],
    };
  }
}

export async function cancelAppointmentReminders(
  appointmentId: string
): Promise<void> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return;
  }

  try {
    const appointmentRef = adminDb
      .collection(APPOINTMENTS_COLLECTION)
      .doc(appointmentId);

    const doc = await appointmentRef.get();
    if (!doc.exists) return;

    const data = doc.data();
    const reminders = (data?.reminders || []) as AppointmentReminder[];

    const updatedReminders = reminders.map((r) => {
      if (r.status === 'pending') {
        return { ...r, status: 'skipped' as ReminderStatus };
      }
      return r;
    });

    await appointmentRef.update({
      reminders: updatedReminders,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `[Reminder] Cancelled pending reminders for appointment ${appointmentId}`
    );
  } catch (error) {
    console.error('[Reminder] Failed to cancel reminders:', error);
  }
}

export async function rescheduleAppointmentReminders(
  appointmentId: string,
  newStartTime: string
): Promise<AppointmentReminder[]> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized');
    return [];
  }

  try {
    const appointmentRef = adminDb
      .collection(APPOINTMENTS_COLLECTION)
      .doc(appointmentId);

    const doc = await appointmentRef.get();
    if (!doc.exists) return [];

    const appointment = {
      id: doc.id,
      ...doc.data(),
      startTime: newStartTime,
    } as Appointment;

    await cancelAppointmentReminders(appointmentId);

    return await scheduleAppointmentReminders(appointment);
  } catch (error) {
    console.error('[Reminder] Failed to reschedule reminders:', error);
    return [];
  }
}

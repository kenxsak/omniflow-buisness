import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendTransactionalEmail as sendBrevoTransactionalEmail } from '@/services/brevo';
import { sendTransactionalEmail as sendSenderTransactionalEmail } from '@/lib/sender-client';
import { sendEmailSMTP } from '@/lib/smtp-client';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type DeliveryProvider = 'brevo' | 'sender' | 'smtp';

interface EmailStep {
  id: string;
  type: 'email';
  order: number;
  subject?: string;
  content?: string;
}

interface DelayStep {
  id: string;
  type: 'delay';
  order: number;
  delayDays?: number;
  delayHours?: number;
}

type AutomationStep = EmailStep | DelayStep;

interface AutomationDeliveryConfig {
  provider: DeliveryProvider;
  senderEmail?: string;
  senderName?: string;
}

interface EmailAutomationSequence {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'draft';
  steps: AutomationStep[];
  companyId: string;
  deliveryConfig?: AutomationDeliveryConfig;
}

interface ContactAutomationState {
  id: string;
  contactId: string;
  contactEmail: string;
  listId: string;
  automationId: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  currentStepIndex: number;
  nextStepTime: Timestamp;
  emailsSentInSequence: number;
}

interface EmailContact {
  id: string;
  email: string;
  name: string;
  status: string;
  listId: string;
}

interface EmailList {
  id: string;
  automationId?: string;
  companyId: string;
}

interface ProcessingResult {
  processed: number;
  emailsSent: number;
  errors: string[];
  newEnrollments: number;
}

interface APIKeysConfig {
  brevo?: {
    apiKey?: string;
    senderEmail?: string;
    senderName?: string;
  };
  sender?: {
    apiKey?: string;
    senderEmail?: string;
    senderName?: string;
  };
  smtp?: {
    host?: string;
    port?: number;
    username?: string;
    user?: string;
    password?: string;
    fromEmail?: string;
    fromName?: string;
  };
}

async function getCompanyAPIKeys(companyId: string): Promise<APIKeysConfig | null> {
  if (!adminDb) return null;
  
  try {
    const apiKeysDoc = await adminDb.collection('companies').doc(companyId).collection('settings').doc('apiKeys').get();
    if (apiKeysDoc.exists) {
      return apiKeysDoc.data() as APIKeysConfig;
    }
  } catch (error) {
    console.error('Error fetching API keys:', error);
  }
  return null;
}

async function getCompanyInfo(companyId: string): Promise<{ name: string; email: string } | null> {
  if (!adminDb) return null;
  
  try {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (companyDoc.exists) {
      const data = companyDoc.data();
      return {
        name: data?.name || 'OmniFlow',
        email: data?.email || 'noreply@omniflow.com',
      };
    }
  } catch (error) {
    console.error('Error fetching company info:', error);
  }
  return { name: 'OmniFlow', email: 'noreply@omniflow.com' };
}

function personalizeContent(content: string, contact: EmailContact, companyName: string): string {
  const firstName = contact.name.split(' ')[0] || 'there';
  const lastName = contact.name.split(' ').slice(1).join(' ') || '';
  
  return content
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{name\}\}/gi, contact.name)
    .replace(/\{\{email\}\}/gi, contact.email)
    .replace(/\{\{company_name\}\}/gi, companyName);
}

async function sendEmailWithProvider(
  provider: DeliveryProvider,
  apiKeys: APIKeysConfig,
  companyInfo: { name: string; email: string },
  automation: EmailAutomationSequence,
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  const deliveryConfig = automation.deliveryConfig;
  
  if (provider === 'brevo') {
    const brevoConfig = apiKeys.brevo;
    if (!brevoConfig?.apiKey) {
      return { success: false, error: 'Brevo API key not configured' };
    }
    const senderEmail = deliveryConfig?.senderEmail || brevoConfig.senderEmail || companyInfo.email;
    const senderName = deliveryConfig?.senderName || brevoConfig.senderName || companyInfo.name;
    
    const result = await sendBrevoTransactionalEmail(
      brevoConfig.apiKey,
      senderEmail,
      senderName,
      recipientEmail,
      recipientName,
      subject,
      htmlContent
    );
    return result;
  }
  
  if (provider === 'sender') {
    const senderConfig = apiKeys.sender;
    if (!senderConfig?.apiKey) {
      return { success: false, error: 'Sender.net API key not configured' };
    }
    const senderEmail = deliveryConfig?.senderEmail || senderConfig.senderEmail || companyInfo.email;
    const senderName = deliveryConfig?.senderName || senderConfig.senderName || companyInfo.name;
    
    const result = await sendSenderTransactionalEmail(
      senderConfig.apiKey,
      senderEmail,
      senderName,
      recipientEmail,
      recipientName,
      subject,
      htmlContent
    );
    return result;
  }
  
  if (provider === 'smtp') {
    const smtpConfig = apiKeys.smtp;
    if (!smtpConfig?.host) {
      return { success: false, error: 'SMTP not configured' };
    }
    const username = smtpConfig.username || smtpConfig.user || '';
    if (!username) {
      return { success: false, error: 'SMTP username not configured' };
    }
    const senderEmail = deliveryConfig?.senderEmail || smtpConfig.fromEmail || companyInfo.email;
    const senderName = deliveryConfig?.senderName || smtpConfig.fromName || companyInfo.name;
    
    const result = await sendEmailSMTP(
      {
        host: smtpConfig.host,
        port: smtpConfig.port || 587,
        username: username,
        password: smtpConfig.password || '',
        fromEmail: senderEmail,
        fromName: senderName,
      },
      {
        to: recipientEmail,
        subject: subject,
        html: htmlContent,
      }
    );
    return result;
  }
  
  return { success: false, error: `Unknown provider: ${provider}` };
}

interface ProviderResult {
  provider: DeliveryProvider | null;
  error?: string;
}

function determineProvider(automation: EmailAutomationSequence, apiKeys: APIKeysConfig): ProviderResult {
  const configuredProvider = automation.deliveryConfig?.provider;
  
  if (configuredProvider) {
    if (configuredProvider === 'brevo') {
      if (!apiKeys.brevo?.apiKey) {
        return { provider: null, error: `Automation requires Brevo but Brevo API key is not configured` };
      }
      return { provider: 'brevo' };
    }
    if (configuredProvider === 'sender') {
      if (!apiKeys.sender?.apiKey) {
        return { provider: null, error: `Automation requires Sender.net but Sender.net API key is not configured` };
      }
      return { provider: 'sender' };
    }
    if (configuredProvider === 'smtp') {
      const smtpConfig = apiKeys.smtp;
      if (!smtpConfig?.host) {
        return { provider: null, error: `Automation requires SMTP but SMTP host is not configured` };
      }
      const username = smtpConfig.username || smtpConfig.user;
      if (!username) {
        return { provider: null, error: `Automation requires SMTP but SMTP username is not configured` };
      }
      if (!smtpConfig.password) {
        return { provider: null, error: `Automation requires SMTP but SMTP password is not configured` };
      }
      return { provider: 'smtp' };
    }
    return { provider: null, error: `Unknown provider configured: ${configuredProvider}` };
  }
  
  if (apiKeys.brevo?.apiKey) return { provider: 'brevo' };
  if (apiKeys.sender?.apiKey) return { provider: 'sender' };
  if (apiKeys.smtp?.host && (apiKeys.smtp.username || apiKeys.smtp.user) && apiKeys.smtp.password) {
    return { provider: 'smtp' };
  }
  
  return { provider: null, error: 'No email provider configured' };
}

async function processAutomationStatesForCompany(companyId: string): Promise<ProcessingResult> {
  if (!adminDb) {
    return { processed: 0, emailsSent: 0, errors: ['Database not initialized'], newEnrollments: 0 };
  }

  const result: ProcessingResult = {
    processed: 0,
    emailsSent: 0,
    errors: [],
    newEnrollments: 0,
  };

  try {
    const apiKeys = await getCompanyAPIKeys(companyId);
    if (!apiKeys || (!apiKeys.brevo?.apiKey && !apiKeys.sender?.apiKey && !apiKeys.smtp?.host)) {
      return result;
    }

    const companyInfo = await getCompanyInfo(companyId);
    const companyName = companyInfo?.name || 'OmniFlow';

    const now = Timestamp.now();
    const statesSnapshot = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('contactAutomationStates')
      .where('status', '==', 'active')
      .where('nextStepTime', '<=', now)
      .limit(50)
      .get();

    for (const stateDoc of statesSnapshot.docs) {
      const state = { id: stateDoc.id, ...stateDoc.data() } as ContactAutomationState;
      result.processed++;

      try {
        const automationDoc = await adminDb
          .collection('companies')
          .doc(companyId)
          .collection('emailAutomationSequences')
          .doc(state.automationId)
          .get();

        if (!automationDoc.exists) {
          await stateDoc.ref.update({
            status: 'error',
            lastError: 'Automation not found',
            updatedAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        const automation = { id: automationDoc.id, ...automationDoc.data() } as EmailAutomationSequence;
        
        if (automation.status !== 'active') {
          await stateDoc.ref.update({
            status: 'paused',
            updatedAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        const contactDoc = await adminDb
          .collection('companies')
          .doc(companyId)
          .collection('emailContacts')
          .doc(state.contactId)
          .get();

        if (!contactDoc.exists) {
          await stateDoc.ref.update({
            status: 'error',
            lastError: 'Contact not found',
            updatedAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        const contact = { id: contactDoc.id, ...contactDoc.data() } as EmailContact;
        
        if (contact.status !== 'active') {
          await stateDoc.ref.update({
            status: 'completed',
            updatedAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        const currentStep = automation.steps[state.currentStepIndex];
        if (!currentStep) {
          await stateDoc.ref.update({
            status: 'completed',
            updatedAt: FieldValue.serverTimestamp(),
          });
          continue;
        }

        if (currentStep.type === 'email') {
          if (!currentStep.subject || !currentStep.content) {
            result.errors.push(`Skipping step for ${contact.email}: Email step missing subject or content`);
            await stateDoc.ref.update({
              status: 'error',
              lastError: 'Email step missing subject or content',
              updatedAt: FieldValue.serverTimestamp(),
            });
            continue;
          }

          const providerResult = determineProvider(automation, apiKeys);
          if (!providerResult.provider) {
            const errorMsg = providerResult.error || 'No email provider configured';
            result.errors.push(`Company ${companyId}: ${errorMsg} for automation ${automation.id}`);
            await stateDoc.ref.update({
              status: 'error',
              lastError: errorMsg,
              updatedAt: FieldValue.serverTimestamp(),
            });
            continue;
          }
          const provider = providerResult.provider;

          const personalizedSubject = personalizeContent(currentStep.subject, contact, companyName);
          const personalizedContent = personalizeContent(currentStep.content, contact, companyName);

          const emailResult = await sendEmailWithProvider(
            provider,
            apiKeys,
            companyInfo || { name: companyName, email: 'noreply@omniflow.com' },
            automation,
            contact.email,
            contact.name,
            personalizedSubject,
            personalizedContent
          );

          if (!emailResult.success) {
            result.errors.push(`Failed to send email to ${contact.email} via ${provider}: ${emailResult.error}`);
            await stateDoc.ref.update({
              status: 'error',
              lastError: emailResult.error || 'Failed to send email',
              updatedAt: FieldValue.serverTimestamp(),
            });
            continue;
          }

          result.emailsSent++;
          console.log(`[Automation] Email sent to ${contact.email} via ${provider}`);

          await contactDoc.ref.update({
            emailsSent: FieldValue.increment(1),
            lastEmailSent: FieldValue.serverTimestamp(),
          });
        }

        const nextStepIndex = state.currentStepIndex + 1;
        
        if (nextStepIndex >= automation.steps.length) {
          await stateDoc.ref.update({
            status: 'completed',
            currentStepIndex: nextStepIndex,
            emailsSentInSequence: state.emailsSentInSequence + (currentStep.type === 'email' ? 1 : 0),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          const nextStep = automation.steps[nextStepIndex];
          let delayMs = 0;
          
          if (nextStep.type === 'delay') {
            delayMs = ((nextStep.delayDays || 0) * 24 * 60 * 60 * 1000) + ((nextStep.delayHours || 0) * 60 * 60 * 1000);
          } else {
            delayMs = 60 * 1000;
          }
          
          const nextStepTime = Timestamp.fromMillis(Date.now() + delayMs);

          await stateDoc.ref.update({
            currentStepIndex: nextStepIndex,
            nextStepTime,
            emailsSentInSequence: state.emailsSentInSequence + (currentStep.type === 'email' ? 1 : 0),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (stateError: any) {
        result.errors.push(`Error processing state ${state.id}: ${stateError.message}`);
      }
    }

    const newEnrollments = await enrollNewContactsInAutomations(companyId);
    result.newEnrollments = newEnrollments;

  } catch (error: any) {
    result.errors.push(`Company ${companyId} processing error: ${error.message}`);
  }

  return result;
}

async function enrollNewContactsInAutomations(companyId: string): Promise<number> {
  if (!adminDb) return 0;
  
  let enrolled = 0;

  try {
    const listsSnapshot = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('emailLists')
      .where('automationId', '!=', null)
      .get();

    for (const listDoc of listsSnapshot.docs) {
      const list = { id: listDoc.id, ...listDoc.data() } as EmailList;
      
      if (!list.automationId) continue;

      const automationDoc = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('emailAutomationSequences')
        .doc(list.automationId)
        .get();

      if (!automationDoc.exists) continue;
      
      const automation = automationDoc.data();
      if (automation?.status !== 'active') continue;

      const contactsSnapshot = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('emailContacts')
        .where('listId', '==', list.id)
        .where('status', '==', 'active')
        .get();

      for (const contactDoc of contactsSnapshot.docs) {
        const contact = { id: contactDoc.id, ...contactDoc.data() } as EmailContact;

        const existingStateSnapshot = await adminDb
          .collection('companies')
          .doc(companyId)
          .collection('contactAutomationStates')
          .where('contactId', '==', contact.id)
          .where('automationId', '==', list.automationId)
          .limit(1)
          .get();

        if (!existingStateSnapshot.empty) continue;

        const steps = automation.steps as AutomationStep[];
        const firstStep = steps[0];
        let delayMs = 0;
        
        if (firstStep?.type === 'delay') {
          delayMs = ((firstStep.delayDays || 0) * 24 * 60 * 60 * 1000) + ((firstStep.delayHours || 0) * 60 * 60 * 1000);
        }
        
        const nextStepTime = Timestamp.fromMillis(Date.now() + delayMs);

        await adminDb
          .collection('companies')
          .doc(companyId)
          .collection('contactAutomationStates')
          .add({
            contactId: contact.id,
            contactEmail: contact.email,
            listId: list.id,
            automationId: list.automationId,
            status: 'active',
            currentStepIndex: 0,
            nextStepTime,
            emailsSentInSequence: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

        enrolled++;
      }
    }
  } catch (error) {
    console.error('Error enrolling contacts:', error);
  }

  return enrolled;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const results: Record<string, ProcessingResult> = {};
  let totalProcessed = 0;
  let totalEmailsSent = 0;
  let totalNewEnrollments = 0;
  const allErrors: string[] = [];

  try {
    const companiesSnapshot = await adminDb.collection('companies').get();

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      
      try {
        const result = await processAutomationStatesForCompany(companyId);
        results[companyId] = result;
        totalProcessed += result.processed;
        totalEmailsSent += result.emailsSent;
        totalNewEnrollments += result.newEnrollments;
        allErrors.push(...result.errors);
      } catch (error: any) {
        allErrors.push(`Company ${companyId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        companiesProcessed: Object.keys(results).length,
        totalStatesProcessed: totalProcessed,
        totalEmailsSent,
        totalNewEnrollments,
        totalErrors: allErrors.length,
      },
      errors: allErrors.slice(0, 20),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

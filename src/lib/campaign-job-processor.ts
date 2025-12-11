'use server';

/**
 * Campaign Job Processor
 * 
 * Background worker that processes queued Email, SMS, and WhatsApp campaigns
 * in batches to prevent timeouts and enable large-scale campaigns.
 * 
 * IMPORTANT: Uses Firebase Admin SDK exclusively to prevent server crashes.
 * The web SDK causes memory leaks and handle exhaustion when used in server actions.
 */

import { adminDb } from '@/lib/firebase-admin';
import type { 
  CampaignJob, 
  ProcessCampaignJobResult,
  CampaignRecipient 
} from '@/types/campaign-jobs';
import { CAMPAIGN_JOB_CONSTANTS } from '@/types/campaign-jobs';
import {
  getPendingCampaignJobs,
  getCampaignJob,
  updateCampaignJobStatus,
  updateCampaignJobProgress,
  retryCampaignJob,
  isJobReadyForRetry,
} from './campaign-queue';
import type { Company } from '@/types/saas';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import type { EmailCampaign } from '@/lib/mock-data';

// Import channel-specific clients
import { 
  sendTransactionalEmail,
  createBrevoList,
  bulkImportContactsToBrevoList,
  createBrevoEmailCampaign,
  sendBrevoEmailCampaignNow,
  deleteBrevoList,
} from '@/services/brevo';
import { 
  sendTransactionalEmail as sendSenderEmail,
  createSenderGroup,
  bulkAddContactsToSenderGroup,
  createSenderEmailCampaign,
  updateSenderCampaignContent,
  sendSenderEmailCampaignNow,
  deleteSenderGroup,
} from '@/lib/sender-client';
import { sendEmailSMTP } from '@/lib/smtp-client';
import { sendBulkSMSMSG91 } from './msg91-client';
import { sendBulkSMSFast2SMS } from './fast2sms-client';
import { sendSms as sendTwilioSMS } from '@/services/twilio';
import { sendBulkAuthkeyWhatsApp } from './authkey-client';
import { sendBulkWhatsAppAiSensy } from './aisensy-client';
import { sendBulkWhatsAppGupshup } from './gupshup-client';

/**
 * Main function to process all pending campaign jobs
 * Called by cron job every 5 minutes
 */
export async function runAllCampaignJobs(): Promise<{
  success: boolean;
  message: string;
  details: string[];
}> {
  if (!adminDb) {
    return { success: false, message: 'Database not initialized.', details: [] };
  }

  console.log('Starting campaign job processor...');
  
  const pendingJobs = await getPendingCampaignJobs();
  const details: string[] = [];
  let jobsProcessed = 0;
  let jobsFailed = 0;

  for (const job of pendingJobs) {
    // Check if retrying job is ready
    if (job.status === 'retrying') {
      const ready = await isJobReadyForRetry(job);
      if (!ready) {
        console.log(`Job ${job.id} not ready for retry yet`);
        continue;
      }
    }

    // Check if job has timed out
    // Only check jobs that have started (have a startedAt timestamp)
    // Jobs moving to 'retrying' status have startedAt cleared, so they get a fresh timeout window
    if (job.startedAt) {
      const startedTime = new Date(job.startedAt).getTime();
      const now = Date.now();
      if (now - startedTime > CAMPAIGN_JOB_CONSTANTS.JOB_TIMEOUT_MS) {
        await retryCampaignJob(job.id, 'Job timeout exceeded');
        jobsFailed++;
        details.push(`Job ${job.id} (${job.jobType}) timed out`);
        continue;
      }
    }

    // Process the job
    console.log(`Processing ${job.jobType} campaign job ${job.id} for company ${job.companyId}`);
    
    const result = await processCampaignJob(job);
    
    if (result.success) {
      jobsProcessed++;
      details.push(`Job ${result.jobId} (${job.jobType}): ${result.sent} sent, ${result.failed} failed`);
    } else {
      jobsFailed++;
      details.push(`Job ${result.jobId} (${job.jobType}) failed: ${result.error}`);
    }
  }

  const message = `Processed ${jobsProcessed} campaign jobs, ${jobsFailed} failed. Total pending: ${pendingJobs.length}`;
  console.log(message);
  
  return {
    success: true,
    message,
    details,
  };
}

/**
 * Processes a single campaign job
 * Uses Firebase Admin SDK for stability
 */
async function processCampaignJob(job: CampaignJob): Promise<ProcessCampaignJobResult> {
  if (!adminDb) {
    return {
      success: false,
      jobId: job.id,
      sent: 0,
      failed: 0,
      error: 'Database not initialized',
    };
  }

  try {
    // ATOMIC concurrency guard using Firestore transaction (Admin SDK)
    // This ensures only ONE worker can claim the job
    const jobRef = adminDb.collection('campaignJobs').doc(job.id);
    
    let claimedJob: CampaignJob | null = null;
    
    await adminDb.runTransaction(async (transaction) => {
      const jobDoc = await transaction.get(jobRef);
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const currentJob = { id: jobDoc.id, ...jobDoc.data() } as CampaignJob;
      
      // Only claim job if it's in pending or retrying state
      if (currentJob.status !== 'pending' && currentJob.status !== 'retrying') {
        throw new Error(`Job already ${currentJob.status}`);
      }
      
      // ATOMIC transition to processing
      transaction.update(jobRef, {
        status: 'processing',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      claimedJob = { ...currentJob, status: 'processing' };
    });
    
    if (!claimedJob) {
      console.warn(`[JOB ${job.id}] Could not claim job - another worker may have it`);
      return {
        success: false,
        jobId: job.id,
        sent: job.progress?.sent || 0,
        failed: job.progress?.failed || 0,
        error: 'Could not claim job',
      };
    }
    
    console.log(`[JOB ${job.id}] ✅ CLAIMED - Starting ${job.jobType} campaign for company ${job.companyId} - ${job.progress.total} recipients`);

    // Get company data for API keys using Firebase Admin SDK
    if (!adminDb) {
      await updateCampaignJobStatus(job.id, 'failed', {
        error: 'Database not initialized',
      });
      return {
        success: false,
        jobId: job.id,
        sent: 0,
        failed: 0,
        error: 'Database not initialized',
      };
    }

    const companyDoc = await adminDb.collection('companies').doc(job.companyId).get();
    if (!companyDoc.exists) {
      await updateCampaignJobStatus(job.id, 'failed', {
        error: 'Company not found',
      });
      return {
        success: false,
        jobId: job.id,
        sent: 0,
        failed: 0,
        error: 'Company not found',
      };
    }

    const company = { id: companyDoc.id, ...companyDoc.data() } as Company;

    // Check if company is active
    if (company.status !== 'active') {
      await updateCampaignJobStatus(job.id, 'failed', {
        error: 'Company is not active',
      });
      return {
        success: false,
        jobId: job.id,
        sent: 0,
        failed: 0,
        error: 'Company is not active',
      };
    }

    // Process based on job type
    switch (job.jobType) {
      case 'email':
        return await processEmailCampaign(job, company);
      case 'sms':
        return await processSMSCampaign(job, company);
      case 'whatsapp':
        return await processWhatsAppCampaign(job, company);
      default:
        await updateCampaignJobStatus(job.id, 'failed', {
          error: 'Invalid job type',
        });
        return {
          success: false,
          jobId: job.id,
          sent: 0,
          failed: 0,
          error: 'Invalid job type',
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // If job is already claimed by another worker or completed, exit cleanly
    // DO NOT call retryCampaignJob as this would interfere with the other worker
    if (errorMessage.includes('already processing') || 
        errorMessage.includes('already completed') ||
        errorMessage.includes('already failed')) {
      console.log(`[JOB ${job.id}] ${errorMessage} - skipping without retry`);
      return {
        success: false,
        jobId: job.id,
        sent: job.progress?.sent || 0,
        failed: job.progress?.failed || 0,
        error: errorMessage,
      };
    }
    
    // For actual processing errors (after claiming), retry the job
    console.error(`[JOB ${job.id}] Processing error:`, error);
    await retryCampaignJob(job.id, errorMessage);
    
    return {
      success: false,
      jobId: job.id,
      sent: job.progress?.sent || 0,
      failed: job.progress?.failed || 0,
      error: errorMessage,
    };
  }
}

/**
 * Process email campaign using Campaign API for bulk marketing (Brevo, Sender.net) 
 * or Transactional API for individual sends (SMTP)
 */
async function processEmailCampaign(job: CampaignJob, company: any): Promise<ProcessCampaignJobResult> {
  if (!job.emailData) {
    throw new Error('Email data not found in job');
  }

  const { subject, htmlContent, senderName, senderEmail, provider = 'brevo' } = job.emailData;
  
  console.log(`[JOB ${job.id}] Starting email campaign processing - Provider: ${provider}, Recipients: ${job.progress.total}`);
  
  // Determine which provider to use and validate configuration
  let emailProvider: 'brevo' | 'sender' | 'smtp' = provider;
  
  let apiKey: string | undefined;
  let smtpConfig: any;
  
  // Check for configured provider and decrypt API keys
  if (emailProvider === 'brevo') {
    if (!company.apiKeys?.brevo?.apiKey) {
      throw new Error('Brevo API key not configured');
    }
    apiKey = decryptApiKeyServerSide(company.apiKeys.brevo.apiKey);
  } else if (emailProvider === 'sender') {
    if (!company.apiKeys?.sender?.apiKey) {
      throw new Error('Sender.net API key not configured');
    }
    apiKey = decryptApiKeyServerSide(company.apiKeys.sender.apiKey);
  } else if (emailProvider === 'smtp') {
    if (!company.apiKeys?.smtp) {
      throw new Error('SMTP configuration not found');
    }
    smtpConfig = {
      ...company.apiKeys.smtp,
      password: company.apiKeys.smtp.password 
        ? decryptApiKeyServerSide(company.apiKeys.smtp.password) 
        : company.apiKeys.smtp.password,
    };
  } else {
    throw new Error(`Unknown email provider: ${emailProvider}`);
  }

  // Use Campaign API for Brevo and Sender.net (bulk marketing)
  // Use Transactional API for SMTP (no campaign concept)
  if (emailProvider === 'brevo' || emailProvider === 'sender') {
    return await processEmailCampaignWithCampaignAPI(job, company, emailProvider, apiKey!, {
      subject,
      htmlContent,
      senderName,
      senderEmail,
    });
  } else {
    // SMTP: Use transactional approach (send one-by-one)
    return await processEmailCampaignWithSMTP(job, company, smtpConfig, {
      subject,
      htmlContent,
      senderName,
      senderEmail,
    });
  }
}

/**
 * Process email campaign using Campaign API (for Brevo and Sender.net)
 * This creates a campaign in the provider dashboard with full analytics
 */
async function processEmailCampaignWithCampaignAPI(
  job: CampaignJob,
  company: any,
  provider: 'brevo' | 'sender',
  apiKey: string,
  emailData: {
    subject: string;
    htmlContent: string;
    senderName: string;
    senderEmail: string;
  }
): Promise<ProcessCampaignJobResult> {
  const { subject, htmlContent, senderName, senderEmail } = emailData;

  let tempListId: number | string | undefined;
  let campaignId: number | undefined;

  try {
    // Step 1: Create a temporary list/group for this campaign
    console.log(`[JOB ${job.id}] Step 1: Creating temporary ${provider === 'brevo' ? 'list' : 'group'} for campaign...`);
    
    // Add unique timestamp to prevent "tag already exists" errors in Sender.net
    const uniqueSuffix = `${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-6)}`;
    const listName = `OmniFlow: ${job.campaignName} (${uniqueSuffix})`;
    
    if (provider === 'brevo') {
      const listResult = await createBrevoList(apiKey, listName);
      if (!listResult.success || !listResult.listId) {
        throw new Error(`Failed to create Brevo list: ${listResult.error}`);
      }
      tempListId = listResult.listId;
      console.log(`[JOB ${job.id}] ✅ Created Brevo list ID: ${tempListId}`);
    } else {
      const groupResult = await createSenderGroup(apiKey, listName);
      if (!groupResult.success || !groupResult.groupId) {
        throw new Error(`Failed to create Sender.net group: ${groupResult.error}`);
      }
      tempListId = groupResult.groupId;
      console.log(`[JOB ${job.id}] ✅ Created Sender.net group ID: ${tempListId}`);
    }

    // Step 2: Add all recipients to the list/group
    console.log(`[JOB ${job.id}] Step 2: Adding ${job.recipients.length} contacts to ${provider === 'brevo' ? 'list' : 'group'}...`);
    
    const contacts = job.recipients
      .filter(r => r.email)
      .map(r => ({
        email: r.email!,
        attributes: {
          FIRSTNAME: r.name?.split(' ')[0] || '',
          LASTNAME: r.name?.split(' ').slice(1).join(' ') || '',
          ...r.customFields,
        },
        firstname: r.name?.split(' ')[0] || '',
        lastname: r.name?.split(' ').slice(1).join(' ') || '',
        fields: r.customFields || {},
      }));

    if (provider === 'brevo') {
      const importResult = await bulkImportContactsToBrevoList(apiKey, tempListId as number, contacts);
      if (!importResult.success) {
        throw new Error(`Failed to import contacts to Brevo list: ${importResult.error}`);
      }
      console.log(`[JOB ${job.id}] ✅ Imported ${importResult.imported} contacts to Brevo list`);
    } else {
      const addResult = await bulkAddContactsToSenderGroup(apiKey, tempListId as string, contacts);
      if (!addResult.success) {
        throw new Error(`Failed to add contacts to Sender.net group: ${addResult.error}`);
      }
      console.log(`[JOB ${job.id}] ✅ Added ${addResult.added} contacts to Sender.net group`);
    }

    // Wait a moment for contacts to be fully processed by the provider
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Create the campaign
    console.log(`[JOB ${job.id}] Step 3: Creating ${provider} campaign...`);
    
    // Replace company variables in HTML content (recipient-specific variables will be handled by provider)
    const campaignHtml = htmlContent
      .replace(/\{\{\s*company_name\s*\}\}/gi, company.name || '')
      .replace(/\{\{\s*company\.name\s*\}\}/gi, company.name || '')
      .replace(/\{\{\s*COMPANY_NAME\s*\}\}/gi, company.name || '');

    if (provider === 'brevo') {
      // IMPORTANT: Ensure sender name is the company/business name, NOT the email address
      // This is what recipients see in their inbox "From" field
      let finalSenderName = senderName || company.name || '';
      
      // If the sender name looks like an email address, use company name or extract from email
      if (!finalSenderName || (finalSenderName.includes('@') && finalSenderName.includes('.'))) {
        if (finalSenderName) {
          console.warn(`[JOB ${job.id}] WARNING: senderName appears to be an email: "${finalSenderName}". Using company name.`);
        }
        finalSenderName = company.name;
        // If still no name, extract from email domain
        if (!finalSenderName && senderEmail) {
          const domain = senderEmail.split('@')[1]?.split('.')[0] || '';
          finalSenderName = domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase() + ' Team';
        }
        finalSenderName = finalSenderName || 'Email Campaign';
      }
      
      console.log(`[JOB ${job.id}] Brevo sender name: "${finalSenderName}" (email: ${senderEmail})`);
      
      const campaignResult = await createBrevoEmailCampaign(apiKey, {
        name: job.campaignName,
        subject: subject,
        htmlContent: campaignHtml,
        sender: { name: finalSenderName, email: senderEmail },
        recipients: { listIds: [tempListId as number] },
        type: 'classic',
      });

      if (!campaignResult.success || !campaignResult.id) {
        throw new Error(`Failed to create Brevo campaign: ${campaignResult.error}`);
      }
      campaignId = campaignResult.id;
      console.log(`[JOB ${job.id}] ✅ Created Brevo campaign ID: ${campaignId}`);
    } else {
      // FIX: Use html_url approach for Sender.net to avoid "no content" issue
      // Sender.net's direct HTML content setting doesn't work reliably
      // but importing from URL works consistently
      let htmlUrl: string | undefined;
      let htmlUrlStored = false;
      
      try {
        // Store HTML content at a temporary public URL
        const baseUrl = process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
        
        console.log(`[JOB ${job.id}] Step 3a: Storing HTML content at temporary URL...`);
        
        const storeResponse = await fetch(`${baseUrl}/api/sender-html`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: campaignHtml }),
        });
        
        if (storeResponse.ok) {
          const storeData = await storeResponse.json();
          if (storeData.success && storeData.url) {
            htmlUrl = storeData.url;
            htmlUrlStored = true;
            console.log(`[JOB ${job.id}] ✅ HTML stored at: ${htmlUrl}`);
          }
        }
      } catch (urlError) {
        console.warn(`[JOB ${job.id}] Could not store HTML at URL, will try direct approach:`, urlError);
      }
      
      // IMPORTANT: Ensure sender name is the company/business name, NOT the email address
      let finalSenderNameSender = senderName || company.name || '';
      
      // If the sender name looks like an email address, use company name or extract from email
      if (!finalSenderNameSender || (finalSenderNameSender.includes('@') && finalSenderNameSender.includes('.'))) {
        if (finalSenderNameSender) {
          console.warn(`[JOB ${job.id}] WARNING: senderName appears to be an email: "${finalSenderNameSender}". Using company name.`);
        }
        finalSenderNameSender = company.name;
        // If still no name, extract from email domain
        if (!finalSenderNameSender && senderEmail) {
          const domain = senderEmail.split('@')[1]?.split('.')[0] || '';
          finalSenderNameSender = domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase() + ' Team';
        }
        finalSenderNameSender = finalSenderNameSender || 'Email Campaign';
      }
      
      console.log(`[JOB ${job.id}] Sender.net sender name: "${finalSenderNameSender}" (email: ${senderEmail})`);
      
      const campaignResult = await createSenderEmailCampaign(apiKey, {
        name: job.campaignName,
        subject: subject,
        html: campaignHtml,
        sender: { name: finalSenderNameSender, email: senderEmail },
        groups: [tempListId as string],
      }, htmlUrl); // Pass html_url if available

      if (!campaignResult.success || !campaignResult.id) {
        throw new Error(`Failed to create Sender.net campaign: ${campaignResult.error}`);
      }
      campaignId = campaignResult.id;
      console.log(`[JOB ${job.id}] ✅ Created Sender.net campaign ID: ${campaignId}`);
      
      // IMPORTANT: Skip content update if html_url was used successfully
      // The update via PATCH clears the content even though it returns success
      if (!htmlUrlStored) {
        console.log(`[JOB ${job.id}] Step 3.5: html_url not used, attempting content update...`);
        const contentUpdateResult = await updateSenderCampaignContent(
          apiKey,
          campaignId,
          campaignHtml,
          subject,
          undefined, // previewText - will be auto-generated
          [tempListId as string] // groups - REQUIRED for content recognition
        );
        
        if (!contentUpdateResult.success) {
          throw new Error(`Failed to update Sender.net campaign content: ${contentUpdateResult.error}`);
        }
        console.log(`[JOB ${job.id}] ✅ Sender.net campaign content updated successfully`);
      } else {
        console.log(`[JOB ${job.id}] Skipping content update - html_url import was used`);
      }
      
      // Wait a moment for content to be fully processed
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 4: Send the campaign
    console.log(`[JOB ${job.id}] Step 4: Sending ${provider} campaign now...`);
    
    if (provider === 'brevo') {
      const sendResult = await sendBrevoEmailCampaignNow(apiKey, campaignId);
      if (!sendResult.success) {
        throw new Error(`Failed to send Brevo campaign: ${sendResult.error}`);
      }
      console.log(`[JOB ${job.id}] ✅ Brevo campaign sent successfully`);
    } else {
      const sendResult = await sendSenderEmailCampaignNow(apiKey, campaignId);
      if (!sendResult.success) {
        throw new Error(`Failed to send Sender.net campaign: ${sendResult.error}`);
      }
      console.log(`[JOB ${job.id}] ✅ Sender.net campaign sent successfully`);
    }

    // Update job status to completed
    await updateCampaignJobStatus(job.id, 'completed');

    // Update progress
    await updateCampaignJobProgress(job.id, {
      sent: job.progress.total,
      failed: 0,
      currentBatch: job.progress.totalBatches,
    });

    // Create campaign record for UI tracking
    await createEmailCampaignRecord(
      job,
      company,
      job.progress.total,
      0,
      provider,
      campaignId
    );

    console.log(`[JOB ${job.id}] ✅ Campaign COMPLETED - Campaign ID: ${campaignId}, Recipients: ${job.progress.total}`);
    console.log(`[JOB ${job.id}] 📊 View analytics in ${provider === 'brevo' ? 'Brevo' : 'Sender.net'} dashboard: Campaigns section`);

    // Optional: Clean up temporary list/group after a delay (commented out to keep for analytics)
    // setTimeout(async () => {
    //   if (provider === 'brevo' && tempListId) {
    //     await deleteBrevoList(apiKey, tempListId as number);
    //   } else if (provider === 'sender' && tempListId) {
    //     await deleteSenderGroup(apiKey, tempListId as string);
    //   }
    // }, 24 * 60 * 60 * 1000); // Delete after 24 hours

    return {
      success: true,
      jobId: job.id,
      sent: job.progress.total,
      failed: 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[JOB ${job.id}] ❌ Campaign API processing failed:`, error);

    // Clean up temporary list/group on failure
    if (tempListId) {
      console.log(`[JOB ${job.id}] Cleaning up temporary ${provider === 'brevo' ? 'list' : 'group'}...`);
      try {
        if (provider === 'brevo') {
          await deleteBrevoList(apiKey, tempListId as number);
        } else {
          await deleteSenderGroup(apiKey, tempListId as string);
        }
      } catch (cleanupError) {
        console.error(`[JOB ${job.id}] Failed to cleanup temporary ${provider === 'brevo' ? 'list' : 'group'}:`, cleanupError);
      }
    }

    throw new Error(`Campaign API processing failed: ${errorMessage}`);
  }
}

/**
 * Process email campaign using SMTP (transactional approach for compatibility)
 */
async function processEmailCampaignWithSMTP(
  job: CampaignJob,
  company: any,
  smtpConfig: any,
  emailData: {
    subject: string;
    htmlContent: string;
    senderName: string;
    senderEmail: string;
  }
): Promise<ProcessCampaignJobResult> {
  const { subject, htmlContent, senderName, senderEmail } = emailData;

  // Get batch to process
  const startIndex = job.progress.sent + job.progress.failed;
  const batch = job.recipients.slice(startIndex, startIndex + CAMPAIGN_JOB_CONSTANTS.BATCH_SIZE);

  if (batch.length === 0) {
    await updateCampaignJobStatus(job.id, 'completed');
    return {
      success: true,
      jobId: job.id,
      sent: job.progress.sent,
      failed: job.progress.failed,
    };
  }

  let sent = 0;
  let failed = 0;
  const failedRecipients: Array<{ recipient: CampaignRecipient; error: string }> = [];

  // Process each recipient in the batch
  for (const recipient of batch) {
    if (!recipient.email) {
      failed++;
      failedRecipients.push({
        recipient,
        error: 'Email address missing',
      });
      continue;
    }

    try {
      const personalizedContent = replaceEmailVariables(htmlContent, company, recipient);
      
      const smtpConfigWithSender = {
        ...smtpConfig,
        fromEmail: senderEmail,
        fromName: senderName,
      };

      const result = await sendEmailSMTP(smtpConfigWithSender, {
        to: recipient.email,
        subject,
        html: personalizedContent,
      });

      if (result && result.success) {
        sent++;
      } else {
        failed++;
        failedRecipients.push({
          recipient,
          error: result?.error || 'SMTP send failed',
        });
      }
    } catch (error) {
      failed++;
      failedRecipients.push({
        recipient,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update progress
  await updateCampaignJobProgress(job.id, {
    sent: job.progress.sent + sent,
    failed: job.progress.failed + failed,
    currentBatch: job.progress.currentBatch + 1,
  });

  if (failedRecipients.length > 0) {
    const existingFailed = job.failedRecipients || [];
    await updateCampaignJobStatus(job.id, 'processing', {
      failedRecipients: [...existingFailed, ...failedRecipients],
    });
  }

  // Check if job is complete
  const totalProcessed = job.progress.sent + sent + job.progress.failed + failed;
  if (totalProcessed >= job.progress.total) {
    await updateCampaignJobStatus(job.id, 'completed');
    await createEmailCampaignRecord(job, company, job.progress.sent + sent, job.progress.failed + failed, 'smtp');
    console.log(`[JOB ${job.id}] SMTP campaign COMPLETED - Sent: ${job.progress.sent + sent}, Failed: ${job.progress.failed + failed}`);
  }

  return {
    success: true,
    jobId: job.id,
    sent: job.progress.sent + sent,
    failed: job.progress.failed + failed,
  };
}

/**
 * Replace template variables in HTML content with actual values
 * Supports both tight ({{var}}) and spaced ({{ var }}) formats
 */
function replaceEmailVariables(
  htmlContent: string,
  company: any,
  recipient: CampaignRecipient
): string {
  let content = htmlContent;
  
  // Replace company variables (with optional whitespace)
  content = content.replace(/\{\{\s*company_name\s*\}\}/gi, company.name || '');
  content = content.replace(/\{\{\s*company\.name\s*\}\}/gi, company.name || '');
  content = content.replace(/\{\{\s*COMPANY_NAME\s*\}\}/gi, company.name || '');
  content = content.replace(/\{\{\s*company\.NAME\s*\}\}/gi, company.name || '');
  
  // Replace recipient variables (with optional whitespace)
  content = content.replace(/\{\{\s*contact\.name\s*\}\}/gi, recipient.name || recipient.email || '');
  content = content.replace(/\{\{\s*contact\.NAME\s*\}\}/gi, recipient.name || recipient.email || '');
  content = content.replace(/\{\{\s*contact\.email\s*\}\}/gi, recipient.email || '');
  content = content.replace(/\{\{\s*contact\.EMAIL\s*\}\}/gi, recipient.email || '');
  content = content.replace(/\{\{\s*FIRSTNAME\s*\}\}/gi, recipient.name?.split(' ')[0] || '');
  content = content.replace(/\{\{\s*contact\.FIRSTNAME\s*\}\}/gi, recipient.name?.split(' ')[0] || '');
  content = content.replace(/\{\{\s*LASTNAME\s*\}\}/gi, recipient.name?.split(' ').slice(1).join(' ') || '');
  content = content.replace(/\{\{\s*contact\.LASTNAME\s*\}\}/gi, recipient.name?.split(' ').slice(1).join(' ') || '');
  
  // Replace any custom fields if provided (with optional whitespace)
  if (recipient.customFields) {
    Object.entries(recipient.customFields).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      content = content.replace(regex, value);
    });
  }
  
  return content;
}

/**
 * Create a campaign record in the campaigns collection for UI tracking
 * This ensures campaigns appear in the "Your Campaigns" dashboard
 */
async function createEmailCampaignRecord(
  job: CampaignJob,
  company: any,
  sentCount: number,
  failedCount: number,
  provider: 'brevo' | 'sender' | 'smtp',
  providerCampaignId?: number
): Promise<void> {
  if (!adminDb) {
    console.error('[createEmailCampaignRecord] Database not initialized');
    return;
  }

  if (!job.emailData) {
    console.error('[createEmailCampaignRecord] No email data in job');
    return;
  }

  try {
    // DEBUG: Log received provider parameter
    console.log(`[JOB ${job.id}] 🔍 PROVIDER DEBUG - createEmailCampaignRecord received provider:`, provider);
    console.log(`[JOB ${job.id}] 🔍 PROVIDER DEBUG - sentCount: ${sentCount}, failedCount: ${failedCount}`);
    
    // Determine campaign status based on provider and results
    let status: EmailCampaign['status'];
    if (sentCount > 0) {
      // At least some emails were sent successfully
      status = provider === 'brevo' ? 'Sent via Brevo' : 
               provider === 'sender' ? 'Sent via Sender.net' : 
               'Sent';
    } else {
      // All emails failed
      status = provider === 'brevo' ? 'Failed via Brevo' : 
               provider === 'sender' ? 'Failed via Sender.net' :
               'Failed';  // Generic failed status for SMTP
    }
    
    // DEBUG: Log the determined status
    console.log(`[JOB ${job.id}] 🔍 PROVIDER DEBUG - Determined status:`, status);
    
    const isAIGenerated = job.emailData.tag === 'ai-campaign' || job.campaignName.startsWith('AI Campaign:');
    
    const campaignData: Omit<EmailCampaign, 'id'> = {
      name: job.campaignName,
      status: status,
      subject: job.emailData.subject,
      senderName: job.emailData.senderName,
      senderEmail: job.emailData.senderEmail,
      content: job.emailData.htmlContent,
      companyId: job.companyId,
      recipients: String(job.progress.total),
      provider: provider === 'smtp' ? undefined : provider,
      recipientCount: sentCount,
      sentDate: sentCount > 0 ? new Date().toISOString() : null,
      createdAt: job.createdAt,
      lastModified: new Date().toISOString(),
      openRate: 0,
      clickRate: 0,
      unsubscribes: 0,
      isAIGenerated: isAIGenerated,
      campaignJobId: job.id,
    };
    
    // DEBUG: Log campaign data before saving
    console.log(`[JOB ${job.id}] 🔍 PROVIDER DEBUG - Campaign data being saved:`, {
      status: campaignData.status,
      provider: campaignData.provider,
      name: campaignData.name
    });

    const docRef = await adminDb.collection('campaigns').add(campaignData);
    
    console.log(`[JOB ${job.id}] ✅ Created campaign record ${docRef.id} for tracking in UI - Status: ${status}, Provider: ${provider}, Sent: ${sentCount}, Failed: ${failedCount}`);
  } catch (error) {
    console.error(`[JOB ${job.id}] Failed to create campaign record:`, error);
    // Don't throw - this is non-critical, emails were already sent
  }
}

/**
 * Process SMS campaign using the configured provider (MSG91, Fast2SMS, or Twilio)
 */
async function processSMSCampaign(job: CampaignJob, company: any): Promise<ProcessCampaignJobResult> {
  if (!job.smsData) {
    throw new Error('SMS data not found in job');
  }

  const { message, senderId, messageType, dltTemplateId, provider = 'msg91' } = job.smsData;

  // Determine which provider to use and validate configuration
  let smsProvider: 'msg91' | 'fast2sms' | 'twilio' = provider;
  
  // Validate provider-specific configuration
  if (smsProvider === 'msg91') {
    if (!company.apiKeys?.msg91?.authKey) {
      throw new Error('MSG91 API key not configured');
    }
  } else if (smsProvider === 'fast2sms') {
    if (!company.apiKeys?.fast2sms?.apiKey) {
      throw new Error('Fast2SMS API key not configured');
    }
  } else if (smsProvider === 'twilio') {
    if (!company.apiKeys?.twilio?.accountSid || !company.apiKeys?.twilio?.authToken || !company.apiKeys?.twilio?.phoneNumber) {
      throw new Error('Twilio configuration incomplete (requires Account SID, Auth Token, and Phone Number)');
    }
  } else {
    throw new Error(`Unknown SMS provider: ${smsProvider}`);
  }

  // Get batch to process
  const startIndex = job.progress.sent + job.progress.failed;
  const batch = job.recipients.slice(startIndex, startIndex + CAMPAIGN_JOB_CONSTANTS.BATCH_SIZE);

  if (batch.length === 0) {
    // Job complete
    await updateCampaignJobStatus(job.id, 'completed');
    return {
      success: true,
      jobId: job.id,
      sent: job.progress.sent,
      failed: job.progress.failed,
    };
  }

  // Extract phone numbers from batch
  const phoneNumbers = batch
    .filter(r => r.phone)
    .map(r => r.phone as string);

  if (phoneNumbers.length === 0) {
    throw new Error('No valid phone numbers in batch');
  }

  let sent = 0;
  let failed = 0;
  const failedRecipients: Array<{ recipient: CampaignRecipient; error: string }> = [];

  // Send SMS using the configured provider
  if (smsProvider === 'msg91') {
    const config = {
      authKey: decryptApiKeyServerSide(company.apiKeys.msg91.authKey),
      senderId: company.apiKeys.msg91.senderId || senderId,
    };

    const result = await sendBulkSMSMSG91(config, {
      message,
      recipients: phoneNumbers,
      route: messageType,
      dltTemplateId,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send SMS via MSG91');
    }

    sent = phoneNumbers.length;
  } else if (smsProvider === 'fast2sms') {
    const config = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.fast2sms.apiKey),
      senderId: company.apiKeys.fast2sms.senderId || senderId,
    };

    // Map messageType to Fast2SMS route based on DLT compliance and message type
    // 'dlt' = DLT-approved templates (requires template ID) - for transactional/promotional with DLT
    // 'q' = Quick SMS (no DLT) - for promotional without DLT (legacy/non-compliant)
    // 'otp' = OTP messages (uses template with {#var#} placeholder)
    let route: 'dlt' | 'q' | 'otp';
    
    if (messageType === 'transactional') {
      // Transactional messages MUST use DLT route with template ID for compliance
      if (!dltTemplateId) {
        throw new Error('Transactional SMS requires DLT template ID for compliance. Please configure DLT template in your Fast2SMS account.');
      }
      route = 'dlt';
    } else if (messageType === 'promotional') {
      // Promotional messages can use quick route without DLT (legacy) or DLT route with template
      route = dltTemplateId ? 'dlt' : 'q';
    } else {
      // Default: use DLT route if template ID provided, otherwise quick route
      route = dltTemplateId ? 'dlt' : 'q';
    }

    const result = await sendBulkSMSFast2SMS(config, {
      message,
      recipients: phoneNumbers,
      route,
      dltTemplateId,
      language: 'english',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send SMS via Fast2SMS');
    }

    sent = phoneNumbers.length;
  } else if (smsProvider === 'twilio') {
    const config = {
      accountSid: decryptApiKeyServerSide(company.apiKeys.twilio.accountSid),
      authToken: decryptApiKeyServerSide(company.apiKeys.twilio.authToken),
      phoneNumber: company.apiKeys.twilio.phoneNumber,
    };

    // Twilio sends one message at a time
    for (const phone of phoneNumbers) {
      try {
        const result = await sendTwilioSMS(
          config.accountSid,
          config.authToken,
          phone,
          config.phoneNumber,
          message
        );

        if (result.success) {
          sent++;
        } else {
          failed++;
          const recipient = batch.find(r => r.phone === phone);
          if (recipient) {
            failedRecipients.push({
              recipient,
              error: result.error || 'Unknown error',
            });
          }
        }
      } catch (error) {
        failed++;
        const recipient = batch.find(r => r.phone === phone);
        if (recipient) {
          failedRecipients.push({
            recipient,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        console.error(`Failed to send SMS to ${phone} via Twilio:`, error);
      }
    }
  }

  // Update progress
  await updateCampaignJobProgress(job.id, {
    sent: job.progress.sent + sent,
    failed: job.progress.failed + failed,
    currentBatch: job.progress.currentBatch + 1,
  });

  // Store failed recipients (keep status as 'processing')
  if (failedRecipients.length > 0) {
    const existingFailed = job.failedRecipients || [];
    await updateCampaignJobStatus(job.id, 'processing', {
      failedRecipients: [...existingFailed, ...failedRecipients],
    });
  }

  console.log(`SMS batch processed via ${smsProvider}: ${sent} sent, ${failed} failed`);

  // Check if there are more batches to process
  const totalProcessed = job.progress.sent + sent + job.progress.failed + failed;
  if (totalProcessed >= job.progress.total) {
    // Job complete
    await updateCampaignJobStatus(job.id, 'completed');
    console.log(`[JOB ${job.id}] SMS campaign COMPLETED via ${smsProvider} - Sent: ${job.progress.sent + sent}, Failed: ${job.progress.failed + failed}, Total: ${job.progress.total}`);
  } else {
    console.log(`[JOB ${job.id}] SMS batch ${job.progress.currentBatch + 1}/${job.progress.totalBatches} complete - Progress: ${totalProcessed}/${job.progress.total} (${Math.round(totalProcessed / job.progress.total * 100)}%)`);
  }

  return {
    success: true,
    jobId: job.id,
    sent: job.progress.sent + sent,
    failed: job.progress.failed + failed,
  };
}

/**
 * Process WhatsApp campaign using the configured provider
 */
async function processWhatsAppCampaign(job: CampaignJob, company: any): Promise<ProcessCampaignJobResult> {
  if (!job.whatsappData) {
    throw new Error('WhatsApp data not found in job');
  }

  const { templateName, broadcastName, parameters, provider = 'authkey' } = job.whatsappData;

  // Determine which provider to use and validate configuration
  // Only support fully implemented providers: authkey, aisensy, gupshup
  let whatsappProvider: 'authkey' | 'aisensy' | 'gupshup' = provider as any;

  // Validate provider-specific configuration
  if (whatsappProvider === 'authkey') {
    if (!company.apiKeys?.authkey?.authKey) {
      throw new Error('Authkey API key not configured');
    }
  } else if (whatsappProvider === 'aisensy') {
    if (!company.apiKeys?.aisensy?.apiKey) {
      throw new Error('Aisensy API key not configured');
    }
  } else if (whatsappProvider === 'gupshup') {
    if (!company.apiKeys?.gupshup?.apiKey || !company.apiKeys?.gupshup?.appName) {
      throw new Error('Gupshup configuration incomplete (requires API Key and App Name)');
    }
  } else {
    throw new Error(`WhatsApp provider "${provider}" is not supported in campaign processor. Supported providers: authkey, aisensy, gupshup`);
  }

  // Get batch to process
  const startIndex = job.progress.sent + job.progress.failed;
  const batch = job.recipients.slice(startIndex, startIndex + CAMPAIGN_JOB_CONSTANTS.BATCH_SIZE);

  if (batch.length === 0) {
    // Job complete
    await updateCampaignJobStatus(job.id, 'completed');
    return {
      success: true,
      jobId: job.id,
      sent: job.progress.sent,
      failed: job.progress.failed,
    };
  }

  // Filter valid phone numbers
  const validRecipients = batch.filter(r => r.phone);

  if (validRecipients.length === 0) {
    throw new Error('No valid phone numbers in batch');
  }

  let sent = 0;
  let failed = 0;
  let result: any;

  // Extract job-level parameters (ordered array for template placeholders)
  const jobLevelParams = parameters || [];

  // Send WhatsApp using the configured provider
  if (whatsappProvider === 'authkey') {
    const config = { apiKey: decryptApiKeyServerSide(company.apiKeys.authkey.authKey) };
    result = await sendBulkAuthkeyWhatsApp(config, {
      templateName,
      templateType: 'text',
      recipients: validRecipients.map(r => ({
        phone: r.phone!,
        // Use per-recipient customFields (converted to ordered array) if provided
        // Otherwise use job-level parameters
        // Note: customFields is Record<string,string>, convert to array preserving insertion order
        parameters: (r.customFields && Object.keys(r.customFields).length > 0)
          ? Object.values(r.customFields)
          : (jobLevelParams.length > 0 ? jobLevelParams : undefined),
      })),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send WhatsApp messages via Authkey');
    }

    const failedResults = result.results?.filter((r: any) => !r.success) || [];
    sent = validRecipients.length - failedResults.length;
    failed = failedResults.length;

  } else if (whatsappProvider === 'aisensy') {
    const config = { 
      apiKey: decryptApiKeyServerSide(company.apiKeys.aisensy.apiKey),
      campaignName: broadcastName || 'OmniFlow Campaign',
    };

    result = await sendBulkWhatsAppAiSensy(config, {
      campaignName: broadcastName || 'OmniFlow Campaign',
      recipients: validRecipients.map(r => ({
        whatsappNumber: r.phone!,
        userName: r.name || 'Customer',
        // Use per-recipient customFields (converted to ordered array) if provided
        // Otherwise use job-level parameters
        templateParams: (r.customFields && Object.keys(r.customFields).length > 0)
          ? Object.values(r.customFields)
          : (jobLevelParams.length > 0 ? jobLevelParams : undefined),
      })),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send WhatsApp messages via Aisensy');
    }

    const failedCount = result.result?.failed?.length || 0;
    sent = validRecipients.length - failedCount;
    failed = failedCount;

  } else if (whatsappProvider === 'gupshup') {
    const config = {
      apiKey: decryptApiKeyServerSide(company.apiKeys.gupshup.apiKey),
      appName: company.apiKeys.gupshup.appName,
      srcName: company.apiKeys.gupshup.srcName,
    };

    result = await sendBulkWhatsAppGupshup(config, {
      source: company.apiKeys.gupshup.phoneNumber || '',
      templateId: templateName,
      recipients: validRecipients.map(r => ({
        phone: r.phone!,
        // Use per-recipient customFields (converted to ordered array) if provided
        // Otherwise use job-level parameters
        params: (r.customFields && Object.keys(r.customFields).length > 0)
          ? Object.values(r.customFields)
          : (jobLevelParams.length > 0 ? jobLevelParams : undefined),
      })),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send WhatsApp messages via Gupshup');
    }

    const failedResults = result.results?.filter((r: any) => !r.success) || [];
    sent = validRecipients.length - failedResults.length;
    failed = failedResults.length;
  }

  // Update progress
  await updateCampaignJobProgress(job.id, {
    sent: job.progress.sent + sent,
    failed: job.progress.failed + failed,
    currentBatch: job.progress.currentBatch + 1,
  });

  console.log(`WhatsApp batch processed via ${whatsappProvider}: ${sent} sent, ${failed} failed`);

  // Check if there are more batches to process
  const totalProcessed = job.progress.sent + sent + job.progress.failed + failed;
  if (totalProcessed >= job.progress.total) {
    // Job complete
    await updateCampaignJobStatus(job.id, 'completed');
    console.log(`[JOB ${job.id}] WhatsApp campaign COMPLETED via ${whatsappProvider} - Sent: ${job.progress.sent + sent}, Failed: ${job.progress.failed + failed}, Total: ${job.progress.total}`);
  } else {
    console.log(`[JOB ${job.id}] WhatsApp batch ${job.progress.currentBatch + 1}/${job.progress.totalBatches} complete - Progress: ${totalProcessed}/${job.progress.total} (${Math.round(totalProcessed / job.progress.total * 100)}%)`);
  }

  return {
    success: true,
    jobId: job.id,
    sent: job.progress.sent + sent,
    failed: job.progress.failed + failed,
  };
}

'use server';

/**
 * Campaign Queue Manager
 * 
 * Handles creation and management of background campaign jobs
 * for Email, SMS, and WhatsApp bulk campaigns.
 * 
 * IMPORTANT: Uses Firebase Admin SDK to prevent server crashes.
 * The web SDK causes memory leaks and handle exhaustion when used in server actions.
 */

import { adminDb } from './firebase-admin';
import type { 
  CampaignJob, 
  CampaignJobType, 
  CampaignRecipient,
  EmailCampaignData,
  SMSCampaignData,
  WhatsAppCampaignData,
  CreateCampaignJobResult,
  CampaignJobProgress,
  CampaignJobRetry
} from '@/types/campaign-jobs';
import { CAMPAIGN_JOB_CONSTANTS } from '@/types/campaign-jobs';

/**
 * Creates a new email campaign job
 */
export async function createEmailCampaignJob(
  companyId: string,
  createdBy: string,
  campaignName: string,
  emailData: EmailCampaignData,
  recipients: CampaignRecipient[],
  provider?: 'brevo' | 'sender' | 'smtp'
): Promise<CreateCampaignJobResult> {
  return createCampaignJob({
    companyId,
    createdBy,
    campaignName,
    jobType: 'email',
    emailData: { ...emailData, provider: provider || emailData.provider || 'brevo' }, // Use provider from emailData if not explicitly passed
    recipients,
  });
}

/**
 * Creates a new SMS campaign job
 */
export async function createSMSCampaignJob(
  companyId: string,
  createdBy: string,
  campaignName: string,
  smsData: SMSCampaignData,
  recipients: CampaignRecipient[]
): Promise<CreateCampaignJobResult> {
  return createCampaignJob({
    companyId,
    createdBy,
    campaignName,
    jobType: 'sms',
    smsData,
    recipients,
  });
}

/**
 * Creates a new WhatsApp campaign job
 */
export async function createWhatsAppCampaignJob(
  companyId: string,
  createdBy: string,
  campaignName: string,
  whatsappData: WhatsAppCampaignData,
  recipients: CampaignRecipient[]
): Promise<CreateCampaignJobResult> {
  return createCampaignJob({
    companyId,
    createdBy,
    campaignName,
    jobType: 'whatsapp',
    whatsappData,
    recipients,
  });
}

/**
 * Internal function to create a campaign job
 * Uses Firebase Admin SDK for stability
 */
async function createCampaignJob(params: {
  companyId: string;
  createdBy: string;
  campaignName: string;
  jobType: CampaignJobType;
  emailData?: EmailCampaignData;
  smsData?: SMSCampaignData;
  whatsappData?: WhatsAppCampaignData;
  recipients: CampaignRecipient[];
}): Promise<CreateCampaignJobResult> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const totalRecipients = params.recipients.length;
    const totalBatches = Math.ceil(totalRecipients / CAMPAIGN_JOB_CONSTANTS.BATCH_SIZE);

    const progress: CampaignJobProgress = {
      total: totalRecipients,
      sent: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
    };

    const retry: CampaignJobRetry = {
      attempts: 0,
      maxAttempts: CAMPAIGN_JOB_CONSTANTS.MAX_RETRIES,
      backoffMs: CAMPAIGN_JOB_CONSTANTS.INITIAL_BACKOFF_MS,
    };

    const now = new Date().toISOString();

    const jobData: Omit<CampaignJob, 'id'> = {
      companyId: params.companyId,
      createdBy: params.createdBy,
      jobType: params.jobType,
      status: 'pending',
      campaignName: params.campaignName,
      recipients: params.recipients,
      progress,
      retry,
      createdAt: now,
      updatedAt: now,
    };

    if (params.emailData !== undefined) {
      jobData.emailData = params.emailData;
    }
    if (params.smsData !== undefined) {
      jobData.smsData = params.smsData;
    }
    if (params.whatsappData !== undefined) {
      jobData.whatsappData = params.whatsappData;
    }

    const docRef = await adminDb.collection('campaignJobs').add(jobData);

    console.log(`Created ${params.jobType} campaign job ${docRef.id} for company ${params.companyId} with ${totalRecipients} recipients`);

    return {
      success: true,
      jobId: docRef.id,
    };
  } catch (error) {
    console.error('Error creating campaign job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating campaign job',
    };
  }
}

/**
 * Gets a campaign job by ID
 * Uses Firebase Admin SDK for stability
 */
export async function getCampaignJob(jobId: string): Promise<CampaignJob | null> {
  if (!adminDb) return null;

  try {
    const jobDoc = await adminDb.collection('campaignJobs').doc(jobId).get();
    if (!jobDoc.exists) {
      return null;
    }

    return {
      id: jobDoc.id,
      ...jobDoc.data(),
    } as CampaignJob;
  } catch (error) {
    console.error('Error getting campaign job:', error);
    return null;
  }
}

/**
 * Gets all pending campaign jobs across all companies
 * Uses Firebase Admin SDK for stability
 */
export async function getPendingCampaignJobs(): Promise<CampaignJob[]> {
  if (!adminDb) return [];

  try {
    const snapshot = await adminDb.collection('campaignJobs')
      .where('status', 'in', ['pending', 'retrying'])
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as CampaignJob));
  } catch (error) {
    console.error('Error getting pending campaign jobs:', error);
    return [];
  }
}

/**
 * Gets campaign jobs for a specific company
 * Uses Firebase Admin SDK for stability
 */
export async function getCompanyCampaignJobs(companyId: string): Promise<CampaignJob[]> {
  if (!adminDb) return [];

  try {
    const snapshot = await adminDb.collection('campaignJobs')
      .where('companyId', '==', companyId)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as CampaignJob));
  } catch (error) {
    console.error('Error getting company campaign jobs:', error);
    return [];
  }
}

/**
 * Updates campaign job status
 * Uses Firebase Admin SDK for stability
 */
export async function updateCampaignJobStatus(
  jobId: string,
  status: CampaignJob['status'],
  additionalData?: Partial<CampaignJob>
): Promise<boolean> {
  if (!adminDb) return false;

  try {
    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData,
    };

    // Add timestamps based on status
    if (status === 'processing' && !additionalData?.startedAt) {
      updates.startedAt = new Date().toISOString();
    } else if ((status === 'completed' || status === 'failed') && !additionalData?.completedAt) {
      updates.completedAt = new Date().toISOString();
    }

    await adminDb.collection('campaignJobs').doc(jobId).update(updates);
    return true;
  } catch (error) {
    console.error('Error updating campaign job status:', error);
    return false;
  }
}

/**
 * Updates campaign job progress
 * Uses Firebase Admin SDK for stability
 */
export async function updateCampaignJobProgress(
  jobId: string,
  progress: Partial<CampaignJobProgress>
): Promise<boolean> {
  if (!adminDb) return false;

  try {
    const job = await getCampaignJob(jobId);
    if (!job) return false;

    const updatedProgress = {
      ...job.progress,
      ...progress,
    };

    await adminDb.collection('campaignJobs').doc(jobId).update({
      progress: updatedProgress,
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Error updating campaign job progress:', error);
    return false;
  }
}

/**
 * Marks a campaign job for retry with exponential backoff
 * Uses Firebase Admin SDK for stability
 */
export async function retryCampaignJob(jobId: string, error: string): Promise<boolean> {
  if (!adminDb) return false;

  try {
    const job = await getCampaignJob(jobId);
    if (!job) return false;

    const attempts = job.retry.attempts + 1;

    if (attempts >= job.retry.maxAttempts) {
      // Max retries reached, mark as failed
      await updateCampaignJobStatus(jobId, 'failed', {
        error: `Failed after ${attempts} attempts: ${error}`,
      });
      return false;
    }

    // Calculate exponential backoff
    const backoffMs = Math.min(
      job.retry.backoffMs * 2,
      CAMPAIGN_JOB_CONSTANTS.MAX_BACKOFF_MS
    );

    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    await adminDb.collection('campaignJobs').doc(jobId).update({
      status: 'retrying',
      retry: {
        ...job.retry,
        attempts,
        lastAttemptAt: new Date().toISOString(),
        nextRetryAt,
        backoffMs,
      },
      error,
      startedAt: null, // Clear startedAt so the retry gets a fresh timeout window when claimed
      updatedAt: new Date().toISOString(),
    });

    console.log(`Campaign job ${jobId} scheduled for retry ${attempts}/${job.retry.maxAttempts} in ${backoffMs / 1000 / 60} minutes`);

    return true;
  } catch (error) {
    console.error('Error retrying campaign job:', error);
    return false;
  }
}

/**
 * Checks if a retrying job is ready to be processed again
 */
export async function isJobReadyForRetry(job: CampaignJob): Promise<boolean> {
  if (job.status !== 'retrying') return false;
  if (!job.retry.nextRetryAt) return false;

  const nextRetryTime = new Date(job.retry.nextRetryAt).getTime();
  const now = Date.now();

  return now >= nextRetryTime;
}

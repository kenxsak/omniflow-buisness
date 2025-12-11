
'use server';
/**
 * @fileOverview The core logic for processing and executing email automations.
 * This is the "backend" of the automation system.
 * 
 * Features:
 * - Per-company daily/hourly email quotas based on subscription plan
 * - Rate limiting to prevent spam and provider bans
 * - Circuit breaker pattern for failure handling
 * - Automatic quota resets and metrics tracking
 */

import { serverDb as db } from './firebase-server'; // Use server-side DB instance
import { collection, doc, getDocs, getDoc, writeBatch, query, where, Timestamp, updateDoc } from 'firebase/firestore';
import type { Company, EmailAutomation, AutomationStep, AutomationState } from '@/types/automations';
import type { Lead } from './mock-data';
import { sendBrevoEmail } from '@/ai/flows/send-brevo-email-flow';
import { sendEmailSMTP } from './smtp-client';
import { getCompany } from './saas-data';
import type { DeliveryProvider } from '@/types/email-lists';
import { 
  PLAN_QUOTAS, 
  DEFAULT_QUOTAS, 
  INITIAL_QUOTA_TRACKING,
  type AutomationQuotas, 
  type QuotaTracking 
} from '@/types/quotas';

/**
 * Circuit breaker cooldown period in milliseconds (30 minutes)
 */
const CIRCUIT_BREAKER_COOLDOWN_MS = 30 * 60 * 1000;

/**
 * Gets the appropriate quotas for a company based on their plan.
 * Falls back to DEFAULT_QUOTAS if plan is not recognized.
 */
function getQuotasForCompany(company: Company): AutomationQuotas {
  const planQuota = PLAN_QUOTAS[company.planId];
  if (planQuota) {
    return planQuota;
  }
  console.warn(`Unknown plan ID: ${company.planId} for company ${company.id}. Using default quotas.`);
  return DEFAULT_QUOTAS;
}

/**
 * Retrieves quota tracking data for a company from Firestore.
 * Initializes tracking data if it doesn't exist (backward compatibility).
 */
async function getQuotaTracking(companyId: string): Promise<QuotaTracking> {
  if (!db) {
    return INITIAL_QUOTA_TRACKING;
  }

  const companyRef = doc(db, 'companies', companyId);
  const companyDoc = await getDoc(companyRef);
  
  if (!companyDoc.exists()) {
    return INITIAL_QUOTA_TRACKING;
  }
  
  const data = companyDoc.data();
  const tracking = data.quotaTracking as QuotaTracking | undefined;
  
  if (!tracking) {
    // Initialize quota tracking for companies that don't have it yet
    const initialTracking = { ...INITIAL_QUOTA_TRACKING };
    await updateDoc(companyRef, { quotaTracking: initialTracking }).catch(err => {
      console.error(`Failed to initialize quota tracking for company ${companyId}:`, err);
    });
    return initialTracking;
  }
  
  return tracking;
}

/**
 * Resets quota counters if the time window has passed.
 */
function resetQuotasIfNeeded(tracking: QuotaTracking): QuotaTracking {
  const now = new Date();
  const lastDailyReset = new Date(tracking.lastDailyReset);
  const lastHourlyReset = new Date(tracking.lastHourlyReset);
  
  let updated = { ...tracking };
  
  // Reset daily counter if it's a new day (UTC)
  if (now.getUTCDate() !== lastDailyReset.getUTCDate() || 
      now.getUTCMonth() !== lastDailyReset.getUTCMonth() ||
      now.getUTCFullYear() !== lastDailyReset.getUTCFullYear()) {
    updated.emailsSentToday = 0;
    updated.lastDailyReset = now.toISOString();
  }
  
  // Reset hourly counter if it's been more than an hour
  const hoursSinceReset = (now.getTime() - lastHourlyReset.getTime()) / (1000 * 60 * 60);
  if (hoursSinceReset >= 1) {
    updated.emailsSentThisHour = 0;
    updated.lastHourlyReset = now.toISOString();
  }
  
  return updated;
}

/**
 * Checks if the circuit breaker should allow operations.
 * Returns true if operations are allowed, false if circuit is tripped.
 */
function isCircuitBreakerOpen(tracking: QuotaTracking, quotas: AutomationQuotas): boolean {
  // If consecutive failures exceed threshold, check cooldown
  if (tracking.consecutiveFailures >= quotas.maxFailuresBeforeStop) {
    if (tracking.circuitBreakerTrippedAt) {
      const trippedAt = new Date(tracking.circuitBreakerTrippedAt);
      const now = new Date();
      const timeSinceTripped = now.getTime() - trippedAt.getTime();
      
      // If cooldown period has passed, reset the circuit breaker
      if (timeSinceTripped >= CIRCUIT_BREAKER_COOLDOWN_MS) {
        console.log(`Circuit breaker cooldown expired for company. Resetting failures.`);
        return false; // Allow operations and reset will happen when updating tracking
      }
      
      // Still in cooldown
      return true;
    }
    // Just hit the threshold, trip the breaker
    return true;
  }
  
  return false;
}

/**
 * Checks if sending an email would exceed quotas.
 */
function isQuotaExceeded(tracking: QuotaTracking, quotas: AutomationQuotas): boolean {
  return tracking.emailsSentToday >= quotas.maxEmailsPerDay ||
         tracking.emailsSentThisHour >= quotas.maxEmailsPerHour;
}

/**
 * Updates quota tracking after a successful email send.
 */
async function recordSuccessfulEmail(companyId: string, tracking: QuotaTracking): Promise<void> {
  if (!db) return;
  
  const updated: QuotaTracking = {
    ...tracking,
    emailsSentToday: tracking.emailsSentToday + 1,
    emailsSentThisHour: tracking.emailsSentThisHour + 1,
    consecutiveFailures: 0, // Reset failure counter on success
    lastEmailSentAt: new Date().toISOString(),
  };
  
  // Clear circuit breaker if it was tripped
  if (updated.circuitBreakerTrippedAt) {
    delete updated.circuitBreakerTrippedAt;
  }
  
  const companyRef = doc(db, 'companies', companyId);
  await updateDoc(companyRef, { quotaTracking: updated }).catch(err => {
    console.error(`Failed to update quota tracking for company ${companyId}:`, err);
  });
}

/**
 * Updates quota tracking after a failed email send.
 */
async function recordFailedEmail(companyId: string, tracking: QuotaTracking, quotas: AutomationQuotas): Promise<void> {
  if (!db) return;
  
  const updated: QuotaTracking = {
    ...tracking,
    consecutiveFailures: tracking.consecutiveFailures + 1,
  };
  
  // Trip circuit breaker if threshold reached
  if (updated.consecutiveFailures >= quotas.maxFailuresBeforeStop && !updated.circuitBreakerTrippedAt) {
    updated.circuitBreakerTrippedAt = new Date().toISOString();
    console.error(`Circuit breaker TRIPPED for company ${companyId} after ${updated.consecutiveFailures} consecutive failures. Cooldown: ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000 / 60} minutes.`);
  }
  
  const companyRef = doc(db, 'companies', companyId);
  await updateDoc(companyRef, { quotaTracking: updated }).catch(err => {
    console.error(`Failed to update failure tracking for company ${companyId}:`, err);
  });
}

/**
 * Main function to execute all pending automation steps for all companies.
 * This should be triggered by a scheduled job (e.g., a cron job calling the API route).
 * @returns A summary of the actions taken.
 */
export async function runAllAutomations(): Promise<{ success: boolean; message: string; details: string[] }> {
  if (!db) {
    return { success: false, message: 'Database not initialized.', details: [] };
  }
  
  console.log('Starting automation run...');
  const companiesSnapshot = await getDocs(collection(db, 'companies'));
  const details: string[] = [];
  let totalStepsProcessed = 0;
  let totalSkippedQuota = 0;
  let totalSkippedCircuitBreaker = 0;

  for (const companyDoc of companiesSnapshot.docs) {
    const company = { id: companyDoc.id, ...companyDoc.data() } as Company;
    if (company.status !== 'active' || !company.apiKeys?.brevo?.apiKey) {
      continue; // Skip inactive companies or those without a Brevo key
    }
    
    const result = await processAutomationsForCompany(company);
    if (result.stepsProcessed > 0 || result.skippedQuota > 0 || result.skippedCircuitBreaker > 0) {
      const detailParts: string[] = [];
      if (result.stepsProcessed > 0) {
        detailParts.push(`${result.stepsProcessed} steps processed`);
      }
      if (result.skippedQuota > 0) {
        detailParts.push(`${result.skippedQuota} skipped (quota exceeded)`);
      }
      if (result.skippedCircuitBreaker > 0) {
        detailParts.push(`${result.skippedCircuitBreaker} skipped (circuit breaker open)`);
      }
      details.push(`Company ${company.name} (${company.id}): ${detailParts.join(', ')}`);
      totalStepsProcessed += result.stepsProcessed;
      totalSkippedQuota += result.skippedQuota;
      totalSkippedCircuitBreaker += result.skippedCircuitBreaker;
    }
  }
  
  const message = `Automation run completed. Processed ${totalStepsProcessed} steps, skipped ${totalSkippedQuota} (quota), ${totalSkippedCircuitBreaker} (circuit breaker) across ${companiesSnapshot.size} companies.`;
  console.log(message);
  return { success: true, message, details };
}


/**
 * Processes all active automations for a single company.
 * @param company The company object.
 * @returns A summary of actions taken for the company.
 */
async function processAutomationsForCompany(company: Company): Promise<{ 
  stepsProcessed: number;
  skippedQuota: number;
  skippedCircuitBreaker: number;
}> {
    const companyId = company.id;
    if (!db) return { stepsProcessed: 0, skippedQuota: 0, skippedCircuitBreaker: 0 };
    
    // Get quotas for this company based on their plan
    const quotas = getQuotasForCompany(company);
    
    // Get and reset quota tracking if needed
    let quotaTracking = await getQuotaTracking(companyId);
    const resetTracking = resetQuotasIfNeeded(quotaTracking);
    
    // Update tracking in Firestore if resets occurred
    if (resetTracking.lastDailyReset !== quotaTracking.lastDailyReset || 
        resetTracking.lastHourlyReset !== quotaTracking.lastHourlyReset) {
      quotaTracking = resetTracking;
      if (db) {
        await updateDoc(doc(db, 'companies', companyId), { quotaTracking }).catch(err => {
          console.error(`Failed to update reset quota tracking for company ${companyId}:`, err);
        });
      }
    }
    
    // Check circuit breaker
    const circuitBreakerOpen = isCircuitBreakerOpen(quotaTracking, quotas);
    if (circuitBreakerOpen) {
      console.warn(`Circuit breaker OPEN for company ${company.name} (${companyId}). Skipping all automations.`);
      return { stepsProcessed: 0, skippedQuota: 0, skippedCircuitBreaker: 1 };
    }
    
    const automationsSnapshot = await getDocs(query(collection(db, 'companies', companyId, 'automations'), where('status', '==', 'active')));
    if (automationsSnapshot.empty) {
        return { stepsProcessed: 0, skippedQuota: 0, skippedCircuitBreaker: 0 };
    }
    const activeAutomations = automationsSnapshot.docs.map(doc => doc.data() as EmailAutomation);

    const statesSnapshot = await getDocs(query(collection(db, 'companies', companyId, 'automationStates'), where('status', '==', 'active')));
    if (statesSnapshot.empty) {
        return { stepsProcessed: 0, skippedQuota: 0, skippedCircuitBreaker: 0 };
    }
    const activeStates = statesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationState));

    let stepsProcessed = 0;
    let skippedQuota = 0;
    const batch = writeBatch(db);

    for (const state of activeStates) {
        const automation = activeAutomations.find(a => a.id === state.automationId);
        if (!automation) continue;

        const nextStepIndex = state.nextStepIndex;
        const nextStep = automation.config.steps[nextStepIndex];

        if (!nextStep) { // End of sequence
            batch.update(doc(db, 'companies', companyId, 'automationStates', state.id), { status: 'completed' });
            stepsProcessed++;
            continue;
        }
        
        const now = Timestamp.now();
        if (state.nextStepTime.toMillis() > now.toMillis()) {
            continue; // Not yet time for the next step
        }
        
        // --- Process the current step ---
        if (nextStep.type === 'delay') {
            const delayInMs = nextStep.unit === 'days'
                ? nextStep.duration * 24 * 60 * 60 * 1000
                : nextStep.duration * 60 * 60 * 1000;
            
            const newNextStepTime = Timestamp.fromMillis(now.toMillis() + delayInMs);
            batch.update(doc(db, 'companies', companyId, 'automationStates', state.id), {
                nextStepIndex: nextStepIndex + 1,
                nextStepTime: newNextStepTime,
            });
            stepsProcessed++;

        } else if (nextStep.type === 'email') {
            // Check quota BEFORE attempting to send
            if (isQuotaExceeded(quotaTracking, quotas)) {
              console.warn(`Company ${company.name} (${companyId}) quota exceeded. Daily: ${quotaTracking.emailsSentToday}/${quotas.maxEmailsPerDay}, Hourly: ${quotaTracking.emailsSentThisHour}/${quotas.maxEmailsPerHour}. Skipping email.`);
              skippedQuota++;
              continue; // Skip this email, don't advance state
            }
            
            const leadDoc = await getDoc(doc(db, 'leads', state.leadId));
            if (!leadDoc.exists()) continue;
            const lead = {id: leadDoc.id, ...leadDoc.data()} as Lead;
            
            // Determine which provider to use from automation config or company settings
            // deliveryConfig may be on the automation object directly (EmailAutomationSequence style)
            const automationAny = automation as any;
            const deliveryProvider: DeliveryProvider = automationAny.deliveryConfig?.provider || 'brevo';
            
            const brevoApiKey = company.apiKeys?.brevo?.apiKey;
            const senderApiKey = company.apiKeys?.sender?.apiKey;
            const smtpConfig = company.apiKeys?.smtp;
            
            // Determine sender info based on provider
            let senderEmail = '';
            let senderName = company.name;
            
            if (deliveryProvider === 'brevo') {
              senderEmail = company.apiKeys?.brevo?.senderEmail || company.ownerId;
            } else if (deliveryProvider === 'sender') {
              senderEmail = company.apiKeys?.sender?.senderEmail || company.ownerId;
              senderName = company.apiKeys?.sender?.senderName || company.name;
            } else if (deliveryProvider === 'smtp') {
              senderEmail = smtpConfig?.fromEmail || company.ownerId;
              senderName = smtpConfig?.fromName || company.name;
            }
            
            // Check if we have the required API key/config for the selected provider
            const hasValidConfig = 
              (deliveryProvider === 'brevo' && brevoApiKey && senderEmail) ||
              (deliveryProvider === 'sender' && senderApiKey && senderEmail) ||
              (deliveryProvider === 'smtp' && smtpConfig?.host && senderEmail);
            
            if (hasValidConfig) {
                try {
                    // Send the email based on selected provider
                    if (deliveryProvider === 'brevo' && brevoApiKey) {
                      await sendBrevoEmail({
                          apiKey: brevoApiKey,
                          senderEmail: senderEmail,
                          senderName: senderName,
                          recipientEmail: lead.email,
                          recipientName: lead.name,
                          subject: nextStep.subject,
                          htmlContent: nextStep.content,
                      });
                    } else if (deliveryProvider === 'sender' && senderApiKey) {
                      // Send via Sender.net using transactional email API
                      const senderPayload = {
                        from: { name: senderName, email: senderEmail },
                        to: [{ email: lead.email, name: lead.name || '' }],
                        subject: nextStep.subject,
                        html: nextStep.content,
                      };
                      console.log(`[Sender.net Automation] Sending email to ${lead.email}`);
                      const senderResponse = await fetch('https://api.sender.net/v2/emails', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${senderApiKey}`,
                          'Content-Type': 'application/json',
                          'Accept': 'application/json',
                        },
                        body: JSON.stringify(senderPayload),
                      });
                      if (!senderResponse.ok) {
                        const errorData = await senderResponse.json().catch(() => ({}));
                        console.error(`[Sender.net Automation] Failed (${senderResponse.status}):`, errorData);
                        throw new Error(errorData.message || `Sender.net API error: ${senderResponse.status}`);
                      }
                      console.log(`[Sender.net Automation] Email sent successfully to ${lead.email}`);
                    } else if (deliveryProvider === 'smtp' && smtpConfig) {
                      const smtpUsername = smtpConfig.username || smtpConfig.user || '';
                      if (!smtpUsername) {
                        throw new Error('SMTP username not configured');
                      }
                      const result = await sendEmailSMTP(
                        {
                          host: smtpConfig.host,
                          port: smtpConfig.port || 587,
                          username: smtpUsername,
                          password: smtpConfig.password,
                          fromEmail: senderEmail,
                          fromName: senderName,
                        },
                        {
                          to: lead.email,
                          subject: nextStep.subject,
                          html: nextStep.content,
                        }
                      );
                      if (!result.success) {
                        throw new Error(result.error || 'SMTP send failed');
                      }
                    }

                    // Record successful send and update quota tracking
                    await recordSuccessfulEmail(companyId, quotaTracking);
                    
                    // Update local tracking for subsequent iterations
                    quotaTracking = {
                      ...quotaTracking,
                      emailsSentToday: quotaTracking.emailsSentToday + 1,
                      emailsSentThisHour: quotaTracking.emailsSentThisHour + 1,
                      consecutiveFailures: 0,
                    };
                    
                    // Update the state to point to the next step
                    batch.update(doc(db, 'companies', companyId, 'automationStates', state.id), {
                        nextStepIndex: nextStepIndex + 1,
                    });
                    stepsProcessed++;
                    
                    console.log(`Email sent successfully via ${deliveryProvider} for company ${companyId}, lead ${lead.id}. Quota: ${quotaTracking.emailsSentToday}/${quotas.maxEmailsPerDay} daily, ${quotaTracking.emailsSentThisHour}/${quotas.maxEmailsPerHour} hourly.`);
                    
                } catch (error) {
                    console.error(`Failed to send email via ${deliveryProvider} for company ${companyId}, lead ${lead.id}:`, error);
                    
                    // Record failure and update tracking
                    await recordFailedEmail(companyId, quotaTracking, quotas);
                    
                    // Update local tracking
                    quotaTracking = {
                      ...quotaTracking,
                      consecutiveFailures: quotaTracking.consecutiveFailures + 1,
                    };
                    
                    // Mark automation state as error
                    batch.update(doc(db, 'companies', companyId, 'automationStates', state.id), {
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error sending email',
                    });
                }
            } else {
                console.warn(`No valid ${deliveryProvider} configuration for company ${companyId}. Skipping email.`);
            }
        }
    }

    await batch.commit();
    return { stepsProcessed, skippedQuota, skippedCircuitBreaker: 0 };
}

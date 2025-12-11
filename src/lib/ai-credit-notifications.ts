'use server';

/**
 * AI Credit Notification System
 * Sends alerts to users and company admins when AI credits reach 80% and 100% usage
 */

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { CompanyAIQuota } from '@/types/ai-usage';
import { sendTransactionalEmail } from '@/services/brevo';

export interface CreditNotificationResult {
  notificationSent: boolean;
  threshold?: '80%' | '100%';
  reason?: string;
}

/**
 * Check if credit usage has crossed a threshold and send notifications if needed
 * Should be called after each AI operation to monitor usage
 */
export async function checkAndSendCreditNotifications(
  companyId: string
): Promise<CreditNotificationResult> {
  if (!serverDb) {
    return { notificationSent: false, reason: 'Database not initialized' };
  }

  try {
    // Get current month quota
    const currentMonth = new Date().toISOString().slice(0, 7);
    const quotaRef = doc(serverDb, 'aiQuotas', `${companyId}_${currentMonth}`);
    const quotaDoc = await getDoc(quotaRef);

    if (!quotaDoc.exists()) {
      return { notificationSent: false, reason: 'Quota not found' };
    }

    const quota = quotaDoc.data() as CompanyAIQuota;
    const usagePercent = (quota.creditsUsed / quota.monthlyCreditsLimit) * 100;

    // Determine which threshold was crossed
    let thresholdToNotify: '80%' | '100%' | null = null;
    
    if (usagePercent >= 100 && !quota.quotaWarningsSent.includes('100%')) {
      thresholdToNotify = '100%';
    } else if (usagePercent >= 80 && !quota.quotaWarningsSent.includes('80%')) {
      thresholdToNotify = '80%';
    }

    // No notification needed
    if (!thresholdToNotify) {
      return { notificationSent: false, reason: 'No threshold crossed or already notified' };
    }

    // Get company and admin details
    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return { notificationSent: false, reason: 'Company not found' };
    }

    const company = companyDoc.data();
    
    // Get company owner/admin email
    const ownerRef = doc(serverDb, 'users', company.ownerId || company.createdBy);
    const ownerDoc = await getDoc(ownerRef);
    
    if (!ownerDoc.exists()) {
      return { notificationSent: false, reason: 'Company owner not found' };
    }

    const owner = ownerDoc.data();
    
    // Update quotaWarningsSent array to prevent duplicate notifications
    await updateDoc(quotaRef, {
      quotaWarningsSent: [...quota.quotaWarningsSent, thresholdToNotify],
    });

    // Send notification email (only if BREVO_API_KEY is configured)
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey && owner.email) {
      const subject = thresholdToNotify === '100%' 
        ? '⚠️ AI Credits Exhausted - Upgrade Required'
        : '⚠️ AI Credits Alert - 80% Usage Reached';
      
      const htmlContent = generateCreditNotificationEmail(
        owner.name || owner.email,
        company.companyName || 'Your Company',
        quota.creditsUsed,
        quota.monthlyCreditsLimit,
        usagePercent,
        thresholdToNotify
      );

      await sendTransactionalEmail(
        brevoApiKey,
        'noreply@omniflow.ai', // Replace with your sender email
        'OmniFlow AI Credits',
        owner.email,
        owner.name || 'User',
        subject,
        htmlContent
      );
    }

    console.log(`✅ Credit notification sent to ${company.companyName}: ${thresholdToNotify} threshold reached`);

    return {
      notificationSent: true,
      threshold: thresholdToNotify,
    };
  } catch (error) {
    console.error('Error in checkAndSendCreditNotifications:', error);
    return { notificationSent: false, reason: 'Error sending notification' };
  }
}

/**
 * Generate HTML email content for credit notifications
 */
function generateCreditNotificationEmail(
  userName: string,
  companyName: string,
  creditsUsed: number,
  creditsLimit: number,
  usagePercent: number,
  threshold: '80%' | '100%'
): string {
  const isExhausted = threshold === '100%';
  const bgColor = isExhausted ? '#ef4444' : '#f59e0b';
  const icon = isExhausted ? '🚨' : '⚠️';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Credits ${isExhausted ? 'Exhausted' : 'Alert'}</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${bgColor}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 24px;">${icon} AI Credits ${isExhausted ? 'Exhausted' : 'Alert'}</h1>
  </div>
  
  <p>Hi ${userName},</p>
  
  ${isExhausted ? `
    <p><strong>Your AI credits have been exhausted for this month.</strong></p>
    <p>All AI operations will be paused until you:</p>
    <ul>
      <li>Upgrade to a higher plan with more credits</li>
      <li>Add your own Gemini API key for unlimited usage</li>
      <li>Wait until next month when credits reset</li>
    </ul>
  ` : `
    <p><strong>You've used ${usagePercent.toFixed(1)}% of your monthly AI credits.</strong></p>
    <p>To avoid service interruption, consider:</p>
    <ul>
      <li>Upgrading to a plan with more credits</li>
      <li>Adding your own Gemini API key for unlimited usage</li>
      <li>Monitoring your usage more closely</li>
    </ul>
  `}
  
  <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Usage Summary for ${companyName}</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0;"><strong>Credits Used:</strong></td>
        <td style="text-align: right;">${creditsUsed.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Monthly Limit:</strong></td>
        <td style="text-align: right;">${creditsLimit.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Remaining:</strong></td>
        <td style="text-align: right;">${Math.max(0, creditsLimit - creditsUsed).toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-top: 2px solid #ddd;"><strong>Usage:</strong></td>
        <td style="text-align: right; border-top: 2px solid #ddd; color: ${bgColor}; font-weight: bold;">${usagePercent.toFixed(1)}%</td>
      </tr>
    </table>
  </div>
  
  <div style="margin: 30px 0;">
    <a href="https://yourapp.com/settings/subscription" style="display: inline-block; background: #008080; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Upgrade Plan</a>
    &nbsp;&nbsp;
    <a href="https://yourapp.com/settings/api-keys" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Add API Key</a>
  </div>
  
  <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
    <strong>💡 Pro Tip:</strong> Adding your own Gemini API key gives you unlimited AI usage. You only pay Google's direct cost (~$0.001/request) with no markup.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #6b7280; font-size: 12px;">
    This is an automated notification from OmniFlow AI. Credits reset on the 1st of each month.
  </p>
</body>
</html>
  `.trim();
}

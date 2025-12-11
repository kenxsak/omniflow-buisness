'use server';

import { getBrevoCampaignStatistics } from '@/services/brevo';
import { getSenderCampaignStatistics } from '@/lib/sender-client';
import { decryptApiKeyServerSide } from '@/lib/encryption-server';
import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc } from 'firebase/firestore';

export interface CampaignAnalytics {
  success: boolean;
  error?: string;
  provider?: 'brevo' | 'sender' | 'smtp';
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    bounced: number;
    openRate: number;
    clickRate: number;
    uniqueOpens: number;
    uniqueClicks: number;
  };
}

/**
 * Fetch campaign analytics from the provider (Brevo or Sender.net)
 * SMTP campaigns don't have analytics support
 */
export async function fetchCampaignAnalytics(
  companyId: string,
  provider: 'brevo' | 'sender' | 'smtp',
  campaignId?: string | number
): Promise<CampaignAnalytics> {
  if (!companyId || !campaignId) {
    return {
      success: false,
      error: 'Company ID and Campaign ID are required',
    };
  }

  if (provider === 'smtp') {
    return {
      success: false,
      error: 'SMTP campaigns do not have analytics support from provider',
      provider: 'smtp',
    };
  }

  try {
    // Get company to access API keys
    if (!serverDb) {
      return {
        success: false,
        error: 'Database not available',
      };
    }

    const companyDoc = await getDoc(doc(serverDb, 'companies', companyId));
    if (!companyDoc.exists()) {
      return {
        success: false,
        error: 'Company not found',
      };
    }

    const company = companyDoc.data();

    if (provider === 'brevo') {
      // Get Brevo API key
      const encryptedApiKey = company.apiKeys?.brevo?.apiKey;
      if (!encryptedApiKey) {
        return {
          success: false,
          error: 'Brevo API key not configured',
          provider: 'brevo',
        };
      }

      const apiKey = decryptApiKeyServerSide(encryptedApiKey);
      const campaignIdNumber = typeof campaignId === 'string' ? parseInt(campaignId, 10) : campaignId;

      if (isNaN(campaignIdNumber)) {
        return {
          success: false,
          error: 'Invalid Brevo campaign ID',
          provider: 'brevo',
        };
      }

      const result = await getBrevoCampaignStatistics(apiKey, campaignIdNumber);

      if (!result.success || !result.stats) {
        return {
          success: false,
          error: result.error || 'Failed to fetch Brevo analytics',
          provider: 'brevo',
        };
      }

      return {
        success: true,
        provider: 'brevo',
        stats: {
          sent: result.stats.sent,
          delivered: result.stats.delivered,
          opened: result.stats.opened,
          clicked: result.stats.clicked,
          unsubscribed: result.stats.unsubscribed,
          bounced: result.stats.hardBounces + result.stats.softBounces,
          openRate: result.stats.openRate,
          clickRate: result.stats.clickRate,
          uniqueOpens: result.stats.uniqueOpens,
          uniqueClicks: result.stats.uniqueClicks,
        },
      };
    } else if (provider === 'sender') {
      // Get Sender.net API key
      const encryptedApiKey = company.apiKeys?.sender?.apiKey;
      if (!encryptedApiKey) {
        return {
          success: false,
          error: 'Sender.net API key not configured',
          provider: 'sender',
        };
      }

      const apiKey = decryptApiKeyServerSide(encryptedApiKey);
      const campaignIdNumber = typeof campaignId === 'string' ? parseInt(campaignId, 10) : campaignId;

      if (isNaN(campaignIdNumber)) {
        return {
          success: false,
          error: 'Invalid Sender.net campaign ID',
          provider: 'sender',
        };
      }

      const result = await getSenderCampaignStatistics(apiKey, campaignIdNumber);

      if (!result.success || !result.stats) {
        return {
          success: false,
          error: result.error || 'Failed to fetch Sender.net analytics',
          provider: 'sender',
        };
      }

      return {
        success: true,
        provider: 'sender',
        stats: {
          sent: result.stats.sent,
          delivered: result.stats.delivered,
          opened: result.stats.opened,
          clicked: result.stats.clicked,
          unsubscribed: result.stats.unsubscribed,
          bounced: result.stats.bounced,
          openRate: result.stats.openRate,
          clickRate: result.stats.clickRate,
          uniqueOpens: result.stats.uniqueOpens,
          uniqueClicks: result.stats.uniqueClicks,
        },
      };
    }

    return {
      success: false,
      error: `Unknown provider: ${provider}`,
    };
  } catch (error: any) {
    console.error('Error fetching campaign analytics:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch campaign analytics',
    };
  }
}

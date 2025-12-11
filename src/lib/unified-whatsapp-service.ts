/**
 * Unified WhatsApp Service
 * 
 * Provides a single interface for sending WhatsApp messages with automatic
 * failover between multiple providers
 * 
 * Tested & Verified Providers:
 * 1. Authkey (₹0.15/msg, no monthly fee)
 * 2. AiSensy (₹0.02/msg, ₹2400/month)
 * 3. Gupshup (batch processing ready)
 * 
 * Untested Providers (kept for future evaluation):
 * - Meta Cloud API
 * - Fast2SMS WhatsApp
 * - MSG91 WhatsApp
 */

import {
  sendBulkMetaWhatsApp,
  validateMetaConnection,
  getMetaWhatsAppTemplates,
  type MetaWhatsAppConfig,
  type SendMetaWhatsAppBulkInput
} from './meta-whatsapp-client';

import {
  sendBulkAuthkeyWhatsApp,
  validateAuthkeyConnection,
  type AuthkeyConfig,
  type SendAuthkeyWhatsAppBulkInput
} from './authkey-client';

import {
  sendBulkWhatsAppAiSensy,
  type AiSensyConfig,
  type SendBulkWhatsAppAiSensyInput
} from './aisensy-client';

import {
  sendBulkGupshupWhatsApp,
  type GupshupConfig,
  type SendBulkGupshupWhatsAppInput
} from './gupshup-client';

export type WhatsAppProvider = 'meta' | 'authkey' | 'aisensy' | 'gupshup';

export interface UnifiedWhatsAppConfig {
  // Tested & verified providers
  authkey?: AuthkeyConfig;
  aisensy?: AiSensyConfig;
  gupshup?: GupshupConfig;
  
  // Untested providers (kept for future evaluation)
  meta?: MetaWhatsAppConfig;

  // Provider priority order (defaults to authkey -> aisensy -> gupshup -> meta)
  providerPriority?: WhatsAppProvider[];
}

export interface UnifiedWhatsAppRecipient {
  phone: string;
  name?: string;
  parameters?: string[]; // Template variable values
}

export interface UnifiedSendWhatsAppInput {
  templateName: string;
  recipients: UnifiedWhatsAppRecipient[];
  languageCode?: string; // Required for Meta, optional for others
}

export interface UnifiedSendWhatsAppResult {
  success: boolean;
  provider: WhatsAppProvider;
  totalSent: number;
  totalFailed: number;
  results: {
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
  error?: string;
  failoverAttempts?: {
    provider: WhatsAppProvider;
    error: string;
  }[];
}

/**
 * Get available and configured providers
 */
export function getAvailableProviders(config: UnifiedWhatsAppConfig): WhatsAppProvider[] {
  const providers: WhatsAppProvider[] = [];
  
  if (config.authkey?.apiKey) {
    providers.push('authkey');
  }
  if (config.aisensy?.apiKey) {
    providers.push('aisensy');
  }
  if (config.gupshup?.apiKey) {
    providers.push('gupshup');
  }
  if (config.meta?.phoneNumberId && config.meta?.accessToken) {
    providers.push('meta');
  }
  
  return providers;
}

/**
 * Get provider priority order
 */
function getProviderOrder(config: UnifiedWhatsAppConfig): WhatsAppProvider[] {
  if (config.providerPriority && config.providerPriority.length > 0) {
    return config.providerPriority;
  }
  
  // Default priority: tested first, then untested
  return ['authkey', 'aisensy', 'gupshup', 'meta'];
}

/**
 * Send bulk WhatsApp messages with automatic failover
 */
export async function sendUnifiedWhatsAppBulk(
  config: UnifiedWhatsAppConfig,
  input: UnifiedSendWhatsAppInput
): Promise<UnifiedSendWhatsAppResult> {
  const availableProviders = getAvailableProviders(config);
  const providerOrder = getProviderOrder(config);
  
  // Filter to only configured providers in priority order
  const configuredProviders = providerOrder.filter(p => availableProviders.includes(p));
  
  if (configuredProviders.length === 0) {
    return {
      success: false,
      provider: 'meta', // Default
      totalSent: 0,
      totalFailed: input.recipients.length,
      results: input.recipients.map(r => ({
        phone: r.phone,
        success: false,
        error: 'No WhatsApp provider configured'
      })),
      error: 'No WhatsApp provider configured. Please add Meta Cloud API or WMart CPaaS credentials.'
    };
  }

  console.log(`[UnifiedWhatsApp] Available providers: ${configuredProviders.join(', ')}`);
  console.log(`[UnifiedWhatsApp] Attempting to send ${input.recipients.length} messages`);

  const failoverAttempts: { provider: WhatsAppProvider; error: string }[] = [];

  // Try each provider in order
  for (const provider of configuredProviders) {
    try {
      console.log(`[UnifiedWhatsApp] Trying provider: ${provider}`);

      let result: UnifiedSendWhatsAppResult | null = null;

      switch (provider) {
        case 'meta':
          if (config.meta) {
            const metaResult = await sendBulkMetaWhatsApp(config.meta, {
              templateName: input.templateName,
              languageCode: input.languageCode || 'en',
              recipients: input.recipients.map(r => ({
                phone: r.phone,
                parameters: r.parameters
              }))
            });

            result = {
              success: metaResult.success,
              provider: 'meta',
              totalSent: metaResult.totalSent,
              totalFailed: metaResult.totalFailed,
              results: metaResult.results
            };
          }
          break;

        case 'authkey':
          if (config.authkey) {
            const authkeyResult = await sendBulkAuthkeyWhatsApp(config.authkey, {
              templateName: input.templateName,
              recipients: input.recipients.map(r => ({
                phone: r.phone,
                parameters: r.parameters
              }))
            });

            result = {
              success: authkeyResult.success,
              provider: 'authkey',
              totalSent: authkeyResult.totalSent,
              totalFailed: authkeyResult.totalFailed,
              results: authkeyResult.results
            };
          }
          break;

        case 'aisensy':
          if (config.aisensy) {
            const aisensyResult = await sendBulkWhatsAppAiSensy(config.aisensy, {
              campaignName: input.templateName,
              recipients: input.recipients.map(r => ({
                whatsappNumber: r.phone,
                userName: r.name || 'Customer',
                templateParams: r.parameters
              }))
            });

            result = {
              success: aisensyResult.success,
              provider: 'aisensy',
              totalSent: aisensyResult.result?.failed ? 
                input.recipients.length - aisensyResult.result.failed.length : 
                input.recipients.length,
              totalFailed: aisensyResult.result?.failed?.length || 0,
              results: input.recipients.map(r => ({
                phone: r.phone,
                success: !aisensyResult.result?.failed?.find(f => f.whatsappNumber === r.phone),
                error: aisensyResult.result?.failed?.find(f => f.whatsappNumber === r.phone)?.error
              })),
              error: aisensyResult.error
            };
          }
          break;

        case 'gupshup':
          if (config.gupshup) {
            const gupshupResult = await sendBulkGupshupWhatsApp(config.gupshup, {
              templateName: input.templateName,
              recipients: input.recipients.map(r => ({
                phone: r.phone,
                parameters: r.parameters
              }))
            });

            result = {
              success: gupshupResult.success,
              provider: 'gupshup',
              totalSent: gupshupResult.totalSent,
              totalFailed: gupshupResult.totalFailed,
              results: gupshupResult.results
            };
          }
          break;
      }

      // If we got a successful result, return it
      if (result && result.success && result.totalSent > 0) {
        console.log(`[UnifiedWhatsApp] ✅ Success with ${provider}: ${result.totalSent} sent`);
        
        return {
          ...result,
          failoverAttempts: failoverAttempts.length > 0 ? failoverAttempts : undefined
        };
      }

      // Record failure and try next provider
      const errorMsg = result?.error || 'Unknown error';
      failoverAttempts.push({ provider, error: errorMsg });
      console.log(`[UnifiedWhatsApp] ❌ Failed with ${provider}: ${errorMsg}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      failoverAttempts.push({ provider, error: errorMsg });
      console.error(`[UnifiedWhatsApp] ❌ Error with ${provider}:`, error);
    }
  }

  // All providers failed
  console.error(`[UnifiedWhatsApp] ❌ All providers failed`);

  return {
    success: false,
    provider: configuredProviders[0], // First attempted provider
    totalSent: 0,
    totalFailed: input.recipients.length,
    results: input.recipients.map(r => ({
      phone: r.phone,
      success: false,
      error: 'All providers failed'
    })),
    error: `Failed to send messages. Tried ${configuredProviders.length} provider(s): ${failoverAttempts.map(f => `${f.provider} (${f.error})`).join(', ')}`,
    failoverAttempts
  };
}

/**
 * Validate all configured WhatsApp providers
 */
export async function validateAllProviders(config: UnifiedWhatsAppConfig): Promise<{
  meta?: { success: boolean; error?: string; details?: any };
  authkey?: { success: boolean; error?: string; balance?: number };
  wati?: { success: boolean; error?: string };
  aisensy?: { success: boolean; error?: string };
}> {
  const results: any = {};

  if (config.meta) {
    results.meta = await validateMetaConnection(config.meta);
  }

  if (config.authkey) {
    results.authkey = await validateAuthkeyConnection(config.authkey);
  }

  if (config.wati) {
    results.wati = await validateWATIConnection(config.wati);
  }

  // Note: aisensy-client doesn't have a validate function yet
  // Could add it if needed

  return results;
}

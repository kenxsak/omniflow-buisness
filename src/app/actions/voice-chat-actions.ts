"use server";

import { adminDb } from '@/lib/firebase-admin';
import { CompanyVoiceChatConfig } from '@/lib/voice-chat-types';
import * as admin from 'firebase-admin';

export async function saveVoiceChatConfig(
  companyId: string,
  widgetScript: string
): Promise<{ success: boolean; message?: string; config?: CompanyVoiceChatConfig }> {
  try {
    if (!adminDb) {
      return { success: false, message: 'Database not initialized' };
    }

    const chatbotId = extractChatbotId(widgetScript);
    
    const companyRef = adminDb.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();
    
    if (!companyDoc.exists) {
      return { success: false, message: 'Company not found' };
    }

    const existingIntegrations = companyDoc.data()?.integrations || {};
    const existingVoiceChat = existingIntegrations.voiceChat;

    const webhookToken = existingVoiceChat?.webhookToken || generateWebhookToken(companyId);

    const config: CompanyVoiceChatConfig = {
      enabled: true,
      widgetScript: widgetScript.trim(),
      ...(chatbotId && { chatbotId }),
      webhookToken,
      createdAt: existingVoiceChat?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await companyRef.update({
      'integrations.voiceChat': config,
    });

    // Read back the document to get actual timestamp values (not FieldValue objects)
    const updatedDoc = await companyRef.get();
    const savedConfig = updatedDoc.data()?.integrations?.voiceChat;

    return {
      success: true,
      message: 'Voice Chat AI configuration saved successfully',
      config: savedConfig ? {
        ...savedConfig,
        createdAt: savedConfig.createdAt?.toDate?.()?.toISOString() || savedConfig.createdAt,
        updatedAt: savedConfig.updatedAt?.toDate?.()?.toISOString() || savedConfig.updatedAt,
      } : undefined,
    };
  } catch (error) {
    console.error('Error saving Voice Chat config:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save configuration',
    };
  }
}

export async function getVoiceChatConfig(
  companyId: string
): Promise<{ success: boolean; config?: CompanyVoiceChatConfig; message?: string }> {
  try {
    if (!adminDb) {
      return { success: false, message: 'Database not initialized' };
    }

    const companyRef = adminDb.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return { success: false, message: 'Company not found' };
    }

    const integrations = companyDoc.data()?.integrations;
    const voiceChatConfig = integrations?.voiceChat;

    if (!voiceChatConfig) {
      return { success: true, config: undefined };
    }

    // Convert Firestore timestamps to ISO strings for client compatibility
    return {
      success: true,
      config: {
        ...voiceChatConfig,
        createdAt: voiceChatConfig.createdAt?.toDate?.()?.toISOString() || voiceChatConfig.createdAt,
        updatedAt: voiceChatConfig.updatedAt?.toDate?.()?.toISOString() || voiceChatConfig.updatedAt,
      } as CompanyVoiceChatConfig,
    };
  } catch (error) {
    console.error('Error fetching Voice Chat config:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch configuration',
    };
  }
}

export async function disableVoiceChatConfig(
  companyId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!adminDb) {
      return { success: false, message: 'Database not initialized' };
    }

    const companyRef = adminDb.collection('companies').doc(companyId);
    await companyRef.update({
      'integrations.voiceChat.enabled': false,
      'integrations.voiceChat.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: 'Voice Chat AI integration disabled',
    };
  } catch (error) {
    console.error('Error disabling Voice Chat config:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to disable configuration',
    };
  }
}

export async function generateWidgetEmbedCode(
  idToken: string,
  cardId: string
): Promise<{ success: boolean; embedCode?: string; message?: string }> {
  try {
    if (!adminDb) {
      return { success: false, message: 'Database not initialized' };
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const cardRef = adminDb.collection('digitalCards').doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return { success: false, message: 'Digital card not found' };
    }

    const cardData = cardDoc.data();
    if (!cardData) {
      return { success: false, message: 'Card data not found' };
    }

    if (cardData.userId !== userId) {
      return { success: false, message: 'Unauthorized: You do not own this card' };
    }

    const companyId = cardData.companyId;

    const companyRef = adminDb.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return { success: false, message: 'Company not found' };
    }

    const companyData = companyDoc.data();
    
    // Card ownership is already verified above (line 156), so we just need the company's voice chat config

    const voiceChatConfig = companyData?.integrations?.voiceChat;

    if (!voiceChatConfig || !voiceChatConfig.enabled) {
      return { 
        success: false, 
        message: 'Voice Chat AI is not configured. Please configure it in Settings → API Integrations first.' 
      };
    }

    const businessName = cardData.businessInfo?.name || 'Business';
    const customGreeting = cardData.voiceChatbot?.customGreeting || `Hi! I'm ${businessName}'s AI assistant. How can I help you today?`;
    const position = cardData.voiceChatbot?.position || 'right';
    const primaryColor = cardData.branding?.primaryColor || '#3B82F6';
    const fontFamily = cardData.branding?.fontFamily || 'Inter';

    const config = {
      cardId: cardId,
      businessName: businessName,
      greeting: customGreeting,
      position: `bottom-${position}`,
      theme: {
        primaryColor: primaryColor,
        fontFamily: fontFamily,
      },
      metadata: {
        cardId: cardId,
        businessName: businessName,
        companyId: companyId,
      }
    };

    const embedCode = `<!-- OmniFlow Digital Card with Voice Chat AI Widget -->
<script>
  window.OmniFlowVoiceChat = ${JSON.stringify(config, null, 2)};
</script>
${voiceChatConfig.widgetScript}`;

    return {
      success: true,
      embedCode: embedCode.trim(),
    };
  } catch (error) {
    console.error('Error generating widget embed code:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate embed code',
    };
  }
}

function generateWebhookToken(companyId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `vc_${companyId}_${timestamp}_${random}`;
}

function extractChatbotId(widgetScript: string): string | undefined {
  // Try to extract agentId (used by voicechatai.wmart.in)
  const agentIdMatch = widgetScript.match(/agentId["\s:=]+["']?([a-zA-Z0-9_-]+)["']?/i);
  if (agentIdMatch && agentIdMatch[1]) {
    return agentIdMatch[1];
  }

  // Try to extract tenantId (used by voicechatai.wmart.in)
  const tenantIdMatch = widgetScript.match(/tenantId["\s:=]+["']?([a-zA-Z0-9_-]+)["']?/i);
  if (tenantIdMatch && tenantIdMatch[1]) {
    return tenantIdMatch[1];
  }

  // Try standard chatbotId
  const chatbotIdMatch = widgetScript.match(/chatbotId["\s:=]+["']?([a-zA-Z0-9_-]+)["']?/i);
  if (chatbotIdMatch && chatbotIdMatch[1]) {
    return chatbotIdMatch[1];
  }

  // Try data-chatbot-id attribute
  const dataIdMatch = widgetScript.match(/data-chatbot-id["\s:=]+["']?([a-zA-Z0-9_-]+)["']?/i);
  if (dataIdMatch && dataIdMatch[1]) {
    return dataIdMatch[1];
  }

  // Try generic id (last resort)
  const idMatch = widgetScript.match(/id["\s:=]+["']?([a-zA-Z0-9_-]+)["']?/);
  if (idMatch && idMatch[1] && idMatch[1].length > 5) {
    return idMatch[1];
  }

  return undefined;
}

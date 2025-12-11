'use server';

import { COST_RATES } from './cost-types';

export async function calculateFirebaseCost(
  reads: number,
  writes: number,
  deletes: number = 0
): Promise<number> {
  return (
    reads * COST_RATES.firebase.read +
    writes * COST_RATES.firebase.write +
    deletes * COST_RATES.firebase.delete
  );
}

export async function calculateAICost(
  inputTokens: number,
  outputTokens: number,
  imageCount: number = 0,
  ttsCharacters: number = 0
): Promise<number> {
  return (
    inputTokens * COST_RATES.ai.gemini_flash_input +
    outputTokens * COST_RATES.ai.gemini_flash_output +
    imageCount * COST_RATES.ai.imagen_image +
    ttsCharacters * COST_RATES.ai.tts_per_char
  );
}

export async function calculateEmailCost(
  emailCount: number,
  provider: 'brevo' | 'sender' | 'smtp' = 'brevo'
): Promise<number> {
  const rate = provider === 'brevo' 
    ? COST_RATES.email.brevo_bulk 
    : provider === 'sender' 
      ? COST_RATES.email.sender_bulk 
      : COST_RATES.email.smtp_custom;
  return emailCount * rate;
}

export async function calculateSMSCost(
  smsCount: number,
  provider: 'msg91' | 'fast2sms' | 'twilio' = 'msg91'
): Promise<number> {
  const rate = provider === 'msg91' 
    ? COST_RATES.sms.msg91_india 
    : provider === 'fast2sms' 
      ? COST_RATES.sms.fast2sms_india 
      : COST_RATES.sms.twilio_global;
  return smsCount * rate;
}

export async function calculateWhatsAppCost(
  messageCount: number,
  provider: 'aisensy' | 'wati' | 'gupshup' | 'meta' = 'gupshup'
): Promise<number> {
  const rate = provider === 'aisensy' 
    ? COST_RATES.whatsapp.aisensy 
    : provider === 'wati' 
      ? COST_RATES.whatsapp.wati 
      : provider === 'gupshup' 
        ? COST_RATES.whatsapp.gupshup 
        : COST_RATES.whatsapp.meta_direct;
  return messageCount * rate;
}

export async function estimateCampaignCost(
  channel: 'email' | 'sms' | 'whatsapp',
  recipientCount: number,
  provider?: string
): Promise<{ estimatedCost: number; perRecipientCost: number }> {
  let cost = 0;
  
  switch (channel) {
    case 'email':
      cost = await calculateEmailCost(recipientCount, (provider as any) || 'brevo');
      break;
    case 'sms':
      cost = await calculateSMSCost(recipientCount, (provider as any) || 'msg91');
      break;
    case 'whatsapp':
      cost = await calculateWhatsAppCost(recipientCount, (provider as any) || 'gupshup');
      break;
  }
  
  return {
    estimatedCost: cost,
    perRecipientCost: cost / recipientCount,
  };
}

export async function formatCost(cost: number): Promise<string> {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

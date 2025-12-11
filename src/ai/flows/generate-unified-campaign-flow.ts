'use server';
/**
 * @fileOverview A Genkit flow that orchestrates all campaign generators (email, SMS, WhatsApp).
 *
 * - generateUnifiedCampaign - Generates complete campaign content for all 3 channels.
 * - GenerateUnifiedCampaignInput - The input type.
 * - GenerateUnifiedCampaignOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateEmailContent, type GenerateEmailContentInput } from './generate-email-content-flow';
import { generateSubjectAndCtas, type GenerateSubjectAndCtaInput } from './generate-subject-and-cta-flow';
import { generateSmsContent, type GenerateSmsContentInput } from './generate-sms-content-flow';
import { generateWhatsappMessage, type GenerateWhatsappMessageInput } from './generate-whatsapp-message-flow';

const GenerateUnifiedCampaignInputSchema = z.object({
  campaignGoal: z.string().describe('The primary objective of the campaign'),
  targetAudience: z.string().describe('Description of the intended recipients'),
  keyPoints: z.string().describe('Comma-separated list of key messages or information'),
  tone: z.enum(['Formal', 'Informal', 'Friendly', 'Professional', 'Enthusiastic', 'Urgent']).describe('The desired tone of voice'),
  callToAction: z.string().describe('The desired call to action text'),
  callToActionLink: z.string().optional().describe('The URL the call to action should link to'),
  businessContext: z.string().optional().describe('Business name or context'),
});
export type GenerateUnifiedCampaignInput = z.infer<typeof GenerateUnifiedCampaignInputSchema>;

const GenerateUnifiedCampaignOutputSchema = z.object({
  email: z.object({
    subjectLines: z.array(z.string()).describe('3 email subject line suggestions'),
    htmlContent: z.string().describe('HTML email body content'),
    ctaSuggestions: z.array(z.string()).describe('3 call-to-action suggestions'),
  }),
  sms: z.object({
    message: z.string().describe('SMS message content (max 160 chars)'),
  }),
  whatsapp: z.object({
    message: z.string().describe('WhatsApp message content with *bold* formatting'),
  }),
});
export type GenerateUnifiedCampaignOutput = z.infer<typeof GenerateUnifiedCampaignOutputSchema>;

export async function generateUnifiedCampaign(input: GenerateUnifiedCampaignInput): Promise<GenerateUnifiedCampaignOutput> {
  return generateUnifiedCampaignFlow(input);
}

const generateUnifiedCampaignFlow = ai.defineFlow(
  {
    name: 'generateUnifiedCampaignFlow',
    inputSchema: GenerateUnifiedCampaignInputSchema,
    outputSchema: GenerateUnifiedCampaignOutputSchema,
  },
  async (input: GenerateUnifiedCampaignInput): Promise<GenerateUnifiedCampaignOutput> => {
    try {
      // Prepare inputs for each generator
      const emailContentInput: GenerateEmailContentInput = {
        campaignGoal: input.campaignGoal,
        targetAudience: input.targetAudience,
        keyPoints: input.keyPoints,
        tone: input.tone,
        callToAction: input.callToAction,
        callToActionLink: input.callToActionLink,
      };

      const subjectCtaInput: GenerateSubjectAndCtaInput = {
        campaignTopicOrGoal: input.campaignGoal,
        targetAudience: input.targetAudience,
        desiredToneForSubject: mapToneForSubject(input.tone),
        desiredToneForCta: mapToneForCta(input.tone),
        numSuggestions: 3,
      };

      const smsInput: GenerateSmsContentInput = {
        messageContext: input.campaignGoal,
        desiredOutcome: input.callToAction,
        businessName: input.businessContext,
      };

      const whatsappInput: GenerateWhatsappMessageInput = {
        leadName: '{{1}}', // Placeholder for personalization
        leadContext: input.campaignGoal,
        desiredOutcome: input.callToAction,
        senderBusinessName: input.businessContext,
      };

      // Call all generators in parallel for efficiency
      const [subjectCtaResult, emailContentResult, smsResult, whatsappResult] = await Promise.all([
        generateSubjectAndCtas(subjectCtaInput).catch(err => {
          console.error('Error generating subject/CTA:', err);
          return {
            subjectLineSuggestions: [input.campaignGoal],
            ctaSuggestions: [input.callToAction],
          };
        }),
        generateEmailContent(emailContentInput).catch(err => {
          console.error('Error generating email content:', err);
          return {
            htmlContent: `<p>Hi {{ contact.FIRSTNAME }},</p><p>${input.keyPoints}</p><p>${input.callToAction}</p>`,
          };
        }),
        generateSmsContent(smsInput).catch(err => {
          console.error('Error generating SMS:', err);
          return {
            suggestedSmsBody: `${input.callToAction}`.substring(0, 160),
          };
        }),
        generateWhatsappMessage(whatsappInput).catch(err => {
          console.error('Error generating WhatsApp message:', err);
          return {
            suggestedMessage: `Hi *{{1}}*,\n\n${input.campaignGoal}\n\n${input.callToAction}`,
          };
        }),
      ]);

      // Ensure SMS is within 160 character limit
      const smsMessage = smsResult.suggestedSmsBody.length > 160 
        ? smsResult.suggestedSmsBody.substring(0, 157) + '...'
        : smsResult.suggestedSmsBody;

      return {
        email: {
          subjectLines: subjectCtaResult.subjectLineSuggestions,
          htmlContent: emailContentResult.htmlContent,
          ctaSuggestions: subjectCtaResult.ctaSuggestions,
        },
        sms: {
          message: smsMessage,
        },
        whatsapp: {
          message: whatsappResult.suggestedMessage,
        },
      };
    } catch (error: any) {
      console.error('Error in generateUnifiedCampaignFlow:', error);
      // Return fallback content if all else fails
      return {
        email: {
          subjectLines: [input.campaignGoal],
          htmlContent: `<p>Hi {{ contact.FIRSTNAME }},</p><p>${input.keyPoints}</p><p><a href="${input.callToActionLink || '#'}">${input.callToAction}</a></p>`,
          ctaSuggestions: [input.callToAction, 'Learn More', 'Get Started'],
        },
        sms: {
          message: `${input.campaignGoal.substring(0, 100)}. ${input.callToAction}`.substring(0, 160),
        },
        whatsapp: {
          message: `Hi *{{1}}*,\n\n${input.campaignGoal}\n\n*${input.callToAction}*${input.businessContext ? `\n\nBest regards,\n*${input.businessContext}*` : ''}`,
        },
      };
    }
  }
);

// Helper functions to map tones to subject/CTA specific tones
function mapToneForSubject(tone: GenerateUnifiedCampaignInput['tone']): GenerateSubjectAndCtaInput['desiredToneForSubject'] {
  const toneMap: Record<GenerateUnifiedCampaignInput['tone'], NonNullable<GenerateSubjectAndCtaInput['desiredToneForSubject']>> = {
    'Formal': 'Professional',
    'Informal': 'Friendly',
    'Friendly': 'Friendly',
    'Professional': 'Professional',
    'Enthusiastic': 'Playful',
    'Urgent': 'Urgent',
  };
  return toneMap[tone] || 'Benefit-driven';
}

function mapToneForCta(tone: GenerateUnifiedCampaignInput['tone']): GenerateSubjectAndCtaInput['desiredToneForCta'] {
  const toneMap: Record<GenerateUnifiedCampaignInput['tone'], NonNullable<GenerateSubjectAndCtaInput['desiredToneForCta']>> = {
    'Formal': 'Clear & Direct',
    'Informal': 'Playful',
    'Friendly': 'Reassuring',
    'Professional': 'Benefit-driven',
    'Enthusiastic': 'Urgent',
    'Urgent': 'Urgent',
  };
  return toneMap[tone] || 'Clear & Direct';
}

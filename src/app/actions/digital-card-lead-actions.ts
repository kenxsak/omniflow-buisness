'use server';

import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { z } from 'zod';

// Validation schema for contact form on Digital Card
const DigitalCardLeadSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }).optional(),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .regex(/^\+?[1-9]\d{9,14}$/, { message: "Invalid phone number format. Please include country code." })
    .optional(),
  message: z.string().optional().refine(
    (message) => {
      if (!message) return true;
      // Basic spam check: block if more than one http link is present
      const linkCount = (message.match(/http:\/\//g) || []).length + (message.match(/https:\/\//g) || []).length;
      return linkCount <= 1;
    },
    { message: "Message contains too many links and is considered spam." }
  ),
  honeypot: z.string().nullable().optional(), // Honeypot field for spam protection
});

export type DigitalCardLeadInput = z.infer<typeof DigitalCardLeadSchema>;

export interface DigitalCardLeadResponse {
  success: boolean;
  message: string;
  leadId?: string;
  errors?: { field: string, message: string }[];
}

/**
 * Submit a lead from Digital Card contact form
 * This is a public action that doesn't require authentication
 */
export async function submitDigitalCardLead(
  cardId: string,
  formData: DigitalCardLeadInput
): Promise<DigitalCardLeadResponse> {
  try {
    // Honeypot check - if filled, it's likely a bot
    if (formData.honeypot && formData.honeypot.trim() !== "") {
      console.warn("[Digital Card Lead] Honeypot field filled, potential spam detected");
      // Silently "succeed" from the bot's perspective, but don't process
      return { 
        success: true, 
        message: "Thank you! We'll get back to you soon." 
      };
    }

    // Validate input
    const validationResult = DigitalCardLeadSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return { 
        success: false, 
        message: "Please check your information and try again.", 
        errors: fieldErrors 
      };
    }

    // Validate at least one contact method
    if (!formData.email && !formData.phone) {
      return {
        success: false,
        message: "Please provide at least an email or phone number.",
        errors: [{ field: 'contact', message: 'Email or phone required' }]
      };
    }

    const { name, email, phone, message } = validationResult.data;

    if (!adminDb) {
      console.error('❌ Database not initialized');
      return {
        success: false,
        message: "Service temporarily unavailable. Please try again later."
      };
    }

    // Get the Digital Card to find the business owner
    const cardDoc = await adminDb.collection('digitalCards').doc(cardId).get();
    
    if (!cardDoc.exists) {
      console.error('❌ Digital Card not found:', cardId);
      return {
        success: false,
        message: "Digital Card not found. Please contact the business owner directly."
      };
    }

    const digitalCard = cardDoc.data();
    const businessUserId = digitalCard?.userId;
    const companyId = digitalCard?.companyId;
    const cardUsername = digitalCard?.username;

    if (!businessUserId || !companyId) {
      console.error('❌ Digital Card missing userId or companyId');
      return {
        success: false,
        message: "Configuration error. Please contact the business owner."
      };
    }

    // Create lead data
    const leadData = {
      name,
      email: email || `no-email-${Date.now()}@contact-form.omniflow.app`,
      phone: phone || undefined,
      status: 'New' as const,
      source: 'Digital Card - Contact Form',
      sourceMetadata: {
        digitalCardId: cardId,
        digitalCardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://omniflow.app'}/card/${cardUsername}`,
        digitalCardName: digitalCard?.businessInfo?.name || 'Unknown Business',
      },
      notes: message 
        ? `Lead submitted via Digital Card contact form.\n\nMessage:\n${message}`
        : 'Lead submitted via Digital Card contact form.',
      assignedTo: businessUserId,
      companyId: companyId,
      brevoSyncStatus: 'unsynced' as const,
      hubspotSyncStatus: 'unsynced' as const,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastContacted: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save lead to Firestore
    const leadsRef = adminDb.collection('leads');
    const leadDocRef = await leadsRef.add(leadData);
    const leadId = leadDocRef.id;

    console.log('✅ Lead created from Digital Card contact form:', leadId);

    // Update Digital Card analytics
    await adminDb.collection('digitalCards').doc(cardId).update({
      'analytics.leadsGenerated': admin.firestore.FieldValue.increment(1),
      'analytics.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Digital Card analytics updated');

    return {
      success: true,
      leadId: leadId,
      message: "Thank you! We've received your message and will get back to you soon."
    };

  } catch (error) {
    console.error('❌ Error submitting Digital Card lead:', error);
    return {
      success: false,
      message: "An error occurred. Please try again or contact the business directly."
    };
  }
}

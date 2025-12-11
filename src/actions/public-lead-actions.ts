
'use server';

import type { Lead } from '@/lib/mock-data';
// The action no longer needs to know about the storage implementation
import { z } from 'zod';
import { addStoredLead } from '@/lib/mock-data';
import { getStoredCompanies } from '@/lib/saas-data'; // To find a company to assign to

// Zod schema for validating the public form data
const PublicLeadSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .regex(/^\+?[1-9]\d{9,14}$/, { message: "Invalid phone number format. Please include country code." }),
  message: z.string().optional().refine(
    (message) => {
        if (!message) return true;
        // Basic spam check: block if more than one http link is present
        const linkCount = (message.match(/http:\/\//g) || []).length + (message.match(/https:\/\//g) || []).length;
        return linkCount <= 1;
    },
    { message: "Message contains too many links and is considered spam." }
  ),
  source: z.string().optional(), // Can be a hidden field or default value
  website_url: z.string().nullable().optional(), // Honeypot field
});

export type SubmitPublicLeadInput = z.infer<typeof PublicLeadSchema>;

export interface SubmitPublicLeadResponse {
  success: boolean;
  message: string;
  // This is no longer needed, as the action will save to Firestore directly.
  // leadData?: Omit<Lead, 'id'>; 
  errors?: { field: string, message: string }[];
}

export async function submitPublicLeadAction(
  formData: SubmitPublicLeadInput
): Promise<SubmitPublicLeadResponse> {
  // Honeypot check
  if (formData.website_url && formData.website_url.trim() !== "") {
    console.warn("[Action] Honeypot field filled, potential spam detected. Data:", formData);
    // Silently "succeed" from the bot's perspective, but don't process.
    return { success: true, message: "Thank you! Your inquiry has been submitted successfully." };
  }

  const validationResult = PublicLeadSchema.safeParse(formData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return { success: false, message: "Validation failed. Please check your input.", errors: fieldErrors };
  }

  const { name, email, phone, message } = validationResult.data;

  try {
    // In a real multi-tenant app, you'd have a way to identify which company
    // this public form belongs to (e.g., a hidden field, a unique URL).
    // For this demo, we'll assign it to the first company found.
    const allCompanies = await getStoredCompanies();
    if (allCompanies.length === 0) {
      throw new Error("No companies found in the system to assign the lead to.");
    }
    const companyId = allCompanies[0].id; // Assign to the first company
    const assignedTo = allCompanies[0].ownerId; // Assign to the company owner

    const newLeadForStorage: Omit<Lead, 'id' | 'createdAt' | 'lastContacted' | 'companyId'> = {
      name,
      email,
      phone: phone || undefined,
      status: 'New',
      source: formData.source || 'OmniFlow Public Form',
      assignedTo: assignedTo, 
      attributes: {
        ROLE: message ? `Inquiry: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}` : undefined,
      },
      notes: message ? `Lead captured from public form with message: "${message}"` : 'Lead captured from public form.',
      brevoSyncStatus: 'unsynced',
      hubspotSyncStatus: 'unsynced',
    };
    
    // The action now directly adds the lead to Firestore
    await addStoredLead(companyId, newLeadForStorage);

    return { 
      success: true, 
      message: "Thank you! Your inquiry has been submitted successfully.", 
    };
  } catch(error: any) {
    console.error("Error saving public lead to Firestore:", error);
    return {
      success: false,
      message: "A server error occurred while processing your request. Please try again later."
    }
  }
}

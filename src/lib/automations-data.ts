
"use client";

import type { EmailAutomation, AutomationState } from '@/types/automations';
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, query, where, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';


// --- Default Data (for seeding new companies) ---
const initialAutomations: EmailAutomation[] = [
  {
    id: "new-lead-nurturing",
    name: "New Lead Nurturing Sequence",
    description: "Automatically send a series of emails to new leads to educate them, build trust, and guide them towards becoming a customer.",
    tags: ["Lead Nurturing", "Conversion"],
    status: "inactive",
    config: {
      trigger: 'newLead',
      steps: [
        { type: 'email', subject: "Thanks for your interest, {{ contact.FIRSTNAME }}!", content: "<h1>Hi {{ contact.FIRSTNAME }},</h1><p>Welcome! Thanks for your interest in [Your Company Name]. We're excited to have you.</p><p>Over the next few days, we'll share some information to help you get started. If you have any questions in the meantime, just reply to this email or call us at [Your Phone Number]!</p><p>Best,<br/>[Your Name]</p>" },
        { type: 'delay', duration: 2, unit: 'days' },
        { type: 'email', subject: "Getting the most out of [Your Product/Service]", content: "<h1>Hi {{ contact.FIRSTNAME }},</h1><p>Just wanted to share a quick tip to help you get the most value from [Your Product/Service Name].</p><p><strong>Pro-Tip:</strong> [Add a specific, valuable tip here].</p><p>Let us know if you've had a chance to try it out!</p><p>Thanks,<br/>The [Your Company Name] Team</p>" },
        { type: 'delay', duration: 3, unit: 'days' },
        { type: 'email', subject: "A special offer for you, {{ contact.FIRSTNAME }}", content: "<h1>Hi {{ contact.FIRSTNAME }},</h1><p>As a thank you for checking us out, we'd like to offer you a special discount.</p><p>Use code <strong>WELCOME15</strong> for 15% off your first purchase.</p><p><a href='[Your Website URL]'>Claim Your Offer</a></p><p>This offer is valid for the next 72 hours.</p><p>Cheers,<br/>The [Your Company Name] Team</p>" }
      ]
    }
  },
   {
    id: 'customer-onboarding',
    name: "Customer Onboarding & Upsell",
    description: "Welcome new customers and guide them through your product. After a set time, automatically send information about plan upgrades or new features.",
    tags: ["Customer Success", "Upsell", "Retention"],
    status: "inactive",
     config: {
        trigger: 'newCustomer',
        steps: [
            { type: 'email', subject: "Welcome to [Your Company Name], {{ contact.FIRSTNAME }}! Let's Get Started.", content: "<h1>Welcome Aboard, {{ contact.FIRSTNAME }}!</h1><p>We are thrilled to have you as a customer. Here are a few resources to help you get started with [Your Product Name]:</p><ul><li><a href='[Your Website URL]/docs/quick-start'>Quick Start Guide</a></li><li><a href='[Your Website URL]/tutorials'>Video Tutorials</a></li><li><a href='[Your Website URL]/help'>Help Center</a></li></ul><p>If you need anything, our support team is here to help. Call us at [Your Phone Number].</p><p>Best regards,<br/>The Customer Success Team</p>" },
            { type: 'delay', duration: 3, unit: 'days' },
            { type: 'email', subject: "Feature Highlight: Did you know you can do this?", content: "<h1>Hi {{ contact.FIRSTNAME }},</h1><p>We hope you're enjoying [Your Product Name].</p><p>We wanted to highlight a powerful feature you might find useful: <strong>[Feature Name]</strong>. It helps you [achieve a specific benefit].</p><p><a href='[Your Website URL]/docs/features'>Learn more about it here.</a></p><p>Happy exploring!<br/>The Customer Success Team</p>" },
            { type: 'delay', duration: 7, unit: 'days' },
            { type: 'email', subject: "How's it going, {{ contact.FIRSTNAME }}?", content: "<h1>Hi {{ contact.FIRSTNAME }},</h1><p>Just checking in to see how you're getting on with [Your Product Name]. Have you had a chance to [mention a key action] yet?</p><p>Your feedback is incredibly valuable to us. If you have a moment, we'd love to hear about your experience so far.</p><p>Thanks,<br/>The Customer Success Team</p>" }
        ]
    }
  },
];

const automationsCol = (companyId: string) => collection(db!, 'companies', companyId, 'automations');
const automationStatesCol = (companyId: string) => collection(db!, 'companies', companyId, 'automationStates');


export async function seedInitialAutomations(companyId: string): Promise<void> {
    if (!db || !companyId) return;
    const batch = writeBatch(db);
    const companyAutomationsCol = automationsCol(companyId);

    initialAutomations.forEach(automation => {
        const docRef = doc(companyAutomationsCol, automation.id);
        batch.set(docRef, automation);
    });

    await batch.commit();
    console.log(`Initial automations seeded for company ${companyId}`);
}


export async function getStoredAutomations(companyId: string): Promise<EmailAutomation[]> {
  if (!db || !companyId) return initialAutomations;
  try {
    const companyAutomationsCol = automationsCol(companyId);
    const snapshot = await getDocs(companyAutomationsCol);

    if (snapshot.empty) {
      await seedInitialAutomations(companyId);
      return initialAutomations;
    }
    
    return snapshot.docs.map(doc => doc.data() as EmailAutomation);
  } catch (error) {
    console.error("Error reading automations from Firestore:", error);
    return initialAutomations;
  }
}

export async function saveStoredAutomations(companyId: string, automations: EmailAutomation[]): Promise<void> {
  if (!db || !companyId) return;
  try {
    const batch = writeBatch(db);
    const companyAutomationsCol = automationsCol(companyId);
    
    automations.forEach(automation => {
        const docRef = doc(companyAutomationsCol, automation.id);
        batch.set(docRef, automation);
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error writing automations to Firestore:", error);
  }
}

export async function updateStoredAutomation(companyId: string, automation: EmailAutomation): Promise<void> {
    if (!db || !companyId) return;
    try {
        const docRef = doc(automationsCol(companyId), automation.id);
        await updateDoc(docRef, automation);
    } catch(error) {
        console.error(`Error updating automation ${automation.id}:`, error);
    }
}

/**
 * Creates an initial state for a lead entering an automation sequence.
 * @param companyId The company ID.
 * @param leadId The lead's ID.
 * @param automationId The ID of the automation to start.
 */
export async function createAutomationState(companyId: string, leadId: string, automationId: string): Promise<void> {
    if (!db) return;

    const newState: Omit<AutomationState, 'id'> = {
        leadId,
        automationId,
        status: 'active',
        nextStepIndex: 0,
        nextStepTime: Timestamp.now(), // Start immediately
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await addDoc(automationStatesCol(companyId), newState);
}

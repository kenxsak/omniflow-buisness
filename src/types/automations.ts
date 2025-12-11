
import type { Company as SaasCompany } from './saas';

// Re-exporting Company from saas types to avoid circular dependencies
// if other types here need it. For now, it's just for consistency.
export type Company = SaasCompany;

export interface EmailStep {
    type: 'email';
    subject: string;
    content: string; // HTML content
}

export interface DelayStep {
    type: 'delay';
    duration: number; // e.g., 2
    unit: 'days' | 'hours';
}

export type AutomationStep = EmailStep | DelayStep;

export interface EmailAutomation {
    id: 'new-lead-nurturing' | 'customer-onboarding' | string; // Allow custom IDs
    name: string;
    description: string;
    tags: string[];
    status: 'active' | 'inactive';
    config: {
        trigger: 'newLead' | 'newCustomer' | string; // Allow custom triggers
        steps: AutomationStep[];
    };
}

/**
 * Tracks the progress of a specific lead through an automation sequence.
 */
export interface AutomationState {
    id: string; // Firestore document ID
    leadId: string;
    automationId: string;
    status: 'active' | 'paused' | 'completed' | 'error';
    nextStepIndex: number;
    nextStepTime: any; // Firestore Timestamp, when the next step should be executed
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    error?: string; // Optional error message if the state is 'error'
}


"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import type { StoredApiKeys } from './integrations';
import type { QuotaTracking } from './quotas';

/**
 * Defines the user roles within the SaaS application.
 * - superadmin: Can manage plans and system-wide settings.
 * - admin: Can manage their company's users and billing.
 * - manager: Can oversee users within their company.
 * - user: A standard employee/member of a company.
 */
export type Role = 'superadmin' | 'admin' | 'manager' | 'user';

/**
 * Defines the type of user, e.g., for different sales roles.
 */
export type UserType = 'office' | 'field';

/**
 * Represents our enriched user object stored in our own data store
 */
export interface AppUser {
    uid: string; // From FirebaseUser
    email: string;
    role: Role;
    type: UserType; // Type of user (office/field)
    companyId: string; // ID of the company the user belongs to
    name?: string; // Optional display name
    phone?: string;
    createdAt: any; // Firestore Timestamp
    idToken?: string; // Firebase ID token for authentication (auto-refreshed every 30 minutes)
}


/**
 * Represents a company or organization subscribing to the SaaS platform.
 */
export interface Company {
    id: string;
    name:string; // e.g., "Acme Corp"
    ownerId: string; // UID of the admin user who owns this company account
    planId: string;  // ID of the subscription plan, e.g., 'plan_pro'
    billingCycle: 'monthly' | 'yearly'; // The cycle the company is on
    planExpiresAt: string; // ISO String
    createdAt: any; // Firestore Timestamp
    status: 'active' | 'paused' | 'inactive';
    website?: string; // Company website URL
    country?: string; // Company's country (e.g., 'India', 'USA')
    countryCode?: string; // ISO country code (e.g., 'IN', 'US')
    currencyCode?: string; // Currency code (e.g., 'INR', 'USD')
    timezone?: string; // Timezone (e.g., 'Asia/Kolkata', 'America/New_York')
    registeredEmail?: string; // Company registered/business email
    adminEmail?: string; // Company admin contact email
    phone?: string; // Company phone number
    address?: string; // Company physical address
    apiKeys?: StoredApiKeys; // Securely stored API keys for the company
    quotaTracking?: QuotaTracking; // Email automation quota tracking and rate limiting
    
    // Payment Gateway Integration (Stripe)
    stripeCustomerId?: string;      // Stripe customer ID
    stripeSubscriptionId?: string;  // Stripe subscription ID (for recurring payments)
    
    // Payment Gateway Integration (Razorpay)
    razorpayCustomerId?: string;    // Razorpay customer ID (not used for one-time payments)
    
    // AI Usage Tracking (New)
    aiUsageThisMonth?: {
        operations: number;           // Total AI operations this month
        creditsUsed: number;         // Credits consumed
        estimatedCost: number;       // Estimated cost in USD
        lastReset: string;           // When quota was last reset
    };
    
    // AI Credit Balance Tracking (DUAL SYSTEM)
    aiCreditBalance?: {
        // Lifetime credits (Free plan only - one-time allocation)
        lifetimeAllocated: number;   // Total lifetime credits allowed (20 for Free)
        lifetimeUsed: number;        // Lifetime credits consumed (never resets)
        
        // Monthly credits (Paid plans - renewable)
        monthlyAllocated: number;    // Monthly credit quota
        monthlyUsed: number;         // Credits used this month (resets monthly)
        
        // Tracking
        currentMonth: string;        // Current billing month (YYYY-MM)
        lastResetAt: string;         // Last monthly reset timestamp (ISO)
    };
    
    // Company's own Gemini API key (optional)
    geminiApiKeyId?: string;         // Reference to CompanyAIApiKey document
    useOwnGeminiApiKey?: boolean;    // If true, use company's own API key instead of platform key
    
    // Onboarding progress tracking
    onboardingProgress?: {
        completed: boolean;
        completedAt?: string; // ISO string
        skippedAt?: string; // ISO string
        checklist: {
            addedContacts: boolean;          // Added first 10+ contacts
            sentFirstCampaign: boolean;      // Sent first email campaign
            createdDigitalCard: boolean;     // Created digital business card
            invitedTeamMember: boolean;      // Invited first team member
            triedAI: boolean;                // Used AI content generation
            setupAutomation: boolean;        // Set up email automation
            launchedMultiChannel: boolean;   // Launched multi-channel campaign
        };
        checklistCompletedAt?: {
            addedContacts?: string;
            sentFirstCampaign?: string;
            createdDigitalCard?: string;
            invitedTeamMember?: string;
            triedAI?: string;
            setupAutomation?: string;
            launchedMultiChannel?: string;
        };
    };
    
    // Calendar Access Control Settings (Admin configurable)
    calendarAccessSettings?: {
        enabled: boolean;                    // Master toggle for calendar module
        allowedRoles: Role[];               // Roles that can access calendar (e.g., ['admin', 'manager'])
        allowedUserTypes: UserType[];       // User types that can access calendar (e.g., ['office', 'field'])
        canCreateAppointments: Role[];      // Roles that can create new appointments
        canEditAppointments: Role[];        // Roles that can edit existing appointments
        canDeleteAppointments: Role[];      // Roles that can delete/cancel appointments
        canViewOthersAppointments: Role[];  // Roles that can view other users' appointments
    };
}

/**
 * Represents an invitation for a new user to join a company.
 */
export interface UserInvitation {
    id: string;
    email: string;
    companyId: string;
    role: Role; 
    type: UserType; // Type of user to be invited
    invitedBy: string; // UID of the inviter
    createdAt: any; // Firestore Timestamp
}

/**
 * Represents a single feature that can be assigned to a plan.
 */
export interface Feature {
    id: string; // e.g., 'core-crm', 'ai-tools'
    name: string; // e.g., 'Core CRM Features'
    description?: string; // Optional description
    active: boolean; // Superadmin can activate/deactivate features globally
}

/**
 * Defines a subscription plan for the SaaS platform.
 * UPDATED: Dual credit system - lifetime (one-time) vs monthly (renewable)
 * All prices are automatically converted to user's local currency based on their country
 */
export interface Plan {
    id: string; // e.g., 'plan_starter', 'plan_pro'
    name: string; // e.g., 'Starter', 'Pro'
    description: string;
    
    // Pricing (USD only - auto-converts to all currencies)
    priceMonthlyUSD: number;
    
    // Payment links (optional)
    paymentLinkMonthlyUSD?: string;
    
    // Yearly discount
    yearlyDiscountPercentage?: number; // Discount applied to the annual total (monthly * 12)
    paymentLinkYearlyUSD?: string;

    featureIds: string[]; // IDs linking to the master Feature list
    isFeatured?: boolean; // To highlight a specific plan on the pricing page
    maxUsers: number; // Maximum number of users allowed
    
    // AI Credits - DUAL SYSTEM (Lifetime vs Monthly)
    aiCreditsPerMonth: number; // DEPRECATED: Use aiMonthlyCredits (kept for backward compatibility)
    aiLifetimeCredits?: number; // One-time total credits (Free plan = 20, Paid = 0)
    aiMonthlyCredits?: number;  // Monthly renewable credits (Free = 0, Paid = 2000+)
    
    // BYOK (Bring Your Own Key) Support
    allowBYOK?: boolean; // If true, users can use their own Gemini API key for unlimited AI
    
    // Operation-specific limits (NEW - for profitability control)
    // These prevent abuse and ensure profitability regardless of usage patterns
    maxImagesPerMonth?: number;     // Maximum images that can be generated per month
    maxTextPerMonth?: number;       // Maximum text generations per month (optional)
    maxTTSPerMonth?: number;        // Maximum text-to-speech operations per month (optional)
    maxVideosPerMonth?: number;     // Maximum video generations per month (when available)
    maxDigitalCards?: number;       // Maximum number of digital cards (DEPRECATED - use digitalCardsPerUser)
    
    // Digital Cards - Per-User Allocation Model
    digitalCardsPerUser?: number;   // Cards allocated per team member (scalable pricing)
    maxDigitalCardsCap?: number;    // Upper limit to prevent abuse (e.g., 200 for Enterprise)
    
    // Overage settings (NEW - allows selling extra credits)
    allowOverage?: boolean;         // If true, users can purchase extra credits beyond limit
    overagePricePerCredit?: number; // Price per extra credit in USD
    
    // CRM Limitations (NEW - tiered access control)
    crmAccessLevel?: 'basic' | 'full'; // CRM tier: basic (limited) or full (all features)
    maxContacts?: number | null;       // Maximum contacts allowed (null = unlimited)
    allowBulkImport?: boolean;         // Allow bulk CSV import of contacts
    allowBulkExport?: boolean;         // Allow bulk CSV export of contacts
    allowAdvancedFields?: boolean;     // Allow custom/advanced contact fields
}

/**
 * Defines the global settings for free trials.
 */
export interface TrialSettings {
    trialPlanId: string; // ID of the plan to use for trials
    trialDurationDays: number; // Duration of the trial in days
}

/**
 * Defines a user's attendance record.
 */
export interface AttendanceRecord {
    userId: string;
    status: 'in' | 'out';
    timestamp: any; // Firestore Timestamp
}

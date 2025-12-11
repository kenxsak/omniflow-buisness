
"use client";

import type { Plan, Company, AppUser, UserInvitation, Feature, TrialSettings, AttendanceRecord, Role, UserType } from '@/types/saas';
import { addDays, addYears } from 'date-fns';
import { getFirebaseDb } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, writeBatch, query, where, deleteDoc, updateDoc, serverTimestamp, limit, orderBy } from 'firebase/firestore';
import type { StoredApiKeys } from '@/types/integrations';

const getDb = () => getFirebaseDb();

// --- Default Data (for seeding) ---
export const initialFeatures: Feature[] = [
    { id: 'feat_core_crm', name: 'Core CRM', description: 'Access to Leads, Contacts, Pipeline, Task Management, Appointments/Calendar, and Team Management features.', active: true },
    { id: 'feat_ai_content_gen', name: 'Content Factory', description: 'Access to the unified Content Factory, including AI generators and the Content Hub for blogs and pages.', active: true },
    { id: 'feat_digital_cards', name: 'Digital Cards', description: 'Create professional digital business cards with Voice AI chatbot (109 languages), QR codes, and lead capture. Scales per team member.', active: true },
    { id: 'feat_ai_ads_manager', name: 'AI Ads Manager', description: 'Access to AI tools for planning and generating ad creatives.', active: true },
    { id: 'feat_email_marketing', name: 'Email Marketing', description: 'Enables Email Marketing features, including Brevo integration.', active: true },
    { id: 'feat_sms_whatsapp', name: 'SMS & WhatsApp Marketing', description: 'Enables SMS (Twilio) and WhatsApp marketing features.', active: true },
    { id: 'feat_ai_voice', name: 'AI Voice & Text-to-Speech', description: 'Generate voice content and convert text to speech for marketing and content.', active: true },
    { id: 'feat_enterprise_team', name: 'Enterprise Team Collaboration', description: 'Lead Claiming (prevent duplicate work), Full Audit Trail (compliance tracking), Auto Lead Distribution (fair assignment), and Enterprise Settings page.', active: true },
    { id: 'feat_advanced_analytics', name: 'Advanced Analytics & Business Reports', description: 'Access to advanced business intelligence, conversion tracking, ROI calculations, and predictive analytics. Available on paid plans only.', active: true },
];

/**
 * COMPETITIVE & PROFITABLE 4-TIER PRICING STRATEGY
 * Designed for maximum conversion and day-1 profitability
 * All prices in USD - automatically converted to user's local currency
 * 
 * Strategy Overview:
 * - FREE: One-time 20 AI credits (no monthly refill) - hooks users, minimal cost
 * - STARTER ($29): Sweet spot for solopreneurs (bridges $0→$99 gap) + BYOK
 * - PRO ($99): Main revenue driver with all features (FEATURED) + BYOK
 * - ENTERPRISE ($249): Premium tier for large organizations + BYOK + White-label
 * 
 * Competitive Positioning:
 * - vs GoHighLevel ($97-297): Up to 70% cheaper with BYOK unlimited AI
 * - vs HubSpot ($50-3200): Up to 90% cheaper with all features
 * - vs ActiveCampaign ($29-259): Superior AI + native WhatsApp
 * 
 * Regional Pricing (for India launch):
 * - India (INR via Razorpay): ₹1,999 / ₹7,999 / ₹20,999
 * - Global (USD via Stripe): $29 / $99 / $249
 * 
 * BYOK Advantage: All paid plans support Bring Your Own API Key for unlimited AI
 */
const initialSaasPlans: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    description: 'Try OmniFlow with 20 AI generations to experience the power.',
    priceMonthlyUSD: 0,
    yearlyDiscountPercentage: 0,
    featureIds: ['feat_core_crm', 'feat_ai_content_gen', 'feat_digital_cards'],
    maxUsers: 1,  // Free plan: Only 1 user (the owner), cannot invite anyone
    
    // DUAL CREDIT SYSTEM - One-time credits only
    aiCreditsPerMonth: 20, // Display only (backward compatibility)
    aiLifetimeCredits: 20, // One-time total (never refills)
    aiMonthlyCredits: 0,   // No monthly credits (forces upgrade)
    allowBYOK: false,      // BYOK only on paid plans
    
    maxImagesPerMonth: 2,   // Also one-time
    maxTextPerMonth: 20,    // Aligned with credits
    maxTTSPerMonth: 0,      // TTS requires upgrade
    allowOverage: false,
    
    // Digital Cards - Fixed limit for free plan
    maxDigitalCards: 1,
    digitalCardsPerUser: 0,
    maxDigitalCardsCap: 1,
    
    // CRM Limitations - Basic tier with import/export enabled
    crmAccessLevel: 'basic',
    maxContacts: 100,
    allowBulkImport: true,   // ✅ Enabled - 100 limit still enforced
    allowBulkExport: true,   // ✅ Enabled - better UX for free users
    allowAdvancedFields: false,
  },
  {
    id: 'plan_starter',
    name: 'Starter',
    description: 'For solopreneurs and small businesses. 2,000 credits/month OR unlimited with BYOK.',
    priceMonthlyUSD: 29,
    yearlyDiscountPercentage: 15,
    featureIds: ['feat_core_crm', 'feat_email_marketing', 'feat_ai_content_gen', 'feat_digital_cards', 'feat_advanced_analytics'],
    maxUsers: 3,
    
    // DUAL CREDIT SYSTEM - Monthly renewable
    aiCreditsPerMonth: 2000, // Display (backward compatibility)
    aiLifetimeCredits: 0,    // No lifetime limit
    aiMonthlyCredits: 2000,  // Refills monthly
    allowBYOK: true,         // Can use own API key for unlimited
    
    maxImagesPerMonth: 50,
    maxTextPerMonth: 2000,
    maxTTSPerMonth: 400,
    allowOverage: true,
    overagePricePerCredit: 0.006,
    
    // Digital Cards - 1 per user (3 users = 3 cards)
    digitalCardsPerUser: 1,
    maxDigitalCardsCap: 5,
    
    // CRM Limitations - Full tier for paid plans
    crmAccessLevel: 'full',
    maxContacts: null,
    allowBulkImport: true,
    allowBulkExport: true,
    allowAdvancedFields: true,
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    description: 'For growing businesses. 12,000 credits/month OR unlimited with BYOK. All features included.',
    priceMonthlyUSD: 99,
    isFeatured: true,
    yearlyDiscountPercentage: 20,
    featureIds: ['feat_core_crm', 'feat_email_marketing', 'feat_sms_whatsapp', 'feat_ai_content_gen', 'feat_ai_ads_manager', 'feat_digital_cards', 'feat_advanced_analytics'],
    maxUsers: 10,
    
    // DUAL CREDIT SYSTEM - Monthly renewable
    aiCreditsPerMonth: 12000, // Display (backward compatibility)
    aiLifetimeCredits: 0,     // No lifetime limit
    aiMonthlyCredits: 12000,  // Refills monthly
    allowBYOK: true,          // Can use own API key for unlimited
    
    maxImagesPerMonth: 300,
    maxTextPerMonth: 12000,
    maxTTSPerMonth: 2400,
    allowOverage: true,
    overagePricePerCredit: 0.005,
    
    // Digital Cards - 2 per user (10 users = 20 cards)
    digitalCardsPerUser: 2,
    maxDigitalCardsCap: 30,
    
    // CRM Limitations - Full tier for paid plans
    crmAccessLevel: 'full',
    maxContacts: null,
    allowBulkImport: true,
    allowBulkExport: true,
    allowAdvancedFields: true,
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    description: 'For large teams. 60,000 credits/month OR unlimited with BYOK. White-label available.',
    priceMonthlyUSD: 249,
    yearlyDiscountPercentage: 25,
    featureIds: ['feat_core_crm', 'feat_email_marketing', 'feat_sms_whatsapp', 'feat_ai_content_gen', 'feat_ai_ads_manager', 'feat_digital_cards', 'feat_enterprise_team', 'feat_advanced_analytics'],
    maxUsers: 50,
    
    // DUAL CREDIT SYSTEM - Monthly renewable
    aiCreditsPerMonth: 60000, // Display (backward compatibility)
    aiLifetimeCredits: 0,     // No lifetime limit
    aiMonthlyCredits: 60000,  // Refills monthly
    allowBYOK: true,          // Can use own API key for unlimited
    
    maxImagesPerMonth: 1500,
    maxTextPerMonth: 60000,
    maxTTSPerMonth: 12000,
    allowOverage: true,
    overagePricePerCredit: 0.004,
    
    // Digital Cards - 3 per user (50 users = 150 cards)
    digitalCardsPerUser: 3,
    maxDigitalCardsCap: 200,
    
    // CRM Limitations - Full tier for paid plans
    crmAccessLevel: 'full',
    maxContacts: null,
    allowBulkImport: true,
    allowBulkExport: true,
    allowAdvancedFields: true,
  }
];

const initialTrialSettings: TrialSettings = {
    trialPlanId: 'plan_pro',
    trialDurationDays: 14,
};

// --- Firestore Collection References ---
const plansCol = () => collection(getDb()!, 'plans');
const featuresCol = () => collection(getDb()!, 'features');
const companiesCol = () => collection(getDb()!, 'companies');
const usersCol = () => collection(getDb()!, 'users');
const invitationsCol = () => collection(getDb()!, 'invitations');
const attendanceCol = () => collection(getDb()!, 'attendance');
const trialSettingsDoc = () => doc(getDb()!, 'settings', 'trial');

// --- Plan Management Functions ---
export async function getStoredPlans(): Promise<Plan[]> {
  if (!getDb()) return [];
  const snapshot = await getDocs(plansCol());
  if (snapshot.empty) {
      // Seed plans if they don't exist (for superadmin setup)
      const batch = writeBatch(getDb()!);
      initialSaasPlans.forEach(plan => {
          const docRef = doc(getDb()!, "plans", plan.id);
          const sanitizedPlan = Object.fromEntries(
              Object.entries(plan).map(([key, value]) => [key, value === undefined ? null : value])
          );
          batch.set(docRef, sanitizedPlan);
      });
      await batch.commit();
      return initialSaasPlans;
  }
  
  const existingPlans = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Plan));
  
  // AUTO-MIGRATION: Check if plans need updating by comparing AI credits
  // If Free plan has wrong credits (500 instead of 150), auto-update all plans
  const freePlan = existingPlans.find(p => p.id === 'plan_free');
  const needsUpdate = freePlan && freePlan.aiCreditsPerMonth !== 150;
  
  if (needsUpdate) {
    console.log('🔄 Auto-migrating plans to new pricing structure...');
    const batch = writeBatch(getDb()!);
    initialSaasPlans.forEach(plan => {
        const docRef = doc(getDb()!, "plans", plan.id);
        const sanitizedPlan = Object.fromEntries(
            Object.entries(plan).map(([key, value]) => [key, value === undefined ? null : value])
        );
        batch.set(docRef, sanitizedPlan); // Overwrite with new values
    });
    await batch.commit();
    console.log('✅ Plans migrated successfully!');
    return initialSaasPlans;
  }
  
  return existingPlans;
}

/**
 * Sanitizes a plan object by converting undefined values to null
 * Firebase Firestore does not accept undefined values
 * Using null allows fields to be cleared when updated
 */
function sanitizePlan(plan: Plan): any {
    return Object.fromEntries(
        Object.entries(plan).map(([key, value]) => [key, value === undefined ? null : value])
    );
}

export async function updateStoredPlan(plan: Plan): Promise<void> {
    if (!getDb()) return;
    const planRef = doc(getDb()!, "plans", plan.id);
    const sanitizedPlan = sanitizePlan(plan);
    await setDoc(planRef, sanitizedPlan, { merge: true });
}

export async function addStoredPlan(plan: Plan): Promise<void> {
    if (!getDb()) return;
    const docRef = doc(plansCol(), plan.id); // Use the provided ID to set the document
    const sanitizedPlan = sanitizePlan(plan);
    await setDoc(docRef, sanitizedPlan);
}

export async function deleteStoredPlan(planId: string): Promise<void> {
    if (!getDb()) return;
    await deleteDoc(doc(getDb()!, 'plans', planId));
}

/**
 * Sync all plans from code to database
 * This updates all existing plans with the latest values from initialSaasPlans
 */
export async function syncPlansFromCode(): Promise<{ success: boolean; message: string }> {
    if (!getDb()) return { success: false, message: "Database not connected" };
    
    try {
        const batch = writeBatch(getDb()!);
        initialSaasPlans.forEach(plan => {
            const docRef = doc(getDb()!, "plans", plan.id);
            const sanitizedPlan = Object.fromEntries(
                Object.entries(plan).map(([key, value]) => [key, value === undefined ? null : value])
            );
            batch.set(docRef, sanitizedPlan); // Overwrite with code values
        });
        await batch.commit();
        return { success: true, message: `Successfully synced ${initialSaasPlans.length} plans from code to database` };
    } catch (error) {
        console.error("Error syncing plans:", error);
        return { success: false, message: "Failed to sync plans. Check console for details." };
    }
}


// --- Feature and Trial Settings (SuperAdmin) ---
export async function getStoredFeatures(): Promise<Feature[]> {
    if (!getDb()) return initialFeatures;
    const snapshot = await getDocs(featuresCol());
     if (snapshot.empty) {
        const batch = writeBatch(getDb()!);
        initialFeatures.forEach(feature => {
            const docRef = doc(getDb()!, "features", feature.id);
            batch.set(docRef, feature);
        });
        await batch.commit();
        return initialFeatures;
    }
    // Return the hardcoded list to ensure UI consistency and prevent old data from appearing.
    // The DB is used for persistence for custom-added features, but this list is the source of truth for defaults.
    return initialFeatures;
}

export async function addStoredFeature(feature: Omit<Feature, 'id'>): Promise<{ success: boolean; message?: string }> {
    if (!getDb()) return { success: false, message: "Database not connected."};
    // Create a new ID from the name
    const newId = `feat_${feature.name.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/\s+/g, '_')}`;
    const featureRef = doc(getDb()!, 'features', newId);
    
    const docSnap = await getDoc(featureRef);
    if(docSnap.exists()) {
        return { success: false, message: "A feature with this name already exists (ID conflict)." };
    }
    await setDoc(featureRef, { ...feature, id: newId });
    return { success: true };
}

export async function deleteStoredFeature(featureId: string): Promise<void> {
    if (!getDb()) return;
    // Check if it's a default feature before deleting
    const isDefault = initialFeatures.some(f => f.id === featureId);
    if (isDefault) {
        console.warn(`Attempted to delete a default feature (${featureId}). This is not allowed.`);
        return; // Or throw an error
    }
    await deleteDoc(doc(getDb()!, 'features', featureId));
}


export async function saveStoredFeatures(features: Feature[]): Promise<void> {
    if (!getDb()) return;
    const batch = writeBatch(getDb()!);
    features.forEach(feature => {
        const docRef = doc(getDb()!, "features", feature.id);
        batch.set(docRef, feature);
    });
    await batch.commit();
}


export async function getTrialSettings(): Promise<TrialSettings> {
    if (!getDb()) return initialTrialSettings;
    const docSnap = await getDoc(trialSettingsDoc());
     if (!docSnap.exists()) {
        await setDoc(trialSettingsDoc(), initialTrialSettings);
        return initialTrialSettings;
    }
    return docSnap.data() as TrialSettings;
}

export async function saveTrialSettings(settings: TrialSettings): Promise<void> {
    if (!getDb()) return;
    await setDoc(trialSettingsDoc(), settings);
}

// --- Company & User Management ---

export async function getStoredCompanies(): Promise<Company[]> {
    if (!getDb()) return [];
    const snapshot = await getDocs(companiesCol());
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Company));
}

export async function getCompany(companyId: string): Promise<Company | null> {
    if (!getDb()) return null;
    const docSnap = await getDoc(doc(getDb()!, "companies", companyId));
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as Company : null;
}

export async function getCompanyUsers(companyId: string): Promise<AppUser[]> {
    if (!getDb()) return [];
    const q = query(usersCol(), where("companyId", "==", companyId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return [];
    return querySnapshot.docs.map(doc => doc.data() as AppUser);
}


export async function addAppUser(firebaseUser: { uid: string, email: string | null }): Promise<{ user: AppUser, isNewCompany: boolean }> {
    if (!getDb()) throw new Error("Database not initialized");
    const lowerEmail = firebaseUser.email?.toLowerCase();
    if (!lowerEmail) throw new Error("User email is missing.");

    const userDocRef = doc(getDb()!, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return { user: userDocSnap.data() as AppUser, isNewCompany: false };
    }
    
    const superadminEmail = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || '').toLowerCase();
    
    if (superadminEmail !== '' && lowerEmail === superadminEmail) {
        console.log(`Super admin signup detected for: ${lowerEmail}. Assigning superadmin role.`);
        const superadminCompanyId = 'omniflow_superadmin_company';
        const newUser: AppUser = {
            uid: firebaseUser.uid,
            email: lowerEmail,
            role: 'superadmin',
            type: 'office',
            companyId: superadminCompanyId,
            createdAt: serverTimestamp(),
        };
        const companyDocRef = doc(getDb()!, "companies", superadminCompanyId);
        const companyDoc = await getDoc(companyDocRef);
        if (!companyDoc.exists()) {
            await setDoc(companyDocRef, {
                name: 'OmniFlow Platform',
                ownerId: firebaseUser.uid,
                planId: 'plan_enterprise',
                billingCycle: 'yearly',
                planExpiresAt: addYears(new Date(), 99).toISOString(),
                status: 'active',
                createdAt: serverTimestamp(),
                apiKeys: {},
            });
        }
        await setDoc(userDocRef, newUser);
        return { user: newUser, isNewCompany: false };
    } 

    let newUser: AppUser;
    let isNewCompany = false;
    const invitationQuery = query(invitationsCol(), where("email", "==", lowerEmail), limit(1));
    const invitationSnap = await getDocs(invitationQuery);
    
    if (!invitationSnap.empty) {
        const invitation = invitationSnap.docs[0].data() as UserInvitation;
        newUser = {
            uid: firebaseUser.uid,
            email: lowerEmail,
            role: invitation.role,
            type: invitation.type,
            companyId: invitation.companyId,
            createdAt: serverTimestamp(),
        };
        await deleteDoc(doc(getDb()!, "invitations", invitationSnap.docs[0].id));
    } else {
        isNewCompany = true;
        const trialSettings = await getTrialSettings();
        const newCompanyData = {
            name: `${lowerEmail.split('@')[0]}'s Company`,
            ownerId: firebaseUser.uid,
            planId: trialSettings.trialPlanId,
            billingCycle: 'monthly',
            createdAt: serverTimestamp(),
            planExpiresAt: addDays(new Date(), trialSettings.trialDurationDays).toISOString(),
            status: 'active',
            apiKeys: {},
            useOwnGeminiApiKey: false,
        };
        const companyDocRef = await addDoc(companiesCol(), newCompanyData);

        newUser = {
            uid: firebaseUser.uid,
            email: lowerEmail,
            role: 'admin',
            type: 'office',
            companyId: companyDocRef.id,
            createdAt: serverTimestamp(),
        };
    }
    
    await setDoc(userDocRef, newUser);
    return { user: newUser, isNewCompany };
}


export async function getAppUser(uid: string): Promise<AppUser | null> {
    if (!getDb()) return null;
    const userDoc = await getDoc(doc(getDb()!, 'users', uid));
    return userDoc.exists() ? ({ ...userDoc.data(), uid: userDoc.id } as AppUser) : null;
}

export async function getStoredUsers(): Promise<AppUser[]> {
    if (!getDb()) return [];
    const snapshot = await getDocs(usersCol());
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data() as AppUser);
}


// --- Invitation Management ---
export async function createInvitation(email: string, companyId: string, inviterId: string, type: UserType, role: Role): Promise<{ success: boolean; message?: string }> {
     if (!getDb()) return { success: false, message: "Database not connected." };
     const lowerEmail = email.toLowerCase();
     
     const userQuery = query(usersCol(), where("email", "==", lowerEmail));
     const invQuery = query(invitationsCol(), where("email", "==", lowerEmail));
     const [userSnap, invSnap] = await Promise.all([getDocs(userQuery), getDocs(invQuery)]);

     if (!userSnap.empty || !invSnap.empty) {
         return { success: false, message: "A user with this email already exists or has a pending invitation." };
     }

     const newInvitation: Omit<UserInvitation, 'id'> = {
        email: lowerEmail,
        companyId,
        role,
        type,
        invitedBy: inviterId,
        createdAt: serverTimestamp(),
     };
     const docRef = await addDoc(invitationsCol(), newInvitation);
     return { success: true, message: `Invitation created with ID: ${docRef.id}`};
}


export async function getStoredInvitations(): Promise<UserInvitation[]> {
    if (!getDb()) return [];
    const snapshot = await getDocs(invitationsCol());
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as UserInvitation));
}

export async function deleteInvitation(invitationId: string): Promise<void> {
    if (!getDb()) return;
    await deleteDoc(doc(getDb()!, 'invitations', invitationId));
}

export async function updateCompanyPlan(companyId: string, newPlanId: string): Promise<void> {
    if (!getDb()) return;
    const companyRef = doc(getDb()!, "companies", companyId);
    await updateDoc(companyRef, { planId: newPlanId });
}

export async function updateCompanyPlanExpiry(companyId: string, newExpiryDate: Date): Promise<void> {
    if (!getDb()) return;
    const companyRef = doc(getDb()!, "companies", companyId);
    await updateDoc(companyRef, { planExpiresAt: newExpiryDate.toISOString() });
}

export async function updateCompanyStatus(companyId: string, status: 'active' | 'paused'): Promise<void> {
    if (!getDb()) return;
    const companyRef = doc(getDb()!, "companies", companyId);
    await updateDoc(companyRef, { status: status });
}

export async function updateCompanyBillingCycle(companyId: string, billingCycle: 'monthly' | 'yearly'): Promise<void> {
    if (!getDb()) return;
    const companyRef = doc(getDb()!, "companies", companyId);
    await updateDoc(companyRef, { billingCycle: billingCycle });
}

export async function deleteCompanyAndUsers(companyId: string): Promise<void> {
    if (!getDb()) return;
    const batch = writeBatch(getDb()!);

    const companyRef = doc(getDb()!, "companies", companyId);
    batch.delete(companyRef);

    const usersQuery = query(usersCol(), where("companyId", "==", companyId));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(userDoc => {
        batch.delete(userDoc.ref);
    });

    await batch.commit();
}


// --- SuperAdmin Data Fetching ---
export async function getAllAdminsAndCompanies(): Promise<{ admin: AppUser; company: Company }[]> {
    if (!getDb()) return [];
    const adminQuery = query(usersCol(), where("role", "==", "admin"));
    const adminSnapshot = await getDocs(adminQuery);
    if (adminSnapshot.empty) return [];
    const admins = adminSnapshot.docs.map(doc => doc.data() as AppUser);

    if (admins.length === 0) return [];

    const companyPromises = admins.map(admin => getDoc(doc(getDb()!, "companies", admin.companyId)));
    const companySnapshots = await Promise.all(companyPromises);

    return admins.map((admin, index) => ({
        admin,
        company: {id: companySnapshots[index].id, ...companySnapshots[index].data()} as Company,
    })).filter(data => data.company);
}

// --- Profile and API Key Update Functions ---
export async function updateUserProfile(uid: string, data: { name?: string, phone?: string }): Promise<void> {
    if (!getDb()) return;
    const userRef = doc(getDb()!, "users", uid);
    await updateDoc(userRef, {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
    });
}

export async function updateCompanyProfile(companyId: string, data: { name?: string, website?: string, country?: string }): Promise<void> {
    if (!getDb()) return;
    const companyRef = doc(getDb()!, "companies", companyId);
    await updateDoc(companyRef, {
        ...(data.name && { name: data.name }),
        ...(data.website && { website: data.website }),
        ...(data.country && { country: data.country }),
    });
}

export async function updateCompanyApiKeys(companyId: string, apiKeys: StoredApiKeys): Promise<void> {
    if (!getDb()) return;
    const companyRef = doc(getDb()!, "companies", companyId);
    await updateDoc(companyRef, { apiKeys });
}


// --- Attendance Functions ---
export async function logAttendance(userId: string, status: 'in' | 'out'): Promise<void> {
    if (!getDb()) return;
     await addDoc(attendanceCol(), {
        userId,
        status,
        timestamp: serverTimestamp(),
    });
}

export async function getAttendanceForUser(userId: string): Promise<AttendanceRecord[]> {
    if (!getDb()) return [];
    const q = query(attendanceCol(), where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    return snapshot.docs.map(d => d.data() as AttendanceRecord);
}

export async function getLastAttendanceRecord(userId: string): Promise<AttendanceRecord | null> {
    if (!getDb()) return null;
    // Removed orderBy to prevent index requirement.
    const q = query(attendanceCol(), where('userId', '==', userId), limit(10));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    // Manual sort after fetching
    const records = snapshot.docs.map(d => d.data() as AttendanceRecord);
    records.sort((a, b) => (b.timestamp?.toDate?.()?.getTime() || 0) - (a.timestamp?.toDate?.()?.getTime() || 0));

    return records[0] || null;
}

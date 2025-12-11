import { Plan } from '@/types/saas';

/**
 * Calculate the maximum number of digital cards allowed for a company
 * based on their plan and current user count
 * 
 * Per-User Model:
 * - Free: Fixed 1 card (doesn't scale)
 * - Starter: 1 card per user (3 users = 3 cards)
 * - Pro: 2 cards per user (10 users = 20 cards)
 * - Enterprise: 3 cards per user (50 users = 150 cards)
 * 
 * @param plan - The subscription plan
 * @param currentUserCount - Number of users in the company
 * @returns Maximum number of digital cards allowed
 */
export function calculateDigitalCardLimit(
  plan: Plan,
  currentUserCount: number
): number {
  // Free plan: Fixed limit of 1 card (doesn't scale with users)
  if (plan.id === 'plan_free' || plan.digitalCardsPerUser === 0) {
    return plan.maxDigitalCards || 1;
  }

  // For paid plans: Calculate based on users
  const cardsPerUser = plan.digitalCardsPerUser || 0;
  const calculatedLimit = currentUserCount * cardsPerUser;
  
  // Apply cap if defined (prevents abuse)
  const cap = plan.maxDigitalCardsCap || Infinity;
  
  return Math.min(calculatedLimit, cap);
}

/**
 * Get user-friendly description of digital card limits
 * 
 * Examples:
 * - "1 Digital Card"
 * - "3 Digital Cards (1 per team member)"
 * - "20 Digital Cards (2 per team member)"
 * 
 * @param plan - The subscription plan
 * @param currentUserCount - Number of users in the company
 * @returns User-friendly limit description
 */
export function getDigitalCardLimitDescription(
  plan: Plan,
  currentUserCount: number
): string {
  const limit = calculateDigitalCardLimit(plan, currentUserCount);
  
  // Free plan: Simple description
  if (plan.id === 'plan_free') {
    return `1 Digital Card`;
  }
  
  // Paid plans: Show per-user allocation
  const perUser = plan.digitalCardsPerUser || 0;
  
  return `${limit} Digital Cards (${perUser} per team member)`;
}

/**
 * Get upgrade suggestion when digital card limit is reached
 * Provides helpful messaging to encourage upgrades
 * 
 * @param currentPlanId - Current plan ID
 * @param currentUserCount - Number of users in the company
 * @returns Upgrade suggestion with plan name, benefit, and total cards
 */
export function getDigitalCardUpgradeSuggestion(
  currentPlanId: string,
  currentUserCount: number
): {
  suggestedPlan: string;
  suggestedPlanId: string;
  benefit: string;
  totalCards: number;
  pricePerCard: number;
} {
  switch (currentPlanId) {
    case 'plan_free':
      return {
        suggestedPlan: 'Starter',
        suggestedPlanId: 'plan_starter',
        benefit: 'Add up to 3 team members - each gets their own Digital Card',
        totalCards: 3,
        pricePerCard: 9.67 // $29 / 3 cards
      };
    
    case 'plan_starter':
      const starterCards = currentUserCount * 2; // Pro gives 2 per user
      return {
        suggestedPlan: 'Pro',
        suggestedPlanId: 'plan_pro',
        benefit: `Get 2 Digital Cards per team member instead of 1 (${starterCards} total cards)`,
        totalCards: starterCards,
        pricePerCard: 4.95 // $99 / 20 cards (typical)
      };
    
    case 'plan_pro':
      const proCards = currentUserCount * 3; // Enterprise gives 3 per user
      return {
        suggestedPlan: 'Enterprise',
        suggestedPlanId: 'plan_enterprise',
        benefit: `Get 3 Digital Cards per team member + advanced features (${proCards} total cards)`,
        totalCards: proCards,
        pricePerCard: 1.66 // $249 / 150 cards (typical)
      };
    
    default:
      return {
        suggestedPlan: 'Enterprise',
        suggestedPlanId: 'plan_enterprise',
        benefit: 'Unlimited Digital Cards for your large team',
        totalCards: 200,
        pricePerCard: 1.25
      };
  }
}

/**
 * Get percentage of digital card limit used
 * Useful for progress bars and warnings
 * 
 * @param currentCardCount - Number of cards currently created
 * @param maxCards - Maximum cards allowed
 * @returns Percentage (0-100)
 */
export function getDigitalCardUsagePercentage(
  currentCardCount: number,
  maxCards: number
): number {
  if (maxCards === 0) return 100;
  return Math.min((currentCardCount / maxCards) * 100, 100);
}

/**
 * Check if company is near or at their digital card limit
 * 
 * @param currentCardCount - Number of cards currently created
 * @param maxCards - Maximum cards allowed
 * @returns Status: 'ok' | 'warning' | 'limit_reached'
 */
export function getDigitalCardLimitStatus(
  currentCardCount: number,
  maxCards: number
): 'ok' | 'warning' | 'limit_reached' {
  const percentage = getDigitalCardUsagePercentage(currentCardCount, maxCards);
  
  if (currentCardCount >= maxCards) {
    return 'limit_reached';
  } else if (percentage >= 80) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Get CRM capabilities for a given plan
 * 
 * Returns all CRM-related permissions and limits for the plan
 * 
 * @param plan - The subscription plan
 * @returns Object containing CRM capabilities
 */
export function getCompanyPlanCapabilities(plan: Plan): {
  crmAccessLevel: 'basic' | 'full';
  maxContacts: number | null;
  allowBulkImport: boolean;
  allowBulkExport: boolean;
  allowAdvancedFields: boolean;
} {
  return {
    crmAccessLevel: plan.crmAccessLevel || 'basic',
    maxContacts: plan.maxContacts !== undefined ? plan.maxContacts : 100,
    allowBulkImport: plan.allowBulkImport ?? false,
    allowBulkExport: plan.allowBulkExport ?? false,
    allowAdvancedFields: plan.allowAdvancedFields ?? false,
  };
}

/**
 * Get user-friendly description of CRM limits
 * 
 * Examples:
 * - "Basic CRM • 100 contacts"
 * - "Full CRM • Unlimited contacts"
 * 
 * @param plan - The subscription plan
 * @returns User-friendly CRM limit description
 */
export function getCRMLimitDescription(plan: Plan): string {
  const capabilities = getCompanyPlanCapabilities(plan);
  
  const tierLabel = capabilities.crmAccessLevel === 'full' ? 'Full CRM' : 'Basic CRM';
  const contactsLabel = capabilities.maxContacts === null 
    ? 'Unlimited contacts' 
    : `${capabilities.maxContacts.toLocaleString()} contacts`;
  
  return `${tierLabel} • ${contactsLabel}`;
}

/**
 * Get percentage of contact limit used
 * Useful for progress bars and warnings
 * 
 * @param currentContactCount - Number of contacts currently in CRM
 * @param maxContacts - Maximum contacts allowed (null = unlimited)
 * @returns Percentage (0-100), or 0 if unlimited
 */
export function getContactUsagePercentage(
  currentContactCount: number,
  maxContacts: number | null
): number {
  if (maxContacts === null || maxContacts === 0) return 0; // Unlimited or invalid
  return Math.min((currentContactCount / maxContacts) * 100, 100);
}

/**
 * Check if company is near or at their contact limit
 * 
 * @param currentContactCount - Number of contacts currently in CRM
 * @param maxContacts - Maximum contacts allowed (null = unlimited)
 * @returns Status: 'unlimited' | 'ok' | 'warning' | 'limit_reached'
 */
export function getContactLimitStatus(
  currentContactCount: number,
  maxContacts: number | null
): 'unlimited' | 'ok' | 'warning' | 'limit_reached' {
  if (maxContacts === null) {
    return 'unlimited';
  }
  
  const percentage = getContactUsagePercentage(currentContactCount, maxContacts);
  
  if (currentContactCount >= maxContacts) {
    return 'limit_reached';
  } else if (percentage >= 90) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Check if company can add N more contacts
 * 
 * @param currentContactCount - Current number of contacts
 * @param maxContacts - Maximum contacts allowed (null = unlimited)
 * @param contactsToAdd - Number of contacts to add (default: 1)
 * @returns Object with canAdd boolean and availableSlots number
 */
export function canAddContacts(
  currentContactCount: number,
  maxContacts: number | null,
  contactsToAdd: number = 1
): {
  canAdd: boolean;
  availableSlots: number | null; // null = unlimited
  wouldExceedBy: number;
} {
  if (maxContacts === null) {
    return { canAdd: true, availableSlots: null, wouldExceedBy: 0 };
  }
  
  const availableSlots = Math.max(0, maxContacts - currentContactCount);
  const canAdd = contactsToAdd <= availableSlots;
  const wouldExceedBy = canAdd ? 0 : contactsToAdd - availableSlots;
  
  return { canAdd, availableSlots, wouldExceedBy };
}

/**
 * Get upgrade suggestion when contact limit is reached
 * Provides helpful messaging to encourage upgrades
 * 
 * @param currentPlanId - Current plan ID
 * @returns Upgrade suggestion with plan name and benefits
 */
export function getContactUpgradeSuggestion(
  currentPlanId: string
): {
  suggestedPlan: string;
  suggestedPlanId: string;
  benefit: string;
  price: number; // USD
} {
  switch (currentPlanId) {
    case 'plan_free':
      return {
        suggestedPlan: 'Starter',
        suggestedPlanId: 'plan_starter',
        benefit: 'Get unlimited contacts, bulk import/export, and email marketing',
        price: 29
      };
    
    default:
      // Fallback for any other plan
      return {
        suggestedPlan: 'Pro',
        suggestedPlanId: 'plan_pro',
        benefit: 'Get unlimited contacts plus advanced features',
        price: 99
      };
  }
}

/**
 * Get user-friendly contact usage message
 * 
 * Examples:
 * - "45 / 100 contacts (45%)"
 * - "1,234 contacts (unlimited)"
 * - "⚠️ 95 / 100 contacts - Upgrade soon!"
 * 
 * @param currentContactCount - Current number of contacts
 * @param maxContacts - Maximum contacts allowed (null = unlimited)
 * @returns User-friendly usage message
 */
export function getContactUsageMessage(
  currentContactCount: number,
  maxContacts: number | null
): string {
  if (maxContacts === null) {
    return `${currentContactCount.toLocaleString()} contacts (unlimited)`;
  }
  
  const status = getContactLimitStatus(currentContactCount, maxContacts);
  const percentage = Math.round(getContactUsagePercentage(currentContactCount, maxContacts));
  
  const baseMessage = `${currentContactCount.toLocaleString()} / ${maxContacts.toLocaleString()} contacts (${percentage}%)`;
  
  if (status === 'limit_reached') {
    return `🚫 ${baseMessage} - Limit reached!`;
  } else if (status === 'warning') {
    return `⚠️ ${baseMessage} - Upgrade soon!`;
  } else {
    return baseMessage;
  }
}


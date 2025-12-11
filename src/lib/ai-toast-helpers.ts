/**
 * AI Credit Toast Helpers
 * Provides standardized toast messages for AI operations across the platform
 * Ensures consistent, user-friendly credit information display
 */

interface QuotaInfo {
  consumed: number;
  remaining: number;
}

interface ToastFunction {
  (params: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  }): void;
}

/**
 * Formats credit information with proper handling for BYOK, unlimited, and edge cases
 */
function formatCreditInfo(quotaInfo: QuotaInfo | null | undefined): string {
  // Handle BYOK users or missing quota info (unlimited usage)
  if (!quotaInfo || quotaInfo.consumed === undefined || quotaInfo.remaining === undefined) {
    return '✓ AI operation completed. (Unlimited usage with your API key)';
  }

  const creditsUsed = quotaInfo.consumed;
  const creditsLeft = Math.max(0, quotaInfo.remaining); // Clamp at 0 to avoid negative values

  // Handle case where credits are exhausted
  if (creditsLeft === 0) {
    return `✓ ${creditsUsed} ${creditsUsed === 1 ? 'credit' : 'credits'} used. No credits remaining. Please upgrade or add your API key for unlimited usage.`;
  }

  return `✓ ${creditsUsed} ${creditsUsed === 1 ? 'credit' : 'credits'} used. You have ${creditsLeft.toLocaleString()} ${creditsLeft === 1 ? 'credit' : 'credits'} left.`;
}

/**
 * Shows a success toast with standardized AI credit information
 * @param toast - The toast function from useToast hook
 * @param featureName - Name of the AI feature used (e.g., "Keywords", "Ad Copy", "Hashtags")
 * @param quotaInfo - Credit usage information (can be null/undefined for BYOK users)
 * 
 * @example
 * showAISuccessToast(toast, "Keywords", { consumed: 5, remaining: 1995 })
 * // Shows: "Keywords Generated! ✓ 5 credits used. You have 1,995 credits left."
 * 
 * @example
 * showAISuccessToast(toast, "Keywords", null)
 * // Shows: "Keywords Generated! ✓ AI operation completed. (Unlimited usage with your API key)"
 */
export function showAISuccessToast(
  toast: ToastFunction,
  featureName: string,
  quotaInfo: QuotaInfo | null | undefined
): void {
  toast({
    title: `${featureName} Generated!`,
    description: formatCreditInfo(quotaInfo),
  });
}

/**
 * Shows a success toast for content generation with standardized credit info
 * @param toast - The toast function from useToast hook
 * @param contentType - Type of content generated (e.g., "Social Media Post", "Blog Content", "Email Campaign")
 * @param quotaInfo - Credit usage information (can be null/undefined for BYOK users)
 * 
 * @example
 * showAIContentReadyToast(toast, "Social Media Post", { consumed: 3, remaining: 5997 })
 * // Shows: "Social Media Post Ready! ✓ 3 credits used. You have 5,997 credits left."
 */
export function showAIContentReadyToast(
  toast: ToastFunction,
  contentType: string,
  quotaInfo: QuotaInfo | null | undefined
): void {
  toast({
    title: `${contentType} Ready!`,
    description: formatCreditInfo(quotaInfo),
  });
}

/**
 * Shows a success toast for AI-assisted tasks with standardized credit info
 * @param toast - The toast function from useToast hook
 * @param taskDescription - Description of completed task (e.g., "Email drafted", "Message planned", "Task suggested")
 * @param quotaInfo - Credit usage information (can be null/undefined for BYOK users)
 * 
 * @example
 * showAITaskCompleteToast(toast, "Email drafted", { consumed: 2, remaining: 11998 })
 * // Shows: "Email drafted successfully! ✓ 2 credits used. You have 11,998 credits left."
 */
export function showAITaskCompleteToast(
  toast: ToastFunction,
  taskDescription: string,
  quotaInfo: QuotaInfo | null | undefined
): void {
  toast({
    title: `${taskDescription} successfully!`,
    description: formatCreditInfo(quotaInfo),
  });
}

/**
 * Shows a success toast for AI image generation with standardized credit info
 * @param toast - The toast function from useToast hook
 * @param quotaInfo - Credit usage information (can be null/undefined for BYOK users)
 * 
 * @example
 * showAIImageGeneratedToast(toast, { consumed: 10, remaining: 590 })
 * // Shows: "Image Generated! ✓ 10 credits used. You have 590 credits left."
 */
export function showAIImageGeneratedToast(
  toast: ToastFunction,
  quotaInfo: QuotaInfo | null | undefined
): void {
  showAISuccessToast(toast, 'Image', quotaInfo);
}

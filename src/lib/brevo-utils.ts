/**
 * Brevo utility functions for default list selection and other Brevo-related helpers
 */

/**
 * Get the default Brevo list ID from company API keys
 * Falls back to '2' if not configured
 * 
 * @param apiKeys - Company API keys object
 * @returns The default list ID as a string
 */
export function getDefaultBrevoListId(apiKeys: any): string {
  return apiKeys?.brevo?.defaultListId?.trim() || '2';
}

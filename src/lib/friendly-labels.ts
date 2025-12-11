/**
 * Friendly Form Labels
 * 
 * Translates technical form field labels into plain, user-friendly language.
 * Use these labels throughout the app to ensure consistency and clarity.
 */

export type FormFieldType =
  | 'subject_line'
  | 'sender_email'
  | 'sender_name'
  | 'api_key'
  | 'auth_token'
  | 'account_sid'
  | 'phone_number'
  | 'list_id'
  | 'webhook_url'
  | 'endpoint_url'
  | 'access_token'
  | 'portal_id'
  | 'realm_name'
  | 'message_content'
  | 'recipient_list'
  | 'campaign_name'
  | 'email_content'
  | 'sms_content';

interface LabelInfo {
  label: string;
  placeholder?: string;
  helpText?: string;
}

/**
 * Get friendly label for form fields
 */
export function getFriendlyLabel(fieldType: FormFieldType): LabelInfo {
  const labels: Record<FormFieldType, LabelInfo> = {
    subject_line: {
      label: 'Email Title',
      placeholder: 'e.g., Special Offer Just for You!',
      helpText: 'What will people see in their inbox? Make it catchy!',
    },
    sender_email: {
      label: 'Your Email Address',
      placeholder: 'e.g., hello@yourcompany.com',
      helpText: 'The email address people will see as the sender',
    },
    sender_name: {
      label: 'Your Name or Company Name',
      placeholder: 'e.g., Sarah from ABC Company',
      helpText: 'How you want to appear in people\'s inboxes',
    },
    api_key: {
      label: 'Connection Code',
      placeholder: 'Paste your connection code here',
      helpText: 'This code lets us connect to your account. Find it in your account settings.',
    },
    auth_token: {
      label: 'Secret Password',
      placeholder: 'Paste your secret password here',
      helpText: 'Keep this private - it\'s like a password for the connection',
    },
    account_sid: {
      label: 'Account ID',
      placeholder: 'Starts with AC...',
      helpText: 'Your unique account identifier',
    },
    phone_number: {
      label: 'Phone Number',
      placeholder: 'e.g., +1234567890',
      helpText: 'Include the country code (the + and numbers before your phone number)',
    },
    list_id: {
      label: 'Contact Group',
      placeholder: 'Select a group',
      helpText: 'Which group of contacts do you want to reach?',
    },
    webhook_url: {
      label: 'Notification Web Address',
      placeholder: 'https://...',
      helpText: 'Where should we send updates? (Advanced)',
    },
    endpoint_url: {
      label: 'Connection Address',
      placeholder: 'https://...',
      helpText: 'The web address to connect to',
    },
    access_token: {
      label: 'Access Code',
      placeholder: 'Paste your access code here',
      helpText: 'This code gives us permission to connect',
    },
    portal_id: {
      label: 'Account Number',
      placeholder: 'e.g., 12345678',
      helpText: 'Your unique account number',
    },
    realm_name: {
      label: 'Account Space',
      placeholder: 'e.g., yourcompany',
      helpText: 'Your account or workspace name',
    },
    message_content: {
      label: 'Your Message',
      placeholder: 'Type your message here...',
      helpText: 'What do you want to say?',
    },
    recipient_list: {
      label: 'Who should receive this?',
      placeholder: 'Select recipients',
      helpText: 'Choose who you want to send this to',
    },
    campaign_name: {
      label: 'Campaign Name',
      placeholder: 'e.g., Summer Sale 2025',
      helpText: 'Give this campaign a name so you can find it later',
    },
    email_content: {
      label: 'Email Message',
      placeholder: 'Write your email message here...',
      helpText: 'What do you want to tell your contacts?',
    },
    sms_content: {
      label: 'Text Message',
      placeholder: 'Type your text message (160 characters max)',
      helpText: 'Keep it short and clear - text messages are best under 160 characters',
    },
  };

  return labels[fieldType] || { label: fieldType, placeholder: '', helpText: '' };
}

/**
 * Get friendly section headers
 */
export function getFriendlySectionTitle(section: string): string {
  const sections: Record<string, string> = {
    'api_keys': 'Connect Your Tools',
    'webhooks': 'Notifications & Updates',
    'integrations': 'Connected Apps',
    'subscription': 'Your Plan',
    'billing': 'Payments & Invoices',
    'team_management': 'Your Team',
    'notifications': 'Alerts & Reminders',
    'profile': 'Your Information',
    'company': 'Business Details',
    'advanced': 'Advanced Options',
    'security': 'Privacy & Security',
  };

  return sections[section] || section;
}

/**
 * Get friendly button text
 */
export function getFriendlyButtonText(action: string): string {
  const buttons: Record<string, string> = {
    'submit': 'Save',
    'save': 'Save Changes',
    'cancel': 'Go Back',
    'delete': 'Remove',
    'create': 'Create',
    'update': 'Update',
    'send': 'Send Now',
    'schedule': 'Schedule for Later',
    'test': 'Try It Out',
    'connect': 'Connect',
    'disconnect': 'Disconnect',
    'sync': 'Sync Now',
    'import': 'Bring In Data',
    'export': 'Download Data',
    'upload': 'Upload File',
    'download': 'Download',
    'configure': 'Set Up',
    'enable': 'Turn On',
    'disable': 'Turn Off',
  };

  return buttons[action] || action;
}

/**
 * Get friendly status text
 */
export function getFriendlyStatus(status: string): string {
  const statuses: Record<string, string> = {
    'active': 'Active',
    'inactive': 'Not Active',
    'pending': 'Waiting',
    'processing': 'Working on it...',
    'completed': 'Done!',
    'failed': 'Didn\'t work',
    'draft': 'Not sent yet',
    'sent': 'Sent!',
    'scheduled': 'Scheduled',
    'paused': 'Paused',
    'cancelled': 'Cancelled',
    'delivered': 'Delivered',
    'opened': 'Opened',
    'clicked': 'Clicked',
    'bounced': 'Couldn\'t deliver',
    'unsubscribed': 'Unsubscribed',
  };

  return statuses[status.toLowerCase()] || status;
}

/**
 * Get friendly term replacements
 * Maps technical jargon to user-friendly terms
 */
export function getFriendlyTerm(technicalTerm: string): string {
  const terms: Record<string, string> = {
    // Core terminology
    'api_key': 'Connection Code',
    'api key': 'Connection Code',
    'webhook': 'Auto-sync',
    'webhooks': 'Auto-sync',
    'oauth': 'Quick Connect',
    'integration': 'Connection',
    'integrations': 'Connections',
    'crm': 'My Contacts',
    'subscriber': 'Contact',
    'subscribers': 'Contacts',
    'list': 'Contact Group',
    'lists': 'Contact Groups',
    'template': 'Ready-made Message',
    'templates': 'Ready-made Messages',
    'automation': 'Auto-pilot Messages',
    'automations': 'Auto-pilot Messages',
    'campaign': 'Campaign', // Keep as is - natural term
    'campaigns': 'Campaigns',
    'lead': 'Contact',
    'leads': 'Contacts',
    
    // Additional technical terms
    'endpoint': 'Connection Address',
    'credentials': 'Login Information',
    'authentication': 'Sign In',
    'authorization': 'Permission',
    'sync': 'Update',
    'syncing': 'Updating',
    'synced': 'Updated',
    'deploy': 'Publish',
    'deployment': 'Publishing',
    'repository': 'Files',
    'database': 'Storage',
    'server': 'System',
    'client': 'App',
    'backend': 'System',
    'frontend': 'Display',
  };

  return terms[technicalTerm.toLowerCase()] || technicalTerm;
}

/**
 * Get friendly page titles
 */
export function getFriendlyPageTitle(page: string): { title: string; description: string } {
  const pages: Record<string, { title: string; description: string }> = {
    'dashboard': {
      title: 'Dashboard',
      description: 'Your business overview at a glance',
    },
    'crm': {
      title: 'My Contacts',
      description: 'People interested in your business',
    },
    'leads': {
      title: 'My Contacts',
      description: 'Manage your customer relationships',
    },
    'email-marketing': {
      title: 'Email Campaigns',
      description: 'Send emails to your contacts',
    },
    'sms-marketing': {
      title: 'Text Messages',
      description: 'Send text messages to your contacts',
    },
    'whatsapp-marketing': {
      title: 'WhatsApp Messages',
      description: 'Send messages on WhatsApp',
    },
    'campaigns': {
      title: 'Campaigns',
      description: 'Send messages to your contacts',
    },
    'templates': {
      title: 'Ready-made Messages',
      description: 'Pre-written messages you can customize and send',
    },
    'automations': {
      title: 'Auto-pilot Messages',
      description: 'Set up messages that send automatically',
    },
    'subscribers': {
      title: 'Contacts',
      description: 'Your email contact lists',
    },
    'settings': {
      title: 'Settings',
      description: 'Manage your account and connections',
    },
    'integrations': {
      title: 'Connections',
      description: 'Apps and services you\'ve connected',
    },
    'api-keys': {
      title: 'Connect Your Tools',
      description: 'Link your favorite apps and services',
    },
  };

  return pages[page.toLowerCase()] || { title: page, description: '' };
}

/**
 * Get friendly category names for service integrations
 */
export function getFriendlyCategory(category: string): string {
  const categories: Record<string, string> = {
    'ai': 'Smart Tools',
    'whatsapp': 'WhatsApp',
    'sms': 'Text Messages',
    'email': 'Email',
    'crm': 'Contact Tools',
    'multichannel': 'All-in-One Tools',
    'automation': 'Auto-pilot Tools',
  };

  return categories[category.toLowerCase()] || category;
}

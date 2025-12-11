/**
 * Friendly Messages
 * 
 * Provides user-friendly error messages, success messages, and loading states.
 * Translates technical errors into plain language that non-technical users can understand.
 */

export type MessageType = 
  | 'error'
  | 'success'
  | 'info'
  | 'warning'
  | 'loading';

export interface FriendlyMessage {
  title: string;
  description: string;
  action?: string;
}

/**
 * Get friendly error message based on error type or code
 */
export function getFriendlyError(errorCode: string, context?: string): FriendlyMessage {
  const errors: Record<string, FriendlyMessage> = {
    // Authentication errors
    'auth/user-not-found': {
      title: 'Account Not Found',
      description: 'We couldn\'t find an account with that email address.',
      action: 'Double-check your email or create a new account',
    },
    'auth/wrong-password': {
      title: 'Incorrect Password',
      description: 'The password you entered doesn\'t match our records.',
      action: 'Try again or reset your password',
    },
    'auth/invalid-email': {
      title: 'Invalid Email',
      description: 'That doesn\'t look like a valid email address.',
      action: 'Please check the email format',
    },
    'auth/too-many-requests': {
      title: 'Too Many Attempts',
      description: 'You\'ve tried too many times. Please wait a bit.',
      action: 'Try again in a few minutes',
    },
    'auth/network-request-failed': {
      title: 'Connection Problem',
      description: 'We couldn\'t connect to the internet.',
      action: 'Check your internet connection and try again',
    },
    'auth/invalid-credential': {
      title: 'Login Issue',
      description: 'We couldn\'t log you in with those credentials.',
      action: 'Check your email and password, then try again',
    },

    // API/Integration errors
    'api/unauthorized': {
      title: 'Permission Denied',
      description: 'You don\'t have permission to do this.',
      action: 'Contact your admin if you need access',
    },
    'api/not-found': {
      title: 'Not Found',
      description: 'We couldn\'t find what you\'re looking for.',
      action: 'It may have been deleted or moved',
    },
    'api/rate-limit': {
      title: 'Slow Down',
      description: 'You\'re doing that too quickly.',
      action: 'Wait a moment and try again',
    },
    'api/server-error': {
      title: 'Something Went Wrong',
      description: 'Our system had a hiccup.',
      action: 'Please try again in a moment',
    },
    'api/timeout': {
      title: 'Taking Too Long',
      description: 'The request took too long to complete.',
      action: 'Try again - it might work faster this time',
    },
    'api/invalid-key': {
      title: 'Connection Code Not Working',
      description: 'The connection code you entered isn\'t valid.',
      action: 'Double-check the code or get a new one',
    },

    // Brevo errors
    'brevo/not-configured': {
      title: 'Email Not Set Up Yet',
      description: 'You need to connect your email service first.',
      action: 'Go to Settings to add your connection code',
    },
    'brevo/invalid-key': {
      title: 'Email Connection Not Working',
      description: 'Your email connection code isn\'t working.',
      action: 'Check your connection code in Settings',
    },
    'brevo/send-failed': {
      title: 'Couldn\'t Send Email',
      description: 'We had trouble sending your email.',
      action: 'Check your connection and try again',
    },

    // Twilio errors
    'twilio/not-configured': {
      title: 'Text Messages Not Set Up',
      description: 'You need to connect your texting service first.',
      action: 'Go to Settings to set up text messaging',
    },
    'twilio/invalid-credentials': {
      title: 'Texting Connection Not Working',
      description: 'Your texting service credentials aren\'t working.',
      action: 'Check your settings and update your connection',
    },
    'twilio/send-failed': {
      title: 'Couldn\'t Send Text',
      description: 'We had trouble sending your text message.',
      action: 'Check the phone number and try again',
    },

    // Validation errors
    'validation/required-field': {
      title: 'Missing Information',
      description: 'Please fill in all required fields.',
      action: 'Look for fields marked with a red *',
    },
    'validation/invalid-email': {
      title: 'Invalid Email',
      description: 'That doesn\'t look like a valid email address.',
      action: 'Check for typos (needs @ and a domain)',
    },
    'validation/invalid-phone': {
      title: 'Invalid Phone Number',
      description: 'That doesn\'t look like a valid phone number.',
      action: 'Include country code (like +1 for US)',
    },
    'validation/too-long': {
      title: 'Too Long',
      description: context || 'That\'s too many characters.',
      action: 'Please shorten your text',
    },
    'validation/too-short': {
      title: 'Too Short',
      description: context || 'That\'s not enough characters.',
      action: 'Please add more detail',
    },

    // Data errors
    'data/not-found': {
      title: 'Not Found',
      description: 'We couldn\'t find that item.',
      action: 'It may have been deleted',
    },
    'data/duplicate': {
      title: 'Already Exists',
      description: 'That item already exists.',
      action: 'Try a different name or update the existing one',
    },
    'data/load-failed': {
      title: 'Couldn\'t Load Data',
      description: 'We had trouble loading your information.',
      action: 'Refresh the page and try again',
    },
    'data/save-failed': {
      title: 'Couldn\'t Save',
      description: 'We couldn\'t save your changes.',
      action: 'Check your connection and try again',
    },

    // Upload errors
    'upload/file-too-large': {
      title: 'File Too Big',
      description: context || 'That file is too large to upload.',
      action: 'Try a smaller file (under 5MB)',
    },
    'upload/invalid-type': {
      title: 'Wrong File Type',
      description: context || 'We can\'t accept that type of file.',
      action: 'Please use a supported file format',
    },
    'upload/failed': {
      title: 'Upload Failed',
      description: 'We couldn\'t upload your file.',
      action: 'Check your connection and try again',
    },

    // Generic errors
    'generic/unknown': {
      title: 'Oops!',
      description: 'Something unexpected happened.',
      action: 'Please try again',
    },
    'generic/network': {
      title: 'Connection Issue',
      description: 'We couldn\'t connect to the internet.',
      action: 'Check your connection and try again',
    },
  };

  return errors[errorCode] || {
    title: 'Something Went Wrong',
    description: context || 'An unexpected error occurred.',
    action: 'Please try again or contact support',
  };
}

/**
 * Get friendly success message
 */
export function getFriendlySuccess(action: string, context?: string): FriendlyMessage {
  const successes: Record<string, FriendlyMessage> = {
    'email/sent': {
      title: 'Email Sent! 📧',
      description: context || 'Your email is on its way to your contacts.',
    },
    'sms/sent': {
      title: 'Text Sent! 💬',
      description: context || 'Your text message was delivered.',
    },
    'campaign/created': {
      title: 'Campaign Created! 🎉',
      description: context || 'Your campaign is ready to send.',
    },
    'lead/added': {
      title: 'Contact Added! ✅',
      description: context || 'Your new contact has been saved.',
    },
    'lead/updated': {
      title: 'Contact Updated! ✅',
      description: context || 'Changes saved successfully.',
    },
    'card/created': {
      title: 'Card Created! 🎴',
      description: context || 'Your digital card is ready to share.',
    },
    'save/success': {
      title: 'Saved! ✅',
      description: context || 'Your changes have been saved.',
    },
    'sync/complete': {
      title: 'Sync Complete! 🔄',
      description: context || 'Your data is up to date.',
    },
    'connect/success': {
      title: 'Connected! 🔗',
      description: context || 'Your connection is working.',
    },
    'import/success': {
      title: 'Import Complete! 📥',
      description: context || 'Your data has been imported.',
    },
    'delete/success': {
      title: 'Deleted! 🗑️',
      description: context || 'The item has been removed.',
    },
  };

  return successes[action] || {
    title: 'Success!',
    description: context || 'Action completed successfully.',
  };
}

/**
 * Get friendly loading message
 */
export function getFriendlyLoading(action: string): string {
  const loadingMessages: Record<string, string> = {
    'auth/login': 'Logging you in...',
    'auth/signup': 'Creating your account...',
    'email/sending': 'Sending your email...',
    'sms/sending': 'Sending your text...',
    'ai/generating': 'AI is writing for you...',
    'data/loading': 'Getting your data...',
    'data/saving': 'Saving your changes...',
    'sync/progress': 'Syncing your data...',
    'upload/progress': 'Uploading your file...',
    'delete/progress': 'Removing...',
    'connect/progress': 'Connecting...',
    'import/progress': 'Bringing in your data...',
    'export/progress': 'Preparing your download...',
    'generic': 'Working on it...',
  };

  return loadingMessages[action] || 'Working on it...';
}

/**
 * Get friendly info message
 */
export function getFriendlyInfo(infoType: string, context?: string): FriendlyMessage {
  const infoMessages: Record<string, FriendlyMessage> = {
    'email/no-contacts': {
      title: 'No Contacts Yet',
      description: 'Add some contacts first, then you can send them emails.',
      action: 'Go to Contacts to add people',
    },
    'api/not-configured': {
      title: 'Not Connected Yet',
      description: context || 'You need to connect this service first.',
      action: 'Go to Settings to set it up',
    },
    'onboarding/incomplete': {
      title: 'Almost There!',
      description: 'Complete your setup to unlock all features.',
      action: 'Finish your setup now',
    },
    'trial/expiring': {
      title: 'Trial Ending Soon',
      description: context || 'Your trial is ending soon.',
      action: 'Upgrade to keep using all features',
    },
    'quota/warning': {
      title: 'Running Low',
      description: context || 'You\'re running low on credits.',
      action: 'Upgrade your plan to get more',
    },
  };

  return infoMessages[infoType] || {
    title: 'Info',
    description: context || 'Here\'s something you should know.',
  };
}

/**
 * Get friendly warning message
 */
export function getFriendlyWarning(warningType: string, context?: string): FriendlyMessage {
  const warnings: Record<string, FriendlyMessage> = {
    'delete/confirm': {
      title: 'Are You Sure?',
      description: context || 'This action can\'t be undone.',
      action: 'Make sure this is what you want to do',
    },
    'quota/exceeded': {
      title: 'Limit Reached',
      description: context || 'You\'ve used all your credits for this month.',
      action: 'Upgrade your plan or wait until next month',
    },
    'unsaved/changes': {
      title: 'Unsaved Changes',
      description: 'You have unsaved changes that will be lost.',
      action: 'Save your work before leaving',
    },
    'connection/lost': {
      title: 'Connection Lost',
      description: 'Your internet connection is unstable.',
      action: 'Your work might not save automatically',
    },
  };

  return warnings[warningType] || {
    title: 'Warning',
    description: context || 'Please be careful with this action.',
  };
}

/**
 * Convert technical error message to friendly message
 */
export function convertErrorToFriendly(error: any): FriendlyMessage {
  if (!error) {
    return getFriendlyError('generic/unknown');
  }

  const errorMessage = error.message || error.toString();
  const errorCode = error.code;

  if (errorCode) {
    return getFriendlyError(errorCode, errorMessage);
  }

  if (errorMessage.toLowerCase().includes('network')) {
    return getFriendlyError('generic/network');
  }

  if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('unauthorized')) {
    return getFriendlyError('api/unauthorized');
  }

  if (errorMessage.toLowerCase().includes('not found')) {
    return getFriendlyError('data/not-found');
  }

  if (errorMessage.toLowerCase().includes('timeout')) {
    return getFriendlyError('api/timeout');
  }

  return {
    title: 'Something Went Wrong',
    description: 'We encountered an unexpected problem.',
    action: 'Please try again or contact support if this keeps happening',
  };
}

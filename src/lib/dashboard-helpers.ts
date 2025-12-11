/**
 * Dashboard Helper Functions
 * 
 * Provides user-friendly descriptions, insights, and suggestions for dashboard metrics.
 * Translates technical jargon into plain language for non-technical users.
 */

export type MetricType = 
  | 'leads'
  | 'ai_credits'
  | 'email_campaigns'
  | 'sms_sent'
  | 'digital_cards'
  | 'tasks'
  | 'team_members';

export interface MetricInsight {
  title: string;
  subtitle: string;
  description: string;
  actionHint?: string;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

/**
 * Get friendly metric title and subtitle
 */
export function getFriendlyMetricLabels(metricType: MetricType): { title: string; subtitle: string } {
  const labels: Record<MetricType, { title: string; subtitle: string }> = {
    leads: {
      title: 'Your Contacts',
      subtitle: 'People you\'re connected with',
    },
    ai_credits: {
      title: 'AI Assists This Month',
      subtitle: 'Smart tools helping you',
    },
    email_campaigns: {
      title: 'Email Campaigns Sent',
      subtitle: 'Messages to your audience',
    },
    sms_sent: {
      title: 'Text Messages Sent',
      subtitle: 'Recent SMS activity',
    },
    digital_cards: {
      title: 'Digital Business Cards',
      subtitle: 'Your team\'s online presence',
    },
    tasks: {
      title: 'Active Tasks',
      subtitle: 'Things to follow up on',
    },
    team_members: {
      title: 'Team Members',
      subtitle: 'People on your team',
    },
  };

  return labels[metricType] || { title: metricType, subtitle: '' };
}

/**
 * Get contextual insight based on metric value
 */
export function getMetricInsight(metricType: MetricType, value: number, limit?: number): MetricInsight {
  switch (metricType) {
    case 'leads':
      return getLeadsInsight(value);
    
    case 'ai_credits':
      return getAICreditsInsight(value, limit || 1000);
    
    case 'email_campaigns':
      return getEmailCampaignsInsight(value);
    
    case 'sms_sent':
      return getSMSInsight(value);
    
    case 'digital_cards':
      return getDigitalCardsInsight(value);
    
    case 'tasks':
      return getTasksInsight(value);
    
    case 'team_members':
      return getTeamMembersInsight(value);
    
    default:
      return {
        title: 'Metric',
        subtitle: 'Current value',
        description: `You have ${value.toLocaleString()}`,
        status: 'good',
      };
  }
}

/**
 * Get actionable suggestion based on metric
 */
export function getActionSuggestion(metricType: MetricType, value: number, limit?: number): string {
  switch (metricType) {
    case 'leads':
      if (value === 0) return 'Add your first contact to get started';
      if (value < 10) return 'Import contacts to grow faster';
      if (value < 50) return 'Keep building your network';
      return 'Great! Consider segmenting your contacts';
    
    case 'ai_credits':
      if (!limit) return 'Use AI tools to save time';
      const usagePercent = (value / limit) * 100;
      if (usagePercent < 20) return 'Lots of AI credits available - try generating content!';
      if (usagePercent < 50) return 'Good usage - AI is helping you work smarter';
      if (usagePercent < 80) return 'Watch your AI usage - consider upgrading if needed';
      if (usagePercent < 100) return 'Running low on AI credits - upgrade or add your API key';
      return 'AI credits used up - upgrade plan or wait for reset';
    
    case 'email_campaigns':
      if (value === 0) return 'Send your first email campaign';
      if (value < 5) return 'Consistency is key - keep sending!';
      return 'Great job staying in touch with your audience';
    
    case 'sms_sent':
      if (value === 0) return 'Try sending a text message to a contact';
      if (value < 10) return 'SMS is powerful - use it for urgent updates';
      return 'Nice! You\'re using text messages effectively';
    
    case 'digital_cards':
      if (value === 0) return 'Create your first digital business card';
      if (value < 3) return 'Create cards for your team members';
      return 'Share your digital cards with prospects';
    
    case 'tasks':
      if (value === 0) return 'All caught up! Great work';
      if (value < 5) return 'Just a few tasks left';
      if (value < 15) return 'Stay on top of your tasks';
      return 'Lots of tasks - prioritize the important ones';
    
    case 'team_members':
      if (value === 1) return 'Invite team members to collaborate';
      if (value < 5) return 'Grow your team as your business scales';
      return 'Manage team permissions in Settings';
    
    default:
      return '';
  }
}

// Private helper functions for detailed insights

function getLeadsInsight(count: number): MetricInsight {
  if (count === 0) {
    return {
      title: 'No contacts yet',
      subtitle: 'People you\'re connected with',
      description: 'Add your first contact to start building relationships',
      actionHint: 'Add your first contact',
      status: 'needs_attention',
    };
  }
  
  if (count < 10) {
    return {
      title: `${count} ${count === 1 ? 'contact' : 'contacts'}`,
      subtitle: 'Just getting started',
      description: 'You\'re building your network. Keep adding contacts!',
      actionHint: 'Import more contacts',
      status: 'good',
    };
  }
  
  if (count < 100) {
    return {
      title: `${count} contacts`,
      subtitle: 'Growing network',
      description: 'Your contact list is growing nicely',
      actionHint: 'Segment contacts by category',
      status: 'good',
    };
  }
  
  return {
    title: `${count.toLocaleString()} contacts`,
    subtitle: 'Strong network',
    description: 'Excellent! You have a solid contact base to work with',
    status: 'excellent',
  };
}

function getAICreditsInsight(used: number, limit: number): MetricInsight {
  const usagePercent = (used / limit) * 100;
  
  if (usagePercent < 20) {
    return {
      title: `${used.toLocaleString()} of ${limit.toLocaleString()} used`,
      subtitle: 'Plenty available',
      description: 'You have lots of AI credits left this month',
      actionHint: 'Try AI content generation',
      status: 'excellent',
    };
  }
  
  if (usagePercent < 50) {
    return {
      title: `${used.toLocaleString()} of ${limit.toLocaleString()} used`,
      subtitle: 'Good usage',
      description: 'AI is helping you work smarter',
      status: 'good',
    };
  }
  
  if (usagePercent < 80) {
    return {
      title: `${used.toLocaleString()} of ${limit.toLocaleString()} used`,
      subtitle: 'Watch usage',
      description: 'You\'re using AI tools actively',
      actionHint: 'Consider upgrading if needed',
      status: 'good',
    };
  }
  
  if (usagePercent < 100) {
    return {
      title: `${used.toLocaleString()} of ${limit.toLocaleString()} used`,
      subtitle: 'Running low',
      description: 'You\'re almost out of AI credits for this month',
      actionHint: 'Upgrade plan or add your API key',
      status: 'needs_attention',
    };
  }
  
  return {
    title: 'AI credits used up',
    subtitle: 'Limit reached',
    description: 'You\'ve used all AI credits. They reset next month.',
    actionHint: 'Upgrade to get more credits',
    status: 'critical',
  };
}

function getEmailCampaignsInsight(count: number): MetricInsight {
  if (count === 0) {
    return {
      title: 'No campaigns sent yet',
      subtitle: 'Messages to your audience',
      description: 'Send your first email campaign to reach your contacts',
      actionHint: 'Create your first campaign',
      status: 'needs_attention',
    };
  }
  
  if (count < 5) {
    return {
      title: `${count} ${count === 1 ? 'campaign' : 'campaigns'} sent`,
      subtitle: 'Getting started',
      description: 'Keep the momentum going with regular emails',
      actionHint: 'Stay consistent',
      status: 'good',
    };
  }
  
  return {
    title: `${count} campaigns sent`,
    subtitle: 'Active communicator',
    description: 'Great! You\'re staying connected with your audience',
    status: 'excellent',
  };
}

function getSMSInsight(count: number): MetricInsight {
  if (count === 0) {
    return {
      title: 'No texts sent',
      subtitle: 'Recent SMS activity',
      description: 'Send text messages for urgent or personal outreach',
      actionHint: 'Try sending an SMS',
      status: 'good',
    };
  }
  
  if (count < 10) {
    return {
      title: `${count} ${count === 1 ? 'text' : 'texts'} sent`,
      subtitle: 'Last 7 days',
      description: 'SMS is great for time-sensitive messages',
      status: 'good',
    };
  }
  
  return {
    title: `${count} texts sent`,
    subtitle: 'Active texting',
    description: 'You\'re using SMS effectively to reach contacts',
    status: 'excellent',
  };
}

function getDigitalCardsInsight(count: number): MetricInsight {
  if (count === 0) {
    return {
      title: 'No digital cards yet',
      subtitle: 'Your team\'s online presence',
      description: 'Create digital business cards for instant sharing',
      actionHint: 'Create your first card',
      status: 'needs_attention',
    };
  }
  
  if (count < 3) {
    return {
      title: `${count} ${count === 1 ? 'card' : 'cards'} created`,
      subtitle: 'Good start',
      description: 'Create cards for more team members',
      actionHint: 'Add team cards',
      status: 'good',
    };
  }
  
  return {
    title: `${count} cards active`,
    subtitle: 'Team covered',
    description: 'Your team has a professional online presence',
    status: 'excellent',
  };
}

function getTasksInsight(count: number): MetricInsight {
  if (count === 0) {
    return {
      title: 'All caught up!',
      subtitle: 'Things to follow up on',
      description: 'No pending tasks. Great work!',
      status: 'excellent',
    };
  }
  
  if (count < 5) {
    return {
      title: `${count} ${count === 1 ? 'task' : 'tasks'}`,
      subtitle: 'Almost done',
      description: 'Just a few tasks left to complete',
      status: 'good',
    };
  }
  
  if (count < 15) {
    return {
      title: `${count} tasks`,
      subtitle: 'Stay focused',
      description: 'Work through your tasks one by one',
      actionHint: 'Prioritize important ones',
      status: 'good',
    };
  }
  
  return {
    title: `${count} tasks`,
    subtitle: 'Busy schedule',
    description: 'You have a lot on your plate. Prioritize what matters.',
    actionHint: 'Focus on high-priority items',
    status: 'needs_attention',
  };
}

function getTeamMembersInsight(count: number): MetricInsight {
  if (count === 1) {
    return {
      title: 'Just you',
      subtitle: 'People on your team',
      description: 'Invite team members to collaborate',
      actionHint: 'Add team members',
      status: 'good',
    };
  }
  
  if (count < 5) {
    return {
      title: `${count} team members`,
      subtitle: 'Small team',
      description: 'Your team is set up and ready to collaborate',
      status: 'good',
    };
  }
  
  return {
    title: `${count} team members`,
    subtitle: 'Growing team',
    description: 'Manage roles and permissions in Settings',
    status: 'excellent',
  };
}

/**
 * Format metric change for display
 */
export function formatMetricChange(current: number, previous: number): {
  text: string;
  isPositive: boolean;
} {
  if (previous === 0) {
    return {
      text: current > 0 ? 'Getting started' : 'No activity yet',
      isPositive: current > 0,
    };
  }
  
  const change = current - previous;
  const percentChange = ((change / previous) * 100).toFixed(0);
  
  if (change > 0) {
    return {
      text: `+${percentChange}% from last period`,
      isPositive: true,
    };
  }
  
  if (change < 0) {
    return {
      text: `${percentChange}% from last period`,
      isPositive: false,
    };
  }
  
  return {
    text: 'No change',
    isPositive: true,
  };
}

/**
 * Get metric status color
 */
export function getMetricStatusColor(status: MetricInsight['status']): string {
  const colors = {
    excellent: 'text-green-600 dark:text-green-400',
    good: 'text-blue-600 dark:text-blue-400',
    needs_attention: 'text-orange-600 dark:text-orange-400',
    critical: 'text-red-600 dark:text-red-400',
  };
  
  return colors[status] || colors.good;
}

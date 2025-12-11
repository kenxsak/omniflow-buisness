export type ActivityType = 'email' | 'sms' | 'whatsapp' | 'call' | 'meeting' | 'note' | 'task' | 'deal_created' | 'deal_updated' | 'status_change';

export interface Activity {
  id: string;
  companyId: string;
  contactId: string;
  type: ActivityType;
  subject?: string;
  content: string;
  author: string;
  authorName?: string;
  occurredAt: Date | string;
  createdAt: Date | string;
  metadata?: {
    campaignId?: string;
    campaignName?: string;
    dealId?: string;
    oldStatus?: string;
    newStatus?: string;
    channel?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    [key: string]: any;
  };
}

export type DealStatus = 'proposal' | 'negotiation' | 'closing' | 'won' | 'lost';

export interface Deal {
  id: string;
  companyId: string;
  name: string;
  amount: number;
  currency: string;
  probability: number;
  status: DealStatus;
  expectedCloseDate?: Date | string;
  actualCloseDate?: Date | string;
  contactId: string;
  contactName?: string;
  pipelineId?: string;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DealStats {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalPipelineValue: number;
  wonValue: number;
  avgDealSize: number;
  avgProbability: number;
  conversionRate: number;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
  completed: boolean;
  completedAt?: string;
}

export const DEFAULT_ONBOARDING_STEPS: Omit<OnboardingStep, 'completed' | 'completedAt'>[] = [
  {
    id: 'add_contacts',
    title: 'Add Your First Contacts',
    description: 'Import your existing contacts or add them manually to get started',
    action: 'Add Contacts',
    actionUrl: '/crm',
  },
  {
    id: 'setup_pipeline',
    title: 'Set Up Your Sales Pipeline',
    description: 'Customize your pipeline stages to match your sales process',
    action: 'View Pipeline',
    actionUrl: '/crm/pipeline',
  },
  {
    id: 'create_deal',
    title: 'Create Your First Deal',
    description: 'Track opportunities by creating deals linked to contacts',
    action: 'Create Deal',
    actionUrl: '/crm/pipeline',
  },
  {
    id: 'send_campaign',
    title: 'Send Your First Campaign',
    description: 'Reach out to your contacts with an email, SMS, or WhatsApp campaign',
    action: 'Send Campaign',
    actionUrl: '/campaigns',
  },
  {
    id: 'try_ai',
    title: 'Try AI Content Generation',
    description: 'Let AI help you create compelling marketing content',
    action: 'Try AI',
    actionUrl: '/ai-assistant',
  },
];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  call: 'Phone Call',
  meeting: 'Meeting',
  note: 'Note',
  task: 'Task',
  deal_created: 'Deal Created',
  deal_updated: 'Deal Updated',
  status_change: 'Status Changed',
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  email: 'Mail',
  sms: 'MessageSquare',
  whatsapp: 'MessageCircle',
  call: 'Phone',
  meeting: 'Calendar',
  note: 'StickyNote',
  task: 'CheckSquare',
  deal_created: 'DollarSign',
  deal_updated: 'TrendingUp',
  status_change: 'RefreshCw',
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closing: 'Closing',
  won: 'Won',
  lost: 'Lost',
};

export const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  proposal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  negotiation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  closing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

export const DEFAULT_PROBABILITIES: Record<DealStatus, number> = {
  proposal: 20,
  negotiation: 50,
  closing: 80,
  won: 100,
  lost: 0,
};

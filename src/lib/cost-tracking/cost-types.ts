export interface CostMetrics {
  firebaseReads: number;
  firebaseWrites: number;
  aiUsage: number;
  emailsSent: number;
  smsSent: number;
  whatsappSent: number;
}

export interface CompanyBudget {
  companyId: string;
  monthlyBudget: number;
  dailyLimit: number;
  currentMonthSpent: number;
  alertThreshold: number;
  blockThreshold: number;
  lastAlertSent?: Date;
  isBlocked: boolean;
}

export interface DailyCostRecord {
  companyId: string;
  date: string;
  firebase: {
    reads: number;
    writes: number;
    deletes: number;
    cost: number;
  };
  ai: {
    textTokens: number;
    imageCount: number;
    ttsCount: number;
    cost: number;
  };
  messaging: {
    emailsSent: number;
    smsSent: number;
    whatsappSent: number;
    cost: number;
  };
  totalCost: number;
  updatedAt: Date;
}

export interface CostAlert {
  id: string;
  companyId: string;
  type: 'warning' | 'critical' | 'blocked';
  threshold: number;
  currentSpend: number;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}

export const COST_RATES = {
  firebase: {
    read: 0.06 / 1_000_000,
    write: 0.18 / 1_000_000,
    delete: 0.02 / 1_000_000,
  },
  ai: {
    gemini_flash_input: 0.075 / 1_000_000,
    gemini_flash_output: 0.30 / 1_000_000,
    imagen_image: 0.02,
    tts_per_char: 0.000016,
  },
  sms: {
    msg91_india: 0.0035,
    fast2sms_india: 0.0035,
    twilio_global: 0.0075,
  },
  email: {
    brevo_bulk: 0.0001,
    sender_bulk: 0.0001,
    smtp_custom: 0.0002,
  },
  whatsapp: {
    aisensy: 0.003,
    wati: 0.004,
    gupshup: 0.003,
    meta_direct: 0.005,
  },
} as const;

export const DEFAULT_BUDGET_SETTINGS = {
  monthlyBudget: 100,
  alertThreshold: 80,
  blockThreshold: 100,
} as const;

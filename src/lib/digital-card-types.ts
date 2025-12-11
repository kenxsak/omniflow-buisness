export interface DigitalCardLink {
  id: string;
  type: 'whatsapp' | 'email' | 'phone' | 'website' | 'custom' | 'maps' | 'calendar' | 'payment';
  label: string;
  url: string;
  icon: string;
  enabled: boolean;
  order: number;
}

export interface DigitalCardSocialMedia {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  pinterest?: string;
}

export interface DigitalCardBranding {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  theme: 'modern' | 'classic' | 'minimal' | 'bold' | 'gradient';
}

export interface DigitalCardAnalytics {
  views: number;
  chatInteractions: number;
  leadsGenerated: number;
  linkClicks: { [linkId: string]: number };
  lastUpdated: any;
}

export interface DigitalCardSEO {
  title: string;
  description: string;
  keywords: string[];
}

export interface VoiceChatbotConfig {
  enabled: boolean;
  customGreeting?: string;
  position?: 'left' | 'right';
}

export interface DigitalCardContactForm {
  enabled: boolean;
  buttonText?: string;
  title?: string;
  description?: string;
}

export interface DigitalCardCalendarBooking {
  enabled: boolean;
  buttonText?: string;
  calcomUsername?: string;
  calcomEventSlug?: string;
}

export interface DigitalCard {
  id: string;
  userId: string;
  companyId: string;
  username: string;
  businessInfo: {
    name: string;
    tagline: string;
    description: string;
    logo?: string;
    coverImage?: string;
    category?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    whatsapp?: string;
    address?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  links: DigitalCardLink[];
  socialMedia: DigitalCardSocialMedia;
  contactForm?: DigitalCardContactForm;
  calendarBooking?: DigitalCardCalendarBooking;
  voiceChatbot?: VoiceChatbotConfig;
  branding: DigitalCardBranding;
  analytics: DigitalCardAnalytics;
  seo: DigitalCardSEO;
  status: 'active' | 'inactive' | 'draft';
  createdAt: any;
  updatedAt: any;
}

export type CreateDigitalCardInput = Omit<DigitalCard, 'id' | 'createdAt' | 'updatedAt' | 'analytics'>;
export type UpdateDigitalCardInput = Partial<CreateDigitalCardInput> & { id: string };

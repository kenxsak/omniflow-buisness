
export interface ApiKeyField {
  id: string; // e.g., 'apiKey', 'accountSid', 'authToken'
  label: string;
  value: string;
  isProtected?: boolean; // To indicate if it should be a password field or masked
  placeholder?: string;
  helperText?: string; // Optional helper text below the input
}

export interface ApiServiceIntegration {
  id: 'calcom' | 'brevo' | 'twilio' | 'hubspot' | 'zoho' | 'bitrix24' | 'googleAi' | 'voiceChat' | 'msg91' | 'aisensy' | 'twoFactor' | 'fast2sms' | 'interakt' | 'gupshup' | 'sender' | 'metaWhatsApp' | 'authkey' | 'smtp' | 'msg91WhatsApp' | 'fast2smsWhatsApp'; // Literal types for keys
  name: string; // e.g., 'Brevo', 'Twilio'
  description?: string;
  fields: ApiKeyField[];
  documentationLink?: string; // Link to API key documentation for the service
  affiliateLink?: string; // Affiliate partner link for sign-up
  isConfigured?: boolean; // Dynamically set based on whether keys are filled
  authType?: 'apiKey' | 'oauth' | 'other'; // Indicate auth type for clarity
}

// Represents the structure for API keys stored encrypted in Firestore (company.apiKeys)
export type StoredApiKeys = {
  [key in ApiServiceIntegration['id']]?: Record<string, string>;
};


// --- HubSpot Specific Types (Example) ---
export interface HubspotContactProperties {
    createdate?: string; // ISO 8601 date string
    email?: string;
    firstname?: string;
    lastmodifieddate?: string; // ISO 8601 date string
    lastname?: string;
    phone?: string;
    website?: string;
    company?: string;
    lifecyclestage?: string; // e.g., "lead", "marketingqualifiedlead", "customer"
    hs_object_id?: string; // HubSpot's Object ID (often same as the top-level 'id')
    // Add other HubSpot contact properties as needed
}

export interface HubspotContact {
    id: string; // The primary ID of the contact object
    properties: HubspotContactProperties;
    createdAt: string; // ISO 8601 date string
    updatedAt: string; // ISO 8601 date string
    archived: boolean;
}

export interface GetHubspotContactsResult {
    contacts?: HubspotContact[];
    total?: number; // Total contacts matching query (may not be provided by all APIs)
    success: boolean;
    error?: string;
    nextPageToken?: string; // For pagination using 'after' parameter
}

// --- Zoho Specific Types (Example - Placeholder) ---
export interface ZohoContact {
    id: string;
    First_Name?: string;
    Last_Name?: string;
    Email?: string;
    Phone?: string;
    Account_Name?: { name: string, id: string }; // Example of related field
    // Add other Zoho contact fields as needed
}

export interface GetZohoContactsResult {
    contacts?: ZohoContact[];
    success: boolean;
    error?: string;
    // Add pagination info if applicable
}


// --- Bitrix24 Specific Types (Example - Placeholder) ---
export interface Bitrix24Contact {
    ID: string;
    NAME?: string;
    LAST_NAME?: string;
    SECOND_NAME?: string;
    EMAIL?: { ID: string, VALUE: string, VALUE_TYPE: string }[]; // Bitrix24 can have multiple emails
    PHONE?: { ID: string, VALUE: string, VALUE_TYPE: string }[]; // Bitrix24 can have multiple phones
    COMPANY_ID?: string;
    // Add other Bitrix24 contact fields as needed
}
export interface GetBitrix24ContactsResult {
    contacts?: Bitrix24Contact[];
    success: boolean;
    error?: string;
    total?: number; // Bitrix24 often provides total
    next?: number; // For pagination offset
}


// --- Add/Update Hubspot Contact Types ---
export interface HubspotContactInput {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecyclestage?: string; // e.g., 'lead'
  // Add other properties you want to set/update
}

export interface AddOrUpdateHubspotContactResult {
  id?: string; // HubSpot Contact ID
  success: boolean;
  message?: string;
  isNewContact?: boolean;
}

// --- Brevo Specific Types ---
export interface BrevoAPICampaign {
  id: number;
  name: string;
  subject: string;
  type: 'classic' | 'automation' | string;
  status: 'draft' | 'sent' | 'queued' | 'suspended' | 'inProcess' | 'archive' | string;
  testSent: boolean;
  header: string;
  htmlContent?: string;
  createdAt: string;
  modifiedAt: string;
  listIds?: number[];
  templateId?: number;
  statistics?: {
    globalStats?: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      unsubscribed: number;
      softBounces: number;
      hardBounces: number;
    };
  };
  sender?: {
    name: string;
    email: string;
    id?: number;
  };
}

// --- Twilio Specific Types ---
export interface TwilioMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  status: 'queued' | 'failed' | 'sent' | 'delivered' | 'undelivered' | string;
  direction: 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply' | string;
  dateSent: string;
  price?: string;
  priceUnit?: string;
  errorCode?: number | null;
  errorMessage?: string | null;
}

// --- Sender.net Specific Types ---
export interface SenderAPICampaign {
  id: number;
  name: string;
  subject: string;
  status: 'draft' | 'sent' | 'scheduled' | 'sending' | string;
  html_content?: string;
  created_at: string;
  updated_at: string;
  list_ids?: number[];
  statistics?: {
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    bounced?: number;
    unsubscribed?: number;
  };
  sender?: {
    name: string;
    email: string;
  };
}

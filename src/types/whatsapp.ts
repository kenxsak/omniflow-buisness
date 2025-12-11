
export interface WhatsAppContact {
  id: string;
  listId: string;
  name: string;
  phoneNumber: string; // Should be stored with country code
  createdAt: string; // ISO Date string
}

export interface WhatsAppList {
  id: string;
  name: string;
  createdAt: string; // ISO Date string
  companyId: string; // To scope lists to a company
  contactCount?: number; // Optional: for displaying in the list view, dynamically calculated
}

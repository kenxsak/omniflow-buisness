import { z } from 'zod';

export const emailSchema = z.string()
  .email('Invalid email address')
  .max(254, 'Email too long')
  .transform(email => email.toLowerCase().trim());

export const phoneSchema = z.string()
  .min(7, 'Phone number too short')
  .max(20, 'Phone number too long')
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .transform(phone => phone.replace(/[\s\-\(\)]/g, ''));

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .transform(name => name.trim());

export const companyNameSchema = z.string()
  .min(1, 'Company name is required')
  .max(200, 'Company name too long')
  .transform(name => name.trim());

export const urlSchema = z.string()
  .url('Invalid URL')
  .max(2000, 'URL too long')
  .optional()
  .or(z.literal(''));

export const textContentSchema = z.string()
  .max(50000, 'Content too long')
  .transform(text => text.trim());

export const createContactSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema.optional().default(''),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  company: companyNameSchema.optional().default(''),
  jobTitle: z.string().max(100).optional().default(''),
  notes: z.string().max(5000).optional().default(''),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).default('new'),
  source: z.string().max(100).optional().default(''),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
  path: ['email'],
});

export const updateContactSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  company: companyNameSchema.optional(),
  jobTitle: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const createDealSchema = z.object({
  name: z.string().min(1, 'Deal name is required').max(200),
  amount: z.number().min(0, 'Amount must be positive').max(999999999),
  currency: z.string().length(3).default('USD'),
  probability: z.number().min(0).max(100).default(50),
  status: z.enum(['proposal', 'negotiation', 'closing', 'won', 'lost']).default('proposal'),
  expectedCloseDate: z.string().datetime().optional(),
  contactId: z.string().min(1, 'Contact is required'),
  pipelineId: z.string().optional(),
  notes: z.string().max(5000).optional().default(''),
});

export const updateDealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  amount: z.number().min(0).max(999999999).optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().min(0).max(100).optional(),
  status: z.enum(['proposal', 'negotiation', 'closing', 'won', 'lost']).optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  contactId: z.string().optional(),
  pipelineId: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

export const createActivitySchema = z.object({
  type: z.enum(['email', 'sms', 'whatsapp', 'call', 'meeting', 'note', 'task']),
  subject: z.string().max(200).optional(),
  content: z.string().max(10000),
  contactId: z.string().min(1),
  dealId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const sendEmailCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  content: z.string().min(1, 'Content is required').max(100000),
  recipientIds: z.array(z.string()).min(1, 'At least one recipient is required').max(10000),
  fromName: z.string().max(100).optional(),
  fromEmail: emailSchema.optional(),
  replyTo: emailSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const sendSmsCampaignSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1600),
  recipientIds: z.array(z.string()).min(1).max(10000),
  scheduledAt: z.string().datetime().optional(),
  templateId: z.string().optional(),
});

export const sendWhatsappCampaignSchema = z.object({
  message: z.string().min(1).max(4096),
  recipientIds: z.array(z.string()).min(1).max(1000),
  templateId: z.string().optional(),
  mediaUrl: urlSchema,
  scheduledAt: z.string().datetime().optional(),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  query: z.string().max(200).optional(),
  filters: z.record(z.any()).optional(),
}).merge(paginationSchema);

export const idSchema = z.string().min(1).max(100);

export const companyIdSchema = z.string().min(1, 'Company ID is required').max(100);

export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorMessage = result.error.errors
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
  
  return {
    success: false,
    error: errorMessage,
    details: result.error,
  };
}


"use client";

import { useState, useEffect } from 'react';
import type { Lead } from '@/lib/mock-data';
import type { AppUser } from '@/types/saas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { getCompanyUsers } from '@/lib/saas-data';

const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
];

const editLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  countryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Lost', 'Won']),
  source: z.string().min(1, 'How They Found Us is required'),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  attributes: z.object({
    COMPANY_NAME: z.string().optional(),
    ROLE: z.string().optional(),
  }).optional(),
});
type EditLeadFormData = z.infer<typeof editLeadSchema>;

interface EditLeadDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedData: Lead) => void;
}

export default function EditLeadDialog({ lead, isOpen, onOpenChange, onSave }: EditLeadDialogProps) {
  const { appUser } = useAuth();
  const [companyUsers, setCompanyUsers] = useState<AppUser[]>([]);
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EditLeadFormData>();

  useEffect(() => {
    if (isOpen && lead) {
        if(appUser?.companyId) {
            getCompanyUsers(appUser.companyId).then(users => {
                setCompanyUsers(users);
            });
        }
      
      let extractedCountryCode = '';
      let extractedPhoneNumber = '';
      
      if (lead.phone) {
        if (lead.phone.startsWith('+')) {
          const matchedCode = COUNTRY_CODES.find(cc => lead.phone?.startsWith(cc.code));
          if (matchedCode) {
            // Matched a known country code - split it
            extractedCountryCode = matchedCode.code;
            extractedPhoneNumber = lead.phone.slice(matchedCode.code.length);
          } else {
            // Unknown country code - keep phone as-is, set countryCode to "Other"
            extractedCountryCode = '_OTHER_';
            extractedPhoneNumber = lead.phone;
          }
        } else {
          // No + prefix - default to +91, user can change
          extractedCountryCode = '+91';
          extractedPhoneNumber = lead.phone;
        }
      } else {
        // No existing phone - default to +91 for new entries
        extractedCountryCode = '+91';
      }
      
      reset({
        name: lead.name,
        email: lead.email,
        countryCode: extractedCountryCode,
        phoneNumber: extractedPhoneNumber,
        status: lead.status,
        source: lead.source,
        assignedTo: lead.assignedTo || '_UNASSIGNED_',
        notes: lead.notes || '',
        attributes: {
            COMPANY_NAME: lead.attributes?.COMPANY_NAME || '',
            ROLE: lead.attributes?.ROLE || '',
        }
      });
    }
  }, [isOpen, lead, reset, appUser]);


  const onSubmit: SubmitHandler<EditLeadFormData> = (data) => {
    if (!lead) return;
    
    // Handle phone combination:
    // 1. If phoneNumber already has '+' (unsupported country code), use it as-is
    // 2. Otherwise, combine countryCode + phoneNumber
    let combinedPhone = '';
    if (data.phoneNumber) {
      const trimmedPhone = data.phoneNumber.trim();
      if (trimmedPhone.startsWith('+')) {
        // Phone already has country code (unsupported) - keep as-is
        combinedPhone = trimmedPhone;
      } else if (data.countryCode && data.countryCode !== '_OTHER_') {
        // Combine supported country code with phone number
        combinedPhone = `${data.countryCode}${trimmedPhone}`;
      } else {
        // No country code or "Other" selected - keep phone as-is
        combinedPhone = trimmedPhone;
      }
    }
    
    // Destructure to omit helper fields (countryCode, phoneNumber) before saving
    const { countryCode, phoneNumber, ...leadData } = data;
    
    onSave({
      ...lead,
      ...leadData,
      phone: combinedPhone,
      assignedTo: data.assignedTo === '_UNASSIGNED_' ? undefined : data.assignedTo,
      lastContacted: new Date().toISOString(),
      attributes: {
        ...lead.attributes,
        ...data.attributes,
      },
      notes: data.notes,
    });
    onOpenChange(false);
  };
  
  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Contact: {lead.name}</DialogTitle>
          <DialogDescription>Update the contact details below. Changes are saved locally.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`edit-name-${lead.id}`} className="text-right">Name</Label>
            <Controller name="name" control={control} render={({ field }) => <Input id={`edit-name-${lead.id}`} {...field} className="col-span-3" />} />
            {errors.name && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`edit-email-${lead.id}`} className="text-right">Email</Label>
            <Controller name="email" control={control} render={({ field }) => <Input id={`edit-email-${lead.id}`} type="email" {...field} className="col-span-3" />} />
            {errors.email && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Phone</Label>
            <div className="col-span-3 flex gap-2">
              <Controller 
                name="countryCode" 
                control={control} 
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-[30%]">
                      <SelectValue placeholder="Code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_OTHER_">🌍 Other</SelectItem>
                      {COUNTRY_CODES.map(({ code, country, flag }) => (
                        <SelectItem key={code} value={code}>
                          {flag} {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} 
              />
              <Controller 
                name="phoneNumber" 
                control={control} 
                render={({ field }) => (
                  <Input 
                    id={`edit-phone-${lead.id}`} 
                    {...field} 
                    className="flex-1" 
                    placeholder="9876543210"
                  />
                )} 
              />
            </div>
            <p className="col-span-3 col-start-2 text-xs text-muted-foreground -mt-2">
              Select country code and enter phone number. For unsupported codes, select "Other" and enter full number with +.
            </p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`edit-status-${lead.id}`} className="text-right">Status</Label>
            <Controller name="status" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                </SelectContent>
              </Select>
            )} />
            {errors.status && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.status.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`edit-source-${lead.id}`} className="text-right">How They Found Us</Label>
            <Controller name="source" control={control} render={({ field }) => <Input id={`edit-source-${lead.id}`} {...field} className="col-span-3" />} />
            {errors.source && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.source.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`edit-assignedTo-${lead.id}`} className="text-right">Owner</Label>
            <Controller
              name="assignedTo"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_UNASSIGNED_">Unassigned</SelectItem>
                    {companyUsers.map(user => (
                      <SelectItem key={user.uid} value={user.email}>{user.name || user.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`edit-attr-company-${lead.id}`} className="text-right">Company Name</Label>
            <Controller name="attributes.COMPANY_NAME" control={control} render={({ field }) => <Input id={`edit-attr-company-${lead.id}`} {...field} className="col-span-3" placeholder="Contact's Company"/>} />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={`edit-attr-role-${lead.id}`} className="text-right">Role</Label>
            <Controller name="attributes.ROLE" control={control} render={({ field }) => <Input id={`edit-attr-role-${lead.id}`} {...field} className="col-span-3" placeholder="Contact's Role"/>} />
          </div>
           <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor={`edit-notes-${lead.id}`} className="text-right pt-2">Notes</Label>
            <Controller name="notes" control={control} render={({ field }) => <Textarea id={`edit-notes-${lead.id}`} {...field} className="col-span-3 min-h-[100px]" placeholder="Log interactions, next steps, or any relevant details..." />} />
            {errors.notes && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.notes.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

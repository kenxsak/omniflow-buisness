
"use client";

import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import type { AppUser } from '@/types/saas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/lib/mock-data';
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

const leadSchema = z.object({
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

// Infer type from schema for better type safety
type LeadFormData = z.infer<typeof leadSchema>;

interface AddLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLead: (leadData: LeadFormData) => Promise<void>;
}

export default function AddLeadDialog({ isOpen, onOpenChange, onAddLead }: AddLeadDialogProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [companyUsers, setCompanyUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    if (isOpen && appUser?.companyId) {
      getCompanyUsers(appUser.companyId).then(users => {
        setCompanyUsers(users);
      });
    }
  }, [isOpen, appUser]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      email: '',
      countryCode: '+91',
      phoneNumber: '',
      status: 'New',
      source: '',
      assignedTo: '_UNASSIGNED_',
      notes: '',
      attributes: {
        COMPANY_NAME: '',
        ROLE: '',
      },
    },
  });

  const getResetValues = () => ({
    name: '',
    email: '',
    countryCode: '+91',
    phoneNumber: '',
    status: 'New' as const,
    source: '',
    notes: '',
    assignedTo: '_UNASSIGNED_',
    attributes: {
      COMPANY_NAME: '',
      ROLE: '',
    },
  });

  const onSubmit: SubmitHandler<LeadFormData> = async (data) => {
    let combinedPhone = '';
    if (data.phoneNumber) {
      const trimmedPhone = data.phoneNumber.trim();
      if (trimmedPhone.startsWith('+')) {
        combinedPhone = trimmedPhone;
      } else if (data.countryCode && data.countryCode !== '_OTHER_') {
        combinedPhone = `${data.countryCode}${trimmedPhone}`;
      } else {
        combinedPhone = trimmedPhone;
      }
    }

    const { countryCode, phoneNumber, ...leadData } = data;
    
    await onAddLead({
      ...leadData,
      phone: combinedPhone,
      assignedTo: data.assignedTo === '_UNASSIGNED_' ? undefined : data.assignedTo,
    } as any); 
    reset(getResetValues());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        reset(getResetValues());
      }
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new contact. Data saved locally.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input id="name" {...field} className="col-span-3" />
              )}
            />
            {errors.name && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input id="email" type="email" {...field} className="col-span-3" />
              )}
            />
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
                    id="phone" 
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
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.status.message}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="source" className="text-right">
              How They Found Us
            </Label>
            <Controller
              name="source"
              control={control}
              render={({ field }) => (
                <Input id="source" {...field} className="col-span-3" placeholder="e.g., Website, Referral" />
              )}
            />
             {errors.source && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.source.message}</p>}
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignedTo" className="text-right">
              Owner
            </Label>
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
            <Label htmlFor="attr-company" className="text-right">Company Name</Label>
            <Controller name="attributes.COMPANY_NAME" control={control} render={({ field }) => <Input id="attr-company" {...field} className="col-span-3" placeholder="Contact's Company"/>} />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="attr-role" className="text-right">Role</Label>
            <Controller name="attributes.ROLE" control={control} render={({ field }) => <Input id="attr-role" {...field} className="col-span-3" placeholder="Contact's Role"/>} />
          </div>

           <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notes
            </Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea id="notes" {...field} className="col-span-3 min-h-[80px]" placeholder="Initial notes or comments..." />
              )}
            />
            {errors.notes && <p className="col-span-3 col-start-2 text-sm text-destructive">{errors.notes.message}</p>}
          </div>


        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(getResetValues()); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding Contact...' : 'Add Contact'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


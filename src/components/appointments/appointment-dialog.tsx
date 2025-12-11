'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppointmentForm } from './appointment-form';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { createAppointmentAction } from '@/app/actions/appointment-actions';
import type { CreateAppointmentInput, UpdateAppointmentInput } from '@/types/appointments';

export interface ContactData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: ContactData;
  onSuccess?: () => void;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: AppointmentDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateAppointmentInput | UpdateAppointmentInput) => {
    if (!appUser?.idToken) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create appointments.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const appointmentData = {
        ...(data as CreateAppointmentInput),
        clientId: contact?.id,
      };

      const result = await createAppointmentAction({
        idToken: appUser.idToken,
        input: appointmentData,
      });

      if (result.success) {
        toast({
          title: 'Appointment Scheduled',
          description: `Appointment with ${contact?.name || appointmentData.clientName} has been scheduled successfully.`,
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create appointment.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create appointment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? `Schedule Appointment with ${contact.name}` : 'Schedule New Appointment'}
          </DialogTitle>
          <DialogDescription>
            {contact
              ? 'Contact details are pre-filled. Set the appointment date, time, and reminders.'
              : 'Create a new appointment with reminder settings'}
          </DialogDescription>
        </DialogHeader>
        <AppointmentForm
          defaultContact={contact}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

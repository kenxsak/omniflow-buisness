'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, UserPlus } from 'lucide-react';

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface Step1AddLeadProps {
  onLeadAdded: (leadData: LeadFormData) => Promise<void>;
  onSkip: () => void;
}

export function Step1AddLead({ onLeadAdded, onSkip }: Step1AddLeadProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      await onLeadAdded(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add lead',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Add Your First Lead</CardTitle>
          <CardDescription className="text-base">
            Let&apos;s add your first customer or potential customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="name"
                      placeholder="John Doe"
                      {...field}
                      className="text-base h-12"
                    />
                  )}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                      className="text-base h-12"
                    />
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      {...field}
                      className="text-base h-12"
                    />
                  )}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +1 for US, +91 for India)
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                size="lg"
                className="flex-1 h-12 text-base"
                disabled={isSubmitting}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {isSubmitting ? 'Adding Lead...' : 'Add Lead'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-12 text-base"
              onClick={() => {
                toast({
                  title: 'CSV Import',
                  description: 'CSV import will be available after onboarding. For now, add one lead manually.',
                });
              }}
            >
              <Upload className="mr-2 h-5 w-5" />
              Import from CSV
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full h-12 text-base"
              onClick={onSkip}
            >
              Skip for Now
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

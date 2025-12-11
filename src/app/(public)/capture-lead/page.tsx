
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { submitPublicLeadAction, type SubmitPublicLeadInput } from '@/actions/public-lead-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

// Use the same validation schema as the server action for client-side validation
const PublicLeadSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .regex(/^\+?[1-9]\d{9,14}$/, { message: "Invalid phone number format. Please include country code." }),
  message: z.string().optional().refine(
    (message) => {
        if (!message) return true;
        const linkCount = (message.match(/http:\/\//g) || []).length + (message.match(/https:\/\//g) || []).length;
        return linkCount <= 1;
    },
    { message: "Message cannot contain multiple links." }
  ),
  website_url: z.string().nullable().optional(), // Honeypot field
  source: z.string().optional(),
});


export default function PublicLeadCapturePage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubmitPublicLeadInput>({
    resolver: zodResolver(PublicLeadSchema),
     defaultValues: {
        source: 'OmniFlow Public Form',
        website_url: '', // Ensure honeypot is empty by default
    },
  });

  const processSubmit: SubmitHandler<SubmitPublicLeadInput> = async (data) => {
    setIsSubmitting(true);
    setSubmissionResult(null);

    // Call the server action directly.
    // This action will now handle saving to the database.
    try {
      const result = await submitPublicLeadAction(data);
      setSubmissionResult(result);
      if (result.success) {
        toast({
          title: "Inquiry Submitted!",
          description: "Thank you! Your message has been successfully captured.",
        });
        reset();
      } else {
         toast({
          title: "Submission Failed",
          description: result.message || "Please check your input and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
        setSubmissionResult({ success: false, message: 'An unexpected error occurred.' });
        toast({
          title: "Error",
          description: error.message || 'An unexpected error occurred.',
          variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
     <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        {submissionResult?.success ? (
             <Card className="w-full max-w-lg text-center shadow-lg">
                <CardHeader>
                    <CardTitle className="flex flex-col items-center gap-2 text-2xl">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        Thank You!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg text-muted-foreground">{submissionResult.message}</p>
                    <p className="text-sm mt-4">Your inquiry will be added to the OmniFlow CRM.</p>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                    <Button onClick={() => setSubmissionResult(null)}>Submit Another Response</Button>
                    <p className="text-xs text-muted-foreground">
                        This service is powered by OmniFlow.
                    </p>
                </CardFooter>
            </Card>
        ) : (
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Contact Us</CardTitle>
                    <CardDescription>Fill out the form below and we'll get back to you.</CardDescription>
                </CardHeader>
                 <form onSubmit={handleSubmit(processSubmit)}>
                    <CardContent className="space-y-4">
                        {submissionResult && !submissionResult.success && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Submission Error</AlertTitle>
                                <AlertDescription>{submissionResult.message}</AlertDescription>
                            </Alert>
                        )}
                        {/* Honeypot field - should be hidden from users */}
                        <input type="text" {...register("website_url")} className="hidden" tabIndex={-1} autoComplete="off" />
                        <input type="hidden" {...register("source")} />
                        
                        <div className="space-y-1">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input id="name" {...register("name")} disabled={isSubmitting} />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input id="email" type="email" {...register("email")} disabled={isSubmitting} />
                            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input id="phone" type="tel" {...register("phone")} disabled={isSubmitting} placeholder="+15551234567 (with country code)" />
                            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="message">Message</Label>
                            <Textarea id="message" {...register("message")} disabled={isSubmitting} rows={4} />
                             {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-3">
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            This form securely submits data to the backend.
                        </p>
                    </CardFooter>
                 </form>
            </Card>
        )}
    </div>
  );
}

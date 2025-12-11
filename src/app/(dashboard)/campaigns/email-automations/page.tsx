"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, PlayCircle, Settings, Loader2, Wand2, Mail, Clock, Trash2, Timer, PlusCircle, Users, Sparkles, UserX, CreditCard, Gift, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { getEmailLists, getListTypeLabel, getListTypeColor } from '@/lib/email-list-data';
import type { EmailList, EmailListType, EmailAutomationSequence, EmailAutomationStep, DeliveryProvider, AutomationDeliveryConfig } from '@/types/email-lists';
import { generateEmailContent, type GenerateEmailContentInput } from '@/ai/flows/generate-email-content-flow';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';

const DEFAULT_AUTOMATION_TEMPLATES: Omit<EmailAutomationSequence, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>[] = [
  {
    name: 'Free Trial Nurturing',
    description: 'Convert free trial users into paying customers with helpful tips and value reminders.',
    listType: 'free-trial',
    status: 'inactive',
    steps: [
      { id: 'step1', type: 'delay', order: 0, delayDays: 1, delayHours: 0 },
      { id: 'step2', type: 'email', order: 1, subject: 'Welcome! Here\'s How to Get Started', content: '<h2>Welcome to {{company_name}}!</h2><p>Hi {{first_name}},</p><p>Thank you for starting your free trial. We\'re excited to have you!</p><p>Here are 3 quick tips to get the most out of your trial:</p><ol><li>Complete your profile setup</li><li>Explore our key features</li><li>Check out our quick start guide</li></ol><p>Need help? Just reply to this email!</p><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step3', type: 'delay', order: 2, delayDays: 3, delayHours: 0 },
      { id: 'step4', type: 'email', order: 3, subject: 'Did you know about this feature?', content: '<h2>Unlock More Value</h2><p>Hi {{first_name}},</p><p>Many of our users miss this powerful feature during their trial...</p><p>{{feature_highlight}}</p><p>This alone can save you hours each week!</p><p>Questions? We\'re here to help.</p><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step5', type: 'delay', order: 4, delayDays: 5, delayHours: 0 },
      { id: 'step6', type: 'email', order: 5, subject: 'Your trial is ending soon - Special offer inside', content: '<h2>Don\'t Miss Out!</h2><p>Hi {{first_name}},</p><p>Your free trial is ending soon, and we don\'t want you to lose access to all the great features you\'ve been using.</p><p><strong>Special Offer:</strong> Upgrade now and get 20% off your first 3 months!</p><p><a href="{{upgrade_link}}">Upgrade Now</a></p><p>Best,<br>The {{company_name}} Team</p>' },
    ],
  },
  {
    name: 'Paid Customer Onboarding',
    description: 'Help new paying customers get maximum value and ensure long-term retention.',
    listType: 'paid-customer',
    status: 'inactive',
    steps: [
      { id: 'step1', type: 'delay', order: 0, delayDays: 0, delayHours: 2 },
      { id: 'step2', type: 'email', order: 1, subject: 'Welcome to the {{company_name}} Family!', content: '<h2>Thank You for Your Purchase!</h2><p>Hi {{first_name}},</p><p>Welcome to {{company_name}}! We\'re thrilled to have you as a customer.</p><p>Your account is now fully activated with all premium features.</p><p><strong>What\'s Next:</strong></p><ul><li>Complete your setup in 5 minutes</li><li>Schedule a free onboarding call</li><li>Join our exclusive customer community</li></ul><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step3', type: 'delay', order: 2, delayDays: 7, delayHours: 0 },
      { id: 'step4', type: 'email', order: 3, subject: 'How\'s everything going?', content: '<h2>Quick Check-In</h2><p>Hi {{first_name}},</p><p>It\'s been a week since you joined us. How are you finding {{company_name}}?</p><p>We\'d love to hear your feedback - what\'s working well? What could be better?</p><p>Simply reply to this email with your thoughts.</p><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step5', type: 'delay', order: 4, delayDays: 14, delayHours: 0 },
      { id: 'step6', type: 'email', order: 5, subject: 'Pro tips to maximize your results', content: '<h2>Level Up Your Experience</h2><p>Hi {{first_name}},</p><p>Now that you\'re settled in, here are some advanced tips our power users love:</p><ol><li>{{pro_tip_1}}</li><li>{{pro_tip_2}}</li><li>{{pro_tip_3}}</li></ol><p>Happy to schedule a call if you want personalized guidance!</p><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step7', type: 'delay', order: 6, delayDays: 30, delayHours: 0 },
      { id: 'step8', type: 'email', order: 7, subject: 'Your first month with us - Celebrate!', content: '<h2>Happy 1-Month Anniversary!</h2><p>Hi {{first_name}},</p><p>You\'ve been with us for a month now! Here\'s a quick summary of what you\'ve achieved:</p><p>{{achievement_summary}}</p><p>Keep up the great work! We\'re here to support you every step of the way.</p><p>Best,<br>The {{company_name}} Team</p>' },
    ],
  },
  {
    name: 'Win-Back Campaign',
    description: 'Re-engage churned customers and inactive leads with special offers and updates.',
    listType: 'churned',
    status: 'inactive',
    steps: [
      { id: 'step1', type: 'delay', order: 0, delayDays: 0, delayHours: 0 },
      { id: 'step2', type: 'email', order: 1, subject: 'We miss you at {{company_name}}!', content: '<h2>It\'s Been a While!</h2><p>Hi {{first_name}},</p><p>We noticed you haven\'t been around lately, and we wanted to check in.</p><p>A lot has changed since you were last here:</p><ul><li>{{new_feature_1}}</li><li>{{new_feature_2}}</li><li>{{improvement_1}}</li></ul><p>We\'d love to have you back!</p><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step3', type: 'delay', order: 2, delayDays: 7, delayHours: 0 },
      { id: 'step4', type: 'email', order: 3, subject: 'A special offer just for you', content: '<h2>Welcome Back Offer</h2><p>Hi {{first_name}},</p><p>We really value you as a customer, and we\'d love to win you back.</p><p><strong>Exclusive Offer:</strong> Get 30% off for the next 3 months when you reactivate your account!</p><p>Use code: <strong>WELCOMEBACK30</strong></p><p><a href="{{reactivate_link}}">Reactivate Now</a></p><p>This offer expires in 7 days.</p><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step5', type: 'delay', order: 4, delayDays: 14, delayHours: 0 },
      { id: 'step6', type: 'email', order: 5, subject: 'Last chance: Your special offer expires soon', content: '<h2>Final Reminder</h2><p>Hi {{first_name}},</p><p>Just a friendly reminder that your special 30% discount expires in 3 days.</p><p>If there\'s anything holding you back, we\'d love to hear about it. Maybe we can help?</p><p><a href="{{reactivate_link}}">Claim Your Discount</a></p><p>Best,<br>The {{company_name}} Team</p>' },
    ],
  },
  {
    name: 'Newsletter Engagement',
    description: 'Keep newsletter subscribers engaged with valuable content and updates.',
    listType: 'newsletter',
    status: 'inactive',
    steps: [
      { id: 'step1', type: 'delay', order: 0, delayDays: 0, delayHours: 1 },
      { id: 'step2', type: 'email', order: 1, subject: 'Thanks for subscribing to {{company_name}}!', content: '<h2>Welcome to Our Newsletter!</h2><p>Hi {{first_name}},</p><p>Thank you for subscribing! You\'ll now receive our best content directly in your inbox.</p><p>Here\'s what you can expect:</p><ul><li>Weekly tips and insights</li><li>Exclusive offers and early access</li><li>Industry news and updates</li></ul><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step3', type: 'delay', order: 2, delayDays: 7, delayHours: 0 },
      { id: 'step4', type: 'email', order: 3, subject: 'Your weekly dose of insights', content: '<h2>This Week\'s Highlights</h2><p>Hi {{first_name}},</p><p>Here\'s what you might have missed:</p><p>{{weekly_content}}</p><p>See you next week!</p><p>Best,<br>The {{company_name}} Team</p>' },
    ],
  },
  {
    name: 'Prospect Nurturing',
    description: 'Convert prospects into customers with educational content and soft CTAs.',
    listType: 'prospects',
    status: 'inactive',
    steps: [
      { id: 'step1', type: 'delay', order: 0, delayDays: 1, delayHours: 0 },
      { id: 'step2', type: 'email', order: 1, subject: 'Thanks for your interest in {{company_name}}', content: '<h2>Great to Meet You!</h2><p>Hi {{first_name}},</p><p>Thank you for checking out {{company_name}}. We\'re excited to share how we can help you.</p><p>{{value_proposition}}</p><p>Would you like to learn more? Check out our resources:</p><ul><li><a href="{{demo_link}}">Watch a quick demo</a></li><li><a href="{{case_study_link}}">Read customer success stories</a></li></ul><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step3', type: 'delay', order: 2, delayDays: 4, delayHours: 0 },
      { id: 'step4', type: 'email', order: 3, subject: 'How {{company_name}} helped businesses like yours', content: '<h2>Real Results</h2><p>Hi {{first_name}},</p><p>Here\'s how businesses similar to yours have benefited from {{company_name}}:</p><p>{{case_study_highlight}}</p><p>Ready to see similar results? <a href="{{trial_link}}">Start your free trial</a></p><p>Best,<br>The {{company_name}} Team</p>' },
      { id: 'step5', type: 'delay', order: 4, delayDays: 7, delayHours: 0 },
      { id: 'step6', type: 'email', order: 5, subject: 'Got questions? Let\'s chat!', content: '<h2>We\'re Here to Help</h2><p>Hi {{first_name}},</p><p>Choosing the right solution is important, and we want to make sure {{company_name}} is the right fit for you.</p><p>Have any questions? Simply reply to this email or <a href="{{calendar_link}}">schedule a call</a> with our team.</p><p>Best,<br>The {{company_name}} Team</p>' },
    ],
  },
];

interface ConfigureAutomationDialogProps {
  automation: EmailAutomationSequence;
  lists: EmailList[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedAutomation: EmailAutomationSequence, linkedListId?: string) => void;
}

function ConfigureAutomationDialog({ automation, lists, isOpen, onOpenChange, onSave }: ConfigureAutomationDialogProps) {
  const [config, setConfig] = useState<EmailAutomationSequence>(automation);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<number | null>(null);
  const { toast } = useToast();
  const { company } = useAuth();

  const hasBrevoConfigured = !!company?.apiKeys?.brevo?.apiKey;
  const hasSenderConfigured = !!company?.apiKeys?.sender?.apiKey;
  const hasSmtpConfigured = !!company?.apiKeys?.smtp?.host;

  // Determine the best default provider based on what's configured
  const getDefaultProvider = (): DeliveryProvider => {
    if (automation.deliveryConfig?.provider) return automation.deliveryConfig.provider;
    if (hasBrevoConfigured) return 'brevo';
    if (hasSenderConfigured) return 'sender';
    if (hasSmtpConfigured) return 'smtp';
    return 'smtp';
  };
  
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProvider>(getDefaultProvider());

  useEffect(() => {
    if (isOpen && automation && company) {
      const businessName = company.name || '[Your Company Name]';
      const personalizedConfig = JSON.parse(JSON.stringify(automation)) as EmailAutomationSequence;
      
      personalizedConfig.steps = personalizedConfig.steps.map(step => {
        if (step.type === 'email' && step.content) {
          step.subject = step.subject?.replace(/\{\{company_name\}\}/g, businessName) || '';
          step.content = step.content
            .replace(/\{\{company_name\}\}/g, businessName)
            .replace(/\{\{first_name\}\}/g, '{{first_name}}');
        }
        return step;
      });
      
      setConfig(personalizedConfig);
      // Use smart default: saved provider first, then first configured provider
      const savedProvider = automation.deliveryConfig?.provider;
      if (savedProvider) {
        setDeliveryProvider(savedProvider);
      } else if (hasBrevoConfigured) {
        setDeliveryProvider('brevo');
      } else if (hasSenderConfigured) {
        setDeliveryProvider('sender');
      } else if (hasSmtpConfigured) {
        setDeliveryProvider('smtp');
      }
      
      const matchingLists = lists.filter(l => l.type === automation.listType);
      if (matchingLists.length === 1) {
        setSelectedListId(matchingLists[0].id);
      }
    }
  }, [automation, isOpen, company, lists]);

  const handleStepChange = (index: number, field: keyof EmailAutomationStep, value: string | number) => {
    const newSteps = [...config.steps];
    const step = newSteps[index];
    (step as any)[field] = value;
    setConfig({ ...config, steps: newSteps });
  };

  const handleGenerateAIStepContent = async (index: number) => {
    const step = config.steps[index];
    if (step.type !== 'email') return;

    setIsGenerating(index);
    try {
      const result = await generateEmailContent({
        campaignGoal: `Email ${Math.floor(index / 2) + 1} of the "${config.name}" sequence for ${getListTypeLabel(config.listType)}.`,
        targetAudience: getListTypeLabel(config.listType),
        keyPoints: step.content?.substring(0, 200) || "Engage the recipient with valuable content.",
        tone: 'Friendly',
        callToAction: "Learn More",
      });
      handleStepChange(index, 'content', result.htmlContent);
      toast({ title: `AI Content Generated for Step ${Math.floor(index / 2) + 1}` });
    } catch (error: any) {
      toast({ title: "AI Generation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleAddStep = (type: 'email' | 'delay') => {
    const newStep: EmailAutomationStep = type === 'email'
      ? { id: `step${Date.now()}`, type: 'email', order: config.steps.length, subject: 'New Email Step', content: '<h2>Hello {{first_name}},</h2><p>Your content here...</p>' }
      : { id: `step${Date.now()}`, type: 'delay', order: config.steps.length, delayDays: 3, delayHours: 0 };
    setConfig(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const handleDeleteStep = (index: number) => {
    const newSteps = config.steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, order: i }));
    setConfig(prev => ({ ...prev, steps: newSteps }));
    toast({ title: "Step Removed" });
  };

  const handleSave = () => {
    const updatedConfig = {
      ...config,
      deliveryConfig: {
        provider: deliveryProvider,
      } as AutomationDeliveryConfig,
      linkedListId: selectedListId || undefined,
    };
    onSave(updatedConfig, selectedListId || undefined);
    onOpenChange(false);
  };

  const matchingLists = lists.filter(l => l.type === config.listType);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl lg:max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl pr-8">{config.name}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">{config.description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 -mr-1 sm:-mr-2">
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
            <Label className="mb-2 block text-sm font-medium">Link to Email List</Label>
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an email list" />
              </SelectTrigger>
              <SelectContent>
                {matchingLists.length > 0 ? (
                  matchingLists.map(list => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name} ({list.contactCount} contacts)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No {getListTypeLabel(config.listType)} lists found - create one first
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Only lists of type "{getListTypeLabel(config.listType)}" are shown. Create a matching list in the Email Lists page.
            </p>
          </div>

          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
            <Label className="mb-2 block text-sm font-medium">Delivery Provider</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Choose which email service to use when sending automation emails.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setDeliveryProvider('brevo')}
                className={cn(
                  "p-2 sm:p-3 border-2 rounded-lg text-left transition-all",
                  deliveryProvider === 'brevo' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Brevo</span>
                  {deliveryProvider === 'brevo' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </div>
                <span className={cn("text-xs", hasBrevoConfigured ? "text-green-600" : "text-orange-500")}>
                  {hasBrevoConfigured ? 'Configured' : 'Not configured'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryProvider('sender')}
                className={cn(
                  "p-2 sm:p-3 border-2 rounded-lg text-left transition-all",
                  deliveryProvider === 'sender' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Sender.net</span>
                  {deliveryProvider === 'sender' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </div>
                <span className={cn("text-xs", hasSenderConfigured ? "text-green-600" : "text-orange-500")}>
                  {hasSenderConfigured ? 'Configured' : 'Not configured'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryProvider('smtp')}
                className={cn(
                  "p-2 sm:p-3 border-2 rounded-lg text-left transition-all",
                  deliveryProvider === 'smtp' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Custom SMTP</span>
                  {deliveryProvider === 'smtp' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </div>
                <span className={cn("text-xs", hasSmtpConfigured ? "text-green-600" : "text-orange-500")}>
                  {hasSmtpConfigured ? 'Configured' : 'Not configured'}
                </span>
              </button>
            </div>
            {((deliveryProvider === 'brevo' && !hasBrevoConfigured) || 
              (deliveryProvider === 'sender' && !hasSenderConfigured) || 
              (deliveryProvider === 'smtp' && !hasSmtpConfigured)) && (
              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                <Info className="h-3 w-3 flex-shrink-0" />
                <span>Go to Settings → API Integrations to add your {deliveryProvider === 'smtp' ? 'SMTP' : deliveryProvider === 'sender' ? 'Sender.net' : 'Brevo'} credentials.</span>
              </p>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Email Sequence Steps</h3>
            {config.steps.map((step, index) => (
              <Card key={step.id} className="p-3 sm:p-4 relative group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-8 w-8 sm:h-7 sm:w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-destructive/10" 
                  onClick={() => handleDeleteStep(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                
                {step.type === 'email' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pr-10 sm:pr-0">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <h4 className="font-semibold text-sm sm:text-base">Step {index + 1}: Send Email</h4>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Subject Line</Label>
                      <Input 
                        value={step.subject || ''} 
                        onChange={(e) => handleStepChange(index, 'subject', e.target.value)} 
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs sm:text-sm">Email Content (HTML)</Label>
                        <Textarea 
                          value={step.content || ''} 
                          onChange={(e) => handleStepChange(index, 'content', e.target.value)} 
                          rows={6} 
                          className="font-mono text-xs min-h-[150px] sm:min-h-[180px] w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs sm:text-sm">Preview</Label>
                        <div 
                          className="p-2 sm:p-3 border rounded-md bg-white dark:bg-gray-900 min-h-[120px] sm:min-h-[150px] max-h-[200px] prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: step.content || '<p class="text-muted-foreground">Add content to see preview...</p>' }}
                        />
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateAIStepContent(index)} disabled={isGenerating === index} className="w-full sm:w-auto">
                      {isGenerating === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      Generate with AI
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pr-10 sm:pr-0">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                      <h4 className="font-semibold text-sm sm:text-base">Step {index + 1}: Wait</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={step.delayDays || 0} 
                          onChange={(e) => handleStepChange(index, 'delayDays', parseInt(e.target.value, 10) || 0)} 
                          className="w-16 sm:w-20 text-sm" 
                          min="0" 
                        />
                        <span className="text-xs sm:text-sm">days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={step.delayHours || 0} 
                          onChange={(e) => handleStepChange(index, 'delayHours', parseInt(e.target.value, 10) || 0)} 
                          className="w-16 sm:w-20 text-sm" 
                          min="0" 
                          max="23"
                        />
                        <span className="text-xs sm:text-sm">hours</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
            
            {config.steps.length === 0 && (
              <div className="text-center text-muted-foreground py-8 sm:py-12 border-2 border-dashed rounded-lg">
                <p className="font-semibold text-sm">No steps configured yet.</p>
                <p className="text-xs sm:text-sm mt-1">Add email or delay steps to build your automation sequence.</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
          <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-3 sm:justify-between sm:items-center">
            <div className="flex gap-2 order-2 sm:order-1">
              <Button variant="outline" size="sm" onClick={() => handleAddStep('email')} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Mail className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Add Email
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddStep('delay')} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Timer className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Add Delay
              </Button>
            </div>
            <div className="flex gap-2 order-1 sm:order-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none text-xs sm:text-sm">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!selectedListId && matchingLists.length > 0} className="flex-1 sm:flex-none text-xs sm:text-sm">
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EmailAutomationsPage() {
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  const [automations, setAutomations] = useState<EmailAutomationSequence[]>([]);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAutomation, setSelectedAutomation] = useState<EmailAutomationSequence | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<EmailAutomationSequence | null>(null);

  const loadData = useCallback(async () => {
    if (!appUser?.companyId || !db) return;
    setIsLoading(true);
    
    try {
      const [lists, automationsSnapshot] = await Promise.all([
        getEmailLists(appUser.companyId),
        getDocs(collection(db, 'companies', appUser.companyId, 'emailAutomationSequences'))
      ]);
      
      setEmailLists(lists);
      
      let existingAutomations = automationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmailAutomationSequence));
      
      if (existingAutomations.length === 0) {
        for (const template of DEFAULT_AUTOMATION_TEMPLATES) {
          const docRef = await addDoc(
            collection(db, 'companies', appUser.companyId, 'emailAutomationSequences'),
            {
              ...template,
              companyId: appUser.companyId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
          );
          existingAutomations.push({
            id: docRef.id,
            ...template,
            companyId: appUser.companyId,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as EmailAutomationSequence);
        }
      } else {
        // De-duplicate automations by name - keep the first occurrence and delete duplicates
        const seenNames = new Map<string, EmailAutomationSequence>();
        const duplicateIds: string[] = [];
        
        for (const automation of existingAutomations) {
          if (seenNames.has(automation.name)) {
            duplicateIds.push(automation.id);
          } else {
            seenNames.set(automation.name, automation);
          }
        }
        
        // Delete duplicates from Firestore
        if (duplicateIds.length > 0) {
          for (const duplicateId of duplicateIds) {
            const docRef = doc(db, 'companies', appUser.companyId, 'emailAutomationSequences', duplicateId);
            await deleteDoc(docRef);
          }
          console.log(`Removed ${duplicateIds.length} duplicate automation(s)`);
          existingAutomations = Array.from(seenNames.values());
        }
      }
      
      setAutomations(existingAutomations);
    } catch (error) {
      console.error('Error loading automations:', error);
      toast({ title: 'Error', description: 'Failed to load automations', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [appUser, toast]);

  useEffect(() => {
    if (appUser) {
      loadData();
    }
  }, [appUser, loadData]);

  const handleConfigure = (automation: EmailAutomationSequence) => {
    setSelectedAutomation(automation);
    setIsConfigDialogOpen(true);
  };

  const handleSaveAutomation = async (updatedAutomation: EmailAutomationSequence, linkedListId?: string) => {
    if (!appUser?.companyId || !db) return;
    
    try {
      const docRef = doc(db, 'companies', appUser.companyId, 'emailAutomationSequences', updatedAutomation.id);
      await updateDoc(docRef, {
        name: updatedAutomation.name,
        description: updatedAutomation.description,
        steps: updatedAutomation.steps,
        status: updatedAutomation.status,
        deliveryConfig: updatedAutomation.deliveryConfig || null,
        linkedListId: linkedListId || null,
        updatedAt: serverTimestamp(),
      });
      
      if (linkedListId) {
        const listRef = doc(db, 'companies', appUser.companyId, 'emailLists', linkedListId);
        await updateDoc(listRef, {
          automationId: updatedAutomation.id,
          updatedAt: serverTimestamp(),
        });
      }
      
      await loadData();
      toast({ title: "Automation Saved", description: `${updatedAutomation.name} has been updated.` });
    } catch (error) {
      console.error('Error saving automation:', error);
      toast({ title: 'Error', description: 'Failed to save automation', variant: 'destructive' });
    }
  };

  const handleToggleActivation = async (automation: EmailAutomationSequence) => {
    if (!appUser?.companyId || !db) return;
    
    const linkedList = emailLists.find(l => l.automationId === automation.id);
    if (automation.status === 'inactive' && !linkedList) {
      toast({
        title: 'No List Linked',
        description: 'Please configure this automation and link it to an email list before activating.',
        variant: 'destructive'
      });
      return;
    }
    
    const newStatus = automation.status === 'active' ? 'inactive' : 'active';
    
    try {
      const docRef = doc(db, 'companies', appUser.companyId, 'emailAutomationSequences', automation.id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      
      await loadData();
      toast({
        title: `Automation ${newStatus === 'active' ? 'Activated' : 'Deactivated'}`,
        description: `${automation.name} is now ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({ title: 'Error', description: 'Failed to update automation status', variant: 'destructive' });
    }
  };

  const openDeleteDialog = (automation: EmailAutomationSequence) => {
    setAutomationToDelete(automation);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!appUser?.companyId || !db || !automationToDelete) return;
    
    try {
      const docRef = doc(db, 'companies', appUser.companyId, 'emailAutomationSequences', automationToDelete.id);
      await deleteDoc(docRef);
      
      await loadData();
      toast({
        title: 'Automation Deleted',
        description: `${automationToDelete.name} has been removed.`,
      });
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast({ title: 'Error', description: 'Failed to delete automation', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setAutomationToDelete(null);
    }
  };

  const getAutomationIcon = (listType: EmailListType) => {
    switch (listType) {
      case 'free-trial': return <Gift className="h-6 w-6 text-primary" />;
      case 'paid-customer': return <CreditCard className="h-6 w-6 text-primary" />;
      case 'churned': return <UserX className="h-6 w-6 text-primary" />;
      case 'newsletter': return <Mail className="h-6 w-6 text-primary" />;
      case 'prospects': return <Sparkles className="h-6 w-6 text-primary" />;
      default: return <Users className="h-6 w-6 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/campaigns/email-lists"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <PageTitle
            title="Email Automations"
            description="Set up automated email sequences for different customer segments."
          />
        </div>
      </div>

      <Alert variant="default" className="border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30">
        <Info className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
        <AlertTitleComponent className="text-blue-700 dark:text-blue-300">How Email Automations Work</AlertTitleComponent>
        <AlertDescription className="text-blue-600 dark:text-blue-400 space-y-1">
          <p>1. <strong>Create Email Lists</strong> - Go to Email Lists and create lists for each customer segment (Free Trial, Paid, Churned, etc.)</p>
          <p>2. <strong>Configure Automations</strong> - Customize the email sequences below and link them to your lists.</p>
          <p>3. <strong>Activate</strong> - Turn on automations to start sending scheduled follow-up emails automatically.</p>
          <p>4. <strong>Cron Job</strong> - The system checks for pending emails and sends them based on your configured delays.</p>
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((automation) => {
            const linkedList = emailLists.find(l => l.automationId === automation.id);
            const emailStepsCount = automation.steps.filter(s => s.type === 'email').length;
            
            return (
              <Card key={automation.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      {getAutomationIcon(automation.listType)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{automation.name}</CardTitle>
                      <Badge className={cn("text-xs mt-1", getListTypeColor(automation.listType))}>
                        {getListTypeLabel(automation.listType)}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-sm">{automation.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{emailStepsCount} emails in sequence</span>
                    </div>
                    {linkedList ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Linked to: {linkedList.name} ({linkedList.contactCount} contacts)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <Info className="h-4 w-4" />
                        <span>No list linked yet</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-4 border-t">
                  <div className="flex items-center justify-between w-full">
                    <Badge 
                      variant={automation.status === 'active' ? "default" : "outline"} 
                      className={cn(
                        automation.status === 'active' 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'text-gray-600 border-gray-300'
                      )}
                    >
                      {automation.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => openDeleteDialog(automation)}
                      title="Delete automation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" size="sm" onClick={() => handleConfigure(automation)} className="flex-1 text-xs sm:text-sm">
                      <Settings className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Configure
                    </Button>
                    <Button 
                      variant={automation.status === 'active' ? 'secondary' : 'default'} 
                      size="sm" 
                      onClick={() => handleToggleActivation(automation)}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <PlayCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      {automation.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {selectedAutomation && (
        <ConfigureAutomationDialog
          automation={selectedAutomation}
          lists={emailLists}
          isOpen={isConfigDialogOpen}
          onOpenChange={setIsConfigDialogOpen}
          onSave={handleSaveAutomation}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{automationToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

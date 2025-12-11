
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from '@/components/ui/alert';
import { Info, PlayCircle, Settings, Handshake, Star, Gift, ShoppingCart, ArrowLeft, Rss, Loader2, Wand2, Mail, Clock, Trash2, Timer } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getStoredAutomations, updateStoredAutomation } from '@/lib/automations-data';
import type { AutomationStep, EmailAutomation } from '@/types/automations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { generateEmailContent, type GenerateEmailContentInput } from '@/ai/flows/generate-email-content-flow';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';


// --- Configuration Dialog Component ---
interface ConfigureAutomationDialogProps {
  automation: EmailAutomation;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedAutomation: EmailAutomation) => void;
}

function ConfigureAutomationDialog({ automation, isOpen, onOpenChange, onSave }: ConfigureAutomationDialogProps) {
  // The state 'config' will now hold the *personalized* version of the steps.
  const [config, setConfig] = useState<EmailAutomation['config']>(automation.config);
  const [isGenerating, setIsGenerating] = useState<number | null>(null);
  const { toast } = useToast();
  const { company } = useAuth();

  useEffect(() => {
    // This effect runs when the dialog opens, personalizing the template content.
    if (isOpen && automation && company) {
      // 1. Fetch details from company profile, with sensible defaults if not found.
      const businessName = company.name || '[Your Company Name]';
      const profileName = company.ownerId; // In a real app this might be the current user's name
      const websiteUrl = company.website || 'https://omniflow.example.com';

      // 2. Create a deep copy of the automation config to avoid mutating the original state.
      const personalizedConfig = JSON.parse(JSON.stringify(automation.config));

      // 3. Personalize each email step's subject and content.
      personalizedConfig.steps = personalizedConfig.steps.map((step: AutomationStep) => {
        if (step.type === 'email') {
          // Replace all known placeholders in both subject and content
          step.subject = step.subject
            .replace(/\[Your Company Name\]/g, businessName);

          step.content = step.content
            .replace(/\[Your Company Name\]/g, businessName)
            .replace(/\[Your Name\]/g, profileName)
            .replace(/The \[Your Company Name\] Team/g, `The ${businessName} Team`)
            .replace(/\[Your Website URL\]/g, websiteUrl)
            .replace(/\[Link to Your Offer or Pricing Page\]/g, `${websiteUrl}/pricing`)
            .replace(/\[Link to Cart\]/g, `${websiteUrl}/cart`)
            .replace(/\[Link to Cart with Discount Applied\]/g, `${websiteUrl}/cart`)
            .replace(/\[Link to Quick Start Guide\]/g, `${websiteUrl}/docs/quick-start`)
            .replace(/\[Link to Video Tutorials\]/g, `${websiteUrl}/tutorials`)
            .replace(/\[Link to Help Center\]/g, `${websiteUrl}/help`)
            .replace(/\[Link to Feature Documentation\]/g, `${websiteUrl}/docs/features`)
            .replace(/\[Link to Main Article\]/g, `${websiteUrl}/blog`)
            .replace(/\[Link to Your Store\]/g, `${websiteUrl}/store`);
        }
        return step;
      });
      
      // 4. Set the component's state with the new, personalized configuration.
      setConfig(personalizedConfig);
    }
  }, [automation, isOpen, company]);

  const handleStepChange = (index: number, field: keyof AutomationStep, value: string | number) => {
    const newSteps = [...config.steps];
    const step = newSteps[index];
    if (field in step) {
      (step as any)[field] = value;
    }
    setConfig({ ...config, steps: newSteps });
  };
  
  const handleGenerateAIStepContent = async (index: number) => {
    const step = config.steps[index];
    if (step.type !== 'email') return;

    setIsGenerating(index);
    try {
        const result = await generateEmailContent({
            campaignGoal: `Email ${Math.floor(index/2) + 1} of the "${automation.name}" sequence.`,
            targetAudience: "New leads or subscribers",
            keyPoints: step.content.substring(0, 200) || "Welcome the user, introduce key benefit, ask a question.", // Use existing content as key points
            tone: 'Friendly',
            callToAction: "Learn More",
        });
        handleStepChange(index, 'content', result.htmlContent);
        toast({ title: `AI Content Generated for Step ${Math.floor(index/2) + 1}`});
    } catch(error: any) {
        toast({ title: "AI Generation Failed", description: error.message, variant: "destructive"});
    } finally {
        setIsGenerating(null);
    }
  };

  const handleAddStep = (type: 'email' | 'delay') => {
    let newStep: AutomationStep;
    if (type === 'email') {
      newStep = {
        type: 'email',
        subject: 'New Email Step Subject',
        content: `<h1>Hi {{ contact.FIRSTNAME }},</h1><p>This is a new email step. Add your content here.</p>`,
      };
    } else {
      newStep = {
        type: 'delay',
        duration: 1,
        unit: 'days',
      };
    }
    setConfig(prevConfig => ({ ...prevConfig, steps: [...prevConfig.steps, newStep] }));
  };

  const handleDeleteStep = (index: number) => {
    const newSteps = [...config.steps];
    newSteps.splice(index, 1);
    setConfig(prevConfig => ({ ...prevConfig, steps: newSteps }));
    toast({ title: "Step Removed" });
  };

  const handleSave = () => {
    onSave({ ...automation, config });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Set Up: {automation.name}</DialogTitle>
          <DialogDescription>{automation.description}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6">
          {config.steps.length > 0 ? (
            config.steps.map((step, index) => (
              <Card key={index} className="p-4 relative group">
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteStep(index)} title="Delete this step">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                {step.type === 'email' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-md">Step {index + 1}: Send Email</h4>
                    <div>
                      <Label htmlFor={`subject-${index}`}>Subject</Label>
                      <Input id={`subject-${index}`} value={step.subject} onChange={(e) => handleStepChange(index, 'subject', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor={`content-editor-${index}`}>Message Content</Label>
                            <Textarea 
                                id={`content-editor-${index}`} 
                                value={step.content} 
                                onChange={(e) => handleStepChange(index, 'content', e.target.value)} 
                                rows={8} 
                                className="min-h-[158px] w-full font-mono text-xs"
                            />
                        </div>
                        <div>
                            <Label>Preview</Label>
                            <div 
                                className="p-2 border rounded-md bg-background min-h-[158px] prose dark:prose-invert max-w-none text-sm h-full w-full"
                                dangerouslySetInnerHTML={{ __html: step.content || '<p class="text-xs text-muted-foreground">Start typing...</p>' }}
                            />
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateAIStepContent(index)} disabled={isGenerating === index}>
                      {isGenerating === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                      Draft with AI
                    </Button>
                  </div>
                )}
                {step.type === 'delay' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-md">Step {index + 1}: Wait</h4>
                    <div className="flex items-center gap-2">
                      <Input type="number" id={`duration-${index}`} value={step.duration} onChange={(e) => handleStepChange(index, 'duration', parseInt(e.target.value, 10) || 1)} className="w-20" min="1" />
                      <Label htmlFor={`duration-${index}`}>{step.unit}(s)</Label>
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
             <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                <p className="font-semibold">This automation has no steps yet.</p>
                <p className="text-sm mt-1">Start by adding an email or a delay step below.</p>
            </div>
          )}
        </div>
        <DialogFooter className="pt-4 border-t flex-wrap justify-between items-center">
            <div className="flex gap-2 mb-2 sm:mb-0">
                <Button variant="outline" onClick={() => handleAddStep('email')}><Mail className="mr-2 h-4 w-4" /> Add Email</Button>
                <Button variant="outline" onClick={() => handleAddStep('delay')}><Timer className="mr-2 h-4 w-4" /> Add Delay</Button>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save Configuration</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EmailAutomationsPage() {
  const { toast } = useToast();
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAutomation, setSelectedAutomation] = useState<EmailAutomation | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const { appUser } = useAuth();


  const loadAutomations = useCallback(async () => {
    if (!appUser?.companyId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const stored = await getStoredAutomations(appUser.companyId);
    setAutomations(stored);
    setIsLoading(false);
  }, [appUser]);

  useEffect(() => {
    if(appUser) {
        loadAutomations();
    }
  }, [appUser, loadAutomations]);

  const handleConfigure = (automation: EmailAutomation) => {
    setSelectedAutomation(automation);
    setIsConfigDialogOpen(true);
  };
  
  const handleSaveAutomation = async (updatedAutomation: EmailAutomation) => {
     if (!appUser?.companyId) return;
    await updateStoredAutomation(appUser.companyId, updatedAutomation);
    await loadAutomations();
    toast({ title: "Configuration Saved", description: `${updatedAutomation.name} has been updated in the database.` });
  };

  const handleToggleActivation = (automation: EmailAutomation) => {
    const updatedAutomation = { ...automation, status: automation.status === 'active' ? 'inactive' : 'active' };
    handleSaveAutomation(updatedAutomation);
    toast({
      title: `Automation ${updatedAutomation.status === 'active' ? 'Activated' : 'Deactivated'}`,
      description: `${updatedAutomation.name} is now ${updatedAutomation.status}.`,
    });
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/email-marketing"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageTitle
          title="Email Automations"
          description="Set up automated email workflows to engage your audience at the right moment."
        />
      </div>

      <Alert variant="default" className="border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30">
        <Info className="h-4 w-4 !text-blue-600 dark:!text-blue-400" />
        <AlertTitleComponent className="text-blue-700 dark:text-blue-300">Automation Backend Status</AlertTitleComponent>
        <AlertDescription className="text-blue-600 dark:text-blue-400 space-y-1">
          <p>You can now **configure and activate** automations, and your settings will be saved to the database. The system is designed to create automation sequences for new leads and customers.</p>
          <p>
            For the emails to be sent automatically on schedule, a backend process (like a cron job) needs to call the app's API endpoint. This final step is required to make the system fully autonomous.
          </p>
        </AlertDescription>
      </Alert>

      {isLoading ? (
         <div className="h-32 flex items-center justify-center"> <Loader2 className="h-8 w-8 animate-spin text-primary" /> </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((automation) => (
            <Card key={automation.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    {automation.id === 'new-lead-nurturing' && <Handshake className="h-6 w-6 text-primary" />}
                    {automation.id === 'customer-onboarding' && <Star className="h-6 w-6 text-primary" />}
                    {automation.id === 'periodic-engagement' && <Rss className="h-6 w-6 text-primary" />}
                    {automation.id === 'abandoned-cart' && <ShoppingCart className="h-6 w-6 text-primary" />}
                    {automation.id === 'birthday-offer' && <Gift className="h-6 w-6 text-primary" />}
                  </div>
                  <CardTitle className="text-lg">{automation.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">{automation.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                 <div className="flex flex-wrap gap-2">
                  {automation.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full">{tag}</span>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row flex-wrap justify-between items-center gap-2">
                 <Badge variant={automation.status === 'active' ? "default" : "outline"} className={cn("mb-2 sm:mb-0", automation.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'text-red-600 border-red-200')}>
                    Status: <span className="font-semibold ml-1">{automation.status}</span>
                 </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleConfigure(automation)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleToggleActivation(automation)}>
                     <PlayCircle className="mr-2 h-4 w-4" />
                     {automation.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedAutomation && (
        <ConfigureAutomationDialog
          automation={selectedAutomation}
          isOpen={isConfigDialogOpen}
          onOpenChange={setIsConfigDialogOpen}
          onSave={handleSaveAutomation}
        />
      )}

    </div>
  );
}

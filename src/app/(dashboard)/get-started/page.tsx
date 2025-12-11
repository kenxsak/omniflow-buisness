'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Users, 
  Mail, 
  CreditCard, 
  Sparkles, 
  Workflow, 
  Send,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';

const QUICK_START_STEPS = [
  {
    phase: 'First 24 Hours',
    icon: Zap,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    steps: [
      {
        title: 'Create Your Digital Business Card',
        description: 'Build a professional web presence in minutes. Share via QR code or link to capture leads automatically.',
        time: '15 minutes',
        icon: CreditCard,
        actionLabel: 'Create Card',
        actionLink: '/digital-card/create',
        tips: [
          'Add your contact info, social links, and brand colors',
          'Enable the contact form to capture leads',
          'Share the QR code on business cards or social media'
        ]
      },
      {
        title: 'Add Your First Contacts',
        description: 'Import or manually add 10-20 contacts to get started. Use the built-in CRM - no external tool needed!',
        time: '5 minutes',
        icon: Users,
        actionLabel: 'Go to Contacts',
        actionLink: '/crm',
        tips: [
          'Import from Excel/CSV for bulk contact upload',
          'Or add contacts manually one by one',
          'Include name, email, and phone number for best results'
        ]
      },
      {
        title: 'Try AI Content Generation',
        description: 'Experience the power of AI - let it write a social media post, email, or ad for you in seconds.',
        time: '5 minutes',
        icon: Sparkles,
        actionLabel: 'Use AI Writer',
        actionLink: '/social-media',
        tips: [
          'Be specific in your prompt for better results',
          'Try different AI agents (Content Writer, Email Expert, etc.)',
          'Edit the AI output to match your brand voice'
        ]
      },
      {
        title: 'Send Your First Email Campaign',
        description: 'Create and send an email campaign using OmniFlow\'s built-in email marketing. No Brevo or external service required!',
        time: '10 minutes',
        icon: Mail,
        actionLabel: 'Create Campaign',
        actionLink: '/campaigns/ai-email',
        tips: [
          'Use AI to write your email content in seconds',
          'Send a test to yourself first',
          'Start with a small group of contacts'
        ]
      }
    ]
  },
  {
    phase: 'First Week',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    steps: [
      {
        title: 'Set Up Email Automation',
        description: 'Create a welcome sequence that automatically sends when someone joins your list.',
        time: '20 minutes',
        icon: Workflow,
        actionLabel: 'View Automations',
        actionLink: '/email-marketing/automations',
        tips: [
          'Start with a simple 3-email welcome series',
          'Use pre-built templates to save time',
          'Test the automation by adding yourself as a contact'
        ]
      },
      {
        title: 'Launch Multi-Channel Campaigns',
        description: 'Send campaigns across email, SMS, and WhatsApp to reach your audience everywhere.',
        time: '15 minutes',
        icon: Send,
        actionLabel: 'AI Campaign Studio',
        actionLink: '/ai-campaign-manager',
        tips: [
          'Email for detailed content',
          'SMS for urgent, time-sensitive messages',
          'WhatsApp for international contacts (free wa.me links!)'
        ]
      }
    ]
  }
];

export default function GetStartedPage() {
  const router = useRouter();
  const { isSuperAdmin, loading } = useAuth();

  // Redirect super admins to dashboard - they don't need onboarding
  useEffect(() => {
    if (!loading && isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isSuperAdmin, loading, router]);

  // Don't render the page for super admins
  if (isSuperAdmin) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <PageTitle 
            title="Quick Start Guide" 
            description="Start marketing like a pro in just 24 hours - no external tools required!"
          />
          <ContextualHelpButton pageId="get-started" />
        </div>

        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <Lightbulb className="h-5 w-5 !text-green-600 dark:!text-green-400" />
          <AlertTitle className="text-green-700 dark:text-green-300">Everything You Need is Built-In</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-400">
            OmniFlow is a complete platform with built-in CRM, email marketing, SMS, WhatsApp, and AI. 
            You can start sending campaigns immediately without connecting any external tools. External integrations like Brevo or HubSpot are optional for advanced users only.
          </AlertDescription>
        </Alert>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Track Your Progress
            </CardTitle>
            <CardDescription>
              Complete the checklist on your dashboard to track your onboarding progress and unlock new features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>
                View Dashboard Checklist
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {QUICK_START_STEPS.map((phase) => {
          const PhaseIcon = phase.icon;
          return (
            <Card key={phase.phase} className={phase.borderColor}>
              <CardHeader className={phase.bgColor}>
                <div className="flex items-center gap-3">
                  <PhaseIcon className={`h-8 w-8 ${phase.color}`} />
                  <div>
                    <CardTitle className={phase.color}>{phase.phase}</CardTitle>
                    <CardDescription>
                      {phase.phase === 'First 24 Hours' 
                        ? 'Get up and running with quick wins'
                        : 'Build your marketing system'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {phase.steps.map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={index} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <StepIcon className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{step.title}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {step.time}
                                </p>
                              </div>
                              <Link href={step.actionLink}>
                                <Button variant="outline" size="sm">
                                  {step.actionLabel}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                            <p className="text-muted-foreground mb-3">
                              {step.description}
                            </p>
                            <div className="bg-muted/50 rounded-md p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">💡 Quick Tips:</p>
                              <ul className="space-y-1">
                                {step.tips.map((tip, tipIndex) => (
                                  <li key={tipIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>
              Resources to help you succeed with OmniFlow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Dashboard Checklist</p>
                <p className="text-sm text-muted-foreground">Track your onboarding progress</p>
              </div>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  View <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, Users, Mail, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

interface Step4SuccessProps {
  completedSteps: {
    leadsAdded: boolean;
    toolConnected: boolean;
    messageCreated: boolean;
  };
  onComplete: () => void;
}

export function Step4Success({ completedSteps, onComplete }: Step4SuccessProps) {
  const router = useRouter();

  useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const accomplishments = [
    {
      completed: completedSteps.leadsAdded,
      icon: Users,
      title: '1 lead added',
      description: 'Your first customer is in the system',
    },
    {
      completed: completedSteps.toolConnected,
      icon: Mail,
      title: 'Email tool connected',
      description: 'Ready to send messages',
    },
    {
      completed: completedSteps.messageCreated,
      icon: Sparkles,
      title: 'First message created',
      description: 'Content ready to send',
    },
  ];

  const nextSteps = [
    {
      icon: Users,
      title: 'Import more leads',
      description: 'Add leads from CSV or connect your CRM',
      action: () => router.push('/crm'),
    },
    {
      icon: Mail,
      title: 'Send your first campaign',
      description: 'Reach out to your contacts',
      action: () => router.push('/email-marketing'),
    },
    {
      icon: Sparkles,
      title: 'Explore AI tools',
      description: 'Create content with AI assistance',
      action: () => router.push('/ai-chat'),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl mb-2">You&apos;re All Set! 🎉</CardTitle>
          <CardDescription className="text-base">
            Great job! Your OmniFlow is ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">What you accomplished:</h3>
              <div className="space-y-2">
                {accomplishments.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        item.completed
                          ? 'bg-primary/5 border border-primary/20'
                          : 'bg-muted/50 border border-border'
                      }`}
                    >
                      <div
                        className={`mt-0.5 ${
                          item.completed ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-3">Next steps:</h3>
              <div className="space-y-2">
                {nextSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={index}
                      onClick={step.action}
                      className="w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{step.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                size="lg"
                className="w-full h-12 text-base"
                onClick={() => {
                  onComplete();
                  router.push('/dashboard');
                }}
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>💡 Pro Tip:</strong> Check out the AI Chat for help creating email campaigns, social media posts, and more!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

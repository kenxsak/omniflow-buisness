'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mail, MessageSquare, CheckCircle2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmailTool {
  id: string;
  name: string;
  description: string;
  freeLimit: string;
  icon: string;
}

const emailTools: EmailTool[] = [
  {
    id: 'brevo',
    name: 'Brevo (Sendinblue)',
    description: 'Easy to use, great for beginners',
    freeLimit: 'Free: 300 emails/day',
    icon: '📧',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Reliable delivery, simple setup',
    freeLimit: 'Free: 100 emails/day',
    icon: '✉️',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Popular choice for small business',
    freeLimit: 'Free: 500 contacts',
    icon: '🐵',
  },
];

interface Step2ConnectToolProps {
  onToolConnected: (toolId: string) => Promise<void>;
  onSkip: () => void;
}

export function Step2ConnectTool({ onToolConnected, onSkip }: Step2ConnectToolProps) {
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    if (!selectedTool) return;
    
    setIsConnecting(true);
    try {
      await onToolConnected(selectedTool);
    } catch (error) {
      console.error('Error connecting tool:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGoToIntegrations = () => {
    router.push('/crm/integrations');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connect Your First Tool</CardTitle>
          <CardDescription className="text-base">
            Choose one free email service to start sending messages (you can add more later)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Service (Choose One):
              </Label>
              <RadioGroup value={selectedTool} onValueChange={setSelectedTool}>
                <div className="space-y-3">
                  {emailTools.map((tool) => (
                    <div
                      key={tool.id}
                      className={`flex items-start space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedTool === tool.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedTool(tool.id)}
                    >
                      <RadioGroupItem value={tool.id} id={tool.id} className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={tool.id}
                          className="text-base font-medium cursor-pointer flex items-center gap-2"
                        >
                          <span className="text-xl">{tool.icon}</span>
                          {tool.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {tool.description}
                        </p>
                        <p className="text-sm font-medium text-primary">
                          {tool.freeLimit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="bg-muted/50 border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">SMS (Optional)</p>
                  <p className="text-sm text-muted-foreground">
                    You can connect Twilio for SMS later from Settings
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                size="lg"
                className="flex-1 h-12 text-base"
                disabled={!selectedTool || isConnecting}
                onClick={handleGoToIntegrations}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                {isConnecting ? 'Connecting...' : 'Go to Integrations'}
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> You&apos;ll need to sign up for {selectedTool ? emailTools.find(t => t.id === selectedTool)?.name : 'your chosen service'} separately and get your API key. We&apos;ll guide you through the setup.
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full h-12 text-base"
              onClick={onSkip}
            >
              Skip for Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

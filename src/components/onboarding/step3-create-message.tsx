'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, FileText, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const templates = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    icon: Mail,
    preview: 'Welcome new customers with a friendly introduction',
  },
  {
    id: 'promotional',
    name: 'Promotional Offer',
    icon: FileText,
    preview: 'Announce a special deal or discount',
  },
  {
    id: 'followup',
    name: 'Follow-up Message',
    icon: Phone,
    preview: 'Check in with leads who haven\'t responded',
  },
];

interface Step3CreateMessageProps {
  onMessageCreated: (content: string) => Promise<void>;
  onSkip: () => void;
}

export function Step3CreateMessage({ onMessageCreated, onSkip }: Step3CreateMessageProps) {
  const [messageContent, setMessageContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleAIGenerate = () => {
    if (!aiPrompt.trim()) {
      toast({
        title: 'Enter a prompt',
        description: 'Tell us what message you want to create',
        variant: 'destructive',
      });
      return;
    }
    
    router.push(`/ai-chat?prompt=${encodeURIComponent(aiPrompt)}`);
  };

  const handleTemplateSelect = (template: typeof templates[0]) => {
    setMessageContent(`Using template: ${template.name}\n\n${template.preview}`);
    toast({
      title: 'Template Selected',
      description: `You can customize this ${template.name.toLowerCase()} in the campaigns section`,
    });
  };

  const handleSave = async () => {
    if (!messageContent.trim()) {
      toast({
        title: 'No content',
        description: 'Please create a message or select a template',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onMessageCreated(messageContent);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save message',
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
          <CardTitle className="text-2xl">Create Your First Message</CardTitle>
          <CardDescription className="text-base">
            Use AI to generate content or choose from our templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="ai-prompt" className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate with AI
              </Label>
              <div className="space-y-2">
                <Textarea
                  id="ai-prompt"
                  placeholder="Tell us about your message... e.g., 'Write a welcome email for new customers of my bakery'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="min-h-[100px] text-base resize-none"
                />
                <Button
                  type="button"
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={handleAIGenerate}
                  disabled={!aiPrompt.trim()}
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate with AI
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or use a template
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {templates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left group"
                  >
                    <Icon className="h-6 w-6 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="font-medium text-sm mb-1">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.preview}</p>
                  </button>
                );
              })}
            </div>

            {messageContent && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Message Preview:</Label>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm whitespace-pre-wrap">{messageContent}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {messageContent && (
                <Button
                  size="lg"
                  className="flex-1 h-12 text-base"
                  onClick={handleSave}
                  disabled={isSubmitting}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  {isSubmitting ? 'Saving...' : 'Save Message'}
                </Button>
              )}
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

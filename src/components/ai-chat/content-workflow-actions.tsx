"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImagePlus, Save, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ContentWorkflowActionsProps {
  onCreateImage?: () => void;
  onSave?: () => void;
  hasImage?: boolean;
  isSaved?: boolean;
  isGeneratingImage?: boolean;
  contentType?: 'blog' | 'sales_page' | 'social_post' | 'other';
}

export default function ContentWorkflowActions({
  onCreateImage,
  onSave,
  hasImage = false,
  isSaved = false,
  isGeneratingImage = false,
  contentType = 'blog'
}: ContentWorkflowActionsProps) {
  
  const getWorkflowSteps = () => {
    if (contentType === 'blog' || contentType === 'sales_page') {
      return [
        {
          id: 'image',
          label: 'Create Image',
          description: 'Generate a featured image',
          icon: ImagePlus,
          action: onCreateImage,
          completed: hasImage,
          disabled: isGeneratingImage,
          showCheck: hasImage
        },
        {
          id: 'save',
          label: 'Save to Hub',
          description: 'Save to Content Hub',
          icon: Save,
          action: onSave,
          completed: isSaved,
          disabled: false,
          showCheck: isSaved
        },
        {
          id: 'schedule',
          label: 'Schedule Post',
          description: 'Schedule for publishing',
          icon: Calendar,
          href: '/social-media/content-hub',
          completed: false,
          disabled: !isSaved,
          showCheck: false
        }
      ];
    } else {
      return [
        {
          id: 'save',
          label: 'Save to Hub',
          description: 'Save to Content Hub',
          icon: Save,
          action: onSave,
          completed: isSaved,
          disabled: false,
          showCheck: isSaved
        },
        {
          id: 'schedule',
          label: 'Schedule Post',
          description: 'Schedule for publishing',
          icon: Calendar,
          href: '/social-media/content-hub',
          completed: false,
          disabled: !isSaved,
          showCheck: false
        }
      ];
    }
  };

  const steps = getWorkflowSteps();

  return (
    <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <span>✨ Next Steps</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              {step.href ? (
                <Link href={step.href} className="flex-1">
                  <Button
                    variant={step.completed ? "default" : "outline"}
                    className="w-full h-auto py-3 flex-col items-start"
                    disabled={step.disabled}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={`p-2 rounded-md ${step.completed ? 'bg-white/20' : 'bg-muted'}`}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {step.label}
                          {step.showCheck && <span className="text-green-500">✓</span>}
                        </div>
                        <div className="text-xs opacity-80">{step.description}</div>
                      </div>
                    </div>
                  </Button>
                </Link>
              ) : (
                <Button
                  variant={step.completed ? "default" : "outline"}
                  className="w-full h-auto py-3 flex-col items-start flex-1"
                  onClick={step.action}
                  disabled={step.disabled}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`p-2 rounded-md ${step.completed ? 'bg-white/20' : 'bg-muted'}`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {step.label}
                        {step.showCheck && <span className="text-green-500">✓</span>}
                      </div>
                      <div className="text-xs opacity-80">{step.description}</div>
                    </div>
                  </div>
                </Button>
              )}
              
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Complete each step to publish your content
        </p>
      </div>
    </Card>
  );
}

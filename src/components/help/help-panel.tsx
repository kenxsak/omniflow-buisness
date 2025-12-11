"use client";

import { X, PlayCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { helpContent, type PageId } from '@/lib/help-content';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HelpPanelProps {
  pageId: PageId;
  isOpen: boolean;
  onClose: () => void;
}

export function HelpPanel({ pageId, isOpen, onClose }: HelpPanelProps) {
  const content = helpContent[pageId];

  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-24 right-6 w-full max-w-md z-50 transition-all duration-300 transform",
        isOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
      )}
    >
      <Card className="shadow-2xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Need Help?
              </CardTitle>
              <CardDescription className="mt-1">
                Here's what you can do on this page
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 -mr-2 -mt-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Overview */}
              {content.overview && (
                <div className="bg-primary/5 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {content.overview}
                  </p>
                </div>
              )}

              {/* What can I do here? */}
              <div>
                <h3 className="font-semibold text-sm mb-2 text-primary">
                  What can I do here?
                </h3>
                <ul className="space-y-2">
                  {content.capabilities.map((capability, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Actions */}
              {content.quickActions && content.quickActions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-primary">
                    Quick Actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {content.quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={action.onClick}
                        className="text-xs"
                      >
                        {action.icon && <action.icon className="mr-1 h-3 w-3" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Tutorial */}
              {content.videoUrl && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-primary flex items-center gap-1">
                    <PlayCircle className="h-4 w-4" />
                    Watch Tutorial
                  </h3>
                  <a
                    href={content.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    📺 {content.videoTitle || 'Watch how to use this page'} ({content.videoDuration || '0:30'})
                  </a>
                </div>
              )}

              {/* Tips */}
              {content.tips && content.tips.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-primary">
                    💡 Pro Tips
                  </h3>
                  <ul className="space-y-2">
                    {content.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-yellow-500 mt-0.5">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* FAQs */}
              {content.faqs && content.faqs.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-primary">
                    ❓ Common Questions
                  </h3>
                  <div className="space-y-3">
                    {content.faqs.map((faq, index) => (
                      <div key={index} className="space-y-1">
                        <p className="text-sm font-medium">{faq.question}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Need More Help? */}
              <div className="pt-2 border-t">
                <h3 className="font-semibold text-sm mb-2">
                  Still need help?
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    window.location.href = 'mailto:support@omniflow.com?subject=Help with ' + content.pageTitle;
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

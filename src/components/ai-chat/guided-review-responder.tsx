"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, MessageCircle, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface GuidedReviewResponderProps {
  onResponseGenerated: (response: string, reviewText: string) => void;
  onBack?: () => void;
}

export default function GuidedReviewResponder({ onResponseGenerated, onBack }: GuidedReviewResponderProps) {
  const [reviewText, setReviewText] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState('');
  
  const { appUser, company } = useAuth();
  const { toast } = useToast();

  // Load business name from company data
  useEffect(() => {
    if (company?.name) {
      setBusinessName(company.name);
    }
  }, [company]);

  const handleGenerate = async () => {
    if (!reviewText.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter the customer review text',
        variant: 'destructive'
      });
      return;
    }

    if (!businessName.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter your business name',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-chat/review-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText,
          sentiment,
          businessName,
          companyId: appUser?.companyId,
          userId: appUser?.uid
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate review response');
      }

      const data = await response.json();
      
      if (data.response) {
        setGeneratedResponse(data.response);
        toast({
          title: 'Response Generated',
          description: 'Your review response is ready!',
        });
      } else {
        throw new Error('No response received');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate review response',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (generatedResponse) {
      navigator.clipboard.writeText(generatedResponse);
      toast({
        title: 'Copied!',
        description: 'Response copied to clipboard',
      });
    }
  };

  const handleUseResponse = () => {
    if (generatedResponse) {
      onResponseGenerated(generatedResponse, reviewText);
    }
  };

  const handleReset = () => {
    setReviewText('');
    setSentiment('neutral');
    setGeneratedResponse('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-indigo-600" />
            Review Responder
          </CardTitle>
          <CardDescription>
            Generate professional responses to customer reviews
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Review Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-text">Customer Review Text *</Label>
              <Textarea
                id="review-text"
                placeholder="Paste the customer review here..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={5}
                disabled={isLoading}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Copy and paste the review you received from your customer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sentiment">Review Sentiment *</Label>
                <Select 
                  value={sentiment} 
                  onValueChange={(value: 'positive' | 'negative' | 'neutral') => setSentiment(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="sentiment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">😊</span>
                        <span>Positive</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="negative">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">😞</span>
                        <span>Negative</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="neutral">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">😐</span>
                        <span>Neutral</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How would you classify this review?
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-name">Your Business Name *</Label>
                <Input
                  id="business-name"
                  placeholder="e.g., My Awesome Cafe"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Your business name for the response
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {onBack && (
              <Button variant="outline" onClick={onBack} disabled={isLoading}>
                Back
              </Button>
            )}
            <Button 
              onClick={handleGenerate} 
              className="flex-1"
              disabled={isLoading || !reviewText.trim() || !businessName.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Response...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Generate Response
                </>
              )}
            </Button>
          </div>

          {/* Generated Response Section */}
          {generatedResponse && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Response Generated</span>
              </div>
              
              <div className="space-y-2">
                <Label>Suggested Response:</Label>
                <Textarea
                  value={generatedResponse}
                  readOnly
                  rows={6}
                  className="bg-muted/50 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCopyResponse}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Response
                </Button>
                <Button onClick={handleUseResponse} className="flex-1">
                  Use This Response
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  New Review
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">💡 Tips for better responses:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Select the correct sentiment to get an appropriate response tone</li>
              <li>For positive reviews: Thank the customer and reinforce the positive experience</li>
              <li>For negative reviews: Apologize sincerely and offer to make things right</li>
              <li>For neutral reviews: Acknowledge their feedback and invite further engagement</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

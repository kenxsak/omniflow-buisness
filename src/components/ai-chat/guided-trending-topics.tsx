"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, Video, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { handleAIChatMessage } from '@/app/actions/ai-chat-actions';

interface NextStepSuggestion {
  label: string;
  prompt: string;
  icon: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'error';
  metadata?: any;
  creditsConsumed?: number;
  nextSteps?: NextStepSuggestion[];
}

interface GuidedTrendingTopicsProps {
  onContentGenerated: (userMessage: Message, assistantMessage: Message) => void;
  onBack?: () => void;
}

interface TopicSuggestion {
  topic: string;
  reasoning: string;
  suggestedKeywords: string[];
  exampleTitles: string[];
}

export default function GuidedTrendingTopics({ onContentGenerated, onBack }: GuidedTrendingTopicsProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contentType, setContentType] = useState<'blog' | 'video'>('blog');
  const [niche, setNiche] = useState('');
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  
  const { appUser } = useAuth();
  const { toast } = useToast();

  const handleContentTypeSelect = () => {
    if (!contentType) {
      toast({
        title: 'Selection Required',
        description: 'Please select Blog or Video Script',
        variant: 'destructive'
      });
      return;
    }
    setStep(2);
  };

  const handleNicheSubmit = async () => {
    if (!niche.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter your business niche or topic',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-chat/trending-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessNiche: niche,
          contentType: contentType === 'blog' ? 'BlogPost' : 'YouTubeVideo',
          companyId: appUser?.companyId,
          userId: appUser?.uid
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trending topics');
      }

      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        setTopics(data.suggestions.slice(0, 4));
        setStep(3);
      } else {
        throw new Error('No topics received');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to get trending topics',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
  };

  const handleCreateContent = async () => {
    if (!selectedTopic) {
      toast({
        title: 'Selection Required',
        description: 'Please select a topic first',
        variant: 'destructive'
      });
      return;
    }

    if (!appUser?.companyId || !appUser?.uid) {
      toast({
        title: 'Error',
        description: 'Please sign in to generate content',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const prompt = contentType === 'blog' 
        ? `Write a blog post about ${selectedTopic}`
        : `Write a video script about ${selectedTopic}`;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: prompt,
        timestamp: new Date()
      };

      const result = await handleAIChatMessage(
        prompt, 
        appUser.companyId, 
        appUser.uid
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        type: result.type,
        metadata: result.metadata,
        creditsConsumed: result.creditsConsumed,
        nextSteps: result.nextSteps
      };

      onContentGenerated(userMessage, aiMessage);

      if (result.creditsConsumed && result.creditsConsumed > 0) {
        toast({
          title: '✨ Content Generated!',
          description: `Your ${contentType === 'blog' ? 'blog post' : 'video script'} is ready! (${result.creditsConsumed} credits used)`,
          duration: 4000
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate content',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
            1
          </div>
          <span className="text-sm font-medium hidden sm:inline">Content Type</span>
        </div>
        
        <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
        
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
            2
          </div>
          <span className="text-sm font-medium hidden sm:inline">Your Niche</span>
        </div>
        
        <div className={`h-0.5 w-12 ${step >= 3 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
        
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
            3
          </div>
          <span className="text-sm font-medium hidden sm:inline">Select Topic</span>
        </div>
      </div>

      {/* Step 1: Content Type Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Step 1: Choose Content Type
            </CardTitle>
            <CardDescription>
              What type of content would you like to create?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={contentType} onValueChange={(value: 'blog' | 'video') => setContentType(value)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Label
                  htmlFor="blog"
                  className={`flex flex-col items-center gap-4 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                    contentType === 'blog' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="blog" id="blog" className="sr-only" />
                  <FileText className={`h-12 w-12 ${contentType === 'blog' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <div className="font-semibold text-lg">Blog Post</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Full article with SEO optimization
                    </div>
                  </div>
                </Label>

                <Label
                  htmlFor="video"
                  className={`flex flex-col items-center gap-4 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                    contentType === 'video' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="video" id="video" className="sr-only" />
                  <Video className={`h-12 w-12 ${contentType === 'video' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <div className="font-semibold text-lg">Video Script</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Complete script for YouTube or TikTok
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex gap-3">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
              )}
              <Button onClick={handleContentTypeSelect} className="flex-1">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Niche Input */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Step 2: Enter Your Niche
            </CardTitle>
            <CardDescription>
              What topic or industry should we find trending topics for?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="niche">Business Niche or Topic</Label>
              <Input
                id="niche"
                placeholder="e.g., fitness coaching, ecommerce tools, digital marketing..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleNicheSubmit();
                  }
                }}
                className="text-base"
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-semibold">{contentType === 'blog' ? 'Blog Post' : 'Video Script'}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isLoading}>
                Back
              </Button>
              <Button onClick={handleNicheSubmit} className="flex-1" disabled={isLoading || !niche.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding Trending Topics...
                  </>
                ) : (
                  'Get Trending Topics'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Topic Selection */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Step 3: Select a Trending Topic
            </CardTitle>
            <CardDescription>
              Choose one of these trending topics for your {contentType === 'blog' ? 'blog post' : 'video script'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {topics.map((topicItem, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedTopic === topicItem.topic
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => handleTopicSelect(topicItem.topic)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedTopic === topicItem.topic
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}>
                        {selectedTopic === topicItem.topic && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base mb-2">{topicItem.topic}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{topicItem.reasoning}</p>
                        
                        {topicItem.exampleTitles && topicItem.exampleTitles.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Example Titles:</p>
                            {topicItem.exampleTitles.slice(0, 2).map((title, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground pl-3 border-l-2 border-muted">
                                {title}
                              </p>
                            ))}
                          </div>
                        )}

                        {topicItem.suggestedKeywords && topicItem.suggestedKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {topicItem.suggestedKeywords.slice(0, 4).map((keyword, idx) => (
                              <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep(2); setSelectedTopic(''); }} disabled={isLoading}>
                Back
              </Button>
              <Button 
                onClick={handleCreateContent} 
                className="flex-1" 
                disabled={!selectedTopic || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating {contentType === 'blog' ? 'Blog Post' : 'Video Script'}...
                  </>
                ) : (
                  `Create ${contentType === 'blog' ? 'Blog Post' : 'Video Script'}`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

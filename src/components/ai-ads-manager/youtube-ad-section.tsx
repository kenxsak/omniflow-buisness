
"use client";

import React, { type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Copy, Users as UsersIcon, Youtube, ClipboardCopy, Info } from 'lucide-react';
import type { GenerateYouTubeAdContentInput, GenerateYouTubeAdContentOutput } from '@/ai/flows/generate-youtube-ad-content-flow';
import { languageOptions } from '@/lib/language-options';

const youtubeVideoFormatOptions = [
    { value: "YouTube Short (under 60s)", label: "YouTube Short (under 60s)" },
    { value: "Skippable In-stream Ad (15-30s)", label: "Skippable In-stream Ad (15-30s)" },
    { value: "Non-skippable In-stream Ad (15s)", label: "Non-skippable In-stream Ad (15s)" },
    { value: "Bumper Ad (6s)", label: "Bumper Ad (6s)" },
    { value: "Long-form Explainer (1-3 mins)", label: "Long-form Explainer (1-3 mins)" },
    { value: "Long-form Product Demo (2-5 mins)", label: "Long-form Product Demo (2-5 mins)" },
    { value: "Video Discovery Ad concept", label: "Video Discovery Ad concept" },
];

const youtubeVideoStyleOptions = [
    { value: "Animated Explainer", label: "Animated Explainer" },
    { value: "Live Action - Talking Head", label: "Live Action - Talking Head" },
    { value: "Live Action - Product Demo", label: "Live Action - Product Demo" },
    { value: "User-Generated Content Style", label: "User-Generated Content Style" },
    { value: "Cinematic Storytelling", label: "Cinematic Storytelling" },
    { value: "Fast-Paced & Trendy", label: "Fast-Paced & Trendy" },
    { value: "Informative Screencast", label: "Informative Screencast" },
    { value: "Humorous Sketch", label: "Humorous Sketch" },
    { value: "Testimonial Based", label: "Testimonial Based" },
];

interface YouTubeAdSectionProps {
  isLoading: boolean;
  inputs: Omit<GenerateYouTubeAdContentInput, 'desiredVideoStyleAndLength'> & { videoFormat: string; videoStyle: string };
  output: GenerateYouTubeAdContentOutput | null;
  onInputChange: (field: string, value: string | number) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onCopyToClipboard: (text: string | string[], type: string) => void;
  onUseImagePromptAndGo: (promptText?: string | null) => void;
  youtubeAdsGeneratorRef: React.RefObject<HTMLDivElement>;
}

const YouTubeAdSectionComponent: React.FC<YouTubeAdSectionProps> = ({
  isLoading, inputs, output, onInputChange, onSubmit, onCopyToClipboard, onUseImagePromptAndGo, youtubeAdsGeneratorRef
}) => {
  return (
    <Card ref={youtubeAdsGeneratorRef}>
      <CardHeader>
        <CardTitle className="flex items-center"><Youtube className="mr-2 h-5 w-5 text-red-500" />YouTube Ads Campaign & Script Generator</CardTitle>
        <CardDescription>
          AI for campaign planning, video ad scripts, voice-over text, visual concepts, thumbnail prompts, and targeting ideas for YouTube.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
              <div><Label htmlFor="yt-product">Product/Service Name *</Label><Input id="yt-product" value={inputs.productOrService} onChange={e => onInputChange('productOrService', e.target.value)} placeholder="e.g., Online Course Platform, Eco-friendly Water Bottles" required /></div>
              <div><Label htmlFor="yt-audience">Target Audience *</Label><Textarea id="yt-audience" value={inputs.targetAudience} onChange={e => onInputChange('targetAudience', e.target.value)} placeholder="e.g., Students seeking new skills, Environmentally conscious consumers" required rows={3} /></div>
              <div><Label htmlFor="yt-keyMessagePoints">Key Message Points * (Comma-separated or bulleted)</Label><Textarea id="yt-keyMessagePoints" value={inputs.keyMessagePoints} onChange={e => onInputChange('keyMessagePoints', e.target.value)} placeholder="e.g., Lifetime access, Certified instructors, BPA-free, Keeps water cold for 24h" required rows={3} /></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="yt-videoFormat">Video Format/Length *</Label>
                      <Select value={inputs.videoFormat} onValueChange={(value) => onInputChange('videoFormat', value)}>
                          <SelectTrigger id="yt-videoFormat"><SelectValue /></SelectTrigger>
                          <SelectContent>{youtubeVideoFormatOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                  <div>
                      <Label htmlFor="yt-videoStyle">Video Style *</Label>
                      <Select value={inputs.videoStyle} onValueChange={(value) => onInputChange('videoStyle', value)}>
                          <SelectTrigger id="yt-videoStyle"><SelectValue /></SelectTrigger>
                          <SelectContent>{youtubeVideoStyleOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor="yt-adObjective">Ad Objective *</Label><Select value={inputs.adObjective} onValueChange={(value) => onInputChange('adObjective', value)}><SelectTrigger id="yt-adObjective"><SelectValue /></SelectTrigger><SelectContent>
                      <SelectItem value="BrandAwareness">Brand Awareness</SelectItem><SelectItem value="WebsiteTraffic">Website Traffic</SelectItem><SelectItem value="LeadGeneration">Lead Generation</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem><SelectItem value="ProductConsideration">Product Consideration</SelectItem><SelectItem value="AppPromotion">App Promotion</SelectItem>
                  </SelectContent></Select></div>
                  <div><Label htmlFor="yt-overallTone">Overall Tone *</Label><Select value={inputs.overallTone} onValueChange={(value) => onInputChange('overallTone', value)}><SelectTrigger id="yt-overallTone"><SelectValue /></SelectTrigger><SelectContent>
                      <SelectItem value="Professional">Professional</SelectItem><SelectItem value="Friendly">Friendly</SelectItem><SelectItem value="Energetic">Energetic</SelectItem><SelectItem value="Humorous">Humorous</SelectItem>
                      <SelectItem value="Serious">Serious</SelectItem><SelectItem value="Inspirational">Inspirational</SelectItem><SelectItem value="Empathetic">Empathetic</SelectItem><SelectItem value="Authoritative">Authoritative</SelectItem>
                  </SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor="yt-numVariations"># Variations (1-3)</Label><Select value={(inputs.numVariations || 1).toString()} onValueChange={(value) => onInputChange('numVariations', parseInt(value, 10) || 1)}><SelectTrigger id="yt-numVariations"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label htmlFor="yt-targetLanguage">Ad Language</Label><Select value={inputs.targetLanguage || 'English'} onValueChange={(value) => onInputChange('targetLanguage', value)}><SelectTrigger id="yt-targetLanguage"><SelectValue /></SelectTrigger><SelectContent>{languageOptions.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent></Select></div>
              </div>
          </CardContent>
          <CardFooter>
              <Button type="submit" disabled={isLoading}><Wand2 className="mr-2 h-4 w-4" /> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate YouTube Ad Content</Button>
          </CardFooter>
      </form>
      {output && (
          <CardContent className="mt-6 border-t pt-6 space-y-6">
              <h3 className="text-lg font-semibold">Generated YouTube Ad Content:</h3>
              {output.adVariations.map((variation, index) => (
                  <Card key={`yt-var-${index}`} className="p-4 bg-muted/20">
                      <CardTitle className="text-md mb-3">Variation {index + 1} <Badge variant="outline" className="ml-2">{variation.adFormatSuggestion}</Badge></CardTitle>
                      <div className="space-y-3 text-sm">
                          <div><Label className="font-semibold">Video Title:</Label><Input value={variation.videoTitle} readOnly className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.videoTitle, "Video Title")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                          <div><Label className="font-semibold">Ad Script:</Label><Textarea value={variation.script} readOnly rows={8} className="mt-1 bg-background/70 min-h-[150px]" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.script, "Ad Script")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button>
                              <Alert variant="default" className="mt-1 text-xs border-blue-300 bg-blue-50 dark:bg-blue-900/30">
                                <Info className="mr-1 h-3 w-3 text-blue-600 dark:text-blue-400"/>
                                <AlertDescription className="text-blue-600 dark:text-blue-400">The script may contain image prompts like [IMAGE PROMPT FOR AI: ...]. Use these with an image generator for visuals.</AlertDescription>
                              </Alert>
                          </div>
                          <div><Label className="font-semibold">Voice-Over Tone:</Label><p className="text-xs text-muted-foreground p-2 bg-background/70 rounded-md">{variation.voiceOverTone}</p></div>
                          <div><Label className="font-semibold">Visual Style Notes:</Label><p className="text-xs text-muted-foreground p-2 bg-background/70 rounded-md">{variation.visualStyleNotes}</p></div>
                          <div><Label className="font-semibold">Thumbnail Prompt:</Label><Textarea value={variation.thumbnailPrompt} readOnly rows={2} className="mt-1 bg-background/70" /><div className="flex gap-1 mt-1"><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.thumbnailPrompt, "Thumbnail Prompt")}><Copy className="mr-1 h-3 w-3" />Copy</Button><Button variant="default" size="xs" onClick={() => onUseImagePromptAndGo(variation.thumbnailPrompt)}><Wand2 className="mr-1 h-3 w-3" />Use for Image Gen</Button></div></div>
                          <div><Label className="font-semibold">Call to Action Text:</Label><Input value={variation.callToActionText} readOnly className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.callToActionText, "CTA Text")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                          {variation.suggestedVideoDescription && <div><Label className="font-semibold">Suggested Video Description (Brief):</Label><Textarea value={variation.suggestedVideoDescription} readOnly rows={2} className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.suggestedVideoDescription!, "Video Description")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>}
                      </div>
                  </Card>
              ))}
              {output.audienceTargetingIdeas && output.audienceTargetingIdeas.length > 0 && (
                  <div className="mt-4">
                      <h4 className="font-semibold mb-2 flex items-center"><UsersIcon className="mr-2 h-4 w-4 text-primary"/>AI Suggested YouTube Audience Targeting Ideas:</h4>
                      <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                          {output.audienceTargetingIdeas.map((idea, i) => <li key={`yt-aud-${i}`}>{idea}</li>)}
                      </ul>
                      <Button variant="outline" size="xs" onClick={() => onCopyToClipboard(output.audienceTargetingIdeas, "Audience Ideas")} className="mt-2"><ClipboardCopy className="mr-1 h-3 w-3" />Copy Audience Ideas</Button>
                  </div>
              )}
          </CardContent>
      )}
    </Card>
  );
};

export const YouTubeAdSection = React.memo(YouTubeAdSectionComponent);
export default YouTubeAdSection;

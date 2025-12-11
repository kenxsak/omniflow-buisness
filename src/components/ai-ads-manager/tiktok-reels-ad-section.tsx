
"use client";

import React, { type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Copy, ClipboardCopy, Lightbulb, Sparkles as TiktokIcon } from 'lucide-react';
import type { GenerateTiktokReelsAdContentInput, GenerateTiktokReelsAdContentOutput } from '@/ai/flows/generate-tiktok-reels-ad-content-flow';
import { languageOptions } from '@/lib/language-options';

interface TiktokReelsAdSectionProps {
  isLoading: boolean;
  inputs: GenerateTiktokReelsAdContentInput;
  output: GenerateTiktokReelsAdContentOutput | null;
  onInputChange: (field: keyof GenerateTiktokReelsAdContentInput, value: string | number) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onCopyToClipboard: (text: string | string[], type: string) => void;
  tiktokReelsAdGeneratorRef: React.RefObject<HTMLDivElement>;
}

const TiktokReelsAdSectionComponent: React.FC<TiktokReelsAdSectionProps> = ({
  isLoading, inputs, output, onInputChange, onSubmit, onCopyToClipboard, tiktokReelsAdGeneratorRef
}) => {
  return (
    <Card ref={tiktokReelsAdGeneratorRef}>
        <CardHeader>
          <CardTitle className="flex items-center"><TiktokIcon className="mr-2 h-5 w-5 text-purple-500" />TikTok & Reels Ad Catalyst</CardTitle>
          <CardDescription>
            AI for campaign planning, short-form video ad concepts, suggesting trending sounds/effects, snappy captions, and clear calls to action for TikTok and Instagram Reels.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div><Label htmlFor="tr-product">Product/Service Name *</Label><Input id="tr-product" value={inputs.productOrService} onChange={e => onInputChange('productOrService', e.target.value)} placeholder="e.g., Viral Snack Box, Language Learning App" required /></div>
            <div><Label htmlFor="tr-targetDemographic">Target Demographic *</Label><Textarea id="tr-targetDemographic" value={inputs.targetDemographic} onChange={e => onInputChange('targetDemographic', e.target.value)} placeholder="e.g., Gen Z foodies, Students learning Spanish, Gamers aged 16-24" required rows={2} /></div>
            <div><Label htmlFor="tr-keyMessage">Key Message/Offer * (Concise)</Label><Input id="tr-keyMessage" value={inputs.keyMessage} onChange={e => onInputChange('keyMessage', e.target.value)} placeholder="e.g., Limited edition flavors!, Speak fluent in 30 days, New game update" required /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="tr-adVibe">Ad Vibe/Style *</Label><Select value={inputs.adVibe} onValueChange={(value) => onInputChange('adVibe', value)}><SelectTrigger id="tr-adVibe"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Funny & Relatable">Funny & Relatable</SelectItem><SelectItem value="Educational & Informative">Educational & Informative</SelectItem><SelectItem value="Trendy & Viral-Style">Trendy & Viral-Style</SelectItem><SelectItem value="Aesthetic & Calming">Aesthetic & Calming</SelectItem><SelectItem value="Problem-Solution Focus">Problem-Solution Focus</SelectItem><SelectItem value="Inspiring & Motivational">Inspiring & Motivational</SelectItem><SelectItem value="Behind-the-Scenes">Behind-the-Scenes</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="tr-numVariations"># Variations (1-3)</Label><Select value={(inputs.numVariations || 1).toString()} onValueChange={(value) => onInputChange('numVariations', parseInt(value, 10) || 1)}><SelectTrigger id="tr-numVariations"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent></Select></div>
            </div>
             <div><Label htmlFor="tr-targetLanguage">Ad Language</Label><Select value={inputs.targetLanguage || 'English'} onValueChange={(value) => onInputChange('targetLanguage', value)}><SelectTrigger id="tr-targetLanguage"><SelectValue /></SelectTrigger><SelectContent>{languageOptions.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent></Select></div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}><Wand2 className="mr-2 h-4 w-4" /> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate TikTok/Reels Ad Content</Button>
          </CardFooter>
        </form>
        {output && (
          <CardContent className="mt-6 border-t pt-6 space-y-6">
            <h3 className="text-lg font-semibold">Generated TikTok/Reels Ad Ideas:</h3>
            {output.adVariations.map((variation, index) => (
              <Card key={`tr-var-${index}`} className="p-4 bg-muted/20">
                <CardTitle className="text-md mb-3">Idea {index + 1}</CardTitle>
                <div className="space-y-3 text-sm">
                  <div><Label className="font-semibold">Video Concept:</Label><Textarea value={variation.videoConcept} readOnly rows={3} className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.videoConcept, "Video Concept")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                  <div><Label className="font-semibold">Caption Options (2-3):</Label><ul className="list-disc list-inside pl-4 space-y-1 mt-1">{variation.captionOptions.map((caption, cIndex)=>(<li key={cIndex} className="flex justify-between items-center group"><span>{caption}</span><Button variant="ghost" size="xs" onClick={()=>onCopyToClipboard(caption, "Caption")} className="opacity-50 group-hover:opacity-100"><Copy className="h-3 w-3"/></Button></li>))}</ul><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.captionOptions, "All Captions")} className="mt-1"><ClipboardCopy className="mr-1 h-3 w-3" />Copy All Captions</Button></div>
                  <div><Label className="font-semibold">Suggested Sound Concept:</Label><Input value={variation.suggestedSoundConcept} readOnly className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.suggestedSoundConcept, "Sound Concept")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                  <div><Label className="font-semibold">Call to Action Text:</Label><Input value={variation.callToActionText} readOnly className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.callToActionText, "CTA Text")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                  <div><Label className="font-semibold">Suggested Hashtags (3-7):</Label><div className="flex flex-wrap gap-1 mt-1">{variation.suggestedHashtags.map((tag, tIndex)=>(<Badge key={tIndex} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10" onClick={()=>onCopyToClipboard(tag, "Hashtag")}>{tag}</Badge>))}</div><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.suggestedHashtags, "Hashtags")} className="mt-1"><ClipboardCopy className="mr-1 h-3 w-3" />Copy All Hashtags</Button></div>
                </div>
              </Card>
            ))}
            {output.generalTipsForPlatform && output.generalTipsForPlatform.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2 flex items-center"><Lightbulb className="mr-2 h-4 w-4 text-yellow-500"/>General Tips for TikTok/Reels:</h4>
                <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  {output.generalTipsForPlatform.map((tip, i) => <li key={`tip-${i}`}>{tip}</li>)}
                </ul>
                <Button variant="outline" size="xs" onClick={() => onCopyToClipboard(output.generalTipsForPlatform, "Platform Tips")} className="mt-2"><ClipboardCopy className="mr-1 h-3 w-3" />Copy Tips</Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
  );
};

export const TiktokReelsAdSection = React.memo(TiktokReelsAdSectionComponent);
export default TiktokReelsAdSection;

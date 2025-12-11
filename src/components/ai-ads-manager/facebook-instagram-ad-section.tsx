
"use client";

import React, { type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, Copy, Users as UsersIcon, Facebook, Instagram, ClipboardCopy, Mail } from 'lucide-react';
import type { GenerateFacebookInstagramAdContentInput, GenerateFacebookInstagramAdContentOutput } from '@/ai/flows/generate-facebook-instagram-ad-content-flow';
import { languageOptions } from '@/lib/language-options';

interface FacebookInstagramAdSectionProps {
  isLoading: boolean;
  inputs: GenerateFacebookInstagramAdContentInput;
  output: GenerateFacebookInstagramAdContentOutput | null;
  onInputChange: (field: keyof GenerateFacebookInstagramAdContentInput, value: string | number) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onCopyToClipboard: (text: string | string[], type: string) => void;
  onUseImagePromptAndGo: (promptText?: string | null) => void;
  onUseAdForEmail: (details: { name: string; subject: string; content: string }) => void;
  facebookAdGeneratorRef: React.RefObject<HTMLDivElement>;
}

const FacebookInstagramAdSectionComponent: React.FC<FacebookInstagramAdSectionProps> = ({
  isLoading, inputs, output, onInputChange, onSubmit, onCopyToClipboard, onUseImagePromptAndGo, onUseAdForEmail, facebookAdGeneratorRef
}) => {
  return (
    <Card ref={facebookAdGeneratorRef}>
      <CardHeader>
        <CardTitle className="flex items-center"><Facebook className="mr-2 h-5 w-5 text-blue-600" /><Instagram className="mr-2 h-5 w-5 text-pink-500" />Facebook & Instagram Ads Strategist</CardTitle>
        <CardDescription>
          AI for campaign planning (objectives, audience ideas), generating primary text, headlines, image/video concepts, and CTA suggestions for Meta platforms.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div><Label htmlFor="fb-product">Product/Service Name *</Label><Input id="fb-product" value={inputs.productOrService} onChange={e => onInputChange('productOrService', e.target.value)} placeholder="e.g., Artisan Coffee Beans, Online Fitness Coaching" required /></div>
          <div><Label htmlFor="fb-audience">Target Audience *</Label><Textarea id="fb-audience" value={inputs.targetAudience} onChange={e => onInputChange('targetAudience', e.target.value)} placeholder="e.g., Coffee lovers aged 25-45, Busy professionals seeking home workouts" required rows={3} /></div>
          <div><Label htmlFor="fb-keyMessage">Key Message/Offer *</Label><Textarea id="fb-keyMessage" value={inputs.keyMessage} onChange={e => onInputChange('keyMessage', e.target.value)} placeholder="e.g., 20% off first order, Free 7-day trial, Handcrafted quality" required rows={2} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label htmlFor="fb-adObjective">Ad Objective *</Label><Select value={inputs.adObjective} onValueChange={(value) => onInputChange('adObjective', value)}><SelectTrigger id="fb-adObjective"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Brand Awareness">Brand Awareness</SelectItem><SelectItem value="Website Traffic">Website Traffic</SelectItem><SelectItem value="Lead Generation">Lead Generation</SelectItem><SelectItem value="Conversions">Conversions</SelectItem><SelectItem value="Engagement">Engagement</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="fb-desiredTone">Desired Tone *</Label><Select value={inputs.desiredTone} onValueChange={(value) => onInputChange('desiredTone', value)}><SelectTrigger id="fb-desiredTone"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Friendly">Friendly</SelectItem><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Playful">Playful</SelectItem><SelectItem value="Urgent">Urgent</SelectItem><SelectItem value="Empathetic">Empathetic</SelectItem><SelectItem value="Inspirational">Inspirational</SelectItem><SelectItem value="Witty">Witty</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label htmlFor="fb-platformFocus">Platform Focus *</Label><Select value={inputs.platformFocus} onValueChange={(value) => onInputChange('platformFocus', value)}><SelectTrigger id="fb-platformFocus"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Facebook">Facebook</SelectItem><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="fb-numVariations"># Variations (1-3)</Label><Select value={(inputs.numVariations || 1).toString()} onValueChange={(value) => onInputChange('numVariations', parseInt(value, 10) || 1)}><SelectTrigger id="fb-numVariations"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="fb-targetLanguage">Ad Language</Label><Select value={inputs.targetLanguage || 'English'} onValueChange={(value) => onInputChange('targetLanguage', value)}><SelectTrigger id="fb-targetLanguage"><SelectValue /></SelectTrigger><SelectContent>{languageOptions.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}><Wand2 className="mr-2 h-4 w-4" /> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate Facebook/Instagram Ad Content</Button>
        </CardFooter>
      </form>
      {output && (
        <CardContent className="mt-6 border-t pt-6 space-y-6">
          <h3 className="text-lg font-semibold">Generated Facebook/Instagram Ad Content:</h3>
          {output.adVariations.map((variation, index) => (
            <Card key={index} className="p-4 bg-muted/20">
              <CardTitle className="text-md mb-3">Variation {index + 1}</CardTitle>
              <div className="space-y-3 text-sm">
                <div><Label className="font-semibold">Primary Text:</Label><Textarea value={variation.primaryText} readOnly rows={3} className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.primaryText, "Primary Text")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                <div><Label className="font-semibold">Headline:</Label><Input value={variation.headline} readOnly className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.headline, "Headline")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                {variation.description && <div><Label className="font-semibold">Description:</Label><Textarea value={variation.description} readOnly rows={2} className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.description!, "Description")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>}
                <div><Label className="font-semibold">Suggested Image Prompt:</Label><Textarea value={variation.suggestedImagePrompt} readOnly rows={2} className="mt-1 bg-background/70" /><div className="flex gap-1 mt-1"><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.suggestedImagePrompt, "Image Prompt")}><Copy className="mr-1 h-3 w-3" />Copy</Button><Button variant="default" size="xs" onClick={() => onUseImagePromptAndGo(variation.suggestedImagePrompt)}><Wand2 className="mr-1 h-3 w-3" />Use for Image Gen</Button></div></div>
                <div><Label className="font-semibold">Suggested Video Concept:</Label><Textarea value={variation.suggestedVideoConcept} readOnly rows={2} className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.suggestedVideoConcept, "Video Concept")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                <div><Label className="font-semibold">Call to Action Text:</Label><Input value={variation.callToActionText} readOnly className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.callToActionText, "CTA Text")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
              </div>
              <div className="mt-4 pt-3 border-t">
                  <Button variant="secondary" size="sm" onClick={() => onUseAdForEmail({ name: `Email from Ad: ${inputs.productOrService}`, subject: variation.headline, content: variation.primaryText })}>
                      <Mail className="mr-2 h-4 w-4" /> Create Email Campaign from this Ad
                  </Button>
              </div>
            </Card>
          ))}
          {output.audienceTargetingIdeas && output.audienceTargetingIdeas.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 flex items-center"><UsersIcon className="mr-2 h-4 w-4 text-primary" />AI Suggested Audience Targeting Ideas:</h4>
              <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                {output.audienceTargetingIdeas.map((idea, i) => <li key={i}>{idea}</li>)}
              </ul>
              <Button variant="outline" size="xs" onClick={() => onCopyToClipboard(output.audienceTargetingIdeas, "Audience Ideas")} className="mt-2"><ClipboardCopy className="mr-1 h-3 w-3" />Copy Audience Ideas</Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export const FacebookInstagramAdSection = React.memo(FacebookInstagramAdSectionComponent);
export default FacebookInstagramAdSection;
